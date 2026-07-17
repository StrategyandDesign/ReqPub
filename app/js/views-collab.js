/* ============================================================================
   ReqPub v2 - collaboration tabs: inbox, feedback, discovery, notes & requests,
   people, links, versions & approvals, activity.
   ============================================================================ */

import { esc, escA, ico, IC, relTime, fmtDate, initials, attachChips, attachInput, fmtBytes, fmtFingerprint } from './core.js';
import { STATUS_LABEL } from './views-app.js';
import { isEngagement } from './domain.js';
import { healthSignals, recordCounts } from './health.js';

const attachmentsForComm = (APP, commId) => (APP.attachments || []).filter((a) => a.comm_id === commId);

const EXTERNAL = { app: 1, brief: 1, sme: 1, partner: 1 };
const ORIGIN_LABEL = { app: 'App', brief: 'Reviewer', sme: 'SME', partner: 'Client contact', team: 'Team', meeting: 'Meeting' };
const AUTHOR_LABEL = { partner: 'Client contact', sme: 'SME', team: 'Team' };   // author_kind keys are schema-permanent; only the label changes
const COMM_STATUS = ['new', 'in_review', 'actioned', 'closed'];
const COMM_STATUS_LABEL = { new: 'New', in_review: 'In review', actioned: 'Actioned', closed: 'Closed' };

export function unreadCount(APP) {
  return (APP.comms || []).filter((c) => EXTERNAL[c.origin] && !APP.reads[c.id]).length;
}
// Team-level "new reply": an external party posted or replied more recently than
// any team member has looked. Clears for everyone once one teammate opens it.
export const isUnseenExternal = (c) =>
  !!c.last_ext_at && (!c.team_seen_at || new Date(c.team_seen_at) < new Date(c.last_ext_at));
export const newReplyCount = (APP) => (APP.comms || []).filter(isUnseenExternal).length;
// A thread's latest activity: its own time, or the newest reply on it. A thread
// with a recent partner or SME reply then reads by that reply, not by when it
// opened, so recent external engagement is visible and sorts to the top.
export const lastActivityAt = (APP, it) => {
  let t = it.created_at;
  const ms = (APP.msgs && APP.msgs[it.id]) || [];
  for (const m of ms) if (m && m.created_at && new Date(m.created_at) > new Date(t)) t = m.created_at;
  return t;
};
export function projectStatsOf(comms, reads) {
  let unread = 0, open = 0, newExt = 0;
  (comms || []).forEach((c) => {
    if (EXTERNAL[c.origin] && !reads[c.id]) unread++;
    if (c.status === 'new' || c.status === 'in_review') open++;
    if (isUnseenExternal(c)) newExt++;
  });
  return { unread, open, newExt };
}

const srcColor = (o) => o === 'app' ? 'var(--ink)' : o === 'brief' ? 'var(--brand)' : o === 'partner' ? 'var(--purple)' : o === 'sme' ? 'var(--teal)' : 'var(--ink-3)';

export function renderTab(APP, a) {
  switch (APP.docTab) {
    case 'inbox': return renderInbox(APP);
    case 'feedback': return renderFeedback(APP);
    case 'discovery': return renderDiscovery(APP, a);
    case 'notes': return renderNotes(APP);
    case 'people': return renderPeople(APP);
    case 'access': return renderAccess(APP);
    case 'activity': return renderActivity(APP);
    case 'health': return renderHealth(APP, a);
    case 'updates': return renderUpdates(APP, a);
    case 'versions': default: return renderVersions(APP);
  }
}

/* ---------------- inbox ---------------- */
function threadHTML(APP, comm, canReply) {
  const msgs = APP.msgs[comm.id] || [];
  const thread = msgs.map((m) =>
    '<div style="padding:8px 0;border-top:1px solid var(--line)"><div style="font-size:11px;color:var(--ink-4);margin-bottom:2px">' +
    '<strong style="color:var(--ink-2)">' + esc(m.author_name || 'Team') + '</strong>' +
    (m.author_kind !== 'team' ? ' <span class="pill" style="height:16px;font-size:9.5px;padding:0 6px;vertical-align:1px;color:' + srcColor(m.author_kind === 'partner' ? 'partner' : 'sme') + ';border-color:currentColor">' + esc(AUTHOR_LABEL[m.author_kind] || m.author_kind) + '</span>' : '') +
    ' · ' + esc(relTime(m.created_at)) + '</div>' +
    '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;white-space:pre-wrap">' + esc(m.body) + '</div></div>').join('');
  const draft = (APP.drafts[comm.id] || '');
  const files = attachChips(attachmentsForComm(APP, comm.id), { download: true });
  const replyBox = canReply
    ? '<textarea class="input" data-draft="' + escA(comm.id) + '" rows="2" placeholder="Reply to ' + escA(comm.author_name || 'them') + (EXTERNAL[comm.origin] ? ' - they see this at their link' : '') + '" style="font-size:12.5px;resize:vertical;min-height:44px;line-height:1.5;margin-top:8px">' + esc(draft) + '</textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:8px">' + attachInput({ comm: comm.id }) +
      '<button class="btn btn-primary btn-sm" data-action="reply" data-id="' + escA(comm.id) + '">Send reply</button></div>'
    : '';
  return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><div class="eyebrow" style="font-size:9px;margin-bottom:6px">Conversation</div>' +
    (thread || '<div style="font-size:12px;color:var(--ink-4)">No replies yet.</div>') + files + replyBox + '</div>';
}

