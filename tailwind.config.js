/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores de jugador (placeholder, se afinan en la fase de UI)
        playerA: '#3b82f6', // azul
        playerB: '#ef4444', // rojo
        boardLight: '#e8e8e8',
        boardDark: '#bdbdbd',
      },
    },
  },
  plugins: [],
}
