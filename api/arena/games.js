import { NATIVE_NAMES, isNative, initialNative, applyNative } from './native-games.js';
import { newOnlinePuzzle, applyOnlinePuzzle } from './rules/cothe.js';
import { Chess } from 'chess.js';
import { playMove, boardToKey } from '../games/goRules.js';

export const GAME_NAMES = { chess: 'Cờ vua', xiangqi: 'Cờ tướng', go: 'Cờ vây', gomoku: 'Cờ caro', cothe: 'Cờ thế', ...NATIVE_NAMES };
const empty = (n, m = n) => Array.from({ length: n }, () => Array(m).fill(null));
const inside = (b, p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[0] >= 0 && p[0] < b.length && p[1] >= 0 && p[1] < b[0].length;
const side = p => p ? (p === p.toUpperCase() ? 0 : 1) : -1;
const sq = ([r, c]) => 'abcdefgh'[c] + (8 - r);

export function initialState(game, size, puzzle) {
  if (!Object.hasOwn(GAME_NAMES, game)) throw Error('Trò chơi không hợp lệ.');
  if (game === 'cothe') return newOnlinePuzzle(size ?? 10, puzzle);
  if (isNative(game)) return initialNative(game);
  size ??= 19;
  if (game === 'chess') return { board: chessBoard(new Chess()), turn: 0, moves: [], lastMove: null };
  if (game === 'xiangqi') {
    const board = empty(10, 9);
    board[0] = [...'rheagaehr']; board[9] = [...'RHEAGAEHR'];
    for (const c of [1, 7]) { board[2][c] = 'c'; board[7][c] = 'C'; }
    for (const c of [0, 2, 4, 6, 8]) { board[3][c] = 's'; board[6][c] = 'S'; }
    return { board, turn: 0, positions: [JSON.stringify([board, 0])], lastMove: null };
  }
  if (game === 'go' && ![9, 13, 19].includes(size)) throw Error('Chọn bàn 9, 13 hoặc 19.');
  const board = empty(game === 'go' ? size : 15);
  return { board, turn: 0, history: [boardToKey(board)], passes: 0, lastMove: null };
}
function chessBoard(g) { return g.board().map(row => row.map(p => p ? p.color === 'w' ? p.type.toUpperCase() : p.type : null)); }

function pseudo(b, from, to) {
  if (!inside(b, from) || !inside(b, to)) return false;
  const [r, c] = from, [rr, cc] = to, p = b[r][c], s = side(p);
  if (!p || side(b[rr][cc]) === s || (r === rr && c === cc)) return false;
  const dr = rr - r, dc = cc - c, ar = Math.abs(dr), ac = Math.abs(dc);
  const palace = cc >= 3 && cc <= 5 && (s === 0 ? rr >= 7 : rr <= 2);
  const kind = p.toUpperCase();
  if (kind === 'G') {
    if (b[rr][cc]?.toUpperCase() === 'G' && c === cc) return b.slice(Math.min(r, rr) + 1, Math.max(r, rr)).every(row => !row[c]);
    return ar + ac === 1 && palace;
  }
  if (kind === 'A') return ar === 1 && ac === 1 && palace;
  if (kind === 'E') return ar === 2 && ac === 2 && !b[r + dr / 2][c + dc / 2] && (s === 0 ? rr >= 5 : rr <= 4);
  if (kind === 'H') return (ar === 2 && ac === 1 && !b[r + Math.sign(dr)][c]) || (ar === 1 && ac === 2 && !b[r][c + Math.sign(dc)]);
  if (kind === 'S') return (dc === 0 && dr === (s === 0 ? -1 : 1)) || ((s === 0 ? r <= 4 : r >= 5) && dr === 0 && ac === 1);
  if ((kind === 'R' || kind === 'C') && (r === rr || c === cc)) {
    let count = 0;
    for (let i = r + Math.sign(dr), j = c + Math.sign(dc); i !== rr || j !== cc; i += Math.sign(dr), j += Math.sign(dc)) if (b[i][j]) count++;
    return count === (kind === 'C' && b[rr][cc] ? 1 : 0);
  }
  return false;
}
function checked(b, s) {
  let king;
  b.forEach((row, r) => row.forEach((p, c) => { if (p === (s === 0 ? 'G' : 'g')) king = [r, c]; }));
  if (!king) return true;
  return b.some((row, r) => row.some((p, c) => side(p) === 1 - s && pseudo(b, [r, c], king)));
}
function legalXiangqi(b, from, to, s) {
  if (!inside(b, from) || side(b[from[0]][from[1]]) !== s || !pseudo(b, from, to)) return false;
  const next = b.map(row => [...row]); next[to[0]][to[1]] = next[from[0]][from[1]]; next[from[0]][from[1]] = null;
  return !checked(next, s);
}
function hasXiangqiMove(b, s) {
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) if (side(b[r][c]) === s)
    for (let rr = 0; rr < 10; rr++) for (let cc = 0; cc < 9; cc++) if (legalXiangqi(b, [r, c], [rr, cc], s)) return true;
  return false;
}
export function goScore(board) {
  const points = [0, 6.5], seen = new Set(), n = board.length;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (board[r][c]) { points[board[r][c] === 'black' ? 0 : 1]++; continue; }
    if (seen.has(`${r},${c}`)) continue;
    const queue = [[r, c]], colors = new Set(); seen.add(`${r},${c}`);
    for (let i = 0; i < queue.length; i++) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = queue[i][0] + dr, cc = queue[i][1] + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const p = board[rr][cc];
      if (p) colors.add(p);
      else if (!seen.has(`${rr},${cc}`)) { seen.add(`${rr},${cc}`); queue.push([rr, cc]); }
    }
    if (colors.size === 1) points[colors.has('black') ? 0 : 1] += queue.length;
  }
  return points;
}

