import { useXiangqiMotion } from '@/features/arena/useXiangqiMotion';
import ChineseMatchHeader, { ChineseFiles } from '@/features/arena/ChineseMatchHeader';
import { BoardSurface } from '@/features/arena/MatchSurface';
import CheckCallout from '@/features/arena/CheckCallout';
import type { UpState, Piece, Move } from './engine';
import { coord, HAN, NAMES, kingSquare, isChecked, pieceTargets } from './engine';
export type Motion=Move&{arrived:boolean;piece:Piece};
export function UpDisc({piece}:{piece:Piece}) {
  return <span className={`up-disc army-${piece.side} ${piece.kind===null?'is-covered':'is-open'}`} aria-hidden="true">{piece.kind===null?<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="36"/>{[0,45,90,135,180,225,270,315].map(a=><path key={a} d="M50 9 54 17 50 23 46 17Z" transform={`rotate(${a} 50 50)`}/>)}<path d="m50 29 21 21-21 21-21-21Z"/><path d="M37 53q3-16 15-13 10 2 4 11-4 6-13 4 7 10 18 2m-17-14-5-9m17 7 7-5"/><circle cx="52" cy="44" r="1.8"/></svg>:<span>{HAN[piece.kind][piece.side]}</span>}</span>;
}
function GridLines(){return <svg className="up-grid-lines" viewBox="0 0 900 1000" aria-hidden="true"><g>{Array.from({length:10},(_,r)=><line key={`h${r}`} x1="50" y1={50+r*100} x2="850" y2={50+r*100}/>)}{Array.from({length:9},(_,c)=>c===0||c===8?<line key={`v${c}`} x1={50+c*100} y1="50" x2={50+c*100} y2="950"/>:<path key={`v${c}`} d={`M${50+c*100} 50V450 M${50+c*100} 550V950`}/>)}<rect x="50" y="50" width="800" height="900" className="up-grid-outline"/><path d="M350 50 550 250m0-200L350 250m0 500 200 200m0-200L350 950"/>{[2,7].flatMap(r=>[1,7].flatMap(c=>[-1,1].flatMap(x=>[-1,1].map(y=><path key={`${r}-${c}-${x}-${y}`} d={`M${50+c*100+x*10} ${50+r*100+y*28}v${-y*18}h${x*18}`}/>))))}</g><g className="up-river"><text x="247" y="517">楚 河</text><text x="647" y="517">漢 界</text><path d="M390 500h120"/></g></svg>;}
export default function UpBoard({state,selected,disabled,flip,motion,onSquare,playerNames}:{playerNames?:[string,string];state:UpState;selected:number|null;disabled:boolean;flip:boolean;motion:Motion|null;onSquare:(i:number)=>void}) {
  const stage = useXiangqiMotion(state.board.map(p=>p?{key:p.id,kind:p.kind??p.role}:null),state.last,flip);
  const targets=selected===null?[]:pieceTargets(state,selected),check=isChecked(state,state.turn)?kingSquare(state,state.turn):-1;
  const displayIndex=(i:number)=>flip?89-i:i;
  const ghost=motion?displayIndex(motion.arrived?motion.to:motion.from):null;
  return <div className="chinese-up-table"><ChineseMatchHeader turn={state.turn} names={playerNames} label={state.winner!==null?'Ván đã kết thúc':undefined}/><BoardSurface className="up-board-frame"><div className="up-frame-inscription"><span>暗 棋</span><span>龍 隱 奇 局</span><span>謀 定 而 動</span></div><ChineseFiles flip={flip}/><div ref={stage} className="up-board-grid" role="group" aria-label="Bàn cờ úp 9 cột 10 hàng">
    <GridLines/>{Array.from({length:90},(_,d)=>{
      const i=displayIndex(d),p=state.board[i],target=targets.includes(i),own=p?.side===state.turn,can=!disabled&&(own||target),revealed=state.last?.to===i&&state.last.revealed!==null;
      return <button type="button" data-xq-cell={i} key={i} className={`up-point ${selected===i?'is-selected':''} ${target?'is-target':''} ${check===i?'is-check':''} ${state.last?.to===i?'is-last':''} ${revealed?'just-revealed':''} ${motion?.from===i?'is-departing':''}`} disabled={!can} onClick={()=>onSquare(i)} aria-label={`${coord(i)}, ${p?p.kind===null?`quân úp ${p.side===0?'đỏ':'đen'}, đi nước đầu như ${NAMES[p.role]}`:`${NAMES[p.kind]} ${p.side===0?'đỏ':'đen'}`:'trống'}${target?', có thể đi đến':''}`} aria-pressed={selected===i}>
        {p&&<UpDisc piece={p}/>} {target&&<span className={p?'up-capture-ring':'up-target-dot'} aria-hidden="true"/>}
      </button>;
    })}{motion&&ghost!==null&&<div className="up-moving-disc" style={{left:`${(ghost%9)*100/9+1.1}%`,top:`${Math.floor(ghost/9)*10+1}%`}}><UpDisc piece={motion.piece}/></div>}
    <CheckCallout checked={check >= 0 && !motion} eventKey={`${state.moves}:${state.turn}:${state.board.map(p=>p?`${p.side}${p.kind??p.role}`:'.').join('')}`}/>
  </div><ChineseFiles flip={flip} bottom/><div className="up-board-footer"><span>◆</span><p>Ẩn quân dưỡng thế · Lật cờ định giang sơn</p><span>◆</span></div><i className="up-corner up-nw"/><i className="up-corner up-ne"/><i className="up-corner up-sw"/><i className="up-corner up-se"/></BoardSurface></div>;
}
export function DragonOrnament({mirror=false}:{mirror?:boolean}) {return <svg viewBox="0 0 200 120" className={`up-dragon ${mirror?'mirror':''}`} aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 96q34 6 30-14-5-17 14-21 30-6 43 13 22 29 53 7 28-20 6-41-24-24-46-8-15 11-4 26 8 12 25 3 11-7 2-16"/><path d="M26 90q25-1 21-15m3-13-3-12 14 7m14-7 9-12 3 17m17-13 10-22 10 11m-6 5 14-23 6 20m12 3 21-8-10 17 20 1-14 11 12 10-22 3"/><path d="m76 66 3 10 12 6m23 1-1 17 13-7m26-17 10 17 3-15M130 40l6-1m-3 12 17 2"/><circle cx="137" cy="39" r="2"/><path d="M29 101q32 4 46-15m89-60 18-9m-7 39 18 6"/></g></svg>;}