function commCard(APP, it) {
  const open = !!APP.openComms[it.id];
  const unr = EXTERNAL[it.origin] && !APP.reads[it.id];
  const badges = (isUnseenExternal(it) ? '<span class="pill pill-solid" style="background:var(--brand);border-color:var(--brand);color:#fff">New reply</span>' : '') +
    '<span class="pill" style="border-color:' + srcColor(it.origin) + ';color:' + srcColor(it.origin) + '">' + esc(ORIGIN_LABEL[it.origin] || it.origin) + '</span>' +
    (it.severity ? '<span class="pill' + (it.severity === 'Critical' ? ' pill-solid' : '') + '">' + esc(it.severity) + '</span>' : '') +
    '<span class="pill' + (it.status === 'new' ? ' pill-solid' : '') + '">' + esc(COMM_STATUS_LABEL[it.status] || it.status) + '</span>' +
    (it.promoted_to ? '<span class="pill">' + esc(it.promoted_to === 'discovery' ? 'In discovery' : 'Promoted to ' + it.promoted_to) + '</span>' : '');
  const head = '<div data-action="commtoggle" data-id="' + escA(it.id) + '" style="cursor:pointer;padding:13px 15px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
    '<div style="display:flex;gap:10px;min-width:0;align-items:flex-start">' +
    (unr ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--brand);flex:0 0 auto;margin-top:6px"></span>' : '<span style="width:7px;flex:0 0 auto"></span>') +
    '<div style="min-width:0"><div style="font-weight:' + (unr ? '650' : '560') + ';font-size:14px;line-height:1.35' + (open ? '' : ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap') + '">' + (it.ref ? '<span style="font-family:var(--mono);font-size:10px;color:var(--ink-4);border:1px solid var(--line);border-radius:5px;padding:1px 5px;margin-right:6px;vertical-align:1.5px">' + esc(it.ref) + '</span>' : '') + esc(it.title || '(untitled)') + '</div>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">' + esc(it.author_name || 'Anonymous') + ' · ' + esc(relTime(lastActivityAt(APP, it))) + (it.version_seq ? ' · ' + verLabel(APP, it.version_seq) : '') + '</div></div></div>' +
    '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end;flex:0 0 auto">' + badges + '</div></div>';
  let body = '';
  if (open) {
    const isMgr = APP.role === 'manager';
    const stsel = isMgr ? '<select class="input" data-action="commstatus" data-id="' + escA(it.id) + '" style="height:32px;padding:0 8px;width:auto;font-size:12px">' +
      COMM_STATUS.map((s) => '<option value="' + s + '"' + (it.status === s ? ' selected' : '') + '>' + COMM_STATUS_LABEL[s] + '</option>').join('') + '</select>' : '';
    const promote = isMgr && !it.promoted_to
      ? '<button class="btn btn-sec btn-sm" data-action="promdisc" data-id="' + escA(it.id) + '">' + ico(IC.spark, 'i-sm') + 'To discovery</button>' +
        '<button class="btn btn-sec btn-sm" data-action="promreq" data-id="' + escA(it.id) + '">' + ico(IC.arrow, 'i-sm') + 'To requirement</button>'
      : '';
    body = '<div style="padding:0 15px 15px;border-top:1px solid var(--line)">' +
      '<div style="padding-top:12px;font-size:13px;color:var(--ink-2);line-height:1.55;white-space:pre-wrap">' + esc(it.body) + '</div>' +
      (it.steps ? '<div style="margin-top:10px"><div class="eyebrow" style="font-size:9px;margin-bottom:3px">Steps to reproduce</div><div style="font-size:12.5px;color:var(--ink-3);white-space:pre-wrap;line-height:1.5">' + esc(it.steps) + '</div></div>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:11px">' +
      (it.fb_type ? '<span class="pill">' + esc(it.fb_type) + '</span>' : '') +
      (it.verdict ? '<span class="pill' + (it.verdict === 'Looks complete' ? ' pill-good' : '') + '">' + esc(it.verdict) + '</span>' : '') +
      (it.author_email ? '<span class="pill">' + esc(it.author_email) + '</span>' : '') + '</div>' +
      threadHTML(APP, it, true) +
      ((stsel || promote) ? '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">' +
        (stsel ? '<span class="eyebrow" style="font-size:9px">Status</span>' + stsel : '') + '<div style="flex:1"></div>' + promote + '</div>' : '') +
      '</div>';
  }
  return '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden' + (unr ? ';border-color:var(--sky-2)' : '') + '">' + head + body + '</div>';
}

const verLabel = (APP, seq) => {
  const v = (APP.versions || []).find((x) => x.seq === seq);
  return v ? 'v' + esc(v.label) : 'v' + seq;
};

function renderInbox(APP) {
  const all = APP.comms || [];
  const F = APP.inboxFilter;
  const q = (F.q || '').toLowerCase();
  const unread = unreadCount(APP);
  const srcs = ['all', 'app', 'brief', 'sme', 'partner', 'team'];
  const stats = ['all', ...COMM_STATUS];
  const schip = (s) => '<button class="chip chip-sm' + (F.src === s ? ' on' : '') + '" data-action="ibsrc" data-val="' + s + '">' + (s === 'all' ? 'All' : ORIGIN_LABEL[s]) + '</button>';
  const stchip = (s) => '<button class="chip chip-sm' + (F.status === s ? ' on' : '') + '" data-action="ibstatus" data-val="' + s + '">' + (s === 'all' ? 'All' : COMM_STATUS_LABEL[s]) + '</button>';
  const filtered = all.filter((it) => {
    if (F.src !== 'all' && it.origin !== F.src) return false;
    if (F.status !== 'all' && it.status !== F.status) return false;
    if (q) {
      const hay = (it.author_name + ' ' + it.title + ' ' + it.body + ' ' + it.origin).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => new Date(lastActivityAt(APP, b)) - new Date(lastActivityAt(APP, a)));   // most recently active first
  const header = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:10px">' +
    '<div><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Inbox</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Every communication on this PRD, live. ' + all.length + ' total' + (unread ? ' · ' + unread + ' unread' : '') + '.</div></div>' +
    (unread ? '<button class="btn btn-sec btn-sm" data-action="ibreadall">Mark all read</button>' : '') + '</div>';
  const search = '<input class="input" data-ibsearch="1" value="' + escA(F.q || '') + '" placeholder="Search people, titles, text" style="margin:12px 0 10px;font-size:13px">';
  const filters = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:14px"><span class="eyebrow" style="font-size:9px">Source</span><div class="choice">' + srcs.map(schip).join('') + '</div><div style="width:8px"></div><span class="eyebrow" style="font-size:9px">Status</span><div class="choice">' + stats.map(stchip).join('') + '</div></div>';
  const items = !all.length
    ? '<div class="empty">' + ico(IC.msg) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No communications yet</div><div style="font-size:13px;max-width:280px">App reports, PRD reviews, SME input, and client-contact notes all land here - live.</div></div>'
    : !filtered.length ? '<div class="empty">' + ico(IC.msg) + '<div style="font-size:13px">Nothing matches.</div></div>'
    : filtered.map((it) => commCard(APP, it)).join('');
  return '<div class="page" style="max-width:600px">' + header + search + filters + items + '</div>';
}

/* ---------------- feedback (share links + version-filtered list) ---------------- */
function shareRow(APP, kind, title, sub, seq) {
  const share = (APP.shares || []).find((s) => s.kind === kind && s.version_seq === seq && !s.revoked);
  const link = share ? location.origin + location.pathname + '#' + (kind === 'brief' ? 'brief' : 'fb') + '/' + APP.pid + '/' + seq + '/' + share.token : null;
  const isMgr = APP.role === 'manager';
  const secCount = share && Array.isArray(share.sections) ? share.sections.length : null;
  const secLine = kind === 'brief' && link
    ? '<div style="display:flex;align-items:center;gap:8px;margin-top:9px;font-size:11.5px;color:var(--ink-4)">' +
      (secCount ? secCount + ' section' + (secCount === 1 ? '' : 's') + ' shared' : 'All sections shared') +
      (isMgr ? ' · <button data-action="briefpickopen" style="color:var(--brand);font-weight:560;font-size:11.5px">Edit sections</button>' : '') + '</div>'
    : '';
  const createBtn = kind === 'brief'
    ? '<button class="btn btn-sec btn-sm" data-action="briefpickopen">' + ico(IC.link, 'i-sm') + 'Choose sections &amp; create link</button>'
    : '<button class="btn btn-sec btn-sm" data-action="sharepub" data-kind="' + kind + '" data-seq="' + seq + '">' + ico(IC.link, 'i-sm') + 'Create link</button>';
  return '<div class="card" style="padding:16px;margin-bottom:12px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">' + ico(kind === 'brief' ? IC.send : IC.link, 'i-sm') + '<span style="font-size:13px;font-weight:600">' + esc(title) + '</span></div>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-bottom:11px;line-height:1.5">' + esc(sub) + '</div>' +
    (link
      ? '<div style="display:flex;gap:8px;align-items:center"><input class="input" readonly value="' + escA(link) + '" style="flex:1;min-width:0;font-family:var(--mono);font-size:11px;color:var(--ink-3)">' +
        '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">' + ico(IC.copy, 'i-sm') + 'Copy</button>' +
        (isMgr ? '<button class="btn btn-ghost btn-sm" data-action="sharerevoke" data-token="' + escA(share.token) + '">Revoke</button>' : '') + '</div>' + secLine
      : (isMgr ? createBtn : '<div class="hint">No live link. A manager can create one.</div>')) +
    '</div>';
}

function renderFeedback(APP) {
  const versions = APP.versions || [];
  if (!versions.length) {
    return '<div class="page" style="max-width:600px"><div class="empty">' + ico(IC.send) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">Generate a version first</div><div style="font-size:13px;max-width:300px">Feedback links point at a numbered baseline, so reviewers always know what they reviewed.</div></div></div>';
  }
  const seq = APP.fbSeq != null ? APP.fbSeq : versions[versions.length - 1].seq;
  const filterAll = APP.fbSeq === 'all';
  const verSel = '<select class="input" data-action="fbverfilter" style="height:34px;padding:0 10px;width:auto;font-family:var(--mono);font-size:12px">' +
    '<option value="all"' + (filterAll ? ' selected' : '') + '>All versions</option>' +
    versions.slice().reverse().map((v) => '<option value="' + v.seq + '"' + (!filterAll && v.seq === seq ? ' selected' : '') + '>v' + esc(v.label) + '</option>').join('') + '</select>';
  const list = (APP.comms || []).filter((c) => (c.origin === 'app' || c.origin === 'brief') && (filterAll || c.version_seq === seq))
    .sort((a, b) => new Date(lastActivityAt(APP, b)) - new Date(lastActivityAt(APP, a)));
  const cur = versions.find((v) => v.seq === seq);
  const share = (!filterAll && cur)
    ? shareRow(APP, 'brief', 'PRD review link · v' + cur.label, 'A plain-language brief for collaborators. Their review lands in the Inbox and opens a two-way thread - no account needed.', seq) +
      shareRow(APP, 'pilot', 'App testing link · v' + cur.label, 'For people using the build. Bug reports and ideas land in the Inbox against this exact version.', seq) +
      (APP.role === 'manager'
        ? '<div style="display:flex;gap:8px;align-items:center;margin:2px 0 14px"><span class="eyebrow" style="font-size:9px">Deployed build</span>' +
          '<input class="input" data-action="buildset" data-verid="' + escA(cur.id) + '" value="' + escA(cur.build || '') + '" placeholder="e.g. 0.9.4" style="height:32px;flex:1;min-width:0;font-family:var(--mono);font-size:12px"></div>'
        : '')
    : '';
  const pilot = list.filter((x) => x.origin === 'app'), briefs = list.filter((x) => x.origin === 'brief');
  const openCount = list.filter((x) => x.status === 'new' || x.status === 'in_review').length;
  const stat = (l, n) => '<div style="text-align:center;padding:0 16px"><div style="font-size:22px;font-weight:680;letter-spacing:-.02em">' + n + '</div><div class="eyebrow" style="font-size:9px;margin-top:2px">' + esc(l) + '</div></div>';
  const rollup = list.length
    ? '<div class="card" style="padding:16px;margin-bottom:14px"><div style="display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--line);padding-bottom:13px;margin-bottom:12px">' + stat('Total', list.length) + '<div style="width:1px;align-self:stretch;background:var(--line)"></div>' + stat('Open', openCount) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"><span class="pill">From the app ' + pilot.length + '</span><span class="pill">From the brief ' + briefs.length + '</span></div></div>'
    : '';
  const group = (title, sub, arr) => !arr.length ? '' :
    '<div style="margin:16px 2px 9px"><div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:13px;font-weight:620">' + esc(title) + '</span><span style="font-size:11px;color:var(--ink-4)">' + arr.length + '</span></div><div style="font-size:11px;color:var(--ink-4);margin-top:1px">' + esc(sub) + '</div></div>' + arr.map((it) => commCard(APP, it)).join('');
  const items = list.length
    ? group('From the app', 'People using the build', pilot) + group('From the brief', 'Collaborators reviewing the PRD', briefs)
    : '<div class="empty">' + ico(IC.msg) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560">No feedback yet for ' + esc(filterAll ? 'any version' : 'v' + (cur ? cur.label : '')) + '</div></div>';
  return '<div class="page" style="max-width:600px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Feedback</h2>' + verSel + '</div>' +
    share + (share ? '<hr class="sep" style="margin:2px 0 16px">' : '') + rollup + items + '</div>';
}

/* ---------------- notes & input requests ---------------- */
const NRTPL = [
  { l: 'Kickoff input', t: 'Before we spec this, what are the must-haves, the non-negotiables, and the landmines you have seen in your domain?' },
  { l: 'Review the brief', t: 'Please review the summary and tell us what is missing, what is wrong, and what you would add.' },
  { l: 'Risks & edge cases', t: 'What edge cases, risks, or failure modes should the requirements be sure to cover?' }
];

function renderNotes(APP) {
  const isMgr = APP.role === 'manager';
  const notes = (APP.comms || []).filter((c) => c.origin === 'team' || c.origin === 'meeting' || (c.origin === 'sme' && !c.request_id) || c.origin === 'partner')
    .sort((a, b) => new Date(lastActivityAt(APP, b)) - new Date(lastActivityAt(APP, a)));
  const reqs = APP.requests || [];
  const rd = APP.reqDraft || {};
  const base = location.origin + location.pathname;

  const reqItems = reqs.map((q) => {
    const cnt = (APP.comms || []).filter((n) => n.request_id === q.id).length;
    const link = base + '#note/' + APP.pid + '/' + q.token;
    const overdue = q.due && new Date(q.due) < new Date() && !cnt && q.status === 'open';
    return '<div style="border:1px solid var(--line);border-radius:11px;background:var(--bg);padding:12px 13px;margin-top:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0">' +
      '<div style="font-weight:600;font-size:13.5px">' + esc(q.title) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">' + esc(relTime(q.created_at)) + ' · ' + cnt + ' response' + (cnt === 1 ? '' : 's') +
      (q.due ? ' · ' + (overdue ? '<span style="color:var(--bad);font-weight:600">due ' + esc(q.due) + ' (overdue)</span>' : 'due ' + esc(q.due)) : '') + '</div></div>' +
      '<span class="pill' + (q.status === 'closed' ? '' : ' pill-solid') + '">' + (q.status === 'closed' ? 'Closed' : 'Open') + '</span></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><input class="input" readonly value="' + escA(link) + '" style="flex:1;min-width:0;font-family:var(--mono);font-size:11px;color:var(--ink-3);height:32px">' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">' + ico(IC.copy, 'i-sm') + 'Copy</button></div>' +
      (isMgr ? '<div style="display:flex;gap:6px;align-items:center;margin-top:8px"><button class="btn btn-ghost btn-sm" data-action="nrclose" data-id="' + escA(q.id) + '" style="font-size:12px">' + (q.status === 'closed' ? 'Reopen' : 'Close') + '</button><div style="flex:1"></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="nrdelete" data-id="' + escA(q.id) + '" style="font-size:12px;color:' + (APP.reqDel === q.id ? 'var(--bad)' : 'var(--ink-4)') + '">' + (APP.reqDel === q.id ? 'Confirm delete' : 'Delete') + '</button></div>' : '') +
      '</div>';
  }).join('');

  let engage;
  if (rd.open && isMgr) {
    engage = '<div class="card" style="padding:18px;margin-bottom:18px;border:1px solid var(--sky-2);background:var(--sky)">' +
      '<div style="font-size:14px;font-weight:660;margin-bottom:12px">New input request</div>' +
      '<div class="fldlabel" style="margin-top:0">Title</div><input class="input" data-nr="title" value="' + escA(rd.title || '') + '" placeholder="e.g. E-signature flow: must-haves and landmines">' +
      '<div class="eyebrow" style="font-size:9px;margin:12px 0 5px">Start from a template</div><div class="choice">' + NRTPL.map((t, ix) => '<button class="chip chip-sm" data-action="nrtpl" data-ix="' + ix + '">' + esc(t.l) + '</button>').join('') + '</div>' +
      '<div class="fldlabel">Your prompt or opening question</div><textarea class="input" data-nr="prompt" rows="4" placeholder="What you want them to weigh in on. This is what they will see." style="resize:vertical;min-height:90px;line-height:1.55">' + esc(rd.prompt || '') + '</textarea>' +
      '<div class="fldlabel">Due date (optional)</div><input class="input" type="date" data-nr="due" value="' + escA(rd.due || '') + '">' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-ghost btn-sm" data-action="nrcancel">Cancel</button><button class="btn btn-primary btn-sm" data-action="nrsave">Create request</button></div>' +
      (rd.error ? '<div style="color:var(--bad);font-size:12px;margin-top:8px;text-align:right;font-weight:540">' + esc(rd.error) + '</div>' : '') + '</div>';
  } else {
    engage = '<div class="card" style="padding:16px 18px;margin-bottom:18px;border:1px solid var(--sky-2);background:var(--sky)">' +
      '<div style="display:flex;align-items:flex-start;gap:13px"><div style="width:40px;height:40px;border-radius:11px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + ico(IC.send) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:660;letter-spacing:-.01em">Request input from an SME</div>' +
      '<div style="font-size:12.5px;color:var(--ink-3);margin-top:3px;line-height:1.5">Send a link - no account needed on their side. Their responses land in the Inbox and open a live two-way thread.</div></div>' +
      (isMgr ? '<button class="btn btn-primary btn-sm" data-action="nropen" style="flex:0 0 auto">' + ico(IC.plus, 'i-sm') + 'New request</button>' : '') + '</div>' +
      reqItems + '</div>';
  }

  const src = APP.noteSrc || 'team';
  const srcChip = (val, label) => '<button class="chip chip-sm' + (src === val ? ' on' : '') + '" data-action="notesrc" data-val="' + val + '">' + label + '</button>';
  const composer = '<div style="border:1px solid var(--line);border-radius:12px;background:var(--bg);padding:13px 14px;margin-bottom:18px">' +
    '<textarea class="input" data-notedraft="1" rows="2" placeholder="Jot a note, or capture what an SME told you." style="font-size:13px;resize:vertical;min-height:46px;line-height:1.5">' + esc(APP.noteDraft || '') + '</textarea>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:9px"><span class="eyebrow" style="font-size:9px">Source</span><div class="choice">' + srcChip('team', 'Me') + srcChip('sme', 'SME') + srcChip('meeting', 'Meeting') + '</div>' +
    (src !== 'team' ? '<input class="input" data-noteby="1" value="' + escA(APP.noteBy || '') + '" placeholder="Contributed by" style="height:32px;width:150px;font-size:12px">' : '') +
    '<div style="flex:1"></div><button class="btn btn-primary btn-sm" data-action="noteadd">Save note</button></div></div>';

  const items = notes.length ? notes.map((it) => commCard(APP, it)).join('')
    : '<div class="empty">' + ico(IC.msg) + '<div style="font-size:13px">No notes yet.</div></div>';

  return '<div class="page" style="max-width:600px"><div style="margin-bottom:16px"><h2 style="font-size:19px;font-weight:680;letter-spacing:-0.01em;margin:0">Notes &amp; Input</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Capture notes, gather SME input through tokened links, and promote anything into the PRD when it is ready.</div></div>' +
    engage + composer + items + '</div>';
}

/* ---------------- discovery ---------------- */
function renderDiscovery(APP, a) {
  const isMgr = APP.role === 'manager';
  const eng = isEngagement(a || {});
  const q = (APP.discQ || '').toLowerCase();
  const d = APP.discDraft || {};
  const list = (APP.discovery || []).filter((e) => {
    if (!q) return true;
    return [e.takeaway, e.notes, e.context, e.heard, e.decided, e.open_questions, e.tags, e.who, e.source, e.author_name, e.links]
      .join(' \n ').toLowerCase().includes(q);
  });
  const composer = isMgr
    ? '<div class="card" style="padding:16px;margin-bottom:16px">' +
      '<div style="font-size:13.5px;font-weight:620;margin-bottom:10px">Log a discovery entry</div>' +
      '<textarea class="input" data-disc="takeaway" rows="2" placeholder="The takeaway - the one thing worth remembering" style="resize:vertical;min-height:48px;line-height:1.5;margin-bottom:9px">' + esc(d.takeaway || '') + '</textarea>' +
      '<textarea class="input" data-disc="notes" rows="2" placeholder="Detail, quotes, what was heard (optional)" style="resize:vertical;min-height:44px;line-height:1.5;margin-bottom:9px">' + esc(d.notes || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      '<input class="input" data-disc="who" value="' + escA(d.who || '') + '" placeholder="Who said it" style="flex:1;min-width:130px;height:36px;font-size:12.5px">' +
      '<input class="input" data-disc="source" value="' + escA(d.source || '') + '" placeholder="Source (interview, ticket…)" style="flex:1;min-width:130px;height:36px;font-size:12.5px">' +
      '<input class="input" data-disc="tags" value="' + escA(d.tags || '') + '" placeholder="Tags, comma-separated" style="flex:1;min-width:130px;height:36px;font-size:12.5px"></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary btn-sm" data-action="discadd">Add entry</button></div></div>'
    : '';
  const items = list.length ? list.map((e) => {
    const open = !!APP.openDisc[e.id];
    // One-click promotion mirrors the inbox: an entry becomes a numbered FR or
    // DEC, keeps a back-link, and the promote buttons retire. An engagement
    // has no functional-requirements section, so it offers only the decision.
    const promote = (isMgr && !e.promoted_to)
      ? ((eng ? '' : '<button class="btn btn-sec btn-sm" data-action="discfr" data-id="' + escA(e.id) + '">' + ico(IC.arrow, 'i-sm') + 'To requirement</button>') +
        '<button class="btn btn-sec btn-sm" data-action="discdec" data-id="' + escA(e.id) + '">' + ico(IC.check, 'i-sm') + 'To decision</button>')
      : '';
    return '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden">' +
      '<div data-action="disctoggle" data-id="' + escA(e.id) + '" style="cursor:pointer;padding:13px 15px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      '<div style="min-width:0"><div style="font-weight:600;font-size:13.5px;line-height:1.4' + (open ? '' : ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap') + '">' + esc(e.takeaway || '(no takeaway)') + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">' + esc([e.who, e.source, relTime(e.created_at)].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">' +
      (e.promoted_to ? '<span class="pill">Promoted to ' + esc(e.promoted_to) + '</span>' : '') +
      (e.tags ? e.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3).map((t) => '<span class="pill">' + esc(t) + '</span>').join('') : '') + '</div></div>' +
      (open ? '<div style="padding:0 15px 14px;border-top:1px solid var(--line)">' +
        (e.notes ? '<div style="padding-top:11px;font-size:12.5px;color:var(--ink-2);line-height:1.55;white-space:pre-wrap">' + esc(e.notes) + '</div>' : '') +
        (e.links ? '<div style="margin-top:8px;font-size:12px;color:var(--ink-3)">Links: ' + esc(e.links) + '</div>' : '') +
        (isMgr ? '<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:10px">' + promote +
          '<button class="btn btn-ghost btn-sm" data-action="discdel" data-id="' + escA(e.id) + '" style="color:' + (APP.discDel === e.id ? 'var(--bad)' : 'var(--ink-4)') + '">' + (APP.discDel === e.id ? 'Confirm delete' : 'Delete') + '</button></div>' : '') +
        '</div>' : '') +
      '</div>';
  }).join('') : '<div class="empty">' + ico(IC.spark) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No discovery yet</div><div style="font-size:13px;max-width:300px">Interview takeaways, decisions, and open questions live here - the evidence base under the requirements.</div></div>';
  return '<div class="page" style="max-width:600px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">' +
    '<h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Discovery</h2>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink-3)"><input type="checkbox" data-action="discexport"' + (APP.project && APP.project.disc_export ? ' checked' : '') + (isMgr ? '' : ' disabled') + '> include in exports</label></div>' +
    '<input class="input" data-discsearch="1" value="' + escA(APP.discQ || '') + '" placeholder="Search takeaways, people, tags" style="margin-bottom:12px;font-size:13px">' +
    composer + items + '</div>';
}

/* ---------------- people ---------------- */
function renderPeople(APP) {
  const by = {}, order = [];
  (APP.comms || []).forEach((it) => {
    const key = (it.author_name || 'Anonymous') + '|' + it.origin;
    if (!by[key]) { by[key] = { person: it.author_name || 'Anonymous', origin: it.origin, items: [], last: it.created_at }; order.push(key); }
    by[key].items.push(it);
    if (new Date(it.created_at) > new Date(by[key].last)) by[key].last = it.created_at;
  });
  const rows = order.length ? order.map((k) => {
    const g = by[k];
    const unread = g.items.filter((it) => EXTERNAL[it.origin] && !APP.reads[it.id]).length;
    const open = g.items.filter((it) => it.status === 'new' || it.status === 'in_review').length;
    return '<button class="card" data-action="peoplejump" data-q="' + escA(g.person) + '" style="display:block;width:100%;text-align:left;margin-bottom:8px;padding:13px 15px;cursor:pointer">' +
      '<div style="display:flex;align-items:center;gap:11px"><span class="umav" style="background:' + srcColor(g.origin) + '">' + esc(initials(g.person)) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + esc(g.person) + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-4)">' + esc(ORIGIN_LABEL[g.origin] || g.origin) + ' · ' + g.items.length + ' message' + (g.items.length === 1 ? '' : 's') + ' · last ' + esc(relTime(g.last)) + '</div></div>' +
      (unread ? '<span class="pill pill-brand">' + unread + ' new</span>' : '') + (open ? '<span class="pill">' + open + ' open</span>' : '') + '</div></button>';
  }).join('') : '<div class="empty">' + ico(IC.users) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No contributors yet</div><div style="font-size:13px;max-width:280px">Everyone who sends feedback or notes appears here, with their full history.</div></div>';
  return '<div class="page" style="max-width:600px"><div style="margin-bottom:14px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">People</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Everyone who has contributed to this PRD. Tap a person to filter the Inbox.</div></div>' + rows + '</div>';
}

/* ---------------- access hub ----------------
   One page that answers: who can reach this project, through which door,
   and what can they do. Organized by audience, not by artifact. */
function renderAccess(APP) {
  const base = location.origin + location.pathname;
  const isMgr = APP.role === 'manager';
  const acc = APP.access || { members: [], partners: [] };
  const latest = (APP.versions || []).length ? APP.versions[APP.versions.length - 1] : null;

  const section = (iconPath, bg, color, title, sub, body) =>
    '<div class="acc-sec"><div class="acc-head"><div class="acc-ic" style="background:' + bg + ';color:' + color + '">' + ico(iconPath, 'i-sm') + '</div><h3>' + title + '</h3></div>' +
    '<p class="acc-sub">' + sub + '</p>' + body + '</div>';

  /* 1 - the team (workspace-wide) */
  const managers = acc.members.filter((m) => m.role === 'manager').length;
  const viewers = acc.members.filter((m) => m.role === 'viewer').length;
  const teamBody = '<div class="acc-row" style="border-top:none;padding-top:2px">' +
    '<span style="flex:1;font-size:13px;color:var(--ink-2)">' +
    (acc.members.length ? acc.members.length + ' teammate' + (acc.members.length === 1 ? '' : 's') +
      ' <span style="color:var(--ink-4)">(' + managers + ' edit' + (viewers ? ', ' + viewers + ' read and reply' : '') + ')</span>'
      : 'Teammates share every project in this workspace.') + '</span>' +
    (isMgr ? '<button class="btn btn-sec btn-sm" data-action="orgopen">' + ico(IC.users, 'i-sm') + 'Manage team</button>' : '') + '</div>';

  /* 2 - partners (this project) */
  const pRows = (acc.partners || []).map((p) => {
    const has = !!p.acc[APP.pid];
    return '<div class="acc-row">' +
      '<span class="umav" style="background:var(--purple);width:26px;height:26px;font-size:10.5px">' + esc(initials(p.name || p.email)) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:560;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.name || p.email) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-4)">' + esc(p.email) + '</div></div>' +
      (isMgr
        ? '<button class="chip chip-sm' + (has ? ' on' : '') + '" data-action="accgrant" data-id="' + escA(p.id) + '" data-has="' + (has ? '1' : '') + '">' + (has ? 'Has access' : 'No access') + '</button>'
        : '<span class="pill' + (has ? ' pill-solid' : '') + '">' + (has ? 'Has access' : 'No access') + '</span>') +
      '</div>';
  }).join('');
  const pAdd = isMgr
    ? '<div class="acc-row"><input class="input" id="accPName" placeholder="Name" style="height:34px;font-size:12.5px;flex:1;min-width:90px">' +
      '<input class="input" id="accPEmail" type="email" placeholder="email@client.com" style="height:34px;font-size:12.5px;flex:1.4;min-width:140px">' +
      '<button class="btn btn-primary btn-sm" data-action="accpadd">Add + grant</button></div>'
    : '';
  const partnersBody = (pRows || '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">' +
    (isMgr ? 'No client contacts yet. Add one below; they sign in with their email.' : 'No client contacts yet.') + '</span></div>') + pAdd;

  /* 3 - guest links for the latest version */
  const guestBody = latest
    ? shareRow(APP, 'brief', 'PRD review · v' + latest.label, 'A plain-language brief. Reviews land in the Inbox and open a two-way thread - no account on their side.', latest.seq) +
      shareRow(APP, 'pilot', 'App testing · v' + latest.label, 'For people using the build. Reports land in the Inbox against this exact version.', latest.seq)
    : '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">Generate a version first - guest links always point at a numbered baseline.</span></div>';

  /* 4 - input requests */
  const reqRows = (APP.requests || []).map((r) => {
    const link = base + '#note/' + APP.pid + '/' + r.token;
    const cnt = (APP.comms || []).filter((c) => c.request_id === r.id).length;
    return '<div class="acc-row" style="flex-wrap:wrap">' +
      '<div style="flex:1;min-width:150px"><div style="font-size:13px;font-weight:560">' + esc(r.title) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-4)">' + cnt + ' response' + (cnt === 1 ? '' : 's') + ' · ' + esc(relTime(r.created_at)) + (r.due ? ' · due ' + esc(r.due) : '') + '</div></div>' +
      '<span class="pill' + (r.status === 'closed' ? '' : ' pill-solid') + '">' + (r.status === 'closed' ? 'Closed' : 'Live') + '</span>' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">' + ico(IC.copy, 'i-sm') + 'Copy</button>' +
      (isMgr ? '<button class="btn btn-ghost btn-sm" data-action="nrclose" data-id="' + escA(r.id) + '">' + (r.status === 'closed' ? 'Reopen' : 'Revoke') + '</button>' : '') +
      '</div>';
  }).join('');
  const reqBody = (reqRows || '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">No requests yet. Ask a specific question, send the link, and the answers thread back here.</span></div>') +
    (isMgr ? '<div class="acc-row"><button class="btn btn-sec btn-sm" data-action="accnewreq">' + ico(IC.plus, 'i-sm') + 'New input request</button></div>' : '');

  /* 5 - older links still live */
  const older = (APP.shares || []).filter((s) => !s.revoked && s.kind !== 'note' && (!latest || s.version_seq !== latest.seq));
  const olderBody = older.length ? older.map((s) => {
    const v = (APP.versions || []).find((x) => x.seq === s.version_seq);
    const link = base + '#' + (s.kind === 'brief' ? 'brief' : 'fb') + '/' + APP.pid + '/' + s.version_seq + '/' + s.token;
    return '<div class="acc-row"><span style="flex:1;font-size:12.5px;color:var(--ink-2)">' + (s.kind === 'brief' ? 'PRD review' : 'App testing') + ' · ' + (v ? 'v' + esc(v.label) : 'v?') + '</span>' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">Copy</button>' +
      (isMgr ? '<button class="btn btn-ghost btn-sm" data-action="sharerevoke" data-token="' + escA(s.token) + '">Revoke</button>' : '') + '</div>';
  }).join('') : '';

  /* 0 - brand on the shared PRD (what partners/SMEs see, and what prints) */
  const proj = APP.project || {};
  // Only render a logo that is a real image data URI, matching the external
  // surfaces (views-external okLogo, exports ok). Defense in depth: brand_logo is
  // manager-written and size-capped, but the preview should never emit a non-image src.
  const logoOk = typeof proj.brand_logo === 'string' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(proj.brand_logo);
  const brandPreview = proj.brand_logo
    ? '<div class="acc-row" style="border-top:none;align-items:center">' +
      (logoOk ? '<img src="' + escA(proj.brand_logo) + '" alt="brand" style="max-height:44px;max-width:180px;object-fit:contain;border:1px solid var(--line);border-radius:8px;padding:6px;background:#fff">' : '') +
      '<div style="flex:1;min-width:0"><input class="input" id="brandLabel" value="' + escA(proj.brand_label || '') + '" placeholder="Collaborator name (optional)" style="height:34px;font-size:12.5px"' + (isMgr ? '' : ' readonly') + '></div>' +
      (isMgr ? '<button class="btn btn-sec btn-sm" data-action="brandlabelsave">Save name</button><button class="btn btn-ghost btn-sm" data-action="brandremove">Remove</button>' : '') +
      '</div>'
    : '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">' +
      (isMgr ? 'No logo yet. Add the collaborator’s logo; it appears on the brief they see and on the printed PDF.' : 'No collaborator logo set.') + '</span>' +
      (isMgr ? '<div style="flex:1"></div><button class="btn btn-sec btn-sm" data-action="brandpick">' + ico(IC.plus, 'i-sm') + 'Upload logo</button>' : '') + '</div>';
  const brandBody = brandPreview +
    (isMgr && proj.brand_logo ? '<div class="acc-row"><span style="flex:1;font-size:11.5px;color:var(--ink-4)">Shown to client contacts and SMEs on the shared PRD, and on every printed or Word export.</span><button class="btn btn-ghost btn-sm" data-action="brandpick">Replace</button></div>' : '') +
    (isMgr ? '<input type="file" id="brandFile" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="display:none">' : '');

  /* SME workspaces - one durable personal link per expert (this project) */
  const seats = APP.smeSeats || [];
  const smeRows = seats.map((s) => {
    const link = base + '#sme/' + s.reply_token;
    return '<div class="acc-row">' +
      '<span class="umav" style="background:var(--teal);width:26px;height:26px;font-size:10.5px">' + esc(initials(s.name || s.email)) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:560;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.name || s.email) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-4)">' + esc(s.email) + ' · ' + (s.replies || 0) + ' repl' + (s.replies === 1 ? 'y' : 'ies') + '</div></div>' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">' + ico(IC.copy, 'i-sm') + 'Copy link</button>' +
      '</div>';
  }).join('');
  const smeAdd = isMgr
    ? '<div class="acc-row"><input class="input" id="smeName" placeholder="Name" style="height:34px;font-size:12.5px;flex:1;min-width:90px">' +
      '<input class="input" id="smeEmail" type="email" placeholder="expert@domain.com" style="height:34px;font-size:12.5px;flex:1.4;min-width:140px">' +
      '<button class="btn btn-primary btn-sm" data-action="smeseat">Create link</button></div>'
    : '';
  const smeBody = (smeRows || '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">' +
    (isMgr ? 'No SME workspaces yet. Add an expert to mint their durable link - one place they return to, with the PRD and one continuous thread, across every version.' : 'No SME workspaces yet.') + '</span></div>') + smeAdd;

  /* Files partners and SMEs have attached (this project) */
  const files = (APP.attachments || []).slice().reverse();
  const filesBody = files.length
    ? files.map((a) =>
        '<div class="acc-row">' + ico(IC.file, 'i-sm') +
        '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:560;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.file_name) + '</div>' +
        '<div style="font-size:11px;color:var(--ink-4)">' + esc(a.uploader_name || a.uploader_kind) + ' · ' + fmtBytes(a.size_bytes) + ' · ' + esc(relTime(a.created_at)) +
        (a.scan_status === 'error' ? ' · <span style="color:var(--amber)">scan failed</span>' : '') + '</div></div>' +
        '<button class="btn btn-sec btn-sm" data-action="dlattach" data-path="' + escA(a.storage_path) + '">' + ico(IC.download, 'i-sm') + 'Download</button></div>').join('')
    : '<div class="acc-row" style="border-top:none"><span style="font-size:12.5px;color:var(--ink-4)">No files yet. Client contacts and seated SMEs can attach documents to their notes - virus-scanned on the way in, they land here and on the thread.</span></div>';

  return '<div class="page" style="max-width:640px">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:16px">' +
    '<div><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Access</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Everyone outside this window reaches the project through what is below. Grants and revocations take effect immediately.</div></div>' +
    (isMgr ? '<button class="btn btn-primary btn-sm" data-action="shareopen" style="flex:0 0 auto">' + ico(IC.send, 'i-sm') + 'Share…</button>' : '') + '</div>' +
    section(IC.eye, 'var(--bg-3)', 'var(--ink)', 'Read-only presentation link', 'A fixed, branded, view-only page of the latest published version. No account and no review form - the link to send when someone just needs to see the record.',
      '<div class="acc-row" style="border-top:none"><span style="flex:1;font-size:12.5px;color:var(--ink-4)">' +
      (latest ? 'Points at v' + esc(latest.label) + '. Anyone with the link can view; nobody can edit.' : 'Generate a version first.') + '</span>' +
      '<button class="btn btn-sec btn-sm" data-action="copypresent"' + (latest ? '' : ' disabled') + '>' + ico(IC.link, 'i-sm') + 'Copy link</button></div>') +
    section(IC.doc, 'var(--bg-3)', 'var(--ink)', 'Brand on the shared PRD', 'Assign the collaborator’s logo to this PRD. It appears when a client contact or SME views the brief, and on the printed and Word exports.', brandBody) +
    section(IC.users, 'var(--sky)', 'var(--brand)', 'Your team', 'Sign in with accounts. Managers edit the document; Viewers read everything and reply in threads.', teamBody) +
    section(IC.user, '#f1ebfd', 'var(--purple)', 'Client contacts', 'The client-side portal role. They sign in with their email and see only the published brief of projects granted here.', partnersBody) +
    section(IC.msg, '#e6f7fb', 'var(--teal)', 'SME workspaces', 'A durable personal link per expert: the branded PRD plus one continuous thread that stays put across every version. No account, no lost bookmarks - the same link always reopens their conversation.', smeBody) +
    section(IC.clip, 'var(--bg-3)', 'var(--ink)', 'Files from reviewers', 'Documents client contacts and SMEs attach to their notes. Download here or from the thread. Files are virus-scanned when a scanner is configured; a “scan failed” flag means one was set but unreachable.', filesBody) +
    section(IC.send, '#e6f7fb', 'var(--teal)', 'Review &amp; testing links', 'No account needed. Each recipient gets a private thread back to your inbox. Anyone with the link can respond, so share deliberately.', guestBody) +
    section(IC.msg, 'var(--amber-bg)', 'var(--amber)', 'Input requests', 'Ask SMEs a specific question before or after the PRD exists. Responses land in the Inbox, linked to the request.', reqBody) +
    (olderBody ? section(IC.hist, 'var(--bg-3)', 'var(--ink-3)', 'Older links still live', 'Links for earlier versions that were never revoked.', olderBody) : '') +
    '</div>';
}

