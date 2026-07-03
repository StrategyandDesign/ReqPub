/* ReqPub v2 — section-scoped share payload tests (node tests/share.test.mjs)
   The section picker is a security boundary: unselected sections must be
   ABSENT from the payload served to anonymous readers, not merely unrendered. */
import assert from 'node:assert/strict';
import { buildSharePayload } from '../app/js/data.js';
import { bBrief, BRIEF_SECTIONS, defaultBriefSections } from '../app/js/domain.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

const answers = {
  ctrl_org: 'Collection Ventures', ctrl_product: 'RecordMade',
  ov_vision: 'THE VISION', ov_problem: 'THE PROBLEM', ov_market: 'THE MARKET',
  ov_goals: ['G1', 'G2'],
  persona: [{ _k: 1, persona: 'Operator', needs: 'Speed' }],
  seg: [{ _k: 1, segment: 'Fathers', share: 'High', desc: 'Core' }],
  context: 'USED IN CLINICS',
  sol_solution: 'THE SOLUTION',
  sol_in: ['CAP-A'], sol_out: ['EXCLUDED-Z'],
  components: [{ _k: 1, name: 'Recorder', desc: 'COMPONENT DESC' }],
  fr: [{ _k: 1, stmt: 'Records a session', fit: 'INTERNAL FIT', pri: 'Must', comp: 'Recorder' }],
  metrics: [{ _k: 1, metric: 'Completion', target: '75%', method: 'Analytics' }]
};
const project = { name: 'RecordMade' };

test('default selection matches the preselected set', () => {
  const d = defaultBriefSections();
  assert.deepEqual(d, ['building', 'goals', 'who', 'solution', 'willdo', 'oos']);
  assert.equal(BRIEF_SECTIONS.length, 9);
});

test('unscoped payload (legacy path) includes every section and says so', () => {
  const p = buildSharePayload(project, answers, '1.0', 1, 'brief', '', null);
  assert.equal(p.sections.length, 9);
  assert.equal(p.answers.ov_vision, 'THE VISION');
  assert.equal(p.answers.metrics[0].metric, 'Completion');
});

test('scoped payload physically omits unselected sections', () => {
  const p = buildSharePayload(project, answers, '1.0', 1, 'brief', '', ['building', 'oos']);
  const json = JSON.stringify(p);
  assert.ok(json.includes('THE VISION'));
  assert.ok(json.includes('EXCLUDED-Z'));           // oos selected
  assert.ok(!json.includes('Records a session'));   // willdo not selected
  assert.ok(!json.includes('Completion'));          // success not selected
  assert.ok(!json.includes('CAP-A'));               // includes not selected
  assert.ok(!json.includes('Operator'));            // who not selected
  assert.ok(!json.includes('THE SOLUTION'));        // solution not selected
  assert.deepEqual(p.sections, ['building', 'oos']);
});

test('fit criteria and internal fields never appear regardless of selection', () => {
  const all = BRIEF_SECTIONS.map((s) => s.key);
  const p = buildSharePayload(project, answers, '1.0', 1, 'brief', '', all);
  const json = JSON.stringify(p);
  assert.ok(!json.includes('INTERNAL FIT'));
  assert.ok(!json.includes('"_k"'));
});

test('requirements grouping keeps component names (names only) when components are unshared', () => {
  const p = buildSharePayload(project, answers, '1.0', 1, 'brief', '', ['willdo']);
  assert.equal(p.answers.components[0].name, 'Recorder');
  assert.equal(p.answers.components[0].desc, undefined);
  const md = bBrief(p.answers);
  assert.ok(md.includes('Recorder'));
  assert.ok(md.includes('Records a session'));
  assert.ok(!md.includes('COMPONENT DESC'));
});

test('brief renders exactly what a scoped payload contains', () => {
  const p = buildSharePayload(project, answers, '1.0', 1, 'brief', '', ['goals', 'success']);
  const md = bBrief(p.answers);
  assert.ok(md.includes('G1'));
  assert.ok(md.includes('Completion'));
  assert.ok(!md.includes('THE VISION'));
  assert.ok(!md.includes('EXCLUDED-Z'));
});

test('pilot payloads are unaffected by brief scoping', () => {
  const p = buildSharePayload(project, answers, '1.0', 1, 'pilot', '0.9.4', ['building']);
  assert.equal(p.build, '0.9.4');
  assert.equal(p.answers.components[0].name, 'Recorder');
  assert.ok(!JSON.stringify(p).includes('THE VISION'));
});

test('assigned brand logo travels with the brief payload for accountless viewers', () => {
  const branded = { name: 'RecordMade', brand_logo: 'data:image/png;base64,AAAA', brand_label: 'Northwind Field Services' };
  const p = buildSharePayload(branded, answers, '1.0', 1, 'brief', '', ['building']);
  assert.equal(p.logo, 'data:image/png;base64,AAAA');
  assert.equal(p.brandLabel, 'Northwind Field Services');
  // No logo assigned → empty strings, never undefined (stable payload shape).
  const plain = buildSharePayload(project, answers, '1.0', 1, 'brief', '', ['building']);
  assert.equal(plain.logo, '');
  assert.equal(plain.brandLabel, '');
});

console.log('\nshare.test: ' + n + '/' + n + ' passed');
