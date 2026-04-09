// ============================
// POCHIBAG — Shared JavaScript
// Cart · Wishlist · Search · Modal · Animations
// ============================

// ---------- STATE ----------
let cart = JSON.parse(localStorage.getItem("pochibag_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("pochibag_wishlist") || "[]");
let isGiftWrapped = localStorage.getItem("pochibag_gift") === "true";
let orderNote = localStorage.getItem("pochibag_note") || "";

function saveCart() {
  localStorage.setItem("pochibag_cart", JSON.stringify(cart));
  localStorage.setItem("pochibag_gift", isGiftWrapped);
  localStorage.setItem("pochibag_note", orderNote);
}

function saveWishlist() {
  localStorage.setItem("pochibag_wishlist", JSON.stringify(wishlist));
}

function getProductPrice(p, size) {
  if (typeof p.price === 'object' && p.price !== null) {
    return p.price[size] || Object.values(p.price)[0];
  }
  return p.price;
}

// ---------- CART ----------
function addToCart(id, sizeOverride) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const size = sizeOverride || (p.sizes && p.sizes[0]) || "One Size";
  const itemPrice = getProductPrice(p, size);
  const existing = cart.find(c => c.id === id && c.size === size);
  if (existing) { existing.qty++; }
  else { cart.push({ ...p, qty: 1, size, itemPrice }); }
  saveCart();
  updateCartUI();
  const qtyText = existing ? `quantity increased` : `added to your bag`;
  showToast(`✨ "${p.name}" ${qtyText}`);
  
  // Announce to screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.textContent = `${p.name} has been ${qtyText}`;
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

function removeFromCart(id, size) {
  cart = cart.filter(c => !(c.id === id && c.size === size));
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  let subtotal = cart.reduce((s, c) => s + (c.itemPrice || c.price) * c.qty, 0);
  const giftPrice = isGiftWrapped ? 25 : 0;
  const total = subtotal + giftPrice;

  const badge = document.getElementById("cartBadge");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  const itemsEl = document.getElementById("cartItems");
  const footerEl = document.getElementById("cartFooter");

  if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString()}`;

  // Shipping progress
  const shippingInfoEl = document.getElementById("cartShippingInfo");
  const threshold = 500; // $500 = free shipping
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const remaining = threshold - subtotal;

  if (shippingInfoEl) {
    if (cart.length > 0) {
      shippingInfoEl.style.display = "block";
      shippingInfoEl.innerHTML = `
        <div class="shipping-text">
          ${subtotal >= threshold
            ? '<span>🎁 Complimentary <strong>White-Glove Delivery</strong> unlocked</span>'
            : `<span>Add <strong>₹${remaining.toLocaleString()}</strong> for free delivery</span><span>₹${threshold.toLocaleString()}</span>`}
        </div>
        <div class="shipping-bar-wrap">
          <div class="shipping-bar-fill" style="width: ${progress}%"></div>
        </div>
      `;
    } else {
      shippingInfoEl.style.display = "none";
    }
  }

  if (!itemsEl || !footerEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty" role="status">Your bag is empty.<br><a href="shop.html" style="color:var(--gold);text-decoration:underline;font-weight:600;">Discover our collections</a></p>';
    footerEl.style.display = "none";
    const giftEl = document.getElementById("cartGifting");
    if (giftEl) giftEl.style.display = "none";
  } else {
    footerEl.style.display = "block";
    const giftEl = document.getElementById("cartGifting");
    if (giftEl) giftEl.style.display = "block";

    const giftCheck = document.getElementById("giftCheck");
    const giftNoteWrap = document.getElementById("giftNoteWrap");
    const orderNoteText = document.getElementById("orderNoteText");
    if (giftCheck) giftCheck.checked = isGiftWrapped;
    if (giftNoteWrap) giftNoteWrap.classList.toggle("show", isGiftWrapped);
    if (orderNoteText) orderNoteText.value = orderNote;

    itemsEl.innerHTML = cart.map(c => `
      <div class="cart-item">
        <img src="${c.img}" alt="${c.name}" loading="lazy"/>
        <div class="cart-item-info">
          <p class="cart-item-category">${c.category}</p>
          <p class="cart-item-name">${c.name}${c.size && c.size !== 'One Size' ? ` · ${c.size}` : ''}</p>
          <p class="cart-item-price">₹${((c.itemPrice || c.price) * c.qty).toLocaleString()} ${c.qty > 1 ? `<span style="color:var(--muted);font-size:.75rem">×${c.qty}</span>` : ''}</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${c.id},'${c.size}')" title="Remove">✕</button>
      </div>
    `).join("");
  }
}

function toggleGiftWrapping() {
  isGiftWrapped = document.getElementById("giftCheck").checked;
  saveCart();
  updateCartUI();
}

function updateOrderNote(val) {
  orderNote = val;
  saveCart();
}

function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const bg = document.getElementById("overlayBg");
  if (sidebar) sidebar.classList.toggle("open");
  if (bg) bg.classList.toggle("show");
}

function closeAll() {
  document.getElementById("cartSidebar")?.classList.remove("open");
  document.getElementById("overlayBg")?.classList.remove("show");
}

// ---------- WISHLIST ----------
function wishlistToggle(btn) {
  const isWished = btn.dataset.wished === "true";
  let id = parseInt(btn.getAttribute("data-id"));
  if (!id) {
    const urlParams = new URLSearchParams(window.location.search);
    id = parseInt(urlParams.get('id'));
  }
  if (!id) return;

  if (isWished) {
    wishlist = wishlist.filter(x => x !== id);
    btn.dataset.wished = "false";
    btn.classList.remove("active");
    showToast("Removed from wishlist");
  } else {
    wishlist.push(id);
    btn.dataset.wished = "true";
    btn.classList.add("active");
    showToast("♥ Added to wishlist");
  }
  saveWishlist();
}

// ---------- SEARCH ----------
function toggleSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  const isActive = overlay.classList.toggle('active');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  
  if (isActive) {
    setTimeout(() => input?.focus(), 100);
    document.body.style.overflow = 'hidden';
  } else {
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    document.body.style.overflow = '';
  }
}

function performSearch() {
  const input = document.getElementById('searchInput');
  const query = input?.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer || typeof PRODUCTS === 'undefined') return;

  if (!query || query.length < 2) {
    resultsContainer.innerHTML = '';
    resultsContainer.setAttribute('aria-live', 'polite');
    return;
  }

  const matches = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query) ||
    (p.subcategory && p.subcategory.toLowerCase().includes(query))
  ).slice(0, 12);

  if (matches.length === 0) {
    resultsContainer.innerHTML = `<p style="padding:1.25rem;color:var(--muted);font-family:'Jost',sans-serif;font-size:.85rem;" role="status">No results found for "${query}". Try another search.</p>`;
    resultsContainer.setAttribute('aria-live', 'polite');
    return;
  }

  resultsContainer.innerHTML = matches.map(p => `
    <a href="product.html?id=${p.id}" class="search-result-card" onclick="toggleSearch()" role="button" tabindex="0">
      <img src="${p.img}" alt="${p.name}" class="search-result-img" loading="lazy">
      <div>
        <span class="search-result-brand">${p.category}</span>
        <span class="search-result-name">${p.name}</span>
      </div>
      <span class="search-result-price" aria-label="Price">${typeof p.price === 'object' ? `From ₹${Math.min(...Object.values(p.price)).toLocaleString()}` : `₹${p.price.toLocaleString()}`}</span>
    </a>
  `).join('');
  
  resultsContainer.setAttribute('aria-live', 'polite');
  resultsContainer.setAttribute('aria-label', `${matches.length} search results for "${query}"`);
}

// ---------- MODAL ----------
let currentModal = null;
let selectedSize = "";

function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  currentModal = p;
  selectedSize = (p.sizes && p.sizes[0]) || "One Size";

  const img = document.getElementById("modalImg");
  const cat = document.getElementById("modalCategory");
  const name = document.getElementById("modalName");
  const rating = document.getElementById("modalRating");
  const price = document.getElementById("modalPrice");
  const desc = document.getElementById("modalDesc");
  const sizesEl = document.getElementById("modalSizes");

  if (img) { img.src = p.img; img.alt = p.name; }
  if (cat) cat.textContent = p.subcategory || p.category;
  if (name) name.textContent = p.name;
  if (rating) rating.textContent = `⭐ ${p.rating} (${p.reviews} reviews)`;
  const displayPrice = typeof p.price === 'object' ? `From ₹${Math.min(...Object.values(p.price)).toLocaleString()}` : `₹${p.price.toLocaleString()}`;
  if (price) price.innerHTML = `${displayPrice}${p.oldPrice ? ` <del>₹${p.oldPrice.toLocaleString()}</del>` : ''}`;
  if (desc) desc.textContent = p.desc;

  if (sizesEl) {
    const allSizes = p.sizes || ["One Size"];
    sizesEl.innerHTML = allSizes.map(s =>
      `<button class="size-btn${s === selectedSize ? ' selected' : ''}" onclick="selectSize('${s}',this)">${s}</button>`
    ).join('');
  }

  document.getElementById("modalOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
  currentModal = null;
}

function selectSize(size, el) {
  selectedSize = size;
  document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
}

function addFromModal() {
  if (!currentModal) return;
  addToCart(currentModal.id, selectedSize);
  closeModal();
  setTimeout(() => toggleCart(), 300);
}

// ---------- SCROLL NAV ----------
function setupScrollNav() {
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("navbar");
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 80);
  });
}

// ---------- SCROLL ANIMATIONS ----------
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

// ---------- FADE-IN ELEMENTS ----------
function setupFadeIn() {
  const targets = document.querySelectorAll(".product-card, .cat-card, .brand-card, .feature-card, .trending-item");
  const observer = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.opacity = "1";
          e.target.style.transform = "translateY(0)";
        }, i * 60);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(t => {
    t.style.opacity = "0";
    t.style.transform = "translateY(20px)";
    t.style.transition = "opacity .5s ease, transform .5s ease";
    observer.observe(t);
  });
}

// ---------- HAMBURGER ----------
function toggleMenu() {
  const links = document.querySelector(".nav-links");
  if (!links) return;
  const isOpen = links.style.display === "flex";
  if (isOpen) {
    links.style.display = "";
    links.style.position = "";
  } else {
    Object.assign(links.style, {
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: "70px",
      left: "0",
      right: "0",
      background: "var(--white)",
      padding: "2rem 1.5rem",
      borderBottom: "1px solid var(--border)",
      zIndex: "999",
      gap: "1.5rem",
      boxShadow: "0 12px 30px rgba(0,0,0,0.1)"
    });
  }
}

// ---------- TOAST ----------
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

// ---------- RENDER PRODUCT CARD ----------
function renderProductCard(p) {
  const isWished = wishlist.includes(p.id);
  const badgeMap = {
    new: 'badge-new', bestseller: 'badge-bestseller',
    sale: 'badge-sale', exclusive: 'badge-exclusive', hot: 'badge-hot'
  };
  const badgeLabel = { new: 'New', bestseller: 'Best Seller', sale: 'Sale', exclusive: 'Exclusive', hot: '🔥 Hot' };

  return `
  <div class="product-card" data-id="${p.id}">
    <div class="product-img">
      <a href="product.html?id=${p.id}">
        <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      </a>
      ${p.badge ? `<span class="product-badge ${badgeMap[p.badge]}">${badgeLabel[p.badge]}</span>` : ''}
      <button class="wishlist-btn ${isWished ? 'active' : ''}" data-id="${p.id}" data-wished="${isWished}"
        onclick="event.stopPropagation();wishlistToggle(this)" title="Save to wishlist">♥</button>
      <div class="quick-view" onclick="openModal(${p.id})">Quick View</div>
    </div>
    <div class="product-info">
      <p class="product-category">${p.subcategory || p.category}</p>
      <a href="product.html?id=${p.id}" style="text-decoration:none;">
        <p class="product-name">${p.name}</p>
      </a>
      <div class="product-meta">
        <div class="product-price">
          <strong>${typeof p.price === 'object' ? `From ₹${Math.min(...Object.values(p.price)).toLocaleString()}` : `₹${p.price.toLocaleString()}`}</strong>
          ${p.oldPrice ? `<del>₹${p.oldPrice.toLocaleString()}</del>` : ''}
        </div>
        <span class="product-rating"><span class="star-icon">★</span> ${p.rating}</span>
      </div>
      <div class="product-card-actions">
        <button class="add-to-cart" onclick="event.stopPropagation();addToCart(${p.id})">Add to Bag</button>
        <a class="btn-wa-order" href="https://wa.me/918264329574?text=Hi%20PochiBag!%20I'd%20like%20to%20order%3A%20${encodeURIComponent(p.name)}" target="_blank" rel="noopener" title="Order on WhatsApp" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      </div>
    </div>
  </div>`;
}

// ---------- SHARED FOOTER HTML ----------
function getFooterHTML() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="logo-transparent.png" alt="PochiBag" style="height:56px;width:auto;object-fit:contain;margin-bottom:.75rem;opacity:0.9;"/>
          <div class="footer-brand-sub" style="color:var(--gold);font-family:'Jost',sans-serif;font-size:.7rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:.75rem;">Elegance Meets Chic · Est. 2026</div>
          <p>Curated pieces, soft luxury lifestyle ✨<br>Location: Chandigarh, Kharar<br>Deliveries in India 🇮🇳<br>Email: viannekezzy@gmail.com<br>Phone: +91 8264329574</p>
          <div class="socials">
            <a href="https://facebook.com/vee.hart" target="_blank" rel="noopener" title="Facebook @vee.hart" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
            </a>
            <a href="https://www.instagram.com/pochibag._store/" target="_blank" rel="noopener" title="Instagram @pochibag._store" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://wa.me/918264329574" target="_blank" rel="noopener" title="WhatsApp: +91 8264329574" aria-label="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-links">
          <h4>Shop</h4>
          <ul>
            <li><a href="shop.html?category=Perfumes">Perfumes</a></li>
            <li><a href="shop.html?category=Handbags">Handbags</a></li>
            <li><a href="shop.html?category=Jewellery">Jewellery Sets</a></li>
            <li><a href="shop.html?badge=new">New Arrivals</a></li>
            <li><a href="shop.html?badge=sale">Sale</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Info</h4>
          <ul>
            <li><a href="about.html">Our Story</a></li>
            <li><a href="#">Authenticity</a></li>
            <li><a href="#">Gift Wrapping</a></li>
            <li><a href="#">Shipping & Returns</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Help</h4>
          <ul>
            <li><a href="mailto:viannekezzy@gmail.com">Contact Us</a></li>
            <li><a href="#">Size Guide</a></li>
            <li><a href="#">FAQ</a></li>
            <li><a href="#">Care Guide</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 PochiBag by Vianne. All rights reserved. · India 🇮🇳</p>
        <p>Privacy Policy · Terms of Service · Cookie Settings</p>
      </div>
    </div>
  </footer>`;
}

