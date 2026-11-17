# GITHUB & TERMUX TWO-REPO WORKFLOW (`v0.4`)

> **Why Two Repos (`Public` vs. `Private`):** GitHub does **not** let you hide individual files inside a Public repository. Never put server code, signing secrets, anti-cheat thresholds, or live player item/credit databases inside a Public repo. Keep **2 repositories** total:
> 1. **`endless-vigil` (PUBLIC + GitHub Pages):** Public HTML entry (`index.html`), Overwatch Monitor (`continuum-monitor.html`), Flowchart (`conglomerate-flowchart.html`), docs, and public schemas (`ev-release-bundle.zip`).
> 2. **`endless-vigil-authority` (PRIVATE — NO GitHub Pages):** Authority server (`scripts/auth-relay-server.mjs`), player inventory/item ledgers, secret configs, and hidden balance tables (`ev-private-server-bundle.zip`).

---

## 1. Initial One-Time GitHub & Termux Setup

### On GitHub.com (Browser)
1. Create **Repository 1:** `endless-vigil` → Visibility: **Public** → Initialize empty (no README/template needed). Once pushed, enable **Settings → Pages → Deploy from branch `main` (`/ (root)`)**.
2. Create **Repository 2:** `endless-vigil-authority` → Visibility: **Private** → Initialize empty. Keep **Pages OFF**.

### On Android Phone (Termux)
```bash
pkg update -y && pkg install -y git unzip nodejs-lts
termux-setup-storage   # Links Android Downloads to ~/storage/downloads (and ~/storage/shared/Download)

mkdir -p ~/projects && cd ~/projects
git clone https://github.com/<YOUR_USER>/endless-vigil.git
git clone https://github.com/<YOUR_USER>/endless-vigil-authority.git

# Optional 1-word aliases for fast future updates:
echo 'alias evpub="cd ~/projects/endless-vigil && bash scripts/termux-push.sh"' >> ~/.bashrc
echo 'alias evpriv="cd ~/projects/endless-vigil-authority && bash scripts/termux-push.sh"' >> ~/.bashrc
source ~/.bashrc
```

---

## 2. Every Update Cycle (Public Repo & Private Repo)

Download `ev-release-bundle.zip` (and `ev-private-server-bundle.zip` + `RELEASE_SHA256.txt`) into your Android `Downloads` folder.

**Push to Public Client Repo (`endless-vigil`):**
```bash
cd ~/projects/endless-vigil
bash scripts/termux-push.sh ~/storage/downloads/ev-release-bundle.zip v0.4.0 "v0.4 Public Hub & Overwatch Release"
```

**Push to Private Authority Repo (`endless-vigil-authority`):**
```bash
cd ~/projects/endless-vigil-authority
bash scripts/termux-push.sh ~/storage/downloads/ev-private-server-bundle.zip v0.4.0 "v0.4 Private Authority Relay"
```

*(First-time push note: Before `scripts/termux-push.sh` exists inside an empty clone, run `unzip -o ~/storage/downloads/ev-release-bundle.zip -d ~/projects/endless-vigil` once for Public, and `unzip -o ~/storage/downloads/ev-private-server-bundle.zip -d ~/projects/endless-vigil-authority` once for Private, then run `termux-push.sh` normally from then on.)*

---

## 3. Stepping Back Versions & Refreshing Into a New Arena Chat

Because every release creates an immutable Git tag (`v0.2.0`, `v0.3.0`, `v0.4.0`, ...):

```bash
cd ~/projects/endless-vigil
git tag -l
git checkout -b rollback-v0.4.0 v0.4.0
git archive --format=zip --output=~/storage/downloads/ev-restore-v0.4.0.zip v0.4.0
```

Attach the archive to a fresh Arena.ai chat along with the prompt in `REFRESH_MEMORY_PROTOCOL.md`.

---

## 4. Packaging & Running the Private Authority Relay (`scripts/auth-relay-server.mjs`)

Generate both separated bundles + `RELEASE_SHA256.txt` anytime in Arena:

```bash
node scripts/build-release.mjs v0.4.0
```

Deploy `scripts/auth-relay-server.mjs` from your **Private Repo** (`endless-vigil-authority`) on your server/worker/VPS with private environment variables (never committed to Git):

```bash
EV_ALLOWED_ORIGIN="https://<YOUR_USER>.github.io" \
EV_TOKEN_SECRET="GENERATE-A-64-CHAR-RANDOM-HEX-SECRET" \
EV_ADMIN_SECRET="YOUR-PRIVATE-ADMIN-KEY" \
node scripts/auth-relay-server.mjs
```
