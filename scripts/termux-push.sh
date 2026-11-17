#!/usr/bin/env bash
# ==============================================================================
# Endless Vigil // Termux 1-Command SHA-Verify, Audit, Commit, Tag & Push
# Usage: bash scripts/termux-push.sh <path-to-zip> [tag] [commit-message]
# Co-Authors: Creator & Ironscribe of the Endless Vigil
# ==============================================================================
set -euo pipefail

DEFAULT_ZIP="$HOME/storage/downloads/ev-release-bundle.zip"
if [[ ! -f "$DEFAULT_ZIP" && -f "$HOME/storage/shared/Download/ev-release-bundle.zip" ]]; then
  DEFAULT_ZIP="$HOME/storage/shared/Download/ev-release-bundle.zip"
fi

ZIP_PATH="${1:-$DEFAULT_ZIP}"
TAG="${2:-v0.5.0}"
MSG="${3:-Release $TAG}"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ERROR: Zip file not found at: $ZIP_PATH"
  echo "Usage: evpush <zip-path> [version-tag] [commit-message]"
  exit 1
fi

ACTUAL_SHA=$(sha256sum "$ZIP_PATH" | awk '{print $1}')
echo "Zip File    : $(basename "$ZIP_PATH")"
echo "Zip SHA-256 : $ACTUAL_SHA"

SHA_FILE="$(dirname "$ZIP_PATH")/RELEASE_SHA256.txt"
if [[ -f "$SHA_FILE" ]]; then
  EXPECTED_SHA=$(grep -F " $(basename "$ZIP_PATH")" "$SHA_FILE" | awk '{print $1}' | head -n 1 || true)
  if [[ -z "$EXPECTED_SHA" ]]; then
    EXPECTED_SHA=$(awk '{print $1}' "$SHA_FILE" | head -n 1)
  fi
  if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
    echo "ABORT: SHA-256 mismatch!"
    echo "  Expected: $EXPECTED_SHA"
    echo "  Actual  : $ACTUAL_SHA"
    exit 1
  fi
  echo "SHA Check   : VERIFIED"
else
  echo "SHA Check   : No RELEASE_SHA256.txt found beside zip (continuing after printing hash)."
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Extracting bundle into $REPO_ROOT..."
if [[ -f "$REPO_ROOT/wrangler.jsonc" ]]; then
  unzip -oq "$ZIP_PATH" -x "wrangler.jsonc" -d "$REPO_ROOT"
else
  unzip -oq "$ZIP_PATH" -d "$REPO_ROOT"
fi

if command -v node >/dev/null 2>&1; then
  if [[ -f "scripts/audit-graph.mjs" ]]; then
    echo "Running pre-push Public repo graph & HTML audit..."
    node scripts/audit-graph.mjs
  else
    [[ -f "src/worker.mjs" ]] && echo "Checking Private Worker syntax..." && node --check src/worker.mjs
    [[ -f "scripts/auth-relay-server.mjs" ]] && node --check scripts/auth-relay-server.mjs
  fi
fi

git add -A
if git diff --cached --quiet; then
  echo "No file changes detected."
else
  git commit -m "$MSG"
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally; skipping duplicate tag creation."
else
  git tag -a "$TAG" -m "$MSG"
fi

BRANCH=$(git branch --show-current || echo "main")
git push origin "$BRANCH" --tags
echo "DONE: Pushed $BRANCH and tag $TAG to GitHub cleanly."
