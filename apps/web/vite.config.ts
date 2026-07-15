import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Reliable file watching inside Docker Desktop on macOS/Windows
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    hmr: {
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? 5173),
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
