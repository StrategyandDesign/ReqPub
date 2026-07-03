/* ============================================================================
   ReqPub v2 — external views
   Partner portal (account holders managing SMEs) and the accountless SME
   pages: review brief, app feedback form, note-request intake, and the
   tokened two-way thread each submission opens.
   ============================================================================ */

import { esc, escA, ico, IC, brandmark, relTime, initials } from './core.js';
import { mdToHtml, bBrief } from './domain.js';

/* The collaborator logo the internal team assigned to this PRD, co-signed by
   ReqPub. Rendered above the brief the SME/partner sees. */
const okLogo = (u) => typeof u === 'string' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u);
function brandBanner(payload) {
  if (!payload || !okLogo(payload.logo)) return '';
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 0 18px;margin-bottom:20px;border-bottom:1px solid var(--line)">' +
    '<div style="display:flex;align-items:center;gap:12px;min-width:0">' +
    '<img src="' + escA(payload.logo) + '" alt="' + escA(payload.brandLabel || 'Client') + '" style="max-height:52px;max-width:200px;object-fit:contain">' +
    (payload.brandLabel ? '<span style="font-size:15px;font-weight:620;color:var(--ink);letter-spacing:-.01em">' + esc(payload.brandLabel) + '</span>' : '') + '</div>' +
    '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink-4);flex:0 0 auto">' +
    '<span class="brandmark" style="width:18px;height:18px;border-radius:5px"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>ReqPub</span></div>';
}

const wrap = (inner, max) =>
  '<div style="min-height:100vh;background:var(--bg-2);padding:46px 20px"><div style="width:100%;max-width:' + (max || 600) + 'px;margin:0 auto">' + inner + '</div></div>' +
  '<div id="toast-slot" aria-live="polite" aria-atomic="true"></div>';

export const renderLoading = () =>
  '<div style="min-height:100vh;background:var(--bg-2);display:flex;align-items:center;justify-content:center;padding:24px"><div style="color:var(--ink-3);font-size:13.5px">Loading…</div></div>';

const invalidCard = (what) =>
  '<div class="card" style="padding:40px;text-align:center"><div style="font-size:16px;font-weight:620;margin-bottom:6px">This ' + what + ' link is not valid</div><div style="color:var(--ink-3);font-size:14px;line-height:1.5">It may have been revoked or replaced. Ask your contact for a current one.</div></div>';

const smeHeader = (eyebrow, title, sub) =>
  '<div style="margin-bottom:22px"><div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">' + brandmark(28) +
  '<span class="eyebrow" style="font-size:9.5px">' + esc(eyebrow) + '</span></div>' +
  '<h1 style="font-size:24px;letter-spacing:-.02em;font-weight:660;margin:0 0 4px">' + esc(title) + '</h1>' +
  (sub ? '<div style="font-size:13px;color:var(--ink-4)">' + esc(sub) + '</div>' : '') + '</div>';

/* ---- Accountless two-way thread (shown under a submission once sent) ---- */
export function smeThreadCard(APP) {
  const t = APP.smeThread;
  if (!t || !t.ok) return '';
  const msgs = (t.messages || []).map((m) =>
    '<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--ink-4);margin-bottom:3px;font-weight:600">' + esc(m.name || (m.from === 'team' ? 'Team' : 'You')) + (m.from === 'team' ? '' : ' (you)') + ' · ' + esc(relTime(m.at)) + '</div>' +
    '<div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap">' + esc(m.body) + '</div></div>').join('');
  return '<div class="card" style="padding:22px;margin-top:16px">' +
    '<div style="font-size:14px;font-weight:640;margin-bottom:4px">Your conversation with the team</div>' +
    '<div style="font-size:12px;color:var(--ink-4);margin-bottom:14px">Bookmark this page — replies from the team appear here. No account needed.</div>' +
    '<div style="border-top:1px solid var(--line);padding-top:12px;margin-bottom:4px">' +
    '<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--ink-4);margin-bottom:3px;font-weight:600">You · ' + esc(relTime(t.at)) + '</div>' +
    '<div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap">' + esc(t.body) + '</div></div>' + msgs + '</div>' +
    '<textarea class="input" id="smeReplyBody" rows="2" placeholder="Add to the conversation" style="resize:vertical;min-height:48px;line-height:1.5"></textarea>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary btn-sm" data-action="smereply">Send</button></div></div>';
}

