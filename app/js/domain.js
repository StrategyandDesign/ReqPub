/* ============================================================================
   ReqPub v2 — domain logic (framework-free, fully testable in Node)
   The question bank, the deterministic PRD builders, the review brief,
   markdown rendering, and version diffing. Ported from v1 verbatim where the
   behavior was already right; the storage shape it consumes is unchanged:
   an `answers` object `a` where scalars are strings, list questions are
   arrays of strings, and rows questions are arrays of objects with `_k`.
   ============================================================================ */

import { esc } from './core.js';

/* ---- Template sections ---- */
export const SECTIONS = [
  { key: 'control', num: null, title: 'Document Control' },
  { key: 'overview', num: 1, title: 'Overview' },
  { key: 'users', num: 2, title: 'Users and Context' },
  { key: 'solution', num: 3, title: 'Solution Overview' },
  { key: 'metrics', num: 4, title: 'Success Metrics' },
  { key: 'method', num: 5, title: 'Requirements Method and Conventions' },
  { key: 'adc', num: 6, title: 'Assumptions, Dependencies, and Constraints' },
  { key: 'functional', num: 7, title: 'Functional Requirements' },
  { key: 'nonfunctional', num: 8, title: 'Non-Functional Requirements' },
  { key: 'aieval', num: 9, title: 'AI Evaluation Criteria', cond: (a) => a.has_ai === 'Yes' },
  { key: 'data', num: 10, title: 'Data, Privacy, and Safeguarding' },
  { key: 'interfaces', num: 11, title: 'Interfaces and Integrations' },
  { key: 'verification', num: 12, title: 'Verification and Acceptance' },
  { key: 'traceability', num: 13, title: 'Traceability' },
  { key: 'people', num: 14, title: 'People, Roles, and Links' },
  { key: 'glossary', num: 15, title: 'Glossary' },
  { key: 'revision', num: 16, title: 'Revision History' }
];
export const SECNUM2KEY = {};
SECTIONS.forEach((s) => { if (s.num != null) SECNUM2KEY[s.num] = s.key; });

