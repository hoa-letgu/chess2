import { KingResultBadge } from '@/features/arena/KingResultBadge';
import { useChessMotion } from '@/features/arena/useChessMotion';
import { BoardSurface } from '@/features/arena/MatchSurface';
// src/games/chess/components/ChessBoard.tsx
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PIECE_IMG, isPieceKey, type PieceKey } from "@/games/chess/utils/pieces";

type LastMove = {
  from: string;
  to: string;
  inCheckSquare?: string | null;
  checkBy?: { square: string; piece: string } | null;
  color?: "w" | "b";
} | null;

type MovingPiece = {
  piece: string; // "P","p","R","r",...
  from: string; // "e2"
  to: string; // "e4"
};

type CapturedPiece = {
  square: string;
  piece: string;
};

// ========================
// ✅ SETUP (drag-drop)
// ========================
type SetupPiece = PieceKey | null;

export type SetupDrag = {
  piece: PieceKey;
  from?: { r: number; c: number } | null; // null = kéo từ palette, có giá trị = kéo từ bàn
  clientX: number;
  clientY: number;
};

type Props = {
  board: any[][];
  winner?: 'w' | 'b' | null;
  selectedSquare: string | null;
  legalTargets: string[];
  lastMove: LastMove;
  capturedPiece: CapturedPiece | null;

  movingPiece: MovingPiece | null;
  movingPath: { x: number; y: number }[];
  movingStep: number;

  hidePiece: string | null;
  deadKingSquare: string | null;
  viewColor: "w" | "b";
  pieceTheme: "classic" | "neo" | "wood";
  onClick: (square: string) => void;

  // ✅ Setup props (kéo-thả)
  setupMode?: boolean;
  setupBoard?: SetupPiece[][];
  onSetupChange?: (b: SetupPiece[][]) => void;

  setupDrag?: SetupDrag | null;
  setSetupDrag?: (d: SetupDrag | null) => void;

  // ✅ optional: click-place / eraser
  setupPick?: SetupPiece; // null = eraser
};

