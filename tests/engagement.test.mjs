/* ReqPub v2 — engagement-mode tests (node tests/engagement.test.mjs)
   One worksheet, two document types. These tests prove (a) a consulting
   engagement assembles as a clean, contiguously numbered charter from the
   shared fields, (b) the software-only sections are gated off in engagement
   mode, and (c) the requirements (PRD) path is byte-for-byte unchanged, so
   every existing project — none of which carries ctrl_type — is untouched. */
import assert from 'node:assert/strict';
import {
  SECTIONS, ENGAGEMENT, isEngagement, assembleAnswers, buildSections, assemble,
  mdToHtml, docSecNum, docSecTitle
} from '../app/js/domain.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

const base = (extra = {}) => assembleAnswers(
  {
    ctrl_product: { value: 'Northwind Migration' }, ctrl_org: { value: 'Collection Ventures' },
    ov_vision: { value: 'Stand up the new platform' }, ov_problem: { value: 'The legacy system is failing' },
    ov_market: { value: 'Enterprise field services' }, sol_solution: { value: 'A phased migration' },
    link_repo: { value: 'github.com/cv/nw' }, ...extra
  },
  {
    ov_goals: [{ id: 'g', k: 1, data: { text: 'Cut cost 30%' }, pos: 1, rev: 1 }],
    metrics: [{ id: 'm', k: 1, data: { metric: 'Uptime', target: '99.9%', method: 'Monitoring' }, pos: 1, rev: 1 }],
    sol_in: [{ id: 'i', k: 1, data: { text: 'Data migration' }, pos: 1, rev: 1 }],
    sol_out: [{ id: 'o', k: 1, data: { text: 'Hardware procurement' }, pos: 1, rev: 1 }],
    components: [{ id: 'c', k: 1, data: { name: 'Discovery', owner: 'Ana', status: 'Active', desc: 'Audit the estate' }, pos: 1, rev: 1 }],
    people: [{ id: 'p', k: 1, data: { name: 'Ana Reyes', role: 'Engagement lead' }, pos: 1, rev: 1 }],
    assume: [{ id: 'a', k: 1, data: { text: 'Client grants system access' }, pos: 1, rev: 1 }],
    depend: [{ id: 'd', k: 1, data: { text: 'Client SME availability' }, pos: 1, rev: 1 }],
    constrain: [{ id: 'x', k: 1, data: { text: 'Q3 deadline' }, pos: 1, rev: 1 }],
    decisions: [{ id: 'dec', k: 1, data: { decision: 'Use Postgres', options: 'Postgres vs Dynamo', rationale: 'Relational fit', owner: 'Tim', date: '2026-07' }, pos: 1, rev: 1 }],
    glossary: [{ id: 'gl', k: 1, data: { term: 'ETL', def: 'Extract, transform, load' }, pos: 1, rev: 1 }],
    // A functional requirement is present but must never surface in a charter.
    fr: [{ id: 'r', k: 1, data: { stmt: 'SOFTWARE ONLY requirement', fit: 'SECRET FIT' }, pos: 1, rev: 1 }]
  }
);

const engAnswers = base({ ctrl_type: { value: ENGAGEMENT } });
const versions = [{ seq: 1, label: '1.0', created_at: new Date().toISOString(), author_name: 'Micah', note: 'Initial baseline' }];
const engDoc = assemble(buildSections(engAnswers, '1.0', versions), engAnswers);

/* ---- the toggle ---- */
test('isEngagement is true only for the engagement document type', () => {
  assert.equal(isEngagement(engAnswers), true);
  assert.equal(isEngagement(base()), false);                                  // ctrl_type unset (every existing project)
  assert.equal(isEngagement(base({ ctrl_type: { value: 'Product or project requirements' } })), false);
});

/* ---- the charter assembles cleanly ---- */
test('engagement assembles a contiguous 1..8 charter, not a PRD', () => {
  assert.ok(engDoc.startsWith('# Northwind Migration'));
  ['## 1. Objective and Context', '## 2. Success Metrics', '## 3. Scope and Approach',
   '## 4. Assumptions, Dependencies, and Constraints', '## 5. Stakeholders and Roles',
   '## 6. Decisions and Rationale', '## 7. Glossary', '## 8. Revision History'
  ].forEach((h) => assert.ok(engDoc.includes(h), 'missing ' + h));
  // The PRD scaffolding is absent.
  ['## Part I', '## Part II', 'Functional Requirements', 'Appendix A', 'Appendix B', '## 9.'
  ].forEach((s) => assert.ok(!engDoc.includes(s), 'should not contain ' + s));
});

