#!/usr/bin/env bash
set -euo pipefail

# Admin-only Codex Cloud bootstrap for Keydiv repositories.
# KEYDIV_GITHUB_TOKEN must be configured as a Codex Cloud secret.
# Never print or commit the token value.

if [ -z "${KEYDIV_GITHUB_TOKEN:-}" ]; then
  echo "KEYDIV_GITHUB_TOKEN is not available during setup." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
GITHUB_OWNER="${KEYDIV_GITHUB_OWNER:-rifaiyapp}"
REPO_NAME="${KEYDIV_GITHUB_REPO:-$(basename "$REPO_ROOT")}"
GIT_AUTHOR_NAME="${KEYDIV_GIT_NAME:-Keydiv Codex}"
GIT_AUTHOR_EMAIL="${KEYDIV_GIT_EMAIL:-codex@keydiv.com}"
REMOTE_URL="https://github.com/${GITHUB_OWNER}/${REPO_NAME}.git"

git config --global user.name "$GIT_AUTHOR_NAME"
git config --global user.email "$GIT_AUTHOR_EMAIL"
git config --global credential.helper store

# Persist the narrowly scoped GitHub credential so the later agent phase can
# perform the approved direct-publish workflow after Codex removes secrets.
printf "protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n\n" "${KEYDIV_GITHUB_TOKEN}" \
  | git credential approve

# Codex Cloud can present the agent with a task checkout/worktree whose local
# .git/config does not retain remotes. Set a GLOBAL origin fallback so origin
# remains resolvable even when the task checkout has no repository-local remote.
git config --global remote.origin.url "$REMOTE_URL"

# If this checkout also has a local origin, normalize it to the approved URL.
if git config --local --get remote.origin.url >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
fi

# Keep npm aligned with the supported Keydiv Node 22/24 baseline.
npm install --global npm@11
npm ci

# Record the lockfile state for fast cached-container maintenance.
if [ -f package-lock.json ] && [ -d node_modules ]; then
  sha256sum package-lock.json | awk '{print $1}' > node_modules/.keydiv-package-lock.sha256
fi

echo "Keydiv Codex Cloud setup ready for ${REPO_NAME}."
