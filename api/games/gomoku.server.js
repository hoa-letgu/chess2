/* ================= GOMOKU SERVER ================= */

const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

function checkWin(board, r0, c0) {
  const me = board[r0][c0];
  if (!me) return null;

  const rows = board.length;
  const cols = board[0].length;

  for (const { dr, dc } of DIRS) {
    const line = [{ r: r0, c: c0 }];

    let r = r0 + dr;
    let c = c0 + dc;
    while (
      r >= 0 &&
      c >= 0 &&
      r < rows &&
      c < cols &&
      board[r][c] === me
    ) {
      line.push({ r, c });
      r += dr;
      c += dc;
    }

    r = r0 - dr;
    c = c0 - dc;
    while (
      r >= 0 &&
      c >= 0 &&
      r < rows &&
      c < cols &&
      board[r][c] === me
    ) {
      line.unshift({ r, c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= 5) return line.slice(0, 5);
  }

  return null;
}

/* ================================================= */

export default function registerGomokuServer(io, socket) {
  if (!io.gomokuRooms) io.gomokuRooms = new Map();
  const rooms = io.gomokuRooms;

  function createRoom(roomId, rows = 15, cols = 15) {
    return {
      roomId,
      board: Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null)
      ),
      turn: "X",
      winner: null,
      winnerLine: null,
      ready: false,               // ⭐ QUAN TRỌNG
      players: {
        X: null,
        O: null,
      },
    };
  }

  function assignSeat(room, socketId) {
    if (room.players.X === socketId) return "X";
    if (room.players.O === socketId) return "O";

    if (!room.players.X) {
      room.players.X = socketId;
      return "X";
    }
    if (!room.players.O) {
      room.players.O = socketId;
      return "O";
    }
    return null;
  }

  /* ================= JOIN ROOM ================= */
  socket.on("gomoku:room:join", ({ roomId, rows, cols }) => {
    if (!roomId) return;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, createRoom(roomId, rows, cols));
    }

    const room = rooms.get(roomId);
    const seat = assignSeat(room, socket.id);
    if (!seat) return;

    socket.join(roomId);

    // ⭐ CẬP NHẬT READY
    room.ready = !!(room.players.X && room.players.O);

    socket.emit("gomoku:room:joined", {
      seat,
      state: room,
    });

    // ⭐ BROADCAST STATE MỚI CHO CẢ PHÒNG
    io.to(roomId).emit("gomoku:state", room);
  });

  /* ================= ROOMS LIST ================= */
  socket.on("gomoku:rooms:list", () => {
    const list = [];

    for (const room of rooms.values()) {
      list.push({
        roomId: room.roomId,
        size: `${room.board.length}x${room.board[0].length}`,
        players: {
          X: !!room.players.X,
          O: !!room.players.O,
        },
      });
    }

    socket.emit("gomoku:rooms:list:response", list);
  });

  /* ================= RECEIVE MOVE ================= */
  socket.on("gomoku:move", ({ roomId, r, c }) => {
    const room = rooms.get(roomId);
    if (!room || room.winner) return;

    // ⭐ CHƯA ĐỦ 2 NGƯỜI → KHÔNG ĐƯỢC ĐÁNH
    if (!room.ready) return;

    const seat =
      room.players.X === socket.id
        ? "X"
        : room.players.O === socket.id
        ? "O"
        : null;

    if (!seat) return;
    if (room.turn !== seat) return;
    if (room.board[r]?.[c] !== null) return;

    room.board[r][c] = seat;

    const winLine = checkWin(room.board, r, c);
    if (winLine) {
      room.winner = seat;
      room.winnerLine = winLine;
    } else {
      room.turn = seat === "X" ? "O" : "X";
    }

    io.to(roomId).emit("gomoku:state", room);
  });

  /* ================= SYNC ================= */
  socket.on("gomoku:sync", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) socket.emit("gomoku:state", room);
  });
  /* ================= LEAVE ROOM ================= */
	socket.on("gomoku:room:leave", ({ roomId }) => {
	  const room = rooms.get(roomId);
	  if (!room) return;

	  io.to(roomId).emit("gomoku:room:closed", {
		message: "Một người chơi đã rời phòng. Phòng bị đóng.",
	  });

	  io.in(roomId).socketsLeave(roomId);
	  rooms.delete(roomId);
	});


  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
	  for (const [roomId, room] of rooms.entries()) {
		if (
		  room.players.X === socket.id ||
		  room.players.O === socket.id
		) {
		  io.to(roomId).emit("gomoku:room:closed", {
			message: "Một người chơi đã mất kết nối. Phòng bị đóng.",
		  });

		  io.in(roomId).socketsLeave(roomId);
		  rooms.delete(roomId);
		}
	  }
	});

}
