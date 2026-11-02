import { MatchHeader } from '@/features/arena/MatchSurface';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowUpRight, Bot, ChevronRight, Crown, Dice5, Flag, HelpCircle, Pause, Play, RotateCcw, Sparkles, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import LudoBoard, { HorseFigure } from './LudoBoard';
import type { Motion } from './LudoBoard';
import { COLORS, FINISH, chooseBotToken, legalTokens, moveToken, newGame, randomDice, rollDice } from './ludoEngine';
import type { Mode } from './ludoEngine';
import './ludo.css';

const pipPositions: Record<number, number[]> = { 1: [4], 2: [0,8], 3: [0,4,8], 4: [0,2,6,8], 5: [0,2,4,6,8], 6: [0,2,3,5,6,8] };
export default function LudoGame({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState(() => newGame());
  const [mode, setMode] = useState<Mode>('bots'), [count, setCount] = useState(4);
  const [draftMode, setDraftMode] = useState<Mode>('bots'), [draftCount, setDraftCount] = useState(4);
  const [settings, setSettings] = useState(false), [rules, setRules] = useState(false), [exitDialog, setExitDialog] = useState(false);
  const [rolling, setRolling] = useState(false), [face, setFace] = useState(1), [motion, setMotion] = useState<Motion | null>(null), [paused, setPaused] = useState(false), [muted, setMuted] = useState(true);
  const timers = useRef(new Set<number>()), lock = useRef(false), audio = useRef<AudioContext | null>(null);
  const player = state.players[state.turn], color = COLORS[player.id], valid = legalTokens(state), finished = state.phase === 'finished';
  const busy = rolling || motion !== null;
  const later = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(() => { timers.current.delete(id); fn(); }, delay); timers.current.add(id);
  }, []);
  const clearPending = useCallback(() => { timers.current.forEach(id => window.clearTimeout(id)); timers.current.clear(); lock.current = false; }, []);
  useEffect(() => () => { clearPending(); void audio.current?.close(); }, [clearPending]);
  const sound = useCallback((frequency: number) => {
    if (muted) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current; void ctx.resume();
      const wave = ctx.createOscillator(), gain = ctx.createGain(); wave.connect(gain); gain.connect(ctx.destination);
      wave.frequency.value = frequency; wave.type = 'sine'; gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12); wave.start(); wave.stop(ctx.currentTime + .13);
    } catch { /* Sound is optional if the browser does not support audio. */ }
  }, [muted]);
  const roll = useCallback(() => {
    if (lock.current || state.phase !== 'roll' || paused || settings || rules || exitDialog) return;
    lock.current = true; setRolling(true); sound(430);
    const result = randomDice();
    for (let i = 1; i <= 7; i++) later(() => setFace(randomDice()), i * 75);
    later(() => { setFace(result); setState(rollDice(state, result)); setRolling(false); lock.current = false; sound(result === 6 ? 880 : 560); }, 650);
  }, [state, paused, settings, rules, exitDialog, later, sound]);
  const moveHorse = useCallback((token: number) => {
    if (lock.current || paused || !legalTokens(state).includes(token)) return;
    lock.current = true;
    const p = state.players[state.turn], before = p.tokens[token], target = before < 0 ? 0 : before + state.dice!;
    const steps = before < 0 ? [0] : Array.from({ length: target - before }, (_, i) => before + i + 1);
    setMotion({ player: p.id, token, progress: before });
    steps.forEach((progress, i) => later(() => { setMotion({ player: p.id, token, progress }); sound(390 + i * 55); }, (i + 1) * 105));
    later(() => { const next = moveToken(state, token); setState(next); setMotion(null); lock.current = false; if (next.winner !== null) sound(1040); }, steps.length * 105 + 130);
  }, [state, paused, later, sound]);
  useEffect(() => {
    if (!player.bot || busy || paused || finished || settings || rules || exitDialog) return;
    const id = window.setTimeout(() => { if (state.phase === 'roll') roll(); else { const token = chooseBotToken(state); if (token >= 0) moveHorse(token); } }, state.phase === 'roll' ? 950 : 650);
    return () => window.clearTimeout(id);
  }, [player.bot, state, busy, paused, finished, settings, rules, exitDialog, roll, moveHorse]);
  function openSettings() { setDraftMode(mode); setDraftCount(count); setSettings(true); }
  function restart() { clearPending(); setMode(draftMode); setCount(draftCount); setState(newGame(draftMode, draftCount)); setFace(1); setRolling(false); setMotion(null); setPaused(false); setSettings(false); }
  const message = finished ? `${state.players.find(p => p.id === state.winner)?.name} đã chiến thắng!` : paused ? 'Ván đấu đang tạm dừng' : rolling ? `${player.name} đang tung xúc xắc…` : motion ? 'Ngựa đang di chuyển…' : player.bot ? `${player.name} đang suy nghĩ…` : state.phase === 'choose' ? `Bạn có ${valid.length} ngựa có thể đi · chọn ngựa đang sáng` : mode === 'bots' ? 'Đến lượt bạn. Tung xúc xắc để bắt đầu!' : `Đến lượt ${player.name}. Tung xúc xắc!`;
  return <div className="ludo-game" style={{ '--turn-color': color.hex } as CSSProperties}>
    <MatchHeader className="ludo-header"><button className="ludo-back" onClick={() => { if (state.moves > 0 && !finished) setExitDialog(true); else onExit(); }}><ArrowLeft size={17} /><span>Sảnh game</span></button><a className="ludo-brand" href="#" onClick={e => e.preventDefault()}><span className="ludo-brand-icon"><Crown size={21} /></span> LUDO <span>NEON CLUB</span></a><div className="ludo-header-tools"><span className="ludo-free-tag">CHƠI MIỄN PHÍ</span><button onClick={() => setMuted(v => !v)} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><button onClick={() => setRules(true)} aria-label="Luật chơi"><HelpCircle size={18} /></button></div></MatchHeader>
    <main className="ludo-main">
      <section className="ludo-stage-column">
        <div className="ludo-title-row"><div><p className="ludo-overline"><span /> BOARD ARENA ORIGINAL</p><h1>Cờ cá ngựa<span>Cuộc đua bứt phá.</span></h1></div><button className="ludo-new-game" onClick={openSettings}><RotateCcw size={15} /> Ván mới</button></div>
        <div className="ludo-stage">
          <div className="ludo-stage-top"><span><Users size={13} /> {state.players.length} người chơi</span><span><Sparkles size={13} /> {mode === 'bots' ? 'Bạn & 3 bot' : 'Cùng chơi trên máy'}</span></div>
          <div className="ludo-board-scenery"><span className="ludo-orbit orbit-one" /><span className="ludo-orbit orbit-two" /><LudoBoard state={state} motion={motion} disabled={busy || paused || player.bot || finished || settings || rules} onToken={moveHorse} /></div>
          <div className="ludo-turn-strip" role="status"><span className="ludo-turn-avatar"><HorseFigure color={color.hex} /></span><div><span className="ludo-turn-label">{finished ? 'KẾT THÚC VÁN ĐẤU' : `LƯỢT CỦA ${player.name.toUpperCase()}`}</span><p>{message}</p></div><span className="ludo-turn-dot" /></div>
        </div>
        <div className="ludo-board-legend"><span><i className="legend-safe">★</i> Ô sao an toàn</span><span><i className="legend-active" /> Ngựa phát sáng có thể đi</span><span><Flag size={13} /> Đủ 4 ngựa về đích để thắng</span></div>
      </section>
      <aside className="ludo-sidebar">
        <section className="ludo-players-panel"><div className="ludo-panel-heading"><h2>Bàn đấu</h2><span>{mode === 'bots' ? 'ĐẤU BOT' : 'TẠI CHỖ'}</span></div><div className="ludo-players">{state.players.map((p, i) => {
          const c = COLORS[p.id], home = p.tokens.filter(t => t === FINISH).length, active = i === state.turn && !finished;
          return <div className={`ludo-player ${active ? 'is-turn' : ''}`} style={{ '--player-color': c.hex, '--player-glow': `${c.hex}22` } as CSSProperties} key={p.id}>
            <div className="ludo-player-avatar"><HorseFigure color={c.hex} />{p.bot && <span><Bot size={10} /></span>}</div><div className="ludo-player-name"><strong>{p.name}</strong><small>{active ? 'Đang đến lượt' : p.bot ? 'Máy tính' : c.name}</small><div className="ludo-progress">{p.tokens.map((step, n) => <span className={step === FINISH ? 'is-home' : step >= 0 ? 'is-racing' : ''} key={n} />)}</div></div><span className="ludo-home-count">{home}<small>/4</small>{home === 4 && <Trophy size={14} />}</span>
          </div>;
        })}</div></section>
        <section className="ludo-dice-panel"><div className="ludo-panel-heading"><h2>Xúc xắc may mắn</h2><Dice5 size={17} /></div><div className="ludo-dice-area"><div className={`ludo-die ${rolling ? 'is-rolling' : ''}`} role="img" aria-label={`Xúc xắc ${face} điểm`}>{Array.from({ length: 9 }, (_, i) => <i className={pipPositions[face].includes(i) ? 'pip-visible' : ''} key={i} />)}</div><span className="ludo-dice-glow" /></div><p className="ludo-dice-caption">{state.phase === 'choose' ? `Được ${state.dice} điểm · chọn ngựa để đi` : state.consecutiveSixes > 0 ? 'Bạn được thêm một lượt tung!' : 'Tung 6 để đưa ngựa xuất chuồng'}</p><button className="ludo-roll-button" onClick={roll} disabled={busy || paused || player.bot || state.phase !== 'roll'}><Dice5 size={20} />{rolling ? 'Đang tung…' : player.bot && !finished ? 'Đang chờ đối thủ…' : state.phase === 'choose' ? 'Chọn ngựa trên bàn' : finished ? 'Ván đấu kết thúc' : 'Tung xúc xắc'}<ChevronRight size={18} /></button>{state.phase === 'choose' && !player.bot && !busy && !paused && <div className="ludo-move-choices">{valid.map(token => <button key={token} onClick={() => moveHorse(token)}>Ngựa {token + 1}<ArrowUpRight size={12} /></button>)}</div>}<button className="ludo-pause" disabled={busy || finished} onClick={() => setPaused(v => !v)}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Tiếp tục ván đấu' : 'Tạm dừng ván đấu'}</button></section>
        <section className="ludo-activity"><div className="ludo-panel-heading"><h2>Diễn biến</h2><span>TRỰC TIẾP</span></div><ol aria-live="polite" aria-relevant="additions">{state.logs.slice(0, 5).map((line, i) => <li key={`${state.moves}-${i}-${line}`}><span className={i === 0 ? 'log-latest' : ''} />{line}</li>)}</ol></section>
        <div className="ludo-fair-note"><span><Crown size={15} /></span><p>Một bàn cờ. Bốn cá tính.<br /><strong>Chiến thắng bằng nước đi của bạn.</strong></p></div>
      </aside>
    </main>
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="ludo-dialog"><DialogTitle>Bắt đầu cuộc đua mới</DialogTitle><DialogDescription>Chọn cách chơi. Bản này miễn phí, không sử dụng ví xu. Bắt đầu sẽ đặt lại ván hiện tại.</DialogDescription><div className="ludo-mode-options"><button className={draftMode === 'bots' ? 'selected' : ''} onClick={() => setDraftMode('bots')}><Bot size={24} /><strong>Chơi với máy</strong><small>Bạn đối đầu 3 bot</small></button><button className={draftMode === 'local' ? 'selected' : ''} onClick={() => setDraftMode('local')}><Users size={24} /><strong>Cùng bạn bè</strong><small>2–4 người trên cùng máy</small></button></div>{draftMode === 'local' && <label className="ludo-count-label">Số người chơi<select value={draftCount} onChange={e => setDraftCount(Number(e.target.value))}>{[2,3,4].map(n => <option key={n} value={n}>{n} người</option>)}</select></label>}<button className="ludo-roll-button" onClick={restart}>Bắt đầu ván mới <ChevronRight size={18} /></button></DialogContent></Dialog>
    <Dialog open={rules} onOpenChange={setRules}><DialogContent className="ludo-dialog"><DialogTitle>Luật cá ngựa · Neon Club</DialogTitle><DialogDescription>Biến thể Ludo dễ chơi, mỗi bên có 4 ngựa.</DialogDescription><ul className="ludo-rules-list"><li>Tung được <strong>6</strong> để xuất chuồng. Xuất chuồng đặt ngựa vào ô bắt đầu, không đi thêm 6 ô.</li><li>Chọn một ngựa đi đúng số điểm. Tung 6 được thêm lượt; 3 lần 6 liên tiếp thì mất lượt tung thứ ba.</li><li>Đáp xuống ô có ngựa đối phương để đá ngựa về chuồng. Các ô có sao là ô an toàn.</li><li>Đi một vòng rồi vào đường màu của mình. Cần tung đúng số để về đích; không được đi quá đích.</li><li>Ngựa được đứng chung ô; không tạo hàng rào chặn đường. Không có nước hợp lệ thì tự chuyển lượt (tung 6 vẫn được tung tiếp).</li><li>Đưa đủ <strong>4 ngựa về đích</strong> trước để chiến thắng.</li></ul></DialogContent></Dialog>
    <Dialog open={finished && !settings} onOpenChange={open => { if (!open) openSettings(); }}><DialogContent className="ludo-dialog ludo-victory"><div className="ludo-victory-icon"><Trophy size={42} /></div><p className="ludo-overline">NHÀ VÔ ĐỊCH NEON CLUB</p><DialogTitle>{state.players.find(p => p.id === state.winner)?.name} chiến thắng!</DialogTitle><DialogDescription>Cả 4 ngựa đã về đích. Bạn đã hoàn thành cuộc đua sau {state.moves} nước đi trên bàn.</DialogDescription><button className="ludo-roll-button" onClick={openSettings}>Chơi một ván nữa <RotateCcw size={16} /></button><button className="ludo-pause" onClick={onExit}>Trở về sảnh game</button></DialogContent></Dialog>
    <Dialog open={exitDialog} onOpenChange={setExitDialog}><DialogContent className="ludo-dialog"><DialogTitle>Rời cuộc đua?</DialogTitle><DialogDescription>Ván cá ngựa hiện tại sẽ kết thúc khi bạn trở về sảnh.</DialogDescription><button className="ludo-roll-button" onClick={onExit}>Trở về sảnh game</button><button className="ludo-pause" onClick={() => setExitDialog(false)}>Ở lại bàn đấu</button></DialogContent></Dialog>
  </div>;
}
