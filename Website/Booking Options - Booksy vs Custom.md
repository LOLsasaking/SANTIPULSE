# Booking Options — Booksy vs Custom 🔀

> [!success] Decision (2026-05-27)
> Offer **both**. Let the client choose. Sell whichever fits.

## Option A — Booksy link (what the barber template does NOW)

The current barber booking section (`src/components/site/booking.tsx`) is a styled card that links out to **Booksy** (a third-party booking SaaS).

- ✅ Zero backend — nothing to host, store, or maintain
- ✅ Booksy handles calendar, reminders, no-show protection
- ✅ Fastest to ship
- ❌ Client needs (and pays for) a Booksy account
- ❌ You don't own the booking data
- ❌ Sends the customer off-site

**Best for:** clients who already use Booksy, or want zero hassle.

## Option B — Custom Supabase form

Build the full flow into the template: calendar → service → time → guest info → save to Supabase → confirmation email.

- ✅ No monthly SaaS fee for the client
- ✅ You own the data (upsell admin dashboard, analytics)
- ✅ Booking stays on the client's own site/brand
- ❌ More to build + maintain
- ❌ You're responsible for reliability, security, emails

**Best for:** clients who want everything branded + self-contained, higher-tier sale.

## How to present both

Offer it as a tier choice in the pitch ([[Sales & Pitches]]):
- **"Connected" tier** → we wire your existing Booksy beautifully into the site.
- **"Owned" tier** → fully custom booking on your own site, you keep all the data.

Architecture for Option B is in [[Booking System Architecture]]. Build steps in [[Build Tasks]].
