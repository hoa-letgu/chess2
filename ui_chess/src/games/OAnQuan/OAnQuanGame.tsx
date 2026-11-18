import { useQuanReplay } from './useQuanReplay';
import { MatchHeader } from '@/features/arena/MatchSurface';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bot, ChevronRight, CircleHelp, Leaf, Lightbulb, Pause, Play, RotateCcw, Sprout, Trophy, Undo2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { chooseQuanMove, legalPits, newQuanGame, pitLabel, playQuan } from './engine';
import type { Direction, QuanState } from './engine';
import QuanBoard from './QuanBoard';
import { Buffalo, VillageLandscape } from './QuanArt';
import './quan.css';

type Options={mode:'bot'|'local';difficulty:'easy'|'smart';protectYoung:boolean};
const defaults:Options={mode:'bot',difficulty:'smart',protectYoung:false};
export default function OAnQuanGame({onExit}:{onExit:()=>void}) {
  const [state,setState]=useState(()=>newQuanGame()),[selected,setSelected]=useState<number|null>(null);
  const [options,setOptions]=useState<Options>(defaults),[draft,setDraft]=useState<Options>(defaults),[settings,setSettings]=useState(false),[rules,setRules]=useState(false),[exit,setExit]=useState(false);
  const [paused,setPaused]=useState(false),[fast,setFast]=useState(false),[hint,setHint]=useState(''),[undoCount,setUndoCount]=useState(0);
  const timer=useRef<number|null>(null),locked=useRef(false),history=useRef<QuanState[]>([]);
  const {frame,beat,busy}=useQuanReplay(state,fast);
  const [resultReady,setResultReady]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setResultReady(state.finished&&!busy),state.finished&&!busy?1400:0);return()=>clearTimeout(timer);},[state.finished,busy]);
  const botTurn=options.mode==='bot'&&state.turn===1;
  const names=options.mode==='bot'?['Bạn','Bé Trâu']:['Bạn Lá','Bạn Sen'];
  const stop=useCallback(()=>{if(timer.current!==null)window.clearTimeout(timer.current);timer.current=null;locked.current=false;},[]);
  useEffect(()=>()=>stop(),[stop]);
  const play=useCallback((pit:number,direction:Direction)=>{
    if(locked.current||busy||paused||state.finished)return;
    locked.current=true;setHint('');setSelected(null);
    if(options.mode==='local'||state.turn===0){history.current.push(structuredClone(state));setUndoCount(history.current.length);}
    const result=playQuan(state,pit,direction);
    setState(result.state);locked.current=false;
  },[state,paused,options.mode,busy]);
  useEffect(()=>{
    if(!botTurn||busy||paused||state.finished||settings||rules||exit)return;
    const id=window.setTimeout(()=>{const move=chooseQuanMove(state,options.difficulty);if(move)play(move.pit,move.direction);},850);
    return()=>window.clearTimeout(id);
  },[botTurn,busy,paused,state,settings,rules,exit,options.difficulty,play]);
  const allowed=!busy&&!botTurn&&!paused&&!state.finished;
  function select(pit:number){if(allowed&&legalPits(state).includes(pit)){setSelected(pit);setHint('');}}
  function openSettings(){setDraft({...options});setSettings(true);}
  function restart(){stop();history.current=[];setUndoCount(0);setOptions({...draft});setState(newQuanGame(draft.protectYoung));setSelected(null);setPaused(false);setHint('');setSettings(false);}
  function undo(){if(busy||!history.current.length)return;const previous=history.current.pop()!;setState(previous);setSelected(null);setHint('');setUndoCount(history.current.length);}
  function suggest(){if(!allowed)return;const move=chooseQuanMove(state);if(move){setSelected(move.pit);const left=state.turn===0?-1:1;setHint(`Thử ${pitLabel(move.pit)} và rải sang ${move.direction===left?'trái':'phải'} nhé!`);}}
  const left=(state.turn===0?-1:1) as Direction;
  const message=frame?.text??(state.finished?'Ván đã khép lại. Cùng đếm thành quả nhé!':paused?'Nghỉ tay một chút, ván đang tạm dừng.':botTurn?'Bé Trâu đang đếm sỏi, bạn chờ chút nhé…':selected!==null?`Đã chọn ${pitLabel(selected)} · chọn hướng rải bên dưới.`:'Chạm một ô dân ở phía mình để bắt đầu nhé!');
  return <div className="quan-game">
    <MatchHeader className="quan-header"><button onClick={()=>{if(state.moves&&!state.finished)setExit(true);else onExit();}}><ArrowLeft size={16}/><span>Sảnh game</span></button><div className="quan-brand"><span><Sprout size={21}/></span><strong>LÀNG QUÊ</strong><small>TRÒ CHƠI VIỆT</small></div><div className="quan-header-right"><span>CHƠI MIỄN PHÍ</span><button onClick={()=>setRules(true)} aria-label="Hướng dẫn chơi ô ăn quan"><CircleHelp size={19}/></button></div></MatchHeader>
    <main className="quan-layout"><section className="quan-play-column">
      <div className="quan-title"><div><p><Leaf size={13}/> MỘT CHÚT TUỔI THƠ VIỆT NAM</p><h1>Ô ăn quan<span>Một vòng sỏi, cả trời thương.</span></h1></div><button className="quan-new" onClick={openSettings}><RotateCcw size={14}/>Ván mới</button></div>
      <div className="quan-stage">
        <div className="quan-village-banner"><VillageLandscape/><span className="quan-village-tag"><Sprout size={12}/> Chơi vui dưới bóng tre</span></div>
        <div className={`quan-opponent ${state.turn===1?'is-turn':''}`}><span className="quan-mini-avatar"><Buffalo/></span><div><strong>{names[1]}</strong><small>{botTurn?'Đến lượt Bé Trâu':options.mode==='bot'?'Người bạn cùng làng':'Ngồi phía trên bàn'}</small></div></div>
        <div className="quan-board-wrap"><QuanBoard state={state} frame={frame} beat={beat} busy={busy} selected={selected} disabled={!allowed} onSelect={select}/></div>
        <div className={`quan-you ${state.turn===0?'is-turn':''}`}><span className="quan-human-avatar"><Leaf size={23}/></span><div><strong>{names[0]}</strong><small>{state.turn===0?'Đang đến lượt':'Chờ người bạn bên kia'}</small></div><span className="quan-player-tag">PHÍA DƯỚI</span></div>
        <div className="quan-guidance" role="status"><span><Sprout size={19}/></span><p>{message}</p>{frame&&frame.hand>0&&<b>Trong tay: {frame.hand} dân</b>}</div>
      </div>
      <div className="quan-controls"><button className="quan-subtle" disabled={busy||!undoCount} onClick={undo}><Undo2 size={14}/>Đi lại</button><button className="quan-subtle" disabled={busy||state.finished} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'Chơi tiếp':'Tạm dừng'}</button><label><input type="checkbox" checked={fast} onChange={e=>setFast(e.target.checked)} disabled={busy}/>Rải nhanh</label><span>Lượt {state.moves+1}</span></div>
    </section>
    <aside className="quan-sidebar"><section className="quan-friend-card"><div className="quan-friend-heading"><span>BẠN CHƠI CÙNG LÀNG</span><i>✿</i></div><Buffalo happy={selected!==null||state.finished}/><h2>Chào bạn, mình là Bé Trâu!</h2><p>Nhặt từng hòn sỏi, tính từng nước đi.<br/>Cùng mình chơi một ván thật vui nhé.</p><span className="quan-mode-badge">{options.mode==='bot'?<Bot size={12}/>:<Users size={12}/>} {options.mode==='bot'?'Chơi cùng Bé Trâu':'Hai người cùng thiết bị'}</span></section>
      <section className="quan-action-card"><div className="quan-section-heading"><h2>{state.finished?'Cùng đếm điểm nhé':busy?'Đang rải quân':botTurn?'Bé Trâu đang nghĩ':paused?'Nghỉ tay một chút':selected===null?'Đến lượt bạn chọn ô':'Bạn muốn rải hướng nào?'}</h2><span>✦</span></div><p>{selected===null?'Chọn một ô có dân ở phía mình, rồi chọn sang trái hoặc phải.':`${pitLabel(selected)} có ${state.pits[selected]} dân. Nhặt cả ô rồi rải mỗi nơi một hòn.`}</p><div className="quan-direction-buttons"><button disabled={!allowed||selected===null} onClick={()=>{if(selected!==null)play(selected,left);}}><ArrowLeft size={20}/><strong>Sang trái</strong></button><button disabled={!allowed||selected===null} onClick={()=>{if(selected!==null)play(selected,left===1?-1:1);}}><ArrowRight size={20}/><strong>Sang phải</strong></button></div><button className="quan-hint" disabled={!allowed} onClick={suggest}><Lightbulb size={14}/>Bé Trâu mách nhỏ</button>{hint&&<p className="quan-hint-message" role="status">{hint}</p>}</section>
      <section className="quan-story-card"><div className="quan-section-heading"><h2>Chuyện trên bàn sỏi</h2><span>✿</span></div><ol aria-live="polite">{state.log.slice(0,4).map((line,i)=><li key={`${state.moves}-${i}-${line}`}><span/>{line}</li>)}</ol><button onClick={()=>setRules(true)}><BookOpen size={13}/>Xem cách chơi<ChevronRight size={13}/></button></section>
    </aside></main>
    <footer className="quan-footer"><span>Thêm một ván, thêm một kỷ niệm.</span><span>Ô ăn quan · Một nét văn hóa Việt</span></footer>
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="quan-dialog"><DialogTitle>Mình chơi một ván mới nhé?</DialogTitle><DialogDescription>Chọn bạn chơi và luật phù hợp. Ván hiện tại sẽ được đặt lại khi bắt đầu.</DialogDescription><div className="quan-mode-choices"><button className={draft.mode==='bot'?'selected':''} onClick={()=>setDraft({...draft,mode:'bot'})}><Bot size={22}/><strong>Chơi với Bé Trâu</strong><small>Máy tính làm bạn đồng hành</small></button><button className={draft.mode==='local'?'selected':''} onClick={()=>setDraft({...draft,mode:'local'})}><Users size={22}/><strong>Hai người cùng chơi</strong><small>Trên cùng một thiết bị</small></button></div>{draft.mode==='bot'&&<label className="quan-setting-label">Bé Trâu chơi<select value={draft.difficulty} onChange={e=>setDraft({...draft,difficulty:e.target.value as Options['difficulty']})}><option value="easy">Nhẹ nhàng</option><option value="smart">Khéo tính</option></select></label>}<label className="quan-checkbox-label"><input type="checkbox" checked={draft.protectYoung} onChange={e=>setDraft({...draft,protectYoung:e.target.checked})}/>Luật quan non: cần 5 dân trong ô quan mới được ăn</label><button className="quan-primary" onClick={restart}>Bắt đầu ván mới<Sprout size={17}/></button></DialogContent></Dialog>
    <Dialog open={rules} onOpenChange={setRules}><DialogContent className="quan-dialog"><DialogTitle>Cách chơi ô ăn quan</DialogTitle><DialogDescription>Biến thể thân thiện: 50 dân, 2 quan. Dân 1 điểm, quan 10 điểm.</DialogDescription><ol className="quan-rules"><li>Chọn một trong 5 ô dân có quân ở phía mình, rồi chọn hướng trái hoặc phải. Nhặt hết dân trong ô và rải lần lượt mỗi ô 1 dân, kể cả ô quan.</li><li>Hết quân trong tay, nếu ô kế tiếp là ô dân có quân thì nhặt ô đó và tiếp tục rải. Gặp ô quan có quân thì dừng lượt, không nhặt quan để rải.</li><li>Nếu ô kế tiếp trống, ô sau đó có quân thì ăn hết ô sau. Tiếp tục ăn nếu vẫn có một ô trống xen giữa.</li><li>{state.protectYoung?'Đang bật luật quan non: ô quan cần ít nhất 5 dân mới được ăn.':'Không áp dụng quan non: có thể ăn quan khi tạo được thế ăn hợp lệ.'}</li><li>Đến lượt mà cả 5 ô bên mình hết dân, tự rải lại mỗi ô 1 dân và trừ 5 điểm; điểm có thể âm do ghi nợ tạm.</li><li>Khi hết cả hai quan, thu dân còn lại ở phía mình để tính điểm. Dân còn trong ô quan đã mất quan thuộc người ăn quan cuối. Ai nhiều điểm hơn thắng.</li><li>Ván kéo dài tới 300 lượt sẽ so điểm đã ăn. Game miễn phí tại chỗ, không sử dụng ví xu.</li></ol></DialogContent></Dialog>
    <Dialog open={state.finished&&!busy&&resultReady&&!settings} onOpenChange={open=>{if(!open)openSettings();}}><DialogContent className="quan-dialog quan-result"><Buffalo happy/><span className="quan-result-flower">✿</span><DialogTitle>{state.winner===-1?'Hai bạn hòa nhau rồi!':`${names[state.winner??0]} thắng rồi!`}</DialogTitle><DialogDescription>{state.reason}</DialogDescription><div className="quan-final-scores"><span>{names[0]}<b>{state.scores[0]}</b></span><Trophy size={27}/><span>{names[1]}<b>{state.scores[1]}</b></span></div><button className="quan-primary" onClick={openSettings}>Chơi thêm một ván<Sprout size={16}/></button></DialogContent></Dialog>
    <Dialog open={exit} onOpenChange={setExit}><DialogContent className="quan-dialog"><DialogTitle>Hẹn lại dưới bóng tre nhé?</DialogTitle><DialogDescription>Rời sảnh sẽ kết thúc ván hiện tại.</DialogDescription><button className="quan-primary" onClick={onExit}>Trở về sảnh</button><button className="quan-hint" onClick={()=>setExit(false)}>Ở lại chơi tiếp</button></DialogContent></Dialog>
  </div>;
}

