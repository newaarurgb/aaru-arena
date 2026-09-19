import { WebSocketServer } from "ws";

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

/*
 * Keep the WebSocket server between Vercel Function
 * invocations when the runtime keeps the instance alive.
 */

const globalState = globalThis.__AARU_ARENA_WS__;

if (!globalState) {
  globalThis.__AARU_ARENA_WS__ = {
    rooms: new Map(),
    wss: null,
  };
}

const state = globalThis.__AARU_ARENA_WS__;

/*
 * =========================================================
 * ROOM CODE
 * =========================================================
 */

function createRoomCode() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  do {
    code = Array.from(
      { length: 6 },
      () =>
        alphabet[
          Math.floor(
            Math.random() * alphabet.length
          )
        ]
    ).join("");
  } while (state.rooms.has(code));

  return code;
}

/*
 * =========================================================
 * SEND
 * =========================================================
 */

function send(socket, message) {
  if (
    socket &&
    socket.readyState === 1
  ) {
    socket.send(
      JSON.stringify(message)
    );
  }
}

/*
 * =========================================================
 * ROOM STATE
 * =========================================================
 */

function getPublicPlayers(room) {
  return room.players.map(
    ({
      socket,
      ...player
    }) => ({
      ...player,
      isHost:
        player.id === room.hostId,
    })
  );
}

/*
 * =========================================================
 * BROADCAST ROOM
 * =========================================================
 */

function broadcastRoom(room) {
  const players =
    getPublicPlayers(room);

  room.players.forEach(
    (player) => {
      send(player.socket, {
        type: "room_state",
        room: room.code,
        hostId: room.hostId,
        started: room.started,
        players,
      });
    }
  );
}

/*
 * =========================================================
 * CREATE WEBSOCKET SERVER
 * =========================================================
 */

if (!state.wss) {
  state.wss =
    new WebSocketServer({
      noServer: true,
    });

  state.wss.on(
    "connection",
    (socket) => {
      handleConnection(socket);
    }
  );
}

/*
 * =========================================================
 * CONNECTION
 * =========================================================
 */

