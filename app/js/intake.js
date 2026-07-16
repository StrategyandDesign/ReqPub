/* ReqPub v2 - intake: populate a blank record from pasted or uploaded text.
   The team member has documents (often drafted with an AI assistant) and
   wants them landed into the record's own framework: the right question,
   the right shape, permanent IDs, provenance stamped. This module is the
   deterministic mapper - pure functions, no network, no AI calls, fully
   unit-tested - so what lands is exactly what the rules say lands, every
   time, and the preview the user approves is the truth.

   Discipline: intake NEVER overwrites a non-empty field. Long and short
   answers are filled only when blank; list and row questions are appended.
   Requirements rows carry src = 'Import · <source>' so provenance renders
   exactly like discovery promotion. Unrecognized sections are never guessed:
   they go to an "unplaced" bucket the user assigns by hand or skips. */

/* ---------------- segmentation ---------------- */
/* Split raw text into titled segments. Recognized heading forms: markdown
   (#..######), a bold line (**Title**), an ALLCAPS line, a short numbered
   line (1. Title), and setext underlines (=== / ---). Text before the first
   heading becomes an untitled preamble segment. */
export function segmentText(text, source) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const segs = [];
  let title = '';
  let buf = [];
  const push = () => {
    const body = buf.join('\n').trim();
    if (title || body) segs.push({ title: title.trim(), body, source: source || '' });
    buf = [];
  };
  const headOf = (line, next) => {
    let m = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (m) return m[1];
    m = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (m) return m[1];
    // ALLCAPS heading: letters, digits, spaces and light punctuation, no
    // sentence period, short enough to be a title rather than a shout.
    if (/^[A-Z][A-Z0-9 \/&\-()]{3,60}$/.test(line.trim()) && !/[.]$/.test(line.trim())) return line.trim();
    // Numbered heading: short, capitalized, and not a list item that happens
    // to start a long sentence.
    m = line.match(/^\d+[.)]\s+([A-Z].{2,58})$/);
    if (m && !/[.]$/.test(m[1])) return m[1];
    // Setext: this line is a title if the NEXT line is all = or -.
    if (next != null && /^\s*(={3,}|-{3,})\s*$/.test(next) && line.trim() && line.trim().length <= 70) return line.trim();
    return null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(={3,}|-{3,})\s*$/.test(line) && i > 0 && headOf(lines[i - 1], line)) continue; // consumed as setext underline
    const h = headOf(line, lines[i + 1]);
    if (h != null) { push(); title = h; continue; }
    buf.push(line);
  }
  push();
  return segs;
}

/* ---------------- classification ---------------- */
/* Heading keywords → question ids, first match wins. The map is deliberately
   conservative: only targets whose shape we can land faithfully. Anything
   else stays unplaced and the user decides. */
