import { cleanText, getSupabaseConfig, isEmail, jsonBody, makeOrderNumber, recordOrderEvent, supabaseHeaders } from './_lib/order-service.js';
import { sendOrderEmail } from './_lib/mailer.js';

const MAX_ITEMS = 50;
const MAX_QUANTITY = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body;
  try { body = jsonBody(req); } catch { return res.status(400).json({ error: 'Invalid request body' }); }
  let config;
  try { config = getSupabaseConfig(); } catch { return res.status(503).json({ error: 'Order service is not configured' }); }
  const customerName = cleanText(body.customerName, 120);
  const customerEmail = cleanText(body.email || body.customerEmail, 180).toLowerCase();
  const phone = cleanText(body.phone, 30);
  const deliveryAddress = cleanText(body.address, 500);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customerName || (customerEmail && !isEmail(customerEmail)) || phone.length < 5 || deliveryAddress.length < 5 || !items.length || items.length > MAX_ITEMS) return res.status(400).json({ error: 'Complete customer, address, and cart details are required' });
  const safeItems = items.map(item => ({ id: Number(item.id), name: cleanText(item.name, 160), size: cleanText(item.size || 'One Size', 40), quantity: Math.min(Math.max(Number(item.qty ?? item.quantity) || 0, 0), MAX_QUANTITY), unitPrice: Number(item.itemPrice ?? item.price ?? 0) })).filter(item => item.name && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0);
  if (!safeItems.length || safeItems.length !== items.length) return res.status(400).json({ error: 'Invalid cart items' });
  const total = safeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + (body.giftWrapped ? 25 : 0);
  const orderNumber = makeOrderNumber();
  const row = { order_number: orderNumber, customer_name: customerName, customer_email: customerEmail || null, phone, delivery_address: deliveryAddress, items: safeItems, total, currency: 'INR', status: 'pending_payment', payment_status: 'pending', delivery_status: 'not_started', notification_status: 'pending' };
  const response = await fetch(`${config.url}/rest/v1/orders`, { method: 'POST', headers: supabaseHeaders(config.serviceRoleKey, { Prefer: 'return=representation', 'Content-Type': 'application/json' }), body: JSON.stringify(row) });
  if (!response.ok) return res.status(502).json({ error: 'Could not save order' });
  const [savedOrder] = await response.json();
  await recordOrderEvent(orderNumber, 'order.created', null, 'pending_payment', { total, currency: 'INR' });
  let notificationStatus = 'skipped';
  try {
    const emailResult = await sendOrderEmail({ event: 'order.created', order: savedOrder, subject: `PochiBag order received: ${orderNumber}`, message: 'A new order has been received and is awaiting payment confirmation.' });
    notificationStatus = emailResult.sent ? 'sent' : 'skipped';
  } catch (error) { notificationStatus = 'failed'; console.error('Order email failed', error.message); }
  await fetch(`${config.url}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: supabaseHeaders(config.serviceRoleKey, { 'Content-Type': 'application/json' }), body: JSON.stringify({ notification_status: notificationStatus, updated_at: new Date().toISOString() }) });
  return res.status(201).json({ orderId: orderNumber, total, currency: 'INR', notificationStatus });
}
