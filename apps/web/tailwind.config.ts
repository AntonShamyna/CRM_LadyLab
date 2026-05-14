import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#F7F8FA',
        ink: '#17201D',
        teal: '#0F766E',
      },
      borderRadius: {
        crm: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config;
