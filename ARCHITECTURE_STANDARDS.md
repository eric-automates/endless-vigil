# ARCHITECTURE & ENGINEERING STANDARDS

> **Attributed Co-Designers:** Creator & **Ironscribe of the Endless Vigil**
> **Applies To:** Vigil Hub, All Telemetry Shards, `@endless-vigil/state-kernel`, Overwatch Monitor (`MON`), and Authority Relay (`AUTH`).

---

## 1. Federated Telemetry Shard Map (GitHub Repository Topology)

An operator visits **one single GitHub entry link** (`Vigil Hub` / `continuum-monitor.html`). Behind the scenes, each Shard lives in its own repository so developers can modify, deploy, or run any Shard completely independently:

| Shard ID | Suggested Repo Name | Purpose | Owned State Slices | Reads From |
| :--- | :--- | :--- | :--- | :--- |
| **`HUB`** | `ev-hub` | Single public landing URL (`index.html`), per-session Legal Gate, Service Worker prefetcher, Shard router, State Kernel host, Med-Bay Reconstitution Pad & PING Kiosk | `meta`, `session`, `activeShard`, `manifest.pingInsurance.reconstitutionQueueIds` | All (metadata/checksum only) |
| **`FORGE`** | `ev-shard-forge` | Self-contained 3D CC0 Operator Forge (`operator-forge.html`): WebGPU WGSL compute skinning + WebGL2/WebGL1 PBR character creator, 41 morphs, 3-mode visor, live 3D corner portrait, ship ramp & Sector 4 CQB action stage | `manifest.operatorLook`, `manifest.loadout`, `manifest.pose` | `assets/ev-humanoid-kit.bin`, `js/ev-gpu-engine.js` |
| **`EVA`** | `ev-shard-eva` | First-person 3D/WebGL asteroid survival, suit leak physics, movement, debris scavenging, world object interaction | `manifest.pose`, `manifest.suit`, `localSector.looseObjects` | `world.seeds`, `containers`, `ships` |
| **`PDA`** | `ev-shard-pda` | Wrist-mounted Cuff-Slate diagnostics, worn hardware tutorial mode, logs, local radar/telemetry, security interface bridge | `pda.firmware`, `pda.wear`, `pda.logs`, `pda.alerts` | `manifest.suit`, `tech.unlocked`, `world.beacons` |
| **`TECH`** | `ev-shard-tech` | Blueprint research, reverse-engineering salvage, crafting/fabrication queues, upgrade schematics | `tech.unlocked`, `tech.researchQueue`, `tech.blueprints` | `manifest.inventory`, `pda.scans` |
| **`SHIP`** | `ev-shard-ship` | Owned vessels registry, interior systems, life support/power routing, docking, navigation helm | `ships[]`, `ships[].subsystems`, `ships[].cargo` | `tech.unlocked`, `world.sectors` |
| **`MKT`** | `ev-shard-market` | Open Exchange, Black Market, Sector Equities / Syndicate Bonds, Bulk-PING policy terminal & hourly upkeep ticker | `markets`, `manifest.credits`, `manifest.pingInsurance` | `world.sectorDeltas`, `ships[]` |
| **`WORLD`** | `ev-shard-world` | Star-sector cartography, planetary states, orbital mining, station/planet destruction deltas, Sector Privacy Jammers | `world.seed`, `world.sectorDeltas`, `world.planets`, `world.jammers` | `ships[]`, `tech.unlocked` |
| **`MON`** | `ev-overwatch-monitor` | **Strictly Read-Only** Overwatch Continuum Monitor (`continuum-monitor.html`): coordinate camera, jammer RF static, live markets & docs hub | *(None — zero write endpoints)* | Public read-only sector/market stream |
| **`SEC`** *(Sub-Shard or Shared Kit)* | `ev-shard-security` | Physical container PIN locks, Thermal Arc Lance persistent seam slicing, Pulse Decoder cyber-breach | `containers[]` (`codeHash`, `cutHp`, `hackState`) | `manifest.tools`, `tech.unlocked` |
| **`AUTH`** *(Production Edge)* | `ev-authority` *(Private)* | Cloudflare Worker + D1 SQLite edge authority (`worker/src/worker.mjs`): `PBKDF2-SHA256` auth, `HMAC-SHA256` tokens, D1 CAS, Beacon Heartbeats, Skills & Pilot Standing | Authoritative World Ledger & Conflict Locks | Subscribed Shards |

