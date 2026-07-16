// Supabase Edge Function: send-sign-receipt
// Emails the signer their own receipt for a SIGNED e-sign request.
//
// Deployed WITHOUT JWT verification (the signer is accountless):
//   supabase functions deploy send-sign-receipt --no-verify-jwt
//
// The token is the credential: the function looks the row up with the
// service role, requires status = 'signed' and not revoked, and mails ONLY
// that row's own signer_email - the recipient is never caller-supplied, so
// the function cannot address arbitrary inboxes. Holding the token already
// means holding the receipt page itself; this just delivers a copy.
//
// Secrets: RESEND_API_KEY (required), INVITE_FROM, APP_URL (optional);
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const INVITE_FROM = Deno.env.get("INVITE_FROM") ?? "ReqPub <onboarding@resend.dev>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://reqpub.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ORIGINS = new Set([APP_URL, "https://reqpub.com"]);
function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const reply = (req: Request, o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsFor(req), "Content-Type": "application/json" } });

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return reply(req, { error: "POST only" }, 405);
  if (!RESEND_API_KEY) return reply(req, { error: "RESEND_API_KEY is not set in Edge Function secrets" }, 500);
  if (!SERVICE_KEY) return reply(req, { error: "service role key unavailable" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const token = String(body.token ?? "").trim();
  if (!token || token.length < 20) return reply(req, { error: "token required" }, 400);

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: sr } = await supa.from("sign_requests")
    .select("token,signer_email,signed_name,signed_at,status,revoked,doc_fingerprint,project_id,version_id")
    .eq("token", token).maybeSingle();
  if (!sr || sr.revoked) return reply(req, { error: "invalid_link" }, 404);
  if (sr.status !== "signed") return reply(req, { error: "not_signed" }, 409);

  const [{ data: proj }, { data: ver }] = await Promise.all([
    supa.from("projects").select("name").eq("id", sr.project_id).maybeSingle(),
    supa.from("versions").select("label").eq("id", sr.version_id).maybeSingle(),
  ]);
  const product = (proj?.name ?? "a requirements record").trim();
  const label = (ver?.label ?? "").trim();
  const link = `${APP_URL}/app/#sign/${sr.token}`;
  const fp = String(sr.doc_fingerprint ?? "").slice(0, 16);
  const when = sr.signed_at ? new Date(sr.signed_at).toUTCString() : "";

  const html =
    `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0f1114">` +
    `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">` +
    `<table width="100%" style="max-width:520px;background:#fff;border:1px solid #e6e8eb;border-radius:16px">` +
    `<tr><td style="padding:26px 32px 6px"><div style="font-weight:700;font-size:20px;letter-spacing:-.02em">ReqPub</div></td></tr>` +
    `<tr><td style="padding:6px 32px 4px"><h1 style="font-size:22px;margin:0 0 10px;letter-spacing:-.02em">Your signature receipt</h1>` +
    `<p style="font-size:15px;color:#555b63;line-height:1.6;margin:0"><strong>${esc(String(sr.signed_name))}</strong> signed ` +
    `<strong>${esc(product)}${label ? " v" + esc(label) : ""}</strong>${when ? " on " + esc(when) : ""}.</p></td></tr>` +
    `<tr><td style="padding:18px 32px 6px"><a href="${link}" style="display:inline-block;background:#2563FF;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Open your archive copy</a></td></tr>` +
    `<tr><td style="padding:10px 32px 26px"><p style="font-size:12.5px;color:#767c85;line-height:1.6;margin:0">` +
    `Document fingerprint <span style="font-family:Consolas,monospace">sha256:${esc(fp)}&hellip;</span>. ` +
    `The link always renders the exact document you signed, with this receipt, and prints to PDF. ` +
    `What was recorded: your typed name, the time, the document fingerprint, and the request trail. ` +
    `Recorded electronic signature with an audit trail; cryptographic sealing ships in a later phase.</p></td></tr>` +
    `</table><p style="font-size:11.5px;color:#98a0aa;margin:16px 0 0">Sent by ReqPub at your request from the receipt page.</p>` +
    `</td></tr></table></body></html>`;

  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: INVITE_FROM,
      to: [sr.signer_email],
      subject: `Signed: ${product}${label ? " v" + label : ""} - your receipt`,
      html,
    }),
  });
  if (!resend.ok) {
    const detail = await resend.text().catch(() => "");
    return reply(req, { error: "resend_failed", detail }, 502);
  }
  return reply(req, { ok: true });
});
