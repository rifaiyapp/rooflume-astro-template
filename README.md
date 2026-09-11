# Rooflume — Roofing & Restoration Astro Template

Rooflume is a premium responsive roofing/restoration landing-page template by KEYDIV, with local imagery, self-hosted fonts, mobile navigation, testimonial carousel, accessible FAQ and inspection form. Rooflume is a fictional demo brand; replace demo business claims with verified customer content before launch.

This product carries its own v4.7 runtime. Use your own GitHub, Codex Cloud and Cloudflare accounts without installing the author's local factory skill.

**The form is non-sending by default.** It validates the existing fields and clearly reports that no request was sent. Configure your own service before collecting leads.

## Local development

Use Node 22.12+ or Node 24 (below 25), with npm 11. .nvmrc prefers Node 24.

```sh
npm ci
npm run dev -- --background
```

Open Astro's displayed local URL. Manage the server with `npm run astro -- dev status`, `npm run astro -- dev logs` and `npm run astro -- dev stop`.

```sh
npm run validate
npm audit
npm run build
```

Output is dist. Browser QA uses npm run qa:form and npm run qa:runtime; install Chromium with `npx playwright install chromium` first. npm run audit:distribution checks portability. npm run qa:cloud tests Cloud scripts in an isolated Bash fixture with no real credentials or network (Git Bash on Windows).

## Make it yours

- [Customization](docs/CUSTOMIZATION.md): common config, content, assets and Codex prompts.
- [Codex Cloud setup](docs/CODEX-CLOUD-SETUP.md): your repository/environment and scoped CODEX_GITHUB_TOKEN.
- [Form integration](docs/FORM-INTEGRATION.md): demo/live modes and customer service contract.
- [Customer setup](docs/CUSTOMER-SETUP.md): your Cloudflare account, domain and launch profile.
- [Distribution boundary](docs/DISTRIBUTION.md): current-source export, historical settings and licensing.

DESIGN.md records the approved appearance. Codex follows AGENTS.md and docs/KEYDIV-UI-DESIGN.md. Static Astro, plain CSS and minimal scripts keep the template portable; no backend or tracking is bundled.

The master remains private-demo (noindex). Choose a launch profile in the customer copy. The editable Worker name in wrangler.jsonc binds no account. Authenticate to your own Cloudflare account, build and deploy with `npx wrangler deploy`; Wrangler is not a project dependency.

## License

All rights reserved. Commercial terms are supplied with purchase. Preserve required third-party notices and confirm asset rights for your intended use.
