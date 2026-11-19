import { BoardSurface } from '@/features/arena/MatchSurface';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { BASES, COLORS, FINISH, HOME, SAFE_SQUARES, TRACK, legalTokens, tokenCoordinate } from './ludoEngine';
import type { LudoState } from './ludoEngine';
import type { LudoBeat } from './ludoMotion';
import './ludo-kawaii.css';

export type { Motion } from './ludoMotion';
const CELL = 40, px = (n: number) => n * CELL + CELL / 2;
const star = 'M0 -9 2.6 -3 9 -2.6 4 1.6 5.6 8 0 4.5 -5.6 8 -4 1.6 -9 -2.6 -2.6 -3Z';

export function HorseFigure({ color, number, dark, light }: { color: string; number?: number; dark?: string; light?: string }) {
  const mane = light ?? '#fff', edge = dark ?? '#7a4a9a';
  return <svg viewBox="0 0 60 70" className="ludo-horse-figure" aria-hidden="true">
    <ellipse cx="30" cy="66" rx="19" ry="4" fill="#3a1f5533" />
    <path d="M13 50c-9 0-10 10-6 13 1-5 5-6 9-6Z" fill={mane} stroke={edge} strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="17" y="54" width="8" height="11" rx="4" fill={color} stroke={edge} strokeWidth="1.5" />
    <rect x="35" y="54" width="8" height="11" rx="4" fill={color} stroke={edge} strokeWidth="1.5" />
    <ellipse cx="30" cy="50" rx="18" ry="13" fill={color} stroke={edge} strokeWidth="1.5" />
    <path d="M13 17 15 2l11 8Zm34 0L45 2 34 10Z" fill={color} stroke={edge} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="m16 12 .8-6 5 3.8Zm28 0-.8-6-5 3.8Z" fill="#ffb3cf" />
    <circle cx="30" cy="28" r="20" fill={color} stroke={edge} strokeWidth="1.5" />
    <path d="M20 11q4-9 10-3 4-7 10 3-10-2-20 0Z" fill={mane} stroke={edge} strokeWidth="1.2" strokeLinejoin="round" />
    <ellipse cx="30" cy="37" rx="11" ry="7.5" fill="#fff" opacity=".85" />
    <circle cx="26.5" cy="37" r="1.1" fill={edge} /><circle cx="33.5" cy="37" r="1.1" fill={edge} />
    <ellipse cx="21.5" cy="27" rx="4.2" ry="5.4" fill="#2a1b3d" /><ellipse cx="38.5" cy="27" rx="4.2" ry="5.4" fill="#2a1b3d" />
    <circle cx="23" cy="25" r="1.8" fill="#fff" /><circle cx="40" cy="25" r="1.8" fill="#fff" /><circle cx="20.5" cy="29" r=".9" fill="#fff" /><circle cx="37.5" cy="29" r=".9" fill="#fff" />
    <ellipse cx="13.5" cy="35" rx="4" ry="2.6" fill="#ff8fb3" opacity=".7" /><ellipse cx="46.5" cy="35" rx="4" ry="2.6" fill="#ff8fb3" opacity=".7" />
    <path d="M27 41q3 2.4 6 0" fill="none" stroke={edge} strokeWidth="1.3" strokeLinecap="round" />
    {number !== undefined && <><circle cx="47" cy="55" r="8" fill="#fff" stroke={edge} strokeWidth="1.5" /><text x="47" y="58.5" textAnchor="middle" fill={edge} fontSize="10" fontWeight="900">{number}</text></>}
  </svg>;
}

const faces: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export function LuckyDice({ value, rolling }: { value: number; rolling: boolean }) {
  const [tick, setTick] = useState(0), shown = rolling ? (value + tick) % 6 + 1 : value;
  useEffect(() => {
    if (!rolling) return;
    const id = window.setInterval(() => setTick(t => t + 1), 90);
    return () => window.clearInterval(id);
  }, [rolling]);
  return <div className={`lk-die ${rolling ? 'rolling' : 'landed'}`} role="img" aria-label={`Xúc xắc ${shown} điểm`}>{Array.from({ length: 9 }, (_, i) => <i key={i} className={faces[shown].includes(i) ? 'pip' : ''} />)}</div>;
}

