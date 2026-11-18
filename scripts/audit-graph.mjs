#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id GRAPH-AUDIT
 * @state-contract reads(data/graph-ledger.json, data/state-envelope.schema.json, conglomerate-flowchart.html, continuum-monitor.html) mutates(none)
 * @invariant Never fails silently on broken references, dead ends, unwired branch outcomes, HTML drift, inline script-close leaks, or >25MB RMP bundle size.
 * @ip-note Original graph & HTML safety auditor co-created with Ironscribe of the Endless Vigil.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const ledgerPath = path.join(rootDir, 'data', 'graph-ledger.json');
const schemaPath = path.join(rootDir, 'data', 'state-envelope.schema.json');
const htmlPath = path.join(rootDir, 'conglomerate-flowchart.html');
const monitorPath = path.join(rootDir, 'continuum-monitor.html');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const nodesById = new Map(ledger.nodes.map((n) => [n.id, n]));
const outEdges = new Map(ledger.nodes.map((n) => [n.id, []]));
const inEdges = new Map(ledger.nodes.map((n) => [n.id, []]));

const brokenEdges = [];
const crossShardJumps = [];

for (const edge of ledger.edges) {
  const fromNode = nodesById.get(edge.from);
  const toNode = nodesById.get(edge.to);
  if (!fromNode || !toNode) {
    brokenEdges.push(edge);
    continue;
  }
  outEdges.get(edge.from).push(edge);
  inEdges.get(edge.to).push(edge);
  if (fromNode.shard !== toNode.shard) {
    crossShardJumps.push({
      edgeId: edge.id,
      from: `${fromNode.id} (${fromNode.shard})`,
      to: `${toNode.id} (${toNode.shard})`,
      label: edge.label
    });
  }
}

// BFS reachability from entry nodes
const reachable = new Set();
const queue = ledger.nodes.filter((n) => n.type === 'entry').map((n) => n.id);
for (const id of queue) reachable.add(id);

while (queue.length > 0) {
  const curr = queue.shift();
  for (const edge of outEdges.get(curr) || []) {
    if (!reachable.has(edge.to)) {
      reachable.add(edge.to);
      queue.push(edge.to);
    }
  }
}

const orphans = ledger.nodes.filter((n) => !reachable.has(n.id));
const gapNodes = ledger.nodes.filter((n) => n.type === 'gap');
const deadEnds = ledger.nodes.filter(
  (n) => n.type !== 'terminal' && n.type !== 'gap' && (outEdges.get(n.id) || []).length === 0
);

const unwiredOutcomes = [];
for (const node of ledger.nodes) {
  const wiredKeys = new Set((outEdges.get(node.id) || []).map((e) => e.outcomeKey));
  for (const expected of node.expectedOutcomes || []) {
    if (!wiredKeys.has(expected)) {
      unwiredOutcomes.push({ nodeId: node.id, title: node.title, missingOutcome: expected });
    }
  }
}

// Verify HTML files exist, stay synced with ledger, pass JS safety, and pass Multi-Resolution Containment checks
const htmlDrift = [];
const htmlSecurityErrors = [];
const htmlResolutionErrors = [];

