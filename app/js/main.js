/* ============================================================================
   ReqPub v2 — application core: state, boot, routing, event delegation.
   Views are pure string builders; this file owns every state change.
   ============================================================================ */

import { esc, ico, IC, uid, themeInit, themeSet, copyText, debounce, presentUrl } from './core.js';
import { assembleAnswers, buildSections, suggestFit, changeNote, qById, mdToHtml, defaultBriefSections } from './domain.js';
import { sb, online, repo, buildSharePayload } from './data.js';
import { sync } from './sync.js';
import { viewProjects, viewWorkspace, currentDocMd, nextLabel, paletteItems, documentTabHTML } from './views-app.js';
import { projectStatsOf } from './views-collab.js';
import { renderLoading, renderBriefView, renderFeedbackForm, renderNoteIntake, renderPartnerHome, renderPartnerProject, renderNoOrg, renderPresentShare } from './views-external.js';
import { copyMarkdown, downloadMarkdown, downloadWord, printDoc, downloadExecSummary } from './exports.js';

/* ---------------- state ---------------- */
const APP = {
  view: 'loading', user: null, ctx: null, orgId: null, org: '', role: null,
  projects: [], projectStats: {},
  pid: null, project: null, fields: {}, rows: {}, versions: [], approvals: {},
  comms: [], msgs: {}, requests: [], discovery: [], activityLog: [], reads: {},
  snapshots: {}, shares: [], presence: [],
  saveState: 'idle', everSaved: false, conflicts: {}, activeField: null,
  docTab: 'document', viewSeq: null, docShow: false, openSecs: {}, openComms: {}, openDisc: {},
  drafts: {}, inboxFilter: { src: 'all', status: 'all', q: '' }, fbSeq: null,
  noteDraft: '', noteSrc: 'team', noteBy: '', reqDraft: {}, reqDel: null,
  discDraft: {}, discQ: '', discDel: null,
  menuOpen: false, profileOpen: false, orgOpen: false, orgData: null,
  present: false, shareOpen: false, access: { members: [], partners: [] }, activeQid: null,
  wsMenuOpen: false, wsCreating: false, briefPickOpen: false, briefPick: [],
  genOpen: false, gen: {}, palOpen: false, palQ: '', palSel: 0,
  delPending: null, delError: null, toast: null,
  share: null, shareKind: null, shareForm: {}, smeThread: null, request: null,
  partnerProjects: [], partnerThreads: {}, partnerPid: null, partnerSeen: {}, pprofOpen: false,
  authBusy: false, authError: null, bundleLoading: false
};
window.APP = APP; // aids debugging in the console; harmless in production

/* ---------------- rendering ---------------- */
const root = document.getElementById('root');
let renderQueued = false;

function render() {
  try {
    renderUnsafe();
  } catch (e) {
    // A render bug must never leave a blank page in front of nine editors.
    console.error('render failed:', e);
    root.innerHTML = '<div class="empty" style="height:100vh"><div style="font-size:15px;font-weight:600;color:var(--ink-2);margin-bottom:6px">Something went wrong drawing this view</div>' +
      '<div style="font-size:13px;max-width:320px;margin-bottom:16px">Your data is safe on the server. Reload to continue; if this repeats, the browser console has the detail to report.</div>' +
      '<a class="btn btn-primary" href="/app/">Reload</a></div>';
  }
}

function renderUnsafe() {
  const doc = document.getElementById('docScroll');
  const intake = document.getElementById('intakePane');
  const scrollDoc = doc ? doc.scrollTop : 0;
  const scrollIntake = intake ? intake.scrollTop : 0;

  let html;
  switch (APP.view) {
    case 'loading': html = renderLoading(); break;
    case 'brief': html = renderBriefView(APP); break;
    case 'fbshare': html = renderFeedbackForm(APP); break;
    case 'note': html = renderNoteIntake(APP); break;
    case 'present': html = renderPresentShare(APP); break;
    case 'partner': html = renderPartnerHome(APP); break;
    case 'partnerview': html = renderPartnerProject(APP); break;
    case 'noorg': html = renderNoOrg(APP); break;
    case 'workspace': html = viewWorkspace(APP); break;
    case 'projects': default: html = viewProjects(APP); break;
  }
  root.innerHTML = html;

  const doc2 = document.getElementById('docScroll');
  const intake2 = document.getElementById('intakePane');
  if (doc2) doc2.scrollTop = scrollDoc;
  if (intake2) intake2.scrollTop = scrollIntake;
  renderToast();
}

function renderToast() {
  const ts = document.getElementById('toast-slot');
  if (ts) ts.innerHTML = APP.toast ? '<div class="toast">' + ico(IC.check, 'i-sm') + esc(APP.toast) + '</div>' : '';
}

let toastTimer = null;
function toast(t) {
  APP.toast = t; renderToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { APP.toast = null; renderToast(); }, 2200);
}

/* Re-render, but never yank the DOM out from under someone mid-keystroke.
   Deferred renders run when the field blurs (or on the trailing edge). The
   document pane is the exception: it lives in its own scroll container, so it
   is live-patched while you type — your words appear in the document as you
   write them, and so do your teammates'. */
