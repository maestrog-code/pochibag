import crypto from 'node:crypto';

export const MERCHANT_EMAIL = 'maestrogambis@gmail.com';
export const ORDER_STATUSES = ['pending_payment', 'paid', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Order service is not configured');
  return { url: url.replace(/\/$/, ''), serviceRoleKey };
}

export function jsonBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

export function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function makeOrderNumber() {
  return `POCHI-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function supabaseHeaders(serviceRoleKey, extra = {}) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...extra };
}

export async function supabaseRequest(path, options = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(serviceRoleKey, { 'Content-Type': 'application/json', ...(options.headers || {}) })
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Database request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function findOrder(orderNumber) {
  const rows = await supabaseRequest(`orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*`);
  return Array.isArray(rows) ? rows[0] : null;
}

export async function findOrderByRazorpayId(razorpayOrderId) {
  const rows = await supabaseRequest(`orders?razorpay_order_id=eq.${encodeURIComponent(razorpayOrderId)}&select=*`);
  return Array.isArray(rows) ? rows[0] : null;
}

export async function updateOrder(orderNumber, patch) {
  const rows = await supabaseRequest(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

export async function recordOrderEvent(orderNumber, eventType, fromStatus, toStatus, metadata = {}) {
  try {
    await supabaseRequest('order_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ order_number: orderNumber, event_type: eventType, from_status: fromStatus || null, to_status: toStatus || null, metadata })
    });
  } catch (error) {
    console.error('Could not record order event', { orderNumber, eventType, error: error.message });
  }
}

export async function transitionOrder(order, toStatus, patch = {}, eventType = 'status.updated') {
  if (!ORDER_STATUSES.includes(toStatus)) throw new Error('Invalid order status');
  if (order.status === toStatus && !Object.keys(patch).length) return order;
  const updated = await updateOrder(order.order_number, { ...patch, status: toStatus });
  await recordOrderEvent(order.order_number, eventType, order.status, toStatus, patch);
  return updated || { ...order, ...patch, status: toStatus };
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    orderId: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status || 'pending',
    deliveryStatus: order.delivery_status || null,
    trackingNumber: order.tracking_number || null,
    updatedAt: order.updated_at || null
  };
}
