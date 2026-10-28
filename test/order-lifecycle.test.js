import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RESEND_API_KEY = 're_test_key';
process.env.ORDER_EMAIL_FROM = 'PochiBag <orders@example.test>';
process.env.ORDER_CONFIRMATION_EMAIL = 'maestrogambis@gmail.com';
process.env.ORDER_ADMIN_TOKEN = 'admin-test-token';

const orders = new Map();
const events = [];
const emails = [];
let razorpayOrder;
let nextOrderNumber = 1;

class TestResponse {
  constructor(body, status = 200) { this.body = body; this.status = status; this.ok = status >= 200 && status < 300; }
  async json() { return this.body; }
  async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body); }
}

function queryValue(url, key) {
  const value = new URL(url).searchParams.get(key);
  return value?.startsWith('eq.') ? value.slice(3) : value;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;

  if (url === 'https://api.resend.com/emails') {
    emails.push(body);
    return new TestResponse({ id: `email_${emails.length}` }, 200);
  }

  if (url === 'https://api.razorpay.com/v1/orders') {
    razorpayOrder = { id: 'order_test_123', amount: body.amount, currency: body.currency, receipt: body.receipt };
    return new TestResponse(razorpayOrder, 200);
  }

  if (!url.startsWith('https://supabase.test/rest/v1/')) throw new Error(`Unexpected fetch URL: ${url}`);
  const resource = url.replace('https://supabase.test/rest/v1/', '').split('?')[0];

  if (resource === 'orders' && method === 'POST') {
    const saved = { ...body, updated_at: new Date().toISOString() };
    orders.set(saved.order_number, saved);
    return new TestResponse([clone(saved)], 201);
  }
  if (resource === 'orders' && method === 'GET') {
    const requestedOrder = queryValue(url, 'order_number');
    const requestedRazorpay = queryValue(url, 'razorpay_order_id');
    const found = [...orders.values()].find(order => requestedOrder ? order.order_number === requestedOrder : order.razorpay_order_id === requestedRazorpay);
    return new TestResponse(found ? [clone(found)] : [], 200);
  }
  if (resource === 'orders' && method === 'PATCH') {
    const requestedOrder = queryValue(url, 'order_number');
    const order = orders.get(requestedOrder);
    if (!order) return new TestResponse([], 200);
    Object.assign(order, body, { updated_at: new Date().toISOString() });
    return new TestResponse([clone(order)], 200);
  }
  if (resource === 'order_events' && method === 'POST') {
    events.push(clone(body));
    return new TestResponse(null, 201);
  }
  throw new Error(`Unexpected Supabase request: ${method} ${url}`);
};

const { default: submitOrder } = await import('../api/submit-order.js');
const { default: createOrder } = await import('../api/create-order.js');
const { default: verifyPayment } = await import('../api/verify-payment.js');
const { default: razorpayWebhook } = await import('../api/razorpay-webhook.js');
const { default: updateOrderStatus } = await import('../api/update-order-status.js');
const { default: orderStatus } = await import('../api/order-status.js');

function request(method, body, headers = {}, query = {}) { return { method, body, headers, query }; }
function response() { return { statusCode: 0, payload: null, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } }; }
async function call(handler, req) { const res = response(); await handler(req, res); return res; }

const created = await call(submitOrder, request('POST', {
  customerName: 'Test Customer', customerEmail: 'customer@example.test', phone: '+919999999999', address: '1 Test Street, Chandigarh',
  items: [{ id: 7, name: 'Test Handbag', size: 'One Size', qty: 2, itemPrice: 750 }]
}));
assert.equal(created.statusCode, 201);
assert.match(created.payload.orderId, /^POCHI-/);
assert.equal(created.payload.notificationStatus, 'sent');
const orderId = created.payload.orderId;
assert.equal(orders.get(orderId).status, 'pending_payment');
assert.equal(orders.get(orderId).payment_status, 'pending');
assert.equal(emails[0].to[0], 'maestrogambis@gmail.com');
assert.equal(events.at(-1).event_type, 'order.created');

