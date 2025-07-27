// /client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist', // Output to client/ so Vercel can serve it
    emptyOutDir: false,  // Prevent wiping out client/src etc.
  }
})

