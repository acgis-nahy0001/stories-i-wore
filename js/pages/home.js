// Home page: categories, newest pieces, and the hero photo (UC-C1)
import { getCategories, getProducts } from '../api.js';
import { el, productCard, photo, mainPhotoUrl, showMessage } from '../render.js';

const categoryGrid = document.querySelector('#category-grid');
const newGrid = document.querySelector('#new-grid');
const heroPhoto = document.querySelector('#hero-photo');
const messages = document.querySelector('#messages');

try {
  const [categories, newest] = await Promise.all([
    getCategories(),
    getProducts({ forShop: true, limit: 4 }),
  ]);

  // Category tiles link to the Shop, filtered: shop.html?category=3
  categoryGrid.replaceChildren(
    ...categories.map((c) =>
      el('a', { className: 'category-tile', attrs: { href: `shop.html?category=${c.id}` } }, [
        el('span', { text: c.name }),
      ])
    )
  );

  if (newest.length === 0) {
    newGrid.replaceChildren(
      el('p', { className: 'empty-state', text: 'New pieces are on their way. Check back soon.' })
    );
  } else {
    newGrid.replaceChildren(...newest.map(productCard));
    // Use the newest piece's main photo as the hero image
    const url = mainPhotoUrl(newest[0]);
    if (url) heroPhoto.replaceChildren(photo(url, newest[0].title));
  }
} catch (error) {
  console.error(error);
  categoryGrid.replaceChildren();
  newGrid.replaceChildren();
  showMessage(messages, "We couldn't load the closet right now. Please refresh the page.", 'error');
}
