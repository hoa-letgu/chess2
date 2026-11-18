import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { QuanBeat } from './quan-replay';
export function useQuanEffects(root:RefObject<HTMLDivElement|null>,beat:QuanBeat|null,sound:boolean){
 const audio=useRef<AudioContext|null>(null);
 const unlock=()=>{if(!sound)return;try{audio.current??=new AudioContext();void audio.current.resume();}catch{/* Optional audio. */}};
 useLayoutEffect(()=>()=>{void audio.current?.close();},[]);
 useLayoutEffect(()=>{
  const host=root.current;if(!host||!beat||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const nodes:Element[]=[],animations:Animation[]=[];
  const rect=host.getBoundingClientRect();
  const point=(selector:string)=>{const el=host.querySelector(selector),r=el?.getBoundingClientRect();return r?[r.left+r.width/2-rect.left,r.top+r.height/2-rect.top]:[rect.width/2,rect.height/2];};
  const source=point(beat.from===null?'[data-quan-hand]':`[data-quan-pit="${beat.from}"]`);
  const destination=point(beat.kind==='capture'||beat.kind==='quan'?`[data-quan-vault="${beat.actor}"]`:beat.kind==='pickup'?'[data-quan-hand]':`[data-quan-pit="${beat.to}"]`);
  const play=(node:Element,frames:Keyframe[],delay=0,duration=beat.duration-delay)=>{animations.push(node.animate(frames,{duration,delay,fill:'both',easing:'ease-in-out'}));};
  const fly=(quan:boolean,index:number,count:number)=>{
   const node=document.createElement('span');node.className=`quan-flying-pebble ${quan?'is-quan-token':''}`;node.setAttribute('aria-hidden','true');
   if(quan){const art=host.querySelector(`[data-quan-pit="${beat.from}"] [data-quan-token]`);if(art){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-30 -35 60 90');const token=art.cloneNode(true) as Element;token.removeAttribute('transform');svg.appendChild(token);node.appendChild(svg);}}
   host.appendChild(node);nodes.push(node);
   const spread=beat.kind==='sow'?0:Math.min(20,count*2),angle=index*2.39996;
   const sx=source[0]+Math.cos(angle)*spread,sy=source[1]+Math.sin(angle)*spread,dx=destination[0]-sx,dy=destination[1]-sy;
   Object.assign(node.style,{left:`${sx}px`,top:`${sy}px`});
   const delay=beat.kind==='sow'?0:index*Math.min(15,beat.duration*.2/Math.max(count,1));
   play(node,Array.from({length:17},(_,j)=>{const t=j/16;return {offset:t,opacity:beat.kind==='pickup'?1-t*.4:1,transform:`translate(calc(-50% + ${dx*t}px),calc(-50% + ${dy*t-Math.sin(Math.PI*t)*(quan?48:beat.kind==='sow'?23:35)-(beat.kind==='sow'&&t>.8?Math.sin((t-.8)*Math.PI*5)*3:0)}px)) rotate(${quan?25*Math.sin(Math.PI*t):0}deg) scale(${beat.kind==='pickup'?1-t*.35:1})`};}),delay);
  };
  if(['pickup','capture','quan','sow'].includes(beat.kind)){
   const count=beat.kind==='sow'?1:Math.min(beat.count,24);
   for(let i=0;i<count;i++)fly(false,i,count);
   if(beat.kind==='quan')fly(true,count,count+1);
   if(beat.kind!=='sow'&&beat.from!==null){const pit=host.querySelector(`[data-quan-pit="${beat.from}"]`);if(pit){play(pit,[{filter:'brightness(1)'},{filter:'brightness(1.2)',offset:.2},{filter:'brightness(1)'}]);for(const token of pit.querySelectorAll('[data-quan-pebble],[data-quan-token]'))play(token,[{opacity:1},{opacity:0,offset:.2},{opacity:0}]);}}
  }
  if(beat.kind==='quan'){
   const ring=document.createElement('span');ring.className='quan-golden-wave';Object.assign(ring.style,{left:`${source[0]}px`,top:`${source[1]}px`});host.appendChild(ring);nodes.push(ring);play(ring,[{opacity:.9,transform:'translate(-50%,-50%) scale(.3)'},{opacity:0,transform:'translate(-50%,-50%) scale(2.2)'}]);
   for(let i=0;i<8;i++){const spark=document.createElement('span');spark.className='quan-gold-spark';Object.assign(spark.style,{left:`${source[0]}px`,top:`${source[1]}px`});host.appendChild(spark);nodes.push(spark);const angle=i*Math.PI/4;play(spark,[{opacity:1,transform:'translate(0,0)'},{opacity:0,transform:`translate(${Math.cos(angle)*55}px,${Math.sin(angle)*55}px)`}]);}
  }
  if(beat.points>0){const text=document.createElement('span');text.className='quan-points-fly';text.textContent=`+${beat.points}`;Object.assign(text.style,{left:`${destination[0]}px`,top:`${destination[1]}px`});host.appendChild(text);nodes.push(text);play(text,[{opacity:0,transform:'translate(-50%,0)'},{opacity:1,offset:.5},{opacity:0,transform:'translate(-50%,-35px)'}],beat.duration*.65);}
  if(sound&&audio.current?.state==='running'&&['sow','quan','capture'].includes(beat.kind)){
   const ctx=audio.current,o=ctx.createOscillator(),g=ctx.createGain(),drum=beat.kind==='quan';o.type=drum?'sine':'triangle';o.frequency.setValueAtTime(drum?150:750,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(drum?50:220,ctx.currentTime+(drum?.22:.04));g.gain.setValueAtTime(drum?.12:.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+(drum?.35:.07));o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+(drum?.4:.08));
  }
  return()=>{animations.forEach(a=>a.cancel());nodes.forEach(n=>n.remove());};
 },[root,beat,sound]);
 return unlock;
}
