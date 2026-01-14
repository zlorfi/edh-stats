/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'mtg-white': '#F0E6D2',
        'mtg-blue': '#0E68AB',
        'mtg-black': '#2C2B2D',
        'mtg-red': '#C44536',
        'mtg-green': '#5A7A3B',
        'mtg-gold': '#C8B991',
        'mtg-colorless': '#BAB0AC',
        'edh-primary': '#1a365d',
        'edh-secondary': '#2c5282',
        'edh-accent': '#3182ce',
      },
      fontFamily: {
        'mtg': ['Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
}