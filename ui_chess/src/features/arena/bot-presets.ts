// Highest existing practice profile for each engine. Depths are engine-specific,
// not comparable ratings; keep work bounded so a browser can finish its turn.
export const BOT_PRESETS = {
  chess: { depth: 6, timeLimitMs: 3600 },
  xiangqi: { depth: 4 },
  go: { depth: 5 },
  gomoku: { replyDepth: 2 }, // Plus the candidate placement: three plies total.
} as const;
