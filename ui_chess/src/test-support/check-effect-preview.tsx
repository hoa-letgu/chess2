// Development-only visual fixture. Vite's production entry does not include this page.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ArenaBoard from '../features/arena/ArenaBoard';
import UpBoard from '../games/CoUp/UpBoard';
import { newUpGame } from '../games/CoUp/engine';
import type { Kind } from '../games/CoUp/engine';
import '../games/CoUp/up.css';
import '../index.css';

export default function Preview() {
  const [checked, setChecked] = useState(false), [flip, setFlip] = useState(false), [selected, setSelected] = useState(false), [move, setMove] = useState(0);
  const board: (string | null)[][] = Array.from({ length: 10 }, () => Array<string | null>(9).fill(null));
  board[0][4] = 'g'; board[9][4] = 'G'; board[5][4] = 'S'; board[2][checked ? 4 : 0] = 'R';
  const up = newUpGame(); up.board = board.flat().map((piece, i) => piece ? { id: `preview-${i}`, side: piece === piece.toUpperCase() ? 0 : 1, role: piece.toUpperCase() as Kind, kind: piece.toUpperCase() as Kind } : null); up.turn = checked ? 1 : 0; up.moves = move;
  return <main style={{ maxWidth: 1100, margin: 'auto', padding: 16, color: '#ebd4a1' }}><h1 style={{ fontSize: 24 }}>Chiếu Tướng · Hiệu ứng vòng mực 1:1</h1><p>Xem thử giao diện · Không tạo ván hoặc sử dụng xu.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 0' }}>
    <button onClick={() => { setChecked(true); setMove(value => value + 1); }}>Chiếu tướng</button><button onClick={() => { setChecked(false); setMove(value => value + 1); }}>Giải chiếu</button><button onClick={() => setFlip(value => !value)}>Đảo bàn</button><button onClick={() => setSelected(value => !value)}>Chọn quân</button>
  </div><div className="check-preview-boards"><section><h2>Cờ tướng</h2><ArenaBoard game="xiangqi" board={board} seat={flip ? 1 : 0} checkSide={checked ? 'black' : 'red'} selected={selected ? [2, checked ? 4 : 0] : null} lastMove={{ from: [2,0], to: [2,checked ? 4 : 0] }} canMove onSquare={() => setSelected(value => !value)}/></section><section><h2>Cờ úp</h2><UpBoard state={up} selected={selected ? 22 : null} disabled={false} flip={flip} motion={null} onSquare={() => setSelected(value => !value)}/></section></div>
  <style>{`body{margin:0;background:#151d1b;font:14px system-ui}.check-preview-boards{display:grid;grid-template-columns:1fr 1fr;gap:24px}main>div>button{padding:10px 15px;border:1px solid #a08752;border-radius:6px;background:#282d25;color:#f4dc9c;cursor:pointer}.check-preview-boards h2{font-size:18px;margin:0 0 12px}@media(max-width:640px){.check-preview-boards{grid-template-columns:1fr}}`}</style></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