/* ---- Question bank ---- */
export const Q = [
  { id: 'ctrl_product', sec: 'control', type: 'short', prompt: 'Product or project name', help: 'The name of the product or project this document specifies.', ph: 'e.g. RecordMade', req: true },
  { id: 'ctrl_org', sec: 'control', type: 'short', prompt: 'Venture or organization', help: 'Who owns the product or project.', ph: 'e.g. Collection Ventures' },
  { id: 'ctrl_owner', sec: 'control', type: 'short', prompt: 'Document owner', help: 'Person accountable for this document.', ph: 'Name' },
  { id: 'ctrl_status', sec: 'control', type: 'choice', prompt: 'Status', options: ['Draft', 'In Review', 'Approved'], help: 'Lifecycle state of this baseline.' },
  { id: 'ctrl_approvers', sec: 'control', type: 'rows', prompt: 'Approvals', help: 'The roles that sign off this document.', add: 'Add approver', cols: [{ k: 'role', l: 'Role', ph: 'Product / Engineering / Data and Privacy / Sponsor' }, { k: 'name', l: 'Name', ph: 'Name' }] },

  { id: 'ov_purpose', sec: 'overview', type: 'long', prompt: 'Purpose and audience of this document', help: 'Why this document exists, who will read it, and how the technology team will use it.', ph: 'This document defines the requirements for ... It is written for ...' },
  { id: 'ov_vision', sec: 'overview', type: 'long', prompt: 'Product vision', help: 'The long-term vision and the value delivered to users and the business.', req: true },
  { id: 'ov_problem', sec: 'overview', type: 'long', prompt: 'Problem statement', help: 'The user pain or business opportunity, with evidence where you have it, and why solving it matters for the client right now.', req: true },
  { id: 'ov_market', sec: 'overview', type: 'long', prompt: 'Opportunity and market', help: 'Market size and the segments served. Numbers where you have them.' },
  { id: 'ov_goals', sec: 'overview', type: 'list', prompt: 'Goals and objectives', help: 'Each measurable where possible.', add: 'Add goal', ph: 'A measurable goal' },

  { id: 'seg', sec: 'users', type: 'rows', prompt: 'User segments', help: 'The segments the product serves and their relative size or priority.', add: 'Add segment', cols: [{ k: 'segment', l: 'Segment', ph: 'Segment name' }, { k: 'share', l: 'Share or priority', ph: 'e.g. 34% or High' }, { k: 'desc', l: 'Description', ph: 'One line' }] },
  { id: 'persona', sec: 'users', type: 'rows', prompt: 'Personas', help: 'Key personas and what each one needs from the product.', add: 'Add persona', cols: [{ k: 'persona', l: 'Persona', ph: 'e.g. The operator' }, { k: 'needs', l: 'Needs', ph: 'What they need' }] },
  { id: 'context', sec: 'users', type: 'long', prompt: 'Operating context', help: 'Where and how the product is used: platforms, devices, connectivity, setting constraints.' },

  { id: 'sol_solution', sec: 'solution', type: 'long', prompt: 'The solution and its core capability', help: 'Describe the solution at a high level and the capability that addresses the problem.', req: true },
  { id: 'sol_in', sec: 'solution', type: 'list', prompt: 'In scope', help: 'What the product will do, stated as capabilities rather than feature names.', add: 'Add capability', ph: 'A capability' },
  { id: 'sol_out', sec: 'solution', type: 'list', prompt: 'Out of scope', help: 'What the product will not do. The clearest protection against scope creep during handoff. Do not leave it blank.', add: 'Add exclusion', ph: 'An exclusion' },
  { id: 'staged', sec: 'solution', type: 'choice', prompt: 'Is the product staged across releases?', options: ['Yes', 'No'], help: 'If yes, you will describe each release.' },
  { id: 'release', sec: 'solution', type: 'rows', prompt: 'Release plan', help: 'Each release and its objective.', add: 'Add release', cond: (a) => a.staged === 'Yes', cols: [{ k: 'rel', l: 'Release', ph: 'e.g. V1 Foundational' }, { k: 'obj', l: 'Objective', ph: 'What this release delivers' }, { k: 'mvp', l: 'MVP date', ph: 'to confirm' }, { k: 'ship', l: 'Release date', ph: 'to confirm' }] },
  { id: 'components', sec: 'solution', type: 'rows', prompt: 'Components and workstreams', help: 'Large sub-features and workstreams delivered inside this product, each with an owner and a status. A sub-feature stays in this one document. Tag its requirements to it in Sections 7 to 11. A component is a vertical slice that can span functional, non-functional, evaluation, and interface requirements.', add: 'Add component', cols: [{ k: 'name', l: 'Component', ph: 'e.g. E-Signature' }, { k: 'owner', l: 'Owner', ph: 'Who owns it' }, { k: 'status', l: 'Status', sel: ['Planned', 'Active', 'In Review', 'Shipped', 'Blocked'] }, { k: 'desc', l: 'Description', ph: 'One line' }] },

  { id: 'metrics', sec: 'metrics', type: 'rows', prompt: 'Success metrics', help: 'Each metric with a target and a measurement method.', add: 'Add metric', cols: [{ k: 'metric', l: 'Metric', ph: 'e.g. Completion rate' }, { k: 'target', l: 'Target', ph: 'e.g. at least 75%' }, { k: 'method', l: 'Measurement method', ph: 'How it is measured' }] },

  { id: 'assume', sec: 'adc', type: 'list', prompt: 'Assumptions', help: 'Conditions assumed true. If one proves false it usually becomes a risk.', add: 'Add assumption', ph: 'An assumption' },
  { id: 'depend', sec: 'adc', type: 'list', prompt: 'Dependencies', help: 'Other systems, vendors, data, or decisions outside the team.', add: 'Add dependency', ph: 'A dependency' },
  { id: 'constrain', sec: 'adc', type: 'list', prompt: 'Constraints', help: 'Fixed limits the solution must respect: platform, budget, schedule, standards, policy.', add: 'Add constraint', ph: 'A constraint' },

  { id: 'fr', sec: 'functional', type: 'rows', prompt: 'Functional requirements', help: 'Each function as a single, testable requirement. Every requirement needs a fit criterion: the measurable condition that defines acceptance.', add: 'Add requirement', req: true, cols: [{ k: 'stmt', l: 'Requirement', ph: 'When the user does X, the system does Y.' }, { k: 'fit', l: 'Fit criterion and acceptance', ph: 'The measurable acceptance condition. End with Test, Inspection, or Demonstration.' }, { k: 'pri', l: 'Priority', sel: ['Must', 'Should', 'Could', "Won't"] }, { k: 'comp', l: 'Component', dyn: 'components' }] },

  { id: 'nfr', sec: 'nonfunctional', type: 'rows', prompt: 'Non-functional requirements', help: 'Quality requirements. Replace fast and secure with numbers and conditions. Consider performance, security, reliability, availability, scalability, accessibility, compliance.', add: 'Add requirement', cols: [{ k: 'stmt', l: 'Requirement', ph: 'Quality requirement with a number' }, { k: 'fit', l: 'Fit criterion and acceptance', ph: 'Measured condition' }, { k: 'pri', l: 'Priority', sel: ['Must', 'Should', 'Could', "Won't"] }, { k: 'comp', l: 'Component', dyn: 'components' }] },

  { id: 'has_ai', sec: 'aieval', type: 'choice', prompt: 'Does the product include AI, probabilistic, or generative components?', options: ['Yes', 'No'], help: 'Such components cannot be verified by a single expected output. They need evaluation criteria against a golden dataset. This unlocks Section 9.', req: true },
  { id: 'eval', sec: 'aieval', type: 'rows', prompt: 'AI evaluation criteria', help: 'For each quality dimension, state the metric, the method, and a numeric threshold against a golden dataset. Always include a grounding or hallucination guardrail and a safety threshold.', add: 'Add criterion', cond: (a) => a.has_ai === 'Yes', cols: [{ k: 'dim', l: 'Quality dimension', ph: 'e.g. Hallucination guardrail' }, { k: 'metric', l: 'Metric and method', ph: 'What is measured and how' }, { k: 'thresh', l: 'Threshold', ph: 'e.g. at least 95%' }, { k: 'comp', l: 'Component', dyn: 'components' }] },
  { id: 'golden', sec: 'aieval', type: 'long', prompt: 'Golden dataset and red-team approach', help: 'What the labeled benchmark set covers, and how you probe for hallucination and sycophancy.', cond: (a) => a.has_ai === 'Yes' },

  { id: 'data_entities', sec: 'data', type: 'rows', prompt: 'Data entities held', help: 'Each data entity the product holds and its sensitivity.', add: 'Add entity', cols: [{ k: 'entity', l: 'Data entity', ph: 'e.g. Assessment responses' }, { k: 'sens', l: 'Sensitivity', ph: 'e.g. Personal and sensitive' }] },
  { id: 'vulnerable', sec: 'data', type: 'choice', prompt: 'Does the product serve vulnerable users or collect sensitive data?', options: ['Yes', 'No'], help: 'If yes, a safeguarding response is required and needs clinical or policy sign-off.' },
  { id: 'safeguard', sec: 'data', type: 'long', prompt: 'Safeguarding response', help: 'What the platform does if responses indicate a user may be at risk. Triggers and response require clinical and policy review.', cond: (a) => a.vulnerable === 'Yes' },
  { id: 'consent', sec: 'data', type: 'long', prompt: 'Consent approach', help: 'How informed consent is obtained and recorded before collection.' },
  { id: 'retention', sec: 'data', type: 'long', prompt: 'Retention and deletion', help: 'How long data is kept, and how export and deletion requests are handled.' },
  { id: 'residency', sec: 'data', type: 'short', prompt: 'Data residency', help: 'Where personal data is stored and processed, including any cross-border processing.' },
  { id: 'access', sec: 'data', type: 'long', prompt: 'Access control', help: 'Who can access the data and on what authorization. Whether access is logged.' },

  { id: 'interfaces', sec: 'interfaces', type: 'rows', prompt: 'Interfaces and integrations', help: 'Each boundary to the world: people, devices, systems, protocols. Identity, external systems, models.', add: 'Add interface', cols: [{ k: 'iface', l: 'Interface or system', ph: 'e.g. Identity system' }, { k: 'req', l: 'Requirement', ph: 'What it must do' }, { k: 'fit', l: 'Fit criterion', ph: 'Acceptance condition' }, { k: 'comp', l: 'Component', dyn: 'components' }] },

  { id: 'verify_note', sec: 'verification', type: 'long', prompt: 'Release-specific acceptance notes', help: 'Optional. Anything beyond the standard acceptance rule. Leave blank to use the standard text.' },

  { id: 'people', sec: 'people', type: 'rows', prompt: 'People and roles', help: 'The team and their roles on this product.', add: 'Add person', cols: [{ k: 'name', l: 'Name', ph: 'Name' }, { k: 'role', l: 'Role', ph: 'Role' }] },
  { id: 'link_repo', sec: 'people', type: 'short', prompt: 'Repository link', help: 'Code repository.' },
  { id: 'link_board', sec: 'people', type: 'short', prompt: 'Project board link', help: 'Where work is tracked.' },
  { id: 'link_design', sec: 'people', type: 'short', prompt: 'Design link', help: 'Mockups, design files, or product URL.' },

  { id: 'glossary', sec: 'glossary', type: 'rows', prompt: 'Glossary', help: 'Terms specific to this product and their definitions.', add: 'Add term', cols: [{ k: 'term', l: 'Term', ph: 'Term' }, { k: 'def', l: 'Definition', ph: 'Definition' }] }
];
export const qById = Object.fromEntries(Q.map((q) => [q.id, q]));
export const qBySec = (k) => Q.filter((q) => q.sec === k);
export const visQ = (a) => Q.filter((q) => !q.cond || q.cond(a));
export function isAnswered(q, v) {
  if (v == null || v === '') return false;
  if (q.type === 'list') return (v || []).some((s) => s && String(s).trim());
  if (q.type === 'rows') return (v || []).some((r) => Object.keys(r || {}).some((c) => c !== '_k' && r[c] && String(r[c]).trim()));
  return true;
}

