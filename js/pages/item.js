// Item page: photos and every detail customers used to message about (UC-C3)
import { getProduct } from '../api.js';
import { el, photo, sortedPhotos, formatPrice, showMessage, idFromUrl } from '../render.js';

const box = document.querySelector('#item');
const breadcrumb = document.querySelector('#breadcrumb');
const messages = document.querySelector('#messages');

function notFound() {
  box.replaceChildren(
    el('div', { className: 'empty-state' }, [
      el('span', { text: 'This piece has found a new home.' }),
      el('a', { className: 'btn btn-secondary btn-small', text: 'Back to the shop', attrs: { href: 'shop.html' } }),
    ])
  );
}

function gallery(product) {
  const photos = sortedPhotos(product);
  const main = el('div', { className: 'gallery-main' }, [photo(photos[0]?.photo_url, product.title)]);
  if (photos.length < 2) return el('section', { className: 'gallery', attrs: { 'aria-label': 'Photos' } }, [main]);

  const thumbs = el('div', { className: 'gallery-thumbs' });
  photos.forEach((p, i) => {
    const button = el('button', {
      attrs: { type: 'button', 'aria-label': `Show photo ${i + 1} of ${photos.length}`, 'aria-pressed': i === 0 ? 'true' : 'false' },
    }, [el('img', { attrs: { src: p.photo_url, alt: '' } })]);
    button.addEventListener('click', () => {
      main.replaceChildren(photo(p.photo_url, `${product.title}, photo ${i + 1}`));
      thumbs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    });
    thumbs.append(button);
  });
  return el('section', { className: 'gallery', attrs: { 'aria-label': 'Photos' } }, [thumbs, main]);
}

function buyArea(product) {
  if (product.status === 'reserved') {
    return el('div', { className: 'item-buy' }, [
      el('button', { className: 'btn', text: 'Reserved', attrs: { type: 'button', disabled: true } }),
      el('small', { text: 'Someone has claimed this piece. It may come back if their order is cancelled.' }),
    ]);
  }
  const button = el('button', { className: 'btn', text: 'Add to cart', attrs: { type: 'button' } });
  button.addEventListener('click', () =>
    showMessage(messages, 'Cart and checkout are coming in the next iteration (W10 to W12).', 'info')
  );
  return el('div', { className: 'item-buy' }, [
    button,
    el('small', { text: "One of a kind: once it's gone, it's gone." }),
  ]);
}

function render(product) {
  document.title = `${product.title} · Stories I Wore`;
  breadcrumb.append(el('span', { text: '/' }), el('span', { text: product.title }));

  const details = el('dl', { className: 'item-details' }, [
    el('div', {}, [el('dt', { text: 'Size' }), el('dd', { text: product.size })]),
    el('div', {}, [el('dt', { text: 'Condition' }), el('dd', { text: product.condition })]),
    product.measurements
      ? el('div', { className: 'wide' }, [el('dt', { text: 'Measurements' }), el('dd', { text: product.measurements })])
      : null,
    el('div', {}, [el('dt', { text: 'Category' }), el('dd', { text: product.categories?.name || '' })]),
  ]);

  const info = el('section', { className: 'item-info' }, [
    product.origin ? el('span', { className: 'origin-tag', text: product.origin }) : null,
    el('h1', { text: product.title }),
    el('span', { className: 'price', text: formatPrice(product.price) }),
    details,
    product.description ? el('p', { className: 'item-description', text: product.description }) : null,
    buyArea(product),
  ]);

  box.replaceChildren(el('div', { className: 'item-layout' }, [gallery(product), info]));
}

const id = idFromUrl('id');
if (!id) {
  notFound();
} else {
  try {
    const product = await getProduct(id, { forShop: true });
    if (product) render(product);
    else notFound();
  } catch (error) {
    console.error(error);
    box.replaceChildren();
    showMessage(messages, "We couldn't load this piece. Please refresh the page.", 'error');
  }
}
