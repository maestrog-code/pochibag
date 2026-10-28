import { cleanText, findOrder, jsonBody, ORDER_STATUSES, transitionOrder } from './_lib/order-service.js';
import { sendOrderEmail } from './_lib/mailer.js';

const DELIVERY_STATUS_BY_ORDER_STATUS = { confirmed: 'confirmed', processing: 'processing', shipped: 'shipped', out_for_delivery: 'out_for_delivery', delivered: 'delivered', cancelled: 'cancelled' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expectedToken = process.env.ORDER_ADMIN_TOKEN;
  const suppliedToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expectedToken || !suppliedToken || !cryptoSafeEqual(suppliedToken, expectedToken)) return res.status(401).json({ error: 'Unauthorized' });
  let body;
  try { body = jsonBody(req); } catch { return res.status(400).json({ error: 'Invalid request body' }); }
  const status = cleanText(body.status, 30);
  if (!ORDER_STATUSES.includes(status) || !['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid delivery status' });
  const order = await findOrder(cleanText(body.orderId, 80));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!['paid', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(order.status) && status !== 'cancelled') return res.status(409).json({ error: 'Only paid orders can move into fulfilment' });
  const patch = { delivery_status: DELIVERY_STATUS_BY_ORDER_STATUS[status], tracking_number: cleanText(body.trackingNumber, 120) || order.tracking_number || null, delivery_note: cleanText(body.note, 500) || null };
  const updated = await transitionOrder(order, status, patch, `delivery.${status}`);
  try { await sendOrderEmail({ event: `delivery.${status}`, order: updated, subject: `PochiBag delivery update: ${updated.order_number}`, message: body.note || `Your order status is now ${status.replaceAll('_', ' ')}.` }); } catch (error) { console.error('Delivery email failed', error.message); }
  return res.status(200).json({ order: { orderId: updated.order_number, status: updated.status, deliveryStatus: updated.delivery_status, trackingNumber: updated.tracking_number } });
}

function cryptoSafeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