const deferredRender = debounce(() => { if (!APP.activeField) render(); }, 900);
function scheduleRender(reason) {
  if (reason === 'savechip') { patchSaveChips(); return; }
  if (APP.activeField) {
    if (reason && (reason.startsWith('field:') || reason.startsWith('rows:'))) patchDocPane();
    deferredRender();
    return;
  }
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

/* ---- live edit-follow: patch the rendered document and reveal the section
   being edited, without touching the worksheet DOM ---- */
let lastRevealedSec = null;
const patchDocPane = debounce(() => {
  if (APP.view !== 'workspace' || APP.viewSeq != null) return;
  const a = assembleAnswers(APP.fields, APP.rows);
  if (APP.docTab === 'document') {
    const el = document.getElementById('docScroll');
    if (el) {
      const keep = el.scrollTop;
      el.innerHTML = documentTabHTML(APP, a);
      el.scrollTop = keep;
    }
  }
  if (APP.present) {
    const p = document.getElementById('presentScroll');
    if (p) {
      const d = currentDocMd(APP, a);
      const keep = p.scrollTop;
      p.innerHTML = '<div class="page">' + (d.md ? mdToHtml(d.md) : '') + '</div>';
      p.scrollTop = keep;
    }
  }
  revealActiveSection();
}, 300);

function revealActiveSection(force) {
  const qid = APP.activeQid;
  if (!qid || APP.viewSeq != null) return;
  const q = qById[qid];
  if (!q) return;
  if (!force && q.sec === lastRevealedSec) return;
  const container = APP.present ? document.getElementById('presentScroll')
    : (APP.docTab === 'document' ? document.getElementById('docScroll') : null);
  if (!container) return;
  const el = container.querySelector('#docsec-' + q.sec);
  if (!el) return;
  lastRevealedSec = q.sec;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.add('doc-flash');
  setTimeout(() => el.classList.add('fade'), 700);
  setTimeout(() => el.classList.remove('doc-flash', 'fade'), 2100);
}

async function loadAccessData() {
  if (!APP.orgId) return;
  const [members, partners] = await Promise.all([
    repo.members(APP.orgId),
    APP.role === 'manager' ? repo.orgPartners(APP.orgId) : Promise.resolve(APP.access.partners || [])
  ]);
  APP.access = { members, partners };
  scheduleRender('access');
}
function patchSaveChips() {
  // Surgical update so typing is never interrupted by chip changes.
  document.querySelectorAll('.savechip').forEach((el) => {
    const s = APP.saveState;
    if (s === 'idle') { el.style.display = 'none'; return; }
    el.style.display = '';
    el.className = 'savechip ' + s;
    el.innerHTML = s === 'saving' ? '<span class="spin"></span>Saving…'
      : s === 'saved' ? ico(IC.check, 'i-sm') + 'Saved'
      : s === 'offline' ? 'Offline — will retry' : 'Save failed — Retry';
    if (s === 'error') el.setAttribute('data-action', 'retrysave'); else el.removeAttribute('data-action');
    el.disabled = s !== 'error';
  });
}

/* ---------------- routing ---------------- */
function parseHash() {
  const h = (location.hash || '').replace(/^#/, '');
  let m = h.match(/^(brief|fb|present)\/([^/]+)\/(\d+)\/([^/]+)$/);
  if (m) return { mode: m[1], pid: m[2], seq: +m[3], token: m[4] };
  m = h.match(/^note\/([^/]+)\/([^/]+)$/);              // v2: #note/pid/token
  if (m) return { mode: 'note', pid: m[1], token: m[2] };
  m = h.match(/^note\/([^/]+)\/([^/]+)\/([^/]+)$/);     // v1 legacy: #note/pid/rid/token
  if (m) return { mode: 'note', pid: m[1], token: m[3] };
  return null;
}

async function routeShare(r) {
  APP.view = 'loading'; render();
  const fallback = r.mode === 'note' ? 'note' : r.mode === 'fb' ? 'fbshare' : r.mode === 'present' ? 'present' : 'brief';
  if (!online()) { APP.share = null; APP.view = fallback; render(); return; }
  APP.shareKind = r.mode;
  APP.shareToken = r.token;
  APP.shareRoute = r;
  APP.shareForm = {};
  if (r.mode === 'note') {
    const res = await repo.requestView(r.token);
    APP.request = (res.data && res.data.ok) ? res.data : null;
    APP.view = 'note';
  } else if (r.mode === 'present') {
    // Pure read-only presentation: load the brief payload, show no form.
    const res = await repo.getShare(r.token);
    APP.share = res.data ? { payload: res.data } : null;
    APP.view = 'present';
    render();
    return;
  } else {
    const res = await repo.getShare(r.token);
    APP.share = res.data ? { payload: res.data } : null;
    APP.view = r.mode === 'fb' ? 'fbshare' : 'brief';
  }
  await loadSmeThread();
  render();
}

function smeTokenKey() { return 'rp:sme:' + APP.shareToken; }
async function loadSmeThread() {
  APP.smeThread = null;
  let replyToken = null;
  try { replyToken = localStorage.getItem(smeTokenKey()); } catch { /* private mode */ }
  if (!replyToken) return;
  const r = await repo.smeThread(replyToken);
  if (r.data && r.data.ok) { APP.smeThread = r.data; APP.smeReplyToken = replyToken; APP.shareForm.submitted = true; }
}

/* ---------------- boot ---------------- */
async function boot() {
  themeInit();
  const shareRoute = parseHash();
  if (shareRoute) { await routeShare(shareRoute); return; }

  if (!online()) { root.innerHTML = '<div class="empty" style="height:100vh"><div style="font-size:14px">Backend not configured. Set SB_CFG in /config.js.</div></div>'; return; }
  const session = await repo.session();
  if (!session) { location.replace('/login/'); return; }
  APP.user = session.user;

  // If the session ends while the app is open (expiry, revocation, sign-out
  // in another tab), return to the door instead of failing request by request.
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.replace('/login/');
  });

  await repo.claimInvites();
  APP.ctx = await repo.context();
  if (!APP.ctx) { toast('Could not load your workspace'); APP.view = 'noorg'; render(); return; }

  // First sign-in after signup: copy the display name from auth metadata
  // into user_profiles so teammates see a real name, not an email.
  const metaName = APP.user.user_metadata && APP.user.user_metadata.display_name;
  if (!APP.ctx.display_name && metaName) {
    await repo.saveDisplayName(APP.user.id, metaName);
    APP.ctx.display_name = metaName;
  }

  const memberships = APP.ctx.memberships || [];
  if (memberships.length) {
    let last = null;
    try { last = localStorage.getItem('rp:lastorg'); } catch { /* fine */ }
    const m = memberships.find((x) => x.org_id === last) || memberships[0];
    await enterOrg(m);
  } else if (APP.ctx.partner) {
    APP.role = 'partner';
    APP.view = 'partner';
    pseenLoad();
    render();
    loadPartner();
  } else {
    APP.view = 'noorg'; render();
  }
}

async function enterOrg(m) {
  APP.orgId = m.org_id; APP.org = m.org_name; APP.role = m.role;
  try { localStorage.setItem('rp:lastorg', m.org_id); } catch { /* fine */ }
  APP.view = 'projects'; APP.pid = null;
  sync.init(APP, { onChange: scheduleRender, onToast: toast });
  sync.initPresence(APP.user);
  sync.subscribeOrg(APP.orgId);
  APP.projects = await repo.projects(APP.orgId);
  render();
  refreshDashboardStats();
}

async function refreshDashboardStats() {
  // One org-wide pass: unread/open per project for the dashboard chips.
  const r = await Promise.all([
    (async () => { const x = await sbLite('comms', 'id,project_id,origin,status', APP.orgId); return x; })(),
    (async () => { const x = await repoReads(); return x; })()
  ]);
  const comms = r[0], reads = r[1];
  const byProj = {};
  comms.forEach((c) => { (byProj[c.project_id] = byProj[c.project_id] || []).push(c); });
  const stats = {};
  APP.projects.forEach((p) => {
    stats[p.id] = projectStatsOf(byProj[p.id] || [], reads);
    stats[p.id].latest = null;
  });
  const vr = await sbLite('versions', 'id,project_id,seq,label,status', APP.orgId, false);
  vr.forEach((v) => {
    const s = stats[v.project_id];
    if (s && (!s.latest || v.seq > s.latest.seq)) s.latest = v;
  });
  APP.projectStats = stats;
  scheduleRender('stats');
}
async function sbLite(table, cols, orgId, hasOrg = true) {
  let q = sb.from(table).select(cols);
  if (hasOrg) q = q.eq('org_id', orgId);
  const r = await q;
  return r.data || [];
}
async function repoReads() {
  const r = await sb.from('read_marks').select('comm_id');
  const m = {};
  (r.data || []).forEach((x) => { m[x.comm_id] = true; });
  return m;
}

/* ---------------- project open / close ---------------- */
async function openProject(id) {
  APP.pid = id;
  APP.project = APP.projects.find((p) => p.id === id) || null;
  APP.view = 'workspace';
  APP.docTab = 'document'; APP.viewSeq = null; APP.fbSeq = null;
  APP.fields = {}; APP.rows = {}; APP.versions = []; APP.comms = []; APP.msgs = {};
  APP.requests = []; APP.discovery = []; APP.reads = {}; APP.snapshots = {}; APP.shares = [];
  APP.approvals = {}; APP.conflicts = {}; APP.openComms = {}; APP.openDisc = {}; APP.openSecs = {};
  APP.present = false; APP.activeQid = null; lastRevealedSec = null;
  APP.access = { members: [], partners: [] };
  APP.bundleLoading = true;
  render();

  const b = await repo.projectBundle(id);
  if (APP.pid !== id) return;
  Object.assign(APP, {
    fields: b.fields, rows: b.rows, versions: b.versions, comms: b.comms,
    requests: b.requests, discovery: b.discovery, reads: b.reads, bundleLoading: false
  });
  const parentIds = [...b.comms.map((c) => c.id), ...b.requests.map((r) => r.id)];
  const [msgs, approvals, shares] = await Promise.all([
    repo.messagesFor(parentIds),
    repo.approvals(b.versions.map((v) => v.id)),
    repo.sharesFor(id)
  ]);
  if (APP.pid !== id) return;
  APP.msgs = msgs; APP.approvals = approvals; APP.shares = shares;
  sync.subscribeProject(id, APP.user);
  render();
}

function goHome() {
  sync.flushNow();
  sync.unsubscribeProject();
  APP.pid = null; APP.project = null; APP.view = 'projects'; APP.activeField = null;
  APP.present = false; APP.activeQid = null;
  render();
  refreshDashboardStats();
}

