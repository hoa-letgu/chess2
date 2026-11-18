import type { ManagerOptions, SocketOptions } from 'socket.io-client';

// Start over HTTP, then upgrade. If a proxy rejects the WebSocket upgrade,
// Socket.IO can keep the established polling connection alive.
export const gameSocketOptions: Partial<ManagerOptions & SocketOptions> = {
  transports: ['polling', 'websocket'],
  tryAllTransports: true,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
};