/* ---- SME: review brief (#brief/pid/seq/token) ---- */
export function renderBriefView(APP) {
  const s = APP.share;
  if (!s || !s.payload) return wrap(invalidCard('brief'), 680);
  const p = s.payload;
  const md = bBrief(p.answers || {});
  const f = APP.shareForm || {};
  const header = brandBanner(p) + '<div style="margin-bottom:22px"><div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;flex-wrap:wrap">' +
    '<span class="pill pill-solid"><span class="mono">v' + esc(p.label || '?') + '</span></span><span class="eyebrow" style="font-size:9.5px">Review brief</span>' +
    '<div style="flex:1"></div>' +
    '<button class="btn btn-ghost btn-sm" data-action="smepresent" title="Copy a read-only link to share">' + ico(IC.link, 'i-sm') + 'Share view</button>' +
    '<button class="btn btn-sec btn-sm" data-action="brandprint" title="Print or save as PDF">' + ico(IC.print, 'i-sm') + 'Print / PDF</button></div>' +
    '<h1 style="font-size:27px;letter-spacing:-.02em;font-weight:660;margin:0 0 8px">' + esc(p.product || 'Untitled') + '</h1>' +
    '<div style="color:var(--ink-3);font-size:13.5px;line-height:1.5">' + ((p.answers && p.answers.ctrl_org) ? esc(p.answers.ctrl_org) + '. ' : '') + 'Plain-language summary for review. No requirement detail, schedule, or internal notes.' +
    (Array.isArray(p.sections) && p.sections.length && p.sections.length < 9 ? ' The team shared ' + p.sections.length + ' section' + (p.sections.length === 1 ? '' : 's') + ' of this document.' : '') + '</div></div>';
  let reviewCard;
  if (f.submitted) {
    reviewCard = '<div class="card" style="padding:30px;text-align:center;margin-top:18px">' +
      '<div style="width:42px;height:42px;border-radius:50%;background:var(--good);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:#fff">' + ico(IC.check) + '</div>' +
      '<div style="font-size:17px;font-weight:640;margin-bottom:5px">Thank you for reviewing</div>' +
      '<div style="color:var(--ink-3);font-size:13.5px">Your review reached the team instantly.</div></div>' + smeThreadCard(APP);
  } else {
    const vchip = (o) => '<button class="chip' + (f.verdict === o ? ' on' : '') + '" data-action="shareset" data-key="verdict" data-val="' + escA(o) + '">' + esc(o) + '</button>';
    reviewCard = '<div class="card" style="padding:24px;margin-top:18px">' +
      '<div style="font-size:15px;font-weight:620;margin-bottom:4px">Does this capture what you need?</div>' +
      '<div style="color:var(--ink-4);font-size:12.5px;margin-bottom:16px">Your review opens a two-way thread with the team — no account needed.</div>' +
      '<div style="margin-bottom:16px"><div class="eyebrow" style="font-size:9px;margin-bottom:7px">Your read</div><div class="choice">' + vchip('Looks complete') + vchip('Needs changes') + '</div></div>' +
      '<div style="margin-bottom:16px"><div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Your name <span style="color:var(--ink-4);font-weight:440">required</span></div><input class="input" data-share="name" value="' + escA(f.name || '') + '" placeholder="First and last"></div>' +
      '<div style="margin-bottom:16px"><div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Notes</div><textarea class="input" data-share="note" rows="4" placeholder="What is missing, what is off, or what to add" style="resize:vertical;min-height:96px;line-height:1.5">' + esc(f.note || '') + '</textarea></div>' +
      '<button class="btn btn-primary" data-action="sharesubmit"' + (f.busy ? ' disabled' : '') + ' style="width:100%;height:46px">' + ico(IC.send) + (f.busy ? 'Sending…' : 'Send review') + '</button>' +
      (f.error ? '<div style="color:var(--bad);font-size:12.5px;margin-top:10px;text-align:center;font-weight:540">' + esc(f.error) + '</div>' : '') + '</div>';
  }
  const content = md.trim() ? '<div class="card" style="padding:28px 32px">' + mdToHtml(md) + '</div>'
    : '<div class="card" style="padding:30px;color:var(--ink-3);font-size:14px">Not enough content to summarize yet.</div>';
  return wrap(header + content + reviewCard, 680);
}

