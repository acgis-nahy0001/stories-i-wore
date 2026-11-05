// =====================================================================
// Safe rendering helpers.
// SECURITY (XSS): every piece of data from the database is put on the page
// with textContent or setAttribute, NEVER with innerHTML. So if someone
// types <script> into a title, it shows as plain text and never runs.
// =====================================================================

// el('a', { className: 'x', text: 'Hi', attrs: { href: '/' } }, [children])
export function el(tag, { className, text, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

export const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold: 'Sold' };

export function formatPrice(value) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(value));
}

export function sortedPhotos(product) {
  return [...(product.product_photos || [])].sort((a, b) => a.sort_order - b.sort_order);
}

export function mainPhotoUrl(product) {
  const first = sortedPhotos(product)[0];
  return first ? first.photo_url : null;
}

// An <img>, or a soft placeholder box when there is no photo yet
export function photo(url, alt, className = 'photo') {
  if (!url) return el('div', { className: `${className} photo-missing`, text: 'No photo yet' });
  return el('img', { className, attrs: { src: url, alt, loading: 'lazy' } });
}

export function statusChip(status) {
  return el('span', { className: `chip chip-${status}`, text: STATUS_LABEL[status] || status });
}

// Shows one message inside a container (replacing any older one)
export function showMessage(container, text, kind = 'info') {
  if (!container) return;
  container.replaceChildren(
    el('p', { className: `message ${kind}`, text, attrs: { role: kind === 'error' ? 'alert' : 'status' } })
  );
}

export function clearMessage(container) {
  if (container) container.replaceChildren();
}

// The product card used on Home and Shop
export function productCard(product) {
  const photoBox = el('div', { className: 'card-photo' }, [
    photo(mainPhotoUrl(product), product.title),
    product.origin ? el('span', { className: 'card-origin', text: product.origin }) : null,
    product.status === 'reserved' ? el('span', { className: 'card-badge', text: 'Reserved' }) : null,
  ]);

  return el('a', { className: 'product-card', attrs: { href: `item.html?id=${encodeURIComponent(product.id)}` } }, [
    photoBox,
    el('span', { className: 'card-title', text: product.title }),
    el('span', { className: 'card-meta', text: `Size ${product.size} · ${product.condition}` }),
    el('span', { className: 'price', text: formatPrice(product.price) }),
  ]);
}

// Reads a whole number id from the address bar (?id=12), or null
export function idFromUrl(name = 'id') {
  const raw = new URLSearchParams(window.location.search).get(name);
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}
