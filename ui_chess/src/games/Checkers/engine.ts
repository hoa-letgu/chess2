export type Side = 0 | 1;
export type Piece = { side: Side; king: boolean };
export type Position = { board: (Piece | null)[]; turn: Side; chain: number | null };
export type Step = { from: number; to: number; capture: number | null };
export type Turn = { path: number[]; captures: number[]; crowned: boolean };
export type CheckersState = Position & {
  ply: number; quiet: number; winner: Side | -1 | null; reason: string;
  captured: [Piece[], Piece[]]; history: string[]; logs: string[];
  path: number[]; taken: number[]; last: (Step & { crowned: boolean }) | null;
};
export const ARMIES = [
  { name: 'Hồng Sư', english: 'CRIMSON LION', color: '#d99165', short: 'đỏ' },
  { name: 'Bạch Ưng', english: 'IVORY EAGLE', color: '#d5d8cb', short: 'trắng' },
] as const;
export const coord = (i: number) => `${'abcdefgh'[i % 8]}${8 - Math.floor(i / 8)}`;
export const playable = (i: number) => Number.isInteger(i) && i >= 0 && i < 64 && (Math.floor(i / 8) + i % 8) % 2 === 1;
export const positionKey = (p: Position) => p.board.map(x => x ? `${x.side}${x.king ? 'K' : 'M'}` : '.').join('') + `:${p.turn}`;
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const crownRow = (side: Side, i: number) => Math.floor(i / 8) === (side === 0 ? 0 : 7);
export function newCheckers(): CheckersState {
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let i = 0; i < 64; i++) if (playable(i) && (i < 24 || i >= 40)) board[i] = { side: i < 24 ? 1 : 0, king: false };
  const s: CheckersState = { board, turn: 0, chain: null, ply: 0, quiet: 0, winner: null, reason: '', captured: [[], []], history: [], logs: ['Hai đạo quân đã tập kết. Hồng Sư xuất trận trước.'], path: [], taken: [], last: null };
  s.history = [positionKey(s)]; return s;
}
function pieceSteps(board: (Piece | null)[], from: number, capture: boolean): Step[] {
  const p = board[from]; if (!p) return [];
  const result: Step[] = [], row = Math.floor(from / 8), col = from % 8, directions = p.king ? [-1, 1] : [p.side === 0 ? -1 : 1];
  for (const dr of directions) for (const dc of [-1, 1]) {
    const r = row + dr, c = col + dc; if (!inside(r, c)) continue; const middle = r * 8 + c;
    if (!capture && !board[middle]) result.push({ from, to: middle, capture: null });
    if (capture && board[middle] && board[middle]!.side !== p.side && inside(row + 2 * dr, col + 2 * dc)) {
      const to = (row + 2 * dr) * 8 + col + 2 * dc; if (!board[to]) result.push({ from, to, capture: middle });
    }
  }
  return result;
}
export function legalSteps(p: Position): Step[] {
  if (p.chain !== null) return p.board[p.chain]?.side === p.turn ? pieceSteps(p.board, p.chain, true) : [];
  const indices = p.board.flatMap((x, i) => x?.side === p.turn ? [i] : []), jumps = indices.flatMap(i => pieceSteps(p.board, i, true));
  return jumps.length ? jumps : indices.flatMap(i => pieceSteps(p.board, i, false));
}
function shifted(board: (Piece | null)[], step: Step): { board: (Piece | null)[]; crowned: boolean } {
  const piece = board[step.from]!, next = [...board], crowned = !piece.king && crownRow(piece.side, step.to);
  next[step.from] = null; if (step.capture !== null) next[step.capture] = null; next[step.to] = { ...piece, king: piece.king || crowned };
  return { board: next, crowned };
}
export function legalTurns(p: Position): Turn[] {
  const result: Turn[] = [];
  function follow(board: (Piece | null)[], step: Step, path: number[], captures: number[]) {
    const next = shifted(board, step), route = [...path, step.to], taken = step.capture === null ? captures : [...captures, step.capture];
    const further = step.capture !== null && !next.crowned ? pieceSteps(next.board, step.to, true) : [];
    if (!further.length) result.push({ path: route, captures: taken, crowned: next.crowned });
    else for (const jump of further) follow(next.board, jump, route, taken);
  }
  for (const step of legalSteps(p)) follow(p.board, step, [step.from], []);
  return result;
}
export function applyStep(s: CheckersState, from: number, to: number): CheckersState {
  const step = legalSteps(s).find(m => m.from === from && m.to === to);
  if (s.winner !== null || !step) throw Error('Nước đi không hợp lệ. Phải ăn quân và hoàn tất chuỗi bắt nếu có.');
  const piece = s.board[from]!, next = shifted(s.board, step), captured: [Piece[], Piece[]] = [[...s.captured[0]], [...s.captured[1]]];
  if (step.capture !== null) captured[s.turn].push({ ...s.board[step.capture]! });
  const path = s.chain === null ? [from, to] : [...s.path, to], taken = step.capture === null ? [] : [...(s.chain === null ? [] : s.taken), step.capture];
  const continues = step.capture !== null && !next.crowned && pieceSteps(next.board, to, true).length > 0;
  const result: CheckersState = { ...s, board: next.board, captured, path: continues ? path : [], taken: continues ? taken : [], chain: continues ? to : null, last: { ...step, crowned: next.crowned }, history: [...s.history], logs: [...s.logs] };
  if (step.capture !== null || !piece.king) result.quiet = 0;
  else result.quiet++;
  if (continues) return result;
  result.turn = (1 - s.turn) as Side; result.ply++;
  result.history.push(positionKey(result));
  result.logs = [`${ARMIES[s.turn].name}: ${path.map(coord).join(taken.length ? ' × ' : ' → ')}${taken.length ? ` · bắt ${taken.length} quân` : ''}${next.crowned ? ' · phong Vua' : ''}.`, ...s.logs].slice(0, 12);
  if (!legalSteps(result).length) { result.winner = s.turn; result.reason = result.board.some(p => p?.side === result.turn) ? 'Đối phương bị phong tỏa, không còn nước đi.' : 'Đã bắt hết quân đối phương.'; }
  else if (result.history.filter(key => key === positionKey(result)).length >= 3) { result.winner = -1; result.reason = 'Hòa do cùng thế cờ và lượt đi lặp 3 lần.'; }
  else if (result.quiet >= 80) { result.winner = -1; result.reason = 'Hòa sau 80 nửa lượt không ăn quân và không tiến quân thường.'; }
  else if (result.ply >= 400) { result.winner = -1; result.reason = 'Hòa theo giới hạn 400 nửa lượt của bản đấu tập.'; }
  return result;
}
function playTurn(p: Position, move: Turn): Position {
  const board = [...p.board], piece = p.board[move.path[0]]!; board[move.path[0]] = null;
  move.captures.forEach(i => { board[i] = null; }); board[move.path[move.path.length - 1]] = { ...piece, king: piece.king || move.crowned };
  return { board, turn: (1 - p.turn) as Side, chain: null };
}
function evaluate(p: Position): number {
  let score = 0;
  p.board.forEach((piece, i) => {
    if (!piece) return; const r = Math.floor(i / 8), c = i % 8, progress = piece.side === 0 ? 7 - r : r;
    const value = (piece.king ? 185 : 100 + progress * 4) + (3.5 - Math.abs(c - 3.5)) * 2 + (c === 0 || c === 7 ? 4 : 0) + (!piece.king && progress === 0 ? 5 : 0);
    score += piece.side === p.turn ? value : -value;
  }); return score;
}
function order(p: Position, moves: Turn[]): Turn[] {
  const rank = (m: Turn) => m.captures.reduce((n, i) => n + (p.board[i]?.king ? 185 : 100), 0) * 4 + (m.crowned ? 200 : 0) + (3.5 - Math.abs(m.path[m.path.length - 1] % 8 - 3.5)) * 2;
  return [...moves].sort((a, b) => rank(b) - rank(a));
}
// Search complete turns, so a forced multi-jump is never mistaken for a reply.
// Iterative deepening retains only fully searched iterations under a node cap.
export function chooseTurn(p: Position, level: 'easy' | 'smart' = 'smart'): Turn | undefined {
  const roots = order(p, legalTurns(p)); if (roots.length <= 1) return roots[0];
  let best = roots[0], nodes = 0, stopped = false;
  const limit = level === 'smart' ? 24000 : 2500, depthLimit = level === 'smart' ? 5 : 2;
  function search(position: Position, depth: number, alpha: number, beta: number, ply: number): number {
    if (++nodes > limit) { stopped = true; return evaluate(position); }
    const moves = order(position, legalTurns(position)); if (!moves.length) return -100000 + ply;
    if (depth === 0) return evaluate(position);
    let value = -Infinity;
    for (const move of moves) { value = Math.max(value, -search(playTurn(position, move), depth - 1, -beta, -alpha, ply + 1)); if (stopped) return value; alpha = Math.max(alpha, value); if (alpha >= beta) break; }
    return value;
  }
  for (let depth = 1; depth <= depthLimit; depth++) {
    let candidate = best, value = -Infinity;
    const ordered = [best, ...roots.filter(m => m !== best)];
    for (const m of ordered) { const score = -search(playTurn(p, m), depth - 1, -Infinity, -value, 1); if (stopped) break; if (score > value) { value = score; candidate = m; } }
    if (stopped) break; best = candidate;
  }
  return best;
}
