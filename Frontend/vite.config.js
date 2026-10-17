import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Pin to 5173 so the backend CORS list stays stable.
    // strictPort: false means Vite will try 5174, 5175 … if 5173 is busy,
    // but you should update CORS_ORIGINS in Backend/.env when that happens.
    port: 5173,
    strictPort: false,
  },
})