async function ensureSnapshot(seq) {
  if (seq == null || APP.snapshots[seq]) return;
  const s = await repo.versionSnapshot(APP.pid, seq);
  if (s) { APP.snapshots[seq] = s; scheduleRender('snapshot'); }
}

/* ---------------- generate version ---------------- */
async function generateVersion() {
  const g = APP.gen;
  g.busy = true; g.error = null; render();
  sync.flushNow();
  for (let i = 0; i < 40 && sync.dirtyCount() > 0; i++) await new Promise((r) => setTimeout(r, 150));
  if (sync.dirtyCount() > 0) { g.busy = false; g.error = 'Some edits have not saved yet — check the save indicator, then try again.'; render(); return; }

  const answers = assembleAnswers(APP.fields, APP.rows);
  const label = nextLabel(APP.versions, !!g.major);
  const sections = buildSections(answers, label, APP.versions.concat([{ seq: 1e9, label, created_at: new Date().toISOString(), author_name: '' }]));
  const prevMeta = APP.versions[APP.versions.length - 1];
  if (prevMeta) await ensureSnapshot(prevMeta.seq);
  const auto = changeNote(prevMeta ? (APP.snapshots[prevMeta.seq] || {}).snapshot : null, answers, !prevMeta);
  const note = [g.note && g.note.trim(), auto].filter(Boolean).join(' — ');

  const r = await repo.createVersion(APP.pid, !!g.major, note, { answers, sections });
  const out = r.data;
  if (r.error || !out || !out.ok) {
    g.busy = false; g.error = (out && out.error === 'forbidden') ? 'Your role cannot generate versions.' : 'Could not generate — try again.';
    render(); return;
  }
  // Publish the SME-safe payloads for this baseline (brief + app testing).
  // The brief carries the project's remembered section selection.
  await Promise.all([
    repo.sharePut(APP.pid, 'brief', out.seq, buildSharePayload(APP.project || { name: answers.ctrl_product }, answers, out.label, out.seq, 'brief', '', briefSecsSaved(APP.pid))),
    repo.sharePut(APP.pid, 'pilot', out.seq, buildSharePayload(APP.project || { name: answers.ctrl_product }, answers, out.label, out.seq, 'pilot'))
  ]);
  APP.shares = await repo.sharesFor(APP.pid);
  if (!APP.versions.some((v) => v.id === out.id)) {
    APP.versions.push({ id: out.id, seq: out.seq, label: out.label, status: 'draft', note, author_name: (APP.ctx && APP.ctx.display_name) || '', build: '', created_at: new Date().toISOString() });
  }
  APP.genOpen = false; APP.gen = {};
  toast('Version v' + out.label + ' generated');
  render();
}

/* ---------------- share submission (SME pages) ---------------- */
async function submitShare() {
  const f = APP.shareForm;
  f.error = null;
  if (!f.name || !f.name.trim()) { f.error = 'Please add your name.'; render(); return; }
  if (APP.shareKind !== 'brief' && (!f.note || !f.note.trim())) { f.error = 'Please add your input.'; render(); return; }
  if (APP.shareKind === 'fb' && (!f.title || !f.title.trim())) { f.error = 'Please add a title.'; render(); return; }
  f.busy = true; render();

  let r;
  if (APP.shareKind === 'note') {
    r = await repo.requestSubmit(APP.shareToken, f.name.trim(), (f.note || '').trim());
  } else {
    r = await repo.submitShare(APP.shareToken, {
      name: f.name.trim(), email: (f.email || '').trim(),
      title: APP.shareKind === 'brief' ? 'PRD review' + (f.verdict ? ': ' + f.verdict : '') : f.title.trim(),
      body: (f.note || '').trim(), steps: (f.steps || '').trim(),
      type: APP.shareKind === 'brief' ? 'Review' : (f.type || 'Bug'),
      severity: (f.type || 'Bug') === 'Bug' ? (f.severity || 'Minor') : '',
      verdict: f.verdict || ''
    });
  }
  const out = r.data;
  f.busy = false;
  if (r.error || !out || !out.ok) {
    const why = out && out.error;
    f.error = why === 'invalid_link' ? 'This link is no longer active. Ask your contact for a current one.'
      : why === 'rate_limited' ? 'This link reached its hourly submission limit. Please try again in a little while.'
      : why === 'too_long' ? 'Your message is too long for one submission. Please shorten it.'
      : why === 'empty' ? 'Please add your input before sending.'
      : 'Could not send. Check your connection and try again; if it keeps failing, tell your contact.';
    render(); return;
  }
  f.submitted = true;
  if (out.reply_token) {
    try { localStorage.setItem(smeTokenKey(), out.reply_token); } catch { /* private mode */ }
    APP.smeReplyToken = out.reply_token;
    await loadSmeThread();
  }
  render();
}

/* ---------------- partner ---------------- */
let lastPartnerRefresh = 0;
async function loadPartner() {
  lastPartnerRefresh = Date.now();
  const r = await repo.partnerProjects();
  APP.partnerProjects = (r.data && Array.isArray(r.data)) ? r.data : [];
  await Promise.all(APP.partnerProjects.map(async (p) => {
    const t = await repo.partnerThread(p.project_id);
    APP.partnerThreads[p.project_id] = (t.data && Array.isArray(t.data)) ? t.data : [];
  }));
  if (APP.view === 'partnerview' && APP.partnerPid) pseenMark(APP.partnerPid);
  render();
}

function pseenLoad() {
  try { APP.partnerSeen = JSON.parse(localStorage.getItem('rp:pseen') || '{}') || {}; }
  catch { APP.partnerSeen = {}; }
}
function pseenMark(pid) {
  const p = (APP.partnerProjects || []).find((x) => x.project_id === pid);
  const label = p && p.payload && p.payload.label;
  if (!label) return;
  APP.partnerSeen[pid] = label;
  try { localStorage.setItem('rp:pseen', JSON.stringify(APP.partnerSeen)); } catch { /* private mode */ }
}

/* The portal refreshes itself when the partner comes back to the tab, so what
   they see is always current without a reload button. */
window.addEventListener('focus', () => {
  if ((APP.view === 'partner' || APP.view === 'partnerview') && Date.now() - lastPartnerRefresh > 15000) {
    loadPartner();
  }
});

/* ---------------- org modal ---------------- */
async function loadOrgData(tab) {
  APP.orgData = APP.orgData || { tab: tab || 'members' };
  if (tab) APP.orgData.tab = tab;
  const [members, invites, partners] = await Promise.all([
    repo.members(APP.orgId), repo.invites(APP.orgId), repo.orgPartners(APP.orgId)
  ]);
  Object.assign(APP.orgData, { members, invites, partners });
  render();
}

/* Ensure a guest link exists for the latest version, then return it. */
async function ensureShareLink(kind) {
  const latest = APP.versions.length ? APP.versions[APP.versions.length - 1] : null;
  if (!latest) return null;
  let share = (APP.shares || []).find((s) => s.kind === kind && s.version_seq === latest.seq && !s.revoked);
  if (!share) {
    const answers = assembleAnswers(APP.fields, APP.rows);
    await ensureSnapshot(latest.seq);
    const snapAns = APP.snapshots[latest.seq] ? (APP.snapshots[latest.seq].snapshot.answers || answers) : answers;
    const r = await repo.sharePut(APP.pid, kind, latest.seq,
      buildSharePayload(APP.project || {}, snapAns, latest.label, latest.seq, kind, latest.build,
        kind === 'brief' ? briefSecsSaved(APP.pid) : null));
    if (r.error || !r.data) return null;
    APP.shares = await repo.sharesFor(APP.pid);
    share = (APP.shares || []).find((s) => s.kind === kind && s.version_seq === latest.seq && !s.revoked);
  }
  if (!share) return null;
  return location.origin + location.pathname + '#' + (kind === 'brief' ? 'brief' : 'fb') + '/' + APP.pid + '/' + latest.seq + '/' + share.token;
}

/* The read-only presentation URL for this project's latest published brief.
   Managers publish one if none exists; viewers use whatever is already public. */
