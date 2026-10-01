/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'modern-bg': '#020B13',
        'modern-surface': '#262626',
        'modern-gold': '#DAAB2D',
        'modern-gold-dark': '#A57A03',
        'modern-plum': '#400128',
      },
    },
  },
  plugins: [],
}
