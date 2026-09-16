/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sigma Computing's real brand palette (sigmacomputing.com), observed
        // directly from their production CSS — not a generic SaaS palette.
        brand: {
          50: '#eef4ff',
          500: '#1a70f1', // primary CTA blue
          600: '#155ac1', // hover
          700: '#08377e', // active
        },
        mint: {
          400: '#4cec8c', // secondary accent (pill buttons)
          500: '#34d17a', // divider
          border: '#1fa855',
          ink: '#292929',  // text sitting on top of mint
        },
        ink: {
          primary: '#1c1e1e',   // near-black, not pure black
          secondary: '#767474', // secondary/body gray
          950: '#0a0a0a',
        },
        chart: {
          orange: '#f05100',
          teal: '#009588',
          tealDark: '#104e64',
          amber: '#fcbb00',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      boxShadow: {
        // Sigma's cards use a huge, near-invisible, blue-tinted diffuse glow —
        // not a crisp drop shadow.
        card: '0px 16px 50px 0px rgba(117,131,163,0.05)',
        elevated: '0px 16px 50px 0px rgba(117,131,163,0.05), 0px 249px 100px 0px rgba(117,131,163,0.03)',
      },
    },
  },
  plugins: [],
};
