import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";

function Intro() {
  const navigate = useNavigate();
  const completedRef = useRef(false);

  const enterArena = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    navigate("/game");
  };

  useEffect(() => {
    const timer = window.setTimeout(enterArena, 6200);
    return () => {
      window.clearTimeout(timer);
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
