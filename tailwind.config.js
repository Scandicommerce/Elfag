/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'elfag-dark': '#1e3a8a',   // Modern deep blue
        'elfag-light': '#3b82f6',  // Bright blue
        'elfag-accent': '#06b6d4', // Cyan accent
        'elfag-bg': '#f8fafc',     // Light background
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'industrial': '4px 4px 0 0 #1e3a8a',
        'modern': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
};