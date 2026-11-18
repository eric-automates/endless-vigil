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

  var STORAGE_KEY = 'ev_operator_forge_v07';
  var DEFAULT_STATE = {
    callsign: 'VIGIL-01',
    tab: 'face',
    sexMode: 'male',
    gender: -0.85,
    age: 0.16,
    muscle: 0.62,
    weight: 0.44,
    height: 0.52,
    skinHex: '#cf9170',
    skinFinish: 'matte',
    eyeHex: '#3aa7d6',
    hairHex: '#2a1f1a',
    suitTint: '#4d5d54',
    nailColor: 'none',
    noseWidth: 0.0,
    noseLength: 0.04,
    noseHeight: 0.04,
    jawWidth: 0.16,
    chinSize: 0.10,
    cheekbones: 0.10,
    eyeSize: 0.0,
    eyeSpacing: 0.0,
    eyeTilt: 0.04,
    lipSize: 0.0,
    mouthWidth: 0.0,
    earSize: 0.0,
    forehead: 0.0,
    expression: 'neutral',
    blink: 0.0,
    beardStyle: 'stubble',
    scarType: 'none',
    scars: 0.0,
    scarPos: { x: 0.34, y: 0.42, enabled: false },
    cyberFace: 0.0,
    tattooStyle: 'none',
    tattooZone: 'arm_l',
    tattooColor: '#131d28',
    tattooGlow: false,
    piercings: { brow: false, nostril: false, lip: false, ears: false, metal: 'silver', glow: false, color: '#00e5ff' },
    chassisMode: 'humanoid',
    skelStyle: 'titanium',
    bodyParts: { head: 'organic', torso: 'organic', armL: 'organic', armR: 'organic', legL: 'organic', legR: 'organic' },
    skelProps: { headSize: 0, shoulderWidth: 0, torsoWidth: 0, armLength: 0, hipWidth: 0, legLength: 0, calfBulk: 0, footSize: 0 },
    bustQuad: { x: 0.25, y: 0.25 },
    bustSize: 0.52,
    bustFirmness: 0.56,
    bustHeight: 0.05,
    bustSpacing: 0.0,
    cyberArm: false,
    outfit: 'jacket',
    underwearBra: 'sport',
    underwearBottom: 'panties_classic',
    underwearColor: '#1e242c',
    wristDevice: 'watch',
    helmetMode: 'none',
    hairStyle: 'short',
    grayStreak: { enabled: false, x: 0.34, y: 0.44, angle: 0.42, width: 0.18 },
    equipRiflePreview: false,
    missionAccepted: true,
    shipSeed: 1,
    appearanceLocked: false,
    cyberExpertActive: false,
    turntableYaw: 0.18,
    camPitch: 0.0,
    camZoom: 1.0,
    camPanX: 0.0,
    camPanY: 0.0,
    stageOrbitYaw: 0.0,
    rampTimer: 4.0,
    peek: 'center',
    cqbMode: 'center',
    cqbSpeed: 'slow',
    aimSkill: 0.85,
    injuredLeg: false,
    strideYaw: 0.22,
    aimYaw: -0.18,
    cqbMoving: false,
    firing: false,
    suppressed: false,
    veteran: true,
    crowd25: true,
    showCornerPortrait: true
  };

  function deepCopyDefault(){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
  function loadSavedState(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepCopyDefault();
      var parsed = JSON.parse(raw);
      var base = deepCopyDefault();
      Object.assign(base, parsed);
      base.piercings = Object.assign({}, DEFAULT_STATE.piercings, parsed.piercings || {});
      base.bodyParts = Object.assign({}, DEFAULT_STATE.bodyParts, parsed.bodyParts || {});
      base.skelProps = Object.assign({}, DEFAULT_STATE.skelProps, parsed.skelProps || {});
      base.bustQuad  = Object.assign({}, DEFAULT_STATE.bustQuad,  parsed.bustQuad  || {});
      base.scarPos   = Object.assign({}, DEFAULT_STATE.scarPos,   parsed.scarPos   || {});
      base.grayStreak= Object.assign({}, DEFAULT_STATE.grayStreak,parsed.grayStreak|| {});
      return base;
    } catch (_e){ return deepCopyDefault(); }
  }

  var state = loadSavedState();
  function persistLocal(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_e){}
  }

  var SKIN_SWATCHES = ['#f2cbb8','#dfb197','#cf9170','#b67552','#8d5538','#5e3824','#8b99a6','#3b454e'];
  var EYE_SWATCHES  = ['#3aa7d6','#44b89a','#c89b3c','#7a6652','#92a6b8','#ff6a33'];
  var HAIR_SWATCHES = ['#1a1614','#2a1f1a','#4e3424','#8c5230','#c49a52','#aeb7be','#b4384e','#2894b8'];
  var SUIT_SWATCHES = ['#4d5d54','#2c3b47','#3a3f47','#5e4a38','#6e2b2b','#222830'];
  var NAIL_SWATCHES = ['none','#181a1f','#7a1c28','#d45b72','#c98c44','#1398b8','#d8e0e8'];
  var TAT_SWATCHES  = ['#131d28','#2f1e3a','#00e5ff','#ff8c3a','#e03a68','#44f29a'];
  var UW_SWATCHES   = ['#1e242c','#2e3c34','#4a1d28','#0d0f14','#6c584c','#c9d2db'];

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
    var ph = Math.max(220, Math.round(rect.height * dpr));
    if (canvas.width !== pw || canvas.height !== ph){
      canvas.width = pw;
      canvas.height = ph;
    }
    var cssBox = Math.max(82, Math.min(118, Math.round(rect.width * 0.23)));
    var cssOff = 10;
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
    if (t === 'quarters' && state.outfit !== 'underwear') state.outfit = 'underwear';
    if (t === 'ramp' && state.rampTimer >= 4.0) state.rampTimer = 4.0;
    refreshLockUI();
    persistLocal();
  }
  tabBtns.forEach(function(b){
    b.addEventListener('click', function(){ setTab(b.getAttribute('data-tab')); });
  });

  function isBioLocked(){
    return !!state.appearanceLocked && !state.cyberExpertActive;
  }

  function refreshGenderAndBustVisibility(){
    var fineWrap = document.getElementById('wrap-gender-finetune');
    if (fineWrap) fineWrap.style.display = state.sexMode === 'finetune' ? 'flex' : 'none';
    var bustCard = document.getElementById('card-bust-controls');
    if (bustCard) bustCard.style.display = (state.gender >= 0.05) ? 'flex' : 'none';
    var femUw = document.getElementById('wrap-uw-female');
    if (femUw) femUw.style.display = (state.gender >= 0.35) ? 'flex' : 'none';
    var maleUw = document.getElementById('wrap-uw-male');
    if (maleUw) maleUw.style.display = (state.gender < 0.35) ? 'flex' : 'none';
    Array.prototype.slice.call(document.querySelectorAll('[name="sexMode"]')).forEach(function(r){
      r.checked = (r.value === state.sexMode);
    });
  }

  function refreshLockUI(){
    var bioLocked = isBioLocked();
    var lockBanner = document.getElementById('lock-lore-banner');
    var btnLock = document.getElementById('btn-lock-appearance');
    var btnExpert = document.getElementById('btn-cyber-expert');
    if (lockBanner){
      if (state.appearanceLocked && !state.cyberExpertActive){
        lockBanner.textContent = 'APPEARANCE LOCKED IN MANIFEST — Biological genetics frozen. Visit a Cybernetics Expert in-world to graft synthetic cyber-dermal skin or swap mechanical limbs.';
        lockBanner.className = 'lore-box locked';
      } else if (state.cyberExpertActive){
        lockBanner.textContent = 'CYBERNETICS EXPERT BAY ACTIVE — Bio-skin unlocked for synthetic cyber-dermal replacement & modular prosthetics.';
        lockBanner.className = 'lore-box expert';
      } else {
        lockBanner.textContent = 'OPEN BIO-FORGE — Biological traits remain editable until finalized. Once locked, future changes require a Cybernetics Expert.';
        lockBanner.className = 'lore-box';
      }
    }
    if (btnLock){
      btnLock.textContent = state.appearanceLocked ? 'Appearance Locked in Manifest' : 'Finalize & Lock Biological Appearance';
      btnLock.classList.toggle('active', !!state.appearanceLocked);
    }
    if (btnExpert){
      btnExpert.style.display = state.appearanceLocked ? 'block' : 'none';
      btnExpert.textContent = state.cyberExpertActive ? 'Leave Cybernetics Expert Bay' : 'Consult Cybernetics Expert (Swap Cyber-Skin / Limbs)';
      btnExpert.classList.toggle('active', !!state.cyberExpertActive);
    }
    Array.prototype.slice.call(document.querySelectorAll('.bio-lockable')).forEach(function(el){
      el.disabled = bioLocked;
      if (el.closest) {
        var wrap = el.closest('.ctrl-row, .sec-card, .sub-drawer');
        if (wrap && bioLocked) wrap.classList.add('is-locked');
        else if (wrap) wrap.classList.remove('is-locked');
      }
    });
  }

  function bindRange(id, prop, valId, subObj){
    var el = document.getElementById(id);
    var vEl = valId ? document.getElementById(valId) : null;
    if (!el) return;
    var cur = subObj ? state[subObj][prop] : state[prop];
    el.value = cur;
    if (vEl) vEl.textContent = Number(cur).toFixed(2);
    el.addEventListener('input', function(){
      var v = parseFloat(el.value);
      if (subObj) state[subObj][prop] = v; else state[prop] = v;
      if (vEl) vEl.textContent = Number(v).toFixed(2);
      if (prop === 'gender') refreshGenderAndBustVisibility();
      persistLocal();
    });
  }
  function bindSelect(id, prop, subObj){
    var el = document.getElementById(id);
    if (!el) return;
    el.value = subObj ? state[subObj][prop] : state[prop];
    el.addEventListener('change', function(){
      if (subObj) state[subObj][prop] = el.value; else state[prop] = el.value;
      persistLocal();
    });
  }
  function bindCheck(id, prop, subObj){
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = !!(subObj ? state[subObj][prop] : state[prop]);
    el.addEventListener('change', function(){
      if (subObj) state[subObj][prop] = el.checked; else state[prop] = el.checked;
      persistLocal();
    });
  }
  function buildSwatches(containerId, list, prop, subObj){
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = '';
    list.forEach(function(hex){
      var cur = subObj ? state[subObj][prop] : state[prop];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (cur === hex ? ' active' : '') + (hex === 'none' ? ' swatch-none' : '');
      if (hex !== 'none') b.style.background = hex;
      else b.textContent = 'Ø';
      b.setAttribute('aria-label', hex);
      b.addEventListener('click', function(){
        if (b.disabled) return;
        if (isBioLocked() && (prop === 'skinHex' || prop === 'eyeHex' || prop === 'hairHex' || prop === 'nailColor' || prop === 'tattooColor')) return;
        if (subObj) state[subObj][prop] = hex; else state[prop] = hex;
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
      var nx = Math.max(0.04, Math.min(0.96, cx / Math.max(1, r.width)));
      var ny = Math.max(0.04, Math.min(0.96, cy / Math.max(1, r.height)));
      onUpdate(nx, ny);
      syncDot();
      persistLocal();
    }
    pad.addEventListener('pointerdown', function(e){ dragging = true; try { pad.setPointerCapture(e.pointerId); } catch(_e){} applyEvt(e); });
    pad.addEventListener('pointermove', function(e){ if (dragging) applyEvt(e); });
    pad.addEventListener('pointerup', function(){ dragging = false; });
    pad.addEventListener('pointercancel', function(){ dragging = false; });
    pad._syncDot = syncDot;
  }

  function refreshAllControlValues(){
    ['gender','age','muscle','weight','height','noseWidth','noseLength','noseHeight','jawWidth','chinSize','cheekbones','eyeSize','eyeSpacing','eyeTilt','lipSize','mouthWidth','earSize','forehead','cyberFace','bustSize','bustFirmness','bustHeight','bustSpacing','strideYaw','aimYaw','aimSkill'].forEach(function(k){
      var el = document.getElementById('rng-' + k);
      var vEl = document.getElementById('val-' + k);
      if (el){ el.value = state[k]; if (vEl) vEl.textContent = Number(state[k]).toFixed(2); }
    });
    ['headSize','shoulderWidth','torsoWidth','armLength','hipWidth','legLength','calfBulk','footSize'].forEach(function(k){
      var el = document.getElementById('rng-skel-' + k);
      var vEl = document.getElementById('val-skel-' + k);
      if (el){ el.value = state.skelProps[k]; if (vEl) vEl.textContent = Number(state.skelProps[k]).toFixed(2); }
    });
    ['skinFinish','expression','beardStyle','scarType','tattooStyle','tattooZone','chassisMode','skelStyle','outfit','underwearBra','underwearBottom','wristDevice','helmetMode','hairStyle','cqbSpeed'].forEach(function(k){
      var el = document.getElementById('sel-' + k);
      if (el) el.value = state[k];
    });
    ['head','torso','armL','armR','legL','legR'].forEach(function(pk){
      var el = document.getElementById('sel-part-' + pk);
      if (el) el.value = state.bodyParts[pk];
    });
    var pm = document.getElementById('sel-piercingMetal'); if (pm) pm.value = state.piercings.metal;
    ['brow','nostril','lip','ears','glow'].forEach(function(pk){
      var el = document.getElementById('chk-piercing-' + pk); if (el) el.checked = !!state.piercings[pk];
    });
    ['tattooGlow','equipRiflePreview','cqbMoving','firing','suppressed','injuredLeg','crowd25'].forEach(function(k){
      var el = document.getElementById('chk-' + k); if (el) el.checked = !!state[k];
    });
    var cs = document.getElementById('inp-callsign'); if (cs) cs.value = state.callsign || 'VIGIL-01';
    var gsChk = document.getElementById('chk-grayStreak'); if (gsChk) gsChk.checked = !!(state.grayStreak && state.grayStreak.enabled);
    buildSwatches('sw-skin', SKIN_SWATCHES, 'skinHex');
    buildSwatches('sw-eye',  EYE_SWATCHES,  'eyeHex');
    buildSwatches('sw-hair', HAIR_SWATCHES, 'hairHex');
    buildSwatches('sw-suit', SUIT_SWATCHES, 'suitTint');
    buildSwatches('sw-nail', NAIL_SWATCHES, 'nailColor');
    buildSwatches('sw-tattoo', TAT_SWATCHES, 'tattooColor');
    buildSwatches('sw-pierceCol', TAT_SWATCHES, 'color', 'piercings');
    buildSwatches('sw-uwCol', UW_SWATCHES, 'underwearColor');
    refreshGenderAndBustVisibility();
    refreshLockUI();
  }

  // Radio Sex Mode (Male / Female / Fine-Tune)
  Array.prototype.slice.call(document.querySelectorAll('[name="sexMode"]')).forEach(function(r){
    r.addEventListener('change', function(){
      if (!r.checked) return;
      state.sexMode = r.value;
      if (r.value === 'male'){ state.gender = -0.85; if (state.beardStyle === 'clean' && state.tab === 'face') state.beardStyle = 'stubble'; }
      else if (r.value === 'female'){ state.gender = 0.85; state.beardStyle = 'clean'; }
      var rng = document.getElementById('rng-gender'), val = document.getElementById('val-gender');
      if (rng) rng.value = state.gender;
      if (val) val.textContent = Number(state.gender).toFixed(2);
      var bEl = document.getElementById('sel-beardStyle'); if (bEl) bEl.value = state.beardStyle;
      refreshGenderAndBustVisibility();
      persistLocal();
    });
  });

  // Bind all ranges, selects, checkboxes
  [
    'gender','age','muscle','weight','height','noseWidth','noseLength','noseHeight',
    'jawWidth','chinSize','cheekbones','eyeSize','eyeSpacing','eyeTilt','lipSize',
    'mouthWidth','earSize','forehead','cyberFace','bustSize','bustFirmness','bustHeight','bustSpacing',
    'strideYaw','aimYaw','aimSkill'
  ].forEach(function(k){ bindRange('rng-' + k, k, 'val-' + k); });

  ['headSize','shoulderWidth','torsoWidth','armLength','hipWidth','legLength','calfBulk','footSize'].forEach(function(k){
    bindRange('rng-skel-' + k, k, 'val-skel-' + k, 'skelProps');
  });

  ['skinFinish','expression','beardStyle','scarType','tattooStyle','tattooZone','chassisMode','skelStyle','outfit','underwearBra','underwearBottom','wristDevice','helmetMode','hairStyle','cqbSpeed'].forEach(function(k){
    bindSelect('sel-' + k, k);
  });
  var selUwMale = document.getElementById('sel-uwMale');
  if (selUwMale){
    selUwMale.value = state.underwearBottom || 'boxers_charcoal';
    selUwMale.addEventListener('change', function(){ state.underwearBottom = selUwMale.value; persistLocal(); });
  }
  ['head','torso','armL','armR','legL','legR'].forEach(function(pk){
    bindSelect('sel-part-' + pk, pk, 'bodyParts');
  });
  bindSelect('sel-piercingMetal', 'metal', 'piercings');
  ['brow','nostril','lip','ears','glow'].forEach(function(pk){
    bindCheck('chk-piercing-' + pk, pk, 'piercings');
  });
  ['tattooGlow','equipRiflePreview','cqbMoving','firing','suppressed','injuredLeg','crowd25'].forEach(function(k){
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
  buildSwatches('sw-nail', NAIL_SWATCHES, 'nailColor');
  buildSwatches('sw-tattoo', TAT_SWATCHES, 'tattooColor');
  buildSwatches('sw-pierceCol', TAT_SWATCHES, 'color', 'piercings');
  buildSwatches('sw-uwCol', UW_SWATCHES, 'underwearColor');

  setup2DPad('pad-scar', 'dot-scar', function(){ return state.scarPos || {x:0.5,y:0.5}; }, function(x, y){
    state.scarPos = { x: x, y: y, enabled: true };
    if (state.scarType === 'none'){
      state.scarType = 'slash';
      var st = document.getElementById('sel-scarType'); if (st) st.value = 'slash';
    }
  });
  setup2DPad('pad-streak', 'dot-streak', function(){ return state.grayStreak || {x:0.35,y:0.45}; }, function(x, y){
    state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: true, x: x, y: y });
    var c = document.getElementById('chk-grayStreak'); if (c) c.checked = true;
  });
  setup2DPad('pad-bust', 'dot-bust', function(){
    return { x: ((state.bustQuad.x || 0) + 1) * 0.5, y: (1 - (state.bustQuad.y || 0)) * 0.5 };
  }, function(nx, ny){
    state.bustQuad = { x: nx * 2 - 1, y: (1 - ny) * 2 - 1 };
  });

  var gsCheck = document.getElementById('chk-grayStreak');
  if (gsCheck){
    gsCheck.checked = !!(state.grayStreak && state.grayStreak.enabled);
    gsCheck.addEventListener('change', function(){ state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: gsCheck.checked }); persistLocal(); });
  }
  var gsAngle = document.getElementById('rng-streakAngle');
  if (gsAngle){
    gsAngle.value = (state.grayStreak && state.grayStreak.angle) || 0.42;
    gsAngle.addEventListener('input', function(){ state.grayStreak = Object.assign({}, state.grayStreak || {}, { angle: parseFloat(gsAngle.value) }); persistLocal(); });
  }
  var gsWidth = document.getElementById('rng-streakWidth');
  if (gsWidth){
    gsWidth.value = (state.grayStreak && state.grayStreak.width) || 0.18;
    gsWidth.addEventListener('input', function(){ state.grayStreak = Object.assign({}, state.grayStreak || {}, { width: parseFloat(gsWidth.value) }); persistLocal(); });
  }

  // Lock-In & Cybernetics Expert Buttons
  var btnLock = document.getElementById('btn-lock-appearance');
  if (btnLock){
    btnLock.addEventListener('click', function(){
      if (!state.appearanceLocked){
        state.appearanceLocked = true;
        state.cyberExpertActive = false;
        refreshLockUI();
        persistLocal();
      }
    });
  }
  var btnExpert = document.getElementById('btn-cyber-expert');
  if (btnExpert){
    btnExpert.addEventListener('click', function(){
      state.cyberExpertActive = !state.cyberExpertActive;
      if (state.cyberExpertActive && state.skinFinish === 'matte'){
        state.skinFinish = 'android';
        var sf = document.getElementById('sel-skinFinish'); if (sf) sf.value = 'android';
      }
      refreshLockUI();
      persistLocal();
    });
  }

  // Presets & Randomizer
  var PRESETS = {
    vanguard: { sexMode:'male',   gender:-0.85, muscle:0.80, weight:0.50, height:0.65, outfit:'armor',  helmetMode:'half',   hairStyle:'short',  beardStyle:'stubble', chassisMode:'humanoid', suitTint:'#4d5d54' },
    recon:    { sexMode:'female', gender: 0.85, muscle:0.45, weight:0.32, height:0.48, outfit:'jacket', helmetMode:'open',   hairStyle:'braids', beardStyle:'clean',   chassisMode:'humanoid', bodyParts:{head:'organic',torso:'organic',armL:'cyber',armR:'organic',legL:'organic',legR:'organic'}, suitTint:'#2c3b47' },
    heavy:    { sexMode:'male',   gender:-0.95, muscle:0.95, weight:0.75, height:0.82, outfit:'armor',  helmetMode:'sealed', hairStyle:'buzz',   beardStyle:'full',    chassisMode:'humanoid', bodyParts:{head:'organic',torso:'cyber',armL:'cyber',armR:'cyber',legL:'organic',legR:'organic'}, suitTint:'#5e4a38' },
    android:  { sexMode:'female', gender: 0.72, muscle:0.55, weight:0.36, height:0.58, outfit:'underwear', helmetMode:'none', hairStyle:'sleek', beardStyle:'clean',   chassisMode:'android',  skinFinish:'android', skelStyle:'titanium', bodyParts:{head:'skeleton',torso:'skeleton',armL:'skeleton',armR:'skeleton',legL:'skeleton',legR:'skeleton'} }
  };
  Array.prototype.slice.call(document.querySelectorAll('[data-preset]')).forEach(function(btn){
    btn.addEventListener('click', function(){
      if (isBioLocked()) return;
      var p = PRESETS[btn.getAttribute('data-preset')];
      if (!p) return;
      Object.assign(state, p);
      if (p.bodyParts) state.bodyParts = Object.assign({}, p.bodyParts);
      refreshAllControlValues();
      persistLocal();
    });
  });

  var randBtn = document.getElementById('btn-randomize');
  if (randBtn){
    randBtn.addEventListener('click', function(){
      if (isBioLocked()) return;
      var r = function(a,b){ return a + Math.random()*(b-a); };
      state.sexMode = Math.random() > 0.5 ? 'female' : 'male';
      state.gender = state.sexMode === 'female' ? 0.85 : -0.85;
      state.muscle = r(0.25, 0.9); state.weight = r(0.25, 0.7); state.height = r(0.2, 0.85);
      state.noseWidth = r(-0.6, 0.6); state.jawWidth = r(-0.6, 0.6); state.cheekbones = r(-0.5, 0.6);
      state.skinHex = SKIN_SWATCHES[Math.floor(Math.random()*6)];
      state.eyeHex  = EYE_SWATCHES[Math.floor(Math.random()*EYE_SWATCHES.length)];
      state.hairHex = HAIR_SWATCHES[Math.floor(Math.random()*HAIR_SWATCHES.length)];
      state.suitTint = SUIT_SWATCHES[Math.floor(Math.random()*SUIT_SWATCHES.length)];
      state.hairStyle = ['short','sleek','braids','buzz'][Math.floor(Math.random()*4)];
      state.beardStyle = state.gender > 0.1 ? 'clean' : ['clean','stubble','goatee','full'][Math.floor(Math.random()*4)];
      refreshAllControlValues();
      persistLocal();
    });
  }

  // Ramp & Action buttons
  var btnReplay = document.getElementById('btn-replay-ramp'); if (btnReplay) btnReplay.addEventListener('click', function(){ state.rampTimer = 0.0; setTab('ramp'); });
  var btnSeated = document.getElementById('btn-jump-seated'); if (btnSeated) btnSeated.addEventListener('click', function(){ state.rampTimer = 4.0; setTab('ramp'); });
  var btnAccept = document.getElementById('btn-mission-accept'); if (btnAccept) btnAccept.addEventListener('click', function(){ state.missionAccepted = true; persistLocal(); });
  var btnDecline = document.getElementById('btn-mission-decline'); if (btnDecline) btnDecline.addEventListener('click', function(){ state.missionAccepted = false; persistLocal(); });
  var btnShipSeed = document.getElementById('btn-ship-seed'); if (btnShipSeed) btnShipSeed.addEventListener('click', function(){ state.shipSeed = (state.shipSeed + 1) % 4; persistLocal(); });

  Array.prototype.slice.call(document.querySelectorAll('[data-peek]')).forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.getAttribute('data-peek');
      state.peek = k; state.cqbMode = k;
      Array.prototype.slice.call(document.querySelectorAll('[data-peek]')).forEach(function(x){ x.classList.toggle('active', x === b); });
      persistLocal();
    });
  });

  Array.prototype.slice.call(document.querySelectorAll('[data-outfit-quick]')).forEach(function(b){
    b.addEventListener('click', function(){
      state.outfit = b.getAttribute('data-outfit-quick');
      var so = document.getElementById('sel-outfit'); if (so) so.value = state.outfit;
      persistLocal();
    });
  });

  // D1 Authority Save
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
        if (resp.ok) d1StatusEl.textContent = 'COMMITTED TO D1 AUTHORITY // LOCKED';
        else d1StatusEl.textContent = 'LOCAL CACHE SAVED (AUTH REQUIRED FOR REMOTE D1: HTTP ' + resp.status + ')';
      } catch (_err){
        d1StatusEl.textContent = 'LOCAL CACHE SAVED (OFFLINE SANDBOX)';
      }
    });
  }

  // Interactive 1-Finger Orbit, 2-Finger Pinch Zoom + 2-Finger Pan, Wheel Zoom, Shift+Drag Pan & Double-Tap Reset!
  var activePts = new Map();
  var lastPinchDist = 0, lastMid = null, lastTapMs = 0;
  function applyOrbitDelta(dx, dy, shiftHeld){
    if (shiftHeld){
      var z = state.camZoom || 1.0;
      state.camPanX = Math.max(-0.85, Math.min(0.85, (state.camPanX || 0) - dx * 0.0020 * z));
      state.camPanY = Math.max(-0.85, Math.min(0.85, (state.camPanY || 0) + dy * 0.0020 * z));
      return;
    }
    if (state.tab === 'action'){
      state.aimYaw = Math.max(-1.4, Math.min(1.4, (state.aimYaw || 0) + dx * 0.008));
      var ay = document.getElementById('rng-aimYaw'); if (ay) ay.value = state.aimYaw;
    } else if (state.tab === 'ramp' || state.tab === 'quarters'){
      state.stageOrbitYaw = (state.stageOrbitYaw || 0) + dx * 0.009;
    } else {
      state.turntableYaw = (state.turntableYaw || 0) + dx * 0.01;
    }
    state.camPitch = Math.max(-0.48, Math.min(0.60, (state.camPitch || 0) + dy * 0.005));
  }
  function resetView(){
    state.turntableYaw = 0.18; state.camPitch = 0.0; state.camZoom = 1.0;
    state.camPanX = 0.0; state.camPanY = 0.0; state.stageOrbitYaw = 0.0;
    persistLocal();
  }
  var btnResetView = document.getElementById('btn-reset-view');
  if (btnResetView) btnResetView.addEventListener('click', resetView);

  // Purge Browser Cache for THIS Origin Only (preserves other tabs, logins & sites across Chrome / DuckDuckGo!)
  async function purgeSiteCacheAndReload(){
    var btn = document.getElementById('btn-purge-cache');
    if (btn) btn.textContent = 'Purging...';
    try {
      if (typeof caches !== 'undefined' && caches.keys){
        var keys = await caches.keys();
        await Promise.all(keys.map(function(k){ return caches.delete(k); }));
      }
      if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(r){ return r.unregister(); }));
      }
      try {
        localStorage.removeItem('ev_operator_forge_v06');
        localStorage.removeItem('ev_operator_forge_v07');
      } catch (_ls){}
      if (typeof fetch === 'function' && window.location && /^https?:/.test(window.location.protocol)){
        await fetch(window.location.pathname, {
          cache: 'reload',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        }).catch(function(){});
      }
    } catch (_e){}
    try {
      var base = (window.location.href || '').split('?')[0].split('#')[0];
      window.location.replace(base + '?ev_bust=' + Date.now());
    } catch (_e2){ window.location.reload(); }
  }
  var btnPurgeCache = document.getElementById('btn-purge-cache');
  if (btnPurgeCache) btnPurgeCache.addEventListener('click', purgeSiteCacheAndReload);

  // Force WebGL2 Safe Mode toggle (fixes blank WebGPU experimental adapters on mobile DuckDuckGo WebView!)
  var forceMode = '';
  try {
    var qs = (window.location && window.location.search) || '';
    if (qs.indexOf('backend=webgl2') !== -1 || localStorage.getItem('ev_force_webgl2') === '1') forceMode = 'webgl2';
  } catch (_e){}
  var btnToggleBackend = document.getElementById('btn-toggle-backend');
  if (btnToggleBackend){
    btnToggleBackend.textContent = forceMode === 'webgl2' ? 'Mode: WebGL2' : 'Mode: Auto';
    btnToggleBackend.addEventListener('click', function(){
      try { localStorage.setItem('ev_force_webgl2', forceMode === 'webgl2' ? '0' : '1'); } catch (_e){}
      var base = (window.location.href || '').split('?')[0].split('#')[0];
      window.location.replace(base + '?backend=' + (forceMode === 'webgl2' ? 'auto' : 'webgl2') + '&ev_bust=' + Date.now());
    });
  }
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', syncCanvasSize);
  }

  // Boot Dual WebGPU / WebGL2 Engine (with automatic WebGL2 fallback if experimental mobile WebGPU fails!)
  refreshAllControlValues();
  setTab(state.tab || 'face');
  syncCanvasSize();
  function bootEngine(modeOverride){
    return EVGPUEngine.createEngine(canvas, window.EV_HUMANOID_KIT_PACK, modeOverride).catch(function(err){
      if (modeOverride !== 'webgl2'){
        var fresh = canvas.cloneNode(false);
        canvas.parentNode.replaceChild(fresh, canvas);
        canvas = fresh;
        attachCanvasGestures(canvas);
        syncCanvasSize();
        return EVGPUEngine.createEngine(canvas, window.EV_HUMANOID_KIT_PACK, 'webgl2');
      }
      throw err;
    });
  }
  function attachCanvasGestures(target){
    target.addEventListener('pointerdown', function(e){
      if (e.preventDefault) e.preventDefault();
      try { target.setPointerCapture(e.pointerId); } catch (_err){}
      activePts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePts.size === 1){
        var nowMs = Date.now();
        if (nowMs - lastTapMs < 280) resetView();
        lastTapMs = nowMs;
        lastMid = null;
      } else if (activePts.size >= 2){
        var pts = Array.from(activePts.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        lastMid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
      }
    });
    target.addEventListener('pointermove', function(e){
      if (!activePts.has(e.pointerId)) return;
      if (e.preventDefault) e.preventDefault();
      var prev = activePts.get(e.pointerId);
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      activePts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePts.size === 1){
        applyOrbitDelta(dx, dy, !!e.shiftKey || e.buttons === 2);
      } else if (activePts.size >= 2){
        var pts = Array.from(activePts.values());
        var nd = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        var mid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
        if (lastPinchDist > 4 && nd > 4){
          state.camZoom = Math.max(0.45, Math.min(1.85, (state.camZoom || 1.0) * (lastPinchDist / nd)));
        }
        if (lastMid){
          var z = state.camZoom || 1.0;
          state.camPanX = Math.max(-0.85, Math.min(0.85, (state.camPanX || 0) - (mid.x - lastMid.x) * 0.0022 * z));
          state.camPanY = Math.max(-0.85, Math.min(0.85, (state.camPanY || 0) + (mid.y - lastMid.y) * 0.0022 * z));
        }
        lastPinchDist = nd;
        lastMid = mid;
      }
    });
    function endPtr(e){ activePts.delete(e.pointerId); if (activePts.size < 2){ lastPinchDist = 0; lastMid = null; } }
    target.addEventListener('pointerup', endPtr);
    target.addEventListener('pointercancel', endPtr);
    target.addEventListener('contextmenu', function(e){ if (e.preventDefault) e.preventDefault(); });
    target.addEventListener('wheel', function(e){
      if (e.preventDefault) e.preventDefault();
      state.camZoom = Math.max(0.45, Math.min(1.85, (state.camZoom || 1.0) + (e.deltaY > 0 ? 0.08 : -0.08)));
    }, { passive: false });
  }
  attachCanvasGestures(canvas);

  bootEngine(forceMode).then(function(engine){
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

      var hm = state.helmetMode || 'none';
      portraitTag.textContent = hm === 'sealed' ? 'SEALED VISOR' : (hm === 'half' ? 'HALF-VISOR' : (hm === 'open' ? 'OPEN VISOR' : 'UNMASKED'));
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
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
<title>Endless Vigil // Operator Forge &amp; Tactical Stage</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%; max-width: 100vw; overflow-x: hidden; overflow-y: hidden;
    background: #0a0c0f; color: #e2e9ef;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; line-height: 1.4;
  }
  .forge-shell {
    display: flex; flex-direction: column; height: 100dvh; width: 100%; overflow: hidden;
  }
  .stage-pane {
    position: relative; width: 100%; height: min(46dvh, 420px); flex: 0 0 auto;
    background: radial-gradient(circle at 50% 35%, #1c1f24 0%, #0a0c0f 85%);
    overflow: hidden;
  }
  .control-pane {
    width: 100%; flex: 1 1 0; min-height: 0; overflow: hidden;
    background: #0e1217; border-top: 1px solid #28313c;
    display: flex; flex-direction: column;
  }
  @media (min-width: 920px) {
    .forge-shell { flex-direction: row; height: 100dvh; overflow: hidden; }
    .stage-pane { flex: 1 1 0; height: 100%; min-width: 0; }
    .control-pane {
      width: min(100%, 420px); flex: 0 0 auto; height: 100%;
      border-top: none; border-left: 1px solid #28313c;
    }
  }
  #viewport3d {
    display: block; width: 100%; height: 100%; touch-action: none; cursor: grab;
  }
  #viewport3d:active { cursor: grabbing; }
  .stage-topbar {
    position: absolute; top: 8px; left: 8px; right: 8px;
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start;
    gap: 6px; pointer-events: none; z-index: 4;
  }
  .hud-pill {
    pointer-events: auto; background: rgba(12, 15, 20, 0.86);
    border: 1px solid #2b3642; padding: 4px 8px; border-radius: 4px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 7px;
  }
  .hud-nav a {
    color: #96aab8; text-decoration: none; font-size: 10.5px; padding: 2px 5px;
    border-radius: 3px; border: 1px solid transparent;
  }
  .hud-nav a:hover { color: #00d4ff; border-color: #1f4558; }
  .backend-tag {
    font-weight: 700; font-size: 10px; letter-spacing: 0.06em;
    padding: 2px 6px; border-radius: 3px; background: #221c14; color: #f29b4b;
    border: 1px solid #593b1d;
  }
  .backend-tag.is-webgpu { color: #00d4ff; border-color: #0b4f5e; background: #07222b; }
  .telemetry-line { font-size: 10px; color: #a7b9c8; }

  #corner-portrait-hud {
    position: absolute; left: 10px; bottom: 10px; width: 104px; height: 104px;
    border: 1.5px solid #00d4ff; box-shadow: 0 0 18px rgba(0, 212, 255, 0.22);
    border-radius: 4px; pointer-events: none; z-index: 4; overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .portrait-hdr {
    background: rgba(8, 12, 16, 0.88); color: #00d4ff; font-size: 8.5px; font-weight: 700;
    padding: 2px 4px; letter-spacing: 0.04em; border-bottom: 1px solid rgba(0,212,255,0.28);
    display: flex; justify-content: space-between; gap: 4px; white-space: nowrap; overflow: hidden;
  }
  .portrait-ftr {
    background: rgba(8, 12, 16, 0.88); color: #d0e5f2; font-size: 8px;
    padding: 2px 4px; border-top: 1px solid rgba(0,212,255,0.22);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gesture-hint {
    position: absolute; right: 10px; bottom: 10px; pointer-events: none; z-index: 4;
    background: rgba(12,15,20,0.72); border: 1px solid #26313c; border-radius: 4px;
    padding: 3px 7px; font-size: 9.5px; color: #96aab8;
  }
  #cinema-fade {
    position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none;
    z-index: 6; display: flex; align-items: center; justify-content: center;
    color: #00d4ff; letter-spacing: 0.2em; font-size: 11px;
  }

  .tab-bar {
    display: flex; flex-wrap: wrap; border-bottom: 1px solid #26303b; background: #0a0d11; flex: 0 0 auto;
  }
  .tab-btn {
    flex: 1 1 33%; padding: 8px 5px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #8c9dad; cursor: pointer;
    font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  }
  .tab-btn:hover { color: #e2e9ef; }
  .tab-btn.active { color: #f29b4b; border-bottom-color: #f29b4b; background: #141920; }

  .panel-scroll {
    flex: 1 1 0; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain; padding: 10px;
  }
  .tab-panel { display: none; flex-direction: column; gap: 10px; padding-bottom: 24px; }
  .tab-panel.active { display: flex; }

  .sec-card, .sub-drawer {
    background: #13181f; border: 1px solid #25303d; border-radius: 5px; padding: 9px 10px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .sub-drawer summary {
    cursor: pointer; list-style: none; font-size: 10.5px; font-weight: 700;
    color: #00d4ff; letter-spacing: 0.06em; text-transform: uppercase;
    display: flex; justify-content: space-between; align-items: center;
  }
  .sub-drawer summary::after { content: '+'; font-size: 13px; color: #f29b4b; }
  .sub-drawer[open] summary::after { content: '−'; }
  .sub-body { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; border-top: 1px solid #202a36; }

  .sec-title {
    font-size: 10px; font-weight: 700; color: #f29b4b; letter-spacing: 0.08em;
    text-transform: uppercase; border-bottom: 1px solid #202a36; padding-bottom: 4px;
  }
  .ctrl-row { display: flex; flex-direction: column; gap: 3px; }
  .ctrl-lbl { display: flex; justify-content: space-between; font-size: 11px; color: #c0cfdc; }
  input[type="range"] { width: 100%; accent-color: #f29b4b; margin: 0; }
  select, input[type="text"] {
    width: 100%; background: #090c10; color: #e2e9ef; border: 1px solid #2a3746;
    padding: 6px 8px; border-radius: 4px; font-family: inherit; font-size: 11px;
  }
  .radio-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .radio-chip {
    flex: 1 1 30%; display: flex; align-items: center; justify-content: center; gap: 5px;
    background: #0b0f14; border: 1px solid #293645; border-radius: 4px; padding: 6px 8px;
    cursor: pointer; font-size: 11px; font-weight: 700; color: #c5d4e0;
  }
  .radio-chip input { accent-color: #f29b4b; margin: 0; }
  .btn-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .ev-btn {
    flex: 1 1 auto; background: #16202a; color: #dce8f2; border: 1px solid #2b4257;
    padding: 7px 9px; border-radius: 4px; cursor: pointer; font-family: inherit;
    font-size: 11px; font-weight: 700; text-align: center;
  }
  .ev-btn:hover { border-color: #00d4ff; color: #00d4ff; }
  .ev-btn.active { background: #0e303e; border-color: #00d4ff; color: #00d4ff; }
  .ev-btn.warn { border-color: #6b411d; color: #f29b4b; }
  .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .swatch {
    width: 23px; height: 23px; border-radius: 4px; border: 2px solid #253341; cursor: pointer;
    color: #cbd5e1; font-size: 11px; display: flex; align-items: center; justify-content: center; padding: 0;
  }
  .swatch-none { background: #141a21; }
  .swatch.active { border-color: #f29b4b; box-shadow: 0 0 8px rgba(242,155,75,0.65); }
  .chk-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd9e4; cursor: pointer; }
  .pad-2d {
    position: relative; width: 100%; height: 92px; border-radius: 4px;
    background: linear-gradient(135deg, #0e151d 0%, #16222e 100%);
    border: 1px solid #283a4d; cursor: crosshair; touch-action: none;
  }
  .pad-corner {
    position: absolute; font-size: 8.5px; color: #8da2b3; pointer-events: none; padding: 3px 5px;
  }
  .pad-dot {
    position: absolute; width: 12px; height: 12px; border-radius: 50%;
    background: #f29b4b; border: 2px solid #fff; transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .part-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .part-cell { flex: 1 1 46%; display: flex; flex-direction: column; gap: 3px; }
  .lore-box {
    padding: 8px; border-radius: 4px; font-size: 10.5px; line-height: 1.45;
    background: #0d161f; border: 1px solid #1e3b4d; color: #9fc5da;
  }
  .lore-box.locked { background: #1f1412; border-color: #6e3528; color: #f6b3a4; }
  .lore-box.expert { background: #0c1f24; border-color: #00d4ff; color: #8ef2ff; }
  .is-locked { opacity: 0.52; }
  .status-msg { font-size: 10px; color: #7dc4d9; min-height: 14px; }
</style>
</head>
<body>
<div class="forge-shell">
  <section class="stage-pane">
    <canvas id="viewport3d"></canvas>
    <div class="stage-topbar">
      <div class="hud-pill hud-nav">
        <strong style="color:#f29b4b;">ENDLESS VIGIL // FORGE</strong>
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
        <button type="button" id="btn-toggle-backend" class="ev-btn" style="padding:2px 6px;font-size:10px;flex:0 0 auto;" title="Switch between Auto WebGPU and WebGL2 Safe Mode">Mode: Auto</button>
        <button type="button" id="btn-purge-cache" class="ev-btn warn" style="padding:2px 6px;font-size:10px;flex:0 0 auto;" title="Clear site cache & force fresh reload without affecting other browser sites">Purge Cache</button>
      </div>
    </div>

    <div id="corner-portrait-hud">
      <div class="portrait-hdr"><span>LIVE ID</span><span id="portrait-mode-tag">UNMASKED</span></div>
      <div class="portrait-ftr">VITALS: 100% // RIG ONLINE</div>
    </div>
    <div class="gesture-hint">1-Finger: Orbit | 2-Finger: Zoom &amp; Pan | Shift+Drag: Pan</div>
    <div id="cinema-fade">TRANSIT TO EV-74 KESTREL RAMP...</div>
  </section>

  <aside class="control-pane">
    <nav class="tab-bar" role="tablist">
      <button type="button" class="tab-btn active" data-tab="face">1. FACE</button>
      <button type="button" class="tab-btn" data-tab="body">2. BODY</button>
      <button type="button" class="tab-btn" data-tab="quarters">3. QUARTERS</button>
      <button type="button" class="tab-btn" data-tab="gear">4. GEAR/LOCK</button>
      <button type="button" class="tab-btn" data-tab="ramp">5. RAMP</button>
      <button type="button" class="tab-btn" data-tab="action">6. ACTION</button>
    </nav>

    <div class="panel-scroll">
      <!-- TAB 1: FACE & BIO APPEARANCE -->
      <div class="tab-panel active" data-panel="face">
        <div class="sec-card">
          <div class="sec-title">Operator Archetype</div>
          <div class="btn-row">
            <button type="button" class="ev-btn" data-preset="vanguard">Vanguard</button>
            <button type="button" class="ev-btn" data-preset="recon">Recon</button>
            <button type="button" class="ev-btn" data-preset="heavy">Heavy</button>
            <button type="button" class="ev-btn" data-preset="android">Android</button>
            <button type="button" id="btn-randomize" class="ev-btn warn">Randomize</button>
          </div>
        </div>

        <div class="sec-card">
          <div class="sec-title">Sex / Gender, Skin Finish &amp; Eyes</div>
          <div class="radio-row">
            <label class="radio-chip"><input type="radio" class="bio-lockable" name="sexMode" value="male" checked /> Male</label>
            <label class="radio-chip"><input type="radio" class="bio-lockable" name="sexMode" value="female" /> Female</label>
            <label class="radio-chip"><input type="radio" class="bio-lockable" name="sexMode" value="finetune" /> Fine-Tune</label>
          </div>
          <div id="wrap-gender-finetune" class="ctrl-row" style="display:none;">
            <div class="ctrl-lbl"><span>Continuous Gender Balance</span><span id="val-gender">0</span></div>
            <input id="rng-gender" class="bio-lockable" type="range" min="-1" max="1" step="0.05" />
          </div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Age</span><span id="val-age">0</span></div><input id="rng-age" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-lbl"><span>Skin Tone</span></div>
          <div id="sw-skin" class="swatches"></div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Skin Finish / Surface</span></div>
            <select id="sel-skinFinish" class="bio-lockable">
              <option value="matte">Matte (Natural Biological)</option>
              <option value="shiny">Shiny (Gloss / Hydrated)</option>
              <option value="metallic">Metallic / Reflective Chrome</option>
              <option value="android">Synthetic Android Dermal Panels</option>
            </select>
          </div>
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
        </div>

        <details class="sub-drawer">
          <summary>Craniofacial Morph Targets (13 Sliders)</summary>
          <div class="sub-body">
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Width</span><span id="val-noseWidth">0</span></div><input id="rng-noseWidth" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Length</span><span id="val-noseLength">0</span></div><input id="rng-noseLength" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Nose Height</span><span id="val-noseHeight">0</span></div><input id="rng-noseHeight" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Jaw Width</span><span id="val-jawWidth">0</span></div><input id="rng-jawWidth" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Chin Size</span><span id="val-chinSize">0</span></div><input id="rng-chinSize" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Cheekbones</span><span id="val-cheekbones">0</span></div><input id="rng-cheekbones" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Size</span><span id="val-eyeSize">0</span></div><input id="rng-eyeSize" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Spacing</span><span id="val-eyeSpacing">0</span></div><input id="rng-eyeSpacing" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Eye Tilt</span><span id="val-eyeTilt">0</span></div><input id="rng-eyeTilt" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Lip Fullness</span><span id="val-lipSize">0</span></div><input id="rng-lipSize" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Mouth Width</span><span id="val-mouthWidth">0</span></div><input id="rng-mouthWidth" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Ear Size</span><span id="val-earSize">0</span></div><input id="rng-earSize" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Forehead Height</span><span id="val-forehead">0</span></div><input id="rng-forehead" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
          </div>
        </details>

        <details class="sub-drawer">
          <summary>Hair, Facial Hair &amp; Nail Polish</summary>
          <div class="sub-body">
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Hair Style</span></div>
              <select id="sel-hairStyle" class="bio-lockable">
                <option value="short">Short Tactical Fade</option>
                <option value="sleek">Sleek Swept Crop</option>
                <option value="braids">Braided Utility Style</option>
                <option value="buzz">Buzz / Clean</option>
              </select>
            </div>
            <div class="ctrl-lbl"><span>Hair Color</span></div>
            <div id="sw-hair" class="swatches"></div>
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Facial Hair</span></div>
              <select id="sel-beardStyle" class="bio-lockable">
                <option value="clean">Clean Shaven</option>
                <option value="stubble">Tactical Stubble</option>
                <option value="goatee">Goatee</option>
                <option value="full">Full Beard</option>
              </select>
            </div>
            <label class="chk-row"><input id="chk-grayStreak" type="checkbox" /> <span>Enable Gray Hair Streak</span></label>
            <div id="pad-streak" class="pad-2d"><div id="dot-streak" class="pad-dot"></div></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Streak Angle / Width</span></div><input id="rng-streakAngle" type="range" min="-3.14" max="3.14" step="0.05" /><input id="rng-streakWidth" type="range" min="0.05" max="0.40" step="0.02" /></div>
            <div class="ctrl-lbl"><span>Nail Polish (Default: None)</span></div>
            <div id="sw-nail" class="swatches"></div>
          </div>
        </details>

        <details class="sub-drawer">
          <summary>Piercings (Default: None)</summary>
          <div class="sub-body">
            <label class="chk-row"><input id="chk-piercing-brow" type="checkbox" /> <span>Eyebrow Studs</span></label>
            <label class="chk-row"><input id="chk-piercing-nostril" type="checkbox" /> <span>Nostril Stud</span></label>
            <label class="chk-row"><input id="chk-piercing-lip" type="checkbox" /> <span>Labret / Lip Stud</span></label>
            <label class="chk-row"><input id="chk-piercing-ears" type="checkbox" /> <span>Dual Ear Studs</span></label>
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Metal Finish</span></div>
              <select id="sel-piercingMetal">
                <option value="silver">Brushed Silver</option>
                <option value="gold">Warm Gold</option>
                <option value="obsidian">Dark Obsidian</option>
              </select>
            </div>
            <label class="chk-row"><input id="chk-piercing-glow" type="checkbox" /> <span>Glowing Cyber Piercing Nodes</span></label>
            <div class="ctrl-lbl"><span>Cyber Node Color</span></div>
            <div id="sw-pierceCol" class="swatches"></div>
          </div>
        </details>

        <details class="sub-drawer">
          <summary>Sci-Fi Scars &amp; Tattoos (Default: None)</summary>
          <div class="sub-body">
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Sci-Fi Scar Style</span></div>
              <select id="sel-scarType" class="bio-lockable">
                <option value="none">None</option>
                <option value="slash">Blade Slash</option>
                <option value="triple_puncture">Triple Neural Puncture Ports</option>
                <option value="claw">Triple Claw / Shrapnel Laceration</option>
                <option value="plasma_burn">Plasma Scorch Mark</option>
              </select>
            </div>
            <div class="ctrl-lbl"><span>Drag Scar Anchor across Face UV</span></div>
            <div id="pad-scar" class="pad-2d"><div id="dot-scar" class="pad-dot"></div></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Cybernetic Facial Seams</span><span id="val-cyberFace">0</span></div><input id="rng-cyberFace" type="range" min="0" max="1" step="0.05" /></div>

            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Tattoo Pattern</span></div>
              <select id="sel-tattooStyle">
                <option value="none">None</option>
                <option value="circuit">Cyber-Circuit Trace</option>
                <option value="tribal">Geometric / Tribal</option>
                <option value="wing">Wing Crest</option>
              </select>
            </div>
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Tattoo Placement</span></div>
              <select id="sel-tattooZone">
                <option value="arm_l">Left Upper Arm</option>
                <option value="arm_r">Right Upper Arm</option>
                <option value="forearm_l">Left Forearm</option>
                <option value="chest">Chest</option>
                <option value="neck">Neck</option>
                <option value="face">Face / Cheek</option>
              </select>
            </div>
            <label class="chk-row"><input id="chk-tattooGlow" type="checkbox" /> <span>Glowing Cyber Tattoo Ink</span></label>
            <div class="ctrl-lbl"><span>Tattoo Ink Color</span></div>
            <div id="sw-tattoo" class="swatches"></div>
          </div>
        </details>
      </div>

      <!-- TAB 2: BODY, SKELETON & CYBERNETICS -->
      <div class="tab-panel" data-panel="body">
        <div class="sec-card">
          <div class="sec-title">Physique Morphs</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Muscle Mass</span><span id="val-muscle">0</span></div><input id="rng-muscle" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Body Weight</span><span id="val-weight">0</span></div><input id="rng-weight" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Stature / Height</span><span id="val-height">0</span></div><input id="rng-height" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
        </div>

        <div id="card-bust-controls" class="sec-card" style="display:none;">
          <div class="sec-title">Bust Shape Pad &amp; Spring Physics</div>
          <div class="ctrl-lbl"><span>2D Bust Archetype Quad (Drag Corner Blend)</span></div>
          <div id="pad-bust" class="pad-2d" style="height:108px;">
            <span class="pad-corner" style="top:0;left:0;">Teardrop</span>
            <span class="pad-corner" style="top:0;right:0;">Full Round</span>
            <span class="pad-corner" style="bottom:0;left:0;">Petite Athletic</span>
            <span class="pad-corner" style="bottom:0;right:0;">Wide Heavy</span>
            <div id="dot-bust" class="pad-dot"></div>
          </div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Bust Volume</span><span id="val-bustSize">0</span></div><input id="rng-bustSize" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Firmness / Spring Damping</span><span id="val-bustFirmness">0</span></div><input id="rng-bustFirmness" class="bio-lockable" type="range" min="0" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Vertical Set</span><span id="val-bustHeight">0</span></div><input id="rng-bustHeight" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Horizontal Spacing</span><span id="val-bustSpacing">0</span></div><input id="rng-bustSpacing" class="bio-lockable" type="range" min="-1" max="1" step="0.05" /></div>
        </div>

        <div class="sec-card">
          <div class="sec-title">Humanoid Skeleton, Android &amp; Per-Part Cybernetics</div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Chassis Mode</span></div>
            <select id="sel-chassisMode">
              <option value="humanoid">Organic Humanoid (Mix Cybernetics Below)</option>
              <option value="android">Full Android Endoskeleton</option>
              <option value="skeleton">Articulated Skeleton Chassis</option>
            </select>
          </div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Endoskeleton Material</span></div>
            <select id="sel-skelStyle">
              <option value="titanium">Industrial Titanium Alloy</option>
              <option value="carbon">Stealth Carbon Endoskeleton</option>
              <option value="bone">Ivory Bio-Bone Frame</option>
            </select>
          </div>
          <div class="part-grid">
            <div class="part-cell"><span class="ctrl-lbl">Head / Ocular</span><select id="sel-part-head"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
            <div class="part-cell"><span class="ctrl-lbl">Torso Core</span><select id="sel-part-torso"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
            <div class="part-cell"><span class="ctrl-lbl">Left Arm</span><select id="sel-part-armL"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
            <div class="part-cell"><span class="ctrl-lbl">Right Arm</span><select id="sel-part-armR"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
            <div class="part-cell"><span class="ctrl-lbl">Left Leg</span><select id="sel-part-legL"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
            <div class="part-cell"><span class="ctrl-lbl">Right Leg</span><select id="sel-part-legR"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>
          </div>
        </div>

        <details class="sub-drawer">
          <summary>Skeleton Proportions (8 Frame Sliders)</summary>
          <div class="sub-body">
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Skull / Head Scale</span><span id="val-skel-headSize">0</span></div><input id="rng-skel-headSize" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Shoulder Span</span><span id="val-skel-shoulderWidth">0</span></div><input id="rng-skel-shoulderWidth" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Ribcage / Torso Width</span><span id="val-skel-torsoWidth">0</span></div><input id="rng-skel-torsoWidth" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Arm Segment Length</span><span id="val-skel-armLength">0</span></div><input id="rng-skel-armLength" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Pelvis / Hip Span</span><span id="val-skel-hipWidth">0</span></div><input id="rng-skel-hipWidth" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Leg Length</span><span id="val-skel-legLength">0</span></div><input id="rng-skel-legLength" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Calf Thickness</span><span id="val-skel-calfBulk">0</span></div><input id="rng-skel-calfBulk" type="range" min="-0.8" max="0.8" step="0.05" /></div>
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Foot Frame Scale</span><span id="val-skel-footSize">0</span></div><input id="rng-skel-footSize" type="range" min="-0.8" max="0.8" step="0.05" /></div>
          </div>
        </details>
      </div>

      <!-- TAB 3: CAPTAIN'S QUARTERS MIRROR & UNDERWEAR -->
      <div class="tab-panel" data-panel="quarters">
        <div class="sec-card">
          <div class="sec-title">Captain's Quarters // Metallic Mirror Bay</div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Cabin Attire Layer</span></div>
            <select id="sel-outfit">
              <option value="underwear">Underwear / Cabin Mirror Base</option>
              <option value="jacket">Tactical Field Jacket</option>
              <option value="hoodie">Recon Hoodie</option>
              <option value="tee">Combat T-Shirt</option>
              <option value="armor">Composite Trauma Armor</option>
            </select>
          </div>
          <div id="wrap-uw-male" class="ctrl-row">
            <div class="ctrl-lbl"><span>Compression Boxers Style</span></div>
            <select id="sel-uwMale">
              <option value="boxers_charcoal">Dark Tactical Boxers</option>
              <option value="boxers_olive">Olive Compression Boxers</option>
              <option value="classic">Slate Briefs</option>
            </select>
          </div>
          <div id="wrap-uw-female" class="ctrl-row" style="display:none;gap:8px;flex-direction:column;">
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Bra Design (Realistic Support &amp; Upper Plump)</span></div>
              <select id="sel-underwearBra">
                <option value="sport">Sport Tactical Band</option>
                <option value="lace_delicate">Delicate Lace Filigree</option>
                <option value="sheer_mesh">Sheer Mesh (See-Through Trim)</option>
                <option value="strappy">Strappy Cyber Trim</option>
                <option value="none">None (Unbra'd)</option>
              </select>
            </div>
            <div class="ctrl-row">
              <div class="ctrl-lbl"><span>Bottoms Cut</span></div>
              <select id="sel-underwearBottom">
                <option value="panties_classic">Classic Brief</option>
                <option value="panties_lace">Delicate Lace Cut</option>
                <option value="panties_sheer">Sheer Mesh Cut</option>
                <option value="boxers_fem">Tactical Boyshort Boxers</option>
              </select>
            </div>
          </div>
          <div class="ctrl-lbl"><span>Underwear Fabric Color</span></div>
          <div id="sw-uwCol" class="swatches"></div>
        </div>
      </div>

      <!-- TAB 4: GEAR & LOCK-IN -->
      <div class="tab-panel" data-panel="gear">
        <div class="sec-card">
          <div class="sec-title">Identity, Armor &amp; Helmet Visors</div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Operator Callsign</span></div><input id="inp-callsign" type="text" maxlength="14" /></div>
          <div class="ctrl-lbl"><span>Quick Loadout Swap</span></div>
          <div class="btn-row">
            <button type="button" class="ev-btn" data-outfit-quick="jacket">Jacket</button>
            <button type="button" class="ev-btn" data-outfit-quick="hoodie">Hoodie</button>
            <button type="button" class="ev-btn" data-outfit-quick="tee">Tee</button>
            <button type="button" class="ev-btn" data-outfit-quick="armor">Armor</button>
            <button type="button" class="ev-btn" data-outfit-quick="underwear">Underwear</button>
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

        <div class="sec-card">
          <div class="sec-title">Continuum Manifest Lock &amp; Cybernetics Expert</div>
          <div id="lock-lore-banner" class="lore-box">OPEN BIO-FORGE</div>
          <button type="button" id="btn-lock-appearance" class="ev-btn warn">Finalize &amp; Lock Biological Appearance</button>
          <button type="button" id="btn-cyber-expert" class="ev-btn" style="display:none;">Consult Cybernetics Expert</button>
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

      <!-- TAB 6: DRONE-ANGLE CQB & KINEMATICS -->
      <div class="tab-panel" data-panel="action">
        <div class="sec-card">
          <div class="sec-title">Sector 4 Ore Depot // Drone-Angle CQB</div>
          <div class="ctrl-lbl"><span>Corner Slicing ("Slicing the Pie") &amp; Outside-Foot Plant</span></div>
          <div class="btn-row">
            <button type="button" class="ev-btn" data-peek="pie_left">Pie Left Corner</button>
            <button type="button" class="ev-btn active" data-peek="center">Hold Center</button>
            <button type="button" class="ev-btn" data-peek="pie_right">Pie Right Corner</button>
          </div>
          <div class="ctrl-row">
            <div class="ctrl-lbl"><span>Entry Pace &amp; Lean Angle</span></div>
            <select id="sel-cqbSpeed">
              <option value="slow">Deliberate Slow Pie (Tight Lean, Eyes/Muzzle First)</option>
              <option value="fast">Dynamic Fast Breach (Deep Lean + Momentum)</option>
            </select>
          </div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Operator Aim Skill</span><span id="val-aimSkill">0.85</span></div><input id="rng-aimSkill" type="range" min="0.15" max="0.98" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Pelvis Stride Yaw</span><span id="val-strideYaw">0</span></div><input id="rng-strideYaw" type="range" min="-1.5" max="1.5" step="0.05" /></div>
          <div class="ctrl-row"><div class="ctrl-lbl"><span>Upper-Body Aim Yaw</span><span id="val-aimYaw">0</span></div><input id="rng-aimYaw" type="range" min="-1.5" max="1.5" step="0.05" /></div>
          <label class="chk-row"><input id="chk-cqbMoving" type="checkbox" /> <span>Toggle Tactical Walk / Pie Strafe</span></label>
          <label class="chk-row"><input id="chk-firing" type="checkbox" /> <span>Fire Cycle (Shows Cyber-Arm vs Organic Torso Torque!)</span></label>
          <label class="chk-row"><input id="chk-suppressed" type="checkbox" /> <span>Incoming Suppression Flinch</span></label>
          <label class="chk-row"><input id="chk-injuredLeg" type="checkbox" /> <span>Right Leg Trauma (Asymmetric Limp)</span></label>
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
