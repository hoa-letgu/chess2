import { useLayoutEffect, useRef } from 'react';
import './xiangqi-motion.css';

import { confirmedXiangqiMove, xiangqiDuration } from './xiangqi-motion-model';
import type { MotionToken as Token } from './xiangqi-motion-model';

// Only animate a confirmed single move. Snapshots, undo and reconnects never invent motion.
export function useXiangqiMotion(tokens: Token[], move: { from: number; to: number } | null, flip: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const prior = useRef<{ tokens: Token[]; faces: (HTMLElement | null)[]; flip: boolean } | null>(null);
  const signature = JSON.stringify(tokens);
  const from = move?.from, to = move?.to;
  useLayoutEffect(() => {
    const host = stage.current;
    if (!host) return;
    const current: Token[] = JSON.parse(signature);
    const old = prior.current;
    const face = (i: number) => host.querySelector<HTMLElement>(`[data-xq-cell="${i}"] .imperial-xiangqi-piece, [data-xq-cell="${i}"] .up-disc`);
    prior.current = { tokens: current, flip, faces: current.map((_, i) => face(i)?.cloneNode(true) as HTMLElement ?? null) };
    if (!old || old.flip !== flip || from === undefined || to === undefined || !confirmedXiangqiMove(old.tokens,current,from,to) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const landed = face(to), source = old.faces[from];
    if (!landed || !source) return;
    const kind = old.tokens[from]!.kind, capture = !!old.tokens[to], duration = xiangqiDuration(kind, capture);
    const w = host.clientWidth / 9, h = host.clientHeight / 10;
    const point = (i: number) => { const d = flip ? 89-i : i; return [(d%9+.5)*w, (Math.floor(d/9)+.5)*h]; };
    const [sx,sy] = point(from), [tx,ty] = point(to), dx=tx-sx, dy=ty-sy;
    const nodes: HTMLElement[] = [], animations: Animation[] = [];
    const layer = (i: number, cls: string) => {
      const [x,y]=point(i), node=document.createElement('span'); node.className=cls;
      Object.assign(node.style,{left:`${x-w/2}px`,top:`${y-h/2}px`,width:`${w}px`,height:`${h}px`});
      node.setAttribute('aria-hidden','true');host.appendChild(node);nodes.push(node);return node;
    };
    const play = (node: HTMLElement, frames: Keyframe[], ms: number, delay=0) => {
      const a=node.animate(frames,{duration:ms,delay,fill:'both',easing:'linear'});animations.push(a);return a;
    };
    const mover=layer(from,'xq-motion-layer xq-mover');mover.dataset.motionKind=kind;mover.dataset.capture=String(capture);mover.appendChild(source);
    Object.assign(source.style,{width:'84%',height:'84%',margin:'0',animation:'none',transform:'none'});
    const shadow=layer(from,'xq-motion-layer xq-flight-shadow');
    const height=kind==='H'?.85:kind==='C'&&capture?.95:kind==='E'?.25:kind==='G'?.12:kind==='S'?.13:.025;
    const frames=Array.from({length:41},(_,i)=>{
      const t=i/40, u=t*t*(3-2*t), arc=Math.sin(Math.PI*t);
      const rotation=kind==='H'?360*t:kind==='A'?45*Math.sin(Math.PI*t):kind==='S'?6*arc:0;
      const brake=kind==='R'&&t>.8?Math.sin((t-.8)*Math.PI*10)*(1-t)*w*.18:0;
      return {offset:t,transform:`translate(${dx*u+Math.sign(dx)*brake}px,${dy*u-height*h*arc+Math.sign(dy)*brake}px) rotate(${rotation}deg) scale(${1+arc*(kind==='H'?.12:.035)})`};
    });
    play(mover,frames,duration).onfinish=()=>mover.remove();
    play(shadow,[{transform:'translate(0,0) scale(.7)',opacity:.3},{offset:.5,transform:`translate(${dx/2}px,${dy/2}px) scale(.45)`,opacity:.12},{transform:`translate(${dx}px,${dy}px) scale(.7)`,opacity:.3}],duration);
    const conceal=play(landed,[{opacity:0},{opacity:0}],duration);
    conceal.onfinish=()=>{conceal.cancel();shadow.remove();};
    if(capture&&old.faces[to]){const victim=layer(to,'xq-motion-layer');victim.appendChild(old.faces[to]!);play(victim,[{opacity:1},{opacity:1,offset:.8},{opacity:0,transform:'scale(.6)'}],duration);}
    const gold=kind==='G'||kind==='A', fire=kind==='C'&&capture;
    const impact=layer(to,`xq-motion-layer xq-impact ${gold?'xq-gold':fire?'xq-fire':'xq-dust'}`);
    play(impact,[{opacity:0,transform:'scale(.3)'},{opacity:.8,offset:.2},{opacity:0,transform:'scale(1.6)'}],260,duration-60);
    if(kind==='E')play(landed,[{transform:'translateY(0)'},{transform:'translateY(2px)'},{transform:'translateY(-1px)'},{transform:'translateY(0)'}],150,duration);
    if(['R','A','C'].includes(kind)||(kind==='S'&&dx!==0)){
      for(let j=0;j<5;j++){const trail=layer(from,`xq-motion-layer xq-trail ${fire?'xq-fire':gold?'xq-gold':''}`);
        play(trail,frames.map((f,i)=>({...f,opacity:Math.sin(Math.PI*i/40)*.25,transform:f.transform+' scale(.55)'})),duration,j*18);}
    }
    const blockClick=(event: Event)=>{event.preventDefault();event.stopPropagation();};
    host.addEventListener('click',blockClick,true);
    const unlock=window.setTimeout(()=>host.removeEventListener('click',blockClick,true),duration);
    const cleanup=()=>{clearTimeout(unlock);host.removeEventListener('click',blockClick,true);animations.forEach(a=>a.cancel());nodes.forEach(n=>n.remove());};
    const timer=window.setTimeout(cleanup,duration+280);
    return ()=>{clearTimeout(timer);cleanup();};
  },[signature,from,to,flip]);
  return stage;
}
