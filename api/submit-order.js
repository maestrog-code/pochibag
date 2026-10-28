import crypto from 'node:crypto';

const MAX_ITEMS = 50;
const MAX_QUANTITY = 20;

function jsonBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Order service is not configured' });
  }

  let body;
  try {
    body = jsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const customerName = cleanText(body.customerName, 120);
  const phone = cleanText(body.phone, 30);
  const deliveryAddress = cleanText(body.address, 500);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customerName || phone.length < 5 || deliveryAddress.length < 5 || !items.length || items.length > MAX_ITEMS) {
    return res.status(400).json({ error: 'Complete customer, address, and cart details are required' });
  }

  const safeItems = items.map((item) => ({
    id: Number(item.id),
    name: cleanText(item.name, 160),
    size: cleanText(item.size || 'One Size', 40),
    quantity: Math.min(Math.max(Number(item.qty) || 0, 0), MAX_QUANTITY),
    unitPrice: Number(item.itemPrice || item.price || 0)
  })).filter((item) => item.name && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0);

  if (!safeItems.length || safeItems.length !== items.length) return res.status(400).json({ error: 'Invalid cart items' });
  const total = safeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + (body.giftWrapped ? 25 : 0);
  const orderNumber = `POCHI-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const row = { order_number: orderNumber, customer_name: customerName, phone, delivery_address: deliveryAddress, items: safeItems, total, currency: 'INR', status: 'pending', notification_status: 'pending' };

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  if (!insertResponse.ok) return res.status(502).json({ error: 'Could not save order' });
  const [savedOrder] = await insertResponse.json();

  const webhookUrl = process.env.ORDER_NOTIFICATION_WEBHOOK_URL;
  let notificationStatus = 'pending';
  if (webhookUrl) {
    const notificationResponse = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'order.created', order: savedOrder }) });
    notificationStatus = notificationResponse.ok ? 'sent' : 'failed';
    await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_status: notificationStatus }) });
  }

  return res.status(201).json({ orderId: orderNumber, notificationStatus });
}
