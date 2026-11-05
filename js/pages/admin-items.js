// Admin items list: search, change status, edit, delete (UC-A3, UC-A4)
import { requireAdmin } from '../auth-guard.js';
import { getProducts, setProductStatus, deleteProduct } from '../api.js';
import { el, mainPhotoUrl, formatPrice, showMessage, STATUS_LABEL } from '../render.js';

await requireAdmin();

const rows = document.querySelector('#rows');
const total = document.querySelector('#total');
const search = document.querySelector('#search');
const statusFilter = document.querySelector('#status-filter');
const messages = document.querySelector('#messages');

let products = [];

// Messages passed from the item form: items.html?saved=added
const SAVED = { added: 'Item added and now live on the Shop.', updated: 'Changes saved.', deleted: 'Item deleted.' };
const params = new URLSearchParams(window.location.search);
if (SAVED[params.get('saved')]) showMessage(messages, SAVED[params.get('saved')], 'ok');
if (STATUS_LABEL[params.get('status')]) statusFilter.value = params.get('status');

function statusSelect(product) {
  const select = el('select', { className: `status-select ${product.status}`, attrs: { 'aria-label': `Status of ${product.title}` } },
    Object.entries(STATUS_LABEL).map(([value, label]) =>
      el('option', { text: label, attrs: { value, selected: value === product.status } })
    )
  );
  select.addEventListener('change', async () => {
    const previous = product.status;
    select.disabled = true;
    try {
      await setProductStatus(product.id, select.value);
      product.status = select.value;
      select.className = `status-select ${product.status}`;
      showMessage(messages, `${product.title} is now ${STATUS_LABEL[product.status]}.`, 'ok');
    } catch (error) {
      console.error(error);
      select.value = previous; // put the old status back
      showMessage(messages, 'Status not saved. Try again.', 'error');
    } finally {
      select.disabled = false;
    }
  });
  return select;
}

// Delete asks for confirmation on the page itself (no pop-up box)
function actions(product) {
  const cell = el('div', { className: 'row-actions' });
  const showButtons = () => {
    const edit = el('a', { text: 'Edit', attrs: { href: `item-form.html?id=${product.id}` } });
    const del = el('button', { className: 'link-button', text: 'Delete', attrs: { type: 'button' } });
    del.addEventListener('click', showConfirm);
    cell.replaceChildren(edit, del);
  };
  const showConfirm = () => {
    const yes = el('button', { className: 'btn btn-danger btn-small', text: 'Delete', attrs: { type: 'button' } });
    const no = el('button', { className: 'btn btn-secondary btn-small', text: 'Cancel', attrs: { type: 'button' } });
    no.addEventListener('click', showButtons);
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      try {
        await deleteProduct(product);
        products = products.filter((p) => p.id !== product.id);
        render();
        showMessage(messages, `${product.title} deleted.`, 'ok');
      } catch (error) {
        console.error(error);
        showMessage(messages, error.message, 'error');
        showButtons();
      }
    });
    cell.replaceChildren(el('span', { className: 'confirm' }, [el('span', { text: "Delete? This can't be undone." }), yes, no]));
    no.focus();
  };
  showButtons();
  return cell;
}

function render() {
  const words = search.value.trim().toLowerCase();
  const shown = products.filter((p) =>
    (!words || p.title.toLowerCase().includes(words)) && (!statusFilter.value || p.status === statusFilter.value)
  );
  total.textContent = `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`;

  if (shown.length === 0) {
    rows.replaceChildren(el('tr', {}, [el('td', {
      text: products.length ? 'No items match.' : 'No items yet. Use "+ Add item" to list your first piece.',
      attrs: { colspan: 6 },
    })]));
    return;
  }

  rows.replaceChildren(...shown.map((p) => {
    const url = mainPhotoUrl(p);
    return el('tr', {}, [
      el('td', {}, [el('div', { className: 'piece' }, [
        url ? el('img', { className: 'thumb', attrs: { src: url, alt: '' } }) : el('div', { className: 'thumb' }),
        el('div', {}, [el('strong', { text: p.title }), p.origin ? el('small', { text: p.origin }) : null]),
      ])]),
      el('td', { text: p.categories?.name || '' }),
      el('td', { text: p.size }),
      el('td', { text: formatPrice(p.price) }),
      el('td', {}, [statusSelect(p)]),
      el('td', {}, [actions(p)]),
    ]);
  }));
}

try {
  products = await getProducts();
  render();
  document.querySelector('#filters').addEventListener('input', render);
  document.querySelector('#filters').addEventListener('submit', (e) => e.preventDefault());
} catch (error) {
  console.error(error);
  rows.replaceChildren();
  showMessage(messages, "Couldn't load items. Refresh the page.", 'error');
}
