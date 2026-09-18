import {
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import "../styles/multiplayer.css";

import Player from "../game/Player";
import Spawner from "../game/Spawner";
import Progression from "../game/Progression";
import Projectile from "../game/Projectile";
import PowerUp from "../game/PowerUp";
import { ENVIRONMENTS, PLAYER_DESIGNS } from "../data/loadouts";

class BossEnemy {
  constructor(x, y) {
    this.x=x; this.y=y; this.width=90; this.height=90; this.type="boss";
    this.maxHealth=1200; this.health=this.maxHealth; this.speed=1.15; this.damage=25;
    this.hitFlash=0; this.hitTimer=0; this.shootTimer=75; this.pulse=0; this.spin=0;
  }
  update(player, canvas) {
    const px=player.x+player.width/2, py=player.y+player.height/2;
    const bx=this.x+this.width/2, by=this.y+this.height/2;
    const dx=px-bx, dy=py-by, d=Math.sqrt(dx*dx+dy*dy)||1;
    const desired=240;
    const dir=d>desired?1:d<desired-45?-1:0;
    this.x += (dx/d)*dir*this.speed + (-dy/d)*0.45;
    this.y += (dy/d)*dir*this.speed + (dx/d)*0.45;
    this.x=Math.max(0,Math.min(canvas.width-this.width,this.x));
    this.y=Math.max(0,Math.min(canvas.height-this.height,this.y));
    this.shootTimer--; this.pulse+=0.06; this.spin+=0.035;
    if(this.hitFlash>0)this.hitFlash--; if(this.hitTimer>0)this.hitTimer--;
  }
  canShoot(){ if(this.shootTimer<=0){this.shootTimer=85;return true;} return false; }
  getShootDirection(player){
    const dx=player.x+player.width/2-(this.x+this.width/2);
    const dy=player.y+player.height/2-(this.y+this.height/2);
    const d=Math.sqrt(dx*dx+dy*dy)||1; return {x:dx/d,y:dy/d};
  }
  takeDamage(amount){this.health-=amount;this.hitFlash=7;this.hitTimer=4;return this.health<=0;}
  draw(ctx){
    const cx=this.x+45,cy=this.y+45,p=Math.sin(this.pulse)*5;
    ctx.save(); ctx.shadowColor=this.hitFlash>0?"#fff":"#ff0055";ctx.shadowBlur=30;ctx.strokeStyle=this.hitFlash>0?"#fff":"#ff0055";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(cx,cy,52+p,0,Math.PI*2);ctx.stroke();
    ctx.translate(cx,cy);ctx.rotate(this.spin);ctx.fillStyle=this.hitFlash>0?"#fff":"#aa0044";
    for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-56);ctx.lineTo(9,-40);ctx.lineTo(-9,-40);ctx.closePath();ctx.fill();}
    ctx.fillStyle=this.hitFlash>0?"#fff":"#ff0055";ctx.beginPath();ctx.arc(0,0,38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#080808";ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.fillRect(-15,-9,9,7);ctx.fillRect(6,-9,9,7);ctx.fillStyle="#ff0055";ctx.fillRect(-12,-7,5,3);ctx.fillRect(9,-7,5,3);ctx.restore();
    const hp=Math.max(0,this.health/this.maxHealth);ctx.save();ctx.fillStyle="#080808";ctx.fillRect(this.x-10,this.y-22,this.width+20,8);ctx.fillStyle="#ff0055";ctx.shadowColor="#ff0055";ctx.shadowBlur=10;ctx.fillRect(this.x-10,this.y-22,(this.width+20)*hp,8);ctx.restore();
  }
}

