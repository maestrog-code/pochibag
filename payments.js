/* PochiBag payments: wallet connection + Razorpay Checkout bridge. */
(() => {
  const config = {
    razorpayKey: window.POCHIBAG_RAZORPAY_KEY_ID || '',
    walletAddress: window.POCHIBAG_WALLET_ADDRESS || ''
  };
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const currentCart = () => window.getPochiCart?.() || [];
  const cartTotal = () => currentCart().reduce((sum, item) => sum + Number(item.itemPrice || item.price || 0) * Number(item.qty || 1), 0) + (window.isPochiGiftWrapped?.() ? 25 : 0);

  function ensureModal() {
    if (document.getElementById('paymentModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="payment-modal" id="paymentModal" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
        <div class="payment-panel">
          <button class="payment-close" onclick="closePaymentModal()" aria-label="Close payment options">×</button>
          <p class="eyebrow"><span></span> Secure checkout</p>
          <h2 id="paymentTitle">Choose your<br><em>way to pay.</em></h2>
          <p>Your selected pieces are reserved while you complete payment. PochiBag never stores card details or wallet keys.</p>
          <div class="payment-options">
            <button class="payment-option" onclick="payWithRazorpay()"><span>Card / UPI / Netbanking</span><small>Razorpay</small></button>
            <button class="payment-option" onclick="payWithWallet()"><span>Connect wallet</span><small id="walletOptionStatus">MetaMask / injected wallet</small></button>
          </div>
          <p class="payment-status" id="paymentStatus" role="status"></p>
        </div>
      </div>`);
  }

  function openPaymentModal() { ensureModal(); document.getElementById('paymentModal').classList.add('open'); }
  window.closePaymentModal = () => document.getElementById('paymentModal')?.classList.remove('open');
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
