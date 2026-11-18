export type MotionToken = { key: string; kind: string } | null;
export function xiangqiDuration(kind: string, capture: boolean) {
  return ({ S: 310, A: 360, G: 460, E: 510, H: 610, R: 390, C: capture ? 660 : 360 } as Record<string, number>)[kind] ?? 360;
}
export function confirmedXiangqiMove(before: MotionToken[], after: MotionToken[], from?: number, to?: number) {
  if(before.length!==90||after.length!==90||from===undefined||to===undefined||from===to||!before[from]||after[from]||!after[to]||before[from]?.key!==after[to]?.key)return false;
  return after.filter((p,i)=>JSON.stringify(p)!==JSON.stringify(before[i])).length===2;
}
