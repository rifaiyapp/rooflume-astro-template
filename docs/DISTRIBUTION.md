# Customer distribution readiness

This approved private demo is connected to a Keydiv-owned **Lead Service**. It is not a disconnected form demo. Preserve the working integration in this repository during runtime maintenance.

## Integration inventory

- `src/scripts/lead-form.ts`: existing browser-visible Lead Service endpoint, project identifier and form identifier. These are routing configuration, not credentials. Do not reproduce the values in team documentation.
- `qa/lead-gateway-check.mjs`: matching routing configuration and mock response contract. Requests are intercepted; this is not proof of live delivery.
- No embedded credential, secret header or private downstream webhook was found in the form implementation. Delivery, CORS, spam handling and downstream automation depend on the externally managed Lead Service; their configuration is outside this repository and was not audited.
- The form sends name, phone, email, ZIP, message, honeypot and page/campaign/referrer metadata. It waits for confirmed success, preserves entries on failure, prevents duplicate submission, and emits `rooflume:lead-submitted` after success.
- `wrangler.jsonc` contains existing Publishing Service identity; the current repository remote and Cloud bootstrap scripts are Keydiv-specific infrastructure configuration.

## Required before shipping a customer copy

1. Replace Lead Service routing and project/form identifiers with customer-owned or explicitly licensed configuration. Update the mocked QA configuration together. Do not ship a customer form that sends leads to the existing demo service.
2. Verify actual delivery with the customer's authorization, including CORS, success/error handling, spam controls, data retention, privacy disclosures and consent requirements. Keep all service credentials server-side.
3. Replace Publishing Service identity, intended domain and repository ownership configuration. Remove Keydiv-only Cloud bootstrap/maintenance scripts from the distribution package or adapt them to approved customer infrastructure; never run the existing scripts in a customer account unchanged.
4. Produce a clean customer export without `.git`, credentials, environment files, QA artifacts or private infrastructure history. Preserve the original repository history; do not rewrite it as part of distribution preparation.
5. Replace demonstration contacts, reviews and business claims with verified customer content; confirm commercial redistribution rights for imagery, fonts and icons and include required licenses. Preserve the demo design unless customization is requested.
6. Select exactly one customer profile explicitly. Keep this repository `private-demo`; do not enable indexing here as part of a customer launch.

The runtime upgrade does not certify this package as sanitized for resale, nor verify the external Lead Service's operational delivery.
