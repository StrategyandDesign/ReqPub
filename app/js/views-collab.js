/* ============================================================================
   ReqPub v2 — collaboration tabs: inbox, feedback, discovery, notes & requests,
   people, links, versions & approvals, activity.
   ============================================================================ */

import { esc, escA, ico, IC, relTime, fmtDate, initials } from './core.js';
import { STATUS_LABEL } from './views-app.js';

const EXTERNAL = { app: 1, brief: 1, sme: 1, partner: 1 };
const ORIGIN_LABEL = { app: 'App', brief: 'Reviewer', sme: 'SME', partner: 'Partner', team: 'Team', meeting: 'Meeting' };
const COMM_STATUS = ['new', 'in_review', 'actioned', 'closed'];
const COMM_STATUS_LABEL = { new: 'New', in_review: 'In review', actioned: 'Actioned', closed: 'Closed' };

export function unreadCount(APP) {
  return (APP.comms || []).filter((c) => EXTERNAL[c.origin] && !APP.reads[c.id]).length;
}
export function projectStatsOf(comms, reads) {
  let unread = 0, open = 0;
  (comms || []).forEach((c) => {
    if (EXTERNAL[c.origin] && !reads[c.id]) unread++;
    if (c.status === 'new' || c.status === 'in_review') open++;
  });
  return { unread, open };
}

const srcColor = (o) => o === 'app' ? 'var(--ink)' : o === 'brief' ? 'var(--brand)' : o === 'partner' ? 'var(--purple)' : o === 'sme' ? 'var(--teal)' : 'var(--ink-3)';

export function renderTab(APP, a) {
  switch (APP.docTab) {
    case 'inbox': return renderInbox(APP);
    case 'feedback': return renderFeedback(APP);
    case 'discovery': return renderDiscovery(APP);
    case 'notes': return renderNotes(APP);
    case 'people': return renderPeople(APP);
    case 'links': return renderLinks(APP);
    case 'activity': return renderActivity(APP);
    case 'versions': default: return renderVersions(APP);
  }
}

/* ---------------- inbox ---------------- */
function threadHTML(APP, comm, canReply) {
  const msgs = APP.msgs[comm.id] || [];
  const thread = msgs.map((m) =>
    '<div style="padding:8px 0;border-top:1px solid var(--line)"><div style="font-size:11px;color:var(--ink-4);margin-bottom:2px">' +
    '<strong style="color:var(--ink-2)">' + esc(m.author_name || 'Team') + '</strong>' +
    (m.author_kind !== 'team' ? ' <span class="pill" style="height:16px;font-size:9.5px;padding:0 6px;vertical-align:1px;color:' + srcColor(m.author_kind === 'partner' ? 'partner' : 'sme') + ';border-color:currentColor">' + esc(m.author_kind) + '</span>' : '') +
    ' · ' + esc(relTime(m.created_at)) + '</div>' +
    '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;white-space:pre-wrap">' + esc(m.body) + '</div></div>').join('');
  const draft = (APP.drafts[comm.id] || '');
  const replyBox = canReply
    ? '<textarea class="input" data-draft="' + escA(comm.id) + '" rows="2" placeholder="Reply to ' + escA(comm.author_name || 'them') + (EXTERNAL[comm.origin] ? ' — they see this at their link' : '') + '" style="font-size:12.5px;resize:vertical;min-height:44px;line-height:1.5;margin-top:8px">' + esc(draft) + '</textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:7px"><button class="btn btn-primary btn-sm" data-action="reply" data-id="' + escA(comm.id) + '">Send reply</button></div>'
    : '';
  return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><div class="eyebrow" style="font-size:9px;margin-bottom:6px">Conversation</div>' +
    (thread || '<div style="font-size:12px;color:var(--ink-4)">No replies yet.</div>') + replyBox + '</div>';
}

