import { useState, useEffect, useCallback } from 'react';
import type { TelemetryData } from '../types';     // ← fixed here

export const useTelemetry = () => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws/telemetry/');

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({ command: 'get_latest' }));
    };

    socket.onmessage = (event) => {
      try {
        const raw = event.data;
        console.log('Raw WS message:', raw);

        const parsed = JSON.parse(raw);

        // Safeguard faults field
        if (parsed.faults) {
          if (typeof parsed.faults === 'string') {
            try {
              parsed.faults = JSON.parse(parsed.faults);
            } catch {
              parsed.faults = parsed.faults
                .replace(/[\[\]"]/g, '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
            }
          }
          if (!Array.isArray(parsed.faults)) {
            parsed.faults = [];
          }
        } else {
          parsed.faults = [];
        }

        setData(parsed as TelemetryData);
      } catch (err) {
        console.error('Failed to parse telemetry message:', err, 'Raw:', event.data);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setData(null);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command }));
      console.log('Sent command:', command);
    } else {
      console.warn('Cannot send command - WebSocket not open');
    }
  }, [ws]);

  return { data, sendCommand };
};