import type { CSSProperties } from 'react';

const badgeStyle: CSSProperties = {
  position: 'absolute', right: '3%', top: '2%', width: '35%', height: '35%',
  zIndex: 5, pointerEvents: 'none', filter: 'drop-shadow(0 1px 1px #0004)',
};

export function KingResultBadge({ piece, winner }: {
  piece: string | null; winner?: 'w' | 'b' | null;
}) {
  if (!winner || (piece !== 'K' && piece !== 'k')) return null;
  const won = (piece === 'K') === (winner === 'w');
  const label = (piece === 'K' ? 'Vua trắng' : 'Vua đen') + (won ? ' thắng' : ' thua');
  return <svg viewBox="0 0 32 32" style={badgeStyle} role="img" aria-label={label}>
    <circle cx="16" cy="16" r="15" fill={won ? '#8cb843' : '#d53d31'} />
    {won ? <path fill="#fffbea" d="M5.5 10.5l6 4.3L16 7l4.5 7.8 6-4.3-2.4 12.3H7.9z" /> :
      <g fill="#251912" transform="rotate(-65 16 16)">
        <path d="M14.5 4h3v3h3v3h-3v3h-3v-3h-3V7h3z"/>
        <path d="M8 13q3-3 8 0 5-3 8 0 2 3-1 6l-3 4h-8l-3-4q-3-4-1-6zm2 11h12l1 3H9z"/>
      </g>}
  </svg>;
}
