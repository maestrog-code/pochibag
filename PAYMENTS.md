# PochiBag payment setup

The storefront now includes:

- **Razorpay Checkout** for cards, UPI and netbanking.
- **Injected wallet connection** for MetaMask-compatible wallets.
- Serverless endpoints for Razorpay order creation and HMAC verification.

Add these environment variables to the Vercel project before taking live payments:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | Production + Preview | Public Razorpay key returned to the browser through `/api/public-config`. |
| `RAZORPAY_KEY_SECRET` | Production + Preview | Server-only secret used by `/api/create-order` and `/api/verify-payment`. Never expose it to client code. |
| `POCHIBAG_WALLET_ADDRESS` | Optional | Public merchant address reserved for a future chain/token-specific crypto checkout. The current wallet flow only connects the wallet and does not initiate a transfer. |

After adding the variables, redeploy the Vercel project and test with Razorpay test-mode credentials before switching to live keys.
