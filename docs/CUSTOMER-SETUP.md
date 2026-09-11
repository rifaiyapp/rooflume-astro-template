# Set up your copy

1. Import into your own GitHub repository. Use its origin, credentials and environment. A clone alone does not change origin. Follow [Cloud setup](CODEX-CLOUD-SETUP.md).
2. Follow [customization](CUSTOMIZATION.md). Replace fictional contacts/reviews/service areas and unverified licensing, ratings, insurance and warranty claims with approved facts. Confirm commercial licensing and asset rights.
3. Configure your own [Lead Service](FORM-INTEGRATION.md), or retain the non-sending demo. Add the privacy/consent disclosures required for your practices.
4. Choose exactly one launch profile. The master stays private-demo with noindex metadata/headers, crawlable robots and no canonical/sitemap. Public-organic needs production metadata, domain/canonical, indexing and an appropriate sitemap. Ads-landing defaults to noindex,follow and must allow ad crawlers. Update project.config.json, layout metadata, public/_headers, public/robots.txt and matching validation/QA gates together. JSON alone does not change output. Keep previews noindex.

## Your Cloudflare account/domain

Static output is dist. No seller account ID, zone, route or domain is configured. The editable example Worker name rooflume in wrangler.jsonc is scoped to whichever account you authenticate. Choose a unique name in your copy. Wrangler is not a project dependency.

In your own Cloudflare account, connect your destination repository to Workers Builds, choose main, build with `npm run build` and deploy with `npx wrangler deploy`. Use Node 22.12+ or 24 with npm 11. Set public form variables in that build environment. Alternatively authenticate locally to your own account, build and use the same deploy command. Confirm the target account; never reuse seller credentials. See [Cloudflare static-assets setup](https://developers.cloudflare.com/workers/static-assets/get-started/).

Attach your own custom domain in the Worker's domain settings, then record its approved HTTPS URL in project.config.json. Configure Astro site/base when needed; the template assumes hosting at /. A non-root base requires reviewing root-relative links and assets.

Run npm run validate, npm audit, npm run audit:distribution, npm run qa:form and npm run qa:runtime. Check actual live routes, missing-route 404, mobile navigation, form delivery, indexing and security headers. Keep safe revalidation caching; add HSTS only after domain readiness. No seller hosting or automation is required.
