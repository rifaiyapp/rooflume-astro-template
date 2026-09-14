# Your Codex Cloud environment

No local factory skill is required. AGENTS.md, DESIGN.md, the UI runtime and customer docs travel with the repository.

1. Import the template into your own repository. Verify its actual Git origin points there before enabling write access. A plain clone retains the source origin; rebind that copy first. Never modify the master as part of copy setup.
2. Connect your GitHub account/repository to your own Cloud environment. Select Universal and Node 22 (22.12+), with caching enabled.
3. Add **CODEX_GITHUB_TOKEN as a secret**, scoped to your repository with Contents read/write permission. The scripts use it for the approved direct-publish workflow. Never put tokens in prompts, files or URLs.
4. Setup command: `bash scripts/codex-cloud-setup.sh`. Maintenance: `bash scripts/codex-cloud-maintenance.sh`.
5. Only when there is no usable local origin, set normal variable CODEX_GITHUB_REPOSITORY=owner/repository. It never overrides local origin. Optional identity settings: CODEX_GIT_NAME and CODEX_GIT_EMAIL.
6. Allow necessary package/Git services and your own live domain. Browser QA may need `npx playwright install --with-deps chromium` added to environment setup.

Setup installs npm 11 and lockfile dependencies and persists the approved origin. Maintenance prefers local origin, then that environment's previously approved global origin, then the explicit fallback. It reinstalls only when the lockfile changes or dependencies are missing. Use a separate environment per destination and rebuild caches after ownership/credential changes.

The canonical scripts persist the scoped credential for later agent work. Treat write-enabled cached environments as privileged; restrict access and revoke/rotate credentials when access ends. Never run bootstrap locally merely for QA. Branch protection remains authoritative; no force-push or policy bypass is allowed.

Once connected, prompt ordinary edits. Codex reads this repository and safely publishes validated changes to your origin when allowed. Environment scripts, secrets and caching are covered in [official OpenAI documentation](https://learn.chatgpt.com/docs/environments/cloud-environment). The token name and direct-publish scripts here are this template's workflow.

## Client-facing task results

For ordinary content/design edits, follow the Client Mode result rule in [AGENTS.md](../AGENTS.md#keydiv-strict-final-response-contract): return only "✅ Task completed and validated successfully." when complete and validated, or "⚠️ Task completed, but validation found an issue:" followed by a short plain-language explanation for a real validation issue.

All required internal checks still run. Keep routine QA/package-manager details internal. Browser-install/CDN limitations alone do not warrant a client warning when all required non-browser validation passes and no actual site/runtime failure is found; record unavailable checks accurately without claiming browser QA passed. Developer Mode allows relevant details for explicit technical requests, debugging/developer work, or necessary failure diagnosis. Reporting does not change runtime or publishing behavior.
