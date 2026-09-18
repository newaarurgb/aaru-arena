import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";

function Intro() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const completedRef = useRef(false);

  const enterArena = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (audioRef.current) {
      audioRef.current.close();
      audioRef.current = null;
    }
    navigate("/game");
  };

  useEffect(() => {
    const timer = window.setTimeout(enterArena, 6200);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (AudioContextClass) {
      const audioContext = new AudioContextClass();
      audioRef.current = audioContext;
      const now = audioContext.currentTime;

      const arenaTone = (frequency, offset, duration, type, volume, endFrequency) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + offset;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + duration);
      };

      // Space-war launch: engine rumble, weapon lock, plasma bursts, impact.
      arenaTone(48, 0, 1.25, "sawtooth", 0.13, 28);
      arenaTone(82, 0.18, 1.1, "triangle", 0.08, 42);
      arenaTone(920, 0.95, 0.07, "square", 0.06, 1460);
      arenaTone(1140, 1.18, 0.07, "square", 0.06, 1720);
      arenaTone(1360, 1.41, 0.08, "square", 0.065, 1960);
      arenaTone(180, 1.75, 0.22, "sawtooth", 0.08, 52);
      arenaTone(620, 2.02, 0.09, "square", 0.065, 240);
      arenaTone(760, 2.17, 0.09, "square", 0.065, 280);
      arenaTone(900, 2.32, 0.1, "square", 0.07, 320);
      arenaTone(1080, 2.47, 0.11, "square", 0.075, 380);
      arenaTone(55, 2.8, 1.15, "sawtooth", 0.15, 24);
      arenaTone(130, 2.86, 0.8, "triangle", 0.09, 34);
      arenaTone(260, 3.05, 0.6, "square", 0.08, 70);
    }

    return () => {
      window.clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.close();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <main className="intro-page">
      <div className="intro-stars" />
      <div className="intro-scanlines" />
      <div className="intro-orbit intro-orbit-one" />
      <div className="intro-orbit intro-orbit-two" />
      <div className="intro-planet">
        <div className="intro-planet-light" />
      </div>
      <div className="intro-signal">SIGNAL ACQUIRED // ARENA NETWORK ONLINE</div>
      <section className="intro-content">
        <p className="intro-kicker">AARU SYSTEMS PRESENTS</p>
        <h1>AARU<br /><span>ARENA</span></h1>
        <div className="intro-divider" />
        <p className="intro-tagline">SURVIVE THE WAVES. CLAIM THE VOID.</p>
        <p className="intro-status">INITIALIZING COMBAT SIMULATION...</p>
      </section>
      <button className="intro-skip" type="button" onClick={enterArena}>SKIP INTRO <span>→</span></button>
    </main>
  );
}

export default Intro;
