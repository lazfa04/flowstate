/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080910',
        surface: '#10121c',
        surface2: '#1C2035',
        accent1: '#6C63FF',
        accent2: '#00D4AA',
        accent3: '#FF6B9D',
        accent4: '#FFB84C',
        accent5: '#4FC3F7',
        border: '#2A2F47',
        // Maps to utilities `text-text-primary` and `text-text-muted`
        text: {
          primary: '#F0F0F5',
          muted: '#7A7F9A',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
