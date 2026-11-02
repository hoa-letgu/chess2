import { BoardSurface } from '@/features/arena/MatchSurface';
import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { Frame, QuanState } from './engine';
import { isQuan, legalPits, pitLabel } from './engine';

export default function QuanBoard({ state, frame, selected, disabled, onSelect }: { state: QuanState; frame: Frame | null; selected: number | null; disabled: boolean; onSelect: (pit:number)=>void }) {
  const uid=useId().replace(/:/g,''), view=frame??state, legal=legalPits(state);
  return <BoardSurface className={`quan-board-player-${state.turn}`}>
    <div className="quan-row-caption"><span>HÀNG TRÊN</span><span>①</span><span>②</span><span>③</span><span>④</span><span>⑤</span><i /></div>
    <div className="quan-earth-board" role="group" aria-label="Bàn ô ăn quan gồm 10 ô dân và 2 ô quan">
      <svg width="0" height="0" aria-hidden="true" className="quan-svg-defs"><defs><radialGradient id={`${uid}-stone`} cx="30%" cy="25%"><stop stopColor="#fffaf0" /><stop offset=".65" stopColor="#e1d7bc" /><stop offset="1" stopColor="#b7ad93" /></radialGradient></defs></svg>
      {Array.from({length:12},(_,i)=>{
        const quan=isQuan(i), focus=frame?.focus===i, active=!disabled&&legal.includes(i), count=view.pits[i];
        const style={gridColumn:i===11?1:i===5?7:i<5?i+2:12-i,gridRow:quan?'1 / span 2':i<5?2:1} as CSSProperties;
        return <button key={i} type="button" className={`quan-pit ${quan?'is-quan':''} ${active?'is-available':''} ${selected===i?'is-selected':''} ${focus?'is-sowing':''}`} style={style} disabled={!active} onClick={()=>onSelect(i)} aria-label={`${pitLabel(i)}, ${count} dân${view.quan[i]?', có 1 quan':''}${active?', có thể chọn':''}`} aria-pressed={selected===i}>
          <svg viewBox={quan?'0 0 100 220':'0 0 100 110'} className="quan-pit-art" aria-hidden="true">
            {Array.from({length:Math.min(count,20)},(_,n)=>{
              const angle=n*2.39996, radius=Math.min(32,11+Math.sqrt(n)*5.1), cx=50+Math.cos(angle)*radius,cy=(quan?124:52)+Math.sin(angle)*radius*(quan?1.8:1);
              return <g key={n} transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${n*37%100})`}><ellipse cy="2" rx="8.7" ry="10.8" fill="#665c3a25" /><ellipse rx="8" ry="10" fill={`url(#${uid}-stone)`} stroke="#9b91755a" strokeWidth=".6" /><path d="M-3-6q4-3 6 0" fill="none" stroke="#fff8" strokeWidth="1.4" strokeLinecap="round" /></g>;
            })}
            {view.quan[i]&&<g transform="translate(50 65)"><ellipse cy="33" rx="23" ry="7" fill="#83614633" /><path d="M-23 19Q-25-18-10-24q10-7 20 0 15 6 13 43-2 22-23 22t-23-22Z" fill="#e8b865" stroke="#b98a48" strokeWidth="2" /><path d="M-16-8q16-14 32 0l-2 8h-28Z" fill="#688c68" /><path d="m-17-8 6-13 11 9 11-9 6 13" fill="#6a906a" stroke="#51784f" strokeWidth="1.5" /><circle cx="-8" cy="14" r="2" fill="#78582e" /><circle cx="8" cy="14" r="2" fill="#78582e" /><path d="M-4 24q4 4 8 0" stroke="#9c713d" fill="none" strokeWidth="1.5" /><ellipse cx="-14" cy="21" rx="4" ry="2" fill="#d98d6b" /><ellipse cx="14" cy="21" rx="4" ry="2" fill="#d98d6b" /></g>}
            {!count&&!view.quan[i]&&<ellipse cx="50" cy={quan?115:52} rx="16" ry="9" fill="none" stroke="#aa92694a" strokeDasharray="2 4" />}
          </svg>
          {quan&&<span className="quan-pit-title">QUAN</span>}
          <span className="quan-count">{view.quan[i]?<><b>1</b><small>quan</small>{count>0&&<em>+{count}</em>}</>:<b>{count}</b>}</span>
        </button>;
      })}
    </div>
    <div className="quan-row-caption bottom"><span>HÀNG DƯỚI</span><span>①</span><span>②</span><span>③</span><span>④</span><span>⑤</span><i /></div>
    <p className="quan-board-key"><span><i /> Ô sáng là ô có thể chọn</span><span>1 dân = 1 điểm <b>·</b> 1 quan = 10 điểm</span></p>
  </BoardSurface>;
}
