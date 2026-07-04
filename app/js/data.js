/* ============================================================================
   ReqPub v2 — data layer
   One Supabase client, one repository object. Every mutation is awaited and
   returns a definite outcome; transient network failures are retried with
   exponential backoff (durable()). Racy structures (fields, rows, versions)
   go through the server-side RPCs so concurrency checks cannot be bypassed.
   ============================================================================ */
import { BRIEF_SECTIONS } from './domain.js';

const HAS_DOM = typeof window !== 'undefined';
const CFG = (HAS_DOM && window.SB_CFG) || { url: '', anon: '' };
export const sb = (HAS_DOM && CFG.url && CFG.anon && window.supabase)
  ? window.supabase.createClient(CFG.url, CFG.anon)
  : null;
export const online = () => !!sb;

/* Retry transient failures only. A PostgREST error carries a SQLSTATE `code`
   (permission denied, constraint violation, missing function): those are
   definitive answers and are returned immediately. Retries are reserved for
   the network layer: timeouts, 429s, 5xx, and thrown fetch failures. */
export async function durable(fn, { tries = 5, base = 400, onRetry } = {}) {
  let lastErr;
  for (let n = 0; n < tries; n++) {
    try {
      const r = await fn();
      if (r && r.error) {
        const status = typeof r.error.status === 'number' ? r.error.status : 0;
        const definitive = !!r.error.code && status < 500;
        const transient = !definitive && (
          status === 408 || status === 429 || status >= 500 ||
          /fetch|network|timeout|load failed/i.test(r.error.message || ''));
        if (!transient) return r;
        lastErr = r.error;
      } else {
        return r;
      }
    } catch (e) {
      lastErr = e;
    }
    if (n < tries - 1) {
      if (onRetry) onRetry(n + 1);
      await new Promise((res) => setTimeout(res, Math.min(base * 2 ** n, 8000) + Math.random() * 150));
    }
  }
  return { error: lastErr || new Error('unreachable') };
}

const rpc = (name, args) => durable(() => sb.rpc(name, args));

