export const ARENA_GAMES = {
  cothe: 'Cờ thế', chess: 'Cờ vua', xiangqi: 'Cờ tướng', go: 'Cờ vây', gomoku: 'Cờ caro',
  ludo: 'Cờ cá ngựa', oanquan: 'Ô ăn quan', cochem: 'Cờ chém', coup: 'Cờ úp',
  tycoon: 'Cờ tỷ phú', shogi: 'Shogi', checkers: 'Cờ Đam', othello: 'Othello',
} as const;
export type ArenaGame = keyof typeof ARENA_GAMES;
export type ClassicGame = 'chess' | 'xiangqi' | 'go' | 'gomoku' | 'cothe';
export function isArenaGame(value: string): value is ArenaGame { return Object.hasOwn(ARENA_GAMES, value); }
export function isClassicGame(value: ArenaGame): value is ClassicGame { return ['chess', 'xiangqi', 'go', 'gomoku', 'cothe'].includes(value); }
export function seatName(game: ArenaGame, seat: number) {
  const names: Partial<Record<ArenaGame, string[]>> = { cothe: ['Đỏ · Phá thế', 'Đen · Hóa giải'], chess: ['Trắng', 'Đen'], xiangqi: ['Đỏ', 'Đen'], go: ['Đen', 'Trắng'], gomoku: ['X', 'O'], coup: ['Hồng quân', 'Hắc quân'], shogi: ['Sente', 'Gote'], checkers: ['Hồng Sư', 'Bạch Ưng'], othello: ['Đen', 'Trắng'], ludo: ['Hồng', 'Vàng'], oanquan: ['Hàng 1', 'Hàng 2'], cochem: ['Lá', 'Sen'] };
  return names[game]?.[seat] ?? `Người chơi ${seat + 1}`;
}
