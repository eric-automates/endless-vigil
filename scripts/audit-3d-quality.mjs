#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id QUALITY-3D-AUDIT
 * @state-contract Verifies CC0 MakeHuman/CharacterCreator kit integrity, Nanite-style LOD0/LOD1/LOD2
 *                 budgets, positive outward winding, 3D craniofacial relief, WebGPU/WebGL2 dual runtime,
 *                 design-vault.json SHA-256 provenance, and operator-forge.html synchronization.
 * @invariant Hard-fails on primitive cube/box builders, WebGL1-breaking mat3(uModel), corrupt morphs,
 *            broken LOD ratios, negative signed volumes, or HTML desync.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const kitJsPath = path.join(rootDir, 'js', 'ev-humanoid-kit.js');
const kitBinPath = path.join(rootDir, 'assets', 'ev-humanoid-kit.bin');
const gpuEngPath = path.join(rootDir, 'js', 'ev-gpu-engine.js');
const forgePath = path.join(rootDir, 'operator-forge.html');
const vaultPath = path.join(rootDir, 'data', 'design-vault.json');

const failures = [];

for (const reqFile of [kitJsPath, kitBinPath, gpuEngPath, forgePath, vaultPath]) {
  if (!fs.existsSync(reqFile)) {
    console.error('FATAL: Missing required asset/script:', reqFile);
    process.exit(1);
  }
}

const kitSrc = fs.readFileSync(kitJsPath, 'utf8');
const engSrc = fs.readFileSync(gpuEngPath, 'utf8');
const forgeHtml = fs.readFileSync(forgePath, 'utf8');

// 1. Ban primitive box builders or WebGL1-breaking GLSL in engine & forge
for (const [label, src] of [['js/ev-gpu-engine.js', engSrc], ['operator-forge.html', forgeHtml]]) {
  if (/\bpushBox\b|\bbuildCube\b|\bcreateBox\b/.test(src)) {
    failures.push(`${label}: banned primitive box builder detected.`);
  }
  if (/mat3\s*\(\s*uModel\s*\)/.test(src)) {
    failures.push(`${label}: contains WebGL2-only mat3(uModel) cast that fails in WebGL1 ES 1.00.`);
  }
}

