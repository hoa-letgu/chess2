import type { ReactNode } from 'react';
import './imperial-board.css';

/** The same board furniture is used by online rooms and every offline game. */
export function BoardSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`arena-board-surface ${className}`} data-arena-board-surface="true">
    {['nw', 'ne', 'sw', 'se'].map(corner => <i key={corner} className={`imperial-corner corner-${corner}`} aria-hidden="true" />)}
    {children}
  </div>;
}

export function MatchHeader({ children, className = '', mode = 'offline' }: { children: ReactNode; className?: string; mode?: 'offline' | 'online' }) {
  return <header className={`arena-match-header ${className}`}>{children}{mode === 'offline' && <span className="arena-match-mode">OFFLINE · MIỄN PHÍ</span>}</header>;
}

export function MatchPlayers({ players, turn }: { players: { name: string; detail: string }[]; turn: number }) {
  return <div className="arena-match-players" aria-label="Người chơi và lượt đi">{players.map((player, i) => <div key={i} className={i === turn ? 'is-turn' : ''} aria-current={i === turn ? 'true' : undefined}><span className="arena-player-seat">{String(i + 1).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.detail}</small></div>{i === turn && <span className="arena-player-turn">ĐẾN LƯỢT</span>}</div>)}</div>;
}
