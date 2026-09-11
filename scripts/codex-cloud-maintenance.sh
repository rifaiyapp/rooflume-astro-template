#!/usr/bin/env bash
set -euo pipefail

# Destination-neutral maintenance for cached Codex Cloud containers.
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

REMOTE_URL="$(git config --local --get remote.origin.url 2>/dev/null || true)"
if [ -z "$REMOTE_URL" ]; then
  REMOTE_URL="$(git config --global --get remote.origin.url 2>/dev/null || true)"
fi
if [ -z "$REMOTE_URL" ] && [ -n "${CODEX_GITHUB_REPOSITORY:-}" ]; then
  REMOTE_URL="https://github.com/${CODEX_GITHUB_REPOSITORY}.git"
fi
if [ -z "$REMOTE_URL" ]; then
  echo "No approved Git origin is available." >&2
  exit 1
fi

git config --global remote.origin.url "$REMOTE_URL"
if git config --local --get remote.origin.url >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
fi

if [ ! -f package-lock.json ]; then
  exit 0
fi

CURRENT_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
STAMP="node_modules/.codex-package-lock.sha256"
PREVIOUS_HASH=""
[ -f "$STAMP" ] && PREVIOUS_HASH="$(cat "$STAMP")"

if [ ! -d node_modules ] || [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
  npm ci
  mkdir -p node_modules
  printf '%s\n' "$CURRENT_HASH" > "$STAMP"
fi