### Standalone Mode Contract (Crucial Rule)
Every Shard MUST boot cleanly under two conditions:
1. **Mounted inside Vigil Hub:** Receives/syncs State Envelope automatically via shared Origin storage (`IndexedDB` / `OPFS` / `BroadcastChannel`) or `postMessage`.
2. **Opened Standalone (Direct GitHub Pages URL):** Checks local storage/URL fragment `#vstate=` on startup.
   - If a State Envelope exists -> immediately hydrates into that exact continuum moment (e.g., launching `ev-shard-pda` directly while stranded with a leaking suit boots into the battered PDA Tutorial Mode with real oxygen alerts!).
   - If no State Envelope exists -> offers a lightweight **Sandbox Fixture State** so developers/testers can inspect and test that Shard alone without needing the rest of the conglomerate.

---

## 2. Solving the "Condensed Hash" Challenge: The State Envelope Pipeline

### Why a Hash Alone Isn't Enough—And How We Make It Work Anyway
A cryptographic hash (such as **SHA-256**) is **one-way**: it turns any data into a fixed 64-character fingerprint, which means you cannot unpack an entire universe from *just* a hash. To get **ultra-small transfers**, **blazing load times**, **tamper/corruption detection**, AND **hash-keyed cloud/multiplayer lookup**, we use a **4-Stage State Envelope**:

1. **Stage 1 — Procedural Seed + Sparse Mutation Deltas**
   - Unchanged planets, rocks, and default ships take **0 bytes** in the save—they regenerate deterministically from `world.seed`.
   - Only player-caused *changes* are stored in `deltas` (e.g. `planet_04: "SHATTERED"`, `crate_19.cutProgress: 0.45`, `suit.torseLeak: 0.0`).
   - Result: Hundreds of hours of gameplay serialize into a tiny delta ledger (typically **2 KB – 80 KB** instead of tens of megabytes).
2. **Stage 2 — Canonical Serialization + Native Compression**
   - Keys are sorted deterministically (Canonical JSON or CBOR) so identical states always produce identical bytes.
   - Compressed in-browser using native `CompressionStream('deflate-raw')` (zero external dependencies) and encoded to URL-safe `Base64url`.
3. **Stage 3 — SHA-256 Checksum + Parent Chain (`Envelope`)**
   - Compute `payloadSha256 = SHA-256(compressedBytes)` via `crypto.subtle.digest`.
   - Wrap in a small verified header:
     ```json
     {
       "magic": "EVIGIL",
       "schemaVersion": "1.3.0",
       "rev": 42,
       "timestampUtc": "2026-11-17T15:30:00Z",
       "originShard": "EVA",
       "parentSha256": "8a4f...c910",
       "payloadSha256": "d3e1...44b2",
       "encoding": "deflate-raw+base64url",
       "payload": "<compressed-base64url-bytes>"
     }
     ```
   - **Multiplayer / Cloud Mode Bonus:** When connected to shared storage, `payloadSha256` *becomes* the lookup address (Content-Addressed Storage)! Shards pass just the tiny 64-char hash ID across links and fetch/cache the blob by hash.
