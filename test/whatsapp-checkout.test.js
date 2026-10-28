import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
process.env.RESEND_API_KEY = 're_test_key';
process.env.ORDER_EMAIL_FROM = 'PochiBag <orders@example.test>';
process.env.ORDER_CONFIRMATION_EMAIL = 'maestrogambis@gmail.com';

const source = await fs.readFile(new URL('../payments.js', import.meta.url), 'utf8');
assert.match(source, /const WHATSAPP_PHONE = '918264329574'/);
assert.match(source, /onclick="sendCartToWhatsApp\(\)"/);
assert.match(source, /https:\/\/wa\.me\/\$\{WHATSAPP_PHONE\}\?text=/);
assert.match(source, /fetch\('\/api\/submit-order'/);
assert.match(source, /maestrogambis\.com|ORDER_CONFIRMATION_EMAIL|saved\.orderId/);

const orders = [];
const emails = [];
let sequence = 1;
class TestResponse {
  constructor(body, status = 200) { this.body = body; this.status = status; this.ok = status >= 200 && status < 300; }
  async json() { return this.body; }
  async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body); }
}
globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  const body = options.body ? JSON.parse(options.body) : null;
  if (url === 'https://api.resend.com/emails') { emails.push(body); return new TestResponse({ id: 'email_test' }); }
  if (url === 'https://supabase.test/rest/v1/orders' && options.method === 'POST') {
    const order = { ...body, order_number: `POCHI-WA-${sequence++}`, updated_at: new Date().toISOString() };
    orders.push(order);
    return new TestResponse([order], 201);
  }
  if (url.startsWith('https://supabase.test/rest/v1/order_events')) return new TestResponse(null, 201);
  if (url.startsWith('https://supabase.test/rest/v1/orders?')) return new TestResponse([], 200);
  throw new Error(`Unexpected request: ${url}`);
};

const { default: submitOrder } = await import('../api/submit-order.js');
const req = { method: 'POST', body: {
  customerName: 'WhatsApp Customer', customerEmail: 'customer@example.test', phone: '+919876543210', address: '10 WhatsApp Lane, Chandigarh',
  items: [{ id: 1, name: 'WhatsApp Handbag', size: 'One Size', qty: 1, itemPrice: 1200 }]
} };
const res = { statusCode: 0, payload: null, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
await submitOrder(req, res);
assert.equal(res.statusCode, 201);
assert.equal(orders.length, 1);
assert.equal(emails.length, 1);
assert.deepEqual(emails[0].to, ['maestrogambis@gmail.com', 'customer@example.test']);

const saved = orders[0];
const message = [
  'Hi PochiBag! I would like to confirm my order on WhatsApp.',
  `Order ID: ${saved.order_number}`,
  `Name: ${saved.customer_name}`,
  `Phone: ${saved.phone}`,
  `Delivery address: ${saved.delivery_address}`,
  '', 'Items:', '• WhatsApp Handbag (One Size) × 1 — ₹1,200', '', 'Total: ₹1,200',
  '', 'Please confirm availability, payment instructions and delivery details.'
].join('\n');
const whatsappUrl = `https://wa.me/918264329574?text=${encodeURIComponent(message)}`;
assert.match(whatsappUrl, /^https:\/\/wa\.me\/918264329574\?text=/);
assert.match(decodeURIComponent(whatsappUrl), /Order ID: POCHI-WA-1/);
assert.match(decodeURIComponent(whatsappUrl), /Please confirm availability/);
console.log(`PASS WhatsApp fallback + merchant email for ${saved.order_number}`);
