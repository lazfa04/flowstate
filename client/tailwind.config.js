/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#07070a',
        surface: '#111116',
        surface2: '#19191f',
        accent1: '#8b85ff',
        accent2: '#3dd6b0',
        accent3: '#ff6b9d',
        accent4: '#f0b429',
        accent5: '#5cb8ff',
        border: '#2a2a33',
        text: {
          primary: '#f4f4f6',
          muted: '#8b8b98',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.04), 0 18px 40px -24px rgba(0,0,0,0.7)',
        pop: '0 24px 80px -20px rgba(0,0,0,0.65)',
      },
      borderRadius: {
        fs: '14px',
      },
    },
  },
  plugins: [],
}
