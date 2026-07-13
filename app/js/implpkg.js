/* ReqPub v2 - the implementation package: the build team's counterpart to the
   client baseline report. One click on a stored baseline produces the spec
   bundle engineers and coding agents work from - requirements.json (every
   requirement row with its permanent id, fit criterion, priority, component,
   promotion source, and attested recorder), acceptance.md (the fit criteria
   and AI thresholds as a testable checklist), CHANGES.md (the per-column
   evidence diff against the prior baseline), prd.md (the full assembled
   document), and a README carrying the fingerprint and its recipe. The same
   SHA-256 sits on the client report, so the document the client signed and
   the package the builders received are provably the same baseline.
   Everything here is a pure function of the stored snapshot. */
import { rowsFilled, reqDiff, reqDiffDetail, buildSections, assemble } from './domain.js';

const RECIPE = 'SHA-256 over the canonical JSON (object keys sorted, arrays in order, UTF-8) of {label, seq, snapshot} for this version, as stored.';
const NOT_A_SIGNATURE = 'The fingerprint identifies the exact snapshot; it is not a signature or a trusted timestamp.';

const id3 = (prefix, k) => prefix + '-' + String(k).padStart(3, '0');
const clean = (o) => { const r = {}; Object.keys(o).forEach((k) => { if (o[k] !== undefined && o[k] !== '') r[k] = o[k]; }); return r; };
const clip = (t, n) => { const x = String(t || '').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function jsonRows(answers) {
  const map = (arr, fn) => rowsFilled(arr).map((r) => clean({ ...fn(r), source: r.src, recordedBy: r._by }));
  return {
    fr: map(answers.fr, (r) => ({ id: id3('FR', r._k), statement: r.stmt || '', fit: r.fit || '', priority: r.pri || '', component: r.comp || '' })),
    nfr: map(answers.nfr, (r) => ({ id: id3('NFR', r._k), statement: r.stmt || '', fit: r.fit || '', priority: r.pri || '', component: r.comp || '' })),
    eval: map(answers.eval, (r) => ({ id: id3('EVAL', r._k), dimension: r.dim || '', metricAndMethod: r.metric || '', threshold: r.thresh || '', component: r.comp || '' })),
    interfaces: map(answers.interfaces, (r) => ({ id: id3('IR', r._k), interface: r.iface || '', requirement: r.req || '', fit: r.fit || '', component: r.comp || '' }))
  };
}

function acceptanceMd(answers, meta) {
  const P = ['# Acceptance checklist — ' + (meta.product || 'Untitled') + ' v' + meta.label,
    ['Baselined ' + day(meta.baselined), meta.approvedAt ? 'Approved ' + day(meta.approvedAt) : null,
      'Fingerprint `' + String(meta.fingerprint || '').slice(0, 16) + '…` (full value and recipe in requirements.json)'
    ].filter(Boolean).join(' · ')];
  const box = (id, stmt, fit) => '- [ ] **' + id + '** ' + stmt + '\n      Fit: ' + (fit || 'to confirm');
  const fr = rowsFilled(answers.fr), nfr = rowsFilled(answers.nfr), ir = rowsFilled(answers.interfaces), ev = rowsFilled(answers.eval);
  if (fr.length) P.push('## Functional requirements\n\n' + fr.map((r) => box(id3('FR', r._k), r.stmt || '', r.fit)).join('\n'));
  if (nfr.length) P.push('## Non-functional requirements\n\n' + nfr.map((r) => box(id3('NFR', r._k), r.stmt || '', r.fit)).join('\n'));
  if (ir.length) P.push('## Interfaces\n\n' + ir.map((r) => box(id3('IR', r._k), (r.iface ? r.iface + ' — ' : '') + (r.req || ''), r.fit)).join('\n'));
  if (ev.length) P.push('## AI acceptance criteria\n\n' + ev.map((r) =>
    '- [ ] **' + id3('EVAL', r._k) + '** ' + (r.dim || '') + ' — ' + (r.metric || '') + ' — threshold: ' + (r.thresh || 'to confirm')).join('\n') +
    (answers.golden ? '\n\nGolden dataset and red-team method: ' + answers.golden : ''));
  P.push('_A box is ticked when its fit criterion passes as stated. ' + NOT_A_SIGNATURE + '_');
  return P.join('\n\n');
}

function changesMd(answers, meta, prevAnswers, prevLabel) {
  if (!prevAnswers) {
    const j = jsonRows(answers);
    return '# v' + meta.label + ' — initial baseline\n\n' +
      [j.fr.length + ' functional', j.nfr.length + ' non-functional', j.eval.length + ' AI acceptance', j.interfaces.length + ' interface']
        .join(' · ') + ' requirements.' + (meta.note ? '\n\n> ' + meta.note : '');
  }
  const rd = reqDiff(prevAnswers, answers);
  const detail = reqDiffDetail(prevAnswers, answers);
  const stmtOf = (id) => {
    const [pre, k] = id.split('-');
    const key = { FR: 'fr', NFR: 'nfr', EVAL: 'eval', IR: 'interfaces' }[pre];
    const row = (answers[key] || []).find((r) => r && String(r._k) === String(+k)) || {};
    return row.stmt || row.dim || row.iface || '';
  };
  const P = ['# Changes in v' + meta.label + ' (compared to v' + prevLabel + ')',
    [meta.author ? 'By ' + meta.author : null, day(meta.baselined)].filter(Boolean).join(' · ') + (meta.note ? '\n\n> ' + meta.note : '')];
  if (rd.added.length) P.push('## Added\n\n' + rd.added.map((id) => '- **' + id + '** ' + clip(stmtOf(id), 120)).join('\n'));
  if (detail.length) P.push('## Modified\n\n' + detail.map((d) =>
    '**' + d.id + '**\n' + d.changes.map((c) => '- ' + c.label + ': ~~' + clip(c.from, 120) + '~~ → ' + clip(c.to, 120)).join('\n')).join('\n\n'));
  if (rd.removed.length) P.push('## Removed\n\n' + rd.removed.map((id) => '- ' + id).join('\n'));
  if (!rd.added.length && !detail.length && !rd.removed.length) P.push('No requirement-level changes.');
  return P.join('\n\n');
}

function readmeMd(meta) {
  return ['# Implementation package — ' + (meta.product || 'Untitled') + ' v' + meta.label,
    ['Status: ' + (meta.status || 'draft'), 'Baselined ' + day(meta.baselined), meta.approvedAt ? 'Approved ' + day(meta.approvedAt) : null]
      .filter(Boolean).join(' · '),
    '**requirements.json** — every requirement row with its permanent id, statement, fit criterion, priority, component, promotion source, and attested recorder.\n' +
    '**acceptance.md** — the fit criteria and AI thresholds as a testable checklist.\n' +
    '**CHANGES.md** — what changed against the prior baseline, per column, with before and after.\n' +
    '**prd.md** — the full assembled document as of this baseline.',
    '## Fingerprint\n\n`' + (meta.fingerprint || '') + '`\n\nRecipe: ' + RECIPE +
    '\n\nThe client baseline report for v' + meta.label + ' carries this same fingerprint: the document the client signed and this package were produced from byte-identical baselines. ' + NOT_A_SIGNATURE
  ].join('\n\n');
}

/* input: { product, label, seq, status, note, author, baselined, approvedAt,
   fingerprint, answers, prevAnswers, prevLabel, versions } → [{name, text}] */
export function buildImplementationFiles(input) {
  const meta = input || {};
  const answers = meta.answers || {};
  const spec = {
    product: meta.product || '',
    version: clean({ label: meta.label, seq: meta.seq, status: meta.status, baselined: meta.baselined, approvedAt: meta.approvedAt, note: meta.note, author: meta.author }),
    fingerprint: { algorithm: 'SHA-256', value: meta.fingerprint || '', recipe: RECIPE },
    requirements: jsonRows(answers),
    components: rowsFilled(answers.components).map((c) => clean({ name: c.name, owner: c.owner, status: c.status, description: c.desc }))
  };
  return [
    { name: 'requirements.json', text: JSON.stringify(spec, null, 2) + '\n' },
    { name: 'acceptance.md', text: acceptanceMd(answers, meta) + '\n' },
    { name: 'CHANGES.md', text: changesMd(answers, meta, meta.prevAnswers || null, meta.prevLabel || '') + '\n' },
    { name: 'prd.md', text: assemble(buildSections(answers, meta.label, meta.versions || []), answers) + '\n' },
    { name: 'README.md', text: readmeMd(meta) + '\n' }
  ];
}