/* ---- SME: app feedback form (#fb/pid/seq/token) ---- */
export function renderFeedbackForm(APP) {
  const s = APP.share;
  if (!s || !s.payload) return wrap(invalidCard('feedback'), 600);
  const p = s.payload;
  const f = APP.shareForm || {};
  if (f.submitted) {
    return wrap(smeHeader('Feedback received', 'Thank you', p.product || '') +
      '<div class="card" style="padding:30px;text-align:center"><div style="width:42px;height:42px;border-radius:50%;background:var(--good);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:#fff">' + ico(IC.check) + '</div>' +
      '<div style="font-size:15px;font-weight:620;margin-bottom:4px">Sent to the team</div>' +
      '<div style="color:var(--ink-3);font-size:13px;margin-bottom:16px">They see it immediately, against v' + esc(p.label || '?') + (p.build ? ' (build ' + esc(p.build) + ')' : '') + '.</div>' +
      '<button class="btn btn-sec btn-sm" data-action="shareagain">Report something else</button></div>' + smeThreadCard(APP), 600);
  }
  const chip = (key, o, cur) => '<button class="chip chip-sm' + (cur === o ? ' on' : '') + '" data-action="shareset" data-key="' + key + '" data-val="' + escA(o) + '">' + esc(o) + '</button>';
  const comps = ((p.answers && p.answers.components) || []).map((c) => c.name).filter(Boolean);
  return wrap(smeHeader('App testing · v' + (p.label || '?') + (p.build ? ' · build ' + p.build : ''), p.product || 'Feedback', 'Report bugs, ideas, and questions. Each report opens a two-way thread with the team.') +
    '<div class="card" style="padding:22px">' +
    '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Type</div><div class="choice" style="margin-bottom:16px">' + ['Bug', 'Idea', 'Question'].map((o) => chip('type', o, f.type || 'Bug')).join('') + '</div>' +
    ((f.type || 'Bug') === 'Bug' ? '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Severity</div><div class="choice" style="margin-bottom:16px">' + ['Critical', 'Major', 'Minor'].map((o) => chip('severity', o, f.severity || 'Minor')).join('') + '</div>' : '') +
    (comps.length ? '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Area</div><div class="choice" style="margin-bottom:16px">' + comps.map((o) => chip('area', o, f.area)).join('') + '</div>' : '') +
    '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Title <span style="color:var(--ink-4);font-weight:440">required</span></div><input class="input" data-share="title" value="' + escA(f.title || '') + '" placeholder="One line" style="margin-bottom:16px">' +
    '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Detail <span style="color:var(--ink-4);font-weight:440">required</span></div><textarea class="input" data-share="note" rows="4" placeholder="What happened, what you expected" style="resize:vertical;min-height:110px;line-height:1.5;margin-bottom:16px">' + esc(f.note || '') + '</textarea>' +
    ((f.type || 'Bug') === 'Bug' ? '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Steps to reproduce</div><textarea class="input" data-share="steps" rows="3" placeholder="1. …&#10;2. …" style="resize:vertical;min-height:80px;line-height:1.5;margin-bottom:16px">' + esc(f.steps || '') + '</textarea>' : '') +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
    '<div style="flex:1;min-width:160px"><div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Your name <span style="color:var(--ink-4);font-weight:440">required</span></div><input class="input" data-share="name" value="' + escA(f.name || '') + '" placeholder="First and last"></div>' +
    '<div style="flex:1;min-width:160px"><div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Email <span style="color:var(--ink-4);font-weight:440">optional</span></div><input class="input" data-share="email" type="email" value="' + escA(f.email || '') + '" placeholder="you@company.com"></div></div>' +
    '<button class="btn btn-primary" data-action="sharesubmit"' + (f.busy ? ' disabled' : '') + ' style="width:100%;height:46px">' + ico(IC.send) + (f.busy ? 'Sending…' : 'Send feedback') + '</button>' +
    (f.error ? '<div style="color:var(--bad);font-size:12.5px;margin-top:10px;text-align:center;font-weight:540">' + esc(f.error) + '</div>' : '') +
    '</div>', 600);
}