// ---------- SHARED NAV HTML ----------
function getNavHTML(activePage) {
  return `
  <div class="search-overlay" id="searchOverlay">
    <div class="search-container">
      <button class="close-search" onclick="toggleSearch()">✕</button>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search perfumes, handbags, jewellery..." oninput="performSearch()"/>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div class="search-results" id="searchResults"></div>
    </div>
  </div>

  <div class="cart-sidebar" id="cartSidebar">
    <div class="cart-header">
      <h3>Your Bag <span id="cartCount">0</span></h3>
      <button onclick="toggleCart()">✕</button>
    </div>
    <div id="cartShippingInfo" class="cart-shipping-info"></div>
    <div class="cart-items" id="cartItems">
      <p class="cart-empty">Your bag is empty.</p>
    </div>
    <div id="cartGifting" class="cart-gifting" style="display:none">
      <label class="gift-option">
        <input type="checkbox" id="giftCheck" onchange="toggleGiftWrapping()" />
        <span>🎁 Luxury Gift Wrapping (+ ₹25)</span>
      </label>
      <div id="giftNoteWrap" class="gift-note-wrap">
        <textarea id="orderNoteText" placeholder="Add a personal gift note..." oninput="updateOrderNote(this.value)"></textarea>
      </div>
    </div>
    <div class="cart-footer" id="cartFooter" style="display:none">
      <div class="cart-total">Total <strong id="cartTotal">₹0</strong></div>
      <button class="btn-checkout">Proceed to Checkout</button>
    </div>
  </div>
  <div class="overlay-bg" id="overlayBg" onclick="closeAll()"></div>

  <nav class="navbar" id="navbar">
    <a href="index.html" class="nav-logo">
      <img src="logo-transparent.png" alt="PochiBag" style="height:50px;width:auto;object-fit:contain;"/>
    </a>
    <ul class="nav-links">
      <li><a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a></li>
      <li><a href="shop.html" class="${activePage === 'shop' ? 'active' : ''}">Shop</a></li>
      <li><a href="shop.html?category=Perfumes" class="${activePage === 'perfumes' ? 'active' : ''}">Perfumes</a></li>
      <li><a href="shop.html?category=Handbags" class="${activePage === 'handbags' ? 'active' : ''}">Handbags</a></li>
      <li><a href="shop.html?category=Jewellery" class="${activePage === 'jewellery' ? 'active' : ''}">Jewellery</a></li>
      <li><a href="about.html" class="${activePage === 'about' ? 'active' : ''}">Our Story</a></li>
      <li><a href="shop.html?badge=sale">Sale</a></li>
    </ul>
    <div class="nav-actions">
      <button class="icon-btn" onclick="toggleSearch()" title="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
      <button class="icon-btn" title="Wishlist">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="icon-btn cart-btn" onclick="toggleCart()" title="Shopping Bag">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </button>
    </div>
    <button class="hamburger" id="hamburger" onclick="toggleMenu()">&#9776;</button>
  </nav>

  <div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
    <div class="modal" id="productModal" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-img"><img id="modalImg" src="" alt=""/></div>
      <div class="modal-info">
        <span id="modalCategory" class="modal-category"></span>
        <h2 id="modalName"></h2>
        <div class="modal-rating" id="modalRating"></div>
        <p class="modal-price" id="modalPrice"></p>
        <p class="modal-desc" id="modalDesc"></p>
        <div class="modal-sizes">
          <p>Select Option</p>
          <div class="sizes" id="modalSizes"></div>
        </div>
        <button class="btn-primary modal-add" onclick="addFromModal()">Add to Bag</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <!-- FLOATING WHATSAPP BUTTON -->
  <a href="https://wa.me/918264329574?text=Hi%20PochiBag!%20I'd%20like%20to%20order%20from%20your%20collection%20%F0%9F%A7%A1" 
     target="_blank" rel="noopener" 
     class="whatsapp-float" 
     title="Order via WhatsApp — +91 8264329574"
     aria-label="Chat on WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    <span class="whatsapp-float-label">Order via WhatsApp</span>
  </a>`;
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  setupScrollNav();
  updateCartUI();
  initScrollAnimations();
  // Stagger fade-in with delay
  setTimeout(setupFadeIn, 100);
});

// ESC key handler
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.getElementById("searchOverlay")?.classList.remove("active");
    closeModal?.();
  }
});
