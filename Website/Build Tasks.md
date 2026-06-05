# Build Tasks 🛠️

What still needs building into the real templates. Context: [[Tech Stack Reality]].

## Decision recap (2026-05-27)

- Offer **both** Booksy link **and** custom Supabase form ([[Booking Options - Booksy vs Custom]]).
- Obsidian Brain first (✅ done), then build.

## Custom booking — BARBER (✅ BUILT & TESTED 2026-05-27)

Built into `barber-templates`, matches the NOIR aesthetic (gold #c9a227 on black), uses real `services`/`team` from `site.ts`. Build passes, full flow verified end-to-end with Playwright.

- [x] `src/lib/site.ts` — added `bookingMode: "booksy" | "custom"` flag (default "booksy")
- [x] `src/lib/supabase.ts` — Supabase client; **degrades to demo mode** if not configured (no crash, no install needed)
- [x] `src/app/reservar/page.tsx` — booking form (service, barber, date, time, name, email, phone, notes)
- [x] `src/app/reservar/exito/page.tsx` — confirmation page (reads search params)
- [x] `src/app/api/bookings/route.ts` — App Router route handler; validates, stores to Supabase or runs demo mode
- [x] `src/components/templates/shared.tsx` — `BookButton` now respects `bookingMode`
- [x] `src/app/api/send-confirmation/route.ts` — Resend email, **demo-safe** (logs if no RESEND_API_KEY). Fired fire-and-forget from the bookings route.
- [x] `src/app/admin/login/page.tsx` — owner login (Supabase Auth, noir theme)
- [x] `src/app/admin/bookings/page.tsx` — admin table + stats; redirects to login if no session
- [x] `src/lib/supabase-browser.ts` — browser Supabase client for the admin panel
- [x] `npm install @supabase/supabase-js` — DONE, bookings saving live (`demo:false`)

### Part B done (2026-05-27) — what's still needed to go fully live

**Admin dashboard — run this SQL** (lets logged-in owner READ; anon still can't):
```sql
create policy "authenticated can read bookings"
  on bookings for select to authenticated using (true);
```
Then **Supabase → Authentication → Users → Add user** (email+password, Auto Confirm). That's the `/admin/login` account.

**Emails — to send for real:** Resend account + verified domain, then in `.env.local`:
```
RESEND_API_KEY=re_xxx
BOOKINGS_FROM_EMAIL=reservas@tudominio.com
OWNER_EMAIL=tu-email@gmail.com
```
Until then it logs in demo mode (verified working).

**Cleanup:** ~6 probe rows + a couple test rows in the DB. Run once:
```sql
delete from bookings where email like '%test.com' or email like '%example.com' or service = 'probe' or email = 'real@cliente.com';
```

> [!success] Demo-ready today
> With `bookingMode: "custom"`, the form works *right now* with zero backend — bookings are logged server-side and the confirmation shows. Add Supabase env vars + install the package to make it persist for real.

## Custom booking — NAIL (✅ BUILT & TESTED 2026-05-27)

Built into `nail-templates` (Lux Centro de Estética), matches the **Blush** theme (powder pink #fdf2ee, rose #f4a6a0, plum #2a2024; Playfair/Oswald/Cormorant fonts). Uses the full `serviceCategories` catalog (grouped dropdown) + 4-person team. Build passes, flow verified end-to-end with Playwright.

- [x] `src/lib/supabase.ts` — same demo-safe client (uses `staff` instead of `barber`)
- [x] `src/lib/site.ts` — added `bookingMode: "whatsapp" | "custom"` (default "whatsapp"; Lux books via WhatsApp)
- [x] `src/app/reservar/page.tsx` — Blush-themed form, services grouped by category
- [x] `src/app/reservar/exito/page.tsx` — Blush confirmation page
- [x] `src/app/api/bookings/route.ts` — same route handler, demo-safe
- [x] `src/components/templates/shared.tsx` — `BookButton` respects `bookingMode`

### Part B applied to NAIL too (2026-05-27) — feature parity with barber

- [x] `src/lib/supabase-browser.ts` — browser client for admin
- [x] `src/app/api/send-confirmation/route.ts` — Blush-styled emails, demo-safe
- [x] `src/app/admin/login/page.tsx` + `src/app/admin/bookings/page.tsx` — Blush-themed admin
- [x] Booking → email chain verified end-to-end (saves live, email fires in demo)

> [!warning] Shared-table column nuance (`staff` vs `barber`)
> Both templates currently share ONE Supabase table, created with a `barber`
> column (no `staff`). Nail's "especialista" is therefore written to the
> `barber` column under the hood (the form/email/UI still say "especialista").
> This avoids needing a schema change now. **When you split nail into its own
> Supabase project**, give it a `staff` column and revert that mapping.
> First attempt 500'd with "Could not find the 'staff' column" — this is why.

> [!note] Minor polish (optional)
> On the Blush success page, the detail labels are light on the pink bg —
> slightly low contrast. Bump label opacity if it bothers a client.

### Both templates set to `bookingMode: "custom"` for demoing

Both barber and nail now default to `"custom"` so "Reservar" → your form. To
sell the Booksy/WhatsApp version to a client instead, flip back in `site.ts`.

> [!note] Match the existing patterns
> Use the template's Tailwind tokens (`text-ink`, `bg-bg-card`, `brass`, etc.), framer-motion `Reveal`, and `@/lib/site` config — don't paste generic gray-100 styling. Read `node_modules/next/dist/docs/` per the template's AGENTS.md (Next.js 16 has breaking changes).

## Keep Booksy as the alternative

- [ ] Leave `src/components/site/booking.tsx` (Booksy link) intact, or make booking mode configurable in `@/lib/site` (e.g. `bookingMode: "booksy" | "custom"`).

## Security hardening (before selling custom)

- [ ] Supabase RLS on `bookings` ([[Supabase Setup]])
- [ ] Auth on the admin dashboard (Supabase Auth) — currently the old plan had **none**
- [ ] Validate + rate-limit the public booking API route

## Testing

- [ ] Playwright (already installed) — test the full booking flow end-to-end
- [ ] Verify confirmation email actually sends

## Apply to nail template too

- [ ] Repeat the custom-booking files in `nail-templates`
- [ ] Swap services (Manicure/Pedicure/Gel/Design/Combo) + hours (10am–6pm, 1hr slots) + pink/light theme

## Custom booking — RESTAURANT (✅ availability added 2026-05-28)

Restaurant/tour templates already had booking forms, admin, and the api routes. What was missing vs. barber was **slot-availability** (taken slots disappear / capacity-aware). Restaurants are capacity-based (a turno holds many tables), not slot-exclusive.

- [x] `src/lib/site.ts` — added `slotCapacity` field to `Restaurant` (marisco 40, canario 32, casual 28). The aforo per turno.
- [x] `src/app/api/availability/route.ts` — `GET ?date=...&restaurant=<name>` → `{ booked: { "13:30": 12, … } }` (sum of guests per turno).
- [x] `src/components/booking-form.tsx` — fetches on date change; marks turnos as "Completo" or "· N plazas" when ≤6 left; caps the comensales selector to remaining; submit shows "Turno completo" when full.
- [x] `src/app/api/bookings/route.ts` — re-checks aforo before insert; **409** if turno full or party exceeds remaining. Demo-safe (no recheck when Supabase not configured).
- [x] `npm run build` clean (3 restaurants × home + reservar + exito + admin + 3 API routes = 17 routes, all green).

## Custom booking — TOUR (✅ availability added 2026-05-28)

Tours are capacity-based too — `maxPeople` is the boat/group aforo per departure.

- [x] `src/app/api/availability/route.ts` — `GET ?date=...&tour=<title>` → `{ booked: { "09:30": 6, … } }`.
- [x] `src/components/booking-form.tsx` — fetches on date change; each salida shows " · N plazas" / "· Completo"; "Personas" selector capped to remaining; submit shows "Salida completa" when full.
- [x] `src/app/api/bookings/route.ts` — re-checks aforo before insert (uses `tours.maxPeople`); **409** on overflow.
- [x] `npm run build` clean (3 tours, 16 routes).

> [!info] RLS needed (same policy as barber)
> ```sql
> create policy "public can read bookings for availability"
>   on bookings for select to anon using (true);
> ```
> Without it the availability route returns `{}` (no blocking — same as demo mode), so the form keeps working but doesn't prevent overbooking. The booking-route recheck also logs a warning and lets the booking pass rather than breaking the flow.

See [[Deployment]] when ready to ship.
