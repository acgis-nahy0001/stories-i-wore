// Creates ONE Supabase client that every page shares.
// The library is loaded from the jsDelivr CDN, so there is nothing to install.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

if (SUPABASE_URL.includes('YOUR-PROJECT-ID') || SUPABASE_KEY.includes('YOUR-PUBLISHABLE-KEY')) {
  console.warn('Stories I Wore: add your Supabase URL and publishable key to js/config.js');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