/* ---- Assemble the builders' answers object from relational state ----
   fields: { field_id: {value, rev} }   rows: { field_id: [{id,k,data,pos,rev}] } */
export function assembleAnswers(fields, rows) {
  const a = {};
  for (const [fid, f] of Object.entries(fields || {})) a[fid] = f.value;
  for (const q of Q) {
    const rs = (rows && rows[q.id]) || [];
    if (q.type === 'rows') a[q.id] = rs.map((r) => ({ ...r.data, _k: r.k }));
    else if (q.type === 'list') a[q.id] = rs.map((r) => String((r.data && r.data.text) || ''));
  }
  return a;
}

/* ---- Markdown building blocks ---- */
export function mdTable(headers, rows) {
  if (!rows.length) return '';
  return '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |\n' +
    rows.map((r) => '| ' + r.map((c) => (c == null ? '' : String(c)).replace(/\n+/g, ' ').replace(/\|/g, '/')).join(' | ') + ' |').join('\n');
}
export const bullets = (arr) => (arr || []).filter((s) => s && String(s).trim()).map((s) => '- ' + s).join('\n');
export const rowsFilled = (arr) => (arr || []).filter((r) => Object.keys(r || {}).some((c) => c !== '_k' && r[c] && String(r[c]).trim()));
export const idOf = (prefix, row, i) => prefix + '-' + String(row._k != null ? row._k : i + 1).padStart(3, '0');
const naField = () => '[ to confirm ]';

