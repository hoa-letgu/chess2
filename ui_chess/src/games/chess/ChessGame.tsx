import { BOT_PRESETS } from '@/features/arena/bot-presets';
import { MatchHeader, MatchPlayers } from '@/features/arena/MatchSurface';
// ======================================
// src/games/chess/ChessGame.tsx
// ======================================

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Chess } from "chess.js";

import { ChessBoard } from "@/games/chess/components/ChessBoard";

import { useChessBot } from "@/games/chess/hooks/useChessBot";
import { useOnlineRoom } from "@/games/chess/hooks/useOnlineRoom";
import { usePlayerMove } from "@/games/chess/hooks/usePlayerMove";

import { useSocket } from "@/context/SocketProvider";

import { Button } from "@/components/ui/button";
import { RoomSettings } from "@/games/chess/components/RoomSettings";
import { PopupModal } from "@/games/chess/components/PopupModal";
import { OnlineActions } from "@/games/chess/components/OnlineActions";

import { randomUUID } from "@/games/chess/utils/randomUUID";
import { detectGameEnd } from "@/games/chess/utils/detectGameEnd";
import { showSuccess, showError } from "@/games/common/toast";

import { PIECE_IMG, isPieceKey } from "@/games/chess/utils/pieces";
import type { PieceKey } from "@/games/chess/utils/pieces";

const START_FEN = new Chess().fen();

// ===============================
// ✅ SETUP HELPERS (no extra file)
// ===============================
type SetupPiece = PieceKey | null;

function fenToSetupBoard(fen: string): SetupPiece[][] {
  const g = new Chess();
  try {
    g.load(fen);
  } catch {
    g.load(START_FEN);
  }
  const b = g.board(); // r=0 rank8
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      const cell = b[r][c];
      if (!cell) return null;
      const k = (cell.color === "w" ? cell.type.toUpperCase() : cell.type) as any;
      return isPieceKey(k) ? (k as PieceKey) : null;
    })
  );
}

function isValidSetupBoard(setupBoard: SetupPiece[][]): { ok: boolean; reason?: string } {
  let wK = 0;
  let bK = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = setupBoard[r][c];
      if (!p) continue;

      if (p === "K") wK++;
      if (p === "k") bK++;

      // pawn cannot be on rank 1 or 8
      if ((p === "P" || p === "p") && (r === 0 || r === 7)) {
        return { ok: false, reason: "Tốt (pawn) không được nằm ở hàng 1 hoặc 8." };
      }
    }
  }

  if (wK !== 1 || bK !== 1) {
    return { ok: false, reason: "Phải có đúng 1 vua Trắng (K) và 1 vua Đen (k)." };
  }

  return { ok: true };
}

function boardToFen(setupBoard: SetupPiece[][], turn: "w" | "b") {
  // setupBoard r=0 rank8 ... r=7 rank1
  const ranks: string[] = [];

  for (let r = 0; r < 8; r++) {
    let line = "";
    let empties = 0;

    for (let c = 0; c < 8; c++) {
      const p = setupBoard[r][c];
      if (!p) {
        empties++;
      } else {
        if (empties) {
          line += String(empties);
          empties = 0;
        }
        line += p;
      }
    }

    if (empties) line += String(empties);
    ranks.push(line);
  }

  const boardPart = ranks.join("/");

  // Custom setup => safest: no castling, no ep
  const castling = "-";
  const ep = "-";
  const halfmove = "0";
  const fullmove = "1";

  return `${boardPart} ${turn} ${castling} ${ep} ${halfmove} ${fullmove}`;
}

type SetupSnapshot = {
  version: 1;
  board: SetupPiece[][];
  turn: "w" | "b";
  botSide: "w" | "b";
};

function serializeSetup(setupBoard: SetupPiece[][], turn: "w" | "b", botSide: "w" | "b") {
  const payload: SetupSnapshot = {
    version: 1,
    board: setupBoard,
    turn,
    botSide,
  };
  return JSON.stringify(payload);
}

