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

      // Heavy impact, rising alarm, then a command-console confirmation.
      arenaTone(72, 0, 0.7, "sawtooth", 0.12, 34);
      arenaTone(115, 0.35, 1.35, "sawtooth", 0.055, 720);
      arenaTone(260, 1.85, 0.12, "square", 0.045, 180);
      arenaTone(320, 2.15, 0.12, "square", 0.05, 220);
      arenaTone(390, 2.45, 0.16, "square", 0.055, 270);
      arenaTone(90, 2.95, 0.75, "sawtooth", 0.1, 42);
      arenaTone(620, 3.05, 0.5, "square", 0.045, 1180);
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