function checkHtmlSafetyAndResolution(filePath, label) {
  if (!fs.existsSync(filePath)) {
    htmlSecurityErrors.push(`Missing required HTML deliverable: ${label}`);
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const scriptMatches = [...raw.matchAll(/<script\b[^>]*>/gi)];
  const closeMatches = [...raw.matchAll(/<\/script>/gi)];
  if (scriptMatches.length !== 1 || closeMatches.length !== 1) {
    htmlSecurityErrors.push(`${label}: expected exactly 1 <script> and 1 </script> tag (found ${scriptMatches.length} open / ${closeMatches.length} close)`);
  } else {
    const startIdx = scriptMatches[0].index + scriptMatches[0][0].length;
    const endIdx = closeMatches[0].index;
    const jsBody = raw.slice(startIdx, endIdx);
    if (/<\\?\/?script/i.test(jsBody)) {
      htmlSecurityErrors.push(`${label}: detected forbidden <script> or <\\/script> literal inside JS block`);
    }
  }

  // Multi-Resolution Containment Gate (prevents 320px-430px phone clipping & CSS Grid modal overflow)
  if (!/<meta\s+name="viewport"[^>]*width=device-width/i.test(raw)) {
    htmlResolutionErrors.push(`${label}: missing responsive <meta name="viewport" content="width=device-width...">`);
  }
  if (!/max-width:\s*100vw/i.test(raw) || !/overflow-x:\s*hidden/i.test(raw)) {
    htmlResolutionErrors.push(`${label}: missing max-width: 100vw / overflow-x: hidden root containment`);
  }

  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    // 1. Ban display: grid on modal/legal/diegetic/overlay backdrops
    const overlayGridRe = /\.(legal|modal|diegetic|overlay|dialog)[^{]*\{[^}]*display:\s*grid/gi;
    if (overlayGridRe.test(css)) {
      htmlResolutionErrors.push(`${label}: CSS Grid used on modal/overlay backdrop (causes phone right-edge overflow; use display: flex + min())`);
    }
    // 2. Ban unguarded fixed pixel widths >= 280px inside modal/legal/diegetic/auth boxes
    const modalBoxRe = /\.(legal-box|modal|diegetic-box|dialog-box|auth-shell)\s*\{([^}]*)\}/gi;
    let m;
    while ((m = modalBoxRe.exec(css)) !== null) {
      if (/\bwidth:\s*\d{3,}px\b/i.test(m[2]) && !/\bwidth:\s*min\(/i.test(m[2])) {
        htmlResolutionErrors.push(`${label}: .${m[1]} uses fixed pixel width without min(...) viewport clamp`);
      }
    }
    // 3. Ban bare CSS Grid minmax(Npx, ...) without min(100%, ...)
    const rawMinmaxRe = /minmax\(\s*(\d{3,})px\s*,/gi;
    while ((m = rawMinmaxRe.exec(css)) !== null) {
      htmlResolutionErrors.push(`${label}: CSS Grid minmax(${m[1]}px, ...) must be written minmax(min(100%, ${m[1]}px), ...)`);
    }
    // 4. Ban wide un-clamped flex-basis >= 280px
    const wideFlexRe = /flex:\s*\d+\s+\d+\s+(\d{3,})px/gi;
    while ((m = wideFlexRe.exec(css)) !== null) {
      if (Number(m[1]) >= 280) {
        htmlResolutionErrors.push(`${label}: flex-basis ${m[1]}px >= 280px can overflow narrow 320px viewports`);
      }
    }
  }
  return raw;
}

const allHtmlFiles = fs.readdirSync(rootDir).filter((f) => f.endsWith('.html'));
const htmlContents = new Map();
for (const fname of allHtmlFiles) {
  htmlContents.set(fname, checkHtmlSafetyAndResolution(path.join(rootDir, fname), fname));
}

const indexHtml = htmlContents.get('index.html') ?? checkHtmlSafetyAndResolution(path.join(rootDir, 'index.html'), 'index.html');
const flowchartHtml = htmlContents.get('conglomerate-flowchart.html') ?? checkHtmlSafetyAndResolution(htmlPath, 'conglomerate-flowchart.html');
const monitorHtml = htmlContents.get('continuum-monitor.html') ?? checkHtmlSafetyAndResolution(monitorPath, 'continuum-monitor.html');

if (indexHtml && !indexHtml.includes('CONDUIT UNVERIFIED // ZERO TELEMETRY RETURNED')) {
  htmlSecurityErrors.push('index.html: missing zero-oracle rejection message');
}
if (indexHtml && /(VIGIL-ALPHA-77|VIGIL-BETA-42|ADMIN-VIGIL-09|loadDevLedger)/.test(indexHtml)) {
  htmlSecurityErrors.push('index.html: detected leaked Phase-1 dev credentials or client bypass ledger inside public HTML');
}
for (const [fname, raw] of htmlContents.entries()) {
  if (!raw) continue;
  const cleaned = raw
    .replace(/const LEDGER = [\s\S]*?;\n/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (/\b(game|gaming|simulation|simulator)\b/i.test(cleaned)) {
    htmlSecurityErrors.push(`${fname}: detected forbidden public entertainment/simulation terminology`);
  }
}
if (flowchartHtml) {
  for (const s of ledger.meta.shards) {
    if (!flowchartHtml.includes(`"${s.id}"`)) htmlDrift.push(`Missing shard ${s.id} in conglomerate-flowchart.html`);
  }
  for (const n of ledger.nodes) {
    if (!flowchartHtml.includes(`"${n.id}"`)) htmlDrift.push(`Missing node ${n.id} in conglomerate-flowchart.html`);
  }
  for (const e of ledger.edges) {
    if (!flowchartHtml.includes(`"${e.id}"`)) htmlDrift.push(`Missing edge ${e.id} in conglomerate-flowchart.html`);
  }
}
if (monitorHtml && !monitorHtml.includes('SIGNAL INTERCEPT DENIED')) {
  htmlSecurityErrors.push('continuum-monitor.html: missing Sector Jammer RF-static intercept message');
}

// Measure total source footprint against 25 MB Refresh Memory Protocol cap (excluding .git, node_modules, uploads, built .zip)
function dirBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'uploads', 'dist'].includes(entry.name)) continue;
    if (entry.isFile() && entry.name.endsWith('.zip')) continue;
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(p) : fs.statSync(p).size;
  }
  return total;
}
const totalBytes = dirBytes(rootDir);
const totalKb = (totalBytes / 1024).toFixed(1);

