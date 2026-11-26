import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:6000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:6000',
        changeOrigin: true,
      }
    }
  }
});
