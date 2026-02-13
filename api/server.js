// server.js
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

import registerChessServer from "./games/chess.server.js";
import registerXiangqiServer from "./games/xiangqi.server.js"; // 👈 THÊM DÒNG NÀY
import registerGoServer from "./games/go.server.js"; // 👈 THÊM DÒNG NÀY
import registerGomokuServer from "./games/gomoku.server.js";
const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  registerChessServer(io, socket);
  registerXiangqiServer(io, socket);
  registerGoServer(io, socket);
  registerGomokuServer(io, socket);
});

httpServer.listen(3001, () => {
  console.log("Server chạy tại http://localhost:3001");
});
