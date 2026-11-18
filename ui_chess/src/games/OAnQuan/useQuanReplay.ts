import { useLayoutEffect, useRef, useState } from 'react';
import type { Frame,QuanState } from './engine';
import { quanReplay } from './quan-replay';
import type { QuanBeat } from './quan-replay';
export function useQuanReplay(state:QuanState,fast=false){
 const previous=useRef(state),[presentation,setPresentation]=useState<{frame:Frame;beat:QuanBeat|null}|null>(null);
 const signature=JSON.stringify(state);
 useLayoutEffect(()=>{
  const next:QuanState=JSON.parse(signature),before=previous.current;previous.current=next;
  const beats=quanReplay(before,next);
  if(!beats.length||matchMedia('(prefers-reduced-motion: reduce)').matches){setPresentation(null);return;}
  let index=0,timer:ReturnType<typeof setTimeout>;
  const advance=()=>{
   if(index>=beats.length){setPresentation(null);return;}
   const original=beats[index++],beat={...original,duration:fast?Math.max(50,original.duration*.35):original.duration};
   setPresentation({frame:beat.before,beat});
   timer=setTimeout(()=>{setPresentation({frame:beat.after,beat:null});timer=setTimeout(advance,20);},beat.duration);
  };
  advance();return()=>clearTimeout(timer);
 },[signature,fast]);
 const pending=previous.current.moves!==state.moves;
 const held:Frame|null=pending?{pits:previous.current.pits,quan:previous.current.quan,scores:previous.current.scores,focus:null,hand:0,text:'Chuẩn bị bốc quân…'}:null;
 return {frame:presentation?.frame??held,beat:presentation?.beat??null,busy:presentation!==null||pending};
}
