#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id RELEASE-PACKAGER
 * @state-contract reads(all workspace artifacts) mutates(ev-release-bundle.zip, ev-private-server-bundle.zip, RELEASE_SHA256.txt)
 * @invariant Strictly separates public client Shards (ev-release-bundle.zip) from private Cloudflare Worker + D1 server authority code (ev-private-server-bundle.zip); never emits a bundle >= 25 MB.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const versionTag = process.argv[2] || 'v0.6.0-alpha';

// 1. Run structural, wording, HTML safety, zero-dev-leak, & resolution audit first
execFileSync('node', [path.join(__dirname, 'audit-graph.mjs')], { cwd: rootDir, stdio: 'inherit' });

const outPublicZip = path.join(rootDir, 'ev-release-bundle.zip');
const outPrivateZip = path.join(rootDir, 'ev-private-server-bundle.zip');
const outSha = path.join(rootDir, 'RELEASE_SHA256.txt');

for (const z of [outPublicZip, outPrivateZip]) {
  if (fs.existsSync(z)) fs.unlinkSync(z);
}

// 2A. Collect PUBLIC GitHub Pages repo targets (NEVER include worker/ or scripts/auth-relay-server.mjs!)
const publicTargets = [
  'index.html',
  'operator-forge.html',
  'cuff-slate.html',
  'temporal-lab.html',
  'README.md',
  'PROJECT_CHARTER.md',
  'ARCHITECTURE_STANDARDS.md',
  'COPYRIGHT_COMPLIANCE.md',
  'LEGAL_DISCLAIMER.md',
  'DESIGN_PARKING_LOT.md',
  'GITHUB_WORKFLOW.md',
  'REFRESH_MEMORY_PROTOCOL.md',
  'conglomerate-flowchart.html',
  'continuum-monitor.html',
  'assets/ev-humanoid-kit.bin',
  'data/graph-ledger.json',
  'data/state-envelope.schema.json',
  'data/design-vault.json',
  'js/ev-humanoid-kit.js',
  'js/ev-gpu-engine.js',
  'scripts/audit-graph.mjs',
  'scripts/audit-3d-quality.mjs',
  'scripts/assemble-operator-forge.mjs',
  'scripts/build-cc0-humanoid-kit.py',
  'scripts/build-release.mjs',
  'scripts/termux-push.sh'
].filter((item) => fs.existsSync(path.join(rootDir, item)));

execFileSync('zip', ['-r', '-q', 'ev-release-bundle.zip', ...publicTargets, '-x', '*.DS_Store', '*/node_modules/*'], {
  cwd: rootDir
});

// 2B. Collect PRIVATE Authority Worker + D1 repo targets (placed cleanly at Private repo root)
const workerDir = path.join(rootDir, 'worker');
const workerTargets = ['src', 'migrations', 'wrangler.example.jsonc', 'package.json'].filter((item) =>
  fs.existsSync(path.join(workerDir, item))
);
if (workerTargets.length) {
  execFileSync('zip', ['-r', '-q', outPrivateZip, ...workerTargets, '-x', '*.DS_Store', '*/node_modules/*'], {
    cwd: workerDir
  });
}

const rootPrivateTargets = [
  'scripts/auth-relay-server.mjs',
  'scripts/termux-push.sh',
  'data/state-envelope.schema.json'
].filter((item) => fs.existsSync(path.join(rootDir, item)));
execFileSync('zip', ['-r', '-q', outPrivateZip, ...rootPrivateTargets, '-x', '*.DS_Store', '*/node_modules/*'], {
  cwd: rootDir
});

function summarizeZip(zipPath) {
  const buf = fs.readFileSync(zipPath);
  if (buf.length > 25 * 1024 * 1024) {
    throw new Error(`Bundle ${path.basename(zipPath)} exceeds 25 MB limit (${buf.length} bytes)`);
  }
  return {
    name: path.basename(zipPath),
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    sizeKb: (buf.length / 1024).toFixed(1)
  };
}

const pubMeta = summarizeZip(outPublicZip);
const privMeta = summarizeZip(outPrivateZip);

fs.writeFileSync(
  outSha,
  `${pubMeta.sha256}  ${pubMeta.name}  (${versionTag}, ${pubMeta.sizeKb} KB)\n` +
  `${privMeta.sha256}  ${privMeta.name}  (${versionTag}, ${privMeta.sizeKb} KB)\n`,
  'utf8'
);

console.log('');
console.log('=== RELEASE BUNDLES READY (PUBLIC / PRIVATE SPLIT) ===');
console.log(`Tag     : ${versionTag}`);
console.log(`Public  : ${pubMeta.name} (${pubMeta.sizeKb} KB) | SHA-256: ${pubMeta.sha256}`);
console.log(`Private : ${privMeta.name} (${privMeta.sizeKb} KB) | SHA-256: ${privMeta.sha256}`);
console.log(`HashRef : RELEASE_SHA256.txt`);
