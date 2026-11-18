import { useEffect, useRef, useState } from 'react';
import ArenaBoard from '@/features/arena/ArenaBoard';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { clone, readCustomPosition } from './engine';
import type { Board, CustomPosition, Move, Piece, Pos, Puzzle } from './engine';
import { exportPosition, importPosition } from './custom-puzzles';

const pieces:Piece[]=['G','A','E','H','R','C','S','g','a','e','h','r','c','s'];
const symbols=['帥','仕','相','傌','俥','炮','兵','將','士','象','馬','車','砲','卒'];
const names=['Tướng','Sĩ','Tượng','Mã','Xe','Pháo','Tốt'];
type Tool=Piece|'move'|'erase';
export default function PuzzleEditor({source,onClose,onSave}:{source:Puzzle;onClose:()=>void;onSave:(position:CustomPosition,id?:string)=>void}){
  const editing=source.id.startsWith('custom-');
  const [board,setBoard]=useState<Board>(()=>clone(source.board)),[title,setTitle]=useState(editing?source.title:'Thế cờ của tôi'),[moves,setMoves]=useState(source.moves);
  const [tool,setTool]=useState<Tool>('move'),[selected,setSelected]=useState<Pos|null>(null),[history,setHistory]=useState<Board[]>([]),[message,setMessage]=useState('Chọn quân bên dưới rồi chạm điểm đặt trên bàn. Đỏ luôn đi trước.'),[verified,setVerified]=useState(false),[busy,setBusy]=useState(false),[code,setCode]=useState('');
  const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const titleInput=useRef<HTMLInputElement|null>(null);
  function stop(){worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;}
  useEffect(()=>()=>{worker.current?.terminate();if(timer.current)clearTimeout(timer.current);},[]);
  function change(next:Board){setHistory(old=>[...old.slice(-49),board]);setBoard(next);setSelected(null);setVerified(false);setMessage('Đã thay đổi bàn. Hãy kiểm tra lời giải trước khi lưu.');}
  function place(pos:Pos){
    if(busy)return;
    if(tool==='move'){
      if(!selected){if(board[pos[0]][pos[1]])setSelected(pos);return;}
      if(selected[0]===pos[0]&&selected[1]===pos[1]){setSelected(null);return;}
      const next=clone(board);next[pos[0]][pos[1]]=next[selected[0]][selected[1]];next[selected[0]][selected[1]]=null;change(next);return;
    }
    const next=clone(board);next[pos[0]][pos[1]]=tool==='erase'?null:tool;change(next);
  }
  function undo(){const previous=history.at(-1);if(!previous||busy)return;setHistory(history.slice(0,-1));setBoard(previous);setSelected(null);setVerified(false);setMessage('Đã hoàn tác thao tác xếp quân.');}
  function position(){return readCustomPosition({title,moves,board});}
  function verify(){
    stop();setVerified(false);
    let p:CustomPosition;try{p=position();}catch(e){setMessage((e as Error).message);return;}
    setBusy(true);setMessage('Đang tìm chuỗi chiếu bí trước mọi nước phòng thủ…');
    const instance=new Worker(new URL('./solver.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=({data}:{data:{result?:Move|null;error?:string}})=>{
      stop();setBusy(false);setVerified(!!data.result&&!data.error);
      setMessage(data.error??(data.result?'Thế hợp lệ! Đã tìm được chuỗi chiếu bí trong giới hạn trước mọi nước phòng thủ. Bạn có thể lưu và chơi.':'Chưa có lời giải chiếu liên tiếp trong số nước đã chọn. Hãy sửa vị trí quân hoặc tăng số nước.'));
    };
    instance.onerror=()=>{stop();setBusy(false);setMessage('Không tải được bộ kiểm tra. Hãy thử lại.');};
    timer.current=setTimeout(()=>{stop();setBusy(false);setMessage('Thế này phân tích quá lâu. Hãy giảm số quân hoặc chọn mục tiêu ít nước hơn.');},8000);
    instance.postMessage({id:1,type:'hint',board:p.board,remaining:p.moves});
  }
  function save(){if(!verified||busy)return;try{onSave(position(),editing?source.id:undefined);}catch(e){setMessage(e instanceof Error?e.message:'Không lưu được thế cờ. Dung lượng thiết bị có thể đã đầy.');}}
  function share(){try{setCode(exportPosition(position()));setMessage('Đã tạo mã. Sao chép ô mã bên dưới và gửi cho bạn bè.');}catch(e){setMessage((e as Error).message);}}
  function load(){try{const p=importPosition(code);change(p.board);setTitle(p.title);setMoves(p.moves);setMessage('Đã nhập thế từ mã chia sẻ. Kiểm tra lời giải để lưu vào bộ sưu tập của bạn.');}catch(e){setMessage((e as Error).message);}}
  return <Dialog open onOpenChange={open=>{if(!open){stop();onClose();}}}><DialogContent className="ct-editor-dialog" onOpenAutoFocus={event=>{event.preventDefault();titleInput.current?.focus({preventScroll:true});}}>
    <DialogTitle>{editing?'Sửa thế cờ':'Tự tạo thế cờ'}</DialogTitle><DialogDescription>Xếp quân, chọn mục tiêu và kiểm tra lời giải. Lưu trên thiết bị; có thể chia sẻ bằng mã hoặc dùng khi tạo phòng online.</DialogDescription>
    <div className="ct-editor-layout"><div className="ct-editor-board"><ArenaBoard game="xiangqi" board={board} seat={0} canMove={!busy} selected={selected} lastMove={null} onSquare={place}/></div>
    <div className="ct-editor-tools"><label>Tên thế cờ<input ref={titleInput} maxLength={60} value={title} disabled={busy} onChange={e=>{setTitle(e.target.value);setVerified(false);}}/></label><label>Mục tiêu<select value={moves} disabled={busy} onChange={e=>{setMoves(Number(e.target.value));setVerified(false);}}>{[1,2,3].map(n=><option key={n} value={n}>Chiếu bí trong {n} nước đỏ</option>)}</select></label>
    <div className="ct-editor-palette" aria-label="Kho quân cờ">{pieces.map((piece,index)=><button key={piece} disabled={busy} aria-pressed={tool===piece} aria-label={`Đặt ${names[index%7]} ${index<7?'đỏ':'đen'}`} onClick={()=>{setTool(piece);setSelected(null);}} className={index<7?'red':'black'}><span>{symbols[index]}</span><small>{names[index%7]}</small></button>)}</div>
    <div className="ct-editor-buttons"><button disabled={busy} aria-pressed={tool==='move'} onClick={()=>{setTool('move');setSelected(null);}}>Di chuyển quân</button><button disabled={busy} aria-pressed={tool==='erase'} onClick={()=>{setTool('erase');setSelected(null);}}>Tẩy quân</button><button disabled={busy||!history.length} onClick={undo}>Hoàn tác</button><button disabled={busy} onClick={()=>change(Array.from({length:10},()=>Array<Piece|null>(9).fill(null)))}>Bàn trống</button><button disabled={busy} onClick={()=>change(clone(source.board))}>Về thế ban đầu</button></div>
    <p className={`ct-editor-message ${verified?'verified':''}`} role="status">{message}</p>
    <div className="ct-editor-buttons"><button disabled={busy} onClick={verify}>{busy?'Đang kiểm tra…':'Kiểm tra lời giải'}</button>{busy&&<button onClick={()=>{stop();setBusy(false);setMessage('Đã dừng kiểm tra. Bạn có thể tiếp tục xếp quân.');}}>Dừng kiểm tra</button>}<button className="ct-primary" disabled={busy||!verified} onClick={save}>Lưu và chơi</button></div>
    <details><summary>Chia sẻ / nhập mã thế cờ</summary><p>Mã chỉ chứa tên, vị trí quân và mục tiêu. Người nhận dán mã rồi kiểm tra trước khi lưu.</p><textarea aria-label="Mã chia sẻ thế cờ" maxLength={20000} value={code} disabled={busy} onChange={e=>setCode(e.target.value)} placeholder="Dán mã thế cờ tại đây…"/><div className="ct-editor-buttons"><button disabled={busy} onClick={share}>Tạo mã chia sẻ</button><button disabled={busy||!code.trim()} onClick={load}>Nhập từ mã</button></div></details>
    <p className="ct-editor-note">Đúng 2 Tướng trong cung; quân đủ số lượng theo luật. Vị trí đầu không được chiếu sẵn. Tối đa 50 thế riêng trên trình duyệt này.</p>
    </div></div>
  </DialogContent></Dialog>;
}
