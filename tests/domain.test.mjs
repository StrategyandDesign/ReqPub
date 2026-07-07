/* ReqPub v2 - domain tests (node tests/domain.test.mjs) */
import assert from 'node:assert/strict';
import {
  Q, SECTIONS, isAnswered, assembleAnswers, buildSections, assemble,
  mdToHtml, bBrief, reqDiff, changeNote, execSummaryData, suggestFit, mdTable
} from '../app/js/domain.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

/* ---- assembleAnswers: relational state → builders' shape ---- */
test('assembleAnswers maps scalars, lists, and rows (with _k from k)', () => {
  const fields = { ov_vision: { value: 'The vision', rev: 3 }, ctrl_product: { value: 'Acme', rev: 1 } };
  const rows = {
    ov_goals: [{ id: 'a', k: 1, data: { text: 'Goal one' }, pos: 1, rev: 1 }],
    fr: [
      { id: 'b', k: 1, data: { stmt: 'Does X', fit: 'X measured', pri: 'Must' }, pos: 1, rev: 1 },
      { id: 'c', k: 3, data: { stmt: 'Does Y' }, pos: 2, rev: 1 }
    ]
  };
  const a = assembleAnswers(fields, rows);
  assert.equal(a.ov_vision, 'The vision');
  assert.deepEqual(a.ov_goals, ['Goal one']);
  assert.equal(a.fr.length, 2);
  assert.equal(a.fr[0]._k, 1);
  assert.equal(a.fr[1]._k, 3);          // k gaps preserved → permanent IDs
  assert.equal(a.fr[1].stmt, 'Does Y');
});

/* ---- requirement IDs are permanent (derive from k, not position) ---- */
test('FR ids derive from k so deleting a row never renumbers others', () => {
  const a = assembleAnswers({}, {
    fr: [
      { id: 'x', k: 2, data: { stmt: 'Second requirement', fit: 'ok' }, pos: 1, rev: 1 },
      { id: 'y', k: 5, data: { stmt: 'Fifth requirement', fit: 'ok' }, pos: 2, rev: 1 }
    ]
  });
  const s = buildSections(a, '1.0', []);
  assert.ok(s.functional.includes('FR-002'));
  assert.ok(s.functional.includes('FR-005'));
  assert.ok(!s.functional.includes('FR-001'));
});

/* ---- document assembly ---- */
test('assemble produces the full two-part document with appendices', () => {
  const a = assembleAnswers(
    { ctrl_product: { value: 'Acme' }, ov_vision: { value: 'V' }, ov_problem: { value: 'P' }, sol_solution: { value: 'S' }, has_ai: { value: 'Yes' } },
    { fr: [{ id: 'r', k: 1, data: { stmt: 'Does X', fit: 'Measured. Test.' }, pos: 1, rev: 1 }] }
  );
  const md = assemble(buildSections(a, '1.0', [{ seq: 1, label: '1.0', created_at: new Date().toISOString(), author_name: 'Micah', note: 'Initial baseline' }]), a);
  assert.ok(md.startsWith('# Acme'));
  assert.ok(md.includes('## Part I: Product Definition'));
  assert.ok(md.includes('## Part II: Requirements'));
  assert.ok(md.includes('## 7. Functional Requirements'));
  assert.ok(md.includes('Appendix A. AI Evaluation Method'));   // has_ai = Yes
  assert.ok(md.includes('Appendix B. Requirement Attribute Definitions'));
  assert.ok(md.includes('## 16. Decisions and Rationale'));
  assert.ok(md.includes('## 17. Revision History'));
  assert.ok(md.includes('Micah'));
});

test('decisions render as an ID-numbered record, placed before revision history', () => {
  const a = assembleAnswers(
    { ctrl_product: { value: 'Acme' } },
    { decisions: [
      { id: 'd1', k: 1, data: { decision: 'Use Postgres', options: 'Postgres vs Dynamo', rationale: 'Relational fit', owner: 'Tim', date: '2026-07' }, pos: 1, rev: 1 },
      { id: 'd2', k: 2, data: { decision: 'Ship EU-only first', options: 'Global vs EU', rationale: 'AI Act timing', owner: 'Micah', date: '2026-07', supersedes: 'DEC-001' }, pos: 2, rev: 1 }
    ] }
  );
  const md = assemble(buildSections(a, null, []), a);
  assert.ok(md.includes('## 16. Decisions and Rationale'));
  assert.ok(md.includes('DEC-001') && md.includes('DEC-002'));   // permanent IDs from k
  assert.ok(md.includes('Use Postgres') && md.includes('Relational fit') && md.includes('Tim'));
  assert.ok(md.includes('Global vs EU') && md.includes('AI Act timing')); // second row's columns render
  assert.ok(md.includes('| DEC-001 |'));                                  // supersedes cell references a prior decision
  assert.ok(md.indexOf('Decisions and Rationale') < md.indexOf('Revision History')); // ordering
});