export const repo = {
  /* ---- session ---- */
  async session() { const { data } = await sb.auth.getSession(); return data.session || null; },
  async signOut() { try { await sb.auth.signOut(); } catch { /* session already gone */ } },
  async context() { const r = await rpc('v2_context'); return r.error ? null : r.data; },
  async saveDisplayName(userId, name) {
    return durable(() => sb.from('user_profiles')
      .upsert({ user_id: userId, display_name: name, updated_at: new Date().toISOString() }));
  },

  /* ---- org / members / invites / partners ---- */
  async createOrg(name) { return rpc('create_org', { p_name: name }); },
  async claimInvites() { return rpc('claim_invites'); },
  async members(orgId) {
    const r = await durable(() => sb.from('org_members').select('user_id,email,role').eq('org_id', orgId));
    return r.data || [];
  },
  async invites(orgId) {
    const r = await durable(() => sb.from('org_invites').select('email,role,created_at').eq('org_id', orgId));
    return r.data || [];
  },
  async invite(orgId, email, role) {
    return durable(() => sb.from('org_invites').upsert({ org_id: orgId, email, role }));
  },
  async revokeInvite(orgId, email) {
    return durable(() => sb.from('org_invites').delete().eq('org_id', orgId).eq('email', email));
  },
  async setMemberRole(orgId, userId, role) {
    return durable(() => sb.from('org_members').update({ role }).eq('org_id', orgId).eq('user_id', userId));
  },
  async removeMember(orgId, userId) {
    return durable(() => sb.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId));
  },
  sendInviteEmail(email, role, orgName, inviterEmail) {
    // Fire-and-report: email delivery is a courtesy, the invite row is the truth.
    try {
      return sb.functions.invoke('send-invite', { body: { email, role, orgName, inviterEmail } });
    } catch { return Promise.resolve({ error: new Error('function unavailable') }); }
  },
  async orgPartners(orgId) {
    const [pr, ar] = await Promise.all([
      durable(() => sb.from('partners').select('id,email,name').eq('org_id', orgId)),
      durable(() => sb.from('partner_access').select('partner_id,project_id'))
    ]);
    const acc = {};
    (ar.data || []).forEach((x) => { (acc[x.partner_id] = acc[x.partner_id] || {})[x.project_id] = 1; });
    return (pr.data || []).map((p) => ({ ...p, acc: acc[p.id] || {} }));
  },
  async addPartner(orgId, email, name) {
    return durable(() => sb.from('partners').insert({ org_id: orgId, email, name }).select().single());
  },
  async removePartner(id) { return durable(() => sb.from('partners').delete().eq('id', id)); },
  async grantPartner(partnerId, projectId) {
    return durable(() => sb.from('partner_access').upsert({ partner_id: partnerId, project_id: projectId }));
  },
  async revokePartner(partnerId, projectId) {
    return durable(() => sb.from('partner_access').delete()
      .eq('partner_id', partnerId).eq('project_id', projectId));
  },

  /* ---- projects ---- */
  async projects(orgId) {
    const r = await durable(() => sb.from('projects').select('*')
      .eq('org_id', orgId).eq('archived', false).order('updated_at', { ascending: false }));
    return r.data || [];
  },
  async createProject(orgId, id, name) {
    return durable(() => sb.from('projects').insert({ id, org_id: orgId, name }));
  },
  async renameProject(id, name) {
    return durable(() => sb.from('projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id));
  },
  async archiveProject(id) {
    return durable(() => sb.from('projects').update({ archived: true }).eq('id', id));
  },
  async setDiscExport(id, on) {
    return durable(() => sb.from('projects').update({ disc_export: !!on }).eq('id', id));
  },
  async setBrand(id, logo, label) {
    return durable(() => sb.from('projects')
      .update({ brand_logo: logo || '', brand_label: label || '', updated_at: new Date().toISOString() }).eq('id', id));
  },

  /* ---- worksheet: everything a project view needs, in parallel ---- */
  async projectBundle(pid) {
    const [fields, rows, versions, comms, requests, discovery, reads] = await Promise.all([
      durable(() => sb.from('project_fields').select('field_id,value,rev,updated_by_name,updated_at').eq('project_id', pid)),
      durable(() => sb.from('field_rows').select('id,field_id,k,data,pos,rev,updated_by_name').eq('project_id', pid).eq('deleted', false).order('pos')),
      durable(() => sb.from('versions').select('id,seq,label,status,note,author_name,build,created_at').eq('project_id', pid).order('seq')),
      durable(() => sb.from('comms').select('*').eq('project_id', pid).order('created_at', { ascending: false })),
      durable(() => sb.from('input_requests').select('*').eq('project_id', pid).order('created_at', { ascending: false })),
      durable(() => sb.from('discovery_entries').select('*').eq('project_id', pid).order('created_at', { ascending: false })),
      durable(() => sb.from('read_marks').select('comm_id'))
    ]);
    const f = {}; (fields.data || []).forEach((x) => { f[x.field_id] = { value: x.value, rev: x.rev, by: x.updated_by_name, at: x.updated_at }; });
    const rw = {}; (rows.data || []).forEach((x) => { (rw[x.field_id] = rw[x.field_id] || []).push(x); });
    const reads_ = {}; (reads.data || []).forEach((x) => { reads_[x.comm_id] = true; });
    return {
      fields: f, rows: rw,
      versions: versions.data || [], comms: comms.data || [],
      requests: requests.data || [], discovery: discovery.data || [], reads: reads_
    };
  },
  async versionSnapshot(pid, seq) {
    const r = await durable(() => sb.from('versions').select('snapshot,label,status,seq,author_name,note,build,created_at,id')
      .eq('project_id', pid).eq('seq', seq).maybeSingle());
    return r.data || null;
  },
  async approvals(versionIds) {
    if (!versionIds.length) return {};
    const r = await durable(() => sb.from('version_approvals').select('*').in('version_id', versionIds));
    const map = {};
    (r.data || []).forEach((a) => { (map[a.version_id] = map[a.version_id] || []).push(a); });
    return map;
  },

  /* ---- racy writes → RPCs ---- */
  saveField(pid, fieldId, value, baseRev) {
    return rpc('save_field', { p_project: pid, p_field: fieldId, p_value: value, p_base_rev: baseRev || 0 });
  },
  upsertRow(pid, fieldId, id, data, pos, baseRev) {
    return rpc('upsert_row', { p_project: pid, p_field: fieldId, p_id: id, p_data: data, p_pos: pos ?? null, p_base_rev: baseRev ?? null });
  },
  deleteRow(pid, id) { return rpc('delete_row', { p_project: pid, p_id: id }); },
  createVersion(pid, major, note, snapshot, build) {
    return rpc('create_version', { p_project: pid, p_major: major, p_note: note, p_snapshot: snapshot, p_build: build || '' });
  },
  setVersionStatus(versionId, status) {
    return rpc('version_set_status', { p_version: versionId, p_status: status });
  },
  async addApprover(versionId, role, name, userId) {
    return durable(() => sb.from('version_approvals').insert({
      version_id: versionId, approver_role: role, approver_name: name,
      approver_user_id: userId || null
    }));
  },
  decideApproval(id, status, comment) {
    return rpc('approval_decide', { p_approval: id, p_status: status, p_comment: comment || '' });
  },
  // Team roster (with display names) for the approver picker.
  async orgMembersNamed(orgId) {
    const r = await rpc('org_members_named', { p_org: orgId });
    return (r && r.data) || [];
  },
  // Pending approval slots assigned to the current user on in-review versions.
  async myOpenApprovals() {
    const r = await rpc('my_open_approvals');
    return (r && r.data) || [];
  },
  async removeApprover(id) { return durable(() => sb.from('version_approvals').delete().eq('id', id)); },
  async setBuild(versionId, build) {
    return durable(() => sb.from('versions').update({ build }).eq('id', versionId));
  },

  /* ---- comms / messages ---- */
  async addComm(row) { return durable(() => sb.from('comms').insert(row).select().single()); },
  async setCommStatus(id, status) {
    return durable(() => sb.from('comms').update({ status, updated_at: new Date().toISOString() }).eq('id', id));
  },
  async setCommFields(id, patch) {
    return durable(() => sb.from('comms').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
  },
  async messagesFor(parentIds) {
    if (!parentIds.length) return {};
    const r = await durable(() => sb.from('messages').select('*').in('parent_id', parentIds).order('created_at'));
    const map = {};
    (r.data || []).forEach((m) => { (map[m.parent_id] = map[m.parent_id] || []).push(m); });
    return map;
  },
  async addMessage(orgId, parentKind, parentId, body, authorName, userId) {
    return durable(() => sb.from('messages').insert({
      org_id: orgId, parent_kind: parentKind, parent_id: parentId,
      author_kind: 'team', author_name: authorName, author_user: userId, body
    }).select().single());
  },
  async markRead(userId, commId) {
    return durable(() => sb.from('read_marks').upsert({ user_id: userId, comm_id: commId }));
  },

  /* ---- input requests / discovery ---- */
  async addRequest(row) { return durable(() => sb.from('input_requests').insert(row).select().single()); },
  async setRequestStatus(id, status) {
    return durable(() => sb.from('input_requests').update({ status }).eq('id', id));
  },
  async deleteRequest(id) { return durable(() => sb.from('input_requests').delete().eq('id', id)); },
  async addDiscovery(row) { return durable(() => sb.from('discovery_entries').insert(row).select().single()); },
  async updateDiscovery(id, patch) {
    return durable(() => sb.from('discovery_entries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
  },
  async deleteDiscovery(id) { return durable(() => sb.from('discovery_entries').delete().eq('id', id)); },

  /* ---- shares (SME links) ---- */
  sharePut(pid, kind, seq, payload, token) {
    return rpc('share_put', { p_project: pid, p_kind: kind, p_seq: seq, p_payload: payload, p_token: token || null });
  },
  shareRevoke(token) { return rpc('share_revoke', { p_token: token }); },
  async sharesFor(pid) {
    const r = await durable(() => sb.from('shares')
      .select('token,kind,version_seq,revoked,updated_at,sections:payload->sections').eq('project_id', pid));
    return r.data || [];
  },
  getShare(token) { return rpc('get_share', { p_token: token }); },
  submitShare(token, payload) { return rpc('submit_share_v2', { p_token: token, p_payload: payload }); },
  smeThread(replyToken) { return rpc('sme_thread', { p_reply_token: replyToken }); },
  smeReply(replyToken, body) { return rpc('sme_reply', { p_reply_token: replyToken, p_body: body }); },
  smeSeat(pid, name, email) { return rpc('sme_seat', { p_project: pid, p_name: name, p_email: email }); },
  smeSeats(pid) { return rpc('sme_seats', { p_project: pid }); },

  /* ---- attachments (files from team, partners, seated SMEs) ---- */
  async attachmentsFor(pid) {
    const r = await durable(() => sb.from('attachments')
      .select('id,comm_id,message_id,uploader_kind,uploader_name,file_name,mime,size_bytes,storage_path,scan_status,created_at')
      .eq('project_id', pid).order('created_at'));
    return r.data || [];
  },
  async signedUrl(path) {
    try { const r = await sb.storage.from('attachments').createSignedUrl(path, 120); return (r.data && r.data.signedUrl) || null; }
    catch { return null; }
  },
  // Uploads through the scanning edge function. `opts` carries either a
  // reply_token (accountless SME) or a comm_id (team/partner, with their JWT).
  async uploadAttachment(file, opts = {}) {
    if (!sb || !CFG.url) return { error: { message: 'offline' } };
    const fd = new FormData();
    fd.append('file', file);
    if (opts.replyToken) fd.append('reply_token', opts.replyToken);
    if (opts.commId) fd.append('comm_id', opts.commId);
    const headers = { apikey: CFG.anon };
    try {
      const s = await sb.auth.getSession();
      const tok = s && s.data && s.data.session && s.data.session.access_token;
      if (tok) headers.Authorization = 'Bearer ' + tok;
    } catch { /* accountless SME has no session */ }
    try {
      const res = await fetch(CFG.url + '/functions/v1/attachment-upload', { method: 'POST', body: fd, headers });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) return { error: { message: j.error || 'upload failed' }, data: j };
      return { data: j };
    } catch (e) { return { error: { message: (e && e.message) || 'network' } }; }
  },
  requestView(token) { return rpc('request_view', { p_token: token }); },
  requestSubmit(token, name, body) { return rpc('request_submit', { p_token: token, p_name: name, p_body: body }); },

  /* ---- partner portal ---- */
  partnerProjects() { return rpc('partner_projects_v2'); },
  partnerPresentToken(pid) { return rpc('partner_present_token', { p_project: pid }); },
  partnerThread(pid) { return rpc('partner_thread_v2', { p_project: pid }); },
  partnerPost(pid, body) { return rpc('partner_post', { p_project: pid, p_body: body }); },
  partnerReply(commId, body) { return rpc('partner_reply', { p_comm: commId, p_body: body }); },
  partnerUpdateProfile(name, title, company) {
    return rpc('partner_update_profile', { p_name: name, p_title: title, p_company: company });
  },

  /* ---- activity ---- */
  async activity(pid, limit = 80) {
    const r = await durable(() => sb.from('activity').select('*')
      .eq('project_id', pid).order('id', { ascending: false }).limit(limit));
    return r.data || [];
  },
  async orgActivity(orgId, limit = 60) {
    const r = await durable(() => sb.from('activity').select('*')
      .eq('org_id', orgId).order('id', { ascending: false }).limit(limit));
    return r.data || [];
  }
};

/* ---- Curated SME share payloads (public-safe subsets; no internal fields) ---- */
export function stripInternal(obj) {
  if (Array.isArray(obj)) return obj.map(stripInternal);
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const k of Object.keys(obj)) { if (k !== '_k') o[k] = stripInternal(obj[k]); }
    return o;
  }
  return obj;
}
/* Brief payloads are section-scoped: only the answer fields backing the
   selected sections are included, so unshared content is absent from the
   payload itself — not merely hidden by the page that renders it. */
export function buildSharePayload(project, answers, versionLabel, seq, kind, build, sectionKeys) {
  const filled = (arr) => (arr || []).filter((r) => Object.keys(r || {}).some((c) => c !== '_k' && r[c] && String(r[c]).trim()));
  if (kind === 'pilot') {
    return {
      product: project.name || '', label: versionLabel || '', build: build || '',
      answers: { components: filled(answers.components).map((c) => ({ name: c.name })) }
    };
  }
  const secs = Array.isArray(sectionKeys) && sectionKeys.length
    ? sectionKeys
    : BRIEF_SECTIONS.map((s) => s.key);
  const ca = { ctrl_org: answers.ctrl_org, ctrl_product: answers.ctrl_product };
  // Registry-driven: copy the backing fields of each selected section. A section
  // added to BRIEF_SECTIONS is therefore shareable with no change to this file.
  for (const s of BRIEF_SECTIONS) {
    if (!secs.includes(s.key)) continue;
    for (const f of (s.fields || [])) if (answers[f] !== undefined) ca[f] = answers[f];
  }
  // Shaping for the two structured sections: components carry name + description;
  // requirement grouping needs component names even when components is not shared.
  if (secs.includes('pieces')) ca.components = filled(answers.components).map((c) => ({ name: c.name, desc: c.desc }));
  if (secs.includes('willdo')) {
    ca.fr = (answers.fr || []).map((x) => ({ stmt: x.stmt || '', comp: x.comp || '' }));
    if (!secs.includes('pieces')) ca.components = filled(answers.components).map((c) => ({ name: c.name }));
  }
  // The assigned collaborator logo travels with the brief so accountless SMEs
  // and partners see it on the PRD (they cannot read the projects table).
  return {
    product: project.name || '', label: versionLabel || '', sections: secs,
    logo: project.brand_logo || '', brandLabel: project.brand_label || '',
    answers: stripInternal(ca)
  };
}
