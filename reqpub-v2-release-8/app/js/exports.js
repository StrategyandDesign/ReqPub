/* ReqPub v2 — exports: Markdown, Word (.doc), print/PDF, executive summary. */

import { esc, escA, download, copyText } from './core.js';
import { mdToHtml, execSummaryData } from './domain.js';

const STATUS_LABEL = { draft: 'Draft', in_review: 'In review', approved: 'Approved', changes_requested: 'Changes requested' };
const ok = (u) => typeof u === 'string' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u);

/* A full-page cover: the assigned collaborator logo leads, ReqPub co-signs in
   the corner, the title and a metadata rail sit on a baseline, and approvals
   render as a signed-off list. Designed to be the first printed page. */
function coverHTML(meta) {
  const logo = ok(meta.logo)
    ? '<img class="rp-logo" src="' + escA(meta.logo) + '" alt="' + escA(meta.brandLabel || 'Client') + '">'
    : '';
  const label = meta.brandLabel ? '<div class="rp-client">' + esc(meta.brandLabel) + '</div>' : '';
  const statusCls = meta.status || 'draft';
  const rail = [
    ['Version', meta.label ? 'v' + meta.label : 'Working draft'],
    ['Status', STATUS_LABEL[meta.status] || 'Draft'],
    meta.org ? ['Prepared by', meta.org] : null,
    ['Date', new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })]
  ].filter(Boolean).map(([k, v]) =>
    '<div class="rp-rail-item"><div class="rp-rail-k">' + esc(k) + '</div><div class="rp-rail-v">' + esc(v) + '</div></div>').join('');
  const approvals = (meta.approvals || []).length
    ? '<div class="rp-appr"><div class="rp-appr-h">Approvals</div>' + meta.approvals.map((a) => {
        const decided = a.status === 'approved';
        return '<div class="rp-appr-row"><span class="rp-appr-mark ' + (decided ? 'yes' : '') + '">' +
          (decided ? '&#10003;' : '&middot;') + '</span>' +
          '<span class="rp-appr-role">' + esc(a.approver_role || 'Approver') + (a.approver_name ? ' &mdash; ' + esc(a.approver_name) : '') + '</span>' +
          '<span class="rp-appr-state ' + esc(a.status) + '">' + esc(STATUS_LABEL[a.status] || a.status) + '</span></div>';
      }).join('') + '</div>'
    : '';
  return '<section class="rp-cover">' +
    '<div class="rp-cover-top">' +
      '<div class="rp-lockup">' + (logo || '<div class="rp-nologo"></div>') + label + '</div>' +
      '<div class="rp-by"><span class="rp-by-t">Published with</span>' +
        '<span class="rp-by-brand"><span class="rp-mk"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>ReqPub</span></div>' +
    '</div>' +
    '<div class="rp-cover-mid">' +
      '<div class="rp-eyebrow">Requirements Baseline</div>' +
      '<h1 class="rp-title">' + esc(meta.product || 'Untitled') + '</h1>' +
      '<span class="rp-status ' + esc(statusCls) + '">' + esc(STATUS_LABEL[meta.status] || 'Draft') + '</span>' +
    '</div>' +
    '<div class="rp-cover-foot"><div class="rp-rail">' + rail + '</div>' + approvals + '</div>' +
  '</section>';
}

export function fileStem(meta) {
  return ((meta.product || 'requirements').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'requirements') +
    (meta.label ? '-v' + meta.label : '-draft');
}

export async function copyMarkdown(md) { return copyText(md); }

export function downloadMarkdown(md, meta) {
  download(fileStem(meta) + '.md', 'text/markdown;charset=utf-8', md);
}

/* Word opens well-formed HTML saved as .doc; this keeps the export dependency-free. */
export function downloadWord(md, meta) {
  const logo = ok(meta.logo)
    ? '<p style="margin:0 0 6pt"><img src="' + escA(meta.logo) + '" style="max-height:54pt;max-width:220pt"></p>' : '';
  const label = meta.brandLabel ? '<div style="font-size:12pt;font-weight:bold;color:#222">' + esc(meta.brandLabel) + '</div>' : '';
  const rail = [meta.label ? 'Version v' + meta.label : 'Working draft', STATUS_LABEL[meta.status] || 'Draft',
    meta.org ? 'Prepared by ' + meta.org : null, new Date().toLocaleDateString()]
    .filter(Boolean).join('  ·  ');
  const approvals = (meta.approvals || []).length
    ? '<div style="font-family:Consolas,monospace;font-size:9pt;color:#333;margin-top:8pt">Approvals: ' +
      meta.approvals.map((a) => esc((a.approver_role || 'Approver') + (a.approver_name ? ' — ' + a.approver_name : '') +
        ' (' + (STATUS_LABEL[a.status] || a.status) + ')')).join('; ') + '</div>' : '';
  const cover = '<div class="rp-cover">' + logo + label +
    '<div style="font-family:Consolas,monospace;font-size:8.5pt;letter-spacing:1.5pt;text-transform:uppercase;color:#2563FF;margin-top:10pt">Requirements Baseline</div>' +
    '<div class="rp-title">' + esc(meta.product || 'Untitled') + '</div>' +
    '<div class="rp-meta">' + esc(rail) + '</div>' + approvals +
    '<div style="font-size:8.5pt;color:#888;margin-top:8pt">Published with ReqPub</div></div>';
  const doc = '<!DOCTYPE html><html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
    '<title>' + esc(meta.product || 'Requirements') + '</title><style>' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;max-width:760px}' +
    'h1{font-size:20pt;margin:0 0 4pt} h2{font-size:14pt;margin:16pt 0 6pt} h3{font-size:12pt;margin:12pt 0 4pt}' +
    '.doc-meta,.part{font-family:Consolas,monospace;font-size:9pt;color:#333;border-top:1pt solid #ddd;border-bottom:1pt solid #ddd;padding:6pt 0;margin:8pt 0}' +
    '.part{border:none;letter-spacing:2pt;text-transform:uppercase;color:#555}' +
    'table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:10pt}' +
    'th,td{border:1pt solid #cfcfcf;padding:4pt 6pt;text-align:left;vertical-align:top}' +
    'th{background:#f1f5ff} .idc{font-family:Consolas,monospace;white-space:nowrap}' +
    '.rp-cover{border-bottom:2.5pt solid #2563FF;padding-bottom:12pt;margin-bottom:18pt}' +
    '.rp-title{font-size:24pt;font-weight:bold;margin:2pt 0;color:#0a0a0a}' +
    '.rp-meta{font-family:Consolas,monospace;font-size:9pt;color:#444;margin-top:8pt}' +
    '</style></head><body>' + cover + mdToHtml(md) + '</body></html>';
  download(fileStem(meta) + '.doc', 'application/msword', doc);
}

