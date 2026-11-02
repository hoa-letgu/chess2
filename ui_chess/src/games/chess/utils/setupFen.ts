import type { PieceKey } from "@/games/chess/utils/pieces";

type SetupPiece = PieceKey | null;

function rowToFen(row: SetupPiece[]) {
  let out = "";
  let empty = 0;
  for (const cell of row) {
    if (!cell) empty++;
    else {
      if (empty) out += String(empty), (empty = 0);
      out += cell;
    }
  }
  if (empty) out += String(empty);
  return out;
}

export function boardToFen(board8x8: SetupPiece[][], turn: "w" | "b") {
  const placement = board8x8.map(rowToFen).join("/");
  return `${placement} ${turn} - - 0 1`;
}

function findKings(board: SetupPiece[][]) {
  let w: { r: number; c: number } | null = null;
  let b: { r: number; c: number } | null = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "K") w = { r, c };
      if (p === "k") b = { r, c };
    }
  }
  return { w, b };
}

export function validateSetupBoard(board: SetupPiece[][]): { ok: boolean; error?: string } {
  // count kings / pawns
  let wK = 0,
    bK = 0,
    wP = 0,
    bP = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p === "K") wK++;
      if (p === "k") bK++;
      if (p === "P") wP++;
      if (p === "p") bP++;

      // optional (khuyên): pawn không nằm rank 1/8
      if ((p === "P" || p === "p") && (r === 0 || r === 7)) {
        return { ok: false, error: "Pawn không được đặt ở hàng 1 hoặc 8." };
      }
    }
  }

  if (wK !== 1 || bK !== 1) {
    return { ok: false, error: "Setup phải có đúng 1 vua Trắng (K) và 1 vua Đen (k)." };
  }
  if (wP > 8 || bP > 8) {
    return { ok: false, error: "Mỗi bên không được có quá 8 quân Tốt (pawn)." };
  }

  // kings not adjacent
  const { w, b } = findKings(board);
  if (!w || !b) return { ok: false, error: "Thiếu vua." };

  const dr = Math.abs(w.r - b.r);
  const dc = Math.abs(w.c - b.c);
  if (dr <= 1 && dc <= 1) {
    return { ok: false, error: "Hai vua không được đứng kề nhau." };
  }

  return { ok: true };
}