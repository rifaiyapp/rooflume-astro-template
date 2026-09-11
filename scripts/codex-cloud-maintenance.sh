#!/usr/bin/env bash
set -euo pipefail

# Runs when Codex resumes a cached container after checking out the requested branch.
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
GITHUB_OWNER="${KEYDIV_GITHUB_OWNER:-rifaiyapp}"
REPO_NAME="${KEYDIV_GITHUB_REPO:-$(basename "$REPO_ROOT")}"
REMOTE_URL="https://github.com/${GITHUB_OWNER}/${REPO_NAME}.git"

# Reassert the global origin fallback after Codex switches to the task checkout.
# This is intentionally repeated here because cached task worktrees may not carry
# a repository-local remote even though setup configured the original clone.
git config --global remote.origin.url "$REMOTE_URL"
if git config --local --get remote.origin.url >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
fi

if [ ! -f package-lock.json ]; then
  exit 0
fi

CURRENT_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
STAMP="node_modules/.keydiv-package-lock.sha256"
PREVIOUS_HASH=""

if [ -f "$STAMP" ]; then
  PREVIOUS_HASH="$(cat "$STAMP")"
fi

if [ ! -d node_modules ] || [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
  npm ci
  mkdir -p node_modules
  printf '%s\n' "$CURRENT_HASH" > "$STAMP"
fi
