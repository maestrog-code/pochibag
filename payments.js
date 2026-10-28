/* PochiBag checkout: persist the order first, then verify Razorpay against that order. */
(() => {
  const WHATSAPP_PHONE = '918264329574';
  const config = { razorpayKey: window.POCHIBAG_RAZORPAY_KEY_ID || '', walletAddress: window.POCHIBAG_WALLET_ADDRESS || '' };
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const currentCart = () => window.getPochiCart?.() || [];
  const cartTotal = () => currentCart().reduce((sum, item) => sum + (window.getProductPrice ? window.getProductPrice(item, item.size) : Number(item.itemPrice || item.price || 0)) * Number(item.qty || 1), 0) + (window.isPochiGiftWrapped?.() ? 25 : 0);
  function ensureModal() {
    if (document.getElementById('paymentModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="payment-modal" id="paymentModal" role="dialog" aria-modal="true" aria-labelledby="paymentTitle"><div class="payment-panel"><button class="payment-close" onclick="closePaymentModal()" aria-label="Close payment options">×</button><p class="eyebrow"><span></span> Secure checkout</p><h2 id="paymentTitle">Complete your<br><em>order.</em></h2><p>Enter your delivery details. Your order is recorded before secure payment begins.</p><div class="delivery-details"><label for="orderCustomerName">Full name</label><input id="orderCustomerName" autocomplete="name" required placeholder="Your name" /><label for="orderEmail">Email address</label><input id="orderEmail" type="email" autocomplete="email" placeholder="name@example.com" /><label for="orderPhone">Phone number</label><input id="orderPhone" type="tel" autocomplete="tel" required placeholder="Your phone number" /><label for="orderAddress">Delivery address</label><textarea id="orderAddress" autocomplete="street-address" required rows="3" placeholder="House number, street, area, city, state and PIN code"></textarea><p class="delivery-required" id="deliveryRequired" role="alert"></p></div><div class="payment-options"><button class="payment-option payment-option-whatsapp" type="button" onclick="sendCartToWhatsApp()"><span>Order via WhatsApp</span><small>Recommended while online payment is being finalized</small></button><button class="payment-option" type="button" onclick="payWithRazorpay()"><span>Pay securely with Razorpay</span><small>Cards, UPI and netbanking</small></button></div><p class="payment-status" id="paymentStatus" role="status"></p></div></div>`);
  }
  function openPaymentModal() { ensureModal(); document.getElementById('paymentModal').classList.add('open'); }
  window.closePaymentModal = () => document.getElementById('paymentModal')?.classList.remove('open');
  function details() { return { customerName: document.getElementById('orderCustomerName')?.value.trim(), email: document.getElementById('orderEmail')?.value.trim(), phone: document.getElementById('orderPhone')?.value.trim(), address: document.getElementById('orderAddress')?.value.trim() }; }
  function validateDetails() { const data = details(); const required = document.getElementById('deliveryRequired'); if (!data.customerName || !data.phone || !data.address) { if (required) required.textContent = 'Please enter your name, phone number and delivery address before continuing.'; return null; } if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) { if (required) required.textContent = 'Please enter a valid email address.'; return null; } if (required) required.textContent = ''; return data; }
  async function saveOrder() { const customer = validateDetails(); if (!customer) return null; const response = await fetch('/api/submit-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...customer, items: currentCart(), total: cartTotal(), giftWrapped: Boolean(window.isPochiGiftWrapped?.()) }) }); if (!response.ok) throw new Error('We could not save your order'); return response.json(); }
  window.sendCartToWhatsApp = async () => {
    const status = document.getElementById('paymentStatus');
    const whatsappWindow = window.open('', '_blank');
    try {
      if (status) status.textContent = 'Saving your order before opening WhatsApp…';
      const customer = validateDetails();
      if (!customer) { whatsappWindow?.close(); return; }
      const saved = await saveOrder();
      const items = currentCart().map(item => {
        const price = window.getProductPrice ? window.getProductPrice(item, item.size) : Number(item.itemPrice || item.price || 0);
        return `• ${item.name} (${item.size || 'One Size'}) × ${Number(item.qty || 1)} — ₹${(price * Number(item.qty || 1)).toLocaleString('en-IN')}`;
      }).join('\n');
      const message = [
        'Hi PochiBag! I would like to confirm my order on WhatsApp.',
        `Order ID: ${saved.orderId}`,
        `Name: ${customer.customerName}`,
        `Email: ${customer.email || 'Not provided'}`,
        `Phone: ${customer.phone}`,
        `Delivery address: ${customer.address}`,
        '', 'Items:', items, '', `Total: ₹${Number(saved.total || cartTotal()).toLocaleString('en-IN')}`,
        '', 'Please confirm availability, payment instructions and delivery details.'
      ].join('\n');
      const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
      if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
      else window.location.href = whatsappUrl;
      closePaymentModal();
    } catch (error) {
      whatsappWindow?.close();
      if (status) status.textContent = `${error.message}. Please try again.`;
    }
  };
  window.saveOrderOnly = window.sendCartToWhatsApp;
  async function loadRazorpay() { if (window.Razorpay) return true; return new Promise(resolve => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script); }); }
  window.payWithRazorpay = async () => { const status = document.getElementById('paymentStatus'); if (!config.razorpayKey) { if (status) status.textContent = 'Online payment is not configured yet. Please use Order via WhatsApp.'; return; } try { if (status) status.textContent = 'Recording your order…'; const saved = await saveOrder(); if (status) status.textContent = 'Preparing secure checkout…'; const response = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: saved.orderId }) }); if (!response.ok) throw new Error('Payment service unavailable'); const order = await response.json(); if (!await loadRazorpay()) throw new Error('Razorpay Checkout could not load'); const checkout = new window.Razorpay({ key: config.razorpayKey, amount: order.amount, currency: order.currency, order_id: order.id, name: 'PochiBag', description: 'PochiBag collection', image: '/logo-transparent.png', prefill: { name: details().customerName, email: details().email, contact: details().phone }, handler: async payment => { const verification = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) }); if (!verification.ok) throw new Error('Payment verification failed'); closePaymentModal(); window.location.href = `order-success.html?order=${encodeURIComponent(saved.orderId)}&paid=1`; }, modal: { ondismiss: () => { if (status) status.textContent = 'Your order is saved and is awaiting payment.'; } }, theme: { color: '#d4af37' } }); checkout.open(); } catch (error) { if (status) status.textContent = `${error.message}. Your order was not charged.`; } };
  window.startCheckout = () => { if (!currentCart().length) { window.showToast?.('Your bag is empty. Discover an artifact first.'); return; } openPaymentModal(); const status = document.getElementById('paymentStatus'); if (status) status.textContent = `Total due: ${money(cartTotal())}`; };
  window.connectWallet = async () => { if (!window.ethereum) { window.showToast?.('No compatible wallet found. Install MetaMask to connect.'); return; } try { const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); const account = accounts?.[0]; document.querySelectorAll('[data-wallet-label]').forEach(el => el.textContent = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect wallet'); window.showToast?.('Wallet connected for checkout.'); } catch (error) { window.showToast?.(error?.message || 'Wallet connection was cancelled.'); } };
  document.addEventListener('DOMContentLoaded', async () => { ensureModal(); try { const response = await fetch('/api/public-config', { cache: 'no-store' }); if (response.ok) Object.assign(config, await response.json()); } catch (_) {} });
})();
