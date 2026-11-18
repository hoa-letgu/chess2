import { useEffect, useMemo, useRef, useState } from 'react';
import { Wifi, ArrowLeft, ArrowLeftRight, BookOpen, ChevronRight, Crown, Lightbulb, RotateCcw, Shield, Star, Swords, Undo2 } from 'lucide-react';
import ArenaBoard from '@/features/arena/ArenaBoard';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PUZZLES, legalMoves, play, square } from './engine';
import type { Analysis, Board, Move, Pos, Puzzle } from './engine';
import PuzzleEditor from './PuzzleEditor';
import { asPuzzle, loadCustomPuzzles, saveCustomPuzzles } from './custom-puzzles';
import type { CustomPosition } from './engine';
import './cothe.css';

const STORAGE='board-arena-cothe-v1';
type Progress=Record<string,number>;
function loadProgress():Progress{try{const data=JSON.parse(localStorage.getItem(STORAGE)||'{}');return Object.fromEntries([...PUZZLES,...loadCustomPuzzles()].map(p=>[p.id,typeof data?.[p.id]==='number'?Math.max(0,Math.min(3,Math.floor(data[p.id]))):0]));}catch{return {};}}
const same=(a:Pos,b:Pos)=>a[0]===b[0]&&a[1]===b[1];
function Stars({value}:{value:number}){return <span className="ct-stars" aria-label={`${value} trên 3 sao`}>{[1,2,3].map(index=><Star size={13} key={index} fill={index<=value?'currentColor':'none'} className={index<=value?'earned':''}/>)}</span>;}

