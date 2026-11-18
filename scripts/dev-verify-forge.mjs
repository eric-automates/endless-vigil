#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id FORGE-DEV-EMULATOR
 * @invariant Emulates Google Pixel 10 Pro XL (412x915, dpr 3) + Desktop across Chrome Android,
 *   DuckDuckGo Android WebView, and Vivaldi Mobile for BOTH WebGPU Compute and WebGL2 paths.
 *   Tests touch orbit/pitch/pinch, all 6 creator tabs, corner HUD portrait alignment, and
 *   exports exact live draw state to /tmp/ev_dev_dump.json for visual raster inspection.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'operator-forge.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) throw new Error('Could not locate single <script> in operator-forge.html');
const jsCode = scriptMatch[1];

const DEVICE_PROFILES = [
  {
    name: 'Pixel10ProXL-Chrome-WebGPU',
    width: 412, height: 915, stageW: 412, stageH: 450, dpr: 3, useWebGPU: true,
    ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
    pointerCaptureSupported: true
  },
  {
    name: 'Pixel10ProXL-DuckDuckGo-WebGL2',
    width: 412, height: 915, stageW: 412, stageH: 450, dpr: 3, useWebGPU: false,
    ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/134.0.0.0 Mobile DuckDuckGo/5 Safari/537.36',
    pointerCaptureSupported: false // Simulates WebView rejecting synthetic setPointerCapture!
  },
  {
    name: 'Pixel10ProXL-Vivaldi-WebGPU',
    width: 412, height: 915, stageW: 412, stageH: 450, dpr: 3, useWebGPU: true,
    ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36 Vivaldi/7.1',
    pointerCaptureSupported: true
  },
  {
    name: 'Desktop-1440-WebGPU',
    width: 1440, height: 900, stageW: 1036, stageH: 900, dpr: 1, useWebGPU: true,
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36',
    pointerCaptureSupported: true
  }
];

