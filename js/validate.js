// =====================================================================
// Form rules shared by the admin item form (and checkout in Iteration II).
// These give friendly messages; the database's check constraints in
// sql/schema.sql enforce the same rules for real.
// =====================================================================

export const CONDITIONS = ['New with tags', 'Like new', 'Good', 'Fair'];
export const STATUSES = ['available', 'reserved', 'sold'];

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// values = plain object from the form; returns { fieldName: 'message' }
export function validateItem(values) {
  const errors = {};

  if (!values.title) errors.title = 'Enter a title.';
  else if (values.title.length > 120) errors.title = 'Keep the title under 120 characters.';

  if (!values.category_id) errors.category_id = 'Choose a category.';

  if (!values.size) errors.size = 'Enter a size, like M, 8 or One size.';
  else if (values.size.length > 30) errors.size = 'Keep the size under 30 characters.';

  if (!CONDITIONS.includes(values.condition)) errors.condition = 'Choose a condition.';

  const price = Number(values.price);
  if (values.price === '' || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price above $0.';
  else if (price >= 1000000) errors.price = 'That price looks too high.';
  else if (!/^\d+(\.\d{1,2})?$/.test(values.price)) errors.price = 'Use numbers only, like 25 or 25.50.';

  if (values.measurements.length > 200) errors.measurements = 'Keep measurements under 200 characters.';
  if (values.description.length > 2000) errors.description = 'Keep the description under 2,000 characters.';
  if (values.origin.length > 120) errors.origin = 'Keep this under 120 characters.';
  if (!STATUSES.includes(values.status)) errors.status = 'Choose a status.';

  return errors;
}

// Returns a list of messages (empty list = all good)
export function validatePhotos(newFiles, keptCount) {
  const problems = [];
  const total = keptCount + newFiles.length;

  if (total === 0) problems.push('Add at least one photo.');
  if (total > MAX_PHOTOS) problems.push(`Use ${MAX_PHOTOS} photos or fewer (you have ${total}).`);

  for (const file of newFiles) {
    if (!PHOTO_TYPES.includes(file.type)) problems.push(`${file.name} is not a JPEG, PNG or WebP image.`);
    else if (file.size > MAX_PHOTO_BYTES) problems.push(`${file.name} is over 5 MB. Resize it and try again.`);
  }
  return problems;
}
