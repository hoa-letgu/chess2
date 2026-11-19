import { BoardSurface } from '@/features/arena/MatchSurface';
import type { CSSProperties } from 'react';
import type { ChemState, Side } from './engine';
import { coordinate, forcedMoves, legalMoves, neighbors } from './engine';
import type { ChemBeat } from './chemMotion';
import './chem-fx.css';
function Token({side}:{side:Side}) {return <span className={`chem-token token-${side}`}><svg viewBox="0 0 100 100" aria-hidden="true">{side===0?<><path d="M48 27q-20-19-25-3 8 16 25 10m4-6q18-23 26-7-1 16-26 14" fill="#58854f"/><path d="m49 35 2-18" stroke="#58854f" strokeWidth="3" strokeLinecap="round"/></>:<g fill="#b85f66"><ellipse cx="43" cy="28" rx="8" ry="11" transform="rotate(-26 43 28)"/><ellipse cx="57" cy="28" rx="8" ry="11" transform="rotate(26 57 28)"/><ellipse cx="50" cy="24" rx="7" ry="12"/><path d="M31 31q19 20 38 0" fill="#ca7b7d"/></g>}<circle cx="35" cy="53" r="3.2" fill={side===0?'#42623c':'#8b494e'}/><circle cx="64" cy="53" r="3.2" fill={side===0?'#42623c':'#8b494e'}/><path d="M43 65q8 8 15 0" fill="none" stroke={side===0?'#52774a':'#a55a60'} strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="27" cy="63" rx="7" ry="3.5" fill={side===0?'#a7bf85':'#d48c89'} opacity=".75"/><ellipse cx="73" cy="63" rx="7" ry="3.5" fill={side===0?'#a7bf85':'#d48c89'} opacity=".75"/></svg></span>;}
const pt=(i:number)=>[50+(i%5)*100,50+Math.floor(i/5)*100] as const;
export default function ChemBoard({state,selected,disabled,beat=null,hint,onPoint}:{state:ChemState;selected:number|null;disabled:boolean;beat?:ChemBeat|null;hint:number|null;onPoint:(i:number)=>void}) {
  const legal=legalMoves(state),targets=selected===null?[]:legal.filter(m=>m.from===selected).map(m=>m.to),forced=forcedMoves(state),forcedTargets=new Set(forced.map(m=>m.to));
  const lines=Array.from({length:25},(_,i)=>neighbors(i).filter(j=>j>i).map(j=><line key={`${i}-${j}`} x1={50+(i%5)*100} y1={50+Math.floor(i/5)*100} x2={50+(j%5)*100} y2={50+Math.floor(j/5)*100}/>));
  const dash=beat?.kind==='dash'&&beat.from!==undefined&&beat.to!==undefined?beat:null;
  const flipping=new Set(beat?.kind==='ganh'||beat?.kind==='vay'?beat.targets:[]),ring=new Set(beat?.kind==='vay'?beat.ring:[]),sparkle=new Set(beat?.kind==='trap'?beat.targets:[]);
  const win=beat?.kind==='win'?beat.side:null;
  const around=(()=>{
    if(beat?.kind!=='vay'||!beat.targets?.length)return '';
    const cells=new Set(beat.targets),edges:string[]=[];
    for(const i of cells){const [x,y]=pt(i),r=Math.floor(i/5),c=i%5;
      if(r===0||!cells.has(i-5))edges.push(`M${x-47} ${y-47}h94`);
      if(c===4||!cells.has(i+1))edges.push(`M${x+47} ${y-47}v94`);
      if(r===4||!cells.has(i+5))edges.push(`M${x+47} ${y+47}h-94`);
      if(c===0||!cells.has(i-1))edges.push(`M${x-47} ${y+47}v-94`);
    }return edges.join(' ');
  })();
  return <BoardSurface className={`chem-board-shell ${win!==null?`chem-win win-${win}`:''}`}><div className="chem-board-ranks">{[5,4,3,2,1].map(n=><span key={n}>{n}</span>)}</div><div className="chem-board-grid" data-beat={beat?.kind??'idle'} role="group" aria-label="Bàn cờ chém, 5 hàng 5 cột">
    <svg className="chem-board-lines" viewBox="0 0 500 500" aria-hidden="true"><g>{lines}</g>{[0,4,12,20,24].map(i=><circle key={i} cx={50+(i%5)*100} cy={50+Math.floor(i/5)*100} r="3.8"/>)}</svg>
    <svg className="chem-fx-layer" viewBox="0 0 500 500" aria-hidden="true">
      {hint!==null&&forced.map(m=><line key={`forced-${m.from}`} className="chem-hint-line" x1={pt(m.from)[0]} y1={pt(m.from)[1]} x2={pt(m.to)[0]} y2={pt(m.to)[1]}/>)}{selected!==null&&hint!==null&&<line className="chem-hint-line" x1={pt(selected)[0]} y1={pt(selected)[1]} x2={pt(hint)[0]} y2={pt(hint)[1]}/>}
      {beat?.kind==='ganh'&&beat.to!==undefined&&beat.targets?.map(t=>{const [x,y]=pt(beat.to!),[tx,ty]=pt(t);return <line key={t} className="chem-slash" pathLength={1} x1={x} y1={y} x2={x+(tx-x)*1.35} y2={y+(ty-y)*1.35}/>;})}
      {beat?.kind==='vay'&&<>{around&&<path className="chem-energy-outline" pathLength={1} d={around}/>}{beat.targets?.map(t=><circle key={t} className="chem-energy-dot" cx={pt(t)[0]} cy={pt(t)[1]} r="46"/>)}</>}
    </svg>
    {state.board.map((side,i)=>{
      const own=side===state.turn&&legal.some(m=>m.from===i),target=targets.includes(i),enabled=!disabled&&(own||target),hidden=dash?.from===i,flip=flipping.has(i)&&side!==null&&beat;
      return <button type="button" key={i} className={`chem-point ${selected===i?'is-selected':''} ${target?'is-target':''} ${state.last?.to===i?'is-last':''} ${state.converted.includes(i)?'is-converted':''} ${forcedTargets.has(i)?'is-forced':''} ${hint===i?'is-hint':''} ${hidden?'is-departing':''} ${flip?'fx-flip':''} ${ring.has(i)?'fx-ring':''} ${sparkle.has(i)?'fx-sparkle':''} ${win!==null&&side===win?'fx-celebrate':''}`} style={{'--rd':`${Math.max(0,[...ring].indexOf(i))*Math.min(70,300/Math.max(1,ring.size))}ms`,'--flip-duration':`${beat?.duration??520}ms`}as CSSProperties} disabled={!enabled} onClick={()=>onPoint(i)} aria-label={`${coordinate(i)}, ${side===null?'trống':side===0?'quân Lá':'quân Sen'}${target?', có thể đi đến':''}${forcedTargets.has(i)?', thế mở bắt buộc':''}`} aria-pressed={selected===i}>
        {side!==null&&(flip?<><span className="fx-old"><Token side={side}/></span><span className="fx-new"><Token side={beat!.side}/></span></>:<Token side={side}/>)} {side===null&&target&&<span className="chem-destination" aria-hidden="true">✿</span>} {side===null&&forcedTargets.has(i)&&<span className="chem-forced-flower" aria-hidden="true">✦</span>}
        {flip&&<span className="chem-convert-particles" aria-hidden="true">{[0,1,2,3,4,5].map(n=><i key={n} style={{'--angle':`${n*60}deg`}as CSSProperties}>✦</i>)}</span>}{sparkle.has(i)&&<span className="chem-sparkle" aria-hidden="true">✦</span>}
      </button>;
    })}
    {dash&&<div key={`${dash.from}-${dash.to}`} className="chem-moving-token fx-dash" style={{left:`${(dash.to!%5)*20+2.4}%`,top:`${Math.floor(dash.to!/5)*20+2.4}%`,'--dx':`${((dash.from!%5)-(dash.to!%5))*131.6}%`,'--dy':`${(Math.floor(dash.from!/5)-Math.floor(dash.to!/5))*131.6}%`,'--dur':`${dash.duration}ms`}as CSSProperties}><Token side={dash.side}/></div>}
    {win!==null&&<div className="chem-stars" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--i':i}as CSSProperties}>✦</i>)}</div>}
  </div><div className="chem-board-files">{[...'ABCDE'].map(c=><span key={c}>{c}</span>)}</div><i className="chem-frame-flower flower-a" aria-hidden="true">✿</i><i className="chem-frame-flower flower-b" aria-hidden="true">✿</i></BoardSurface>;
}
