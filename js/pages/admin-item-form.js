// Admin item form: add a new item or edit one (UC-A2, UC-A3)
// item-form.html          -> add
// item-form.html?id=12    -> edit item 12
import { requireAdmin } from '../auth-guard.js';
import {
  getCategories, getProduct, createProduct, updateProduct, deleteProduct, addPhoto, removePhoto,
} from '../api.js';
import { el, sortedPhotos, showMessage, clearMessage, idFromUrl } from '../render.js';
import { validateItem, validatePhotos } from '../validate.js';

await requireAdmin();

const form = document.querySelector('#item-form');
const messages = document.querySelector('#messages');
const saveButton = document.querySelector('#save');
const fileInput = document.querySelector('#photos');
const existingList = document.querySelector('#existing-photos');
const newList = document.querySelector('#new-photos');
const photosError = document.querySelector('#photos-error');
const deleteArea = document.querySelector('#delete-area');

const editId = idFromUrl('id');
let product = null;     // the item being edited (null when adding)
let newFiles = [];      // photos chosen but not uploaded yet
const toRemove = new Set(); // ids of existing photos ticked "Remove"

// ---------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------
function keptPhotos() {
  return product ? sortedPhotos(product).filter((p) => !toRemove.has(p.id)) : [];
}

function markMainPhoto() {
  const items = [...existingList.children, ...newList.children].filter((n) => !n.classList.contains('removed'));
  items.forEach((n, i) => n.classList.toggle('main', i === 0));
}

function renderExisting() {
  if (!product) return;
  existingList.replaceChildren(...sortedPhotos(product).map((p, i) => {
    const box = el('input', { attrs: { type: 'checkbox' } });
    box.addEventListener('change', () => {
      if (box.checked) toRemove.add(p.id); else toRemove.delete(p.id);
      item.classList.toggle('removed', box.checked);
      item.querySelector('img').style.opacity = box.checked ? '0.35' : '1';
      markMainPhoto();
    });
    const item = el('div', { className: 'photo-item' }, [
      el('img', { attrs: { src: p.photo_url, alt: `Photo ${i + 1}` } }),
      el('label', {}, [box, el('span', { text: 'Remove' })]),
    ]);
    return item;
  }));
  markMainPhoto();
}

function renderNew() {
  newList.replaceChildren(...newFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    const remove = el('button', { className: 'link-button', text: 'Remove', attrs: { type: 'button' } });
    remove.addEventListener('click', () => {
      URL.revokeObjectURL(url);
      newFiles.splice(i, 1);
      renderNew();
    });
    return el('div', { className: 'photo-item' }, [
      el('img', { attrs: { src: url, alt: `New photo: ${file.name}` } }),
      el('span', { text: file.name }),
      remove,
    ]);
  }));
  markMainPhoto();
}

fileInput.addEventListener('change', () => {
  newFiles = newFiles.concat(Array.from(fileInput.files));
  fileInput.value = ''; // lets you pick the same file again after removing it
  photosError.textContent = '';
  renderNew();
});

// ---------------------------------------------------------------------
// Field errors
// ---------------------------------------------------------------------
function clearErrors() {
  form.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error'));
  form.querySelectorAll('.field .error').forEach((e) => e.remove());
  photosError.textContent = '';
}

function showErrors(errors) {
  for (const [name, message] of Object.entries(errors)) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) continue;
    field.classList.add('has-error');
    const input = field.querySelector('input, select, textarea');
    const errorId = `${name}-error`;
    input.setAttribute('aria-describedby', errorId);
    field.append(el('span', { className: 'error', text: message, attrs: { id: errorId } }));
  }
}

function readValues() {
  const data = new FormData(form);
  const text = (name) => String(data.get(name) || '').trim();
  return {
    title: text('title'),
    category_id: text('category_id'),
    size: text('size'),
    condition: text('condition'),
    price: text('price'),
    measurements: text('measurements'),
    description: text('description'),
    origin: text('origin'),
    status: text('status') || 'available',
  };
}

