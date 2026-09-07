# Rooflume performance optimization

## 1. LCP identification

Measured before editing, using Chromium's `largest-contentful-paint` observer against the production build, before scrolling or taking full-page screenshots:

- 390 × 844, DPR 3 (mobile): `h2#callback-title`, “Free roof inspection”.
- 1440 × 900, DPR 1 (desktop): the same heading.
- 1920 × 1080, DPR 1 (wide desktop): `section#home.hero`, its CSS background image.
- 820 × 1180, DPR 2: the form heading.

The supplied PageSpeed summary contains no URL, trace, or LCP-element details. Its exact 18.4-second mobile LCP element cannot be independently established from that summary. These are measured local elements, not a claim about the missing trace. The heading has no image asset; the hero was nevertheless the largest initial download at every viewport. After optimization the wide-desktop LCP is `.hero-media img`, displaying the same artwork.

## 2–3. Hero asset before and after

| Asset | Dimensions | Bytes |
| --- | --- | ---: |
| Original `public/assets/hero-roofing.png` | 1920 × 850 | 2,656,703 |
| Mobile `public/assets/optimized/hero-roofing-1280.avif` | 1280 × 567 | 41,309 |
| Desktop `public/assets/optimized/hero-roofing-1920.avif` | 1920 × 850 | 65,630 |
| Mobile WebP fallback | 1280 × 567 | 51,122 |
| Desktop WebP fallback | 1920 × 850 | 83,534 |

The hero now appears in HTML as a picture with eager loading, high fetch priority, explicit dimensions, and mutually exclusive mobile/desktop sources. Removed the old PNG preload; only one image has high priority. The original cover geometry, top alignment, mobile 66% horizontal crop, shade and polygons remain. The mobile source retains the full composition because the tall cover container crops it substantially; it is not upscaled during generation.

## 4. Complete image inventory

All original files under `public/assets` were inspected with Sharp. No external image hosts are used.

| Original | Original dimensions | Original bytes | Generated widths, both AVIF and WebP |
| --- | --- | ---: | --- |
| hero-roofing.png | 1920 × 850 | 2,656,703 | 1280, 1920 |
| rooflume-logo.png | 2048 × 768 | 595,158 | 250, 500, 750 |
| about-roof-detail.jpg | 1200 × 896 | 1,015,860 | 400, 800, 1200 |
| about-roof-inspect.jpg | 1200 × 896 | 938,613 | 400, 800, 1200 |
| roofing-services.png | 1600 × 1100 | 3,688,978 | 400, 800, 1200 |
| local-roofer.png | 1024 × 1536 | 1,787,501 | 400, 800, 1024 |
| roofing-fleet.png | 1920 × 760 | 2,832,104 | 640, 1280 |
| service-map.png | 1738 × 905 | 2,037,406 | Not referenced; retained without generating variants |

All 38 generated images use the naming pattern `public/assets/optimized/<original-stem>-<width>.<avif|webp>`. Transparent assets retain alpha. Original PNG/JPEG sources remain available for future regeneration.

Above the fold, the only images are the logo and hero. The logo renders at 185–275 px wide in the header and 250 px in the footer; its original 2048 px source was far larger than required. Service cards reach 520 px wide in the stacked layout. The about grid caps at 590 px; its tall main crop requires more source pixels than its narrow width alone suggests. The FAQ worker occupies a responsive column, with a 520 px cap in the stacked layout. The fleet image fills the responsive CTA column, up to approximately 700 px. Detailed sampled image boxes and requested assets are saved in `qa/performance-before.json` and `qa/performance-after.json`.

Below-fold image elements use lazy loading and asynchronous decoding. The FAQ decorative CSS background now uses an AVIF/WebP image-set instead of the original 939 KB JPEG; it remains a CSS background to preserve its layered gradients and positioning. There are no review avatar, gallery, insurance, financing, or process photo assets in the current page.

## 5. Resource weight

