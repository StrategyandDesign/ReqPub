/* ============================================================================
   ReqPub v2 - project templates (validated starters, tested)

   A template is a starter SHAPE, not a worked example: the structural rows a
   disciplined record opens with (approver slots, a first component, a first
   metric, a first requirement with the fit-criterion convention already in
   place), with 'to confirm' where a human decision is owed. The worked
   examples stay in supabase/seed-*.sql; a template teaches the same shape in
   the first five minutes without shipping their content to every workspace.

   Two invariants, both enforced by tests/templates.test.mjs:
   - Every field id a template touches exists in the question bank with the
     matching type (the same rule tools/gen-prd-seed.mjs enforces on seeds).
   - applyTemplate writes through the SAME rev-checked RPCs as live editing
     (repo.saveField / repo.upsertRow), sequentially, so row k order equals
     array order and nothing bypasses the server's concurrency or size rules.

   'to confirm' placeholders are deliberate: the record-health signals count
   them, so a fresh template opens with its own punch list.
   ============================================================================ */

import { Q, ENGAGEMENT } from './domain.js';

export const TEMPLATES = [
  {
    key: 'blank',
    label: 'Blank',
    tag: 'Start empty',
    desc: 'Nothing pre-filled. The guided worksheet from the first question.',
    scalars: {}, lists: {}, rows: {}
  },
  {
    key: 'product',
    label: 'Product requirements',
    tag: 'Default',
    desc: 'Approver slots, a first component, metric, and requirement, with the fit-criterion convention in place.',
    scalars: { ctrl_status: 'Draft' },
    lists: {
      ov_goals: ['to confirm - each goal measurable where possible'],
      sol_out: ['to confirm - the clearest protection against scope creep']
    },
    rows: {
      ctrl_approvers: [
        { role: 'Product', name: 'to confirm' },
        { role: 'Engineering', name: 'to confirm' },
        { role: 'Sponsor', name: 'to confirm' }
      ],
      components: [{ name: 'Core', owner: 'to confirm', status: 'Planned', desc: 'to confirm' }],
      metrics: [{ metric: 'to confirm', target: 'to confirm', method: 'to confirm' }],
      fr: [{ stmt: 'When the user does X, the system does Y.', fit: 'to confirm - the measurable acceptance condition. End with Test, Inspection, or Demonstration.', pri: 'Must', comp: 'Core' }],
      nfr: [{ stmt: 'to confirm - a quality requirement with a number', fit: 'to confirm', pri: 'Must', comp: 'Core' }]
    }
  },
  {
    key: 'engagement',
    label: 'Consulting engagement',
    tag: 'Charter',
    desc: 'The engagement record: objective, workstreams, stakeholders, and the decision log ready to defend.',
    scalars: { ctrl_type: ENGAGEMENT, ctrl_status: 'Draft' },
    lists: {
      ov_goals: ['to confirm - what this engagement must achieve, measurable where possible'],
      assume: ['to confirm - a condition assumed true; if it proves false it becomes a risk'],
      constrain: ['to confirm - a fixed limit the approach must respect']
    },
    rows: {
      ctrl_approvers: [
        { role: 'Engagement lead', name: 'to confirm' },
        { role: 'Client sponsor', name: 'to confirm' }
      ],
      components: [{ name: 'Workstream 1', owner: 'to confirm', status: 'Planned', desc: 'to confirm' }],
      metrics: [{ metric: 'to confirm', target: 'to confirm', method: 'to confirm' }],
      people: [
        { name: 'to confirm', role: 'Engagement lead' },
        { name: 'to confirm', role: 'Client sponsor' }
      ],
      decisions: [{ decision: 'to confirm - the first material decision', options: 'to confirm', rationale: 'to confirm', owner: 'to confirm', date: '', supersedes: '' }]
    }
  },  {
    key: 'gated',
    label: 'Stage-gated engagement',
    tag: 'Gated',
    desc: 'The engagement charter plus a gate plan - each gate a named decision with criteria, a deciding role, and a target date. Name the gate on the baseline; the gate packet carries the evidence into the room.',
    scalars: { ctrl_type: ENGAGEMENT, ctrl_status: 'Draft' },
    lists: {
      ov_goals: ['to confirm - what this engagement must achieve, measurable where possible'],
      assume: ['to confirm - a condition assumed true; if it proves false it becomes a risk'],
      constrain: ['to confirm - a fixed limit the approach must respect']
    },
    rows: {
      gates: [
        { gate: 'Discovery Complete', criteria: 'Discovery log promoted; open questions dispositioned', decider: 'Engagement lead', target: 'to confirm' },
        { gate: 'Requirements Baseline', criteria: 'Every Must has a fit criterion; named approvers assigned', decider: 'Sponsor', target: 'to confirm' },
        { gate: 'Design Baseline', criteria: 'Workstreams owned; interfaces stated with fit criteria', decider: 'Steering committee', target: 'to confirm' },
        { gate: 'Go-Live', criteria: 'Acceptance checklist green; approvals recorded on the baseline', decider: 'Sponsor', target: 'to confirm' }
      ],
      ctrl_approvers: [
        { role: 'Engagement lead', name: 'to confirm' },
        { role: 'Client sponsor', name: 'to confirm' }
      ],
      components: [{ name: 'Workstream 1', owner: 'to confirm', status: 'Planned', desc: 'to confirm' }],
      metrics: [{ metric: 'to confirm', target: 'to confirm', method: 'to confirm' }],
      people: [
        { name: 'to confirm', role: 'Engagement lead' },
        { name: 'to confirm', role: 'Client sponsor' }
      ],
      decisions: [{ decision: 'to confirm - the first material decision', options: 'to confirm', rationale: 'to confirm', owner: 'to confirm', date: '', supersedes: '' }]
    }
  },
  {
    key: 'baseline',
    label: 'Baseline assessment',
    tag: 'AI + safeguarding',
    desc: 'The diagnostic shape: Section 9 unlocked with guardrail criteria, data sensitivity, and safeguarding on.',
    scalars: {
      ctrl_status: 'Draft',
      has_ai: 'Yes',
      vulnerable: 'Yes',
      golden: 'to confirm - what the labeled benchmark set covers, and how hallucination and sycophancy are probed',
      safeguard: 'to confirm - the response if answers indicate a user may be at risk; requires clinical or policy review'
    },
    lists: {
      sol_out: ['Any clinical diagnosis, label, or treatment recommendation.']
    },
    rows: {
      ctrl_approvers: [
        { role: 'Product', name: 'to confirm' },
        { role: 'Data and Privacy', name: 'to confirm' },
        { role: 'Clinical or policy review', name: 'to confirm' }
      ],
      eval: [
        { dim: 'Grounding / hallucination guardrail', metric: 'to confirm - what is measured and how', thresh: 'to confirm', comp: '' },
        { dim: 'Safety on distress content', metric: 'to confirm - red-team set with human review', thresh: 'to confirm', comp: '' }
      ],
      data_entities: [{ entity: 'Assessment responses', sens: 'Personal and sensitive' }],
      metrics: [{ metric: 'Scoring correctness', target: '100% agreement with the reference model on golden fixtures', method: 'Automated tests against labeled fixtures on every release.' }],
      fr: [{ stmt: 'When a respondent completes the assessment, the system computes their result deterministically from the scoring model.', fit: 'to confirm - 100% agreement with labeled fixtures. Test.', pri: 'Must', comp: '' }]
    }
  }
];