const gateway = await call(createOrder, request('POST', { orderId }));
assert.equal(gateway.statusCode, 201);
assert.equal(gateway.payload.id, 'order_test_123');
assert.equal(orders.get(orderId).razorpay_order_id, 'order_test_123');
assert.equal(orders.get(orderId).payment_status, 'created');

const invalidSignature = await call(verifyPayment, request('POST', {
  razorpay_order_id: 'order_test_123', razorpay_payment_id: 'pay_invalid', razorpay_signature: 'not-valid'
}));
assert.equal(invalidSignature.statusCode, 400);
assert.equal(orders.get(orderId).payment_status, 'created');

const paymentId = 'pay_test_456';
const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`order_test_123|${paymentId}`).digest('hex');
const webhookPayload = { event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: 'order_test_123' } } } };
const webhookRawBody = JSON.stringify(webhookPayload);
const webhookSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook-test-secret').update(webhookRawBody).digest('hex');
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-test-secret';
const webhookInvalid = await call(razorpayWebhook, request('POST', webhookPayload, { 'x-razorpay-signature': 'invalid' }));
assert.equal(webhookInvalid.statusCode, 400);
const webhookVerified = await call(razorpayWebhook, { method: 'POST', body: webhookPayload, rawBody: webhookRawBody, headers: { 'x-razorpay-signature': webhookSignature } });
assert.equal(webhookVerified.statusCode, 200);
assert.equal(webhookVerified.payload.status, 'paid');
assert.equal(orders.get(orderId).payment_status, 'paid');
assert.equal(events.at(-1).event_type, 'payment.webhook.payment.captured');
const verified = await call(verifyPayment, request('POST', {
  razorpay_order_id: 'order_test_123', razorpay_payment_id: paymentId, razorpay_signature: signature
}));
assert.equal(verified.statusCode, 200);
assert.equal(verified.payload.verified, true);
assert.equal(orders.get(orderId).status, 'paid');
assert.equal(orders.get(orderId).payment_status, 'paid');
assert.equal(orders.get(orderId).payment_signature_verified, true);
assert.equal(orders.get(orderId).payment_id, paymentId);
assert.equal(events.at(-1).event_type, 'payment.webhook.payment.captured');
assert.equal(emails.at(-1).to[0], 'maestrogambis@gmail.com');

for (const [status, expectedDelivery, extra = {}] of [
  ['confirmed', 'confirmed'], ['processing', 'processing'], ['shipped', 'shipped', { trackingNumber: 'TRACK-123' }],
  ['out_for_delivery', 'out_for_delivery'], ['delivered', 'delivered']
]) {
  const updated = await call(updateOrderStatus, request('POST', { orderId, status, ...extra }, { authorization: 'Bearer admin-test-token' }));
  assert.equal(updated.statusCode, 200, `expected ${status} to succeed`);
  assert.equal(updated.payload.order.status, status);
  assert.equal(updated.payload.order.deliveryStatus, expectedDelivery);
  assert.equal(orders.get(orderId).status, status);
  assert.equal(orders.get(orderId).delivery_status, expectedDelivery);
}
assert.equal(orders.get(orderId).tracking_number, 'TRACK-123');
assert.equal(events.filter(event => event.event_type.startsWith('delivery.')).length, 5);
assert.equal(emails.length, 7);

const publicStatus = await call(orderStatus, request('GET', null, {}, { order: orderId }));
assert.equal(publicStatus.statusCode, 200);
assert.deepEqual(publicStatus.payload.order, {
  orderId, status: 'delivered', paymentStatus: 'paid', deliveryStatus: 'delivered', trackingNumber: 'TRACK-123', updatedAt: orders.get(orderId).updated_at
});

console.log(`PASS complete order lifecycle: ${orderId}`);
console.log(`PASS events=${events.length} emails=${emails.length} finalStatus=${orders.get(orderId).status}`);
