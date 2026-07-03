/* ============================================================================
   ReqPub v2 — member views: shell, dashboard, workspace (worksheet + live doc)
   Views are pure functions of APP state; main.js owns events via data-action.
   ============================================================================ */

import { esc, escA, ico, IC, brandmark, initials, relTime, themeGet } from './core.js';
import { SECTIONS, qBySec, visQ, isAnswered, assembleAnswers, buildSections, assemble, mdToHtml, reqDiff, BRIEF_SECTIONS } from './domain.js';
import { renderTab, unreadCount } from './views-collab.js';
import { execSummaryHTML } from './exports.js';

export const STATUS_LABEL = { draft: 'Draft', in_review: 'In review', approved: 'Approved', changes_requested: 'Changes requested' };

/* ---------------- chrome ---------------- */
export const shell = (inner, APP) =>
  '<div class="app">' + inner + '</div><div id="toast-slot" aria-live="polite" aria-atomic="true"></div>' + overlays(APP);

export function userMenu(APP) {
  const name = (APP.ctx && APP.ctx.display_name) || (APP.user && APP.user.email) || 'U';
  return '<button class="umbtn" data-action="usermenu" title="Account"><span class="umav">' + esc(initials(name)) +
    '</span><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>';
}

export function saveChip(APP) {
  const s = APP.saveState || 'idle';
  if (s === 'idle') return '';
  const map = {
    saving: '<span class="spin"></span>Saving…',
    saved: ico(IC.check, 'i-sm') + 'Saved',
    offline: 'Offline — will retry',
    error: 'Save failed — Retry'
  };
  return '<button class="savechip ' + s + '"' + (s === 'error' ? ' data-action="retrysave"' : ' disabled') +
    ' title="Every edit is saved to the shared workspace">' + map[s] + '</button>';
}

export function presenceBar(APP) {
  const ps = APP.presence || [];
  if (!ps.length) return '';
  const cls = ['', '', 'p2', 'p3', 'p4', 'p5'];
  const avs = ps.slice(0, 5).map((p, i) =>
    '<span class="pav ' + (cls[i + 1] || '') + '" title="' + escA(p.n + (p.f ? ' — editing' : ' — viewing')) + '">' + esc(initials(p.n)) + '</span>').join('');
  const more = ps.length > 5 ? '<span class="pav" title="' + ps.length + ' people here">+' + (ps.length - 5) + '</span>' : '';
  return '<div class="pres" title="Also in this project now">' + avs + more + '</div>';
}

function themeRow() {
  const cur = themeGet();
  const opt = (v, label) => '<button class="chip chip-sm' + (cur === v ? ' on' : '') + '" data-action="themeset" data-val="' + v + '">' + label + '</button>';
  return '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px"><span class="eyebrow" style="font-size:9px">Theme</span><div class="choice">' + opt('light', 'Light') + opt('dark', 'Dark') + opt('system', 'Auto') + '</div></div>';
}

export function overlays(APP) {
  let out = '';
  if (APP.menuOpen) {
    const name = (APP.ctx && APP.ctx.display_name) || '';
    const email = (APP.user && APP.user.email) || '';
    const orgs = (APP.ctx && APP.ctx.memberships) || [];
    const orgRows = orgs.length > 1 ? orgs.map((m) =>
      '<button class="umitem" data-action="orgswitch" data-id="' + escA(m.org_id) + '">' + ico(IC.layers) +
      esc(m.org_name) + (m.org_id === APP.orgId ? '<span class="umrole" style="margin-left:auto">current</span>' : '') + '</button>').join('') + '<div class="umsep"></div>' : '';
    out += '<div class="umback" data-action="menuclose"></div><div class="umpop">' +
      '<div class="umhead"><span class="umav lg">' + esc(initials(name || email)) + '</span><div style="min-width:0">' +
      '<div class="umname">' + esc(name || 'Set your name') + '</div><div class="umsub">' + esc(email) + '</div>' +
      '<span class="umrole" style="margin-top:5px">' + esc(APP.role === 'manager' ? 'Manager' : APP.role === 'viewer' ? 'Viewer' : 'Partner') + '</span></div></div>' +
      '<div class="umsep"></div>' + orgRows +
      '<button class="umitem" data-action="profileopen">' + ico(IC.user) + 'Profile &amp; display name</button>' +
      (APP.role === 'manager' ? '<button class="umitem" data-action="orgopen">' + ico(IC.users) + 'Organization &amp; people</button>' : '') +
      '<button class="umitem" data-action="palette">' + ico(IC.search) + 'Command palette<span class="k" style="margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">⌘K</span></button>' +
      themeRow() +
      '<div class="umsep"></div><button class="umitem danger" data-action="signout">' + ico(IC.signout) + 'Sign out</button></div>';
  }
  if (APP.wsMenuOpen) out += wsMenu(APP);
  if (APP.profileOpen) out += profileModal(APP);
  if (APP.orgOpen) out += orgModal(APP);
  if (APP.genOpen) out += generateModal(APP);
  if (APP.palOpen) out += palette(APP);
  if (APP.delPending) out += deleteModal(APP);
  if (APP.shareOpen) out += shareModal(APP);
  if (APP.briefPickOpen) out += briefPicker(APP);
  return out;
}

/* Workspace switcher: one email, many workspaces, one obvious place to move
   between them, create another, or open settings. */
function wsMenu(APP) {
  const orgs = (APP.ctx && APP.ctx.memberships) || [];
  const rows = orgs.map((m) =>
    '<button class="umitem" data-action="orgswitch" data-id="' + escA(m.org_id) + '">' +
    '<span class="acctdot">' + esc((m.org_name || 'W').charAt(0).toUpperCase()) + '</span>' +
    '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.org_name) + '</span>' +
    (m.org_id === APP.orgId ? ico(IC.check, 'i-sm') : '<span class="umrole">' + esc(m.role) + '</span>') + '</button>').join('');
  const create = APP.wsCreating
    ? '<div style="display:flex;gap:6px;padding:10px 16px"><input class="input" id="wsName" placeholder="New workspace name" style="height:34px;font-size:12.5px;flex:1">' +
      '<button class="btn btn-primary btn-sm" data-action="wscreatego">Create</button></div>'
    : '<button class="umitem" data-action="wscreate">' + ico(IC.plus) + 'Create a new workspace…</button>';
  return '<div class="umback" data-action="menuclose"></div><div class="umpop left" role="menu" aria-label="Workspaces">' +
    '<div style="padding:12px 16px 6px" class="eyebrow">Your workspaces</div>' + rows +
    '<div class="umsep"></div>' +
    (APP.role === 'manager' ? '<button class="umitem" data-action="orgopen">' + ico(IC.users) + 'Workspace settings &amp; invites</button>' : '') +
    create + '</div>';
}