// ---------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  clearMessage(messages);

  const values = readValues();
  const errors = validateItem(values);
  const photoProblems = validatePhotos(newFiles, keptPhotos().length);

  if (Object.keys(errors).length || photoProblems.length) {
    showErrors(errors);
    photosError.textContent = photoProblems.join(' ');
    showMessage(messages, 'Check the highlighted fields and try again.', 'error');
    const first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    if (first) first.focus(); else fileInput.focus();
    return;
  }

  const row = {
    title: values.title,
    category_id: Number(values.category_id),
    size: values.size,
    condition: values.condition,
    price: Number(values.price),
    measurements: values.measurements || null,
    description: values.description || null,
    origin: values.origin || null,
    status: values.status,
  };

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';

  let productId = editId;
  try {
    if (product) await updateProduct(product.id, row);
    else productId = (await createProduct(row)).id;
  } catch (error) {
    console.error(error);
    showMessage(messages, `Item not saved: ${error.message}`, 'error');
    saveButton.disabled = false;
    saveButton.textContent = 'Save item';
    return;
  }

  // Photos: remove ticked ones, then upload new ones after the kept ones
  const failed = [];
  for (const photo of product ? sortedPhotos(product).filter((p) => toRemove.has(p.id)) : []) {
    try { await removePhoto(photo); } catch (error) { console.error(error); }
  }
  let nextOrder = Math.max(0, ...keptPhotos().map((p) => p.sort_order)) + 1;
  for (const file of newFiles) {
    try {
      await addPhoto(productId, file, nextOrder);
      nextOrder += 1;
    } catch (error) {
      console.error(error);
      failed.push(file.name);
    }
  }

  if (failed.length) {
    // The item itself is saved; reopen it so the missing photos can be added again
    window.location.replace(`item-form.html?id=${productId}&photoError=${encodeURIComponent(failed.join(', '))}`);
  } else {
    window.location.replace(`items.html?saved=${product ? 'updated' : 'added'}`);
  }
});

// ---------------------------------------------------------------------
// Delete (edit mode only), confirmed on the page
// ---------------------------------------------------------------------
function showDeleteButton() {
  const del = el('button', { className: 'btn btn-danger', text: 'Delete item', attrs: { type: 'button' } });
  del.addEventListener('click', () => {
    const yes = el('button', { className: 'btn btn-danger btn-small', text: 'Delete', attrs: { type: 'button' } });
    const no = el('button', { className: 'btn btn-secondary btn-small', text: 'Cancel', attrs: { type: 'button' } });
    no.addEventListener('click', showDeleteButton);
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      try {
        await deleteProduct(product);
        window.location.replace('items.html?saved=deleted');
      } catch (error) {
        console.error(error);
        showMessage(messages, error.message, 'error');
        showDeleteButton();
      }
    });
    deleteArea.replaceChildren(el('span', { className: 'confirm' }, [el('span', { text: "Delete this item? This can't be undone." }), yes, no]));
    no.focus();
  });
  deleteArea.replaceChildren(del);
}

// ---------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------
try {
  const categories = await getCategories();
  form.elements.category_id.append(
    ...categories.map((c) => el('option', { text: c.name, attrs: { value: c.id } }))
  );

  if (editId) {
    product = await getProduct(editId);
    if (!product) {
      form.hidden = true;
      showMessage(messages, 'That item no longer exists.', 'error');
    } else {
      document.querySelector('#form-title').textContent = 'Edit item';
      document.title = `Edit ${product.title} · Stories I Wore Admin`;
      for (const name of ['title', 'size', 'condition', 'measurements', 'description', 'origin', 'status']) {
        form.elements[name].value = product[name] ?? '';
      }
      form.elements.category_id.value = String(product.category_id);
      form.elements.price.value = String(product.price);
      renderExisting();
      showDeleteButton();

      const photoError = new URLSearchParams(window.location.search).get('photoError');
      if (photoError) {
        showMessage(messages, `Item saved, but these photos didn't upload: ${photoError}. Add them again and save.`, 'error');
      }
    }
  }
} catch (error) {
  console.error(error);
  showMessage(messages, "Couldn't load the form. Refresh the page.", 'error');
}
