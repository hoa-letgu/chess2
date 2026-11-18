import { gameSocketOptions } from '@/context/gameSocketOptions';
import { loadCustomPuzzles } from '@/games/CoThe/custom-puzzles';
import { PUZZLES, legalMoves as cotheMoves } from '@/games/CoThe/engine';
import type { Board as CoTheBoard, Side as CoTheSide } from '@/games/CoThe/engine';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Coins, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import './arena.css';
import { useGameCatalog } from './useGameCatalog';
const WalletPanel = lazy(() => import('./WalletPanel'));
import { walletLabels } from './payment-client';
import type { PaymentConfig } from './payment-client';
import ArenaBoard from './ArenaBoard';
import { MatchHeader } from './MatchSurface';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

import { ARENA_GAMES, isClassicGame, isArenaGame, seatName } from './game-types';
import type { ArenaGame as Game } from './game-types';
const OnlineNativeMatch = lazy(() => import('./OnlineNativeMatch'));
type User = { id: string; username: string; balance: number; available_coins: number; locked_coins: number; lock_reason: string; wallet_mode?: string };
type Entry = { id: string; amount: number; kind: string; created: number };
type Pos = [number, number];
type Room = {
  id: string; name: string; game: Game; stake: number; version: number; status: string;
  players: { id: string; username: string; online: boolean; reconnectUntil: number | null }[];
  state: { board: (string | null)[][]; turn: number; lastMove: { from: Pos | null; to: Pos } | null; passes?: number; native?: unknown; title?:string; limit?:number; used?:number };
  drawOffer: number | null; result: { winner: number; reason: string } | null;
};
const titles = ARENA_GAMES;
const ledgerNames: Record<string, string> = { admin_credit: 'Quản trị cộng xu', admin_debit: 'Quản trị trừ xu', paid_topup: 'Nạp xu qua thanh toán', sandbox_topup: 'Nạp xu kiểm thử cổng', demo_topup: 'Nạp xu thử nghiệm', stake_hold: 'Giữ cược đầu ván', stake_refund: 'Hoàn cược', win_payout: 'Nhận quỹ thắng (gồm vốn)' };
const money = (n: number) => n.toLocaleString('vi-VN');
const api = async (path: string, body?: unknown) => {
  const response = await fetch(`/api/arena${path}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Arena-Request': '1' }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Không thể kết nối server.'), { status: response.status });
  return data;
};

export default function ArenaHub({ onExit, initialGame = 'chess' }: { onExit: () => void; initialGame?: Game }) {
  const [customPuzzles]=useState(loadCustomPuzzles);
  const onlinePuzzles=[...PUZZLES,...customPuzzles];
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  useEffect(() => { const abort = new AbortController(); fetch('/api/arena/payments/config', { signal: abort.signal }).then(r => r.ok ? r.json() : Promise.reject(Error('Không tải được cấu hình thanh toán.'))).then(setPaymentConfig).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => abort.abort(); }, []);
  const [user, setUser] = useState<User | null>(null), [checking, setChecking] = useState(true);
  const [register, setRegister] = useState(false), [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const catalog = useGameCatalog();
  const [preferredGame, setGame] = useState<Game>(initialGame), [stake, setStake] = useState('0'), [size, setSize] = useState(19), [puzzleIndex,setPuzzleIndex] = useState(10), [name, setName] = useState('');
  const candidate = catalog.games?.find(item => !item.maintenance && isArenaGame(item.id))?.id;
  const game: Game = catalog.available(preferredGame) ? preferredGame : candidate && isArenaGame(candidate) ? candidate : preferredGame;
  const [rooms, setRooms] = useState<Room[]>([]), [room, setRoom] = useState<Room | null>(null), [roomId, setRoomId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Entry[]>([]), [tick, setTick] = useState(0), [selected, setSelected] = useState<Pos | null>(null), [promotion, setPromotion] = useState('q');
  const [clock, setClock] = useState(Date.now());
  const [confirmation, setConfirmation] = useState<{type: 'resign' | 'exit' | 'join'; target?: Room} | null>(null);
  const mounted = useRef(true), locked = useRef(false), topupRequest = useRef<{ amount: number; requestId: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let alive = true;
    api('/me').then(data => { if (alive) { setUser(data.user); setLedger(data.ledger); setPaymentConfig(data.payments); } }).catch(e => { if (alive && e.status !== 401) setError(e.message); }).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    if (!user?.id) return;
    const socket = io({ ...gameSocketOptions, path: '/arena-socket' });
    socket.on('connect', () => { setConnected(true); refresh(); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('arena:changed', refresh);
    const timer = setInterval(refresh, 4000), clockTimer = setInterval(() => setClock(Date.now()), 1000);
    return () => { socket.disconnect(); clearInterval(timer); clearInterval(clockTimer); };
  }, [user?.id, refresh]);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.all([api('/me'), api('/rooms'), roomId ? api(`/rooms/${roomId}`) : Promise.resolve(null)])
      .then(([me, list, current]) => {
        if (!alive) return;
        setUser(me.user); setLedger(me.ledger); setPaymentConfig(me.payments); setRooms(list.rooms);
        const next = current?.room ?? list.current;
        setRoom(next); if (next && !roomId) setRoomId(next.id);
      }).catch(e => { if (alive) { setError(e.message); if (e.status === 401) { setUser(null); setRoom(null); setRoomId(null); } } });
    return () => { alive = false; };
  }, [user?.id, roomId, tick]);
  useEffect(() => setSelected(null), [room?.version, room?.id]);
  async function run(task: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Không thể xử lý yêu cầu.'); }
    finally { locked.current = false; if (mounted.current) { setBusy(false); refresh(); } }
  }
  function authenticate(e: FormEvent) { e.preventDefault(); void run(async () => {
    const data = await api(`/auth/${register ? 'register' : 'login'}`, { username, password }); setUser(data.user); window.dispatchEvent(new Event('arena-auth-changed')); setPassword('');
  }); }
  function enter(next: Room) { setSelected(null); setRoom(next); setRoomId(next.id); }
  async function action(type: string, extra: object = {}) { if (!room) return; let failure: string | undefined;
    await run(async () => { try {
      const data = await api(`/rooms/${room.id}/action`, { type, version: room.version, ...extra }); enter(data.room);
    } catch(e) { failure=e instanceof Error?e.message:'Nước đi không hợp lệ.';throw e; } });
    return failure;
  }
  function topup(amount: number) { void run(async () => {
    // Preserve the key on network failure so retrying cannot credit twice.
    if (topupRequest.current?.amount !== amount) topupRequest.current = { amount, requestId: Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('') };
    const data = await api('/wallet/demo-topup', topupRequest.current); setUser(data.user); topupRequest.current = null;
  }); }
  const seat = room?.players.findIndex(p => p.id === user?.id) ?? -1;
  const canMove = !!room && room.status === 'playing' && room.state.turn === seat && connected && !busy && !confirmation;
  function clickSquare(pos: Pos) {
    if (!canMove || !room) return;
    if (room.game === 'chess' || room.game === 'xiangqi' || room.game === 'cothe') {
      const p = room.state.board[pos[0]][pos[1]], own = p && (p === p.toUpperCase() ? 0 : 1) === seat;
      if (own) { setSelected(pos); return; }
      if (!selected) return;
      action('move', { from: selected, to: pos, promotion });
    } else return action('move', { to: pos });
  }
  function exit() {
    if (room?.status === 'playing') { setConfirmation({ type: 'exit' }); return; }
    if (room?.status === 'waiting') { void run(async () => { await api(`/rooms/${room.id}/cancel`, {}); onExit(); }); return; }
    onExit();
  }
  if (checking) return <div className={`coin-arena ${['cothe','xiangqi','coup'].includes(room?.game ?? game) ? 'bamboo-online' : ''} ${((room?.game ?? game) === 'cothe') ? `cothe-online ${room?'cothe-match-active':''}` : ''}`}><p role="status">Đang tải tài khoản…</p></div>;
  return <div className={`coin-arena ${['cothe','xiangqi','coup'].includes(room?.game ?? game) ? 'bamboo-online' : ''} ${((room?.game ?? game) === 'cothe') ? `cothe-online ${room?'cothe-match-active':''}` : ''}`}>
    <MatchHeader className="coin-header" mode="online"><button onClick={exit} className="coin-quiet"><ArrowLeft size={17} /> Sảnh game</button><strong>BOARD<span>ARENA</span></strong><span className="demo-tag">{walletLabels[paymentConfig?.walletMode ?? 'demo']}</span></MatchHeader>
    {error && <div className="coin-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng thông báo">×</button></div>}
    {!user ? <main className="coin-auth">
      <span className="coin-icon"><ShieldCheck size={30} /></span><p className="coin-eyebrow">MỘT TÀI KHOẢN · MƯỜI BA TRÒ CHƠI</p><h1>{register ? 'Tạo tài khoản của bạn' : 'Chào mừng trở lại'}</h1><p>Đăng nhập để dùng ví xu và tham gia bàn đấu online.</p>
      <form onSubmit={authenticate}><label>Tên đăng nhập<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required placeholder="Ví dụ: nguoichoi_01" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required placeholder="Tối thiểu 8 ký tự" /></label><button className="coin-primary" disabled={busy}>{busy ? 'Đang xử lý…' : register ? 'Đăng ký tài khoản' : 'Đăng nhập'}</button></form>
      <button className="coin-quiet" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button><p className="coin-small">{paymentConfig?.mode === 'paid' ? 'Xu chỉ dùng trong game, không rút hoặc đổi thưởng. Thanh toán chỉ qua các cổng đang bật.' : 'Đang ở chế độ demo. Xu miễn phí chỉ để thử nghiệm, không rút hoặc đổi thưởng.'}</p>
    </main> : <main className="coin-layout">
      <aside className="coin-sidebar">
        <Suspense fallback={<section className="coin-panel" role="status">Đang mở ví…</section>}><WalletPanel user={user} config={paymentConfig} connected={connected} busy={busy} holding={room?.status === 'playing' ? room.stake : null} onDemoTopup={topup} onRefresh={refresh} onLogout={() => void run(async () => { await api('/auth/logout', {}); window.dispatchEvent(new Event('arena-auth-changed')); setUser(null); setRoom(null); setRoomId(null); })}/></Suspense>
        <section className="coin-panel coin-rules"><h2>Luật bàn xu</h2><p>Hai người cùng đặt X xu. Người thắng nhận 2X xu, gồm cả vốn. Người thua mất X xu.</p><p>Hòa hoàn cược. Bàn 0 xu chơi miễn phí. Mất kết nối quá 60 giây tính thua; cả hai cùng mất kết nối quá hạn được hoàn cược.</p><p>Cược chỉ áp dụng online giữa hai người. Bot không dùng xu.</p></section>
        <section className="coin-panel"><h2>Lịch sử ví</h2><p className="coin-small">50 giao dịch gần nhất</p><div className="coin-ledger">{ledger.length ? ledger.map(entry => <div key={entry.id}><span>{ledgerNames[entry.kind] ?? entry.kind}<small>{new Date(entry.created).toLocaleString('vi-VN')}</small></span><b className={entry.amount > 0 ? 'positive' : ''}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)}</b></div>) : <p className="coin-small">Chưa có giao dịch trong ví đang sử dụng.</p>}</div></section>
      </aside>
      <div className="coin-content">
        {room ? <section className="coin-panel coin-match">
          <div className="coin-panel-title"><div><p className="coin-eyebrow">{titles[room.game]} · {room.status === 'waiting' ? 'ĐANG CHỜ' : room.status === 'playing' ? 'ĐANG ĐẤU' : 'KẾT THÚC'}</p><h1>{room.name}</h1></div><span className="coin-stake"><Coins size={16} /> {money(room.stake)} xu/người</span></div>
          <div className="coin-players">{[0, 1].map(i => <div className={room.status === 'playing' && room.state.turn === i ? 'turn' : ''} key={i}><b>{room.players[i]?.username ?? 'Đang chờ đối thủ…'} {seat === i ? '(Bạn)' : ''}</b><small>{seatName(room.game, i)}{room.players[i] && <> · {room.players[i].online ? 'Trực tuyến' : `Kết nối lại: ${Math.max(0, Math.ceil(((room.players[i].reconnectUntil ?? clock) - clock) / 1000))}s`}</>}</small></div>)}</div>
          {room.status === 'waiting' && <div className="coin-notice">Bàn đã được đăng trong sảnh. Xu chỉ bị giữ khi người thứ hai vào bàn và ván bắt đầu.</div>}
          {room.result && <div className="coin-result" role="status"><h2>{room.result.winner === -1 ? 'Ván hòa' : room.result.winner === seat ? 'Bạn đã thắng!' : 'Bạn đã thua'}</h2><p>{room.result.reason}</p><b>{room.stake === 0 ? 'Bàn miễn phí · không đổi số dư' : room.result.winner === -1 ? `Hoàn ${money(room.stake)} xu` : room.result.winner === seat ? `Nhận ${money(2 * room.stake)} xu · lãi ${money(room.stake)} xu` : `Mất ${money(room.stake)} xu`}</b></div>}
          {room.game==='cothe' && <div className="coin-notice"><strong>勢 · {room.state.title}</strong><br/>Đỏ phải chiếu liên tiếp và chiếu bí trong {room.state.limit} nước đỏ. Đen đi quân trực tiếp để hóa giải. Đã đi {room.state.used}/{room.state.limit} nước đỏ. Bàn luyện tập miễn phí.</div>}
          {isClassicGame(room.game) ? <ArenaBoard key={room.id} finished={room.status==='finished'} drawn={room.result?.winner===-1} winner={room.game === 'chess' && room.result ? (room.result.winner === 0 ? 'w' : room.result.winner === 1 ? 'b' : null) : null} turnLabel={room.status==='waiting'?'Đang chờ đối thủ':room.status==='finished'?'Ván đã kết thúc':undefined} playerNames={[room.players[0]?.username??'Đang chờ…',room.players[1]?.username??'Đang chờ…']} checkSide={(room.game === 'xiangqi' || room.game === 'cothe') ? (room.state.turn === 0 ? 'red' : 'black') : undefined} game={room.game === 'cothe' ? 'xiangqi' : room.game} board={room.state.board} seat={seat} canMove={canMove} selected={selected} lastMove={room.state.lastMove} legalTargets={room.game==='cothe'&&selected?cotheMoves(room.state.board as CoTheBoard,seat as CoTheSide).filter(move=>move.from[0]===selected[0]&&move.from[1]===selected[1]).map(move=>move.to):[]} onSquare={clickSquare} /> : <Suspense fallback={<p role="status">Đang mở bàn online…</p>}><OnlineNativeMatch key={["coup","oanquan","tycoon"].includes(room.game) ? room.id : `${room.id}-${room.version}`} game={room.game} native={room.state.native} playerNames={[room.players[0]?.username??'Đang chờ…',room.players[1]?.username??'Đang chờ…']} seat={seat} canMove={canMove} send={command => action('move', command)}/></Suspense>}
          {room.game === 'go' && <p className="coin-small">Luật thử nghiệm: tính diện tích, komi 6,5; cấm lặp bàn cờ. Hai lần bỏ lượt liên tiếp chấm điểm. Hãy bắt hết quân chết trước khi cùng bỏ lượt.</p>}
          {room.game === 'xiangqi' && <p className="coin-small">Luật thử nghiệm: hết nước hợp lệ tính thua; lặp thế 3 lần tính hòa, chưa phân xử trường chiếu/trường tróc.</p>}
          <div className="coin-match-actions">
            {room.status === 'playing' && <>{room.game === 'chess' && <label className="coin-promotion">Phong cấp<select value={promotion} onChange={e => setPromotion(e.target.value)}><option value="q">Hậu</option><option value="r">Xe</option><option value="b">Tượng</option><option value="n">Mã</option></select></label>}{room.game === 'go' && <button disabled={!canMove} onClick={() => action('move', { pass: true })}>Bỏ lượt</button>}<button disabled={busy || !connected || room.drawOffer !== null} onClick={() => action('draw-offer')}>Đề nghị hòa</button><button className="coin-danger" disabled={busy} onClick={() => setConfirmation({ type: 'resign' })}>Đầu hàng</button></>}
            {room.status === 'waiting' && <button disabled={busy} onClick={() => void run(async () => { await api(`/rooms/${room.id}/cancel`, {}); setRoom(null); setRoomId(null); })}>Hủy bàn</button>}
            {!['waiting', 'playing'].includes(room.status) && <button className="coin-primary" onClick={() => { setRoom(null); setRoomId(null); refresh(); }}>Trở về danh sách bàn</button>}
          </div>
          {room.drawOffer !== null && room.status === 'playing' && <div className="coin-notice">{room.drawOffer === seat ? 'Đã gửi đề nghị hòa. Đang chờ đối phương.' : <>Đối phương đề nghị hòa. <button disabled={busy} onClick={() => action('draw-accept')}>Đồng ý · hoàn cược</button><button disabled={busy} onClick={() => action('draw-reject')}>Từ chối</button></>}</div>}
        </section> : <>
          <section className="coin-panel"><p className="coin-eyebrow">CHỌN GAME · ĐẶT MỨC XU · MỜI ĐỐI THỦ</p><h1>Tạo bàn của bạn</h1>{!catalog.games && <p role="status">{catalog.error || "Đang tải trò chơi…"}</p>}{catalog.games && !catalog.games.some(item => !item.maintenance && isArenaGame(item.id)) && <p role="status">Các trò chơi đang bảo trì. Bạn vẫn có thể xem ví và lịch sử.</p>}<p className="coin-small">Bàn online hai người · dùng chung tài khoản và ví xu đang bật. Cá ngựa và tỷ phú online hiện chơi hai người.</p><form className="coin-create" onSubmit={e => { e.preventDefault(); void run(async () => { const data = await api('/rooms', { name, game, stake: game==='cothe'?0:Number(stake), size:game==='cothe'?(puzzleIndex<PUZZLES.length?puzzleIndex:undefined):size, ...(game==='cothe'&&puzzleIndex>=PUZZLES.length?{puzzle:onlinePuzzles[puzzleIndex]}:{}) }); enter(data.room); }); }}><label>Trò chơi<select value={game} onChange={e => setGame(e.target.value as Game)}>{Object.entries(titles).filter(([id]) => catalog.available(id)).map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label><label>Tên bàn<input value={name} onChange={e => setName(e.target.value)} maxLength={40} required placeholder="Ví dụ: Cùng chơi một ván" /></label>{game==='cothe'&&<label>Thế cờ<select value={puzzleIndex} onChange={e=>setPuzzleIndex(Number(e.target.value))}>{onlinePuzzles.map((p,index)=><option key={p.id} value={index}>{p.id.startsWith('custom-')?'Của tôi · ':''}{p.title} · {p.moves} nước</option>)}</select></label>}<label>Xu mỗi người<input disabled={game==='cothe'} type="number" min={0} max={100000} step={1} value={game==='cothe'?'0':stake} onChange={e => setStake(e.target.value)} required /></label>{game==='cothe'&&<p className="coin-small">Đỏ phá thế, Đen hóa giải trong số nước quy định. Hai vai có mục tiêu khác nhau nên Cờ thế chỉ mở bàn 0 xu.</p>}{game === 'go' && <label>Kích thước<select value={size} onChange={e => setSize(Number(e.target.value))}>{[9, 13, 19].map(n => <option value={n} key={n}>{n} × {n}</option>)}</select></label>}<button className="coin-primary" disabled={busy || !connected || !catalog.available(game) || (game!=='cothe'&&Number(stake) > user.available_coins)}>Tạo bàn {(game==='cothe'||Number(stake)===0) ? 'miễn phí' : `${money(Number(stake))} xu`}</button></form><p className="coin-small">Người tạo đi trước. Ván tự bắt đầu khi đủ hai người; cả hai cần đủ xu đặt cược.</p></section>
          <section className="coin-panel"><div className="coin-panel-title"><div><p className="coin-eyebrow">CÙNG NHAU SO TÀI</p><h2>Bàn đang chờ</h2></div><button className="coin-quiet" onClick={refresh} disabled={busy}><RefreshCw size={15} /> Làm mới</button></div><div className="coin-room-list">{rooms.filter(r => r.game === game && catalog.available(r.game)).length ? rooms.filter(r => r.game === game && catalog.available(r.game)).map(r => <div key={r.id}><span className="coin-room-icon"><Users size={22} /></span><div><h3>{r.name}</h3><p>{titles[r.game]} · {r.players[0].username} · {r.players[0].online ? 'Đang chờ bạn' : 'Ngoại tuyến'}</p></div><b>{r.stake === 0 ? 'Miễn phí' : `${money(r.stake)} xu`}</b><button disabled={busy || !connected || !r.players[0].online || user.available_coins < r.stake} onClick={() => { if (r.stake) setConfirmation({ type: 'join', target: r }); else void run(async () => { const data = await api(`/rooms/${r.id}/join`, {}); enter(data.room); }); }}>{user.available_coins < r.stake ? 'Thiếu xu' : 'Vào bàn'}</button></div>) : <div className="coin-empty"><Users size={32} /><h3>Chưa có bàn {titles[game].toLowerCase()}</h3><p>Tạo bàn đầu tiên và rủ một người bạn cùng chơi.</p></div>}</div></section>
        </>}
      </div>
    </main>}
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}><DialogContent className="arena-settings-dialog"><DialogTitle>{confirmation?.type === 'resign' ? 'Xác nhận đầu hàng?' : confirmation?.type === 'join' ? 'Vào bàn có xu?' : 'Rời sảnh online?'}</DialogTitle><DialogDescription>{confirmation?.type === 'resign' ? `Bạn sẽ thua ván này. ${room?.stake ? `Mất ${money(room.stake)} xu đã đặt.` : 'Bàn miễn phí không thay đổi ví xu.'}` : confirmation?.type === 'join' ? `Mỗi người giữ ${money(confirmation.target?.stake ?? 0)} xu khi ván bắt đầu. Thắng nhận quỹ, hòa hoàn xu.` : 'Rời sảnh sẽ ngắt kết nối. Không trở lại sau 60 giây sẽ tính thua; hai bên cùng mất kết nối quá hạn được hoàn cược.'}</DialogDescription><button disabled={busy} onClick={() => { const intent = confirmation; setConfirmation(null); if (intent?.type === 'resign') action('resign'); else if (intent?.type === 'exit') onExit(); else if (intent?.target) void run(async () => { const data = await api(`/rooms/${intent.target!.id}/join`, {}); enter(data.room); }); }}>Xác nhận</button><button onClick={() => setConfirmation(null)}>Tiếp tục chơi</button></DialogContent></Dialog>
  </div>;
}

