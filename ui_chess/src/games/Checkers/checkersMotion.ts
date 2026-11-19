import type { CheckersState, Piece, Step } from './engine.ts';

export type CheckersBeat = {
  kind: 'slide' | 'jump' | 'crown'; state: CheckersState; duration: number; step: Step; piece: Piece; combo: number;
};

// One beat per confirmed step (a multi-jump arrives as consecutive steps, so combos chain without gaps).
export function checkersBeats(before: CheckersState, after: CheckersState): CheckersBeat[] {
  const step = after.last, piece = step ? before.board[step.from] : null;
  if (!step || !piece || before.board[step.to] || !after.board[step.to] || after.board[step.from]) return [];
  const jump = step.capture !== null, combo = jump ? (before.chain !== null ? before.taken.length : 0) + 1 : 0;
  const out: CheckersBeat[] = [{ kind: jump ? 'jump' : 'slide', state: before, duration: jump ? 420 : piece.king ? 320 : 250, step, piece, combo }];
  if (step.crowned) out.push({ kind: 'crown', state: after, duration: 750, step, piece: after.board[step.to]!, combo });
  return out;
}
