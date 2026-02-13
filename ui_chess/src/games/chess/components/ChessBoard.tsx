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
  from: string;  // "e2"
  to: string;    // "e4"
};

type CapturedPiece = {
  square: string;
  piece: string;
};

type Props = {
  board: any[][];
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
};

const MOVE_MS = 450;                 // ✅ tăng lên cho “lụa” hơn (220 -> 280)
const PIECE_SCALE = 0.8;             // giống quân tĩnh (80%)
const PIECE_INSET = (1 - PIECE_SCALE) / 2; // 0.10 = 10%
//const PIECE_IMG = PIECE_IMG_THEMES[pieceTheme];
// ✅ easing giống kiểu chess.com (mềm đầu + mềm cuối)
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function ChessBoard({
  board,
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
}: Props) {
  const isWhiteView = viewColor === "w";
  const squares: JSX.Element[] = [];

  // ================================
  // đo kích thước bàn cờ (px)
  // ================================
  const boardRef = useRef<HTMLDivElement | null>(null);
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
    const fileIndex = files.indexOf(sq[0]); // 0..7
    const rankNum = Number(sq[1]);          // 1..8

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

    // start immediately
    setAnimPos({ x: sx, y: sy, key });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movingPiece?.from, movingPiece?.to, movingPiece?.piece, squarePx, isWhiteView]);

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

      const piece = board[r][c];
      const pieceKey =
        piece && piece.color === "w"
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
      if (isLegal) style.boxShadow = "inset 0 0 0 3px rgba(50,150,255,0.65)";

      if (isKingCheck) {
        style.animation = "kingBlink 0.45s ease-in-out 0s 3";
        style.boxShadow = "inset 0 0 12px 4px rgba(255,0,0,0.7)";
      }

      // ẩn quân ở ô from khi đang bay
      const hideStaticPiece =
        hidePiece === square || (movingPiece && movingPiece.from === square);

      squares.push(
        <button
          key={square}
          onClick={() => onClick(square)}
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
            />
          )}
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
      />
    );
  };

  return (
    <div
      ref={boardRef}
      className="relative w-full max-w-[480px] aspect-square mx-auto border rounded-lg overflow-hidden shadow"
      style={{
        backgroundImage: "url('/chess/board.png')",
        backgroundSize: "cover",
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

          button:focus { outline: none; }
        `}
      </style>

      {squares}
      {renderMovingPiece()}
      {renderCaptured()}
    </div>
  );
}
