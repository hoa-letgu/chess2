export type PieceKey = "P" | "N" | "B" | "R" | "Q" | "K" | "p" | "n" | "b" | "r" | "q" | "k";

export const PIECE_IMG: Record<PieceKey, string> = {
  P: "chess/imperial-dragon/wp.png",
  N: "chess/imperial-dragon/wn.png",
  B: "chess/imperial-dragon/wb.png",
  R: "chess/imperial-dragon/wr.png",
  Q: "chess/imperial-dragon/wq.png",
  K: "chess/imperial-dragon/wk.png",

  p: "chess/imperial-dragon/bp.png",
  n: "chess/imperial-dragon/bn.png",
  b: "chess/imperial-dragon/bb.png",
  r: "chess/imperial-dragon/br.png",
  q: "chess/imperial-dragon/bq.png",
  k: "chess/imperial-dragon/bk.png",
};

export function isPieceKey(x: any): x is PieceKey {
  return typeof x === "string" && x in PIECE_IMG;
}