/* ---------------- versions + approvals ---------------- */
function renderVersions(APP) {
  if (!APP.versions.length) return '<div class="empty">' + ico(IC.hist) + '<div style="font-size:13px">No versions yet.</div></div>';
  const isMgr = APP.role === 'manager';
  const meId = APP.user && APP.user.id;
  const members = APP.members || [];
  const memOpts = members.map((m) => {
    const nm = (m.display_name && m.display_name.trim()) || m.email || 'Teammate';
    return '<option value="' + escA(m.user_id) + '" data-name="' + escA(nm) + '">' + esc(nm) + '</option>';
  }).join('');
  const items = APP.versions.slice().reverse().map((v) => {
    const on = APP.viewSeq === v.seq;
    const apprs = APP.approvals[v.id] || [];
    const transitions = { draft: ['in_review'], in_review: ['approved', 'changes_requested', 'draft'], changes_requested: ['in_review'], approved: ['in_review'] };
    const tbtns = isMgr ? (transitions[v.status] || []).map((t) =>
      '<button class="btn btn-sec btn-sm" data-action="vstatus" data-id="' + escA(v.id) + '" data-val="' + t + '" style="font-size:11.5px">' +
      ({ in_review: 'Send for review', approved: 'Approve', changes_requested: 'Request changes', draft: 'Back to draft' })[t] + '</button>').join('') : '';
    const apprRows = apprs.map((ap) => {
      const mineSlot = ap.approver_user_id && meId && ap.approver_user_id === meId;
      const canDecide = ap.status === 'pending' && (isMgr || mineSlot);
      // How this slot resolves: an assigned teammate can self-approve; a name-only
      // slot is a manual sign-off a manager records.
      const tag = mineSlot ? '<span style="color:var(--brand);font-weight:600"> · you</span>'
        : (ap.sign_request_id ? '<span style="color:var(--ink-4)"> · e-signed</span>'
          : ap.approver_user_id ? '' : '<span style="color:var(--ink-4)"> · manual</span>');
      return '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid var(--line);font-size:12.5px">' +
        '<span class="stchip ' + esc(ap.status === 'pending' ? 'draft' : ap.status) + '" style="height:20px;font-size:10px">' + esc(ap.status === 'pending' ? 'Pending' : STATUS_LABEL[ap.status]) + '</span>' +
        '<span style="flex:1;min-width:0"><strong>' + esc(ap.approver_role || 'Approver') + '</strong>' + (ap.approver_name ? ' - ' + esc(ap.approver_name) : '') + tag +
        (ap.comment ? '<span style="color:var(--ink-4)"> · ' + esc(ap.comment) + '</span>' : '') + '</span>' +
        (mineSlot && ap.status === 'pending' ? '<span class="stchip" style="height:20px;font-size:10px;background:var(--brand);color:#fff">Waiting on you</span>' : '') +
        (canDecide ? '<button class="btn btn-ghost btn-sm" data-action="apprdecide" data-id="' + escA(ap.id) + '" data-val="approved" style="font-size:11px;color:var(--good)">Approve</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="apprdecide" data-id="' + escA(ap.id) + '" data-val="changes_requested" style="font-size:11px;color:var(--amber)">Changes</button>' : '') +
        (isMgr ? '<button class="icobtn" data-action="apprdel" data-id="' + escA(ap.id) + '" style="width:26px;height:26px">' + ico(IC.close, 'i-sm') + '</button>' : '') + '</div>';
    }).join('');
    // On draft / in-review versions: assign teammates or add manual slots.
    // On APPROVED versions: recording a sign-off is still legal and honest -
    // the provenance trigger stamps who recorded it and when - so the health
    // warning about a nameless approval is fixable exactly where it points.
    // Teammate assignment is hidden there: a pending slot on an approved
    // baseline never appears in anyone's waiting-on-you feed.
    const isApproved = v.status === 'approved';
    const addAppr = isMgr
      ? '<div style="margin-top:8px"><div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (!isApproved && memOpts ? '<select class="input" id="apr-user-' + escA(v.id) + '" style="height:32px;font-size:12px;flex:1;min-width:130px"><option value="">Assign a teammate…</option>' + memOpts + '</select>' : '') +
        '<input class="input" id="apr-role-' + escA(v.id) + '" placeholder="Role (e.g. Sponsor)" style="height:32px;font-size:12px;flex:1;min-width:120px">' +
        '<input class="input" id="apr-name-' + escA(v.id) + '" placeholder="' + (isApproved ? 'Signer\u2019s name' : 'or type a name') + '" style="height:32px;font-size:12px;flex:1;min-width:110px">' +
        '<button class="btn btn-sec btn-sm" data-action="' + (isApproved ? 'apprrecord' : 'appradd') + '" data-id="' + escA(v.id) + '">' + (isApproved ? 'Record sign-off' : 'Add') + '</button></div>' +
        '<div class="hint" style="font-size:10.5px;margin-top:5px">' + (isApproved
          ? 'This baseline is already approved. Recording adds a named sign-off as evidence - stamped to whoever records it, at the time it is recorded - and the health warning clears the moment it lands.'
          : 'Assign a teammate: they see a waiting on you flag in the app and can approve their own sign-off. Or type a name to record a manual sign-off yourself.') + '</div></div>' : '';
    // E-sign v1: token-keyed signature requests on this exact baseline. The
    // signature lands as an approval row above; this panel is the request
    // lifecycle - who was asked, when, what happened, and the archive link.
    const signs = (APP.signs || {})[v.id] || [];
    const signLink = (t) => location.origin + location.pathname + '#sign/' + t;
    const signRows = signs.map((sg) => {
      const chip = sg.status === 'signed' ? '<span class="stchip approved" style="height:20px;font-size:10px">Signed</span>'
        : sg.status === 'declined' ? '<span class="stchip changes_requested" style="height:20px;font-size:10px">Declined</span>'
        // "Sent" asserted a delivery that may never have happened: email is
        // best-effort and the link is often only copied. The status row is
        // the honest fact - the request exists and awaits the signer.
        : '<span class="stchip draft" style="height:20px;font-size:10px">Awaiting signature</span>';
      return '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid var(--line);font-size:12.5px">' +
        chip + '<span style="flex:1;min-width:0"><strong>' + esc(sg.signer_email) + '</strong>' +
        (sg.signer_role ? ' · ' + esc(sg.signer_role) : '') +
        (sg.status === 'signed' ? '<span style="color:var(--ink-4)"> · signed ' + esc(fmtDate(sg.signed_at)) + ' as ' + esc(sg.signed_name) + '</span>'
          : sg.status === 'declined' ? (sg.decline_reason ? '<span style="color:var(--ink-4)"> · ' + esc(sg.decline_reason) + '</span>' : '')
          : '<span style="color:var(--ink-4)"> · requested ' + esc(fmtDate(sg.sent_at)) + '</span>') + '</span>' +
        '<a class="btn btn-ghost btn-sm" href="' + escA(signLink(sg.token)) + '" target="_blank" rel="noopener" style="font-size:11px">' + (sg.status === 'signed' ? 'Receipt' : 'Open') + '</a>' +
        '<button class="btn btn-ghost btn-sm" data-action="signcopy" data-token="' + escA(sg.token) + '" style="font-size:11px">Copy link</button>' +
        (isMgr && sg.status === 'pending' ? '<button class="btn btn-ghost btn-sm" data-action="signmail" data-id="' + escA(sg.id) + '" style="font-size:11px">Email again</button>' +
          '<button class="icobtn" data-action="signrevoke" data-id="' + escA(sg.id) + '" title="Revoke this link" style="width:26px;height:26px">' + ico(IC.close, 'i-sm') + '</button>' : '') +
        '</div>';
    }).join('');
    const signForm = isMgr
      ? '<div style="margin-top:8px"><div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<input class="input" id="sig-email-' + escA(v.id) + '" placeholder="Signer\u2019s email" style="height:32px;font-size:12px;flex:1.4;min-width:150px">' +
        '<input class="input" id="sig-name-' + escA(v.id) + '" placeholder="Name (optional)" style="height:32px;font-size:12px;flex:1;min-width:100px">' +
        '<input class="input" id="sig-role-' + escA(v.id) + '" placeholder="Role (e.g. Sponsor)" style="height:32px;font-size:12px;flex:1;min-width:110px">' +
        '<button class="btn btn-sec btn-sm" data-action="signsend" data-id="' + escA(v.id) + '" data-seq="' + v.seq + '"' + (APP.signSendBusy ? ' disabled' : '') + '>' + (APP.signSendBusy ? 'Sending…' : 'Request signature') + '</button></div>' +
        '<div class="hint" style="font-size:10.5px;margin-top:5px">Sends a private link to sign this exact baseline. The signature lands above as a named sign-off with a timestamp and audit trail, and the link stays live as the signer\u2019s archive copy. Recorded e-signature; cryptographic sealing is the next phase.</div></div>'
      : '';
    const signPanel = (signRows || signForm)
      ? '<div style="border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:9px;background:var(--bg)">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (signRows ? '2px' : '0') + '"><span class="eyebrow" style="font-size:9px">Signatures</span></div>' +
        signRows + signForm + '</div>'
      : '';
    return '<div class="tl-item' + (on ? ' hot' : '') + '">' +
      '<button data-action="viewver" data-seq="' + v.seq + '" style="text-align:left;display:block;width:100%">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="mono" style="font-size:14px;font-weight:600">v' + esc(v.label) + '</span>' +
      '<span class="stchip ' + esc(v.status) + '">' + esc(STATUS_LABEL[v.status]) + '</span>' +
      (on ? '<span class="pill pill-solid">viewing</span>' : '') + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">' + esc(fmtDate(v.created_at)) + (v.author_name ? ' · ' + esc(v.author_name) : '') + (v.build ? ' · build ' + esc(v.build) : '') + '</div>' +
      (v.note ? '<div style="font-size:12.5px;color:var(--ink-2);margin-top:2px">' + esc(v.note) + '</div>' : '') + '</button>' +
      // The baseline fingerprint: computed on demand from the stored snapshot
      // (SHA-256 over canonical JSON of {label, seq, snapshot}), shown truncated,
      // full value copied. Identifies the exact baseline; it is not a signature.
      '<div style="margin-top:6px"><button class="btn btn-ghost btn-sm mono" data-action="vfinger" data-id="' + escA(v.id) + '" data-seq="' + v.seq + '" title="Compute and copy the SHA-256 baseline fingerprint" style="font-size:10.5px;height:24px;padding:0 8px;color:var(--ink-4)">' +
      ((APP.fingers || {})[v.id] ? esc(fmtFingerprint(APP.fingers[v.id])) + ' · copied' : 'Fingerprint') + '</button></div>' +
      ((apprRows || addAppr || tbtns) ? '<div style="border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:9px;background:var(--bg)">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:' + (apprRows || addAppr ? '7px' : '0') + '"><span class="eyebrow" style="font-size:9px">Approval workflow</span><div style="flex:1"></div>' + tbtns + '</div>' +
        apprRows + addAppr + '</div>' : '') + signPanel +
      '</div>';
  }).join('');
  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 6px">Version history</h2>' +
    '<p class="hint" style="margin:0 0 18px">Baselines are immutable. Send for review moves a version to In review and lets you add approvers. Assign a teammate and they get a waiting on you flag in the app (no email) and can approve their own sign-off; or record a manual sign-off yourself. A version cannot be marked Approved while any approver is still pending.</p>' +
    '<div class="tl">' + items + '</div></div>';
}

