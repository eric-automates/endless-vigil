# GITHUB & TERMUX TWO-REPO WORKFLOW (`v0.5.0`)

> **Why Two Repos (`Public` vs. `Private`):** GitHub does **not** let you hide individual files inside a Public repository. Never put server code, signing secrets, anti-cheat thresholds, or live player item/credit databases inside a Public repo. Keep **2 repositories** total:
> 1. **`endless-vigil` (PUBLIC + GitHub Pages):** Public HTML entry (`index.html`), Cuff-Slate PDA (`cuff-slate.html`), Temporal Lab (`temporal-lab.html`), Overwatch Monitor (`continuum-monitor.html`), Flowchart (`conglomerate-flowchart.html`), docs, and public schemas (`ev-release-bundle.zip`).
> 2. **`endless-vigil-authority` (PRIVATE — Cloudflare Workers + D1 SQLite):** Edge Worker (`src/worker.mjs`), D1 SQLite migrations (`migrations/0001_init.sql`), `wrangler.example.jsonc` (live `wrangler.jsonc` is preserved by `termux-push.sh`), and runtime secrets stored in Cloudflare **Variables and Secrets** (`ev-private-server-bundle.zip`).

---

## 1. Initial One-Time GitHub & Termux Setup

### On GitHub.com & Cloudflare
1. Create **Repository 1:** `endless-vigil` → Visibility: **Public** → Enable **Settings → Pages → Deploy from branch `main` (`/ (root)`)**.
2. Create **Repository 2:** `endless-vigil-authority` → Visibility: **Private** → Keep **Pages OFF**. Connect to Cloudflare **Workers Builds** with D1 database binding `DB` (`ev-authority-db`) and runtime secrets (`EV_TOKEN_SECRET`, `EV_ADMIN_SECRET`) configured under **Settings → Variables and Secrets** (*not* Build variables).

---

## 2. Every Update Cycle (Public Repo & Private Worker Repo)

Download `ev-release-bundle.zip`, `ev-private-server-bundle.zip`, and `RELEASE_SHA256.txt` into your Android `Downloads` folder, then run your Termux one-liners:

```bash
evpub v0.5.0 "v0.5.0 Public Hub, Cuff-Slate & Temporal Lab"
evpriv v0.5.0 "v0.5.0 Private Worker + D1 v0.5 Schema"
```

*(Note: `termux-push.sh` verifies SHA-256 integrity, preserves your live `wrangler.jsonc` with your real D1 `database_id`, runs audits, commits, tags, and pushes safely.)*

### Applying D1 Schema Updates in Cloudflare
Whenever `migrations/0001_init.sql` adds new `v0.5` columns, apply safe idempotent `ALTER TABLE` statements (or re-run migration via Cloudflare D1 Console / `wrangler d1 execute`). Our `worker/src/worker.mjs` also includes an automatic safe schema self-upgrade check (`ensureV05Columns`) so existing `operators` rows migrate smoothly with zero manual SQL errors!

---

## 3. Stepping Back Versions & Refreshing Into a New Arena Chat

Because every release creates an immutable Git tag (`v0.2.0`, `v0.3.0`, `v0.4.2`, `v0.5.0`, ...):

```bash
cd ~/projects/endless-vigil
git tag -l
git archive --format=zip --output=~/storage/downloads/ev-restore-v0.5.0.zip v0.5.0
```

Attach the archive to a fresh Arena.ai chat along with the prompt in `REFRESH_MEMORY_PROTOCOL.md`.

