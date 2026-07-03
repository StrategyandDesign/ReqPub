# Attachments — files from partners and SMEs

Partners and seated SMEs (and the team) can attach documents — PDFs, Word/Excel/
PowerPoint, text/CSV/Markdown, images, and zips — to a conversation. Files are
**virus-scanned on the way in**, stored in a **private** bucket, and reachable
only through short-lived signed links. Every upload is written to the audit log.

Who can upload, by design:

- **The team** — from any thread in the Inbox.
- **Partners** — on any of their note threads in the portal.
- **Seated SMEs** — from their durable workspace link (the personal link the team
  creates under Access → SME workspaces).

Anonymous one-off review/brief links **cannot** upload — every uploader is a known
party (team member, partner account, or a seated SME with a name and email), which
keeps the security story clean. Limits: **25 MB** per file, an allow-list of common
document/image types, and 40 files/hour per PRD.

Where they land: on the thread they came in on (Inbox → the conversation), plus a
per-PRD roll-up under **Access → Files from reviewers**. The team downloads from
either. Uploads appear live for the team.

---

## Setup — three steps (once)

### 1. Database

Run **`supabase/fix-attachments.sql`** in the Supabase SQL editor. (Already
included if you re-run the full `schema.sql`.) This creates the `attachments`
metadata table, its row-level security, and the validated insert + authorization
functions the upload function calls.

### 2. Storage bucket + policies

Run **`supabase/storage-attachments.sql`** in the SQL editor. It creates the
private `attachments` bucket and locks it down: only org members can read/sign
their own org's files, only managers can delete, and nobody can write bytes
except the upload function.

### 3. The upload function

Deploy the edge function in **`supabase/functions/attachment-upload/`**.

- In the Supabase dashboard: Edge Functions → Deploy, or with the CLI:
  `supabase functions deploy attachment-upload --no-verify-jwt`
- **Turn "Verify JWT" OFF** for this function. SMEs are accountless and authorize
  with their durable reply-token; team and partner requests still carry a real JWT
  which the function verifies itself, so this is safe.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

---

## Virus scanning (recommended)

The function scans every file before storing it. Configure it with a secret:

- `SCAN_URL` — an HTTP virus-scanning endpoint. Point it at a **private** scanner
  so client files never leave your control. A self-hosted ClamAV REST service is
  the usual choice (e.g. a `clamav-rest` container in front of `clamd`). Do **not**
  use a public scanner that retains uploads — these are confidential client files.
- `SCAN_FIELD` — the multipart field name your scanner expects (default `FILES`,
  which matches common ClamAV REST images).
- `SCAN_API_KEY` — optional; sent as `Authorization: Bearer <key>`.
- `SCAN_TIMEOUT_MS` — optional; default 20000.
- `SCAN_FAIL_CLOSED` — optional; `true` rejects uploads when the scanner is
  unreachable. Default is fail-open: the file is stored but flagged, so an outage
  never blocks work.

Set secrets under Edge Functions → Secrets (or `supabase secrets set SCAN_URL=…`).

**Behavior**

- **Infected** → rejected outright; nothing is stored, and the uploader is told.
- **Clean** → stored; no flag.
- **Scanner not configured / unavailable** → stored and flagged **unscanned**
  (or **scan failed**). The team sees the amber flag on the chip and in the Files
  list, so an unscanned file is never mistaken for a cleared one. Flip
  `SCAN_FAIL_CLOSED=true` if you'd rather block uploads than store a flagged file.

The scanner contract is forgiving: the function reads a JSON `{ "clean": true|false }`
or a ClamAV-style `{ "Status": "OK"|"FOUND" }`, or falls back to matching
`clean/OK` vs `FOUND/infected/virus` in a plain-text response.

---

## What's enforced where

- **Edge function**: type + size check, identity/authorization, virus scan, then
  upload + register. It's the only writer to the bucket.
- **Database (`attachment_add`)**: re-checks type, size, that the thread belongs to
  the project, refuses `infected`, rate-limits, and writes the audit entry — so even
  a bug in the function can't persist an unsafe or cross-tenant row.
- **RLS**: the team reads only its own org's attachments; the bucket signs only its
  own org's paths; managers delete.
