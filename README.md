# Stories I Wore

A secondhand clothing shop with two separate parts:

- **Customer storefront** (public): Home, Shop, Item page, Our Story
- **Admin back office** (sign-in only): Login, Dashboard, Items, Item form

Built with plain HTML, CSS and JavaScript, hosted on GitHub Pages, with
Supabase for the database, admin login and photo storage.

This is the **Iteration I (W9 demo)** build. Cart, checkout and order
management come in Iteration II.

---

## Setup (about 1 hour, do it once)

### 1. Create the Supabase project
1. Sign in at supabase.com and click **New project**. Name it `stories-i-wore`.
   Save the database password somewhere safe.
2. Wait for the project to finish setting up (a minute or two).

### 2. Create the tables and security rules
1. In Supabase, open **SQL Editor** and click **New query**.
2. Open `sql/schema.sql` from this project, copy everything, paste it, click **Run**.
   You should see "Success. No rows returned".
3. Make another new query with everything from `sql/policies.sql`, and **Run** it.
4. Check: **Table Editor** now shows 5 tables, and `categories` has 5 rows.
   **Storage** shows a bucket called `product-photos`.

### 3. Create your admin account
1. **Authentication → Users → Add user → Create new user**.
   Use your email and a strong password you don't use anywhere else.
   Tick "Auto Confirm User".
2. **Authentication → Sign In / Providers** (may be called "Settings"):
   turn **off** "Allow new users to sign up".

### 4. Connect the site
1. In Supabase: **Project Settings → API** (or "Data API").
2. Copy the **Project URL** and the **publishable** (or "anon") key.
3. Paste them into `js/config.js`.
   **Never** paste the `service_role` / secret key anywhere.

### 5. Run it on your computer
The pages use JavaScript modules, so they must be opened through a small
local web server, not by double-clicking the file.

- In VS Code, install the **Live Server** extension.
- Right-click `index.html` → **Open with Live Server**.
- Admin side: go to `/admin/login.html` in the same browser tab.

### 6. Put it online (GitHub Pages)
1. Create a GitHub repository and upload this whole folder (or push with Git).
2. Repository **Settings → Pages** → Source: "Deploy from a branch",
   Branch: `main`, folder `/ (root)`. Save.
3. Wait a minute; your site appears at `https://YOUR-NAME.github.io/REPO-NAME/`.
4. On the same settings page, tick **Enforce HTTPS**.

---

## Where things are

```text
index.html, shop.html, item.html, story.html   customer pages
admin/                                         admin pages (sign-in only)
css/base.css      colours, fonts, buttons, forms (shared)
css/store.css     customer layout
css/admin.css     admin layout
js/config.js      YOUR Supabase URL and publishable key
js/supabase-client.js   creates the Supabase connection
js/api.js         every database call lives here
js/render.js      safe helpers that put data on the page (no innerHTML)
js/validate.js    form rules
js/auth-guard.js  sends signed-out visitors to the admin login
js/pages/         one script per page
sql/schema.sql    tables, rules, price trigger
sql/policies.sql  Row Level Security + photo storage rules
```

## Security checklist (run before each demo)

1. **Signed out**, open `admin/items.html` → you land on the login page.
2. **Signed out**, in the browser console on the Shop page, run:
   ```js
   const { supabase } = await import('./js/supabase-client.js');
   await supabase.from('products').update({ price: 1 }).eq('id', 1);
   ```
   → nothing changes (check in the admin Items page).
3. Add an item titled `<script>alert(1)</script>` → it shows as plain text, no pop-up. Then delete it.
4. Search the project for `service_role` → no results.
5. Mark an item **Sold** → it disappears from the Shop.

## Troubleshooting

| What you see | Likely cause | Fix |
| --- | --- | --- |
| "We couldn't load the closet right now" | Wrong URL or key in `js/config.js`, or the Supabase project is paused | Check `js/config.js`; in Supabase, restore the project if paused |
| Blank page, console says "CORS" or "module" | Opened the file directly | Use Live Server (step 5) |
| Login says "Email or password is incorrect" | Typo, or user not confirmed | Re-create the user with "Auto Confirm User" ticked |
| Photo upload fails | File over 5 MB, or not JPEG/PNG/WebP | Resize to about 1,200 px wide and try again |
| New item doesn't show on the Shop | Status is Sold | Set it to Available on the Items page |
