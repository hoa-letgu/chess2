// games/go.server.js
import {
  playMove,
  boardToKey,
  opposite,
} from "./goRules.js";

export default function registerGoServer(io, socket) {
  if (!io.goRooms) io.goRooms = new Map();
  const rooms = io.goRooms;

  /* ================= CREATE ROOM ================= */
  function createRoom(roomId, size = 19) {
    return {
      roomId,
      board: Array.from({ length: size }, () =>
        Array.from({ length: size }, () => null)
      ),
      turn: "black",
      history: [],
      players: { black: null, white: null },
    };
  }

  /* ================= ASSIGN SEAT ================= */
  function assignSeat(room, socketId) {
    if (room.players.black === socketId) return "black";
    if (room.players.white === socketId) return "white";

    if (!room.players.black) {
      room.players.black = socketId;
      return "black";
    }
    if (!room.players.white) {
      room.players.white = socketId;
      return "white";
    }
    return "spectator";
  }

  /* ================= CREATE / JOIN ================= */
  socket.on("go:room:join", ({ roomId, size }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createRoom(roomId, size || 19));
    }

    const room = rooms.get(roomId);
    const seat = assignSeat(room, socket.id);
    socket.join(roomId);

    // ✅ gửi FULL STATE
    socket.emit("go:room:joined", {
      seat,
      state: room,
    });

    io.to(roomId).emit("go:state", room);
  });

  /* ================= ROOMS LIST ================= */
  socket.on("go:rooms:list", () => {
    const list = [];

    for (const room of rooms.values()) {
      list.push({
        roomId: room.roomId,
        size: room.board.length,
        players: {
          black: !!room.players.black,
          white: !!room.players.white,
        },
      });
    }

    socket.emit("go:rooms:list:response", list);
  });

  /* ================= RECEIVE MOVE ================= */
  socket.on("go:move", ({ roomId, r, c }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const seat =
      room.players.black === socket.id
        ? "black"
        : room.players.white === socket.id
        ? "white"
        : null;

    if (!seat) return;
    if (room.turn !== seat) return;

    const next = playMove(
      room.board,
      r,
      c,
      seat,
      room.history
    );

    if (!next) return;

    room.board = next;
    room.history.push(boardToKey(next));
    room.turn = opposite(seat);

    io.to(roomId).emit("go:state", room);
  });

  /* ================= SYNC ================= */
  socket.on("go:sync", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) socket.emit("go:state", room);
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      const wasPlayer =
        room.players.black === socket.id ||
        room.players.white === socket.id;

      if (wasPlayer) {
        // 🔥 thông báo hủy phòng
        io.to(roomId).emit("go:room:closed", {
          message: "Một người đã thoát. Ván đấu bị hủy.",
        });

        // 🔥 kick toàn bộ socket khỏi room
        io.in(roomId).socketsLeave(roomId);

        // 🔥 xóa room
        rooms.delete(roomId);
      }
    }
  });
}
