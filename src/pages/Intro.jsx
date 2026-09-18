import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";

function Intro() {
  const navigate = useNavigate();
  const completedRef = useRef(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(1);
  const [error, setError] = useState("");

  const avatars = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    variant: index < 10 ? "solar" : "lunar",
    color: ["#00f5ff", "#ff4d8d", "#ffb000", "#8cff00", "#c56bff"][index % 5],
  }));

  const enterArena = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    navigate("/game");
  };

  const continueAsGuest = () => {
    localStorage.setItem("aaruProfile", JSON.stringify({
      displayName: "GUEST PILOT",
      email: "",
      avatar: 1,
      guest: true,
    }));
    enterArena();
  };

  const submitProfile = (event) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim().toUpperCase().slice(0, 16);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("ENTER A VALID EMAIL ADDRESS.");
      return;
    }
    if (password.length < 6) {
      setError("PASSWORD MUST BE AT LEAST 6 CHARACTERS.");
      return;
    }

    const accounts = JSON.parse(localStorage.getItem("aaruAccounts") || "[]");
    const existing = accounts.find((account) => account.email === cleanEmail);

    if (mode === "signup") {
      if (existing) {
        setError("ACCOUNT ALREADY EXISTS. SIGN IN INSTEAD.");
        return;
      }
      accounts.push({ email: cleanEmail, password, displayName: cleanName || "ARENA PILOT", avatar });
      localStorage.setItem("aaruAccounts", JSON.stringify(accounts));
    } else if (!existing || existing.password !== password) {
      setError("EMAIL OR PASSWORD DOES NOT MATCH.");
      return;
    }

    const profile = mode === "signup"
      ? accounts[accounts.length - 1]
      : existing;
    localStorage.setItem("aaruProfile", JSON.stringify({ ...profile, guest: false }));
    enterArena();
  };

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
      <section className="intro-auth-panel">
        <p className="intro-auth-kicker">PILOT ACCESS</p>
        <h2>{mode === "signup" ? "CREATE YOUR PILOT" : "WELCOME BACK, PILOT"}</h2>
        <div className="intro-auth-tabs">
          <button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); }}>SIGN IN</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>CREATE ACCOUNT</button>
        </div>
        <form onSubmit={submitProfile}>
          {mode === "signup" && <input value={displayName} maxLength={16} onChange={(event) => setDisplayName(event.target.value)} placeholder="PILOT NAME" />}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="EMAIL ADDRESS" />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="PASSWORD" />
          {mode === "signup" && (
            <div className="intro-avatar-picker">
              <p>CHOOSE PROFILE AVATAR</p>
              <div className="intro-avatar-grid">
                {avatars.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`intro-avatar ${avatar === item.id ? "selected" : ""} ${item.variant}`}
                    style={{ "--avatar-color": item.color }}
                    onClick={() => setAvatar(item.id)}
                    aria-label={`Choose avatar ${item.id}`}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="intro-auth-error">{error}</p>}
          <button className="intro-auth-submit" type="submit">{mode === "signup" ? "CREATE PROFILE" : "SIGN IN AND PLAY"}</button>
        </form>
        <button className="intro-guest" type="button" onClick={continueAsGuest}>PLAY WITHOUT SIGNING IN</button>
        <p className="intro-local-note">PROFILE SAVED ON THIS DEVICE</p>
      </section>

      <button className="intro-skip" type="button" onClick={continueAsGuest}>PLAY AS GUEST <span>→</span></button>
    </main>
  );
}

export default Intro;
