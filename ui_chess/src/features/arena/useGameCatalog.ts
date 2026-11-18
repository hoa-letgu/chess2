import { useEffect, useState } from 'react';
import type { ArenaGame } from './game-types';

export type CatalogGame = { id: ArenaGame; name: string; mode?: 'puzzle' | 'online'; maintenance: boolean; message: string; version: number; updated: number | null };
export function useGameCatalog() {
  const [games, setGames] = useState<CatalogGame[] | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); let loading = false;
    const load = async () => {
      if (loading) return; loading = true;
      try {
        const response = await fetch('/api/arena/games', { signal: abort.signal, cache: 'no-store' });
        if (!response.ok) throw Error('Không tải được danh sách trò chơi.');
        const data = await response.json(); if (!abort.signal.aborted) { setGames(data.games); setError(''); }
      } catch (err) { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Không tải được danh sách trò chơi.'); }
      finally { loading = false; }
    };
    void load(); const timer = setInterval(() => void load(), 5000);
    window.addEventListener('focus', load); window.addEventListener('arena-games-changed', load);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('arena-games-changed', load); };
  }, []);
  return { games, error, available: (id: string | null) => !!games?.some(game => game.id === id && !game.maintenance) };
}
