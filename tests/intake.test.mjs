/* ReqPub v2 - intake tests (node tests/intake.test.mjs)
   The contract: a team member's drafted documents land in the record's own
   framework deterministically. Headings segment, keywords classify, bullets
   and tables extract into the right row shapes with provenance stamped,
   unknown sections stay unplaced for a human decision, and intake NEVER
   overwrites a non-empty field. The fixture below is the realistic case:
   a product doc drafted in a chat assistant, pasted or uploaded as-is. */
import assert from 'node:assert/strict';
import {
  segmentText, classifySegment, intakeKind, bulletItems, mdTableIn, splitPair,
  extractRows, mapArtifacts, applyPlan, executeOps
} from '../app/js/intake.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

const DOC = `Northwind Ledger is an internal reconciliation tool. This preamble has no heading.

# Overview
Northwind Ledger reconciles partner statements against the general ledger nightly.

## Problem
Finance closes late every month. Reconciliation is manual and error-prone.

GOALS
- Cut close time to 3 business days
- Zero unexplained variances above $500

## Personas
- Staff accountant: needs a worklist of exceptions each morning
- Controller - needs a sign-off view before close

## Success Metrics
| Metric | Target | Method |
| --- | --- | --- |
| Close time | 3 days | Month-end audit |
| Auto-match rate | 92% | Pipeline telemetry |

## In scope
- Nightly ingestion of partner statements
- Exception worklist

## Out of scope
- Payments execution

## Functional Requirements
- The system must ingest partner statements nightly. Acceptance: 100% of files processed by 06:00 local.
- The system should flag unmatched lines for review
- Users could export the exception list to CSV

## Non-functional requirements
- Nightly run must complete within 90 minutes

## Evaluation criteria
| Dimension | Metric | Threshold | Eval set |
| --- | --- | --- | --- |
| Match accuracy | F1 | 0.95 | golden-500 |

## Glossary
- Variance: difference between statement and ledger
- Exception - a line requiring human review

## Risks
- Partner file formats drift without notice

Verification
============
Reconciliation results are verified against the month-end audit.`;

/* ---- segmentation ---- */
test('the preamble before any heading is an untitled segment', () => {
  const segs = segmentText(DOC, 'plan.md');
  assert.equal(segs[0].title, '');
  assert.ok(segs[0].body.includes('This preamble has no heading'));
});
test('markdown, ALLCAPS, and setext headings all segment', () => {
  const titles = segmentText(DOC, 'plan.md').map((s) => s.title);
  for (const t of ['Overview', 'Problem', 'GOALS', 'Out of scope', 'Verification']) {
    assert.ok(titles.includes(t), 'missing heading: ' + t);
  }
});
test('a bold line is a heading too', () => {
  const segs = segmentText('**Purpose**\nWhy this exists.', 'x.md');
  assert.equal(segs[0].title, 'Purpose');
  assert.equal(segs[0].body, 'Why this exists.');
});

/* ---- classification ---- */
test('out of scope wins over scope; the ordered map holds', () => {
  assert.equal(classifySegment('Out of scope'), 'sol_out');
  assert.equal(classifySegment('In scope'), 'sol_in');
  assert.equal(classifySegment('Scope'), 'sol_in');
});
test('the fixture headings classify to the right questions', () => {
  assert.equal(classifySegment('Overview'), 'ov_purpose');
  assert.equal(classifySegment('Problem'), 'ov_problem');
  assert.equal(classifySegment('GOALS'), 'ov_goals');
  assert.equal(classifySegment('Personas'), 'persona');
  assert.equal(classifySegment('Success Metrics'), 'metrics');
  assert.equal(classifySegment('Functional Requirements'), 'fr');
  assert.equal(classifySegment('Non-functional requirements'), 'nfr');
  assert.equal(classifySegment('Evaluation criteria'), 'eval');
  assert.equal(classifySegment('Glossary'), 'glossary');
  assert.equal(classifySegment('Verification'), 'verify_note');
});
test('unknown headings are never guessed', () => {
  assert.equal(classifySegment('Risks'), null);
  assert.equal(classifySegment('Appendix B'), null);
  assert.equal(classifySegment(''), null);
});
test('intakeKind reports the landing shape per target', () => {
  assert.equal(intakeKind('ov_purpose'), 'long');
  assert.equal(intakeKind('sol_in'), 'list');
  assert.equal(intakeKind('fr'), 'rows');
  assert.equal(intakeKind('nope'), null);
});

