import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { ArenaGame } from './game-types';
import LudoBoard from '@/games/Ludo/LudoBoard';
import { legalTokens } from '@/games/Ludo/ludoEngine';
import type { LudoState } from '@/games/Ludo/ludoEngine';
import OnlineQuanMatch from '@/games/OAnQuan/OnlineQuanMatch';
import type { QuanState } from '@/games/OAnQuan/engine';
import ChemBoard from '@/games/CoChem/ChemBoard';
import { legalMoves as chemMoves } from '@/games/CoChem/engine';
import type { ChemState } from '@/games/CoChem/engine';
import UpBoard from '@/games/CoUp/UpBoard';
import { pieceTargets } from '@/games/CoUp/engine';
import type { UpState } from '@/games/CoUp/engine';
import { useTycoonReplay } from '@/games/Tycoon/useTycoonReplay';
import EmpireBoard from '@/games/Tycoon/EmpireBoard';
import { BOARD, canBuild, canDowngrade, canSell, liquidationValue, money, netWorth } from '@/games/Tycoon/engine';
import type { EmpireState } from '@/games/Tycoon/engine';
import ShogiBoard, { HandRack } from '@/games/Shogi/ShogiBoard';
import type { Selection } from '@/games/Shogi/ShogiBoard';
import { legalMoves as shogiMoves, declarationInfo } from '@/games/Shogi/engine';
import type { Move as ShogiMove, ShogiState } from '@/games/Shogi/engine';
import CheckersBoard from '@/games/Checkers/CheckersBoard';
import { legalSteps } from '@/games/Checkers/engine';
import type { CheckersState } from '@/games/Checkers/engine';
import OthelloBoard from '@/games/Othello/OthelloBoard';
import { legalMoves as othelloMoves, counts } from '@/games/Othello/engine';
import type { OthelloState } from '@/games/Othello/engine';
import '@/games/Ludo/ludo.css';
import '@/games/OAnQuan/quan.css';
import '@/games/CoChem/chem.css';
import '@/games/CoUp/up.css';
import '@/games/Tycoon/empire.css';
import '@/games/Tycoon/isometric.css';
import '@/games/Shogi/shogi.css';
import '@/games/Checkers/checkers.css';
import '@/games/Othello/othello.css';
import './online-native.css';

