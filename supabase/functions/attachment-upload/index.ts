// Supabase Edge Function: attachment-upload
// Receives a file from the team, a partner, or a seated SME, virus-scans it,
// stores the bytes in the private 'attachments' bucket, and registers the
// metadata via attachment_add. Infected files are rejected and never stored.
//
// Deploy with "Verify JWT" OFF — SMEs are accountless (they authorize with their
// durable reply_token). Team and partner callers still pass a real JWT, which we
// verify explicitly below, so turning platform JWT verification off is safe here.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (provided automatically)
//   SCAN_URL          (optional)  HTTP virus scanner endpoint. If unset, files are
//                                 stored with scan_status='unscanned' and flagged.
//                                 Point it at a private ClamAV REST service, e.g.
//                                 a self-hosted clamav-rest container (recommended,
//                                 keeps client files private). Do NOT use a public
//                                 scanner that retains uploads.
//   SCAN_FIELD        (optional)  multipart field name the scanner expects (default "FILES").
//   SCAN_API_KEY      (optional)  sent as Authorization: Bearer <key> to the scanner.
//   SCAN_TIMEOUT_MS   (optional)  default 20000.
//   SCAN_FAIL_CLOSED  (optional)  "true" rejects uploads when the scanner is
//                                 unreachable; default stores them flagged 'error'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SCAN_URL = Deno.env.get("SCAN_URL") ?? "";
const SCAN_FIELD = Deno.env.get("SCAN_FIELD") ?? "FILES";
const SCAN_API_KEY = Deno.env.get("SCAN_API_KEY") ?? "";
const SCAN_TIMEOUT_MS = Number(Deno.env.get("SCAN_TIMEOUT_MS") ?? "20000");
const SCAN_FAIL_CLOSED = (Deno.env.get("SCAN_FAIL_CLOSED") ?? "").toLowerCase() === "true";

const MAX_BYTES = 26214400; // 25 MB
const ALLOW = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/heic", "application/zip",
]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const safeName = (s: string) => (s || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "file";

// Scan the bytes. Returns { status, detail }. status: clean | infected | error | unscanned.
async function scan(bytes: Uint8Array, name: string): Promise<{ status: string; detail: string }> {
  if (!SCAN_URL) return { status: "unscanned", detail: "no scanner configured" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), SCAN_TIMEOUT_MS);
  try {
    const fd = new FormData();
    fd.append(SCAN_FIELD, new Blob([bytes]), name);
    const headers: Record<string, string> = {};
    if (SCAN_API_KEY) headers["Authorization"] = `Bearer ${SCAN_API_KEY}`;
    const res = await fetch(SCAN_URL, { method: "POST", body: fd, headers, signal: ctl.signal });
    const text = (await res.text()).trim();
    let verdict: string | null = null;
    try {
      const j = JSON.parse(text);
      if (typeof j.clean === "boolean") verdict = j.clean ? "clean" : "infected";
      else if (typeof j.Status === "string") verdict = /ok|clean/i.test(j.Status) ? "clean" : "infected";
      else if (typeof j.status === "string") verdict = /ok|clean/i.test(j.status) ? "clean" : "infected";
    } catch { /* not JSON — fall through to text parsing */ }
    if (verdict === null) {
      if (/\b(found|infected|virus|malware|positive)\b/i.test(text)) verdict = "infected";
      else if (/\b(ok|clean|no[\s-]?virus|negative)\b/i.test(text)) verdict = "clean";
    }
    if (verdict === "infected") return { status: "infected", detail: text.slice(0, 400) };
    if (verdict === "clean") return { status: "clean", detail: "" };
    return { status: "error", detail: "unrecognized scanner response" };
  } catch (e) {
    return { status: "error", detail: String((e as Error)?.message || e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "function not configured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "expected multipart/form-data" }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "file required" }, 400);
  const fileName = safeName(file.name);
  const mime = file.type || "application/octet-stream";
  if (file.size <= 0 || file.size > MAX_BYTES) return json({ error: "file too large (25 MB max)" }, 413);
  if (!ALLOW.has(mime)) return json({ error: "file type not allowed" }, 415);

  // Resolve who is uploading and which thread the file lands on.
  let ctx: { org_id: string; project_id: string; comm_id: string; kind: string; name: string; user: string | null };
  const replyToken = String(form.get("reply_token") ?? "").trim();
  if (replyToken) {
    const { data } = await admin.rpc("attachment_sme_target", { p_reply_token: replyToken });
    if (!data?.ok) return json({ error: "invalid link" }, 403);
    ctx = { org_id: data.org_id, project_id: data.project_id, comm_id: data.comm_id, kind: "sme", name: data.name, user: null };
  } else {
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const commId = String(form.get("comm_id") ?? "").trim();
    if (!jwt || !commId) return json({ error: "sign in and select a thread" }, 401);
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "invalid session" }, 401);
    const { data } = await admin.rpc("attachment_uploader", { p_comm: commId, p_user: u.user.id });
    if (!data?.ok) return json({ error: data?.error === "bad_thread" ? "thread not found" : "not allowed" }, 403);
    ctx = { org_id: data.org_id, project_id: data.project_id, comm_id: commId, kind: data.kind, name: data.name, user: u.user.id };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Virus scan before anything is stored.
  const verdict = await scan(bytes, fileName);
  if (verdict.status === "infected") return json({ error: "This file was flagged by the virus scanner and was not stored.", scan: "infected" }, 422);
  if (verdict.status === "error" && SCAN_FAIL_CLOSED) return json({ error: "The virus scanner is unavailable; try again shortly.", scan: "error" }, 503);
  const scanStatus = verdict.status === "clean" ? "clean" : verdict.status === "error" ? "error" : "unscanned";

  // Store the bytes under <org>/<project>/<uuid>/<name>.
  const path = `${ctx.org_id}/${ctx.project_id}/${crypto.randomUUID()}/${fileName}`;
  const up = await admin.storage.from("attachments").upload(path, bytes, { contentType: mime, upsert: false });
  if (up.error) return json({ error: "storage upload failed", detail: up.error.message }, 502);

  // Register the metadata (validated + audited). Roll back the object if it fails.
  const { data: reg } = await admin.rpc("attachment_add", {
    p_project: ctx.project_id, p_comm: ctx.comm_id, p_message: null,
    p_uploader_kind: ctx.kind, p_uploader_name: ctx.name, p_uploader_user: ctx.user,
    p_file_name: fileName, p_mime: mime, p_size: file.size, p_path: path,
    p_scan_status: scanStatus, p_scan_detail: verdict.detail,
  });
  if (!reg?.ok) {
    await admin.storage.from("attachments").remove([path]);
    return json({ error: reg?.error === "rate_limited" ? "Too many uploads — try again later." : "could not save attachment", detail: reg?.error }, 400);
  }

  return json({ ok: true, id: reg.id, file_name: fileName, size: file.size, scan_status: scanStatus });
});
