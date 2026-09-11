## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Keydiv Astro Factory v4.5 project runtime

This is an approved, completed commercial template. Project Upgrade is foundation-only: preserve the page design, content, layout, images, typography, colors, responsive behavior, animations, form fields and functionality. Do not redesign because runtime guidance changed. Read `project.config.json`, `DESIGN.md` and `docs/DISTRIBUTION.md` first.

- Exactly one profile: `private-demo`. Keep robots meta and equivalent headers `noindex,nofollow,noarchive,nosnippet`, allow crawling so noindex can be seen, and do not add indexable sitemaps or promoting canonicals. Noindex is not access control.
- Static-first Astro; retain minimal existing client scripts. No framework, adapter, tracking or deployment dependency without a real requirement. Never install Wrangler solely for publishing.
- Node 22.12+ or Node 24, below 25; npm 11. Cloud uses Node 22; local preference is `.nvmrc`.
- Cloud bootstrap: `bash scripts/codex-cloud-setup.sh`; cached maintenance: `bash scripts/codex-cloud-maintenance.sh`. Admin configures the environment once. Never expose credentials or execute privileged bootstrap merely for local QA.
- Keep the existing Lead Service functional. Read `docs/DISTRIBUTION.md` before integration changes. Never send test leads to the live service without explicit authorization; intercept submissions in QA.
- Team-facing infrastructure names are Lead Service, Publishing Service, Automation Service and Project Configuration. Never print private endpoint values, identifiers, webhooks or credentials.
- Preserve semantic markup, labels, keyboard focus, reduced motion, responsive reflow, reserved image dimensions and self-hosted media. Target WCAG 2.2 AA and LCP <=2.5s, INP <=200ms, CLS <=0.1 without claiming unmeasured field results.
- Preserve appropriate security headers, no secret/client credential storage, no lead-data logging, no unnecessary third-party resources. Do not add HSTS without domain readiness confirmation or broad immutable caching on error responses.

## Validation and safe direct publishing

1. Inspect Git status and existing instructions; preserve unrelated user changes, history and the valid remote. Fetch `origin/main` before editing when practical, and inspect ancestry without resetting user work.
2. Install with `npm ci` when needed; run `npm run validate`, `npm audit`, `git diff --check`, and scan the intended diff for secrets, private configuration leakage, starter contamination and unintended files. Do not suppress failed checks or use force audit fixes.
3. Run `npm run qa:form` and `npm run qa:runtime` for changes affecting runtime/page behavior. Render desktop/mobile and inspect screenshots when available; never claim visual QA without rendering. `QA_BASELINE` may point to a pre-change build for pixel comparison.
4. Commit only intended validated changes, then fetch latest main again. Preserve newer remote work. Rebase only task commits if needed, resolve only unambiguous conflicts, and rerun relevant validation/audit after reconciliation.
5. When write authentication and repository policy permit, safely push `git push origin HEAD:main`. Routine work does not stop at a local commit or prepared pull request. A pull request is used only if explicitly requested or required by policy. Never force-push, overwrite newer work or publish failed validation.
6. If origin is missing, confirm approved repository identity before reconstruction. Existing valid history/remote must be preserved. Cloud scripts supply the approved origin fallback.
7. Publishing Service uses the existing static configuration and `dist`. Perform bounded live verification at the intended domain when available, including route status, noindex and security headers. Report a real blocker honestly; deployment propagation uses the exact response contract below.

## Keydiv UI/UX design runtime

For meaningful page/section design or redesign tasks:
- read `docs/KEYDIV-UI-DESIGN.md` before editing;
- read and maintain `DESIGN.md` as the persistent project design source of truth;
- classify the task as reference-led, directed, or auto art direction;
- do not require a reference image: when none is supplied, choose a suitable premium art direction automatically;
- when references are supplied, inspect and match their defining anatomy at the requested/inferred fidelity;
- avoid generic AI/SaaS fallback layouts and repeated project templates;
- own typography, color, spacing, content hierarchy, imagery direction, CTA hierarchy, responsive composition, and subtle purposeful motion;
- perform visual QA/render comparison when browser tooling is available and refine visible issues before finalization;
- never mark visual QA passed when no rendered page was inspected;
- never invent factual business proof/claims;
- after design work, continue to follow all existing repository validation, Git, profile, security, accessibility, and Publishing Service rules.


## Keydiv strict final-response contract

This block is authoritative for team-facing completion messages. Successful technical work still runs fully; only the final user-facing report is constrained.

### Routine success after push/publish

Return **only**:

```text
✅ Completed and published.

[One short sentence describing the requested visible change.]
```

Do not add any heading, bullet list, Testing section, validation list, command output, file summary, Git detail, commit SHA, viewport list, implementation summary, or "what I changed" section.

### Push succeeded but live deployment is still propagating

Return **only**:

```text
✅ Completed and published to GitHub.

Live deployment is still propagating.
```

A normal asynchronous Publishing Service delay is not a build failure. Do not print the successful checks that preceded it.

### Genuine blocker

Report only the blocker and the minimum actionable detail needed to resolve it. Do not append successful checklists.

Technical/testing detail may be shown only when the user explicitly asks for technical/testing details. A detailed implementation prompt is **not** such a request.
