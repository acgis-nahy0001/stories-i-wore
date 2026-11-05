// Admin login (UC-A1). There is no sign-up link: the one admin account is
// created in the Supabase dashboard, and public sign-ups are turned off.
import { supabase } from '../supabase-client.js';
import { signIn } from '../api.js';
import { showMessage } from '../render.js';

const form = document.querySelector('#login-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const submit = document.querySelector('#submit');
const messages = document.querySelector('#messages');

// Already signed in? Go straight to the dashboard.
const { data } = await supabase.auth.getSession();
if (data.session) window.location.replace('index.html');

if (new URLSearchParams(window.location.search).get('loggedOut')) {
  showMessage(messages, "You've been logged out.", 'ok');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!email.value.trim() || !password.value) {
    showMessage(messages, 'Enter your email and password.', 'error');
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Logging in…';
  try {
    await signIn(email.value.trim(), password.value);
    window.location.replace('index.html');
  } catch (error) {
    // Never say WHICH field was wrong: that helps someone guessing passwords
    const tooMany = /rate|too many/i.test(error.message);
    showMessage(
      messages,
      tooMany ? 'Too many attempts. Try again in a few minutes.' : 'Email or password is incorrect.',
      'error'
    );
    password.value = '';
    password.focus();
  } finally {
    submit.disabled = false;
    submit.textContent = 'Log in';
  }
});