async function ensurePresentLink() {
  const latest = APP.versions.length ? APP.versions[APP.versions.length - 1] : null;
  if (!latest) return null;
  let share = (APP.shares || []).find((s) => s.kind === 'brief' && s.version_seq === latest.seq && !s.revoked);
  if (!share && APP.role === 'manager') {
    await ensureShareLink('brief');
    share = (APP.shares || []).find((s) => s.kind === 'brief' && s.version_seq === latest.seq && !s.revoked);
  }
  if (!share) return null;
  return presentUrl(APP.pid, latest.seq, share.token);
}

/* ---------------- event delegation ---------------- */
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (e.target.closest('[data-stop]') && !t) return;
  if (!t) return;
  // Any unexpected data shape (a null field on an externally-authored record,
  // say) must surface as a toast, never a silently dead button or a broken app.
  Promise.resolve(handleAction(t.dataset.action, t.dataset.id, t, e)).catch((err) => {
    console.error('action failed:', t.dataset.action, err);
    toast('Something went wrong with that action — please try again');
  });
});

async function handleAction(a, id, t, e) {
  switch (a) {
    /* chrome */
    case 'usermenu': APP.menuOpen = !APP.menuOpen; render(); break;
    case 'menuclose': APP.menuOpen = false; APP.wsMenuOpen = false; APP.wsCreating = false; render(); break;
    case 'modalback': if (e.target === t) { closeModals(); render(); } break;
    case 'modalclose': closeModals(); render(); break;
    case 'themeset': themeSet(t.dataset.val); render(); break;
    case 'themetoggle': themeSet(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); closeModals(); render(); break;
    case 'signout': await repo.signOut(); location.replace('/login/'); break;
    case 'retrysave': sync.retry(); break;
    case 'profileopen': APP.menuOpen = false; APP.profileOpen = true; render(); break;
    case 'profilesave': {
      const name = val('pfName').trim();
      await repo.saveDisplayName(APP.user.id, name);
      if (APP.ctx) APP.ctx.display_name = name;
      APP.profileOpen = false; toast('Profile saved'); render();
      if (sync.trackPresence) sync.trackPresence();
      break;
    }
    case 'orgswitch': {
      const m = (APP.ctx.memberships || []).find((x) => x.org_id === id);
      if (m) { APP.menuOpen = false; sync.unsubscribeProject(); await enterOrg(m); }
      break;
    }
    case 'orgopen': APP.menuOpen = false; APP.orgOpen = true; render(); loadOrgData(); break;
    case 'orgtab': loadOrgData(t.dataset.val); break;

    /* org admin */
    case 'invsend': {
      const email = val('invEmail').trim().toLowerCase(), role = val('invRole') || 'viewer';
      if (!email || !email.includes('@')) { toast('Enter a valid email'); break; }
      const r = await repo.invite(APP.orgId, email, role);
      if (r.error) { toast('Invite failed: ' + r.error.message); break; }
      repo.sendInviteEmail(email, role, APP.org, APP.user.email);
      toast('Invited ' + email);
      loadOrgData();
      break;
    }
    case 'invrevoke': await repo.revokeInvite(APP.orgId, id); loadOrgData(); break;
    case 'mremove': await repo.removeMember(APP.orgId, id); loadOrgData(); break;
    case 'paddnew': {
      const name = val('pName').trim(), email = val('pEmail').trim().toLowerCase();
      if (!email || !email.includes('@')) { toast('Enter a valid email'); break; }
      const r = await repo.addPartner(APP.orgId, email, name);
      if (r.error) { toast('Could not add partner'); break; }
      repo.sendInviteEmail(email, 'partner', APP.org, APP.user.email);
      loadOrgData('partners');
      break;
    }
    case 'premove': await repo.removePartner(id); loadOrgData('partners'); break;
    case 'paccess': {
      const pidp = t.dataset.pid;
      const partner = (APP.orgData.partners || []).find((p) => p.id === id);
      if (!partner) break;
      if (partner.acc[pidp]) await repo.revokePartner(id, pidp); else await repo.grantPartner(id, pidp);
      loadOrgData('partners');
      break;
    }

    /* dashboard */
    case 'new': {
      const name = val('newName').trim();
      if (!name) { toast('Name the product first'); break; }
      const idNew = uid();
      const r = await repo.createProject(APP.orgId, idNew, name);
      if (r.error) { toast('Could not create project'); break; }
      APP.projects.unshift({ id: idNew, org_id: APP.orgId, name, archived: false, disc_export: false, updated_at: new Date().toISOString() });
      openProject(idNew);
      break;
    }
    case 'open': e.stopPropagation(); openProject(t.dataset.id); break;
    case 'del': {
      e.stopPropagation();
      const p = APP.projects.find((x) => x.id === t.dataset.id);
      if (p) { APP.delPending = { id: p.id, name: p.name }; APP.delError = null; render(); }
      break;
    }
    case 'delcancel': APP.delPending = null; APP.delError = null; render(); break;
    case 'delconfirm': {
      const want = (APP.delPending && APP.delPending.name) || '';
      if (val('delCode').trim() !== want.trim()) { APP.delError = 'Type the exact project name to confirm'; render(); break; }
      const idDel = APP.delPending.id;
      APP.delPending = null;
      await repo.archiveProject(idDel);
      APP.projects = APP.projects.filter((x) => x.id !== idDel);
      if (APP.pid === idDel) goHome(); else render();
      break;
    }

    /* workspace chrome */
    case 'home': goHome(); break;
    case 'toggledoc': APP.docShow = !APP.docShow; render(); break;
    case 'secto': APP.openSecs[t.dataset.val] = APP.openSecs[t.dataset.val] === false; render(); break;
    case 'tab': {
      APP.docTab = t.dataset.val; APP.docShow = true;
      if (APP.docTab === 'activity') APP.activityLog = await repo.activity(APP.pid);
      if (APP.docTab === 'access') loadAccessData();
      if (APP.docTab === 'changes' || APP.docTab === 'document' || APP.docTab === 'summary') {
        const seq = APP.viewSeq != null ? APP.viewSeq : (APP.versions.length ? APP.versions[APP.versions.length - 1].seq : null);
        if (APP.docTab === 'changes' && seq != null) {
          const i = APP.versions.findIndex((v) => v.seq === seq);
          await ensureSnapshot(seq);
          if (i > 0) await ensureSnapshot(APP.versions[i - 1].seq);
        }
      }
      render();
      break;
    }
    case 'viewver': APP.viewSeq = +t.dataset.seq; APP.docTab = 'document'; await ensureSnapshot(APP.viewSeq); render(); break;
    case 'genopen': APP.genOpen = true; APP.gen = { major: false, note: '' }; render(); break;
    case 'genkind': APP.gen.major = t.dataset.val === 'major'; APP.gen.note = val('genNote'); render(); break;
    case 'genconfirm': APP.gen.note = val('genNote'); await generateVersion(); break;

    /* presentation mode */
    case 'present': APP.present = true; lastRevealedSec = null; render(); break;
    case 'presentclose': APP.present = false; render(); break;

    /* share hub */
    case 'shareopen': closeModals(); APP.shareOpen = true; render(); break;
    case 'shr-team': closeModals(); APP.orgOpen = true; render(); loadOrgData('members'); break;
    case 'shr-partner': closeModals(); APP.docTab = 'access'; render(); loadAccessData(); break;
    case 'shr-pilot': {
      const link = await ensureShareLink('pilot');
      closeModals();
      if (!link) { toast('Could not create the link — try again'); render(); break; }
      APP.docTab = 'access';
      render();
      loadAccessData();
      if (await copyText(link)) toast('Testing link copied — send it to your tester');
      break;
    }

    /* brief sharing goes through the section picker */
    case 'shr-brief': case 'briefpickopen': {
      if (APP.role !== 'manager' || !APP.versions.length) break;
      closeModals();
      const latest = APP.versions[APP.versions.length - 1];
      const live = (APP.shares || []).find((s) => s.kind === 'brief' && s.version_seq === latest.seq && !s.revoked);
      APP.briefPick = (live && Array.isArray(live.sections) && live.sections.length)
        ? live.sections.slice() : briefSecsSaved(APP.pid);
      APP.briefPickOpen = true;
      render();
      break;
    }
    case 'briefpicktoggle': {
      const k = t.dataset.val;
      APP.briefPick = APP.briefPick.includes(k)
        ? APP.briefPick.filter((x) => x !== k) : APP.briefPick.concat([k]);
      render();
      break;
    }
    case 'briefpickconfirm': {
      const latest = APP.versions[APP.versions.length - 1];
      if (!latest || !APP.briefPick.length) break;
      const secs = APP.briefPick.slice();
      await ensureSnapshot(latest.seq);
      const answers = APP.snapshots[latest.seq]
        ? (APP.snapshots[latest.seq].snapshot.answers || assembleAnswers(APP.fields, APP.rows))
        : assembleAnswers(APP.fields, APP.rows);
      const live = (APP.shares || []).find((s) => s.kind === 'brief' && s.version_seq === latest.seq && !s.revoked);
      const r = await repo.sharePut(APP.pid, 'brief', latest.seq,
        buildSharePayload(APP.project || {}, answers, latest.label, latest.seq, 'brief', latest.build, secs),
        live ? live.token : null);
      if (r.error || !r.data) { toast('Could not publish — try again'); break; }
      briefSecsStore(APP.pid, secs);
      APP.shares = await repo.sharesFor(APP.pid);
      closeModals();
      APP.docTab = 'access';
      render();
      loadAccessData();
      const link = location.origin + location.pathname + '#brief/' + APP.pid + '/' + latest.seq + '/' + r.data;
      if (await copyText(link)) toast('Review link copied — ' + secs.length + ' section' + (secs.length === 1 ? '' : 's') + ' shared');
      break;
    }

    /* workspace switcher */
    case 'wsmenu': closeModals(); APP.wsMenuOpen = true; render(); break;
    case 'wscreate': APP.wsCreating = true; render(); setTimeout(() => { const el = document.getElementById('wsName'); if (el) el.focus(); }, 30); break;
    case 'wscreatego': {
      const name = val('wsName').trim();
      if (!name) { toast('Name the workspace first'); break; }
      const r = await repo.createOrg(name);
      if (r.error) { toast('Could not create workspace'); break; }
      closeModals();
      APP.ctx = await repo.context();
      const m = (APP.ctx.memberships || []).find((x) => x.org_name === name) || (APP.ctx.memberships || [])[0];
      if (m) { sync.unsubscribeProject(); await enterOrg(m); toast('Workspace created — you are its first manager'); }
      break;
    }
    case 'shr-request': case 'accnewreq': closeModals(); APP.docTab = 'notes'; APP.reqDraft = { open: true }; render(); break;

    /* PRD brand logo (manager) */
    case 'brandpick': { const el = document.getElementById('brandFile'); if (el) el.click(); break; }
    case 'brandremove': {
      const r = await repo.setBrand(APP.pid, '', '');
      if (r.error) { toast('Could not remove the logo'); break; }
      if (APP.project) { APP.project.brand_logo = ''; APP.project.brand_label = ''; }
      await republishBrandedBriefs();
      toast('Logo removed');
      render();
      break;
    }
    case 'brandlabelsave': {
      const label = val('brandLabel').trim();
      const r = await repo.setBrand(APP.pid, (APP.project && APP.project.brand_logo) || '', label);
      if (r.error) { toast('Could not save'); break; }
      if (APP.project) APP.project.brand_label = label;
      await republishBrandedBriefs();
      toast('Saved');
      render();
      break;
    }

    /* read-only presentation link — copy handlers per role */
    case 'copypresent': {   // manager or viewer, from the app
      const link = await ensurePresentLink();
      if (!link) { toast(APP.role === 'manager' ? 'Generate a version first' : 'No public link yet — ask a manager to share this PRD'); break; }
      if (await copyText(link)) toast('Read-only link copied — anyone with it can view, not edit');
      break;
    }
    case 'smepresent': {   // SME, from their brief page — reuse their own token
      const rt = APP.shareRoute;
      if (!rt || !rt.pid) { toast('Link unavailable'); break; }
      const link = presentUrl(rt.pid, rt.seq, rt.token);
      if (await copyText(link)) toast('Read-only link copied — share it with anyone');
      break;
    }
    case 'ppresent': {   // partner, from the portal
      const r = await repo.partnerPresentToken(t.dataset.id);
      const out = r.data;
      if (!out || !out.ok) { toast('No shareable link yet — the team has not published a brief'); break; }
      const link = presentUrl(t.dataset.id, out.seq, out.token);
      if (await copyText(link)) toast('Read-only link copied — share it with anyone');
      break;
    }

    /* print from an SME / partner / presentation page — uses the branded payload */
    case 'brandprint': {
      const pay = (APP.share && APP.share.payload) ||
        (APP.partnerProjects || []).find((x) => x.project_id === APP.partnerPid)?.payload;
      if (!pay) { toast('Nothing to print yet'); break; }
      const { bBrief } = await import('./domain.js');
      printDoc(bBrief(pay.answers || {}), {
        product: pay.product || 'Requirements', label: pay.label || '', status: 'approved',
        org: '', approvals: [], logo: pay.logo || '', brandLabel: pay.brandLabel || ''
      });
      break;
    }

    /* access hub: partners on this project */
    case 'accgrant': {
      if (APP.role !== 'manager') break;
      const had = t.dataset.has === '1';
      const r = had ? await repo.revokePartner(id, APP.pid) : await repo.grantPartner(id, APP.pid);
      if (r.error) { toast('Could not update access'); break; }
      toast(had ? 'Access revoked' : 'Access granted — they see the latest published brief');
      loadAccessData();
      break;
    }
    case 'accpadd': {
      const name = val('accPName').trim(), email = val('accPEmail').trim().toLowerCase();
      if (!email || !email.includes('@')) { toast('Enter a valid email'); break; }
      const r = await repo.addPartner(APP.orgId, email, name);
      if (r.error || !r.data) { toast('Could not add partner'); break; }
      await repo.grantPartner(r.data.id, APP.pid);
      repo.sendInviteEmail(email, 'partner', APP.org, APP.user.email);
      toast('Partner added with access to this project');
      loadAccessData();
      break;
    }

    /* palette */
    case 'palette': openPalette(); break;
    case 'palclose': if (e.target === t) { APP.palOpen = false; render(); } break;
    case 'palgo': execPalette(+t.dataset.ix); break;
    case 'palnew': APP.palOpen = false; APP.view = 'projects'; render(); setTimeout(() => { const el = document.getElementById('newName'); if (el) el.focus(); }, 50); break;

    /* worksheet */
    case 'choice': {
      if (APP.role !== 'manager') break;
      const q = t.dataset.qid;
      const cur = APP.fields[q] && APP.fields[q].value;
      sync.editField(q, cur === t.dataset.val ? '' : t.dataset.val);
      sync.flushNow();
      APP.activeQid = q;
      render();
      revealActiveSection(true);
      break;
    }
    case 'addrow': {
      if (APP.role !== 'manager') break;
      await sync.addRow(t.dataset.qid, {});
      break;
    }
    case 'delrow': {
      if (APP.role !== 'manager') break;
      await sync.removeRow(t.dataset.qid, t.dataset.rowid);
      break;
    }
    case 'suggestfit': {
      const rows = APP.rows[t.dataset.qid] || [];
      const row = rows.find((r) => r.id === t.dataset.rowid);
      if (row && row.data.stmt) { sync.editRow(t.dataset.qid, row.id, { fit: suggestFit(row.data.stmt) }); sync.flushNow(); render(); }
      break;
    }

    /* exports */
    case 'copymd': { const d = docNow(); if (await copyMarkdown(d.md)) toast('Markdown copied'); break; }
    case 'downloadmd': { const d = docNow(); downloadMarkdown(d.md, docMeta(d)); break; }
    case 'word': { const d = docNow(); downloadWord(d.md, docMeta(d)); break; }
    case 'print': { const d = docNow(); printDoc(d.md, docMeta(d)); break; }
    case 'execdl': {
      const a = APP.viewSeq != null && APP.snapshots[APP.viewSeq] ? (APP.snapshots[APP.viewSeq].snapshot.answers || {}) : assembleAnswers(APP.fields, APP.rows);
      downloadExecSummary(a, { label: docNow().label });
      break;
    }

    /* inbox / comms */
    case 'commtoggle': {
      APP.openComms[id] = !APP.openComms[id];
      const comm = APP.comms.find((c) => c.id === id);
      if (APP.openComms[id] && comm && !APP.reads[id]) {
        APP.reads[id] = true;
        repo.markRead(APP.user.id, id);
      }
      render();
      break;
    }
    case 'ibreadall': {
      APP.comms.forEach((c) => {
        if (!APP.reads[c.id]) { APP.reads[c.id] = true; repo.markRead(APP.user.id, c.id); }
      });
      render();
      break;
    }
    case 'ibsrc': APP.inboxFilter.src = t.dataset.val; render(); break;
    case 'ibstatus': APP.inboxFilter.status = t.dataset.val; render(); break;
    case 'reply': {
      const body = (APP.drafts[id] || '').trim();
      if (!body) break;
      const r = await repo.addMessage(APP.orgId, 'comm', id, body, (APP.ctx && APP.ctx.display_name) || 'Team', APP.user.id);
      if (r.error) { toast('Reply failed — try again'); break; }
      delete APP.drafts[id];
      (APP.msgs[id] = APP.msgs[id] || []).push(r.data);
      render();
      break;
    }
    case 'commstatus': break; // handled on change event
    case 'promdisc': {
      const c = APP.comms.find((x) => x.id === id);
      if (!c) break;
      const cbody = c.body || '';
      await repo.addDiscovery({
        org_id: APP.orgId, project_id: APP.pid, takeaway: c.title || cbody.slice(0, 120) || '(no text)',
        notes: cbody, who: c.author_name, source: 'Promoted from ' + c.origin, author_name: (APP.ctx && APP.ctx.display_name) || ''
      });
      await repo.setCommFields(id, { promoted_to: 'discovery' });
      c.promoted_to = 'discovery';
      toast('Added to discovery');
      render();
      break;
    }
    case 'promreq': {
      const c = APP.comms.find((x) => x.id === id);
      if (!c) break;
      const row = await sync.addRow('fr', { stmt: (c.body || c.title || '').slice(0, 500), fit: '', pri: 'Should', comp: '' });
      if (row) {
        const rid = 'FR-' + String(row.k).padStart(3, '0');
        await repo.setCommFields(id, { promoted_to: rid });
        c.promoted_to = rid;
        toast('Created ' + rid + ' — refine it in Section 7');
        render();
      }
      break;
    }

    /* feedback tab */
    case 'copylink': if (await copyText(t.dataset.link)) toast('Link copied'); break;
    case 'sharepub': {
      const kind = t.dataset.kind, seq = +t.dataset.seq;
      const answers = assembleAnswers(APP.fields, APP.rows);
      const v = APP.versions.find((x) => x.seq === seq);
      await ensureSnapshot(seq);
      const snapAns = APP.snapshots[seq] ? (APP.snapshots[seq].snapshot.answers || answers) : answers;
      const r = await repo.sharePut(APP.pid, kind, seq, buildSharePayload(APP.project || {}, snapAns, v ? v.label : '', seq, kind, v ? v.build : ''));
      if (r.error || !r.data) { toast('Could not create link'); break; }
      APP.shares = await repo.sharesFor(APP.pid);
      toast('Link created');
      render();
      break;
    }
    case 'sharerevoke': {
      await repo.shareRevoke(t.dataset.token);
      APP.shares = await repo.sharesFor(APP.pid);
      toast('Link revoked');
      render();
      break;
    }

    /* notes & requests */
    case 'noteadd': {
      const body = (APP.noteDraft || '').trim();
      if (!body) break;
      const origin = APP.noteSrc;
      const r = await repo.addComm({
        org_id: APP.orgId, project_id: APP.pid, origin,
        author_name: origin === 'team' ? ((APP.ctx && APP.ctx.display_name) || 'Team') : (APP.noteBy || (origin === 'sme' ? 'SME' : 'Meeting')),
        author_user: APP.user.id, title: origin === 'team' ? 'Note' : origin === 'sme' ? 'SME note' : 'Meeting note',
        body, status: 'new'
      });
      if (r.error) { toast('Could not save note'); break; }
      if (!APP.comms.some((c) => c.id === r.data.id)) APP.comms.unshift(r.data);
      APP.noteDraft = '';
      render();
      break;
    }
    case 'notesrc': APP.noteSrc = t.dataset.val; render(); break;
    case 'nropen': APP.reqDraft = { open: true }; render(); break;
    case 'nrcancel': APP.reqDraft = {}; render(); break;
    case 'nrtpl': {
      const NRTPL = [
        'Before we spec this, what are the must-haves, the non-negotiables, and the landmines you have seen in your domain?',
        'Please review the summary and tell us what is missing, what is wrong, and what you would add.',
        'What edge cases, risks, or failure modes should the requirements be sure to cover?'];
      APP.reqDraft.prompt = NRTPL[+t.dataset.ix] || '';
      render();
      break;
    }
    case 'nrsave': {
      const d = APP.reqDraft;
      if (!d.title || !d.title.trim()) { d.error = 'Add a title'; render(); break; }
      const r = await repo.addRequest({
        org_id: APP.orgId, project_id: APP.pid, title: d.title.trim(),
        prompt: (d.prompt || '').trim(), author_name: (APP.ctx && APP.ctx.display_name) || '',
        due: d.due || null
      });
      if (r.error) { d.error = 'Could not create'; render(); break; }
      if (!APP.requests.some((x) => x.id === r.data.id)) APP.requests.unshift(r.data);
      APP.reqDraft = {};
      toast('Request created — copy its link below');
      render();
      break;
    }
    case 'nrclose': {
      const req = APP.requests.find((x) => x.id === id);
      if (!req) break;
      const status = req.status === 'closed' ? 'open' : 'closed';
      await repo.setRequestStatus(id, status);
      req.status = status;
      render();
      break;
    }
    case 'nrdelete': {
      if (APP.reqDel !== id) { APP.reqDel = id; render(); break; }
      await repo.deleteRequest(id);
      APP.requests = APP.requests.filter((x) => x.id !== id);
      APP.reqDel = null;
      render();
      break;
    }

    /* discovery */
    case 'discadd': {
      const d = APP.discDraft;
      if (!d.takeaway || !d.takeaway.trim()) { toast('Add the takeaway first'); break; }
      const r = await repo.addDiscovery({
        org_id: APP.orgId, project_id: APP.pid, takeaway: d.takeaway.trim(),
        notes: (d.notes || '').trim(), who: (d.who || '').trim(), source: (d.source || '').trim(),
        tags: (d.tags || '').trim(), author_name: (APP.ctx && APP.ctx.display_name) || ''
      });
      if (r.error) { toast('Could not add entry'); break; }
      if (!APP.discovery.some((x) => x.id === r.data.id)) APP.discovery.unshift(r.data);
      APP.discDraft = {};
      render();
      break;
    }
    case 'disctoggle': APP.openDisc[id] = !APP.openDisc[id]; render(); break;
    case 'discdel': {
      if (APP.discDel !== id) { APP.discDel = id; render(); break; }
      await repo.deleteDiscovery(id);
      APP.discovery = APP.discovery.filter((x) => x.id !== id);
      APP.discDel = null;
      render();
      break;
    }
    case 'peoplejump': APP.docTab = 'inbox'; APP.inboxFilter = { src: 'all', status: 'all', q: t.dataset.q }; render(); break;

    /* versions & approvals */
    case 'cardapprove': {
      // One-click Approve from the dashboard card. Drives the latest version all
      // the way to Approved, stepping through In review as needed, so a manager
      // never has to open Version history just to clear "Draft".
      e.stopPropagation();
      const s = APP.projectStats && APP.projectStats[id];
      const v = s && s.latest;
      if (!v || !v.id) { toast('Generate a version first, then approve it'); break; }
      const path = ({ draft: ['in_review', 'approved'], changes_requested: ['in_review', 'approved'], in_review: ['approved'] })[v.status] || [];
      if (!path.length) break;
      for (const next of path) {
        const rr = await repo.setVersionStatus(v.id, next);
        const out = rr && rr.data;
        if (!(out && out.ok)) {
          toast(out && out.error === 'approvals_pending'
            ? 'Named approvers are still pending — open the PRD’s Version history to decide them'
            : 'Could not approve this version');
          break;
        }
        v.status = next;
      }
      if (v.status === 'approved') toast('Approved — v' + v.label + ' is now the approved baseline');
      scheduleRender('stats');
      break;
    }
    case 'vstatus': {
      const r = await repo.setVersionStatus(id, t.dataset.val);
      const out = r.data;
      if (out && out.ok) {
        const v = APP.versions.find((x) => x.id === id);
        if (v) v.status = t.dataset.val;
        toast('Status updated');
      } else toast(out && out.error === 'approvals_pending' ? 'Approvals are still pending — decide them first' : 'Could not change status');
      render();
      break;
    }
    case 'appradd': {
      const role = val('apr-role-' + id).trim(), name = val('apr-name-' + id).trim();
      if (!role && !name) { toast('Name the approver or role'); break; }
      const r = await repo.addApprover(id, role, name);
      if (!r.error && r.data) { /* realtime will sync; also apply locally */ }
      const list = await repo.approvals([id]);
      APP.approvals[id] = list[id] || [];
      render();
      break;
    }
    case 'apprdecide': {
      await repo.decideApproval(id, t.dataset.val, '');
      for (const vid of Object.keys(APP.approvals)) {
        const ap = APP.approvals[vid].find((x) => x.id === id);
        if (ap) ap.status = t.dataset.val;
      }
      render();
      break;
    }
    case 'apprdel': {
      await repo.removeApprover(id);
      for (const vid of Object.keys(APP.approvals)) {
        APP.approvals[vid] = APP.approvals[vid].filter((x) => x.id !== id);
      }
      render();
      break;
    }

    /* SME share pages */
    case 'shareset': APP.shareForm[t.dataset.key] = APP.shareForm[t.dataset.key] === t.dataset.val ? '' : t.dataset.val; render(); break;
    case 'sharesubmit': await submitShare(); break;
    case 'shareagain': APP.shareForm = { submitted: false }; render(); break;
    case 'smereply': {
      const el = document.getElementById('smeReplyBody');
      const body = el ? el.value.trim() : '';
      if (!body || !APP.smeReplyToken) break;
      const r = await repo.smeReply(APP.smeReplyToken, body);
      if (r.data === true) { await loadSmeThread(); render(); }
      else toast('Could not send');
      break;
    }

    /* partner */
    case 'popen': APP.partnerPid = t.dataset.id; APP.view = 'partnerview'; pseenMark(t.dataset.id); render(); break;
    case 'phome': APP.view = 'partner'; render(); loadPartner(); break;
    case 'pprofopen': closeModals(); APP.pprofOpen = true; render(); break;
    case 'pprofsave': {
      const name = val('ppName').trim(), title = val('ppTitle').trim(), company = val('ppCompany').trim();
      const r = await repo.partnerUpdateProfile(name, title, company);
      if (r.error || r.data !== true) { toast('Could not save profile'); break; }
      if (APP.ctx && APP.ctx.partner) Object.assign(APP.ctx.partner, { name, title, company });
      APP.pprofOpen = false;
      toast('Profile saved');
      render();
      break;
    }
    case 'ppost': {
      const el = document.getElementById('pPostBody');
      const body = el ? el.value.trim() : '';
      if (!body) break;
      const r = await repo.partnerPost(t.dataset.id, body);
      if (r.data === true) { toast('Sent to the team'); await loadPartner(); if (APP.view === 'partnerview') render(); }
      else toast('Could not send');
      break;
    }
    case 'preply': {
      const ta = document.querySelector('[data-preplydraft="' + CSS.escape(id) + '"]');
      const body = ta ? ta.value.trim() : '';
      if (!body) break;
      const r = await repo.partnerReply(id, body);
      if (r.data === true) { await loadPartner(); render(); } else toast('Could not send');
      break;
    }

    /* no-org */
    case 'createorg': {
      APP.authBusy = true; APP.authError = null; render();
      const r = await repo.createOrg(val('woName').trim() || 'My workspace');
      APP.authBusy = false;
      if (r.error) { APP.authError = 'Could not create workspace: ' + r.error.message; render(); break; }
      APP.ctx = await repo.context();
      const m = (APP.ctx.memberships || [])[0];
      if (m) await enterOrg(m); else { APP.view = 'noorg'; render(); }
      break;
    }
    default:
  }
}

