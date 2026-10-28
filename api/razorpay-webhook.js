import crypto from 'node:crypto';
import { findOrderByRazorpayId, recordOrderEvent, transitionOrder } from './_lib/order-service.js';
import { sendOrderEmail } from './_lib/mailer.js';

export const config = { api: { bodyParser: false } };

async function rawRequestBody(req) {
  if (typeof req.rawBody === 'string' || Buffer.isBuffer(req.rawBody)) return String(req.rawBody);
  if (typeof req.body === 'string') return req.body;
  if (req && typeof req.on === 'function') {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  }
  return JSON.stringify(req.body || {});
}

function validSignature(rawBody, signature, secret) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Razorpay webhook is not configured' });
  const rawBody = await rawRequestBody(req);
  if (!validSignature(rawBody, req.headers['x-razorpay-signature'], secret)) return res.status(400).json({ error: 'Invalid webhook signature' });

  let event;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).json({ error: 'Invalid webhook body' }); }
  const eventName = String(event.event || '');
  const payment = event.payload?.payment?.entity || {};
  const razorpayOrderId = payment.order_id || event.payload?.order?.entity?.id;
  if (!razorpayOrderId) return res.status(200).json({ received: true, ignored: 'missing_order_id' });

  const order = await findOrderByRazorpayId(razorpayOrderId);
  if (!order) return res.status(200).json({ received: true, ignored: 'order_not_found' });

  if (['payment.captured', 'payment.authorized', 'order.paid'].includes(eventName)) {
    const paymentId = payment.id || order.payment_id || null;
    if (order.payment_status === 'paid' && (!paymentId || order.payment_id === paymentId)) return res.status(200).json({ received: true, duplicate: true, orderId: order.order_number });
    const updated = await transitionOrder(order, 'paid', { payment_status: 'paid', payment_id: paymentId, paid_at: order.paid_at || new Date().toISOString(), payment_signature_verified: true }, `payment.webhook.${eventName}`);
    try { await sendOrderEmail({ event: `payment.webhook.${eventName}`, order: updated, subject: `Payment confirmed: ${updated.order_number}`, message: 'Razorpay confirmed your payment. Your order is now ready for fulfilment.' }); } catch (error) { console.error('Webhook payment email failed', error.message); }
    return res.status(200).json({ received: true, orderId: updated.order_number, status: updated.status });
  }

  if (eventName === 'payment.failed') {
    await transitionOrder(order, order.status, { payment_status: 'failed', payment_id: payment.id || order.payment_id || null }, 'payment.webhook.payment.failed');
    await recordOrderEvent(order.order_number, 'payment.failed', order.status, order.status, { payment_id: payment.id || null, error_code: payment.error_code || null, error_description: payment.error_description || null });
    return res.status(200).json({ received: true, orderId: order.order_number, status: order.status, paymentStatus: 'failed' });
  }

  return res.status(200).json({ received: true, ignored: eventName || 'unknown_event' });
}