export function suggestFit(stmt) {
  stmt = (stmt || '').replace(/\s+/g, ' ').trim();
  if (!stmt) return '';
  let s = stmt.split(/[.!?\n]/)[0].trim();
  if (s.length > 110) s = s.slice(0, 110).trim() + '…';
  return 'The requirement is met when: ' + s + '. Verified by [Test / Inspection / Demonstration / Analysis]. Measure: [target value].';
}

/* ---- Section builders (deterministic; identical output to v1) ---- */
function bControl(a, label) {
  let out = '# ' + (a.ctrl_product || 'Untitled') + '\n';
  const mp = [];
  if (a.ctrl_org) mp.push(a.ctrl_org);
  mp.push('Version ' + (label || 'Draft'));
  mp.push('Status ' + (a.ctrl_status || 'Draft'));
  mp.push(new Date().toLocaleDateString());
  mp.push('Owner ' + (a.ctrl_owner || 'to confirm'));
  out += '\n<meta>' + mp.join('  ·  ') + '</meta>\n';
  const ap = rowsFilled(a.ctrl_approvers);
  if (ap.length) out += '\n### Approvals\n\n' + mdTable(['Role', 'Name', 'Date'], ap.map((r) => [r.role || '', r.name || '', '']));
  return out;
}
function bOverview(a) {
  const p = ['## 1. Overview'];
  if (a.ov_purpose) p.push('### 1.1 Purpose and Audience\n\n' + a.ov_purpose);
  if (a.ov_vision) p.push('### 1.2 Product Vision\n\n' + a.ov_vision);
  if (a.ov_problem) p.push('### 1.3 Problem Statement\n\n' + a.ov_problem);
  if (a.ov_market) p.push('### 1.4 Opportunity and Market\n\n' + a.ov_market);
  const g = bullets(a.ov_goals);
  if (g) p.push('### 1.5 Goals and Objectives\n\n' + g);
  return p.length > 1 ? p.join('\n\n') : null;
}
function bUsers(a) {
  const seg = rowsFilled(a.seg), per = rowsFilled(a.persona);
  if (!seg.length && !per.length && !a.context) return null;
  const p = ['## 2. Users and Context'];
  if (seg.length) p.push('### 2.1 User Segments\n\n' + mdTable(['Segment', 'Share or Priority', 'Description'], seg.map((r) => [r.segment || '', r.share || '', r.desc || ''])));
  if (per.length) p.push('### 2.2 Personas\n\n' + mdTable(['Persona', 'Needs'], per.map((r) => [r.persona || '', r.needs || ''])));
  if (a.context) p.push('### 2.3 Operating Context\n\n' + a.context);
  return p.join('\n\n');
}
function bSolution(a) {
  if (!a.sol_solution && !(a.sol_in || []).length && !(a.sol_out || []).length) return null;
  const p = ['## 3. Solution Overview'];
  if (a.sol_solution) p.push('### 3.1 The Solution\n\n' + a.sol_solution);
  const inb = bullets(a.sol_in), outb = bullets(a.sol_out);
  if (inb || outb) p.push('### 3.2 Scope\n\n' + (inb ? '**In scope**\n\n' + inb + '\n\n' : '') + (outb ? '**Out of scope**\n\n' + outb : ''));
  if (a.staged === 'Yes') {
    const rel = rowsFilled(a.release);
    if (rel.length) p.push('### 3.3 Release Plan\n\n' + mdTable(['Release', 'Objective', 'MVP date', 'Release date'], rel.map((r) => [r.rel || '', r.obj || '', r.mvp || 'to confirm', r.ship || 'to confirm'])));
  }
  const comps = rowsFilled(a.components);
  if (comps.length) {
    const groups = {}; comps.forEach((c) => { groups[c.name] = []; });
    const unassigned = [];
    const collect = (key, pre) => {
      (a[key] || []).forEach((r, i) => {
        const has = Object.keys(r || {}).some((k) => k !== '_k' && k !== 'comp' && r[k] && String(r[k]).trim());
        if (!has) return;
        const id = pre + '-' + String(r._k != null ? r._k : i + 1).padStart(3, '0');
        if (r.comp && groups[r.comp] !== undefined) groups[r.comp].push(id); else unassigned.push(id);
      });
    };
    collect('fr', 'FR'); collect('nfr', 'NFR'); collect('eval', 'EVAL'); collect('interfaces', 'IR');
    const trows = comps.map((c) => {
      const ids = groups[c.name] || [];
      return [c.name || '', c.owner || 'to confirm', c.status || 'Active', ids.length ? ids.length + ': ' + ids.join(', ') : 'none yet', c.desc || ''];
    });
    if (unassigned.length) trows.push(['Unassigned', '—', '—', unassigned.length + ': ' + unassigned.join(', '), 'Requirements not yet tagged to a component']);
    p.push('### 3.4 Components and Ownership\n\nThe product is delivered as named components, each with an owner and a status. A component is a vertical slice that may span functional, non-functional, evaluation, and interface requirements. The canonical requirement text stays in Sections 7 to 11; this table maps each component to its owner and the requirements it covers.\n\n' + mdTable(['Component', 'Owner', 'Status', 'Requirements', 'Description'], trows));
  }
  return p.join('\n\n');
}
function bMetrics(a) {
  const m = rowsFilled(a.metrics);
  if (!m.length) return null;
  return '## 4. Success Metrics\n\n' + mdTable(['Metric', 'Target', 'Measurement Method'], m.map((r) => [r.metric || '', r.target || '', r.method || '']));
}
const METHOD = '## 5. Requirements Method and Conventions\n\n' +
  '**Identifiers.** FR for functional, NFR for non-functional, EVAL for an AI evaluation criterion, DR for data and privacy, IR for interface. Identifiers are permanent and are not reused.\n\n' +
  '**Fit criterion.** Every requirement carries a measurable fit criterion that defines acceptance. A requirement with no fit criterion is not finished.\n\n' +
  "**Priority.** MoSCoW: Must, Should, Could, or Won't for the stated release.\n\n" +
  '**Verification.** Deterministic requirements are verified by test, inspection, or demonstration. Probabilistic or AI components are verified by evaluation against a golden dataset with a stated threshold, because the same input can produce different outputs and correctness is a distribution rather than a single value. Safety requirements are verified on a red-team set with human review.\n\n' +
  '**Open items.** A value marked [to confirm] is a proposed default awaiting stakeholder confirmation.';
