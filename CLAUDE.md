markdown# Pet Lodge JO — CLAUDE.md

## Project Overview
Pet boarding and services web app for a business in Amman, Jordan.
- **Live:** https://pet-lodge.vercel.app
- **GitHub:** https://github.com/najeeb84-petlodge/pet-lodge
- **Local:** C:\Projects\pet-lodge
- **Supabase project:** qcwbkpcwtxpokgseethp.supabase.co
- **Brand colors:** `#2d3a1e`, `#5a7a2e`, `#7aa63c`, `#eef4e2`

---

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database + Auth:** Supabase (REST API only — see Architecture Rules)
- **Email:** Resend (via Supabase Edge Functions only)
- **Deployment:** Vercel
- **Version control:** GitHub

---

## Architecture Rules — READ BEFORE WRITING ANY CODE

### No Supabase JS client
The Supabase JS client is NOT used anywhere in this project (except one legacy
calendar file — do not refactor it). All database and auth calls use direct
`fetch()` to Supabase REST endpoints.

### Auth token
Stored in localStorage under the key:
`sb-qcwbkpcwtxpokgseethp-auth-token`

Read it like this:
```js
const session = JSON.parse(
  localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
);
const token = session?.access_token;
```

### Role
Always read from `user_metadata`, never from the profiles table:
```js
const role = session?.user?.user_metadata?.role;
```

### Standard API call pattern
Every Supabase REST call requires BOTH headers:
```js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const res = await fetch(`${SUPABASE_URL}/rest/v1/table_name?select=*`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }
});
```

---

## Database Schema — CRITICAL FACTS

### `bookings` table (denormalized — no FK joins)
- Customer fields stored flat: `customer_first_name`, `customer_last_name`,
  `customer_email`, `customer_phone`, `customer_whatsapp`
- `pets_data` — jsonb array of pet objects
- `service_details` — jsonb with shape:
  `{ perPet[], serviceOptions, line_items[], total_amount }`
- `line_items` shape:
  `{ label, amount, unit_price, quantity, unit, num_pets, note? }`
- `service_type` valid values: `boarding`, `day_camp`, `daycamp`,
  `dog_walking`, `dogwalking`, `grooming`, `training`, `international`,
  `transport`, `vet_transport`
- Never use FK joins when querying bookings — read denormalized columns directly

### `profiles` table
Columns: `first_name`, `last_name`, `phone`, `whatsapp_number`,
`address_neighbourhood`, `address_street`, `address_flat`,
`how_they_heard` (jsonb), `newsletter_preferences` (jsonb)

### `pets` table
- FK to owner is `owner_id` — NOT `user_id`
- `gender` check constraint: must be lowercase `male` or `female`
- `type` check constraint: must be lowercase `dog` or `cat`
- Other columns: `vet_contact`, `medication_notes`, `photo_url`

### `payments` table
- Columns that exist: `booking_id`, `amount`, `method`, `notes`, `recorded_by`
- There is NO `status` column — never include it in INSERT payloads

### `services` table
Valid categories: `boarding`, `grooming`, `walking`, `transport`, `training`,
`international`, `daycamp`, `grooming_addon`, `training_addon`

---

## Known Pitfalls — READ BEFORE EVERY TASK

1. **RLS must be explicitly enabled** on every new table and storage bucket.
   Missing RLS policies cause silent save failures with no error shown.
2. **`payments` has no `status` column.** Do not add it to INSERT or UPDATE.
3. **pets gender and type must be lowercase.** The check constraint is strict.
4. **Never FK-join bookings.** Always read denormalized columns directly.
5. **Logo path:** `public/logo.jpg` → referenced as `/logo.jpg` in JSX.
   Never import it via `src/assets/` or relative imports.
6. **No Supabase JS client.** Never add `@supabase/supabase-js` imports.
7. **Role comes from `user_metadata`**, not the profiles table. Reading from
   profiles causes hanging/timeout issues.

---

## File Map
src/
components/
Layout.jsx
Sidebar.jsx
TopNav.jsx
ProtectedRoute.jsx
wizard/
StepProgress.jsx
Step1CustomerInfo.jsx
Step2PetDetails.jsx
Step3Services.jsx
Step4ServiceOptions.jsx
Step5Confirmation.jsx
contexts/
AuthContext.jsx       ← DO NOT change token storage key
WizardContext.jsx
pages/
BookingWizard.jsx
auth/
Login.jsx
Signup.jsx
AuthCallback.jsx
Unauthorized.jsx
customer/
CustomerDashboard.jsx
MyBookings.jsx
MyPets.jsx
NewBooking.jsx
admin/
AdminDashboard.jsx
tabs/
AllBookings.jsx
BookingModal.jsx  ← Largest file. View/edit/receipt/send flows all here.
FormResponses.jsx
ModificationRequests.jsx
PricesMaster.jsx
UserManagement.jsx
WeeklyCalendar.jsx
lib/
bookingUtils.js       ← Line item computation. Read before touching.
main.jsx
App.jsx                 ← All routes registered here

### Key files — always read before modifying
- `src/lib/bookingUtils.js` — computes line items, fetches prices from DB
- `src/pages/admin/tabs/BookingModal.jsx` — all booking modal flows
- `src/App.jsx` — route definitions
- `src/contexts/AuthContext.jsx` — auth state management

---

