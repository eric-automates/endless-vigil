# Endless Vigil — Federated Continuum & Telemetry Conglomerate (`v0.4`)

> **Credits & Partnership Attribution**
> - **Creator / Lead Architect:** Project Owner
> - **Co-Creator & Systems Partner:** **Ironscribe of the Endless Vigil**

A modular, multi-repository web continuum architecture presented through **one unified public GitHub entry point (`index.html` — Vigil Hub Conduit Gate)** and a **read-only Overwatch Terminal (`continuum-monitor.html`)**. Operators complete per-session Terms acknowledgment, pass a zero-oracle diegetic Sci-Fi Conduit Authenticator (`AUTH`), awaken stranded on a drifting asteroid with a venting EVA suit, and traverse **Telemetry Shards** (`HUB`, `EVA`, `PDA`, `TECH`, `SEC`, `SHIP`, `MKT`, `WORLD`, `MON`, `AUTH`) powered by a compressed, SHA-256-verified **Continuum Manifest** (`EVIGIL` State Envelope).

---

## Clean 2-Repository GitHub Separation (Public vs. Private)

GitHub does **not** allow hiding individual files inside a Public repository. Therefore, Endless Vigil uses a clean **2-repository split**:

| Repo | Visibility | GitHub Pages? | Bundle File | What Lives Here |
| :--- | :--- | :--- | :--- | :--- |
| **`endless-vigil`** | **PUBLIC** | Yes (`index.html`) | `ev-release-bundle.zip` | Public client HTML (`index.html`, `continuum-monitor.html`, `conglomerate-flowchart.html`), public legal/IP/charter docs, and structural graph blueprints (`data/graph-ledger.json`, `data/state-envelope.schema.json`). **Zero secrets, zero player item ledgers, zero server rules.** |
| **`endless-vigil-authority`** | **PRIVATE** | **No** (deployed on Node host/VPS/worker) | `ev-private-server-bundle.zip` | Authoritative relay (`scripts/auth-relay-server.mjs`), `EV_TOKEN_SECRET`, `EV_ADMIN_SECRET`, salted credential hashes, **player inventories / owned items / credit & `disturbedRecords` ledgers**, and future hidden drop/loot/blueprint tables. |

---

## Repository & Blueprint Map (`v0.4`)

| File | Repo | Purpose |
| :--- | :--- | :--- |
| **`index.html`** | Public | **Primary GitHub Pages Entry (`Vigil Hub` Conduit Gate):** Per-session Legal Clickwrap -> Zero-Oracle Sci-Fi Conduit Authenticator -> MutationObserver DOM Tamper Purge -> Token-Gated Hub Deck + 5-second critical-ops warmup guard + 2-browser dev harness. |
| **`continuum-monitor.html`** | Public | **Read-Only Overwatch Continuum Monitor:** Coordinate-only Sector Camera with Jammer RF-static blocking (`"SIGNAL INTERCEPT DENIED // SECTOR PRIVATIZED"`), Open/Black/Sector Equity tickers + `PING` telemetry, Continuum Manifest view, Design Parking Lot, and docs explorer. |
| **`conglomerate-flowchart.html`** | Public | **Interactive 10-Shard Conglomerate Workbench:** Adaptive `📱 Sheet / Split / Cards` & `🖥 Split / Studio / Zen` views, portrait/landscape Shard topology, touch pinch/zoom Flowchart (`47` nodes, `86` edges), and live Deflate + SHA-256 Tamper Lab. |
| **`scripts/auth-relay-server.mjs`** | **PRIVATE** | **Zero-Dependency Node.js `AUTH` Authority Relay:** Constant-time `scrypt` (`DUMMY_HASH`), uniform `401` zero-oracle rejection, sliding lockout, `HMAC-SHA256` tokens + `tokenVersion` kill-switch, 5-second warmup cooldown (`425`), async mutex + `expectedRev` CAS (`409`), replay nonce rejection, strict `Number.isFinite` bounds, and `PROVISIONAL_TRANSIT` death revert (`EVA-008`). |
| **`PROJECT_CHARTER.md`** | Public | Vision, **Telemetry Shards**, **Continuum Manifest**, **`PING` (`PING'd`)** Nanoparticle Insurance, Zero-Trust `AUTH` + `disturbedLease` custody, public wording rules, and roadmap. |
| **`ARCHITECTURE_STANDARDS.md`** | Public | Multi-Shard contracts (`10` Shards), Seed + Sparse Delta + Deflate + SHA-256 pipeline (`v1.2.0`), Multi-Resolution Gate (`320px–1920px`), HTML `<\/script>` safety, and Private vs. Public repo security architecture. |
| **`COPYRIGHT_COMPLIANCE.md`** | Public | **Singular IP Compliance Ledger** (`IP-01`–`IP-11`) tracking copyright/trademark risks (`Vigil Cuff-Slate`, `Thermal Arc Lance`, `Continuum Manifest`, `PING`, `VIGIL-AUTH`, title clearance). |
| **`LEGAL_DISCLAIMER.md`** | Public | Clickwrap Terms of Access & Fictional Continuum Liability Waiver plus Phase-1/Phase-2 Overwatch read-only security guarantees. |
| **`DESIGN_PARKING_LOT.md`** | Public | Anti-snowball balance (`GAP-005`), Trial vs. Chartered drop rules & anti-RMT/wash-trade escrow (`GAP-006`), `disturbedLease` custody (`EVA-008`), and anti-exploit mechanisms. |
| **`GITHUB_WORKFLOW.md`** | Public | Exact 2-repo GitHub setup (`endless-vigil` Public + `endless-vigil-authority` Private) & Termux 1-command push (`scripts/termux-push.sh`). |
| **`REFRESH_MEMORY_PROTOCOL.md`** | Public | Long-horizon AI memory safeguard (`<25 MB` bundles, tag rollback exports, permanent Multi-Resolution Gate, and AI-agnostic handoff prompt). |
| **`data/graph-ledger.json`** | Public | Machine-readable blueprint single source of truth (`10` Shards, `47` nodes, `86` edges) audited for dead ends and open gaps. |
| **`data/state-envelope.schema.json`** | Both | JSON Schema `1.2.0` defining the `EVIGIL` State Envelope structure (`ContinuumManifest`, `operatorAccount`, `disturbedRecords`, `pingInsurance`)—contains zero player data. |
| **`scripts/audit-graph.mjs`** | Public | Automated Node.js validator checking graph integrity, HTML sync, `<\/script>` safety, **`320px–1920px` Multi-Resolution Containment**, and `<25 MB` bundle size. |
| **`scripts/build-release.mjs`** | Public | Generates **both** `ev-release-bundle.zip` (Public repo—excludes server authority code) and `ev-private-server-bundle.zip` (Private repo) + `RELEASE_SHA256.txt`. |
| **`scripts/termux-push.sh`** | Both | Phone-side Termux automation verifying `RELEASE_SHA256.txt`, extracting bundle, auditing, committing, tagging, and pushing to GitHub. |

---

## Quick Verification & Packaging

```bash
node scripts/audit-graph.mjs         # Audit topology, HTML safety, & 320px-1920px resolution rules
node scripts/build-release.mjs v0.4.0  # Build separate Public & Private zip bundles + SHA-256 checksums
```

Run the Private Authority Server (from the Private repo or local dev):

```bash
EV_ADMIN_SECRET="YOUR-PRIVATE-ADMIN-KEY" EV_TOKEN_SECRET="YOUR-LONG-RANDOM-SECRET" node scripts/auth-relay-server.mjs
```
