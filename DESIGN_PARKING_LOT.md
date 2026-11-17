# DESIGN PARKING LOT — RESOLVED & FUTURE SYSTEMS LEDGER

> **Co-Authors:** Creator & **Ironscribe of the Endless Vigil**
> **Purpose:** Preserve resolved `v0.5.0` design rules alongside `v0.6+` future engineering targets so nothing is forgotten or duplicated across sessions (`Refresh Memory Protocol`).

---

## 1. Locked `v0.5.0` Design Decisions (`GAP-002` – `GAP-006` Resolved)

### A. Wealth × Concentration Threat & Living NPC Hunts (`MKT-002`, ex-`GAP-005`)
- **Zero Artificial Wealth Caps:** Operators may amass unlimited ships, automation, or credits—no punitive rubber-band nerfs.
- **Wealth-Gravity Threat Equation:**
  $$\text{Sector Threat} \propto \text{Held Liquid/Cargo Wealth} \times \text{Concentration}$$
  Being rich alone inside a fortified syndicate lane is safer than holding massive un-escorted liquid wealth solo. Newly rich operators carrying high-tier salvage radiate loud telemetry signals that attract living NPC pirates, rival scavengers, Syndicate intelligence brokers, and player bounty hunters—keeping wealth circulating naturally.

### B. Free Passion-First Access, Squad City Link & Pilot Standing (`HUB-004`, `MKT-003`, ex-`GAP-006`)
- **Zero Forced Tutorial Wall / Invite-Gated Free Co-Op:** Endless Vigil runs free/password-invite gated (zero artificial paywalls). Friends enter an optional **Squad Link Code** at first boot to anchor their randomized Procedural Origin Scenarios inside the **same starting city/district** so they can meet immediately.
- **Procedural Origin Crises + `ORIGIN_BOUND` Anti-Reroll Guard:**
  - Opening rolls vary widely (*Slum Amnesia + Data Diary*, *Patrol Chief Cruiser Wreck*, *Drifting Asteroid EVA Leak*).
  - To stop infinite character-reroll farming, all starter equipment & battered vessels carry `ORIGIN_BOUND` tags (`salvageValue: 0`, cannot be dumped or brokered for starter-ship farming) plus transparent time/flight-hour **Pilot Credit Standing** that scales ground-drop allowances cleanly while allowing genuine friends to share tools and supplies freely.

### C. Alarm Beacon Heartbeat & `2–5m` Re-Insurance Clue (`SEC-006`, ex-`GAP-003`)
- **Active Beacon Heartbeat:** Installing an Alarm Beacon chip on a container or vessel broadcasts rhythmic heartbeats to your **Cuff-Slate** (and future `GAP-007` companion mobile/watch feed + optional sleeping bunk proximity warning).
- **Forensic Theft vs. Destruction Clue (`2–5m` Lockout):**
  - If a thief breaks into/cuts your box or steals your ship, the beacon dies immediately (`SIGNAL_LOST`).
  - **Destruction:** **PING** triggers an automatic payout/refund notice right away (`REFUNDED_DESTROYED`).
  - **Theft:** Your **PING** policy waits a **`2–5 minute` thief lockout**, then switches to **`"Policy Reassigned"`** (`POLICY_REASSIGNED_THEFT`)—deductively confirming the cargo/vessel wasn't destroyed; a thief still has it alive in the sector!

### D. Sandbox Ship Boarding, Cargo Trackers & Syndicate Leaks (`SHIP-004`, ex-`GAP-004`)
- **Immediate Extraction vs. Helm Hijack:** Boarders can break straight into cargo bays and haul physical crates off immediately (accepting the risk a crate conceals a hidden Syndicate/owner tracker) OR cut/hack bridge doors to override helm locks and steal the whole vessel.
- **Syndicate Disguise Leaks:** Wearing forged corporate/pirate IDs or disguises fails under sustained huge visible wealth: Syndicate networks broker leaked identity intel on mega-rich targets holding massive conspicuous cargo.

### E. Real-Time Offline Skill Training & `2%` Scrap Jury-Rigging (`TECH-003`, ex-`GAP-002`)
- **Acquisition ≠ Mastery:** Any operator can buy high-tier gear on Open/Black Markets OR steal it via corporate espionage/mechanic raids, **but operating or permanently installing high-tech gear requires EVE-style real-time offline skill training**.
- **`~2%` Yield Scrap Jury-Rigging:** Untrained newcomers can weld together cheap scrap jury-rigs operating at `~2%` efficiency (`juryRigYieldRatio: 0.02`) so anyone can sample deep-water salvage or hacking early with genuine mechanical risk while full skill timers tick even while offline.

---

## 2. Simulated Continuum Economy (`MKT` Shard)

- **Always-Running World Ticks:** Supply, demand, NPC freight lanes, wealth-gravity raids, and offline skill timers advance continuously against server UTC (`serverTickUtc`), verifiable through the **Dev Temporal Fast-Forward Engine (`temporal-lab.html`)**.
- **Three Distinct Market Layers:** Open Exchange, Black Market (contraband / forged IDs / trackers), and Sector Equities.

---

## 3. Lazy-Loaded Sparse Coordinate World & `v0.6+` Baked Voxel Hulls

- **Zero Idle 3D Overhead:** Un-PING'd space drops (`uninsuredDropIds`) and intact celestial bodies remain lightweight sparse coordinates until visual proximity.
- **`v0.6+` Ship Rendering (`GAP-008`):** Vessels will assemble from **Voxel Ship Chunks baked via Greedy Meshing / CSG Chunk Rebaking**, refreshing cleanly into unified multi-material hulls with dynamic holes wherever an Arc Lance cuts through.

---

## 4. Economy & Temporal Anti-Exploit Catalog (`EVA-008`, `AUTH-004`)

1. **Provisional Transit Custody (`EVA-008`):** Moving un-PING'd items without settling (`SETTLED_AT_HUB`) snap-reverts to `anchorOrigin` on termination.
2. **Synchronous Server Audits, Mutex CAS, Replay Nonces & `NaN` Bounds (`AUTH-004`):** Server validates velocity, yield rates, finite positive numbers, `X-Request-Nonce`, and D1 `expectedRev` CAS before commit. Legitimate industrial automation consuming real time/power passes cleanly; impossible jumps auto-quarantine.
3. **5-Second Critical-Action Warmup (`425 Too Early`):** Shields Market Arbitrage / Credit Drops against automated credential-stuffing bots immediately after login.
4. **Public Client vs. Private Worker/D1 Authority Repo Split:** Public repo hosts static Web UIs only; Private `endless-vigil-authority` hosts Cloudflare Worker + D1 SQLite authority state and runtime secrets.

---

## 5. Active Future Engineering Stubs (`data/graph-ledger.json` `0.5.0`)

| Gap ID | Shard | Future Target (`v0.6+`) |
| :--- | :--- | :--- |
| **`GAP-007`** | `PDA` | Optional Mobile/Watch Companion App & Sleeping Bunk Proximity Alert Feed for real-time Beacon Heartbeat notifications. |
| **`GAP-008`** | `SHIP` | 3D WebGL Ship Construction using **Baked Voxel-Chunk Greedy Meshing / CSG Rebaking** so cut hulls dynamically display clean breaches. |
