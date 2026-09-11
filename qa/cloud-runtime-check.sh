#!/usr/bin/env bash
set -euo pipefail
# Mock Git/npm: never touch real credentials, Git configuration or the network.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/tmp"
FIXTURE="$(mktemp -d "$ROOT/tmp/cloud-test.XXXXXX")"
mkdir -p "$FIXTURE/bin" "$FIXTURE/repo"
export QA_FIXTURE="$FIXTURE"
export QA_REPO="$FIXTURE/repo"
export PATH="$FIXTURE/bin:$PATH"
cat > "$FIXTURE/bin/git" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [ "$*" = 'rev-parse --show-toplevel' ]; then printf '%s\n' "$QA_REPO"; exit; fi
if [ "$*" = 'config --local --get remote.origin.url' ]; then [ -s "$QA_FIXTURE/local" ] && cat "$QA_FIXTURE/local"; exit; fi
if [ "$*" = 'config --global --get remote.origin.url' ]; then [ -s "$QA_FIXTURE/global" ] && cat "$QA_FIXTURE/global"; exit; fi
if [ "$1 $2 ${3:-}" = 'config --global remote.origin.url' ]; then printf '%s\n' "$4" > "$QA_FIXTURE/global"; exit; fi
if [ "$1 $2 ${3:-}" = 'remote set-url origin' ]; then printf '%s\n' "$4" > "$QA_FIXTURE/local"; exit; fi
if [ "$1 $2" = 'credential approve' ]; then cat > /dev/null; touch "$QA_FIXTURE/credential-used"; exit; fi
if [ "$1 $2" = 'config --global' ]; then exit; fi
echo 'Unexpected Git operation' >&2; exit 1
MOCK
cat > "$FIXTURE/bin/npm" <<'MOCK'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$QA_FIXTURE/npm-calls"
mkdir -p "$QA_REPO/node_modules"
MOCK
chmod +x "$FIXTURE/bin/git" "$FIXTURE/bin/npm"
printf '{}\n' > "$QA_REPO/package-lock.json"
export CODEX_GITHUB_TOKEN='fixture-only-not-a-credential'
export CODEX_GITHUB_REPOSITORY='fallback-example/copy'
printf '%s\n' 'https://github.com/destination-example/product.git' > "$FIXTURE/local"
bash "$ROOT/scripts/codex-cloud-setup.sh" > "$FIXTURE/output"
test "$(cat "$FIXTURE/global")" = 'https://github.com/destination-example/product.git'
test "$(cat "$FIXTURE/local")" = 'https://github.com/destination-example/product.git'
test -f "$QA_REPO/node_modules/.codex-package-lock.sha256"
COUNT="$(wc -l < "$FIXTURE/npm-calls")"
bash "$ROOT/scripts/codex-cloud-maintenance.sh" >> "$FIXTURE/output"
test "$(wc -l < "$FIXTURE/npm-calls")" = "$COUNT"
printf '{"changed":true}\n' > "$QA_REPO/package-lock.json"
bash "$ROOT/scripts/codex-cloud-maintenance.sh" >> "$FIXTURE/output"
test "$(wc -l < "$FIXTURE/npm-calls")" -eq "$((COUNT + 1))"
: > "$FIXTURE/local"
bash "$ROOT/scripts/codex-cloud-maintenance.sh" >> "$FIXTURE/output"
test "$(cat "$FIXTURE/global")" = 'https://github.com/destination-example/product.git'
: > "$FIXTURE/global"
bash "$ROOT/scripts/codex-cloud-setup.sh" >> "$FIXTURE/output"
test "$(cat "$FIXTURE/global")" = 'https://github.com/fallback-example/copy.git'
: > "$FIXTURE/global"
unset CODEX_GITHUB_REPOSITORY
if bash "$ROOT/scripts/codex-cloud-setup.sh" >> "$FIXTURE/output" 2>&1; then echo 'Missing origin did not fail'; exit 1; fi
if bash "$ROOT/scripts/codex-cloud-maintenance.sh" >> "$FIXTURE/output" 2>&1; then echo 'Missing approved origin did not fail'; exit 1; fi
unset CODEX_GITHUB_TOKEN
if bash "$ROOT/scripts/codex-cloud-setup.sh" >> "$FIXTURE/output" 2>&1; then echo 'Missing token did not fail'; exit 1; fi
if grep -q 'fixture-only-not-a-credential' "$FIXTURE/output"; then echo 'Credential exposed'; exit 1; fi
echo 'PASS origin precedence, explicit fallback, cache reuse, lockfile refresh and fail-closed Cloud setup'