/* ---- SME: note-request intake (#note/pid/token) ---- */
export function renderNoteIntake(APP) {
  const r = APP.request;
  if (!r || !r.ok) return wrap(invalidCard('request'), 600);
  const f = APP.shareForm || {};
  if (f.submitted) {
    return wrap(smeHeader('Request for input', 'Thank you', r.product || '') +
      '<div class="card" style="padding:34px 30px;text-align:center"><div style="width:46px;height:46px;border-radius:50%;background:var(--good);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#fff">' + ico(IC.check) + '</div>' +
      '<div style="font-size:19px;font-weight:660;margin-bottom:6px">Your input reached the team</div>' +
      '<div style="color:var(--ink-4);font-size:12.5px;line-height:1.55;margin:0 auto 20px;max-width:340px">They review it against the current version and may reply below. Keep this link — you can add more anytime.</div>' +
      '<button class="btn btn-sec btn-sm" data-action="shareagain">Add more</button></div>' + smeThreadCard(APP), 600);
  }
  if (r.status === 'closed') {
    return wrap(smeHeader('Request for input', r.title || 'Request closed', r.product || '') +
      '<div class="card" style="padding:30px;text-align:center;color:var(--ink-3);font-size:14px">This request has been closed by the team. Thank you — no further input is needed.</div>', 600);
  }
  const thread = (r.thread || []).map((t) =>
    '<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--ink-4);margin-bottom:3px;font-weight:600">' + esc(t.name || 'Team') + '</div>' +
    '<div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap">' + esc(t.body) + '</div></div>').join('');
  return wrap(smeHeader('Request for input', r.title || 'We would value your input', r.product || '') +
    (r.prompt ? '<div class="card" style="padding:20px 22px;margin-bottom:16px"><div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap">' + esc(r.prompt) + '</div></div>' : '') +
    (thread ? '<div class="card" style="padding:20px 22px;margin-bottom:16px">' + thread + '</div>' : '') +
    '<div class="card" style="padding:22px">' +
    '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Your name <span style="color:var(--ink-4);font-weight:440">required</span></div><input class="input" data-share="name" value="' + escA(f.name || '') + '" placeholder="First and last" style="margin-bottom:16px">' +
    '<div style="font-size:12.5px;font-weight:560;margin-bottom:7px">Your input <span style="color:var(--ink-4);font-weight:440">required</span></div><textarea class="input" data-share="note" rows="6" placeholder="Share what you know, your questions, concerns, and must-haves." style="resize:vertical;min-height:140px;line-height:1.6">' + esc(f.note || '') + '</textarea>' +
    '<button class="btn btn-primary" data-action="sharesubmit"' + (f.busy ? ' disabled' : '') + ' style="width:100%;height:46px;margin-top:14px">' + ico(IC.send) + (f.busy ? 'Sending…' : 'Send input') + '</button>' +
    (f.error ? '<div style="color:var(--bad);font-size:12.5px;margin-top:10px;text-align:center;font-weight:540">' + esc(f.error) + '</div>' : '') +
    '</div>', 600);
}

/* ---------------- partner portal ---------------- */
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const partnerOf = (APP) => (APP.ctx && APP.ctx.partner) || {};

/* Per-card state the whole portal reasons about: does the team owe them a
   look (a reply is waiting), or do they owe the team one (a new version)? */
export function partnerCardState(APP, p) {
  const pay = p.payload || {};
  const thread = (APP.partnerThreads && APP.partnerThreads[p.project_id]) || [];
  const waiting = thread.filter((t) => (t.messages || []).length && (t.messages[t.messages.length - 1].from === 'team')).length;
  const seen = (APP.partnerSeen || {})[p.project_id] || '';
  const newVersion = !!(pay.label && seen && pay.label !== seen);
  const neverSeen = !!(pay.label && !seen);
  return { pay, thread, waiting, newVersion: newVersion || neverSeen, label: pay.label || '' };
}

