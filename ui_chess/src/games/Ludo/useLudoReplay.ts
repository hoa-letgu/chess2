import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { LudoState } from './ludoEngine';
import { ludoBeats } from './ludoMotion';
import type { LudoBeat } from './ludoMotion';

// Shared by offline and online: plays beats between consecutive states, then shows the latest state.
export function useLudoReplay(state: LudoState) {
  const previous = useRef(state), [beat, setBeat] = useState<LudoBeat | null>(null), timer = useRef<number>(0);
  const signature = JSON.stringify(state);
  useLayoutEffect(() => {
    const next: LudoState = JSON.parse(signature), before = previous.current; previous.current = next;
    const beats = ludoBeats(before, next);
    if (!beats.length || matchMedia('(prefers-reduced-motion: reduce)').matches) { setBeat(null); return; }
    let index = 0;
    const advance = () => { const b = beats[index++]; setBeat(b ?? null); if (b) timer.current = window.setTimeout(advance, b.duration); };
    advance();
    return () => window.clearTimeout(timer.current);
  }, [signature]);
  const skip = useCallback(() => { window.clearTimeout(timer.current); setBeat(null); }, []);
  return { display: beat?.state ?? state, beat, busy: !!beat, skip };
}
