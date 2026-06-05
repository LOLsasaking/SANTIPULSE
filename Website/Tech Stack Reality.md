# Tech Stack Reality ⚠️

> [!warning] Important correction
> Earlier planning (in another chat) assumed your templates were **plain HTML files** and that you'd need a **separate booking app on a subdomain**. That is **not true** for the files on disk. This note records what's actually there, so plans are built on reality.

## What your templates actually are

Both templates in `F:\Website Templates\` are full **Next.js applications**, not HTML:

| Thing | Detail |
|---|---|
| Framework | **Next.js 16** (App Router, not Pages Router) |
| UI library | **React 19** |
| Language | **TypeScript** (`.tsx`, not `.jsx`) |
| Styling | **Tailwind CSS v4** |
| Animation | **framer-motion** (already installed) |
| 3D | **three.js** (already installed) |
| Icons | **lucide-react** |
| Hosting | **Vercel** (`.vercel/` config already present) |
| Testing | **Playwright** (already installed) |

## What this changes

- ❌ The old `pages/booking.jsx` plain-JavaScript code does **not** drop in cleanly — wrong router (Pages vs App), wrong language (JS vs TS), wrong patterns.
- ✅ The booking system should be built **directly into each template** as an App Router route (e.g. `/reservar` or `/booking`), not as a separate subdomain app. Cleaner, one deploy, one domain.
- ✅ You get to reuse the existing design system (Tailwind tokens, framer-motion reveals) so the booking page matches the template.

## Folder layout (barber, nail is similar)

```
barber-templates/
├── src/
│   ├── app/                  # App Router pages
│   │   ├── page.tsx          # home
│   │   ├── classic/page.tsx  # template variant
│   │   ├── noir/page.tsx     # template variant
│   │   └── urban/page.tsx    # template variant
│   └── components/
│       ├── site/             # header, hero, services, booking, etc.
│       ├── templates/        # the 3 design variants
│       └── ui/               # reveal, container-scroll, etc.
├── public/
├── package.json
└── next.config.ts
```

> [!note] Barber has 3 design variants
> `classic`, `noir`, `urban` — same content, different look. Good for showing a client options.

See [[Booking System Architecture]] and [[Build Tasks]].