function partnerMenu(APP) {
  if (!APP.menuOpen) return '';
  const pr = partnerOf(APP);
  return '<div class="umback" data-action="menuclose"></div><div class="umpop">' +
    '<div class="umhead"><span class="umav lg" style="background:var(--purple)">' + esc(initials(pr.name || pr.email || 'P')) + '</span>' +
    '<div style="min-width:0"><div class="umname">' + esc(pr.name || 'Add your name') + '</div>' +
    '<div class="umsub">' + esc([pr.title, pr.company].filter(Boolean).join(' · ') || pr.email || '') + '</div>' +
    '<span class="umrole" style="margin-top:5px;color:var(--purple);background:#f1ebfd;border-color:#e4d9fb">Partner</span></div></div>' +
    '<div class="umsep"></div>' +
    '<button class="umitem" data-action="pprofopen">' + ico(IC.user) + 'Profile &amp; name</button>' +
    '<div class="umsep"></div><button class="umitem danger" data-action="signout">' + ico(IC.signout) + 'Sign out</button></div>';
}

export function partnerProfileModal(APP) {
  const pr = partnerOf(APP);
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3>Your profile</h3><button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div class="hint" style="margin-top:4px">Shown to the build team on every note and reply you send.</div>' +
    '<div class="fldlabel">Full name</div><input class="input" id="ppName" value="' + escA(pr.name || '') + '" placeholder="First and last">' +
    '<div class="fldlabel">Title</div><input class="input" id="ppTitle" value="' + escA(pr.title || '') + '" placeholder="e.g. Director of Research">' +
    '<div class="fldlabel">Organization</div><input class="input" id="ppCompany" value="' + escA(pr.company || '') + '" placeholder="e.g. Canfield Group">' +
    '<div class="fldlabel">Email</div><input class="input" value="' + escA(pr.email || (APP.user && APP.user.email) || '') + '" readonly style="color:var(--ink-4)">' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button class="btn btn-sec" data-action="modalclose">Cancel</button>' +
    '<button class="btn btn-primary" data-action="pprofsave">Save profile</button></div></div></div>';
}

function partnerTopbar(APP) {
  const pr = partnerOf(APP);
  return '<div class="topbar"><div style="display:flex;align-items:center;gap:11px">' + brandmark() +
    '<div><div style="font-weight:660;letter-spacing:-.02em;font-size:15px">ReqPub</div><div class="eyebrow" style="font-size:9.5px;letter-spacing:.18em;margin-top:1px">Partner portal</div></div></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><span class="pill" style="color:var(--purple);border-color:var(--purple)">Partner</span>' +
    '<button class="umbtn" data-action="usermenu" title="Account"><span class="umav" style="background:var(--purple)">' + esc(initials(pr.name || pr.email || (APP.user && APP.user.email) || 'P')) + '</span></button></div></div>';
}

const partnerChrome = (APP, inner) =>
  '<div class="app">' + partnerTopbar(APP) + inner + '</div>' +
  '<div id="toast-slot" aria-live="polite" aria-atomic="true"></div>' +
  partnerMenu(APP) + (APP.pprofOpen ? partnerProfileModal(APP) : '');

