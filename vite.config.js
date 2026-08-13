import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Defaults to the local API. Point it at a deployed one to develop the client
// against real data without adding localhost to that deployment's CORS
// allowlist — proxying keeps the browser same-origin, so CORS never applies.
const API_TARGET = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3000';
const WS_TARGET = API_TARGET.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Same-origin in dev so the API's signed cookies (auth + the device id
      // the default dedup mode depends on) are actually sent and stored.
      '/api': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: WS_TARGET, ws: true },
      // Outside /api, but the client reads its feature flags from it. Without
      // this the dev server answers with index.html and every flag looks off.
      '/health': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the respondent path off the dashboard's vendor weight — the
        // brief's < 1.5 s on 3G target applies to the poll page, which is
        // also the acquisition surface.
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