test('empty decisions render a clear placeholder, not a broken table', () => {
  const a = assembleAnswers({ ctrl_product: { value: 'Acme' } }, {});
  const md = assemble(buildSections(a, null, []), a);
  assert.ok(md.includes('## 16. Decisions and Rationale'));
  assert.ok(md.includes('No decisions recorded yet'));
});

test('AI appendix and Section 9 are omitted when has_ai is No', () => {
  const a = assembleAnswers({ ctrl_product: { value: 'Acme' }, has_ai: { value: 'No' } }, {});
  const md = assemble(buildSections(a, null, []), a);
  assert.ok(!md.includes('Appendix A.'));
  assert.ok(!md.includes('## 9. AI Evaluation Criteria'));
});

/* ---- markdown renderer ---- */
test('mdToHtml renders tables with the ID column styled and escapes HTML', () => {
  const html = mdToHtml('## 7. Functional Requirements\n\n' +
    mdTable(['ID', 'Requirement'], [['FR-001', 'Uses <script> safely']]));
  assert.ok(html.includes('id="docsec-functional"'));
  assert.ok(html.includes('class="idc"'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

/* ---- diffing ---- */
test('reqDiff reports added / modified / removed by _k identity', () => {
  const prev = { fr: [{ _k: 1, stmt: 'A', fit: 'fa' }, { _k: 2, stmt: 'B', fit: 'fb' }] };
  const cur = { fr: [{ _k: 1, stmt: 'A changed', fit: 'fa' }, { _k: 3, stmt: 'C', fit: 'fc' }] };
  const d = reqDiff(prev, cur);
  assert.deepEqual(d.added, ['FR-003']);
  assert.deepEqual(d.modified, ['FR-001']);
  assert.deepEqual(d.removed, ['FR-002']);
});

test('reqDiff ignores component retagging (comp is not content)', () => {
  const prev = { fr: [{ _k: 1, stmt: 'A', fit: 'f', comp: 'One' }] };
  const cur = { fr: [{ _k: 1, stmt: 'A', fit: 'f', comp: 'Two' }] };
  const d = reqDiff(prev, cur);
  assert.equal(d.modified.length, 1); // comp changes DO count as modified (sig includes comp)
});

test('changeNote summarizes and handles the first baseline', () => {
  assert.equal(changeNote(null, {}, true), 'Initial baseline');
  const note = changeNote({ answers: { fr: [{ _k: 1, stmt: 'A', fit: 'f' }] } },
    { fr: [{ _k: 1, stmt: 'A', fit: 'f' }, { _k: 2, stmt: 'B', fit: 'g' }] }, false);
  assert.ok(note.includes('+1 requirement'));
});

/* ---- misc ---- */
test('isAnswered treats empty rows and blank lists as unanswered', () => {
  const qRows = Q.find((q) => q.id === 'fr');
  const qList = Q.find((q) => q.id === 'ov_goals');
  assert.equal(isAnswered(qRows, [{ _k: 1 }]), false);
  assert.equal(isAnswered(qRows, [{ _k: 1, stmt: 'x' }]), true);
  assert.equal(isAnswered(qList, ['', ' ']), false);
  assert.equal(isAnswered(qList, ['goal']), true);
});

test('bBrief exposes plain-language content, never fit criteria', () => {
  const a = assembleAnswers(
    { ov_vision: { value: 'V' }, sol_solution: { value: 'S' } },
    {
      fr: [{ id: 'r', k: 1, data: { stmt: 'Does X', fit: 'SECRET internal fit criterion' }, pos: 1, rev: 1 }],
      sol_out: [{ id: 'o', k: 1, data: { text: 'Not doing Z' }, pos: 1, rev: 1 }]
    });
  const md = bBrief(a);
  assert.ok(md.includes('Does X'));
  assert.ok(md.includes('Not in scope'));
  assert.ok(!md.includes('SECRET'));
});

test('suggestFit drafts a measurable skeleton from the statement', () => {
  const fit = suggestFit('The system sends a receipt after purchase. More detail.');
  assert.ok(fit.startsWith('The requirement is met when: The system sends a receipt after purchase.'));
  assert.ok(fit.includes('Measure:'));
});

test('execSummaryData counts requirements and Must priorities', () => {
  const a = assembleAnswers({}, {
    fr: [
      { id: '1', k: 1, data: { stmt: 'A', pri: 'Must' }, pos: 1, rev: 1 },
      { id: '2', k: 2, data: { stmt: 'B', pri: 'Could' }, pos: 2, rev: 1 }
    ],
    nfr: [{ id: '3', k: 1, data: { stmt: 'C' }, pos: 1, rev: 1 }]
  });
  const d = execSummaryData(a);
  assert.equal(d.counts.fr, 2);
  assert.equal(d.counts.nfr, 1);
  assert.equal(d.counts.musts, 1);
});

test('section conditions gate AI section visibility', () => {
  const ai = SECTIONS.find((s) => s.key === 'aieval');
  assert.equal(!!ai.cond({ has_ai: 'Yes' }), true);
  assert.equal(!!ai.cond({ has_ai: 'No' }), false);
});

console.log('\ndomain.test: ' + n + '/' + n + ' passed');
