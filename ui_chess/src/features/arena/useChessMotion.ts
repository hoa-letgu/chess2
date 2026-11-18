import { useLayoutEffect, useRef } from 'react';
import { PIECE_IMG, isPieceKey } from '@/games/chess/utils/pieces';

const durations: Record<string, number> = { p: 260, k: 410, q: 500, r: 360, b: 390, n: 680 };
const isWhite = (piece: string) => piece === piece.toUpperCase();
type Travel = { from: number; to: number; victim?: number };

function readMoves(before: string, after: string): Travel[] {
  if (before.length !== 64 || after.length !== 64) return [];
  const changed = Array.from(after, (_, i) => i).filter(i => before[i] !== after[i]);
  const arrivals = changed.filter(i => after[i] !== '.');
  if (changed.length === 4 && arrivals.length === 2) {
    const moves = arrivals.map(to => ({to, from: changed.find(i => after[i] === '.' && before[i] === after[to]) ?? -1}));
    const king = moves.find(m => after[m.to].toLowerCase() === 'k');
    const rook = moves.find(m => after[m.to].toLowerCase() === 'r');
    return king && rook && moves.every(m => m.from >= 0) && Math.abs(king.from - king.to) === 2 ? moves : [];
  }
  if (changed.length > 3 || arrivals.length !== 1) return [];
  const to = arrivals[0];
  const from = changed.find(i => after[i] === '.' && isWhite(before[i]) === isWhite(after[to]));
  if (from === undefined) return [];
  const victim = changed.find(i => before[i] !== '.' && isWhite(before[i]) !== isWhite(after[to]));
  return [{from, to, victim}];
}

export function useChessMotion(position: string, flipped: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const previous = useRef('');
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = position;
    const host = stage.current;
    const moves = readMoves(before, position);
    if (!host || !moves.length) return;

    const cell = host.clientWidth / 8;
    const point = (i: number) => {
      const display = flipped ? 63 - i : i;
      return [display % 8 * cell, Math.floor(display / 8) * cell];
    };
    const animations: Animation[] = [];
    const layers: HTMLElement[] = [];
    function layer(index: number, z: number, size: number, piece?: string) {
      const [x, y] = point(index);
      const node = piece && isPieceKey(piece) ? new Image() : document.createElement('span');
      if (node instanceof HTMLImageElement && isPieceKey(piece)) {
        node.src = '/' + PIECE_IMG[piece].replace(/^\/+/, '');
      }
      Object.assign(node.style, {position:'absolute', pointerEvents:'none', objectFit:'contain', boxSizing:'border-box',
        width:size*cell+'px', height:size*cell+'px', left:x+(1-size)*cell/2+'px', top:y+(1-size)*cell/2+'px', zIndex:String(z)});
      node.setAttribute('aria-hidden','true');
      host!.appendChild(node);
      layers.push(node);
      return node;
    }
    function play(node: HTMLElement, frames: Keyframe[], duration: number, delay = 0, remove = true) {
      const animation = node.animate(frames, {duration, delay, fill:'both', easing:'linear'});
      animation.onfinish = () => { if (remove) node.remove(); animation.cancel(); };
      animations.push(animation);
    }
    function halo(to: number, color: string, duration: number, delay: number) {
      const ring = layer(to, 245, .85);
      Object.assign(ring.style, {border:'2px solid '+color, borderRadius:'50%', boxShadow:'0 0 9px '+color});
      play(ring, [{opacity:0,transform:'scale(.35)'},{opacity:.85,offset:.2},{opacity:0,transform:'scale(1.2)'}], duration, delay);
    }
    for (const {from,to,victim} of moves) {
      const piece=before[from], kind=piece.toLowerCase(), duration=durations[kind];
      const landed=host.querySelector<HTMLElement>(`[data-chess-cell="${to}"] img`);
      if (!landed || !duration) continue;
      const [sx,sy]=point(from), [tx,ty]=point(to);
      const dx=tx-sx, dy=ty-sy, direction=dx>=0?1:-1;
      const promotion=kind==='p' && position[to]!==piece;
      const mover=layer(from,250,.8,piece);
      const travel=(t:number) => t*t*(3-2*t);
      const frames=Array.from({length:33},(_,i)=>{
        const t=i/32, arc=Math.sin(Math.PI*t), u=travel(t);
        let x=dx*u, y=dy*u, rotation=0, scale=1, opacity=1;
        if(kind==='n'){ y-=cell*.83*arc; rotation=direction*360*t; scale+=.14*arc; }
        if(kind==='p'){ y-=cell*.09*arc; rotation=(dx?direction:Math.sign(dy))*arc*(dx?13:5); scale+=.06*arc; }
        if(kind==='k') y-=cell*.13*arc;
        if(kind==='q') opacity=1-.97*Math.min(1,arc*1.6);
        if(kind==='r' && t>.75){const jolt=Math.sin((t-.75)*Math.PI*12)*(1-t)*.16; x+=Math.sign(dx)*cell*jolt; y+=Math.sign(dy)*cell*jolt;}
        if(promotion && t>.7) opacity=(1-t)/.3;
        return {offset:t,opacity,transform:`translate(${x}px,${y}px) rotate(${rotation}deg) scale(${scale})`,
          filter:promotion?`drop-shadow(0 0 ${t*t*12}px gold)`:'none'};
      });
      play(mover,frames,duration);
      play(landed,promotion?[{opacity:0},{opacity:0,offset:.7},{opacity:1,filter:'brightness(1.35)'}]:[{opacity:0},{opacity:0}],duration,0,false);
      if(victim!==undefined) play(layer(victim,240,.8,before[victim]),[{opacity:1,transform:'scale(1)'},{opacity:.8,transform:'scale(.6)',offset:.55},{opacity:0,transform:'scale(.02)'}],380,Math.round(duration*.42));
      if(kind==='k'||kind==='r'||kind==='q'||promotion) halo(to,kind==='q'?'#d6a2ff':'#ffe39a',duration*.28,duration*.72);
      if(kind==='q'||kind==='b'){
        const queen=kind==='q', count=queen?14:8;
        for(let j=0;j<count;j++){
          const spark=layer(from,246,queen?.055:.09), angle=j*2.4;
          Object.assign(spark.style,{borderRadius:'50%',background:queen?'#e6c9ff':'#c5faff',boxShadow:'0 0 8px currentColor',color:queen?'#bd83ff':'#79d8ec'});
          const path=Array.from({length:17},(_,i)=>{
            const t=i/16;
            const u=queen?travel(t):travel(Math.max(0,t-j*.022));
            const spread=queen?Math.sin(Math.PI*t)*cell*.24:0;
            return {offset:t,opacity:Math.sin(Math.PI*t)*(queen?1:.6), transform:`translate(${dx*u+spread*Math.cos(angle)}px,${dy*u+spread*Math.sin(angle)}px) scale(${1-t*.65})`};
          });
          play(spark,path,duration);
        }
      }
    }
    return ()=>{animations.forEach(animation=>animation.cancel());layers.forEach(node=>node.remove());};
  },[position,flipped]);
  return stage;
}
