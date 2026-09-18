import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/multiplayer.css";

function MultiplayerLobby() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const playerIdRef = useRef(null);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("OFFLINE");
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatText, setChatText] = useState("");

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
      if (incoming.type === "welcome") {
        playerIdRef.current = incoming.playerId;
      }
      if (incoming.type === "room_created") {
        setRoomCode(incoming.room);
        setIsHost(true);
        setStatus("HOST ROOM READY");
      }
      if (incoming.type === "room_state") {
        setRoomCode(incoming.room);
        setPlayers(incoming.players || []);
        setStatus(`${incoming.players?.length || 0}/10 PLAYERS CONNECTED`);
        setIsHost(incoming.hostId === playerIdRef.current);
      }
      if (incoming.type === "chat_message") {
        setChat((messages) => [...messages.slice(-49), incoming.message]);
      }
      if (incoming.type === "error") {
        setError(incoming.message);
        setStatus("ERROR");
      }
      if (incoming.type === "game_started") {
        sessionStorage.setItem("aaruMultiplayerRoom", incoming.room || roomCode);
        sessionStorage.setItem("aaruMultiplayerName", cleanName);
        sessionStorage.setItem("aaruMultiplayerStarted", "true");
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

  const sendChat = (event) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "chat_message", text }));
    setChatText("");
  };

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

        <div className="lobby-callsign-row">
          <input className="leaderboard-name-input multiplayer-input" value={name} maxLength={16} onChange={(event) => setName(event.target.value.toUpperCase())} placeholder="ENTER CALLSIGN" />
          <span className="lobby-avatar-preview">AVATAR {JSON.parse(localStorage.getItem("aaruProfile") || "null")?.avatar || 1}</span>
        </div>

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
        {players.length > 0 && <div className="room-player-list">{players.map((player) => <span key={player.id}><i className="lobby-player-avatar">{player.avatar || 1}</i> {player.name} {player.isHost ? "// HOST" : ""}</span>)}</div>}
        {roomCode && (
          <div className="waiting-room-chat">
            <div className="chat-heading"><span>WAITING ROOM CHAT</span><small>{players.length}/10 READY</small></div>
            <div className="chat-messages">{chat.length === 0 ? <p>Room chat is ready.</p> : chat.map((message) => <p key={message.id}><strong>{message.name}</strong> <span>{message.text}</span></p>)}</div>
            <form className="chat-form" onSubmit={sendChat}><input value={chatText} maxLength={160} onChange={(event) => setChatText(event.target.value)} placeholder="SEND A MESSAGE" /><button type="submit">SEND</button></form>
          </div>
        )}
        {error && <p className="multiplayer-error">{error}</p>}

        {isHost && roomCode && <button className="restart-button multiplayer-deploy-button" disabled={players.length < 10} onClick={startMatch}>{players.length < 10 ? `WAITING FOR PLAYERS ${players.length}/10` : "START MATCH FOR EVERYONE"}</button>}
        <nav className="multiplayer-page-links"><Link className="leaderboard-action" to="/game">BACK TO DEPLOYMENT</Link><Link className="leaderboard-action" to="/">MAIN MENU</Link></nav>
      </section>
    </main>
  );
}

export default MultiplayerLobby;
