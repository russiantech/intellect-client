import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});



// // v2
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: { '@': path.resolve(__dirname, './src') },
//   },
//   server: {
//     port: 5173,
//     // Required for ngrok (and any external tunnel) to reach your dev server
//     host: true,
//     // Allow ngrok hostnames + wildcard for future tunnels
//     // allowedHosts: [
//     //   'frumentaceous-hui-capitularly.ngrok-free.dev',
//     //   '.ngrok-free.dev',   // wildcard — any ngrok subdomain
//     //   '.ngrok.io',         // wildcard — legacy ngrok domains too
//     //   'localhost',
//     // ],
//     allowedHosts: true,
//     proxy: {
//       '/api': { target: 'http://localhost:8000', changeOrigin: true },
//       '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
//     },
//   },
// });
