# ReqPub — Go Live in 4 steps (~10 minutes, no coding)

You'll do everything in your web browser. Supabase = your database + logins. GitHub = hosts the website for free and auto-updates it. You already have this `reqpub` folder — that's the whole website.

**Before you start, have open:**
- [ ] Your Supabase project (you have it).
- [ ] A GitHub account — free at **github.com** (make one if needed).
- [ ] This `reqpub` folder on your computer.

---

## STEP 1 · Set up the database — Supabase (~3 min)

1. In Supabase, left sidebar → **SQL Editor** → **New query**.
2. Open **`backend.sql`** (in this folder), select all, copy, paste it into the query box → click **Run**. You should see **Success**.
3. Left sidebar → **Authentication** → **Sign In / Providers** → **Email** → turn it **ON**. On that same page, turn **"Confirm email" OFF** for now (so you can sign in right away).
4. Left sidebar → **Project Settings** → **API**. Leave this page open — you need two values from it next.

✅ Database is ready.

---

## STEP 2 · Connect the app to your database (~1 min)

1. Open **`config.js`** (in this folder) with any text editor (TextEdit is fine).
2. From the Supabase **API** page, copy these two and paste them in:
   - **Project URL** → into `url`
   - **anon public** key → into `anon`

   It should look like this, then **save the file**:
   ```js
   window.SB_CFG = { url: 'https://YOURPROJECT.supabase.co', anon: 'eyJhbGci...your-anon-key...' };
   ```
   ⚠️ Use only the **anon "public"** key. Never the one labeled **service_role**.

✅ App is wired to your account.

---

## STEP 3 · Put it on the web — GitHub Pages (~4 min)

1. Go to **github.com** → click **New** (or the **+** top-right → New repository).
2. Repository name: **`reqpub`** → choose **Public** → click **Create repository**.
3. On the new empty repo page, click the link **"uploading an existing file."**
4. Open your **`reqpub`** folder, select **ALL** the files (Cmd+A), and **drag them into the browser** window. Wait until they all list (you should see `index.html`, `config.js`, `landing.html`, `.nojekyll`, etc.).
5. Click **Commit changes**.
6. In the repo, go to **Settings** (top) → **Pages** (left). Under **Build and deployment**: Source = **Deploy from a branch**, Branch = **main**, folder = **/ (root)** → **Save**.
7. Wait about a minute, then refresh. Your site is live at:
   ```
   https://YOURNAME.github.io/reqpub/
   ```

✅ You're on the internet.

---

## STEP 4 · Create your account (~1 min)

1. Go to **`https://YOURNAME.github.io/reqpub/signup.html`**
2. Click **Start a workspace** → name it **Collection Ventures** → enter your email + a password → **Create account.**
3. You're in as the **Manager** of Collection Ventures. Use the top-right menu → **Organization** to invite teammates (Manager/Viewer) and partners.

🎉 **Done.**

---

## STEP 5 · (Optional) Point your domain reqpub.com at the site — Namecheap

This makes the site open at **https://reqpub.com/** instead of the github.io address.

**A) At Namecheap — set the DNS (~5 min):**
1. Log in → **Domain List** → **Manage** next to `reqpub.com` → open the **Advanced DNS** tab.
2. Under **Host Records**, **delete any default rows** Namecheap put there (usually a `CNAME  @ → parkingpage.namecheap.com` and/or a `URL Redirect Record`).
3. Click **Add New Record** and add these **four A Records** (Host = `@`, TTL = Automatic):

   | Type | Host | Value |
   |---|---|---|
   | A Record | @ | 185.199.108.153 |
   | A Record | @ | 185.199.109.153 |
   | A Record | @ | 185.199.110.153 |
   | A Record | @ | 185.199.111.153 |

4. Add **one CNAME Record** so `www` works too (use *your* GitHub username):

   | Type | Host | Value |
   |---|---|---|
   | CNAME Record | www | YOURNAME.github.io. |

5. Save. DNS changes take anywhere from ~10 minutes to a few hours to spread.

**B) At GitHub — claim the domain (~1 min):**
1. Your repo → **Settings → Pages → Custom domain** → type **`reqpub.com`** → **Save.** (GitHub writes a `CNAME` file into your repo automatically.)
2. Refresh until the **DNS check goes green**, then tick **Enforce HTTPS** (GitHub issues a free SSL certificate — may take a few more minutes).

Now **https://reqpub.com/** serves your app, and `www.reqpub.com` redirects to it.

> If you later switch on email confirmations in Supabase, add `https://reqpub.com` under Supabase → **Authentication → URL Configuration → Site URL**.

---

## (Optional) Auto-deploy with GitHub Actions

Instead of Step 3's "Deploy from a branch," a workflow can deploy on every push — more automated, and required if you ever add a build step.

1. This folder already contains **`.github/workflows/deploy.yml`** (the deploy workflow). It's inside a *hidden* folder, so in Finder press **Cmd + Shift + .** to reveal it before you upload — or just create it straight on GitHub: **Add file → Create new file**, name it exactly `.github/workflows/deploy.yml`, and paste that file's contents.
2. Make sure it's committed to the repo.
3. Repo → **Settings → Pages → Build and deployment → Source → GitHub Actions.**
4. Every push to `main` now deploys automatically — watch it under the repo's **Actions** tab.

With Actions you don't need the `.nojekyll` file (it skips Jekyll anyway).

---

## Updating it later (no coding)

Whenever you ask me for a change, I edit the files right here in this folder. To push it live:
1. On GitHub, open your repo → **Add file → Upload files.**
2. Drag in the file(s) that changed (from this same folder) → **Commit changes.**
3. It redeploys itself in ~1 minute. **Your Supabase data is never touched** — accounts and PRDs stay exactly as they are.

*(If you're comfortable with Terminal, `git push` from this folder does the same thing — see `README.md`.)*

---

## Prove it works (2 min)

1. Sign up (Step 4). Create a project, answer a few questions, generate a version.
2. Open a project → **Feedback** → copy the **PRD review link.**
3. Open that link in a private/incognito window. You should see the plain-language summary with **no requirement detail.** Submit a review.
4. Back in your account, reload → the review shows up in **Inbox** and **Feedback**. If it does, multi-user is working.

---

## Honest heads-up — the only things you must do yourself

- Create your Supabase and GitHub accounts, and type your own passwords.
- Paste your keys into `config.js`, and upload/commit to your repo.

I can't do those for you (they're your logins), but everything else — the whole app, the schema, this guide — is already built and sitting in this folder.

**Two small notes:**
- Free GitHub Pages requires a **Public** repo. Your anon key is safe to be public (the database is locked down by row-level security). If you want the *code* private, upgrade to GitHub Pro, or host the private repo on Netlify/Cloudflare Pages instead — same Supabase either way.
- Email alerts and reminders need one extra Supabase "Edge Function" later — not needed for the app to run.
