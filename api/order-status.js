import { cleanText, findOrder, publicOrder } from './_lib/order-service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const order = await findOrder(cleanText(req.query?.orderId || req.query?.order, 80));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.status(200).json({ order: publicOrder(order) });
}