/* ---- extraction primitives ---- */
test('bulletItems strips markers and inline markdown', () => {
  const items = bulletItems('- **Bold** point\n* star point\n1. numbered point\nplain line');
  assert.deepEqual(items, ['Bold point', 'star point', 'numbered point']);
});
test('mdTableIn parses the first markdown table', () => {
  const seg = segmentText(DOC, 'plan.md').find((s) => s.title === 'Success Metrics');
  const t = mdTableIn(seg.body);
  assert.deepEqual(t.headers, ['metric', 'target', 'method']);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[1][0], 'Auto-match rate');
});
test('splitPair handles colon and spaced-hyphen separators', () => {
  assert.deepEqual(splitPair('Variance: difference'), { head: 'Variance', rest: 'difference' });
  assert.deepEqual(splitPair('Exception - a line'), { head: 'Exception', rest: 'a line' });
  assert.deepEqual(splitPair('No separator here'), { head: 'No separator here', rest: '' });
});

/* ---- extraction per target ---- */
test('fr rows: priority detected, Acceptance tail becomes the fit, provenance stamped', () => {
  const seg = segmentText(DOC, 'plan.md').find((s) => s.title === 'Functional Requirements');
  const rows = extractRows('fr', seg.body, 'plan.md');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].pri, 'Must');
  assert.equal(rows[0].fit, '100% of files processed by 06:00 local.');
  assert.ok(rows[0].stmt.startsWith('The system must ingest') && !/Acceptance:/i.test(rows[0].stmt));
  assert.equal(rows[1].pri, 'Should');
  assert.equal(rows[1].fit, 'to confirm');
  assert.equal(rows[2].pri, 'Could');
  assert.ok(rows.every((r) => r.src === 'Import · plan.md'));
});
test('eval rows from a table carry the dataset column', () => {
  const seg = segmentText(DOC, 'plan.md').find((s) => s.title === 'Evaluation criteria');
  const rows = extractRows('eval', seg.body, 'plan.md');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].dim, 'Match accuracy');
  assert.equal(rows[0].metric, 'F1');
  assert.equal(rows[0].thresh, '0.95');
  assert.equal(rows[0].dataset, 'golden-500');
});
test('metrics rows map table headers by name, not position luck', () => {
  const seg = segmentText(DOC, 'plan.md').find((s) => s.title === 'Success Metrics');
  const rows = extractRows('metrics', seg.body, 'plan.md');
  assert.deepEqual(rows[0], { metric: 'Close time', target: '3 days', method: 'Month-end audit' });
});
test('glossary rows pair term and definition from either separator', () => {
  const seg = segmentText(DOC, 'plan.md').find((s) => s.title === 'Glossary');
  const rows = extractRows('glossary', seg.body, 'plan.md');
  assert.deepEqual(rows, [
    { term: 'Variance', def: 'difference between statement and ledger' },
    { term: 'Exception', def: 'a line requiring human review' },
  ]);
});