console.log('=== ENDLESS VIGIL // v0.6.0-alpha AUDIT ===');
console.log(`Schema Title         : ${schema.title}`);
console.log(`Shards Defined       : ${ledger.meta.shards.length}`);
console.log(`Total Nodes          : ${ledger.nodes.length}`);
console.log(`Total Branch Edges   : ${ledger.edges.length}`);
console.log(`Cross-Shard Jumps    : ${crossShardJumps.length}`);
console.log(`Explicit Gap Stubs   : ${gapNodes.length}`);
console.log(`Broken Edges         : ${brokenEdges.length}`);
console.log(`Unreachable Orphans  : ${orphans.length}`);
console.log(`Unintended Dead Ends : ${deadEnds.length}`);
console.log(`Unwired Outcomes     : ${unwiredOutcomes.length}`);
console.log(`HTML Workbench Drift : ${htmlDrift.length}`);
console.log(`HTML Safety Errors   : ${htmlSecurityErrors.length}`);
console.log(`HTML Resolution Errs : ${htmlResolutionErrors.length} (scanned ${allHtmlFiles.length} HTML files across 320px-1920px rules)`);
console.log(`Workspace RMP Size   : ${totalKb} KB / 25,600.0 KB limit`);
console.log('');

if (gapNodes.length > 0) {
  console.log('--- PLANNED DESIGN GAPS (INTENTIONAL STUBS TO RESOLVE) ---');
  for (const g of gapNodes) {
    console.log(`  [GAP] ${g.id} (${g.shard}): ${g.title} -> ${g.summary}`);
  }
  console.log('');
}

if (
  brokenEdges.length ||
  orphans.length ||
  deadEnds.length ||
  unwiredOutcomes.length ||
  htmlDrift.length ||
  htmlSecurityErrors.length ||
  htmlResolutionErrors.length ||
  totalBytes > 25 * 1024 * 1024
) {
  if (brokenEdges.length) console.error('BROKEN EDGES:', brokenEdges);
  if (orphans.length) console.error('ORPHAN NODES:', orphans.map((o) => o.id));
  if (deadEnds.length) console.error('DEAD ENDS:', deadEnds.map((d) => d.id));
  if (unwiredOutcomes.length) console.error('UNWIRED OUTCOMES:', unwiredOutcomes);
  if (htmlDrift.length) console.error('HTML DRIFT:', htmlDrift);
  if (htmlSecurityErrors.length) console.error('HTML SAFETY ERRORS:', htmlSecurityErrors);
  if (htmlResolutionErrors.length) console.error('HTML RESOLUTION ERRORS:', htmlResolutionErrors);
  process.exitCode = 1;
} else {
  console.log('STRUCTURAL, HTML & RESOLUTION AUDIT: PASS (0 errors, HTML synced, 320px-1920px safe, RMP size compliant)');
}
