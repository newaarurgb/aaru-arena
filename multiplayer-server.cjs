// ============================================================
// AARU ARENA - MULTIPLAYER SERVER
// Host-authoritative CO-OP multiplayer server
// ============================================================

const WebSocket = require("ws");
const http = require("http");

const PORT = process.env.PORT || 3001;

const server = http.createServer();

const wss = new WebSocket.Server({
  server,
  path: "/api/ws",
});

// ============================================================
// ROOM STORAGE
// ============================================================

const rooms = new Map();

const MAX_PLAYERS = 10;

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix = "player") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()
    .toString(36)
    .slice(-5)}`;
}

function send(ws, message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("WebSocket send error:", error);
  }
}

function broadcast(room, message, exceptWs = null) {
  if (!room) return;

  for (const player of room.players.values()) {
    if (player.ws === exceptWs) continue;

    send(player.ws, message);
  }
}

function getRoomState(room) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    started: room.started,

    players: Array.from(room.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      callSign: player.callSign,
      x: player.x,
      y: player.y,
      health: player.health,
      maxHealth: player.maxHealth,
      ready: player.ready,
      alive: player.alive,
    })),
  };
}

function broadcastRoomState(room) {
  if (!room) return;

  broadcast(room, {
    type: "room_state",
    ...getRoomState(room),
  });
}

function createRoomCode() {
  let code;

  do {
    code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms.has(code));

  return code;
}

function removePlayerFromRoom(player) {
  if (!player || !player.roomCode) return;

  const room = rooms.get(player.roomCode);

  if (!room) {
    player.roomCode = null;
    return;
  }

  room.players.delete(player.id);

  console.log(
    `[LEAVE] ${player.name || player.id} left room ${room.code}`
  );

  // ----------------------------------------------------------
  // If host leaves, assign another player as host.
  // ----------------------------------------------------------

  if (room.hostId === player.id) {
    const remainingPlayers = Array.from(room.players.values());

    if (remainingPlayers.length > 0) {
      const newHost = remainingPlayers[0];

      room.hostId = newHost.id;

      console.log(
        `[HOST] ${newHost.name || newHost.id} is now host of ${room.code}`
      );

      send(newHost.ws, {
        type: "host_changed",
        hostId: newHost.id,
      });
    } else {
      rooms.delete(room.code);

      console.log(`[ROOM] Deleted empty room ${room.code}`);

      player.roomCode = null;
      return;
    }
  }

  player.roomCode = null;

  broadcastRoomState(room);
}

// ============================================================
// CONNECTION
// ============================================================

wss.on("connection", (ws, request) => {
  const player = {
    id: generateId(),
    ws,

    name: "Player",
    callSign: "PLAYER",

    roomCode: null,

    x: 0,
    y: 0,

    health: 100,
    maxHealth: 100,

    ready: false,
    alive: true,
  };

  console.log(`[CONNECT] ${player.id}`);

  // ----------------------------------------------------------
  // Welcome message
  // ----------------------------------------------------------

  send(ws, {
    type: "welcome",
    playerId: player.id,
  });

  // ==========================================================
  // MESSAGE HANDLER
  // ==========================================================

  ws.on("message", (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch (error) {
      console.error("[ERROR] Invalid JSON:", error);
      return;
    }

    if (!message || typeof message.type !== "string") {
      return;
    }

    // ========================================================
    // CREATE ROOM
    // ========================================================

    if (message.type === "create_room") {
      // Leave previous room first.
      if (player.roomCode) {
        removePlayerFromRoom(player);
      }

      const roomCode = createRoomCode();

      const room = {
        code: roomCode,

        hostId: player.id,

        started: false,

        players: new Map(),

        // ----------------------------------------------------
        // Shared world is controlled by the host.
        // ----------------------------------------------------

        sharedWorld: null,

        createdAt: Date.now(),
      };

      player.roomCode = roomCode;

      player.name =
        typeof message.name === "string" && message.name.trim()
          ? message.name.trim().slice(0, 24)
          : "Player 1";

      player.callSign =
        typeof message.callSign === "string" && message.callSign.trim()
          ? message.callSign.trim().slice(0, 24)
          : "PLAYER 1";

      room.players.set(player.id, player);

      rooms.set(roomCode, room);

      console.log(
        `[ROOM] Created ${roomCode} by ${player.name} (${player.id})`
      );

      send(ws, {
        type: "room_created",
        roomCode,
        playerId: player.id,
        hostId: room.hostId,
      });

      send(ws, {
        type: "room_state",
        ...getRoomState(room),
      });

      return;
    }

    // ========================================================
    // JOIN ROOM
    // ========================================================

    if (message.type === "join_room") {
      const roomCode = String(message.roomCode || "")
        .trim()
        .toUpperCase();

      if (!roomCode) {
        send(ws, {
          type: "error",
          message: "Room code is required.",
        });

        return;
      }

      const room = rooms.get(roomCode);

      if (!room) {
        send(ws, {
          type: "error",
          message: "Room not found.",
        });

        return;
      }

      if (room.players.size >= MAX_PLAYERS) {
        send(ws, {
          type: "error",
          message: `Room is full. Maximum ${MAX_PLAYERS} players.`,
        });

        return;
      }

      if (room.started) {
        send(ws, {
          type: "error",
          message: "Match has already started.",
        });

        return;
      }

      // Leave old room.
      if (player.roomCode) {
        removePlayerFromRoom(player);
      }

      player.roomCode = roomCode;

      player.name =
        typeof message.name === "string" && message.name.trim()
          ? message.name.trim().slice(0, 24)
          : `Player ${room.players.size + 1}`;

      player.callSign =
        typeof message.callSign === "string" && message.callSign.trim()
          ? message.callSign.trim().slice(0, 24)
          : `PLAYER ${room.players.size + 1}`;

      player.x = 0;
      player.y = 0;

      player.health = 100;
      player.maxHealth = 100;

      player.ready = false;
      player.alive = true;

      room.players.set(player.id, player);

      console.log(
        `[JOIN] ${player.name} joined room ${roomCode}`
      );

      send(ws, {
        type: "room_joined",
        roomCode,
        playerId: player.id,
        hostId: room.hostId,
      });

      broadcastRoomState(room);

      return;
    }

    // ========================================================
    // START GAME
    // ========================================================

    if (message.type === "start_game") {
      if (!player.roomCode) {
        send(ws, {
          type: "error",
          message: "You are not in a room.",
        });

        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room) {
        send(ws, {
          type: "error",
          message: "Room no longer exists.",
        });

        return;
      }

      // ------------------------------------------------------
      // ONLY HOST CAN START
      // ------------------------------------------------------

      if (room.hostId !== player.id) {
        send(ws, {
          type: "error",
          message: "Only the host can start the match.",
        });

        return;
      }

      if (room.started) {
        send(ws, {
          type: "error",
          message: "Match has already started.",
        });

        return;
      }

      room.started = true;

      room.sharedWorld = null;

      console.log(
        `[START] Room ${room.code} started by ${player.name}`
      );

      // ------------------------------------------------------
      // Tell every player the match has started.
      // ------------------------------------------------------

      broadcast(room, {
        type: "game_started",
        roomCode: room.code,
        hostId: room.hostId,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          callSign: p.callSign,
        })),
      });

      // ------------------------------------------------------
      // Immediately send room state too.
      // This prevents host/client race conditions.
      // ------------------------------------------------------

      broadcastRoomState(room);

      return;
    }

    // ========================================================
    // CO-OP ACTION
    // ========================================================
    //
    // Non-host players send actions here.
    //
    // Examples:
    //
    // player_fire
    // player_attack
    // player_move
    //
    // The server attaches the authenticated playerId.
    // The action is then forwarded to the HOST.
    //
    // ========================================================

    if (message.type === "co_op_action") {
      if (!player.roomCode) {
        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room || !room.started) {
        return;
      }

      if (!message.action || typeof message.action !== "object") {
        return;
      }

      const action = {
        ...message.action,

        // NEVER trust playerId supplied by client.
        playerId: player.id,
      };

      const host = room.players.get(room.hostId);

      if (!host) {
        return;
      }

      // ------------------------------------------------------
      // Forward action to host.
      // ------------------------------------------------------

      send(host.ws, {
        type: "co_op_action",
        action,
      });

      return;
    }

    // ========================================================
    // SHARED WORLD STATE
    // ========================================================
    //
    // ONLY HOST is allowed to publish the authoritative world.
    //
    // Host sends:
    //
    // enemies
    // projectiles
    // enemyProjectiles
    // powerUps
    // players
    // wave
    // score
    // level
    // xp
    // gameOver
    // victory
    //
    // Server relays it to all NON-HOST players.
    //
    // ========================================================

    if (message.type === "co_op_state") {
      if (!player.roomCode) {
        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room || !room.started) {
        return;
      }

      // ------------------------------------------------------
      // SECURITY:
      // Only host can publish authoritative state.
      // ------------------------------------------------------

      if (room.hostId !== player.id) {
        return;
      }

      if (!message.state || typeof message.state !== "object") {
        return;
      }

      room.sharedWorld = message.state;

      // ------------------------------------------------------
      // Broadcast to every player except host.
      // ------------------------------------------------------

      broadcast(
        room,
        {
          type: "co_op_state",
          state: room.sharedWorld,
        },
        host.ws
      );

      return;
    }

    // ========================================================
    // PLAYER UPDATE
    // ========================================================
    //
    // Used for player position/health synchronization.
    //
    // ========================================================

    if (message.type === "player_update") {
      if (!player.roomCode) {
        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room) {
        return;
      }

      const update = message.player || message;

      // ------------------------------------------------------
      // Update server-side player data.
      // ------------------------------------------------------

      if (Number.isFinite(update.x)) {
        player.x = update.x;
      }

      if (Number.isFinite(update.y)) {
        player.y = update.y;
      }

      if (Number.isFinite(update.health)) {
        player.health = Math.max(
          0,
          Math.min(player.maxHealth, update.health)
        );
      }

      if (Number.isFinite(update.maxHealth)) {
        player.maxHealth = Math.max(1, update.maxHealth);
      }

      if (typeof update.alive === "boolean") {
        player.alive = update.alive;
      }

      // ------------------------------------------------------
      // Broadcast this player's information.
      // ------------------------------------------------------

      broadcast(
        room,
        {
          type: "player_update",
          player: {
            id: player.id,
            name: player.name,
            callSign: player.callSign,
            x: player.x,
            y: player.y,
            health: player.health,
            maxHealth: player.maxHealth,
            alive: player.alive,
          },
        },
        ws
      );

      return;
    }

    // ========================================================
    // READY
    // ========================================================

    if (message.type === "player_ready") {
      if (!player.roomCode) {
        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room || room.started) {
        return;
      }

      player.ready = Boolean(message.ready);

      broadcastRoomState(room);

      return;
    }

    // ========================================================
    // CHAT
    // ========================================================

    if (message.type === "chat_message") {
      if (!player.roomCode) {
        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room) {
        return;
      }

      const text =
        typeof message.message === "string"
          ? message.message.trim().slice(0, 300)
          : "";

      if (!text) {
        return;
      }

      broadcast(room, {
        type: "chat_message",
        playerId: player.id,
        playerName: player.name,
        callSign: player.callSign,
        message: text,
        timestamp: Date.now(),
      });

      return;
    }

    // ========================================================
    // REQUEST ROOM STATE
    // ========================================================

    if (message.type === "get_room_state") {
      if (!player.roomCode) {
        send(ws, {
          type: "error",
          message: "You are not in a room.",
        });

        return;
      }

      const room = rooms.get(player.roomCode);

      if (!room) {
        send(ws, {
          type: "error",
          message: "Room no longer exists.",
        });

        return;
      }

      send(ws, {
        type: "room_state",
        ...getRoomState(room),
      });

      return;
    }

    // ========================================================
    // PING
    // ========================================================

    if (message.type === "ping") {
      send(ws, {
        type: "pong",
        timestamp: Date.now(),
      });

      return;
    }

    // ========================================================
    // UNKNOWN MESSAGE
    // ========================================================

    console.log(
      `[WARN] Unknown message type: ${message.type}`
    );
  });

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  ws.on("close", () => {
    console.log(`[DISCONNECT] ${player.id}`);

    removePlayerFromRoom(player);
  });

  // ==========================================================
  // ERROR
  // ==========================================================

  ws.on("error", (error) => {
    console.error(
      `[SOCKET ERROR] ${player.id}:`,
      error.message
    );
  });
});

// ============================================================
// SERVER
// ============================================================

server.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("        AARU ARENA MULTIPLAYER SERVER");
  console.log("==============================================");
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`WebSocket path: /api/ws`);
  console.log("");
  console.log("Maximum players per room:", MAX_PLAYERS);
  console.log("Host-authoritative CO-OP: ENABLED");
  console.log("Shared enemy state: ENABLED");
  console.log("Shared projectile state: ENABLED");
  console.log("Shared powerup state: ENABLED");
  console.log("Player synchronization: ENABLED");
  console.log("==============================================");
  console.log("");
});

// ============================================================
// PERIODIC ROOM CLEANUP
// ============================================================

setInterval(() => {
  const now = Date.now();

  for (const [roomCode, room] of rooms.entries()) {
    // Remove completely empty rooms.
    if (room.players.size === 0) {
      rooms.delete(roomCode);
      continue;
    }

    // Remove rooms that somehow remain empty for a long time.
    if (now - room.createdAt > 6 * 60 * 60 * 1000) {
      if (!room.started) {
        rooms.delete(roomCode);

        console.log(
          `[CLEANUP] Removed inactive room ${roomCode}`
        );
      }
    }
  }
}, 60 * 1000);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

function shutdown() {
  console.log("\n[SERVER] Shutting down...");

  for (const room of rooms.values()) {
    broadcast(room, {
      type: "server_shutdown",
      message: "Multiplayer server is shutting down.",
    });
  }

  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);