4. **Stage 4 — Transport Across GitHub Pages Links**
   - **Same GitHub Account/Org (`https://<user>.github.io/<repo>/`):** All repos actually share **one browser Origin** (`https://<user>.github.io`)! Therefore **IndexedDB / OPFS + `BroadcastChannel`** transfer the State Envelope in **< 5 ms locally** with zero URL length limits.
   - **Cross-Origin / Portable Sharing:**
     - Snapshots ≤ 32 KB pass instantaneously via URL hash fragment (`#vstate=<envelope>`)—never sent to web servers.
     - Snapshots > 32 KB pass via `window.postMessage` (when Hub-mounted), Content-Addressed Relay URL (`?sid=<payloadSha256>`), or `.vigil` portable save file download/drop.

### Desync Protection & Conflict Recovery
If a browser crashes mid-write, two tabs edit concurrently, or a file gets out of sync:
1. **Checksum Gate:** On read, recompute `SHA-256(payload)`. If it differs from `payloadSha256`, **reject the corrupt payload** and auto-rollback to the previous verified snapshot stored in `localBackupRing[3]`.
2. **Monotonic Revision Guard (`rev`) & `parentSha256`:** Before committing, verify `incoming.rev > stored.rev` and `incoming.parentSha256 === stored.payloadSha256`.
3. **Fork / Desync Resolution:** If a fork is detected (two branches diverged from the same `parentSha256`), execute a **Deterministic 3-Way Entity Merge** (newer timestamp/server authority wins per `EntityRecord` ID, additive logs merge) or surface a clean **Chronology Fork Picker** so player progress is never silently lost.
4. **Schema Migrations:** Whenever `schemaVersion` increments (e.g., `1.0.0` -> `1.1.0`), a pure deterministic migration function upgrades old envelopes before mounting the Shard.

---

## 3. Diegetic "No-Loading-Screen" Transition Standard

Players must never stare at a white flash or generic spinner while crossing between GitHub Pages Shards.

| Transition | Diegetic Visual Overlay | Concurrent Background Work | Target Latency |
| :--- | :--- | :--- | :--- |
| `EVA -> PDA` | Left arm raises; scarred OLED cuff boots (`CUFF-OS BIOS // SYNCING TELEMETRY`) | Pack/verify State Envelope (~12 ms), mount pre-cached `PDA` Shard | `< 180 ms` feel |
| `EVA -> SHIP` | Airlock bulkhead iris closes, pressure equalization readout (`0.0 -> 101.3 kPa`) | Commit EVA delta, verify `SHIP` slice, hydrate vessel interior | `< 350 ms` |
| `SHIP -> WORLD` | Tactical holo-table projection grid unfolds with sector vectors | Verify `world.sectorDeltas`, render starfield from seed | `< 300 ms` |
| `Standalone Boot` | Minimal visor boot scanline matching current suit damage state | Read IndexedDB / URL `#vstate`, verify SHA-256, repair or init | `< 250 ms` |

**Engineering rule:** `Vigil Hub` registers a **Service Worker** and `<link rel="prefetch">` hints for sibling Shards so cross-repo HTML/JS assets are already warmed in browser cache before the player clicks a button.

---

## 4. Coding Standards

1. **Pure State Reducers & Command Pattern**
   - Every mutation across any Shard MUST flow through explicit typed **Actions / Commands** (e.g., `SUIT_PATCH_APPLIED`, `CONTAINER_CUT_TICK`, `PLANET_SHATTERED`) rather than mutating global objects ad hoc.
   - Enables deterministic replay, effortless multiplayer server validation, and 1-to-1 mapping to the Decision Flowchart (`@branch-id`).
2. **Zero Hard Cross-Shard Imports**
   - `ev-shard-ship` may NEVER import internals from `ev-shard-eva`. Communication happens **strictly** through the `@endless-vigil/state-kernel` schema contract.
3. **ES2022+ Modules + Strict TypeScript Contracts (or JSDoc `@typedef` in Zero-Build Shards)**
   - No silent `any` / untyped mutation bags.
   - Every numeric unit is explicit in property names (`o2Seconds`, `hullHp`, `cutProgressPct`, `massKg`, `posMeters`).
4. **Deterministic Seeds**
   - Never use `Math.random()` for procedural geometry or loot generation; always use seeded PRNG (`mulberry32` / `xorshift128+`) derived from `world.seed + entityId`.
