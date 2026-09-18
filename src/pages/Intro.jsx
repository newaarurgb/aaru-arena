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
      const notes = [
        [110, 0, 0.55],
        [165, 0.5, 0.45],
        [220, 1.05, 0.45],
        [330, 1.65, 0.8],
        [440, 2.55, 1.2],
      ];

      notes.forEach(([frequency, offset, duration]) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + offset);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.8, now + offset + duration);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.045, now + offset + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + duration);
      });
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
