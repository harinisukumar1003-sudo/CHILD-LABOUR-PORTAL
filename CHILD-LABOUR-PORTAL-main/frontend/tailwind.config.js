/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f766e',
        accent: '#f59e0b',
        danger: '#dc2626',
        clrms: {
          teal: '#0b4f4b',
          tealDeep: '#073b43',
          coral: '#c94b32',
          cream: '#fffaf2',
          mint: '#e8f4ef',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      spacing: {
        section: '4rem',
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        soft: '0 12px 35px rgba(15, 23, 42, 0.08)',
        card: '0 16px 42px rgba(15, 45, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
