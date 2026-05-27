import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base para GitHub Pages (proyecto): https://hardwork91.github.io/kinsgland/
  base: '/kinsgland/',
  // Expone el dev server en la red local (para verlo desde el móvil en la misma WiFi).
  server: { host: true },
  build: {
    // Salida a docs/ para servir GitHub Pages desde main /docs.
    outDir: 'docs',
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
