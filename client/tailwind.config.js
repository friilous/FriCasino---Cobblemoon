/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        casino: {
          bg:      '#0a0a14',
          card:    '#12121f',
          border:  '#1e1e35',
          gold:    '#f0b429',
          gold2:   '#ffd700',
          purple:  '#7c3aed',
          purple2: '#a855f7',
        },
      },
      fontFamily: {
        casino: ['"Cinzel"', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-gold': 'pulse-gold 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 10px #f0b429' },
          '50%':       { boxShadow: '0 0 30px #f0b429, 0 0 60px #f0b42966' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to:   { transform: 'translateX(0)',    opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
