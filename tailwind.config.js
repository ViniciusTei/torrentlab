/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      'white': '#FFFFFF',
      'blue': '#1884F70',
      'red': '#1EBC99',
      'yellow': '#F9CC0D',
      'green': '#1EBC99',
      'black': '#0A070B',
      'gray': {
        100: '#807E81',
        500: '#4F4E50',
        700: '#363536',
        800: '#E8ECEF'
      }
    },
    extend: {
      spacing: {
        '0.5': '4px',
        '1': '8px',
        '2': '12px',
        '3': '16px',
        '4': '24px',
        '5': '32px',
        '6': '48px',
      }
    },
  },
  plugins: [
  ],
}