export default function LudoBoard({ state, beat = null, disabled, onToken, onSkip }: { state: LudoState; beat?: LudoBeat | null; disabled: boolean; onToken: (token: number) => void; onSkip?: () => void }) {
  const player = state.players[state.turn], valid = disabled || beat ? [] : legalTokens(state), motion = beat?.motion ?? null;
  const placed = state.players.flatMap(p => p.tokens.map((own, token) => {
    const progress = motion?.player === p.id && motion.token === token ? motion.progress : own, [r, c] = tokenCoordinate(p.id, token, progress);
    return { p, token, progress, key: `${r},${c}`, x: px(c), y: px(r) };
  }));
  const tokens = placed.map(t => {
    const same = placed.filter(o => o.key === t.key && t.progress >= 0), rank = same.findIndex(o => o.p.id === t.p.id && o.token === t.token);
    return { ...t, x: t.x + (same.length > 1 ? (rank - (same.length - 1) / 2) * 11 : 0), small: same.length > 1 };
  }).sort((a, b) => a.y - b.y);
  const flying = new Map((beat?.kicked ?? []).map(k => [`${k.player}-${k.token}`, k]));
  const lane = beat?.kind === 'lane' || beat?.kind === 'finish' ? beat.player : -1;
  return <BoardSurface className="ludo-shared-board lk-surface">
    <div className="lk-wrap" data-beat={beat?.kind ?? 'idle'}>
      <svg className="ludo-board-svg lk-svg" viewBox="0 0 600 600" role="group" aria-label="Bàn cờ cá ngựa bốn màu, nhìn từ trên xuống">
        <rect x="0" y="0" width="600" height="600" rx="26" fill="#fff8ee" />
        {COLORS.map((c, id) => {
          const active = state.players.some(p => p.id === id), x = id === 1 || id === 2 ? 360 : 0, y = id >= 2 ? 360 : 0;
          return <g key={id} opacity={active ? 1 : .4}>
            <rect x={x + 6} y={y + 6} width="228" height="228" rx="34" fill={c.light} stroke={c.hex} strokeWidth="4" />
            <rect x={x + 36} y={y + 36} width="168" height="168" rx="30" fill="#fff" opacity=".6" />
            {BASES[id].map((b, i) => <g key={i}><circle cx={px(b[1])} cy={px(b[0])} r="22" fill="#fff" stroke={c.hex} strokeWidth="3" strokeDasharray="4 4" /></g>)}
          </g>;
        })}
        {TRACK.map(([r, c], i) => {
          const start = i % 13 === 0, color = COLORS[Math.floor(i / 13)];
          return <g key={i}>
            <rect x={c * CELL + 2} y={r * CELL + 2} width={CELL - 4} height={CELL - 4} rx="9" fill={start ? color.hex : '#fff'} stroke={start ? color.dark : '#e6d8ef'} strokeWidth="2" />
            {SAFE_SQUARES.has(i) && <path d={star} transform={`translate(${px(c)} ${px(r)}) scale(.75)`} fill={start ? '#fff' : '#ffcf4a'} stroke={start ? 'none' : '#d79b14'} strokeWidth="1" />}
          </g>;
        })}
        {HOME.map((cells, id) => cells.map(([r, c], i) => <rect key={`${id}-${i}`} className={`lk-lane ${lane === id ? 'rainbow' : ''}`} style={{ animationDelay: `${i * 55}ms` }} x={c * CELL + 2} y={r * CELL + 2} width={CELL - 4} height={CELL - 4} rx="9" fill={COLORS[id].hex} fillOpacity={.45 + i * .1} stroke={COLORS[id].dark} strokeWidth="2" />))}
        <g>
          {COLORS.map((c, id) => {
            const pts = [[[240, 240], [240, 360], [300, 300]], [[240, 240], [360, 240], [300, 300]], [[360, 240], [360, 360], [300, 300]], [[240, 360], [360, 360], [300, 300]]][id];
            return <polygon key={id} points={pts.map(p => p.join(',')).join(' ')} fill={c.hex} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />;
          })}
          <circle cx="300" cy="300" r="20" fill="#fff" stroke="#ffcf4a" strokeWidth="4" /><text x="300" y="307" textAnchor="middle" fontSize="20">👑</text>
        </g>
        {beat?.kind === 'finish' && <text className="lk-crown" x={px(HOME[beat.player][5][1])} y={px(HOME[beat.player][5][0]) - 22} textAnchor="middle" fontSize="26">👑</text>}
        {tokens.map(t => {
          const color = COLORS[t.p.id], selectable = valid.includes(t.token) && t.p.id === player.id, fly = flying.get(`${t.p.id}-${t.token}`);
          const [br, bc] = BASES[t.p.id][t.token], active = motion?.player === t.p.id && motion.token === t.token;
          const style = { transform: `translate(${t.x}px,${t.y}px)`, '--dx': `${px(bc) - t.x}px`, '--dy': `${px(br) - t.y}px` } as CSSProperties;
          return <g key={`${t.p.id}-${t.token}`} className={`lk-token ${selectable ? 'is-playable' : ''} ${fly ? 'is-kicked' : ''} ${beat?.kind === 'exit' && active ? 'is-exit' : ''}`} style={style} role="button" tabIndex={selectable ? 0 : -1} aria-disabled={!selectable} aria-label={`Ngựa ${t.token + 1} của ${t.p.name}${t.progress === FINISH ? ', đã về đích' : t.progress < 0 ? ', trong chuồng' : ''}`}
            onClick={() => { if (selectable) onToken(t.token); }} onKeyDown={e => { if (selectable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToken(t.token); } }}>
            <g className={`lk-bob ${active && beat?.kind === 'hop' ? 'hop' : ''} ${t.p.id === player.id && !beat ? 'idle' : ''}`}>
              {selectable && <circle className="lk-halo" r="22" cy="2" fill={color.hex} fillOpacity=".35" stroke="#fff" strokeWidth="3" />}
              <svg x={t.small ? -13 : -17} y={t.small ? -28 : -34} width={t.small ? 26 : 34} height={t.small ? 30 : 40} overflow="visible"><HorseFigure color={color.hex} dark={color.dark} light={color.light} number={t.token + 1} /></svg>
            </g>
          </g>;
        })}
        {beat?.kind === 'kick' && beat.at && <text className="lk-boom" x={px(beat.at[1])} y={px(beat.at[0]) - 26} textAnchor="middle">{beat.text}</text>}
      </svg>
      {beat?.kind === 'win' && <div className="lk-win" role="status">
        <div className="lk-fireworks" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties}>✦</i>)}</div>
        <div className="lk-dancers" aria-hidden="true">{[0, 1, 2, 3].map(n => <span key={n} style={{ animationDelay: `${n * 120}ms` }}><HorseFigure color={COLORS[beat.player].hex} dark={COLORS[beat.player].dark} light={COLORS[beat.player].light} /></span>)}</div>
        <strong>🏆 {state.players.find(p => p.id === beat.player)?.name} chiến thắng!</strong>
        <button type="button" onClick={onSkip}>Bỏ qua</button>
      </div>}
    </div>
  </BoardSurface>;
}
