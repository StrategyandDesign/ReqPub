/* ReqPub v2 — exports: Markdown, Word (.doc), print/PDF, executive summary. */

import { esc, download, copyText } from './core.js';
import { mdToHtml, execSummaryData } from './domain.js';

const STATUS_LABEL = { draft: 'Draft', in_review: 'In review', approved: 'Approved', changes_requested: 'Changes requested' };

function coverHTML(meta) {
  const line = [meta.org, meta.label ? 'Version ' + meta.label : 'Working draft',
    STATUS_LABEL[meta.status] || 'Draft', new Date().toLocaleDateString()]
    .filter(Boolean).join('  ·  ');
  const approvals = (meta.approvals || []).length
    ? '<div class="rp-meta">Approvals: ' + meta.approvals.map((a) =>
        esc((a.approver_role || 'Approver') + (a.approver_name ? ' — ' + a.approver_name : '') +
        ' (' + (STATUS_LABEL[a.status] || a.status) + ')')).join('; ') + '</div>'
    : '';
  return '<div class="rp-cover">' +
    '<div class="rp-brand"><div class="brandmark"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div><span class="rp-word">ReqPub</span></div>' +
    '<div class="rp-title">' + esc(meta.product || 'Untitled') + '</div>' +
    (meta.org ? '<div class="rp-org">' + esc(meta.org) + '</div>' : '') +
    '<div class="rp-meta">' + esc(line) + '</div>' + approvals +
    '</div>';
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
  const body = coverHTML(meta) + mdToHtml(md);
  const doc = '<!DOCTYPE html><html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
    '<title>' + esc(meta.product || 'Requirements') + '</title><style>' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;max-width:760px}' +
    'h1{font-size:20pt;margin:0 0 4pt} h2{font-size:14pt;margin:16pt 0 6pt} h3{font-size:12pt;margin:12pt 0 4pt}' +
    '.doc-meta,.part{font-family:Consolas,monospace;font-size:9pt;color:#333;border-top:1pt solid #ddd;border-bottom:1pt solid #ddd;padding:6pt 0;margin:8pt 0}' +
    '.part{border:none;letter-spacing:2pt;text-transform:uppercase;color:#555}' +
    'table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:10pt}' +
    'th,td{border:1pt solid #cfcfcf;padding:4pt 6pt;text-align:left;vertical-align:top}' +
    'th{background:#f1f5ff} .idc{font-family:Consolas,monospace;white-space:nowrap}' +
    '.rp-cover{border-bottom:2.5pt solid #2563FF;padding-bottom:10pt;margin-bottom:16pt}' +
    '.rp-word{font-size:13pt;font-weight:bold} .rp-title{font-size:22pt;font-weight:bold;margin:2pt 0}' +
    '.rp-org{color:#444} .rp-meta{font-family:Consolas,monospace;font-size:9pt;color:#444;margin-top:6pt}' +
    '.brandmark{display:inline-block;width:22px;height:22px;background:#2563FF;border-radius:5px;vertical-align:middle;margin-right:6px;text-align:center;line-height:26px}' +
    '</style></head><body>' + body + '</body></html>';
  download(fileStem(meta) + '.doc', 'application/msword', doc);
}

export function printDoc(md, meta) {
  const area = document.getElementById('printArea');
  if (!area) return;
  area.innerHTML = '<div class="page">' + coverHTML(meta) + '<div class="md-wrap">' + mdToHtml(md) + '</div></div>';
  window.print();
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