const MAP = [
  [/\b(out of scope|non-?goals?|exclusions?|will not|won'?t)\b/, 'sol_out'],
  [/\b(in scope|scope)\b/, 'sol_in'],
  [/\b(non-?functional|nfrs?|quality attributes?)\b/, 'nfr'],
  [/\b(functional requirements?|features?|user stories)\b/, 'fr'],
  [/\b(acceptance criteria|evaluation criteria|eval(uation)?s?|thresholds?)\b/, 'eval'],
  [/\b(golden (data)?set)\b/, 'golden'],
  [/\b(success metrics?|metrics?|kpis?)\b/, 'metrics'],
  [/\b(goals?|objectives?|okrs?)\b/, 'ov_goals'],
  [/\b(personas?|target users?|audience)\b/, 'persona'],
  [/\b(problem|pain points?|challenge)\b/, 'ov_problem'],
  [/\b(vision)\b/, 'ov_vision'],
  [/\b(market|competitive landscape|competitors?)\b/, 'ov_market'],
  [/\b(purpose|overview|summary|abstract|introduction|background)\b/, 'ov_purpose'],
  [/\b(solution|approach|how it works)\b/, 'sol_solution'],
  [/\b(components?|modules?|architecture)\b/, 'components'],
  [/\b(assumptions?)\b/, 'assume'],
  [/\b(dependenc(y|ies))\b/, 'depend'],
  [/\b(constraints?|limitations?)\b/, 'constrain'],
  [/\b(gates?|milestones?|phases?|timeline)\b/, 'gates'],
  [/\b(interfaces?|integrations?|apis?)\b/, 'interfaces'],
  [/\b(data (entities|model)|entities)\b/, 'data_entities'],
  [/\b(glossary|terminology|definitions?)\b/, 'glossary'],
  [/\b(verification|testing approach|test strategy)\b/, 'verify_note'],
];
export function classifySegment(title) {
  const t = String(title || '').toLowerCase();
  if (!t) return null;
  for (const [rx, qid] of MAP) if (rx.test(t)) return qid;
  return null;
}

/* What shape each recognized target takes when it lands. */
const KIND = {
  ov_purpose: 'long', ov_problem: 'long', ov_vision: 'long', ov_market: 'long',
  sol_solution: 'long', golden: 'long', verify_note: 'long',
  ov_goals: 'list', sol_in: 'list', sol_out: 'list', assume: 'list', depend: 'list', constrain: 'list',
  fr: 'rows', nfr: 'rows', eval: 'rows', metrics: 'rows', persona: 'rows',
  components: 'rows', gates: 'rows', interfaces: 'rows', data_entities: 'rows', glossary: 'rows',
};
export const intakeKind = (qid) => KIND[qid] || null;

/* ---------------- extraction primitives ---------------- */
const stripMd = (s) => String(s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').trim();
export function bulletItems(body) {
  return String(body || '').split('\n')
    .map((l) => l.match(/^\s*(?:[-*\u2022]|\d+[.)])\s+(.+)$/))
    .filter(Boolean).map((m) => stripMd(m[1]));
}
/* First markdown table in the body → { headers, rows } of trimmed cells. */
export function mdTableIn(body) {
  const lines = String(body || '').split('\n').map((l) => l.trim());
  const start = lines.findIndex((l, i) => l.startsWith('|') && /^\|?[\s:|-]+\|?$/.test(lines[i + 1] || ''));
  if (start < 0) return null;
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => stripMd(c));
  const headers = cells(lines[start]).map((h) => h.toLowerCase());
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) rows.push(cells(lines[i]));
  return rows.length ? { headers, rows } : null;
}
/* "Head: rest" or "Head - rest" split for pairing bullets into two columns. */
export function splitPair(text) {
  const m = String(text || '').match(/^(.{2,80}?)(?::\s+| - )(.+)$/);
  return m ? { head: m[1].trim(), rest: m[2].trim() } : { head: String(text || '').trim(), rest: '' };
}
const pick = (headers, cellsRow, names) => {
  for (const n of names) {
    const i = headers.findIndex((h) => h.includes(n));
    if (i >= 0) return cellsRow[i] || '';
  }
  return '';
};
const priOf = (s) => (/\b(must|shall)\b/i.test(s) ? 'Must' : /\bshould\b/i.test(s) ? 'Should' : /\b(could|may|nice[- ]to[- ]have)\b/i.test(s) ? 'Could' : '');
const fitSplit = (s) => {
  const m = String(s).match(/^(.*?)\s*(?:\bAcceptance:|\bFit:)\s*(.+)$/i);
  return m ? { stmt: m[1].trim().replace(/[.;,]$/, ''), fit: m[2].trim() } : { stmt: s, fit: '' };
};