function Game() {
  const canvasRef = useRef(null);

  // =====================================================
  // PERSISTENT GAME OBJECTS
  // =====================================================

  const playerRef = useRef(null);
  const progressionRef = useRef(new Progression());

  const enemiesRef = useRef([]);
  const projectilesRef = useRef([]);
  const effectsRef = useRef([]);
  const powerUpsRef = useRef([]);
  const enemyProjectilesRef = useRef([]);

  // =====================================================
  // POWER-UP REFS
  // =====================================================

  const rapidFireRef = useRef(false);
  const rapidFireTimerRef = useRef(0);

  const damageBoostRef = useRef(false);
  const damageBoostTimerRef = useRef(0);

  const shieldRef = useRef(false);
  const shieldTimerRef = useRef(0);

  const xpMagnetRef = useRef(false);
  const xpMagnetTimerRef = useRef(0);

  // =====================================================
  // MOUSE
  // =====================================================

  const mouseRef = useRef({
    x: 0,
    y: 0,
  });

  const touchMoveRef = useRef({ x: 0, y: 0, active: false });
  const touchKeysRef = useRef({});
  const shootingRef = useRef(false);
  const lastShotRef = useRef(0);
  const audioContextRef = useRef(null);
  const screenShakeRef = useRef(0);

  // =====================================================
  // ANIMATION
  // =====================================================

  const animationRef = useRef(null);

  // =====================================================
  // LEVEL UP
  // =====================================================

  const levelUpRef = useRef(false);

  // =====================================================
  // WAVE
  // =====================================================

  const waveClearedRef = useRef(false);
  const spawnedWaveRef = useRef(0);

  // Tracks whether the current wave actually spawned enemies.
  // This prevents a temporary empty array during wave transitions
  // from being interpreted as a completed wave.
  const waveStartedRef = useRef(false);
  const waveEnemyCountRef = useRef(0);
  const waveCompletionLockedRef = useRef(false);

  // =====================================================
  // MULTIPLAYER
  // =====================================================

  const multiplayerSocketRef = useRef(null);
  const remotePlayersRef = useRef({});
  const lastNetworkSyncRef = useRef(0);
  const localPlayerIdRef = useRef(null);
  const pendingStartRef = useRef(false);

  // =====================================================
  // GAME STATE
  // =====================================================

  const [wave, setWave] = useState(1);

  const [health, setHealth] = useState(100);

  const [score, setScore] = useState(0);

  const [level, setLevel] = useState(1);

  const [xp, setXP] = useState(0);

  const [xpToNext, setXPToNext] = useState(100);

  const [enemiesLeft, setEnemiesLeft] = useState(5);

  const [gameOver, setGameOver] = useState(false);

  const [victory, setVictory] = useState(false);

  const [waveCleared, setWaveCleared] = useState(false);

  const [levelUp, setLevelUp] = useState(false);

  const [attackEffect, setAttackEffect] = useState(false);

  const [powerUpMessage, setPowerUpMessage] = useState("");
  const [joystickPos, setJoystickPos] = useState({
    x: Math.min(28, window.innerWidth * 0.08),
    y: Math.min(window.innerHeight * 0.6, window.innerHeight - 210),
  });
  const joystickDragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: Math.min(28, window.innerWidth * 0.08),
    originY: Math.min(window.innerHeight * 0.6, window.innerHeight - 210),
  });

  // =====================================================
  // LEADERBOARD
  // =====================================================

  const [playerName, setPlayerName] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);

  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameMode, setGameMode] = useState("solo");
  const [environment, setEnvironment] = useState(
    () => sessionStorage.getItem("aaruEnvironment") || "neon"
  );
  const [playerDesign, setPlayerDesign] = useState(
    () => sessionStorage.getItem("aaruPlayerDesign") || "aqua"
  );
  const [roomCode, setRoomCode] = useState("");
  const [multiplayerStatus, setMultiplayerStatus] = useState("OFFLINE");
  const [multiplayerPlayers, setMultiplayerPlayers] = useState([]);
  const [multiplayerError, setMultiplayerError] = useState("");

  const playSound = (type) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const sounds = {
      shoot: { frequency: 920, duration: 0.075, endFrequency: 260, volume: 0.045 },
      click: { frequency: 720, duration: 0.035, endFrequency: 520, volume: 0.035 },
      hit: { frequency: 180, duration: 0.06, endFrequency: 90, volume: 0.045 },
      defeat: { frequency: 110, duration: 0.16, endFrequency: 55, volume: 0.07 },
      damage: { frequency: 75, duration: 0.18, endFrequency: 42, volume: 0.08 },
      wave: { frequency: 440, duration: 0.28, endFrequency: 880, volume: 0.07 },
      level: { frequency: 660, duration: 0.35, endFrequency: 1320, volume: 0.06 },
      victory: { frequency: 330, duration: 0.7, endFrequency: 990, volume: 0.09 },
    };
    const sound = sounds[type] || sounds.hit;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = type === "shoot" ? "square" : type === "click" ? "triangle" : type === "damage" || type === "defeat" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(sound.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequency, now + sound.duration);
    gain.gain.setValueAtTime(sound.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + sound.duration);

    if (type === "shoot") {
      const sparkle = audioContext.createOscillator();
      const sparkleGain = audioContext.createGain();
      sparkle.type = "sine";
      sparkle.frequency.setValueAtTime(1800, now);
      sparkle.frequency.exponentialRampToValueAtTime(700, now + 0.035);
      sparkleGain.gain.setValueAtTime(0.018, now);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      sparkle.connect(sparkleGain);
      sparkleGain.connect(audioContext.destination);
      sparkle.start(now);
      sparkle.stop(now + 0.035);
    }
  };

  const triggerScreenShake = (amount) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, amount);
  };

  const getMultiplayerUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.hostname}:3001`;
  };

  const disconnectMultiplayer = () => {
    const socket = multiplayerSocketRef.current;
    if (socket) {
      try {
        socket.close();
      } catch {
        // Ignore an already closed socket.
      }
    }

    multiplayerSocketRef.current = null;
    remotePlayersRef.current = {};
    localPlayerIdRef.current = null;
    setMultiplayerPlayers([]);
    setMultiplayerStatus("OFFLINE");
  };

  const connectMultiplayer = () => {
    const cleanName = playerName.trim().slice(0, 16);
    const cleanRoom = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

    if (!cleanName) {
      setMultiplayerError("ENTER A CALLSIGN FIRST.");
      return false;
    }

    if (cleanRoom.length !== 6) {
      setMultiplayerError("ROOM CODE MUST BE 6 CHARACTERS.");
      return false;
    }

    setMultiplayerError("");
    setRoomCode(cleanRoom);
    setMultiplayerStatus("CONNECTING...");

    try {
      const socket = new WebSocket(getMultiplayerUrl());
      multiplayerSocketRef.current = socket;

      socket.onopen = () => {
        setMultiplayerStatus("JOINED ROOM");
        socket.send(
          JSON.stringify({
            type: "join_room",
            room: cleanRoom,
            name: cleanName,
          })
        );

        if (pendingStartRef.current) {
          window.setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "start_game" }));
            }
          }, 150);
          pendingStartRef.current = false;
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "welcome") {
            localPlayerIdRef.current = message.playerId;
          }

          if (message.type === "room_state") {
            const players = Array.isArray(message.players) ? message.players : [];
            const nextRemotePlayers = {};

            players.forEach((player) => {
              if (player.id !== localPlayerIdRef.current) {
                nextRemotePlayers[player.id] = player;
              }
            });

            remotePlayersRef.current = nextRemotePlayers;
            setMultiplayerPlayers(players);
            setMultiplayerStatus(`ONLINE // ${players.length} PLAYER${players.length === 1 ? "" : "S"}`);

            if (message.started) {
              setGameStarted(true);
            }
          }

          if (message.type === "game_started") {
            setGameStarted(true);
            setMultiplayerStatus("MATCH LIVE");
          }

          if (message.type === "error") {
            setMultiplayerError(message.message || "MULTIPLAYER SERVER ERROR.");
            setMultiplayerStatus("ERROR");
          }
        } catch {
          setMultiplayerError("INVALID SERVER MESSAGE.");
        }
      };

      socket.onerror = () => {
        setMultiplayerStatus("CONNECTION FAILED");
        setMultiplayerError("START THE MULTIPLAYER SERVER AND TRY AGAIN.");
      };

      socket.onclose = () => {
        if (!gameStarted) {
          setMultiplayerStatus("DISCONNECTED");
        }
      };

      return true;
    } catch {
      setMultiplayerStatus("CONNECTION FAILED");
      setMultiplayerError("COULD NOT CONNECT TO MULTIPLAYER SERVER.");
      return false;
    }
  };

  const startArena = () => {
    playSound("click");
    const cleanName = playerName.trim().slice(0, 16);

    if (!cleanName) {
      setMultiplayerError("ENTER A CALLSIGN FIRST.");
      return;
    }

    setPlayerName(cleanName);
    setMultiplayerError("");

    if (gameMode === "solo") {
      setGameStarted(true);
      return;
    }

    pendingStartRef.current = true;

    if (!multiplayerSocketRef.current) {
      const connected = connectMultiplayer();
      if (!connected) {
        pendingStartRef.current = false;
        return;
      }
    }

    const socket = multiplayerSocketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "start_game" }));
    }

    // Start locally as well. The server broadcasts the same event to others.
    setGameStarted(true);
    setMultiplayerStatus("MATCH LIVE");
  };

  const saveScoreToLeaderboard = () => {
    const cleanName = playerName.trim().slice(0, 16);
    if (!cleanName || scoreSaved) return;

    const storedScores = JSON.parse(
      localStorage.getItem("aaruArenaLeaderboard") || "[]"
    );

    storedScores.push({
      name: cleanName,
      score: progressionRef.current.score,
      level: progressionRef.current.level,
      wave,
      date: new Date().toISOString(),
    });

    storedScores.sort((a, b) => b.score - a.score);

    localStorage.setItem(
      "aaruArenaLeaderboard",
      JSON.stringify(storedScores.slice(0, 10))
    );

    setScoreSaved(true);
  };

  // Forces HUD to refresh while power-up timers change
  const [, setPowerUpTick] = useState(0);

  // =====================================================
  // POWER-UP MESSAGE TIMER
  // =====================================================

  const messageTimerRef = useRef(null);

  function showPowerUpMessage(message) {
    setPowerUpMessage(message);

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setPowerUpMessage("");
    }, 1800);
  }

  // =====================================================
  // UPGRADE FUNCTIONS
  // =====================================================

  const applyPowerUpgrade = () => {
    if (!playerRef.current) return;

    playerRef.current.attackDamage =
      (playerRef.current.attackDamage || 25) * 1.15;

    setLevelUp(false);
    levelUpRef.current = false;
  };

  const applySpeedUpgrade = () => {
    if (!playerRef.current) return;

    playerRef.current.speed =
      (playerRef.current.speed || 4) * 1.2;

    setLevelUp(false);
    levelUpRef.current = false;
  };

  const applyVitalityUpgrade = () => {
    if (!playerRef.current) return;

    playerRef.current.maxHealth =
      (playerRef.current.maxHealth || 100) * 1.25;

    playerRef.current.health =
      playerRef.current.maxHealth;

    setHealth(playerRef.current.health);

    setLevelUp(false);
    levelUpRef.current = false;
  };

  // =====================================================
  // SPAWN POWER-UP
  // =====================================================

  function spawnPowerUp(x, y) {
    // 25% chance
    if (Math.random() > 0.25) {
      return;
    }

    const types = [
      "health",
      "rapid",
      "damage",
      "shield",
      "magnet",
    ];

    const type =
      types[Math.floor(Math.random() * types.length)];

    powerUpsRef.current.push(
      new PowerUp(
        x - 16,
        y - 16,
        type
      )
    );
  }

  // =====================================================
  // COLLECT POWER-UP
  // =====================================================

  function collectPowerUp(type) {
    // -----------------------------------------------------
    // HEALTH
    // -----------------------------------------------------

    if (type === "health") {
      const healAmount = 30;

      if (playerRef.current) {
        playerRef.current.health = Math.min(
          playerRef.current.maxHealth || 100,
          playerRef.current.health + healAmount
        );

        setHealth(playerRef.current.health);
      }

      showPowerUpMessage("❤️ HEALTH +30!");
    }

    // -----------------------------------------------------
    // RAPID FIRE
    // -----------------------------------------------------

    if (type === "rapid") {
      rapidFireRef.current = true;

      // 8 seconds at approximately 60 FPS
      rapidFireTimerRef.current = 8 * 60;

      showPowerUpMessage(
        "⚡ RAPID FIRE ACTIVATED!"
      );
    }

    // -----------------------------------------------------
    // DAMAGE BOOST
    // -----------------------------------------------------

    if (type === "damage") {
      damageBoostRef.current = true;

      // 8 seconds
      damageBoostTimerRef.current = 8 * 60;

      showPowerUpMessage(
        "💥 DAMAGE BOOST ACTIVATED!"
      );
    }

    // -----------------------------------------------------
    // SHIELD
    // -----------------------------------------------------

    if (type === "shield") {
      shieldRef.current = true;

      // 8 seconds
      shieldTimerRef.current = 8 * 60;

      showPowerUpMessage(
        "🛡️ SHIELD ACTIVATED!"
      );
    }

    // -----------------------------------------------------
    // XP MAGNET
    // -----------------------------------------------------

    if (type === "magnet") {
      xpMagnetRef.current = true;

      // 8 seconds
      xpMagnetTimerRef.current = 8 * 60;

      showPowerUpMessage(
        "🧲 XP MAGNET ACTIVATED!"
      );
    }
  }

  // =====================================================
  // ENEMY DEFEATED
  // =====================================================

  function handleEnemyDefeated() {
    playSound("defeat");
    triggerScreenShake(3);
    const progression =
      progressionRef.current;

    // -----------------------------------------------------
    // XP MAGNET
    // -----------------------------------------------------
    // Normal enemy XP = 25
    // Magnet = 2x XP
    // -----------------------------------------------------

    const baseXP = 25;

    const xpAmount = xpMagnetRef.current
      ? baseXP * 2
      : baseXP;

    const leveledUp =
      progression.addXP(xpAmount);

    setScore(progression.score);

    setXP(progression.xp);

    setXPToNext(
      progression.xpToNextLevel
    );

    setLevel(
      progression.level
    );

    if (leveledUp) {
      playSound("level");
      levelUpRef.current = true;

      setLevelUp(true);
    }
  }

  function handleBossDefeated(x, y) {
    playSound("victory");
    triggerScreenShake(14);
    const progression = progressionRef.current;
    progression.addXP(250);
    progression.score += 1000;
    setScore(progression.score);
    setXP(progression.xp);
    setXPToNext(progression.xpToNextLevel);
    setLevel(progression.level);
    createHitEffect(x, y, 250, true);
    waveClearedRef.current = true;
    shootingRef.current = false;
    setVictory(true);
    setWaveCleared(false);
    setPowerUpMessage("🏆 BOSS DEFEATED! +1000 SCORE");
  }

  // =====================================================
  // COMBAT EFFECTS
  // =====================================================

  function createHitEffect(
    x,
    y,
    damage,
    dead = false
  ) {
    playSound(dead ? "defeat" : "hit");
    if (dead) triggerScreenShake(5);
    // -----------------------------------------------------
    // DAMAGE NUMBER
    // -----------------------------------------------------

    effectsRef.current.push({
      type: "damage",

      x,
      y,

      value: `-${Math.round(damage)}`,

      life: 45,

      maxLife: 45,

      velocityY: -1.2,
    });

    effectsRef.current.push({
      type: "ring",
      x,
      y,
      radius: dead ? 10 : 5,
      growth: dead ? 4 : 2,
      life: dead ? 24 : 14,
      maxLife: dead ? 24 : 14,
    });

    // -----------------------------------------------------
    // PARTICLES
    // -----------------------------------------------------

    const particleCount =
      dead ? 18 : 8;

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        dead
          ? Math.random() * 4 + 2
          : Math.random() * 2 + 1;

      const life =
        dead
          ? 35 + Math.random() * 20
          : 20 + Math.random() * 15;

      effectsRef.current.push({
        type: "particle",

        x,
        y,

        velocityX:
          Math.cos(angle) * speed,

        velocityY:
          Math.sin(angle) * speed,

        radius:
          Math.random() * 3 + 2,

        life,

        maxLife: life,
      });
    }
  }

  // =====================================================
  // UPDATE EFFECTS
  // =====================================================

  function updateEffects() {
    for (
      let i =
        effectsRef.current.length - 1;
      i >= 0;
      i--
    ) {
      const effect =
        effectsRef.current[i];

      effect.life--;

      if (
        effect.type === "damage"
      ) {
        effect.y +=
          effect.velocityY;
      }

      if (effect.type === "ring") {
        effect.radius += effect.growth;
      }

      if (
        effect.type === "particle"
      ) {
        effect.x +=
          effect.velocityX;

        effect.y +=
          effect.velocityY;

        effect.velocityY += 0.08;

        effect.velocityX *= 0.97;

        effect.velocityY *= 0.97;
      }

      if (effect.life <= 0) {
        effectsRef.current.splice(
          i,
          1
        );
      }
    }
  }

  // =====================================================
  // DRAW EFFECTS
  // =====================================================

  function drawEffects(ctx) {
    effectsRef.current.forEach(
      (effect) => {
        const alpha =
          Math.max(
            0,
            effect.life /
              effect.maxLife
          );

        ctx.save();

        ctx.globalAlpha = alpha;

        // -------------------------------------------------
        // DAMAGE NUMBER
        // -------------------------------------------------

        if (
          effect.type === "damage"
        ) {
          ctx.font =
            "bold 18px Arial";

          ctx.textAlign =
            "center";

          ctx.fillStyle =
            "#ffffff";

          ctx.shadowColor =
            "#00ffff";

          ctx.shadowBlur = 10;

          ctx.fillText(
            effect.value,
            effect.x,
            effect.y
          );
        }

        // -------------------------------------------------
        // PARTICLE
        // -------------------------------------------------

        if (
          effect.type === "particle"
        ) {
          ctx.fillStyle =
            "#00ffff";

          ctx.shadowColor =
            "#00ffff";

          ctx.shadowBlur = 12;

          ctx.beginPath();

          ctx.arc(
            effect.x,
            effect.y,
            effect.radius,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        if (effect.type === "ring") {
          ctx.strokeStyle = "#00ffff";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#00ffff";
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    );
  }

  // =====================================================
  // UPDATE PROJECTILES
  // =====================================================

  function updateProjectiles(canvas) {
    for (
      let p =
        projectilesRef.current.length - 1;
      p >= 0;
      p--
    ) {
      const projectile =
        projectilesRef.current[p];

      projectile.update();

      let projectileHit = false;

      for (
        let e =
          enemiesRef.current.length - 1;
        e >= 0;
        e--
      ) {
        const enemy =
          enemiesRef.current[e];

        const enemyCenterX =
          enemy.x +
          enemy.width / 2;

        const enemyCenterY =
          enemy.y +
          enemy.height / 2;

        const dx =
          projectile.x -
          enemyCenterX;

        const dy =
          projectile.y -
          enemyCenterY;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        if (
          distance <
          enemy.width / 2 +
            projectile.radius
        ) {
          const dead =
            enemy.takeDamage(
              projectile.damage
            );

          createHitEffect(
            enemyCenterX,
            enemyCenterY,
            projectile.damage,
            dead
          );

          // -----------------------------------------------
          // KNOCKBACK
          // -----------------------------------------------

          if (distance > 0) {
            const knockback = 18;

            enemy.x +=
              (dx / distance) *
              knockback;

            enemy.y +=
              (dy / distance) *
              knockback;
          }

          // -----------------------------------------------
          // ENEMY DEATH
          // -----------------------------------------------

          if (dead) {
            enemiesRef.current.splice(e, 1);
            if (enemy.type === "boss") {
              handleBossDefeated(enemyCenterX, enemyCenterY);
            } else {
              spawnPowerUp(enemyCenterX, enemyCenterY);
              handleEnemyDefeated();
            }
          }

          // -----------------------------------------------
          // REMOVE PROJECTILE
          // -----------------------------------------------

          projectilesRef.current.splice(
            p,
            1
          );

          projectileHit = true;

          break;
        }
      }

      if (
        !projectileHit &&
        !projectile.isAlive(canvas)
      ) {
        projectilesRef.current.splice(
          p,
          1
        );
      }
    }
  }

  // =====================================================
  // UPDATE POWER-UPS
  // =====================================================

  function updatePowerUps() {
    if (!playerRef.current) {
      return;
    }

    for (
      let i =
        powerUpsRef.current.length - 1;
      i >= 0;
      i--
    ) {
      const powerUp =
        powerUpsRef.current[i];

      powerUp.update();

      // ---------------------------------------------------
      // COLLECTION
      // ---------------------------------------------------

      if (
        powerUp.isCollected(
          playerRef.current
        )
      ) {
        collectPowerUp(
          powerUp.type
        );

        powerUpsRef.current.splice(
          i,
          1
        );

        continue;
      }

      // ---------------------------------------------------
      // EXPIRED
      // ---------------------------------------------------

      if (
        !powerUp.isAlive()
      ) {
        powerUpsRef.current.splice(
          i,
          1
        );
      }
    }
  }

  // =====================================================
  // POWER-UP TIMERS
  // =====================================================

  function updatePowerUpTimers() {
    let hudChanged = false;

    // -----------------------------------------------------
    // RAPID FIRE
    // -----------------------------------------------------

    if (
      rapidFireTimerRef.current > 0
    ) {
      rapidFireTimerRef.current--;

      hudChanged = true;

      if (
        rapidFireTimerRef.current <= 0
      ) {
        rapidFireRef.current = false;

        showPowerUpMessage(
          "⚡ RAPID FIRE ENDED!"
        );
      }
    }

    // -----------------------------------------------------
    // DAMAGE BOOST
    // -----------------------------------------------------

    if (
      damageBoostTimerRef.current > 0
    ) {
      damageBoostTimerRef.current--;

      hudChanged = true;

      if (
        damageBoostTimerRef.current <= 0
      ) {
        damageBoostRef.current = false;

        showPowerUpMessage(
          "💥 DAMAGE BOOST ENDED!"
        );
      }
    }

    // -----------------------------------------------------
    // SHIELD
    // -----------------------------------------------------

    if (
      shieldTimerRef.current > 0
    ) {
      shieldTimerRef.current--;

      hudChanged = true;

      if (
        shieldTimerRef.current <= 0
      ) {
        shieldRef.current = false;

        showPowerUpMessage(
          "🛡️ SHIELD ENDED!"
        );
      }
    }

    // -----------------------------------------------------
    // XP MAGNET
    // -----------------------------------------------------

    if (
      xpMagnetTimerRef.current > 0
    ) {
      xpMagnetTimerRef.current--;

      hudChanged = true;

      if (
        xpMagnetTimerRef.current <= 0
      ) {
        xpMagnetRef.current = false;

        showPowerUpMessage(
          "🧲 XP MAGNET ENDED!"
        );
      }
    }

    // Update React HUD approximately every few frames
    if (hudChanged) {
      setPowerUpTick(
        (value) => value + 1
      );
    }
  }

  // =====================================================
  // PLAYER MOVEMENT
  // =====================================================

  function updatePlayer(keys, canvas) {
    const currentPlayer =
      playerRef.current;

    if (!currentPlayer) {
      return;
    }

    if (levelUpRef.current) {
      return;
    }

    let dx = 0;
    let dy = 0;

    if (
      keys["w"] ||
      keys["arrowup"]
    ) {
      dy -= 1;

      currentPlayer.direction =
        "up";
    }

    if (
      keys["s"] ||
      keys["arrowdown"]
    ) {
      dy += 1;

      currentPlayer.direction =
        "down";
    }

    if (
      keys["a"] ||
      keys["arrowleft"]
    ) {
      dx -= 1;

      currentPlayer.direction =
        "left";
    }

    if (
      keys["d"] ||
      keys["arrowright"]
    ) {
      dx += 1;

      currentPlayer.direction =
        "right";
    }

    if (touchMoveRef.current.active) {
      const joystickX = touchMoveRef.current.x;
      const joystickY = touchMoveRef.current.y;

      dx += joystickX;
      dy += joystickY;

      // Mobile movement automatically targets the closest enemy.
      const aimDistance = 180;
      const playerCenterX =
        currentPlayer.x + currentPlayer.width / 2;
      const playerCenterY =
        currentPlayer.y + currentPlayer.height / 2;
      let closestEnemy = null;
      let closestDistance = Infinity;

      enemiesRef.current.forEach((enemy) => {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const distance = Math.hypot(
          enemyCenterX - playerCenterX,
          enemyCenterY - playerCenterY
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      });

      if (closestEnemy) {
        mouseRef.current.x =
          closestEnemy.x + closestEnemy.width / 2;
        mouseRef.current.y =
          closestEnemy.y + closestEnemy.height / 2;
      } else {
        mouseRef.current.x = playerCenterX - joystickX * aimDistance;
        mouseRef.current.y = playerCenterY - joystickY * aimDistance;
      }

      if (Math.abs(touchMoveRef.current.x) > 0.15 || Math.abs(touchMoveRef.current.y) > 0.15) {
        const moveX = joystickX;
        const moveY = joystickY;

        if (Math.abs(moveX) > Math.abs(moveY)) {
          currentPlayer.direction = moveX > 0 ? "right" : "left";
        } else if (moveY !== 0) {
          currentPlayer.direction = moveY > 0 ? "down" : "up";
        }
      }
    }

    // -----------------------------------------------------
    // NORMALIZE DIAGONAL MOVEMENT
    // -----------------------------------------------------

    if (
      dx !== 0 ||
      dy !== 0
    ) {
      const magnitude =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      dx /= magnitude;
      dy /= magnitude;
    }

    const speed =
      currentPlayer.speed || 4;

    currentPlayer.x +=
      dx * speed;

    currentPlayer.y +=
      dy * speed;

    // -----------------------------------------------------
    // KEEP PLAYER INSIDE ARENA
    // -----------------------------------------------------

    currentPlayer.x =
      Math.max(
        0,
        Math.min(
          canvas.width -
            currentPlayer.width,
          currentPlayer.x
        )
      );

    currentPlayer.y =
      Math.max(
        0,
        Math.min(
          canvas.height -
            currentPlayer.height,
          currentPlayer.y
        )
      );
  }

  function updateEnemies(canvas) {
    const currentPlayer = playerRef.current;

    if (!currentPlayer) {
      return;
    }

    if (levelUpRef.current) {
      return;
    }

    enemiesRef.current.forEach((enemy) => {
      enemy.update(currentPlayer, canvas);

      // =====================================================
      // SHOOTER ATTACK
      // =====================================================

      if (
        enemy.type === "shooter" &&
        enemy.canShoot()
      ) {
        const direction =
          enemy.getShootDirection(currentPlayer);

        enemyProjectilesRef.current.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          velocityX: direction.x * 4.5,
          velocityY: direction.y * 4.5,
          radius: 6,
          damage: enemy.damage || 12,
          life: 180,
        });
      }

      if (enemy.type === "boss" && enemy.canShoot()) {
        const direction = enemy.getShootDirection(currentPlayer);
        enemyProjectilesRef.current.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          velocityX: direction.x * 5.2,
          velocityY: direction.y * 5.2,
          radius: 8,
          damage: 15,
          life: 220,
          bossShot: true,
        });
      }

      // =====================================================
      // PLAYER COLLISION
      // =====================================================

      const playerCenterX =
        currentPlayer.x + currentPlayer.width / 2;

      const playerCenterY =
        currentPlayer.y + currentPlayer.height / 2;

      const enemyCenterX =
        enemy.x + enemy.width / 2;

      const enemyCenterY =
        enemy.y + enemy.height / 2;

      const dx = enemyCenterX - playerCenterX;
      const dy = enemyCenterY - playerCenterY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      // =====================================================
      // SHIELD PROTECTION
      // =====================================================

      if (
        distance < 60 &&
        enemy.hitTimer <= 0
      ) {
        if (shieldRef.current) {
          enemy.hitTimer = 20;

          if (distance > 0) {
            const shieldKnockback = 22;

            enemy.x +=
              (dx / distance) * shieldKnockback;

            enemy.y +=
              (dy / distance) * shieldKnockback;
          }

          return;
        }

        // ===================================================
        // NORMAL CONTACT DAMAGE
        // ===================================================

        const damage = enemy.damage || 10;

        currentPlayer.health -= damage;
        enemy.hitTimer = 45;

        setHealth(
          Math.max(0, currentPlayer.health)
        );

        if (currentPlayer.health <= 0) {
          shootingRef.current = false;
          setGameOver(true);
        }
      }
    });
  }

  // =====================================================
  // MELEE ATTACK
  // =====================================================

  function performMeleeAttack() {
    const currentPlayer =
      playerRef.current;

    if (!currentPlayer) {
      return;
    }

    if (levelUpRef.current) {
      return;
    }

    if (gameOver || victory) {
      return;
    }

    const now = Date.now();

    // -----------------------------------------------------
    // MELEE COOLDOWN
    // -----------------------------------------------------

    if (
      now -
        performMeleeAttack.lastAttack <
      400
    ) {
      return;
    }

    performMeleeAttack.lastAttack =
      now;

    setAttackEffect(true);

    setTimeout(() => {
      setAttackEffect(false);
    }, 150);

    const attackRange = 85;

    enemiesRef.current =
      enemiesRef.current.filter(
        (enemy) => {
          const playerCenterX =
            currentPlayer.x +
            currentPlayer.width / 2;

          const playerCenterY =
            currentPlayer.y +
            currentPlayer.height / 2;

          const enemyCenterX =
            enemy.x +
            enemy.width / 2;

          const enemyCenterY =
            enemy.y +
            enemy.height / 2;

          const dx =
            enemyCenterX -
            playerCenterX;

          const dy =
            enemyCenterY -
            playerCenterY;

          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy
            );

          if (
            distance <= attackRange
          ) {
            let damage =
              currentPlayer.attackDamage ||
              25;

            // Damage boost also affects melee
            if (
              damageBoostRef.current
            ) {
              damage *= 1.5;
            }

            const dead =
              enemy.takeDamage(
                damage
              );

            createHitEffect(
              enemyCenterX,
              enemyCenterY,
              damage,
              dead
            );

            // -------------------------------------------------
            // KNOCKBACK
            // -------------------------------------------------

            if (distance > 0) {
              const knockback = 25;

              enemy.x +=
                (dx / distance) *
                knockback;

              enemy.y +=
                (dy / distance) *
                knockback;
            }

            // -------------------------------------------------
            // DEATH
            // -------------------------------------------------

            if (dead) {
              if (enemy.type === "boss") {
                handleBossDefeated(enemyCenterX, enemyCenterY);
              } else {
                spawnPowerUp(enemyCenterX, enemyCenterY);
                handleEnemyDefeated();
              }
              return false;
            }
          }

          return true;
        }
      );
  }

  performMeleeAttack.lastAttack = 0;

  // =====================================================
  // MAIN GAME EFFECT
  // =====================================================

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext("2d");

    // ===================================================
    // CANVAS SIZE
    // ===================================================

    const resizeCanvas = () => {
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const isMobileViewport = viewportWidth <= 650;
      const isLandscapeViewport = viewportWidth > viewportHeight;

      canvas.width =
        Math.min(
          Math.max(280, viewportWidth - (isMobileViewport ? 24 : 40)),
          1000
        );

      canvas.height =
        Math.min(
          Math.max(
            isMobileViewport ? 300 : 360,
            viewportHeight - (
              isMobileViewport
                ? isLandscapeViewport ? 120 : 190
                : 180
            )
          ),
          650
        );

      if (playerRef.current) {
        playerRef.current.x = Math.max(
          0,
          Math.min(canvas.width - playerRef.current.width, playerRef.current.x)
        );
        playerRef.current.y = Math.max(
          0,
          Math.min(canvas.height - playerRef.current.height, playerRef.current.y)
        );
      }

      if (isMobileViewport) {
        const joystickBottomOffset = viewportHeight < 500 ? 12 : 190;
        setJoystickPos((position) => ({
          x: Math.max(12, Math.min(viewportWidth - 156, position.x)),
          y: Math.max(84, Math.min(viewportHeight - joystickBottomOffset, position.y)),
        }));
      }
    };

    resizeCanvas();

    window.addEventListener(
      "resize",
      resizeCanvas
    );

    window.visualViewport?.addEventListener(
      "resize",
      resizeCanvas
    );

    // ===================================================
    // PLAYER
    // ===================================================

    if (!playerRef.current) {
      const player =
        new Player(
          canvas.width / 2 - 20,
          canvas.height / 2 - 20,
          playerDesign
        );

      playerRef.current =
        player;
    }



    // ===================================================
    // SPAWN WAVE
    // ===================================================

    // IMPORTANT: create the next wave before allowing the
    // wave-complete check to run. We also remember how many
    // enemies were created so an empty array can NEVER clear
    // a wave that has not actually started.
    if (
      spawnedWaveRef.current !== wave &&
      !waveClearedRef.current &&
      !gameOver &&
      !victory &&
      gameStarted
    ) {
      let spawnedEnemies = [];

      if (wave >= 5) {
        spawnedEnemies = Spawner.createWave(
          4,
          canvas.width,
          canvas.height,
          playerRef.current
        );

        const bossSpawn = Spawner.getSafeSpawnPoint(
          canvas.width,
          canvas.height,
          playerRef.current,
          0,
          90,
          90,
          300
        );

        spawnedEnemies.push(
          new BossEnemy(
            bossSpawn.x,
            bossSpawn.y
          )
        );
      } else {
        spawnedEnemies = Spawner.createWave(
          wave,
          canvas.width,
          canvas.height,
          playerRef.current
        );
      }

      // Defensive check: Spawner must always return an array.
      if (!Array.isArray(spawnedEnemies)) {
        spawnedEnemies = [];
      }

      enemiesRef.current = spawnedEnemies;

      waveEnemyCountRef.current =
        spawnedEnemies.length;

      waveStartedRef.current =
        spawnedEnemies.length > 0;

      waveCompletionLockedRef.current = false;

      spawnedWaveRef.current = wave;

      setEnemiesLeft(
        spawnedEnemies.length
      );
    }

    // ===================================================
    // MOUSE MOVEMENT
    // ===================================================

    const updateAimFromPointer =
      (event) => {
        const rect =
          canvas.getBoundingClientRect();

        mouseRef.current.x =
          ((event.clientX -
            rect.left) *
            canvas.width) /
          rect.width;

        mouseRef.current.y =
          ((event.clientY -
            rect.top) *
            canvas.height) /
          rect.height;
      };

    // ===================================================
    // MOUSE DOWN
    // ===================================================

    const handleMouseDown =
      (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        if (gameOver || victory) {
          return;
        }

        if (waveClearedRef.current) {
          return;
        }

        if (levelUpRef.current) {
          return;
        }

        updateAimFromPointer(event);

        // Start continuous shooting
        shootingRef.current =
          true;
      };

    // ===================================================
    // MOUSE UP
    // ===================================================

    const handleMouseUp =
      (event) => {
        if (event.pointerType === "mouse") {
          if (event.button === 0) {
            shootingRef.current =
              false;
          }
          return;
        }

        shootingRef.current = false;
      };

    const handlePointerMove =
      (event) => {
        if (
          event.pointerType === "touch" ||
          event.pointerType === "mouse"
        ) {
          updateAimFromPointer(event);
        }
      };

    canvas.addEventListener(
      "pointermove",
      handlePointerMove
    );

    canvas.addEventListener(
      "pointerdown",
      handleMouseDown
    );

    canvas.addEventListener(
      "pointerup",
      handleMouseUp
    );

    canvas.addEventListener(
      "pointerleave",
      handleMouseUp
    );

    window.addEventListener(
      "pointerup",
      handleMouseUp
    );

    // ===================================================
    // KEYBOARD
    // ===================================================

    const keys = touchKeysRef.current;

    const handleKeyDown =
      (event) => {
        keys[
          event.key.toLowerCase()
        ] = true;

        if (
          event.code === "Space" &&
          !gameOver &&
          !victory &&
          !waveClearedRef.current &&
          !levelUpRef.current
        ) {
          event.preventDefault();

          performMeleeAttack();
        }
      };

    const handleKeyUp =
      (event) => {
        keys[
          event.key.toLowerCase()
        ] = false;
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "keyup",
      handleKeyUp
    );

    // ===================================================
    // DRAW ARENA
    // ===================================================

    function drawArena() {
      const scene = ENVIRONMENTS[environment] || ENVIRONMENTS.neon;

      ctx.fillStyle =
        scene.base;

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const planetX = canvas.width * 0.82;
      const planetY = canvas.height * 0.2;
      const planetRadius = Math.max(55, Math.min(canvas.width, canvas.height) * 0.13);
      const planetGradient = ctx.createRadialGradient(
        planetX - planetRadius * 0.35,
        planetY - planetRadius * 0.35,
        planetRadius * 0.1,
        planetX,
        planetY,
        planetRadius
      );
      planetGradient.addColorStop(0, `${scene.accent}cc`);
      planetGradient.addColorStop(0.55, `${scene.accent}55`);
      planetGradient.addColorStop(1, `${scene.accent}08`);
      ctx.fillStyle = planetGradient;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${scene.accent}55`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        planetX,
        planetY,
        planetRadius * 1.55,
        planetRadius * 0.3,
        -0.2,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // -------------------------------------------------
      // GRID
      // -------------------------------------------------

      ctx.strokeStyle = scene.grid;

      ctx.lineWidth = 1;

      const gridSize = 40;

      for (
        let x = 0;
        x <= canvas.width;
        x += gridSize
      ) {
        ctx.beginPath();

        ctx.moveTo(
          x,
          0
        );

        ctx.lineTo(
          x,
          canvas.height
        );

        ctx.stroke();
      }

      for (
        let y = 0;
        y <= canvas.height;
        y += gridSize
      ) {
        ctx.beginPath();

        ctx.moveTo(
          0,
          y
        );

        ctx.lineTo(
          canvas.width,
          y
        );

        ctx.stroke();
      }

      // -------------------------------------------------
      // BORDER
      // -------------------------------------------------

      ctx.strokeStyle = scene.border;

      ctx.lineWidth = 2;

      ctx.strokeRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    // ===================================================
    // AIM
    // ===================================================

    function drawAim() {
      const currentPlayer =
        playerRef.current;

      if (!currentPlayer) {
        return;
      }

      const centerX =
        currentPlayer.x +
        currentPlayer.width / 2;

      const centerY =
        currentPlayer.y +
        currentPlayer.height / 2;

      const dx =
        mouseRef.current.x -
        centerX;

      const dy =
        mouseRef.current.y -
        centerY;

      const distance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (distance === 0) {
        return;
      }

      const aimLength = 45;

      const endX =
        centerX +
        (dx / distance) *
          aimLength;

      const endY =
        centerY +
        (dy / distance) *
          aimLength;

      ctx.save();

      ctx.strokeStyle =
        "rgba(0,255,255,0.45)";

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(
        centerX,
        centerY
      );

      ctx.lineTo(
        endX,
        endY
      );

      ctx.stroke();

      ctx.restore();
    }

    // ===================================================
    // MELEE EFFECT
    // ===================================================

    function drawAttackEffect() {
      if (!attackEffect) {
        return;
      }

      const currentPlayer =
        playerRef.current;

      if (!currentPlayer) {
        return;
      }

      const centerX =
        currentPlayer.x +
        currentPlayer.width / 2;

      const centerY =
        currentPlayer.y +
        currentPlayer.height / 2;

      ctx.save();

      ctx.strokeStyle =
        "#00ffff";

      ctx.shadowColor =
        "#00ffff";

      ctx.shadowBlur = 20;

      ctx.lineWidth = 5;

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        60,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.restore();
    }

    // ===================================================
    // DRAW SHIELD
    // ===================================================

    function drawShield() {
      if (!shieldRef.current) {
        return;
      }

      const currentPlayer =
        playerRef.current;

      if (!currentPlayer) {
        return;
      }

      const centerX =
        currentPlayer.x +
        currentPlayer.width / 2;

      const centerY =
        currentPlayer.y +
        currentPlayer.height / 2;

      const pulse =
        Math.sin(
          performance.now() * 0.008
        ) * 4;

      ctx.save();

      ctx.strokeStyle =
        "#00aaff";

      ctx.shadowColor =
        "#00aaff";

      ctx.shadowBlur = 25;

      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        32 + pulse,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.globalAlpha = 0.15;

      ctx.fillStyle =
        "#00aaff";

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        32 + pulse,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.restore();
    }

    // ===================================================
    // SHOOTING
    // ===================================================

    function updateShooting() {
      if (!shootingRef.current) {
        return;
      }

      if (gameOver || victory) {
        return;
      }

      if (waveClearedRef.current) {
        return;
      }

      if (levelUpRef.current) {
        return;
      }

      const now =
        performance.now();

      const shotCooldown =
        rapidFireRef.current
          ? 90
          : 250;

      if (
        now -
          lastShotRef.current <
        shotCooldown
      ) {
        return;
      }

      const currentPlayer =
        playerRef.current;

      if (!currentPlayer) {
        return;
      }

      const projectile =
        new Projectile(
          currentPlayer.x +
            currentPlayer.width / 2,

          currentPlayer.y +
            currentPlayer.height / 2,

          mouseRef.current.x,
          mouseRef.current.y
        );

      playSound("shoot");

      // =================================================
      // DAMAGE BOOST
      // =================================================

      if (damageBoostRef.current) {
        projectile.damage *= 1.5;
      }

      // Also respect player upgrade multiplier if available
      if (
        currentPlayer.damageMultiplier
      ) {
        projectile.damage *=
          currentPlayer.damageMultiplier;
      }

      projectilesRef.current.push(
        projectile
      );

      lastShotRef.current =
        now;
    }

    // ===================================================
    // DRAW REMOTE PLAYERS
    // ===================================================

    function drawRemotePlayers(context) {
      const remotePlayers = Object.values(remotePlayersRef.current);

      remotePlayers.forEach((remotePlayer) => {
        if (!Number.isFinite(remotePlayer.x) || !Number.isFinite(remotePlayer.y)) {
          return;
        }

        const x = remotePlayer.x;
        const y = remotePlayer.y;
        const width = 40;
        const height = 40;

        context.save();
        context.translate(x + width / 2, y + height / 2);
        context.shadowColor = "#00ffff";
        context.shadowBlur = 18;
        context.strokeStyle = "#00ffff";
        context.lineWidth = 2;
        context.strokeRect(-width / 2, -height / 2, width, height);
        context.fillStyle = "rgba(0,255,255,0.16)";
        context.fillRect(-width / 2, -height / 2, width, height);
        context.fillStyle = "#00ffff";
        context.font = "700 11px monospace";
        context.textAlign = "center";
        context.fillText((remotePlayer.name || "PLAYER").slice(0, 12), 0, -28);
        context.restore();
      });
    }

    // ===================================================
    // GAME LOOP
    // ===================================================

    function gameLoop() {
      drawArena();

      if (screenShakeRef.current > 0) {
        const shake = screenShakeRef.current;
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
        screenShakeRef.current *= 0.82;
        if (screenShakeRef.current < 0.2) {
          screenShakeRef.current = 0;
          canvas.style.transform = "";
        }
      }

      if (!gameStarted) {
        drawRemotePlayers(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (paused) {
        drawRemotePlayers(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (!gameOver) {
        updatePlayer(
          keys,
          canvas
        );

        // Send local player position to the room at a controlled rate.
        if (
          gameMode === "multiplayer" &&
          multiplayerSocketRef.current?.readyState === WebSocket.OPEN
        ) {
          const now = performance.now();

          if (now - lastNetworkSyncRef.current >= 50) {
            const currentPlayer = playerRef.current;

            if (currentPlayer) {
              multiplayerSocketRef.current.send(
                JSON.stringify({
                  type: "player_update",
                  x: currentPlayer.x,
                  y: currentPlayer.y,
                  health: currentPlayer.health,
                })
              );
            }

            lastNetworkSyncRef.current = now;
          }
        }

        drawRemotePlayers(ctx);

        updateShooting();

        updateEnemies(
          canvas
        );

        // =====================================================
        // UPDATE ENEMY PROJECTILES
        // =====================================================

        for (
          let i = enemyProjectilesRef.current.length - 1;
          i >= 0;
          i--
        ) {
          const bullet =
            enemyProjectilesRef.current[i];

          bullet.x += bullet.velocityX;
          bullet.y += bullet.velocityY;
          bullet.life--;

          // -----------------------------------------------
          // PLAYER COLLISION
          // -----------------------------------------------

          const player = playerRef.current;

          if (player) {
            const playerCenterX =
              player.x + player.width / 2;

            const playerCenterY =
              player.y + player.height / 2;

            const dx =
              bullet.x - playerCenterX;

            const dy =
              bullet.y - playerCenterY;

            const distance =
              Math.sqrt(dx * dx + dy * dy);

            if (distance < 28) {
              if (!shieldRef.current) {
                player.health -= bullet.damage || 12;
                playSound("damage");
                triggerScreenShake(4);

                setHealth(
                  Math.max(0, player.health)
                );

                if (player.health <= 0) {
                  shootingRef.current = false;
                  setGameOver(true);
                }
              } else {
                createHitEffect(
                  bullet.x,
                  bullet.y,
                  0,
                  false
                );
              }

              enemyProjectilesRef.current.splice(i, 1);
              continue;
            }
          }

          // -----------------------------------------------
          // REMOVE OLD / OFFSCREEN BULLETS
          // -----------------------------------------------

          if (
            bullet.life <= 0 ||
            bullet.x < -50 ||
            bullet.x > canvas.width + 50 ||
            bullet.y < -50 ||
            bullet.y > canvas.height + 50
          ) {
            enemyProjectilesRef.current.splice(i, 1);
          }
        }

        updateProjectiles(
          canvas
        );

        updatePowerUps();

        updatePowerUpTimers();

        updateEffects();
      }

      // =================================================
      // DRAW PROJECTILES
      // =================================================

      projectilesRef.current.forEach(
        (projectile) => {
          projectile.draw(ctx);
        }
      );

      // =================================================
      // DRAW POWER-UPS
      // =================================================

      powerUpsRef.current.forEach(
        (powerUp) => {
          powerUp.draw(ctx);
        }
      );

      // =================================================
      // DRAW ENEMIES
      // =================================================

      enemiesRef.current.forEach(
        (enemy) => {
          enemy.draw(ctx);
        }
      );

      // =================================================
      // AIM
      // =================================================

      drawAim();

      // =================================================
      // DRAW ENEMY PROJECTILES
      // =================================================

      enemyProjectilesRef.current.forEach((bullet) => {
        ctx.save();

        ctx.shadowColor = "#00aaff";
        ctx.shadowBlur = 18;

        ctx.fillStyle = "#00aaff";

        ctx.beginPath();

        ctx.arc(
          bullet.x,
          bullet.y,
          bullet.radius,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
          bullet.x,
          bullet.y,
          2,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
      });

      // =================================================
      // PLAYER
      // =================================================

      if (playerRef.current) {
        playerRef.current.draw(
          ctx
        );
      }

      // =================================================
      // SHIELD
      // =================================================

      drawShield();

      // =================================================
      // MELEE
      // =================================================

      drawAttackEffect();

      // =================================================
      // EFFECTS
      // =================================================

      drawEffects(ctx);

      // =================================================
      // ENEMY COUNT
      // =================================================

      setEnemiesLeft(
        enemiesRef.current.length
      );

      // =================================================
      // WAVE COMPLETE
      // =================================================

      const waveActuallyStarted =
        spawnedWaveRef.current === wave &&
        waveStartedRef.current &&
        waveEnemyCountRef.current > 0;

      const waveHasNoEnemies =
        enemiesRef.current.length === 0;

      if (
        waveActuallyStarted &&
        waveHasNoEnemies &&
        !waveCompletionLockedRef.current &&
        !waveClearedRef.current &&
        !gameOver &&
        !victory &&
        !levelUpRef.current
      ) {
        waveCompletionLockedRef.current = true;

        waveClearedRef.current = true;

        if (playerRef.current) {
          playerRef.current.health =
            playerRef.current.maxHealth || 100;
          setHealth(playerRef.current.health);
        }

        // Refill again before the next wave is mounted so the HUD and player
        // state cannot carry damaged health into the new wave.
        playerRef.current.health = playerRef.current.maxHealth || 100;
        setHealth(playerRef.current.health);
        setWaveCleared(true);

        playSound("wave");
        triggerScreenShake(7);

        shootingRef.current = false;
      }

      // =================================================
      // NEXT FRAME
      // =================================================

      animationRef.current =
        requestAnimationFrame(
          gameLoop
        );
    }

    animationRef.current =
      requestAnimationFrame(
        gameLoop
      );

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      shootingRef.current = false;
      canvas.style.transform = "";

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      cancelAnimationFrame(
        animationRef.current
      );

      window.removeEventListener(
        "resize",
        resizeCanvas
      );

      window.visualViewport?.removeEventListener(
        "resize",
        resizeCanvas
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );

      canvas.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      canvas.removeEventListener(
        "pointerdown",
        handleMouseDown
      );

      canvas.removeEventListener(
        "pointerup",
        handleMouseUp
      );

      canvas.removeEventListener(
        "pointerleave",
        handleMouseUp
      );
    };
  }, [
    wave,
    gameOver,
    waveCleared,
    attackEffect,
    victory,
    gameStarted,
    paused,
    gameMode,
    environment,
    playerDesign,
  ]);

  // =====================================================
  // MULTIPLAYER CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      pendingStartRef.current = false;

      if (multiplayerSocketRef.current) {
        try {
          multiplayerSocketRef.current.close();
        } catch {
          // Ignore cleanup errors.
        }
      }

      multiplayerSocketRef.current = null;
      remotePlayersRef.current = {};
    };
  }, []);

  // =====================================================
  // KEEP WAVE REF IN SYNC
  // =====================================================

  useEffect(() => {
    waveClearedRef.current =
      waveCleared;
  }, [waveCleared]);

  // =====================================================
  // NEXT WAVE
  // =====================================================

  useEffect(() => {
    if (!waveCleared) {
      return;
    }

    if (gameOver || victory) {
      return;
    }

    const timer =
      setTimeout(() => {
        // Clear every wave-specific flag BEFORE React renders
        // the next wave. This guarantees Wave 2+ gets a fresh spawn.
        enemiesRef.current = [];

        waveStartedRef.current = false;
        waveEnemyCountRef.current = 0;
        waveCompletionLockedRef.current = false;
        waveClearedRef.current = false;

        projectilesRef.current = [];
        powerUpsRef.current = [];
        enemyProjectilesRef.current = [];

        setEnemiesLeft(0);
        setWaveCleared(false);

        setWave(
          (previousWave) =>
            previousWave + 1
        );
      }, 2000);

    return () =>
      clearTimeout(timer);
  }, [
    waveCleared,
    gameOver,
  ]);

  // =====================================================
  // RESTART
  // =====================================================

  const restartGame = () => {
    progressionRef.current =
      new Progression();

    playerRef.current =
      null;

    enemiesRef.current =
      [];

    projectilesRef.current =
      [];

    powerUpsRef.current =
      [];

    enemyProjectilesRef.current =
      [];

    effectsRef.current =
      [];

    // -----------------------------------------------------
    // RESET POWER-UPS
    // -----------------------------------------------------

    rapidFireRef.current =
      false;

    rapidFireTimerRef.current =
      0;

    damageBoostRef.current =
      false;

    damageBoostTimerRef.current =
      0;

    shieldRef.current =
      false;

    shieldTimerRef.current =
      0;

    xpMagnetRef.current =
      false;

    xpMagnetTimerRef.current =
      0;

    shootingRef.current =
      false;

    lastShotRef.current =
      0;

    // -----------------------------------------------------
    // RESET GAME
    // -----------------------------------------------------

    levelUpRef.current =
      false;

    waveClearedRef.current =
      false;

    spawnedWaveRef.current = 0;
    waveStartedRef.current = false;
    waveEnemyCountRef.current = 0;
    waveCompletionLockedRef.current = false;

    if (multiplayerSocketRef.current) {
      try {
        multiplayerSocketRef.current.close();
      } catch {
        // Ignore cleanup errors.
      }
    }

    multiplayerSocketRef.current = null;
    remotePlayersRef.current = {};
    localPlayerIdRef.current = null;
    lastNetworkSyncRef.current = 0;
    pendingStartRef.current = false;

    setGameStarted(false);
    setPaused(false);
    setMultiplayerPlayers([]);
    setMultiplayerStatus("OFFLINE");
    setMultiplayerError("");

    setWave(1);

    setHealth(100);

    setScore(0);

    setLevel(1);

    setXP(0);

    setXPToNext(100);

    setEnemiesLeft(5);

    setGameOver(false);

    setVictory(false);

    setWaveCleared(false);

    setLevelUp(false);

    setAttackEffect(false);

    setPowerUpMessage("");
    setPlayerName("");
    setScoreSaved(false);

    setPowerUpTick(
      (value) => value + 1
    );
  };

  // =====================================================
  // FORMAT POWER-UP TIMER
  // =====================================================

  const getSeconds = (frames) => {
    return Math.ceil(
      frames / 60
    );
  };

  // =====================================================
  // ACTIVE POWER-UP HUD
  // =====================================================

  const activePowerUps = [];

  if (rapidFireRef.current) {
    activePowerUps.push({
      label: "⚡ RAPID",
      time: getSeconds(
        rapidFireTimerRef.current
      ),
    });
  }

  if (damageBoostRef.current) {
    activePowerUps.push({
      label: "💥 DAMAGE",
      time: getSeconds(
        damageBoostTimerRef.current
      ),
    });
  }

  if (shieldRef.current) {
    activePowerUps.push({
      label: "🛡️ SHIELD",
      time: getSeconds(
        shieldTimerRef.current
      ),
    });
  }

  if (xpMagnetRef.current) {
    activePowerUps.push({
      label: "🧲 XP MAGNET",
      time: getSeconds(
        xpMagnetTimerRef.current
      ),
    });
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="game-page">

      {!gameStarted && (
        <div className="game-overlay multiplayer-lobby-overlay">
          <div className="overlay-box multiplayer-lobby-box">
            <p className="multiplayer-kicker">AARU ARENA // DEPLOYMENT</p>
            <h1>SET UP YOUR DEPLOYMENT</h1>
            <p className="multiplayer-subtitle">
              SET YOUR CALLSIGN, CHOOSE A MODE, THEN DEPLOY.
            </p>

            <div className="lobby-step">
              <p className="lobby-step-label">01 // CALLSIGN</p>
              <input
                className="leaderboard-name-input multiplayer-input"
                type="text"
                maxLength={16}
                value={playerName}
                onChange={(event) => {
                  setPlayerName(event.target.value.toUpperCase().slice(0, 16));
                  setMultiplayerError("");
                }}
                placeholder="ENTER CALLSIGN"
              />
            </div>

            <div className="lobby-step">
              <p className="lobby-step-label">02 // GAME MODE</p>
              <div className="multiplayer-mode-buttons">
                <button
                  className={`restart-button ${gameMode === "multiplayer" ? "mode-active" : ""}`}
                  onClick={() => {
                    playSound("click");
                    setGameMode("multiplayer");
                    setMultiplayerError("");
                  }}
                >
                  MULTIPLAYER
                </button>
              </div>
              {gameMode === "solo" && (
                <p className="solo-default-note">SOLO MODE DEFAULT</p>
              )}
            </div>

            <div className="lobby-step loadout-links-step">
              <p className="lobby-step-label">03 // LOADOUT</p>
              <div className="loadout-link-grid">
                <Link className="loadout-link-button" to="/environment">
                  <span>LOADOUT 01</span>
                  <strong>ENVIRONMENTS</strong>
                  <small>SELECT: {ENVIRONMENTS[environment]?.name || "NEON PRIME"}</small>
                </Link>
                <Link className="loadout-link-button" to="/style">
                  <span>LOADOUT 02</span>
                  <strong>PLAYER STYLES</strong>
                  <small>SELECT: {PLAYER_DESIGNS[playerDesign]?.name || "AQUA CORE"}</small>
                </Link>
              </div>
            </div>

            {gameMode === "multiplayer" && (
              <>
                <input
                  className="leaderboard-name-input multiplayer-input room-code-input"
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(event) => {
                    setRoomCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6)
                    );
                    setMultiplayerError("");
                  }}
                  placeholder="6-CHAR ROOM CODE"
                />

                <button
                  className="restart-button connect-room-button"
                  onClick={() => {
                    playSound("click");
                    connectMultiplayer();
                  }}
                >
                  JOIN ROOM
                </button>

                <p className="multiplayer-status">
                  {multiplayerStatus}
                </p>

                {multiplayerPlayers.length > 0 && (
                  <div className="room-player-list">
                    {multiplayerPlayers.map((player) => (
                      <span key={player.id}>
                        ◈ {player.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {multiplayerError && (
              <p className="multiplayer-error">{multiplayerError}</p>
            )}

            <div className="lobby-step lobby-deploy-step">
              <p className="lobby-step-label">04 // DEPLOY</p>
              <button
                className="restart-button multiplayer-deploy-button"
                onClick={startArena}
              >
                START MATCH
              </button>
            </div>

            <Link className="leaderboard-action" to="/">
              BACK TO MAIN MENU
            </Link>
          </div>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="game-header">

        <div className="game-title">
          AARU ARENA
          {gameMode === "multiplayer" && gameStarted && (
            <small className="multiplayer-badge">ROOM {roomCode}</small>
          )}
        </div>

        <div className="game-stats">

          <span>
            WAVE {wave}
          </span>

          <span>
            LEVEL {level}
          </span>

          <span>
            SCORE {score}
          </span>

          <span>
            {wave >= 5 && !victory
              ? `BOSS BATTLE | ENEMIES ${enemiesLeft}`
              : `ENEMIES ${enemiesLeft}`}
          </span>

        </div>

      </div>

      {/* =================================================
          HUD
      ================================================= */}

      <div className="game-hud">

        {/* HEALTH */}

        <div className="health-container">

          <div className="hud-label">
            HP
          </div>

          <div className="health-bar">

            <div
              className="health-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    (health /
                      (playerRef.current
                        ?.maxHealth ||
                        100)) *
                      100
                  )
                )}%`,
              }}
            />

          </div>

          <span>
            {Math.ceil(health)} /{" "}
            {Math.ceil(
              playerRef.current
                ?.maxHealth ||
                100
            )}
          </span>

        </div>

        {/* XP */}

        <div className="xp-container">

          <div className="hud-label">
            XP
          </div>

          <div className="xp-bar">

            <div
              className="xp-fill"
              style={{
                width: `${Math.min(
                  100,
                  (xp /
                    xpToNext) *
                    100
                )}%`,
              }}
            />

          </div>

          <span>
            {xp} / {xpToNext}
          </span>

        </div>

      </div>

      {/* =================================================
          ACTIVE POWER-UPS
      ================================================= */}

      {activePowerUps.length > 0 && (
        <div
          className="active-powerups"
          style={{
            position: "fixed",
            top: "155px",
            right: "25px",
            display: "flex",
            flexDirection: "column",
            gap: "7px",
            zIndex: 1000,
          }}
        >
          {activePowerUps.map(
            (powerUp) => (
              <div
                key={powerUp.label}
                style={{
                  padding:
                    "7px 12px",
                  background:
                    "rgba(5,5,5,0.9)",
                  border:
                    "1px solid #00ffff",
                  color: "#00ffff",
                  fontWeight: "800",
                  fontSize: "12px",
                  letterSpacing:
                    "1px",
                  boxShadow:
                    "0 0 10px rgba(0,255,255,0.35)",
                }}
              >
                {powerUp.label}{" "}
                {powerUp.time}s
              </div>
            )
          )}
        </div>
      )}

      {/* =================================================
          POWER-UP MESSAGE
      ================================================= */}

      {powerUpMessage && (
        <div className="power-up-message">
          {powerUpMessage}
        </div>
      )}

      {wave >= 5 && !victory && enemiesRef.current[0]?.type === "boss" && (
        <div style={{ width: "min(720px, 90vw)", margin: "8px auto 10px", textAlign: "center" }}>
          <div style={{ color: "#ff0055", fontWeight: "900", letterSpacing: "4px", fontSize: "13px", marginBottom: "5px", textShadow: "0 0 12px #ff0055" }}>⚠ FINAL BOSS ⚠</div>
          <div style={{ height: "12px", background: "#080808", border: "1px solid #ff0055", boxShadow: "0 0 12px rgba(255,0,85,.35)" }}>
            <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, ((enemiesRef.current[0]?.health || 0) / (enemiesRef.current[0]?.maxHealth || 1)) * 100))}%`, background: "#ff0055", boxShadow: "0 0 14px #ff0055" }} />
          </div>
        </div>
      )}

      {/* =================================================
          CANVAS
      ================================================= */}

      <canvas
        ref={canvasRef}
        className="game-canvas"
      />

      {gameStarted && !gameOver && !victory && (
        <>
          <button
            className="pause-button"
            type="button"
            onClick={() => {
              playSound("click");
              setPaused((value) => {
                shootingRef.current = value;
                return !value;
              });
            }}
            aria-label={paused ? "Resume game" : "Pause game"}
          >
            {paused ? "RESUME" : "PAUSE"}
          </button>

          {paused && (
            <div className="pause-overlay">
              <div className="overlay-box pause-box">
                <p className="multiplayer-kicker">AARU ARENA // SYSTEM HOLD</p>
                <h1>GAME PAUSED</h1>
                <button
                  className="restart-button"
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setPaused(false);
                  }}
                >
                  RESUME MATCH
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* =================================================
          MOBILE CONTROLS
      ================================================= */}

      <div
        className="mobile-controls"
        style={{
          left: "16px",
          bottom: "150px",
        }}
        onPointerDown={(event) => {
          const target = event.target;
          if (target instanceof HTMLElement && target.closest(".mobile-joystick")) {
            return;
          }

          joystickDragRef.current = {
            active: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: joystickPos.x,
            originY: joystickPos.y,
          };

          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (!joystickDragRef.current.active || event.pointerId !== joystickDragRef.current.pointerId) {
            return;
          }

          const dx = event.clientX - joystickDragRef.current.startX;
          const dy = event.clientY - joystickDragRef.current.startY;

          setJoystickPos({
            x: Math.max(12, Math.min((window.visualViewport?.width || window.innerWidth) - 156, joystickDragRef.current.originX + dx)),
            y: Math.max(84, Math.min((window.visualViewport?.height || window.innerHeight) - ((window.visualViewport?.height || window.innerHeight) < 500 ? 12 : 190), joystickDragRef.current.originY + dy)),
          });
        }}
        onPointerUp={(event) => {
          joystickDragRef.current = { active: false, pointerId: null, startX: 0, startY: 0, originX: joystickPos.x, originY: joystickPos.y };
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerLeave={(event) => {
          if (joystickDragRef.current.active && event.pointerId === joystickDragRef.current.pointerId) {
            joystickDragRef.current = { active: false, pointerId: null, startX: 0, startY: 0, originX: joystickPos.x, originY: joystickPos.y };
          }
        }}
      >
        <div
          className={`mobile-joystick ${touchMoveRef.current.active ? "active" : ""}`}
          onPointerDown={(event) => {
            const base = event.currentTarget;
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radius = rect.width / 2 - 10;
            const offsetX = event.clientX - centerX;
            const offsetY = event.clientY - centerY;
            const distance = Math.min(Math.hypot(offsetX, offsetY), radius);
            const angle = Math.atan2(offsetY, offsetX);
            const limitedX = Math.cos(angle) * distance;
            const limitedY = Math.sin(angle) * distance;

            touchMoveRef.current = {
              x: Number((limitedX / radius).toFixed(3)),
              y: Number((limitedY / radius).toFixed(3)),
              active: true,
            };

            const knob = base.querySelector(".joystick-knob");
            if (knob) {
              knob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
            }

            base.setPointerCapture(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            if (!touchMoveRef.current.active) return;

            const base = event.currentTarget;
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radius = rect.width / 2 - 10;
            const offsetX = event.clientX - centerX;
            const offsetY = event.clientY - centerY;
            const distance = Math.min(Math.hypot(offsetX, offsetY), radius);
            const angle = Math.atan2(offsetY, offsetX);
            const limitedX = Math.cos(angle) * distance;
            const limitedY = Math.sin(angle) * distance;

            touchMoveRef.current = {
              x: Number((limitedX / radius).toFixed(3)),
              y: Number((limitedY / radius).toFixed(3)),
              active: true,
            };

            const knob = base.querySelector(".joystick-knob");
            if (knob) {
              knob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
            }
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            touchMoveRef.current = { x: 0, y: 0, active: false };
            const knob = event.currentTarget.querySelector(".joystick-knob");
            if (knob) {
              knob.style.transform = "translate(0px, 0px)";
            }
            event.currentTarget.releasePointerCapture(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerLeave={(event) => {
            event.stopPropagation();
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            touchMoveRef.current = { x: 0, y: 0, active: false };
            const knob = event.currentTarget.querySelector(".joystick-knob");
            if (knob) {
              knob.style.transform = "translate(0px, 0px)";
            }
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="joystick-knob" />
        </div>
      </div>

      {/* =================================================
          CONTROLS
      ================================================= */}

      <div className="controls">

        <span>
          WASD / ARROWS — MOVE
        </span>

        <span>
          SPACE — MELEE
        </span>

        <span>
          MOUSE — AIM
        </span>

        <span>
          LEFT CLICK — SHOOT
        </span>

        {gameMode === "multiplayer" && gameStarted && (
          <span>
            ONLINE — {Math.max(1, multiplayerPlayers.length)}
          </span>
        )}

      </div>

      {/* =================================================
          WAVE CLEARED
      ================================================= */}

      {waveCleared &&
        !gameOver && (
          <div className="game-overlay">

            <div className="overlay-box">

              <h1>
                WAVE {wave} CLEARED
              </h1>

              <p>
                Next wave incoming...
              </p>

            </div>

          </div>
        )}

      {/* =================================================
          LEVEL UP
      ================================================= */}

      {levelUp &&
        !gameOver && (
          <div className="game-overlay">

            <div className="level-up-box">

              <h1>
                LEVEL UP!
              </h1>

              <p>
                Choose your upgrade
              </p>

              <div className="upgrade-options">

                <button
                  onClick={() => {
                    playSound("click");
                    applyPowerUpgrade();
                  }}
                >
                  <strong>
                    POWER
                  </strong>

                  <span>
                    +15% DAMAGE
                  </span>
                </button>

                <button
                  onClick={() => {
                    playSound("click");
                    applySpeedUpgrade();
                  }}
                >
                  <strong>
                    SPEED
                  </strong>

                  <span>
                    +20% SPEED
                  </span>
                </button>

                <button
                  onClick={() => {
                    playSound("click");
                    applyVitalityUpgrade();
                  }}
                >
                  <strong>
                    VITALITY
                  </strong>

                  <span>
                    +25% MAX HP
                  </span>
                </button>

              </div>

            </div>

          </div>
        )}

      {victory && (
        <div className="game-overlay">
          <div className="overlay-box leaderboard-submit-box">
            <h1 style={{ color: "#00ff88", textShadow: "0 0 18px #00ff88" }}>🏆 VICTORY!</h1>
            <p>FINAL BOSS DEFEATED</p>
            <p>Score: {score}</p>
            <p>Level: {level}</p>
            <p>YOU CLEARED AARU ARENA</p>

            {!scoreSaved ? (
              <>
                <input
                  className="leaderboard-name-input"
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveScoreToLeaderboard();
                  }}
                  placeholder="ENTER YOUR CALLSIGN"
                />
                <button
                  className="restart-button leaderboard-save-button"
                  onClick={saveScoreToLeaderboard}
                  disabled={!playerName.trim()}
                >
                  SAVE SCORE
                </button>
              </>
            ) : (
              <p className="score-saved-message">✓ SCORE SAVED TO LEADERBOARD</p>
            )}

            <div className="overlay-actions">
              <Link className="restart-button leaderboard-link-button" to="/leaderboard">
                VIEW LEADERBOARD
              </Link>
              <button className="restart-button" onClick={restartGame}>PLAY AGAIN</button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          GAME OVER
      ================================================= */}

      {gameOver && (
        <div className="game-overlay">

          <div className="overlay-box">

            <h1>
              GAME OVER
            </h1>

            <p>
              Score: {score}
            </p>

            <p>
              Wave: {wave}
            </p>

            {!scoreSaved ? (
              <>
                <input
                  className="leaderboard-name-input"
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveScoreToLeaderboard();
                  }}
                  placeholder="ENTER YOUR CALLSIGN"
                />
                <button
                  className="restart-button leaderboard-save-button"
                  onClick={saveScoreToLeaderboard}
                  disabled={!playerName.trim()}
                >
                  SAVE SCORE
                </button>
              </>
            ) : (
              <p className="score-saved-message">✓ SCORE SAVED TO LEADERBOARD</p>
            )}

            <div className="overlay-actions">
              <Link className="restart-button leaderboard-link-button" to="/leaderboard">
                VIEW LEADERBOARD
              </Link>
              <button
                className="restart-button"
                onClick={restartGame}
              >
                PLAY AGAIN
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Game;
