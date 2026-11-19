import { FINISH, tokenCoordinate } from './ludoEngine.ts';
import type { LudoState } from './ludoEngine.ts';

export type Motion = { player: number; token: number; progress: number };
export type LudoBeat = {
  kind: 'dice' | 'exit' | 'hop' | 'kick' | 'lane' | 'finish' | 'win';
  state: LudoState; duration: number; player: number; token?: number; motion?: Motion;
  value?: number; kicked?: { player: number; token: number }[]; at?: [number, number]; text?: string;
};

// Entries added to the log by the latest action (logs are newest-first and capped).
function newLogs(before: LudoState, after: LudoState): string[] {
  for (let n = 0; n <= 4; n++) {
    const tail = after.logs.slice(n);
    if (tail.length && tail.every((line, i) => line === before.logs[i])) return after.logs.slice(0, n);
  }
  return after.logs.slice(0, 3);
}

// Only two consecutive confirmed states animate; reconnect snapshots never invent moves.
export function ludoBeats(before: LudoState, after: LudoState): LudoBeat[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  const mover = before.players[before.turn];
  if (after.moves === before.moves) {
    return before.phase === 'roll' && newLogs(before, after).some(l => l.includes(' tung '))
      ? [{ kind: 'dice', state: before, player: mover.id, value: after.lastRoll, duration: 900 }] : [];
  }
  if (after.moves !== before.moves + 1) return [];
  const bp = before.players[before.turn], ap = after.players[before.turn];
  const token = bp.tokens.findIndex((v, i) => v !== ap.tokens[i]);
  if (token < 0) return [];
  const b = bp.tokens[token], a = ap.tokens[token], id = bp.id, out: LudoBeat[] = [];
  if (b === -1) out.push({ kind: 'exit', state: before, player: id, token, motion: { player: id, token, progress: 0 }, duration: 650 });
  else for (let progress = b + 1; progress <= a; progress++) out.push({ kind: 'hop', state: before, player: id, token, motion: { player: id, token, progress }, duration: 150 });
  const kicked = after.players.flatMap(p => p.id === id ? [] : p.tokens.flatMap((v, i) => {
    const old = before.players.find(x => x.id === p.id)!.tokens[i];
    return old >= 0 && v === -1 ? [{ player: p.id, token: i }] : [];
  }));
  if (kicked.length) {
    const shown = structuredClone(after);
    for (const k of kicked) shown.players.find(p => p.id === k.player)!.tokens[k.token] = before.players.find(p => p.id === k.player)!.tokens[k.token];
    out.push({ kind: 'kick', state: shown, player: id, token, kicked, at: tokenCoordinate(id, token, a), text: after.moves % 2 ? 'BOOM!' : 'HÍ HÍ!', duration: 800 });
  }
  if (b <= 50 && a >= 51) out.push({ kind: 'lane', state: after, player: id, token, duration: 450 });
  if (a === FINISH) out.push({ kind: 'finish', state: after, player: id, token, duration: 700 });
  if (after.phase === 'finished') out.push({ kind: 'win', state: after, player: id, duration: 2200 });
  return out;
}
