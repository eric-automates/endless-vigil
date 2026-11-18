#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id FORGE-ASSEMBLER
 * @state-contract reads(js/ev-humanoid-kit.js, js/ev-gpu-engine.js) mutates(operator-forge.html)
 * @invariant Emits single-<script> zero-CDN operator-forge.html synchronized with CC0 kit + dual WebGPU/WebGL2 engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const kitJs = fs.readFileSync(path.join(rootDir, 'js', 'ev-humanoid-kit.js'), 'utf8');
const engineJs = fs.readFileSync(path.join(rootDir, 'js', 'ev-gpu-engine.js'), 'utf8');

if (/<\/?script/i.test(kitJs) || /<\/?script/i.test(engineJs)) {
  throw new Error('Embedded JS contains forbidden script tag literal');
}

const uiControllerJs = `
(function(){
  'use strict';

  var STORAGE_KEY = 'ev_operator_forge_v06';
  var DEFAULT_STATE = {
    callsign: 'VIGIL-01',
    tab: 'face',
    gender: -0.65,
    age: 0.18,
    muscle: 0.62,
    weight: 0.45,
    height: 0.54,
    skinHex: '#cf9170',
    eyeHex: '#3aa7d6',
    hairHex: '#2a1f1a',
    suitTint: '#4d5d54',
    noseWidth: 0.0,
    noseLength: 0.05,
    noseHeight: 0.05,
    jawWidth: 0.18,
    chinSize: 0.12,
    cheekbones: 0.10,
    eyeSize: 0.0,
    eyeSpacing: 0.0,
    eyeTilt: 0.05,
    lipSize: 0.0,
    mouthWidth: 0.0,
    earSize: 0.0,
    forehead: 0.0,
    expression: 'neutral',
    blink: 0.0,
    beardStyle: 'stubble',
    scars: 0.45,
    scarPos: { x: 0.34, y: 0.42, enabled: true },
    cyberFace: 0.25,
    cyberArm: false,
    outfit: 'jacket',
    wristDevice: 'watch',
    helmetMode: 'none',
    hairStyle: 'short',
    grayStreak: { enabled: true, x: 0.34, y: 0.44, angle: 0.42, width: 0.18 },
    equipRiflePreview: false,
    missionAccepted: true,
    shipSeed: 1,
    turntableYaw: 0.18,
    camPitch: 0.0,
    camZoom: 1.0,
    stageOrbitYaw: 0.0,
    rampTimer: 4.0,
    peek: 'center',
    strideYaw: 0.22,
    aimYaw: -0.18,
    cqbMoving: false,
    firing: false,
    suppressed: false,
    veteran: true,
    crowd25: true,
    showCornerPortrait: true
  };

  function loadSavedState(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_STATE);
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_STATE, parsed);
    } catch (_e){ return Object.assign({}, DEFAULT_STATE); }
  }

  var state = loadSavedState();
  function persistLocal(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_e){}
  }

  // Color Palettes
  var SKIN_SWATCHES = ['#f2cbb8','#dfb197','#cf9170','#b67552','#8d5538','#5e3824'];
  var EYE_SWATCHES  = ['#3aa7d6','#44b89a','#c89b3c','#7a6652','#92a6b8','#ff6a33'];
  var HAIR_SWATCHES = ['#1a1614','#2a1f1a','#4e3424','#8c5230','#c49a52','#aeb7be'];
  var SUIT_SWATCHES = ['#4d5d54','#2c3b47','#3a3f47','#5e4a38','#6e2b2b','#222830'];

  var canvas = document.getElementById('viewport3d');
  var portraitHud = document.getElementById('corner-portrait-hud');
  var portraitTag = document.getElementById('portrait-mode-tag');
  var fadeOverlay = document.getElementById('cinema-fade');
  var telemetryEl = document.getElementById('hud-telemetry');
  var backendBadge = document.getElementById('backend-badge');
  var d1StatusEl = document.getElementById('d1-save-status');

  function syncCanvasSize(){
    var parent = canvas.parentElement;
    if (!parent) return;
    var rect = parent.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.max(300, Math.round(rect.width * dpr));
    var ph = Math.max(240, Math.round(rect.height * dpr));
    if (canvas.width !== pw || canvas.height !== ph){
      canvas.width = pw;
      canvas.height = ph;
    }
    var cssBox = Math.max(88, Math.min(126, Math.round(rect.width * 0.24)));
    var cssOff = 12;
    state.portraitBoxPx = Math.round(cssBox * dpr);
    state.portraitOffPx = Math.round(cssOff * dpr);
    portraitHud.style.width = cssBox + 'px';
    portraitHud.style.height = cssBox + 'px';
    portraitHud.style.left = cssOff + 'px';
    portraitHud.style.bottom = cssOff + 'px';
  }
  window.addEventListener('resize', syncCanvasSize);

  // Tab switching
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var tabPanels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
  function setTab(t){
    state.tab = t;
    tabBtns.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === t); });
    tabPanels.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-panel') === t); });
    if (t === 'ramp' && state.rampTimer >= 4.0) state.rampTimer = 4.0;
    persistLocal();
  }
  tabBtns.forEach(function(b){
    b.addEventListener('click', function(){ setTab(b.getAttribute('data-tab')); });
  });

  // Bind inputs cleanly
  function bindRange(id, prop, valId){
    var el = document.getElementById(id);
    var vEl = valId ? document.getElementById(valId) : null;
    if (!el) return;
    el.value = state[prop];
    if (vEl) vEl.textContent = Number(state[prop]).toFixed(2);
    el.addEventListener('input', function(){
      state[prop] = parseFloat(el.value);
      if (vEl) vEl.textContent = Number(state[prop]).toFixed(2);
      persistLocal();
    });
  }
  function bindSelect(id, prop){
    var el = document.getElementById(id);
    if (!el) return;
    el.value = state[prop];
    el.addEventListener('change', function(){ state[prop] = el.value; persistLocal(); });
  }
  function bindCheck(id, prop){
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = !!state[prop];
    el.addEventListener('change', function(){ state[prop] = el.checked; persistLocal(); });
  }
  function buildSwatches(containerId, list, prop){
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = '';
    list.forEach(function(hex){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (state[prop] === hex ? ' active' : '');
      b.style.background = hex;
      b.setAttribute('aria-label', hex);
      b.addEventListener('click', function(){
        state[prop] = hex;
        Array.prototype.forEach.call(wrap.children, function(c){ c.classList.remove('active'); });
        b.classList.add('active');
        persistLocal();
      });
      wrap.appendChild(b);
    });
  }

  function setup2DPad(padId, dotId, getObj, onUpdate){
    var pad = document.getElementById(padId);
    var dot = document.getElementById(dotId);
    if (!pad || !dot) return;
    function syncDot(){
      var o = getObj();
      dot.style.left = Math.round(o.x * 100) + '%';
      dot.style.top  = Math.round(o.y * 100) + '%';
    }
    syncDot();
    var dragging = false;
    function applyEvt(e){
      var r = pad.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      var nx = Math.max(0.05, Math.min(0.95, cx / Math.max(1, r.width)));
      var ny = Math.max(0.05, Math.min(0.95, cy / Math.max(1, r.height)));
      onUpdate(nx, ny);
      syncDot();
      persistLocal();
    }
    pad.addEventListener('pointerdown', function(e){ dragging = true; pad.setPointerCapture(e.pointerId); applyEvt(e); });
    pad.addEventListener('pointermove', function(e){ if (dragging) applyEvt(e); });
    pad.addEventListener('pointerup', function(){ dragging = false; });
    pad.addEventListener('pointercancel', function(){ dragging = false; });
  }

  function refreshAllControlValues(){
    ['gender','age','muscle','weight','height','noseWidth','noseLength','noseHeight','jawWidth','chinSize','cheekbones','eyeSize','eyeSpacing','eyeTilt','lipSize','mouthWidth','earSize','forehead','scars','cyberFace','strideYaw','aimYaw'].forEach(function(k){
      var el = document.getElementById('rng-' + k);
      var vEl = document.getElementById('val-' + k);
      if (el){ el.value = state[k]; if (vEl) vEl.textContent = Number(state[k]).toFixed(2); }
    });
    ['expression','beardStyle','outfit','wristDevice','helmetMode','hairStyle'].forEach(function(k){
      var el = document.getElementById('sel-' + k);
      if (el) el.value = state[k];
    });
    ['cyberArm','equipRiflePreview','cqbMoving','firing','suppressed','veteran','crowd25'].forEach(function(k){
      var el = document.getElementById('chk-' + k);
      if (el) el.checked = !!state[k];
    });
    var cs = document.getElementById('inp-callsign');
    if (cs) cs.value = state.callsign || 'VIGIL-01';
    var gsChk = document.getElementById('chk-grayStreak');
    if (gsChk) gsChk.checked = !!(state.grayStreak && state.grayStreak.enabled);
    var gsAng = document.getElementById('rng-streakAngle');
    if (gsAng) gsAng.value = (state.grayStreak && state.grayStreak.angle) || 0.42;
    var gsWid = document.getElementById('rng-streakWidth');
    if (gsWid) gsWid.value = (state.grayStreak && state.grayStreak.width) || 0.18;
    buildSwatches('sw-skin', SKIN_SWATCHES, 'skinHex');
    buildSwatches('sw-eye',  EYE_SWATCHES,  'eyeHex');
    buildSwatches('sw-hair', HAIR_SWATCHES, 'hairHex');
    buildSwatches('sw-suit', SUIT_SWATCHES, 'suitTint');
  }

  // Bind all UI controls
  [
    'gender','age','muscle','weight','height','noseWidth','noseLength','noseHeight',
    'jawWidth','chinSize','cheekbones','eyeSize','eyeSpacing','eyeTilt','lipSize',
    'mouthWidth','earSize','forehead','scars','cyberFace','strideYaw','aimYaw'
  ].forEach(function(k){ bindRange('rng-' + k, k, 'val-' + k); });

  ['expression','beardStyle','outfit','wristDevice','helmetMode','hairStyle'].forEach(function(k){
    bindSelect('sel-' + k, k);
  });
  ['cyberArm','equipRiflePreview','cqbMoving','firing','suppressed','veteran','crowd25'].forEach(function(k){
    bindCheck('chk-' + k, k);
  });

  var callsignInp = document.getElementById('inp-callsign');
  if (callsignInp){
    callsignInp.value = state.callsign;
    callsignInp.addEventListener('input', function(){ state.callsign = callsignInp.value.toUpperCase() || 'VIGIL-01'; persistLocal(); });
  }

  buildSwatches('sw-skin', SKIN_SWATCHES, 'skinHex');
  buildSwatches('sw-eye',  EYE_SWATCHES,  'eyeHex');
  buildSwatches('sw-hair', HAIR_SWATCHES, 'hairHex');
  buildSwatches('sw-suit', SUIT_SWATCHES, 'suitTint');

  setup2DPad('pad-scar', 'dot-scar', function(){ return state.scarPos || {x:0.5,y:0.5}; }, function(x, y){
    state.scarPos = { x: x, y: y, enabled: true };
  });
  setup2DPad('pad-streak', 'dot-streak', function(){ return state.grayStreak || {x:0.35,y:0.45}; }, function(x, y){
    state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: true, x: x, y: y });
    var c = document.getElementById('chk-grayStreak'); if (c) c.checked = true;
  });

  var gsCheck = document.getElementById('chk-grayStreak');
  if (gsCheck){
    gsCheck.checked = !!(state.grayStreak && state.grayStreak.enabled);
    gsCheck.addEventListener('change', function(){
      state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: gsCheck.checked });
      persistLocal();
    });
  }
  var gsAngle = document.getElementById('rng-streakAngle');
  if (gsAngle){
    gsAngle.value = (state.grayStreak && state.grayStreak.angle) || 0.42;
    gsAngle.addEventListener('input', function(){
      state.grayStreak = Object.assign({}, state.grayStreak || {}, { angle: parseFloat(gsAngle.value) });
      persistLocal();
    });
  }
  var gsWidth = document.getElementById('rng-streakWidth');
  if (gsWidth){
    gsWidth.value = (state.grayStreak && state.grayStreak.width) || 0.18;
    gsWidth.addEventListener('input', function(){
      state.grayStreak = Object.assign({}, state.grayStreak || {}, { width: parseFloat(gsWidth.value) });
      persistLocal();
    });
  }

  // Presets & Randomizer
  var PRESETS = {
    vanguard: { gender:-0.85, muscle:0.80, weight:0.50, height:0.65, outfit:'armor',  helmetMode:'half',   hairStyle:'short',  beardStyle:'stubble', cyberArm:false, suitTint:'#4d5d54' },
    recon:    { gender: 0.85, muscle:0.45, weight:0.32, height:0.48, outfit:'jacket', helmetMode:'open',   hairStyle:'braids', beardStyle:'clean',   cyberArm:true,  suitTint:'#2c3b47' },
    heavy:    { gender:-0.95, muscle:0.95, weight:0.75, height:0.82, outfit:'armor',  helmetMode:'sealed', hairStyle:'buzz',   beardStyle:'full',    cyberArm:true,  suitTint:'#5e4a38' },
    medic:    { gender: 0.65, muscle:0.35, weight:0.40, height:0.45, outfit:'hoodie', helmetMode:'none',   hairStyle:'sleek',  beardStyle:'clean',   cyberArm:false, suitTint:'#3a3f47' }
  };
  Array.prototype.slice.call(document.querySelectorAll('[data-preset]')).forEach(function(btn){
    btn.addEventListener('click', function(){
      var p = PRESETS[btn.getAttribute('data-preset')];
      if (!p) return;
      Object.assign(state, p);
      refreshAllControlValues();
      persistLocal();
    });
  });

  var randBtn = document.getElementById('btn-randomize');
  if (randBtn){
    randBtn.addEventListener('click', function(){
      var r = function(a,b){ return a + Math.random()*(b-a); };
      state.gender = r(-1, 1);
      state.muscle = r(0.25, 0.9);
      state.weight = r(0.25, 0.7);
      state.height = r(0.2, 0.85);
      state.noseWidth = r(-0.6, 0.6); state.jawWidth = r(-0.6, 0.6); state.cheekbones = r(-0.5, 0.6);
      state.skinHex = SKIN_SWATCHES[Math.floor(Math.random()*SKIN_SWATCHES.length)];
      state.eyeHex  = EYE_SWATCHES[Math.floor(Math.random()*EYE_SWATCHES.length)];
      state.hairHex = HAIR_SWATCHES[Math.floor(Math.random()*HAIR_SWATCHES.length)];
      state.suitTint = SUIT_SWATCHES[Math.floor(Math.random()*SUIT_SWATCHES.length)];
      state.hairStyle = ['short','sleek','braids','buzz'][Math.floor(Math.random()*4)];
      state.beardStyle = state.gender > 0.1 ? 'clean' : ['clean','stubble','goatee','full'][Math.floor(Math.random()*4)];
      state.outfit = ['jacket','hoodie','tee','armor'][Math.floor(Math.random()*4)];
      state.helmetMode = ['none','open','half','sealed'][Math.floor(Math.random()*4)];
      state.cyberArm = Math.random() > 0.5;
      refreshAllControlValues();
      persistLocal();
    });
  }

  // Ramp & Action buttons
  var btnReplay = document.getElementById('btn-replay-ramp');
  if (btnReplay) btnReplay.addEventListener('click', function(){ state.rampTimer = 0.0; setTab('ramp'); });
  var btnSeated = document.getElementById('btn-jump-seated');
  if (btnSeated) btnSeated.addEventListener('click', function(){ state.rampTimer = 4.0; setTab('ramp'); });
  var btnAccept = document.getElementById('btn-mission-accept');
  if (btnAccept) btnAccept.addEventListener('click', function(){ state.missionAccepted = true; persistLocal(); });
  var btnDecline = document.getElementById('btn-mission-decline');
  if (btnDecline) btnDecline.addEventListener('click', function(){ state.missionAccepted = false; persistLocal(); });
  var btnShipSeed = document.getElementById('btn-ship-seed');
  if (btnShipSeed) btnShipSeed.addEventListener('click', function(){ state.shipSeed = (state.shipSeed + 1) % 4; persistLocal(); });

  Array.prototype.slice.call(document.querySelectorAll('[data-peek]')).forEach(function(b){
    b.addEventListener('click', function(){
      state.peek = b.getAttribute('data-peek');
      Array.prototype.slice.call(document.querySelectorAll('[data-peek]')).forEach(function(x){ x.classList.toggle('active', x === b); });
      persistLocal();
    });
  });

  // D1 Authority Save (with graceful offline fallback)
  var btnSaveD1 = document.getElementById('btn-save-d1');
  if (btnSaveD1){
    btnSaveD1.addEventListener('click', async function(){
      persistLocal();
      d1StatusEl.textContent = 'SYNCING TO AUTHORITY D1...';
      try {
        var token = localStorage.getItem('ev_session_token') || '';
        var resp = await fetch('https://ev-authority.ericautomates.workers.dev/api/v06/avatar/save', {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': 'Bearer ' + token } : {}),
          body: JSON.stringify({ callsign: state.callsign, avatar: state })
        });
        if (resp.ok){
          d1StatusEl.textContent = 'COMMITTED TO D1 AUTHORITY // LOCKED';
        } else {
          d1StatusEl.textContent = 'LOCAL CACHE SAVED (AUTH REQUIRED FOR REMOTE D1: HTTP ' + resp.status + ')';
        }
      } catch (_err){
        d1StatusEl.textContent = 'LOCAL CACHE SAVED (OFFLINE SANDBOX)';
      }
    });
  }

  // Interactive Orbit (Yaw + Pitch), Pinch/Wheel Zoom & Double-Tap Reset across all browsers!
  var activePts = new Map();
  var lastPinchDist = 0, lastTapMs = 0;
  function applyOrbitDelta(dx, dy){
    if (state.tab === 'action'){
      state.aimYaw = Math.max(-1.4, Math.min(1.4, (state.aimYaw || 0) + dx * 0.008));
      var ay = document.getElementById('rng-aimYaw'); if (ay) ay.value = state.aimYaw;
    } else if (state.tab === 'ramp'){
      state.stageOrbitYaw = (state.stageOrbitYaw || 0) + dx * 0.009;
    } else {
      state.turntableYaw = (state.turntableYaw || 0) + dx * 0.01;
    }
    state.camPitch = Math.max(-0.42, Math.min(0.55, (state.camPitch || 0) + dy * 0.005));
  }
  function resetView(){
    state.turntableYaw = 0.18; state.camPitch = 0.0; state.camZoom = 1.0; state.stageOrbitYaw = 0.0;
    persistLocal();
  }
  var btnResetView = document.getElementById('btn-reset-view');
  if (btnResetView) btnResetView.addEventListener('click', resetView);

  canvas.addEventListener('pointerdown', function(e){
    if (e.preventDefault) e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_err){}
    activePts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePts.size === 1){
      var nowMs = Date.now();
      if (nowMs - lastTapMs < 280) resetView();
      lastTapMs = nowMs;
    } else if (activePts.size === 2){
      var pts = Array.from(activePts.values());
      lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  });
  canvas.addEventListener('pointermove', function(e){
    if (!activePts.has(e.pointerId)) return;
    if (e.preventDefault) e.preventDefault();
    var prev = activePts.get(e.pointerId);
    var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    activePts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePts.size === 1){
      applyOrbitDelta(dx, dy);
    } else if (activePts.size >= 2){
      var pts = Array.from(activePts.values());
      var nd = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist > 4 && nd > 4){
        state.camZoom = Math.max(0.62, Math.min(1.65, (state.camZoom || 1.0) * (lastPinchDist / nd)));
      }
      lastPinchDist = nd;
    }
  });
  function endPtr(e){ activePts.delete(e.pointerId); if (activePts.size < 2) lastPinchDist = 0; }
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', function(e){
    if (e.preventDefault) e.preventDefault();
    state.camZoom = Math.max(0.62, Math.min(1.65, (state.camZoom || 1.0) + (e.deltaY > 0 ? 0.08 : -0.08)));
  }, { passive: false });

  // Boot Dual WebGPU / WebGL2 Engine
  setTab(state.tab || 'face');
  syncCanvasSize();
  EVGPUEngine.createEngine(canvas, window.EV_HUMANOID_KIT_PACK).then(function(engine){
    var b = engine.backend.toUpperCase();
    backendBadge.textContent = b === 'WEBGPU' ? 'WEBGPU COMPUTE SKINNING' : (b === 'WEBGL2' ? 'WEBGL2 INSTANCED PBR' : 'WEBGL1 FALLBACK PBR');
    backendBadge.classList.toggle('is-webgpu', b === 'WEBGPU');

    var lastTs = performance.now(), startTs = lastTs;
    function tick(now){
      var dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      var totalSec = (now - startTs) / 1000;
      if (state.tab === 'ramp' && state.rampTimer < 4.5) state.rampTimer += dt;
      syncCanvasSize();
      var tel = engine.renderFrame(state, dt, totalSec);

      // Sync Corner Portrait HUD label to Helmet Mode
      var hm = state.helmetMode || 'none';
      portraitTag.textContent = hm === 'sealed' ? 'SEALED VISOR' : (hm === 'half' ? 'HALF-VISOR' : (hm === 'open' ? 'OPEN VISOR' : 'UNMASKED'));

      // Cinema Fade Overlay for Ramp Transition
      fadeOverlay.style.opacity = tel.fadeAlpha ? tel.fadeAlpha.toFixed(3) : '0';

      telemetryEl.textContent =
        tel.fps + ' FPS | ' + tel.drawCalls + ' DRAWS | ' + tel.tris.toLocaleString() + ' TRIS | ' +
        'LOD0:' + Math.round(tel.lod0Tris) + ' LOD1:' + Math.round(tel.lod1Tris) + ' LOD2:' + Math.round(tel.lod2Tris) +
        (tel.lodStats.lod2 > 0 ? (' | INST:' + tel.lodStats.lod2) : '');

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }).catch(function(err){
    backendBadge.textContent = 'ENGINE INIT ERROR';
    telemetryEl.textContent = String(err && err.message || err);
  });
})();
`;