function bADC(a) {
  const as = bullets(a.assume), de = bullets(a.depend), co = bullets(a.constrain);
  if (!as && !de && !co) return null;
  const p = ['## 6. Assumptions, Dependencies, and Constraints'];
  if (as) p.push('### 6.1 Assumptions\n\n' + as);
  if (de) p.push('### 6.2 Dependencies\n\n' + de);
  if (co) p.push('### 6.3 Constraints\n\n' + co);
  return p.join('\n\n');
}
function bFunctional(a) {
  const fr = rowsFilled(a.fr);
  if (!fr.length) return null;
  return '## 7. Functional Requirements\n\n' + mdTable(['ID', 'Requirement', 'Fit Criterion and Acceptance', 'Priority'], fr.map((r, i) => [idOf('FR', r, i), r.stmt || '', r.fit || naField(), r.pri || 'Must']));
}
function bNonFunctional(a) {
  const nf = rowsFilled(a.nfr);
  if (!nf.length) return null;
  return '## 8. Non-Functional Requirements\n\n' + mdTable(['ID', 'Requirement', 'Fit Criterion and Acceptance', 'Priority'], nf.map((r, i) => [idOf('NFR', r, i), r.stmt || '', r.fit || naField(), r.pri || 'Must']));
}
function bAIEval(a) {
  if (a.has_ai !== 'Yes') return null;
  const ev = rowsFilled(a.eval);
  const p = ['## 9. AI Evaluation Criteria'];
  if (ev.length) p.push(mdTable(['ID', 'Quality Dimension', 'Metric and Method', 'Threshold'], ev.map((r, i) => [idOf('EVAL', r, i), r.dim || '', r.metric || '', r.thresh || naField()])));
  else p.push('_Evaluation criteria to confirm. Always include a grounding or hallucination guardrail and a safety threshold._');
  if (a.golden) p.push('**Golden dataset and red-team method.** ' + a.golden);
  return p.join('\n\n');
}
function bData(a) {
  const ent = rowsFilled(a.data_entities);
  if (!ent.length && !a.consent && !a.retention && !a.access && !a.residency && a.vulnerable !== 'Yes') return null;
  const rows = [];
  let n = 0;
  const add = (stmt, fit, pri) => { n++; rows.push(['DR-' + String(n).padStart(3, '0'), stmt, fit, pri || 'Must']); };
  if (ent.length) {
    const inv = ent.map((r) => r.entity + (r.sens ? ' (' + r.sens + ')' : '')).join('; ');
    add('The platform identifies and records the data entities it holds: ' + inv, 'A data inventory lists each entity, its owner, and its sensitivity. Inspection.');
    add('Sensitive entities are classified and protected accordingly', 'Each sensitive entity carries a sensitivity classification and the matching controls. Inspection.');
  }
  if (a.consent) add(a.consent, 'Consent is captured and stored before collection begins. Test.');
  if (a.retention) add(a.retention, 'A retention schedule exists per entity, and export and deletion requests are fulfilled. Test.');
  if (a.residency) add(a.residency, 'A documented data residency position exists and the deployment conforms to it. Inspection.');
  if (a.access) add(a.access, 'Access controls restrict data to authorized roles and access is logged. Test.');
  if (a.vulnerable === 'Yes') add(a.safeguard || 'If responses indicate a user may be at risk, the platform responds appropriately, for example by surfacing support resources.', 'A defined safeguarding response exists and is triggered by the agreed indicators. Review and test. Requires clinical and policy sign-off.');
  if (!rows.length) return null;
  return '## 10. Data, Privacy, and Safeguarding\n\n' + mdTable(['ID', 'Requirement', 'Fit Criterion and Acceptance', 'Priority'], rows);
}
function bInterfaces(a) {
  const it = rowsFilled(a.interfaces);
  if (!it.length) return null;
  return '## 11. Interfaces and Integrations\n\n' + mdTable(['ID', 'Requirement', 'Fit Criterion and Acceptance', 'Priority'], it.map((r, i) => [idOf('IR', r, i), (r.iface ? r.iface + '. ' : '') + (r.req || ''), r.fit || naField(), 'Must']));
}
function bVerification(a) {
  const base = '## 12. Verification and Acceptance\n\nEvery requirement in this document carries a fit criterion. Deterministic requirements are verified by test, inspection, or demonstration. Probabilistic or AI components are verified by evaluation against a golden dataset with the stated threshold. Safety requirements are verified on a red-team or scenario set with human review. A release is accepted when every Must requirement for that release passes its fit criterion and every evaluation criterion meets its threshold.';
  return a.verify_note ? base + '\n\n' + a.verify_note : base;
}
function bTraceability(a) {
  const g = (a.ov_goals || []).filter((x) => x && x.trim());
  if (!g.length) return null;
  const mn = rowsFilled(a.metrics).map((m) => m.metric).filter(Boolean).slice(0, 2).join('; ');
  return '## 13. Traceability\n\nThe matrix links each goal to the requirements that serve it and to the metric that verifies it. It is maintained as requirements change.\n\n' +
    mdTable(['Goal', 'Supporting Requirements', 'Verification or KPI'], g.map((x) => [x, 'See Sections 7 to 11', mn || 'See Section 4']));
}
function bPeople(a) {
  const pe = rowsFilled(a.people);
  const p = ['## 14. People, Roles, and Links'];
  p.push('### 14.1 People and Roles\n\n' + (pe.length ? mdTable(['Name', 'Role'], pe.map((r) => [r.name || '', r.role || ''])) : '_To confirm._'));
  p.push('### 14.2 Collaboration Links\n\n- Repository: ' + (a.link_repo || 'to confirm') + '\n- Project board: ' + (a.link_board || 'to confirm') + '\n- Design: ' + (a.link_design || 'to confirm'));
  return p.join('\n\n');
}
function bGlossary(a) {
  const t = rowsFilled(a.glossary);
  return '## 15. Glossary\n\n' + (t.length ? mdTable(['Term', 'Definition'], t.map((r) => [r.term || '', r.def || ''])) : '_No product-specific terms recorded._');
}
function bRevision(versions) {
  if (!versions || !versions.length) return '## 16. Revision History\n\n_No baselined version yet. This document is a working draft._';
  const rows = versions.slice().sort((x, y) => x.seq - y.seq)
    .map((v) => [v.label, new Date(v.createdAt || v.created_at).toLocaleDateString(), v.author || v.author_name || '', v.note || (v.seq === 1 ? 'Initial baseline' : 'Revision')]);
  return '## 16. Revision History\n\n' + mdTable(['Version', 'Date', 'Author', 'Description'], rows);
}
const APX_A = '## Appendix A. AI Evaluation Method\n\n**Golden dataset.** A trusted, labeled set of representative inputs and expected outcomes, curated from vetted sources.\n\n**Evaluation harness.** An automated suite that runs each candidate build against the golden dataset and reports accuracy, latency, grounding, and guardrail metrics.\n\n**Thresholds.** Each EVAL requirement states a numeric threshold. A build that falls below threshold does not ship.\n\n**Red-teaming.** An adversarial set probes for hallucination and for sycophancy, the failure where an agent affirms an incorrect assertion. Safety thresholds are verified on this set.\n\n**Human review.** Generated output and guardrail outcomes are sampled and reviewed by a domain reviewer before and after release.\n\n**Regression.** The evaluation suite runs on every release, so accuracy and safety do not regress as prompts, models, or content change.';
const APX_B = '## Appendix B. Requirement Attribute Definitions\n\n' + mdTable(['Attribute', 'Definition'], [
  ['Identifier', 'Permanent unique ID of the form PREFIX-###.'],
  ['Statement', 'The requirement text.'],
  ['Fit criterion', 'The measurable condition that defines acceptance.'],
  ['Priority', "Must, Should, Could, or Won't for the stated release."],
  ['Verification', 'Test, inspection, demonstration, or evaluation.'],
  ['Status', 'Draft, Approved, Implemented, Verified, or Deferred.']
]);

