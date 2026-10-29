/** Cor a partir de uma variável CSS "r g b", com suporte a /opacidade. */
const tok = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  // Tema escuro: ativado por data-theme="dark" no <html> (ver src/app/theme.tsx).
  // Classes dark: só valem para o escuro explícito; as cores semânticas abaixo
  // já trocam sozinhas (inclusive no modo "system"), então prefira-as.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        outfit: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // --- Tokens semânticos (src/index.css). Use estes no código novo. ---
        bg: tok('bg'),
        surface: { DEFAULT: tok('surface'), 2: tok('surface-2') },
        ink: tok('ink'),
        muted: tok('muted'),
        line: tok('line'),
        wood: tok('wood'),
        brand: {
          DEFAULT: tok('brand'),
          hover: tok('brand-hover'),
          strong: tok('brand-strong'),
          ink: tok('brand-ink'),
        },
        success: tok('success'),
        danger: tok('danger'),
        warning: tok('warning'),
        // --- Cores legadas (telas antigas; serão removidas na limpeza) ---
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
        'raised': '0 1px 2px rgb(var(--c-shadow) / 0.06), 0 4px 16px -4px rgb(var(--c-shadow) / 0.10)',
        'overlay': '0 24px 64px -12px rgb(var(--c-shadow) / 0.35)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.55' } },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}