import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

// One account may have several game/admin tabs. The server counts the union of
// their socket connections rather than summing time per tab.
export function useArenaPresence() {
  useEffect(() => {
    let socket: Socket | null = null, userId: string | null = null, stopped = false, checking = false, pending = false;
    const check = async () => {
      if (checking) { pending = true; return; }
      checking = true;
      try {
        const response = await fetch('/api/arena/me', { credentials: 'same-origin' });
        const data = response.ok ? await response.json() : null;
        if (stopped) return;
        const next = data?.user?.id ?? null;
        if (next !== userId) { socket?.disconnect(); socket = null; userId = next; }
        if (next && !socket) socket = io({ auth: { activityOnly: true }, path: '/arena-socket', transports: ['websocket', 'polling'] });
      } catch { /* Recheck when the API returns; existing sockets reconnect. */ }
      finally { checking = false; if (pending && !stopped) { pending = false; void check(); } }
    };
    void check(); const timer = setInterval(() => void check(), 60000);
    const onAuth = () => void check();
    window.addEventListener('arena-auth-changed', onAuth);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener('arena-auth-changed', onAuth); socket?.disconnect(); };
  }, []);
}