export function renderPartnerHome(APP) {
  const pr = partnerOf(APP);
  const first = (pr.name || '').split(' ')[0] || 'there';
  const projects = (APP.partnerProjects || []).slice();

  // Needs-your-attention first: team replies waiting, then unseen versions.
  projects.sort((x, y) => {
    const a = partnerCardState(APP, x), b = partnerCardState(APP, y);
    if (b.waiting !== a.waiting) return b.waiting - a.waiting;
    if (b.newVersion !== a.newVersion) return (b.newVersion ? 1 : 0) - (a.newVersion ? 1 : 0);
    return String(a.pay.product || '').localeCompare(String(b.pay.product || ''));
  });

  const nameNudge = !pr.name
    ? '<div class="card rise" style="padding:14px 16px;margin-bottom:18px;border:1px solid #e4d9fb;background:#f8f5fe;display:flex;align-items:center;gap:12px">' +
      '<span class="umav" style="background:var(--purple);flex:0 0 auto">?</span>' +
      '<div style="flex:1;font-size:13px;color:var(--ink-2)">Add your name so the team knows who is writing to them.</div>' +
      '<button class="btn btn-primary btn-sm" data-action="pprofopen">Add name</button></div>'
    : '';

  const cards = projects.length ? projects.map((p) => {
    const st = partnerCardState(APP, p);
    return '<button class="pcard" data-action="popen" data-id="' + escA(p.project_id) + '">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0">' +
      '<div style="font-weight:600;font-size:15.5px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(st.pay.product || p.name || p.project_id) + '</div>' +
      '<div style="font-size:12px;color:var(--ink-3);margin-top:3px">' + (st.label ? 'Published v' + esc(st.label) : 'No published brief yet') + '</div></div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">' +
      (st.waiting ? '<span class="pill pill-brand">' + st.waiting + ' repl' + (st.waiting === 1 ? 'y' : 'ies') + '</span>' : '') +
      (st.newVersion && st.label ? '<span class="pill pill-amber">New v' + esc(st.label) + '</span>' : '') + '</div></div>' +
      '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill">' + st.thread.length + ' note' + (st.thread.length === 1 ? '' : 's') + ' sent</span></div></button>';
  }).join('') : '<div class="card" style="grid-column:1/-1;padding:34px;text-align:center;color:var(--ink-3)"><div style="font-size:15px;font-weight:600;color:var(--ink-2);margin-bottom:5px">No assignments yet</div><div style="font-size:13px">When the team assigns you a PRD it appears here with its latest published brief.</div></div>';

  return partnerChrome(APP,
    '<div style="flex:1;overflow-y:auto"><div class="wrap" style="max-width:820px">' +
    '<div class="rise" style="margin-bottom:26px"><h1 style="font-size:30px;letter-spacing:-.025em;font-weight:660;margin:0 0 8px">' + esc(greet()) + ', ' + esc(first) + '.</h1>' +
    '<p style="color:var(--ink-3);font-size:14.5px;line-height:1.6;margin:0;max-width:760px">The PRDs assigned to you for review. Any note you send opens a thread with the team.</p></div>' +
    nameNudge +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">' + cards + '</div>' +
    '</div></div>');
}

