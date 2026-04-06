# Pet Lodge

A React web application for managing a pet boarding/lodging business.

## Tech Stack

- **Frontend:** React 18, React Router v6, Tailwind CSS
- **Backend/Auth:** Supabase (database + authentication)
- **Build Tool:** Vite
- **Deployment:** Vercel

## Features

- Customer and admin roles with protected routes
- Customer dashboard for viewing and managing bookings
- Admin dashboard with full management capabilities:
  - Bookings management
  - Calendar view
  - Payments and receipts
  - Pricing configuration
  - User management
- Authentication via Supabase Auth

## Development

```bash
npm install
npm run dev
```

## Data / Schema Notes

- **Bookings list query:** no FK joins — reads denormalized columns directly:
  `customer_first_name`, `customer_last_name`, `customer_email`, `customer_phone`,
  `pets_data` (jsonb array), `service_details` (jsonb array), `service_type`
- **Receipt component:** reads services from `booking.service_details` (jsonb array).
  Each item has `name`, `unit_price`, `total_price`, `quantity`, `num_pets`.
  Falls back to a synthetic row built from `service_type` + `total_amount` if `service_details` is null/empty.
- **Logo:** served from `public/logo.jpg` — referenced as `/logo.jpg` in JSX (not imported via src/assets/).

## Roles

| Role | Email | Permissions |
|------|-------|-------------|
| `super_admin` | najeeb84@gmail.com | All admin features + edit users, edit Prices Master, see Monthly Revenue stat, download customer base as Excel |
| `admin` | — | Standard admin: bookings, calendar, receipts, payments. Cannot edit users, cannot edit Prices Master, Monthly Revenue hidden, no Excel export |

> Check `profile.role === 'super_admin'` (or `=== 'admin'`) — the `isSuperAdmin` prop is passed down from `AdminDashboard` and gates super-admin-only UI.
