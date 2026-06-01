/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif:   ["'EB Garamond'", 'Georgia', 'serif'],
        display: ["'Playfair Display'", 'Georgia', 'serif'],
        ui:      ["'Jost'", 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0d0b08',
          900: '#110e0a',
          800: '#1e1a14',
          700: '#2a2318',
          600: '#3a3025',
          500: '#5a4d3c',
          400: '#7a6a55',
          300: '#9a8870',
          200: '#c9b99a',
          100: '#e8d5b0',
        },
        gold:   { DEFAULT: '#c8860a', dark: '#8b4513' },
      },
      boxShadow: {
        'book': '4px 0 24px rgba(0,0,0,0.7), -2px 0 10px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
