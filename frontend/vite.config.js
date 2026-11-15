import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is the build tool + dev server.
// defineConfig sets up:
// - The React plugin so JSX (HTML-like syntax in JS) is compiled correctly
// - A proxy so that requests to /api in the browser are forwarded to the
//   FastAPI backend on port 8000. This avoids CORS issues during development
//   because from the browser's point of view, everything is on the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Any request starting with /api gets forwarded to FastAPI
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Strip the /api prefix before forwarding — FastAPI routes start at /hotels, /auth etc.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
