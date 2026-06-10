import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      colors: { brand: { DEFAULT: '#6366f1', 500: '#6366f1', 600: '#4f46e5' } },
    },
  },
  plugins: [],
} satisfies Config;
