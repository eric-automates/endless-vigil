# COPYRIGHT, TRADEMARK & IP COMPLIANCE LEDGER

> **Singular Project IP File** — Per project governance, *every* intellectual property risk, visual/mechanical similarity check, trademark clearance note, and clean-room differentiation rule lives in this single file so commercial readiness is auditable at a glance.
> **Co-Authors:** Creator & **Ironscribe of the Endless Vigil**
>
> *Disclaimer: This document records software-design & IP-hygiene engineering practices based on U.S. copyright/trademark principles (such as the Idea–Expression Dichotomy and Scènes à Faire). It is not formal legal advice; before commercial release or monetization, have a qualified IP attorney perform formal clearance.*

---

## 1. Core Legal Principles We Engineer Around

1. **Idea–Expression Dichotomy (17 U.S.C. § 102(b))**
   - **Not protectable:** Game rules, genres, survival timers, suit oxygen leaks, wrist devices, modular shipbuilding, container lockpicking/cutting, or blowing up planets as abstract systems/mechanics.
   - **Protectable:** Specific expressive UI layouts, artwork, character silhouettes, dialogue scripts, sound design, music, proprietary lore, and exact graphic assets.
2. **Scènes à Faire Doctrine**
   - Standard genre tropes (astronaut stranded on an asteroid, patching a leaking spacesuit, star maps, airlock doors, hacking panels) cannot be monopolized by any one studio—*provided* we execute them with original art, copy, math, and UI composition.
3. **Trademark & Trade Dress Protection (Lanham Act)**
   - Even when a mechanic is free to use, **names, logos, distinctive mascots, iconic color-plus-bezel trade dress, and slogans** can trigger trademark/trade-dress claims if a consumer could confuse our game with an existing franchise.
4. **Clean-Room Asset & License Hygiene**
   - Every line of code, shader, icon, SVG, audio clip, and text string is either written originally by us/AI tools under original prompts without copying existing works, OR uses verified permissive open-source dependencies (`MIT`, `Apache-2.0`, `BSD-3-Clause`, `CC0`) recorded in Section 5 below.

---

## 2. Feature-by-Feature IP Risk & Differentiation Matrix

