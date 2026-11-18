// context/SocketProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from 'react';
import { io, type Socket } from "socket.io-client";

const SocketContext = createContext<Socket|null>(null);

export const SocketProvider = ({ children }:{children:ReactNode}) => {
  const [socket] = useState<Socket>(()=>io({autoConnect:false,transports:['websocket'],reconnection:true}));

  useEffect(() => {
    // Network connection starts only after mount; the URL follows the page.
    const s = socket;
    s.connect();

    // Debug
    const connected=()=>console.log("🔌 Socket connected:",s.id);
    const disconnected=()=>console.log("❌ Socket disconnected");
    s.on("connect",connected);
    s.on("disconnect",disconnected);
    
    return () => {
      s.disconnect();
      s.off('connect',connected);s.off('disconnect',disconnected);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Existing game modules import their provider and hook from this entry point.
// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);