// 2. Load CC0 kit pack & dual WebGPU/WebGL2 runtime in Node VM
const sandbox = {
  window: {}, self: {}, console, Float32Array, Uint16Array, Uint8Array, Int16Array, Int8Array,
  Uint32Array, DataView, TextDecoder, Buffer, Math, Promise, Map, Set, JSON, parseInt, Number,
  Object, Array, Error, require
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.runInNewContext(kitSrc, sandbox, { filename: 'js/ev-humanoid-kit.js' });
vm.runInNewContext(engSrc, sandbox, { filename: 'js/ev-gpu-engine.js' });

const EVGPUEngine = sandbox.EVGPUEngine;
const kitB64 = sandbox.EV_HUMANOID_KIT_PACK;
if (!EVGPUEngine || !kitB64) {
  console.error('FATAL: EVGPUEngine or EV_HUMANOID_KIT_PACK failed to initialize');
  process.exit(1);
}

// 3. Decompress & parse binary CC0 pack directly (mirrors browser runtime decoder)
const binRaw = zlib.inflateSync(fs.readFileSync(kitBinPath));
const jsRaw = zlib.inflateSync(Buffer.from(kitB64, 'base64'));
if (!binRaw.equals(jsRaw)) {
  failures.push('assets/ev-humanoid-kit.bin and js/ev-humanoid-kit.js decompressed payloads diverge.');
}

const dv = new DataView(binRaw.buffer, binRaw.byteOffset, binRaw.byteLength);
const hlen = dv.getUint32(0, true);
const manifest = JSON.parse(binRaw.subarray(4, 4 + hlen).toString('utf8'));
const mblob = binRaw.subarray(4 + hlen);

function decodeMeshRecord(mname) {
  const [off, len] = manifest.meshToc[mname];
  const sub = new Uint8Array(mblob.subarray(off, off + len));
  const mdv = new DataView(sub.buffer, sub.byteOffset, sub.byteLength);
  let p = 0;
  const vc = mdv.getUint32(p, true); p += 4;
  const ic = mdv.getUint32(p, true); p += 4;
  const flags = mdv.getUint16(p, true); p += 2;
  const nm = mdv.getUint16(p, true); p += 2;
  const posI16 = new Int16Array(sub.buffer, sub.byteOffset + p, vc * 3); p += vc * 6;
  const pos = new Float32Array(vc * 3);
  for (let i = 0; i < vc * 3; i++) pos[i] = posI16[i] / 10000.0;
  p += vc * 2; // oct norm
  p += vc * 4; // uv
  p += vc * 4; // joints
  p += vc * 4; // weights
  const idx = new Uint16Array(sub.buffer, sub.byteOffset + p, ic);
  return { vc, ic, flags, nm, pos, idx };
}

function computeSignedVolume(pos, idx) {
  let vol6 = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    vol6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return vol6 / 6.0;
}

const body = decodeMeshRecord('base_body');
const lod1 = decodeMeshRecord('lod1');
const lod2 = decodeMeshRecord('lod2');
const tri0 = body.ic / 3;
const tri1 = lod1.ic / 3;
const tri2 = lod2.ic / 3;

if (tri0 < 20000) failures.push(`LOD0 CC0 hero triangle budget too low (${tri0} < 20000).`);
if (tri1 < 1600 || tri1 >= tri0 * 0.55) failures.push(`LOD1 budget invalid (${tri1}); expected >=1600 and <55% of ${tri0}.`);
if (tri2 < 320 || tri2 > 950) failures.push(`LOD2 silhouette budget invalid (${tri2}); expected 320..950 tris.`);
if (tri0 / tri2 < 8) failures.push(`LOD0/LOD2 polygon ratio too small (${(tri0 / tri2).toFixed(1)}x < 8x).`);
if (body.nm < 35) failures.push(`Expected >= 35 real facial/body morph targets on base_body, found ${body.nm}.`);

// 4. Verify positive outward winding across base_body + closed tactical shells
for (const mname of ['base_body', 'armor_cuirass', 'armor_pauldrons', 'carbine_rifle', 'wrist_watch', 'wrist_gauntlet']) {
  const rec = decodeMeshRecord(mname);
  const sv = computeSignedVolume(rec.pos, rec.idx);
  if (!(sv > 0)) {
    failures.push(`${mname} has non-positive signed volume (${sv.toFixed(6)}); inside-out winding!`);
  }
}

// 5. Verify true 3D anatomical nose-to-socket relief on MakeHuman base_body + eyes/brows
let maxNoseZ = -999, minSocketZ = 999;
for (let i = 0; i < body.pos.length; i += 3) {
  const x = body.pos[i], y = body.pos[i + 1], z = body.pos[i + 2];
  if (y > 1.46 && y < 1.54 && z > 0.08 && Math.abs(x) < 0.015) {
    if (z > maxNoseZ) maxNoseZ = z;
  }
  if (y > 1.51 && y < 1.55 && z > 0.06 && Math.abs(x) > 0.022 && Math.abs(x) < 0.045) {
    if (z < minSocketZ) minSocketZ = z;
  }
}
const noseRelief = maxNoseZ - minSocketZ;
if (noseRelief < 0.018) {
  failures.push(`base_body craniofacial relief too shallow (${(noseRelief * 1000).toFixed(1)}mm < 18mm).`);
}
for (const reqEye of ['eye_sclera', 'eye_iris', 'eye_cornea', 'eyebrows', 'eyelashes', 'helmet_shell', 'helmet_half_visor', 'helmet_sealed_visor']) {
  if (!manifest.meshToc[reqEye]) failures.push(`Missing required CC0/tactical mesh: ${reqEye}`);
}

// 6. Verify Morph Weights + 53-Bone Skeletal Pose Solver in EVGPUEngine
const mw = EVGPUEngine.computeMorphWeights({ gender: -0.8, muscle: 0.9, expression: 'smirk', blink: 1.0 });
if (!(mw.gender_male > 0.5 && mw.muscle_max > 0.5 && mw.expr_smirk > 0.5 && mw.blink_left > 0.5)) {
  failures.push('EVGPUEngine.computeMorphWeights failed morph mapping test.');
}

const sk = manifest.skeleton;
const ibmBytes = Buffer.from(sk.ibmB64, 'base64');
const ibmFloats = new Float32Array(ibmBytes.buffer, ibmBytes.byteOffset, ibmBytes.byteLength / 4);
const ibms = [];
for (let j = 0; j < sk.names.length; j++) ibms.push(new Float32Array(ibmFloats.subarray(j * 16, j * 16 + 16)));
const fakeKit = { skeleton: { names: sk.names, parents: sk.parents, restT: sk.restT, restR: sk.restR, ibms }, anims: { idle: { duration: 1, frames: 1, tracks: {} } } };
const seatedPose = EVGPUEngine.evaluateSkeletonPose(fakeKit, 'idle', 0, {
  lowerarm_l: [-0.95, 0.88, 0.20], thigh_l: [-1.08, 0.04, 0.12]
}, [0, -0.34, -0.04], 1.0);
if (seatedPose.worlds.length !== 53 || seatedPose.skinMats.length !== 53 * 16) {
  failures.push(`Expected 53-bone skeletal solver output, got ${seatedPose.worlds.length}`);
}

// 7. Verify Design Knowledge Vault SHA-256 integrity
const vaultJson = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
const vaultDecomp = zlib.inflateSync(Buffer.from(vaultJson.payloadB64, 'base64')).toString('utf8');
const actualHash = crypto.createHash('sha256').update(vaultDecomp, 'utf8').digest('hex');
if (actualHash !== vaultJson.sha256) {
  failures.push(`data/design-vault.json SHA-256 mismatch: expected ${vaultJson.sha256}, got ${actualHash}`);
}

// 8. Verify operator-forge.html synchronization, single-script safety, WebGPU/WebGL2 + Corner Portrait
if (!forgeHtml.includes(engSrc.trim().slice(0, 220))) {
  failures.push('operator-forge.html inline EVGPUEngine is out of sync with js/ev-gpu-engine.js.');
}
if (!forgeHtml.includes(kitSrc.trim().slice(0, 120))) {
  failures.push('operator-forge.html inline EV_HUMANOID_KIT_PACK is out of sync with js/ev-humanoid-kit.js.');
}
for (const tok of ['corner-portrait-hud', 'WGSL_COMPUTE_SKIN', 'navigator.gpu', 'drawElementsInstanced', 'buildEnvironmentProps']) {
  if (!forgeHtml.includes(tok)) {
    failures.push(`operator-forge.html missing critical dual-backend/scene feature: ${tok}`);
  }
}

console.log('=== ENDLESS VIGIL // 3D CC0 & WEBGPU QUALITY AUDIT ===');
console.log(`LOD0 CC0 Hero        : ${tri0} tris (${body.nm} morphs, nose relief ${(noseRelief * 1000).toFixed(1)}mm)`);
console.log(`LOD1 Tactical View   : ${tri1} tris`);
console.log(`LOD2 Instanced Crowd : ${tri2} tris (ratio ${(tri0 / tri2).toFixed(1)}x)`);
console.log(`Meshes / Tex / Bones : ${Object.keys(manifest.meshToc).length} meshes | ${Object.keys(manifest.texB64).length} WebP | ${sk.names.length} bones`);
console.log(`Design Vault SHA-256 : ${actualHash.slice(0, 16)}... (${vaultJson.recordCount} records, ${vaultJson.compressedBytes} B)`);
console.log(`3D Quality Failures  : ${failures.length}`);

if (failures.length > 0) {
  console.error('\nFAILED 3D QUALITY CHECKS:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('3D QUALITY & LOD GATE: PASS');
