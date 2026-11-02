import { BoardSurface } from '@/features/arena/MatchSurface';
import type { CSSProperties } from 'react';
import { ARMIES, coord } from './engine';
import type { Move, OthelloState, Side } from './engine';
export type Motion = Move & { side: Side };
export function YinYang(){return <svg className="ot-yinyang" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="81" fill="none" stroke="currentColor" strokeWidth="1"/><circle cx="90" cy="90" r="74" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="3 8"/><circle cx="90" cy="90" r="65" fill="#e5e6c8" stroke="#c6b27b" strokeWidth="2"/><path d="M90 25a65 65 0 0 1 0 130 32.5 32.5 0 0 0 0-65 32.5 32.5 0 0 1 0-65Z" fill="#172d2c"/><circle cx="90" cy="57.5" r="9" fill="#e5e6c8"/><circle cx="90" cy="122.5" r="9" fill="#172d2c"/><path d="M90 3v8m0 158v8M3 90h8m158 0h8" stroke="currentColor" strokeWidth="2"/></svg>;}
export function CloudOrnament({mirror=false}:{mirror?:boolean}){return <svg className={`ot-cloud ${mirror?'mirror':''}`} viewBox="0 0 180 80" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8 57h105q29 0 23-21-4-16-24-11-7-18-28-17-25 1-24 25-15-5-24 6-8 12 8 15h46q23 0 22-13-2-13-17-8-9 4-1 9m37-17 12-10 13 7-10 7 17 5-15 10 19 7-29 12m-25-41 5-14 6 13m-75 48q24 13 52 0"/><path d="M6 68h150m-112-46q-15-1-18 10m119 5 17-10m-21 22 23 7" opacity=".5"/></g></svg>;}
export function OthelloDisc({side,flipTo,delay=0,newDisc=false}:{side:Side;flipTo?:Side;delay?:number;newDisc?:boolean}){
 return <span className={`ot-disc ${flipTo!==undefined?'is-flipping':''} ${newDisc?'is-new':''}`} style={{'--flip-delay':`${delay}ms`}as CSSProperties} aria-hidden="true"><span className={`ot-face side-${side}`}/>{flipTo!==undefined&&<span className={`ot-face ot-back side-${flipTo}`}/>}</span>;
}
export default function OthelloBoard({state,moves,disabled,flip,motion,preview,hint,onPlace,onPreview}:{state:OthelloState;moves:Move[];disabled:boolean;flip:boolean;motion:Motion|null;preview:Move|null;hint:number|null;onPlace:(i:number)=>void;onPreview:(i:number|null)=>void}){
 const display=(i:number)=>flip?63-i:i;
 return <BoardSurface className="ot-board-frame"><div className="ot-files">{[...(flip?'HGFEDCBA':'ABCDEFGH')].map(c=><span key={c}>{c}</span>)}</div><div className="ot-ranks">{Array.from({length:8},(_,i)=><span key={i}>{flip?8-i:i+1}</span>)}</div><div className="ot-board-grid" role="group" aria-label="Bàn Othello 8 cột 8 hàng">{Array.from({length:64},(_,d)=>{
  const i=display(d),cell=state.board[i],move=moves.find(m=>m.at===i),flipping=motion?.flips.includes(i),fresh=motion?.at===i,shown=fresh?motion!.side:cell;
  const distance=motion?Math.max(Math.abs(Math.floor(i/8)-Math.floor(motion.at/8)),Math.abs(i%8-motion.at%8)):0;
  return <button type="button" key={i} className={`ot-cell ${move?'is-legal':''} ${state.last?.at===i?'is-last':''} ${preview?.flips.includes(i)&&!motion?'will-flip':''} ${preview?.at===i?'preview-at':''} ${hint===i?'hint-at':''}`} disabled={disabled||!move} onClick={()=>onPlace(i)} onPointerEnter={()=>{if(!disabled&&move)onPreview(i);}} onPointerLeave={()=>onPreview(null)} onFocus={()=>{if(!disabled&&move)onPreview(i);}} onBlur={()=>onPreview(null)} aria-label={`${coord(i)}, ${cell===null?'trống':`Quân ${ARMIES[cell].short.toLowerCase()} ${ARMIES[cell].name}`}${move?`, đặt được, lật ${move.flips.length} quân`:''}`}>
   {shown!==null&&<OthelloDisc side={shown} flipTo={flipping?motion!.side:undefined} delay={100+(distance-1)*45} newDisc={fresh}/>} {move&&!motion&&<span className="ot-legal-mark" aria-hidden="true">{move.flips.length}</span>}
  </button>;
 })}</div><div className="ot-board-motto"><span>黑 白</span><span>JADE DYNASTY · 玄玉棋局</span><span>乾 坤</span></div>{['nw','ne','sw','se'].map(c=><span key={c} className={`ot-corner ${c}`}><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 36V3h33M9 29V9h20M16 24v-8h8"/></svg></span>)}</BoardSurface>;
}