const htmlTop = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Endless Vigil // Operator Forge &amp; Tactical Stage</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; max-width: 100vw; overflow-x: hidden;
    background: #070a0d; color: #dbe7f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; line-height: 1.4;
  }
  .forge-shell {
    display: flex; flex-direction: column; min-height: 100vh; width: 100%;
  }
  .stage-pane {
    position: relative; width: 100%; height: min(56vh, 480px);
    background: radial-gradient(circle at 50% 35%, #0d161f 0%, #070a0d 80%);
    overflow: hidden;
  }
  .control-pane {
    width: 100%; flex: 1 1 auto; background: #0a0f14;
    border-top: 1px solid #162533; display: flex; flex-direction: column;
  }
  @media (min-width: 920px) {
    .forge-shell { flex-direction: row; height: 100vh; overflow: hidden; }
    .stage-pane { flex: 1 1 0; height: 100%; min-width: 0; }
    .control-pane {
      width: min(100%, 404px); flex: 0 0 auto; height: 100%;
      border-top: none; border-left: 1px solid #162533;
    }
  }
  #viewport3d {
    display: block; width: 100%; height: 100%; touch-action: none; cursor: grab;
  }
  #viewport3d:active { cursor: grabbing; }
  .stage-topbar {
    position: absolute; top: 10px; left: 10px; right: 10px;
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start;
    gap: 8px; pointer-events: none; z-index: 4;
  }
  .hud-pill {
    pointer-events: auto; background: rgba(7, 11, 15, 0.84);
    border: 1px solid #1c3142; padding: 5px 9px; border-radius: 4px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  }
  .hud-nav a {
    color: #82a2ba; text-decoration: none; font-size: 11px; padding: 2px 5px;
    border-radius: 3px; border: 1px solid transparent;
  }
  .hud-nav a:hover { color: #00e5ff; border-color: #16384a; }
  .backend-tag {
    font-weight: 700; font-size: 10px; letter-spacing: 0.06em;
    padding: 2px 6px; border-radius: 3px; background: #142534; color: #f59e0b;
    border: 1px solid #3c2e16;
  }
  .backend-tag.is-webgpu { color: #00e5ff; border-color: #0b4f5e; background: #07222b; }
  .telemetry-line { font-size: 10px; color: #9db7ca; }

  #corner-portrait-hud {
    position: absolute; left: 12px; bottom: 12px; width: 108px; height: 108px;
    border: 1.5px solid #00e5ff; box-shadow: 0 0 18px rgba(0, 229, 255, 0.22);
    border-radius: 4px; pointer-events: none; z-index: 4; overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .portrait-hdr {
    background: rgba(5, 11, 16, 0.86); color: #00e5ff; font-size: 8.5px; font-weight: 700;
    padding: 2px 4px; letter-spacing: 0.04em; border-bottom: 1px solid rgba(0,229,255,0.28);
    display: flex; justify-content: space-between; gap: 4px; white-space: nowrap; overflow: hidden;
  }
  .portrait-ftr {
    background: rgba(5, 11, 16, 0.86); color: #cbe6f5; font-size: 8px;
    padding: 2px 4px; border-top: 1px solid rgba(0,229,255,0.22);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  #cinema-fade {
    position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none;
    z-index: 6; display: flex; align-items: center; justify-content: center;
    color: #00e5ff; letter-spacing: 0.2em; font-size: 11px;
  }

  .tab-bar {
    display: flex; flex-wrap: wrap; border-bottom: 1px solid #162533; background: #070b0f;
  }
  .tab-btn {
    flex: 1 1 33%; padding: 9px 6px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #7e98ac; cursor: pointer;
    font-family: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  }
  .tab-btn:hover { color: #dbe7f0; }
  .tab-btn.active { color: #00e5ff; border-bottom-color: #00e5ff; background: #0d161e; }

  .panel-scroll { flex: 1 1 auto; overflow-y: auto; padding: 12px; }
  .tab-panel { display: none; flex-direction: column; gap: 11px; }
  .tab-panel.active { display: flex; }

  .sec-card {
    background: #0d141b; border: 1px solid #182736; border-radius: 5px; padding: 10px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .sec-title {
    font-size: 10px; font-weight: 700; color: #f59e0b; letter-spacing: 0.08em;
    text-transform: uppercase; border-bottom: 1px solid #172634; padding-bottom: 4px;
  }
  .ctrl-row { display: flex; flex-direction: column; gap: 3px; }
  .ctrl-lbl { display: flex; justify-content: space-between; font-size: 11px; color: #b7cad9; }
  input[type="range"] { width: 100%; accent-color: #00e5ff; margin: 0; }
  select, input[type="text"] {
    width: 100%; background: #070b0f; color: #dbe7f0; border: 1px solid #203344;
    padding: 6px 8px; border-radius: 4px; font-family: inherit; font-size: 11px;
  }
  .btn-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .ev-btn {
    flex: 1 1 auto; background: #10202e; color: #d6ecf7; border: 1px solid #1f3c52;
    padding: 7px 9px; border-radius: 4px; cursor: pointer; font-family: inherit;
    font-size: 11px; font-weight: 700; text-align: center;
  }
  .ev-btn:hover { border-color: #00e5ff; color: #00e5ff; }
  .ev-btn.active { background: #0a3444; border-color: #00e5ff; color: #00e5ff; }
  .ev-btn.warn { border-color: #6b3b18; color: #fbbf24; }
  .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .swatch {
    width: 24px; height: 24px; border-radius: 4px; border: 2px solid #1c2c3a; cursor: pointer;
  }
  .swatch.active { border-color: #00e5ff; box-shadow: 0 0 8px rgba(0,229,255,0.6); }
  .chk-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #c7d9e6; cursor: pointer; }
  .pad-2d {
    position: relative; width: 100%; height: 92px; border-radius: 4px;
    background: linear-gradient(135deg, #0b141c 0%, #12212e 100%);
    border: 1px solid #1f374b; cursor: crosshair; touch-action: none;
  }
  .pad-dot {
    position: absolute; width: 12px; height: 12px; border-radius: 50%;
    background: #00e5ff; border: 2px solid #fff; transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .status-msg { font-size: 10px; color: #7dc4d9; min-height: 14px; }
</style>
</head>
<body>
<div class="forge-shell">
  <section class="stage-pane">
    <canvas id="viewport3d"></canvas>
    <div class="stage-topbar">
      <div class="hud-pill hud-nav">
        <strong style="color:#00e5ff;">ENDLESS VIGIL // FORGE</strong>
        <a href="index.html">Hub</a>
        <a href="temporal-lab.html">Temporal Lab</a>
        <a href="cuff-slate.html">Cuff Slate</a>
        <a href="conglomerate-flowchart.html">Conglomerate</a>
        <a href="continuum-monitor.html">Continuum</a>
      </div>
      <div class="hud-pill">
        <span id="backend-badge" class="backend-tag">INITIALIZING GPU...</span>
        <span id="hud-telemetry" class="telemetry-line">Loading CC0 asset kit...</span>
        <button type="button" id="btn-reset-view" class="ev-btn" style="padding:2px 6px;font-size:10px;flex:0 0 auto;">Reset Cam</button>
      </div>
    </div>

    <div id="corner-portrait-hud">
      <div class="portrait-hdr"><span>LIVE ID</span><span id="portrait-mode-tag">UNMASKED</span></div>
      <div class="portrait-ftr">VITALS: 100% // RIG ONLINE</div>
    </div>

    <div id="cinema-fade">TRANSIT TO EV-74 KESTREL RAMP...</div>
  </section>

  <aside class="control-pane">
    <nav class="tab-bar" role="tablist">
      <button type="button" class="tab-btn active" data-tab="face">1. FACE</button>
      <button type="button" class="tab-btn" data-tab="body">2. BODY</button>
      <button type="button" class="tab-btn" data-tab="gear">3. GEAR</button>
      <button type="button" class="tab-btn" data-tab="hair">4. HAIR</button>
      <button type="button" class="tab-btn" data-tab="ramp">5. RAMP</button>
      <button type="button" class="tab-btn" data-tab="action">6. ACTION</button>
    </nav>

    <div class="panel-scroll">
      <!-- TAB 1: FACE -->
      <div class="tab-panel active" data-panel="face">
        <div class="sec-card">
          <div class="sec-title">Operator Archetype</div>
          <div class="btn-row">
            <button type="button" class="ev-btn" data-preset="vanguard">Vanguard</button>
            <button type="button" class="ev-btn" data-preset="recon">Recon</button>
            <button type="button" class="ev-btn" data-preset="heavy">Heavy</button>
            <button type="button" class="ev-btn" data-preset="medic">Medic</button>
            <button type="button" id="btn-randomize" class="ev-btn warn">Randomize</button>
          </div>
        </div>

        <div class="sec-card">
          <div class="sec-title">Skin, Eyes &amp; Expression</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Gender Balance</span><span id="val-gender">0</span></div><input id="rng-gender" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Age</span><span id="val-age">0</span></div><input id="rng-age" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-lbl"><span>Skin Tone</span></div>
          <div id="sw-skin" class="swatches"></div>
          <div class="ctrl-lbl"><span>Iris Color</span></div>
          <div id="sw-eye" class="swatches"></div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Expression</span></div>
            <select id="sel-expression">
              <option value="neutral">Neutral</option>
              <option value="smirk">Smirk</option>
              <option value="focused">Focused</option>
              <option value="blink">Blink</option>
              <option value="bleed">Pain / Bleed</option>
            </select>
          </div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Facial Hair</span></div>
            <select id="sel-beardStyle">
              <option value="clean">Clean Shaven</option>
              <option value="stubble">Tactical Stubble</option>
              <option value="goatee">Goatee</option>
              <option value="full">Full Beard</option>
            </select>
          </div>
        </div>

        <div class="sec-card">
          <div class="sec-title">Craniofacial Morph Targets</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Width</span><span id="val-noseWidth">0</span></div><input id="rng-noseWidth" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Length</span><span id="val-noseLength">0</span></div><input id="rng-noseLength" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Height</span><span id="val-noseHeight">0</span></div><input id="rng-noseHeight" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Jaw Width</span><span id="val-jawWidth">0</span></div><input id="rng-jawWidth" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Chin Size</span><span id="val-chinSize">0</span></div><input id="rng-chinSize" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Cheekbones</span><span id="val-cheekbones">0</span></div><input id="rng-cheekbones" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Size</span><span id="val-eyeSize">0</span></div><input id="rng-eyeSize" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Spacing</span><span id="val-eyeSpacing">0</span></div><input id="rng-eyeSpacing" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Tilt</span><span id="val-eyeTilt">0</span></div><input id="rng-eyeTilt" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Lip Fullness</span><span id="val-lipSize">0</span></div><input id="rng-lipSize" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Mouth Width</span><span id="val-mouthWidth">0</span></div><input id="rng-mouthWidth" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Ear Size</span><span id="val-earSize">0</span></div><input id="rng-earSize" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Forehead Height</span><span id="val-forehead">0</span></div><input id="rng-forehead" type="range" min="-1" max="1" step="0.05" /></div>
        </div>

        <div class="sec-card">
          <div class="sec-title">Scars &amp; Cybernetic Face Seams</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Scar Depth</span><span id="val-scars">0</span></div><input id="rng-scars" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-lbl"><span>Drag Scar Anchor across Face UV</span></div>
          <div id="pad-scar" class="pad-2d"><div id="dot-scar" class="pad-dot"></div></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Cybernetic Facial Seams</span><span id="val-cyberFace">0</span></div><input id="rng-cyberFace" type="range" min="0" max="1" step="0.05" /></div>
        </div>
      </div>

      <!-- TAB 2: BODY -->
      <div class="tab-panel" data-panel="body">
        <div class="sec-card">
          <div class="sec-title">Anatomical Physique Morphs</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Muscle Mass</span><span id="val-muscle">0</span></div><input id="rng-muscle" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Body Weight</span><span id="val-weight">0</span></div><input id="rng-weight" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Stature / Height</span><span id="val-height">0</span></div><input id="rng-height" type="range" min="0" max="1" step="0.05" /></div>
          <label class="chk-row"><input id="chk-cyberArm" type="checkbox" /> <span>Equip Left Titanium Cybernetic Arm</span></label>
        </div>
      </div>

      <!-- TAB 3: GEAR & HELMET -->
      <div class="tab-panel" data-panel="gear">
        <div class="sec-card">
          <div class="sec-title">Identity &amp; Tactical Loadout</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Operator Callsign</span></div><input id="inp-callsign" type="text" maxlength="14" /></div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Outerwear Layer (Base Underwear Enforced)</span></div>
            <select id="sel-outfit">
              <option value="jacket">Tactical Field Jacket</option>
              <option value="hoodie">Recon Hoodie</option>
              <option value="tee">Combat T-Shirt</option>
              <option value="armor">Composite Trauma Armor</option>
              <option value="underwear">Undersuit / Base Layer Only</option>
            </select>
          </div>
          <div class="ctrl-lbl"><span>Suit &amp; Armor Tint</span></div>
          <div id="sw-suit" class="swatches"></div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Left Wrist Emitter Socket</span></div>
            <select id="sel-wristDevice">
              <option value="watch">Tactical Wrist Watch (Holo Emitter)</option>
              <option value="gauntlet">Armored Gauntlet (Holo Emitter)</option>
            </select>
          </div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Combat Helmet (Syncs 3D Corner Portrait)</span></div>
            <select id="sel-helmetMode">
              <option value="none">No Helmet (Unmasked)</option>
              <option value="open">Open Visor (Shell + Tucked Hair)</option>
              <option value="half">Half-Visor (Upper Eye Shield)</option>
              <option value="sealed">Sealed Full Visor</option>
            </select>
          </div>
          <label class="chk-row"><input id="chk-equipRiflePreview" type="checkbox" /> <span>Preview Carbine in Turntable</span></label>
        </div>
      </div>

      <!-- TAB 4: HAIR & GROOMING -->
      <div class="tab-panel" data-panel="hair">
        <div class="sec-card">
          <div class="sec-title">Hair Mesh &amp; Helmet Tuck</div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Hair Style</span></div>
            <select id="sel-hairStyle">
              <option value="short">Short Tactical Fade</option>
              <option value="sleek">Sleek Swept Crop</option>
              <option value="braids">Braided Utility Style</option>
              <option value="buzz">Buzz / Clean</option>
            </select>
          </div>
          <div class="ctrl-lbl"><span>Hair Base Color</span></div>
          <div id="sw-hair" class="swatches"></div>
        </div>
        <div class="sec-card">
          <div class="sec-title">Movable / Rotatable Gray Streaks</div>
          <label class="chk-row"><input id="chk-grayStreak" type="checkbox" /> <span>Enable Gray Streak Highlight</span></label>
          <div class="ctrl-lbl"><span>Drag Streak Position on Hair UV</span></div>
          <div id="pad-streak" class="pad-2d"><div id="dot-streak" class="pad-dot"></div></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Streak Angle</span></div><input id="rng-streakAngle" type="range" min="-3.14" max="3.14" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Streak Width</span></div><input id="rng-streakWidth" type="range" min="0.05" max="0.40" step="0.02" /></div>
        </div>
      </div>

      <!-- TAB 5: HANGAR RAMP FINALE -->
      <div class="tab-panel" data-panel="ramp">
        <div class="sec-card">
          <div class="sec-title">EV-74 Kestrel Hangar Briefing</div>
          <div class="btn-row">
            <button type="button" id="btn-replay-ramp" class="ev-btn">Replay Full Transition</button>
            <button type="button" id="btn-jump-seated" class="ev-btn">Jump Seated</button>
          </div>
          <div class="btn-row">
            <button type="button" id="btn-mission-accept" class="ev-btn active">Accept Mission (Holo)</button>
            <button type="button" id="btn-mission-decline" class="ev-btn warn">Decline Mission (Holo)</button>
          </div>
          <button type="button" id="btn-ship-seed" class="ev-btn">Randomize EV-74 Ship Variant</button>
          <button type="button" id="btn-save-d1" class="ev-btn active">Commit Loadout to Authority D1</button>
          <div id="d1-save-status" class="status-msg"></div>
        </div>
      </div>

      <!-- TAB 6: SECTOR 4 ACTION VIEW -->
      <div class="tab-panel" data-panel="action">
        <div class="sec-card">
          <div class="sec-title">Sector 4 Ore Depot // Isometric CQB</div>
          <div class="ctrl-lbl"><span>Corner Peek &amp; Shoulder Swap</span></div>
          <div class="btn-row">
            <button type="button" class="ev-btn" data-peek="left">Peek Left</button>
            <button type="button" class="ev-btn active" data-peek="center">Center</button>
            <button type="button" class="ev-btn" data-peek="right">Peek Right</button>
          </div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Pelvis Stride Yaw</span><span id="val-strideYaw">0</span></div><input id="rng-strideYaw" type="range" min="-1.5" max="1.5" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Upper-Body Aim Yaw</span><span id="val-aimYaw">0</span></div><input id="rng-aimYaw" type="range" min="-1.5" max="1.5" step="0.05" /></div>
          <label class="chk-row"><input id="chk-cqbMoving" type="checkbox" /> <span>Toggle Tactical Walk Stride</span></label>
          <label class="chk-row"><input id="chk-firing" type="checkbox" /> <span>Test Weapon Recoil Cycle</span></label>
          <label class="chk-row"><input id="chk-suppressed" type="checkbox" /> <span>Incoming Suppression Flinch</span></label>
          <label class="chk-row"><input id="chk-veteran" type="checkbox" /> <span>Veteran Composure Trait</span></label>
          <label class="chk-row"><input id="chk-crowd25" type="checkbox" /> <span>25-Unit Instanced LOD2 Crowd</span></label>
        </div>
      </div>
    </div>
  </aside>
</div>
`;

const htmlOut = htmlTop + '\n<script>\n' + kitJs + '\n' + engineJs + '\n' + uiControllerJs + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(rootDir, 'operator-forge.html'), htmlOut, 'utf8');
console.log('Assembled operator-forge.html:', (Buffer.byteLength(htmlOut, 'utf8') / 1024).toFixed(1), 'KB');