/* ---------------- extraction per target ---------------- */
export function extractRows(qid, body, source) {
  const src = 'Import · ' + (source || 'document');
  const table = mdTableIn(body);
  const items = bulletItems(body);
  const fallback = items.length ? items : (body.trim() ? [stripMd(body.trim())] : []);
  switch (qid) {
    case 'fr': case 'nfr':
      return fallback.map((t) => {
        const f = fitSplit(t);
        return { stmt: f.stmt, fit: f.fit || 'to confirm', pri: priOf(t), comp: '', src };
      });
    case 'eval':
      if (table) return table.rows.map((r) => ({
        dim: pick(table.headers, r, ['dimension', 'quality']), metric: pick(table.headers, r, ['metric', 'method']),
        thresh: pick(table.headers, r, ['threshold', 'target']), dataset: pick(table.headers, r, ['set', 'dataset']), comp: '' }));
      return fallback.map((t) => ({ dim: splitPair(t).head, metric: splitPair(t).rest, thresh: 'to confirm', dataset: 'to confirm', comp: '' }));
    case 'metrics':
      if (table) return table.rows.map((r) => ({
        metric: pick(table.headers, r, ['metric', 'kpi', 'name']), target: pick(table.headers, r, ['target', 'goal']),
        method: pick(table.headers, r, ['method', 'measure', 'how']) }));
      return fallback.map((t) => { const p = splitPair(t); return { metric: p.head, target: p.rest, method: '' }; });
    case 'glossary':
      return fallback.map((t) => { const p = splitPair(t); return { term: p.head, def: p.rest }; }).filter((r) => r.term);
    case 'persona':
      return fallback.map((t) => { const p = splitPair(t); return { persona: p.head, needs: p.rest }; });
    case 'components':
      return fallback.map((t) => { const p = splitPair(t); return { name: p.head, owner: '', status: '', desc: p.rest }; });
    case 'interfaces':
      return fallback.map((t) => { const p = splitPair(t); return { iface: p.head, req: p.rest, fit: '' }; });
    case 'gates':
      if (table) return table.rows.map((r) => ({
        gate: pick(table.headers, r, ['gate', 'milestone', 'phase']), criteria: pick(table.headers, r, ['criteria', 'exit', 'done']),
        decider: pick(table.headers, r, ['decider', 'owner', 'who']), target: pick(table.headers, r, ['date', 'target', 'when']) }));
      return fallback.map((t) => { const p = splitPair(t); return { gate: p.head, criteria: p.rest, decider: '', target: '' }; });
    case 'data_entities':
      return fallback.map((t) => { const p = splitPair(t); return { entity: p.head, sens: p.rest }; });
    default:
      return [];
  }
}

/* ---------------- the plan ---------------- */
/* files: [{ name, text }] → { placements, unplaced }. One placement per
   target: longs merge across files (blank line between), lists and rows
   concatenate. Segments with unrecognized titles land in unplaced. */
export function mapArtifacts(files) {
  const byQid = {};
  const unplaced = [];
  for (const f of files || []) {
    for (const seg of segmentText(f.text, f.name)) {
      const qid = classifySegment(seg.title);
      if (!qid) {
        if (seg.body) unplaced.push({ title: seg.title || '(untitled)', body: seg.body, source: f.name || 'pasted text' });
        continue;
      }
      const kind = intakeKind(qid);
      const p = byQid[qid] || (byQid[qid] = { qid, kind, sources: [], value: '', rows: [] });
      if (!p.sources.includes(f.name || 'pasted text')) p.sources.push(f.name || 'pasted text');
      if (kind === 'long') p.value = p.value ? p.value + '\n\n' + seg.body : seg.body;
      else if (kind === 'list') p.rows.push(...bulletItems(seg.body).map((t) => ({ text: t })));
      else p.rows.push(...extractRows(qid, seg.body, f.name));
    }
  }
  const placements = Object.values(byQid).filter((p) => (p.kind === 'long' ? p.value.trim() : p.rows.length));
  return { placements, unplaced };
}

/* Selected placements + current answers → concrete write operations, with
   the never-overwrite rule applied and reported. `answers` is the current
   field-value map; rows are inherently additive so they always land. */
export function applyPlan(placements, answers) {
  const ops = [];
  const kept = [];
  for (const p of placements || []) {
    if (p.kind === 'long' || p.kind === 'short') {
      const cur = String((answers || {})[p.qid] || '').trim();
      if (cur) { kept.push(p.qid); continue; }   // existing content is never touched
      ops.push({ kind: 'field', qid: p.qid, value: p.value });
    } else {
      for (const r of p.rows) ops.push({ kind: 'row', qid: p.qid, data: r });
    }
  }
  return { ops, kept };
}

/* ---------------- execution ---------------- */
/* Run the ops through the repo's rev-checked RPC wrappers, sequentially, in
   plan order - the same discipline applyTemplate uses, so imported content
   is indistinguishable from typed content at the storage layer. Field ops
   may carry baseRev (the caller knows the live field revisions); rows insert
   with a server-generated id. onStep reports progress for the UI. */
export async function executeOps(repo, pid, ops, onStep) {
  const out = { ok: true, fields: 0, rows: 0, failed: 0 };
  let done = 0;
  for (const op of ops || []) {
    const r = op.kind === 'field'
      ? await repo.saveField(pid, op.qid, op.value, op.baseRev || 0)
      : await repo.upsertRow(pid, op.qid, null, op.data);
    if (r.error || !r.data || !r.data.ok) { out.failed++; out.ok = false; }
    else if (op.kind === 'field') out.fields++;
    else out.rows++;
    done++;
    if (onStep) onStep(done, (ops || []).length);
  }
  return out;
}
