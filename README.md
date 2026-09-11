# Rooflume — Roofing & Restoration Astro Template

## Overview

A responsive, single-page roofing and restoration template by **KEYDIV**, designed for presenting services and inviting inspection requests.

Rooflume is a fictional demonstration brand.

## Features

- Roofing service cards, company introduction, process section, service-area imagery, and inspection calls to action.
- Responsive navigation and mobile call/inspection action bar.
- Testimonial carousel and expandable FAQ.
- Callback form with browser validation and connected Lead Service feedback.
- Semantic markup, skip navigation, visible focus styles, and form status announcements.
- Static production output with local imagery, icons, and self-hosted display fonts.

## Technology stack

Astro 7, Astro components, TypeScript browser scripts, and plain CSS. Phosphor Icons supplies icons; Fontsource supplies Lobster Two and Oswald. Playwright supports local QA scripts.

## Project structure

```text
src/pages/index.astro     Landing page, content arrays, and interactions
src/layouts/Layout.astro Document shell, metadata, fonts, and global imports
src/styles/global.css    Colors, typography, layout, and responsive styles
src/components/          Component directory
src/assets/              Source asset directory
public/assets/           Production images and logo
public/favicon*          Browser icons
qa/                      Local QA scripts
astro.config.mjs         Astro configuration
package.json             Dependencies and commands
```

## Installation

Use Node.js **22.12+ or 24 (below 25)** and **npm 11**. Codex Cloud uses Node 22; `.nvmrc` prefers Node 24 locally. From the downloaded project directory:

```sh
npm ci
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev -- --background` | Start the development server in background mode |
| `npm run astro -- dev status` | Check the background server |
| `npm run astro -- dev logs` | Read development logs |
| `npm run astro -- dev stop` | Stop the background server |
| `npm run build` | Generate the production site in `dist/` |
| `npm run preview` | Preview a production build locally |

## Customization

- **Content:** Edit text, services, benefits, reviews, FAQs, links, and contact information in `src/pages/index.astro`.
- **Styles:** Edit CSS variables and component/responsive rules in `src/styles/global.css`.
- **Metadata:** Edit the default title, description, author, theme color, and favicon links in `src/layouts/Layout.astro`. The layout also accepts title and description props.
- **Images:** Replace files in `public/assets/` and update their references, alt text, and dimensions in the page. Replace favicon files in `public/` as needed.

## Callback and newsletter integration

The callback form is connected to a Keydiv-owned **Lead Service**. It validates fields, sends the request, shows success only after confirmed acceptance, and emits `rooflume:lead-submitted` after success. Failed submissions retain the entered fields. Do not remove this working integration during template maintenance. See [customer distribution requirements](docs/DISTRIBUTION.md) before sharing a customer copy; the current demo routing must be replaced or explicitly licensed.

No newsletter form is included in the current implementation. Adding subscriptions requires a form, an email-provider integration, and appropriate consent handling.

## Factory runtime and future editing

The project uses Keydiv Astro Factory v4.5 and the current repository UI Design Runtime. Read `AGENTS.md`, `project.config.json`, `DESIGN.md` and `docs/KEYDIV-UI-DESIGN.md` before editing. This is an approved design; runtime upgrades preserve its appearance and behavior.

Run `npm run validate` for type checks, build and runtime/profile gates, `npm audit` for dependency security, `npm run qa:form` for mocked form behavior, and `npm run qa:runtime` for rendered page checks. Browser QA requires Playwright Chromium. Optional `QA_BASELINE` points at a pre-change build for pixel comparison. Historical QA scripts may target earlier designs; the two commands above are the current regression entry points.

The profile is **private-demo**: noindex metadata/headers, crawlable robots policy, no indexable sitemap or promoting canonical. The security policy protects framing, base URLs and object embedding without restricting the existing Lead Service connection or inline styles. Stronger resource restrictions require a separate compatibility review. Noindex does not provide access control.

## Cloud editing and Publishing Service

Admin configures the Cloud environment once using Node 22, container caching, the approved credential secret and the canonical `scripts/codex-cloud-setup.sh` / `scripts/codex-cloud-maintenance.sh` entry points. These scripts are privileged infrastructure; do not run them merely for local validation or distribute them unchanged to customers. Cached maintenance installs only when the lockfile changes or dependencies are absent.

Preserve the existing Git remote/history and Publishing Service configuration. Validated changes safely synchronize and publish to `main` under `AGENTS.md`; never force-push. Build command is `npm run build`, static output is `dist`, and the existing publishing configuration remains authoritative. A deployment CLI is not a project dependency.

## Planned demos

These are planned addresses, not confirmation of live deployments:

- Preview: https://rooflume.pages.dev/
- Custom demo: https://rooflume.keydiv.com/

## Production checklist

- Replace demo phone numbers, locations, service areas, branding, and business information.
- Connect and test form delivery, validation, error handling, and spam protection.
- Replace demonstration reviews with authorized, verifiable customer feedback.
- Verify or remove certification, licensing, insurance, warranty, and service claims; demo copy is not evidence of these credentials or promises.
- Configure analytics only if needed, including applicable consent controls.
- Publish and link a privacy policy covering forms, data handling, analytics, and third-party services.
- Check responsive layouts, links, image rights, and production metadata before launch.

## Author

KEYDIV

## License

All rights reserved. Commercial license terms are provided with purchase.
