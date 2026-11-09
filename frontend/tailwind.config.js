/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        martti: ['Martti', 'Carter Sans', 'Calisto MT', 'Baskerville', 'Georgia', 'serif'],
        aptos: ['Aptos', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Martti', 'Carter Sans', 'Georgia', 'serif'],
        sans: ['Aptos', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: 'var(--color-primary-50, #f0f7ff)',
          100: 'var(--color-primary-100, #e0effe)',
          200: 'var(--color-primary-200, #bae0fd)',
          300: 'var(--color-primary-300, #7dc5fc)',
          400: 'var(--color-primary-400, #38aaf8)',
          500: 'var(--color-primary-500, #0e8fe9)',
          600: 'var(--color-primary-600, #1e3a5f)',
          700: 'var(--color-primary-700, #162c46)',
          800: 'var(--color-primary-800, #0f1e30)',
          900: 'var(--color-primary-900, #0a1420)',
        },
        church: {
          blue: '#1e3a5f',
          green: '#2d5a3f',
          purple: '#581c87',
          red: '#991b1b',
          gold: '#c9a227',
          amber: '#b45309',
          cream: '#faf8f5',
        },
      },
    },
  },
  plugins: [],
};
