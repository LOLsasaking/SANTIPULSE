# Supabase Setup 🗄️

For the **custom booking** option ([[Booking Options - Booksy vs Custom]]).

## Database table

```sql
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  service VARCHAR,                       -- haircut, manicure, etc.
  guests INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  total_price INTEGER NOT NULL DEFAULT 0,-- cents; 0 for no-payment businesses
  status VARCHAR DEFAULT 'pending',      -- pending / confirmed
  stripe_session_id VARCHAR,             -- only if payments enabled
  created_at TIMESTAMP DEFAULT now()
);
```

## Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Only if payments:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
# For emails:
RESEND_API_KEY=re_xxx
```

## Package to install (in the Next.js template)

```
npm install @supabase/supabase-js
```

> [!warning] Security — do before selling
> 1. Enable **Row Level Security (RLS)** on `bookings`.
> 2. Inserts from the public form are fine; **reading** all bookings (admin) must require auth.
> 3. Don't expose the service-role key in client code — only the anon key is public-safe.
> See the security note in [[Booking System Architecture]] and [[Build Tasks]].

## ✅ Live project (2026-05-27)

- Project ref: `cskkayagielmsuyemclt` · URL `https://cskkayagielmsuyemclt.supabase.co`
- `.env.local` written in both barber + nail; `@supabase/supabase-js` installed in both.
- Barber verified saving to live DB end-to-end (`demo:false`).
- ⚠️ **Keys were pasted in chat — rotate them** in Supabase → Settings → API → roll keys.

### The INSERT policy that's actually needed

```sql
alter table bookings enable row level security;
drop policy if exists "anyone can create a booking" on bookings;
create policy "public can insert bookings"
  on bookings for insert
  to anon, authenticated
  with check (true);
```

> [!bug] GOTCHA that cost an hour — `.select()` after insert
> The anon role can **INSERT but not SELECT** (no read policy, by design — privacy).
> So `supabase.from("bookings").insert([...]).select()` **fails with 42501** even
> though the insert itself is allowed — because returning the row needs a SELECT
> policy. **Fix: never chain `.select()` after a public insert.** Just
> `await supabase.from("bookings").insert([record])` and return the data you
> already have. Both API routes are written this way now.
>
> Symptom was misleading: PostgREST returned HTTP 401 + code 42501 on the write,
> which looks like an auth failure but was the read-back being blocked.

## Stripe test card (payment-enabled verticals only)

- Card: `4242 4242 4242 4242`
- Expiry: `12/25` · CVC: `123`