/* ---------------- record health ----------------
   Read-only, derived, never stored: readiness signals over the working draft
   plus counts of what the record already holds. Both computations live in
   health.js (pure, unit-tested); this view only renders them. */
function renderHealth(APP, a) {
  // The latest approved baseline's answers, when its snapshot happens to be
  // loaded (snapshots load lazily per version). Absent, the incorporated
  // count simply stays quiet - never guessed from the working draft.
  const lastApproved = [...APP.versions].filter((v) => v.status === 'approved').sort((x, y) => x.seq - y.seq).pop();
  const approvedSnap = lastApproved && APP.snapshots && APP.snapshots[lastApproved.seq];
  const ctx = { versions: APP.versions, approvalsByVersion: APP.approvals, shares: APP.shares, comms: APP.comms, discovery: APP.discovery,
    latestApprovedAnswers: approvedSnap ? (approvedSnap.snapshot.answers || null) : null };
  const signals = healthSignals(a, ctx);
  const counts = recordCounts(a, ctx);
  const eng = isEngagement(a || {});

  const dot = (lvl) => '<span style="width:8px;height:8px;border-radius:50%;background:' + (lvl === 'gap' ? 'var(--bad)' : 'var(--amber)') + ';flex:0 0 auto;margin-top:5px"></span>';
  const sigRows = signals.map((s) =>
    '<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line);align-items:flex-start">' + dot(s.level) +
    '<div style="min-width:0"><div style="font-size:13px;font-weight:600">' + esc(s.label) +
    (s.count > 1 ? ' <span class="mono" style="font-size:11px;color:var(--ink-4)">×' + s.count + '</span>' : '') + '</div>' +
    '<div style="font-size:12px;color:var(--ink-3);line-height:1.5;margin-top:2px">' + esc(s.detail) + '</div></div></div>').join('');
  const readiness = '<div class="card" style="padding:16px 18px;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (signals.length ? '4px' : '0') + '">' +
    '<div style="font-size:14px;font-weight:640">Baseline readiness</div><div style="flex:1"></div>' +
    (signals.length
      ? '<span class="pill">' + signals.filter((s) => s.level === 'gap').length + ' gap' + (signals.filter((s) => s.level === 'gap').length === 1 ? '' : 's') + ' · ' + signals.filter((s) => s.level === 'warn').length + ' warning' + (signals.filter((s) => s.level === 'warn').length === 1 ? '' : 's') + '</span>'
      : '<span class="pill pill-good">' + ico(IC.check, 'i-sm') + 'Nothing blocks this record</span>') + '</div>' +
    (signals.length ? sigRows : '<div style="font-size:12.5px;color:var(--ink-3);line-height:1.55">Every Must has a fit criterion, every ' + (eng ? 'workstream' : 'component') + ' has an owner, and no placeholder is unresolved.</div>') +
    '</div>';

  const chip = (n, l) => '<div style="text-align:center;padding:6px 14px"><div class="mono" style="font-size:22px;font-weight:680;letter-spacing:-.02em">' + n + '</div><div class="eyebrow" style="font-size:9px;margin-top:2px">' + esc(l) + '</div></div>';
  const holds = '<div class="card" style="padding:16px 18px;margin-bottom:14px">' +
    '<div style="font-size:14px;font-weight:640;margin-bottom:8px">What this record holds</div>' +
    '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px">' +
    chip(counts.versions, 'Versions') + chip(counts.signoffs, 'Named sign-offs') +
    chip(counts.requirements, 'Requirements') + (counts.evals ? chip(counts.evals, 'AI eval criteria') : '') +
    chip(counts.decisions, 'Decisions') + chip(counts.discovery, 'Discovery entries') +
    chip(counts.external, 'External inputs') + chip(counts.promoted, 'Promoted to the record') +
    (counts.incorporated ? chip(counts.incorporated, 'Client inputs in the approved baseline') : '') + '</div>' +
    (counts.lastClientVisible ? '<div style="font-size:11.5px;color:var(--ink-3);margin-top:8px;text-align:center">Last client-visible change: ' + esc(new Date(counts.lastClientVisible).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })) + '</div>' : '') +
    '<div style="font-size:11.5px;color:var(--ink-4);line-height:1.5;margin-top:10px;text-align:center">Counts, not scores: every number here is defensible by pointing at rows. It all stays inside this workspace.</div></div>';

  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 6px">Record health</h2>' +
    '<p class="hint" style="margin:0 0 18px">Computed from the working draft every time you open this tab. Nothing here is written to the record, and a signal disappears the moment the gap is fixed.</p>' +
    readiness + holds + '</div>';
}

