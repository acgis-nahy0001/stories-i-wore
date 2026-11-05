// =====================================================================
// Data access layer: every Supabase call the site makes lives here,
// so pages never talk to the database directly.
// Each function throws an error if Supabase says no; pages catch it
// and show a friendly message.
// =====================================================================
import { supabase } from './supabase-client.js';
import { PHOTO_BUCKET } from './config.js';

const PRODUCT_FIELDS =
  'id, title, size, measurements, condition, price, description, origin, status, created_at, ' +
  'category_id, categories ( name ), product_photos ( id, photo_url, sort_order )';

// Turn Supabase's error object into a normal JavaScript Error
function check({ data, error, count }) {
  if (error) {
    const err = new Error(error.message);
    err.code = error.code;
    throw err;
  }
  return count !== undefined && count !== null ? count : data;
}

// ---------------------------------------------------------------------
// Customer + admin reads
// ---------------------------------------------------------------------
export async function getCategories() {
  return check(await supabase.from('categories').select('id, name').order('name'));
}

// forShop: true -> only items customers may see (even if the admin is
// signed in in the same browser). RLS also enforces this for visitors.
export async function getProducts({ forShop = false, categoryId = null, limit = null } = {}) {
  let query = supabase.from('products').select(PRODUCT_FIELDS).order('created_at', { ascending: false });
  if (forShop) query = query.in('status', ['available', 'reserved']);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (limit) query = query.limit(limit);
  return check(await query);
}

export async function getProduct(id, { forShop = false } = {}) {
  let query = supabase.from('products').select(PRODUCT_FIELDS).eq('id', id);
  if (forShop) query = query.in('status', ['available', 'reserved']);
  return check(await query.maybeSingle());
}

// ---------------------------------------------------------------------
// Admin: sign in / out
// ---------------------------------------------------------------------
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------
// Admin: dashboard numbers
// ---------------------------------------------------------------------
export async function countProducts(status) {
  return check(
    await supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', status)
  );
}

export async function countNewOrders() {
  return check(
    await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new')
  );
}

// ---------------------------------------------------------------------
// Admin: create, update, delete items
// ---------------------------------------------------------------------
export async function createProduct(values) {
  return check(await supabase.from('products').insert(values).select('id').single());
}

export async function updateProduct(id, values) {
  check(await supabase.from('products').update(values).eq('id', id));
}

export async function setProductStatus(id, status) {
  check(await supabase.from('products').update({ status }).eq('id', id));
}

export async function deleteProduct(product) {
  // Remove the photo files first, then the row (photo rows go with it: on delete cascade)
  const paths = (product.product_photos || []).map((p) => storagePath(p.photo_url)).filter(Boolean);
  const { error } = await supabase.from('products').delete().eq('id', product.id);
  if (error) {
    // 23503 = "foreign key violation": the item is part of an order
    if (error.code === '23503') {
      throw new Error('This item is part of an order, so it cannot be deleted. Mark it Sold instead.');
    }
    throw new Error(error.message);
  }
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}

// ---------------------------------------------------------------------
// Admin: photos
// ---------------------------------------------------------------------
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Uploads one file and records it. We never use the original file name
// in the storage path: it could contain spaces or odd characters.
export async function addPhoto(productId, file, sortOrder) {
  const ext = EXTENSIONS[file.type] || 'jpg';
  const path = `${productId}/${Date.now()}-${sortOrder}.${ext}`;

  const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  check(
    await supabase
      .from('product_photos')
      .insert({ product_id: productId, photo_url: data.publicUrl, sort_order: sortOrder })
  );
}

export async function removePhoto(photo) {
  check(await supabase.from('product_photos').delete().eq('id', photo.id));
  const path = storagePath(photo.photo_url);
  if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

// ".../storage/v1/object/public/product-photos/12/abc.jpg" -> "12/abc.jpg"
function storagePath(url) {
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const i = (url || '').indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}
