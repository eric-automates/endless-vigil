#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id FORGE-ASSEMBLER
 * @state-contract reads(js/ev-humanoid-kit.js, js/ev-gpu-engine.js, js/ev-forge-ui.js) mutates(operator-forge.html)
 * @invariant Emits one zero-CDN operator-forge.html with exactly one <script> and one </script> tag,
 *            flex-only overlays, min(100%, ...) grid guards, and every UI control wired to a real engine state key.
 * @ip-note "Vigil Atelier" layout, typography, and inline SVG are original clean-room work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const kitJs = fs.readFileSync(path.join(rootDir, 'js', 'ev-humanoid-kit.js'), 'utf8');
const engineJs = fs.readFileSync(path.join(rootDir, 'js', 'ev-gpu-engine.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(rootDir, 'js', 'ev-forge-ui.js'), 'utf8');

for (const [label, src] of [['kit', kitJs], ['engine', engineJs], ['ui', uiJs]]){
  if (/<\/?script/i.test(src)) throw new Error('Embedded ' + label + ' JS contains forbidden script-tag literal');
}

/* ------------------------------------------------------------------ *
 * Build-time UI markup generators (plain HTML, no runtime DOM creation)
 * ------------------------------------------------------------------ */
function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function rangeField(id, label, min, max, step, opts = {}){
  const bio = opts.bio ? ' bio-lockable' : '';
  const unit = opts.unit || '';
  const lo = opts.lo || '';
  const hi = opts.hi || '';
  const hint = opts.hint ? '<small class="ctrl-hint">' + esc(opts.hint) + '</small>' : '';
  return `<div class="ctrl-row">
    <div class="ctrl-lbl"><span>${esc(label)}</span><span class="val-pill" id="val-${id}">0.00</span></div>
    <input class="ev-range${bio}" id="rng-${id}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${esc(label)}" />
    <div class="range-scale"><span>${esc(lo)}</span><span>${esc(unit)}</span><span>${esc(hi)}</span></div>${hint}
  </div>`;
}
function chipButtons(options){
  return options.map(([v, l]) => `<button type="button" class="chip" data-value="${esc(v)}" aria-pressed="false">${esc(l)}</button>`).join('');
}
function selectField(id, label, options, opts = {}){
  const bio = opts.bio ? ' bio-lockable' : '';
  const chips = opts.chips;
  const native = `<select class="ev-select${bio}${chips ? ' is-chipped' : ''}" id="${id}" aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;
  if (!chips){
    return `<div class="ctrl-row"><div class="ctrl-lbl"><span>${esc(label)}</span></div>${native}</div>`;
  }
  return `<div class="ctrl-row"><div class="ctrl-lbl"><span>${esc(label)}</span></div>${native}
    <div class="chip-row" data-chip-for="${id}" data-prop="${esc(opts.prop || '')}"${opts.sub ? ` data-sub="${esc(opts.sub)}"` : ''}>${chipButtons(options)}</div></div>`;
}
function swatchField(id, label, desc){
  return `<div class="ctrl-row swatch-block"><div class="ctrl-lbl"><span>${esc(label)}</span></div>${desc ? `<small class="ctrl-hint">${esc(desc)}</small>` : ''}<div class="swatches" id="sw-${id}"></div></div>`;
}
function toggleField(id, label, desc){
  return `<label class="toggle-row"><input type="checkbox" id="chk-${id}" /><span class="switch"></span><span class="toggle-copy"><strong>${esc(label)}</strong><small>${esc(desc)}</small></span></label>`;
}
function padField(padId, dotId, label, corners, desc){
  const marks = corners.map(([pos, txt]) => `<span class="pad-corner" style="${esc(pos)}">${esc(txt)}</span>`).join('');
  return `<div class="ctrl-row"><div class="ctrl-lbl"><span>${esc(label)}</span></div>${desc ? `<small class="ctrl-hint">${esc(desc)}</small>` : ''}
    <div class="pad-2d" id="${padId}">${marks}<div class="pad-dot" id="${dotId}"></div></div></div>`;
}
function card(kicker, title, body, opts = {}){
  return `<section class="refine-card${opts.cls ? ' ' + opts.cls : ''}"${opts.id ? ` id="${opts.id}"` : ''}>
    <div class="refine-head"><span class="refine-kicker">${esc(kicker)}</span><h3>${esc(title)}</h3>${opts.desc ? `<p>${esc(opts.desc)}</p>` : ''}</div>
    <div class="refine-body">${body}</div></section>`;
}
function disclosure(kicker, title, body, opts = {}){
  return `<details class="disclosure"${opts.open ? ' open' : ''}><summary><span class="refine-kicker">${esc(kicker)}</span><strong>${esc(title)}</strong><span class="chev">⌄</span></summary><div class="sub-body">${body}</div></details>`;
}

const FACE_SCULPT = [
  ['noseWidth','Nose width',-1,1,0.05], ['noseLength','Nose length',-1,1,0.05], ['noseHeight','Nose bridge',-1,1,0.05],
  ['jawWidth','Jaw width',-1,1,0.05], ['chinSize','Chin projection',-1,1,0.05], ['cheekbones','Cheekbones',-1,1,0.05],
  ['eyeSize','Eye size',-1,1,0.05], ['eyeSpacing','Eye spacing',-1,1,0.05], ['eyeTilt','Eye tilt',-1,1,0.05],
  ['lipSize','Lip fullness',-1,1,0.05], ['mouthWidth','Mouth width',-1,1,0.05], ['earSize','Ear size',-1,1,0.05],
  ['forehead','Forehead height',-1,1,0.05]
].map(r => rangeField(r[0], r[1], r[2], r[3], r[4], { bio: true, lo: '−', hi: '+', hint: 'Double-click a slider to reset it.' })).join('');

const SKEL_RANGES = [
  ['headSize','Skull scale'], ['shoulderWidth','Shoulder span'], ['torsoWidth','Ribcage width'], ['armLength','Arm length'],
  ['hipWidth','Pelvis span'], ['legLength','Leg length'], ['calfBulk','Calf thickness'], ['footSize','Foot frame']
].map(r => rangeField('skel-' + r[0], r[1], -0.8, 0.8, 0.05, { lo: 'Compact', hi: 'Extended' })).join('');

const PART_SELECTS = [
  ['head','Head / ocular'], ['torso','Torso core'], ['armL','Left arm'], ['armR','Right arm'], ['legL','Left leg'], ['legR','Right leg']
].map(([k, l]) => `<div class="part-cell"><span>${esc(l)}</span><select class="ev-select" id="sel-part-${k}" aria-label="${esc(l)}"><option value="organic">Organic</option><option value="cyber">Cybernetic</option><option value="skeleton">Skeleton</option></select></div>`).join('');

function presetButton(key, label, sub, pathD){
  return `<button type="button" class="preset-card" data-preset="${key}">
    <svg viewBox="0 0 48 56" aria-hidden="true"><circle cx="24" cy="15" r="8"/><path d="${pathD}"/></svg>
    <strong>${esc(label)}</strong><small>${esc(sub)}</small></button>`;
}
const PRESET_CARDS = [
  presetButton('vanguard','Vanguard','Grounded · armored','M7 52 C7 36 14 28 24 28 C34 28 41 36 41 52 Z'),
  presetButton('recon','Recon','Agile · precise','M9 52 C9 38 15 29 24 29 C33 29 39 38 39 52 Z'),
  presetButton('heavy','Heavy','Broad · reinforced','M4 52 C4 34 12 26 24 26 C36 26 44 34 44 52 Z'),
  presetButton('android','Android','Synthetic · modular','M10 52 L10 34 L24 26 L38 34 L38 52 Z M17 34 L24 30 L31 34')
].join('');

const GENDER_SEGMENTS = `<div class="segment gender-segment" role="group" aria-label="Body frame">
  <button type="button" data-gender-preset="male" aria-pressed="false">Masculine</button>
  <button type="button" data-gender-preset="finetune" aria-pressed="false">Balanced</button>
  <button type="button" data-gender-preset="female" aria-pressed="false">Feminine</button>
</div>`;

const QUICK_OUTFITS = [
  ['jacket','Jacket'], ['hoodie','Hoodie'], ['tee','Tee'], ['trousers','Trousers'],
  ['cyborg_suit','Cyborg suit'], ['armor','Armor'], ['underwear','Cabin base']
].map(([v, l]) => `<button type="button" class="chip" data-outfit-quick="${v}">${esc(l)}</button>`).join('');

const STEP_DOTS = STEP_META_CONST().map(([id, short]) => `<button type="button" class="step-dot" data-step-jump="${id}" aria-label="${esc(short)}"><span></span></button>`).join('');
function STEP_META_CONST(){
  return [['face','Face'],['body','Physique'],['quarters','Wardrobe'],['gear','Gear'],['ramp','Ramp'],['action','Action']];
}
const RAIL_STEPS = [
  ['face','01','Face','M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 Z M9 11 h1 M15 11 h1 M9 16 q3 2 6 0'],
  ['body','02','Physique','M12 3 v18 M6 7 h12 M8 21 l4 -6 l4 6'],
  ['quarters','03','Wardrobe','M7 4 l5 2 l5 -2 l4 4 l-3 3 l-1 -1 v11 h-10 v-11 l-1 1 l-3 -3 Z'],
  ['gear','04','Gear','M4 9 h16 v10 h-16 Z M9 9 v-3 h6 v3 M4 14 h16'],
  ['ramp','05','Ramp','M3 19 h18 M6 19 l6 -11 l6 11 M9 19 l3 -5 l3 5'],
  ['action','06','Action','M4 20 h16 M8 20 l4 -12 l4 12 M12 8 v-4']
].map(([id, no, label, d]) => `<button type="button" class="tab-btn" data-tab="${id}" aria-label="${esc(label)}">
    <span class="rail-no">${no}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span class="rail-label">${esc(label)}</span></button>`);

/* ------------------------------------------------------------------ *
 * Stylesheet — flex-only containment, zero external assets
 * ------------------------------------------------------------------ */
const CSS = `
  :root{
    --bg:#070a0f; --bg-2:#0b1017; --surface:#0f161f; --surface-2:#131d28; --surface-3:#18242f;
    --line:rgba(150,190,215,.12); --line-2:rgba(150,190,215,.22);
    --text:#e8f0f7; --text-2:#a9bdcc; --text-3:#71889b;
    --cyan:#61e3ff; --cyan-soft:rgba(97,227,255,.14); --amber:#f2ae6a; --amber-soft:rgba(242,174,106,.14);
    --good:#66e0b0; --warn:#ffb27a; --crit:#ff7f88;
    --radius:16px; --radius-sm:10px;
    --shadow:0 18px 50px rgba(0,0,0,.45);
    --ease:cubic-bezier(.22,.8,.28,1);
    --font:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%;max-width:100vw;overflow-x:hidden;overflow-y:hidden;background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  button,input,select{font-family:inherit;font-size:inherit}
  button{cursor:pointer}
  button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
  .sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .forge-shell{display:flex;flex-direction:column;height:100dvh;width:100%;max-width:100vw;min-width:0;overflow:hidden;background:radial-gradient(120% 90% at 50% -20%,#13202c 0%,#070a0f 62%)}

  /* Top bar */
  .topbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-width:0;padding:9px clamp(10px,2vw,22px);border-bottom:1px solid var(--line);background:rgba(9,14,20,.82);backdrop-filter:blur(14px);flex:0 0 auto;z-index:8}
  .brand{display:flex;align-items:center;gap:10px;min-width:0}
  .brand-mark{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--cyan-soft),rgba(242,174,106,.10));border:1px solid var(--line-2);box-shadow:inset 0 0 14px rgba(97,227,255,.10);flex:0 0 auto}
  .brand-mark svg{width:18px;height:18px}
  .brand-copy{display:flex;flex-direction:column;min-width:0}
  .brand-copy strong{font-size:12px;letter-spacing:.18em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .brand-copy small{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;color:var(--text-3);white-space:nowrap}
  .topbar-step{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--cyan);background:var(--cyan-soft);border:1px solid rgba(97,227,255,.25);padding:4px 9px;border-radius:999px;white-space:nowrap}
  .topbar-spacer{flex:1 1 auto;min-width:0}
  .topbar-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
  .icon-btn{display:flex;align-items:center;justify-content:center;gap:6px;min-width:34px;height:32px;padding:0 9px;border-radius:9px;border:1px solid var(--line-2);background:rgba(255,255,255,.03);color:var(--text-2);font-size:11px;font-weight:700;transition:all .2s var(--ease)}
  .icon-btn:hover{color:var(--cyan);border-color:rgba(97,227,255,.45);background:var(--cyan-soft)}
  .icon-btn.is-muted{opacity:.38}
  .icon-btn svg{width:14px;height:14px}
  .lock-badge{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--good);border:1px solid rgba(102,224,176,.35);background:rgba(102,224,176,.09);padding:4px 8px;border-radius:999px}

  /* Workspace */
  .workspace{flex:1 1 0;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden}
  .step-rail{display:flex;flex-direction:row;flex:0 0 auto;min-width:0;gap:6px;padding:8px 10px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;border-bottom:1px solid var(--line);background:rgba(8,12,17,.7)}
  .step-rail::-webkit-scrollbar{display:none}
  .rail-group{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--text-3);padding:0 4px;white-space:nowrap;flex:0 0 auto}
  .rail-divider{width:1px;align-self:stretch;background:var(--line);margin:2px 4px;flex:0 0 auto}
  .tab-btn{display:flex;align-items:center;gap:7px;flex:0 0 auto;min-width:0;padding:7px 10px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-3);font-size:11px;font-weight:650;white-space:nowrap;transition:all .24s var(--ease)}
  .tab-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
  .tab-btn .rail-no{font-family:var(--mono);font-size:9px;opacity:.7}
  .tab-btn:hover{color:var(--text);background:rgba(255,255,255,.04)}
  .tab-btn.active{color:var(--cyan);border-color:rgba(97,227,255,.32);background:linear-gradient(135deg,var(--cyan-soft),rgba(97,227,255,.03));box-shadow:0 6px 20px rgba(0,0,0,.28)}
  .tab-btn.active .rail-no{opacity:1}

  /* Stage */
  .stage-pane{position:relative;flex:1 1 0;min-height:190px;min-width:0;overflow:hidden;background:radial-gradient(90% 70% at 50% 42%,#1a2734 0%,#0a1119 58%,#06090e 100%)}
  .stage-aura{position:absolute;inset:0;pointer-events:none;background:radial-gradient(42% 52% at 50% 48%,rgba(97,227,255,.10),transparent 70%),radial-gradient(60% 40% at 50% 100%,rgba(242,174,106,.07),transparent 72%)}
  #viewport3d{display:block;width:100%;height:100%;touch-action:none;cursor:grab;position:relative;z-index:1}
  #viewport3d:active{cursor:grabbing}
  .stage-vignette{position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(75% 72% at 50% 45%,transparent 52%,rgba(3,6,10,.62) 100%)}
  .stage-grain{position:absolute;inset:0;pointer-events:none;z-index:2;opacity:.10;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
  .stage-reticle{position:absolute;left:50%;top:50%;width:min(46vh,320px);height:min(46vh,320px);transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(97,227,255,.10);pointer-events:none;z-index:2}
  .stage-reticle::before,.stage-reticle::after{content:"";position:absolute;background:rgba(97,227,255,.14)}
  .stage-reticle::before{left:50%;top:-9px;width:1px;height:18px;transform:translateX(-50%)}
  .stage-reticle::after{top:50%;left:-9px;height:1px;width:18px;transform:translateY(-50%)}
  .stage-pane.is-reframing .stage-aura{animation:reframe 620ms var(--ease)}
  @keyframes reframe{0%{opacity:.3;transform:scale(.97)}55%{opacity:1;transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
  .stage-hud-left,.stage-hud-right{position:absolute;top:10px;display:flex;flex-direction:column;gap:6px;z-index:4;max-width:min(260px,calc(100% - 20px));min-width:0}
  .stage-hud-left{left:10px;align-items:flex-start}
  .stage-hud-right{right:10px;align-items:flex-end}
  .hud-chip{display:flex;align-items:center;gap:7px;min-width:0;max-width:100%;padding:5px 9px;border-radius:9px;border:1px solid var(--line-2);background:rgba(9,14,20,.72);backdrop-filter:blur(10px);font-family:var(--mono);font-size:9px;letter-spacing:.06em;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hud-chip strong{color:var(--text);font-weight:700}
  .hud-chip.cyan{color:var(--cyan);border-color:rgba(97,227,255,.3);background:rgba(8,32,42,.72)}
  .hud-chip.amber{color:var(--amber)}
  #backend-badge{font-weight:700;color:var(--amber);letter-spacing:.08em}
  #backend-badge.is-webgpu{color:var(--cyan)}
  .hud-link{display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:9px;border:1px solid var(--line-2);background:rgba(9,14,20,.72);backdrop-filter:blur(10px);color:var(--text-2);font-size:10px;font-weight:700;text-decoration:none;white-space:nowrap}
  .hud-link:hover{color:var(--cyan);border-color:rgba(97,227,255,.4)}
  .hud-link svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8}
  .diag-links{display:flex;flex-wrap:wrap;gap:4px;min-width:0}
  .diag-links a{font-family:var(--mono);font-size:8.5px;letter-spacing:.05em;color:var(--text-3);text-decoration:none;padding:4px 7px;border-radius:6px;border:1px solid var(--line-2)}
  .diag-links a:hover{color:var(--cyan);border-color:rgba(97,227,255,.4)}

  #corner-portrait-hud{position:absolute;left:10px;bottom:10px;width:104px;height:104px;border:1px solid rgba(97,227,255,.65);border-radius:12px;box-shadow:0 0 0 4px rgba(6,12,18,.55),0 0 24px rgba(97,227,255,.22),inset 0 0 22px rgba(97,227,255,.06);background:rgba(6,12,18,.35);pointer-events:none;z-index:4;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}
  .portrait-hdr{display:flex;justify-content:space-between;gap:4px;background:linear-gradient(180deg,rgba(6,14,20,.94),rgba(6,14,20,.55));color:var(--cyan);font-family:var(--mono);font-size:7.5px;font-weight:700;letter-spacing:.08em;padding:3px 5px;white-space:nowrap;overflow:hidden}
  .portrait-ftr{background:linear-gradient(0deg,rgba(6,14,20,.94),rgba(6,14,20,.55));color:#cfe9f5;font-family:var(--mono);font-size:7px;padding:3px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage-caption{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;max-width:min(360px,calc(100vw - 220px));min-width:0;text-align:center;padding:6px 13px;border-radius:12px;border:1px solid var(--line-2);background:rgba(7,12,18,.80);backdrop-filter:blur(12px);box-shadow:0 8px 26px rgba(0,0,0,.45)}
  .stage-caption strong{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e6f4fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .stage-caption small{font-size:9.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .gesture-hint{position:absolute;right:10px;bottom:10px;z-index:4;pointer-events:none;padding:5px 8px;border-radius:8px;border:1px solid var(--line);background:rgba(9,14,20,.7);backdrop-filter:blur(8px);font-family:var(--mono);font-size:8px;letter-spacing:.04em;color:var(--text-3)}
  #cinema-fade{position:absolute;inset:0;background:#03060a;opacity:0;pointer-events:none;z-index:6;display:flex;align-items:center;justify-content:center;color:var(--cyan);letter-spacing:.2em;font-family:var(--mono);font-size:11px}
  .diagnostics{position:absolute;top:48px;right:10px;z-index:7;width:min(300px,calc(100vw - 24px));min-width:0;max-width:calc(100vw - 24px);display:none;flex-direction:column;gap:9px;padding:12px;border-radius:var(--radius-sm);border:1px solid var(--line-2);background:rgba(10,16,23,.96);backdrop-filter:blur(16px);box-shadow:var(--shadow)}
  .diagnostics.is-open{display:flex}
  .diagnostics h4{margin:0;font-size:10px;letter-spacing:.14em;color:var(--cyan);text-transform:uppercase}
  .diagnostics .diag-note{font-size:10px;color:var(--text-3);line-height:1.45}
  .diag-actions{display:flex;flex-wrap:wrap;gap:6px;min-width:0}

  /* Inspector */
  .inspector{display:flex;flex-direction:column;flex:0 0 auto;height:min(50dvh,470px);min-height:0;min-width:0;width:100%;max-width:100vw;overflow:hidden;background:linear-gradient(180deg,rgba(18,26,36,.98),rgba(9,14,20,.99));border-top:1px solid var(--line-2);border-radius:18px 18px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.38);z-index:5}
  .inspector-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-width:0;padding:11px 14px 9px;border-bottom:1px solid var(--line);flex:0 0 auto}
  .step-copy{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:1px}
  .step-line{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}
  .step-group{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--cyan);background:var(--cyan-soft);border:1px solid rgba(97,227,255,.22);padding:2px 7px;border-radius:999px}
  .step-no{font-family:var(--mono);font-size:9px;color:var(--text-3);letter-spacing:.1em}
  .step-copy h2{margin:0;font-size:clamp(15px,2.4vw,19px);font-weight:720;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .step-copy p{margin:0;font-size:10.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .progress-cluster{display:flex;align-items:center;gap:9px;flex:0 0 auto}
  .progress-ring{position:relative;width:46px;height:46px;flex:0 0 auto}
  .progress-ring svg{width:46px;height:46px;transform:rotate(-90deg)}
  .progress-ring .track{fill:none;stroke:rgba(255,255,255,.08);stroke-width:4}
  .progress-ring .fill{fill:none;stroke:var(--cyan);stroke-width:4;stroke-linecap:round;stroke-dasharray:113;stroke-dashoffset:113;transition:stroke-dashoffset .5s var(--ease);filter:drop-shadow(0 0 5px rgba(97,227,255,.55))}
  .progress-ring span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9.5px;font-weight:700;color:var(--cyan)}
  .progress-meta{display:flex;flex-direction:column;gap:3px;min-width:0}
  .progress-meta strong{font-size:10px;letter-spacing:.1em;color:var(--text-2)}
  .progress-track{width:84px;height:4px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
  .progress-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan),var(--amber));border-radius:999px;transition:width .5s var(--ease)}
  .view-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;padding:8px 14px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.015);flex:0 0 auto}
  .view-label{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--text-3);white-space:nowrap}
  .segment{display:flex;flex-wrap:wrap;gap:3px;padding:3px;border-radius:10px;border:1px solid var(--line-2);background:rgba(4,8,12,.55);min-width:0}
  .segment button{border:0;background:transparent;color:var(--text-3);font-size:10px;font-weight:700;padding:5px 9px;border-radius:7px;white-space:nowrap;transition:all .22s var(--ease)}
  .segment button:hover{color:var(--text)}
  .segment button.active{color:#04121a;background:linear-gradient(135deg,var(--cyan),#9af0ff);box-shadow:0 4px 14px rgba(97,227,255,.28)}
  .gender-segment button{font-size:11px;padding:8px 10px}
  .view-zoom{display:flex;align-items:center;gap:7px;flex:1 1 120px;min-width:0}
  .view-zoom .ev-range{flex:1 1 0;min-width:0}
  .view-zoom .val-pill{min-width:38px;text-align:center}
  .inspector-scroll{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:13px 14px 22px;scrollbar-width:thin;scrollbar-color:rgba(97,227,255,.3) transparent}
  .tab-panel{display:none;flex-direction:column;gap:11px;min-width:0}
  .tab-panel.active{display:flex;animation:panelIn .32s var(--ease)}
  @keyframes panelIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
  .inspector-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;padding:9px 14px calc(9px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:rgba(6,10,15,.75);flex:0 0 auto}
  .step-dots{display:flex;flex-wrap:wrap;align-items:center;gap:5px;flex:1 1 0;min-width:0;justify-content:center}
  .step-dot{width:20px;height:20px;border-radius:50%;border:1px solid var(--line-2);background:transparent;display:flex;align-items:center;justify-content:center;padding:0}
  .step-dot span{width:6px;height:6px;border-radius:50%;background:var(--text-3);transition:all .25s var(--ease)}
  .step-dot.active{border-color:var(--cyan)}
  .step-dot.active span{background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
  .nav-btn{border:1px solid var(--line-2);background:rgba(255,255,255,.03);color:var(--text-2);padding:7px 12px;border-radius:9px;font-size:11px;font-weight:700;white-space:nowrap}
  .nav-btn:hover{color:var(--cyan);border-color:rgba(97,227,255,.4)}
  .nav-btn.primary{background:linear-gradient(135deg,var(--cyan),#8fe9ff);color:#04121a;border-color:transparent;box-shadow:0 8px 22px rgba(97,227,255,.22)}
  .nav-btn:disabled{opacity:.35;cursor:default}
  .save-local{font-family:var(--mono);font-size:9px;letter-spacing:.08em;color:var(--text-3);border:1px dashed var(--line-2);background:transparent;padding:6px 9px;border-radius:8px;white-space:nowrap}
  .save-local:hover{color:var(--good);border-color:rgba(102,224,176,.4)}

  /* Cards & controls */
  .refine-card,.disclosure{border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(160deg,rgba(24,35,47,.72),rgba(13,20,28,.86));box-shadow:0 10px 30px rgba(0,0,0,.20);min-width:0;overflow:hidden}
  .refine-card{padding:13px}
  .refine-head{display:flex;flex-direction:column;gap:2px;margin-bottom:11px;min-width:0}
  .refine-kicker{font-family:var(--mono);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber)}
  .refine-head h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-.005em}
  .refine-head p{margin:0;font-size:10.5px;color:var(--text-3);line-height:1.45}
  .refine-body{display:flex;flex-direction:column;gap:12px;min-width:0}
  .disclosure summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;padding:12px 13px;min-width:0}
  .disclosure summary::-webkit-details-marker{display:none}
  .disclosure summary strong{font-size:12px;font-weight:700;flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .disclosure summary .refine-kicker{flex:0 0 auto}
  .disclosure summary .chev{color:var(--amber);font-size:15px;transition:transform .25s var(--ease)}
  .disclosure[open] summary .chev{transform:rotate(180deg)}
  .disclosure[open] summary{border-bottom:1px solid var(--line)}
  .sub-body{display:flex;flex-direction:column;gap:12px;padding:13px;min-width:0;animation:panelIn .28s var(--ease)}
  .ctrl-row{display:flex;flex-direction:column;gap:6px;min-width:0}
  .ctrl-lbl{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;font-size:11.5px;font-weight:600;color:#cfe0ec}
  .ctrl-lbl>span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .val-pill{font-family:var(--mono);font-size:9.5px;color:var(--cyan);background:var(--cyan-soft);border:1px solid rgba(97,227,255,.18);padding:2px 7px;border-radius:999px;white-space:nowrap;flex:0 0 auto}
  .ctrl-hint{font-size:9.5px;color:var(--text-3);line-height:1.4}
  .range-scale{display:flex;justify-content:space-between;gap:8px;font-family:var(--mono);font-size:8.5px;color:var(--text-3);letter-spacing:.04em;min-width:0}
  .ev-range{-webkit-appearance:none;appearance:none;width:100%;height:22px;margin:0;background:transparent;--fill:50%;cursor:pointer;min-width:0}
  .ev-range::-webkit-slider-runnable-track{height:5px;border-radius:999px;background:linear-gradient(90deg,var(--cyan) 0%,var(--cyan) var(--fill),rgba(255,255,255,.10) var(--fill),rgba(255,255,255,.10) 100%);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .ev-range::-moz-range-track{height:5px;border-radius:999px;background:rgba(255,255,255,.10)}
  .ev-range::-moz-range-progress{height:5px;border-radius:999px;background:var(--cyan)}
  .ev-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;margin-top:-5.5px;border-radius:50%;background:#eafcff;border:2px solid var(--cyan);box-shadow:0 0 0 4px rgba(97,227,255,.14),0 3px 10px rgba(0,0,0,.5);transition:transform .18s var(--ease)}
  .ev-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#eafcff;border:2px solid var(--cyan);box-shadow:0 0 0 4px rgba(97,227,255,.14)}
  .ev-range:hover::-webkit-slider-thumb{transform:scale(1.12)}
  .ev-range:disabled{opacity:.4;cursor:not-allowed}
  .ev-select{width:100%;min-width:0;background:rgba(4,9,14,.75);color:var(--text);border:1px solid var(--line-2);border-radius:9px;padding:9px 30px 9px 10px;font-size:11.5px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2361e3ff' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .2s var(--ease)}
  .ev-select:hover{border-color:rgba(97,227,255,.45)}
  .ev-select.is-chipped{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;padding:0;border:0}
  .chip-row{display:flex;flex-wrap:wrap;gap:5px;min-width:0}
  .chip{border:1px solid var(--line-2);background:rgba(255,255,255,.025);color:var(--text-2);padding:6px 10px;border-radius:8px;font-size:10.5px;font-weight:650;white-space:nowrap;transition:all .2s var(--ease);min-width:0}
  .chip:hover{color:var(--text);border-color:rgba(97,227,255,.4);background:rgba(97,227,255,.06)}
  .chip.active{color:#04121a;border-color:transparent;background:linear-gradient(135deg,var(--cyan),#a4f1ff);box-shadow:0 5px 16px rgba(97,227,255,.22)}
  .swatch-block{gap:7px}
  .swatches{display:flex;flex-wrap:wrap;gap:7px;min-width:0}
  .swatch{width:27px;height:27px;border-radius:9px;border:2px solid rgba(255,255,255,.12);cursor:pointer;color:#dce8f0;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0;position:relative;transition:transform .18s var(--ease),box-shadow .18s var(--ease);flex:0 0 auto}
  .swatch:hover{transform:translateY(-2px)}
  .swatch.active{border-color:#eafcff;box-shadow:0 0 0 3px rgba(97,227,255,.28),0 5px 14px rgba(0,0,0,.4)}
  .swatch.active::after{content:"";position:absolute;right:-3px;bottom:-3px;width:9px;height:9px;border-radius:50%;background:var(--cyan);border:2px solid #08121a}
  .swatch-none{background:repeating-linear-gradient(45deg,#1a222c 0 5px,#10171f 5px 10px)}
  .toggle-row{display:flex;align-items:center;gap:10px;padding:8px 9px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.02);min-width:0;cursor:pointer}
  .toggle-row input{position:absolute;opacity:0;width:1px;height:1px}
  .switch{width:34px;height:19px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line-2);position:relative;flex:0 0 auto;transition:all .22s var(--ease)}
  .switch::after{content:"";position:absolute;left:2px;top:2px;width:13px;height:13px;border-radius:50%;background:#c8d8e4;transition:all .22s var(--ease)}
  .toggle-row input:checked + .switch{background:linear-gradient(135deg,var(--cyan),#8be8ff);border-color:transparent}
  .toggle-row input:checked + .switch::after{transform:translateX(15px);background:#04121a}
  .toggle-copy{display:flex;flex-direction:column;gap:1px;min-width:0}
  .toggle-copy strong{font-size:11px;font-weight:650;color:#d7e6f0}
  .toggle-copy small{font-size:9.5px;color:var(--text-3);line-height:1.35}
  .pad-2d{position:relative;width:100%;height:104px;border-radius:12px;background:linear-gradient(135deg,rgba(15,26,37,.92),rgba(10,18,26,.92));border:1px solid var(--line-2);cursor:crosshair;touch-action:none;overflow:hidden;min-width:0}
  .pad-2d::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(97,227,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(97,227,255,.07) 1px,transparent 1px);background-size:25% 25%;pointer-events:none}
  .pad-corner{position:absolute;font-family:var(--mono);font-size:8px;color:var(--text-3);pointer-events:none;padding:4px 6px;letter-spacing:.04em}
  .pad-dot{position:absolute;width:14px;height:14px;border-radius:50%;background:var(--amber);border:2px solid #fff;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 12px rgba(242,174,106,.75)}
  .part-grid{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
  .part-cell{flex:1 1 44%;display:flex;flex-direction:column;gap:5px;min-width:0}
  .part-cell>span{font-size:10px;color:var(--text-3);font-weight:600}
  .preset-grid{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
  .preset-card{flex:1 1 44%;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;padding:9px;border-radius:12px;border:1px solid var(--line-2);background:rgba(255,255,255,.02);color:var(--text);text-align:left;transition:all .22s var(--ease)}
  .preset-card:hover{transform:translateY(-2px);border-color:rgba(97,227,255,.45);background:var(--cyan-soft);box-shadow:0 10px 24px rgba(0,0,0,.3)}
  .preset-card svg{width:34px;height:38px;fill:none;stroke:var(--cyan);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;margin-bottom:2px}
  .preset-card strong{font-size:11px;font-weight:700}
  .preset-card small{font-size:9px;color:var(--text-3)}
  .btn-row{display:flex;flex-wrap:wrap;gap:7px;min-width:0}
  .ev-btn{flex:1 1 auto;border:1px solid var(--line-2);border-radius:9px;padding:9px 11px;background:rgba(255,255,255,.025);color:var(--text-2);font-size:11px;font-weight:700;text-align:center;white-space:nowrap;transition:all .2s var(--ease);min-width:0}
  .ev-btn:hover{color:var(--cyan);border-color:rgba(97,227,255,.45)}
  .ev-btn.active{color:#04121a;background:linear-gradient(135deg,var(--cyan),#9ceeff);border-color:transparent}
  .ev-btn.warn{color:var(--amber);border-color:rgba(242,174,106,.35)}
  .ev-btn.primary{color:#04121a;background:linear-gradient(135deg,var(--amber),#ffd3a3);border-color:transparent}
  .lore-box{border-radius:10px;padding:10px;font-size:10.5px;line-height:1.5;background:rgba(97,227,255,.06);border:1px solid rgba(97,227,255,.22);color:#bfe3f2}
  .lore-box.locked{background:rgba(255,127,136,.07);border-color:rgba(255,127,136,.32);color:#ffc6cb}
  .lore-box.expert{background:rgba(102,224,176,.07);border-color:rgba(102,224,176,.32);color:#b8f2dc}
  .is-locked{opacity:.5}
  .collapsible{transition:max-height .4s var(--ease),opacity .3s var(--ease),margin .3s var(--ease),padding .3s var(--ease);max-height:900px;opacity:1}
  .collapsible.is-collapsed{max-height:0;opacity:0;overflow:hidden;padding-top:0;padding-bottom:0;margin-top:0;margin-bottom:0;border-color:transparent;pointer-events:none}
  .status-msg{font-family:var(--mono);font-size:9.5px;color:#7dc4d9;min-height:14px}
  .fine-note{font-size:10px;color:var(--text-3);line-height:1.5;padding:9px;border-radius:9px;border:1px dashed var(--line-2);background:rgba(255,255,255,.015)}
  #ev-toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,14px);z-index:20;padding:9px 15px;border-radius:999px;border:1px solid rgba(97,227,255,.4);background:rgba(9,22,30,.94);backdrop-filter:blur(12px);color:#d8f6ff;font-family:var(--mono);font-size:10px;letter-spacing:.06em;box-shadow:0 12px 30px rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:all .32s var(--ease);max-width:min(320px,calc(100vw - 24px));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #ev-toast.show{opacity:1;transform:translate(-50%,0)}

  /* Compact step rail: all six steps visible, zero horizontal scroll on phones/tablets */
  @media (max-width:1023px){
    .step-rail{overflow-x:hidden;flex-wrap:nowrap;gap:4px;padding:7px 8px}
    .rail-group,.rail-divider{display:none}
    .tab-btn{flex:1 1 0;min-width:0;justify-content:center;padding:6px 2px;gap:2px}
    .tab-btn .rail-label{display:none}
    .tab-btn .rail-no{font-size:8px}
    .tab-btn svg{width:16px;height:16px}
  }
  /* Tablet & desktop */
  @media (min-width:768px){
    .inspector{height:min(46dvh,440px)}
    .stage-caption{max-width:min(420px,calc(100vw - 260px))}
    .preset-card{flex:1 1 21%}
  }
  @media (min-width:1024px){
    .workspace{flex-direction:row}
    .step-rail{flex:0 0 92px;flex-direction:column;justify-content:flex-start;gap:5px;padding:12px 8px;overflow-x:hidden;overflow-y:auto;border-bottom:0;border-right:1px solid var(--line);background:rgba(8,12,17,.55)}
    .rail-group{justify-content:center;padding:2px 0}
    .rail-divider{width:auto;height:1px;align-self:stretch;margin:5px 8px}
    .tab-btn{flex:0 0 auto;width:100%;flex-direction:column;gap:3px;padding:9px 4px;border-radius:12px;text-align:center}
    .tab-btn svg{width:18px;height:18px}
    .tab-btn .rail-no{font-size:8px}
    .tab-btn .rail-label{font-size:9px}
    .stage-pane{flex:1 1 0;min-width:0;height:100%}
    .inspector{height:100%;width:min(390px,32vw);flex:0 0 auto;border-top:0;border-left:1px solid var(--line-2);border-radius:0;box-shadow:-14px 0 40px rgba(0,0,0,.28)}
    .inspector-head{padding:14px 16px 11px}
    .view-bar{padding:10px 16px}
    .inspector-scroll{padding:15px 16px 26px}
    .inspector-foot{padding:10px 16px}
    .stage-caption{max-width:min(480px,calc(100vw - 620px))}
    .diagnostics{width:min(320px,calc(100vw - 24px))}
  }
  @media (min-width:1600px){
    .inspector{width:410px}
    .refine-card{padding:15px}
  }
  @media (max-width:600px){
    .stage-caption{bottom:74px;max-width:min(300px,calc(100vw - 24px))}
    .stage-caption small{font-size:9px}
    .gesture-hint{display:none}
    .progress-meta{display:none}
    .topbar-tools .lock-badge{display:none}
    .view-label{display:none}
    .stage-hud-left .hud-chip{max-width:118px}
    .stage-hud-right .hud-chip{max-width:150px}
  }
  @media (max-width:380px){
    .stage-hud-right #hud-telemetry{display:none}
    .stage-hud-left .hud-chip{display:none}
  }
  @media (max-width:380px){
    .brand-copy small{display:none}
    .topbar{padding:8px 10px}
    .hud-chip{font-size:8px;padding:4px 7px}
    .stage-reticle{width:min(40vh,240px);height:min(40vh,240px)}
    .inspector-head{padding:9px 11px 8px}
    .view-bar{padding:7px 11px}
    .inspector-scroll{padding:11px 11px 20px}
    .refine-card{padding:11px}
  }
  body.stage-focus .inspector{height:96px}
  body.stage-focus .view-bar,body.stage-focus .inspector-scroll,body.stage-focus .inspector-foot,body.stage-focus .progress-cluster{display:none}
  @media (min-width:1024px){body.stage-focus .inspector{height:100%;width:74px;flex:0 0 74px}}
  body.stage-focus .inspector-head{justify-content:center;text-align:center}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}
`;

/* ------------------------------------------------------------------ *
 * Static shell
 * ------------------------------------------------------------------ */
const htmlTop = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
<title>Endless Vigil // Operator Forge Atelier</title>
<style>${CSS}</style>
</head>
<body>
<div class="forge-shell">

  <header class="topbar">
    <div class="brand">
      <span class="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6 Z" fill="none" stroke="#61e3ff" stroke-width="1.5"/><path d="M12 7 V17 M8 12 H16" stroke="#f2ae6a" stroke-width="1.5" stroke-linecap="round"/></svg></span>
      <span class="brand-copy"><strong>ENDLESS VIGIL</strong><small>OPERATOR FORGE · ATELIER</small></span>
    </div>
    <span class="topbar-step" id="topbar-step">STEP 01 · Face</span>
    <span class="topbar-spacer"></span>
    <div class="topbar-tools">
      <span class="lock-badge" id="lock-state-badge">EDITABLE</span>
      <button type="button" class="icon-btn" id="btn-undo" title="Undo (Ctrl+Z)" aria-label="Undo"><svg viewBox="0 0 24 24"><path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 20 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" class="icon-btn" id="btn-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><svg viewBox="0 0 24 24"><path d="M15 7 L20 12 L15 17 M20 12 H10 A6 6 0 0 0 4 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" class="icon-btn" id="btn-stage-focus" title="Focus on the operator (F)" aria-pressed="false" aria-label="Focus stage"><svg viewBox="0 0 24 24"><path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      <button type="button" class="icon-btn" id="btn-diagnostics" title="Diagnostics &amp; tools" aria-expanded="false" aria-label="Diagnostics">⋯</button>
    </div>
  </header>

  <main class="workspace">
    <nav class="step-rail" aria-label="Operator Forge steps">
      ${railBlock()}
    </nav>

    <section class="stage-pane" id="stage-pane">
      <div class="stage-aura"></div>
      <canvas id="viewport3d"></canvas>
      <div class="stage-vignette"></div>
      <div class="stage-grain"></div>
      <div class="stage-reticle"></div>

      <div class="stage-hud-left">
        <button type="button" class="hud-link" id="btn-reset-view" title="Re-center the operator (R)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3"/></svg>Re-center</button>
        <span class="hud-chip cyan" id="detail-guard">LOD0 · SHARP AT EVERY DISTANCE</span>
      </div>
      <div class="stage-hud-right">
        <span class="hud-chip"><strong id="backend-badge">INITIALIZING GPU...</strong></span>
        <span class="hud-chip" id="hud-telemetry">Loading asset kit...</span>
      </div>

      <div id="corner-portrait-hud">
        <div class="portrait-hdr"><span>LIVE ID</span><span id="portrait-mode-tag">UNMASKED</span></div>
        <div class="portrait-ftr">VITALS 100% · RIG ONLINE</div>
      </div>
      <div class="stage-caption"><strong id="stage-step-label">Identity &amp; Face</strong><small id="stage-step-hint">Start with the face. Every adjustment is live.</small></div>
      <div class="gesture-hint">DRAG: ORBIT · PINCH: ZOOM · SHIFT+DRAG: PAN</div>
      <div id="cinema-fade">TRANSIT TO EV-74 KESTREL RAMP...</div>

      <div class="diagnostics" id="diagnostics">
        <h4>Diagnostics &amp; draft tools</h4>
        <div class="diag-note">Render backend, cache hygiene, camera height and a clean baseline reset. These never alter other sites or saved sessions.</div>
        <div class="diag-actions">
          <button type="button" class="ev-btn" id="btn-toggle-backend">Mode: Auto</button>
          <button type="button" class="ev-btn warn" id="btn-purge-cache">Purge Cache</button>
          <button type="button" class="ev-btn warn" id="btn-reset-default">Reset Draft</button>
        </div>
        ${rangeField('camPitch','Camera height',-0.48,0.60,0.02,{ lo:'Low', hi:'High' })}
        <div class="diag-links"><a href="index.html">Hub</a><a href="temporal-lab.html">Temporal Lab</a><a href="cuff-slate.html">Cuff-Slate</a><a href="conglomerate-flowchart.html">Conglomerate</a><a href="continuum-monitor.html">Continuum</a></div>
      </div>
    </section>

    <aside class="inspector">
      <div class="inspector-head">
        <div class="step-copy">
          <div class="step-line"><span class="step-group" id="inspector-step-group">CREATE</span><span class="step-no" id="inspector-step-no">01 / 06</span></div>
          <h2 id="inspector-step-title">Identity &amp; Face</h2>
          <p id="inspector-step-sub">Start with the face. Every adjustment is live.</p>
        </div>
        <div class="progress-cluster">
          <div class="progress-ring"><svg viewBox="0 0 46 46"><circle class="track" cx="23" cy="23" r="18"/><circle class="fill" id="progress-ring" cx="23" cy="23" r="18"/></svg><span id="progress-pct">0%</span></div>
          <div class="progress-meta"><strong id="inspector-progress-label">0 / 25 traits refined</strong><div class="progress-track"><i id="progress-bar"></i></div></div>
        </div>
      </div>

      <div class="view-bar">
        <span class="view-label">FRAME</span>
        <div class="segment" role="group" aria-label="Camera framing">
          <button type="button" data-frame="auto">Auto</button>
          <button type="button" data-frame="head">Face</button>
          <button type="button" data-frame="torso">Torso</button>
          <button type="button" data-frame="full">Full</button>
        </div>
        <div class="view-zoom"><span class="view-label">ZOOM</span>${rangeField('camZoom','Framing zoom',0.45,1.85,0.05,{ lo:'Near', hi:'Far' }).replace('<div class="ctrl-row">','<div class="ctrl-row compact-zoom">')}</div>
      </div>

      <div class="inspector-scroll">

        <!-- 01 · IDENTITY & FACE -->
        <div class="tab-panel active" data-panel="face">
          ${card('01 · START HERE','Choose a starting point',`<div class="preset-grid">${PRESET_CARDS}</div><div class="btn-row"><button type="button" class="ev-btn primary" id="btn-randomize">✦ Surprise me</button></div>`, { desc:'Archetypes are a starting sketch — every trait stays editable.' })}
          ${card('BODY FRAME','A continuous balance',`${GENDER_SEGMENTS}
            <div class="collapsible" id="wrap-gender-finetune">
              <div class="ctrl-row"><div class="ctrl-lbl"><span>Fine-tune balance</span><span class="val-pill" id="val-gender">0.00</span></div>
                <input class="ev-range bio-lockable" id="rng-gender" type="range" min="-1" max="1" step="0.05" aria-label="Fine-tune body frame" />
                <div class="range-scale"><span>Masculine</span><span id="gender-balance-label">Masculine</span><span>Feminine</span></div></div>
            </div>
            <div class="sr-only"><input type="radio" name="sexMode" value="male" checked /><input type="radio" name="sexMode" value="female" /><input type="radio" name="sexMode" value="finetune" /></div>
            ${rangeField('age','Age character',0,1,0.05,{ bio:true, lo:'Younger', hi:'Older' })}`, { desc:'No hard switch — the mesh eases into the new frame.' })}
          ${card('COMPLEXION','Skin, finish & gaze',`
            ${swatchField('skin','Skin tone','Twelve calibrated tones, from porcelain to deep umber.')}
            ${selectField('sel-skinFinish','Skin surface',[['matte','Matte · natural'],['shiny','Shiny · hydrated'],['metallic','Metallic · chrome'],['android','Android · dermal panels']],{ bio:true, chips:true, prop:'skinFinish' })}
            ${swatchField('eye','Iris color','Paired with live subsurface eye shading.')}
            ${selectField('sel-expression','Expression',[['neutral','Neutral'],['smirk','Smirk'],['focused','Focused'],['blink','Blink'],['gasp','Startled'],['bleed','Pain / bleed']],{ prop:'expression' })}
            ${rangeField('blink','Eye closure',0,1,0.05,{ lo:'Open', hi:'Closed' })}`)}
          ${disclosure('STYLE','Hair, facial hair & finish',`
            ${selectField('sel-hairStyle','Hair style',[['short01','Close crew cut'],['short','Tactical fade'],['sleek','Swept crop'],['messy','Messy layered'],['shaggy','Shaggy medium'],['bob','Classic bob'],['long','Long flowing'],['ponytail','High ponytail'],['braids','Twin braids'],['afro','Natural afro'],['buzz','Buzz / clean']],{ bio:true })}
            ${swatchField('hair','Hair color','')}
            ${selectField('sel-beardStyle','Facial hair',[['clean','Clean shaven'],['stubble','Light stubble'],['painted_short','Heavy stubble'],['goatee','3D goatee'],['short_3d','3D short beard'],['long','3D long beard'],['moustache','Handlebar moustache']],{ bio:true })}
            ${swatchField('beard','Facial hair tone','Independent tint for 3D beard meshes.')}
            ${toggleField('grayStreak','Gray streak','Add a movable silver streak across the hair texture.')}
            ${padField('pad-streak','dot-streak','Streak placement',[['top:0;left:0;','Upper left'],['top:0;right:0;','Upper right'],['bottom:0;left:0;','Lower left'],['bottom:0;right:0;','Lower right']],'Drag to position. Angle and width are below.')}
            ${rangeField('streakAngle','Streak angle',-3.14,3.14,0.05,{ lo:'−180°', hi:'+180°' })}
            ${rangeField('streakWidth','Streak width',0.05,0.40,0.02,{ lo:'Fine', hi:'Broad' })}
            ${swatchField('nail','Nail finish','')}`,{ open:false })}
          ${disclosure('ADVANCED · 13 MORPHS','Fine facial sculpt',FACE_SCULPT,{ open:false })}
          ${disclosure('DETAIL','Marks, ink & piercings',`
            ${selectField('sel-scarType','Scar style',[['none','None'],['slash','Blade slash'],['triple_puncture','Neural ports'],['claw','Shrapnel laceration'],['plasma_burn','Plasma scorch']],{ bio:true, chips:true, prop:'scarType' })}
            ${padField('pad-scar','dot-scar','Scar anchor',[['top:0;left:0;','Temple'],['top:0;right:0;','Brow'],['bottom:0;left:0;','Jaw'],['bottom:0;right:0;','Cheek']],'Drag across the face UV to place the mark.')}
            ${rangeField('cyberFace','Cybernetic facial seams',0,1,0.05,{ lo:'Subtle', hi:'Pronounced' })}
            ${selectField('sel-tattooStyle','Tattoo pattern',[['none','None'],['circuit','Cyber-circuit'],['tribal','Geometric'],['wing','Wing crest']],{ chips:true, prop:'tattooStyle' })}
            ${selectField('sel-tattooZone','Placement',[['arm_l','Left upper arm'],['arm_r','Right upper arm'],['forearm_l','Left forearm'],['chest','Chest'],['neck','Neck'],['face','Face / cheek']])}
            ${toggleField('tattooGlow','Glowing ink','Emissive cyber-tattoo trace.')}
            ${swatchField('tattoo','Ink color','')}
            ${toggleField('piercing-brow','Brow studs','')}
            ${toggleField('piercing-nostril','Nostril stud','')}
            ${toggleField('piercing-lip','Labret stud','')}
            ${toggleField('piercing-ears','Dual ear studs','')}
            ${selectField('sel-piercingMetal','Metal finish',[['silver','Brushed silver'],['gold','Warm gold'],['obsidian','Dark obsidian']],{ chips:true, prop:'metal', sub:'piercings' })}
            ${toggleField('piercing-glow','Glowing cyber nodes','')}
            ${swatchField('pierceCol','Node color','')}`)}
        </div>

        <!-- 02 · PHYSIQUE -->
        <div class="tab-panel" data-panel="body">
          ${card('PHYSIQUE','Build the silhouette',`
            ${rangeField('muscle','Muscle mass',0,1,0.05,{ bio:true, lo:'Lean', hi:'Heavy' })}
            ${rangeField('weight','Body weight',0,1,0.05,{ bio:true, lo:'Light', hi:'Full' })}
            ${rangeField('height','Stature',0,1,0.05,{ bio:true, lo:'Compact', hi:'Tall' })}
            <div class="fine-note">Frame balance lives in <strong>Identity &amp; Face</strong>; use this quick control here too.</div>
            ${GENDER_SEGMENTS}`)}
          ${card('BUST ARCHETYPE','Shape & spring physics',`
            ${padField('pad-bust','dot-bust','Four-corner archetype',[['top:0;left:0;','Teardrop'],['top:0;right:0;','Full round'],['bottom:0;left:0;','Petite athletic'],['bottom:0;right:0;','Wide heavy']],'Drag to blend between all four shapes.')}
            ${rangeField('bustSize','Volume',0,1,0.05,{ bio:true })}
            ${rangeField('bustFirmness','Firmness / damping',0,1,0.05,{ bio:true })}
            ${rangeField('bustHeight','Vertical set',-1,1,0.05,{ bio:true })}
            ${rangeField('bustSpacing','Horizontal spacing',-1,1,0.05,{ bio:true })}`, { id:'card-bust-controls', cls:'collapsible' })}
          ${card('CHASSIS','Organic, synthetic or skeletal',`
            ${selectField('sel-chassisMode','Chassis mode',[['humanoid','Organic humanoid'],['android','Full android'],['skeleton','Skeleton chassis']],{ chips:true, prop:'chassisMode' })}
            ${selectField('sel-skelStyle','Endoskeleton material',[['titanium','Industrial titanium'],['carbon','Stealth carbon'],['bone','Ivory bio-bone']],{ chips:true, prop:'skelStyle' })}
            <div class="part-grid">${PART_SELECTS}</div>`)}
          ${disclosure('ADVANCED · 8 SLIDERS','Skeleton proportions',SKEL_RANGES)}
        </div>

        <!-- 03 · WARDROBE -->
        <div class="tab-panel" data-panel="quarters">
          ${card('CABIN ATTIRE','Layers in the mirror bay',`
            ${selectField('sel-outfit','Attire layer',[['underwear','Cabin mirror base'],['jacket','Field jacket & jeans'],['hoodie','Recon hoodie'],['tee','Combat tee'],['trousers','Wool trousers'],['cyborg_suit','Cyborg jumpsuit'],['armor','Composite trauma armor']])}
            <div class="collapsible" id="wrap-uw-male">${selectField('sel-uwMale','Compression fit',[['boxers_charcoal','Dark tactical boxers'],['boxers_olive','Olive compression'],['classic','Slate briefs']])}</div>
            <div class="collapsible is-collapsed" id="wrap-uw-female">
              ${selectField('sel-underwearBra','Bra design',[['sport','Sport band'],['lace_delicate','Delicate lace'],['sheer_mesh','Sheer mesh'],['strappy','Cyber strappy'],['none','None']],{ chips:true, prop:'underwearBra' })}
              ${selectField('sel-underwearBottom','Bottoms cut',[['panties_classic','Classic brief'],['panties_lace','Lace cut'],['panties_sheer','Sheer cut'],['boxers_fem','Boyshort boxers']],{ chips:true, prop:'underwearBottom' })}
            </div>
            ${swatchField('uwCol','Fabric color','')}`)}
          ${card('MIRROR BAY','A full-length view',`<div class="fine-note">The operator stays centered while you dress them. Switch framing any time; the 3D kit keeps hero-level detail at every distance.</div><div class="btn-row"><button type="button" class="ev-btn" data-frame="full">Full-length view</button><button type="button" class="ev-btn" data-frame="auto">Re-center</button></div>`)}
        </div>

        <!-- 04 · GEAR & MANIFEST -->
        <div class="tab-panel" data-panel="gear">
          ${card('IDENTITY','Callsign',`<div class="ctrl-row"><div class="ctrl-lbl"><span>Operator callsign</span></div><input class="ev-select" id="inp-callsign" type="text" maxlength="14" aria-label="Operator callsign" /></div>`)}
          ${card('LOADOUT','Quick layers & tint',`
            <div class="chip-row">${QUICK_OUTFITS}</div>
            ${swatchField('suit','Suit & armor tint','')}
            ${selectField('sel-wristDevice','Left wrist emitter',[['watch','Tactical wrist watch'],['gauntlet','Armored gauntlet']],{ chips:true, prop:'wristDevice' })}
            ${selectField('sel-helmetMode','Helmet visor',[['none','Unmasked'],['open','Open visor'],['half','Half visor'],['sealed','Sealed visor']],{ chips:true, prop:'helmetMode' })}
            ${toggleField('equipRiflePreview','Preview carbine','Show the carbine in the turntable.')}`)}
          ${card('CONTINUUM MANIFEST','Seal the biological draft',`
            <div id="lock-lore-banner" class="lore-box">OPEN BIO-FORGE</div>
            <div class="btn-row"><button type="button" class="ev-btn warn" id="btn-lock-appearance">Seal Biological Appearance</button></div>
            <button type="button" class="ev-btn" id="btn-cyber-expert" style="display:none;">Consult Cybernetics Expert</button>`)}
        </div>

        <!-- 05 · HANGAR RAMP -->
        <div class="tab-panel" data-panel="ramp">
          ${card('PREVIEW','EV-74 Kestrel hangar briefing',`
            <div class="btn-row"><button type="button" class="ev-btn" id="btn-replay-ramp">Replay transition</button><button type="button" class="ev-btn" id="btn-jump-seated">Jump to seated</button></div>
            <div class="btn-row"><button type="button" class="ev-btn active" id="btn-mission-accept">Accept briefing</button><button type="button" class="ev-btn warn" id="btn-mission-decline">Decline briefing</button></div>
            <button type="button" class="ev-btn" id="btn-ship-seed">Cycle ship variant</button>
            <button type="button" class="ev-btn primary" id="btn-save-d1">Commit Loadout to Authority D1</button>
            <div id="d1-save-status" class="status-msg"></div>`, { desc:'Preview stages never overwrite your creation draft.' })}
        </div>

        <!-- 06 · ACTION STAGE -->
        <div class="tab-panel" data-panel="action">
          ${card('PREVIEW','Sector 4 · drone-angle kinematics',`
            <div class="ctrl-row"><div class="ctrl-lbl"><span>Corner slicing</span></div><div class="segment" role="group" aria-label="Corner angle">
              <button type="button" class="chip" data-peek="pie_left">Pie left</button>
              <button type="button" class="chip active" data-peek="center">Hold center</button>
              <button type="button" class="chip" data-peek="pie_right">Pie right</button></div></div>
            ${selectField('sel-cqbSpeed','Entry pace',[['slow','Deliberate slow pie'],['fast','Dynamic fast breach']],{ chips:true, prop:'cqbSpeed' })}
            ${rangeField('aimSkill','Aim skill',0.15,0.98,0.05)}
            ${rangeField('strideYaw','Pelvis stride yaw',-1.5,1.5,0.05)}
            ${rangeField('aimYaw','Upper-body aim yaw',-1.5,1.5,0.05)}
            ${toggleField('cqbMoving','Tactical walk / pie strafe','')}
            ${toggleField('firing','Fire cycle','')}
            ${toggleField('suppressed','Incoming suppression flinch','')}
            ${toggleField('injuredLeg','Right leg trauma','')}
            ${toggleField('crowd25','25-unit LOD2 crowd','')}`)}
        </div>

      </div>

      <div class="inspector-foot">
        <button type="button" class="nav-btn" id="btn-step-prev">← Back</button>
        <div class="step-dots">${STEP_DOTS}</div>
        <button type="button" class="save-local" id="btn-save-local">SAVE DRAFT</button>
        <button type="button" class="nav-btn primary" id="btn-step-next">Next →</button>
      </div>
    </aside>
  </main>
  <div id="ev-toast" role="status" aria-live="polite"></div>
</div>
`;

function railBlock(){
  const create = RAIL_STEPS.slice(0, 4);
  const preview = RAIL_STEPS.slice(4);
  return `<span class="rail-group">CREATE</span>${create.join('')}<span class="rail-divider"></span><span class="rail-group">PREVIEW</span>${preview.join('')}`;
}

const htmlOut = htmlTop + '\n<script>\n' + kitJs + '\n' + engineJs + '\n' + uiJs + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(rootDir, 'operator-forge.html'), htmlOut, 'utf8');
console.log('Assembled operator-forge.html (Atelier UI):', (Buffer.byteLength(htmlOut, 'utf8') / 1024).toFixed(1), 'KB');
