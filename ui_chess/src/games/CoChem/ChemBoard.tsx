import { BoardSurface } from '@/features/arena/MatchSurface';
import type { CSSProperties } from 'react';
import type { ChemState, Side } from './engine';
import { coordinate, forcedMoves, legalMoves, neighbors } from './engine';
export type Motion={from:number;to:number;side:Side;arrived:boolean};
function Token({side}:{side:Side}) {return <span className={`chem-token token-${side}`}><svg viewBox="0 0 100 100" aria-hidden="true">{side===0?<><path d="M48 27q-20-19-25-3 8 16 25 10m4-6q18-23 26-7-1 16-26 14" fill="#58854f"/><path d="m49 35 2-18" stroke="#58854f" strokeWidth="3" strokeLinecap="round"/></>:<g fill="#b85f66"><ellipse cx="43" cy="28" rx="8" ry="11" transform="rotate(-26 43 28)"/><ellipse cx="57" cy="28" rx="8" ry="11" transform="rotate(26 57 28)"/><ellipse cx="50" cy="24" rx="7" ry="12"/><path d="M31 31q19 20 38 0" fill="#ca7b7d"/></g>}<circle cx="35" cy="53" r="3.2" fill={side===0?'#42623c':'#8b494e'}/><circle cx="64" cy="53" r="3.2" fill={side===0?'#42623c':'#8b494e'}/><path d="M43 65q8 8 15 0" fill="none" stroke={side===0?'#52774a':'#a55a60'} strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="27" cy="63" rx="7" ry="3.5" fill={side===0?'#a7bf85':'#d48c89'} opacity=".75"/><ellipse cx="73" cy="63" rx="7" ry="3.5" fill={side===0?'#a7bf85':'#d48c89'} opacity=".75"/></svg></span>;}
export default function ChemBoard({state,selected,disabled,motion,hint,onPoint}:{state:ChemState;selected:number|null;disabled:boolean;motion:Motion|null;hint:number|null;onPoint:(i:number)=>void}) {
  const legal=legalMoves(state),targets=selected===null?[]:legal.filter(m=>m.from===selected).map(m=>m.to),forced=forcedMoves(state),forcedTargets=new Set(forced.map(m=>m.to));
  const lines=Array.from({length:25},(_,i)=>neighbors(i).filter(j=>j>i).map(j=><line key={`${i}-${j}`} x1={50+(i%5)*100} y1={50+Math.floor(i/5)*100} x2={50+(j%5)*100} y2={50+Math.floor(j/5)*100}/>));
  const ghost=motion?(motion.arrived?motion.to:motion.from):null;
  return <BoardSurface className="chem-board-shell"><div className="chem-board-ranks">{[5,4,3,2,1].map(n=><span key={n}>{n}</span>)}</div><div className="chem-board-grid" role="group" aria-label="Bàn cờ chém, 5 hàng 5 cột">
    <svg className="chem-board-lines" viewBox="0 0 500 500" aria-hidden="true"><g>{lines}</g>{[0,4,12,20,24].map(i=><circle key={i} cx={50+(i%5)*100} cy={50+Math.floor(i/5)*100} r="3.8"/>)}</svg>
    {state.board.map((side,i)=>{
      const own=side===state.turn&&legal.some(m=>m.from===i),target=targets.includes(i),enabled=!disabled&&(own||target),hidden=motion?.from===i;
      return <button type="button" key={i} className={`chem-point ${selected===i?'is-selected':''} ${target?'is-target':''} ${state.last?.to===i?'is-last':''} ${state.converted.includes(i)?'is-converted':''} ${forcedTargets.has(i)?'is-forced':''} ${hint===i?'is-hint':''} ${hidden?'is-departing':''}`} disabled={!enabled} onClick={()=>onPoint(i)} aria-label={`${coordinate(i)}, ${side===null?'trống':side===0?'quân Lá':'quân Sen'}${target?', có thể đi đến':''}${forcedTargets.has(i)?', thế mở bắt buộc':''}`} aria-pressed={selected===i}>
        {side!==null&&<Token side={side}/>} {side===null&&target&&<span className="chem-destination" aria-hidden="true">✿</span>} {side===null&&forcedTargets.has(i)&&<span className="chem-forced-flower" aria-hidden="true">✦</span>}
      </button>;
    })}
    {motion&&ghost!==null&&<div className="chem-moving-token" style={{left:`${(ghost%5)*20+2.4}%`,top:`${Math.floor(ghost/5)*20+2.4}%`} as CSSProperties}><Token side={motion.side}/></div>}
  </div><div className="chem-board-files">{[...'ABCDE'].map(c=><span key={c}>{c}</span>)}</div><i className="chem-frame-flower flower-a" aria-hidden="true">✿</i><i className="chem-frame-flower flower-b" aria-hidden="true">✿</i></BoardSurface>;
}
