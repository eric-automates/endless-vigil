# PROJECT CHARTER — Working Codename: **ENDLESS VIGIL**

> **Credits & Co-Creation Attribution**
> - **Creator / Director / Architect:** [User / Project Owner]
> - **AI Architecture & Systems Co-Creator:** **Ironscribe of the Endless Vigil**
>
> *Per project covenant, every deliverable, Shard repository, and milestone build carries attribution to both the Creator and the **Ironscribe of the Endless Vigil**—preserving a permanent, searchable lineage across versions and collaborator sessions.*

---

## 1. Executive Vision

**Endless Vigil** is a **federated, modular web-based deep-space continuum & interactive telemetry architecture**. To anyone opening the primary GitHub entry point, it presents itself as one unified, diegetic continuum interface (`Vigil Hub` + `Overwatch Monitor`). Under the hood, it is composed of independently developed, independently testable, and independently hosted **Telemetry Shards** deployed across separate GitHub repositories/pages that exchange a compact, cryptographically verified **Continuum Manifest** (`EVIGIL` State Envelope).

> **Public Framing Standard (`v0.3`):** On public-facing GitHub surfaces, web titles, and in-universe monitors (`continuum-monitor.html`, `conglomerate-flowchart.html`), avoid calling the project a *"game"* or *"simulation"*. Present everything cleanly in-universe as interactive telemetry, continuum infrastructure, and Shard operations—and gate public entry behind the fictional software clickwrap disclaimer in `LEGAL_DISCLAIMER.md`.

### The Opening Sequence
1. An operator awakens stranded on a drifting asteroid after crew abandonment.
2. Their EVA suit has suffered a micro-breach and is actively venting atmosphere.
3. Without intrusive tutorials or modal cutscenes, they must stabilize suit integrity, raise a scarred wrist-mounted Cuff-Slate PDA (hydrating the `PDA` Shard seamlessly while live suit drain continues), scavenge debris, breach physical containers, commandeer vessels, operate PING insurance policies, trade across Open/Black/Sector Equity feeds, and ultimately reshape—or fracture—celestial bodies.

---

## 2. Official Terminology: **"Telemetry Shards"** & **"Continuum Manifest"**

To avoid vague or overloaded words like *"apps"*, *"entities"*, *"environments"*, *"soul files"*, or public *"game/simulation"* labels, this project uses unified technical and diegetic vocabulary:

| Concept | Official Term | Technical Meaning | Why It Fits |
| :--- | :--- | :--- | :--- |
| An individual hosted module (`EVA`, `PDA`, `SHIP`, `MKT`, `MON`, etc.) | **Telemetry Shard** *(short: **Shard**)* | An independently hosted micro-frontend / sub-runtime repository with its own UI, state bridge, and standalone test mode. | Real distributed-systems terminology (*sharding* = partitioned modular state) that stays 100% diegetic. |
| The single public entry link & router | **Vigil Hub** *(short: **Hub**)* | The outer shell & router mounting or handing off between Shards via diegetic transitions (`HUB` + `MON`). | Presents one cohesive continuum on GitHub while orchestrating multi-repo Shards invisibly. |
| Portable identity, credit & policy ledger | **Continuum Manifest** *(short: **Manifest**)* | The persistent identity & ownership record inside the `EVIGIL` State Envelope (replaces any "character/soul file" phrasing). | Survives body reconstitution or ship swaps; zero IP conflict (*Dark Souls* avoidance). |
| Nanoparticle asset insurance | **`PING`** *(**P**article **I**nsurance **N**ano-**G**rid; past tense: **`PING'd`**)* | Bulk-insurable policy charging hourly credit rent; dissolves insured assets on death into a 1-button Hub Hangar Reconstitution Queue. | High-risk extraction tension: un-`PING'd` cargo/vessels stay adrift at physical space coordinates. |
| Public non-mutating terminal | **Overwatch Continuum Monitor** (`continuum-monitor.html`) | Read-only terminal featuring coordinate-only camera (respecting paid Sector Jammers), live Markets, Manifest view, and Docs links. | Enables safe spectator telemetry without stalking or unauthorized state mutation. |
| Physical objects (crates, tools, ships, bodies) | **World Records** | Persistent sparse delta records bound to sector coordinates—never magically soul-bound to an avatar. | Lazy-loaded sparse storage (`0` idle 3D overhead until proximity). |

---

## 3. Core Architectural & Design Pillars

1. **Extreme Modularity ("Edit One Shard Without Breaking Nine")**
   - Maintainers can boot any Shard standalone and automatically hydrate from any valid `EVIGIL` State Envelope in local storage/OPFS/URL.
