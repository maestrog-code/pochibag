import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ error: 'Razorpay is not configured' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const amount = Math.round(Number(body.amount || 0) * 100);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: 'Invalid order amount' });
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
    body: JSON.stringify({ amount, currency: body.currency || 'INR', receipt: `pochibag_${Date.now()}`, notes: { item_count: String(Array.isArray(body.items) ? body.items.length : 0) } })
  });
  const data = await response.json();
  return res.status(response.status).json(data);
}
