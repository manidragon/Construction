/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        construction: {
          amber: '#f59e0b',
          darkamber: '#d97706',
          slate: '#1e293b',
          concrete: '#64748b',
          safety: '#ea580c'
        }
      }
    },
  },
  plugins: [],
}
