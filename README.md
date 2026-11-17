# Endless Vigil — Federated Continuum & Telemetry Conglomerate (`v0.5.0`)

> **Credits & Partnership Attribution**
> - **Creator / Lead Architect:** Project Owner
> - **Co-Creator & Systems Partner:** **Ironscribe of the Endless Vigil**

A modular, multi-repository web continuum architecture presented through **one unified public GitHub entry point (`index.html` — Vigil Hub Conduit Gate)** and a **read-only Overwatch Terminal (`continuum-monitor.html`)**. Operators complete per-session Terms acknowledgment, pass a zero-oracle diegetic Sci-Fi Conduit Authenticator (`AUTH`) backed by Cloudflare Workers + D1 SQLite, generate a procedural Origin Crisis with optional Co-Op Squad City Link, operate the interactive **Vigil Cuff-Slate (`cuff-slate.html`)**, and test multi-week economy & offline skill balance inside the **Dev Temporal Fast-Forward Engine (`temporal-lab.html`)** across `10` Shards (`HUB`, `EVA`, `PDA`, `TECH`, `SEC`, `SHIP`, `MKT`, `WORLD`, `MON`, `AUTH`).

---

## Clean 2-Repository GitHub Separation (Public vs. Private)

GitHub does **not** allow hiding individual files inside a Public repository. Therefore, Endless Vigil uses a clean **2-repository split**:

| Repo | Visibility | Deploy Target | Bundle File | What Lives Here |
| :--- | :--- | :--- | :--- | :--- |
| **`endless-vigil`** | **PUBLIC** | GitHub Pages (`index.html`) | `ev-release-bundle.zip` | Public client HTML (`index.html`, `cuff-slate.html`, `temporal-lab.html`, `continuum-monitor.html`, `conglomerate-flowchart.html`), public legal/IP/charter docs, and structural graph blueprints (`data/graph-ledger.json`, `data/state-envelope.schema.json`). **Zero secrets, zero player item ledgers, zero server rules.** |
| **`endless-vigil-authority`** | **PRIVATE** | Cloudflare Worker + D1 SQLite (`ev-authority`) | `ev-private-server-bundle.zip` | Edge Worker (`src/worker.mjs`), D1 SQLite migrations (`migrations/0001_init.sql`), `wrangler.example.jsonc`, `EV_TOKEN_SECRET`, `EV_ADMIN_SECRET`, salted `PBKDF2` hashes, operator inventories, offline skills, beacon timers, and Pilot Standing ledgers. |

---

## Repository & Blueprint Map (`v0.5.0`)