/* Section picker for review briefs: preselected defaults, adjustable, and the
   choice is remembered per project. Filtering happens at payload build. */
function briefPicker(APP) {
  const picked = APP.briefPick || [];
  const latest = APP.versions.length ? APP.versions[APP.versions.length - 1] : null;
  const chips = BRIEF_SECTIONS.map((s) =>
    '<button class="chip' + (picked.includes(s.key) ? ' on' : '') + '" data-action="briefpicktoggle" data-val="' + s.key + '" style="height:36px;font-size:13px">' + esc(s.label) + '</button>').join('');
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3>What should reviewers see?</h3><button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div class="hint" style="margin-top:4px">The link shares only the sections you pick' + (latest ? ' from v' + esc(latest.label) : '') + '. Unselected content is left out of the share entirely, not hidden. Fit criteria, schedules, and internal notes are never included.</div>' +
    '<div class="fldlabel">Sections</div><div class="choice">' + chips + '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:18px">' +
    '<span class="hint">' + picked.length + ' of ' + BRIEF_SECTIONS.length + ' selected</span>' +
    '<div style="display:flex;gap:8px"><button class="btn btn-sec" data-action="modalclose">Cancel</button>' +
    '<button class="btn btn-primary" data-action="briefpickconfirm"' + (picked.length && latest ? '' : ' disabled') + '>Publish &amp; copy link</button></div></div>' +
    '</div></div>';
}

/* One door for every audience: pick who, get exactly the right next step. */
function shareModal(APP) {
  const latest = APP.versions.length ? APP.versions[APP.versions.length - 1] : null;
  const row = (iconPath, bg, color, title, desc, action, disabled) =>
    '<button class="umitem" data-action="' + action + '"' + (disabled ? ' disabled' : '') +
    ' style="padding:13px 16px;gap:12px;align-items:flex-start' + (disabled ? ';opacity:.45;cursor:not-allowed' : '') + '">' +
    '<span class="acc-ic" style="background:' + bg + ';color:' + color + ';width:32px;height:32px;flex:0 0 auto">' + ico(iconPath, 'i-sm') + '</span>' +
    '<span style="min-width:0"><span style="display:block;font-size:13.5px;font-weight:600;color:var(--ink)">' + title + '</span>' +
    '<span style="display:block;font-size:11.5px;color:var(--ink-4);line-height:1.45;margin-top:1px">' + desc + '</span></span>' +
    '<span style="margin-left:auto;color:var(--ink-4);align-self:center">' + ico(IC.fwd, 'i-sm') + '</span></button>';
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" style="max-width:440px;padding:0;overflow:hidden" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:22px 22px 4px"><div><h3>Share this project</h3>' +
    '<div class="hint" style="margin-top:4px">Pick who you are bringing in. Each audience gets its own door and sees only what it should.</div></div>' +
    '<button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div style="padding:10px 6px 12px">' +
    row(IC.users, 'var(--sky)', 'var(--brand)', 'A teammate', 'Full workspace access with an account. Managers edit; Viewers read and reply.', 'shr-team') +
    row(IC.user, '#f1ebfd', 'var(--purple)', 'A partner', 'Client-side manager of SMEs. Signs in, sees published briefs of granted projects only.', 'shr-partner') +
    row(IC.send, '#e6f7fb', 'var(--teal)', 'An SME reviewer', latest ? 'Pick which sections of v' + esc(latest.label) + ' they see, then copy the link. No account needed.' : 'Generate a version first.', 'shr-brief', !latest) +
    row(IC.link, '#e6f7fb', 'var(--teal)', 'An app tester', latest ? 'Copies the testing link for v' + esc(latest.label) + '. Bug reports land in your Inbox.' : 'Generate a version first.', 'shr-pilot', !latest) +
    row(IC.msg, 'var(--amber-bg)', 'var(--amber)', 'A question for an SME', 'Compose an input request and send its link. Answers thread back to the Inbox.', 'shr-request') +
    '<div class="umsep" style="margin:4px 0"></div>' +
    row(IC.eye, 'var(--bg-3)', 'var(--ink)', 'Anyone, read-only', latest ? 'Copies a fixed, branded, view-only link of v' + esc(latest.label) + '. No account, no review — just the record.' : 'Generate a version first.', 'copypresent', !latest) +
    '</div></div></div>';
}

function profileModal(APP) {
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3>Profile</h3><button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div class="fldlabel">Display name</div><input class="input" id="pfName" value="' + escA((APP.ctx && APP.ctx.display_name) || '') + '" placeholder="First and last">' +
    '<div class="hint" style="margin-top:8px">Shown on versions you generate, edits you make, replies you send, and to teammates working alongside you.</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button class="btn btn-sec" data-action="modalclose">Cancel</button><button class="btn btn-primary" data-action="profilesave">Save</button></div>' +
    '</div></div>';
}

function generateModal(APP) {
  const g = APP.gen || {};
  const nextMinor = nextLabel(APP.versions, false), nextMajor = nextLabel(APP.versions, true);
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3>Generate a version</h3><button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div class="hint" style="margin-top:6px">Locks the current worksheet into an immutable baseline that reviewers, SMEs, and partners see.</div>' +
    '<div class="fldlabel">Version</div><div class="choice">' +
    '<button class="chip' + (!g.major ? ' on' : '') + '" data-action="genkind" data-val="minor">Minor · v' + esc(nextMinor) + '</button>' +
    '<button class="chip' + (g.major ? ' on' : '') + '" data-action="genkind" data-val="major">Major · v' + esc(nextMajor) + '</button></div>' +
    '<div class="fldlabel">Change note (optional — a summary is added automatically)</div>' +
    '<input class="input" id="genNote" value="' + escA(g.note || '') + '" placeholder="e.g. Added e-signature requirements after SME review">' +
    (g.error ? '<div style="color:var(--bad);font-size:12.5px;margin-top:10px">' + esc(g.error) + '</div>' : '') +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button class="btn btn-sec" data-action="modalclose">Cancel</button>' +
    '<button class="btn btn-primary" data-action="genconfirm"' + (g.busy ? ' disabled' : '') + '>' + (g.busy ? 'Generating…' : 'Generate v' + esc(g.major ? nextMajor : nextMinor)) + '</button></div>' +
    '</div></div>';
}