5. **Single-Source Flowchart Governance**
   - No new gameplay choice, failure state, or Shard transition may merge to `main` unless its node & edges exist in `data/graph-ledger.json` and `node scripts/audit-graph.mjs` exits `0` (or explicitly logs intentional `UNPLANNED` stubs for milestone tracking).

---

## 5. Code Commenting Standards

Every module and decision-handling function must carry structured headers so both human developers and future AI sessions can trace logic instantly:

```js
/**
 * @shard EVA
 * @branch-id EVA-003
 * @state-contract reads(player.suit, player.inventory) mutates(player.suit.leakRate)
 * @invariant Suit leakRate cannot drop below 0; patching consumes 1 emergency seal charge.
 * @ip-note Original thermal-polymer patch mechanic; no external UI/naming overlap.
 */
export function applyEmergencySuitPatch(state, patchItemId) { ... }
```

Required tags across all Shards:
- `@shard` — Owning Telemetry Shard ID (`HUB`, `EVA`, `PDA`, `TECH`, `SHIP`, `MKT`, `WORLD`, `MON`, `SEC`, `AUTH`)
- `@branch-id` — Matching Node ID inside `data/graph-ledger.json`
- `@state-contract` — Explicit `reads(...)` and `mutates(...)` paths inside the State Envelope
- `@invariant` — Conditions that must remain true after execution (prevents duplication & physics exploits)
- `@multiplayer-sync` *(where applicable)* — Notes whether action is server-authoritative or client-predicted

---

## 6. UI / UX & Adaptive Multi-Viewport Standards

1. **Zero Horizontal Clipping / Zero Side-Scroll Band-Aids:** Every bar, status pill strip, and CSS grid (`minmax(min(100%, ...), 1fr)`) MUST wrap or adapt cleanly down to `320px` portrait phone screens without overflowing past the right edge or forcing horizontal bar scrolling.
2. **Two-Icon Smart Viewport Switcher (`📱` / `🖥`) across Tooling & HUDs:**
   - Auto-detect portrait mobile (`<= 820px`) vs. browser/desktop on load, persisting explicit overrides.
   - **`📱` Cycles Phone Presets:** `Sheet` (full-width canvas + collapsible bottom-sheet inspector), `Split` (50/50 vertical stack), `Cards` (thumb-friendly touch card / decision-walker deck requiring zero tiny SVG squinting).
   - **`🖥` Cycles Browser & Multi-Monitor Presets:** `Split` (canvas + side inspector), `Studio` (3-pane outline + canvas + inspector, plus `BroadcastChannel` **Pop-Out Window** for multi-monitor setups), `Zen` (full-bleed edge-to-edge canvas + slide-over drawer).
