// ============================
// POCHIBAG — Product Page Script
// ============================

let currentProduct = null;
let selectedProductSize = "";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("navPlaceholder").outerHTML = getNavHTML("");
  document.getElementById("footerPlaceholder").outerHTML = getFooterHTML();

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));

  if (!id) {
    window.location.href = "shop.html";
    return;
  }

  const product = PRODUCTS.find(p => p.id === id);
  if (!product) {
    window.location.href = "shop.html";
    return;
  }

  currentProduct = product;
  renderProduct(product);
  renderRelated(product);
});

function renderProduct(p) {
  document.title = `${p.name} — PochiBag`;

  // Breadcrumb
  const breadCat = document.getElementById("breadCat");
  const breadName = document.getElementById("breadName");
  if (breadCat) { breadCat.textContent = p.category; breadCat.href = `shop.html?category=${p.category}`; }
  if (breadName) breadName.textContent = p.name;

  // Image + Gallery
  const img = document.getElementById("productImg");
  const placeholder = document.getElementById("galleryPlaceholder");
  const placeholderIcon = document.getElementById("placeholderIcon");
  const thumbsContainer = document.getElementById("galleryThumbs");

  if (img && p.img) {
    img.src = p.img;
    img.alt = p.name;
    img.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  } else if (placeholderIcon) {
    const icons = { Perfumes: "🫧", Handbags: "👜", Jewellery: "💍" };
    placeholderIcon.textContent = icons[p.category] || "📦";
  }

  // Render thumbnails if multiple images exist
  if (thumbsContainer && p.images && p.images.length > 1) {
    thumbsContainer.innerHTML = p.images.map((src, i) =>
      `<button class="gallery-thumb${i === 0 ? ' active' : ''}" onclick="switchGalleryImage('${src.replace(/'/g, "\\'")}', this)" title="View image ${i + 1}">
        <img src="${src}" alt="${p.name} view ${i + 1}" loading="lazy" />
      </button>`
    ).join("");
    thumbsContainer.style.display = "flex";
  } else {
    if (thumbsContainer) thumbsContainer.style.display = "none";
  }

  // Badge on gallery
  const galleryBadge = document.getElementById("galleryBadge");
  if (galleryBadge && p.badge) {
    const badgeMap = { new: 'badge-new', bestseller: 'badge-bestseller', sale: 'badge-sale', exclusive: 'badge-exclusive', hot: 'badge-hot' };
    const badgeLabel = { new: 'New In', bestseller: 'Best Seller', sale: 'Sale', exclusive: 'Exclusive', hot: '🔥 Hot' };
    galleryBadge.className = `product-badge gallery-badge ${badgeMap[p.badge] || ''}`;
    galleryBadge.textContent = badgeLabel[p.badge] || p.badge;
    galleryBadge.style.display = "block";
  }

  // Text
  const el = id => document.getElementById(id);

  el("productCat").textContent = p.subcategory || p.category;
  el("productName").textContent = p.name;

  // Rating
  const rating = parseFloat(p.rating);
  const stars = Math.round(rating);
  el("productStars").textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  el("productRating").textContent = `${p.rating} · ${p.reviews} reviews`;

  // Price
  const initialSize = (p.sizes && p.sizes[0]) || "One Size";
  const initialPrice = getProductPrice(p, initialSize);
  el("productPrice").textContent = `₹${initialPrice.toLocaleString()}`;
  if (p.oldPrice) {
    el("productOldPrice").textContent = `₹${p.oldPrice.toLocaleString()}`;
    el("productOldPrice").style.display = "inline";
    const saving = Math.round((1 - initialPrice / p.oldPrice) * 100);
    el("productSaveTag").textContent = `Save ${saving}%`;
    el("productSaveTag").style.display = "inline";
  }

  el("productDesc").textContent = p.desc;

  // Scent Notes (Perfumes)
  if (p.notes && p.category === "Perfumes") {
    el("scentNotes").style.display = "block";
    el("notesTop").textContent = p.notes.top;
    el("notesHeart").textContent = p.notes.heart;
    el("notesBase").textContent = p.notes.base;
  }

  // Includes (Jewellery)
  if (p.includes && p.category === "Jewellery") {
    el("includesList").style.display = "block";
    el("includesItems").innerHTML = p.includes.map(item => `<li>${item}</li>`).join("");
  }

  // Materials (Bags / Jewellery)
  if (p.materials) {
    el("materialsRow").style.display = "block";
    el("materialsText").textContent = p.materials;
  }

  // Sizes
  const sizes = p.sizes || ["One Size"];
  selectedProductSize = sizes[0];
  const sizeLabel = el("sizeLabel");
  if (sizeLabel) {
    if (p.category === "Perfumes") sizeLabel.textContent = "Select Volume";
    else if (p.category === "Handbags") sizeLabel.textContent = "Select Size";
    else sizeLabel.textContent = "Select Option";
  }

  const sizeGrid = el("sizeGrid");
  if (sizeGrid) {
    sizeGrid.innerHTML = sizes.map(s =>
      `<button class="size-btn${s === selectedProductSize ? ' selected' : ''}" onclick="selectProductSize('${s}', this)">${s}</button>`
    ).join("");
  }

  // Wishlist
  const wBtn = el("wishlistBtn");
  if (wBtn) {
    const isWished = wishlist.includes(p.id);
    wBtn.textContent = isWished ? "♥" : "♡";
    wBtn.style.color = isWished ? "var(--accent-red)" : "";
    wBtn.dataset.id = p.id;
    wBtn.dataset.wished = isWished ? "true" : "false";
  }
}

function switchGalleryImage(src, thumbEl) {
  const mainImg = document.getElementById("productImg");
  if (!mainImg) return;

  // Smooth fade transition
  mainImg.style.opacity = "0";
  setTimeout(() => {
    mainImg.src = src;
    mainImg.style.opacity = "1";
  }, 180);

  // Update active thumbnail
  document.querySelectorAll(".gallery-thumb").forEach(b => b.classList.remove("active"));
  if (thumbEl) thumbEl.classList.add("active");
}

function selectProductSize(size, el) {
  selectedProductSize = size;
  document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
  
  if (currentProduct) {
    const currentPrice = getProductPrice(currentProduct, size);
    const priceEl = document.getElementById("productPrice");
    if (priceEl) priceEl.textContent = `₹${currentPrice.toLocaleString()}`;
    if (currentProduct.oldPrice) {
      const saving = Math.round((1 - currentPrice / currentProduct.oldPrice) * 100);
      const tag = document.getElementById("productSaveTag");
      if (tag) tag.textContent = `Save ${saving}%`;
    }
  }
}

function addFromProductPage() {
  if (!currentProduct) return;
  addToCart(currentProduct.id, selectedProductSize);
  setTimeout(() => toggleCart(), 300);
}

// ---------- RELATED PRODUCTS ----------
function renderRelated(p) {
  const grid = document.getElementById("relatedGrid");
  if (!grid) return;

  const related = PRODUCTS
    .filter(x => x.id !== p.id && x.category === p.category)
    .slice(0, 4);

  if (related.length === 0) {
    const section = document.querySelector(".related-section");
    if (section) section.style.display = "none";
    return;
  }

  grid.innerHTML = related.map(renderProductCard).join("");
}

// ---------- ACCORDION ----------
function toggleDetail(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.contains("open");

  // Close all
  document.querySelectorAll(".detail-toggle").forEach(b => b.classList.remove("open"));
  document.querySelectorAll(".detail-body").forEach(b => b.classList.remove("open"));

  if (!isOpen) {
    btn.classList.add("open");
    body.classList.add("open");
  }
}
