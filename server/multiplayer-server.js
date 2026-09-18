import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3001);
const MAX_PLAYERS = 10;
const rooms = new Map();

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function send(socket, message) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastRoom(room) {
  const players = room.players.map(({ socket, ...player }) => player);
  room.players.forEach((player) => send(player.socket, {
    type: "room_state",
    room: room.code,
    hostId: room.hostId,
    started: room.started,
    players,
  }));
}

const server = new WebSocketServer({ port: PORT });

server.on("connection", (socket) => {
  const playerId = Math.random().toString(36).slice(2, 10);
  let room = null;
  let player = null;

  send(socket, { type: "welcome", playerId });

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", message: "INVALID MESSAGE." });
      return;
    }

    if (message.type === "create_room") {
      if (room) return;
      const code = createRoomCode();
      room = { code, hostId: playerId, started: false, players: [] };
      rooms.set(code, room);
      player = { id: playerId, name: String(message.name || "PLAYER").slice(0, 16), x: 0, y: 0, health: 100, socket };
      room.players.push(player);
      send(socket, { type: "room_created", room: code, hostId: playerId });
      broadcastRoom(room);
      return;
    }

    if (message.type === "join_room") {
      const code = String(message.room || "").toUpperCase();
      const targetRoom = rooms.get(code);
      if (!targetRoom) {
        send(socket, { type: "error", message: "ROOM NOT FOUND." });
        return;
      }
      if (targetRoom.players.length >= MAX_PLAYERS) {
        send(socket, { type: "error", message: "ROOM IS FULL. MAXIMUM 10 PLAYERS." });
        return;
      }
      room = targetRoom;
      player = { id: playerId, name: String(message.name || "PLAYER").slice(0, 16), x: 0, y: 0, health: 100, socket };
      room.players.push(player);
      broadcastRoom(room);
      return;
    }

    if (message.type === "start_game") {
      if (!room || room.hostId !== playerId) {
        send(socket, { type: "error", message: "ONLY THE HOST CAN START THE MATCH." });
        return;
      }
      room.started = true;
      room.players.forEach((member) => send(member.socket, { type: "game_started", room: room.code }));
      broadcastRoom(room);
      return;
    }

    if (message.type === "player_update" && room && player) {
      player.x = Number(message.x) || 0;
      player.y = Number(message.y) || 0;
      player.health = Number(message.health) || 0;
      room.players.forEach((member) => {
        if (member.id !== playerId) send(member.socket, { type: "player_update", player: { id: player.id, name: player.name, x: player.x, y: player.y, health: player.health } });
      });
    }
  });

  socket.on("close", () => {
    if (!room || !player) return;
    room.players = room.players.filter((member) => member.id !== playerId);
    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === playerId) room.hostId = room.players[0].id;
    broadcastRoom(room);
  });
});

console.log(`AARU ARENA multiplayer server listening on port ${PORT}`);
