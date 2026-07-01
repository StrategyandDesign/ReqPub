# ReqPub — move the app to app.reqpub.com

You now have **two folders**, one per site:

| Folder | Becomes | GitHub repo | Custom domain |
|---|---|---|---|
| `reqpub-app/` | The **app** (sign in, workspace, sign-up) | a **new** repo, e.g. `reqpub-app` | `app.reqpub.com` |
| `reqpub/` | The **marketing site** (landing + legal) | your **existing** repo | `reqpub.com` |

The app and sign-up sit together on `app.reqpub.com` so the Supabase login session is on one origin. Marketing links point across to it. Same Supabase backend for both — **your accounts and data don't change.**

Do it in this order: **A → B → C**.

---

## A. Create the app repo and deploy app.reqpub.com

1. On GitHub: **New repository** → name it **`reqpub-app`** → **Public** → Create.
2. In the new repo: **Add file → Upload files** → drag in **everything** from the `reqpub-app/` folder:
   `index.html`, `signup.html`, `config.js`, `site.css`, `site.js`, `CNAME`, `.nojekyll`
   (If Finder hides `.nojekyll`, press **⌘⇧.** to show dotfiles. It's optional but nice to have.)
   → **Commit changes.**
3. **Settings → Pages** → *Build and deployment* → Source = **Deploy from a branch** → Branch = **main** / **/ (root)** → **Save**.
4. Still on **Settings → Pages** → *Custom domain* → type **`app.reqpub.com`** → **Save**.
   (GitHub reads the `CNAME` file you uploaded; this just confirms it.)

It will say "DNS check in progress" — that clears once you finish Part B.

---

## B. Point the subdomain at GitHub (Namecheap)

You need your **GitHub username** — it's the name in your repo URL: `github.com/`**`<username>`**`/reqpub`.

1. Namecheap → **Domain List** → `reqpub.com` → **Manage** → **Advanced DNS**.
2. Under **Host Records**, leave your existing records alone (the four `@` A-records and the `www` CNAME that make `reqpub.com` work).
3. Click **Add New Record**:
   - **Type:** `CNAME Record`
   - **Host:** `app`
   - **Value:** `<username>.github.io`  ← your GitHub username, then `.github.io` (no repo name, no `https://`)
   - **TTL:** `Automatic`
4. **Save.**

DNS usually updates within a few minutes (can be longer). Then go back to **Settings → Pages** on the `reqpub-app` repo — once the check passes, tick **Enforce HTTPS**. (The certificate can take a few extra minutes.)

---

## C. Update the marketing site (reqpub.com)

In your **existing** repo: **Add file → Upload files** → drag in the changed files from the `reqpub/` folder, then **Commit**:

- `index.html` (landing — buttons now go to app.reqpub.com)
- `app.html` (now a redirect → app.reqpub.com, keeps old share links working)
- `signup.html` (now a redirect → app.reqpub.com/signup.html)
- `site.js` (footer links now absolute)
- `terms.html`, `privacy.html`, `cookies.html`, `acceptable-use.html`, `do-not-share.html`

You do **not** need to change `CNAME` (still `reqpub.com`) or `landing.html`.

---

## Verify (after DNS + both deploys)

- **reqpub.com** → marketing landing. "Sign in" / "Open the app" → app.reqpub.com.
- **app.reqpub.com** → the app's sign-in screen.
- **app.reqpub.com/signup.html** → sign-up; after signing up you land in the app, already logged in.
- **reqpub.com/app.html** → automatically forwards to app.reqpub.com (and preserves any `#…` share link).

## Notes

- Free GitHub Pages requires the repo to be **public**. `config.js` only holds the Supabase **anon** key, which is safe to expose (every table is protected by row-level security). Never put the `service_role` key in it.
- Editing later: change a file here, upload it to the matching repo, commit — Pages redeploys in ~1 minute.
