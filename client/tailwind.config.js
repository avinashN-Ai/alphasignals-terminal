/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0E14',
          card: '#151922',
          border: '#232936',
          hover: '#1B2230',
          text: '#F1F5F9',
          muted: '#94A3B8'
        },
        trade: {
          green: '#10B981',
          greenBg: 'rgba(16, 185, 129, 0.12)',
          red: '#EF4444',
          redBg: 'rgba(239, 68, 68, 0.12)',
          blue: '#3B82F6',
          gold: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}
