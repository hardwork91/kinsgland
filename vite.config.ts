import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En dev se sirve en "/", en build (GitHub Pages project) en "/kinsgland/".
  base: command === 'build' ? '/kinsgland/' : '/',
  // Expone el dev server en la red local (para verlo desde el móvil en la misma WiFi).
  server: { host: true },
  build: {
    // Salida a docs/ para servir GitHub Pages desde main /docs.
    outDir: 'docs',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
}))
