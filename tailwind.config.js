/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./journal.html",
    "./privacy.html",
    "./terms.html",
    "./character-card.html",
    "./main.js",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Void Palette
        void: '#0A0A0F',
        pit: '#111218',
        shadow: '#0D0E14',
        dim: '#141620',
        smoke: '#484A5C',
        light: '#F4F0E8',
        
        // Gold Palette
        'gold-deep': '#5C3A00',
        'gold-mid': '#C8871E',
        'gold-bright': '#E8A832',
        'gold-glow': '#F5C855',
        
        // Neon Palette
        'neon-pink': '#FF2878',
        'neon-teal': '#00E8CC',
        'neon-purple': '#8844FF',
        'neon-red': '#FF1A30',
      },
      fontFamily: {
        'display': ['Bebas Neue', 'sans-serif'],
        'script': ['Cormorant Garamond', 'serif'],
        'soft': ['Inter', 'sans-serif'],
        'cinematic': ['DM Serif Display', 'serif'],
        'editorial': ['Playfair Display', 'serif'],
        'counter': ['Space Mono', 'monospace'],
        'mono': ['DM Mono', 'monospace'],
      },
      animation: {
        'scroll-pulse': 'scrollPulse 2s infinite ease-in-out',
        'grid-drift': 'gridDrift 60s linear infinite',
        'aurora-a': 'auroraA 18s ease-in-out infinite alternate',
        'aurora-b': 'auroraB 22s ease-in-out infinite alternate',
        'aurora-c': 'auroraC 16s ease-in-out infinite alternate',
        'flap-left': 'flapLeft 0.15s infinite alternate ease-in-out',
        'flap-right': 'flapRight 0.15s infinite alternate ease-in-out',
        'float-card': 'floatCard 6s ease-in-out infinite',
      },
      keyframes: {
        scrollPulse: {
          '0%': { top: '-100%' },
          '100%': { top: '100%' }
        },
        gridDrift: {
          'from': { transform: 'translate(0, 0)' },
          'to': { transform: 'translate(32px, 32px)' }
        },
        auroraA: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(8vw,-5vh) scale(1.08)' },
          '100%': { transform: 'translate(-4vw,7vh) scale(0.96)' }
        },
        auroraB: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-6vw,5vh) scale(1.1)' },
          '100%': { transform: 'translate(5vw,-4vh) scale(0.94)' }
        },
        auroraC: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-7vw,-6vh) scale(1.06)' },
          '100%': { transform: 'translate(6vw,5vh) scale(1.02)' }
        },
        flapLeft: {
          '0%': { transform: 'rotateY(15deg)' },
          '100%': { transform: 'rotateY(70deg)' }
        },
        flapRight: {
          '0%': { transform: 'rotateY(-15deg)' },
          '100%': { transform: 'rotateY(-70deg)' }
        },
        floatCard: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
  // Performance optimizations
  corePlugins: {
    // Disable unused plugins
    preflight: true,
  },
  // Purge unused styles in production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      "./index.html",
      "./journal.html",
      "./privacy.html",
      "./terms.html",
      "./character-card.html",
      "./main.js",
      "./components/**/*.{js,jsx}",
      "./src/**/*.{js,jsx}"
    ],
    options: {
      safelist: [
        'active',
        'visible',
        'scrolling',
        'low-perf',
        /^cursor-/,
        /^card-/,
        /^hero-/,
        /^work-/,
      ]
    }
  }
}