| ID | Feature / Concept in Endless Vigil | Closest Existing Commercial IP | Risk Level | Legal Rationale & How We Differentiate (Clean-Room Design) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IP-01** | **Stranded on asteroid with leaking suit & emergency patching** | *Breathedge*, *Outer Wilds*, *Astroneer*, *Subnautica* | **Low** (with discipline) | Suit oxygen loss and patching are classic unprotectable *scènes à faire* in space survival. **Avoid:** Comedic immortal chicken sidekick/satire tone (*Breathedge*), specific *Outer Wilds* 22-minute loop clock UI/Nomai typography, or *Subnautica* exact fabricator ring layout. **Our Expression:** Serious hard-salvage industrial survival tone; diegetic seam-tape/hull-weld physical interaction; original HUD geometry. | Cleared (Monitor UI art) |
| **IP-02** | **Worn / Beat-Up Wrist-Mounted PDA** | *Fallout* **Pip-Boy** (Bethesda — strong Trademark & Trade Dress) | **HIGH if visually copied** | "Wrist computer" is an unprotectable concept, **HOWEVER** Pip-Boy's chunky olive/beige housing, glowing monochrome phosphor green CRT dial knobs, and smiling mascot icon constitute recognizable trade dress & trademark. **Our Expression:** Name it **`Vigil Cuff-Slate`** (or `CuffLink-OS`—check trademark before finalizing). Use a **dual-panel shattered-bezel tactical slate** with slate-blue / ice-cyan & amber-warning telemetry, crisp vector gridlines, zero cartoon mascot, and ruggedized magnetic forearm clamps. | Active Guardrail |
| **IP-03** | **Cutting Locked Boxes & Partial Structural Breaching** | *Hardspace: Shipbreaker* (Blackbird/Focus) | **Low–Medium** | Physical laser/thermal cutting of metal seams is an unprotectable simulation mechanic. **Avoid:** *Hardspace* "LYNX" corporate branding, exact "Stinger/Splitsaw" weapon names, or identical yellow-and-black cut-point triangle markers. **Our Expression:** Call our tool **`Thermal Arc Lance`** (or `Seam-Torch`), use custom glowing molten-slag spline shaders and physicalized structural integrity bars (`HP` + weld seam nodes). | Active Guardrail |
| **IP-04** | **Electronic Container Hacking (`Pulse Decoder`)** | *Deus Ex*, *Cyberpunk 2077*, *BioShock* | **Low** | Logic/signal puzzles and PIN bypassing are unprotectable mechanics. **Avoid:** Copying *BioShock* pipe-flow tiles, *Cyberpunk* Breach Protocol matrix typography, or *Fallout* word-bracket hacking terminals verbatim. **Our Expression:** Signal-phase frequency alignment + pin-current timing oscilloscope original to our Cuff-Slate UI. | Cleared |
| **IP-05** | **Modular Ship Systems & Multi-Ship Management** | *FTL: Faster Than Light*, *Space Engineers*, *Starfield* | **Low** | Power allocation, room oxygen, and ship switching are genre staples. **Avoid:** *FTL* exact top-down 2D room-tile sprite palette/icon set or "Scrap" UI phrasing style. **Our Expression:** Vector wireframe / cross-section engineering deck schematics tied to our State Envelope subsystem schema. | Cleared |
| **IP-06** | **World Forge / Destroying Planets Permanently** | *Stellaris* (Colossus), *Planetary Annihilation*, *No Man's Sky* | **Low** | Destroying celestial bodies in sci-fi is unprotectable idea. **Avoid:** Franchise-specific weapon names ("Death Star", "World Cracker" verbatim if paired with similar art/lore). **Our Expression:** Original orbital fracture delta simulation (`sectorDeltas.shatteredBody`). | Cleared |
| **IP-07** | **Federated Multi-Repo Architecture** | General Micro-Frontend / Web Architecture | **Zero** | Software architecture & JSON/Deflate/SHA-256 state envelopes use standard public web standards. Ensure zero third-party GPL code contaminates commercial repos. | Cleared |
| **IP-08** | **Project Title & Signature (`Endless Vigil` / `Ironscribe of the Endless Vigil`)** | Needs Trademark Search before commercial launch | **Medium (Untested)** | Before publishing commercially under any final title, search **USPTO TESS** (Class 9 & 41), Steam, itch.io, and EUIPO. **Note:** `"Endless"` is heavily used in Amplitude Studios' *Endless Space / Endless Legend* series (watch Class 9 confusion if paired with "Space"!). Keep **Ironscribe of the Endless Vigil** strictly as original author/collaborator attribution, and perform formal counsel clearance on `Endless Vigil` prior to monetization. | **Flagged for Pre-Release Clearance** |
| **IP-09** | **`Continuum Manifest` Ledger (Avoiding *"Soul File"*)** | *Dark Souls / Demon's Souls* (FromSoftware / Bandai Namco) | **Low (Mitigated)** | Naming the universal identity file *"Soul File"* risks unnecessary overlap with FromSoftware's *"Souls"* franchise conventions. **Our Expression:** Named **`Continuum Manifest`** (short: **`Manifest`**)—hard sci-fi archival telemetry terminology reflecting body-independent, vessel-spanning universe history. | Cleared |
| **IP-10** | **`PING` (Particle Insurance Nano-Grid) & Legal Clickwrap (`LEGAL_DISCLAIMER.md`)** | *EVE Online* / *Star Citizen* / *Elite Dangerous* insurance tropes | **Low** | Asset insurance & hangar reconstitution are broad unprotectable mechanics. **Avoid:** *EVE* "PLEX/Clone Grade" phrasing or *Star Citizen* LTI trademarked ship packages. **Our Expression:** Original **`PING` (`PING'd` / `un-PING'd`)** nanoparticle resonance dissolution + Hub Reconstitution Queue + explicit fictional software clickwrap gate in `LEGAL_DISCLAIMER.md`. | Cleared |
| **IP-11** | **`VIGIL-AUTH` Conduit Gate & `disturbedLease` Anti-Exploit Custody** | Standard SaaS / Multiplayer Server Auth | **Zero** | Constant-time `scrypt` / `HMAC-SHA256` token auth, zero-oracle `401` rejections, rate-limit lockout, and provisional custody rollback are unprotectable security engineering patterns. Ensure any future payment gateway or privacy notice accompanies commercial Chartered Operator accounts. | Cleared |
| **IP-12** | **`Vigil Atelier` Operator Forge UI (`v0.7.1` polish)** | General modern creator-interface conventions (step rails, segmented controls, swatch palettes, bottom sheets, undo/redo) | **Zero** | Layout conventions, progress indicators and control idioms are unprotectable functional patterns. **Avoid:** Copying any studio's exact HUD art, logo, mascot, typography pairing, or screen composition. **Our Expression:** original deep-navy / ice-cyan / amber palette, original diegetic copy (`Telemetry Shards`, `Continuum Manifest`), custom CSS, hand-drawn inline SVG icons, zero-CDN system font stack, and no third-party UI kit or icon set. No external asset, font, or layout was imported. | Cleared |

