// src/games/xiangqi/components/XiangqiBoard.tsx
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { XiangqiPieceKey } from "@/games/xiangqi/utils/pieces";
import { XIANGQI_PIECE_IMG, isXiangqiPieceKey } from "@/games/xiangqi/utils/pieces";

/* ================= TYPES ================= */

type LastMove =
  | {
      from: string;
      to: string;
    }
  | null;

type MovingPiece = {
  piece: XiangqiPieceKey;
  square: string;
};

type Props = {
  board: (XiangqiPieceKey | null | "")[][];
  selectedSquare?: string | null;
  legalTargets?: string[];
  lastMove?: LastMove;
  viewSide?: "red" | "black";
  onClick?: (square: string) => void;

  movingPiece?: MovingPiece | null;
  hideSquare?: string | null;
};

/* ================= CONSTANTS ================= */

// ✅ TÁCH OFFSET 4 PHÍA (ảnh viền không đều phải làm vậy)
const OFFSET_L = 3.9;
const OFFSET_R = 3.8;

const OFFSET_T = 3.7;
const OFFSET_B = 5.8;

const BOARD_W = 100 - OFFSET_L - OFFSET_R;
const BOARD_H = 100 - OFFSET_T - OFFSET_B;

// ===== DEBUG OVERLAY =====
const DEBUG_GRID = false;
const GRID_COLOR = "rgba(255, 0, 0, 0.55)";
const GRID_THICKNESS = 1;
const DOT_COLOR = "rgba(0, 255, 255, 0.9)";
const DOT_RADIUS_PX = 2.2;

// Click zone scale (khuyến nghị)
const CELL_SCALE = 0.9;

/**
 * ✅ TÙY CHỈNH RIÊNG TỪNG CỘT / TỪNG HÀNG
 * - COLS: 9 cột (0..8)  theo % trong vùng BOARD (0..100)
 * - ROWS: 10 hàng (0..9) theo % trong vùng BOARD (0..100)
 */
const COLS_BASE = [0, 11.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
const ROWS_BASE = [0, 11.11, 22.22, 33.33, 44.44, 55.55, 66.66, 77.77, 88.88, 100];

/**
 * Nắn nhẹ từng cột/hàng (đơn vị: % trong vùng BOARD)
 */
const COL_NUDGE = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const ROW_NUDGE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// ✅ Responsive / tránh phải cuộn
const SAFE_TOP = 56; // chiều cao header/menu phía trên (chỉnh theo UI)
const SAFE_PAD = 16; // padding trên dưới của wrapper

// ✅ Highlight kiểu 4 góc + chấm (tránh vuông to)
const CORNER_LEN = 12;
const CORNER_THICK = 3;

const CornerBox = ({ color }: { color: string }) => (
  <span
    style={{
      position: "absolute",
      inset: "12%",
      pointerEvents: "none",
      zIndex: 25,
    }}
  >
    {/* TL */}
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: CORNER_LEN,
        height: CORNER_LEN,
        borderLeft: `${CORNER_THICK}px solid ${color}`,
        borderTop: `${CORNER_THICK}px solid ${color}`,
        borderRadius: 2,
      }}
    />
    {/* TR */}
    <span
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        width: CORNER_LEN,
        height: CORNER_LEN,
        borderRight: `${CORNER_THICK}px solid ${color}`,
        borderTop: `${CORNER_THICK}px solid ${color}`,
        borderRadius: 2,
      }}
    />
    {/* BL */}
    <span
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: CORNER_LEN,
        height: CORNER_LEN,
        borderLeft: `${CORNER_THICK}px solid ${color}`,
        borderBottom: `${CORNER_THICK}px solid ${color}`,
        borderRadius: 2,
      }}
    />
    {/* BR */}
    <span
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: CORNER_LEN,
        height: CORNER_LEN,
        borderRight: `${CORNER_THICK}px solid ${color}`,
        borderBottom: `${CORNER_THICK}px solid ${color}`,
        borderRadius: 2,
      }}
    />
  </span>
);

const CenterDot = ({ color }: { color: string }) => (
  <span
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: 10,
      height: 10,
      borderRadius: 9999,
      transform: "translate(-50%, -50%)",
      background: color,
      boxShadow: `0 0 0 2px rgba(0,0,0,0.18)`,
      pointerEvents: "none",
      zIndex: 26,
    }}
  />
);

