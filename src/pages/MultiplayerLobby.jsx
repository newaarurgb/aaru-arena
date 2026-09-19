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

  /*
   * =========================================================
   * WEBSOCKET URL
   * =========================================================
   *
   * Local:
   * ws://localhost:3001
   *
   * Vercel:
   * wss://your-domain.vercel.app/api/ws
   *
   * VITE_WS_URL can override this if required.
   */

  const getSocketUrl = () => {
    // If an environment variable exists, use it.
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }

    // Local development
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "ws://localhost:3001";
    }

    // Production / Vercel
    const protocol =
      window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${window.location.host}/api/ws`;
  };

  /*
   * =========================================================
   * CONNECT
   * =========================================================
   */

  const connect = (message) => {
    const cleanName = name.trim().toUpperCase().slice(0, 16);

    if (!cleanName) {
      setError("ENTER A CALLSIGN FIRST.");
      return;
    }

    if (
      message.type === "join_room" &&
      roomCode.trim().length !== 6
    ) {
      setError("ENTER A 6-CHARACTER ROOM CODE.");
      return;
    }

    // Prevent duplicate connections.
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.close();
    }

    setError("");
    setStatus("CONNECTING...");

    const url = getSocketUrl();

    console.log("Connecting to multiplayer:", url);

    try {
      const socket = new WebSocket(url);

      socketRef.current = socket;

      /*
       * =======================================================
       * OPEN
       * =======================================================
       */

      socket.onopen = () => {
        console.log("AARU ARENA multiplayer connected.");

        setStatus("CONNECTED");

        const savedProfile =
          JSON.parse(
            localStorage.getItem("aaruProfile") || "null"
          ) || {};

        socket.send(
          JSON.stringify({
            ...message,
            name: cleanName,
            avatar: savedProfile.avatar || 1,
          })
        );
      };

      /*
       * =======================================================
       * MESSAGE
       * =======================================================
       */

      socket.onmessage = (event) => {
        let incoming;

        try {
          incoming = JSON.parse(event.data);
        } catch {
          console.error("Invalid multiplayer message.");
          return;
        }

        /*
         * SERVER WELCOME
         */

        if (incoming.type === "welcome") {
          playerIdRef.current = incoming.playerId;
        }

        /*
         * ROOM CREATED
         */

        if (incoming.type === "room_created") {
          setRoomCode(incoming.room);

          setIsHost(true);

          setStatus("HOST ROOM READY");
        }

        /*
         * ROOM STATE
         */

        if (incoming.type === "room_state") {
          setRoomCode(incoming.room);

          const roomPlayers = incoming.players || [];

          setPlayers(roomPlayers);

          setStatus(
            `${roomPlayers.length}/10 PLAYERS CONNECTED`
          );

          setIsHost(
            incoming.hostId === playerIdRef.current
          );
        }

        /*
         * CHAT
         */

        if (incoming.type === "chat_message") {
          setChat((messages) => [
            ...messages.slice(-49),
            incoming.message,
          ]);
        }

        /*
         * SERVER ERROR
         */

        if (incoming.type === "error") {
          setError(incoming.message);

          setStatus("ERROR");
        }

        /*
         * GAME STARTED
         */

        if (incoming.type === "game_started") {
          sessionStorage.setItem(
            "aaruMultiplayerRoom",
            incoming.room || roomCode
          );

          sessionStorage.setItem(
            "aaruMultiplayerName",
            cleanName
          );

          sessionStorage.setItem(
            "aaruMultiplayerStarted",
            "true"
          );

          navigate("/game");
        }
      };

      /*
       * =======================================================
       * ERROR
       * =======================================================
       */

      socket.onerror = (event) => {
        console.error(
          "AARU ARENA multiplayer WebSocket error:",
          event
        );

        setStatus("CONNECTION FAILED");

        setError(
          "MULTIPLAYER SERVER CONNECTION FAILED."
        );
      };

      /*
       * =======================================================
       * CLOSE
       * =======================================================
       */

      socket.onclose = () => {
        console.log(
          "AARU ARENA multiplayer connection closed."
        );

        setStatus("DISCONNECTED");

        socketRef.current = null;
      };
    } catch (connectionError) {
      console.error(connectionError);

      setStatus("CONNECTION FAILED");

      setError(
        "UNABLE TO CONNECT TO MULTIPLAYER SERVER."
      );
    }
  };

  /*
   * =========================================================
   * ROOM ACTIONS
   * =========================================================
   */

  const createRoom = () => {
    connect({
      type: "create_room",
    });
  };

  const joinRoom = () => {
    connect({
      type: "join_room",
      room: roomCode.toUpperCase(),
    });
  };

  /*
   * =========================================================
   * START MATCH
   * =========================================================
   */

  const startMatch = () => {
    if (
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      setError("MULTIPLAYER CONNECTION IS NOT READY.");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "start_game",
      })
    );
  };

  /*
   * =========================================================
   * CHAT
   * =========================================================
   */

  const sendChat = (event) => {
    event.preventDefault();

    const text = chatText.trim();

    if (!text) return;

    if (
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      setError("NOT CONNECTED TO MULTIPLAYER.");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "chat_message",
        text,
      })
    );

    setChatText("");
  };

  /*
   * =========================================================
   * COPY ROOM CODE
   * =========================================================
   */

  const copyCode = async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(roomCode);

      setStatus("ROOM CODE COPIED");
    } catch {
      setError("COULD NOT COPY ROOM CODE.");
    }
  };

  /*
   * =========================================================
   * CLEANUP
   * =========================================================
   */

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  /*
   * =========================================================
   * AVATAR
   * =========================================================
   */

  const savedProfile =
    JSON.parse(
      localStorage.getItem("aaruProfile") || "null"
    ) || {};

  const avatar = savedProfile.avatar || 1;

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <main className="game-page multiplayer-page">
      <section className="overlay-box multiplayer-lobby-box multiplayer-page-panel">

        <p className="multiplayer-kicker">
          AARU ARENA // MULTIPLAYER NETWORK
        </p>

        <h1>CREATE OR JOIN MATCH</h1>

        <p className="multiplayer-subtitle">
          HOST A ROOM, COPY THE CODE, AND BRING PLAYERS
          INTO THE ARENA.
        </p>

        {/* CALLSIGN */}

        <div className="lobby-callsign-row">

          <input
            className="leaderboard-name-input multiplayer-input"
            value={name}
            maxLength={16}
            onChange={(event) =>
              setName(
                event.target.value
                  .toUpperCase()
                  .slice(0, 16)
              )
            }
            placeholder="ENTER CALLSIGN"
          />

          <span className="lobby-avatar-preview">
            AVATAR {avatar}
          </span>

        </div>

        {/* ROOM ACTIONS */}

        <div className="multiplayer-lobby-actions">

          <button
            className="restart-button mode-active"
            onClick={createRoom}
          >
            CREATE HOST ROOM
          </button>

          <button
            className="restart-button"
            onClick={joinRoom}
          >
            JOIN ROOM
          </button>

        </div>

        {/* ROOM CODE */}

        <input
          className="leaderboard-name-input multiplayer-input room-code-input"
          value={roomCode}
          maxLength={6}
          onChange={(event) =>
            setRoomCode(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6)
            )
          }
          placeholder="6-CHAR ROOM CODE"
        />

        {/* ROOM DISPLAY */}

        {roomCode && (
          <div className="room-code-display">

            <span>ROOM CODE</span>

            <strong>{roomCode}</strong>

            <button
              className="restart-button"
              onClick={copyCode}
            >
              COPY CODE
            </button>

          </div>
        )}

        {/* STATUS */}

        <p className="multiplayer-status">
          {status}
        </p>

        {/* PLAYERS */}

        {players.length > 0 && (
          <div className="room-player-list">

            {players.map((player) => (
              <span key={player.id}>

                <i className="lobby-player-avatar">
                  {player.avatar || 1}
                </i>

                {" "}

                {player.name}

                {" "}

                {player.isHost
                  ? "// HOST"
                  : ""}

              </span>
            ))}

          </div>
        )}

        {/* CHAT */}

        {roomCode && (
          <div className="waiting-room-chat">

            <div className="chat-heading">

              <span>
                WAITING ROOM CHAT
              </span>

              <small>
                {players.length}/10 CONNECTED
              </small>

            </div>

            <div className="chat-messages">

              {chat.length === 0 ? (
                <p>
                  Room chat is ready.
                </p>
              ) : (
                chat.map((message) => (
                  <p key={message.id}>

                    <strong>
                      {message.name}
                    </strong>

                    {" "}

                    <span>
                      {message.text}
                    </span>

                  </p>
                ))
              )}

            </div>

            <form
              className="chat-form"
              onSubmit={sendChat}
            >

              <input
                value={chatText}
                maxLength={160}
                onChange={(event) =>
                  setChatText(event.target.value)
                }
                placeholder="SEND A MESSAGE"
              />

              <button type="submit">
                SEND
              </button>

            </form>

          </div>
        )}

        {/* ERROR */}

        {error && (
          <p className="multiplayer-error">
            {error}
          </p>
        )}

        {/* HOST START */}

        {isHost && roomCode && (
          <button
            className="restart-button multiplayer-deploy-button"
            disabled={players.length < 2}
            onClick={startMatch}
          >
            {players.length < 2
              ? `WAITING FOR PLAYERS ${players.length}/2`
              : "START MATCH FOR EVERYONE"}
          </button>
        )}

        {/* NAVIGATION */}

        <nav className="multiplayer-page-links">

          <Link
            className="leaderboard-action"
            to="/game"
          >
            BACK TO ARENA
          </Link>

          <Link
            className="leaderboard-action"
            to="/"
          >
            MAIN MENU
          </Link>

        </nav>

      </section>
    </main>
  );
}

export default MultiplayerLobby;