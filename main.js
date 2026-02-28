/* ============================================
   African Fashion - main.js
   Pure vanilla JS – no external dependencies
   ============================================ */

'use strict';

// ── Product Data ──────────────────────────────
const PRODUCTS = [
  {
    id: 1,
    name: 'Ankara Wrap Dress',
    desc: 'Vibrant wax-print wrap dress with a bold geometric pattern.',
    price: 89.99,
    category: 'Ankara',
    emoji: '👗',
    bg: 'linear-gradient(135deg, #E85D04 0%, #F48C06 100%)',
  },
  {
    id: 2,
    name: 'Kente Ceremonial Robe',
    desc: 'Hand-woven Kente cloth robe fit for royalty.',
    price: 149.99,
    category: 'Kente',
    emoji: '🥻',
    bg: 'linear-gradient(135deg, #FFBA08 0%, #F48C06 100%)',
  },
  {
    id: 3,
    name: 'Dashiki Tunic',
    desc: 'Classic embroidered Dashiki tunic in rich earth tones.',
    price: 54.99,
    category: 'Dashiki',
    emoji: '👕',
    bg: 'linear-gradient(135deg, #006400 0%, #228B22 100%)',
  },
  {
    id: 4,
    name: 'Beaded Necklace Set',
    desc: 'Hand-crafted multi-strand Maasai beaded necklace set.',
    price: 34.99,
    category: 'Accessories',
    emoji: '📿',
    bg: 'linear-gradient(135deg, #370617 0%, #6A040F 100%)',
  },
  {
    id: 5,
    name: 'Ankara Peplum Top',
    desc: 'Flared peplum top crafted from printed Ankara fabric.',
    price: 49.99,
    category: 'Ankara',
    emoji: '👚',
    bg: 'linear-gradient(135deg, #D62828 0%, #E85D04 100%)',
  },
  {
    id: 6,
    name: 'Kente Kufi Cap',
    desc: 'Authentic Kente-striped kufi cap with intricate weave.',
    price: 28.99,
    category: 'Kente',
    emoji: '🎩',
    bg: 'linear-gradient(135deg, #F48C06 0%, #FFBA08 100%)',
  },
  {
    id: 7,
    name: 'Dashiki Agbada Set',
    desc: 'Full three-piece Agbada set with elaborate embroidery.',
    price: 199.99,
    category: 'Dashiki',
    emoji: '🧥',
    bg: 'linear-gradient(135deg, #1B4332 0%, #006400 100%)',
  },
  {
    id: 8,
    name: 'Adinkra Leather Bag',
    desc: 'Genuine leather tote stamped with traditional Adinkra symbols.',
    price: 79.99,
    category: 'Accessories',
    emoji: '👜',
    bg: 'linear-gradient(135deg, #6A040F 0%, #370617 100%)',
  },
  {
    id: 9,
    name: 'Ankara Midi Skirt',
    desc: 'A-line midi skirt in bold African wax print fabric.',
    price: 59.99,
    category: 'Ankara',
    emoji: '👘',
    bg: 'linear-gradient(135deg, #F48C06 0%, #E85D04 100%)',
  },
  {
    id: 10,
    name: 'Cowrie Shell Bracelet',
    desc: 'Stacked cowrie shell and copper bead bracelet set.',
    price: 22.99,
    category: 'Accessories',
    emoji: '🔮',
    bg: 'linear-gradient(135deg, #FFBA08 0%, #E85D04 100%)',
  },
  {
    id: 11,
    name: 'Kente Scarf',
    desc: 'Lightweight Kente-inspired scarf in multicolour silk blend.',
    price: 38.99,
    category: 'Kente',
    emoji: '🧣',
    bg: 'linear-gradient(135deg, #FFBA08 0%, #228B22 50%, #E85D04 100%)',
  },
  {
    id: 12,
    name: 'Dashiki Kaftan',
    desc: 'Relaxed fit kaftan with intricate Dashiki chest embroidery.',
    price: 72.99,
    category: 'Dashiki',
    emoji: '🩱',
    bg: 'linear-gradient(135deg, #006400 0%, #FFBA08 100%)',
  },
];

// ── State ─────────────────────────────────────
let cart = [];                 // [{ product, qty }]
let activeFilter = 'All';

// ── DOM References ────────────────────────────
const productGrid   = document.getElementById('product-grid');
const filterBar     = document.getElementById('filter-bar');
const cartDrawer    = document.getElementById('cart-drawer');
const cartOverlay   = document.getElementById('cart-overlay');
const cartItemsList = document.getElementById('cart-items-list');
const cartBadge     = document.getElementById('cart-badge');
const cartTotal     = document.getElementById('cart-total');
const cartSubtotal  = document.getElementById('cart-subtotal');
const toastContainer = document.getElementById('toast-container');

// ── Render Products ───────────────────────────
function renderProducts(filter) {
  const filtered = filter === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  // Fade-out existing visible cards, then rebuild
  productGrid.innerHTML = '';

  if (filtered.length === 0) {
    productGrid.innerHTML = '<p style="text-align:center;color:var(--text-mid);grid-column:1/-1;padding:3rem 0;">No products found.</p>';
    return;
  }

  filtered.forEach((product, idx) => {
    const card = buildProductCard(product, idx);
    productGrid.appendChild(card);
  });
}

