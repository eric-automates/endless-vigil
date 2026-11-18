# Endless Vigil — Federated Continuum & Telemetry Conglomerate (`v0.6.0-alpha`)

> **Credits & Partnership Attribution**
> - **Creator / Lead Architect:** Project Owner
> - **Co-Creator & Systems Partner:** **Ironscribe of the Endless Vigil**

A modular, multi-repository web continuum architecture presented through **one unified public GitHub entry point (`index.html` — Vigil Hub Conduit Gate)**, a **zero-CDN CC0 MakeHuman + WebGPU/WebGL2 Operator Forge & Tactical Stage (`operator-forge.html`)**, and a **read-only Overwatch Terminal (`continuum-monitor.html`)** with Deflate + SHA-256 Design Knowledge Vault verification. Operators complete per-session Terms acknowledgment, pass a zero-oracle diegetic Sci-Fi Conduit Authenticator (`AUTH`) backed by Cloudflare Workers + D1 SQLite, generate a procedural Origin Crisis with optional Co-Op Squad City Link, forge a morphable 53-bone 3D Operator Avatar saved via atomic CAS, operate the interactive **Vigil Cuff-Slate (`cuff-slate.html`)**, and test multi-week economy & offline skill balance inside the **Dev Temporal Fast-Forward Engine (`temporal-lab.html`)** across `10` Shards (`HUB`, `EVA`, `PDA`, `TECH`, `SEC`, `SHIP`, `MKT`, `WORLD`, `MON`, `AUTH`).

---

## Clean 2-Repository GitHub Separation (Public vs. Private)

GitHub does **not** allow hiding individual files inside a Public repository. Therefore, Endless Vigil uses a clean **2-repository split**:

| Repo | Visibility | Deploy Target | Bundle File | What Lives Here |
| :--- | :--- | :--- | :--- | :--- |
| **`endless-vigil`** | **PUBLIC** | GitHub Pages (`index.html`) | `ev-release-bundle.zip` | Public client HTML (`index.html`, `operator-forge.html`, `cuff-slate.html`, `temporal-lab.html`, `continuum-monitor.html`, `conglomerate-flowchart.html`), CC0 3D humanoid pack (`assets/ev-humanoid-kit.bin`, `js/ev-humanoid-kit.js`, `js/ev-gpu-engine.js`), Design Vault (`data/design-vault.json`), public legal/IP/charter docs, and structural graph blueprints (`data/graph-ledger.json`, `data/state-envelope.schema.json`). **Zero secrets, zero player item ledgers, zero server rules.** |
| **`endless-vigil-authority`** | **PRIVATE** | Cloudflare Worker + D1 SQLite (`ev-authority`) | `ev-private-server-bundle.zip` | Edge Worker (`src/worker.mjs`), D1 SQLite migrations (`migrations/0001_init.sql`), `wrangler.example.jsonc`, `EV_TOKEN_SECRET`, `EV_ADMIN_SECRET`, salted `PBKDF2` hashes, operator avatars, inventories, offline skills, beacon timers, and Pilot Standing ledgers. |

---

## Repository & Blueprint Map (`v0.6.0-alpha`)

