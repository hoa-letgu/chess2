// src/games/xiangqi/hooks/useXiangqiBot.ts
import { useEffect, useRef } from "react";
import { findBestBotMove } from "../utils/xiangqiBotEngine";
import type { XiangqiPieceKey } from "../utils/pieces";

type Side = "red" | "black";
type Board = (XiangqiPieceKey | null | "")[][];

export function useXiangqiBot({
  mode,
  board,
  turn,
  botSide,
  onBotMove,
  setBotThinking,
  historyKeys,
  pausedAfterUndo,      // ⭐ BOT sẽ dừng sau undo / redo
  gameOver,   
  depth = 3,
}: {
  mode: "human" | "bot";
  board: Board;
  turn: Side;
  botSide: Side;

  onBotMove: (move: {
    from: string;
    to: string;
    piece: XiangqiPieceKey;
    capture: XiangqiPieceKey | null;
    check?: boolean;
  }) => void;

  botThinking: boolean;
  setBotThinking: (v: boolean) => void;

  historyKeys: string[];
  pausedAfterUndo: boolean;
  gameOver: boolean; 
  depth?: number;
}) {

  const callbacks=useRef({onBotMove,setBotThinking});
  useEffect(()=>{callbacks.current={onBotMove,setBotThinking};},[onBotMove,setBotThinking]);
  useEffect(() => {
    if(gameOver || mode!=="bot" || turn!==botSide || pausedAfterUndo) {
      callbacks.current.setBotThinking(false);
      return;
    }
    let stopped=false;
    let best: ReturnType<typeof findBestBotMove>=null;
    let worker: Worker | null=null;
    const finish=()=>{
      if(stopped)return;
      stopped=true;clearTimeout(timer);worker?.terminate();
      callbacks.current.setBotThinking(false);
      // Depth one is a bounded fallback if workers are unavailable or fail.
      const move=best??findBestBotMove(board,botSide,historyKeys,1);
      if(move)callbacks.current.onBotMove(move);
    };
    callbacks.current.setBotThinking(true);
    const timer=setTimeout(finish,4000);
    try {
      worker=new Worker(new URL('./xiangqi-bot.worker.ts',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{if(stopped)return;if(data.move)best=data.move;if(data.done)finish();};
      worker.onerror=finish;
      worker.postMessage({board,botSide,historyKeys,depth:depth??4});
    } catch {finish();}
    return ()=>{stopped=true;clearTimeout(timer);worker?.terminate();};
  },[board,turn,mode,botSide,pausedAfterUndo,historyKeys,depth,gameOver]);
}
