// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy ALL /ws/ requests to Django backend
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,                // Enable WebSocket proxying
        changeOrigin: true,
        secure: false,
      },
      // Optional: proxy API calls too if you have any
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});