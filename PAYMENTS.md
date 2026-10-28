# PochiBag payment and order setup

The storefront uses Razorpay Checkout for cards, UPI and netbanking. The browser first creates a PochiBag order in Supabase, then `/api/create-order` creates the matching Razorpay order. `/api/verify-payment` verifies the HMAC signature and records the payment against the original PochiBag order.

Razorpay server notifications can also be configured to call `/api/razorpay-webhook`. The webhook validates `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET` and synchronizes captured or authorized payments idempotently.

Run `supabase/migrations/001_order_lifecycle.sql` before deploying the handlers. The full status and fulfilment workflow is documented in `ORDER_FLOW.md`.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | Production + Preview | Public Razorpay key returned to the browser through `/api/public-config`. |
| `RAZORPAY_KEY_SECRET` | Production + Preview | Server-only secret used to create and verify Razorpay orders. Never expose it to client code. |
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | Server-only key used to persist orders and lifecycle events. |
| `RESEND_API_KEY` | Production + Preview | Transactional email API key. |
| `ORDER_EMAIL_FROM` | Production + Preview | Sender identity verified with Resend. |
| `ORDER_CONFIRMATION_EMAIL` | Production + Preview | Optional merchant recipient; defaults to `maestrogambis@gmail.com`. |
| `ORDER_ADMIN_TOKEN` | Production + Preview | Secret bearer token for the fulfilment status endpoint. |
| `RAZORPAY_WEBHOOK_SECRET` | Production + Preview | Separate secret used to verify Razorpay webhook signatures. |
| `POCHIBAG_WALLET_ADDRESS` | Optional | Public merchant address reserved for a future chain/token-specific crypto checkout. |

Test with Razorpay test-mode credentials before switching to live keys. Email delivery requires a verified `ORDER_EMAIL_FROM` identity; the requested confirmation recipient is `maestrogambis@gmail.com` by default.

After deployment, configure the Razorpay webhook URL as `https://your-production-domain.example/api/razorpay-webhook` and subscribe to `payment.captured`, `payment.authorized`, `payment.failed`, and `order.paid`. Run `PRODUCTION_URL=https://your-production-domain.example npm run check:production` to verify the live endpoints.
