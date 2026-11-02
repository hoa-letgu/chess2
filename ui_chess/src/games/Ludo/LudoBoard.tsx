import { BoardSurface } from '@/features/arena/MatchSurface';
import { useId } from 'react';
import { BASES, COLORS, HOME, SAFE_SQUARES, TRACK, legalTokens, tokenCoordinate } from './ludoEngine';
import type { LudoState } from './ludoEngine';

export type Motion = { player: number; token: number; progress: number };
const project = ([r, c]: [number, number]) => ({ x: 500 + (c - r) * 28, y: 405 + (r + c - 14) * 18 });
const diamond = (x: number, y: number, w = 26.8, h = 17) => `${x},${y-h} ${x+w},${y} ${x},${y+h} ${x-w},${y}`;
const safePath = 'M0 -7 2 -2 7 -2 3 1 4 6 0 3 -4 6 -3 1 -7 -2 -2 -2 Z';

export function HorseFigure({ color, number, gradient }: { color: string; number?: number; gradient?: string }) {
  return <svg viewBox="0 0 60 86" className="ludo-horse-figure" aria-hidden="true">
    <ellipse cx="30" cy="78" rx="25" ry="6" fill="#08091b77" />
    <ellipse cx="30" cy="71" rx="22" ry="9" fill={color} stroke="#ffffff60" strokeWidth="1.5" />
    <path d="M8 70v5c0 11 44 11 44 0v-5c-6 8-38 8-44 0Z" fill={color} />
    <ellipse cx="30" cy="69" rx="22" ry="8" fill="#ffffff25" stroke="#fff8" />
    <path d="M14 65c1-13 12-18 17-29l-11 7-11-6 4-12 15-13 3-9 7 10c15 5 19 18 13 31l-7 17 4 7c-9 6-25 6-34-3Z" fill={gradient ? `url(#${gradient})` : color} stroke="#ffffff80" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M38 15c12 11 8 24 2 33l-4 13M29 16 18 29l-3 7" fill="none" stroke="#ffffff65" strokeWidth="2.4" strokeLinecap="round" />
    <path d="m39 19 9 4m-8 3 10 3m-10 3 10 3m-11 3 9 3" fill="none" stroke="#0c10242b" strokeWidth="2" />
    <circle cx="28" cy="26" r="2" fill="#10142c" /><circle cx="27.5" cy="25.4" r=".6" fill="white" />
    {number !== undefined && <><circle cx="45" cy="65" r="8" fill="#171931" stroke={color} strokeWidth="1.5" /><text x="45" y="68" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">{number}</text></>}
  </svg>;
}
export default function LudoBoard({ state, motion, disabled, onToken }: { state: LudoState; motion: Motion | null; disabled: boolean; onToken: (token: number) => void }) {
  const uid = useId().replace(/:/g, ''), player = state.players[state.turn], valid = legalTokens(state);
  const tokens = state.players.flatMap(p => p.tokens.map((progress, token) => {
    const current = motion?.player === p.id && motion.token === token ? motion.progress : progress;
    const { x, y } = project(tokenCoordinate(p.id, token, current));
    const sameCell = current >= 0 ? state.players.flatMap(other => other.tokens.map((step, i) => ({ player: other.id, token: i, point: tokenCoordinate(other.id, i, step) }))).filter(t => { const point = tokenCoordinate(p.id, token, current); return t.point[0] === point[0] && t.point[1] === point[1]; }) : [];
    const rank = sameCell.findIndex(t => t.player === p.id && t.token === token);
    const offset = sameCell.length > 1 ? (rank - (sameCell.length - 1) / 2) * 8 : 0;
    return { player: p, token, x: x + offset, y, progress: current };
  })).sort((a, b) => a.y - b.y || a.x - b.x);
  return <BoardSurface className="ludo-shared-board"><svg className="ludo-board-svg" viewBox="0 0 1000 810" role="group" aria-label="Bàn cá ngựa bốn màu, góc nhìn nghiêng">
    <defs>
      <radialGradient id={`${uid}-floor`}><stop stopColor="#493a79" /><stop offset="1" stopColor="#211d3d" /></radialGradient>
      <linearGradient id={`${uid}-tile`} x2="0" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#d9d9f0" /></linearGradient>
      <linearGradient id={`${uid}-edge`} x2="0" y2="1"><stop stopColor="#625780" /><stop offset="1" stopColor="#302846" /></linearGradient>
      {COLORS.map((c, id) => <linearGradient key={id} id={`${uid}-horse-${id}`} x1="0" y1="0" x2="1" y2=".8"><stop stopColor={c.light} /><stop offset=".35" stopColor={c.hex} /><stop offset="1" stopColor={c.dark} /></linearGradient>)}
      <filter id={`${uid}-shadow`} x="-60%" y="-60%" width="220%" height="250%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#080820" floodOpacity=".5" /></filter>
    </defs>
    <ellipse cx="500" cy="461" rx="453" ry="284" fill="#08091855" />
    <ellipse cx="500" cy="426" rx="463" ry="282" fill={`url(#${uid}-floor)`} stroke="#ffffff10" strokeWidth="2" />
    <ellipse cx="500" cy="426" rx="443" ry="265" fill="none" stroke="#a599ce24" />
    <ellipse cx="500" cy="426" rx="427" ry="251" fill="none" stroke="#a599ce14" strokeDasharray="2 12" />
    <path d="M500 143 920 413 920 435 500 705 80 435 80 413Z" fill={`url(#${uid}-edge)`} stroke="#8c80b04a" />
    <path d="M500 135 920 405 500 675 80 405Z" fill="#322a50" stroke="#a295cc55" strokeWidth="2" />
    {COLORS.map((color, id) => {
      const active = state.players.some(p => p.id === id), origin = BASES[id][0], center = project([origin[0] + 1.05, origin[1] + 1.05]);
      return <g key={id} opacity={active ? 1 : .25}>
        <polygon points={diamond(center.x, center.y, 117, 75)} fill={color.hex} opacity=".11" stroke={color.hex} strokeWidth="2" />
        <polygon points={diamond(center.x, center.y, 108, 69)} fill="none" stroke={color.hex} strokeOpacity=".35" strokeDasharray="3 5" />
        {BASES[id].map((coord, i) => { const p = project(coord); return <g key={i}><ellipse cx={p.x} cy={p.y+4} rx="23" ry="14" fill="#15142e" stroke={color.hex} strokeOpacity=".4" /><ellipse cx={p.x} cy={p.y+4} rx="17" ry="10" fill={color.hex} opacity=".08" /></g>; })}
      </g>;
    })}
    {TRACK.map((coord, index) => {
      const p = project(coord), start = index % 13 === 0, safe = SAFE_SQUARES.has(index), color = COLORS[Math.floor(index / 13)];
      return <g key={`track-${index}`}>
        <polygon points={`${p.x-26.8},${p.y} ${p.x},${p.y+17} ${p.x+26.8},${p.y} ${p.x+26.8},${p.y+9} ${p.x},${p.y+26} ${p.x-26.8},${p.y+9}`} fill={start ? color.dark : '#77718e'} stroke="#11162c44" />
        <polygon points={diamond(p.x, p.y)} fill={start ? color.hex : `url(#${uid}-tile)`} stroke="#fff9" strokeWidth="1" />
        {safe && <path d={safePath} transform={`translate(${p.x} ${p.y})`} fill={start ? '#fff' : '#8b83a5'} />}
        {start && <path d={`m${p.x-13} ${p.y-3} 5 3-5 3m8-6 5 3-5 3`} fill="none" stroke="#fff9" strokeWidth="1.7" />}
      </g>;
    })}
    {HOME.flatMap((lane, id) => lane.map((coord, i) => {
      const p = project(coord), color = COLORS[id];
      return <g key={`home-${id}-${i}`}><polygon points={diamond(p.x,p.y+7)} fill={color.dark} /><polygon points={diamond(p.x,p.y)} fill={color.hex} stroke={color.light} strokeWidth="1" opacity=".92" /><text x={p.x} y={p.y+4} textAnchor="middle" fill={color.dark} fontSize="11" fontWeight="800">{i+1}</text></g>;
    }))}
    <g transform="translate(500 405)"><polygon points="0,-33 51,0 0,33 -51,0" fill="#17162d" stroke="#b69fef" strokeWidth="1.5" /><polygon points="0,-26 40,0 0,26 -40,0" fill="#51417b" /><text y="1" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" letterSpacing="2">LUDO</text><text y="12" textAnchor="middle" fill="#c6b6f0" fontSize="5.5" letterSpacing="2">NEON CLUB</text></g>
    {tokens.map(t => {
      const color = COLORS[t.player.id], selectable = !disabled && t.player.id === player.id && valid.includes(t.token);
      return <g key={`token-${t.player.id}-${t.token}`} transform={`translate(${t.x} ${t.y})`} role="button" tabIndex={selectable ? 0 : -1} aria-disabled={!selectable} aria-label={`Di chuyển ngựa ${t.token+1} của ${t.player.name}`} onClick={() => { if (selectable) onToken(t.token); }} onKeyDown={e => { if (selectable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToken(t.token); } }} className={`ludo-token ${selectable ? 'is-playable' : ''}`}>
        {selectable && <ellipse className="ludo-token-halo" cx="0" cy="3" rx="25" ry="15" fill={color.hex} fillOpacity=".3" stroke={color.light} strokeWidth="2" />}
        <g transform="translate(-19 -48)" filter={`url(#${uid}-shadow)`}><svg width="38" height="55" overflow="visible"><HorseFigure color={color.hex} gradient={`${uid}-horse-${t.player.id}`} number={t.token+1} /></svg></g>
      </g>;
    })}
    <g className="ludo-board-footnote"><text x="500" y="753" textAnchor="middle" fill="#aaa0c5" fontSize="10" letterSpacing="3">FOUR COLORS. ONE WINNER.</text><path d="M310 749h48m284 0h48" stroke="#75658c" /></g>
  </svg></BoardSurface>;
}