/* ---------------- activity ---------------- */
function renderActivity(APP) {
  const list = APP.activityLog || [];
  if (!list.length) return '<div class="empty">' + ico(IC.activity) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No activity yet</div><div style="font-size:13px;max-width:280px">Every edit, version, status change, and inbound submission is recorded here, permanently.</div></div>';
  const items = list.map((e) =>
    '<div class="tl-item"><div style="font-size:13px;color:var(--ink-2);line-height:1.5"><strong>' + esc(e.actor_name || 'System') + '</strong> ' + esc(e.summary || e.action) + '</div>' +
    '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">' + esc(fmtDate(e.created_at)) + ' · <span class="mono">' + esc(e.action) + '</span></div></div>').join('');
  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 6px">Activity</h2>' +
    '<p class="hint" style="margin:0 0 18px">The audit trail is append-only and written by the database itself - entries cannot be edited or deleted from the app.</p>' +
    '<div class="tl">' + items + '</div></div>';
}

/* ---------------- weekly updates (v2.27.0) ---------------- */
/* The composer's contract: everything on screen arrived derived from the
   record; the manager picks, may reword, adds at most one stamped note and
   one editorial sentence, and publishes. Open items are shown but not
   editable - that is the no-RAID line, held in the interface itself. The
   published list below is the archive: immutable rows, live links. */
