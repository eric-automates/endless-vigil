# DESIGN PARKING LOT — SYSTEMS TO REVISIT & TUNE

> **Co-Authors:** Creator & **Ironscribe of the Endless Vigil**
> **Purpose:** Preserve ambitious balance, economy, privacy, and multiplayer concepts in an explicit, searchable parking ledger so nothing gets forgotten or lost across sessions (`Refresh Memory Protocol`).

---

## 1. Anti-Snowball & Wealth-Exposure Balance (`GAP-005`)

*Goal: Prevent rich or heavily geared operators from becoming unassailable bullies while rewarding clever scrappers, smugglers, and defensive planning.*

1. **Telemetry Signature Radius (Visibility Scales With Wealth):**
   - Carrying ultra-high-tier tools, flying multi-reactor capital ships, or stacking dozens of active **PING** policies inflates your **Mass & Credit Telemetry Signature**.
   - Low-signature scrappers slip past long-range scanners quietly; bloated moguls light up regional Overwatch sensors and attract opportunistic bounty/pirate attention.
2. **Progressive PING Premium Scaling:**
   - Insuring 1 starter skiff and basic EVA rig costs minimal hourly upkeep (`rentPerHourCredits`).
   - Bulk-PING'ing entire fleets or rare contraband triggers exponential premium curves—forcing rich operators to either liquidate at markets, take real risk without PING, or actively protect physical strongboxes.
3. **Physical Bottlenecks (No God-Mode Gear):**
   - Even top-tier armor, hulls, and containers rely on finite coolant, capacitor charge, and structural HP (`cutProgressPct` persists permanently!).
4. **Defensive Counterplay (Traps, Decoys & Jammers):**
   - Operators can invest in physical container traps, alarm pings (`GAP-003`), decoy beacons, and **Paid Sector Privacy Jammers** so preparation counters brute force.

---

## 2. Simulated Continuum Economy (`MKT` Shard)

- **Always-Running World Ticks:** Supply, demand, NPC freight lanes, and regional scarcity continue evolving even while a player is offline (calculated deterministically or via Authority Relay).
- **Three Distinct Market Layers:**
  1. **Open Exchange:** Regulated salvage, refined ore, polymer patches, fuel cells, and standard PING insurance underwriting.
  2. **Black Market:** Unregistered Thermal Arc Lances, Pulse Decoders, forged manifest seals, and high-margin contraband (higher volatility, potential bounty exposure).
  3. **Sector Equities / Guild Bonds:** Indices tied to regional infrastructure (e.g., *Belt Salvage Collective*, *Core-Fracture Mining*, *Hub Reconstitution Bonds*). Cataclysmic events like shattering `planet_04` send shockwaves through related equities!
- **Workflow Synergy:** A scrapper flies in with salvaged hull gear -> sells **80%** in bulk at the Market -> keeps **20%** and hits **Bulk-PING** right beside the Hub dock.

---

## 3. Lazy-Loaded Sparse Coordinate World & Wreckage Recovery

- **Zero Idle 3D Overhead:** Dropped or un-PING'd items floating in space (`uninsuredDropIds`) and intact planetary bodies do **not** spawn 3D geometry until an operator's viewport enters proximity range.
- **Persistent Recovery Loop:** If your ship WAS PING'd (`PING-002`) while loose hold cargo was NOT PING'd, the ship dissolves safely back to Hub Hangar queue upon death, while the uninsured crates remain at exact sparse coordinates in vacuum for an EVA salvage trip.

---

## 4. Economy & Temporal Anti-Exploit Catalog (`EVA-008`, `AUTH-004`, `GAP-006`)

*Goal: Stop cheaters, suicide-couriers, time-spoofers, and alt-farm inflation while keeping legitimate sandbox effort (even industrial automation fleets) 100% legal and rewarding.*

### A. Active Rules (Implemented in Schema `1.2.0` & Relay `AUTH`)
1. **Provisional Transit Custody (`disturbedLease` / `EVA-008` — Anti-Suicide Courier):**
   - Touching or moving an un-`PING'd` object marks it `PROVISIONAL_TRANSIT` tagged to your `disturbedByOperatorId` + `disturbedSessionId` while recording its `anchorOrigin`.
   - Returning alive to a Hub dock, owned ship airlock, or Continuum Save Beacon settles it (`SETTLED`) at the new location.
   - **Dying before settling snap-reverts the item back to `anchorOrigin`** (unless stolen/extracted by another *living* operator). Operators cannot "death-hop" loot 200m closer to safety one suicide at a time.