const MOVE_MS = 450;
const PIECE_SCALE = 0.8;
const PIECE_INSET = (1 - PIECE_SCALE) / 2;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function ChessBoard({
  board,
  winner,
  selectedSquare,
  legalTargets,
  lastMove,
  capturedPiece,
  movingPiece,
  // giữ để không phá props
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  movingPath,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  movingStep,
  hidePiece,
  deadKingSquare,
  viewColor,
  pieceTheme,
  onClick,

  // setup
  setupMode = false,
  setupBoard,
  onSetupChange,
  setupDrag,
  setSetupDrag,
  setupPick,
}: Props) {
  const isWhiteView = viewColor === "w";
  const squares: JSX.Element[] = [];

  // ================================
  // đo kích thước bàn cờ (px)
  // ================================
  const position = setupMode ? '' : board.flat().map(piece =>
    piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : '.'
  ).join('');
  const boardRef = useChessMotion(position, !isWhiteView);
  const [boardPx, setBoardPx] = useState(480);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const update = () => setBoardPx(el.clientWidth || 480);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const squarePx = useMemo(() => boardPx / 8, [boardPx]);

  // ================================
  // square ("e4") -> tọa độ px theo view
  // ================================
  const squareToPx = (sq: string) => {
    const files = "abcdefgh";
    const fileIndex = files.indexOf(sq[0]);
    const rankNum = Number(sq[1]);

    if (isWhiteView) {
      return { x: fileIndex * squarePx, y: (8 - rankNum) * squarePx };
    }
    return { x: (7 - fileIndex) * squarePx, y: (rankNum - 1) * squarePx };
  };

  const kingInCheckSquare = lastMove?.inCheckSquare ?? null;

  // ================================
  // ✅ RAF animation state (60fps)
  // ================================
  const rafRef = useRef<number | null>(null);
  const [animPos, setAnimPos] = useState<{
    x: number;
    y: number;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!movingPiece) {
      setAnimPos(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const { piece, from, to } = movingPiece;
    if (!isPieceKey(piece)) return;

    const fromPx = squareToPx(from);
    const toPx = squareToPx(to);

    const insetPx = squarePx * PIECE_INSET;

    const sx = fromPx.x + insetPx;
    const sy = fromPx.y + insetPx;
    const ex = toPx.x + insetPx;
    const ey = toPx.y + insetPx;

    const key = `${piece}:${from}->${to}`;
    const start = performance.now();
    const dur = MOVE_MS;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = easeInOutCubic(t);

      const x = sx + (ex - sx) * e;
      const y = sy + (ey - sy) * e;

      setAnimPos({ x, y, key });

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    setAnimPos({ x: sx, y: sy, key });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movingPiece?.from, movingPiece?.to, movingPiece?.piece, squarePx, isWhiteView]);

  // ================================
  // ✅ SETUP: drag move/up
  // ================================
  useEffect(() => {
    if (!setupMode) return;
    if (!setupDrag || !setSetupDrag) return;

    const onMove = (ev: PointerEvent) => {
      setSetupDrag({
        ...setupDrag,
        clientX: ev.clientX,
        clientY: ev.clientY,
      });
    };

    const onUp = (ev: PointerEvent) => {
      // thiếu board/setup callback -> hủy
      if (!setupBoard || !onSetupChange) {
        setSetupDrag(null);
        return;
      }

      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        setSetupDrag(null);
        return;
      }

      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const file = Math.floor(x / squarePx);
      const rank = Math.floor(y / squarePx);

      // thả ngoài bàn => nếu kéo từ bàn thì xoá quân
      if (file < 0 || file > 7 || rank < 0 || rank > 7) {
        if (setupDrag.from) {
          const nb = setupBoard.map((row) => row.slice());
          nb[setupDrag.from.r][setupDrag.from.c] = null;
          onSetupChange(nb);
        }
        setSetupDrag(null);
        return;
      }

      const targetR = isWhiteView ? rank : 7 - rank;
      const targetC = isWhiteView ? file : 7 - file;

      const nb = setupBoard.map((row) => row.slice());

      // nếu kéo từ bàn thì clear vị trí cũ
      if (setupDrag.from) nb[setupDrag.from.r][setupDrag.from.c] = null;

      // đặt vào ô mới (kéo từ palette cũng vào đây)
      nb[targetR][targetC] = setupDrag.piece;

      onSetupChange(nb);
      setSetupDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupMode, setupDrag, squarePx, isWhiteView, setupBoard, onSetupChange, setSetupDrag]);

  // ================================
  // RENDER BOARD
  // ================================
  for (let vr = 0; vr < 8; vr++) {
    for (let vc = 0; vc < 8; vc++) {
      const r = isWhiteView ? vr : 7 - vr;
      const c = isWhiteView ? vc : 7 - vc;

      const file = "abcdefgh"[c];
      const rank = 8 - r;
      const square = `${file}${rank}`;

      // ✅ piece source
      const setupCell: SetupPiece | null = setupMode ? (setupBoard?.[r]?.[c] ?? null) : null;
      const piece = setupMode ? null : board[r][c];

      const pieceKey =
        setupMode
          ? setupCell
          : piece && piece.color === "w"
          ? piece.type.toUpperCase()
          : piece && piece.color === "b"
          ? piece.type
          : null;

      const isSelected = selectedSquare === square;
      const isLegal = legalTargets.includes(square);
      const isLastFrom = lastMove?.from === square;
      const isLastTo = lastMove?.to === square;
      const isKingCheck = kingInCheckSquare === square;
      const isDeadKing = deadKingSquare === square;

      const style: CSSProperties = {};

      if (isLastFrom) style.background = "rgba(255,215,0,0.35)";
      if (isLastTo) style.background = "rgba(255,220,0,0.55)";

      if (isSelected) style.outline = "3px solid #53a6ff";
      if (isLegal) style.background = "rgba(62,205,245,.48)";
      if (isLegal) style.boxShadow = "inset 0 0 0 3px rgba(50,150,255,0.65)";

      if (isKingCheck) {
        style.animation = "kingBlink 0.45s ease-in-out 0s 3";
        style.boxShadow = "inset 0 0 12px 4px rgba(255,0,0,0.7)";
      }

      // ✅ ẩn quân ở ô from khi đang bay hoặc khi đang kéo setup từ chính ô đó
      const hideStaticPiece =
        hidePiece === square ||
        (movingPiece && movingPiece.from === square) ||
        (setupMode &&
          setupDrag?.from &&
          setupDrag.from.r === r &&
          setupDrag.from.c === c);

      squares.push(
        <button
          key={square}
          data-chess-cell={r * 8 + c}
          aria-label={`${square}, ${pieceKey ?? "trống"}`}
          aria-pressed={isSelected}
          onClick={() => {
            if (!setupMode) onClick(square);
          }}
          onPointerDown={(e) => {
            if (!setupMode) return;

            // nếu đang kéo setup khác -> bỏ
            if (setupDrag) return;

            // click-place / eraser (tuỳ bạn dùng hay không)
            if (setupPick === null) {
              if (!setupBoard || !onSetupChange) return;
              const nb = setupBoard.map((row) => row.slice());
              nb[r][c] = null;
              onSetupChange(nb);
              return;
            }

            // click place nếu có setupPick và ô đang trống
            if (setupPick && !setupCell) {
              if (!setupBoard || !onSetupChange) return;
              const nb = setupBoard.map((row) => row.slice());
              nb[r][c] = setupPick;
              onSetupChange(nb);
              return;
            }

            // drag từ bàn
            if (!setupCell || !setSetupDrag) return;

            e.preventDefault();
            e.stopPropagation();

            setSetupDrag({
              piece: setupCell,
              from: { r, c },
              clientX: e.clientX,
              clientY: e.clientY,
            });
          }}
          style={{
            position: "absolute",
            width: "12.5%",
            height: "12.5%",
            left: `${vc * 12.5}%`,
            top: `${vr * 12.5}%`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            padding: 0,
            touchAction: "none", // ✅ rất quan trọng để pointer drag mượt trên mobile
            ...style,
          }}
        >
          {!hideStaticPiece && isPieceKey(pieceKey) && (
            <img
              src={PIECE_IMG[pieceKey]}
              style={{
                width: "80%",
                height: "80%",
                pointerEvents: "none",
                ...(isDeadKing ? { transform: "rotate(90deg)", opacity: 0.9 } : {}),
              }}
              draggable={false}
            />
          )}
          {!setupMode && <KingResultBadge piece={pieceKey} winner={winner} />}
        </button>
      );
    }
  }

  // ================================
  // MOVING PIECE (RAF 60fps)
  // ================================
  const renderMovingPiece = () => {
    if (!movingPiece) return null;
    const { piece } = movingPiece;
    if (!isPieceKey(piece)) return null;
    if (!animPos) return null;

    const sizePx = squarePx * PIECE_SCALE;

    return (
      <img
        key={animPos.key}
        src={PIECE_IMG[piece]}
        style={{
          position: "absolute",
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          left: 0,
          top: 0,
          zIndex: 200,
          pointerEvents: "none",
          willChange: "transform",
          transform: `translate3d(${animPos.x}px, ${animPos.y}px, 0)`,
          filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))",
          backfaceVisibility: "hidden",
          transformStyle: "preserve-3d",
        }}
        draggable={false}
      />
    );
  };

  // ================================
  // CAPTURED (fade out)
  // ================================
  const renderCaptured = () => {
    if (!capturedPiece) return null;

    let capKey: PieceKey | null = null;
    if (isPieceKey(capturedPiece.piece)) capKey = capturedPiece.piece;
    if (!capKey) return null;

    const pos = squareToPx(capturedPiece.square);
    const sizePx = squarePx * PIECE_SCALE;
    const insetPx = squarePx * PIECE_INSET;

    return (
      <img
        src={PIECE_IMG[capKey]}
        style={{
          position: "absolute",
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          left: 0,
          top: 0,
          transform: `translate3d(${pos.x + insetPx}px, ${pos.y + insetPx}px, 0)`,
          animation: "captFadeOut 0.32s ease-out forwards",
          pointerEvents: "none",
          zIndex: 150,
        }}
        draggable={false}
      />
    );
  };

  // ================================
  // ✅ SETUP floating piece
  // ================================
  const renderSetupFloating = () => {
    if (!setupMode) return null;
    if (!setupDrag) return null;

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const localX = setupDrag.clientX - rect.left;
    const localY = setupDrag.clientY - rect.top;

    const sizePx = squarePx * PIECE_SCALE;

    return (
      <img
        src={PIECE_IMG[setupDrag.piece]}
        style={{
          position: "absolute",
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          left: 0,
          top: 0,
          transform: `translate3d(${localX - sizePx / 2}px, ${localY - sizePx / 2}px, 0)`,
          pointerEvents: "none",
          zIndex: 999,
          filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.35))",
          willChange: "transform",
        }}
        draggable={false}
      />
    );
  };

  return (
    <BoardSurface className="offline-chess-frame"><div
      ref={boardRef}
      className="chess-board-canvas relative w-full aspect-square mx-auto overflow-hidden"
      style={{
        backgroundImage: "repeating-conic-gradient(from 90deg, #e6d8b5 0% 25%, #748a74 0% 50%)",
        backgroundSize: "25% 25%",
        
        backgroundPosition: "center",
        userSelect: "none",
      }}
    >
      <style>
        {`
          @keyframes captFadeOut {
            0%   { opacity: 1; transform: scale(1); }
            60%  { opacity: 0.4; transform: scale(0.55); }
            100% { opacity: 0; transform: scale(0); }
          }

          @keyframes kingBlink {
            0%   { box-shadow: inset 0 0 0px 0px rgba(255,0,0,0.2); }
            50%  { box-shadow: inset 0 0 20px 9px rgba(255,0,0,0.85); }
            100% { box-shadow: inset 0 0 0px 0px rgba(255,0,0,0.2); }
          }

          .chess-board-canvas button:focus-visible { outline: 2px solid #dfc083; outline-offset: -2px; }
        `}
      </style>

      {squares}

      {/* bình thường */}
      {renderMovingPiece()}
      {renderCaptured()}

      {/* setup drag */}
      {renderSetupFloating()}
    </div></BoardSurface>
  );
}