// Only server-derived moves and outcomes can reach the wallet settlement code.
export function applyGameMove(game, original, action) {
  if (game === 'cothe') return applyOnlinePuzzle(original, action);
  if (isNative(game)) return applyNative(game, original, action);
  const state = structuredClone(original), seat = state.turn;
  let winner = null, reason = null;
  if (game === 'chess') {
    const g = new Chess(); for (const move of state.moves) g.move(move);
    if (!inside(state.board, action.from) || !inside(state.board, action.to)) throw Error('Ô cờ không hợp lệ.');
    const promotion = action.promotion ?? 'q';
    if (!['q', 'r', 'b', 'n'].includes(promotion)) throw Error('Quân phong cấp không hợp lệ.');
    let made; try { made = g.move({ from: sq(action.from), to: sq(action.to), promotion }); } catch { throw Error('Nước đi không hợp lệ.'); }
    state.moves.push(made.san); state.board = chessBoard(g); state.turn = g.turn() === 'w' ? 0 : 1;
    if (g.isCheckmate()) { winner = seat; reason = 'Chiếu bí'; }
    else if (g.isDraw()) { winner = -1; reason = 'Hòa theo luật cờ vua'; }
  } else if (game === 'xiangqi') {
    if (!legalXiangqi(state.board, action.from, action.to, seat)) throw Error('Nước đi không hợp lệ hoặc tướng bị chiếu.');
    const [r, c] = action.from, [rr, cc] = action.to;
    state.board[rr][cc] = state.board[r][c]; state.board[r][c] = null; state.turn = 1 - seat;
    const key = JSON.stringify([state.board, state.turn]); state.positions.push(key);
    if (!hasXiangqiMove(state.board, state.turn)) { winner = seat; reason = 'Đối phương hết nước đi hợp lệ'; }
    else if (state.positions.filter(p => p === key).length >= 3) { winner = -1; reason = 'Hòa lặp thế 3 lần (luật thử nghiệm)'; }
  } else if (game === 'go' && action.pass === true) {
    state.passes++; state.turn = 1 - seat;
    if (state.passes === 2) { state.score = goScore(state.board); winner = state.score[0] > state.score[1] ? 0 : 1; reason = `Hai bên bỏ lượt · Đen ${state.score[0]} / Trắng ${state.score[1]}`; }
  } else {
    if (!inside(state.board, action.to)) throw Error('Ô cờ không hợp lệ.');
    const [r, c] = action.to;
    if (state.board[r][c]) throw Error('Ô này đã có quân.');
    if (game === 'go') {
      const next = playMove(state.board, r, c, seat === 0 ? 'black' : 'white', state.history);
      if (!next || state.history.includes(boardToKey(next))) throw Error('Nước đi vi phạm luật khí hoặc lặp bàn cờ.');
      state.board = next; state.history.push(boardToKey(next)); state.passes = 0;
    } else if (game === 'gomoku') {
      const p = seat === 0 ? 'X' : 'O'; state.board[r][c] = p;
      for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        let count = 1;
        for (const sign of [-1, 1]) for (let k = 1; k < 15; k++) {
          const rr = r + dr * k * sign, cc = c + dc * k * sign;
          if (state.board[rr]?.[cc] !== p) break; count++;
        }
        if (count >= 5) { winner = seat; reason = 'Năm quân liên tiếp'; }
      }
      if (winner === null && state.board.every(row => row.every(Boolean))) { winner = -1; reason = 'Bàn cờ đầy'; }
    } else throw Error('Trò chơi không hợp lệ.');
    state.turn = 1 - seat;
  }
  state.lastMove = action.pass ? null : { from: action.from ?? null, to: action.to };
  return { state, winner, reason };
}
