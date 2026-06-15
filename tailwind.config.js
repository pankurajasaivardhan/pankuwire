/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pw: {
          bg: '#FFFFFF', panel: '#FAFAFA', border: '#E2E2E2',
          muted: '#888888', dark: '#0A0A0A',
          up: '#1A7A3C', down: '#C0392B',
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
