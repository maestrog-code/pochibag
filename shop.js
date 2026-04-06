// ============================
// POCHIBAG — Shop Page Script
// ============================

let selectedCat = "all";
let selectedSub = null;
let selectedBadge = null;
let maxPrice = 5000;
let sortMode = "default";
let visibleCount = 9;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("navPlaceholder").outerHTML = getNavHTML("shop");
  document.getElementById("footerPlaceholder").outerHTML = getFooterHTML();

  // Read URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get("category")) {
    selectedCat = params.get("category");
    document.querySelectorAll("[data-cat]").forEach(b => {
      b.classList.toggle("active", b.dataset.cat === selectedCat);
    });
  }
  if (params.get("badge")) {
    selectedBadge = params.get("badge");
    document.querySelectorAll("[data-badge]").forEach(b => {
      b.classList.toggle("active", b.dataset.badge === selectedBadge);
    });
  }

  applyFilters();
  setupSidebarListeners();
});

function setupSidebarListeners() {
  // Category
  document.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-cat]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCat = btn.dataset.cat;
      visibleCount = 9;
      applyFilters();
    });
  });

  // Sub-category
  document.querySelectorAll("[data-sub]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        selectedSub = null;
      } else {
        document.querySelectorAll("[data-sub]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedSub = btn.dataset.sub;
      }
      visibleCount = 9;
      applyFilters();
    });
  });

  // Badge
  document.querySelectorAll("[data-badge]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        selectedBadge = null;
      } else {
        document.querySelectorAll("[data-badge]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedBadge = btn.dataset.badge;
      }
      visibleCount = 9;
      applyFilters();
    });
  });
}

function updatePriceFilter(val) {
  maxPrice = parseInt(val);
  document.getElementById("priceLabel").textContent = `Up to $${Number(val).toLocaleString()}`;
  applyFilters();
}

function applySort() {
  sortMode = document.getElementById("sortSelect").value;
  applyFilters();
}

function applyFilters() {
  let filtered = [...PRODUCTS];

  if (selectedCat !== "all") filtered = filtered.filter(p => p.category === selectedCat);
  if (selectedSub) filtered = filtered.filter(p => p.subcategory === selectedSub);
  if (selectedBadge) filtered = filtered.filter(p => p.badge === selectedBadge);
  filtered = filtered.filter(p => p.price <= maxPrice);

  // Sort
  if (sortMode === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sortMode === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sortMode === "rating") filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  else if (sortMode === "new") filtered = filtered.filter(p => p.badge === "new").concat(filtered.filter(p => p.badge !== "new"));

  renderShopGrid(filtered);
}

function renderShopGrid(products) {
  const grid = document.getElementById("shopGrid");
  const count = document.getElementById("resultsCount");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  if (!grid) return;

  const visible = products.slice(0, visibleCount);

  if (count) count.innerHTML = `Showing <strong>${visible.length}</strong> of <strong>${products.length}</strong> products`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <h3>No products found</h3>
        <p>Try adjusting your filters or browsing all categories.</p>
      </div>`;
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
    return;
  }

  grid.innerHTML = visible.map(renderProductCard).join("");
  if (loadMoreWrap) loadMoreWrap.style.display = visible.length < products.length ? "block" : "none";

  // Store for load more
  window._shopFiltered = products;
}

function loadMore() {
  visibleCount += 6;
  if (window._shopFiltered) {
    renderShopGrid(window._shopFiltered);
  }
}

function clearAllFilters() {
  selectedCat = "all";
  selectedSub = null;
  selectedBadge = null;
  maxPrice = 5000;
  sortMode = "default";
  visibleCount = 9;

  document.querySelectorAll("[data-cat]").forEach(b => b.classList.toggle("active", b.dataset.cat === "all"));
  document.querySelectorAll("[data-sub], [data-badge]").forEach(b => b.classList.remove("active"));

  const priceRange = document.getElementById("priceRange");
  const priceLabel = document.getElementById("priceLabel");
  const sortSelect = document.getElementById("sortSelect");
  if (priceRange) priceRange.value = 5000;
  if (priceLabel) priceLabel.textContent = "Up to $5,000";
  if (sortSelect) sortSelect.value = "default";

  applyFilters();
}