/* change events (selects) */
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('[data-action="commstatus"]')) {
    const id = t.dataset.id;
    await repo.setCommStatus(id, t.value);
    const c = APP.comms.find((x) => x.id === id);
    if (c) c.status = t.value;
    render();
  } else if (t.matches('[data-action="versionsel"]')) {
    APP.viewSeq = t.value === '' ? null : +t.value;
    if (APP.viewSeq != null) await ensureSnapshot(APP.viewSeq);
    render();
  } else if (t.matches('[data-action="fbverfilter"]')) {
    APP.fbSeq = t.value === 'all' ? 'all' : +t.value;
    render();
  } else if (t.matches('[data-action="mrole"]')) {
    await repo.setMemberRole(APP.orgId, t.dataset.id, t.value);
    loadOrgData();
  } else if (t.matches('[data-action="discexport"]')) {
    await repo.setDiscExport(APP.pid, t.checked);
    if (APP.project) APP.project.disc_export = t.checked;
  } else if (t.id === 'brandFile') {
    const file = t.files && t.files[0];
    t.value = '';
    if (!file) return;
    toast('Processing logo…');
    let logo;
    try { logo = await downscaleLogo(file); }
    catch { toast('That image could not be read — try a PNG, JPG, or SVG'); return; }
    if (!logo) { toast('That image is too large even after resizing — try a simpler logo'); return; }
    const r = await repo.setBrand(APP.pid, logo, (APP.project && APP.project.brand_label) || '');
    if (r.error) { toast(/violates|constraint/i.test(r.error.message || '') ? 'That logo is too large' : 'Could not save the logo'); return; }
    if (APP.project) APP.project.brand_logo = logo;
    await republishBrandedBriefs();
    toast('Logo added — it now appears on the shared PRD and exports');
    render();
  } else if (t.matches('[data-action="buildset"]')) {
    const verId = t.dataset.verid;
    const r = await repo.setBuild(verId, t.value.trim());
    if (r.error) toast('Could not save build tag');
    else {
      const v = APP.versions.find((x) => x.id === verId);
      if (v) v.build = t.value.trim();
      toast('Build tag saved');
    }
  } else if (t.matches('select[data-rowfield]')) {
    sync.editRow(t.dataset.rowfield, t.dataset.rowid, { [t.dataset.colkey]: t.value });
    sync.flushNow();
    deferredRender();
  }
});