type Props = { playerNames?:[string,string]; game: ArenaGame; native: unknown; seat: number; canMove: boolean; send: (action: Record<string, unknown>) => void };
// This component only selects a command. All validation, dice, cards, reveals,
// turn changes and outcomes are computed by the server's canonical rules.
export default function OnlineNativeMatch({ game, native, seat, canMove, send, playerNames }: Props) {
  const [selected, setSelected] = useState<number | null>(() => game === 'checkers' ? (native as CheckersState).chain : null);
  const [selection, setSelection] = useState<Selection>(null), [promotion, setPromotion] = useState<ShogiMove[]>([]);
  const [hover, setHover] = useState<number | null>(null), [property, setProperty] = useState(0);
  if (!native) return <p role="status">Đang nhận bàn cờ…</p>;
  const act = (op: string, extra: Record<string, unknown> = {}) => { if (canMove) send({ op, ...extra }); };
  let board, controls;
  let logs: string[] = [];
  if (game === 'ludo') {
    const n = native as LudoState; logs = n.logs;
    board = <LudoBoard state={n} motion={null} disabled={!canMove} onToken={token => act('token', { token })}/>;
    controls = <><p>Xúc xắc: <b>{n.lastRoll}</b> · {n.phase === 'choose' ? 'Chọn ngựa có thể đi.' : 'Máy chủ tung xúc xắc cho lượt này.'}</p><button disabled={!canMove || n.phase !== 'roll'} onClick={() => act('roll')}>Tung xúc xắc</button>{legalTokens(n).map(token => <button key={token} disabled={!canMove} onClick={() => act('token', { token })}>Đi ngựa {token + 1}</button>)}</>;
  } else if (game === 'oanquan') {
    const n = native as QuanState; logs = n.log;
    board = <OnlineQuanMatch state={n} canMove={canMove} send={send}/>;
    controls = null;
  } else if (game === 'cochem') {
    const n = native as ChemState; logs = n.log;
    const moves = chemMoves(n);
    board = <ChemBoard state={n} selected={selected} disabled={!canMove} motion={null} hint={null} onPoint={to => { if (selected !== null && moves.some(m => m.from === selected && m.to === to)) act('step', { from: selected, to }); else setSelected(to); }}/>;
    controls = <p>Chọn quân của mình rồi chọn điểm đến. Luật gánh, vây và mở được kiểm tra trên máy chủ.</p>;
  } else if (game === 'coup') {
    const n = native as UpState; logs = n.log;
    board = <UpBoard playerNames={playerNames} state={n} selected={selected} disabled={!canMove} flip={seat === 1} motion={null} onSquare={to => { if (selected !== null && pieceTargets(n, selected).includes(to)) { act('step', { from: selected, to }); setSelected(null); } else if (n.board[to]?.side === seat) setSelected(to); else setSelected(null); }}/>;
    controls = <p>Quân úp được lật bằng kết quả ngẫu nhiên từ máy chủ. Hai người không biết trước mặt quân.</p>;
  } else if (game === 'shogi') {
    const n = native as ShogiState; logs = n.logs;
    const moves = selection ? shogiMoves(n, selection.type === 'board' ? selection.index : selection.kind) : [];
    const sendMove = (move: ShogiMove) => { if (move.type === 'move') act('step', { from: move.from, to: move.to, promote: move.promote }); else act('drop', { kind: move.kind, to: move.to }); };
    board = <><HandRack state={n} side={seat === 1 ? 0 : 1} selection={selection} disabled onSelect={() => {}}/><ShogiBoard state={n} selection={selection} targets={moves.map(m => m.to)} flip={seat === 1} motion={null} disabled={!canMove} onSquare={to => { const choices = moves.filter(m => m.to === to); if (choices.length > 1) setPromotion(choices); else if (choices.length) sendMove(choices[0]); else if (n.board[to]?.side === seat) setSelection({ type: 'board', index: to }); else setSelection(null); }}/><HandRack state={n} side={seat === 1 ? 1 : 0} selection={selection} disabled={!canMove} onSelect={kind => setSelection({ type: 'hand', kind })}/><Dialog open={promotion.length > 0} onOpenChange={open => { if (!open) setPromotion([]); }}><DialogContent className="arena-settings-dialog"><DialogTitle>Chọn phong cấp</DialogTitle><DialogDescription>Nước đi này có thể phong cấp hoặc giữ quân hiện tại.</DialogDescription>{promotion.map((m, i) => <button disabled={!canMove} key={i} onClick={() => { sendMove(m); setPromotion([]); }}>{m.type === 'move' && m.promote ? 'Phong cấp' : 'Giữ nguyên'}</button>)}</DialogContent></Dialog></>;
    controls = <><p>Quân bắt được nằm trong khay của bạn và có thể thả lại bàn theo luật Shogi.</p><button disabled={!canMove || !declarationInfo(n).eligible} onClick={() => act('declare')}>Tuyên thắng nhập ngọc</button></>;
  } else if (game === 'checkers') {
    const n = native as CheckersState; logs = n.logs;
    const steps = legalSteps(n), from = n.chain ?? selected;
    board = <CheckersBoard state={n} selected={from} steps={steps} disabled={!canMove} flip={seat === 1} motion={null} hint={null} onSquare={to => { if (from !== null && steps.some(m => m.from === from && m.to === to)) act('step', { from, to }); else if (steps.some(m => m.from === to)) setSelected(to); }}/>;
    controls = <p>{n.chain !== null ? 'Cần tiếp tục chuỗi bắt bằng quân đang chọn.' : 'Bắt quân là bắt buộc khi có nước bắt. Chọn quân rồi chọn điểm đến.'}</p>;
  } else if (game === 'othello') {
    const n = native as OthelloState; logs = n.logs;
    const moves = othelloMoves(n.board, n.turn), score = counts(n.board);
    board = <OthelloBoard state={n} moves={moves} disabled={!canMove} flip={seat === 1} motion={null} preview={moves.find(m => m.at === hover) ?? null} hint={null} onPlace={to => act('place', { to })} onPreview={setHover}/>;
    controls = <p>Đen {score[0]} – Trắng {score[1]}.{n.passed !== null ? ' Bên hết nước tự nhường lượt.' : ' Đặt vào ô sáng để lật quân.'}</p>;
  } else if (game === 'tycoon') {
    logs = (native as EmpireState).logs;
    board = <OnlineTycoon state={native as EmpireState} canMove={canMove} send={send} property={property} setProperty={setProperty}/>;
    controls = null;
  }
  return <div className={`online-native offline-arena native-${game}`}><div className="native-board-area">{board}</div>{controls&&<div className="native-actions">{controls}</div>}<section className="native-journal" aria-label="Nhật ký trận đấu"><h3>Diễn biến trận đấu</h3><ol aria-live="polite">{logs.slice(0, 5).map((line, i) => <li key={i}>{line}</li>)}</ol></section></div>;
}

