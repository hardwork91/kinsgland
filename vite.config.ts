import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase es grande; lo separamos en su propio chunk (solo se usa en modo online).
          firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