| File | Repo | Purpose |
| :--- | :--- | :--- |
| **`index.html`** | Public | **Primary GitHub Pages Entry (`Vigil Hub` Conduit Gate):** Per-session Legal Clickwrap -> Zero-Oracle Sci-Fi Conduit Authenticator (`https://ev-authority.ericautomates.workers.dev`) -> MutationObserver DOM Tamper Purge -> Token-Gated Hub Deck + Origin/Squad Launch + 5-second critical-ops warmup guard. |
| **`cuff-slate.html`** | Public | **Interactive `v0.5.0` Vigil Cuff-Slate PDA & Core Systems Slice:** Procedural Origin + Co-Op Squad City Link (`ORIGIN_BOUND`), EVE-style Real-Time Offline Skill Queue + `2%` Scrap Jury-Rigging, Container/Ship Alarm Beacons & `2–5m` Theft Re-Insurance Clues, Sandbox Boarding + Syndicate Disguise Leaks, Pilot Standing Friend Drops, and Wealth × Concentration Threat meter. |
| **`temporal-lab.html`** | Public | **Dev Temporal Fast-Forward Engine (`v0.5.0` Balance Simulator):** Browser time-acceleration lab simulating hours/days/weeks of offline skill completions, `PING` hourly rent burn, AI mining robot output, Beacon `2–5m` re-insurance expiration, and Wealth-Gravity NPC raids pre-3D. |
| **`continuum-monitor.html`** | Public | **Read-Only Overwatch Continuum Monitor:** Coordinate-only Sector Camera with Jammer RF-static blocking (`"SIGNAL INTERCEPT DENIED // SECTOR PRIVATIZED"`), Open/Black/Sector Equity tickers + `PING` telemetry, Continuum Manifest view, Design Parking Lot, and docs explorer. |
| **`conglomerate-flowchart.html`** | Public | **Interactive 10-Shard Conglomerate Workbench:** Adaptive `📱 Sheet / Split / Cards` & `🖥 Split / Studio / Zen` views, portrait/landscape Shard topology, touch pinch/zoom Flowchart (`49` nodes, `93` edges), and live Deflate + SHA-256 Tamper Lab. |
| **`worker/src/worker.mjs`** | **PRIVATE** | **Cloudflare Worker Edge Authority (`src/worker.mjs` in Private repo):** WebCrypto `100,000`-iter `PBKDF2-SHA256`, zero-oracle uniform `401`, sliding lockout, `HMAC-SHA256` tokens + `tokenVersion`, `425` warmup, atomic D1 CAS (`expectedRev`), replay nonces, persistent `v0.5.0` origin/skills/beacons/standing mutations, and `EVA-008` snap-revert. |
| **`worker/migrations/0001_init.sql`** | **PRIVATE** | **Cloudflare D1 SQLite Schema:** `operators` (including `v0.5.0` `origin_json`, `skills_json`, `beacons_json`, `standing_json`, `inventory_json`), `disturbed_records`, `used_nonces`, and `meta_state`. |
| **`scripts/auth-relay-server.mjs`** | **PRIVATE** | **Optional Local Node.js Dev Relay:** Standalone Node authority relay for offline desktop localhost testing without Wrangler. |
| **`PROJECT_CHARTER.md`** | Public | Vision, **Telemetry Shards**, **Continuum Manifest**, **`PING` (`PING'd`)** Nanoparticle Insurance, Zero-Trust `AUTH` + `disturbedLease` custody, public wording rules, and roadmap. |
| **`ARCHITECTURE_STANDARDS.md`** | Public | Multi-Shard contracts (`10` Shards), Seed + Sparse Delta + Deflate + SHA-256 pipeline (`v1.3.0`), Multi-Resolution Gate (`320px–1920px`), HTML `<\/script>` safety, and Private Worker vs. Public GitHub Pages security architecture. |
| **`COPYRIGHT_COMPLIANCE.md`** | Public | **Singular IP Compliance Ledger** (`IP-01`–`IP-11`) tracking copyright/trademark risks (`Vigil Cuff-Slate`, `Thermal Arc Lance`, `Continuum Manifest`, `PING`, `VIGIL-AUTH`, title clearance). |
| **`LEGAL_DISCLAIMER.md`** | Public | Clickwrap Terms of Access & Fictional Continuum Liability Waiver plus Overwatch read-only security guarantees. |
| **`DESIGN_PARKING_LOT.md`** | Public | Resolved `v0.5.0` design rules (`GAP-002`–`GAP-006`) + future `v0.6+` Companion Watch App (`GAP-007`) and Greedy-Meshed Baked Voxel-Chunk Ships (`GAP-008`). |
| **`GITHUB_WORKFLOW.md`** | Public | Exact 2-repo GitHub setup (`endless-vigil` Public + `endless-vigil-authority` Private Cloudflare Worker) & Termux 1-command push (`scripts/termux-push.sh`). |
| **`REFRESH_MEMORY_PROTOCOL.md`** | Public | Long-horizon AI memory safeguard (`<25 MB` bundles, tag rollback exports, permanent Multi-Resolution Gate, and AI-agnostic handoff prompt). |
| **`data/graph-ledger.json`** | Public | Machine-readable blueprint single source of truth (`0.5.0`: `10` Shards, `49` nodes, `93` edges, `2` `v0.6+` stubs) audited for dead ends and open gaps. |
| **`data/state-envelope.schema.json`** | Both | JSON Schema `1.3.0` defining the `EVIGIL` State Envelope structure (`originScenario`, `skills`, `pilotStanding`, `heartbeatBeacons`, `bakedChunkManifest`, `disturbedRecords`)—contains zero player data. |
| **`scripts/audit-graph.mjs`** | Public | Automated Node.js validator checking graph integrity, HTML sync, `<\/script>` safety, zero leaked credentials, **`320px–1920px` Multi-Resolution Containment**, and `<25 MB` bundle size. |
| **`scripts/build-release.mjs`** | Public | Generates **both** `ev-release-bundle.zip` (Public repo—excludes server authority code) and `ev-private-server-bundle.zip` (Private repo, Worker files mapped to repo root) + `RELEASE_SHA256.txt`. |
| **`scripts/termux-push.sh`** | Both | Phone-side Termux automation verifying `RELEASE_SHA256.txt`, preserving existing `wrangler.jsonc`, auditing, committing, tagging, and pushing to GitHub. |

---

## Quick Verification & Packaging

```bash
node scripts/audit-graph.mjs         # Audit topology, HTML safety, & 320px-1920px resolution rules
node scripts/build-release.mjs v0.5.0  # Build separate Public & Private zip bundles + SHA-256 checksums
```

