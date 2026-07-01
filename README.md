# ReqPub — GitHub Pages + Supabase setup

This repo is the ReqPub app (static files). **GitHub Pages** hosts it; **Supabase** is the backend (accounts, data, sign-in). Push to GitHub → the site redeploys itself. Your Supabase data is separate and survives every deploy.

---

## Part 1 — Supabase (the backend)

Do this once (full detail in `DEPLOY.md`):

1. In Supabase → **SQL Editor**, paste all of `backend.sql` and **Run**.
2. **Authentication → Sign In / Providers → Email** → enable. For the first run, turn **off** "Confirm email."
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.
4. Open **`config.js`** and paste them into the one line:
   ```js
   window.SB_CFG = { url: 'https://YOURPROJECT.supabase.co', anon: 'eyJhbGci...anon-key...' };
   ```
   The anon key is meant to ship in the browser and is safe to commit — every table is protected by row-level security. **Never** commit the `service_role` key (the app never uses it).

---

## Part 2 — GitHub + Pages (hosting)

The simplest, tightest loop is to make **this folder itself** the git repo, so the files I edit are the files you push.

**One-time setup** (run in Terminal, inside this `reqpub` folder):

```bash
git init
git add -A
git commit -m "ReqPub"
git branch -M main
git remote add origin https://github.com/YOU/reqpub.git   # create the empty repo on github.com first
git push -u origin main
```

**Enable Pages:** on GitHub → **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)`** → Save. About a minute later your site is live at:

```
https://YOU.github.io/reqpub/
```

- The **app** opens at that root URL (the sign-in screen).
- The **marketing page** is at `…/reqpub/landing.html`.
- Sign up via `…/reqpub/signup.html` → **Start a workspace** → name it (e.g. *Collection Ventures*) → you're the Manager.

> **Repo visibility:** free GitHub Pages publishes from a **public** repo. The anon key being public is fine (RLS protects the data). If you want the *code* private, either upgrade to **GitHub Pro** (Pages on private repos) or connect the private repo to **Netlify/Cloudflare Pages** (free, private-repo deploys) instead of Pages — Supabase stays the same either way.

---

## Part 3 — The ongoing edit → live loop

1. You ask for a change here; I edit the files in this folder and verify them.
2. From this folder, you run:
   ```bash
   git add -A && git commit -m "what changed" && git push
   ```
3. GitHub Pages redeploys automatically (~1 min). **Supabase data is untouched** — redeploying the app never affects accounts or PRDs.

Prefer no Terminal? On GitHub, use **Add file → Upload files** and drag the changed files in — same result.

---

## Notes

- **`.nojekyll`** is included so GitHub Pages serves every file as-is (no Jekyll processing).
- **`_redirects`** is a Netlify/Cloudflare file; GitHub Pages ignores it (harmless). On Pages the app is the root and `landing.html` is a page.
- **Custom domain** (optional): Settings → Pages → Custom domain, then point a CNAME at GitHub. Add your domain to Supabase → Authentication → URL settings if you later enable email confirmations.
- **Email alerts / reminders / tamper-proof audit log** need a Supabase **Edge Function** (a small server piece) — not required for the app to work; add later.

## What's in this folder

| File | Purpose |
|---|---|
| `index.html` | The app (sign-in + workspace). Serve at the site root. |
| `landing.html` | Public marketing page. |
| `signup.html` | Role-aware account creation. |
| `terms.html`, `privacy.html`, `cookies.html`, `acceptable-use.html`, `do-not-share.html` | Legal pages (drafts — have counsel review). |
| `site.css`, `site.js` | Shared styles + footer/cookie-consent engine. |
| `config.js` | Your Supabase URL + anon key. |
| `backend.sql` | Run once in Supabase. |
| `DEPLOY.md` | Full backend + deploy detail. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |
