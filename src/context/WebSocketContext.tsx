import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // const ws = new WebSocket('wss://schmegettes-backend.fly.dev');
    const ws = new WebSocket('ws://localhost:3000');


    ws.onopen = () => console.log('Connected to WebSocket server');
    ws.onclose = () => console.log('Disconnected from WebSocket server');
    ws.onerror = (error) => console.error('WebSocket error:', error);

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  return <WebSocketContext.Provider value={socket}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