/* ---- the plan ---- */
test('mapArtifacts lands every recognized section in its shape', () => {
  const { placements, unplaced } = mapArtifacts([{ name: 'plan.md', text: DOC }]);
  const by = Object.fromEntries(placements.map((p) => [p.qid, p]));
  assert.ok(by.ov_purpose && by.ov_purpose.kind === 'long' && by.ov_purpose.value.includes('reconciles partner statements'));
  assert.equal(by.ov_goals.rows.length, 2);
  assert.equal(by.sol_in.rows.length, 2);
  assert.equal(by.sol_out.rows.length, 1);
  assert.equal(by.fr.rows.length, 3);
  assert.equal(by.nfr.rows.length, 1);
  assert.equal(by.eval.rows.length, 1);
  assert.equal(by.metrics.rows.length, 2);
  assert.equal(by.persona.rows.length, 2);
  assert.equal(by.glossary.rows.length, 2);
  assert.ok(by.verify_note.value.includes('month-end audit'));
  const titles = unplaced.map((u) => u.title);
  assert.ok(titles.includes('Risks'), 'Risks must stay unplaced');
  assert.ok(titles.includes('(untitled)'), 'the preamble stays unplaced');
  assert.equal(unplaced.find((u) => u.title === 'Risks').source, 'plan.md');
});
test('long sections merge across files with their sources tracked', () => {
  const { placements } = mapArtifacts([
    { name: 'a.md', text: '# Overview\nFirst take.' },
    { name: 'b.md', text: '# Purpose\nSecond take.' },
  ]);
  const p = placements.find((x) => x.qid === 'ov_purpose');
  assert.equal(p.value, 'First take.\n\nSecond take.');
  assert.deepEqual(p.sources, ['a.md', 'b.md']);
});
test('applyPlan never overwrites a non-empty field, and says so', () => {
  const { placements } = mapArtifacts([{ name: 'plan.md', text: DOC }]);
  const { ops, kept } = applyPlan(placements, { ov_purpose: 'Already written by the team.' });
  assert.ok(kept.includes('ov_purpose'));
  assert.ok(!ops.some((o) => o.kind === 'field' && o.qid === 'ov_purpose'));
  assert.ok(ops.some((o) => o.kind === 'field' && o.qid === 'ov_problem'));
});
test('row operations always land, additive by nature, with provenance intact', () => {
  const { placements } = mapArtifacts([{ name: 'plan.md', text: DOC }]);
  const { ops } = applyPlan(placements, {});
  const frOps = ops.filter((o) => o.kind === 'row' && o.qid === 'fr');
  assert.equal(frOps.length, 3);
  assert.ok(frOps.every((o) => o.data.src === 'Import · plan.md'));
  const listOps = ops.filter((o) => o.kind === 'row' && o.qid === 'ov_goals');
  assert.ok(listOps.every((o) => typeof o.data.text === 'string' && o.data.text));
});

/* ---- execution through the repo wrappers ---- */
const awaited = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
await awaited('executeOps writes through the rev-checked wrappers in plan order', async () => {
  const calls = [];
  const repo = {
    saveField: async (pid, qid, value, rev) => { calls.push(['field', pid, qid, value, rev]); return { data: { ok: true } }; },
    upsertRow: async (pid, qid, id, data) => { calls.push(['row', pid, qid, id, data.src || data.text]); return { data: { ok: true } }; },
  };
  const ops = [
    { kind: 'field', qid: 'ov_problem', value: 'Late closes.', baseRev: 3 },
    { kind: 'row', qid: 'fr', data: { stmt: 'Ingest nightly', fit: 'to confirm', pri: 'Must', comp: '', src: 'Import · plan.md' } },
    { kind: 'row', qid: 'ov_goals', data: { text: 'Close in 3 days' } },
  ];
  const steps = [];
  const out = await executeOps(repo, 'ledger', ops, (d, t) => steps.push(d + '/' + t));
  assert.deepEqual(out, { ok: true, fields: 1, rows: 2, failed: 0 });
  assert.deepEqual(calls[0], ['field', 'ledger', 'ov_problem', 'Late closes.', 3]);
  assert.deepEqual(calls[1], ['row', 'ledger', 'fr', null, 'Import · plan.md']);
  assert.deepEqual(steps, ['1/3', '2/3', '3/3']);
});
await awaited('executeOps counts failures honestly and keeps going', async () => {
  let i = 0;
  const repo = {
    saveField: async () => ({ data: { ok: true } }),
    upsertRow: async () => (++i === 1 ? { error: { message: 'down' } } : { data: { ok: true } }),
  };
  const out = await executeOps(repo, 'p', [
    { kind: 'row', qid: 'fr', data: {} }, { kind: 'row', qid: 'fr', data: {} }, { kind: 'field', qid: 'ov_vision', value: 'x' },
  ]);
  assert.deepEqual(out, { ok: false, fields: 1, rows: 1, failed: 1 });
});

console.log(`intake.test: ${n}/${n} passed`);
