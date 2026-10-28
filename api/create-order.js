import { findOrder, jsonBody, transitionOrder } from './_lib/order-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ error: 'Razorpay is not configured' });
  let body;
  try { body = jsonBody(req); } catch { return res.status(400).json({ error: 'Invalid request body' }); }
  const order = await findOrder(body.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.razorpay_order_id) return res.status(200).json({ id: order.razorpay_order_id, amount: Math.round(Number(order.total) * 100), currency: order.currency || 'INR', orderId: order.order_number });
  const amount = Math.round(Number(order.total) * 100);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: 'Invalid order amount' });
  const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` }, body: JSON.stringify({ amount, currency: order.currency || 'INR', receipt: order.order_number, notes: { pochibag_order: order.order_number } }) });
  const data = await response.json();
  if (!response.ok) return res.status(response.status).json(data);
  await transitionOrder(order, 'pending_payment', { razorpay_order_id: data.id, payment_status: 'created' }, 'payment.created');
  return res.status(201).json({ id: data.id, amount: data.amount, currency: data.currency, orderId: order.order_number });
}
