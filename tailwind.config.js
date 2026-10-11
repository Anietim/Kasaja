/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // KASAJA exact palette
        canvas:  '#080A0D',
        card:    '#11151A',
        surface: {
          DEFAULT: '#11151A',
          raised:  '#161C23',
          overlay: '#1C242E',
          border:  '#1F2933',
        },
        // New brand accent — violet → cyan
        brand: {
          violet: '#7C3AED',
          cyan:   '#06B6D4',
          pink:   '#EC4899',
          // Violet shades for components
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7C3AED',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
        muted: 'rgba(255,255,255,0.45)',
        // Semantic
        success: '#10B981',
        error:   '#ef4444',
        warning: '#f59e0b',
        info:    '#06B6D4',
      },
      backgroundImage: {
        // Main hero gradient: violet → cyan → pink
        'brand-gradient':   'linear-gradient(135deg, #7C3AED 0%, #06B6D4 55%, #EC4899 100%)',
        'brand-gradient-h': 'linear-gradient(90deg,  #7C3AED 0%, #06B6D4 55%, #EC4899 100%)',
        'brand-gradient-v': 'linear-gradient(180deg, #7C3AED 0%, #06B6D4 55%, #EC4899 100%)',
        'violet-glow':      'radial-gradient(ellipse at top, rgba(124,58,237,0.18) 0%, transparent 60%)',
        'card-shine':       'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight:   '-0.02em',
        wide:    '0.06em',
        wider:   '0.1em',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-sm':    '0 0 12px rgba(124,58,237,0.3)',
        'glow':       '0 0 24px rgba(124,58,237,0.4)',
        'glow-cyan':  '0 0 24px rgba(6,182,212,0.35)',
        'glow-pink':  '0 0 24px rgba(236,72,153,0.3)',
        'card':       '0 2px 16px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
