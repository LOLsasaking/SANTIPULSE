/* Tailwind Play CDN theme (external so the CSP can forbid inline scripts). */
tailwind.config = { theme: { extend: {
  colors:{ ink:'#050505', inkSoft:'#0B0B0D', ember:'#E23B4E' },
  fontFamily:{
    display:['"Archivo"','"Arial Narrow"','system-ui','sans-serif'],
    body:['Inter','system-ui','sans-serif'],
    mono:['"Space Mono"','ui-monospace','monospace'],
  },
}}};