function OnlineTycoon({state,canMove,send,property,setProperty}:{state:EmpireState;canMove:boolean;send:Props['send'];property:number;setProperty:(n:number)=>void}){
 const {display:n,beat,busy}=useTycoonReplay(state),p=n.players[n.turn],enabled=canMove&&!busy;
 const act=(op:string,extra:Record<string,unknown>={})=>{if(enabled)send({op,...extra});};
    const controls = <><p>Vòng {n.round}/{n.maxRounds} · {p.name}: {money(p.cash)} · Tổng tài sản {money(netWorth(n, p.id))}. Tiền $ trong ván tách biệt với ví xu.</p>{n.phase === 'roll' && <><button disabled={!enabled} onClick={() => act('roll')}>Tung xúc xắc</button>{p.jailed && <button disabled={!enabled || p.cash < 50} onClick={() => act('bail')}>Nộp bảo lãnh $50</button>}</>}{n.phase === 'buy' && <><p>{BOARD[p.position].name}: {money(BOARD[p.position].price)}</p><button disabled={!enabled || p.cash < BOARD[p.position].price} onClick={() => act('buy')}>Mua tài sản</button><button disabled={!enabled} onClick={() => act('pass')}>Bỏ qua mua</button></>}{n.phase === 'manage' && <button disabled={!enabled} onClick={() => act('end')}>Kết thúc lượt</button>}{n.phase === 'debt' && <><p>Nợ {money(n.debt?.amount ?? 0)}. Có thể bán nhà/đất để trả nợ.</p><button disabled={!enabled || p.cash < (n.debt?.amount ?? 0)} onClick={() => act('pay')}>Trả nợ</button><button disabled={!enabled || liquidationValue(n, p.id) >= (n.debt?.amount ?? 0)} onClick={() => act('bankrupt')}>Xác nhận phá sản</button></>}<div className="native-property"><strong>{BOARD[property].name}</strong><button disabled={!enabled || !canBuild(n, property)} onClick={() => act('build', { tile: property })}>Xây nhà</button><button disabled={!enabled || !canDowngrade(n, property)} onClick={() => act('downgrade', { tile: property })}>Bán nhà</button><button disabled={!enabled || !canSell(n, property)} onClick={() => act('sell', { tile: property })}>Bán đất</button></div></>;
 return <><EmpireBoard state={n} beat={beat} onRoll={()=>act('roll')} onAction={action=>{if(action.type!=='roll')act(action.type,'tile' in action?{tile:action.tile}:{});}} canAct={enabled} canRoll={enabled&&n.phase==='roll'} travel={null} selected={property} onSelect={setProperty} faces={n.dice} rolling={beat?.kind==='dice'}/><div className="native-actions">{controls}</div></>;
}
