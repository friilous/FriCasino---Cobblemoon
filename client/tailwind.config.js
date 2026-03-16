/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'casino-bg':      '#07071a',
        'casino-surface': '#0a0a20',
        'casino-surface2':'#0f0f28',
        'casino-card':    '#0a0a20',
        'casino-border':  '#1e1e40',
        'casino-border2': '#2a2a4a',
        'casino-gold':    '#f0c040',
        'casino-gold2':   '#ffd060',
        'casino-purple':  '#a040f0',
        'casino-purple2': '#c060ff',
        'casino-muted':   '#5a5a8a',
        'casino-text':    '#d8d8f0',
      },
      fontFamily: {
        casino: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