## Registered Routes (App.jsx)
- `/login`, `/signup`, `/auth/callback`, `/unauthorized`
- `/admin/dashboard` (+ nested tabs) — protected, requireStaff
- `/customer/dashboard` — protected
- `/customer/bookings` — protected
- `/customer/pets` — protected
- `/booking` — public (BookingWizard)
- `*` → `/login`

---

## Edge Functions
Location: `supabase/functions/`
Each function must:
1. Handle CORS OPTIONS preflight
2. Read API keys from `Deno.env.get('KEY_NAME')` — never hardcode values
3. Verify the Supabase auth token from the `Authorization` header before
   processing by calling:
   `GET https://qcwbkpcwtxpokgseethp.supabase.co/auth/v1/user`
4. Return `{ success: true }` or `{ error: string }` consistently

Deploy with: `npx supabase functions deploy function-name --no-verify-jwt`
The `--no-verify-jwt` flag is mandatory — omitting it causes Supabase to re-enable
JWT verification on every redeploy, which blocks requests from the frontend.

Current functions:
```
npx supabase functions deploy send-confirmation --no-verify-jwt
npx supabase functions deploy send-receipt --no-verify-jwt
```
Set secrets with: `supabase secrets set KEY_NAME=value`

---

## Security Rules — NEVER VIOLATE

- **API keys never touch the frontend.** Resend API key and any other
  service credentials live in Supabase secrets and Vercel env vars only.
- **Always verify auth** in Edge Functions before processing any request.
- **Never log tokens, emails, or personal data** in console.log statements
  that would appear in Vercel function logs.
- **Never expose the Supabase service role key** anywhere in frontend code.
- **Input validation:** Always parse and validate incoming JSON in Edge
  Functions before passing values to external APIs.

---

## Completed Features

### Phase 1 — Auth
- Email/password, Google OAuth, magic link, guest booking
- `AuthCallback.jsx` handles OAuth and magic link token parsing
- Magic link: `redirect_to` is a query param on `/auth/v1/otp`

### Phase 2 — Admin Dashboard
- All Bookings tab with filters + stats
- BookingModal: view / edit / receipt / send tabs
- Receipt: full line item breakdown, `fmtAmt()` removes `.00`
- Calendar View: weekly, color-coded, click opens BookingModal
- Prices Master
- Form Responses with CSV/Excel export
- User Management (super_admin only)
- Modification Requests tab
- Record Payment (payments table INSERT)

### Phase 3 — Customer-facing
- Customer Dashboard
- My Pets CRUD
- Booking Wizard (5 steps)
- My Bookings page (`/customer/bookings`)

---

## Remaining Work
- Email flows: confirmation email + receipt email via Resend Edge Functions
- WhatsApp: keep existing `api.whatsapp.com` link approach
- Mobile responsiveness pass (no mobile work done yet)
- Receipt logo dimensions fix
- Verify BookingModal edit mode saves services to `service_details`
- Verify revenue stats

---

## Roles

| Role | Email | Permissions |
|------|-------|-------------|
| `super_admin` | najeeb84@gmail.com | All admin + edit users, edit Prices Master, Monthly Revenue stat, Excel export |
| `admin` | — | Bookings, calendar, receipts, payments. No user edit, no Prices Master edit, no Monthly Revenue, no Excel export |

Check `profile.role === 'super_admin'`. The `isSuperAdmin` prop is passed
down from `AdminDashboard` and gates super-admin-only UI.

---

## UI & Mobile Standards
- All pages fully responsive (mobile-first)
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:` on all layouts
- Forms: single column mobile, two columns on `md:`
- Modals: full screen mobile (`w-full h-full`), centered card on `md:`
- Navbar: hamburger menu on mobile
- Wizard progress bar: step numbers only on mobile, full labels on `md:`
- No inline styles — Tailwind classes only
- Test every component at 375px width (iPhone SE)

---

## Form Standards
- Mandatory fields: red asterisk `<span className="text-red-500">*</span>`
- Optional fields: no asterisk
- Never make phone, WhatsApp, or address fields mandatory
- **Mandatory fields per form:**
  - Profile: First Name, Last Name only
  - Add/Edit Pet: Name, Type, Breed, Age, Colour, Gender, Vet Name, Vet Phone
  - Booking wizard Step 1: First Name, Last Name, Email, Contact Number
  ## Environment Variables

### Vercel (production)
- `RESEND_API_KEY` — Resend email service key (all environments)

### Supabase secrets (Edge Functions)
- `RESEND_API_KEY` — must also be set via `supabase secrets set`

### Local / build-time (Vite)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
These are referenced throughout the codebase as `import.meta.env.VITE_SUPABASE_URL`
and `import.meta.env.VITE_SUPABASE_ANON_KEY`. Do not hardcode these values.
Do not add `VITE_` prefixed variables to Vercel unless confirmed with Najeeb —
they may already exist in a local `.env` file not committed to GitHub.

---

## Git Push Protocol

After every `git push`, report the short commit hash (7-character SHA shown in
VSCode's Source Control panel next to the branch name, e.g. `98d6b7b`).

Format the push confirmation like this:
```
Pushed: <short-hash>  (<commit message summary>)
```

Example:
```
Pushed: 98d6b7b  (Debug 401 on send-confirmation: disable auth + log token)
```

Run `git rev-parse --short HEAD` immediately after pushing to get the hash.