function commCard(APP, it) {
  const open = !!APP.openComms[it.id];
  const unr = EXTERNAL[it.origin] && !APP.reads[it.id];
  const badges = '<span class="pill" style="border-color:' + srcColor(it.origin) + ';color:' + srcColor(it.origin) + '">' + esc(ORIGIN_LABEL[it.origin] || it.origin) + '</span>' +
    (it.severity ? '<span class="pill' + (it.severity === 'Critical' ? ' pill-solid' : '') + '">' + esc(it.severity) + '</span>' : '') +
    '<span class="pill' + (it.status === 'new' ? ' pill-solid' : '') + '">' + esc(COMM_STATUS_LABEL[it.status] || it.status) + '</span>' +
    (it.promoted_to ? '<span class="pill">' + esc(it.promoted_to === 'discovery' ? 'In discovery' : 'Promoted to ' + it.promoted_to) + '</span>' : '');
  const head = '<div data-action="commtoggle" data-id="' + escA(it.id) + '" style="cursor:pointer;padding:13px 15px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
    '<div style="display:flex;gap:10px;min-width:0;align-items:flex-start">' +
    (unr ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--brand);flex:0 0 auto;margin-top:6px"></span>' : '<span style="width:7px;flex:0 0 auto"></span>') +
    '<div style="min-width:0"><div style="font-weight:' + (unr ? '650' : '560') + ';font-size:14px;line-height:1.35' + (open ? '' : ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap') + '">' + esc(it.title || '(untitled)') + '</div>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">' + esc(it.author_name || 'Anonymous') + ' · ' + esc(relTime(it.created_at)) + (it.version_seq ? ' · ' + verLabel(APP, it.version_seq) : '') + '</div></div></div>' +
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
  });
  const header = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:10px">' +
    '<div><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Inbox</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Every communication on this PRD, live. ' + all.length + ' total' + (unread ? ' · ' + unread + ' unread' : '') + '.</div></div>' +
    (unread ? '<button class="btn btn-sec btn-sm" data-action="ibreadall">Mark all read</button>' : '') + '</div>';
  const search = '<input class="input" data-ibsearch="1" value="' + escA(F.q || '') + '" placeholder="Search people, titles, text" style="margin:12px 0 10px;font-size:13px">';
  const filters = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:14px"><span class="eyebrow" style="font-size:9px">Source</span><div class="choice">' + srcs.map(schip).join('') + '</div><div style="width:8px"></div><span class="eyebrow" style="font-size:9px">Status</span><div class="choice">' + stats.map(stchip).join('') + '</div></div>';
  const items = !all.length
    ? '<div class="empty">' + ico(IC.msg) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No communications yet</div><div style="font-size:13px;max-width:280px">App reports, PRD reviews, SME input, and partner notes all land here — live.</div></div>'
    : !filtered.length ? '<div class="empty">' + ico(IC.msg) + '<div style="font-size:13px">Nothing matches.</div></div>'
    : filtered.map((it) => commCard(APP, it)).join('');
  return '<div class="page" style="max-width:600px">' + header + search + filters + items + '</div>';
}

