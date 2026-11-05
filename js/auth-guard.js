// =====================================================================
// Admin session check: every admin page (except login) runs this first.
// If nobody is signed in, the page sends them to the login page.
//
// Note: this is a convenience, not the real lock. Someone could skip this
// code in their browser, but Row Level Security in the database would
// still refuse every admin read or write without a valid session.
// =====================================================================
import { supabase } from './supabase-client.js';

export async function requireAdmin() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.replace('login.html');
    return new Promise(() => {}); // stop the page script here while the browser leaves
  }

  // If the session ends in another tab, leave this page too
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.replace('login.html?loggedOut=1');
  });

  document.body.classList.remove('is-checking');
  setupLogout();
  return data.session;
}

function setupLogout() {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.replace('login.html?loggedOut=1');
    });
  });
}