Measurements use cold browser contexts and resource decoded body sizes, excluding HTML and protocol overhead. They describe browser requests, including browser-selected near-viewport lazy images, not the size of the entire deployed directory. Final measurements and Lighthouse scores are recorded below after QA.

| Viewport | Before bytes | After bytes | Reduction |
| --- | ---: | ---: | ---: |
| Mobile 390 px / DPR 3 | 5,668,631 | 437,818 | 92.3% |
| Desktop 1440 px / DPR 1 | 9,415,733 | 558,093 | 94.1% |
| Wide 1920 px / DPR 1 | 9,415,733 | 558,093 | 94.1% |
| Tablet 820 px / DPR 2 | 9,357,609 | 528,949 | 94.3% |

## 6–8. CSS, fonts, scripts and layout

- Built CSS reduced from 176,939 bytes to approximately 49 KB by replacing both complete Phosphor stylesheets with only referenced selectors. One external stylesheet remains; the entire sheet was not inlined.
- Original icon WOFF2 files totalled 279,124 bytes. Subsets retain the same glyph outlines and font metrics, totalling 6,620 bytes. Their display strategy is `swap`; unused font formats no longer enter the build.
- Kept the two already self-hosted text fonts: Lobster Two Latin 400 italic and Oswald Latin 700. Both already use `swap`, and are used by the desktop phone lockup. The rest of the page uses its existing system-font stacks. No external font stylesheet, external font connection, or extra weight was added. No font preload is necessary for the measured LCP heading; avoid adding mobile downloads for desktop-only typography.
- Native Astro module JavaScript remains deferred. No framework, hydration layer, parser-blocking script or early third-party runtime was added. No CSS imports were introduced.
- Carousel card geometry is cached through ResizeObserver. Arrow, dot and autoplay updates write transforms without repeatedly reading layout after DOM writes. Existing resize debounce, keyboard, touch, hover/focus pause and reduced-motion behavior remain.
- Unused layout selectors were not removed speculatively: responsive, focus and animation rules still matter even if a single initial viewport does not exercise them.

## 9–10. Accessibility

Baseline axe identified inactive desktop navigation links and the reviews label as white-on-orange failures (2.87:1), plus closely spaced 10 × 10 review dots. Manual color checks also covered clipped form/section labels and interactive states that automated contrast checks can skip.

- Applied the darker existing orange shade `#c44f00` locally to white-text surfaces: navigation, form and section headers, featured service copy, relevant button states, menu and review controls, expanded FAQ number, and mobile quote button. Decorative orange polygons and accents retain their original shade.
- Darkened small orange text in About/CTA labels and expanded/hovered FAQ questions. FAQ text on the image-tinted orange background uses existing navy for reliable contrast. The mobile call button uses the slightly darker green `#137d43`.
- Preserved passing gold/navy hover and focus navigation states; unchanged gray body, footer, form label and placeholder colors pass the checked states.
- Review pagination buttons now have non-overlapping 44 × 44 hit areas while their visible dots remain 10 px / 28 px. Existing menu, CTA, arrows and FAQ targets already meet practical minimums. Footer links have adequate spacing and did not fail the target-size audit.

## 11. Files changed

- `src/pages/index.astro`: image delivery and cached carousel geometry.
- `src/layouts/Layout.astro`: reduced icon stylesheet import and removed old hero preload.
- `src/styles/global.css`: semantic hero styling, compressed FAQ background, contrast and pagination hit areas.
- `src/styles/icons.css`: generated used-icon CSS.
- `src/components/ResponsiveImage.astro`: native picture/srcset component, no client runtime.
- `src/assets/image-manifest.json`: dimensions and generated widths.
- `public/assets/optimized/`: 38 images, two subset icon fonts and the upstream icon license.
- `qa/optimize-assets.mjs`, `qa/subset-icons.mjs`, `qa/performance-audit.mjs`: reproducible asset generation and browser audit.
- `qa/hero-fidelity-check.mjs`: intercept synthetic leads and use the current Rooflume submission event.
- `PERFORMANCE-REPORT.md`: this report.