2. **Synchronous Server Audits, Mutex CAS, Replay Nonces & `NaN` Bounds (`AUTH-004`):**
   - Zero post-hoc 5-second gap: `AUTH` stamps `serverTickUtc` and verifies travel velocity (`<= shipMaxSpeed`), mining yield (`<= rigRate * elapsedSec`), strict `Number.isFinite()` positive bounds (blocking negative-buy / `NaN` / `Infinity` overflows), duplicate `X-Request-Nonce` replay rejection, and per-operator async mutex + `expectedRev` Compare-And-Swap (`CAS`) **before** any mutation executes (preventing parallel HTTP double-spend race conditions).
   - **Legitimate Automation Is Welcome:** If an operator invests in robotic mining drones that visibly consume power, time, cargo space, and raise their Telemetry Signature, `AUTH` validates that effort as 100% legitimate. Impossible instant-harvest or credit-injection deltas trigger automatic **`QUARANTINED`** lockout + instant `tokenVersion` kill-switch.
3. **5-Second Critical-Action Warmup Cooldown (`CRITICAL_WARMUP_MS = 5000`):**
   - Newly issued tokens permit immediate read-only HUD hydration while blocking high-value Market Arbitrage / Credit Wires (`425 Too Early`) during the first 5 seconds, neutralizing automated login-and-dump credential-stuffing bots.
4. **Private Server Repo vs. Public Client Repo Split + Constant-Time Auth:**
   - Unknown IDs trigger dummy `scrypt` hashing (zero timing side-channel). In production, `ev-authority-relay`, secrets, and anti-cheat thresholds live in a **PRIVATE GitHub repo** deployed on your own HTTPS host/worker so outsiders can never read server thresholds or forge tokens locally.

### B. Parked Economy Trade-Offs (`GAP-006` — Tune Only When Live Scale Demands It)
1. **Trial vs. Chartered Account Ground Drops (Pros & Cons):**
   - **Why allow ground drops even for Trial accounts:** Preserves pure physical sandbox truth—anyone can walk up and hand over or drop physical crates/gold at coordinates with zero immersion-breaking trade windows.
   - **How to prevent free-alt exploits:** Trial starter suits/tools carry `salvageValue: 0` (`non-recyclable`) so creating 500 trial accounts cannot mint free titanium/credits. High-leverage economic actions (**Open/Black Market Arbitrage**, **Direct Credit Wires**, **Sector Privacy Jammers**, **Planetary Demolition**) remain gated to **Chartered** (paid/verified) accounts.
2. **Wash-Trading, Order-Book Spoofing, Sybil Bot Collusion & RMT Escrow (Deferred Until Needed):**
   - Flag abnormal price divergence (e.g., selling 1 roll of tape for `5,000,000 cr`), rapid cancel-spam spoofing, or multi-alt IP/ASN collusion for **delayed escrow review & spread fees**, while avoiding harsh bans that punish genuine friends pooling wealth for a capital ship.
3. **Why World Ledger Saves Live on `AUTH` Relay—Not Client-Pushed GitHub Commits:**
   - Embedding a GitHub write token in public HTML would allow anyone inspecting the page to read the token and wipe/overwrite the repository. Public world deltas & operator records live safely in **`AUTH` Relay** (`scripts/auth-relay-server.mjs`), while **GitHub** serves static read-only client builds & verified releases.

---

## 5. Open Design Gaps Still Tracking (`data/graph-ledger.json`)

| Gap ID | Shard | Question to Decide Later |
| :--- | :--- | :--- |
| **`GAP-002`** | `TECH` | Tier-2 orbital blueprint dependency tree (core drills, sector jammers, planetary demolition payloads). |
| **`GAP-003`** | `SEC` | How offline/distant container owners receive Cuff-Slate alerts when a Pulse Decoder hack trips an alarm. |
| **`GAP-004`** | `SHIP` | Multi-player ship boarding authority: helm lock overrides vs. physical bulkhead cutting inside someone else's vessel. |
| **`GAP-005`** | `MKT` | Exact numeric curve for Telemetry Signature visibility & progressive PING hourly rent scaling. |
| **`GAP-006`** | `MKT` | Finalize Trial ground-drop value caps & anti-wash-trade / RMT escrow thresholds once live telemetry metrics exist. |