function handleConnection(socket) {
  const playerId =
    Math.random()
      .toString(36)
      .slice(2, 10);

  let room = null;
  let player = null;

  /*
   * Welcome
   */

  send(socket, {
    type: "welcome",
    playerId,
  });

  /*
   * =======================================================
   * MESSAGE
   * =======================================================
   */

  socket.on(
    "message",
    (raw) => {
      let message;

      try {
        message = JSON.parse(
          raw.toString()
        );
      } catch {
        send(socket, {
          type: "error",
          message:
            "INVALID MESSAGE.",
        });

        return;
      }

      /*
       * ===================================================
       * CREATE ROOM
       * ===================================================
       */

      if (
        message.type ===
        "create_room"
      ) {
        if (room) {
          return;
        }

        const code =
          createRoomCode();

        room = {
          code,
          hostId: playerId,
          started: false,
          players: [],
        };

        state.rooms.set(
          code,
          room
        );

        player = {
          id: playerId,

          name: String(
            message.name ||
              "PLAYER"
          )
            .trim()
            .slice(0, 16),

          avatar:
            Number(
              message.avatar
            ) || 1,

          x: 0,
          y: 0,
          health: 100,

          socket,
        };

        room.players.push(
          player
        );

        send(socket, {
          type: "room_created",
          room: code,
          hostId: playerId,
        });

        broadcastRoom(room);

        return;
      }

      /*
       * ===================================================
       * JOIN ROOM
       * ===================================================
       */

      if (
        message.type ===
        "join_room"
      ) {
        if (room) {
          return;
        }

        const code = String(
          message.room || ""
        )
          .trim()
          .toUpperCase();

        const targetRoom =
          state.rooms.get(
            code
          );

        if (!targetRoom) {
          send(socket, {
            type: "error",
            message:
              "ROOM NOT FOUND.",
          });

          return;
        }

        if (
          targetRoom.started
        ) {
          send(socket, {
            type: "error",
            message:
              "MATCH HAS ALREADY STARTED.",
          });

          return;
        }

        if (
          targetRoom.players
            .length >=
          MAX_PLAYERS
        ) {
          send(socket, {
            type: "error",
            message:
              "ROOM IS FULL. MAXIMUM 10 PLAYERS.",
          });

          return;
        }

        room =
          targetRoom;

        player = {
          id: playerId,

          name: String(
            message.name ||
              "PLAYER"
          )
            .trim()
            .slice(0, 16),

          avatar:
            Number(
              message.avatar
            ) || 1,

          x: 0,
          y: 0,
          health: 100,

          socket,
        };

        room.players.push(
          player
        );

        broadcastRoom(room);

        return;
      }

      /*
       * ===================================================
       * START GAME
       * ===================================================
       */

      if (
        message.type ===
        "start_game"
      ) {
        if (
          !room ||
          !player
        ) {
          send(socket, {
            type: "error",
            message:
              "JOIN A ROOM FIRST.",
          });

          return;
        }

        if (
          room.hostId !==
          playerId
        ) {
          send(socket, {
            type: "error",
            message:
              "ONLY THE HOST CAN START THE MATCH.",
          });

          return;
        }

        if (
          room.players
            .length <
          MIN_PLAYERS
        ) {
          send(socket, {
            type: "error",
            message:
              `AT LEAST ${MIN_PLAYERS} PLAYERS ARE REQUIRED.`,
          });

          return;
        }

        room.started =
          true;

        room.players.forEach(
          (member) => {
            send(
              member.socket,
              {
                type:
                  "game_started",

                room:
                  room.code,
              }
            );
          }
        );

        broadcastRoom(room);

        return;
      }

      /*
       * ===================================================
       * CHAT
       * ===================================================
       */

      if (
        message.type ===
          "chat_message" &&
        room &&
        player
      ) {
        const text =
          String(
            message.text || ""
          )
            .trim()
            .slice(0, 160);

        if (!text) {
          return;
        }

        room.players.forEach(
          (member) => {
            send(
              member.socket,
              {
                type:
                  "chat_message",

                message: {
                  id: `${playerId}-${Date.now()}`,

                  playerId,

                  name:
                    player.name,

                  avatar:
                    player.avatar,

                  text,
                },
              }
            );
          }
        );

        return;
      }

      /*
       * ===================================================
       * PLAYER UPDATE
       * ===================================================
       */

      if (
        message.type ===
          "player_update" &&
        room &&
        player
      ) {
        player.x =
          Number(
            message.x
          ) || 0;

        player.y =
          Number(
            message.y
          ) || 0;

        player.health =
          Number(
            message.health
          ) || 0;

        room.players.forEach(
          (member) => {
            if (
              member.id !==
              playerId
            ) {
              send(
                member.socket,
                {
                  type:
                    "player_update",

                  player: {
                    id:
                      player.id,

                    name:
                      player.name,

                    avatar:
                      player.avatar,

                    x:
                      player.x,

                    y:
                      player.y,

                    health:
                      player.health,
                  },
                }
              );
            }
          }
        );

        return;
      }

      /*
       * ===================================================
       * HEARTBEAT
       * ===================================================
       */

      if (
        message.type ===
        "ping"
      ) {
        send(socket, {
          type: "pong",
        });

        return;
      }
    }
  );

  /*
   * =======================================================
   * CLOSE
   * =======================================================
   */

  socket.on(
    "close",
    () => {
      if (
        !room ||
        !player
      ) {
        return;
      }

      room.players =
        room.players.filter(
          (member) =>
            member.id !==
            playerId
        );

      /*
       * Delete empty room
       */

      if (
        room.players.length ===
        0
      ) {
        state.rooms.delete(
          room.code
        );

        return;
      }

      /*
       * Give host role
       * to next player
       */

      if (
        room.hostId ===
        playerId
      ) {
        room.hostId =
          room.players[0].id;
      }

      broadcastRoom(room);
    }
  );
}

/*
 * =========================================================
 * VERCEL WEBSOCKET HANDLER
 * =========================================================
 */

export default function handler(
  req,
  res
) {
  /*
   * Vercel WebSocket upgrade
   */

  if (
    req.headers.upgrade?.toLowerCase() !==
    "websocket"
  ) {
    res.statusCode = 426;
    res.end(
      "AARU ARENA WebSocket endpoint. Use a WebSocket client."
    );

    return;
  }

  /*
   * Vercel exposes the underlying
   * socket through req.socket.
   */

  const socket =
    req.socket;

  state.wss.handleUpgrade(
    req,
    socket,
    Buffer.alloc(0),
    (ws) => {
      state.wss.emit(
        "connection",
        ws,
        req
      );
    }
  );
}