import { MatchHeader, MatchPlayers } from '@/features/arena/MatchSurface';
import React, { useEffect, useState } from "react";
import type { Stone } from "./utils/rules";
import {
  createInitialState,
  applyMove,
  type GoState,
} from "./engine/goEngine";
import { goRegions } from '@/features/arena/placement-model';

import { GoBoard } from "./components/GoBoard";
import { PopupModal } from "@/games/go/components/PopupModal";
import { useSocket } from "@/context/SocketProvider";

const SIZE = 19;

export default function GoGame({ onExit }: { onExit: () => void }) {
  const socket = useSocket();

  // ================= MODE =================
  const [mode, setMode] = useState<"bot" | "online" | null>("bot");


  // ================= GAME STATE =================
  const [state, setState] = useState<GoState>(() =>
    createInitialState(SIZE)
  );
  const { board, turn } = state;
  const [passes,setPasses]=useState(0);
  const finished=passes>=2;
  const score=finished?goRegions(board).score:null;
  function pass(){if(finished)return;setPasses(p=>p+1);setState(s=>({...s,turn:s.turn==='black'?'white':'black',lastMove:null}));}


  // ================= ONLINE =================
  const [roomId, setRoomId] = useState("");
  const [playerColor, setPlayerColor] =
    useState<Exclude<Stone, null>>("black");
  const [roomList, setRoomList] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState("");

  // ================= UI =================
  const [popup, setPopup] = useState<any>({ type: null });

  // ================= RESET =================
  const resetGame = () => {
    setPasses(0);
    setState(createInitialState(SIZE));
  };

  // ================= LOCAL MOVE (BOT / OFFLINE) =================
  const handleLocalMove = (r: number, c: number) => {
    if (mode !== "bot") return;
    if (turn !== "black" || finished) return;

    const res = applyMove(state, r, c);
    if (res.ok) {setState(res.state);setPasses(0);} else return res.reason;
  };

  // ================= ONLINE MOVE =================
  const handleOnlineMove = (r: number, c: number) => {
    if (mode !== "online") return;
    if (!socket || !roomId) return;
    if (turn !== playerColor) return;

    socket.emit("go:move", { roomId, r, c });
  };

  // Keep the Zen drop/capture animations responsive while the bot searches.
  useEffect(() => {
    if(mode!=='bot'||turn!=='white'||finished)return;
    let stopped=false;
    let best:[number,number]|null=null;
    const worker=new Worker(new URL('./bot/go-bot.worker.ts',import.meta.url),{type:'module'});
    const commit=(move:[number,number]|null)=>{
      if(stopped)return;stopped=true;clearTimeout(timer);worker.terminate();
      if(move){const result=applyMove(state,move[0],move[1]);if(result.ok){setState(result.state);setPasses(0);return;}}
      setPasses(p=>p+1);setState(s=>({...s,turn:'black',lastMove:null}));
    };
    const timer=setTimeout(()=>{
      if(best){commit(best);return;}
      for(let r=0;r<state.board.length;r++)for(let c=0;c<state.board.length;c++)if(applyMove(state,r,c).ok){commit([r,c]);return;}
      commit(null);
    },5000);
    worker.onmessage=({data})=>{if(data.move)best=data.move;if(data.done)commit(best);};
    worker.onerror=()=>{if(best)commit(best);};
    worker.postMessage(state);
    return()=>{stopped=true;clearTimeout(timer);worker.terminate();};
  },[turn,state,mode,finished]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!socket) return;

    socket.on("go:rooms:list:response", setRoomList);

    socket.on("go:room:joined", ({ seat, state }) => {
      setRoomId(state.roomId);
      setPlayerColor(seat);
      setState(state);

      setMode("online");
    });

    socket.on("go:state", (state: GoState) => {
      setState(state);
    });

    socket.on("go:player_left", () => {
      setPopup({
        type: "info",
        message: "Đối thủ đã rời phòng. Bạn thắng!",
        onAccept: () => {
          setPopup({ type: null });
          setMode("bot");
          setRoomId("");
          resetGame();
        },
      });
    });
  socket.on("go:room:closed", ({ message }) => {
    setPopup({
      type: "info",
      message,
      onAccept: () => {
        setPopup({ type: null });
        setMode("bot");           // quay về chọn chế độ
        setRoomId("");
        resetGame();
      },
    });
  });

    return () => {
      socket.off("go:rooms:list:response");
      socket.off("go:room:joined");
      socket.off("go:state");
      socket.off("go:player_left");
	  socket.off("go:room:closed");
    };
  }, [socket]);

  // ================= RENDER =================
  return (
    <><MatchHeader mode={mode === "online" ? "online" : "offline"}><button onClick={onExit}>← Sảnh game</button><strong>BOARD ARENA · CỜ VÂY</strong></MatchHeader><main className="offline-legacy-page"><section className="offline-match-panel">
      <h1 className="text-xl font-bold mb-2">
        Cờ Vây –{" "}
        {mode === "bot"
          ? "🤖 BOT"
          : mode === "online"
          ? "🌐 ONLINE"
          : "—"}{" "}
        – {turn === "black" ? "⚫ Đen" : "⚪ Trắng"}
      </h1>

      <MatchPlayers turn={turn === "black" ? 0 : 1} players={[{name:"Quân đen", detail: mode === "bot" ? "Bạn" : "Người chơi đen"},{name:"Quân trắng",detail:mode === "bot" ? "Máy · Khó nhất" : "Người chơi trắng"}]} />
      <GoBoard
        board={board}
        lastMove={state.lastMove}
        finished={finished}
        canMove={!finished && (mode === "bot" ? turn === "black" : mode === "online" && turn === playerColor)}
        onClick={mode === "online" ? handleOnlineMove : handleLocalMove}
      />

      {finished&&score&&<p role="status">Kết thúc · Đen {score[0]} / Trắng {score[1]} (komi 6,5) · {score[0]>score[1]?'Đen thắng':'Trắng thắng'}</p>}
      <div className="legacy-actions">
        <button onClick={pass} disabled={finished||turn!=='black'}>Bỏ lượt</button>
        <button onClick={()=>setPasses(2)} disabled={finished||turn!=='black'}>Chốt bàn luyện tập</button>
        <span>Hai bên bỏ lượt liên tiếp để kết thúc · {passes}/2</span>
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-slate-700 rounded"
        >
          Ván mới
        </button>

        <button
          onClick={onExit}
          className="px-4 py-2 bg-slate-700 rounded"
        >
          Về sảnh
        </button>
      </div>

      {/* ============ SETTINGS / ROOMS ============ */}

      {/* ============ POPUP ============ */}
      <PopupModal popup={popup} setPopup={setPopup} />
    </section></main></>
  );
}
