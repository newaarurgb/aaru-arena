import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/multiplayer.css";

function MultiplayerLobby() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("OFFLINE");
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);

  const socketUrl = () => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.hostname}:3001`;
  };

  const connect = (message) => {
    const cleanName = name.trim().toUpperCase().slice(0, 16);
    if (!cleanName) {
      setError("ENTER A CALLSIGN FIRST.");
      return;
    }

    if (message.type === "join_room" && roomCode.length !== 6) {
      setError("ENTER A 6-CHARACTER ROOM CODE.");
      return;
    }

    setError("");
    setStatus("CONNECTING...");
    const socket = new WebSocket(socketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      const savedProfile = JSON.parse(localStorage.getItem("aaruProfile") || "null") || {};
      socket.send(JSON.stringify({ ...message, name: cleanName, avatar: savedProfile.avatar || 1 }));
    };

    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      if (incoming.type === "room_created") {
        setRoomCode(incoming.room);
        setIsHost(true);
        setStatus("HOST ROOM READY");
      }
      if (incoming.type === "room_state") {
        setRoomCode(incoming.room);
        setPlayers(incoming.players || []);
        setStatus(`${incoming.players?.length || 0}/10 PLAYERS CONNECTED`);
        setIsHost(incoming.hostId === incoming.players?.find((player) => player.name === cleanName)?.id);
      }
      if (incoming.type === "error") {
        setError(incoming.message);
        setStatus("ERROR");
      }
      if (incoming.type === "game_started") {
        sessionStorage.setItem("aaruMultiplayerRoom", roomCode);
        sessionStorage.setItem("aaruMultiplayerName", cleanName);
        navigate("/game");
      }
    };

    socket.onerror = () => {
      setStatus("CONNECTION FAILED");
      setError("START THE MULTIPLAYER SERVER AND TRY AGAIN.");
    };
  };

  const createRoom = () => connect({ type: "create_room" });
  const joinRoom = () => connect({ type: "join_room", room: roomCode.toUpperCase() });
  const startMatch = () => socketRef.current?.send(JSON.stringify({ type: "start_game" }));

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setStatus("ROOM CODE COPIED");
  };

  useEffect(() => () => socketRef.current?.close(), []);

  return (
    <main className="game-page multiplayer-page">
      <section className="overlay-box multiplayer-lobby-box multiplayer-page-panel">
        <p className="multiplayer-kicker">AARU ARENA // MULTIPLAYER NETWORK</p>
        <h1>CREATE OR JOIN MATCH</h1>
        <p className="multiplayer-subtitle">HOST A ROOM, COPY THE CODE, AND BRING UP TO 10 PLAYERS INTO THE ARENA.</p>

        <input className="leaderboard-name-input multiplayer-input" value={name} maxLength={16} onChange={(event) => setName(event.target.value.toUpperCase())} placeholder="ENTER CALLSIGN" />

        <div className="multiplayer-lobby-actions">
          <button className="restart-button mode-active" onClick={createRoom}>CREATE HOST ROOM</button>
          <button className="restart-button" onClick={joinRoom}>JOIN ROOM</button>
        </div>

        <input className="leaderboard-name-input multiplayer-input room-code-input" value={roomCode} maxLength={6} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="6-CHAR ROOM CODE" />

        {roomCode && (
          <div className="room-code-display">
            <span>ROOM CODE</span>
            <strong>{roomCode}</strong>
            <button className="restart-button" onClick={copyCode}>COPY CODE</button>
          </div>
        )}

        <p className="multiplayer-status">{status}</p>
        {players.length > 0 && <div className="room-player-list">{players.map((player) => <span key={player.id}>◈ {player.name}</span>)}</div>}
        {error && <p className="multiplayer-error">{error}</p>}

        {isHost && roomCode && <button className="restart-button multiplayer-deploy-button" onClick={startMatch}>START MATCH</button>}
        <nav className="multiplayer-page-links"><Link className="leaderboard-action" to="/game">BACK TO DEPLOYMENT</Link><Link className="leaderboard-action" to="/">MAIN MENU</Link></nav>
      </section>
    </main>
  );
}

export default MultiplayerLobby;