function buildProductCard(product, idx) {
  const inCart = cart.find(i => i.product.id === product.id);
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.id = product.id;
  card.style.animationDelay = `${idx * 0.05}s`;

  card.innerHTML = `
    <div class="product-image" style="background:${product.bg}">
      <span>${product.emoji}</span>
      <span class="category-tag">${product.category}</span>
    </div>
    <div class="product-body">
      <div class="product-name">${product.name}</div>
      <div class="product-desc">${product.desc}</div>
      <div class="product-footer">
        <span class="product-price">$${product.price.toFixed(2)}</span>
        <button
          class="add-to-cart-btn${inCart ? ' added' : ''}"
          data-id="${product.id}"
          aria-label="Add ${product.name} to cart"
        >
          ${inCart ? '✓ Added' : '＋ Add'}
        </button>
      </div>
    </div>
  `;

  card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
  return card;
}

// ── Filter Buttons ────────────────────────────
function buildFilters() {
  const categories = ['All', ...new Set(PRODUCTS.map(p => p.category))];
  filterBar.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${cat === activeFilter ? ' active' : ''}`;
    btn.textContent = cat;
    btn.setAttribute('aria-pressed', cat === activeFilter);
    btn.addEventListener('click', () => {
      activeFilter = cat;
      filterBar.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.textContent === cat);
        b.setAttribute('aria-pressed', b.textContent === cat);
      });
      renderProducts(cat);
    });
    filterBar.appendChild(btn);
  });
}

// ── Cart Logic ────────────────────────────────
function addToCart(product) {
  const existing = cart.find(i => i.product.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ product, qty: 1 });
  }
  updateCartUI();
  showToast(`${product.emoji} "${product.name}" added to cart`);

  // Update button state on visible card
  const btn = productGrid.querySelector(`[data-id="${product.id}"]`);
  if (btn) {
    btn.classList.add('added');
    btn.textContent = '✓ Added';
  }
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.product.id !== productId);
  updateCartUI();
  renderProducts(activeFilter);   // refresh button states
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  // Badge
  cartBadge.textContent = totalItems;
  cartBadge.classList.add('bump');
  setTimeout(() => cartBadge.classList.remove('bump'), 300);

  // Cart totals
  const shipping = totalPrice > 0 ? (totalPrice >= 100 ? 0 : 9.99) : 0;
  cartSubtotal.textContent = `$${totalPrice.toFixed(2)}`;
  cartTotal.textContent    = `$${(totalPrice + shipping).toFixed(2)}`;

  // Render cart items
  cartItemsList.innerHTML = '';

  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>Your cart is empty.<br>Start adding some beautiful pieces!</p>
      </div>`;
    return;
  }

  cart.forEach(({ product, qty }) => {
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <div class="cart-item-thumb" style="background:${product.bg}">${product.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${product.name}</div>
        <div class="cart-item-price">$${(product.price * qty).toFixed(2)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-action="dec" data-id="${product.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-value">${qty}</span>
        <button class="qty-btn" data-action="inc" data-id="${product.id}" aria-label="Increase quantity">＋</button>
        <button class="remove-item-btn" data-id="${product.id}" aria-label="Remove ${product.name}">🗑</button>
      </div>
    `;

    item.querySelector('[data-action="dec"]').addEventListener('click', () => changeQty(product.id, -1));
    item.querySelector('[data-action="inc"]').addEventListener('click', () => changeQty(product.id, +1));
    item.querySelector('.remove-item-btn').addEventListener('click', () => removeFromCart(product.id));

    cartItemsList.appendChild(item);
  });

  // Add shipping note
  if (totalPrice < 100) {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.78rem;color:var(--text-mid);text-align:center;padding:0.8rem 0 0;';
    note.textContent = `Spend $${(100 - totalPrice).toFixed(2)} more for free shipping!`;
    cartItemsList.appendChild(note);
  } else {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.78rem;color:var(--green);text-align:center;padding:0.8rem 0 0;font-weight:700;';
    note.textContent = '🎉 You qualify for free shipping!';
    cartItemsList.appendChild(note);
  }
}

// ── Cart Drawer Toggle ────────────────────────
function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  cartDrawer.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
  cartDrawer.setAttribute('aria-hidden', 'true');
}

// ── Toast Notification ────────────────────────
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

// ── Newsletter Form ───────────────────────────
function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  if (input && input.value) {
    showToast('📬 Thanks for subscribing!');
    input.value = '';
  }
}

// ── Checkout Placeholder ──────────────────────
function handleCheckout() {
  if (cart.length === 0) {
    showToast('🛒 Your cart is empty!');
    return;
  }
  showToast('✅ Order placed! Thank you for shopping with AfricanFashion!');
  cart = [];
  updateCartUI();
  closeCart();
}

// ── Smooth scroll for CTA ─────────────────────
function scrollToCollections() {
  document.getElementById('collections').scrollIntoView({ behavior: 'smooth' });
}

// ── Mobile nav toggle ─────────────────────────
function setupMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('mobile-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Initialise ────────────────────────────────
function init() {
  buildFilters();
  renderProducts('All');
  updateCartUI();
  setupMobileNav();

  // Cart open/close
  document.getElementById('open-cart-btn').addEventListener('click', openCart);
  document.getElementById('close-cart-btn').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // Hero CTA
  document.getElementById('hero-cta').addEventListener('click', scrollToCollections);

  // Checkout
  document.getElementById('checkout-btn').addEventListener('click', handleCheckout);

  // Newsletter
  const nlForm = document.getElementById('newsletter-form');
  if (nlForm) nlForm.addEventListener('submit', handleNewsletter);

  // Keyboard: close cart with Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });
}

document.addEventListener('DOMContentLoaded', init);