test('the charter reuses the shared fields', () => {
  ['Stand up the new platform', 'Cut cost 30%', 'Data migration', 'Hardware procurement',
   'Discovery', 'Ana Reyes', 'Client grants system access', 'Q3 deadline',
   'Use Postgres', 'ETL', 'Micah'
  ].forEach((v) => assert.ok(engDoc.includes(v), 'missing ' + v));
  assert.ok(engDoc.includes('| Workstream | Owner | Status | Description |')); // components reframed as workstreams
});

test('software-only content never leaks into a charter', () => {
  assert.ok(!engDoc.includes('SOFTWARE ONLY requirement'));
  assert.ok(!engDoc.includes('SECRET FIT'));
  assert.ok(!engDoc.includes('Fit Criterion'));
});

test('an almost-empty engagement still assembles with placeholders, no throw', () => {
  const thin = assembleAnswers({ ctrl_product: { value: 'Scoping' }, ctrl_type: { value: ENGAGEMENT } }, {});
  const md = assemble(buildSections(thin, null, []), thin);
  assert.ok(md.startsWith('# Scoping'));
  assert.ok(md.includes('## 6. Decisions and Rationale') && md.includes('No decisions recorded yet'));
  assert.ok(md.includes('## 8. Revision History') && md.includes('working draft'));
});

/* ---- the requirements path is untouched ---- */
test('PRD output is identical whether ctrl_type is unset or set to requirements', () => {
  const unset = base();
  const reqd = base({ ctrl_type: { value: 'Product or project requirements' } });
  const a = assemble(buildSections(unset, '1.0', versions), unset);
  const b = assemble(buildSections(reqd, '1.0', versions), reqd);
  assert.equal(a, b);                                   // the toggle's default changes nothing
  assert.ok(a.includes('## Part I: Product Definition'));
  assert.ok(a.includes('## 7. Functional Requirements') && a.includes('SOFTWARE ONLY requirement'));
});

/* ---- worksheet section gating ---- */
test('engagement hides the software sections and keeps the engagement set', () => {
  const vis = (a) => SECTIONS.filter((s) => !s.cond || s.cond(a)).map((s) => s.key);
  const eng = vis(engAnswers);
  ['method', 'functional', 'nonfunctional', 'aieval', 'interfaces', 'verification', 'traceability', 'users', 'data']
    .forEach((k) => assert.ok(!eng.includes(k), 'engagement should hide ' + k));
  ['control', 'overview', 'solution', 'metrics', 'adc', 'people', 'glossary', 'decisions', 'revision']
    .forEach((k) => assert.ok(eng.includes(k), 'engagement should show ' + k));
  // Requirements mode (has AI) still shows everything it did before.
  const prd = vis(base({ has_ai: { value: 'Yes' } }));
  ['functional', 'nonfunctional', 'aieval', 'users', 'data'].forEach((k) => assert.ok(prd.includes(k)));
});

/* ---- mode-aware numbering + titles ---- */
test('docSecNum renumbers for engagement but leaves the PRD fixed', () => {
  assert.equal(docSecNum(engAnswers, 'overview'), 1);
  assert.equal(docSecNum(engAnswers, 'solution'), 3);
  assert.equal(docSecNum(engAnswers, 'people'), 5);
  assert.equal(docSecNum(engAnswers, 'revision'), 8);
  assert.equal(docSecNum({}, 'functional'), 7);           // PRD unchanged
  assert.equal(docSecNum({}, 'revision'), 17);
});

test('docSecTitle reframes shared sections in engagement mode', () => {
  assert.equal(docSecTitle(engAnswers, 'solution'), 'Scope and Approach');
  assert.equal(docSecTitle(engAnswers, 'people'), 'Stakeholders and Roles');
  assert.equal(docSecTitle({}, 'solution'), 'Solution Overview');   // PRD unchanged
});

/* ---- anchors resolve so jump-to-section works in both modes ---- */
test('engagement headings anchor to their worksheet section, PRD anchors unchanged', () => {
  const html = mdToHtml(engDoc);
  assert.ok(html.includes('id="docsec-overview"'));      // ## 1 Objective and Context
  assert.ok(html.includes('id="docsec-solution"'));      // ## 3 Scope and Approach
  assert.ok(html.includes('id="docsec-people"'));        // ## 5 Stakeholders and Roles
  assert.ok(html.includes('id="docsec-decisions"'));     // ## 6 Decisions and Rationale
  // The PRD still maps its numbered headings by number.
  const prdHtml = mdToHtml('## 7. Functional Requirements\n\ntext');
  assert.ok(prdHtml.includes('id="docsec-functional"'));
});

console.log('\nengagement.test: ' + n + '/' + n + ' passed');
