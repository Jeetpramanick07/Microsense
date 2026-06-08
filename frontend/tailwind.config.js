/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      colors: {
        surface: '#f7f9fb',
        'surface-container': '#eceef0',
        'surface-container-low': '#f2f4f6',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        outline: '#737686',
        'outline-variant': '#c3c6d7',
        primary: '#004ac6',
        'primary-container': '#2563eb',
        secondary: '#00687a',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434655',
      },
    },
  },
  plugins: [],
};