export function renderPartnerProject(APP) {
  const pid = APP.partnerPid;
  const p = (APP.partnerProjects || []).find((x) => x.project_id === pid) || {};
  const pay = p.payload || {};
  const thread = (APP.partnerThreads && APP.partnerThreads[pid]) || [];
  const md = pay.answers ? bBrief(pay.answers) : '';
  const notes = thread.map((t) => {
    const msgs = (t.messages || []).map((m) =>
      '<div style="padding:8px 0;border-top:1px solid var(--line)"><div style="font-size:11px;color:var(--ink-4);margin-bottom:2px"><strong style="color:var(--ink-2)">' + esc(m.name || (m.from === 'team' ? 'Team' : 'You')) + '</strong> · ' + esc(relTime(m.at)) + '</div>' +
      '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;white-space:pre-wrap">' + esc(m.body) + '</div></div>').join('');
    return '<div class="card" style="padding:15px;margin-bottom:9px">' +
      '<div style="font-size:11px;color:var(--ink-4);margin-bottom:4px">You · ' + esc(relTime(t.at)) + '</div>' +
      '<div style="font-size:13px;color:var(--ink-2);line-height:1.55;white-space:pre-wrap">' + esc(t.body) + '</div>' +
      (msgs ? '<div style="margin-top:10px">' + msgs + '</div>' : '') +
      '<textarea class="input" data-preplydraft="' + escA(t.id) + '" rows="1" aria-label="Reply" style="font-size:12.5px;resize:vertical;min-height:38px;line-height:1.5;margin-top:9px"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn btn-sec btn-sm" data-action="preply" data-id="' + escA(t.id) + '">Reply</button></div></div>';
  }).join('');
  return partnerChrome(APP,
    '<div style="flex:1;overflow-y:auto"><div class="wrap" style="max-width:760px">' +
    '<button class="btn btn-ghost btn-sm" data-action="phome" style="margin-bottom:14px">' + ico(IC.arrow, 'i-sm') + 'All assignments</button>' +
    brandBanner(pay) +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px"><h1 style="font-size:26px;letter-spacing:-.02em;font-weight:660;margin:0">' + esc(pay.product || p.name || pid) + '</h1>' +
    (pay.label ? '<span class="pill pill-solid"><span class="mono">v' + esc(pay.label) + '</span></span>' : '') +
    (md ? '<div style="flex:1"></div>' +
      '<button class="btn btn-ghost btn-sm" data-action="ppresent" data-id="' + escA(pid) + '" title="Copy a read-only link to share">' + ico(IC.link, 'i-sm') + 'Share view</button>' +
      '<button class="btn btn-sec btn-sm" data-action="brandprint" title="Print or save as PDF">' + ico(IC.print, 'i-sm') + 'Print / PDF</button>' : '') + '</div>' +
    (md ? '<div class="card" style="padding:26px 30px;margin-bottom:22px">' + mdToHtml(md) + '</div>'
        : '<div class="card" style="padding:26px;margin-bottom:22px;color:var(--ink-3);font-size:13.5px">The team has not published a brief for this PRD yet.</div>') +
    '<div class="card" style="padding:18px;margin-bottom:18px;border:1px solid var(--sky-2);background:var(--sky)">' +
    '<div style="font-size:14px;font-weight:640;margin-bottom:3px">Send a note to the team</div>' +
    '<div style="font-size:12px;color:var(--ink-3);margin-bottom:11px">It lands in their inbox and opens a thread right here.</div>' +
    '<textarea class="input" id="pPostBody" rows="3" aria-label="Note to the team" style="resize:vertical;min-height:70px;line-height:1.55"></textarea>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:9px"><button class="btn btn-primary btn-sm" data-action="ppost" data-id="' + escA(pid) + '">' + ico(IC.send, 'i-sm') + 'Send to team</button></div></div>' +
    '<div class="eyebrow" style="font-size:9.5px;margin:0 0 10px">Your threads</div>' +
    (notes || '<div class="hint" style="padding:8px 2px">No notes yet. Anything you send appears here with the team&rsquo;s replies.</div>') +
    '</div></div>');
}

/* ---------------- read-only presentation of a published PRD ----------------
   A fixed, branded, account-free page. Same section-scoped brief content, shown
   as a clean document with no review form — the "just look at it" link. */
export function renderPresentShare(APP) {
  const s = APP.share;
  if (!s || !s.payload) return wrap(invalidCard('presentation'), 760);
  const p = s.payload;
  const md = bBrief(p.answers || {});
  const brand = brandBanner(p);
  const head = brand +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px">' +
    '<div style="min-width:0"><div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:8px">' +
    '<span class="pill pill-solid"><span class="mono">v' + esc(p.label || '?') + '</span></span>' +
    '<span class="eyebrow" style="font-size:9.5px">Requirements · read-only</span></div>' +
    '<h1 style="font-size:30px;letter-spacing:-.025em;font-weight:660;margin:0">' + esc(p.product || 'Untitled') + '</h1></div>' +
    '<button class="btn btn-sec btn-sm" data-action="brandprint" title="Print or save as PDF" style="flex:0 0 auto">' + ico(IC.print, 'i-sm') + 'Print / PDF</button>' +
    '</div>';
  const body = md.trim()
    ? '<div class="card" style="padding:30px 34px">' + mdToHtml(md) + '</div>'
    : '<div class="card" style="padding:34px;color:var(--ink-3);font-size:14px;text-align:center">This presentation has no shared content yet.</div>';
  const foot = '<div style="text-align:center;margin-top:24px;font-size:11.5px;color:var(--ink-4);display:flex;align-items:center;justify-content:center;gap:6px">' +
    '<span class="brandmark" style="width:16px;height:16px;border-radius:4px"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>' +
    'A read-only requirements record, published with ReqPub. This link cannot be edited.</div>';
  return wrap(head + body + foot, 780);
}

/* ---------------- durable SME workspace (#sme/replyToken) ----------------
   The SME's permanent home for one PRD: the branded read-only brief plus a
   single continuous thread with the team. Reached by a stable personal link,
   so it resumes on any device with no login and no lost bookmarks. */
