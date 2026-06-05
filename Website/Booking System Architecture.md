# Booking System Architecture 🏗️

## Where does a booking go? (the question that started this)

For the **custom Supabase** option — see [[Booking Options - Booksy vs Custom]] for the alternative.

> [!info] FAQ — answered 2026-05-27
> - **Where do bookings go?** → Supabase `bookings` table. See them in the
>   [Table Editor](https://supabase.com/dashboard/project/cskkayagielmsuyemclt/editor)
>   or via the `/admin/bookings` dashboard (login required).
> - **How does the client check them after I sell it?** → `yoursite.com/admin/login`
>   → the admin dashboard. Shows date, time, name, service, contact + an
>   "upcoming" count.
> - **Do past bookings get deleted?** → NO. They stay forever as records.
>   Nothing auto-deletes. The dashboard just separates upcoming vs all.

## Slot availability (taken slots disappear) — added 2026-05-27

`GET /api/availability?date=YYYY-MM-DD` returns the taken `booking_time`s for a
date. The form fetches this on date/barber-change and **hides taken times** from
the dropdown. The booking route also re-checks before insert (409 if the slot
was grabbed in the meantime) to prevent double-booking.

**Scope: PER-BARBER** (updated 2026-05-27). `?date=...&barber=Joel Rivas`
returns only that barber's taken times — so two barbers can each have a 3pm
appointment; only the *same* barber is blocked. Nail uses `?staff=...` (stored
in the shared `barber` column). Verified: Joel booked 16:30 → Luis still free at
16:30. Omit the param to get whole-shop view.

### Restaurant & Tour: capacity-based (added 2026-05-28)

Restaurants and tours use the same route name but a **different semantic**:
the slot isn't exclusive, it has aforo. The route returns the *sum of guests*
per slot instead of a list of taken times.

- Restaurant: `GET /api/availability?date=...&restaurant=<name>` → `{ booked: { "13:30": 12, … } }`. The form subtracts from `slotCapacity` (in `site.ts`) to show remaining.
- Tour: `GET /api/availability?date=...&tour=<title>` → same shape. The form subtracts from `maxPeople` per departure.

Both booking routes re-check aforo before insert and return **409** if the slot is full or party exceeds remaining — prevents overbooking when two clients submit concurrently.

**Needs this RLS policy** (lets public read so the form can see taken times):
```sql
create policy "public can read bookings for availability"
  on bookings for select to anon using (true);
```

> [!warning] Privacy tradeoff of that policy
> It lets the public READ booking rows (the form only uses the times, but a
> tech-savvy person could read names via the API). Fine for most local shops.
> To harden: expose only date+time via a database VIEW instead of the raw table.

```
User fills form & (optionally) pays
        ↓
Data saved to Supabase database
        ↓
Email to guest (confirmation)  +  Email to operator (notification)
        ↓
(if payment) Payment confirmed in Stripe
        ↓
User sees success page with booking details
        ↓
Operator views bookings in:
  - Email inbox (notifications)
  - Supabase dashboard
  - Admin dashboard page (optional upgrade)
```

## The three places booking data lives

1. **Supabase database** — permanent storage. The `bookings` table. See [[Supabase Setup]].
2. **Email** — guest gets a confirmation, operator gets a notification (via Resend).
3. **Stripe dashboard** — *only if payments are enabled* (tours, restaurant deposits). Not for barber/nail.

## Optional: Admin dashboard

A simple `/admin/bookings` page showing all bookings in a table + totals (count, revenue, upcoming). Sells as a premium upgrade (+€50/mo). Reads straight from Supabase.

> [!warning] Security note for admin page
> The old plan's admin page used the public anon key with no auth — anyone with the URL sees all bookings (and the table is publicly readable). Before selling this, add real auth (Supabase Auth) and Row Level Security. Tracked in [[Build Tasks]].

## How it fits the real templates

Because the templates are Next.js App Router apps ([[Tech Stack Reality]]), the booking lives as a **route inside the same app** — e.g. `/reservar` — not a separate subdomain. API routes go in `src/app/api/`.

See [[Build Tasks]] for the concrete file list.