export function renderUpdates(APP, a) {
  const isMgr = APP.role === 'manager';
  const list = APP.updatesList || [];
  const last = list.find((u) => !u.revoked);
  const updLink = (t) => location.origin + location.pathname + '#update/' + t;
  const d = APP.upd && APP.upd.draft;

  const listRows = list.map((u) =>
    '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:12.5px">' +
    '<span class="pill mono" style="height:20px;font-size:10.5px;flex:0 0 auto">no. ' + u.seq + '</span>' +
    '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
    esc(fmtDate(u.published_at)) + (u.prepared_by ? ' · ' + esc(u.prepared_by) : '') +
    (u.revoked ? ' · <span style="color:var(--ink-4)">withdrawn</span>' : '') + '</span>' +
    (u.revoked ? '' :
      '<a class="btn btn-ghost btn-sm" href="' + escA(updLink(u.token)) + '" target="_blank" rel="noopener" style="font-size:11px">Open</a>' +
      '<button class="btn btn-ghost btn-sm" data-action="updcopy" data-token="' + escA(u.token) + '" style="font-size:11px">Copy link</button>' +
      (isMgr ? '<button class="icobtn" data-action="updrevoke" data-id="' + escA(u.id) + '" title="Withdraw this update - the link will say so" style="width:26px;height:26px">' + ico(IC.close, 'i-sm') + '</button>' : '')) +
    '</div>').join('');

  let composer = '';
  if (isMgr && d) {
    const chk = (name, i, on) => '<input type="checkbox" data-' + name + '="' + i + '"' + (on ? ' checked' : '') + ' style="flex:0 0 auto;margin-top:8px">';
    const askRows = d.asks.length ? d.asks.map((c, i) =>
      '<div style="display:flex;gap:8px;align-items:flex-start;margin:0 0 6px">' + chk('updask', i, i < 3) +
      '<div style="flex:1;min-width:0"><input class="input" id="upda-' + i + '" value="' + escA(c.text) + '" style="height:30px;font-size:12.5px;width:100%">' +
      (c.why ? '<div style="font-size:10.5px;color:var(--ink-4);margin-top:2px">' + esc(c.why) + '</div>' : '') + '</div></div>').join('')
      : '<div style="font-size:12px;color:var(--ink-3)">No open asks derived - pending approvals, signature links, and gate deciders appear here.</div>';
    const movedRows = d.moved.length ? d.moved.map((m, i) =>
      '<div style="display:flex;gap:8px;align-items:center;margin:0 0 6px">' + chk('updmoved', i, true) +
      '<input class="input" id="updm-' + i + '" value="' + escA(m.text) + '" style="height:30px;font-size:12.5px;flex:1">' +
      '<span class="mono" style="font-size:10px;color:var(--ink-4);flex:0 0 auto">' + esc(m.ref || '') + '</span></div>').join('')
      : '<div style="font-size:12px;color:var(--ink-3)">No record activity in this window yet.</div>';
    const openRows = d.open.slice(0, 6).map((o) =>
      '<div style="font-size:12px;color:var(--ink-2);margin:0 0 3px">' +
      (o.grade === 'high' ? '<strong>High</strong>' : '<span style="color:var(--ink-3)">Watch</span>') + ' · ' + esc(o.text) +
      (o.lead ? ' · ' + esc(o.lead) : '') + '</div>').join('') +
      (d.openMore ? '<div style="font-size:11px;color:var(--ink-4)">and ' + d.openMore + ' more</div>' : '') +
      d.closed.map((c) => '<div style="font-size:11.5px;color:var(--ink-4);text-decoration:line-through;margin-top:2px">Closed · ' + esc(c.text) + '</div>').join('');
    composer =
      '<div style="border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:12px;background:var(--bg)">' +
      '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px"><div style="font-weight:640;font-size:13.5px;flex:1">This week\u2019s draft</div>' +
      '<span style="font-size:11px;color:var(--ink-4)">' + esc(d.strip.health) + (d.strip.next.text ? ' · next: ' + esc(d.strip.next.text) : '') +
      ' · covers ' + (d.window.from ? 'since ' + esc(fmtDate(d.window.from)) : 'the whole record') + '</span></div>' +
      '<div class="eyebrow" style="font-size:9px;margin-bottom:5px">Needed from the client - pick up to three, reword freely</div>' + askRows +
      '<div class="eyebrow" style="font-size:9px;margin:12px 0 5px">What moved - derived from activity, untick anything internal</div>' + movedRows +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:6px">' +
      '<input class="input" id="updnote" placeholder="One line the record does not carry yet (published stamped as a note)" style="height:30px;font-size:12.5px;flex:1"></div>' +
      '<div class="eyebrow" style="font-size:9px;margin:12px 0 5px">Open on the record - derived, not editable here; fix the record to change it</div>' + (openRows || '<div style="font-size:12px;color:var(--ink-3)">Nothing open.</div>') +
      '<div class="eyebrow" style="font-size:9px;margin:12px 0 5px">Next - one sentence in your voice</div>' +
      '<input class="input" id="updnext" placeholder="e.g. Gate V authorization, then the observation window locks" style="height:30px;font-size:12.5px;width:100%">' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">' +
      '<input class="input" id="updprep" value="' + escA((last && last.prepared_by) || (APP.ctx && APP.ctx.display_name) || '') + '" placeholder="Prepared by" style="height:30px;font-size:12.5px;flex:1;min-width:150px">' +
      '<button class="btn btn-primary btn-sm" data-action="updpublish"' + (APP.upd.busy ? ' disabled' : '') + '>' + (APP.upd.busy ? 'Publishing\u2026' : 'Publish and copy link') + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="updcancel">Discard</button></div>' +
      '<div style="font-size:10.5px;color:var(--ink-4);margin-top:7px">Publishing freezes this page at a permanent link. It is never edited afterward; a bad one can be withdrawn.</div></div>';
  }

  return '<div class="page" style="padding-bottom:24px"><div class="card" style="padding:18px 20px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:640;font-size:15px;flex:1">Weekly updates</div>' +
    (isMgr && !d ? '<button class="btn btn-sec btn-sm" data-action="updcompose">' + ico(IC.plus, 'i-sm') + 'Compose this week\u2019s update</button>' : '') + '</div>' +
    '<div style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-bottom:4px">The client\u2019s ten-second read: what you need from them, what moved, what stays open - every line derived from this record, published to a permanent link.' +
    (last ? ' Last published ' + esc(relTime(last.published_at)) + '.' : ' Nothing published yet.') + '</div>' +
    composer + (listRows ? '<div style="margin-top:10px">' + listRows + '</div>' : '') + '</div></div>';
}