export function nextLabel(versions, major) {
  if (!versions || !versions.length) return '1.0';
  const top = versions.reduce((a, b) => ((b && b.seq) || 0) > ((a && a.seq) || 0) ? b : a, versions[0]);
  const prev = (top && top.label) || '1.0';
  const maj = parseInt(prev.split('.')[0], 10) || 1;
  const min = parseInt(prev.split('.')[1] || '0', 10) || 0;
  return major ? (maj + 1) + '.0' : maj + '.' + (min + 1);
}

function deleteModal(APP) {
  const p = APP.delPending;
  return '<div class="modal-back"><div class="modal-card" role="dialog" aria-modal="true" style="max-width:400px">' +
    '<div style="font-size:17px;font-weight:660;margin-bottom:6px">Archive this project?</div>' +
    '<div style="font-size:13.5px;color:var(--ink-3);line-height:1.5;margin-bottom:16px">&ldquo;' + esc(p.name) + '&rdquo; will be hidden from the workspace. Its data, versions, and communications are kept and an administrator can restore it in the database. Type <strong>' + esc(p.name) + '</strong> to confirm.</div>' +
    '<input class="input" id="delCode" autocomplete="off" placeholder="' + escA(p.name) + '" style="height:44px;font-size:15px;margin-bottom:' + (APP.delError ? '10px' : '14px') + '">' +
    (APP.delError ? '<div style="color:var(--bad);font-size:12.5px;font-weight:560;margin-bottom:14px">' + esc(APP.delError) + '</div>' : '') +
    '<div style="display:flex;gap:8px"><button class="btn btn-sec" data-action="delcancel" style="flex:1;height:44px">Cancel</button><button class="btn btn-danger" data-action="delconfirm" style="flex:1;height:44px">Archive</button></div>' +
    '</div></div>';
}

/* ---------------- command palette ---------------- */
export function paletteItems(APP) {
  const items = [];
  (APP.projects || []).forEach((p) => items.push({ label: p.name, hint: 'Open project', ico: IC.doc, action: 'open', id: p.id }));
  if (APP.view === 'workspace') {
    ['document', 'summary', 'changes', 'versions', 'inbox', 'feedback', 'discovery', 'notes', 'people', 'access', 'activity']
      .forEach((t) => items.push({ label: 'Go to ' + t, hint: 'Tab', ico: IC.fwd, action: 'tab', id: t }));
    if (APP.role === 'manager') items.push({ label: 'Generate a version', hint: 'Baseline', ico: IC.layers, action: 'genopen' });
    if (APP.role === 'manager') items.push({ label: 'Share this project', hint: 'Access', ico: IC.send, action: 'shareopen' });
    items.push({ label: 'Presentation mode', hint: 'Document', ico: IC.expand, action: 'present' });
    items.push({ label: 'Export Word document', hint: 'Export', ico: IC.word, action: 'word' });
    items.push({ label: 'Print / save as PDF', hint: 'Export', ico: IC.print, action: 'print' });
  }
  items.push({ label: 'New project', hint: 'Create', ico: IC.plus, action: 'palnew' });
  items.push({ label: 'Toggle dark mode', hint: 'Theme', ico: IC.moon, action: 'themetoggle' });
  if (APP.role === 'manager') items.push({ label: 'Organization & people', hint: 'Admin', ico: IC.users, action: 'orgopen' });
  const q = (APP.palQ || '').toLowerCase().trim();
  return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
}
function palette(APP) {
  const items = paletteItems(APP);
  const sel = Math.min(APP.palSel || 0, Math.max(items.length - 1, 0));
  return '<div class="pal-back" data-action="palclose"><div class="pal" data-stop="1">' +
    '<input id="palInput" aria-label="Command palette" placeholder="Type a command or project name…" value="' + escA(APP.palQ || '') + '" autocomplete="off">' +
    '<div class="pal-list">' + (items.length ? items.map((it, i) =>
      '<button class="pal-item' + (i === sel ? ' on' : '') + '" data-action="palgo" data-ix="' + i + '">' + ico(it.ico || IC.fwd, 'i-sm') +
      '<span>' + esc(it.label) + '</span><span class="k">' + esc(it.hint || '') + '</span></button>').join('')
      : '<div style="padding:18px;text-align:center;color:var(--ink-4);font-size:13px">No matches.</div>') +
    '</div></div></div>';
}

