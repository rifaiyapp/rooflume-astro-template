# Rooflume — Roofing & Restoration Astro Template

## Overview

A responsive, single-page roofing and restoration template by **KEYDIV**, designed for presenting services and inviting inspection requests.

Rooflume is a fictional demonstration brand.

## Features

- Roofing service cards, company introduction, process section, service-area imagery, and inspection calls to action.
- Responsive navigation and mobile call/inspection action bar.
- Testimonial carousel and expandable FAQ.
- Callback form with browser validation and demo feedback.
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

Install Node.js **22.12.0 or newer** and npm. From the downloaded project directory:

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

The callback form validates fields, emits the browser event `rooflume:lead-submitted` with form data, displays demo success text, and resets. **No backend endpoint is configured; submissions do not deliver messages.** Connect a server endpoint or form service and show success only after confirmed delivery. Keep service credentials on the server.

No newsletter form is included in the current implementation. Adding subscriptions requires a form, an email-provider integration, and appropriate consent handling.

## Cloudflare Pages deployment

Connect your repository to Cloudflare Pages and select `main` as the production branch. Use a Node.js version compatible with the requirement above.

- **Build command:** `npm run build`
- **Output directory:** `dist`

Deploy the static output; configure any form backend separately.

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
