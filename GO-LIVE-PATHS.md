# ReqPub — one domain, clean paths

Everything now lives on **reqpub.com** (which already has a working HTTPS certificate — no waiting, no subdomain).

| URL | Serves |
|---|---|
| `reqpub.com/` | Marketing landing page |
| `reqpub.com/signup` | Sign-up page |
| `reqpub.com/login` | Login page (Cloudflare-style) + password reset |
| `reqpub.com/app` | The full app platform |

Clean URLs (no `.html`) work because each page is a **folder with an `index.html`** — that's how GitHub Pages serves `/login`, `/signup`, `/app`. Because it's all one origin, sign-in sessions and password resets just work.

---

## 1. Upload to your existing reqpub.com repo

In your `reqpub.com` repo: **Add file → Upload files**, then drag in **everything inside the `reqpub-site` folder** (open the folder and select all — including the `app`, `signup`, and `login` subfolders). Dragging the subfolders is correct here — they must keep their folder names. **Commit changes.**

Files/folders included: `index.html`, `config.js`, `site.css`, `site.js`, `terms.html`, `privacy.html`, `cookies.html`, `acceptable-use.html`, `do-not-share.html`, `app.html` + `signup.html` (redirects), `landing.html`, `CNAME`, `.nojekyll`, and the folders `app/`, `signup/`, `login/`.

Pages redeploys in ~1 minute. Keep Source = **Deploy from a branch**, `main` / `/ (root)`, custom domain `reqpub.com` (unchanged).

---

## 2. Supabase — point auth links at reqpub.com  (REQUIRED for password reset & sign-in)

Password-reset emails, sign-up confirmation emails, and social logins all send the user to a URL. Tell Supabase which URLs are yours:

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://reqpub.com`
- **Redirect URLs** — click *Add URL* and add:
  - `https://reqpub.com/**`

Save. Without this, reset/confirmation links won't return to your site.

*(Password reset uses `resetPasswordForEmail` → the email link opens `reqpub.com/login`, where the user sets a new password. That's fully built into the login page.)*

---

## 3. Optional — turn on Google / Apple / GitHub buttons

The login page shows Google, Apple, and GitHub buttons. Email + password works right now. To make the **social** buttons work, enable each provider in Supabase → **Authentication → Providers** (each needs a client ID/secret from that provider). Until then, clicking one shows a friendly "not enabled yet" note — nothing breaks. "Continue with SSO" is an informational placeholder for SAML (a Supabase paid feature).

---

## 4. Clean up the old subdomain (optional)

Since we're not using `app.reqpub.com` anymore:

- Namecheap → Advanced DNS → delete the `app` CNAME record.
- The `reqpub-app` repo can be deleted, or just leave it — it won't affect reqpub.com.

---

## Verify (after upload + Supabase URL config)

- `reqpub.com` → landing; "Sign in" → `/login`, "Sign up" → `/signup`, "Open the app" → `/app`.
- `reqpub.com/login` → the new sign-in page; signing in lands you in `/app`.
- `reqpub.com/app` while signed out → bounces to `/login`.
- `reqpub.com/signup` → create account → lands in `/app` (or "check your email" if confirmation is on).
- Password reset: on `/login`, type your email → click **password** (in "Forgot your email or password?") → check inbox → the link opens `/login` in "Set a new password" mode → set it → you're taken to `/app`.

Everything is served over your existing HTTPS certificate, so it's secure from the first load.
