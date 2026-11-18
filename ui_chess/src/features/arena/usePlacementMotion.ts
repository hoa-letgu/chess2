import { useLayoutEffect, useRef } from 'react';
import { placementDelta } from './placement-model';
import type { Grid } from './placement-model';
import './placement-effects.css';
export function usePlacementMotion(board:Grid,enabled:boolean,sound:boolean){
 const host=useRef<HTMLDivElement>(null),previous=useRef<Grid|null>(null),audio=useRef<AudioContext|null>(null);
 const signature=JSON.stringify(board);
 const unlockSound=()=>{if(!sound)return;try{audio.current??=new AudioContext();void audio.current.resume();}catch{/* Sound is optional. */}};
 useLayoutEffect(()=>()=>{void audio.current?.close();},[]);
 useLayoutEffect(()=>{
  const next:Grid=JSON.parse(signature),before=previous.current;previous.current=next;
  if(!enabled||!host.current)return;
  const delta=placementDelta(before,next);if(!delta||!before)return;
  const root=host.current,animations:Animation[]=[],ghosts:HTMLElement[]=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cell=(r:number,c:number)=>root.querySelector<HTMLElement>(`[data-placement-cell="${r}-${c}"]`);
  const [r,c]=delta.to,arrival=cell(r,c);
  arrival?.classList.add('placement-new');
  if(sound&&audio.current?.state==='running'){
   const ctx=audio.current,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(850,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(180,ctx.currentTime+.045);gain.gain.setValueAtTime(.065,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.07);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.08);
  }
  if(!reduced)for(const [rr,cc]of delta.removed){const target=cell(rr,cc);if(!target)continue;const ghost=document.createElement('span');ghost.className=`imperial-stone stone-${before[rr][cc]} placement-captured`;ghost.setAttribute('aria-hidden','true');target.appendChild(ghost);ghosts.push(ghost);animations.push(ghost.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.85)'}],{duration:420,fill:'forwards'}));
   if(delta.removed.length>1){const spark=document.createElement('span');spark.className='zen-capture-spark';target.appendChild(spark);ghosts.push(spark);}
  }
  const cleanup=()=>{arrival?.classList.remove('placement-new');animations.forEach(a=>a.cancel());ghosts.forEach(n=>n.remove());};
  const timer=setTimeout(cleanup,750);return()=>{clearTimeout(timer);cleanup();};
 },[signature,enabled,sound]);
 return {host,unlockSound};
}
