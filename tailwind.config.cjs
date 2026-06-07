/* Build-time Tailwind config. Scans the GENERATED dist HTML so the output CSS
   contains exactly the classes the site uses (no runtime CDN engine in prod).
   Theme mirrors the old src/tw-config.js Play-CDN theme. */
module.exports = {
  content: ['./dist/**/*.html'],
  theme: {
    extend: {
      colors: { ink: '#050505', inkSoft: '#0B0B0D', ember: '#E23B4E' },
      fontFamily: {
        display: ['"Archivo"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
};