Package manifests and lockfiles are unchanged. Font subsetting and Lighthouse use temporary authoring/QA tools cached under ignored `.temp`; neither is a project or production dependency. Run `node qa/optimize-assets.mjs`, then the commands documented in `qa/subset-icons.mjs`, to regenerate assets after changing icon usage.

## 12–14. Build, QA and intentional limits

`npm.cmd run build` passes. The generated HTML references existing local files and has exactly one high-priority image. Playwright checks cover four widths, overflow, lazy image loading, console errors, carousel movement and pagination, FAQ state, and mobile navigation. Section-by-section axe contrast and target checks report no violations at the sampled widths. Existing header, hero, FAQ and layout scripts were also run; no broken anchors or duplicate IDs were found.

The gateway test passes success, validation, payload fields, UTMs, referrer, honeypot, repeated/dynamic fields, duplicate prevention, API/network errors, malformed responses, timeout and retry. Requests are intercepted; this verifies browser integration rather than a new live delivery test. Lead-form implementation and gateway infrastructure are unchanged.

Before/after screenshots are saved under `qa/performance-*.png`; hero composition and page geometry were visually reviewed. Differences are image encoding, the requested contrast adjustments and pagination hit areas. Form copy, section order, lead behavior, animations, SEO and structured data remain.

Original assets and the unused service-map image remain intentionally: deleting them provides no request-weight benefit and removes editable sources. The FAQ image remains a compressed layered CSS background. Publishing, production HTTP cache/compression configuration and gateway infrastructure were outside this local optimization. At the initial optimization approval, no commit, push or deployment had been performed.

Implementation references consulted: [Astro components](https://docs.astro.build/en/basics/astro-components/), [Astro styles](https://docs.astro.build/en/guides/styling/), and [FontEditor subset API](https://github.com/kekee000/fonteditor-core).

## Final local Lighthouse results

Isolated Lighthouse 13.4.1 run against the production build served on localhost (mobile default simulated throttling; desktop 40 ms / 10 Mbps, 1x CPU):

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| performance | 96 | 100 |
| accessibility | 100 | 100 |
| best-practices | 100 | 100 |
| seo | 100 | 100 |
| first-contentful-paint | 1.6 s | 0.5 s |
| largest-contentful-paint | 2.2 s | 0.7 s |
| total-blocking-time | 150 ms | 40 ms |
| cumulative-layout-shift | 0 | 0 |
| speed-index | 1.7 s | 0.6 s |

Reports: `qa/lighthouse-mobile.json` and `qa/lighthouse-desktop.json`. These are local lab results, not new deployed PageSpeed Insights scores or field Core Web Vitals. Recheck the published site after deployment to assess its real network/cache behavior. An overlapping screenshot/Lighthouse run was discarded because competing browser work distorted CPU timings; the table is the subsequent isolated run.

## Finalization review

No additional production design or functional changes were made during finalization. Compared the complete diff and checked the unchanged lead-form implementation, form markup, field names, project/form identifiers, endpoint, validation, honeypot, navigation and FAQ logic, content arrays, section order and SEO metadata. All 38 generated images and both subset fonts are referenced by the built page/styles; all referenced generated assets exist. Native AVIF source selection and WebP fallback were checked at mobile and desktop widths.

Reran the production build and the applicable header, hero, FAQ, layout, About, process, process/testimonial transition, service polygon, gateway and performance/browser QA scripts. The older process/testimonial screenshot helper needed `fullPage: true` because its crop uses a document coordinate below the viewport; this QA-only correction does not change the page. Legacy `reorder-check.mjs` and `visual-check.mjs` target a removed newsletter and obsolete active-card selectors; their current-page coverage is supplied by the header, layout, hero, gateway and performance checks.

Only intentional source, asset-generation/browser QA scripts, this report, 38 responsive image files, two subset fonts and the upstream font license are included for commit. Screenshots, Lighthouse JSON, debug logs, temporary scripts, downloaded QA tooling, dist and caches remain ignored. The additional finalized QA helper is `qa/process-testimonial-transition.mjs`.