/* ---------------- organization modal ---------------- */
function orgModal(APP) {
  const o = APP.orgData || { members: [], invites: [], partners: [], tab: 'members' };
  const tab = o.tab || 'members';
  const tabBtn = (t, l) => '<button class="seg-it' + '" data-action="orgtab" data-val="' + t + '" style="height:32px;padding:0 14px;border-radius:8px;font-size:13px;font-weight:540;' + (tab === t ? 'background:var(--bg);color:var(--ink);box-shadow:var(--shadow-sm)' : 'color:var(--ink-3)') + '">' + l + '</button>';
  let body = '';
  if (tab === 'members') {
    const rows = (o.members || []).map((m) =>
      '<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--line)">' +
      '<span class="umav">' + esc((m.email || 'U').charAt(0).toUpperCase()) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:560;overflow:hidden;text-overflow:ellipsis">' + esc(m.email || m.user_id) + '</div></div>' +
      (m.user_id === APP.user.id ? '<span class="umrole">' + esc(m.role) + ' · you</span>'
        : '<select class="input" data-action="mrole" data-id="' + escA(m.user_id) + '" style="height:30px;padding:0 8px;width:auto;font-size:12px">' +
          ['manager', 'viewer'].map((r) => '<option' + (m.role === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>' +
          '<button class="icobtn" data-action="mremove" data-id="' + escA(m.user_id) + '" title="Remove">' + ico(IC.close, 'i-sm') + '</button>') +
      '</div>').join('');
    const inv = (o.invites || []).map((i) => {
      const invLink = location.origin + '/signup/?ws=' + encodeURIComponent(APP.org || '') + '&email=' + encodeURIComponent(i.email);
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px">' +
        '<span style="flex:1;min-width:0;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis">' + esc(i.email) + '</span><span class="pill">' + esc(i.role) + ' · invited</span>' +
        '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(invLink) + '" title="Copy an invite link to send them yourself">' + ico(IC.copy, 'i-sm') + 'Link</button>' +
        '<button class="icobtn" data-action="invrevoke" data-id="' + escA(i.email) + '">' + ico(IC.close, 'i-sm') + '</button></div>';
    }).join('');
    body = '<div class="fldlabel">Invite a teammate</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="invEmail" type="email" placeholder="name@company.com" style="flex:1;min-width:180px">' +
      '<select class="input" id="invRole" style="width:auto"><option value="manager">Manager — edits documents</option><option value="viewer">Viewer — read + comment</option></select>' +
      '<button class="btn btn-primary" data-action="invsend">Invite</button></div>' +
      '<div class="hint" style="margin-top:7px">Managers write; Viewers read everything and can reply in the Inbox. The invite email needs the send-invite function deployed — the invite itself works either way.</div>' +
      '<div class="fldlabel" style="margin-top:18px">Members</div>' + (rows || '<div class="hint">Just you so far.</div>') +
      (inv ? '<div class="fldlabel" style="margin-top:14px">Pending invites</div>' + inv : '');
  } else {
    const projs = APP.projects || [];
    const rows = (o.partners || []).map((p) => {
      const chips = projs.map((pr) =>
        '<button class="chip chip-sm' + (p.acc[pr.id] ? ' on' : '') + '" data-action="paccess" data-id="' + escA(p.id) + '" data-pid="' + escA(pr.id) + '">' + esc(pr.name) + '</button>').join('');
      return '<div style="padding:12px 0;border-bottom:1px solid var(--line)">' +
        '<div style="display:flex;align-items:center;gap:10px"><span class="umav" style="background:var(--purple)">' + esc((p.name || p.email).charAt(0).toUpperCase()) + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:560">' + esc(p.name || p.email) + '</div><div style="font-size:11.5px;color:var(--ink-4)">' + esc(p.email) + '</div></div>' +
        '<button class="icobtn" data-action="premove" data-id="' + escA(p.id) + '">' + ico(IC.close, 'i-sm') + '</button></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;padding-left:40px">' + (chips || '<span class="hint">Create a project to assign.</span>') + '</div></div>';
    }).join('');
    body = '<div class="fldlabel">Add a partner</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="pName" placeholder="Name" style="flex:1;min-width:120px"><input class="input" id="pEmail" type="email" placeholder="email" style="flex:1.4;min-width:170px"><button class="btn btn-primary" data-action="paddnew">Add</button></div>' +
      '<div class="hint" style="margin-top:7px">Partners manage SMEs on the client side. They sign in with this email, see only the published brief of assigned projects, and exchange threads with your team.</div>' +
      '<div class="fldlabel" style="margin-top:18px">Partners &amp; project access</div>' + (rows || '<div class="hint">No partners yet.</div>');
  }
  return '<div class="modal-back" data-action="modalback"><div class="modal-card" role="dialog" aria-modal="true" style="max-width:560px" data-stop="1">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3>' + esc(APP.org || 'Organization') + '</h3><button class="modal-x" data-action="modalclose">' + ico(IC.close) + '</button></div>' +
    '<div class="seg" style="margin:14px 0 4px">' + tabBtn('members', 'Team') + tabBtn('partners', 'Partners') + '</div>' + body + '</div></div>';
}

/* ---------------- dashboard ---------------- */
export function viewProjects(APP) {
  const list = APP.projects || [];
  const stats = APP.projectStats || {};
  let agg = { unread: 0, open: 0 };
  list.forEach((p) => { const s = stats[p.id]; if (s) { agg.unread += s.unread; agg.open += s.open; } });
  const bits = [];
  if (agg.unread) bits.push(agg.unread + ' new communication' + (agg.unread === 1 ? '' : 's'));
  if (agg.open && APP.role === 'manager') bits.push(agg.open + ' item' + (agg.open === 1 ? '' : 's') + ' awaiting review');
  const banner = bits.length
    ? '<div class="card rise" style="padding:16px 18px;margin-bottom:18px;border:1px solid var(--sky-2);background:var(--sky);display:flex;align-items:center;gap:12px">' +
      '<div style="width:38px;height:38px;border-radius:11px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + ico(IC.msg) + '</div>' +
      '<div><div style="font-size:14px;font-weight:640">At a glance</div><div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">' + esc(bits.join(' · ')) + '</div></div></div>' : '';

  const cards = list.length ? list.map((p, i) => {
    const s = stats[p.id] || {};
    const latest = s.latest;
    const cb = (s.unread ? '<span class="pill pill-brand">' + s.unread + ' new</span>' : '') +
      (s.open ? '<span class="pill">' + s.open + ' open</span>' : '');
    return '<button class="pcard rise" style="animation-delay:' + (i * 40) + 'ms" data-action="open" data-id="' + escA(p.id) + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
      '<div style="min-width:0"><div style="font-weight:600;letter-spacing:-.01em;font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.name) + '</div>' +
      '<div style="font-size:12px;color:var(--ink-3);margin-top:3px">Updated ' + esc(relTime(p.updated_at)) + '</div></div>' +
      (APP.role === 'manager' ? '<span class="icobtn" data-action="del" data-id="' + escA(p.id) + '" title="Archive">' + ico(IC.trash, 'i-sm') + '</span>' : '') + '</div>' +
      '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">' +
      (latest ? '<span class="pill"><span class="mono">v' + esc(latest.label) + '</span></span><span class="stchip ' + esc(latest.status) + '">' + esc(STATUS_LABEL[latest.status]) + '</span>' : '<span class="pill" style="color:var(--ink-3)">Draft, no version</span>') + cb + '</div>' +
      '</button>';
  }).join('') : onboardBlock(APP);

  return shell(
    '<div class="topbar"><div style="display:flex;align-items:center;gap:11px">' + brandmark() +
    '<div><div style="font-weight:660;letter-spacing:-.02em;font-size:15px">ReqPub</div><div class="eyebrow" style="font-size:9.5px;letter-spacing:.18em;margin-top:1px">Discovery to Requirements</div></div>' +
    (APP.org ? '<div style="width:1px;height:26px;background:var(--line-2);margin:0 3px"></div><button class="acctchip" data-action="wsmenu" title="Switch workspace"><span class="acctdot">' + esc((APP.org || 'W').charAt(0).toUpperCase()) + '</span>' + esc(APP.org) +
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.55"><polyline points="6 9 12 15 18 9"/></svg></button>' : '') +
    '</div><div style="display:flex;align-items:center;gap:8px">' + saveChip(APP) + userMenu(APP) + '</div></div>' +
    '<div style="flex:1;overflow-y:auto"><div class="wrap">' +
    '<div class="rise" style="margin-bottom:40px"><h1 style="font-size:38px;line-height:1.08;letter-spacing:-.03em;font-weight:660;margin:0 0 12px">Discovery to Requirements.</h1>' +
    '<p style="color:var(--ink-3);max-width:520px;font-size:15.5px;line-height:1.6;margin:0">One shared workspace from workshop input to a versioned, approved, testable requirements document.</p></div>' +
    (APP.role === 'manager'
      ? '<div class="card rise" style="padding:20px;margin-bottom:34px;animation-delay:60ms"><div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<input id="newName" class="input" style="flex:1;min-width:220px;height:46px" placeholder="Name a new product to specify">' +
        '<button class="btn btn-primary" style="height:46px" data-action="new">' + ico(IC.plus) + 'New project</button></div></div>'
      : '') +
    banner +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">' + cards + '</div>' +
    '</div></div>', APP);
}

function onboardBlock(APP) {
  const step = (n, t, d) => '<div style="border:1px solid var(--line);border-radius:11px;padding:13px"><div style="width:24px;height:24px;border-radius:7px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:680;margin-bottom:9px">' + n + '</div><div style="font-size:13px;font-weight:600;margin-bottom:3px">' + esc(t) + '</div><div style="font-size:11.5px;color:var(--ink-3);line-height:1.5">' + esc(d) + '</div></div>';
  return '<div class="card rise" style="grid-column:1/-1;padding:26px 24px">' +
    '<div style="font-size:16px;font-weight:640;margin-bottom:14px">How ' + esc(APP.org || 'this workspace') + ' works</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">' +
    step(1, 'Answer the worksheet', 'The guided intake covers users, scope, requirements, data, and AI evaluation. Everyone edits together, live.') +
    step(2, 'Generate a version', 'A numbered, immutable baseline with a change summary and an approval workflow.') +
    step(3, 'Collect input', 'Share review briefs and request links with SMEs — no account needed on their side. Partners get a portal.') +
    step(4, 'Hand off', 'Export to Word, PDF, or Markdown with approvals and revision history on the cover.') +
    '</div></div>';
}

/* ---------------- workspace (worksheet + doc) ---------------- */
export function viewWorkspace(APP) {
  const a = assembleAnswers(APP.fields, APP.rows);
  const vq = visQ(a);
  const ac = vq.filter((q) => isAnswered(q, a[q.id])).length;
  const latest = APP.versions.length ? APP.versions[APP.versions.length - 1] : null;
  const canEdit = APP.role === 'manager';

  const header = '<div class="topbar">' +
    '<div style="display:flex;align-items:center;gap:12px;min-width:0">' +
    '<button class="icobtn" data-action="home" title="All projects">' + ico(IC.arrow) + '</button>' +
    '<div style="width:1px;height:24px;background:var(--line)"></div>' + brandmark(24) +
    '<div style="min-width:0"><div style="font-weight:600;letter-spacing:-.01em;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.ctrl_product || (APP.project && APP.project.name) || 'Untitled') + '</div>' +
    '<div class="eyebrow" style="font-size:9.5px;margin-top:1px">Requirements document</div></div>' +
    (latest ? '<span class="pill"><span class="mono">v' + esc(latest.label) + '</span></span><span class="stchip ' + esc(latest.status) + '">' + esc(STATUS_LABEL[latest.status]) + '</span>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px">' + presenceBar(APP) + saveChip(APP) + userMenu(APP) + '</div></div>';

  const doc = renderDoc(APP, a, ac, vq.length);
  const body = !canEdit
    ? '<div class="split" style="grid-template-columns:1fr"><div class="pane-doc" id="docPane" style="display:flex">' + doc + '</div></div>'
    : '<div class="split"><div class="pane-intake" id="intakePane">' + renderWorksheet(APP, a, ac, vq.length) + '</div>' +
      '<div class="pane-doc' + (APP.docShow ? ' show' : '') + '" id="docPane">' + doc + '</div></div>' +
      '<button class="fab" data-action="toggledoc">' + ico(APP.docShow ? IC.edit : IC.doc) + '</button>';

  return shell(header + body, APP) + (APP.present ? presentOverlay(APP, a) : '');
}

/* ---- worksheet (left pane) ---- */
function renderWorksheet(APP, a, ac, total) {
  const secs = SECTIONS.filter((s) => qBySec(s.key).length && (!s.cond || s.cond(a)));
  const editingBy = {};
  (APP.presence || []).forEach((p) => { if (p.f && !String(p.f).startsWith('row:')) (editingBy[p.f] = editingBy[p.f] || []).push(p.n); });

  const body = secs.map((s) => {
    const qs = qBySec(s.key).filter((q) => !q.cond || q.cond(a));
    const done = qs.filter((q) => isAnswered(q, a[q.id])).length;
    const open = APP.openSecs[s.key] !== false;
    const head = '<button data-action="secto" data-val="' + s.key + '" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:14px 2px">' +
      '<span class="dot ' + (done === qs.length ? 'done' : done ? 'some' : '') + '"></span>' +
      '<span style="flex:1;font-size:14px;font-weight:600;letter-spacing:-.01em">' + (s.num != null ? '<span class="mono" style="font-size:11px;color:var(--ink-4);margin-right:7px">' + s.num + '</span>' : '') + esc(s.title) + '</span>' +
      '<span style="font-size:11px;color:var(--ink-4)" class="mono">' + done + '/' + qs.length + '</span>' +
      '<span style="color:var(--ink-4);display:inline-flex;transition:transform .15s;' + (open ? 'transform:rotate(90deg)' : '') + '">' + ico(IC.fwd, 'i-sm') + '</span></button>';
    const items = open ? qs.map((q) => fieldHTML(APP, q, a, editingBy)).join('') : '';
    return '<div style="border-bottom:1px solid var(--line)" id="sec-' + s.key + '">' + head + (open ? '<div style="padding:2px 2px 22px;display:flex;flex-direction:column;gap:18px">' + items + '</div>' : '') + '</div>';
  }).join('');

  return '<div style="padding:22px 26px 60px">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
    '<div style="flex:1"><div class="ptrack"><div class="pfill" style="width:' + Math.round(ac / Math.max(total, 1) * 100) + '%"></div></div></div>' +
    '<span class="mono" style="font-size:11px;color:var(--ink-4)">' + ac + '/' + total + '</span>' +
    genButton(APP) + '</div>' + body + '</div>';
}

function genButton(APP) {
  if (APP.role !== 'manager') return '';
  return '<button class="btn btn-primary btn-sm" data-action="genopen" title="Lock the worksheet into a numbered baseline">' + ico(IC.layers, 'i-sm') + 'Generate version</button>';
}

function editingChip(names) {
  if (!names || !names.length) return '';
  const label = names.length === 1 ? names[0] + ' is editing' : names.length + ' people are editing';
  return '<span class="editing-chip">' + esc(label) + '</span>';
}

export function fieldHTML(APP, q, a, editingBy) {
  const v = a[q.id];
  const conflict = APP.conflicts[q.id];
  const head = '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:7px">' +
    '<span style="font-size:13.5px;font-weight:600;letter-spacing:-.005em">' + esc(q.prompt) + (q.req ? ' <span style="color:var(--brand)">*</span>' : '') + '</span>' +
    editingChip(editingBy && editingBy[q.id]) + '</div>' +
    (q.help ? '<div style="font-size:12px;color:var(--ink-4);line-height:1.5;margin:-3px 0 8px">' + esc(q.help) + '</div>' : '');
  const conflictNote = conflict ? '<div class="conflict-note">' + esc((conflict.by || 'A teammate') + ' edited this at the same time — your text was kept. Check theirs in the document pane.') + '</div>' : '';

  let control = '';
  if (q.type === 'short') {
    control = '<input class="input" data-field="' + escA(q.id) + '" value="' + escA(v || '') + '" placeholder="' + escA(q.ph || '') + '">';
  } else if (q.type === 'long') {
    control = '<textarea class="input gta" data-field="' + escA(q.id) + '" rows="2" placeholder="' + escA(q.ph || '') + '">' + esc(v || '') + '</textarea>';
  } else if (q.type === 'choice') {
    control = '<div class="choice">' + (q.options || []).map((o) =>
      '<button class="chip' + (v === o ? ' on' : '') + '" data-action="choice" data-qid="' + escA(q.id) + '" data-val="' + escA(o) + '"' + (APP.role !== 'manager' ? ' disabled' : '') + '>' + esc(o) + '</button>').join('') + '</div>';
  } else if (q.type === 'list') {
    const rows = (APP.rows[q.id] || []);
    control = rows.map((r) =>
      '<div style="display:flex;gap:7px;margin-bottom:7px">' +
      '<input class="input" data-rowfield="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" data-colkey="text" value="' + escA((r.data && r.data.text) || '') + '" placeholder="' + escA(q.ph || '') + '">' +
      '<button class="icobtn" data-action="delrow" data-qid="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" title="Remove">' + ico(IC.close, 'i-sm') + '</button></div>').join('') +
      '<button class="btn btn-ghost btn-sm" data-action="addrow" data-qid="' + escA(q.id) + '">' + ico(IC.plus, 'i-sm') + esc(q.add || 'Add') + '</button>';
  } else if (q.type === 'rows') {
    const rows = (APP.rows[q.id] || []);
    const comps = (APP.rows.components || []).map((r) => (r.data && r.data.name) || '').filter(Boolean);
    control = rows.map((r) => {
      const cells = (q.cols || []).map((c) => {
        const val = (r.data && r.data[c.k]) || '';
        if (c.sel) {
          return '<div><div style="font-size:10.5px;color:var(--ink-4);font-weight:560;margin-bottom:3px">' + esc(c.l) + '</div>' +
            '<select class="input" data-rowfield="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" data-colkey="' + escA(c.k) + '" style="height:36px;padding:0 8px">' +
            '<option value=""></option>' + c.sel.map((o) => '<option' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
        }
        if (c.dyn === 'components') {
          return '<div><div style="font-size:10.5px;color:var(--ink-4);font-weight:560;margin-bottom:3px">' + esc(c.l) + '</div>' +
            '<select class="input" data-rowfield="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" data-colkey="' + escA(c.k) + '" style="height:36px;padding:0 8px">' +
            '<option value="">Unassigned</option>' + comps.map((o) => '<option' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
        }
        const wide = c.k === 'stmt' || c.k === 'fit' || c.k === 'desc' || c.k === 'obj' || c.k === 'needs' || c.k === 'req' || c.k === 'metric';
        return '<div' + (wide ? ' style="grid-column:1/-1"' : '') + '><div style="font-size:10.5px;color:var(--ink-4);font-weight:560;margin-bottom:3px">' + esc(c.l) + '</div>' +
          '<textarea class="input gta" rows="1" data-rowfield="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" data-colkey="' + escA(c.k) + '" placeholder="' + escA(c.ph || '') + '">' + esc(val) + '</textarea></div>';
      }).join('');
      const idtag = (q.id === 'fr' || q.id === 'nfr' || q.id === 'eval' || q.id === 'interfaces')
        ? '<span class="mono" style="font-size:10.5px;color:var(--brand);font-weight:620">' + esc((q.id === 'fr' ? 'FR' : q.id === 'nfr' ? 'NFR' : q.id === 'eval' ? 'EVAL' : 'IR') + '-' + String(r.k).padStart(3, '0')) + '</span>' : '';
      const fitBtn = ((q.id === 'fr' || q.id === 'nfr') && !(r.data && r.data.fit))
        ? '<button class="btn btn-ghost btn-sm" data-action="suggestfit" data-qid="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" style="font-size:11.5px">' + ico(IC.spark, 'i-sm') + 'Draft fit criterion</button>' : '';
      return '<div class="row-card" style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' + (idtag || '<span></span>') +
        '<div style="display:flex;gap:4px;align-items:center">' + fitBtn +
        '<button class="icobtn" data-action="delrow" data-qid="' + escA(q.id) + '" data-rowid="' + escA(r.id) + '" title="Remove">' + ico(IC.close, 'i-sm') + '</button></div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">' + cells + '</div></div>';
    }).join('') +
      '<button class="btn btn-ghost btn-sm" data-action="addrow" data-qid="' + escA(q.id) + '">' + ico(IC.plus, 'i-sm') + esc(q.add || 'Add row') + '</button>';
  }
  const ro = (APP.role !== 'manager' && (q.type === 'short' || q.type === 'long'))
    ? control.replace('<input ', '<input readonly ').replace('<textarea ', '<textarea readonly ') : control;
  return '<div class="card qcard" style="padding:20px" data-q="' + escA(q.id) + '">' + head + ro + conflictNote + '</div>';
}

/* ---- document (right pane) ---- */
export function currentDocMd(APP, a) {
  if (APP.viewSeq != null) {
    const snap = APP.snapshots[APP.viewSeq];
    if (snap) {
      const secs = snap.snapshot.sections || {};
      const parts = Object.keys(secs).length ? secs
        : buildSections(snap.snapshot.answers || {}, snap.label, APP.versions.filter((v) => v.seq <= snap.seq));
      return { md: assemble(parts, snap.snapshot.answers || {}), label: snap.label, status: snap.status };
    }
    return { md: '', label: '', status: 'draft', loading: true };
  }
  const label = APP.versions.length ? APP.versions[APP.versions.length - 1].label : null;
  const sections = buildSections(a, label ? label + ' (working)' : null, APP.versions);
  return { md: assemble(sections, a), label: label, status: 'draft', working: true };
}

/* The document tab body, exported so main.js can live-patch the pane while
   someone types in the worksheet without re-rendering (and unfocusing) it. */
export function documentTabHTML(APP, a) {
  const d = currentDocMd(APP, a);
  if (d.loading) return '<div class="empty"><div style="font-size:13px">Loading version…</div></div>';
  return d.md
    ? lastChangeBanner(APP) + '<div class="page"><div class="doc-anim">' + mdToHtml(d.md) + '</div></div>'
    : '<div class="empty">' + ico(IC.doc) + '<div style="font-size:14.5px;color:var(--ink-2);font-weight:560;margin-bottom:4px">The requirements document builds here as you answer</div><div style="font-size:13px;max-width:240px">Start with Overview on the left.</div></div>';
}

/* Full-screen presentation of the rendered document only. */
export function presentOverlay(APP, a) {
  const d = currentDocMd(APP, a);
  const label = d.label ? 'v' + d.label + (d.working ? ' · working draft' : '') : 'Working draft';
  return '<div class="present-back" role="dialog" aria-modal="true" aria-label="Presentation mode">' +
    '<div class="present-bar"><div style="display:flex;align-items:center;gap:10px;min-width:0">' + brandmark(24) +
    '<span style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.ctrl_product || (APP.project && APP.project.name) || 'Untitled') + '</span>' +
    '<span class="pill"><span class="mono">' + esc(label) + '</span></span></div>' +
    '<div style="display:flex;gap:6px;align-items:center">' +
    '<button class="btn btn-sec btn-sm" data-action="copypresent" title="Copy a read-only link to exactly this view">' + ico(IC.link, 'i-sm') + 'Copy read-only link</button>' +
    '<button class="icobtn" data-action="print" title="Save as PDF">' + ico(IC.print) + '</button>' +
    '<button class="icobtn" data-action="presentclose" title="Exit presentation (Esc)">' + ico(IC.close) + '</button></div></div>' +
    '<div class="present-scroll" id="presentScroll"><div class="page">' + (d.md ? mdToHtml(d.md) : '<div class="empty"><div style="font-size:13px">Nothing to present yet.</div></div>') + '</div></div></div>';
}

function renderDoc(APP, a, ac, total) {
  const tabs = ['inbox', 'document', 'summary', 'changes', 'versions', 'feedback', 'discovery', 'notes', 'people', 'access', 'activity'];
  const unread = unreadCount(APP);
  const tabBtns = tabs.map((t) => {
    const badge = (t === 'inbox' && unread)
      ? ' <span style="background:var(--brand);color:#fff;border-radius:999px;padding:0 5px;font-size:10px;font-weight:700;vertical-align:1px">' + unread + '</span>' : '';
    return '<button class="btn btn-sm" data-action="tab" data-val="' + t + '" style="' +
      (APP.docTab === t ? 'background:var(--ink);color:var(--bg)' : 'color:var(--ink-3)') + ';text-transform:capitalize">' + t + badge + '</button>';
  }).join('');

  const verOptions = '<option value="">Working draft</option>' + APP.versions.slice().reverse().map((v) =>
    '<option value="' + v.seq + '"' + (APP.viewSeq === v.seq ? ' selected' : '') + '>v' + esc(v.label) + '</option>').join('');
  const docActions =
    (APP.role === 'manager' ? '<button class="icobtn" data-action="shareopen" title="Share this project…">' + ico(IC.send) + '</button>' : '') +
    '<button class="icobtn" data-action="present" title="Presentation mode — show only the document">' + ico(IC.expand) + '</button>' +
    ((APP.docTab === 'document' || APP.docTab === 'summary' || APP.docTab === 'changes')
      ? (APP.versions.length ? '<select class="input" data-action="versionsel" style="height:34px;padding:0 8px;width:auto;font-family:var(--mono);font-size:12px">' + verOptions + '</select>' : '') +
        '<button class="icobtn" data-action="copymd" title="Copy Markdown">' + ico(IC.copy) + '</button>' +
        '<button class="icobtn" data-action="word" title="Download for Word (.doc)">' + ico(IC.word) + '</button>' +
        '<button class="icobtn" data-action="print" title="Save as PDF (print)">' + ico(IC.print) + '</button>' +
        '<button class="icobtn" data-action="downloadmd" title="Download Markdown (.md)">' + ico(IC.dl) + '</button>'
      : '');

  let content;
  if (APP.docTab === 'document') {
    content = documentTabHTML(APP, a);
  } else if (APP.docTab === 'summary') {
    const d = currentDocMd(APP, a);
    const ans = APP.viewSeq != null && APP.snapshots[APP.viewSeq] ? (APP.snapshots[APP.viewSeq].snapshot.answers || {}) : a;
    content = '<div class="page">' + execSummaryHTML(ans, { label: d.label }) +
      '<button class="btn btn-sec btn-sm" data-action="execdl" style="margin-top:6px">' + ico(IC.dl, 'i-sm') + 'Download summary (.md)</button></div>';
  } else if (APP.docTab === 'changes') {
    content = renderChanges(APP, a);
  } else {
    content = renderTab(APP, a);
  }
  return '<div class="doc-tools"><div style="display:flex;gap:4px;flex-wrap:wrap">' + tabBtns + '</div>' +
    '<div style="display:flex;align-items:center;gap:6px">' + docActions + '</div></div>' +
    '<div class="doc-scroll" id="docScroll">' + content + '</div>';
}

function lastChangeBanner(APP) {
  if (!APP.versions.length) return '';
  const shownSeq = APP.viewSeq != null ? APP.viewSeq : APP.versions[APP.versions.length - 1].seq;
  const meta = APP.versions.find((v) => v.seq === shownSeq);
  if (!meta) return '';
  const who = meta.author_name && meta.author_name.trim() ? meta.author_name : 'an unnamed editor';
  return '<div class="page" style="padding-top:16px;padding-bottom:0;max-width:660px"><div style="border:1px solid var(--line-2);border-radius:12px;background:var(--bg);padding:13px 15px">' +
    '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><span class="pill pill-solid"><span class="mono">v' + esc(meta.label) + '</span></span>' +
    '<span class="stchip ' + esc(meta.status) + '">' + esc(STATUS_LABEL[meta.status]) + '</span>' +
    '<span style="font-size:13.5px"><strong>Last baselined by ' + esc(who) + '</strong></span>' +
    '<span style="font-size:12px;color:var(--ink-3)">' + esc(relTime(meta.created_at)) + '</span></div>' +
    (meta.note ? '<div style="margin-top:9px"><span class="eyebrow" style="font-size:9.5px">What changed</span><div style="font-size:12.5px;color:var(--ink-2);line-height:1.55;margin-top:4px">' + esc(meta.note) + '</div></div>' : '') +
    '</div></div>';
}

function renderChanges(APP, a) {
  if (!APP.versions.length) return '<div class="empty">' + ico(IC.hist) + '<div style="font-size:13px">No versions yet. Generate v1.0.</div></div>';
  const seq = APP.viewSeq != null ? APP.viewSeq : APP.versions[APP.versions.length - 1].seq;
  const idx = APP.versions.findIndex((v) => v.seq === seq);
  const meta = APP.versions[idx];
  const cur = APP.snapshots[meta.seq];
  const prevMeta = idx > 0 ? APP.versions[idx - 1] : null;
  const prev = prevMeta ? APP.snapshots[prevMeta.seq] : null;
  if (!cur || (prevMeta && !prev)) return '<div class="empty"><div style="font-size:13px">Loading snapshots…</div></div>';
  const curS = (cur.snapshot && cur.snapshot.sections) || {};
  const prevS = (prev && prev.snapshot && prev.snapshot.sections) || {};
  const rows = SECTIONS.filter((s) => s.key !== 'control' && s.key !== 'revision' && (curS[s.key] || prevS[s.key])).map((s) => {
    let st = 'Unchanged';
    if (!prevMeta) st = 'New';
    else if (!prevS[s.key] && curS[s.key]) st = 'Added';
    else if (prevS[s.key] && !curS[s.key]) st = 'Removed';
    else if (curS[s.key] !== prevS[s.key]) st = 'Changed';
    const strong = st !== 'Unchanged';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border:1px solid var(--line);border-radius:11px;background:' + (strong ? 'var(--bg)' : 'var(--bg-2)') + ';margin-bottom:7px">' +
      '<div style="display:flex;align-items:center;gap:10px"><span class="mono" style="font-size:11px;color:var(--ink-4);width:16px">' + (s.num == null ? '·' : s.num) + '</span><span style="font-size:14px;color:' + (strong ? 'var(--ink)' : 'var(--ink-3)') + '">' + esc(s.title) + '</span></div>' +
      '<span class="pill' + (strong ? ' pill-solid' : '') + '">' + st + '</span></div>';
  }).join('');
  const rd = reqDiff((prev && prev.snapshot && prev.snapshot.answers) || {}, (cur.snapshot && cur.snapshot.answers) || {});
  const chip = (label, ids, solid) => ids.length ? '<div style="margin-bottom:10px"><span class="eyebrow" style="font-size:9.5px">' + label + '</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + ids.map((id) => '<span class="pill' + (solid ? ' pill-solid' : '') + '"><span class="mono">' + esc(id) + '</span></span>').join('') + '</div></div>' : '';
  const reqBlock = (rd.added.length || rd.modified.length || rd.removed.length)
    ? '<div style="border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--bg-2);margin-bottom:18px"><div style="font-size:13px;font-weight:600;margin-bottom:10px">Requirement-level changes</div>' + chip('Added', rd.added, true) + chip('Modified', rd.modified, false) + chip('Removed', rd.removed, false) + '</div>' : '';
  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 4px">Changes in v' + esc(meta.label) + '</h2>' +
    '<p class="hint" style="margin:0 0 18px">' + (prevMeta ? 'Compared to v' + esc(prevMeta.label) + ', by ' + esc(meta.author_name || 'an unnamed editor') + '.' : 'Initial baseline. Every section is new.') + '</p>' +
    reqBlock + '<div class="eyebrow" style="font-size:9.5px;margin-bottom:8px">By section</div>' + rows + '</div>';
}