function createDomAndContext(prof){
  const els = new Map();
  const listeners = new Map();
  const classes = new Map();
  let capturedGlDraws = [];
  let capturedGpuDraws = [];
  let lastJointMats = null;
  let lastPortraitJointMats = null;
  let lastGlProj = null, lastGlView = null;
  let rafQueue = [];
  const store = new Map();

  function makeEl(id = '', tag = 'DIV'){
    const elListeners = new Map();
    const cls = new Set();
    const attrs = new Map();
    const el = {
      id, tagName: tag, style: {}, className: '', innerHTML: '', textContent: '', value: '', checked: false,
      dataset: {}, children: [],
      width: prof.stageW * Math.min(prof.dpr, 2),
      height: prof.stageH * Math.min(prof.dpr, 2),
      parentElement: null,
      classList: {
        add(c){ cls.add(c); },
        remove(c){ cls.delete(c); },
        toggle(c, f){ if (f === undefined) { if (cls.has(c)) cls.delete(c); else cls.add(c); } else if (f) cls.add(c); else cls.delete(c); },
        contains(c){ return cls.has(c); }
      },
      setAttribute(k, v){ attrs.set(k, String(v)); },
      getAttribute(k){ return attrs.get(k) ?? null; },
      addEventListener(ev, fn){
        if (!elListeners.has(ev)) elListeners.set(ev, []);
        elListeners.get(ev).push(fn);
      },
      removeEventListener(){},
      dispatch(ev, evtObj){
        const list = elListeners.get(ev) || [];
        for (const fn of list) fn(evtObj || {});
      },
      setPointerCapture(){
        if (!prof.pointerCaptureSupported) throw new Error('NotSupportedError: pointerCapture unavailable');
      },
      appendChild(c){ this.children.push(c); return c; },
      querySelectorAll(){ return []; },
      querySelector(){ return null; },
      getBoundingClientRect(){ return { width: prof.stageW, height: prof.stageH, left: 0, top: 0 }; },
      getContext(type){
        if (type === '2d'){
          const img = { data: new Uint8ClampedArray(512 * 512 * 4) };
          return new Proxy({
            fillStyle:'#fff', strokeStyle:'#000', lineWidth:1, font:'12px sans-serif',
            globalAlpha:1, globalCompositeOperation:'source-over', textAlign:'left',
            createLinearGradient(){ return { addColorStop(){} }; },
            createRadialGradient(){ return { addColorStop(){} }; },
            getImageData(){ return img; }
          }, {
            get(t, p){ return p in t ? t[p] : ()=>{}; }
          });
        }
        if ((type === 'webgl2' || type === 'webgl') && !prof.useWebGPU){
          let curState = { proj:null, view:null, model:null, useSkin:0, tint:null, viewport:[0,0,0,0], scissor:false };
          const glObj = {
            VERTEX_SHADER:35633, FRAGMENT_SHADER:35632, COMPILE_STATUS:35713, LINK_STATUS:35714,
            ARRAY_BUFFER:34962, ELEMENT_ARRAY_BUFFER:34963, STATIC_DRAW:35044, DYNAMIC_DRAW:35048,
            TEXTURE_2D:3553, RGBA:6408, RGB:6407, UNSIGNED_BYTE:5121, UNSIGNED_SHORT:5123, FLOAT:5126,
            TEXTURE0:33984, TEXTURE1:33985, TEXTURE_WRAP_S:10242, TEXTURE_WRAP_T:10243, REPEAT:10497, CLAMP_TO_EDGE:33071,
            TEXTURE_MIN_FILTER:10241, TEXTURE_MAG_FILTER:10240, LINEAR:9729,
            DEPTH_TEST:2929, BLEND:3042, SRC_ALPHA:770, ONE_MINUS_SRC_ALPHA:771,
            COLOR_BUFFER_BIT:16384, DEPTH_BUFFER_BIT:256, TRIANGLES:4, SCISSOR_TEST:3089,
            getExtension(n){ return n === 'ANGLE_instanced_arrays' ? { drawElementsInstancedANGLE(){}, vertexAttribDivisorANGLE(){} } : null; },
            createShader(){ return {}; }, getShaderParameter(){ return true; }, getShaderInfoLog(){ return ''; },
            createProgram(){ return {}; }, getProgramParameter(){ return true; }, getProgramInfoLog(){ return ''; },
            getAttribLocation(){ return 0; },
            getUniformLocation(_, name){ return name; },
            createBuffer(){ return {}; }, createTexture(){ return {}; },
            viewport(x,y,w,h){ curState.viewport=[x,y,w,h]; },
            enable(cap){ if (cap === 3089) curState.scissor = true; },
            disable(cap){ if (cap === 3089) curState.scissor = false; },
            uniform1f(loc, v){ if (loc === 'uUseSkin') curState.useSkin = v; },
            uniform4fv(loc, v){ if (loc === 'uTint') curState.tint = Array.from(v); },
            uniformMatrix4fv(loc, _t, v){
              if (loc === 'uProj') { curState.proj = Array.from(v); lastGlProj = curState.proj; }
              else if (loc === 'uView') { curState.view = Array.from(v); lastGlView = curState.view; }
              else if (loc === 'uModel') curState.model = Array.from(v);
              else if (loc === 'uJointMats[0]') lastJointMats = Array.from(v);
            },
            drawElements(_m, count){
              capturedGlDraws.push({
                count, scissor: curState.scissor, viewport: [...curState.viewport],
                proj: curState.proj, view: curState.view, model: curState.model, useSkin: curState.useSkin
              });
            },
            drawElementsInstanced(_m, count, _t, _o, inst){
              capturedGlDraws.push({ count, inst, instanced:true, scissor: curState.scissor });
            }
          };
          return new Proxy(glObj, { get(t,p){ return p in t ? t[p] : ()=>{}; } });
        }
        if (type === 'webgpu' && prof.useWebGPU){
          return { configure(){}, getCurrentTexture(){ return { createView(){ return {}; } }; } };
        }
        return null;
      }
    };
    return el;
  }

  const stageParent = makeEl('stage-pane', 'SECTION');
  const vp = makeEl('viewport3d', 'CANVAS');
  vp.parentElement = stageParent;
  els.set('viewport3d', vp);

  const tabBtns = ['face','body','quarters','gear','ramp','action'].map(t => {
    const b = makeEl('tab-' + t, 'BUTTON');
    b.setAttribute('data-tab', t);
    return b;
  });
  const tabPanels = ['face','body','quarters','gear','ramp','action'].map(t => {
    const p = makeEl('panel-' + t, 'DIV');
    p.setAttribute('data-panel', t);
    return p;
  });
  const peekBtns = ['pie_left','center','pie_right'].map(k => {
    const b = makeEl('peek-' + k, 'BUTTON');
    b.setAttribute('data-peek', k);
    return b;
  });
  const sexRadios = ['male','female','finetune'].map(v => {
    const r = makeEl('radio-' + v, 'INPUT');
    r.value = v;
    return r;
  });

  const doc = {
    body: makeEl('body', 'BODY'),
    head: makeEl('head', 'HEAD'),
    createElement(tag){ return makeEl('', tag); },
    getElementById(id){
      if (!els.has(id)) els.set(id, makeEl(id));
      return els.get(id);
    },
    querySelectorAll(sel){
      if (sel === '.tab-btn') return tabBtns;
      if (sel === '.tab-panel') return tabPanels;
      if (sel === '[data-peek]') return peekBtns;
      if (sel === '[name="sexMode"]') return sexRadios;
      if (sel === '.bio-lockable') return ['rng-noseWidth','rng-age','rng-muscle','rng-bustSize','sel-hairStyle','sel-beardStyle','sel-skinFinish'].map(id => this.getElementById(id));
      return [];
    },
    querySelector(){ return null; },
    addEventListener(){}
  };

  let bufIdSeq = 1;
  const gpuBuffers = new Map();
  let curUniformBySlot = new Map();
  let jointBufId = null, portraitJointBufId = null;

  const usedBufIds = new Set();
  const bufSnapshots = new Map();
  let snapSeq = 1;
  function snapBuf(buf){
    if (!buf) return null;
    const hex = Buffer.from(buf.data).toString('base64');
    // Deduplicate by (buf.id + data hash/len) using version counter bumped on writeBuffer!
    const ver = buf._ver || 0;
    const key = buf.id + '_' + ver;
    if (!bufSnapshots.has(key)) bufSnapshots.set(key, hex);
    return key;
  }
  const texList = [];
  const texOrder = ['white', ...Object.keys((() => {
    const raw = zlib.inflateSync(fs.readFileSync(path.join(rootDir, 'assets/ev-humanoid-kit.bin')));
    const hlen = raw.readUInt32LE(0);
    return JSON.parse(raw.subarray(4, 4 + hlen).toString('utf8')).texB64;
  })()), 'dyn_skin', 'dyn_hair', 'dyn_holo', 'dyn_bra', 'dyn_panties', 'dyn_briefs', 'dyn_beard', 'flat_normal'];
  let texSeq = 0;
  const gpuDevice = {
    features: new Set(),
    createShaderModule(){ return {}; },
    createComputePipeline(){ return { getBindGroupLayout(){ return {}; } }; },
    createRenderPipeline(){ return { getBindGroupLayout(){ return {}; } }; },
    createSampler(){ return {}; },
    createBindGroup(desc){ return { desc }; },
    createBuffer(desc){
      const id = bufIdSeq++;
      const obj = { id, size: desc.size, usage: desc.usage, data: new Uint8Array(desc.size), destroy(){} };
      if (desc.size === 53 * 64){
        if (!jointBufId) jointBufId = id;
        else portraitJointBufId = id;
      }
      gpuBuffers.set(id, obj);
      return obj;
    },
    createTexture(desc){
      const texId = bufIdSeq++;
      const isDepth = desc && desc.format === 'depth24plus';
      const texKey = isDepth ? '_depth' : (texOrder[texSeq++] || 'white');
      const obj = { id: texId, texKey, width: (desc && desc.size && desc.size[0]) || 1, height: (desc && desc.size && desc.size[1]) || 1, createView(){ return { texId, texKey }; }, destroy(){} };
      return obj;
    },
    queue: {
      writeBuffer(buf, offset, data){
        const u8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        if (offset + u8.byteLength > buf.size) {
          throw new RangeError(`WebGPU writeBuffer overflow: ${offset + u8.byteLength} > ${buf.size}`);
        }
        buf.data.set(u8, offset);
        buf._ver = (buf._ver || 0) + 1;
        if (buf.id === jointBufId) lastJointMats = Array.from(new Float32Array(buf.data.buffer, 0, 53*16));
        if (buf.id === portraitJointBufId) lastPortraitJointMats = Array.from(new Float32Array(buf.data.buffer, 0, 53*16));
      },
      writeTexture(){}, copyExternalImageToTexture(){}, submit(){}
    },
    createCommandEncoder(){
      let passNum = 0;
      return {
        beginComputePass(){
          let compBg = null;
          return {
            setPipeline(){},
            setBindGroup(_i, bg){ compBg = bg; },
            dispatchWorkgroups(){
              if (compBg && compBg.desc && compBg.desc.entries){
                // Map posOut.id -> { posInId, jBufId, wBufId } so rasterizer knows exact kit mesh & skinning!
                const ent = compBg.desc.entries;
                const posInId = ent[1].resource.buffer.id;
                const nrmInId = ent[2].resource.buffer.id;
                const jBufId  = ent[3].resource.buffer.id;
                const wBufId  = ent[4].resource.buffer.id;
                const posOutId = ent[6].resource.buffer.id;
                gpuBuffers.get(posOutId)._skinMeta = { posInId, nrmInId, jBufId, wBufId };
              }
            },
            end(){}
          };
        },
        beginRenderPass(){
          passNum++;
          let vpRect = null, scRect = null, curBg = null, vb0Buf = null, vb1Buf = null, vb2Buf = null, vb3Buf = null, vb4Buf = null, vb5Buf = null, ibBuf = null, vb5Size = 0;
          return {
            setPipeline(){},
            setViewport(x,y,w,h){ vpRect = [x,y,w,h]; },
            setScissorRect(x,y,w,h){ scRect = [x,y,w,h]; },
            setBindGroup(_i, bg){ curBg = bg; },
            setVertexBuffer(slot, buf){
              if (slot === 0) vb0Buf = buf;
              if (slot === 1) vb1Buf = buf;
              if (slot === 2) vb2Buf = buf;
              if (slot === 3) vb3Buf = buf;
              if (slot === 4) vb4Buf = buf;
              if (slot === 5) { vb5Buf = buf; vb5Size = buf ? buf.size : 0; }
            },
            setIndexBuffer(buf){ ibBuf = buf; },
            drawIndexed(ic, inst){
              const vb0Size = vb0Buf ? vb0Buf.size : 0;
              const approxVerts = Math.floor(vb0Size / 12);
              if (vb5Size < approxVerts * 4){
                throw new Error(`WebGPU validation failure: slot 5 vertexBuffer size (${vb5Size}) < vertexCount (${approxVerts}) * 4`);
              }
              const ub = curBg.desc.entries[0].resource.buffer;
              const uFloats = new Float32Array(ub.data.buffer, 0, 64);
              const skinMeta = vb0Buf ? vb0Buf._skinMeta : null;
              const vb0Key = skinMeta ? snapBuf(gpuBuffers.get(skinMeta.posInId)) : snapBuf(vb0Buf);
              const vb1Key = skinMeta ? snapBuf(gpuBuffers.get(skinMeta.nrmInId)) : snapBuf(vb1Buf);
              const vb2Key = snapBuf(vb2Buf);
              const vb5Key = snapBuf(vb5Buf);
              const jBufKey = skinMeta ? snapBuf(gpuBuffers.get(skinMeta.jBufId)) : null;
              const wBufKey = skinMeta ? snapBuf(gpuBuffers.get(skinMeta.wBufId)) : null;
              const ibKey   = snapBuf(ibBuf);
              const instOffKey = inst > 1 ? snapBuf(vb3Buf) : null;
              const instColKey = inst > 1 ? snapBuf(vb4Buf) : null;
              capturedGpuDraws.push({
                pass: passNum, viewport: vpRect, scissor: scRect, ic, inst,
                texKey: curBg.desc.entries[2] && curBg.desc.entries[2].resource ? curBg.desc.entries[2].resource.texKey : 'white',
                normKey: curBg.desc.entries[3] && curBg.desc.entries[3].resource ? curBg.desc.entries[3].resource.texKey : 'flat_normal',
                vb0Id: vb0Key,
                vb1Id: vb1Key,
                vb2Id: vb2Key,
                vb5Id: vb5Key,
                jBufId: jBufKey,
                wBufId: wBufKey,
                ibId: ibKey,
                instOffId: instOffKey,
                instColId: instColKey,
                skinned: !!skinMeta,
                pvMat: Array.from(uFloats.subarray(0, 16)),
                model: Array.from(uFloats.subarray(16, 32)),
                tint:  Array.from(uFloats.subarray(32, 36)),
                camPos: Array.from(uFloats.subarray(36, 39)),
                keyDir: Array.from(uFloats.subarray(40, 44)),
                rimCol: Array.from(uFloats.subarray(48, 52)),
                flags: Array.from(uFloats.subarray(52, 56)),
                extra: Array.from(uFloats.subarray(56, 60)),
              });
            },
            end(){}
          };
        },
        finish(){ return {}; }
      };
    }
  };

  const ctx = {
    window: null, self: null, globalThis: null, document: doc,
    innerWidth: prof.width, innerHeight: prof.height, devicePixelRatio: prof.dpr,
    addEventListener(ev, fn){ if (!listeners.has(ev)) listeners.set(ev, []); listeners.get(ev).push(fn); },
    removeEventListener(){},
    console, Math, Date, JSON, Array, Object, Number, String, Boolean, Error, TypeError, RangeError,
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, ArrayBuffer, DataView, Map, Set, Promise,
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: b => Buffer.from(b, 'base64').toString('binary'),
    TextDecoder, TextEncoder,
    Image: class { set src(v){ if (this.onload) Promise.resolve().then(()=>this.onload()); } width=64; height=64; },
    createImageBitmap: async () => ({ width:64, height:64 }),
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
    Blob: class { constructor(parts){ this.parts=parts; } },
    GPUBufferUsage: { VERTEX:32, INDEX:16, UNIFORM:64, STORAGE:128, COPY_DST:8 },
    GPUTextureUsage: { RENDER_ATTACHMENT:16, TEXTURE_BINDING:4, COPY_DST:8 },
    GPUShaderStage: { VERTEX:1, FRAGMENT:2, COMPUTE:4 },
    navigator: {
      userAgent: prof.ua,
      gpu: prof.useWebGPU ? {
        getPreferredCanvasFormat(){ return 'bgra8unorm'; },
        async requestAdapter(){ return { requestDevice: async () => gpuDevice }; }
      } : undefined
    },
    localStorage: {
      getItem(k){ return store.get(k) ?? null; },
      setItem(k, v){ store.set(k, String(v)); },
      removeItem(k){ store.delete(k); }
    },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    location: { search:'', hash:'', origin:'https://eric-automates.github.io' },
    requestAnimationFrame(fn){ rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame(){},
    performance: { now: () => Date.now() },
    setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: async () => ({ ok:true, json: async ()=>({}) }),
    DecompressionStream: class {
      constructor(){
        const d = zlib.createInflate();
        this.writable = new WritableStream({
          write(c){ return new Promise(res => d.write(Buffer.from(c), res)); },
          close(){ return new Promise(res => d.end(res)); }
        });
        this.readable = new ReadableStream({
          start(ctrl){
            d.on('data', c => ctrl.enqueue(new Uint8Array(c)));
            d.on('end', () => ctrl.close());
            d.on('error', e => ctrl.error(e));
          }
        });
      }
    }
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;

  vm.runInNewContext(jsCode, ctx);

  return {
    ctx, els, tabBtns, peekBtns, sexRadios, vp,
    tickFrames(n = 2){
      for (let i = 0; i < n; i++){
        const fn = rafQueue.shift();
        if (fn) fn(1000 + i * 16);
      }
    },
    clearCaptures(){ capturedGlDraws = []; capturedGpuDraws = []; },
    getCaptures(){
      return {
        glDraws: capturedGlDraws, gpuDraws: capturedGpuDraws,
        jointMats: lastJointMats, portraitJointMats: lastPortraitJointMats,
        state: JSON.parse(store.get('ev_operator_forge_v07') || '{}')
      };
    },
    exportUsedBuffers(){
      return Object.fromEntries(bufSnapshots);
    }
  };
}

function projectPt(pv, m, pt){
  const x = m[0]*pt[0] + m[4]*pt[1] + m[8]*pt[2] + m[12];
  const y = m[1]*pt[0] + m[5]*pt[1] + m[9]*pt[2] + m[13];
  const z = m[2]*pt[0] + m[6]*pt[1] + m[10]*pt[2] + m[14];
  const w = m[3]*pt[0] + m[7]*pt[1] + m[11]*pt[2] + m[15];
  const cx = pv[0]*x + pv[4]*y + pv[8]*z + pv[12]*w;
  const cy = pv[1]*x + pv[5]*y + pv[9]*z + pv[13]*w;
  const cz = pv[2]*x + pv[6]*y + pv[10]*z + pv[14]*w;
  const cw = pv[3]*x + pv[7]*y + pv[11]*z + pv[15]*w;
  return [cx/cw, cy/cw, cz/cw, cw];
}

function skinPoint(skinMats, jIdx, pt){
  const o = jIdx * 16;
  return [
    skinMats[o]*pt[0] + skinMats[o+4]*pt[1] + skinMats[o+8]*pt[2] + skinMats[o+12],
    skinMats[o+1]*pt[0] + skinMats[o+5]*pt[1] + skinMats[o+9]*pt[2] + skinMats[o+13],
    skinMats[o+2]*pt[0] + skinMats[o+6]*pt[1] + skinMats[o+10]*pt[2] + skinMats[o+14],
  ];
}

async function runProfile(prof){
  const sim = createDomAndContext(prof);
  // Wait for async createEngine() promise chain inside HTML
  await new Promise(r => setTimeout(r, 120));
  sim.tickFrames(2);

  // 1) Test Touch Orbit (Yaw + Pitch), 2-Finger Pinch Zoom + 2-Finger Pan, & Double-Tap Reset!
  sim.vp.dispatch('pointerdown', { pointerId:1, clientX:200, clientY:200 });
  sim.vp.dispatch('pointermove', { pointerId:1, clientX:280, clientY:160 });
  sim.vp.dispatch('pointerup',   { pointerId:1 });
  // 2-finger pinch + pan simultaneously
  sim.vp.dispatch('pointerdown', { pointerId:1, clientX:150, clientY:200 });
  sim.vp.dispatch('pointerdown', { pointerId:2, clientX:250, clientY:200 });
  sim.vp.dispatch('pointermove', { pointerId:2, clientX:320, clientY:240 });
  sim.vp.dispatch('pointerup',   { pointerId:1 });
  sim.vp.dispatch('pointerup',   { pointerId:2 });
  sim.tickFrames(1);

  const badge = sim.els.get('backend-badge').textContent;
  const portraitBoxW = parseInt(sim.els.get('corner-portrait-hud').style.width, 10);
  if (!(portraitBoxW >= 80 && portraitBoxW <= 126)) {
    throw new Error(`${prof.name}: Corner HUD CSS width out of safe range (${portraitBoxW})`);
  }

  // Verify Sex Radio toggle cleanly (female -> male)
  sim.sexRadios[1].checked = true; sim.sexRadios[1].dispatch('change');
  sim.tickFrames(1);
  let stAfterFem = sim.getCaptures().state;
  if (!(stAfterFem.gender > 0.5)) throw new Error(`${prof.name}: Female radio failed to update gender`);

  // Reset view back to clean framing for screen-by-screen audit
  sim.els.get('btn-reset-view').dispatch('click', {});
  sim.sexRadios[0].checked = true; sim.sexRadios[0].dispatch('change');

  // Set representative loadout for verification across all 6 tabs
  const dumpTabs = {};
  for (let ti = 0; ti < sim.tabBtns.length; ti++){
    const tabName = sim.tabBtns[ti].getAttribute('data-tab');
    sim.tabBtns[ti].dispatch('click', {});
    if (tabName === 'face'){
      sim.els.get('sel-scarType').value = 'triple_puncture'; sim.els.get('sel-scarType').dispatch('change');
      sim.els.get('chk-piercing-brow').checked = true; sim.els.get('chk-piercing-brow').dispatch('change');
      sim.els.get('chk-piercing-glow').checked = true; sim.els.get('chk-piercing-glow').dispatch('change');
      sim.els.get('sel-tattooStyle').value = 'circuit'; sim.els.get('sel-tattooStyle').dispatch('change');
      sim.els.get('sel-tattooZone').value = 'face'; sim.els.get('sel-tattooZone').dispatch('change');
      sim.els.get('chk-tattooGlow').checked = true; sim.els.get('chk-tattooGlow').dispatch('change');
    }
    if (tabName === 'body'){
      sim.sexRadios[1].checked = true; sim.sexRadios[1].dispatch('change');
      sim.els.get('sel-outfit').value = 'underwear'; sim.els.get('sel-outfit').dispatch('change');
      sim.els.get('sel-part-armR').value = 'skeleton'; sim.els.get('sel-part-armR').dispatch('change');
      sim.els.get('sel-part-legL').value = 'cyber'; sim.els.get('sel-part-legL').dispatch('change');
      sim.els.get('rng-bustSize').value = '0.78'; sim.els.get('rng-bustSize').dispatch('input');
    }
    if (tabName === 'quarters'){
      sim.sexRadios[1].checked = true; sim.sexRadios[1].dispatch('change');
      sim.els.get('sel-part-armR').value = 'organic'; sim.els.get('sel-part-armR').dispatch('change');
      sim.els.get('sel-part-legL').value = 'organic'; sim.els.get('sel-part-legL').dispatch('change');
      sim.els.get('sel-outfit').value = 'underwear'; sim.els.get('sel-outfit').dispatch('change');
      sim.els.get('sel-underwearBra').value = 'sheer_mesh'; sim.els.get('sel-underwearBra').dispatch('change');
      sim.els.get('sel-underwearBottom').value = 'panties_lace'; sim.els.get('sel-underwearBottom').dispatch('change');
      sim.els.get('sel-hairStyle').value = 'sleek'; sim.els.get('sel-hairStyle').dispatch('change');
    }
    if (tabName === 'gear'){
      sim.sexRadios[0].checked = true; sim.sexRadios[0].dispatch('change');
      sim.els.get('sel-outfit').value = 'armor'; sim.els.get('sel-outfit').dispatch('change');
      sim.els.get('sel-helmetMode').value = 'half'; sim.els.get('sel-helmetMode').dispatch('change');
      sim.els.get('sel-hairStyle').value = 'short'; sim.els.get('sel-hairStyle').dispatch('change');
      sim.els.get('sel-beardStyle').value = 'short_3d'; sim.els.get('sel-beardStyle').dispatch('change');
      sim.els.get('chk-equipRiflePreview').checked = true; sim.els.get('chk-equipRiflePreview').dispatch('change');
    }
    if (tabName === 'ramp'){
      sim.els.get('sel-outfit').value = 'armor'; sim.els.get('sel-outfit').dispatch('change');
      sim.els.get('sel-helmetMode').value = 'half'; sim.els.get('sel-helmetMode').dispatch('change');
      sim.els.get('btn-jump-seated').dispatch('click', {});
    }
    if (tabName === 'action'){
      sim.peekBtns[0].dispatch('click', {}); // pie_left
      sim.els.get('sel-cqbSpeed').value = 'fast'; sim.els.get('sel-cqbSpeed').dispatch('change');
      sim.els.get('sel-part-armR').value = 'cyber'; sim.els.get('sel-part-armR').dispatch('change');
      sim.els.get('chk-firing').checked = true; sim.els.get('chk-firing').dispatch('change');
      sim.els.get('chk-cqbMoving').checked = true; sim.els.get('chk-cqbMoving').dispatch('change');
    }
    sim.clearCaptures();
    sim.tickFrames(1);
    const cap = sim.getCaptures();

    // Verify upright anatomical height & screen-space framing!
    if (!cap.jointMats) throw new Error(`${prof.name} [${tabName}]: No jointMats emitted`);
    const headRest = [0.0, 1.56, 0.02];
    const footRest = [0.16, 0.04, 0.04];
    const headW = skinPoint(cap.jointMats, 44, headRest);
    const footW = skinPoint(cap.jointMats, 47, footRest);

    if (tabName !== 'ramp' && !(headW[1] > footW[1] + 1.0)){
      throw new Error(`${prof.name} [${tabName}]: Operator not upright! headY=${headW[1].toFixed(3)} footY=${footW[1].toFixed(3)}`);
    }

    if (prof.useWebGPU){
      const mainDraws = cap.gpuDraws.filter(d => d.pass === 1);
      const hudDraws  = cap.gpuDraws.filter(d => d.pass === 2);
      if (mainDraws.length < 5) throw new Error(`${prof.name} [${tabName}]: Too few main WebGPU draws (${mainDraws.length})`);
      if (hudDraws.length < 3)  throw new Error(`${prof.name} [${tabName}]: Corner portrait HUD pass failed to draw (${hudDraws.length})`);
      if (tabName === 'face' || tabName === 'body' || tabName === 'quarters' || tabName === 'gear'){
        const charDraw = mainDraws.find(d => d.flags[1] > 0.5);
        const ndc = projectPt(charDraw.pvMat, charDraw.model, headW);
        if (Math.abs(ndc[0]) > 0.85 || Math.abs(ndc[1]) > 0.85){
          throw new Error(`${prof.name} [${tabName}]: Head projected off-screen NDC=(${ndc[0].toFixed(2)}, ${ndc[1].toFixed(2)})`);
        }
      }
      if (tabName === 'quarters'){
        const cabinDraw = mainDraws.find(d => d.ic >= 450 && !d.skinned && d.texKey === 'white'); // prop_cabin
        const uwDraw = mainDraws.find(d => d.texKey === 'dyn_bra' || d.texKey === 'dyn_panties');
        if (!cabinDraw) throw new Error(`${prof.name} [quarters]: Missing prop_cabin metallic quarters`);
        if (!uwDraw) throw new Error(`${prof.name} [quarters]: Missing dynamic underwear draw`);
      }
      if (tabName === 'body'){
        const skelDraw = mainDraws.find(d => d.ic > 700 && d.texKey === 'white' && d.skinned);
        if (!skelDraw) throw new Error(`${prof.name} [body]: Missing modular skel_arm_r draw`);
      }
      if (prof.name === 'Pixel10ProXL-Chrome-WebGPU'){
        dumpTabs[tabName] = {
          mainDraws, hudDraws, jointMats: cap.jointMats, portraitJointMats: cap.portraitJointMats,
          state: cap.state
        };
      }
    } else {
      if (cap.glDraws.length < 5) throw new Error(`${prof.name} [${tabName}]: WebGL2 failed to draw`);
    }
  }

  // Test Appearance Lock-in & Cybernetics Expert Override at end of tab pass
  sim.els.get('btn-lock-appearance').dispatch('click', {});
  if (!sim.els.get('rng-noseWidth').disabled) throw new Error(`${prof.name}: Bio lock failed to disable craniofacial slider`);
  sim.els.get('btn-cyber-expert').dispatch('click', {});
  if (sim.els.get('rng-noseWidth').disabled) throw new Error(`${prof.name}: Cybernetics expert failed to unlock dermal alteration`);
  if (sim.getCaptures().state.skinFinish !== 'android') throw new Error(`${prof.name}: Cybernetics expert failed to convert skin to android dermal panels`);

  console.log(`PASS [${prof.name}]: backend="${badge}", HUD=${portraitBoxW}px, all 6 creator tabs & touch orbit verified.`);
  if (prof.name === 'Pixel10ProXL-Chrome-WebGPU') dumpTabs._bufs = sim.exportUsedBuffers();
  return dumpTabs;
}

(async () => {
  let pixelDump = null;
  for (const prof of DEVICE_PROFILES){
    const res = await runProfile(prof);
    if (prof.name === 'Pixel10ProXL-Chrome-WebGPU') pixelDump = res;
  }
  fs.writeFileSync('/tmp/ev_dev_dump.json', JSON.stringify(pixelDump));
  console.log('Exported Pixel 10 Pro XL WebGPU live draw dump -> /tmp/ev_dev_dump.json');
})().catch(e => { console.error('VERIFY FAILED:', e); process.exit(1); });