/* input events (typing) — save without re-rendering the worksheet; the
   document pane follows the keystrokes live */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-field]')) { sync.editField(t.dataset.field, t.value); APP.activeQid = t.dataset.field; patchDocPane(); }
  else if (t.matches('input[data-rowfield], textarea[data-rowfield]')) { sync.editRow(t.dataset.rowfield, t.dataset.rowid, { [t.dataset.colkey]: t.value }); APP.activeQid = t.dataset.rowfield; patchDocPane(); }
  else if (t.matches('[data-draft]')) APP.drafts[t.dataset.draft] = t.value;
  else if (t.matches('[data-ibsearch]')) { APP.inboxFilter.q = t.value; deferredRender(); }
  else if (t.matches('[data-discsearch]')) { APP.discQ = t.value; deferredRender(); }
  else if (t.matches('[data-notedraft]')) APP.noteDraft = t.value;
  else if (t.matches('[data-noteby]')) APP.noteBy = t.value;
  else if (t.matches('[data-nr]')) APP.reqDraft[t.dataset.nr] = t.value;
  else if (t.matches('[data-disc]')) APP.discDraft[t.dataset.disc] = t.value;
  else if (t.matches('[data-share]')) APP.shareForm[t.dataset.share] = t.value;
  else if (t.id === 'palInput') { APP.palQ = t.value; APP.palSel = 0; repaintPalette(); }
});

