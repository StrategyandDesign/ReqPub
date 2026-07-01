# Discovery to Requirements: deploy guide

Three files.

- `index.html` is the app. Deploy this.
- `backend.sql` is the database. Run it once in Supabase.
- `README.md` is this guide.

The app runs with no backend. Open `index.html` and it works in one browser, local only, exactly as the prototype. Fill in two values and run the SQL and it becomes multi-user: real accounts, cloud data on every device, and share links that work for outside reviewers.

## Setup, three steps

1. Create a Supabase project at supabase.com. In the dashboard, open Authentication, Providers, and enable Email. For the fastest first run, turn off "Confirm email" under Authentication, Sign In / Providers, so you can sign in immediately. You can turn it back on later.

2. Open the SQL Editor, paste the full contents of `backend.sql`, and Run. This creates the tables, the access rules, and the two functions the share links use.

3. Open `index.html` in a text editor. Near the top you will find this block:

   ```
   var SB_CFG = { url: '', anon: '' };
   ```

   In Supabase, open Project Settings, API. Copy the Project URL into `url` and the anon public key into `anon`. Save the file. Deploy `index.html` to Cloudflare Pages or Netlify on your domain.

That is the whole install.

The anon public key is meant to ship in the browser. It is safe because every table is gated by row-level security. Never put the `service_role` key in the file. Those are the two keys on the API page. Use the anon one.

## How it behaves

Blank `SB_CFG`: local only. One browser, no login, no sharing across devices. This is the floor. It always works.

Filled `SB_CFG`: the gate becomes a real sign in. Your projects, versions, feedback, discovery, and notes are stored in your account and load on any device. Share links resolve for anyone, with no login.

## The share links

Open a project, go to Feedback, select a baselined version. Two links appear: an app testing link and a PRD review link. Copying a link publishes its summary to the backend, so copy the link to share it. The version is frozen, so the summary never drifts.

The PRD review link shows a plain-language summary only. No requirement IDs, no fit criteria, no non-functional requirements, no schedule, no internal notes. That exclusion is built into what gets published, not just hidden in the page, so the reviewer never receives the detail.

## Test checklist, the proof it works

1. Open your deployed site. Sign up with an email and password.
2. Create a project. Answer a few questions. Generate a version.
3. Go to Feedback, select that version, copy the PRD review link.
4. Open that link in an incognito window or on a second device, with no login. You should see the summary with no requirement detail. Submit a review.
5. Back in your account, reload. The review appears in Feedback under From the brief.
6. Repeat with the app testing link. A submitted report appears under From the app.

If all six pass, the app is multi-user.

## Honest note

I could not test the live Supabase wiring from my side, so you are the first to run it against a real project. The local app is the guaranteed floor. The cloud path is built and the client logic is validated against a mock backend, but the live connection is yours to confirm.

If something does not connect, it is almost always one of three things, in this order: email confirmation is still on, so check your inbox or turn it off; `backend.sql` did not fully run, so run it again and read the output; or the URL or anon key is mistyped. Check those first.

## Security, in one paragraph

Each account sees only its own data. Anonymous reviewers never touch a table. They call two functions, `get_share` and `submit_share_feedback`, which validate the link and return or accept only what they should. The PRD reviewer receives the curated summary and nothing else. The `service_role` key never appears in the app.