2. **Physicalized World Persistence & `PING` Extraction Loop**
   - Dropped or un-`PING'd` gear remains physically at world coordinates as sparse delta records.
   - Only **`PING'd`** ships/gear dissolve on operator termination into the **Hub Hangar 1-Button Reconstitution Queue** (charging continuous hourly rent). Everything un-`PING'd` stays in space, physically cuttable (`Thermal Arc Lance` with persistent seam %) or hackable (`Pulse Decoder`).
3. **Zero-Loading-Screen Feel (Diegetic Transitions)**
   - Moving across Shards renders in-world animations (raising a scarred wrist-PDA, airlock cycle, Med-Bay reconstitution flash) while inflating and SHA-256 verifying the State Envelope in milliseconds.
4. **Anti-Snowball Economy Balance (See `DESIGN_PARKING_LOT.md`)**
   - Always-running **Open Market**, **Black Market**, and **Sector Equities** (`MKT`), offset by Telemetry Signature detectability scaling and exponential PING fleet upkeep.
5. **Read-Only Overwatch Privacy (`MON` + Sector Jammers)**
   - Coordinates-only camera (no operator-name lookup). Entering a sector with an active paid Jammer (`JAM-001`) replaces the view with animated RF static and `"SIGNAL INTERCEPT DENIED // SECTOR PRIVATIZED"`.
6. **Exhaustive Branch-Audited Design, Resolution Gate & Clean-Room IP Discipline**
   - Every decision, failure state, and Shard jump lives in `data/graph-ledger.json` and is audited by `node scripts/audit-graph.mjs` (including HTML `<\/script>` safety + `320px–1920px` Multi-Resolution containment checks). All IP checks live in `COPYRIGHT_COMPLIANCE.md`.
7. **Zero-Trust `AUTH` Conduit Gate & `disturbedLease` Anti-Exploit Custody**
   - Entry (`index.html`) enforces per-session Legal Clickwrap + zero-oracle `VIGIL-AUTH` token authentication (`scripts/auth-relay-server.mjs`), DOM DevTools tamper purge, automated anomaly quarantine, and `PROVISIONAL_TRANSIT` custody snap-revert (`EVA-008`) blocking suicide-courier loot-dragging.

---

## 4. High-Level Roadmap

- **v0.1:** Foundation Charter, initial 8-Shard decision tree, flowchart workbench, IP ledger, and Refresh Memory Protocol.
- **v0.2:** Adaptive Phone (`📱`) / Desktop (`🖥`) layouts, touch pinch/pan, and broadcast pop-out inspector.
- **v0.3:** 10-Shard ledger resolving `GAP-001` (`PING`), `Continuum Manifest`, `continuum-monitor.html` Overwatch, Arena `<\/script>` fix, Multi-Resolution containment gate, and Termux GitHub workflow.
- **v0.4 (Zero-Trust Edge Conduit Auth & Anti-Exploit Economy):**
  - `index.html` (`Vigil Hub` entry gate): Per-session clickwrap -> Sci-Fi Conduit Authenticator -> MutationObserver DOM Tamper Sentinel -> Token-gated Hub Deck locked to `https://ev-authority.ericautomates.workers.dev`.
  - Cloudflare Worker + D1 SQLite authority (`worker/src/worker.mjs`): `PBKDF2-SHA256` zero-oracle auth, sliding-window lockout, server-salted Admin Recovery unlock, `HMAC-SHA256` tokens, velocity/credit anomaly auto-freeze, atomic D1 CAS, and `disturbedLease` snap-revert on death (`EVA-008`).
- **v0.5 (Current — Core Gameplay Systems, Cuff-Slate PDA, Origin/Squad Link & Temporal Lab):**
  - Resolves **`GAP-002` – `GAP-006`** before 3D world rendering: Procedural Origin Generator + Co-Op Squad City Link (`ORIGIN_BOUND` + Pilot Credit Standing), Alarm Beacon Heartbeats & `2–5m` Thief Re-Insurance Clues, Real-Time Offline Skill Training + `2%` Scrap Jury-Rigging, Open Boarding + Syndicate Disguise Leaks, and Wealth × Concentration Threat Equation.
  - Adds **`cuff-slate.html`** (Interactive Wrist-PDA + Origin/Squad Link + Skills/Beacons/Boarding/Economy Shard UI) + **`temporal-lab.html`** (Dev Temporal Fast-Forward Engine) backed by live D1 persistence, Schema `1.3.0`, and `data/graph-ledger.json` `0.5.0` (`10` Shards, `49` nodes, `93` edges).
- **v0.6+ (3D WebGL Slice, Baked Voxel Hulls & Companion App):** Greedy-meshed voxel-chunk ship hulls (`GAP-008`) with dynamic hole re-baking when cut, 3D asteroid stranding, and optional mobile/watch Beacon Companion alerts (`GAP-007`).
