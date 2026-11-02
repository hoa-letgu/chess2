import type { ReactNode } from 'react';
import './offline-arena.css';

export default function OfflineArena({ game, title, children }: { game: string; title: string; children: ReactNode }) {
  return <div className="offline-arena" data-game={game} aria-label={`${title} · Chế độ offline`}>{children}</div>;
}
