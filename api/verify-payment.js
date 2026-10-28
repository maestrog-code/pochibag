import crypto from 'node:crypto';
import { findOrderByRazorpayId, jsonBody, transitionOrder } from './_lib/order-service.js';
import { sendOrderEmail } from './_lib/mailer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ error: 'Razorpay is not configured' });
  let body;
  try { body = jsonBody(req); } catch { return res.status(400).json({ error: 'Invalid request body' }); }
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
  if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Incomplete payment response' });
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const received = Buffer.from(String(signature));
  const valid = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), received);
  if (!valid) return res.status(400).json({ error: 'Invalid payment signature' });
  const order = await findOrderByRazorpayId(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found for this payment' });
  if (order.payment_id === paymentId && order.payment_status === 'paid') return res.status(200).json({ verified: true, paymentId, orderId, pochibagOrderId: order.order_number, status: order.status });
  const updated = await transitionOrder(order, 'paid', { payment_status: 'paid', payment_id: paymentId, paid_at: new Date().toISOString(), payment_signature_verified: true }, 'payment.verified');
  try { await sendOrderEmail({ event: 'payment.confirmed', order: updated, subject: `Payment confirmed: ${updated.order_number}`, message: 'Payment has been verified successfully. The order is ready for fulfilment confirmation.' }); } catch (error) { console.error('Payment email failed', error.message); }
  return res.status(200).json({ verified: true, paymentId, orderId, pochibagOrderId: updated.order_number, status: updated.status });
}