export function renderSmeWorkspace(APP) {
  const t = APP.smeThread;
  if (!t || !t.ok) return wrap(invalidCard('workspace'), 760);
  const brief = t.brief || {};
  const md = brief.answers ? bBrief(brief.answers) : '';
  const msgs = (t.messages || []).map((m) =>
    '<div style="padding:10px 0;border-top:1px solid var(--line)">' +
    '<div style="font-size:11px;color:var(--ink-4);margin-bottom:3px;font-weight:600">' +
    esc(m.name || (m.from === 'team' ? 'Team' : 'You')) + (m.from === 'team' ? '' : ' (you)') + ' · ' + esc(relTime(m.at)) + '</div>' +
    '<div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap">' + esc(m.body) + '</div></div>').join('');
  const head = brandBanner(brief) +
    '<div style="margin-bottom:20px"><div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">' + brandmark(28) +
    '<span class="eyebrow" style="font-size:9.5px">SME review workspace' + (brief.label ? ' · v' + esc(brief.label) : '') + '</span></div>' +
    '<h1 style="font-size:27px;letter-spacing:-.02em;font-weight:660;margin:0 0 4px">' + esc(t.product || 'Requirements') + '</h1>' +
    (t.name ? '<div style="font-size:13px;color:var(--ink-4)">Reviewer: ' + esc(t.name) + '</div>' : '') + '</div>';
  const prd = md
    ? '<div class="card" style="padding:26px 30px;margin-bottom:20px">' + mdToHtml(md) + '</div>'
    : '<div class="card" style="padding:24px;margin-bottom:20px;color:var(--ink-3);font-size:13.5px">The team has not published a brief for this PRD yet. Your conversation with them is below — it stays here as the document takes shape.</div>';
  const thread = '<div class="card" style="padding:22px">' +
    '<div style="font-size:14px;font-weight:640;margin-bottom:3px">Your conversation with the team</div>' +
    '<div style="font-size:12px;color:var(--ink-4);margin-bottom:12px">This link is yours — bookmark it. Everything you and the team exchange stays here, across every version. No account needed.</div>' +
    (msgs || '<div class="hint" style="padding:6px 2px">No messages yet. Start the conversation below.</div>') +
    '<textarea class="input" id="smeReplyBody" rows="3" placeholder="Write to the team" style="resize:vertical;min-height:64px;line-height:1.55;margin-top:12px"></textarea>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary btn-sm" data-action="smereply">Send</button></div></div>';
  return wrap(head + prd + thread, 760);
}

/* ---------------- signed in, but no workspace ---------------- */
export function renderNoOrg(APP) {
  return '<div style="min-height:100vh;background:var(--bg-2);display:flex;align-items:center;justify-content:center;padding:24px"><div style="width:100%;max-width:400px;text-align:center">' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:14px">' + brandmark(30) + '<span style="font-size:20px;font-weight:680;letter-spacing:-.02em">ReqPub</span></div>' +
    '<div class="card" style="padding:28px;text-align:left">' +
    '<div style="font-size:17px;font-weight:660;margin-bottom:6px">Create your workspace</div>' +
    '<div class="hint" style="margin-bottom:16px">You are signed in as ' + esc((APP.user && APP.user.email) || '') + ' but not yet in a workspace. Create one, or ask a manager to invite this email.</div>' +
    '<input class="input" id="woName" placeholder="Workspace name, e.g. Collection Ventures" style="margin-bottom:12px">' +
    '<button class="btn btn-primary" data-action="createorg" style="width:100%;height:44px"' + (APP.authBusy ? ' disabled' : '') + '>' + (APP.authBusy ? 'Creating…' : 'Create workspace') + '</button>' +
    (APP.authError ? '<div style="color:var(--bad);font-size:12.5px;margin-top:10px">' + esc(APP.authError) + '</div>' : '') +
    '<div style="text-align:center;margin-top:14px"><button class="btn btn-ghost btn-sm" data-action="signout">Sign out</button></div>' +
    '</div></div></div><div id="toast-slot" aria-live="polite" aria-atomic="true"></div>';
}
