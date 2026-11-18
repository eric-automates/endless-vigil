/**
 * @shard HUB
 * @branch-id FORGE-002 / FORGE-003 / FORGE-004 / FORGE-005
 * @state-contract reads(EVGPUEngine state surface, localStorage ev_operator_forge_v07)
 *                 mutates(appearance: gender/age/morphs/colors/kit, view: camZoom/camPan/camPitch,
 *                         draft: touched/undo/redo/stageFocus, manifest: appearanceLocked)
 * @invariant Every visible control maps to a real EVGPUEngine state key (no dead sliders);
 *            the operator stays centered on every step change; appearance lock still disables
 *            every .bio-lockable control; zero network assets; zero inline script-tag literals.
 * @ip-note Original "Vigil Atelier" interface system: original copy, CSS, inline SVG and layout.
 *          No third-party UI kit, font, icon set, or copied screen composition.
 */
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
    beardHex: '#2a1f1a',
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
    hairStyle: 'short01',
    grayStreak: { enabled: false, x: 0.34, y: 0.44, angle: 0.42, width: 0.18 },
    equipRiflePreview: false,
    missionAccepted: true,
    shipSeed: 1,
    randomSeq: 0,
    appearanceLocked: false,
    cyberExpertActive: false,
    turntableYaw: 0.18,
    camPitch: 0.0,
    camZoom: 1.42,
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
    showCornerPortrait: true,
    frameMode: 'auto',
    stageFocus: false,
    touched: {}
  };

  /* @invariant New session keys always hydrate from defaults, so old v0.7 drafts never boot with undefined traits. */
  function deepCopyDefault(){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
  function hydrate(parsed){
    var base = deepCopyDefault();
    if (!parsed || typeof parsed !== 'object') return base;
    Object.assign(base, parsed);
    base.piercings   = Object.assign({}, DEFAULT_STATE.piercings,   parsed.piercings   || {});
    base.bodyParts   = Object.assign({}, DEFAULT_STATE.bodyParts,   parsed.bodyParts   || {});
    base.skelProps   = Object.assign({}, DEFAULT_STATE.skelProps,   parsed.skelProps   || {});
    base.bustQuad    = Object.assign({}, DEFAULT_STATE.bustQuad,    parsed.bustQuad    || {});
    base.scarPos     = Object.assign({}, DEFAULT_STATE.scarPos,     parsed.scarPos     || {});
    base.grayStreak  = Object.assign({}, DEFAULT_STATE.grayStreak,  parsed.grayStreak  || {});
    base.touched     = Object.assign({}, parsed.touched || {});
    return base;
  }
  function loadSavedState(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return hydrate(raw ? JSON.parse(raw) : null);
    } catch (_e){ return deepCopyDefault(); }
  }

  var state = loadSavedState();
  function persistLocal(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_e){}
  }

  function $(id){ return document.getElementById(id); }
  function all(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function num(v){ return Number(v).toFixed(2); }

  var SKIN_SWATCHES = ['#f5d9cb','#edc2ad','#dfb197','#cf9170','#be7f5d','#a46343','#8d5538','#6f422b','#54311f','#3a2115','#8b99a6','#3b454e'];
  var EYE_SWATCHES  = ['#3aa7d6','#44b89a','#c89b3c','#7a6652','#92a6b8','#ff6a33'];
  var HAIR_SWATCHES = ['#1a1614','#2a1f1a','#4e3424','#8c5230','#c49a52','#aeb7be','#b4384e','#2894b8'];
  var SUIT_SWATCHES = ['#4d5d54','#2c3b47','#3a3f47','#5e4a38','#6e2b2b','#222830'];
  var NAIL_SWATCHES = ['none','#181a1f','#7a1c28','#d45b72','#c98c44','#1398b8','#d8e0e8'];
  var TAT_SWATCHES  = ['#131d28','#2f1e3a','#00e5ff','#ff8c3a','#e03a68','#44f29a'];
  var UW_SWATCHES   = ['#1e242c','#2e3c34','#4a1d28','#0d0f14','#6c584c','#c9d2db'];

  var STEP_ORDER = ['face','body','quarters','gear','ramp','action'];
  var STEP_META = {
    face:     { no: '01', label: 'Identity & Face',   short: 'Face',     group: 'CREATE',  hint: 'Start with the face. Every adjustment is live.' },
    body:     { no: '02', label: 'Physique & Frame',  short: 'Physique', group: 'CREATE',  hint: 'Shape a silhouette that feels like you.' },
    quarters: { no: '03', label: 'Wardrobe',          short: 'Wardrobe', group: 'CREATE',  hint: 'Choose textures and layers in the mirror bay.' },
    gear:     { no: '04', label: 'Gear & Manifest',   short: 'Gear',     group: 'CREATE',  hint: 'Seal the details into your Continuum Manifest.' },
    ramp:     { no: '05', label: 'Hangar Ramp',       short: 'Ramp',     group: 'PREVIEW', hint: 'See your operator board the EV-74 Kestrel.' },
    action:   { no: '06', label: 'Action Stage',      short: 'Action',   group: 'PREVIEW', hint: 'Inspect the silhouette in motion.' }
  };
  var REFINEMENT_KEYS = [
    'gender','age','skinHex','skinFinish','eyeHex','expression','blink','hairStyle','hairHex','beardStyle','beardHex',
    'noseWidth','jawWidth','cheekbones','lipSize','muscle','weight','height','chassisMode','outfit','suitTint',
    'helmetMode','wristDevice','tattooStyle','scarType'
  ];

  var canvas = $('viewport3d');
  var portraitHud = $('corner-portrait-hud');
  var portraitTag = $('portrait-mode-tag');
  var fadeOverlay = $('cinema-fade');
  var telemetryEl = $('hud-telemetry');
  var backendBadge = $('backend-badge');
  var d1StatusEl = $('d1-save-status');

  /* @invariant Render scale stays uniform on both axes, so the framing math in EVGPUEngine never drifts. */
  function syncCanvasSize(){
    var parent = canvas.parentElement;
    if (!parent) return;
    var rect = parent.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.max(300, Math.round(rect.width * dpr));
    var ph = Math.max(220, Math.round(rect.height * dpr));
    if (canvas.width !== pw || canvas.height !== ph){ canvas.width = pw; canvas.height = ph; }
    var cssBox = Math.max(88, Math.min(118, Math.round(rect.width * 0.20)));
    var cssOff = 10;
    state.portraitBoxPx = Math.round(cssBox * dpr);
    state.portraitOffPx = Math.round(cssOff * dpr);
    portraitHud.style.width = cssBox + 'px';
    portraitHud.style.height = cssBox + 'px';
    portraitHud.style.left = cssOff + 'px';
    portraitHud.style.bottom = cssOff + 'px';
  }
  window.addEventListener('resize', syncCanvasSize);
  if (window.visualViewport && window.visualViewport.addEventListener){
    window.visualViewport.addEventListener('resize', syncCanvasSize);
  }

  /* ---------- Draft history, refinement progress & quiet confirmations ---------- */
  var undoStack = [], redoStack = [];
  var lastUndoKey = '', lastUndoAt = 0;
  function snapshot(){ return JSON.stringify(state); }
  function pushUndo(){
    undoStack.push(snapshot());
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }
  /* @invariant One slider drag produces one undo entry, not forty. */
  function noteChange(key){
    var now = Date.now();
    if (key === lastUndoKey && now - lastUndoAt < 700){ lastUndoAt = now; return; }
    pushUndo();
    lastUndoKey = key; lastUndoAt = now;
  }
  function updateHistoryButtons(){
    var u = $('btn-undo'), r = $('btn-redo');
    if (u){ u.disabled = undoStack.length === 0; u.classList.toggle('is-muted', undoStack.length === 0); }
    if (r){ r.disabled = redoStack.length === 0; r.classList.toggle('is-muted', redoStack.length === 0); }
  }
  function undo(){
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    state = hydrate(JSON.parse(undoStack.pop()));
    refreshAllControlValues();
    setTab(state.tab || 'face');
    persistLocal(); updateHistoryButtons(); queueToast('Change undone');
  }
  function redo(){
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    state = hydrate(JSON.parse(redoStack.pop()));
    refreshAllControlValues();
    setTab(state.tab || 'face');
    persistLocal(); updateHistoryButtons(); queueToast('Change restored');
  }

  function updateProgress(){
    var done = 0;
    for (var i = 0; i < REFINEMENT_KEYS.length; i++){
      if (state.touched && state.touched[REFINEMENT_KEYS[i]]) done++;
    }
    var pct = Math.round(done / REFINEMENT_KEYS.length * 100);
    var ring = $('progress-ring');
    if (ring) ring.style.strokeDashoffset = String(113 - 113 * pct / 100);
    var pctEl = $('progress-pct'); if (pctEl) pctEl.textContent = pct + '%';
    var cap = $('inspector-progress-label');
    if (cap) cap.textContent = done + ' / ' + REFINEMENT_KEYS.length + ' traits refined';
    var bar = $('progress-bar'); if (bar) bar.style.width = pct + '%';
  }
  function markTouched(prop, label){
    if (!state.touched) state.touched = {};
    state.touched[prop] = 1;
    updateProgress();
    queueToast(label || prop);
  }
  var toastTimer = null, hideTimer = null;
  function queueToast(label){
    clearTimeout(toastTimer); clearTimeout(hideTimer);
    toastTimer = setTimeout(function(){
      var t = $('ev-toast');
      if (!t) return;
      t.textContent = '✓  ' + label;
      t.classList.add('show');
      hideTimer = setTimeout(function(){ t.classList.remove('show'); }, 1700);
    }, 240);
  }

  /* ---------- Control primitives ---------- */
  function setFill(el){
    if (!el || !el.style || typeof el.style.setProperty !== 'function') return;
    var min = parseFloat(el.getAttribute('min') || '0');
    var max = parseFloat(el.getAttribute('max') || '1');
    var v = parseFloat(el.value || '0');
    var pct = clamp((v - min) / Math.max(0.0001, max - min) * 100, 0, 100);
    el.style.setProperty('--fill', pct.toFixed(1) + '%');
  }
  function bindRange(id, prop, valId, subObj, label){
    var el = $(id), vEl = valId ? $(valId) : null;
    if (!el) return;
    var cur = subObj ? state[subObj][prop] : state[prop];
    el.value = cur;
    if (vEl) vEl.textContent = num(cur);
    setFill(el);
    el.addEventListener('input', function(){
      noteChange('rng-' + id);
      var v = parseFloat(el.value);
      if (subObj) state[subObj][prop] = v; else state[prop] = v;
      if (vEl) vEl.textContent = num(v);
      setFill(el);
      if (prop === 'gender') syncGenderUI();
      if (prop === 'camZoom' || prop === 'camPitch') state.frameMode = 'free';
      markTouched(prop, label || prop);
      persistLocal();
    });
    el.addEventListener('dblclick', function(){
      var def = subObj ? DEFAULT_STATE[subObj][prop] : DEFAULT_STATE[prop];
      noteChange('reset-' + id);
      if (subObj) state[subObj][prop] = def; else state[prop] = def;
      el.value = def; if (vEl) vEl.textContent = num(def); setFill(el);
      if (prop === 'gender') syncGenderUI();
      persistLocal(); queueToast('Reset to default');
    });
  }
  function bindSelect(id, prop, subObj, label){
    var el = $(id);
    if (!el) return;
    el.value = subObj ? state[subObj][prop] : state[prop];
    el.addEventListener('change', function(){
      noteChange('sel-' + id);
      if (subObj) state[subObj][prop] = el.value; else state[prop] = el.value;
      if (prop === 'outfit') updateQuickOutfit(el.value);
      syncChipRowsFor(id, el.value);
      markTouched(prop, label || prop);
      persistLocal();
    });
  }
  function bindCheck(id, prop, subObj, label){
    var el = $(id);
    if (!el) return;
    el.checked = !!(subObj ? state[subObj][prop] : state[prop]);
    el.addEventListener('change', function(){
      noteChange('chk-' + id);
      if (subObj) state[subObj][prop] = el.checked; else state[prop] = el.checked;
      markTouched(prop, label || prop);
      persistLocal();
    });
  }
  function buildSwatches(containerId, list, prop, subObj, label){
    var wrap = $(containerId);
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
      b.title = hex;
      b.addEventListener('click', function(){
        if (b.disabled) return;
        if (isBioLocked() && (prop === 'skinHex' || prop === 'eyeHex' || prop === 'hairHex' || prop === 'beardHex' || prop === 'nailColor' || prop === 'tattooColor')) return;
        noteChange('sw-' + containerId);
        if (subObj) state[subObj][prop] = hex; else state[prop] = hex;
        Array.prototype.forEach.call(wrap.children, function(c){ c.classList.remove('active'); });
        b.classList.add('active');
        markTouched(prop, label || prop);
        persistLocal();
      });
      wrap.appendChild(b);
    });
  }
  function setup2DPad(padId, dotId, getObj, onUpdate, label){
    var pad = $(padId), dot = $(dotId);
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
      var nx = clamp(cx / Math.max(1, r.width), 0.04, 0.96);
      var ny = clamp(cy / Math.max(1, r.height), 0.04, 0.96);
      onUpdate(nx, ny);
      syncDot();
      markTouched(padId, label || padId);
      persistLocal();
    }
    pad.addEventListener('pointerdown', function(e){
      noteChange('pad-' + padId);
      dragging = true;
      try { pad.setPointerCapture(e.pointerId); } catch (_e){}
      applyEvt(e);
    });
    pad.addEventListener('pointermove', function(e){ if (dragging) applyEvt(e); });
    pad.addEventListener('pointerup', function(){ dragging = false; });
    pad.addEventListener('pointercancel', function(){ dragging = false; });
    pad._syncDot = syncDot;
  }

  /* ---------- Chip-style select rows (native select stays the canonical contract) ---------- */
  function updateChipRow(row, val){
    if (!row.querySelectorAll) return;
    Array.prototype.forEach.call(row.querySelectorAll('[data-value]'), function(b){
      var on = b.getAttribute('data-value') === val;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function syncChipRowsFor(id, val){
    all('[data-chip-for]').forEach(function(row){
      if (row.getAttribute('data-chip-for') === id) updateChipRow(row, val);
    });
  }
  function updateAllChipRows(){
    all('[data-chip-for]').forEach(function(row){
      var id = row.getAttribute('data-chip-for');
      var prop = row.getAttribute('data-prop');
      var sub = row.getAttribute('data-sub');
      var sel = $(id);
      var val = sel ? sel.value : (sub ? state[sub][prop] : state[prop]);
      updateChipRow(row, val);
    });
  }
  function bindChipRows(){
    all('[data-chip-for]').forEach(function(row){
      row.addEventListener('click', function(e){
        var btn = (e.target && e.target.closest) ? e.target.closest('[data-value]') : null;
        if (!btn || !row.contains || !row.contains(btn)) return;
        var id = row.getAttribute('data-chip-for');
        var prop = row.getAttribute('data-prop');
        var sub = row.getAttribute('data-sub');
        var val = btn.getAttribute('data-value');
        noteChange('chip-' + id);
        if (sub) state[sub][prop] = val; else state[prop] = val;
        var sel = $(id); if (sel) sel.value = val;
        updateChipRow(row, val);
        if (prop === 'outfit') updateQuickOutfit(val);
        markTouched(prop, (btn.textContent || prop).trim());
        persistLocal();
      });
    });
  }
  function updateQuickOutfit(val){
    all('[data-outfit-quick]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-outfit-quick') === val);
    });
  }

  /* ---------- Frame balance: continuous, animated, never a hard switch ---------- */
  function isBioLocked(){ return !!state.appearanceLocked && !state.cyberExpertActive; }
  var genderTweenToken = 0;
  function tweenGender(target, ms){
    var token = ++genderTweenToken;
    var start = Number(state.gender || 0);
    var t0 = Date.now();
    function step(){
      if (token !== genderTweenToken) return;
      var p = clamp((Date.now() - t0) / (ms || 420), 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      state.gender = start + (target - start) * e;
      var rng = $('rng-gender'), val = $('val-gender');
      if (rng){ rng.value = state.gender; setFill(rng); }
      if (val) val.textContent = num(state.gender);
      refreshGenderAndBustVisibility();
      if (p < 1) requestAnimationFrame(step);
      else persistLocal();
    }
    requestAnimationFrame(step);
  }
  function syncGenderUI(){
    var rng = $('rng-gender'), val = $('val-gender');
    if (rng){ rng.value = state.gender; setFill(rng); }
    if (val) val.textContent = num(state.gender);
    refreshGenderAndBustVisibility();
  }
  function applySexMode(mode, animate, label){
    if (isBioLocked()) return;
    noteChange('sexMode');
    state.sexMode = mode;
    var target = mode === 'female' ? 0.85 : (mode === 'male' ? -0.85 : 0.0);
    if (animate) tweenGender(target, 460);
    else { genderTweenToken++; state.gender = target; syncGenderUI(); }
    if (mode === 'male' && state.beardStyle === 'clean' && state.tab === 'face') state.beardStyle = 'stubble';
    else if (mode === 'female') state.beardStyle = 'clean';
    var bEl = $('sel-beardStyle'); if (bEl) bEl.value = state.beardStyle;
    all('[data-gender-preset]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-gender-preset') === mode);
      b.setAttribute('aria-pressed', b.getAttribute('data-gender-preset') === mode ? 'true' : 'false');
    });
    markTouched('gender', label || 'Body frame');
    persistLocal();
  }
  function refreshGenderAndBustVisibility(){
    var fineWrap = $('wrap-gender-finetune');
    if (fineWrap) fineWrap.classList.remove('is-collapsed');
    var bustCard = $('card-bust-controls');
    if (bustCard) bustCard.classList.toggle('is-collapsed', !(state.gender >= 0.05));
    var femUw = $('wrap-uw-female');
    if (femUw) femUw.classList.toggle('is-collapsed', !(state.gender >= 0.35));
    var maleUw = $('wrap-uw-male');
    if (maleUw) maleUw.classList.toggle('is-collapsed', !!(state.gender >= 0.35));
    all('[name="sexMode"]').forEach(function(r){ r.checked = (r.value === state.sexMode); });
    all('[data-gender-preset]').forEach(function(b){
      var on = b.getAttribute('data-gender-preset') === state.sexMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var rng = $('rng-gender'), val = $('val-gender');
    if (rng){ rng.value = state.gender; setFill(rng); }
    if (val) val.textContent = num(state.gender);
    var lbl = $('gender-balance-label');
    if (lbl) lbl.textContent = state.gender < -0.45 ? 'Masculine' : (state.gender > 0.45 ? 'Feminine' : 'Balanced');
  }

  /* @invariant Locking biological traits never locks the camera, undo, or preview stages. */
  function refreshLockUI(){
    var bioLocked = isBioLocked();
    var lockBanner = $('lock-lore-banner');
    var btnLock = $('btn-lock-appearance');
    var btnExpert = $('btn-cyber-expert');
    if (lockBanner){
      if (state.appearanceLocked && !state.cyberExpertActive){
        lockBanner.textContent = 'MANIFEST SEALED — Biological traits frozen. Synthetic dermal and limb work now requires a Cybernetics Expert.';
        lockBanner.className = 'lore-box locked';
      } else if (state.cyberExpertActive){
        lockBanner.textContent = 'EXPERT BAY OPEN — Cyber-dermal panels and modular prosthetics are available again.';
        lockBanner.className = 'lore-box expert';
      } else {
        lockBanner.textContent = 'OPEN BIO-FORGE — Refine freely. Sealing the Manifest freezes biological traits until you visit an Expert Bay.';
        lockBanner.className = 'lore-box';
      }
    }
    if (btnLock){
      btnLock.textContent = state.appearanceLocked ? 'Manifest Sealed' : 'Seal Biological Appearance';
      btnLock.classList.toggle('active', !!state.appearanceLocked);
    }
    if (btnExpert){
      btnExpert.style.display = state.appearanceLocked ? 'block' : 'none';
      btnExpert.textContent = state.cyberExpertActive ? 'Leave Expert Bay' : 'Consult Cybernetics Expert';
      btnExpert.classList.toggle('active', !!state.cyberExpertActive);
    }
    all('.bio-lockable').forEach(function(el){
      el.disabled = bioLocked;
      if (el.closest){
        var wrap = el.closest('.ctrl-row, .refine-card, .sub-body');
        if (wrap) wrap.classList.toggle('is-locked', bioLocked);
      }
    });
    var badge = $('lock-state-badge');
    if (badge) badge.textContent = state.appearanceLocked ? 'SEALED' : 'EDITABLE';
  }

  /* ---------- Camera framing: centered by default, smooth presets on demand ---------- */
  var viewTweenToken = 0;
  function refreshViewControls(){
    var z = $('rng-camZoom'), zv = $('val-camZoom');
    if (z && document.activeElement !== z){ z.value = state.camZoom; setFill(z); }
    if (zv) zv.textContent = num(state.camZoom) + '×';
    var p = $('rng-camPitch'), pv = $('val-camPitch');
    if (p && document.activeElement !== p){ p.value = state.camPitch; setFill(p); }
    if (pv) pv.textContent = num(state.camPitch);
    all('[data-frame]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-frame') === state.frameMode);
    });
  }
  /* @invariant Each step boots into a readable, centered framing instead of a cropped extreme close-up. */
  var AUTO_ZOOM = { face: 1.42, body: 1.04, quarters: 1.04, gear: 1.04, ramp: 1.0, action: 1.0 };
  function recerView(){
    state.camPanX = 0; state.camPanY = 0; state.camPitch = 0;
    state.stageOrbitYaw = 0; state.turntableYaw = 0.18;
    if (state.frameMode === 'auto') state.camZoom = AUTO_ZOOM[state.tab] || 1.15;
    refreshViewControls();
  }
  function resetView(){
    ++viewTweenToken;
    state.frameMode = 'auto';
    recerView();
    refreshViewControls();
    persistLocal();
    queueToast('Camera re-centered');
  }
  function frameTarget(kind){
    var t = state.tab;
    if (t === 'face'){
      return { panY: kind === 'head' ? 0.0 : (kind === 'torso' ? -0.16 : -0.30),
               zoom: kind === 'head' ? 0.95 : (kind === 'torso' ? 1.22 : 1.60), pitch: 0 };
    }
    if (t === 'body' || t === 'gear' || t === 'quarters'){
      return { panY: kind === 'head' ? 0.40 : (kind === 'torso' ? 0.15 : 0.0),
               zoom: kind === 'head' ? 0.72 : (kind === 'torso' ? 0.92 : 1.12), pitch: 0 };
    }
    return { panY: 0, zoom: kind === 'head' ? 0.82 : (kind === 'torso' ? 0.98 : 1.18), pitch: 0 };
  }
  function tweenView(target, ms){
    var token = ++viewTweenToken;
    var from = { panY: state.camPanY || 0, panX: state.camPanX || 0, zoom: state.camZoom || 1, pitch: state.camPitch || 0 };
    var t0 = Date.now();
    function step(){
      if (token !== viewTweenToken) return;
      var p = clamp((Date.now() - t0) / (ms || 380), 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      state.camPanY = from.panY + (target.panY - from.panY) * e;
      state.camPanX = from.panX * (1 - e);
      state.camZoom = from.zoom + (target.zoom - from.zoom) * e;
      state.camPitch = from.pitch + (target.pitch - from.pitch) * e;
      refreshViewControls();
      if (p < 1) requestAnimationFrame(step);
      else persistLocal();
    }
    requestAnimationFrame(step);
  }
  function applyFrame(kind, label){
    if (kind === 'auto'){
      resetView();
      return;
    }
    noteChange('frame-' + kind);
    state.frameMode = kind;
    tweenView(frameTarget(kind));
    refreshViewControls();
    queueToast(label || 'Framing updated');
    persistLocal();
  }

  /* ---------- Step navigation ---------- */
  var tabBtns = all('.tab-btn');
  var tabPanels = all('.tab-panel');
  function updateStepHeader(t){
    var m = STEP_META[t] || STEP_META.face;
    var set = function(id, txt){ var e = $(id); if (e) e.textContent = txt; };
    set('inspector-step-no', m.no + ' / 06');
    set('inspector-step-title', m.label);
    set('inspector-step-sub', m.hint);
    set('inspector-step-group', m.group);
    set('stage-step-label', m.label);
    set('stage-step-hint', m.hint);
    set('topbar-step', 'STEP ' + m.no + ' · ' + m.short);
    var prev = $('btn-step-prev'), next = $('btn-step-next');
    var idx = STEP_ORDER.indexOf(t);
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= STEP_ORDER.length - 1;
    all('[data-step-jump]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-step-jump') === t);
    });
    if (document.body && document.body.setAttribute) document.body.setAttribute('data-step', t);
  }
  /* @invariant Changing step always re-centers the operator; the user never has to hunt for the model. */
  function setTab(t){
    if (!STEP_META[t]) t = 'face';
    var prev = state.tab;
    state.tab = t;
    tabBtns.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === t); });
    tabPanels.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-panel') === t); });
    if (prev !== t){ ++viewTweenToken; recerView(); }
    if (t === 'quarters' && state.outfit !== 'underwear') state.outfit = 'underwear';
    if (t === 'ramp' && state.rampTimer >= 4.0) state.rampTimer = 4.0;
    updateStepHeader(t);
    refreshLockUI();
    updateAllChipRows();
    persistLocal();
    var stage = $('stage-pane');
    if (stage && prev !== t){
      stage.classList.remove('is-reframing');
      void stage.offsetWidth;
      stage.classList.add('is-reframing');
    }
    if (prev !== t) queueToast(STEP_META[t].label);
  }
  tabBtns.forEach(function(b){
    b.addEventListener('click', function(){ setTab(b.getAttribute('data-tab')); });
  });
  function stepBy(delta){
    var i = STEP_ORDER.indexOf(state.tab || 'face');
    var n = clamp(i + delta, 0, STEP_ORDER.length - 1);
    setTab(STEP_ORDER[n]);
  }

  /* ---------- Full refresh ---------- */
  function refreshAllControlValues(){
    ['gender','age','muscle','weight','height','noseWidth','noseLength','noseHeight',
     'jawWidth','chinSize','cheekbones','eyeSize','eyeSpacing','eyeTilt','lipSize',
     'mouthWidth','earSize','forehead','cyberFace','bustSize','bustFirmness','bustHeight','bustSpacing',
     'strideYaw','aimYaw','aimSkill','blink','camZoom','camPitch'].forEach(function(k){
      var el = $('rng-' + k), vEl = $('val-' + k);
      if (el){ el.value = state[k]; setFill(el); if (vEl) vEl.textContent = num(state[k]); }
    });
    ['angle','width'].forEach(function(k){
      var el = $('rng-streak' + (k === 'angle' ? 'Angle' : 'Width'));
      var vEl = $('val-streak' + (k === 'angle' ? 'Angle' : 'Width'));
      var v = state.grayStreak && state.grayStreak[k];
      if (el){ el.value = v; setFill(el); if (vEl) vEl.textContent = num(v); }
    });
    ['headSize','shoulderWidth','torsoWidth','armLength','hipWidth','legLength','calfBulk','footSize'].forEach(function(k){
      var el = $('rng-skel-' + k), vEl = $('val-skel-' + k);
      if (el){ el.value = state.skelProps[k]; setFill(el); if (vEl) vEl.textContent = num(state.skelProps[k]); }
    });
    ['skinFinish','expression','beardStyle','scarType','tattooStyle','tattooZone','chassisMode','skelStyle',
     'outfit','underwearBra','underwearBottom','wristDevice','helmetMode','hairStyle','cqbSpeed'].forEach(function(k){
      var el = $('sel-' + k); if (el) el.value = state[k];
    });
    ['head','torso','armL','armR','legL','legR'].forEach(function(pk){
      var el = $('sel-part-' + pk); if (el) el.value = state.bodyParts[pk];
    });
    var pm = $('sel-piercingMetal'); if (pm) pm.value = state.piercings.metal;
    ['brow','nostril','lip','ears','glow'].forEach(function(pk){
      var el = $('chk-piercing-' + pk); if (el) el.checked = !!state.piercings[pk];
    });
    ['tattooGlow','equipRiflePreview','cqbMoving','firing','suppressed','injuredLeg','crowd25'].forEach(function(k){
      var el = $('chk-' + k); if (el) el.checked = !!state[k];
    });
    var cs = $('inp-callsign'); if (cs) cs.value = state.callsign || 'VIGIL-01';
    var gsChk = $('chk-grayStreak'); if (gsChk) gsChk.checked = !!(state.grayStreak && state.grayStreak.enabled);
    buildSwatches('sw-skin', SKIN_SWATCHES, 'skinHex', null, 'Skin tone');
    buildSwatches('sw-eye',  EYE_SWATCHES,  'eyeHex', null, 'Iris color');
    buildSwatches('sw-hair', HAIR_SWATCHES, 'hairHex', null, 'Hair color');
    buildSwatches('sw-beard',HAIR_SWATCHES, 'beardHex', null, 'Facial hair tone');
    buildSwatches('sw-suit', SUIT_SWATCHES, 'suitTint', null, 'Suit tint');
    buildSwatches('sw-nail', NAIL_SWATCHES, 'nailColor', null, 'Nail finish');
    buildSwatches('sw-tattoo', TAT_SWATCHES, 'tattooColor', null, 'Ink color');
    buildSwatches('sw-pierceCol', TAT_SWATCHES, 'color', 'piercings', 'Node color');
    buildSwatches('sw-uwCol', UW_SWATCHES, 'underwearColor', null, 'Fabric color');
    refreshGenderAndBustVisibility();
    refreshLockUI();
    refreshViewControls();
    updateProgress();
    updateHistoryButtons();
    updateAllChipRows();
    updateQuickOutfit(state.outfit);
  }

  /* ---------- Binding every control ---------- */
  bindChipRows();
  [
    ['gender','Body frame'], ['age','Age'], ['muscle','Muscle mass'], ['weight','Body weight'], ['height','Stature'],
    ['noseWidth','Nose width'], ['noseLength','Nose length'], ['noseHeight','Nose height'],
    ['jawWidth','Jaw width'], ['chinSize','Chin size'], ['cheekbones','Cheekbones'], ['eyeSize','Eye size'],
    ['eyeSpacing','Eye spacing'], ['eyeTilt','Eye tilt'], ['lipSize','Lip fullness'], ['mouthWidth','Mouth width'],
    ['earSize','Ear size'], ['forehead','Forehead'], ['cyberFace','Cyber seams'], ['bustSize','Bust volume'],
    ['bustFirmness','Firmness'], ['bustHeight','Vertical set'], ['bustSpacing','Spacing'],
    ['strideYaw','Stride yaw'], ['aimYaw','Aim yaw'], ['aimSkill','Aim skill'], ['blink','Eye closure'],
    ['camZoom','Framing zoom'], ['camPitch','Camera height']
  ].forEach(function(pair){ bindRange('rng-' + pair[0], pair[0], 'val-' + pair[0], null, pair[1]); });
  bindRange('rng-streakAngle', 'angle', 'val-streakAngle', 'grayStreak', 'Streak angle');
  bindRange('rng-streakWidth', 'width', 'val-streakWidth', 'grayStreak', 'Streak width');
  ['headSize','shoulderWidth','torsoWidth','armLength','hipWidth','legLength','calfBulk','footSize'].forEach(function(k){
    bindRange('rng-skel-' + k, k, 'val-skel-' + k, 'skelProps', 'Skeleton proportion');
  });
  ['skinFinish','expression','beardStyle','scarType','tattooStyle','tattooZone','chassisMode','skelStyle',
   'outfit','underwearBra','underwearBottom','wristDevice','helmetMode','hairStyle','cqbSpeed'].forEach(function(k){
    bindSelect('sel-' + k, k, null, k);
  });
  var selUwMale = $('sel-uwMale');
  if (selUwMale){
    selUwMale.value = state.underwearBottom || 'boxers_charcoal';
    selUwMale.addEventListener('change', function(){
      noteChange('sel-uwMale'); state.underwearBottom = selUwMale.value;
      markTouched('underwearBottom', 'Compression fit'); persistLocal();
    });
  }
  ['head','torso','armL','armR','legL','legR'].forEach(function(pk){ bindSelect('sel-part-' + pk, pk, 'bodyParts', 'Chassis part'); });
  bindSelect('sel-piercingMetal', 'metal', 'piercings', 'Piercing metal');
  ['brow','nostril','lip','ears','glow'].forEach(function(pk){ bindCheck('chk-piercing-' + pk, pk, 'piercings', 'Piercing'); });
  ['tattooGlow','equipRiflePreview','cqbMoving','firing','suppressed','injuredLeg','crowd25'].forEach(function(k){
    bindCheck('chk-' + k, k, null, k);
  });

  var callsignInp = $('inp-callsign');
  if (callsignInp){
    callsignInp.value = state.callsign;
    callsignInp.addEventListener('input', function(){
      noteChange('callsign');
      state.callsign = callsignInp.value.toUpperCase() || 'VIGIL-01';
      markTouched('callsign', 'Callsign');
      persistLocal();
    });
  }

  setup2DPad('pad-scar', 'dot-scar', function(){ return state.scarPos || { x: 0.5, y: 0.5 }; }, function(x, y){
    state.scarPos = { x: x, y: y, enabled: true };
    if (state.scarType === 'none'){
      state.scarType = 'slash';
      var st = $('sel-scarType'); if (st) st.value = 'slash';
      syncChipRowsFor('sel-scarType', 'slash');
    }
  }, 'Scar placement');
  setup2DPad('pad-streak', 'dot-streak', function(){ return state.grayStreak || { x: 0.35, y: 0.45 }; }, function(x, y){
    state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: true, x: x, y: y });
    var c = $('chk-grayStreak'); if (c) c.checked = true;
  }, 'Gray streak placement');
  setup2DPad('pad-bust', 'dot-bust', function(){
    return { x: ((state.bustQuad.x || 0) + 1) * 0.5, y: (1 - (state.bustQuad.y || 0)) * 0.5 };
  }, function(nx, ny){ state.bustQuad = { x: nx * 2 - 1, y: (1 - ny) * 2 - 1 }; }, 'Bust archetype');

  var gsCheck = $('chk-grayStreak');
  if (gsCheck){
    gsCheck.checked = !!(state.grayStreak && state.grayStreak.enabled);
    gsCheck.addEventListener('change', function(){
      noteChange('chk-grayStreak');
      state.grayStreak = Object.assign({}, state.grayStreak || {}, { enabled: gsCheck.checked });
      markTouched('grayStreak', 'Gray streak'); persistLocal();
    });
  }

  /* Hidden radios remain the canonical sexMode contract for tooling and keyboard users. */
  all('[name="sexMode"]').forEach(function(r){
    r.addEventListener('change', function(){
      if (!r.checked) return;
      applySexMode(r.value, false, 'Body frame');
    });
  });
  all('[data-gender-preset]').forEach(function(b){
    b.addEventListener('click', function(){
      applySexMode(b.getAttribute('data-gender-preset'), true, (b.textContent || 'Body frame').trim());
    });
  });
  all('[data-frame]').forEach(function(b){
    b.addEventListener('click', function(){
      applyFrame(b.getAttribute('data-frame'), (b.textContent || 'Framing').trim());
    });
  });
  all('[data-step-jump]').forEach(function(b){
    b.addEventListener('click', function(){ setTab(b.getAttribute('data-step-jump')); });
  });

  /* ---------- Archetypes, deterministic surprise, manifest lock ---------- */
  var PRESETS = {
    vanguard: { sexMode:'male',   gender:-0.85, muscle:0.80, weight:0.50, height:0.65, outfit:'armor',       helmetMode:'half',   hairStyle:'short',    beardStyle:'stubble',  chassisMode:'humanoid', suitTint:'#4d5d54' },
    recon:    { sexMode:'female', gender: 0.85, muscle:0.45, weight:0.32, height:0.48, outfit:'jacket',      helmetMode:'open',   hairStyle:'ponytail', beardStyle:'clean',    chassisMode:'humanoid', bodyParts:{head:'organic',torso:'organic',armL:'cyber',armR:'organic',legL:'organic',legR:'organic'}, suitTint:'#2c3b47' },
    heavy:    { sexMode:'male',   gender:-0.95, muscle:0.95, weight:0.75, height:0.82, outfit:'armor',       helmetMode:'sealed', hairStyle:'short01',  beardStyle:'long',     chassisMode:'humanoid', bodyParts:{head:'organic',torso:'cyber',armL:'cyber',armR:'cyber',legL:'organic',legR:'organic'}, suitTint:'#5e4a38' },
    android:  { sexMode:'female', gender: 0.72, muscle:0.55, weight:0.36, height:0.58, outfit:'cyborg_suit', helmetMode:'none',   hairStyle:'bob',      beardStyle:'clean',    chassisMode:'android',  skinFinish:'android', skelStyle:'titanium', bodyParts:{head:'skeleton',torso:'skeleton',armL:'skeleton',armR:'skeleton',legL:'skeleton',legR:'skeleton'} }
  };
  all('[data-preset]').forEach(function(btn){
    btn.addEventListener('click', function(){
      if (isBioLocked()) return;
      var p = PRESETS[btn.getAttribute('data-preset')];
      if (!p) return;
      pushUndo();
      Object.assign(state, p);
      if (p.bodyParts) state.bodyParts = Object.assign({}, p.bodyParts);
      refreshAllControlValues();
      persistLocal();
      queueToast((btn.textContent || 'Archetype').trim() + ' loaded');
    });
  });
  /* @invariant Deterministic seeded variation replaces Math.random in this UI (project PRNG standard). */
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var randBtn = $('btn-randomize');
  if (randBtn){
    randBtn.addEventListener('click', function(){
      if (isBioLocked()) return;
      pushUndo();
      var seed = (Number(state.shipSeed || 1) * 7919) + (Number(state.randomSeq || 0) * 104729) + 17;
      state.randomSeq = (Number(state.randomSeq || 0) + 1) % 9973;
      var rnd = mulberry32(seed);
      var r = function(a, b){ return a + rnd() * (b - a); };
      var pick = function(arr){ return arr[Math.floor(rnd() * arr.length)]; };
      state.sexMode = rnd() > 0.5 ? 'female' : 'male';
      state.gender = state.sexMode === 'female' ? 0.85 : -0.85;
      state.muscle = r(0.25, 0.9); state.weight = r(0.25, 0.7); state.height = r(0.2, 0.85);
      state.age = r(0.05, 0.62);
      state.noseWidth = r(-0.6, 0.6); state.jawWidth = r(-0.6, 0.6); state.cheekbones = r(-0.5, 0.6);
      state.skinHex = SKIN_SWATCHES[Math.floor(rnd() * 10)];
      state.eyeHex = pick(EYE_SWATCHES); state.hairHex = pick(HAIR_SWATCHES);
      state.beardHex = state.hairHex; state.suitTint = pick(SUIT_SWATCHES);
      state.hairStyle = pick(['short01','short','sleek','messy','shaggy','bob','long','ponytail','braids','afro','buzz']);
      state.beardStyle = state.gender > 0.1 ? 'clean' : pick(['clean','stubble','painted_short','goatee','short_3d','long','moustache']);
      refreshAllControlValues();
      persistLocal();
      queueToast('Fresh draft generated');
    });
  }

  var btnLock = $('btn-lock-appearance');
  if (btnLock){
    btnLock.addEventListener('click', function(){
      if (!state.appearanceLocked){
        pushUndo();
        state.appearanceLocked = true; state.cyberExpertActive = false;
        refreshLockUI(); persistLocal(); queueToast('Manifest sealed');
      }
    });
  }
  var btnExpert = $('btn-cyber-expert');
  if (btnExpert){
    btnExpert.addEventListener('click', function(){
      pushUndo();
      state.cyberExpertActive = !state.cyberExpertActive;
      if (state.cyberExpertActive && state.skinFinish === 'matte'){
        state.skinFinish = 'android';
        var sf = $('sel-skinFinish'); if (sf) sf.value = 'android';
        syncChipRowsFor('sel-skinFinish', 'android');
      }
      refreshLockUI(); persistLocal();
    });
  }

  var btnReplay = $('btn-replay-ramp'); if (btnReplay) btnReplay.addEventListener('click', function(){ state.rampTimer = 0.0; setTab('ramp'); });
  var btnSeated = $('btn-jump-seated'); if (btnSeated) btnSeated.addEventListener('click', function(){ state.rampTimer = 4.0; setTab('ramp'); });
  var btnAccept = $('btn-mission-accept'); if (btnAccept) btnAccept.addEventListener('click', function(){ state.missionAccepted = true; persistLocal(); });
  var btnDecline = $('btn-mission-decline'); if (btnDecline) btnDecline.addEventListener('click', function(){ state.missionAccepted = false; persistLocal(); });
  var btnShipSeed = $('btn-ship-seed'); if (btnShipSeed) btnShipSeed.addEventListener('click', function(){ state.shipSeed = (state.shipSeed + 1) % 4; persistLocal(); });

  all('[data-peek]').forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.getAttribute('data-peek');
      noteChange('peek'); state.peek = k; state.cqbMode = k;
      all('[data-peek]').forEach(function(x){ x.classList.toggle('active', x === b); });
      markTouched('peek', 'Corner angle'); persistLocal();
    });
  });
  all('[data-outfit-quick]').forEach(function(b){
    b.addEventListener('click', function(){
      noteChange('outfit-quick');
      state.outfit = b.getAttribute('data-outfit-quick');
      var so = $('sel-outfit'); if (so) so.value = state.outfit;
      syncChipRowsFor('sel-outfit', state.outfit);
      updateQuickOutfit(state.outfit);
      markTouched('outfit', 'Loadout'); persistLocal();
    });
  });

  var btnSaveD1 = $('btn-save-d1');
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
      queueToast('Draft saved locally');
    });
  }

  /* ---------- Shell controls: focus mode, diagnostics, undo, reset ---------- */
  var btnUndo = $('btn-undo'); if (btnUndo) btnUndo.addEventListener('click', undo);
  var btnRedo = $('btn-redo'); if (btnRedo) btnRedo.addEventListener('click', redo);
  var btnPrev = $('btn-step-prev'); if (btnPrev) btnPrev.addEventListener('click', function(){ stepBy(-1); });
  var btnNext = $('btn-step-next'); if (btnNext) btnNext.addEventListener('click', function(){ stepBy(1); });
  var btnResetView = $('btn-reset-view'); if (btnResetView) btnResetView.addEventListener('click', resetView);
  var btnFocus = $('btn-stage-focus');
  if (btnFocus){
    btnFocus.addEventListener('click', function(){
      state.stageFocus = !state.stageFocus;
      if (document.body && document.body.classList) document.body.classList.toggle('stage-focus', state.stageFocus);
      btnFocus.setAttribute('aria-pressed', state.stageFocus ? 'true' : 'false');
      setTimeout(syncCanvasSize, 420);
      persistLocal();
    });
  }
  var btnDiag = $('btn-diagnostics'), diag = $('diagnostics');
  if (btnDiag && diag){
    btnDiag.addEventListener('click', function(){
      var open = !diag.classList.contains('is-open');
      diag.classList.toggle('is-open', open);
      btnDiag.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var btnResetDefault = $('btn-reset-default');
  if (btnResetDefault){
    btnResetDefault.addEventListener('click', function(){
      pushUndo();
      state = deepCopyDefault();
      refreshAllControlValues();
      setTab('face');
      persistLocal();
      queueToast('Draft reset to baseline');
    });
  }
  var btnSaveLocal = $('btn-save-local');
  if (btnSaveLocal) btnSaveLocal.addEventListener('click', function(){ persistLocal(); queueToast('Draft saved locally'); });

  /* Keyboard parity: 1-6 steps, arrows, undo/redo, re-center, focus. */
  document.addEventListener('keydown', function(e){
    var tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y'){ e.preventDefault(); redo(); return; }
    if (e.key >= '1' && e.key <= '6'){ setTab(STEP_ORDER[Number(e.key) - 1]); return; }
    if (e.key === 'ArrowRight'){ stepBy(1); return; }
    if (e.key === 'ArrowLeft'){ stepBy(-1); return; }
    if (e.key === 'r' || e.key === 'R'){ resetView(); return; }
    if (e.key === 'f' || e.key === 'F'){ if (btnFocus) btnFocus.click(); }
  });

  /* Purge only this origin's caches (never touches other sites or saved logins). */
  async function purgeSiteCacheAndReload(){
    var btn = $('btn-purge-cache');
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
      try { localStorage.removeItem('ev_operator_forge_v06'); localStorage.removeItem(STORAGE_KEY); } catch (_ls){}
      if (typeof fetch === 'function' && window.location && /^https?:/.test(window.location.protocol || '')){
        await fetch(window.location.pathname, {
          cache: 'reload',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        }).catch(function(){});
      }
    } catch (_e){}
    try {
      var base = (window.location.href || '').split('?')[0].split('#')[0];
      window.location.replace(base + '?ev_bust=' + Date.now());
    } catch (_e2){ if (window.location.reload) window.location.reload(); }
  }
  var btnPurgeCache = $('btn-purge-cache');
  if (btnPurgeCache) btnPurgeCache.addEventListener('click', purgeSiteCacheAndReload);

  var forceMode = '';
  try {
    var qs = (window.location && window.location.search) || '';
    if (qs.indexOf('backend=webgl2') !== -1 || localStorage.getItem('ev_force_webgl2') === '1') forceMode = 'webgl2';
  } catch (_e){}
  var btnToggleBackend = $('btn-toggle-backend');
  if (btnToggleBackend){
    btnToggleBackend.textContent = forceMode === 'webgl2' ? 'Mode: WebGL2' : 'Mode: Auto';
    btnToggleBackend.addEventListener('click', function(){
      try { localStorage.setItem('ev_force_webgl2', forceMode === 'webgl2' ? '0' : '1'); } catch (_e){}
      var base = (window.location.href || '').split('?')[0].split('#')[0];
      window.location.replace(base + '?backend=' + (forceMode === 'webgl2' ? 'auto' : 'webgl2') + '&ev_bust=' + Date.now());
    });
  }

  /* ---------- Gestures ---------- */
  var activePts = new Map();
  var lastPinchDist = 0, lastMid = null, lastTapMs = 0;
  function applyOrbitDelta(dx, dy, shiftHeld){
    if (shiftHeld){
      var z = state.camZoom || 1.0;
      state.camPanX = clamp((state.camPanX || 0) - dx * 0.0020 * z, -0.85, 0.85);
      state.camPanY = clamp((state.camPanY || 0) + dy * 0.0020 * z, -0.85, 0.85);
      state.frameMode = 'free';
      return;
    }
    if (state.tab === 'action'){
      state.aimYaw = clamp((state.aimYaw || 0) + dx * 0.008, -1.4, 1.4);
      var ay = $('rng-aimYaw'); if (ay){ ay.value = state.aimYaw; setFill(ay); }
    } else if (state.tab === 'ramp' || state.tab === 'quarters'){
      state.stageOrbitYaw = (state.stageOrbitYaw || 0) + dx * 0.009;
    } else {
      state.turntableYaw = (state.turntableYaw || 0) + dx * 0.01;
    }
    state.camPitch = clamp((state.camPitch || 0) + dy * 0.005, -0.48, 0.60);
    state.frameMode = 'free';
  }
  function attachCanvasGestures(target){
    target.addEventListener('pointerdown', function(e){
      if (e.preventDefault) e.preventDefault();
      try { target.setPointerCapture(e.pointerId); } catch (_err){}
      activePts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePts.size === 1){
        var nowMs = Date.now();
        if (nowMs - lastTapMs < 280) resetView();
        lastTapMs = nowMs; lastMid = null;
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
          state.camZoom = clamp((state.camZoom || 1.0) * (lastPinchDist / nd), 0.45, 1.85);
        }
        if (lastMid){
          var z = state.camZoom || 1.0;
          state.camPanX = clamp((state.camPanX || 0) - (mid.x - lastMid.x) * 0.0022 * z, -0.85, 0.85);
          state.camPanY = clamp((state.camPanY || 0) + (mid.y - lastMid.y) * 0.0022 * z, -0.85, 0.85);
        }
        lastPinchDist = nd; lastMid = mid;
        state.frameMode = 'free';
      }
    });
    function endPtr(e){ activePts.delete(e.pointerId); if (activePts.size < 2){ lastPinchDist = 0; lastMid = null; } }
    target.addEventListener('pointerup', endPtr);
    target.addEventListener('pointercancel', endPtr);
    target.addEventListener('contextmenu', function(e){ if (e.preventDefault) e.preventDefault(); });
    target.addEventListener('wheel', function(e){
      if (e.preventDefault) e.preventDefault();
      state.camZoom = clamp((state.camZoom || 1.0) + (e.deltaY > 0 ? 0.08 : -0.08), 0.45, 1.85);
      state.frameMode = 'free';
    }, { passive: false });
  }
  attachCanvasGestures(canvas);

  /* ---------- Boot ---------- */
  refreshAllControlValues();
  if (state.stageFocus && document.body && document.body.classList) document.body.classList.add('stage-focus');
  var bootTab = STEP_ORDER.indexOf(state.tab) >= 0 && STEP_META[state.tab].group === 'CREATE' ? state.tab : 'face';
  /* @invariant Always boot centered, even when a prior draft stored a tighter camera. */
  recerView();
  setTab(bootTab);
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
        tel.fps + ' FPS · ' + tel.drawCalls + ' DRAWS · ' + tel.tris.toLocaleString() + ' TRIS';
      var guard = $('detail-guard');
      if (guard) guard.textContent = 'LOD0 · ' + (tel.lod0Tris / 1000).toFixed(1) + 'K TRIS · SHARP AT DISTANCE';
      refreshViewControls();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }).catch(function(err){
    backendBadge.textContent = 'ENGINE INIT ERROR';
    telemetryEl.textContent = String(err && err.message || err);
  });
})();
