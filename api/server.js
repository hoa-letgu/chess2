// server.js
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { installArena } from "./arena/server.js";
import { installPublicUi, sameHostOrigin } from "./public-ui.js";

import registerChessServer from "./games/chess.server.js";
import registerXiangqiServer from "./games/xiangqi.server.js"; // 👈 THÊM DÒNG NÀY
import registerGoServer from "./games/go.server.js"; // 👈 THÊM DÒNG NÀY
import registerGomokuServer from "./games/gomoku.server.js";
const app = express();
const publicMode=process.env.ARENA_SERVE_UI==='1';
if(publicMode)app.set('trust proxy','loopback');
else app.use(cors());

const httpServer = createServer(app);
installArena(app, httpServer);
const io = new Server(httpServer, publicMode?{maxHttpBufferSize:16384,allowRequest:(req,callback)=>callback(null,sameHostOrigin(req))}:{cors:{origin:"*"}});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  registerChessServer(io, socket);
  registerXiangqiServer(io, socket);
  registerGoServer(io, socket);
  registerGomokuServer(io, socket);
});

if(publicMode)installPublicUi(app);
const port=Number(process.env.PORT)||3001;
httpServer.listen(port,process.env.HOST||(publicMode?'127.0.0.1':'0.0.0.0'), () => {
  console.log(`Server chạy tại http://127.0.0.1:${port}${publicMode?' · Web + API':''}`);
});
