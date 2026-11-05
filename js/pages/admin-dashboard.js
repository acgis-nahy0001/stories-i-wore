// Admin dashboard: counts by status and recently listed pieces
import { requireAdmin } from '../auth-guard.js';
import { countProducts, countNewOrders, getProducts } from '../api.js';
import { el, photo, mainPhotoUrl, showMessage } from '../render.js';

await requireAdmin();

const messages = document.querySelector('#messages');
const recent = document.querySelector('#recent');

try {
  const [available, reserved, sold, orders, latest] = await Promise.all([
    countProducts('available'),
    countProducts('reserved'),
    countProducts('sold'),
    countNewOrders(),
    getProducts({ limit: 6 }),
  ]);

  document.querySelector('#count-available').textContent = available;
  document.querySelector('#count-reserved').textContent = reserved;
  document.querySelector('#count-sold').textContent = sold;
  document.querySelector('#count-orders').textContent = orders;

  if (latest.length === 0) {
    recent.replaceChildren(
      el('p', { className: 'empty-state' }, [
        el('span', { text: 'No items yet.' }),
        el('a', { className: 'btn btn-small', text: 'Add your first item', attrs: { href: 'item-form.html' } }),
      ])
    );
  } else {
    recent.replaceChildren(
      ...latest.map((p) =>
        el('a', { attrs: { href: `item-form.html?id=${p.id}` } }, [photo(mainPhotoUrl(p), p.title), el('span', { text: p.title })])
      )
    );
  }
} catch (error) {
  console.error(error);
  showMessage(messages, "Couldn't load the dashboard. Refresh the page; if it keeps happening, check that your Supabase project isn't paused.", 'error');
}
