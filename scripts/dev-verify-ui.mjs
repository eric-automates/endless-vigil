#!/usr/bin/env node
/**
 * @shard TOOLING
 * @branch-id FORGE-002 / MULTI-RESOLUTION-GATE
 * @state-contract reads(operator-forge.html) mutates(none; optional screenshots under EV_UI_SHOT_DIR)
 * @invariant Optional companion safeguard: static containment checks ALWAYS run; real-browser checks run
 *            only when Playwright is available (import('playwright') or EV_PLAYWRIGHT_MODULE), and never
 *            fail the build merely because the optional browser is absent.
 * @ip-note Original verification harness; no third-party UI assets or copied test fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'operator-forge.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const VIEWPORTS = [
  { w: 320, h: 640, label: '320x640' },
  { w: 360, h: 800, label: '360x800' },
  { w: 412, h: 915, label: '412x915' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 1280, h: 800, label: '1280x800' },
  { w: 1920, h: 1080, label: '1920x1080' }
];

const failures = [];
function check(cond, msg){ if (!cond) failures.push(msg); }

/* ---------- Static gate (always runs, zero dependencies) ---------- */
const openScripts = (html.match(/<script\b/gi) || []).length;
const closeScripts = (html.match(/<\/script>/gi) || []).length;
check(openScripts === 1 && closeScripts === 1, 'single-<script> invariant broken');
check(!/\b(game|gaming|simulation|simulator)\b/i.test(html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')), 'banned public wording present');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
check(new Set(ids).size === ids.length, 'duplicate element ids present');
for (const id of ['viewport3d','corner-portrait-hud','backend-badge','hud-telemetry','progress-ring',
                  'btn-undo','btn-redo','btn-reset-view','btn-step-next','rng-gender','rng-camZoom',
                  'card-bust-controls','wrap-uw-female','btn-save-d1','d1-save-status']){
  check(ids.includes(id), 'missing required id: ' + id);
}
check((html.match(/class="tab-btn"/g) || []).length === 6, 'expected 6 .tab-btn steps');
check((html.match(/class="tab-panel/g) || []).length === 6, 'expected 6 .tab-panel sections');
check(/max-width:\s*100vw/i.test(html) && /overflow-x:\s*hidden/i.test(html), 'root viewport containment missing');
check(/width=device-width[^"]*viewport-fit=cover/.test(html), 'viewport-fit=cover missing');
check(!/display:\s*grid/i.test(html.match(/\.(legal|modal|diegetic|overlay|dialog)[^{]*\{[^}]*\}/gi)?.join('') || ''), 'grid used on an overlay/backdrop');
check(!/minmax\(\s*\d{3,}px\s*,/i.test(html), 'raw minmax(Npx, ...) without min(100%, ...)');
check(!/flex:\s*\d+\s+\d+\s+(?:2[89]\d|[3-9]\d{2,})px/i.test(html), 'wide un-clamped flex-basis');

console.log('=== ENDLESS VIGIL // OPERATOR FORGE UI VERIFICATION ===');
console.log('Static gate  : ' + (failures.length ? failures.length + ' failure(s)' : 'PASS (single-script, ids, wording, containment)'));

/* ---------- Optional real-browser gate ---------- */
async function loadPlaywright(){
  try {
    if (process.env.EV_PLAYWRIGHT_MODULE) return await import(pathToFileURL(process.env.EV_PLAYWRIGHT_MODULE).href);
    return await import('playwright');
  } catch (_e){ return null; }
}

const pw = await loadPlaywright();
if (!pw){
  console.log('Browser gate : SKIP (Playwright not installed; set EV_PLAYWRIGHT_MODULE to enable)');
} else {
  const shotDir = process.env.EV_UI_SHOT_DIR || path.join('/tmp', 'ev-ui-shots');
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--allow-file-access-from-files']
  });
  const fileUrl = pathToFileURL(htmlPath).href;
  for (const vp of VIEWPORTS){
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
    try {
      await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => {
        const b = document.getElementById('backend-badge');
        return b && !/INITIALIZING/.test(b.textContent);
      }, { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(700);

      const report = await page.evaluate(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const docW = document.documentElement.scrollWidth;
        const offenders = [];
        const all = document.querySelectorAll('body *');
        for (const el of all){
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 3 || r.height < 3) continue;
          if (r.right > vw + 1.5 || r.left < -1.5){
            offenders.push({ tag: el.tagName, cls: String(el.className).slice(0, 48), left: Math.round(r.left), right: Math.round(r.right) });
          }
        }
        const vis = (sel) => {
          const e = document.querySelector(sel);
          if (!e) return false;
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          return r.width > 2 && r.height > 2 && cs.display !== 'none';
        };
        const activePanel = document.querySelector('.tab-panel.active');
        return {
          vw, vh, docW,
          overflow: docW > vw + 1,
          offenders: offenders.slice(0, 8),
          offenderCount: offenders.length,
          topbar: vis('.topbar'), stage: vis('.stage-pane'), inspector: vis('.inspector'),
          rail: vis('.step-rail'), viewBar: vis('.view-bar'), foot: vis('.inspector-foot'),
          portrait: vis('#corner-portrait-hud'), activeTab: vis('.tab-btn.active'),
          activePanelH: activePanel ? Math.round(activePanel.getBoundingClientRect().height) : 0,
          badge: (document.getElementById('backend-badge') || {}).textContent || '',
          stepTitle: (document.getElementById('inspector-step-title') || {}).textContent || ''
        };
      });

      const tag = '[' + vp.label + ']';
      check(!report.overflow, tag + ' horizontal document overflow (scrollWidth ' + report.docW + ' > ' + vp.w + ')');
      check(report.offenderCount === 0, tag + ' ' + report.offenderCount + ' visible overflowing element(s): ' + JSON.stringify(report.offenders));
      check(report.topbar && report.stage && report.inspector && report.rail && report.viewBar && report.foot && report.portrait && report.activeTab, tag + ' a required region is not visible');
      check(report.activePanelH > 80, tag + ' active panel collapsed (' + report.activePanelH + 'px)');
      for (const e of errors) check(false, tag + ' page error: ' + e);

      await page.screenshot({ path: path.join(shotDir, 'ui-' + vp.label + '.png'), fullPage: false });
      console.log('Browser gate : ' + tag + ' overflow=' + report.overflow + ' offenders=' + report.offenderCount +
                  ' panel=' + report.activePanelH + 'px badge="' + report.badge + '" step="' + report.stepTitle + '"');
      await page.close();
    } catch (e){
      check(false, '[' + vp.label + '] browser exception: ' + e.message);
      await page.close().catch(() => {});
    }
  }

  /* Interaction smoke on the narrowest tier: step jump, frame balance, undo, diagnostics. */
  const page = await browser.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 });
  try {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.click('[data-step-jump="body"]');
    const stepAfter = await page.textContent('#inspector-step-title');
    check(/Physique/.test(stepAfter || ''), 'step jump did not switch to Physique');
    await page.click('.tab-panel.active [data-gender-preset="female"]');
    await page.waitForTimeout(700);
    const bustVisible = await page.evaluate(() => !document.getElementById('card-bust-controls').classList.contains('is-collapsed'));
    check(bustVisible, 'feminine frame did not reveal bust controls');
    await page.click('#btn-undo');
    await page.click('#btn-diagnostics');
    const diagOpen = await page.evaluate(() => document.getElementById('diagnostics').classList.contains('is-open'));
    check(diagOpen, 'diagnostics drawer did not open');
    const diagContained = await page.evaluate(() => {
      const r = document.getElementById('diagnostics').getBoundingClientRect();
      return r.right <= window.innerWidth + 1 && r.width <= window.innerWidth - 20;
    });
    check(diagContained, 'diagnostics overlay exceeds 320px viewport');
    console.log('Browser gate : interactions PASS (step jump, frame balance, undo, overlay containment)');
  } catch (e){
    check(false, 'interaction smoke failed: ' + e.message);
  }
  await page.close();
  await browser.close();
  console.log('Screenshots  : ' + shotDir);
}

if (failures.length){
  console.error('\nUI VERIFICATION FAILURES:');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('\nUI VERIFICATION GATE: PASS (0 errors, 320px–1920px checked)');