/* ================= COMPONENT ================= */

export function XiangqiBoard({
  board,
  selectedSquare = null,
  legalTargets = [],
  lastMove = null,
  viewSide = "red",
  onClick,
  movingPiece = null,
  hideSquare = null,
}: Props) {
  const files = "abcdefghi";
  const isRedView = viewSide === "red";

  // ✅ Tự set aspect ratio theo ảnh nền để tránh crop khi dùng cover
  const [boardRatio, setBoardRatio] = useState<string>("9 / 10");

  useEffect(() => {
    const img = new Image();
    img.src = "/xiangqi/chineseboard.png";
    img.onload = () => {
      setBoardRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
    };
  }, []);

  // ✅ Build COLS/ROWS thực dùng
  const COLS = useMemo(() => COLS_BASE.map((v, i) => v + (COL_NUDGE[i] ?? 0)), []);
  const ROWS = useMemo(() => ROWS_BASE.map((v, i) => v + (ROW_NUDGE[i] ?? 0)), []);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // % trong vùng BOARD -> % tuyệt đối trong container
  const posLeft = (vc: number) => OFFSET_L + (COLS[clamp(vc, 0, 8)] * BOARD_W) / 100;
  const posTop = (vr: number) => OFFSET_T + (ROWS[clamp(vr, 0, 9)] * BOARD_H) / 100;

  // ✅ Size click zone theo khoảng cách thực tế giữa các giao điểm
  const cellW = (vc: number) => {
    const x = COLS[clamp(vc, 0, 8)];
    const xL = COLS[clamp(vc - 1, 0, 8)];
    const xR = COLS[clamp(vc + 1, 0, 8)];
    const gap = vc === 0 ? xR - x : vc === 8 ? x - xL : Math.min(x - xL, xR - x);
    return (gap * BOARD_W) / 100;
  };

  const cellH = (vr: number) => {
    const y = ROWS[clamp(vr, 0, 9)];
    const yU = ROWS[clamp(vr - 1, 0, 9)];
    const yD = ROWS[clamp(vr + 1, 0, 9)];
    const gap = vr === 0 ? yD - y : vr === 9 ? y - yU : Math.min(y - yU, yD - y);
    return (gap * BOARD_H) / 100;
  };

  /* ===== square -> % position (GIAO ĐIỂM) ===== */
  const squareToPos = (sq: string) => {
    const file = sq[0];
    const rank = Number(sq.slice(1)); // 1..10

    const c = files.indexOf(file); // 0..8
    const r = 10 - rank; // 0..9

    const vr = isRedView ? r : 9 - r;
    const vc = isRedView ? c : 8 - c;

    return {
      left: posLeft(vc),
      top: posTop(vr),
    };
  };

  /* ===== DEBUG: GRID OVERLAY (VẼ THEO COLS/ROWS) ===== */
  const DebugGridOverlay = () => {
    if (!DEBUG_GRID) return null;

    const vLines = COLS.map((x, i) => (
      <line
        key={`v_${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={100}
        stroke={GRID_COLOR}
        strokeWidth={GRID_THICKNESS}
        vectorEffect="non-scaling-stroke"
      />
    ));

    const hLines = ROWS.map((y, i) => (
      <line
        key={`h_${i}`}
        x1={0}
        y1={y}
        x2={100}
        y2={y}
        stroke={GRID_COLOR}
        strokeWidth={GRID_THICKNESS}
        vectorEffect="non-scaling-stroke"
      />
    ));

    return (
      <svg
        style={{
          position: "absolute",
          left: `${OFFSET_L}%`,
          top: `${OFFSET_T}%`,
          width: `${BOARD_W}%`,
          height: `${BOARD_H}%`,
          pointerEvents: "none",
          zIndex: 30,
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="100" height="100" fill="none" stroke={GRID_COLOR} strokeWidth={GRID_THICKNESS} />
        {vLines}
        {hLines}
      </svg>
    );
  };

  /* ===== DEBUG: DOTS (90 giao điểm - theo COLS/ROWS) ===== */
  const DebugDotsOverlay = () => {
    if (!DEBUG_GRID) return null;

    const dots: JSX.Element[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const x = COLS[c];
        const y = ROWS[r];
        dots.push(<circle key={`d_${r}_${c}`} cx={x} cy={y} r={DOT_RADIUS_PX} fill={DOT_COLOR} />);
      }
    }

    return (
      <svg
        style={{
          position: "absolute",
          left: `${OFFSET_L}%`,
          top: `${OFFSET_T}%`,
          width: `${BOARD_W}%`,
          height: `${BOARD_H}%`,
          pointerEvents: "none",
          zIndex: 31,
          overflow: "visible",
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {dots}
      </svg>
    );
  };

  /* ===== RENDER CLICK ZONES ===== */
  const squares: JSX.Element[] = [];

  for (let vr = 0; vr < 10; vr++) {
    for (let vc = 0; vc < 9; vc++) {
      const r = isRedView ? vr : 9 - vr;
      const c = isRedView ? vc : 8 - vc;

      const piece = board?.[r]?.[c] || null;

      const file = files[c];
      const rank = 10 - r;
      const square = `${file}${rank}`;

      const isSelected = selectedSquare === square;
      const isLegal = legalTargets.includes(square);
      const isLastFrom = lastMove?.from === square;
      const isLastTo = lastMove?.to === square;

      const style: CSSProperties = {};

      // vẫn giữ highlight nước đi cuối (nhẹ)
      if (isLastFrom) style.background = "rgba(255,215,0,0.28)";
      if (isLastTo) style.background = "rgba(255,220,0,0.40)";

      // ❌ bỏ outline / boxShadow (vì nó tạo khung vuông lớn)
      // if (isSelected) { ... }
      // if (isLegal) { ... }

      const pieceKey = piece as XiangqiPieceKey;
      const hideStatic = hideSquare === square;

      squares.push(
        <button
          key={square}
          onClick={() => onClick?.(square)}
          style={{
            position: "absolute",
            width: `${cellW(vc) * CELL_SCALE}%`,
            height: `${cellH(vr) * CELL_SCALE}%`,
            left: `${posLeft(vc)}%`,
            top: `${posTop(vr)}%`,
            transform: "translate(-50%, -50%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            zIndex: 20,
            ...style,
          }}
        >
          {/* ✅ Selected: 4 góc + chấm cam */}
          {isSelected && <CornerBox color="rgba(255,140,0,0.95)" />}
          {isSelected && <CenterDot color="rgba(255,140,0,0.95)" />}

          {/* ✅ Legal: 4 góc xanh */}
          {isLegal && !isSelected && <CornerBox color="rgba(80,180,255,0.9)" />}

          {!hideStatic && isXiangqiPieceKey(pieceKey) && (
            <img
              src={XIANGQI_PIECE_IMG[pieceKey]}
              style={{ width: "75%", height: "75%", pointerEvents: "none" }}
              alt=""
            />
          )}
        </button>
      );
    }
  }

  /* ===== ANIMATION BAY QUÂN ===== */
  const renderMovingPiece = () => {
    if (!movingPiece) return null;

    const { left, top } = squareToPos(movingPiece.square);

    return (
      <img
        src={XIANGQI_PIECE_IMG[movingPiece.piece]}
        style={{
          position: "absolute",
          width: `${(cellW(4) || BOARD_W / 8) * 0.95}%`,
          height: `${(cellH(4) || BOARD_H / 9) * 0.95}%`,
          left: `${left}%`,
          top: `${top}%`,
          transform: "translate(-50%, -50%)",
          transition: "left 180ms linear, top 180ms linear",
          pointerEvents: "none",
          zIndex: 50,
        }}
        alt=""
      />
    );
  };

  /* ===== ROOT ===== */
  return (
    <div
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        backgroundImage: "url('/xiangqi/bamboo.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: `${SAFE_PAD}px 0`,
        overflow: "hidden",
      }}
    >
      <div
        className="relative mx-auto border rounded-lg overflow-hidden shadow"
        style={{
          width: `min(90vw, 900px, calc(100vh - ${SAFE_TOP + SAFE_PAD * 2}px))`,
          aspectRatio: boardRatio,
          backgroundImage: "url('/xiangqi/chineseboard.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <DebugGridOverlay />
        <DebugDotsOverlay />

        {squares}
        {renderMovingPiece()}
      </div>
    </div>
  );
}