/* ---------------- feedback (share links + version-filtered list) ---------------- */
function shareRow(APP, kind, title, sub, seq) {
  const share = (APP.shares || []).find((s) => s.kind === kind && s.version_seq === seq && !s.revoked);
  const link = share ? location.origin + location.pathname + '#' + (kind === 'brief' ? 'brief' : 'fb') + '/' + APP.pid + '/' + seq + '/' + share.token : null;
  return '<div class="card" style="padding:16px;margin-bottom:12px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">' + ico(kind === 'brief' ? IC.send : IC.link, 'i-sm') + '<span style="font-size:13px;font-weight:600">' + esc(title) + '</span></div>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-bottom:11px;line-height:1.5">' + esc(sub) + '</div>' +
    (link
      ? '<div style="display:flex;gap:8px;align-items:center"><input class="input" readonly value="' + escA(link) + '" style="flex:1;min-width:0;font-family:var(--mono);font-size:11px;color:var(--ink-3)">' +
        '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">' + ico(IC.copy, 'i-sm') + 'Copy</button>' +
        (APP.role === 'manager' ? '<button class="btn btn-ghost btn-sm" data-action="sharerevoke" data-token="' + escA(share.token) + '">Revoke</button>' : '') + '</div>'
      : (APP.role === 'manager'
        ? '<button class="btn btn-sec btn-sm" data-action="sharepub" data-kind="' + kind + '" data-seq="' + seq + '">' + ico(IC.link, 'i-sm') + 'Create link</button>'
        : '<div class="hint">No live link. A manager can create one.</div>')) +
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
  const list = (APP.comms || []).filter((c) => (c.origin === 'app' || c.origin === 'brief') && (filterAll || c.version_seq === seq));
  const cur = versions.find((v) => v.seq === seq);
  const share = (!filterAll && cur)
    ? shareRow(APP, 'brief', 'PRD review link · v' + cur.label, 'A plain-language brief for collaborators. Their review lands in the Inbox and opens a two-way thread — no account needed.', seq) +
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
  const notes = (APP.comms || []).filter((c) => c.origin === 'team' || c.origin === 'meeting' || (c.origin === 'sme' && !c.request_id) || c.origin === 'partner');
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
      '<div style="font-size:12.5px;color:var(--ink-3);margin-top:3px;line-height:1.5">Send a link — no account needed on their side. Their responses land in the Inbox and open a live two-way thread.</div></div>' +
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
function renderDiscovery(APP) {
  const isMgr = APP.role === 'manager';
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
      '<textarea class="input" data-disc="takeaway" rows="2" placeholder="The takeaway — the one thing worth remembering" style="resize:vertical;min-height:48px;line-height:1.5;margin-bottom:9px">' + esc(d.takeaway || '') + '</textarea>' +
      '<textarea class="input" data-disc="notes" rows="2" placeholder="Detail, quotes, what was heard (optional)" style="resize:vertical;min-height:44px;line-height:1.5;margin-bottom:9px">' + esc(d.notes || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      '<input class="input" data-disc="who" value="' + escA(d.who || '') + '" placeholder="Who said it" style="flex:1;min-width:130px;height:36px;font-size:12.5px">' +
      '<input class="input" data-disc="source" value="' + escA(d.source || '') + '" placeholder="Source (interview, ticket…)" style="flex:1;min-width:130px;height:36px;font-size:12.5px">' +
      '<input class="input" data-disc="tags" value="' + escA(d.tags || '') + '" placeholder="Tags, comma-separated" style="flex:1;min-width:130px;height:36px;font-size:12.5px"></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary btn-sm" data-action="discadd">Add entry</button></div></div>'
    : '';
  const items = list.length ? list.map((e) => {
    const open = !!APP.openDisc[e.id];
    return '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden">' +
      '<div data-action="disctoggle" data-id="' + escA(e.id) + '" style="cursor:pointer;padding:13px 15px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      '<div style="min-width:0"><div style="font-weight:600;font-size:13.5px;line-height:1.4' + (open ? '' : ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap') + '">' + esc(e.takeaway || '(no takeaway)') + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">' + esc([e.who, e.source, relTime(e.created_at)].filter(Boolean).join(' · ')) + '</div></div>' +
      (e.tags ? '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">' + e.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3).map((t) => '<span class="pill">' + esc(t) + '</span>').join('') + '</div>' : '') + '</div>' +
      (open ? '<div style="padding:0 15px 14px;border-top:1px solid var(--line)">' +
        (e.notes ? '<div style="padding-top:11px;font-size:12.5px;color:var(--ink-2);line-height:1.55;white-space:pre-wrap">' + esc(e.notes) + '</div>' : '') +
        (e.links ? '<div style="margin-top:8px;font-size:12px;color:var(--ink-3)">Links: ' + esc(e.links) + '</div>' : '') +
        (isMgr ? '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-ghost btn-sm" data-action="discdel" data-id="' + escA(e.id) + '" style="color:' + (APP.discDel === e.id ? 'var(--bad)' : 'var(--ink-4)') + '">' + (APP.discDel === e.id ? 'Confirm delete' : 'Delete') + '</button></div>' : '') +
        '</div>' : '') +
      '</div>';
  }).join('') : '<div class="empty">' + ico(IC.spark) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No discovery yet</div><div style="font-size:13px;max-width:300px">Interview takeaways, decisions, and open questions live here — the evidence base under the requirements.</div></div>';
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

/* ---------------- links ---------------- */
function renderLinks(APP) {
  const base = location.origin + location.pathname;
  const isMgr = APP.role === 'manager';
  const rows = [];
  (APP.shares || []).filter((s) => !s.revoked).forEach((s) => {
    const kindLabel = s.kind === 'brief' ? 'PRD review' : s.kind === 'pilot' ? 'App testing' : 'Note intake';
    if (s.kind === 'note') return; // request links render from input_requests below
    const v = (APP.versions || []).find((x) => x.seq === s.version_seq);
    const link = base + '#' + (s.kind === 'brief' ? 'brief' : 'fb') + '/' + APP.pid + '/' + s.version_seq + '/' + s.token;
    rows.push('<div class="card" style="margin-bottom:8px;padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div style="font-weight:600;font-size:13.5px">' + esc(kindLabel) + ' · ' + (v ? 'v' + esc(v.label) : 'v?') + '</div><span class="pill pill-solid">Live</span></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><input class="input" readonly value="' + escA(link) + '" style="flex:1;min-width:0;font-family:var(--mono);font-size:11px;color:var(--ink-3);height:32px">' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">Copy</button>' +
      (isMgr ? '<button class="btn btn-ghost btn-sm" data-action="sharerevoke" data-token="' + escA(s.token) + '">Revoke</button>' : '') + '</div></div>');
  });
  (APP.requests || []).forEach((r) => {
    const link = base + '#note/' + APP.pid + '/' + r.token;
    rows.push('<div class="card" style="margin-bottom:8px;padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
      '<div style="min-width:0"><div style="font-weight:600;font-size:13.5px">Input request · ' + esc(r.title) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">' + esc(relTime(r.created_at)) + (r.due ? ' · due ' + esc(r.due) : '') + '</div></div>' +
      '<span class="pill' + (r.status === 'closed' ? '' : ' pill-solid') + '">' + (r.status === 'closed' ? 'Closed' : 'Live') + '</span></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><input class="input" readonly value="' + escA(link) + '" style="flex:1;min-width:0;font-family:var(--mono);font-size:11px;color:var(--ink-3);height:32px">' +
      '<button class="btn btn-sec btn-sm" data-action="copylink" data-link="' + escA(link) + '">Copy</button>' +
      (isMgr ? '<button class="btn btn-ghost btn-sm" data-action="nrclose" data-id="' + escA(r.id) + '">' + (r.status === 'closed' ? 'Reopen' : 'Revoke') + '</button>' : '') + '</div></div>');
  });
  const body = rows.length ? rows.join('')
    : '<div class="empty">' + ico(IC.link) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No links yet</div><div style="font-size:13px;max-width:280px">Generate a version, then create review and testing links from the Feedback tab, or a note request from Notes.</div></div>';
  return '<div class="page" style="max-width:600px"><div style="margin-bottom:14px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0">Links</h2>' +
    '<div style="font-size:11.5px;color:var(--ink-4);margin-top:2px">Every shareable link for this PRD, in one place. Copy or revoke — revocation is immediate and server-side.</div></div>' + body + '</div>';
}

/* ---------------- versions + approvals ---------------- */
function renderVersions(APP) {
  if (!APP.versions.length) return '<div class="empty">' + ico(IC.hist) + '<div style="font-size:13px">No versions yet.</div></div>';
  const isMgr = APP.role === 'manager';
  const items = APP.versions.slice().reverse().map((v) => {
    const on = APP.viewSeq === v.seq;
    const apprs = APP.approvals[v.id] || [];
    const transitions = { draft: ['in_review'], in_review: ['approved', 'changes_requested', 'draft'], changes_requested: ['in_review'], approved: ['in_review'] };
    const tbtns = isMgr ? (transitions[v.status] || []).map((t) =>
      '<button class="btn btn-sec btn-sm" data-action="vstatus" data-id="' + escA(v.id) + '" data-val="' + t + '" style="font-size:11.5px">' +
      ({ in_review: 'Send for review', approved: 'Approve', changes_requested: 'Request changes', draft: 'Back to draft' })[t] + '</button>').join('') : '';
    const apprRows = apprs.map((ap) =>
      '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid var(--line);font-size:12.5px">' +
      '<span class="stchip ' + esc(ap.status === 'pending' ? 'draft' : ap.status) + '" style="height:20px;font-size:10px">' + esc(ap.status === 'pending' ? 'Pending' : STATUS_LABEL[ap.status]) + '</span>' +
      '<span style="flex:1;min-width:0"><strong>' + esc(ap.approver_role || 'Approver') + '</strong>' + (ap.approver_name ? ' — ' + esc(ap.approver_name) : '') +
      (ap.comment ? '<span style="color:var(--ink-4)"> · ' + esc(ap.comment) + '</span>' : '') + '</span>' +
      (isMgr && ap.status === 'pending' ? '<button class="btn btn-ghost btn-sm" data-action="apprdecide" data-id="' + escA(ap.id) + '" data-val="approved" style="font-size:11px;color:var(--good)">Approve</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="apprdecide" data-id="' + escA(ap.id) + '" data-val="changes_requested" style="font-size:11px;color:var(--amber)">Changes</button>' : '') +
      (isMgr ? '<button class="icobtn" data-action="apprdel" data-id="' + escA(ap.id) + '" style="width:26px;height:26px">' + ico(IC.close, 'i-sm') + '</button>' : '') + '</div>').join('');
    const addAppr = (isMgr && v.status !== 'approved')
      ? '<div style="display:flex;gap:6px;margin-top:8px"><input class="input" id="apr-role-' + escA(v.id) + '" placeholder="Role (e.g. Engineering)" style="height:32px;font-size:12px;flex:1">' +
        '<input class="input" id="apr-name-' + escA(v.id) + '" placeholder="Name" style="height:32px;font-size:12px;flex:1">' +
        '<button class="btn btn-sec btn-sm" data-action="appradd" data-id="' + escA(v.id) + '">Add approver</button></div>' : '';
    return '<div class="tl-item' + (on ? ' hot' : '') + '">' +
      '<button data-action="viewver" data-seq="' + v.seq + '" style="text-align:left;display:block;width:100%">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="mono" style="font-size:14px;font-weight:600">v' + esc(v.label) + '</span>' +
      '<span class="stchip ' + esc(v.status) + '">' + esc(STATUS_LABEL[v.status]) + '</span>' +
      (on ? '<span class="pill pill-solid">viewing</span>' : '') + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">' + esc(fmtDate(v.created_at)) + (v.author_name ? ' · ' + esc(v.author_name) : '') + (v.build ? ' · build ' + esc(v.build) : '') + '</div>' +
      (v.note ? '<div style="font-size:12.5px;color:var(--ink-2);margin-top:2px">' + esc(v.note) + '</div>' : '') + '</button>' +
      ((apprRows || addAppr || tbtns) ? '<div style="border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:9px;background:var(--bg)">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:' + (apprRows || addAppr ? '7px' : '0') + '"><span class="eyebrow" style="font-size:9px">Approval workflow</span><div style="flex:1"></div>' + tbtns + '</div>' +
        apprRows + addAppr + '</div>' : '') +
      '</div>';
  }).join('');
  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 6px">Version history</h2>' +
    '<p class="hint" style="margin:0 0 18px">Baselines are immutable. Approval is a real gate: a version cannot be marked Approved while a named approver is still pending.</p>' +
    '<div class="tl">' + items + '</div></div>';
}

/* ---------------- activity ---------------- */
function renderActivity(APP) {
  const list = APP.activityLog || [];
  if (!list.length) return '<div class="empty">' + ico(IC.activity) + '<div style="font-size:14px;color:var(--ink-2);font-weight:560;margin-bottom:4px">No activity yet</div><div style="font-size:13px;max-width:280px">Every edit, version, status change, and inbound submission is recorded here, permanently.</div></div>';
  const items = list.map((e) =>
    '<div class="tl-item"><div style="font-size:13px;color:var(--ink-2);line-height:1.5"><strong>' + esc(e.actor_name || 'System') + '</strong> ' + esc(e.summary || e.action) + '</div>' +
    '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">' + esc(fmtDate(e.created_at)) + ' · <span class="mono">' + esc(e.action) + '</span></div></div>').join('');
  return '<div class="page" style="max-width:560px"><h2 style="font-size:20px;letter-spacing:-.02em;font-weight:620;margin:0 0 6px">Activity</h2>' +
    '<p class="hint" style="margin:0 0 18px">The audit trail is append-only and written by the database itself — entries cannot be edited or deleted from the app.</p>' +
    '<div class="tl">' + items + '</div></div>';
}