/* focus tracking → presence + render deferral */
document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (t.matches('[data-field]')) {
    sync.setActiveField(t.dataset.field);
    APP.activeQid = t.dataset.field;
    revealActiveSection(true);
  } else if (t.matches('[data-rowfield]')) {
    sync.setActiveField('row:' + t.dataset.rowid + ':' + t.dataset.colkey);
    APP.activeQid = t.dataset.rowfield;
    revealActiveSection(true);
  }
});
document.addEventListener('focusout', (e) => {
  const t = e.target;
  if (t.matches('[data-field],[data-rowfield]')) {
    sync.setActiveField(null);
    sync.flushNow();
    deferredRender();
  }
});

/* keyboard */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  // Cmd/Ctrl+Enter sends the message you are writing, wherever you are.
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    const t = e.target;
    let btn = null;
    if (t.matches && t.matches('[data-draft]')) btn = document.querySelector('[data-action="reply"][data-id="' + CSS.escape(t.dataset.draft) + '"]');
    else if (t.id === 'pPostBody') btn = document.querySelector('[data-action="ppost"]');
    else if (t.matches && t.matches('[data-preplydraft]')) btn = document.querySelector('[data-action="preply"][data-id="' + CSS.escape(t.dataset.preplydraft) + '"]');
    else if (t.matches && t.matches('[data-notedraft]')) btn = document.querySelector('[data-action="noteadd"]');
    else if (t.id === 'smeReplyBody') btn = document.querySelector('[data-action="smereply"]');
    if (btn) { e.preventDefault(); btn.click(); }
    return;
  }
  if (e.key === 'Escape') {
    if (APP.present) { APP.present = false; render(); return; }
    if (APP.palOpen || APP.menuOpen || APP.profileOpen || APP.orgOpen || APP.genOpen || APP.delPending || APP.shareOpen) {
      closeModals(); render();
    }
    return;
  }
  if (APP.palOpen) {
    const items = paletteItems(APP);
    if (e.key === 'ArrowDown') { e.preventDefault(); APP.palSel = Math.min((APP.palSel || 0) + 1, items.length - 1); repaintPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); APP.palSel = Math.max((APP.palSel || 0) - 1, 0); repaintPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); execPalette(APP.palSel || 0); }
  }
});