| File | Repo | Purpose |
| :--- | :--- | :--- |
| **`index.html`** | Public | **Primary GitHub Pages Entry (`Vigil Hub` Conduit Gate):** Per-session Legal Clickwrap -> Zero-Oracle Sci-Fi Conduit Authenticator (`https://ev-authority.ericautomates.workers.dev`) -> MutationObserver DOM Tamper Purge -> Token-Gated Hub Deck + Origin/Squad Launch + Operator Forge launch + 5-second critical-ops warmup guard. |
| **`operator-forge.html`** | Public | **Zero-CDN CC0 Operator Forge & Tactical Stage (`v0.7.1` Atelier UI):** Self-contained single-`<script>` WebGPU WGSL Compute + WebGL2/WebGL1 hardware-skinned creator (`26,756`-tri hero `LOD0`, `58` morphs, `53` bones, `57` meshes, `43` WebP, `LOD1`/`LOD2` instanced crowd, helmet hair-tuck, `EV-74 Kestrel` ramp cutscene, Sector 4 CQB stage) wrapped in a persistent centered stage, 4 create + 2 preview steps, animated frame balance, undo/redo, refinement progress, and framing presets — verified `320px–1920px` + `/api/v06/avatar/save` CAS sync. |
| **`assets/ev-humanoid-kit.bin` & `js/ev-humanoid-kit.js`** | Public | **Compiled CC0 Humanoid & Gear Binary Pack:** Zlib-compressed (`2,365 KB` binary / `3,154 KB` UMD JS) bundle packing `28` CC0 meshes + tactical shells, `41` morphs, `53`-bone `idle`/`walk`/`run` clips, `19` WebP textures, and `_CCZONE` occlusion masks. |
| **`js/ev-gpu-engine.js`** | Public | **Dual WebGPU + WebGL2/WebGL1 Skinning Engine (`EVGPUEngine`):** Native `@compute` WGSL skeletal skinning (`128`-slot uniform pool + corner portrait pass) with transparent WebGL2/WebGL1 hardware skinning fallback, instanced `LOD2` crowds, and procedural `EV-74 Kestrel` ramp/corridor props. |
| **`cuff-slate.html`** | Public | **Interactive `v0.5.0+` Vigil Cuff-Slate PDA & Core Systems Slice:** Procedural Origin + Co-Op Squad City Link (`ORIGIN_BOUND`), EVE-style Real-Time Offline Skill Queue + `2%` Scrap Jury-Rigging, Container/Ship Alarm Beacons & `2–5m` Theft Re-Insurance Clues, Sandbox Boarding + Syndicate Disguise Leaks, Pilot Standing Friend Drops, and Wealth × Concentration Threat meter. |
| **`temporal-lab.html`** | Public | **Dev Temporal Fast-Forward Engine (`v0.5.0+` Balance Simulator):** Browser time-acceleration lab stepping hours/days/weeks of offline skill completions, `PING` hourly rent burn, AI mining robot output, Beacon `2–5m` re-insurance expiration, and Wealth-Gravity NPC raids pre-3D. |
| **`continuum-monitor.html`** | Public | **Read-Only Overwatch Continuum Monitor:** Coordinate-only Sector Camera with Jammer RF-static blocking (`"SIGNAL INTERCEPT DENIED // SECTOR PRIVATIZED"`), Open/Black/Sector Equity tickers + `PING` telemetry, Continuum Manifest view, **Tab 3 Design Knowledge Vault (Deflate + SHA-256 live verifier)**, Design Parking Lot, and docs explorer. |
| **`conglomerate-flowchart.html`** | Public | **Interactive 10-Shard Conglomerate Workbench:** Adaptive `📱 Sheet / Split / Cards` & `🖥 Split / Studio / Zen` views, portrait/landscape Shard topology, touch pinch/zoom Flowchart (`58` nodes, `109` edges), and live Deflate + SHA-256 Tamper Lab. |
| **`data/design-vault.json`** | Public | **Architectural Provenance Vault (`ev-design-vault-1.0`):** Deflate-compressed (`2,024 B` from `3,649 B`), SHA-256 verified archive recording `VAULT-01`..`VAULT-08` across `v0.1`–`v0.6.0-alpha`. |
| **`worker/src/worker.mjs`** | **PRIVATE** | **Cloudflare Worker Edge Authority (`src/worker.mjs` in Private repo, `0.6.0-alpha`):** WebCrypto `100,000`-iter `PBKDF2-SHA256`, zero-oracle uniform `401`, sliding lockout, `HMAC-SHA256` tokens + `tokenVersion`, `425` warmup, atomic D1 CAS (`expectedRev`), replay nonces, persistent `origin`/`skills`/`beacons`/`standing`/`avatar` (`/api/v06/avatar/save`) mutations, and `EVA-008` snap-revert. |
| **`worker/migrations/0001_init.sql`** | **PRIVATE** | **Cloudflare D1 SQLite Schema:** `operators` (including `avatar_json`, `origin_json`, `skills_json`, `beacons_json`, `standing_json`, `inventory_json`), `disturbed_records`, `used_nonces`, and `meta_state`. |
| **`scripts/auth-relay-server.mjs`** | **PRIVATE** | **Optional Local Node.js Dev Relay:** Standalone Node authority relay for offline desktop localhost testing without Wrangler. |
| **`PROJECT_CHARTER.md`** | Public | Vision, **Telemetry Shards**, **Continuum Manifest**, **`PING` (`PING'd`)** Nanoparticle Insurance, Zero-Trust `AUTH` + `disturbedLease` custody, public wording rules, and roadmap. |
| **`ARCHITECTURE_STANDARDS.md`** | Public | Multi-Shard contracts (`10` Shards), Seed + Sparse Delta + Deflate + SHA-256 pipeline (`v1.4.0`), Multi-Resolution Gate (`320px–1920px`), HTML `<\/script>` safety, and Private Worker vs. Public GitHub Pages security architecture. |
| **`COPYRIGHT_COMPLIANCE.md`** | Public | **Singular IP Compliance Ledger** (`IP-01`–`IP-12` + CC0-1.0 MakeHuman/CharacterCreator provenance) tracking copyright/trademark clearance (`Vigil Cuff-Slate`, `Thermal Arc Lance`, `Continuum Manifest`, `PING`, `VIGIL-AUTH`, title clearance). |
| **`LEGAL_DISCLAIMER.md`** | Public | Clickwrap Terms of Access & Fictional Continuum Liability Waiver plus Overwatch read-only security guarantees. |
| **`DESIGN_PARKING_LOT.md`** | Public | Resolved design rules (`GAP-002`–`GAP-006`) + `v0.6+` stubs (`GAP-007` Companion Watch App, `GAP-008` Greedy-Meshed Baked Voxel-Chunk Ships, `GAP-009` 3D Yacht-Asteroid Rescue Slice) + §6 locked `Vigil Atelier` UI rules. |
| **`GITHUB_WORKFLOW.md`** | Public | Exact 2-repo GitHub setup (`endless-vigil` Public + `endless-vigil-authority` Private Cloudflare Worker) & Termux 1-command push (`scripts/termux-push.sh`). |
| **`REFRESH_MEMORY_PROTOCOL.md`** | Public | Long-horizon AI memory safeguard (`<25 MB` bundles, tag rollback exports, permanent Multi-Resolution Gate, and AI-agnostic handoff prompt). |
| **`data/graph-ledger.json`** | Public | Machine-readable blueprint single source of truth (`0.6.0` + `uiRevision 0.7.1-atelier`: `10` Shards, `58` nodes, `109` edges, `3` `v0.6+` stubs) audited for dead ends and open gaps. |
| **`data/state-envelope.schema.json`** | Both | JSON Schema `1.4.0` defining the `EVIGIL` State Envelope structure (`operatorAvatar`, `originScenario`, `skills`, `pilotStanding`, `heartbeatBeacons`, `bakedChunkManifest`, `disturbedRecords`)—contains zero player data. |
| **`scripts/build-cc0-humanoid-kit.py` & `scripts/assemble-operator-forge.mjs`** | Public | Compiles CC0 GLBs/animations + tactical gear into `ev-humanoid-kit.bin/.js` and assembles single-`<script>` `operator-forge.html` from the kit, engine and `js/ev-forge-ui.js`. |
| **`js/ev-forge-ui.js`** | Public | Original `Vigil Atelier` UI controller (inlined into `operator-forge.html`): centered stage, progressive steps, modern controls, animated frame balance, undo/redo, and camera framing presets. |
| **`scripts/dev-verify-ui.mjs`** | Public | Optional companion gate: static single-script/id/wording checks plus Playwright `320px–1920px` overflow & interaction verification (gracefully SKIPs when the browser is unavailable). |
| **`scripts/audit-graph.mjs` & `scripts/audit-3d-quality.mjs`** | Public | Automated Node.js validators checking graph integrity, HTML `<\/script>` safety, `320px–1920px` Multi-Resolution Containment, CC0 LOD0/1/2 budgets, positive signed shell volumes, craniofacial relief, 53-bone kinematics, Design Vault SHA-256, and `<25 MB` bundle size. |
| **`scripts/build-release.mjs`** | Public | Generates **both** `ev-release-bundle.zip` (Public repo—excludes server authority code) and `ev-private-server-bundle.zip` (Private repo, Worker files mapped to repo root) + `RELEASE_SHA256.txt`. |
| **`scripts/termux-push.sh`** | Both | Phone-side Termux automation verifying `RELEASE_SHA256.txt`, preserving existing `wrangler.jsonc`, auditing, committing, tagging, and pushing to GitHub. |

---

## Quick Verification & Packaging

```bash
node scripts/audit-graph.mjs                # Audit topology, HTML safety, 320px-1920px rules & 3D quality gates
node scripts/assemble-operator-forge.mjs    # Re-assemble single-script operator-forge.html from js/*
node scripts/build-release.mjs v0.6.0-alpha # Build separate Public & Private zip bundles + SHA-256 checksums
```