export function buildSections(a, label, versions) {
  const s = {};
  s.control = bControl(a, label);
  s.overview = bOverview(a); s.users = bUsers(a); s.solution = bSolution(a); s.metrics = bMetrics(a);
  s.method = METHOD; s.adc = bADC(a); s.functional = bFunctional(a); s.nonfunctional = bNonFunctional(a);
  s.aieval = bAIEval(a); s.data = bData(a); s.interfaces = bInterfaces(a); s.verification = bVerification(a);
  s.traceability = bTraceability(a); s.people = bPeople(a); s.glossary = bGlossary(a); s.revision = bRevision(versions);
  return s;
}
export function assemble(sections, a) {
  const p = [];
  if (sections.control) p.push(sections.control);
  p.push('## Part I: Product Definition');
  ['overview', 'users', 'solution', 'metrics'].forEach((k) => { if (sections[k]) p.push(sections[k]); });
  p.push('## Part II: Requirements');
  ['method', 'adc', 'functional', 'nonfunctional', 'aieval', 'data', 'interfaces', 'verification', 'traceability', 'people', 'glossary', 'revision'].forEach((k) => { if (sections[k]) p.push(sections[k]); });
  if (a.has_ai === 'Yes') p.push(APX_A);
  p.push(APX_B);
  return p.join('\n\n');
}

