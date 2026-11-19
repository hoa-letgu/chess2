import { neighbors } from './engine.ts';
import type { ChemState, Side } from './engine.ts';

export type ChemBeat = {
  kind: 'dash' | 'ganh' | 'vay' | 'trap' | 'win'; state: ChemState; duration: number; side: Side;
  from?: number; to?: number; targets?: number[]; ring?: number[];
};

// Beats between two states exactly one move apart; anything else (reconnect, undo, restart) plays nothing.
export function chemBeats(before: ChemState, after: ChemState): ChemBeat[] {
  if (after.moves !== before.moves + 1 || !after.last) return [];
  const actor = before.turn, enemy = (1 - actor) as Side, { from, to } = after.last, out: ChemBeat[] = [];
  const revert = (cells: number[]): ChemState => { const board = [...after.board]; for (const i of cells) board[i] = enemy; return { ...after, board }; };
  out.push({ kind: 'dash', state: before, side: actor, from, to, duration: 250 });
  if (after.ganh.length) out.push({ kind: 'ganh', state: revert([...after.ganh, ...after.vay]), side: actor, from: to, to, targets: after.ganh, duration: 520 });
  if (after.vay.length) {
    const ring = [...new Set(after.vay.flatMap(i => neighbors(i)))].filter(i => after.board[i] === actor && !after.vay.includes(i));
    out.push({ kind: 'vay', state: revert(after.vay), side: actor, targets: after.vay, ring, duration: 600 });
  }
  if (!after.converted.length && after.trap !== null) out.push({ kind: 'trap', state: after, side: actor, to, targets: [after.trap, to], duration: 380 });
  if (after.winner === 0 || after.winner === 1) out.push({ kind: 'win', state: after, side: after.winner, duration: 1200 });
  return out;
}
