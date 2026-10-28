/* PochiBag payments: wallet connection + Razorpay Checkout bridge. */
(() => {
  const config = {
    razorpayKey: window.POCHIBAG_RAZORPAY_KEY_ID || '',
    walletAddress: window.POCHIBAG_WALLET_ADDRESS || ''
  };
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const currentCart = () => window.getPochiCart?.() || [];
  const cartTotal = () => currentCart().reduce((sum, item) => sum + (window.getProductPrice ? window.getProductPrice(item, item.size) : Number(item.itemPrice || item.price || 0)) * Number(item.qty || 1), 0) + (window.isPochiGiftWrapped?.() ? 25 : 0);

  function ensureModal() {
    if (document.getElementById('paymentModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="payment-modal" id="paymentModal" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
        <div class="payment-panel">
          <button class="payment-close" onclick="closePaymentModal()" aria-label="Close payment options">×</button>
          <p class="eyebrow"><span></span> Secure checkout</p>
          <h2 id="paymentTitle">Choose your<br><em>way to pay.</em></h2>
          <p>Choose how you would like to complete your order. Payment gateway checkout will be available soon.</p>
          <div class="delivery-details">
            <label for="orderCustomerName">Full name</label>
            <input id="orderCustomerName" name="customerName" autocomplete="name" required placeholder="Your name" />
            <label for="orderPhone">Phone number</label>
            <input id="orderPhone" name="phone" type="tel" autocomplete="tel" required placeholder="Your phone number" />
            <label for="orderAddress">Delivery address</label>
            <textarea id="orderAddress" name="address" autocomplete="street-address" required rows="3" placeholder="House number, street, area, city, state and PIN code"></textarea>
            <p class="delivery-required" id="deliveryRequired" role="alert"></p>
          </div>
          <div class="payment-options">
            <button class="payment-option payment-option-whatsapp" onclick="sendCartToWhatsApp()"><span>Confirm order on WhatsApp</span><small>Recommended for now</small></button>
            <button class="payment-option" type="button" disabled aria-disabled="true"><span>Proceed to payment</span><small>Coming soon</small></button>
          </div>
          <p class="payment-status" id="paymentStatus" role="status"></p>
        </div>
      </div>`);
  }

  function openPaymentModal() { ensureModal(); document.getElementById('paymentModal').classList.add('open'); }
  window.closePaymentModal = () => document.getElementById('paymentModal')?.classList.remove('open');

  window.sendCartToWhatsApp = () => {
    const items = currentCart();
    if (!items.length) return;
    const customerName = document.getElementById('orderCustomerName')?.value.trim();
    const phone = document.getElementById('orderPhone')?.value.trim();
    const address = document.getElementById('orderAddress')?.value.trim();
    const requiredMessage = document.getElementById('deliveryRequired');
    if (!customerName || !phone || !address) {
      if (requiredMessage) requiredMessage.textContent = 'Please enter your name, phone number and delivery address before continuing.';
      return;
    }
    if (requiredMessage) requiredMessage.textContent = '';
    const lines = items.map(item => {
      const unitPrice = Number(item.itemPrice || item.price || 0);
      const size = item.size && item.size !== 'One Size' ? ` (${item.size})` : '';
      return `• ${item.name}${size} × ${item.qty} — ${money(unitPrice * item.qty)}`;
    });
    const note = localStorage.getItem('pochibag_note')?.trim();
    const gift = window.isPochiGiftWrapped?.() ? '\\nGift wrapping: Yes (+ ₹25)' : '';
    const message = [
      'Hello PochiBag, I would like to place this order:',
      '',
      `Customer name: ${customerName}`,
      `Phone: ${phone}`,
      `Delivery address: ${address}`,
      '',
      ...lines,
      gift,
      `\\nTotal: ${money(cartTotal())}`,
      note ? `Order note: ${note}` : '',
      '',
      'Please confirm availability and delivery details.'
    ].filter(Boolean).join('\\n');
    window.open(`https://wa.me/918264329574?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    closePaymentModal();
  };

  window.startCheckout = () => {
    if (!currentCart().length) { window.showToast?.('Your bag is empty. Discover an artifact first.'); return; }
    openPaymentModal();
    const status = document.getElementById('paymentStatus');
    if (status) status.textContent = `Total due: ${money(cartTotal())}`;
  };

  window.connectWallet = async () => {
    if (!window.ethereum) { window.showToast?.('No compatible wallet found. Install MetaMask to connect.'); return; }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts?.[0];
      document.querySelectorAll('[data-wallet-label]').forEach(el => el.textContent = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect wallet');
      window.showToast?.('Wallet connected for checkout.');
    } catch (error) { window.showToast?.(error?.message || 'Wallet connection was cancelled.'); }
  };

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise(resolve => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script); });
  }

  window.payWithRazorpay = async () => {
    const status = document.getElementById('paymentStatus');
    if (!config.razorpayKey) { if (status) status.textContent = 'Razorpay is ready to activate once RAZORPAY_KEY_ID is added to the deployment environment.'; return; }
    if (status) status.textContent = 'Preparing your secure checkout…';
    try {
      const response = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: cartTotal(), currency: 'INR', items: currentCart() }) });
      if (!response.ok) throw new Error('Order service unavailable');
      const order = await response.json();
      if (!await loadRazorpay()) throw new Error('Razorpay Checkout could not load');
      const checkoutOptions = { key: config.razorpayKey, amount: order.amount, currency: order.currency, order_id: order.id, name: 'PochiBag', description: 'PochiBag collection', image: '/logo-transparent.png', handler: async payment => {
        const verification = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
        if (!verification.ok) throw new Error('Payment verification failed');
        window.showToast?.('Payment received. Your PochiBag order is being prepared.'); closePaymentModal();
      }, theme: { color: '#d4af37' } };
      const checkout = new window.Razorpay(checkoutOptions);
      checkout.open();
    } catch (error) { if (status) status.textContent = `${error.message}. Please try again or order via WhatsApp.`; }
  };

  window.payWithWallet = async () => {
    const status = document.getElementById('paymentStatus');
    if (!window.ethereum) { if (status) status.textContent = 'Connect MetaMask or another injected wallet first.'; return; }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts?.[0];
      document.querySelectorAll('[data-wallet-label]').forEach(el => el.textContent = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect wallet');
      if (status) status.textContent = 'Wallet connected. Crypto checkout can be enabled once a chain, token, and pricing policy are configured.';
    } catch (error) { if (status) status.textContent = error?.message || 'Wallet payment was cancelled.'; }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    ensureModal();
    try {
      const response = await fetch('/api/public-config', { cache: 'no-store' });
      if (response.ok) Object.assign(config, await response.json());
    } catch (_) { /* Static preview: configuration can remain empty until deployment. */ }
  });
})();
