import { useEffect, useState, useRef } from 'react';
import type { TelemetryData } from '../types';

export const useTelemetry = () => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
  const url = `ws://localhost:8000/ws/telemetry/`;
  console.log("Connecting to:", url);

  const socket = new WebSocket(url);
  socketRef.current = socket;

  socket.onopen = () => {
    console.log("WebSocket connected");
    socket.send(JSON.stringify({ command: "get_latest" }));
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      setData(parsed);
    } catch (err) {
      console.error("Parse error:", err);
    }
  };

  socket.onerror = (err) => console.error("WS error:", err);

  socket.onclose = (e) => {
    console.log("WS closed:", e.code, e.reason);
    setTimeout(connect, 2000);
  };
};

    connect();

    return () => {
      socketRef.current?.close(1000, "Unmounting");
    };
  }, []);

  const sendCommand = (command: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command }));
    }
  };

  return { data, sendCommand };
};