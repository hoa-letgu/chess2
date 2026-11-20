export type PieceKey = "P" | "N" | "B" | "R" | "Q" | "K" | "p" | "n" | "b" | "r" | "q" | "k";

export const PIECE_IMG: Record<PieceKey, string> = {
  P: "chess/monochrome-armor/wp.png",
  N: "chess/monochrome-armor/wn.png",
  B: "chess/monochrome-armor/wb.png",
  R: "chess/monochrome-armor/wr.png",
  Q: "chess/monochrome-armor/wq.png",
  K: "chess/monochrome-armor/wk.png",

  p: "chess/monochrome-armor/bp.png",
  n: "chess/monochrome-armor/bn.png",
  b: "chess/monochrome-armor/bb.png",
  r: "chess/monochrome-armor/br.png",
  q: "chess/monochrome-armor/bq.png",
  k: "chess/monochrome-armor/bk.png",
};

export function isPieceKey(x: any): x is PieceKey {
  return typeof x === "string" && x in PIECE_IMG;
}

