#!/usr/bin/env bash
set -euo pipefail

# Destination-neutral Codex Cloud bootstrap for Keydiv-authored projects and customer/client copies.
# Configure CODEX_GITHUB_TOKEN as a Codex Cloud secret. Never print or commit it.

if [ -z "${CODEX_GITHUB_TOKEN:-}" ]; then
  echo "CODEX_GITHUB_TOKEN is not available during setup." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

GIT_AUTHOR_NAME="${CODEX_GIT_NAME:-Codex}"
GIT_AUTHOR_EMAIL="${CODEX_GIT_EMAIL:-codex@users.noreply.github.com}"

# Prefer the actual repository origin. Only require a fallback when Cloud
# presents a checkout with no usable origin. Never guess the seller's account.
REMOTE_URL="$(git config --local --get remote.origin.url 2>/dev/null || true)"
if [ -z "$REMOTE_URL" ]; then
  if [ -z "${CODEX_GITHUB_REPOSITORY:-}" ]; then
    echo "No Git origin found. Set CODEX_GITHUB_REPOSITORY=owner/repository." >&2
    exit 1
  fi
  REMOTE_URL="https://github.com/${CODEX_GITHUB_REPOSITORY}.git"
fi

git config --global user.name "$GIT_AUTHOR_NAME"
git config --global user.email "$GIT_AUTHOR_EMAIL"
git config --global credential.helper store

printf "protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n\n" "$CODEX_GITHUB_TOKEN" \
  | git credential approve

# Persist the approved origin for later Codex task worktrees.
git config --global remote.origin.url "$REMOTE_URL"
if git config --local --get remote.origin.url >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
fi

npm install --global npm@11
npm ci

if [ -f package-lock.json ] && [ -d node_modules ]; then
  sha256sum package-lock.json | awk '{print $1}' > node_modules/.codex-package-lock.sha256
fi

echo "Codex Cloud setup ready."
