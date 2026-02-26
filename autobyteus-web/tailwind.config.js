
const plugin = require('tailwindcss/plugin');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          25:  "#fafafa",
          50:  "#f2f2f2",
          100: "#e6e6e6",
          200: "#cccccc",
          300: "#b3b3b3",
          400: "#999999",
          500: "#808080",
          600: "#666666",
          700: "#4d4d4d",
          800: "#333333",
          900: "#1a1a1a",
          925: "#0d0d0d",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5em'
            },
            ol: {
              paddingLeft: '1.5em'
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em'
            },
            pre: {
              backgroundColor: 'rgb(243 244 246)',
              color: '#1f2937',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              margin: '1.5rem 0',
            },
            'pre code': {
              backgroundColor: 'transparent',
              borderRadius: '0',
              padding: '0',
              color: 'inherit',
              fontSize: '0.875rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: '1.5',
            },
            code: {
              backgroundColor: 'rgb(243 244 246)',
              color: '#374151', // Changed from red to a dark gray
              padding: '0.25rem 0.4rem',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            '.dark pre': {
              backgroundColor: 'rgb(31 41 55)',
              color: 'rgb(243 244 246)',
            },
            '.dark code': {
              backgroundColor: 'rgb(31 41 55)',
              color: '#e5e7eb', // Changed from light red to light gray
            }
          }
        }
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    plugin(function({ addUtilities, addVariant }) {
      addUtilities({
        '.bg-green-striped': {
          'background-image': `linear-gradient(45deg, #0a2000 10%, transparent 10%,
            transparent 20%, #0a2000 20%, #0a2000 30%, transparent 30%, transparent 40%,
            #0a2000 40%, #0a2000 50%, transparent 50%, transparent 60%, #0a2000 60%,
            #0a2000 70%, transparent 70%, transparent 80%, #0a2000 80%, #0a2000 90%,
            transparent 90%, transparent)`,
        },
      });
      addVariant('prose-inline-code', '&.prose :where(:not(pre)>code):not(:where([class~="not-prose"] *))');
    })
  ],
}
