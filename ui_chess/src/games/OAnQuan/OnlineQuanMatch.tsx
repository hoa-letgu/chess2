import { useState } from 'react';
import QuanBoard from './QuanBoard';
import { useQuanReplay } from './useQuanReplay';
import type { QuanState } from './engine';
export default function OnlineQuanMatch({state,canMove,send}:{state:QuanState;canMove:boolean;send:(action:Record<string,unknown>)=>void}){
 const [selected,setSelected]=useState<number|null>(null),[fast,setFast]=useState(false);
 const {frame,beat,busy}=useQuanReplay(state,fast);
 const sow=(direction:number)=>{if(!canMove||busy||selected===null)return;send({op:'sow',pit:selected,direction});setSelected(null);};
 return <div><QuanBoard state={state} frame={frame} beat={beat} busy={busy} selected={selected} disabled={!canMove||busy} onSelect={setSelected}/><p role="status">{frame?.text??(state.finished?'Ván đã kết thúc.':canMove?'Chọn ô dân của mình và hướng rải.':'Chờ người bạn bên kia.')}</p><div className="quan-motion-tools"><button disabled={!canMove||busy||selected===null} onClick={()=>sow(-1)}>Rải sang trái</button><button disabled={!canMove||busy||selected===null} onClick={()=>sow(1)}>Rải sang phải</button><label><input type="checkbox" disabled={busy} checked={fast} onChange={e=>setFast(e.target.checked)}/>Rải nhanh</label></div></div>;
}
