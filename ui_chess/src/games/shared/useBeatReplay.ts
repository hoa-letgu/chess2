import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type Beat<S> = { state: S; duration: number };

// Plays beats between two consecutive confirmed states, then shows the latest state.
// Used by offline and online boards, so reconnect snapshots never invent moves
// (makeBeats returns [] unless the two states are exactly one move apart).
export function useBeatReplay<S, B extends Beat<S>>(state: S, makeBeats: (before: S, after: S) => B[]) {
  const previous = useRef(state), [beat, setBeat] = useState<B | null>(null), timer = useRef(0);
  const signature = JSON.stringify(state);
  useLayoutEffect(() => {
    const next = JSON.parse(signature) as S, before = previous.current; previous.current = next;
    const beats = makeBeats(before, next);
    if (!beats.length || matchMedia('(prefers-reduced-motion: reduce)').matches) { setBeat(null); return; }
    let index = 0;
    const advance = () => { const b = beats[index++]; setBeat(b ?? null); if (b) timer.current = window.setTimeout(advance, b.duration); };
    advance();
    return () => window.clearTimeout(timer.current);
  }, [signature, makeBeats]);
  const skip = useCallback(() => { window.clearTimeout(timer.current); setBeat(null); }, []);
  return { display: beat?.state ?? state, beat, busy: !!beat, skip };
}