function parseSetupSnapshot(raw: string): SetupSnapshot {
  const data = JSON.parse(raw);

  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu setup không hợp lệ.");
  }

  if (!Array.isArray(data.board) || data.board.length !== 8) {
    throw new Error("Board phải có 8 hàng.");
  }

  for (const row of data.board) {
    if (!Array.isArray(row) || row.length !== 8) {
      throw new Error("Mỗi hàng của board phải có 8 ô.");
    }

    for (const cell of row) {
      if (cell !== null && !isPieceKey(cell)) {
        throw new Error(`Quân cờ không hợp lệ: ${String(cell)}`);
      }
    }
  }

  if (data.turn !== "w" && data.turn !== "b") {
    throw new Error("turn phải là 'w' hoặc 'b'.");
  }

  if (data.botSide !== "w" && data.botSide !== "b") {
    throw new Error("botSide phải là 'w' hoặc 'b'.");
  }

  return {
    version: 1,
    board: data.board,
    turn: data.turn,
    botSide: data.botSide,
  };
}

export default function ChessGame({ onExit }: { onExit: () => void }) {
  const socket = useSocket();
  const gameRef = useRef(new Chess());

  // =======================
  // STATES
  // =======================
  const [mode, setMode] = useState<"bot" | "online" | "botvsbot">("bot");

  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState([START_FEN]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // BOT đi trước / sau (old setting)
  const [botPlaysWhite, setBotPlaysWhite] = useState(false);
  const [pieceTheme, setPieceTheme] = useState<"classic" | "neo" | "wood">("classic");

  // user color (BOT mode)
  const [playerColor, setPlayerColor] = useState<"w" | "b">(botPlaysWhite ? "b" : "w");

  const [onlineColor, setOnlineColor] = useState<"w" | "b" | null>(null);

  const [roomId, setRoomId] = useState("");
  // const [connected, setConnected] = useState(false);

  const [lastMove, setLastMove] = useState<any>(null);
  const [capturedPiece, setCapturedPiece] = useState<any>(null);
  const [deadKingSquare, setDeadKingSquare] = useState<string | null>(null);

  const [botDepth] = useState<number>(BOT_PRESETS.chess.depth);
  const [botThinking, setBotThinking] = useState(false);
  const [setupText, setSetupText] = useState("");
  // const [isAnimating, setIsAnimating] = useState(false);

  const [roomList, setRoomList] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState("");

  const [gameFinished, setGameFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isJoiningRef = useRef(false);
  const lastLocalMoveIdRef = useRef<string | null>(null);
  const isUndoingRef = useRef(false);
  const [botInfo, setBotInfo] = useState<any>(null);

  // ✅ START / PAUSE BOT
  const [gameStarted, setGameStarted] = useState(true);
  const [botPausedUser, setBotPausedUser] = useState(false);
  const botPaused = !gameStarted || botPausedUser || showSettings;

  // =======================
  // ✅ SETUP MODE (drag-drop)
  // =======================
  const [setupMode, setSetupMode] = useState(false);
  const [setupBoard, setSetupBoard] = useState<SetupPiece[][]>(() =>
    Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null))
  );

  // palette pick (click-place optional)
  const [setupPick, setSetupPick] = useState<SetupPiece>("K");

  // ai đi trước trong position setup (turn)
  const [setupTurn, setSetupTurn] = useState<"w" | "b">("w");

  // BOT side trong ván BOT mode
  const [botSide, setBotSide] = useState<"w" | "b">(botPlaysWhite ? "w" : "b");

  // drag state (for ChessBoard)
  const [setupDrag, setSetupDrag] = useState<any>(null);

  const [popup, setPopup] = useState<any>({
    type: null,
    message: "",
    onAccept: null,
    onReject: null,
  });

  const viewColor =
    mode === "bot" ? playerColor : mode === "online" ? (onlineColor ?? "w") : "w";

  // ✅ mỗi khi đổi botPlaysWhite => cập nhật playerColor (bot mode)
  useEffect(() => {
    if (mode !== "bot") return;
    setPlayerColor(botPlaysWhite ? "b" : "w");
    setBotSide(botPlaysWhite ? "w" : "b");
  }, [botPlaysWhite, mode]);

  // =======================
  // DISPLAY GAME (UI only)
  // =======================
  const displayGame = useMemo(() => {
    const g = new Chess();
    const safeFen = typeof fen === "string" && fen.trim() ? fen : START_FEN;

    try {
      g.load(safeFen);
    } catch {
      g.load(START_FEN);
    }
    return g;
  }, [fen]);

  // =======================
  // PUSH STATE
  // =======================
  const pushState = (
    newFen: string,
    newHist: string[],
    newIdx: number,
    emit = true,
    lastMoveSend: any = null
  ) => {
    const moveId = randomUUID();
    lastLocalMoveIdRef.current = moveId;

    setFen(newFen);
    setHistory(newHist);
    setHistoryIndex(newIdx);

    if (mode === "online" && emit && socket && roomId) {
      socket.emit("game:state", {
        roomName: roomId,
        fen: newFen,
        history: newHist,
        historyIndex: newIdx,
        lastMove: lastMoveSend,
        moveId,
      });
    }
  };

  // =======================
  // UNDO / REDO
  // =======================
  const handleUndo = () => {
    if (historyIndex === 0) return;

    isUndoingRef.current = true;
    setBotPausedUser(true);

    const idx = historyIndex - 1;
    const newFen = history[idx];

    gameRef.current.load(newFen);
    setFen(newFen);
    setHistoryIndex(idx);

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;

    isUndoingRef.current = true;
    setBotPausedUser(true);

    const idx = historyIndex + 1;
    const newFen = history[idx];

    gameRef.current.load(newFen);
    setFen(newFen);
    setHistoryIndex(idx);

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  };

  // =======================
  // RESET FUNCTIONS
  // =======================
  const resetBoardState = useCallback(() => {
    const g = new Chess();
    const f = g.fen();

    gameRef.current = g;

    setFen(f);
    setHistory([f]);
    setHistoryIndex(0);

    setPlayerColor(botPlaysWhite ? "b" : "w");

    setLastMove(null);
    setCapturedPiece(null);
    setDeadKingSquare(null);
    setGameFinished(false);
    setBotInfo(null);

    // A new practice match starts immediately. Settings still pause the engine.
    setGameStarted(true);
    setBotPausedUser(false);

    // reset setup
    setSetupMode(false);
    setSetupDrag(null);
  }, [botPlaysWhite]);

  const resetFullGame = () => {
    resetBoardState();
    setOnlineColor(null);
  };

  const resetMatchOnly = () => resetBoardState();

  const handleCheckmate = useCallback((g: Chess) => {
    const loser = g.turn();
    let dead: string | null = null;
    const board = g.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === loser) dead = "abcdefgh"[c] + (8 - r);
      }
    }

    setDeadKingSquare(dead);
    setGameFinished(true);
  }, []);

  // =======================
  // PLAYER MOVE HOOK
  // =======================
  const {
    selectedSquare,
    legalTargets,
    movingPiece,
    movingPath,
    movingStep,
    hidePiece,
    handleSquareClick,
    resetAnimation,
  } = usePlayerMove({
    fen,
    gameRef,
    history,
    historyIndex,
    pushState,
    mode,
    playerColor,
    onlineColor,
    setLastMove,
    setIsAnimating: () => {}, // bạn đang không dùng isAnimating ở đây
    isJoiningRef,
    onMoveApplied: (g: Chess) => {
      const result = detectGameEnd(g);
      setDeadKingSquare(null);

      if (!result.ended) {
        setGameFinished(false);
        return;
      }

      setGameFinished(true);

      if (result.reason === "checkmate") {
        const loser = g.turn();
        const board = g.board();
        let dead: string | null = null;

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.type === "k" && p.color === loser) dead = "abcdefgh"[c] + (8 - r);
          }
        }
        setDeadKingSquare(dead);
      }

      const myColor = mode === "online" ? onlineColor : playerColor;

      const message =
        result.winner === myColor
          ? "🎉 Bạn đã thắng!"
          : result.winner === null
          ? "🤝 Hòa!"
          : "😢 Bạn đã thua!";

      if (mode === "online") {
        setPopup({
          type: "gameEnd",
          message,
          onAccept: () => {
            socket.emit("game:restart", { roomName: roomId });
            setPopup({ type: null });
          },
          onReject: () => {
            socket.emit("room:leave:request", { roomName: roomId });
            setPopup({ type: null });
          },
        });
      } else {
        setPopup({
          type: "gameEnd",
          message,
          onAccept: () => {
            resetMatchOnly();
            setGameFinished(false);
            setPopup({ type: null });
          },
          onReject: () => setPopup({ type: null }),
        });
      }
    },
  });

  // =======================
  // BOT HOOK
  // =======================
  useChessBot({
    mode,
    playerColor,
    botDepth,
    timeLimitMs: BOT_PRESETS.chess.timeLimitMs,
    fen,
    game: gameRef.current,
    history,
    historyIndex,
    setFen,
    setHistory,
    setHistoryIndex,
    botThinking,
    setBotThinking,
    setLastMove,
    isUndoingRef,
    botPaused,
    botSide: mode === "botvsbot" ? "both" : botSide,
    setBotInfo,
  });

  // =======================
  // ONLINE ROOM HOOK
  // =======================
  useOnlineRoom({
    mode,
    socket,
    roomId,
    setConnected: () => {},
    setOnlineColor,
    setFen,
    setHistory,
    setHistoryIndex,
    setLastMove,
    lastLocalMoveIdRef,
    resetAnimation,
    isJoiningRef,
  });

  // =======================
  // SOCKET EVENTS
  // =======================
  useEffect(() => {
    if (!socket) return;

    socket.on("rooms:list:response", (list: any) => setRoomList(list));
    socket.on("rooms:update", () => socket.emit("rooms:list"));

    socket.on("game:update", ({ fen, history, historyIndex, lastMove }: any) => {
      const g = new Chess();
      g.load(fen);

      if (g.isCheckmate()) handleCheckmate(g);

      setFen(fen);
      setHistory(history);
      setHistoryIndex(historyIndex);
      setLastMove(lastMove);
    });

    socket.on("room:full", () => showError("Không thể vào phòng", "Phòng đã đủ 2 người!"));

    socket.on("rooms:clear:done", ({ removed }: any) => {
      showSuccess("Dọn phòng thành công", `Đã xoá ${removed} phòng trống.`);
    });

    socket.on("room:created", ({ roomName }: any) => {
      showSuccess("Tạo phòng thành công", `Phòng: ${roomName}`);
      setRoomId(roomName);
      socket.emit("room:join", { roomName });
      setShowSettings(false);
    });

    socket.on("room:force-leave", () => {
      resetBoardState();
      setRoomId("");
      setOnlineColor(null);
      setGameFinished(false);
      showError("Phòng đã đóng", "Bạn đã bị rời khỏi phòng");
    });

    socket.on("room:left", () => {
      resetFullGame();
      setRoomId("");
      setOnlineColor(null);
      showSuccess("Đã rời phòng");
    });

    socket.on("room:opponent-left", () => {
      resetMatchOnly();
      showSuccess("Đối thủ đã rời phòng");
    });

    socket.on("room:leave:confirm", () => {
      setPopup({
        type: "leaveConfirm",
        message: "Đối thủ xin rời phòng. Đồng ý?",
        onAccept: () => {
          socket.emit("room:leave:approved", { roomName: roomId });
          setPopup({ type: null });
        },
        onReject: () => {
          socket.emit("room:leave:denied", { roomName: roomId });
          setPopup({ type: null });
        },
      });
    });

    socket.on("game:restart", ({ fen, history, historyIndex }: any) => {
      const g = new Chess();
      g.load(fen);

      gameRef.current = g;
      setFen(fen);
      setHistory(history);
      setHistoryIndex(historyIndex);

      setDeadKingSquare(null);
      setLastMove(null);
      setCapturedPiece(null);
      setGameFinished(false);

      // reset start/pause
      setGameStarted(false);
      setBotPausedUser(true);

      resetAnimation?.();
    });

    socket.on("draw:offer:received", () => {
      setPopup({
        type: "drawConfirm",
        message: "Đối thủ đề nghị hòa. Đồng ý?",
        onAccept: () => {
          socket.emit("draw:accept", { roomName: roomId });
          resetMatchOnly();
          setPopup({ type: null });
        },
        onReject: () => {
          socket.emit("draw:reject", { roomName: roomId });
          setPopup({ type: null });
        },
      });
    });

    socket.on("draw:accepted", () => {
      resetMatchOnly();
      showSuccess("Hòa", "Ván đấu kết thúc với kết quả hòa");
    });

    socket.on("draw:rejected", () => {
      showError("Hoà bị từ chối", "Đối thủ không đồng ý hòa");
    });

    return () => socket.off();
  }, [socket, roomId, handleCheckmate, resetBoardState, resetFullGame, resetMatchOnly, resetAnimation]);

  // =======================
  // ✅ APPLY SETUP
  // =======================
  const applySetupAndStart = () => {
    const v = isValidSetupBoard(setupBoard);
    if (!v.ok) {
      showError("Setup không hợp lệ", v.reason ?? "Vị trí không hợp lệ.");
      return;
    }

    const newFen = boardToFen(setupBoard, setupTurn);

    const g = new Chess();
    try {
      g.load(newFen);
    } catch {
      showError("Setup không hợp lệ", "FEN tạo ra không đúng / vị trí không hợp lệ.");
      return;
    }

    // apply to game
    gameRef.current = g;

    setFen(newFen);
    setHistory([newFen]);
    setHistoryIndex(0);

    setLastMove(null);
    setCapturedPiece(null);
    setDeadKingSquare(null);
    setGameFinished(false);

    // update sides
    setPlayerColor(botSide === "w" ? "b" : "w");
    setBotPlaysWhite(botSide === "w");

    // exit setup
    setSetupMode(false);
    setSetupDrag(null);

    // start bot
    setGameStarted(true);
    setBotPausedUser(false);
  };
  
  
  

  // =======================
  // UI
  // =======================
  const currentTurn = displayGame.turn();

  const palette: PieceKey[] = ["K", "Q", "R", "B", "N", "P", "k", "q", "r", "b", "n", "p"];

  return (
    <>
      <MatchHeader mode={mode === "online" ? "online" : "offline"}><button onClick={onExit}>← Sảnh game</button><strong>BOARD ARENA · CỜ VUA</strong></MatchHeader>

      <button
        onClick={() => setShowSettings(true)}
        className="legacy-settings-button" aria-label="Cài đặt cờ vua"
      >
        ⚙
      </button>

      <OnlineActions
        mode={mode}
        roomId={roomId}
        gameFinished={gameFinished}
        history={history}
        socket={socket}
        setPopup={setPopup}
      />

      <div className="offline-legacy-page offline-chess-page">
        <div className="offline-match-panel">
          <div className="text-center text-sm mb-2 text-slate-400">
            {mode === "online" && roomId ? `Phòng: ${roomId}` : "Luyện tập · BOT khó nhất"}
          </div>

          <MatchPlayers turn={currentTurn === "w" ? 0 : 1} players={[
            {name:"Quân trắng",detail:mode === "bot" ? (playerColor === "w" ? "Bạn" : "Đối thủ máy") : mode === "botvsbot" ? "Máy 1" : "Người chơi trắng"},
            {name:"Quân đen",detail:mode === "bot" ? (playerColor === "b" ? "Bạn" : "Đối thủ máy") : mode === "botvsbot" ? "Máy 2" : "Người chơi đen"}
          ]}/>
          <ChessBoard
            board={displayGame.board()}
            winner={displayGame.isCheckmate() ? (displayGame.turn() === 'w' ? 'b' : 'w') : null}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={lastMove}
            capturedPiece={capturedPiece}
            movingPiece={movingPiece}
            movingPath={movingPath}
            movingStep={movingStep}
            hidePiece={hidePiece}
            deadKingSquare={deadKingSquare}
            viewColor={viewColor}
            pieceTheme={pieceTheme}
            onClick={handleSquareClick}
            // ✅ setup drag-drop
            setupMode={setupMode}
            setupBoard={setupBoard}
            onSetupChange={setSetupBoard}
            setupDrag={setupDrag}
            setSetupDrag={setSetupDrag}
            setupPick={setupPick}
          />

          {/* ✅ SETUP PANEL */}
          {mode === "bot" && setupMode && (
            <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/40 p-3 text-sm space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBotSide("w");
                    setPlayerColor("b");
                    setBotPlaysWhite(true);
                  }}
                >
                  BOT cầm Trắng
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBotSide("b");
                    setPlayerColor("w");
                    setBotPlaysWhite(false);
                  }}
                >
                  BOT cầm Đen
                </Button>

                <Button variant="secondary" onClick={() => setSetupTurn("w")}>
                  Lượt đi: Trắng
                </Button>
                <Button variant="secondary" onClick={() => setSetupTurn("b")}>
                  Lượt đi: Đen
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setSetupBoard(Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null)));
                    setSetupDrag(null);
                  }}
                >
                  🧹 Clear board
                </Button>
              </div>

              {/* Palette */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="text-slate-400 mr-2">Chọn quân:</div>

                {palette.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSetupPick(p)}
                    className={`h-10 w-10 rounded border flex items-center justify-center ${
                      setupPick === p ? "border-sky-400 bg-slate-800" : "border-slate-700 bg-slate-900"
                    }`}
                    onPointerDown={(e) => {
                      // drag from palette
                      e.preventDefault();
                      e.stopPropagation();
                      setSetupPick(p);
                      setSetupDrag({
                        piece: p,
                        from: null,
                        clientX: e.clientX,
                        clientY: e.clientY,
                      });
                    }}
                    style={{ touchAction: "none" }}
                  >
                    <img
					  src={`/${PIECE_IMG[p]}`}   // ✅ public/... => phải có dấu /
					  alt={p}
					  style={{ width: 28, height: 28, pointerEvents: "none" }}
					/>
                    {/* show icon via your PIECE_IMG in ChessBoard; here just letter */}
                    <span className="font-mono text-sm">{p}</span>
                  </button>
                ))}

                <button
                  onClick={() => setSetupPick(null)}
                  className={`h-10 px-3 rounded border ${
                    setupPick === null ? "border-red-400 bg-slate-800" : "border-slate-700 bg-slate-900"
                  }`}
                >
                  🧽 Eraser
                </button>

                <div className="text-xs text-slate-400">
                  Tip: kéo quân trên bàn để đổi chỗ, kéo ra ngoài để xoá.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button className="bg-green-700 hover:bg-green-600" onClick={applySetupAndStart}>
                  ✅ Xong, tiếp tục
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // huỷ setup => quay lại position hiện tại
                    setSetupMode(false);
                    setSetupDrag(null);
                  }}
                >
                  ❌ Huỷ
                </Button>
              </div>
            </div>
          )}

          {/* BOT CONTROLS */}
          {(mode === "bot" || mode === "botvsbot") && (
            <div className="legacy-actions legacy-chess-actions">
              <Button onClick={handleUndo}>Lùi nước</Button>
              <Button onClick={handleRedo}>Đi lại</Button>
              <Button onClick={resetBoardState}>Ván mới</Button>

              {!gameStarted ? (
                <Button
                  onClick={() => {
                    setGameStarted(true);
                    setBotPausedUser(false);
                  }}
                >
                  ▶ Bắt đầu
                </Button>
              ) : botPausedUser ? (
                <Button onClick={() => setBotPausedUser(false)}>▶ Tiếp tục</Button>
              ) : (
                <Button onClick={() => setBotPausedUser(true)}>⏸ Tạm dừng</Button>
              )}

              {/* ✅ Setup button only for BOT mode */}
              {mode === "bot" && (
                <Button
                  onClick={() => {
                    // pause bot + enter setup
                    setGameStarted(true);
                    setBotPausedUser(true);

                    setSetupMode(true);
                    setSetupDrag(null);

                    // load board from current fen
                    setSetupBoard(fenToSetupBoard(fen));

                    // set turn from current position
                    const g = new Chess();
                    try {
                      g.load(fen);
                      setSetupTurn(g.turn());
                    } catch {
                      setSetupTurn("w");
                    }

                    // keep botSide from current setting
                    setBotSide(botPlaysWhite ? "w" : "b");
                  }}
                >
                  Xếp quân
                </Button>
              )}
            </div>
          )}

          <div className="text-center text-sm mt-2 text-slate-300">
            Lượt hiện tại: {currentTurn === "w" ? "Trắng" : "Đen"}
            {(mode === "bot" || mode === "botvsbot") && botThinking && " • BOT đang tính…"}
            {(mode === "bot" || mode === "botvsbot") && !gameStarted && " • (Chưa bắt đầu)"}
            {setupMode && " • (Đang Setup kéo-thả)"}
          </div>

          {/* BOT INFO PANEL */}
          {mode === "bot" && (
            <details className="legacy-bot-analysis"><summary>Phân tích của máy</summary>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
                <div>
                  <span className="text-slate-400">BOT move:</span>{" "}
                  <span className="font-mono">{botInfo?.uci ?? "—"}</span>
                </div>

                <div>
                  <span className="text-slate-400">Depth:</span>{" "}
                  <span className="font-mono">{botInfo?.depth ?? "—"}</span>
                </div>

                <div>
                  <span className="text-slate-400">Nodes:</span>{" "}
                  <span className="font-mono">
                    {typeof botInfo?.nodes === "number" ? botInfo.nodes.toLocaleString() : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400">Time:</span>{" "}
                  <span className="font-mono">
                    {typeof botInfo?.timeMs === "number" ? `${botInfo.timeMs}ms` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400">Score:</span>{" "}
                  <span className="font-mono">
                    {typeof botInfo?.scoreCp === "number" ? `${botInfo.scoreCp} cp` : "—"}
                  </span>
                </div>
              </div>

              {botInfo?.summary ? (
                <div className="mt-2 text-slate-200">
                  <span className="text-slate-400">Ý đồ:</span> {botInfo.summary}
                </div>
              ) : null}

              {botInfo?.pv ? (
                <div className="mt-2 text-slate-200">
                  <span className="text-slate-400">PV:</span>{" "}
                  <span className="font-mono break-all">{botInfo.pv}</span>
                </div>
              ) : null}
            </details>
          )}
        </div>
      </div>

      <RoomSettings
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        mode={mode}
        setMode={setMode}
        setRoomId={setRoomId}
        resetBoardState={resetBoardState}
        botPlaysWhite={botPlaysWhite}
        setBotPlaysWhite={setBotPlaysWhite}
        pieceTheme={pieceTheme}
        setPieceTheme={setPieceTheme}
      />

      <PopupModal popup={popup} setPopup={setPopup} />
    </>
  );
}