/* ---- Brief sections: what a shared review brief can contain ----
   The team picks which of these an SME or partner sees. Filtering happens
   when the payload is BUILT, so unshared content never leaves the server. */
export const BRIEF_SECTIONS = [
  { key: 'building', label: 'What we are building', def: true },
  { key: 'goals', label: 'Goals', def: true },
  { key: 'who', label: 'Who it is for', def: true },
  { key: 'solution', label: 'The solution', def: true },
  { key: 'includes', label: 'What it includes', def: false },
  { key: 'pieces', label: 'Components', def: false },
  { key: 'willdo', label: 'What it will do', def: true },
  { key: 'success', label: 'Success metrics', def: false },
  { key: 'oos', label: 'Not in scope', def: true }
];
export const defaultBriefSections = () => BRIEF_SECTIONS.filter((s) => s.def).map((s) => s.key);

/* ---- The plain-language review brief (SME-facing) ---- */
export function bBrief(a) {
  const P = [];
  const wb = [];
  if (a.ov_vision) wb.push(a.ov_vision);
  if (a.ov_problem) wb.push('**The problem.** ' + a.ov_problem);
  if (a.ov_market) wb.push('**The opportunity.** ' + a.ov_market);
  if (wb.length) P.push('## What we are building\n\n' + wb.join('\n\n'));
  const goals = (a.ov_goals || []).filter(Boolean);
  if (goals.length) P.push('## Goals\n\n' + goals.map((x) => '- ' + x).join('\n'));
  const who = [];
  const personas = rowsFilled(a.persona);
  if (personas.length) who.push(personas.map((r) => '- **' + (r.persona || '') + '**' + (r.needs ? ': ' + r.needs : '')).join('\n'));
  const segs = rowsFilled(a.seg);
  if (segs.length) who.push('**Segments.** ' + segs.map((r) => (r.segment || '') + (r.desc ? ' (' + r.desc + ')' : '')).join('; '));
  if (a.context) who.push('**Where it is used.** ' + a.context);
  if (who.length) P.push('## Who it is for\n\n' + who.join('\n\n'));
  if (a.sol_solution) P.push('## The solution\n\n' + a.sol_solution);
  const inscope = (a.sol_in || []).filter(Boolean);
  if (inscope.length) P.push('## What it includes\n\n' + inscope.map((x) => '- ' + x).join('\n'));
  const comps = rowsFilled(a.components);
  if (comps.length) P.push('## The pieces\n\n' + comps.map((r) => '- **' + (r.name || '') + '**' + (r.desc ? ': ' + r.desc : '')).join('\n'));
  const fr = rowsFilled(a.fr);
  if (fr.length) {
    const byc = {}, order = [];
    fr.forEach((r) => {
      const c = (r.comp && r.comp.trim()) ? r.comp : 'General';
      if (!byc[c]) { byc[c] = []; order.push(c); }
      if (r.stmt && r.stmt.trim()) byc[c].push(r.stmt.trim());
    });
    const multi = order.length > 1 || (order.length === 1 && order[0] !== 'General');
    const blocks = order.filter((c) => byc[c].length).map((c) => (multi ? '**' + c + '**\n\n' : '') + byc[c].map((s) => '- ' + s).join('\n'));
    if (blocks.length) P.push('## What it will do\n\n' + blocks.join('\n\n'));
  }
  const mets = rowsFilled(a.metrics);
  if (mets.length) P.push('## What success looks like\n\n' + mets.map((r) => '- **' + (r.metric || '') + '**' + (r.target ? ': ' + r.target : '') + (r.method ? ' (measured by ' + r.method + ')' : '')).join('\n'));
  const oos = (a.sol_out || []).filter(Boolean);
  if (oos.length) P.push('## Not in scope\n\n' + oos.map((x) => '- ' + x).join('\n'));
  return P.join('\n\n');
}