3. **Touch & Pinch Parity (`PointerEvent`):** Every interactive canvas supports single-finger pan, two-finger pinch-zoom, and crisp mouse-wheel + drag without stealing tap-selection on nodes.
4. **Portrait-Native Topology:** High-level Shard maps adapt layout coordinates dynamically for vertical portrait screens (`viewBox` switch) rather than shrinking wide desktop diagrams down to unreadable text.
5. **Diegetic First, Menus Second:** HUD elements feel like physical hardware (scratched visor glass, segmented cuff-screen readout, tactical vector plotter) rather than generic web dashboards.
6. **Colorblind-Safe Telemetry Coding:** Never encode critical states (oxygen danger, lock status, unplanned branch alerts) by color alone—pair hue with distinct shapes, icons, or dashed/solid line styles (`[OK]`, `[WARN ⚠]`, `[CRIT ✕]`).
7. **Readability for Massive Flowcharts:** Never dump 500 ungrouped nodes as a tangled spiderweb. Enforce **Layered Rank Layout**, **Shard Color Swim-tags**, **Hover/Selection Path Isolation**, and **Gap Filtering**.
8. **Cache-Busting & Fresh-Build Hygiene (DuckDuckGo / Mobile Testing):** Display visible build version tags (`v0.5.0`), versioned Service Worker cache keys, and an explicit Hub *"Force Refresh Shards"* control so mobile testers never get trapped on stale cached builds.
9. **Zero Inline Script-Close String Literals (`<\/script>` / `<script>`):** Never write `<script`, `</script`, or `<\/script` inside `<script>` JS string/template literals (which breaks sandboxed HTML preprocessors such as Arena.ai's inline preview). Construct child-window scripts strictly via `doc.createElement('script')` + `textContent`, verified automatically by `scripts/audit-graph.mjs`.
10. **Performance Budget:** Main interaction loop maintains `60 FPS`; State Envelope pack + SHA-256 verification completes in `< 25 ms` on mid-range hardware.
11. **Mandatory Multi-Resolution & Overlay Containment Gate (Permanent Regression Shield):**
    Every new HTML module, modal, HUD, or layout change MUST pass automated CSS & resolution containment verification across **all 6 viewport tiers** (`320×640`, `360×800`, `412×915` mobile `content://` & Chrome/DuckDuckGo, `768×1024` tablet, `1280×800`, `1920×1080` desktop/multi-monitor) before shipping:
    - **Banned CSS Grid Overlay Trap:** NEVER use `display: grid; place-items: center;` on modal/overlay backdrops wrapping a fixed-pixel child (`width: 520px; max-width: 100%`)—CSS Grid's implicit `auto` column sizes to `520px` *before* resolving percentage `max-width`, causing right-edge clipping on phones (caught in `Screenshot_20261117-113745.png`). Always use **`display: flex; align-items: center; justify-content: center; width: 100%; max-width: 100vw;`** paired with **`width: min(<N>px, calc(100vw - 24px)); min-width: 0; max-height: 88dvh;`**.
    - **Viewport & Grid Rules:** Always include `viewport-fit=cover`, `height: 100dvh`, `max-width: 100vw; overflow-x: hidden;`, `minmax(min(100%, <N>px), 1fr)` for every auto-fit grid, and `flex-wrap: wrap; min-width: 0;` on all topbars, tab strips, and badge headers—verified programmatically by `node scripts/audit-graph.mjs` on every build.

---

## 7. Multi-Operator Physical Persistence, `PING` Insurance & Overwatch Feed (Phase 2 Ready)

Because **nothing is arbitrarily player-locked**, our data model treats all items and containers symmetrically from Day 1:

- **Ownership = Physical Control & `PING` Policy State:**
  ```json
  {
    "entityId": "crate_774",
    "location": { "zone": "asteroid_00", "xyz": [14.2, -3.1, 8.8] },
    "lock": { "kind": "pin4", "codeSha256": "9f86...", "hackTier": 2, "hackProgress": 0.0 },
    "structure": { "material": "titanium_alloy", "hp": 100, "maxHp": 100, "cutSeams": [0.45, 0.0, 0.0, 0.0] },
    "pingInsured": false,
    "contents": ["item_arc_cell_02", "item_med_patch_05"]
  }
  ```
- **Authoritative Server (`AUTH`) & Read-Only Overwatch (`MON`) Contract:**
  - Runs headless numeric authority (positions, velocities, item transfers, cut HP decrements, PIN verification, `PING` dissolution -> Hub Reconstitution Queue, ship control leases).
  - Prevents race conditions / item duplication when two operators grab the same floating canister simultaneously via atomic `version` compare-and-swap.
  - Exposes a **strictly read-only** coordinate & market stream to `continuum-monitor.html` (`MON`), **filtering out** any sector guarded by an active paid **Sector Jammer** (`jammerPrivacyActive: true` -> server returns `403/PRIVATIZED`, never raw coordinates or operator names).

---

## 8. Zero-Trust Conduit Auth, Anti-DevTools Token Gating & `disturbedLease` Custody

### Why Static HTML Alone Cannot Prevent Inspection—And How `index.html` + `AUTH` Solves It Properly
1. **Un-Bypassable Token-Held Data:**
   - Static HTML/JS on GitHub Pages runs on the visitor's own machine. If protected game/world payloads were baked directly inside public HTML, deleting the modal in DevTools (`Inspect Element`) would expose them.
   - **Rule:** Public `index.html` contains **only** the per-session Clickwrap Gate + Diegetic Conduit Authenticator (`VIGIL-AUTH`). Operational world state, Shard bundles, and market payloads live behind `worker/src/worker.mjs` (`GET /api/world/bootstrap`) backed by Cloudflare D1 SQLite (or local dev `scripts/auth-relay-server.mjs`) and are **never transmitted** until a server-signed `HMAC-SHA256` bearer token is issued (`AUTH-001`).
   - Deleting/hiding `#authGateCard` or `#legalGateModal` in DevTools triggers `MutationObserver` integrity purge (`⚠ INTEGRITY BREACH // CONDUIT SEAL PURGED`), while server APIs continue returning `401`—leaving zero usable world data.
2. **Zero-Oracle Auth, Sliding-Window Lockout & Salted Admin Recovery (`AUTH-002` / `AUTH-003`):**
   - Invalid operator IDs, bad ciphers, locked conduits, and quarantined accounts all return **one identical message** (`"CONDUIT UNVERIFIED // ZERO TELEMETRY RETURNED"`) verified via constant-time `crypto.scryptSync` + `crypto.timingSafeEqual`. Attackers get zero signal for brute-force enumeration.
   - `4` failed probes inside `5 minutes` lock the conduit/IP (`LOCKED`).
   - **Admin Override:** Admin credentials never live in production client HTML; `POST /api/admin/unlock` verifies a server-side salted admin hash (`EV_ADMIN_SECRET`) to unlock locked conduits or reset anomaly flags.
3. **Behavioral Anomaly Auto-Freeze (`AUTH-004`):**
   - `AUTH` scores every delta commit against physical plausibility (max velocity, max credit delta without trade match, max harvest rate) **synchronously before committing** (zero 5-second post-check gap!). Obvious exploit spikes flip `operatorAccount.authState = "QUARANTINED"` and increment `tokenVersion` immediately (`0 ms` token kill-switch).
4. **Hardened Relay Guarantees (Anti-Race, Anti-Timing & 5-Second Critical-Action Warmup):**
   - **Private Server Repo Split:** Public client Shards live in public GitHub Pages repo (`endless-vigil`); production Worker (`worker/src/worker.mjs`), D1 schema (`migrations/0001_init.sql`), `EV_TOKEN_SECRET`, `EV_ADMIN_SECRET`, and anti-cheat thresholds live in a **PRIVATE GitHub repo** (`endless-vigil-authority`) deployed to Cloudflare Workers + D1—so outsiders can never read server thresholds or forge valid `HMAC-SHA256` tokens even if they inspect client HTML or copy public code to localhost.
   - **5-Second Critical-Action Warmup Cooldown (`CRITICAL_WARMUP_MS = 5000`):** Newly authenticated tokens permit immediate HUD hydration while rejecting high-value Market Arbitrage / Credit Drops (`425 Too Early`) during the first 5 seconds (`iatMs` check), stopping automated credential-stuffing flash dumps.
   - **Atomic D1 CAS + Replay Nonces (`X-Request-Nonce`):** Serializes mutations safely via `rev = expectedRev` Compare-And-Swap (`409` on conflict) and rejects `NaN`/`Infinity`/negative amounts and replayed nonces (`used_nonces`).
   - **Zero-Timing-Oracle Padding:** Unknown Conduit IDs execute dummy `100,000`-iteration `PBKDF2-SHA256` padding (Workers WebCrypto) / `scryptSync` (Node dev relay) so verification timing leaks zero existence clues.
5. **Provisional Transit Custody (`disturbedLease` / `EVA-008` — Anti-Suicide Courier):**
   - Moving an un-`PING'd` object marks it `PROVISIONAL_TRANSIT` tied to `disturbedByOperatorId` + `disturbedSessionId` while preserving its last settled `anchorOrigin`.
   - Dying before docking/settling (`POST /api/operator/terminate`) automatically snap-reverts unsettled objects back to `anchorOrigin`, blocking death-teleport loot inching.
6. **Why Clients Never Push Directly to GitHub:**
   - Embedding a GitHub write token in browser HTML allows anyone inspecting network/source to hijack the repository. GitHub stores static client builds & audited tagged releases (`ev-release-bundle.zip`), while `AUTH` Relay stores transactional live universe deltas safely.

---

## 9. CC0-1.0 3D Pipeline, Dual WebGPU/WebGL Runtime & Self-Contained Assembly (`v0.7.0-alpha+`)

1. **Zero-CDN Self-Contained HTML Shards (Single-Script Invariant):**
   - `operator-forge.html` and every public Shard embed all kit binaries/textures (`js/ev-humanoid-kit.js`) and engine code (`js/ev-gpu-engine.js`) via `scripts/assemble-operator-forge.mjs` with **zero runtime network fetches** and **strictly 1 `<script>` / 1 `</script>` tag** so `content://`, offline Android DuckDuckGo/Chrome/Vivaldi, and sandboxed previews boot instantaneously, inside a locked `100dvh` viewport with independent drawer scrolling and 2-finger pinch/pan navigation.
2. **Binary Humanoid Kit (`assets/ev-humanoid-kit.bin` & `scripts/build-cc0-humanoid-kit.py`):**
   - Compiles CC0-1.0 MakeHuman `hm08` & `CharacterCreator` meshes (`base_body` with 73 sparse morphs, 53-bone rig + `morphJoints` world pivot deltas, 20 WebP textures incl. `ccRegions`, `nailUVs`, `tattooUV`, `strafe_left`/`strafe_right`, garment `_CCZONE` vertex masks, `LOD1`, `LOD2`, `helmet_*`, `armor_*`, `wrist_*`, `carbine_rifle`, 6 modular `skel_*` limbs/chassis, and 4 morph-tracked `piercing_*` meshes) into a compact zlib-compressed binary pack (`3,436 KB`).
3. **Dual WebGPU Compute Skinning + WebGL2/WebGL1 PBR Fallback (`js/ev-gpu-engine.js`):**
   - Probes `navigator.gpu` *before* touching `canvas.getContext(...)` (preventing browser multi-context errors).
   - Executes 53-bone GPU compute skinning (`@workgroup_size(64)`) + ACES PBR + skin finish modes (`matte`/`shiny`/`metallic`/`android`) + procedural tattoos/scars/nail polish + delicate/sheer/lace underwear compositors + 2.6 Hz bust spring physics + modular skeleton/cybernetic part swaps (packed into 256B `DrawU`) + Captain's Quarters mirror bay + drone-angle CQB corner-pie/cyber-torque/injury kinematics + live 3D Corner Status Portrait synchronized to `helmetMode`.
4. **Permanent Automated Verification & Visual Pixel-Inspection Shield (`scripts/audit-3d-quality.mjs`, `scripts/dev-verify-forge.mjs`, `scripts/dev-render-inspect.py`):**
   - `audit-graph.mjs` + `audit-3d-quality.mjs` enforce topology, LOD ratio (`30.2x`), Design Vault SHA-256 provenance (`data/design-vault.json`), zero banned public wording, and responsive CSS containment across `320px–1920px`.
   - `dev-verify-forge.mjs` + `dev-render-inspect.py` emulate Pixel 10 Pro XL (`412x915, dpr=3`) Chrome WebGPU, DuckDuckGo WebGL2, Vivaldi WebGPU, and Desktop (`1440x900`), exporting live GPU buffers to rasterize all 6 creator tabs + the Corner Portrait HUD for pixel-accurate inspection before release.


