// ============================
// POCHIBAG — Homepage Script
// ============================

document.addEventListener("DOMContentLoaded", () => {
  // Inject nav & footer
  const navEl = document.getElementById("navPlaceholder");
  if (navEl) navEl.outerHTML = getNavHTML("home");
  const footerEl = document.getElementById("footerPlaceholder");
  if (footerEl) footerEl.outerHTML = getFooterHTML();

  renderNewArrivals("all");
  renderTrending();
  setupFilters();

  // Force scroll animations to re-init after content rendered
  setTimeout(initScrollAnimations, 100);

  // Make sections visible that might be off due to opacity:0
  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    // Check if element is in viewport
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.classList.add('is-visible');
    }
  });
});

// ---------- RENDER NEW ARRIVALS ----------
let currentFilter = "all";
const INITIAL_SHOW = 8;

function renderNewArrivals(filter) {
  currentFilter = filter;
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const filtered = filter === "all"
    ? PRODUCTS.slice(0, INITIAL_SHOW)
    : PRODUCTS.filter(p => p.category === filter).slice(0, INITIAL_SHOW);

  grid.innerHTML = filtered.map(renderProductCard).join("");
}

// ---------- FILTER BUTTONS ----------
function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      renderNewArrivals(filter);
    });
  });
}

// ---------- TRENDING ----------
function renderTrending() {
  const grid = document.getElementById("trendingGrid");
  if (!grid || typeof TRENDING === "undefined") return;

  grid.innerHTML = TRENDING.map(t => `
    <div class="trending-item" onclick="window.location.href='product.html?id=${t.id}'">
      <span class="trending-rank">0${t.rank}</span>
      <img class="trending-img" src="${t.img}" alt="${t.name}" loading="lazy"/>
      <div class="trending-info">
        <div class="t-cat">${t.category}</div>
        <div class="t-name">${t.name}</div>
        <div class="t-price">${t.price}</div>
      </div>
    </div>
  `).join("");
}

// ---------- NEWSLETTER ----------
function subscribeNewsletter() {
  const email = document.getElementById("nlEmail")?.value.trim();
  if (!email || !email.includes("@")) {
    showToast("Please enter a valid email address.");
    return;
  }
  showToast("✨ Welcome to the PochiBag inner circle!");
  if (document.getElementById("nlEmail")) document.getElementById("nlEmail").value = "";
}
