import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3001);
const MAX_PLAYERS = 10;

const rooms = new Map();

/* =========================================================
   HELPERS
========================================================= */

function createPlayerId() {
  return Math.random().toString(36).slice(2, 10);
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  do {
    code = Array.from(
      { length: 6 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  } while (rooms.has(code));

  return code;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function send(socket, message) {
  if (!socket || socket.readyState !== 1) {
    return;
  }

  try {
    socket.send(JSON.stringify(message));
  } catch {
    // Ignore disconnected sockets.
  }
}

function broadcast(room, message, exceptPlayerId = null) {
  if (!room) return;

  room.players.forEach((member) => {
    if (member.id === exceptPlayerId) return;

    send(member.socket, message);
  });
}

function getPublicPlayers(room) {
  return room.players.map(({ socket, ...player }) => ({
    ...player,
    isHost: player.id === room.hostId,
  }));
}

function broadcastRoom(room) {
  if (!room) return;

  const players = getPublicPlayers(room);

  room.players.forEach((member) => {
    send(member.socket, {
      type: "room_state",
      room: room.code,
      hostId: room.hostId,
      started: room.started,
      players,
    });
  });
}

/* =========================================================
   CO-OP GAME STATE
========================================================= */

function createGameState() {
  return {
    wave: 1,
    score: 0,

    enemies: [],
    projectiles: [],
    powerUps: [],

    boss: null,

    gameOver: false,
    victory: false,

    updatedAt: Date.now(),
  };
}

function createRoom() {
  return {
    code: createRoomCode(),

    hostId: null,

    started: false,

    players: [],

    game: createGameState(),

    lastGameStateUpdate: 0,
  };
}

function sendGameState(room, socket = null) {
  if (!room) return;

  const message = {
    type: "game_state",
    room: room.code,

    hostId: room.hostId,

    players: getPublicPlayers(room),

    game: room.game,
  };

  if (socket) {
    send(socket, message);
    return;
  }

  broadcast(room, message);
}

/* =========================================================
   WEBSOCKET SERVER
========================================================= */

const server = new WebSocketServer({
  port: PORT,
});

console.log(
  `AARU ARENA multiplayer server listening on port ${PORT}`
);

/* =========================================================
   CONNECTION
========================================================= */

server.on("connection", (socket) => {
  const playerId = createPlayerId();

  let room = null;
  let player = null;

  send(socket, {
    type: "welcome",
    playerId,
  });

  /* =======================================================
     MESSAGE HANDLER
  ======================================================= */

  socket.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, {
        type: "error",
        message: "INVALID MESSAGE.",
      });

      return;
    }

    if (!message || typeof message !== "object") {
      return;
    }

    /* =====================================================
       CREATE ROOM
    ===================================================== */

    if (message.type === "create_room") {
      if (room) {
        send(socket, {
          type: "error",
          message: "YOU ARE ALREADY IN A ROOM.",
        });

        return;
      }

      const newRoom = createRoom();

      newRoom.hostId = playerId;

      room = newRoom;

      rooms.set(room.code, room);

      player = {
        id: playerId,

        name: String(message.name || "PLAYER")
          .trim()
          .slice(0, 16),

        avatar: clamp(
          Math.floor(safeNumber(message.avatar, 1)),
          1,
          9
        ),

        x: 0,
        y: 0,

        health: 100,

        socket,
      };

      room.players.push(player);

      send(socket, {
        type: "room_created",
        room: room.code,
        hostId: room.hostId,
      });

      broadcastRoom(room);

      return;
    }

    /* =====================================================
       JOIN ROOM
    ===================================================== */

    if (message.type === "join_room") {
      if (room) {
        send(socket, {
          type: "error",
          message: "YOU ARE ALREADY IN A ROOM.",
        });

        return;
      }

      const code = String(message.room || "")
        .trim()
        .toUpperCase();

      const targetRoom = rooms.get(code);

      if (!targetRoom) {
        send(socket, {
          type: "error",
          message: "ROOM NOT FOUND.",
        });

        return;
      }

      if (targetRoom.started) {
        send(socket, {
          type: "error",
          message: "GAME HAS ALREADY STARTED.",
        });

        return;
      }

      if (targetRoom.players.length >= MAX_PLAYERS) {
        send(socket, {
          type: "error",
          message: `ROOM IS FULL. MAXIMUM ${MAX_PLAYERS} PLAYERS.`,
        });

        return;
      }

      room = targetRoom;

      player = {
        id: playerId,

        name: String(message.name || "PLAYER")
          .trim()
          .slice(0, 16),

        avatar: clamp(
          Math.floor(safeNumber(message.avatar, 1)),
          1,
          9
        ),

        x: 0,
        y: 0,

        health: 100,

        socket,
      };

      room.players.push(player);

      broadcastRoom(room);

      /*
       * Send the current game state to the newly joined player.
       */

      sendGameState(room, socket);

      return;
    }

    /* =====================================================
       START GAME
    ===================================================== */

    if (message.type === "start_game") {
      if (!room || !player) {
        send(socket, {
          type: "error",
          message: "YOU ARE NOT IN A ROOM.",
        });

        return;
      }

      if (room.hostId !== playerId) {
        send(socket, {
          type: "error",
          message: "ONLY THE HOST CAN START THE MATCH.",
        });

        return;
      }

      if (room.started) {
        return;
      }

      /*
       * Start with however many players are currently connected.
       *
       * This is important:
       * the old server required all 10 players before starting.
       * That prevented normal 2-player co-op.
       */

      room.started = true;

      room.game = createGameState();

      room.players.forEach((member) => {
        send(member.socket, {
          type: "game_started",

          room: room.code,

          hostId: room.hostId,

          players: getPublicPlayers(room),
        });
      });

      broadcastRoom(room);

      sendGameState(room);

      return;
    }

    /* =====================================================
       CHAT
    ===================================================== */

    if (message.type === "chat_message") {
      if (!room || !player) return;

      const text = String(message.text || "")
        .trim()
        .slice(0, 160);

      if (!text) return;

      broadcast(room, {
        type: "chat_message",

        message: {
          id: `${playerId}-${Date.now()}`,

          playerId,

          name: player.name,

          avatar: player.avatar,

          text,
        },
      });

      return;
    }

    /* =====================================================
       PLAYER UPDATE
    ===================================================== */

    if (message.type === "player_update") {
      if (!room || !player) return;

      player.x = safeNumber(message.x, player.x);

      player.y = safeNumber(message.y, player.y);

      player.health = clamp(
        safeNumber(message.health, player.health),
        0,
        100
      );

      /*
       * Allow the client to update its display information.
       */

      if (message.name !== undefined) {
        player.name = String(message.name)
          .trim()
          .slice(0, 16);
      }

      if (message.avatar !== undefined) {
        player.avatar = clamp(
          Math.floor(safeNumber(message.avatar, player.avatar)),
          1,
          9
        );
      }

      /*
       * Send this player's movement to EVERY other player.
       */

      broadcast(
        room,
        {
          type: "player_update",

          player: {
            id: player.id,

            name: player.name,

            avatar: player.avatar,

            x: player.x,

            y: player.y,

            health: player.health,
          },
        },
        playerId
      );

      return;
    }

    /* =====================================================
       PLAYER FIRE
    ===================================================== */

    if (message.type === "player_fire") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "player_fire",

          playerId,

          player: {
            id: player.id,

            name: player.name,

            avatar: player.avatar,
          },

          projectile: message.projectile || null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       PLAYER ATTACK / MELEE
    ===================================================== */

    if (message.type === "player_attack") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "player_attack",

          playerId,

          attack: message.attack || null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       ENEMY HIT
    ===================================================== */

    if (message.type === "enemy_hit") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "enemy_hit",

          playerId,

          enemyId: message.enemyId ?? null,

          damage: safeNumber(message.damage, 0),

          hitX: safeNumber(message.x, 0),

          hitY: safeNumber(message.y, 0),
        },
        playerId
      );

      return;
    }

    /* =====================================================
       ENEMY DEFEATED
    ===================================================== */

    if (message.type === "enemy_defeated") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "enemy_defeated",

          playerId,

          enemyId: message.enemyId ?? null,

          score: safeNumber(message.score, 0),

          xp: safeNumber(message.xp, 0),
        },
        playerId
      );

      return;
    }

    /* =====================================================
       BOSS HIT
    ===================================================== */

    if (message.type === "boss_hit") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "boss_hit",

          playerId,

          damage: safeNumber(message.damage, 0),

          bossId: message.bossId ?? null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       BOSS DEFEATED
    ===================================================== */

    if (message.type === "boss_defeated") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "boss_defeated",

          playerId,

          bossId: message.bossId ?? null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       PLAYER DAMAGE
    ===================================================== */

    if (message.type === "player_damage") {
      if (!room || !player) return;

      player.health = clamp(
        safeNumber(message.health, player.health),
        0,
        100
      );

      broadcast(
        room,
        {
          type: "player_damage",

          playerId,

          targetPlayerId:
            message.targetPlayerId || playerId,

          damage: safeNumber(message.damage, 0),

          health: player.health,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       POWER-UP COLLECTED
    ===================================================== */

    if (message.type === "powerup_collected") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "powerup_collected",

          playerId,

          powerUpId: message.powerUpId ?? null,

          powerUpType: message.powerUpType ?? null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       POWER-UP SPAWN
    ===================================================== */

    if (message.type === "powerup_spawn") {
      if (!room || !player) return;

      broadcast(
        room,
        {
          type: "powerup_spawn",

          playerId,

          powerUp: message.powerUp || null,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       WAVE UPDATE
    ===================================================== */

    if (message.type === "wave_state") {
      if (!room || !player) return;

      room.game.wave = Math.max(
        1,
        Math.floor(safeNumber(message.wave, room.game.wave))
      );

      broadcast(
        room,
        {
          type: "wave_state",

          playerId,

          wave: room.game.wave,

          cleared: Boolean(message.cleared),
        },
        playerId
      );

      return;
    }

    /* =====================================================
       SCORE UPDATE
    ===================================================== */

    if (message.type === "score_update") {
      if (!room || !player) return;

      const score = Math.max(
        0,
        safeNumber(message.score, room.game.score)
      );

      room.game.score = score;

      broadcast(
        room,
        {
          type: "score_update",

          playerId,

          score,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       BOSS STATE
    ===================================================== */

    if (message.type === "boss_state") {
      if (!room || !player) return;

      room.game.boss = message.boss || null;

      broadcast(
        room,
        {
          type: "boss_state",

          playerId,

          boss: room.game.boss,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       ENEMY STATE
    ===================================================== */

    if (message.type === "enemy_state") {
      if (!room || !player) return;

      /*
       * Enemy state can be sent by the host.
       */

      if (room.hostId !== playerId) {
        return;
      }

      if (Array.isArray(message.enemies)) {
        room.game.enemies = message.enemies;
      }

      broadcast(
        room,
        {
          type: "enemy_state",

          enemies: room.game.enemies,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       CO-OP GAME STATE
    ===================================================== */

    if (
      message.type === "game_state" ||
      message.type === "coop_state"
    ) {
      if (!room || !player) return;

      /*
       * The host controls the shared world state.
       *
       * This prevents every client from creating a
       * different version of the same enemies/waves.
       */

      if (room.hostId !== playerId) {
        return;
      }

      const now = Date.now();

      /*
       * Limit state updates to approximately 20 per second.
       */

      if (now - room.lastGameStateUpdate < 45) {
        return;
      }

      room.lastGameStateUpdate = now;

      if (
        message.game &&
        typeof message.game === "object"
      ) {
        room.game = {
          ...room.game,
          ...message.game,

          updatedAt: now,
        };
      }

      /*
       * Send the shared world to every other player.
       */

      broadcast(
        room,
        {
          type: "game_state",

          room: room.code,

          hostId: room.hostId,

          players: getPublicPlayers(room),

          game: room.game,
        },
        playerId
      );

      return;
    }

    /* =====================================================
       GAME OVER
    ===================================================== */

    if (message.type === "game_over") {
      if (!room || !player) return;

      room.game.gameOver = true;

      broadcast(
        room,
        {
          type: "game_over",

          playerId,

          score: safeNumber(message.score, 0),
        },
        playerId
      );

      return;
    }

    /* =====================================================
       VICTORY
    ===================================================== */

    if (message.type === "victory") {
      if (!room || !player) return;

      room.game.victory = true;

      broadcast(
        room,
        {
          type: "victory",

          playerId,

          score: safeNumber(message.score, 0),
        },
        playerId
      );

      return;
    }

    /* =====================================================
       REQUEST CURRENT STATE
    ===================================================== */

    if (message.type === "request_game_state") {
      if (!room || !player) return;

      sendGameState(room, socket);

      return;
    }

    /* =====================================================
       REQUEST ROOM STATE
    ===================================================== */

    if (message.type === "request_room_state") {
      if (!room) return;

      broadcastRoom(room);

      return;
    }

    /* =====================================================
       UNKNOWN MESSAGE
    ===================================================== */

    /*
     * Unknown messages are intentionally ignored so that
     * an older client does not crash the server.
     */
  });

  /* =======================================================
     DISCONNECT
  ======================================================= */

  socket.on("close", () => {
    if (!room || !player) {
      return;
    }

    room.players = room.players.filter(
      (member) => member.id !== playerId
    );

    /*
     * Delete empty room.
     */

    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

    /*
     * If host leaves, transfer host to another player.
     */

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;

      /*
       * New host gets a notification.
       */

      const newHost = room.players[0];

      send(newHost.socket, {
        type: "host_changed",

        hostId: newHost.id,
      });
    }

    /*
     * Tell everyone that the player left.
     */

    broadcast(room, {
      type: "player_left",

      playerId,

      players: getPublicPlayers(room),

      hostId: room.hostId,
    });

    broadcastRoom(room);
  });

  /* =======================================================
     SOCKET ERROR
  ======================================================= */

  socket.on("error", () => {
    /*
     * WebSocket errors are handled silently.
     * The close event performs cleanup.
     */
  });
});

/* =========================================================
   SERVER ERROR
========================================================= */

server.on("error", (error) => {
  console.error(
    "AARU ARENA multiplayer server error:",
    error
  );
});