/* ---- Markdown → HTML (document renderer) ---- */
function inlineMd(t) {
  t = esc(t);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\[\[hl\]\]/g, '<span class="hl">').replace(/\[\[\/hl\]\]/g, '</span>');
  return t;
}
function secNum(txt) {
  const m = /^(\d+(?:\.\d+)?)\.\s+([\s\S]*)$/.exec(txt);
  if (m) return '<span class="secn">' + m[1] + '</span><span>' + inlineMd(m[2]) + '</span>';
  return inlineMd(txt);
}
export function mdToHtml(md) {
  if (!md) return '';
  const lines = md.replace(/\r/g, '').split('\n'), out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.indexOf('<meta>') === 0) { out.push('<div class="doc-meta">' + esc(line.replace(/<\/?meta>/g, '')) + '</div>'); i++; continue; }
    if (line.trim().charAt(0) === '|') {
      const tb = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '|') { tb.push(lines[i]); i++; }
      const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const head = cells(tb[0]), body = tb.slice(2).map(cells);
      const idCol = head[0] === 'ID';
      const th = '<tr>' + head.map((h, c) => '<th' + (idCol && c === 0 ? ' class="idc"' : '') + '>' + inlineMd(h) + '</th>').join('') + '</tr>';
      const tr = body.map((r) => '<tr>' + head.map((_, c) => '<td' + (idCol && c === 0 ? ' class="idc"' : '') + '>' + inlineMd(r[c] || '') + '</td>').join('') + '</tr>').join('');
      out.push('<table><thead>' + th + '</thead><tbody>' + tr + '</tbody></table>');
      continue;
    }
    if (line.indexOf('## Part ') === 0) { out.push('<div class="part">' + esc(line.slice(3)) + '</div>'); i++; continue; }
    if (line.indexOf('# ') === 0) { out.push('<h1 id="docsec-control">' + inlineMd(line.slice(2)) + '</h1>'); i++; continue; }
    if (line.indexOf('## ') === 0) {
      const ht = line.slice(3);
      const nm = /^(\d+)\./.exec(ht);
      const sid = (nm && SECNUM2KEY[+nm[1]]) ? ' id="docsec-' + SECNUM2KEY[+nm[1]] + '"' : '';
      out.push('<h2' + sid + '>' + secNum(ht) + '</h2>'); i++; continue;
    }
    if (line.indexOf('### ') === 0) { out.push('<h3>' + secNum(line.slice(4)) + '</h3>'); i++; continue; }
    if (/^\s*-\s+/.test(line)) {
      const li = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) { li.push(lines[i].replace(/^\s*-\s+/, '')); i++; }
      out.push('<ul>' + li.map((x) => '<li>' + inlineMd(x) + '</li>').join('') + '</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const lo = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { lo.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      out.push('<ol>' + lo.map((x) => '<li>' + inlineMd(x) + '</li>').join('') + '</ol>'); continue;
    }
    if (line.indexOf('_') === 0 && line.trim().endsWith('_')) {
      out.push('<p><em>' + inlineMd(line.trim().slice(1, -1)) + '</em></p>'); i++; continue;
    }
    const par = [];
    while (i < lines.length && lines[i].trim() && !/^[#|]/.test(lines[i]) && lines[i].indexOf('<meta>') !== 0 && !/^\s*-\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) { par.push(lines[i]); i++; }
    out.push('<p>' + inlineMd(par.join(' ')) + '</p>');
  }
  return '<div class="md">' + out.join('') + '</div>';
}

/* ---- Requirement-level diff between two answer snapshots ---- */
export function reqDiff(prev, cur) {
  const groups = [['fr', 'FR'], ['nfr', 'NFR'], ['eval', 'EVAL'], ['interfaces', 'IR']];
  const added = [], modified = [], removed = [];
  const has = (r) => Object.keys(r || {}).some((k) => k !== '_k' && k !== 'comp' && r[k] && String(r[k]).trim());
  const sig = (r) => {
    const o = {};
    Object.keys(r || {}).sort().forEach((k) => { if (k !== '_k') o[k] = r[k]; });
    return JSON.stringify(o);
  };
  groups.forEach((g) => {
    const pa = {}, ca = {};
    (prev[g[0]] || []).forEach((r) => { if (r && r._k != null && has(r)) pa[r._k] = sig(r); });
    (cur[g[0]] || []).forEach((r) => { if (r && r._k != null && has(r)) ca[r._k] = sig(r); });
    Object.keys(ca).forEach((k) => {
      const id = g[1] + '-' + String(k).padStart(3, '0');
      if (!(k in pa)) added.push(id);
      else if (pa[k] !== ca[k]) modified.push(id);
    });
    Object.keys(pa).forEach((k) => { if (!(k in ca)) removed.push(g[1] + '-' + String(k).padStart(3, '0')); });
  });
  return { added, modified, removed };
}

/* ---- Change note for a freshly generated version ---- */
export function changeNote(prevSnapshot, curAnswers, isFirst) {
  if (isFirst) return 'Initial baseline';
  const rd = reqDiff((prevSnapshot && prevSnapshot.answers) || {}, curAnswers);
  const bits = [];
  if (rd.added.length) bits.push('+' + rd.added.length + ' requirement' + (rd.added.length === 1 ? '' : 's'));
  if (rd.modified.length) bits.push(rd.modified.length + ' modified');
  if (rd.removed.length) bits.push(rd.removed.length + ' removed');
  return bits.length ? bits.join(', ') : 'Revision';
}

/* ---- Executive summary data ---- */
export function execSummaryData(a) {
  const fr = rowsFilled(a.fr), nfr = rowsFilled(a.nfr), ev = rowsFilled(a.eval), ir = rowsFilled(a.interfaces);
  const musts = fr.filter((r) => (r.pri || 'Must') === 'Must').length;
  return {
    product: a.ctrl_product || 'Untitled', org: a.ctrl_org || '',
    vision: a.ov_vision || '', problem: a.ov_problem || '',
    goals: (a.ov_goals || []).filter(Boolean),
    metrics: rowsFilled(a.metrics),
    components: rowsFilled(a.components),
    counts: { fr: fr.length, nfr: nfr.length, eval: ev.length, ir: ir.length, musts },
    outOfScope: (a.sol_out || []).filter(Boolean)
  };
}