export default function CoTheGame({onExit,onOnline}:{onExit:()=>void;onOnline?:()=>void}){
  const [active,setActive]=useState(PUZZLES[0].id),[run,setRun]=useState(0),[progress,setProgress]=useState<Progress>(loadProgress),[library,setLibrary]=useState(false),[filter,setFilter]=useState('Tất cả'),[storageError,setStorageError]=useState('');
  const [custom,setCustom]=useState<Puzzle[]>(loadCustomPuzzles),[editing,setEditing]=useState<Puzzle|null>(null);
  const allPuzzles=[...PUZZLES,...custom];
  const puzzle=allPuzzles.find(item=>item.id===active)??PUZZLES[0];
  const openEditor=(source:Puzzle)=>{setLibrary(false);setEditing(source);};
  const savePosition=(position:CustomPosition,id?:string)=>{
    const saved=asPuzzle(position,id??`custom-${crypto.randomUUID()}`);
    const next=id?custom.map(item=>item.id===id?saved:item):[...custom,saved];
    saveCustomPuzzles(next);setCustom(next);
    const nextProgress={...progress};delete nextProgress[saved.id];setProgress(nextProgress);
    try{localStorage.setItem(STORAGE,JSON.stringify(nextProgress));}catch{setStorageError('Thế đã lưu; chưa lưu được thay đổi số sao.');}
    setEditing(null);setActive(saved.id);setRun(value=>value+1);setFilter('Thế của tôi');
  };
  const record=(stars:number)=>{const next={...progress,[active]:Math.max(progress[active]||0,stars)};setProgress(next);try{localStorage.setItem(STORAGE,JSON.stringify(next));}catch{setStorageError('Trình duyệt chưa cho lưu tiến độ. Bạn vẫn tiếp tục chơi được.');}};
  const choose=(id:string)=>{setActive(id);setRun(value=>value+1);setLibrary(false);};
  const libraryContent=<><div className="ct-library-heading"><BookOpen size={18}/><div><h2>Tàng kinh kỳ phổ</h2><p>{allPuzzles.filter(item=>progress[item.id]>0).length}/{allPuzzles.length} thế đã phá · {Object.values(progress).reduce((a,b)=>a+b,0)}/{allPuzzles.length*3} sao</p></div></div><div className="ct-filters">{['Tất cả','Thế của tôi','Nhập môn','Chiến thuật','Thử thách'].map(value=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}</div><div className="ct-puzzle-list">{allPuzzles.filter(item=>filter==='Tất cả'||(filter==='Thế của tôi'?item.id.startsWith('custom-'):item.level===filter)).map(item=><button key={item.id} className={active===item.id?'active':''} onClick={()=>choose(item.id)}><span className="ct-puzzle-number">{item.id.startsWith('custom-')?'私':String(PUZZLES.indexOf(item)+1).padStart(2,'0')}</span><span><strong>{item.title}</strong><small>{item.id.startsWith('custom-')?'Thế của tôi':item.level} · Chiếu bí trong {item.moves} nước</small><Stars value={progress[item.id]||0}/></span><ChevronRight size={15}/></button>)}</div></>;
  return <div className="cothe-page"><header className="ct-topbar"><button onClick={onExit}><ArrowLeft size={16}/> Sảnh game</button><div className="ct-brand"><span>勢</span><div><strong>THIÊN CƠ KỲ TRẬN</strong><small>CỜ THẾ · OFFLINE · NGỘ KỲ ĐỊNH CỤC</small></div></div><div className="ct-mode-links"><button onClick={()=>openEditor({...puzzle,id:"new"})}>Tạo thế</button>{onOnline&&<button onClick={onOnline}><Wifi size={15}/>Online</button>}<button className="ct-library-open" onClick={()=>setLibrary(true)}><BookOpen size={16}/> Chọn thế</button></div></header>
    <div className="ct-intro"><span className="ct-eyebrow">一 子 定 乾 坤 · MỘT NƯỚC ĐỊNH CÀN KHÔN</span><h1>Phá thế. Định giang sơn.</h1><p>Giữ tâm tĩnh trước thế hiểm. Tìm chuỗi chiếu quyết định giữa trùng vây.</p></div>
    {puzzle.id.startsWith("custom-")&&<div className="ct-custom-toolbar"><span>Thế của tôi · Lưu trên thiết bị</span><button onClick={()=>openEditor(puzzle)}>Sửa / chia sẻ thế này</button></div>}
    <main className="ct-layout"><Session key={`${active}:${run}`} puzzle={puzzle} best={progress[active]||0} onRestart={()=>setRun(value=>value+1)} onNext={()=>choose(allPuzzles[(allPuzzles.findIndex(p=>p.id===active)+1)%allPuzzles.length].id)} onSolved={record}/><aside className="ct-library">{libraryContent}<div className="ct-library-note"><Shield size={15}/><p>Phá thế miễn phí. Máy chỉ phòng thủ trên bàn hiện tại; mỗi lời giải được kiểm tra trước các nước giải chiếu.</p></div></aside></main>
    {storageError&&<p className="ct-storage-note" role="status">{storageError}</p>}<footer className="ct-footer">THIÊN CƠ KỲ TRẬN · {PUZZLES.length} thế có sẵn · {custom.length} thế của tôi · Chiếu liên tiếp để chiếu bí · Tiến độ lưu trên thiết bị</footer>
    {editing&&<PuzzleEditor source={editing} onClose={()=>setEditing(null)} onSave={savePosition}/>}
    <Dialog open={library} onOpenChange={setLibrary}><DialogContent className="ct-library-dialog"><DialogTitle>Chọn thế cờ</DialogTitle><DialogDescription>Từ khai môn đến liên hoàn sát cục. Mỗi thế đều có lời giải chiếu bí.</DialogDescription>{libraryContent}</DialogContent></Dialog>
  </div>;
}
type Snapshot={board:Board;used:number;last:Move|null};
function Session({puzzle,best,onRestart,onNext,onSolved}:{puzzle:Puzzle;best:number;onRestart:()=>void;onNext:()=>void;onSolved:(stars:number)=>void}){
  const [board,setBoard]=useState(puzzle.board),[selected,setSelected]=useState<Pos|null>(null),[last,setLast]=useState<Move|null>(null),[used,setUsed]=useState(0),[turn,setTurn]=useState<0|1>(0),[status,setStatus]=useState<'playing'|'won'|'failed'>('playing'),[busy,setBusy]=useState(false),[message,setMessage]=useState('Bạn cầm Hồng quân. Chọn quân đỏ và tìm nước chiếu đầu tiên.'),[history,setHistory]=useState<Snapshot[]>([]),[hint,setHint]=useState<Move|null>(null),[hintUsed,setHintUsed]=useState(false),[undoUsed,setUndoUsed]=useState(false),[flip,setFlip]=useState(false),[rules,setRules]=useState(false);
  const worker=useRef<Worker|null>(null),alive=useRef(true),sequence=useRef(0),pending=useRef(new Map<number,{resolve:(result:unknown)=>void;reject:(error:Error)=>void}>());
  useEffect(()=>{alive.current=true;const tasks=pending.current;const instance=new Worker(new URL('./solver.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=({data}:{data:{id:number;result:unknown;error?:string}})=>{const task=tasks.get(data.id);if(!task)return;tasks.delete(data.id);if(data.error)task.reject(Error(data.error));else task.resolve(data.result);};
    instance.onerror=()=>{for(const task of tasks.values())task.reject(Error('Không tải được bộ phân tích. Hãy tải lại trang và thử lại.'));tasks.clear();};
    return()=>{alive.current=false;instance.terminate();for(const task of tasks.values())task.reject(Error('Đã đổi thế cờ.'));tasks.clear();worker.current=null;};
  },[]);
  function ask<T>(type:'hint'|'move',move?:Move):Promise<T>{return new Promise((resolve,reject)=>{if(!worker.current)return reject(Error('Đang chuẩn bị thế cờ, vui lòng thử lại.'));const id=++sequence.current;pending.current.set(id,{resolve:result=>resolve(result as T),reject});worker.current.postMessage({id,type,board,move,remaining:puzzle.moves-used});});}
  const moves=useMemo(()=>legalMoves(board,0),[board]);
  const targets=selected?moves.filter(move=>same(move.from,selected)).map(move=>move.to):[];
  async function attempt(move:Move){if(busy||status!=='playing')return;setBusy(true);setSelected(null);setHint(null);setBoard(play(board,move));setLast(move);setTurn(1);setMessage('Hắc quân đang tìm đường giải chiếu…');
    try{const started=Date.now(),result=await ask<Analysis>('move',move);await new Promise(resolve=>setTimeout(resolve,Math.max(0,1000-(Date.now()-started))));if(!alive.current)return;
      setHistory(old=>[...old,{board,used,last}]);setUsed(used+1);setBoard(result.board);setLast(result.reply??move);setMessage(result.message);setStatus(result.status==='won'?'won':result.status==='failed'?'failed':'playing');setTurn(result.status==='won'||!result.reply?1:0);
      if(result.status==='won')onSolved(undoUsed?1:hintUsed?2:3);
    }catch(error){if(alive.current){setBoard(board);setLast(last);setTurn(0);setMessage(error instanceof Error?error.message:'Chưa phân tích được thế cờ.');}}finally{if(alive.current)setBusy(false);}
  }
  function select(pos:Pos){if(busy||status!=='playing')return;const move=selected?moves.find(item=>same(item.from,selected)&&same(item.to,pos)):null;if(move){void attempt(move);return;}const piece=board[pos[0]][pos[1]];setSelected(piece&&piece===piece.toUpperCase()?pos:null);}
  async function suggest(){if(busy||status!=='playing')return;setBusy(true);try{const move=await ask<Move|null>('hint');if(!alive.current)return;setHintUsed(true);setHint(move);if(move){setSelected(move.from);setMessage(`Gợi ý: ${square(move.from)} → ${square(move.to)}. ${puzzle.lesson}`);}else setMessage('Thế hiện tại chưa còn chuỗi chiếu bí trong số nước yêu cầu. Hãy đi lại hoặc chơi lại.');}catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Chưa lấy được gợi ý.');}finally{if(alive.current)setBusy(false);}}
  function undo(){const previous=history.at(-1);if(!previous||busy)return;setBoard(previous.board);setUsed(previous.used);setLast(previous.last);setHistory(history.slice(0,-1));setSelected(null);setHint(null);setTurn(0);setStatus('playing');setUndoUsed(true);setMessage('Đã quay lại trước nước đỏ vừa đi. Hãy thử một hướng tấn công khác.');}
  return <section className="ct-arena"><div className="ct-chapter"><div><span className="ct-eyebrow">THẾ {puzzle.id.startsWith('custom-')?'RIÊNG':String(PUZZLES.findIndex(p=>p.id===puzzle.id)+1).padStart(2,'0')} · {puzzle.level.toUpperCase()}</span><h2>{puzzle.title}</h2><p>{puzzle.theme}</p></div><Stars value={best}/></div>
    <div className="ct-objective"><span className="ct-army-seal">帥</span><div><strong>Hồng quân đi trước · Chiếu bí trong {puzzle.moves} nước</strong><small>Chiếu liên tiếp · Đã đi {used}/{puzzle.moves} nước đỏ</small></div><Swords size={20}/></div>
    <div className="ct-board"><ArenaBoard turnLabel={status==='won'?'Đã phá thế thành công':status==='failed'?'Thế chưa thành công':undefined} playerNames={['Bạn','Máy phòng thủ']} game="xiangqi" board={board} seat={flip?1:0} checkSide={turn===0?'red':'black'} canMove={!busy&&status==='playing'} selected={selected} lastMove={last} legalTargets={targets} winningSquares={hint?[hint.to]:[]} onSquare={select}/></div>
    <div className={`ct-guidance is-${status}`} role="status">{status==='won'?<Crown size={21}/>:<Shield size={19}/>}<p>{message}</p></div>
    {status==='won'&&<div className="ct-victory"><span>破 局 · PHÁ THẾ THÀNH CÔNG</span><Stars value={undoUsed?1:hintUsed?2:3}/><h3>Một nước hay. Một thế trận được khai mở.</h3><p>{puzzle.lesson}</p><button className="ct-primary" onClick={onNext}>Thử thế tiếp theo <ChevronRight size={16}/></button></div>}
    <div className="ct-actions"><button disabled={busy||status!=='playing'} onClick={()=>void suggest()}><Lightbulb size={15}/>Gợi ý</button><button disabled={busy||!history.length} onClick={undo}><Undo2 size={15}/>Đi lại</button><button disabled={busy} onClick={onRestart}><RotateCcw size={15}/>Chơi lại</button><button onClick={()=>setFlip(value=>!value)}><ArrowLeftRight size={15}/>Đảo bàn</button><button onClick={()=>setRules(true)}><BookOpen size={15}/>Cách chơi</button></div>
    <Dialog open={rules} onOpenChange={setRules}><DialogContent className="ct-rules-dialog"><DialogTitle>Phá thế · Thiên Cơ Kỳ Trận</DialogTitle><DialogDescription>Vận dụng luật cờ tướng để hoàn thành từng bài toán chiến thuật.</DialogDescription><ol><li>Bạn cầm quân đỏ và đi trước. Mục tiêu là chiếu bí Tướng đen trong số nước đỏ được ghi.</li><li>Các thế ở đây yêu cầu chiếu liên tiếp. Máy tự chọn nước giải chiếu và thử các đường phòng thủ.</li><li>Chọn quân đỏ, rồi chạm ô gợi sáng. Không được để hai Tướng đối mặt hoặc để Tướng đỏ bị chiếu.</li><li>3 sao khi tự giải, 2 sao khi dùng gợi ý, 1 sao khi dùng đi lại. Mỗi thế giữ thành tích tốt nhất trên thiết bị.</li><li>Đổi cánh là thế đối xứng để luyện nhìn bàn cờ. Thế này là bài tập miễn phí, không đặt cược xu.</li></ol></DialogContent></Dialog>
  </section>;
}
