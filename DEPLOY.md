# ReqPub — deploy guide

Four files, one folder.

- `index.html` — the app (the PRD builder). **This must live at the site root.**
- `landing.html` — the public marketing page (front door into the app).
- `backend.sql` — the database. Run once in Supabase to go multi-user.
- `DEPLOY.md` — this guide.

The app runs with no backend at all: open `index.html` and it works in one browser, local only. Fill in two values and run the SQL and it becomes multi-user — real accounts, cloud data on every device, and share links that work for outside reviewers.

---

## The two modes

**Local floor (no setup).** Blank backend config = one browser, no login, no cross-device sync. This always works; it's the guaranteed floor. The app gate uses access code `0099` and delete code `9988`.

**Multi-user cloud (recommended).** Filled backend config = the gate becomes a real sign-in. Projects, versions, feedback, discovery, and notes live in the account and load on any device. Share links resolve for anyone, no login.

---

## Go live — multi-user, in three steps

### 1. Create the database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **Authentication → Sign In / Providers → Email**, and enable it. For the fastest first run, turn **off** "Confirm email" so you can sign in immediately (you can turn it back on later).
3. Open the **SQL Editor**, paste the full contents of `backend.sql`, and **Run**. This creates the tables, the row-level-security rules, and the two functions the share links use.

### 2. Wire the app

Open `index.html` in a text editor. Near the top you'll find:

```js
var SB_CFG = { url: '', anon: '' };
```

In Supabase, open **Project Settings → API**. Copy the **Project URL** into `url` and the **anon public** key into `anon`. Save.

```js
var SB_CFG = { url: 'https://YOURPROJECT.supabase.co', anon: 'eyJhbGci...your-anon-key...' };
```

> The anon public key is meant to ship in the browser. It's safe because every table is gated by row-level security. **Never** put the `service_role` key in the file.

### 3. Deploy the folder

Upload this folder to any static host. Pick one:

- **Cloudflare Pages** — create a project, "Direct Upload", drag the folder.
- **Netlify** — drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
- **GitHub Pages** — push the folder to a repo, enable Pages on the branch.

Keep `index.html` at the **root** of the site (e.g. `yourdomain.com/` → the app). Share links are generated against the site root and read on load, so the app has to be the thing that opens at the root URL.

That's the whole install.

---

## Where the landing page goes

`landing.html` is the public marketing page. Because the **app** must own the site root (for share links), host the landing page one of these ways:

- On a **separate marketing domain or subdomain** (e.g. `reqpub.com` → `landing.html`, `app.reqpub.com` → `index.html`). Recommended.
- At a **path** on the same site (e.g. `yourdomain.com/welcome` → `landing.html`), linked from your homepage or nav.

Every "Open the app" / "Sign in" button on the landing page points to `index.html`, so if both files sit in the same folder it just works.

---

## Test checklist — the proof it works

1. Open your deployed site. Sign up with an email and password.
2. Create a project, answer a few questions, generate a version.
3. Go to **Feedback**, select that version, copy the **PRD review link**.
4. Open that link in an incognito window or a second device, with no login. You should see the plain-language summary with **no requirement detail**. Submit a review.
5. Back in your account, reload. The review appears in **Feedback → From the brief**.
6. Repeat with the **App testing link**. A submitted report appears under **From the app**.

If all six pass, you're multi-user.

---

## What changed in this build

- **ReqPub brand applied** — Req Blue (#2563FF), the boxed-arrow logo, Inter typeface, favicon, and ReqPub naming across the app chrome, sign-in, and gate.
- **Richer export** — the document toolbar now offers **Word (.doc)**, **PDF** (branded print with a ReqPub cover), and **Markdown**, alongside copy.
- **Public landing page** — `landing.html`, a responsive marketing front door that links into the app.
- **Backend unchanged** — same Supabase schema and share-link security model as before.

---

## If something doesn't connect

In this order:

1. Email confirmation is still on — check your inbox, or turn it off in Authentication.
2. `backend.sql` didn't fully run — run it again and read the output.
3. The URL or anon key is mistyped — re-copy both from Project Settings → API.

## Security, in one paragraph

Each account sees only its own data. Anonymous reviewers never touch a table directly — they call two functions, `get_share` and `submit_share_feedback`, which validate the link and return or accept only what they should. The PRD reviewer receives the curated summary and nothing else (no requirement IDs, fit criteria, non-functional requirements, schedule, or internal notes — that exclusion is built into what gets published, not just hidden in the page). The `service_role` key never appears in the app.
