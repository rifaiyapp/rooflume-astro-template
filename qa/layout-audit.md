# Crestline Roofing Layout Audit

## Audit scope

Combined structural, responsive, visual-consistency, and accessibility-risk review of the full landing page at 1920 × 1080 and 390 × 844 viewports.

## User goal and accessibility target

Keep the established navy, orange, white, and gold roofing identity while improving document structure, anchor accuracy, layout integrity, and the footer's clarity and efficiency.

## Evidence

- Desktop: `qa/layout-audit-desktop.png`
- Mobile: `qa/layout-audit-mobile.png`

## Strengths

- One clear H1 and sequential H2/H3 structure.
- Strong, consistent section hierarchy and angular transitions.
- Responsive content reflows without horizontal page overflow.
- Forms, navigation, FAQ controls, and carousel controls use semantic interactive elements.

## Issues corrected

1. The FAQ visual region used a generic outer `div`, so it was absent from the top-level section outline. It is now one semantic top-level `section` with the correct accessible name.
2. The desktop/mobile navigation labeled an FAQ destination as “Service Areas.” It now names and targets the FAQ accurately.
3. The newsletter added a second, low-priority form and made the footer visually heavy. It was removed together with its obsolete JavaScript and CSS.
4. The footer used nonfunctional legal placeholder links and excessive lower whitespace. It now has concise brand context, semantic footer navigation, one roof-check action, a phone link, and a compact copyright row.

## Verification

- Desktop: 1920px viewport / 1920px document width.
- Mobile: 390px viewport / 390px document width.
- Eight semantic top-level main sections detected.
- One H1, zero duplicate IDs, zero broken internal anchors, zero newsletter forms.
- No browser console or page errors in either capture.
- `astro build` passed.

## Evidence limits

The visual audit confirms responsive rendering and visible focus-capable controls, but it does not claim full WCAG conformance or screen-reader interoperability testing.