export const templateByKey = (key) => TEMPLATES.find((t) => t.key === key) || null;

/* Validate one template against the question bank: every id must exist with
   the matching question type. Throws with the offending id. This is the same
   contract the seed generator enforces, applied to the in-app starters. */
export function validateTemplate(t) {
  const qById = Object.fromEntries(Q.map((q) => [q.id, q]));
  const need = (id, kinds) => {
    const q = qById[id];
    if (!q) throw new Error(t.key + ': unknown field id ' + id);
    if (!kinds.includes(q.type)) throw new Error(t.key + ': ' + id + ' is a ' + q.type + ' question, not ' + kinds.join('/'));
  };
  for (const id of Object.keys(t.scalars || {})) need(id, ['short', 'long', 'choice']);
  for (const id of Object.keys(t.lists || {})) need(id, ['list']);
  for (const id of Object.keys(t.rows || {})) need(id, ['rows']);
  return true;
}

/* Apply a template to a freshly created project, through the live RPC layer.
   `name` (the project name the manager just typed) becomes ctrl_product so
   the document titles itself immediately. Writes run sequentially: scalars
   first, then each collection's rows in array order, so the server allocates
   k = 1..n in the order authored here. Returns { ok, fields, rows, failed }
   and never throws; a transient failure is counted, not fatal, because the
   project itself already exists and opens regardless. */
export async function applyTemplate(repo, pid, key, name) {
  const t = templateByKey(key);
  const out = { ok: true, fields: 0, rows: 0, failed: 0 };
  if (!t || t.key === 'blank') return out;             // blank is the pre-existing behavior: no writes
  const scalars = { ...(name ? { ctrl_product: name } : {}), ...t.scalars };

  for (const [id, value] of Object.entries(scalars)) {
    const r = await repo.saveField(pid, id, value, 0);
    if (r.error || !r.data || !r.data.ok) { out.failed++; out.ok = false; } else out.fields++;
  }
  const pushRows = async (id, items, toData) => {
    for (const item of items) {
      const r = await repo.upsertRow(pid, id, null, toData(item));
      if (r.error || !r.data || !r.data.ok) { out.failed++; out.ok = false; } else out.rows++;
    }
  };
  for (const [id, arr] of Object.entries(t.lists || {})) await pushRows(id, arr, (text) => ({ text }));
  for (const [id, arr] of Object.entries(t.rows || {})) await pushRows(id, arr, (data) => data);
  return out;
}
