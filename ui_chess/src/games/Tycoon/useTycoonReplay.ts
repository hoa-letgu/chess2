import { useLayoutEffect,useRef,useState } from 'react';
import type { EmpireState } from './engine';
import { tycoonBeats } from './tycoon-motion';
import type { TycoonBeat } from './tycoon-motion';
export function useTycoonReplay(state:EmpireState){
 const previous=useRef(state),[beat,setBeat]=useState<TycoonBeat|null>(null);
 const signature=JSON.stringify(state);
 useLayoutEffect(()=>{
  const next:EmpireState=JSON.parse(signature),before=previous.current;previous.current=next;
  const beats=tycoonBeats(before,next);
  if(!beats.length||matchMedia('(prefers-reduced-motion: reduce)').matches){setBeat(null);return;}
  let index=0,timer:ReturnType<typeof setTimeout>;
  const advance=()=>{const b=beats[index++];setBeat(b??null);if(b)timer=setTimeout(advance,b.duration);};
  advance();return()=>clearTimeout(timer);
 },[signature]);
 const pending=(previous.current.revision??0)!==(state.revision??0);
 return {display:beat?.state??(pending?previous.current:state),beat,busy:!!beat||pending};
}
