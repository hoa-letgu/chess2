export type Mode = 'bots' | 'local';
export type Player = { id: number; name: string; bot: boolean; tokens: number[] };
export type LudoState = {
  players: Player[];
  turn: number;
  phase: 'roll' | 'choose' | 'finished';
  dice: number | null;
  lastRoll: number;
  consecutiveSixes: number;
  winner: number | null;
  logs: string[];
  moves: number;
};
export const FINISH = 56;
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const COLORS = [
  { name: 'Hồng', hex: '#ff4d95', dark: '#9d1e62', light: '#ffbbd7' },
  { name: 'Xanh dương', hex: '#42c9ff', dark: '#166cbb', light: '#c2f2ff' },
  { name: 'Vàng', hex: '#ffce4d', dark: '#ac710e', light: '#fff2b6' },
  { name: 'Xanh lá', hex: '#84ec79', dark: '#318c58', light: '#d1ffc5' },
];
export const TRACK: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],
];
export const HOME: [number, number][][] = [
  Array.from({ length: 6 }, (_, i) => [7, i + 1] as [number, number]),
  Array.from({ length: 6 }, (_, i) => [i + 1, 7] as [number, number]),
  Array.from({ length: 6 }, (_, i) => [7, 13 - i] as [number, number]),
  Array.from({ length: 6 }, (_, i) => [13 - i, 7] as [number, number]),
];
export const BASES: [number, number][][] = [
  [[1.9,1.9],[1.9,4],[4,1.9],[4,4]],
  [[1.9,10],[1.9,12.1],[4,10],[4,12.1]],
  [[10,10],[10,12.1],[12.1,10],[12.1,12.1]],
  [[10,1.9],[10,4],[12.1,1.9],[12.1,4]],
];
export function trackIndex(player: number, progress: number) { return (player * 13 + progress) % 52; }
export function tokenCoordinate(player: number, token: number, progress: number): [number, number] {
  if (progress < 0) return BASES[player][token];
  return progress <= 50 ? TRACK[trackIndex(player, progress)] : HOME[player][Math.min(progress, FINISH) - 51];
}
export function newGame(mode: Mode = 'bots', count = 4): LudoState {
  if (![2, 3, 4].includes(count)) throw Error('Chọn từ 2 đến 4 người.');
  const ids = mode === 'bots' ? [0, 1, 2, 3] : count === 2 ? [0, 2] : Array.from({ length: count }, (_, i) => i);
  return { players: ids.map((id, i) => ({ id, name: mode === 'bots' ? i === 0 ? 'Bạn' : `Bot ${COLORS[id].name}` : `Người chơi ${i + 1}`, bot: mode === 'bots' && i > 0, tokens: [-1, -1, -1, -1] })), turn: 0, phase: 'roll', dice: null, lastRoll: 1, consecutiveSixes: 0, winner: null, logs: ['Bàn mới đã sẵn sàng. Tung 6 để xuất chuồng.'], moves: 0 };
}
function log(state: LudoState, message: string) { state.logs = [message, ...state.logs].slice(0, 12); }
function nextTurn(state: LudoState) {
  state.turn = (state.turn + 1) % state.players.length;
  state.phase = 'roll'; state.dice = null; state.consecutiveSixes = 0;
}
export function legalTokens(state: LudoState): number[] {
  if (state.phase !== 'choose' || state.dice === null) return [];
  const dice = state.dice;
  return state.players[state.turn].tokens.flatMap((p, i) => p === -1 ? dice === 6 ? [i] : [] : p < FINISH && p + dice <= FINISH ? [i] : []);
}
export function rollDice(original: LudoState, value: number): LudoState {
  if (original.phase !== 'roll') throw Error('Chưa thể tung xúc xắc.');
  if (!Number.isInteger(value) || value < 1 || value > 6) throw Error('Xúc xắc không hợp lệ.');
  const state = structuredClone(original), player = state.players[state.turn];
  state.dice = value; state.lastRoll = value;
  state.consecutiveSixes = value === 6 ? state.consecutiveSixes + 1 : 0;
  if (state.consecutiveSixes === 3) {
    log(state, `${player.name} tung 3 lần 6 liên tiếp · mất lượt.`); nextTurn(state); return state;
  }
  state.phase = 'choose'; log(state, `${player.name} tung được ${value}.`);
  if (!legalTokens(state).length) {
    log(state, `${player.name} không có nước hợp lệ · ${value === 6 ? 'được tung tiếp' : 'chuyển lượt'}.`);
    if (value === 6) { state.phase = 'roll'; state.dice = null; } else nextTurn(state);
  }
  return state;
}
export function moveToken(original: LudoState, token: number): LudoState {
  if (!legalTokens(original).includes(token)) throw Error('Ngựa không thể di chuyển với lượt này.');
  const state = structuredClone(original), player = state.players[state.turn], before = player.tokens[token], dice = state.dice!;
  const target = before === -1 ? 0 : before + dice;
  player.tokens[token] = target; state.moves++;
  let captured = 0;
  if (target <= 50) {
    const landing = trackIndex(player.id, target);
    if (!SAFE_SQUARES.has(landing)) for (const other of state.players) if (other.id !== player.id)
      other.tokens = other.tokens.map(p => { if (p >= 0 && p <= 50 && trackIndex(other.id, p) === landing) { captured++; return -1; } return p; });
  }
  log(state, `${player.name} ${before === -1 ? 'xuất chuồng' : target === FINISH ? 'đưa ngựa về đích' : `đi ${dice} ô`}${captured ? ` · đá ${captured} ngựa!` : '.'}`);
  if (player.tokens.every(p => p === FINISH)) { state.phase = 'finished'; state.winner = player.id; state.dice = null; log(state, `${player.name} chiến thắng! Đủ 4 ngựa về đích.`); }
  else if (dice === 6) { state.phase = 'roll'; state.dice = null; }
  else nextTurn(state);
  return state;
}
export function chooseBotToken(state: LudoState): number {
  const player = state.players[state.turn];
  return legalTokens(state).sort((a, b) => score(b) - score(a))[0] ?? -1;
  function score(token: number) {
    const next = moveToken(state, token), p = next.players.find(p => p.id === player.id)!;
    const captured = state.players.reduce((n, old) => old.id === player.id ? n : n + old.tokens.filter(x => x >= 0).length - next.players.find(x => x.id === old.id)!.tokens.filter(x => x >= 0).length, 0);
    return (p.tokens[token] === FINISH ? 1000 : 0) + captured * 220 + (player.tokens[token] === -1 ? 45 : 0) + p.tokens[token];
  }
}
export function randomDice(): number {
  const byte = new Uint8Array(1);
  do { crypto.getRandomValues(byte); } while (byte[0] >= 252);
  return byte[0] % 6 + 1;
}
