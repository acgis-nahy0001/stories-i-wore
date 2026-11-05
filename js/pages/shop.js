// Shop page: browse by category, search and filter (UC-C1, UC-C2)
// All pieces load once; filtering happens in the browser, which is
// instant for a small closet.
import { getCategories, getProducts } from '../api.js';
import { el, productCard, showMessage, idFromUrl } from '../render.js';

const form = document.querySelector('#filters');
const search = document.querySelector('#search');
const categorySelect = document.querySelector('#category');
const sizeSelect = document.querySelector('#size');
const conditionSelect = document.querySelector('#condition');
const sortSelect = document.querySelector('#sort');
const grid = document.querySelector('#grid');
const count = document.querySelector('#count');
const title = document.querySelector('#shop-title');
const messages = document.querySelector('#messages');

let products = [];
let categories = [];

function addOptions(select, items) {
  select.append(...items.map(({ value, label }) => el('option', { text: label, attrs: { value } })));
}

function render() {
  const words = search.value.trim().toLowerCase();
  const categoryId = categorySelect.value ? Number(categorySelect.value) : null;

  let shown = products.filter((p) =>
    (!words || `${p.title} ${p.description || ''} ${p.origin || ''}`.toLowerCase().includes(words)) &&
    (!categoryId || p.category_id === categoryId) &&
    (!sizeSelect.value || p.size === sizeSelect.value) &&
    (!conditionSelect.value || p.condition === conditionSelect.value)
  );

  if (sortSelect.value === 'low') shown = [...shown].sort((a, b) => a.price - b.price);
  if (sortSelect.value === 'high') shown = [...shown].sort((a, b) => b.price - a.price);

  const category = categories.find((c) => c.id === categoryId);
  title.textContent = category ? category.name : 'All pieces';
  document.title = `${title.textContent} · Stories I Wore`;
  count.textContent = `${shown.length} one-of-a-kind ${shown.length === 1 ? 'piece' : 'pieces'}`;

  if (shown.length === 0) {
    const clear = el('button', { className: 'btn btn-secondary btn-small', text: 'Clear all filters', attrs: { type: 'button' } });
    clear.addEventListener('click', () => { form.reset(); render(); });
    grid.replaceChildren(el('div', { className: 'empty-state' }, [el('span', { text: 'No pieces match.' }), clear]));
  } else {
    grid.replaceChildren(...shown.map(productCard));
  }
}

try {
  [categories, products] = await Promise.all([getCategories(), getProducts({ forShop: true })]);

  addOptions(categorySelect, categories.map((c) => ({ value: c.id, label: c.name })));
  const sizes = [...new Set(products.map((p) => p.size))].sort();
  addOptions(sizeSelect, sizes.map((s) => ({ value: s, label: s })));

  // Arriving from a category tile: shop.html?category=3
  const fromUrl = idFromUrl('category');
  if (fromUrl && categories.some((c) => c.id === fromUrl)) categorySelect.value = String(fromUrl);

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('reset', () => setTimeout(render)); // wait for the browser to clear the fields
  form.addEventListener('submit', (e) => e.preventDefault());
  render();
} catch (error) {
  console.error(error);
  count.textContent = '';
  showMessage(messages, "We couldn't load items. Please refresh the page.", 'error');
}
