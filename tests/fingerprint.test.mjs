/* ReqPub v2 - fingerprint & client-report tests (node tests/fingerprint.test.mjs)
   The fingerprint's whole value is that anyone holding the stored snapshot can
   recompute it without ReqPub, so the canonical form must be exact, stable
   under key order, and sensitive to every byte. The client report must carry
   it, restate the recipe, and take its client-facing content ONLY from a
   share payload, so the scoping boundary is the content boundary. */
import assert from 'node:assert/strict';
import { canonicalJson, sha256Hex, versionFingerprint, fmtFingerprint } from '../app/js/core.js';
import { clientDocMd } from '../app/js/exports.js';
import { buildSharePayload } from '../app/js/data.js';
import { defaultBriefSections } from '../app/js/domain.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const awaitTest = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };

test('canonicalJson sorts object keys at every depth and keeps arrays in order', () => {
  const a = { b: { z: 1, a: [3, 1, 2] }, a: 'x' };
  assert.equal(canonicalJson(a), '{"a":"x","b":{"a":[3,1,2],"z":1}}');
});

test('canonicalJson is identical across key insertion orders', () => {
  const one = { label: '1.1', seq: 2, snapshot: { answers: { fr: [{ _k: 1, stmt: 'X' }] } } };
  const two = { snapshot: { answers: { fr: [{ stmt: 'X', _k: 1 }] } }, seq: 2, label: '1.1' };
  assert.equal(canonicalJson(one), canonicalJson(two));
});

test('canonicalJson pins the JSON-less values and escapes strings via JSON rules', () => {
  assert.equal(canonicalJson({ a: undefined, b: null, c: 'q"\n' }), '{"b":null,"c":"q\\"\\n"}');
  assert.equal(canonicalJson([undefined, () => 1]), '[null,null]');
  assert.equal(canonicalJson(true) + canonicalJson(0.5), 'true0.5');
});

await awaitTest('sha256Hex matches the published SHA-256 test vector for "abc"', async () => {
  assert.equal(await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

await awaitTest('versionFingerprint is stable for the same stored row and changes on any byte', async () => {
  const v = { label: '1.1', seq: 2, snapshot: { answers: { ov_vision: 'The vision' } }, status: 'approved', note: 'x' };
  const h1 = await versionFingerprint(v);
  const h2 = await versionFingerprint({ snapshot: { answers: { ov_vision: 'The vision' } }, seq: 2, label: '1.1' });
  assert.equal(h1, h2, 'only {label, seq, snapshot} participate; row order and extra columns do not');
  const h3 = await versionFingerprint({ label: '1.1', seq: 2, snapshot: { answers: { ov_vision: 'The vision.' } } });
  assert.notEqual(h1, h3);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('fmtFingerprint truncates and groups for display', () => {
  assert.equal(fmtFingerprint('ba7816bf8f01cfea414140de'), 'sha256:ba78 16bf 8f01 cfea');
});

/* ---- client report composition ---- */
const answers = {
  ctrl_product: 'Acme', ctrl_org: 'Collection Ventures',
  ov_vision: 'THE VISION', ov_problem: 'THE PROBLEM', ov_goals: ['G1'],
  sol_solution: 'THE SOLUTION', sol_out: ['EXCLUDED-Z'],
  components: [{ _k: 1, name: 'Recorder', desc: 'COMPONENT DESC', owner: 'Jo' }],
  fr: [{ _k: 1, stmt: 'Records a session', fit: 'INTERNAL FIT', pri: 'Must', comp: 'Recorder' }],
  metrics: [{ _k: 1, metric: 'Completion', target: '75%', method: 'INTERNAL METHOD' }]
};
const meta = { label: '1.1', fingerprint: 'a'.repeat(64), presentLink: 'https://reqpub.com/p/x' };
const versions = [{ seq: 1, label: '1.0', created_at: '2026-06-01', author_name: 'Micah', note: 'Initial baseline' }];

test('clientDocMd composes summary, the brief-payload content, the revision record, and Verification', () => {
  const pay = buildSharePayload({ name: 'Acme' }, answers, '1.1', 2, 'brief', '', defaultBriefSections());
  const md = clientDocMd(answers, meta, pay.answers, pay.sections, versions);
  assert.ok(md.includes('# Acme - Executive Summary'));
  assert.ok(md.includes('### What we are building'), 'brief sections demote under the plan heading');
  assert.ok(md.includes('Records a session'));
  assert.ok(md.includes('## Revision record'));
  assert.ok(md.includes('Initial baseline'));
  assert.ok(md.includes('`' + meta.fingerprint + '`'), 'the full fingerprint appears in Verification');
  assert.ok(md.includes('canonical JSON'), 'the recipe is restated on the document');
  assert.ok(md.includes('not a signature'), 'the non-claim is stated');
  assert.ok(md.includes(meta.presentLink));
});

test('the client report never carries internal fields: the payload boundary is the content boundary', () => {
  const pay = buildSharePayload({ name: 'Acme' }, answers, '1.1', 2, 'brief', '', defaultBriefSections());
  const md = clientDocMd(answers, meta, pay.answers, pay.sections, versions);
  assert.ok(!md.includes('INTERNAL FIT'), 'fit criteria are absent');
  assert.ok(!pay.answers.fr[0].fit, 'because the payload itself dropped them');
});

test('with no brief payload the report still stands: summary, history, verification', () => {
  const md = clientDocMd(answers, meta, null, null, versions);
  assert.ok(!md.includes('The plan in plain language'));
  assert.ok(md.includes('## Verification'));
});

console.log('\nfingerprint.test: ' + n + '/' + n + ' passed');