---

## 3. Mandatory Pre-Asset & Pre-Release Checklist

Before shipping any Shard publicly for monetization:
1. **No AI-Cloned Franchise Prompting:** Never prompt image, audio, or text generators with *"in the style of Fallout Pip-Boy"* or *"like Subnautica PDA"*. Always describe geometric materials, physics, and original color hex codes.
2. **Title Clearance Gate (See IP-08 above!):** Specifically review *"Endless"* + space genre overlap (*Amplitude Studios* owns trademarks around `"ENDLESS"` in strategy/sci-fi games). Keeping **"Ironscribe of the Endless Vigil"** as our *authorial credit / homage marker* is far lower trademark exposure than titling a commercial sci-fi space game *"Endless [X]"*—though we should still verify cleanly before commercial launch.
3. **Font & Audio Provenance:** Use only verified open-license fonts (`SIL OFL`, `Apache-2.0`, system UI stacks) and original / `CC0` audio.
4. **Dependency License Audit:** Reject `GPL-2.0` / `GPL-3.0` / `AGPL` dependencies in client Shards unless the game itself is intentionally open-sourced under compatible terms; prefer `MIT`, `ISC`, `BSD`, and `Apache-2.0`.
5. **UI Provenance Gate (`IP-12`):** Every new control, icon, illustration and micro-interaction in `operator-forge.html` must be original clean-room work generated inside this repository (inline SVG / CSS / code), with zero CDN fonts, icon packs, or copied screen layouts. Log any new visual similarity check here before release.

---

## 4. Third-Party Dependency & Asset Provenance Log

| Asset / Package | Version / Source | License | Used In Shard(s) | Commercial Safe? |
| :--- | :--- | :--- | :--- | :--- |
| Native Web APIs (`WebGPU`, `WebGL2`, `CompressionStream`, `SubtleCrypto`, `IndexedDB`, `SVG`, `Canvas2D`) | Browser Standard | Standard / Unencumbered | All (`v0.1`–`v0.7.0-alpha`) | **Yes** |
| MakeHuman `hm08` Base Mesh, Facial Features (`eye_sclera`, `eye_iris`, `eye_cornea`, `eyebrows`, `eyelashes`), 73 Morph Targets, `morphJoints` Pivot Deltas, Hair (`short02`, `short04`, `braid01`), Clothing (`bra`, `panties`, `briefs`, `tshirt`, `hoodie`, `jacket`, `jeans`, `boots`), & PBR/`ccRegions` WebP Textures | `makehumancommunity` / `mpfb2` & `kblood/CharacterCreator` (`output/assets/*` — **strictly excluding GPL `web/materials.js`**) | **CC0-1.0 (Public Domain Dedication)** | `operator-forge.html`, `assets/ev-humanoid-kit.bin`, `js/ev-humanoid-kit.js` | **Yes (CC0-1.0)** |
| 53-Bone Humanoid Rig & Retargeted `idle` / `walk` / `run` / `strafe_left` / `strafe_right` Skeletal Clips | `kblood/CharacterCreator` (`output/animations/*`) | **CC0-1.0 (Public Domain Dedication)** | `operator-forge.html`, `assets/ev-humanoid-kit.bin`, `js/ev-humanoid-kit.js` | **Yes (CC0-1.0)** |
| Original Hard-Surface Tactical Gear (`helmet_shell`, visors, `armor_*`, `wrist_*`, `carbine_rifle`), 6 Articulated Skeleton/Android Modules (`skel_*`), Morph-Tracked Piercings (`piercing_*`), Captain's Quarters Cabin, `EV-74 Kestrel` Ramp Props, Procedural Skin/Underwear Compositors, Bust Spring Physics, CQB Kinematics & `EVGPUEngine` WGSL/GLSL Shaders (`v0.7.0-alpha`) | Original Code & Procedural Lofts (`@lastmaglab`-inspired CQB biomechanics expressed in clean-room original code) | Project Owner / Original Clean-Room | `scripts/build-cc0-humanoid-kit.py`, `js/ev-gpu-engine.js`, `operator-forge.html` | **Yes** |
| Node.js Structural, 3D Quality & Bundle Tooling (`audit-graph.mjs`, `audit-3d-quality.mjs`, `assemble-operator-forge.mjs`, `dev-verify-forge.mjs`, `dev-render-inspect.py`, `build-release.mjs`) | Original Code (`v0.1`–`v0.7.0-alpha`) | Project Owner / MIT-compatible | Tooling | **Yes** |

