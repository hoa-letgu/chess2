import { randomInt } from 'node:crypto';
import * as ludo from './rules/ludo.js';
import * as quan from './rules/oanquan.js';
import * as chem from './rules/cochem.js';
import * as up from './rules/coup.js';
import * as empire from './rules/tycoon.js';
import * as shogi from './rules/shogi.js';
import * as checkers from './rules/checkers.js';
import * as othello from './rules/othello.js';

export const NATIVE_NAMES = { ludo: 'Cờ cá ngựa', oanquan: 'Ô ăn quan', cochem: 'Cờ chém', coup: 'Cờ úp', tycoon: 'Cờ tỷ phú', shogi: 'Shogi', checkers: 'Cờ Đam', othello: 'Othello' };
export const isNative = game => Object.hasOwn(NATIVE_NAMES, game);
const wrap = native => ({ native, turn: native.turn, board: [], lastMove: null });
export function initialNative(game) {
  const create = { ludo: () => ludo.newGame('local', 2), oanquan: () => quan.newQuanGame(), cochem: () => chem.newChemGame(), coup: () => up.newUpGame(), tycoon: () => empire.newEmpire('local', 2, 12, randomInt), shogi: shogi.newShogi, checkers: checkers.newCheckers, othello: othello.newOthello };
  return wrap(create[game]());
}
function integer(value, max, name) { if (!Number.isInteger(value) || value < 0 || value >= max) throw Error(`${name} không hợp lệ.`); return value; }
export function applyNative(game, original, a) {
  if (['dice', 'winner', 'board', 'state', 'native', 'deck', 'reveal'].some(key => Object.hasOwn(a, key))) throw Error('Máy chủ quyết định trạng thái, xúc xắc và kết quả.');
  const n = original.native;
  let next;
  if (game === 'ludo') {
    if (a.op === 'roll') next = ludo.rollDice(n, randomInt(1, 7));
    else if (a.op === 'token') next = ludo.moveToken(n, integer(a.token, 4, 'Ngựa'));
  } else if (game === 'oanquan' && a.op === 'sow') {
    if (a.direction !== -1 && a.direction !== 1) throw Error('Hướng rải không hợp lệ.');
    next = quan.playQuan(n, integer(a.pit, 12, 'Ô'), a.direction, false).state;
  } else if (game === 'cochem' && a.op === 'step') next = chem.applyChemMove(n, { from: integer(a.from, 25, 'Điểm đi'), to: integer(a.to, 25, 'Điểm đến') });
  else if (game === 'coup' && a.op === 'step') next = up.applyUpMove(n, { from: integer(a.from, 90, 'Điểm đi'), to: integer(a.to, 90, 'Điểm đến') }, randomInt);
  else if (game === 'checkers' && a.op === 'step') next = checkers.applyStep(n, integer(a.from, 64, 'Điểm đi'), integer(a.to, 64, 'Điểm đến'));
  else if (game === 'othello' && a.op === 'place') next = othello.playMove(n, integer(a.to, 64, 'Điểm đến'));
  else if (game === 'shogi') {
    if (a.op === 'declare') next = shogi.declareWin(n);
    else if (a.op === 'step') {
      if (typeof a.promote !== 'boolean') throw Error('Lựa chọn phong cấp không hợp lệ.');
      next = shogi.applyMove(n, { type: 'move', from: integer(a.from, 81, 'Điểm đi'), to: integer(a.to, 81, 'Điểm đến'), promote: a.promote });
    } else if (a.op === 'drop') {
      if (!shogi.HAND_ORDER.includes(a.kind)) throw Error('Quân thả không hợp lệ.');
      next = shogi.applyMove(n, { type: 'drop', kind: a.kind, to: integer(a.to, 81, 'Điểm đến') });
    }
  } else if (game === 'tycoon') {
    if (a.op === 'roll') next = empire.empireAction(n, { type: 'roll', dice: [randomInt(1, 7), randomInt(1, 7)] });
    else if (['buy', 'pass', 'end', 'pay', 'bankrupt', 'bail'].includes(a.op)) next = empire.empireAction(n, { type: a.op });
    else if (['build', 'downgrade', 'sell'].includes(a.op)) next = empire.empireAction(n, { type: a.op, tile: integer(a.tile, 32, 'Tài sản') });
  }
  if (!next) throw Error('Thao tác không hợp lệ cho trò chơi này.');
  let winner = next.winner ?? null;
  if (game === 'ludo' && winner !== null) winner = next.players.findIndex(p => p.id === winner);
  if (game === 'tycoon' && next.phase === 'finished') winner = next.winners.length === 1 ? next.winners[0] : -1;
  return { state: wrap(next), winner, reason: next.reason || (winner !== null ? 'Hoàn thành cuộc đua' : null) };
}
export function publicGameState(game, state) {
  if (game !== 'tycoon' || !state.native) return state;
  // Future chance cards are private server state, including in waiting-room lists.
  return { ...state, native: { ...state.native, deck: [] } };
}
