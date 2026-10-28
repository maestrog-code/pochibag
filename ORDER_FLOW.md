# PochiBag order flow

The backend records this lifecycle: `pending_payment` → `paid` → `confirmed` → `processing` → `shipped` → `out_for_delivery` → `delivered`. `cancelled` is available from fulfilment. Every transition is stored in `order_events`.

Customers receive an email at `customer_email` whenever delivery status, tracking number, or delivery note changes. The merchant address `maestrogambis@gmail.com` is also included on these notifications. Repeating the same status update without changing tracking or notes is idempotent and does not send a duplicate alert.

Razorpay webhooks are accepted at `POST /api/razorpay-webhook`. The handler verifies `X-Razorpay-Signature`, synchronizes `payment.captured`, `payment.authorized`, and `order.paid` events, records the payment against `razorpay_order_id`, and safely ignores duplicate deliveries. It also records `payment.failed` events without marking the order paid.

Run `supabase/migrations/001_order_lifecycle.sql` before deploying the new handlers.

## Applying and reviewing the migration

Open the Supabase project dashboard, select **SQL Editor**, create a new query, paste the contents of `supabase/migrations/001_order_lifecycle.sql`, and run it once against the intended project. The statements use `if not exists`, so rerunning the migration is safe for the columns, table, and indexes it creates. Apply it to a staging Supabase project first when one is available, then apply the same SQL to production.

The migration adds payment fields, delivery fields, notification timestamps, and the `order_events` audit table. It enables row-level security on `order_events`; the server continues to write through the Supabase service-role key, while browser clients receive no direct table access. `order_events.order_number` is deliberately not a foreign key because older installations may not have a unique constraint on `orders.order_number`; the application still records and queries events by that order number.

Before applying it to a database with existing payment data, check for duplicate Razorpay order IDs because the migration creates a unique partial index:

```sql
select razorpay_order_id, count(*)
from public.orders
where razorpay_order_id is not null
group by razorpay_order_id
having count(*) > 1;
```

That query must return no rows. Resolve any duplicates before running the migration. Also confirm that the existing `public.orders` table and its `order_number` column are present; this migration extends that table and does not create it.

## Environment variables

Existing payment variables remain required: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), and `SUPABASE_SERVICE_ROLE_KEY`.

Add:

- `RESEND_API_KEY`: Resend API key used for transactional email.
- `ORDER_EMAIL_FROM`: verified sender, for example `PochiBag <orders@your-verified-domain.example>`.
- `ORDER_CONFIRMATION_EMAIL`: optional override; defaults to `maestrogambis@gmail.com`.
- `ORDER_ADMIN_TOKEN`: long random secret used by the fulfilment system to update delivery status.
- `RAZORPAY_WEBHOOK_SECRET`: the webhook secret configured in the Razorpay dashboard; this is separate from `RAZORPAY_KEY_SECRET`.

`POST /api/update-order-status` requires `Authorization: Bearer <ORDER_ADMIN_TOKEN>` and JSON such as:

```json
{"orderId":"POCHI-...","status":"shipped","trackingNumber":"TRACK-123","note":"Handed to courier."}
```

Email delivery is best-effort and never blocks order/payment persistence. Failed email attempts are logged to the server log; the order remains recorded for retry or operational follow-up.

## Production deployment and endpoint check

Run the read-only production smoke check after deployment:

```bash
PRODUCTION_URL=https://your-production-domain.example npm run check:production
```

It checks the homepage, success page, public configuration endpoint, expected order-status 404 behavior, and method guards on order submission and the Razorpay webhook. To also query the latest Vercel deployment state, provide `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` as environment variables; they are never stored in the repository.
