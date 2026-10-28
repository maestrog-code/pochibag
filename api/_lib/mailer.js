import { MERCHANT_EMAIL } from './order-service.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function recipients(order) {
  return [...new Set([process.env.ORDER_CONFIRMATION_EMAIL || MERCHANT_EMAIL, order.customer_email].filter(Boolean))];
}

function orderSummary(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return `<ul>${items.map(item => `<li>${escapeHtml(item.name)} (${escapeHtml(item.size || 'One Size')}) × ${Number(item.quantity || item.qty || 0)}</li>`).join('')}</ul>`;
}

export async function sendOrderEmail({ event, order, subject, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not configured; email was not sent', { event, order: order.order_number });
    return { sent: false, skipped: true };
  }
  const from = process.env.ORDER_EMAIL_FROM;
  if (!from) {
    console.warn('ORDER_EMAIL_FROM is not configured; email was not sent', { event, order: order.order_number });
    return { sent: false, skipped: true };
  }
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>PochiBag order update</h2><p>${escapeHtml(message)}</p><p><strong>Order:</strong> ${escapeHtml(order.order_number)}<br><strong>Customer:</strong> ${escapeHtml(order.customer_name)}<br><strong>Phone:</strong> ${escapeHtml(order.phone)}<br><strong>Total:</strong> ${escapeHtml(order.currency || 'INR')} ${Number(order.total || 0).toFixed(2)}<br><strong>Status:</strong> ${escapeHtml(order.status)}</p>${orderSummary(order)}${order.delivery_address ? `<p><strong>Delivery address:</strong><br>${escapeHtml(order.delivery_address).replace(/\n/g, '<br>')}</p>` : ''}${order.tracking_number ? `<p><strong>Tracking:</strong> ${escapeHtml(order.tracking_number)}</p>` : ''}</div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipients(order), subject, html })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected the message (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { sent: true, data: await response.json() };
}
