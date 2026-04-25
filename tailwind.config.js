/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        // CSS variables — values are stored as "R G B" channels for Tailwind opacity support
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
          4: 'rgb(var(--surface-4) / <alpha-value>)',
        },
        border: 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        pending: {
          DEFAULT: '#ff6b6b',
          dim: 'rgba(255,107,107,0.12)',
          glow: 'rgba(255,107,107,0.25)',
        },
        week: {
          DEFAULT: '#5da8ff',
          dim: 'rgba(93,168,255,0.12)',
          glow: 'rgba(93,168,255,0.25)',
        },
        done: {
          DEFAULT: '#8b949e',
          dim: 'rgba(139,148,158,0.12)',
          glow: 'rgba(139,148,158,0.25)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        }
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'drag': 'var(--shadow-drag)',
        'pending-glow': '0 0 20px rgba(255,107,107,0.18)',
        'week-glow': '0 0 20px rgba(93,168,255,0.18)',
        'done-glow': '0 0 20px rgba(139,148,158,0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        pulseSubtle: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
      },
      backdropBlur: {
        xs: '4px',
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, box-shadow',
      }
    },
  },
  plugins: [],
}