function closeModals() {
  APP.palOpen = false; APP.menuOpen = false; APP.profileOpen = false;
  APP.orgOpen = false; APP.genOpen = false; APP.delPending = null; APP.delError = null;
  APP.shareOpen = false; APP.pprofOpen = false;
  APP.wsMenuOpen = false; APP.wsCreating = false; APP.briefPickOpen = false;
}

/* Per-project memory of which brief sections the team last shared. */
function briefSecsSaved(pid) {
  try {
    const v = JSON.parse(localStorage.getItem('rp:briefsecs:' + pid) || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch { /* fall through */ }
  return defaultBriefSections();
}
function briefSecsStore(pid, secs) {
  try { localStorage.setItem('rp:briefsecs:' + pid, JSON.stringify(secs)); } catch { /* private mode */ }
}
function openPalette() {
  closeModals(); APP.palOpen = true; APP.palQ = ''; APP.palSel = 0; render();
  setTimeout(() => { const el = document.getElementById('palInput'); if (el) el.focus(); }, 30);
}
function repaintPalette() {
  // Palette repaint keeps the input's focus by only replacing the list.
  const back = document.querySelector('.pal-list');
  if (!back) { render(); return; }
  const items = paletteItems(APP);
  const sel = Math.min(APP.palSel || 0, Math.max(items.length - 1, 0));
  back.innerHTML = items.length ? items.map((it, i) =>
    '<button class="pal-item' + (i === sel ? ' on' : '') + '" data-action="palgo" data-ix="' + i + '">' + ico(it.ico || IC.fwd, 'i-sm') +
    '<span>' + esc(it.label) + '</span><span class="k">' + esc(it.hint || '') + '</span></button>').join('')
    : '<div style="padding:18px;text-align:center;color:var(--ink-4);font-size:13px">No matches.</div>';
}
async function execPalette(ix) {
  const items = paletteItems(APP);
  const it = items[ix];
  if (!it) return;
  APP.palOpen = false;
  if (it.action === 'open') { openProject(it.id); return; }
  if (it.action === 'tab') { APP.docTab = it.id; render(); return; }
  render();
  const btn = document.createElement('button');
  btn.dataset.action = it.action;
  document.body.appendChild(btn); btn.click(); btn.remove();
}

/* current doc + meta for exports */
function docNow() {
  return currentDocMd(APP, assembleAnswers(APP.fields, APP.rows));
}
function docMeta(d) {
  const a = APP.viewSeq != null && APP.snapshots[APP.viewSeq] ? (APP.snapshots[APP.viewSeq].snapshot.answers || {}) : assembleAnswers(APP.fields, APP.rows);
  const v = APP.viewSeq != null ? APP.versions.find((x) => x.seq === APP.viewSeq) : APP.versions[APP.versions.length - 1];
  return {
    product: a.ctrl_product || (APP.project && APP.project.name) || 'Untitled',
    org: a.ctrl_org || '', label: d.label || '', status: v ? v.status : 'draft',
    approvals: v ? (APP.approvals[v.id] || []) : [],
    logo: (APP.project && APP.project.brand_logo) || '',
    brandLabel: (APP.project && APP.project.brand_label) || ''
  };
}

/* Downscale any uploaded image to a print-safe logo (max 320px, PNG data URL)
   entirely in the browser — no upload service, no new storage bucket. */
function downscaleLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('not an image')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('too large')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const src = reader.result;
      // SVGs are already vector and tiny; keep as-is if small enough.
      if (file.type === 'image/svg+xml') { resolve(String(src).length < 400000 ? src : null); return; }
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let out = c.toDataURL('image/png');
        if (out.length > 550000) out = c.toDataURL('image/jpeg', 0.85);  // photos: fall back to JPEG
        resolve(out.length <= 590000 ? out : null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/* After the brand changes, re-publish live brief shares so external viewers
   (SMEs, partners) pick up the new logo without the team re-sharing. */
async function republishBrandedBriefs() {
  const live = (APP.shares || []).filter((s) => s.kind === 'brief' && !s.revoked);
  for (const s of live) {
    await ensureSnapshot(s.version_seq);
    const answers = APP.snapshots[s.version_seq] ? (APP.snapshots[s.version_seq].snapshot.answers || {}) : assembleAnswers(APP.fields, APP.rows);
    const v = APP.versions.find((x) => x.seq === s.version_seq);
    await repo.sharePut(APP.pid, 'brief', s.version_seq,
      buildSharePayload(APP.project || {}, answers, v ? v.label : '', s.version_seq, 'brief', v ? v.build : '',
        Array.isArray(s.sections) && s.sections.length ? s.sections : briefSecsSaved(APP.pid)),
      s.token);
  }
  APP.shares = await repo.sharesFor(APP.pid);
}

/* hash routing (SME links opened while the app is loaded) */
window.addEventListener('hashchange', () => {
  const r = parseHash();
  if (r) routeShare(r);
});

boot();
