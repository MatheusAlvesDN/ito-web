/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        outfit: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        party: {
          blue: '#2563EB',
          blueHover: '#1D4ED8',
          orange: '#F97316',
          green: '#34D399',
          bg: '#F4F5F9',
          dark: '#1F2937',
          gray: '#6B7280',
          card: '#FFFFFF',
        },
        slate: {
          955: '#050814',
          855: '#111b2e',
          850: '#152035',
          655: '#3f4f66',
          450: '#7e8fa6',
          355: '#97a8c0',
          350: '#a3b3c9',
        },
        yellow: {
          450: '#eab308',
          350: '#fde047',
        },
        purple: {
          650: '#7e22ce',
        },
        red: {
          650: '#dc2626',
          955: '#1f0606',
        },
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}