export function printDoc(md, meta) {
  const area = document.getElementById('printArea');
  if (!area) return;
  const running = '<div class="rp-runhead"><span>' + esc(meta.product || 'Requirements') + '</span>' +
    '<span>' + esc((meta.label ? 'v' + meta.label + '  ·  ' : '') + (STATUS_LABEL[meta.status] || 'Draft')) + '</span></div>';
  area.innerHTML = running + coverHTML(meta) +
    '<div class="rp-body"><div class="md">' + mdToHtml(md).replace(/^<div class="md">|<\/div>$/g, '') + '</div></div>';
  // Give an embedded logo a beat to decode before the print dialog captures it.
  const go = () => window.print();
  const img = area.querySelector('.rp-logo');
  if (img && !img.complete) { img.onload = go; img.onerror = go; setTimeout(go, 400); }
  else go();
}

/* ---- Executive summary ---- */
export function execSummaryHTML(answers, meta) {
  const d = execSummaryData(answers);
  const chip = (n, l) => '<div style="text-align:center;padding:0 18px"><div style="font-size:24px;font-weight:680;letter-spacing:-.02em">' + n + '</div><div class="eyebrow" style="font-size:9px;margin-top:2px">' + esc(l) + '</div></div>';
  const stat = '<div class="card" style="padding:18px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;margin:18px 0">' +
    chip(d.counts.fr, 'Functional') + chip(d.counts.nfr, 'Non-functional') +
    (d.counts.eval ? chip(d.counts.eval, 'AI eval') : '') + chip(d.counts.ir, 'Interfaces') + chip(d.counts.musts, 'Musts') + '</div>';
  const list = (items, fmt) => items.length ? '<ul>' + items.map((x) => '<li>' + fmt(x) + '</li>').join('') + '</ul>' : '<p style="color:var(--ink-4)">None recorded.</p>';
  return '<div class="md doc-anim">' +
    '<h1>' + esc(d.product) + ' — Executive Summary</h1>' +
    '<div class="doc-meta">' + esc([d.org, meta.label ? 'v' + meta.label : 'Working draft', new Date().toLocaleDateString()].filter(Boolean).join('  ·  ')) + '</div>' +
    (d.vision ? '<h2>Vision</h2><p>' + esc(d.vision) + '</p>' : '') +
    (d.problem ? '<h2>Problem</h2><p>' + esc(d.problem) + '</p>' : '') +
    '<h2>Goals</h2>' + list(d.goals, (g) => esc(g)) +
    '<h2>Success metrics</h2>' + list(d.metrics, (m) => '<strong>' + esc(m.metric || '') + '</strong>' + (m.target ? ': ' + esc(m.target) : '') + (m.method ? ' <span style="color:var(--ink-4)">(' + esc(m.method) + ')</span>' : '')) +
    '<h2>Scale of the specification</h2>' + stat +
    (d.components.length ? '<h2>Components</h2>' + list(d.components, (c) => '<strong>' + esc(c.name || '') + '</strong>' + (c.owner ? ' — ' + esc(c.owner) : '') + (c.status ? ' <span style="color:var(--ink-4)">(' + esc(c.status) + ')</span>' : '')) : '') +
    (d.outOfScope.length ? '<h2>Explicitly out of scope</h2>' + list(d.outOfScope, (x) => esc(x)) : '') +
    '</div>';
}

export function downloadExecSummary(answers, meta) {
  const d = execSummaryData(answers);
  const md = ['# ' + d.product + ' — Executive Summary', '',
    [d.org, meta.label ? 'v' + meta.label : 'Working draft', new Date().toLocaleDateString()].filter(Boolean).join(' · '), '',
    d.vision ? '## Vision\n\n' + d.vision : '', d.problem ? '## Problem\n\n' + d.problem : '',
    '## Goals', ...d.goals.map((g) => '- ' + g), '',
    '## Success metrics', ...d.metrics.map((m) => '- **' + (m.metric || '') + '**' + (m.target ? ': ' + m.target : '')), '',
    '## Requirements', '- Functional: ' + d.counts.fr, '- Non-functional: ' + d.counts.nfr,
    '- AI evaluation: ' + d.counts.eval, '- Interfaces: ' + d.counts.ir, '- Must-priority: ' + d.counts.musts
  ].filter((x) => x !== '').join('\n');
  download(fileStem({ product: d.product + '-summary', label: meta.label }) + '.md', 'text/markdown;charset=utf-8', md);
}
