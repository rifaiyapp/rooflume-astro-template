# Keydiv UI Design Runtime v2

Use this runtime for every meaningful UI/page design or redesign task in this repository. It must work with or without supplied visual references.

## 1. Classify the input before coding

- **Reference-led:** screenshots/mockups define the desired composition.
- **Directed:** user gives brand assets, colors, style words, or partial visual direction.
- **Auto art direction:** user gives only a goal/business/page prompt. Missing references are not a blocker.

## 2. Core quality target

Unless the user asks otherwise, aim for:

**premium + professional + minimal + modern + distinctive + conversion-aware + accessible + fast**

Minimal means intentional and uncluttered, not empty or generic.

## 3. Reference-led behavior

When references are supplied:
- inspect them before coding;
- match defining composition, hierarchy, proportions, density, alignment, typography relationships, spacing, media treatment, and CTA prominence at the requested/inferred fidelity;
- keep project branding/content original unless supplied assets belong to the project;
- do not substitute abstract placeholders when real imagery/screenshots are the defining feature and usable approved media exists.

Fidelity:
- strict composition = match major anatomy closely;
- directed inspiration = preserve defining design language with moderate freedom;
- mood only = borrow tone/principles without structural matching.

## 4. No-reference / prompt-only behavior

Do not fall back to generic AI UI. Automatically:
1. infer page type, audience, primary action, trust needs, and content density;
2. select one suitable style family;
3. write a project-specific one-sentence design thesis;
4. choose one signature visual idea;
5. define typography, color roles, spacing, imagery, CTA hierarchy, and motion;
6. persist durable decisions in `DESIGN.md`;
7. build around the actual content rather than around pre-made card patterns.

Style family guidance:
- local/home services -> Service Authority;
- premium personal/expert -> Premium Editorial;
- B2B/corporate -> Corporate Precision;
- portfolio/template/showcase -> Creative Showcase;
- education/wellness/community -> Warm Human;
- ecommerce/product -> Product / Commerce.

A style family is design grammar, not a reusable layout. Do not repeat the same composition across unrelated projects.

## 5. Anti-generic rules

Avoid unless the brief/reference clearly supports them:
- generic centered gradient hero;
- automatic left-text/right-card hero;
- endless rounded equal cards;
- equal-width three-card filler sections;
- glassmorphism/pill overload;
- random orbs/blurs;
- fake browser windows instead of real visual proof;
- random serif + sans pairing to simulate luxury;
- default SaaS/dashboard aesthetics for service/editorial/portfolio work;
- repeated layouts across Keydiv projects.

Use one strong project-specific visual idea instead.

## 6. Typography, color, spacing, imagery

- Choose typography for the brand/audience; at most two families and only needed weights.
- Use a role-based color palette; use brand colors as controlled accents rather than forcing every logo color everywhere.
- Use coherent spacing/gutter/content-width relationships and optical refinement after rendering.
- Use approved imagery with a clear purpose. Never fabricate factual proof, projects, testimonials, ratings, client logos, or results.
- If important media is missing, use original generated media only when an approved generation tool is available; otherwise use an intentional temporary composition and report the limitation.

## 7. Content and UX

Content hierarchy is part of design. Improve rough copy for clarity when safe, but never invent factual business claims.

Use one dominant CTA per section. Secondary CTA only when it serves a distinct path. Do not create dead links or fake actions.

Profile-aware UX:
- `private-demo`: prioritize showcase/selection and visual proof;
- `public-organic`: preserve useful descriptive content, crawlable real links, and logical headings;
- `ads-landing`: prioritize message match, one dominant conversion path, trust near CTA, minimal distractions, and fast stable rendering.

The factory remains authoritative for technical profile behavior.

## 8. Motion

Default motion is subtle and purposeful:
- CSS-first;
- transforms/opacity preferred;
- short controlled hover/focus/reveal transitions;
- no excessive parallax, bouncing CTAs, or decorative loops;
- honor `prefers-reduced-motion`.

## 9. Responsive design

Mobile is a recomposition, not merely stacked desktop columns. Preserve hierarchy, CTA priority, intentional line breaks, media meaning, and clean touch targets. Resolve tablet/intermediate layouts when needed.

## 10. Persistent design source

Read and maintain `DESIGN.md`. Keep only durable design decisions:
- input mode/fidelity;
- style family;
- design thesis/signature visual idea;
- composition;
- type/color/spacing/media/motion;
- CTA hierarchy;
- responsive behavior.

Do not use `DESIGN.md` as a task log.

## 11. Visual QA

For serious design work, render and inspect at minimum desktop (~1440px) and mobile (~390px) when browser tooling is available.

Check in this order:
composition -> focal point/proportions -> alignment -> typography -> spacing -> imagery -> color/contrast -> CTA -> responsive defects -> polish.

Reference-led: compare to the reference at the requested fidelity.
Prompt-only: compare to `DESIGN.md` and verify the design is specific, coherent, and non-generic.

Perform up to three focused refinement passes.

If browser tooling is unavailable, report exactly:
`VISUAL QA NOT COMPLETED — browser/screenshot tooling unavailable.`
Do not claim visual parity/final visual approval without rendering.

## 12. Engineering handoff

Keep semantic HTML/CSS and minimal client JavaScript. Do not weaken repository accessibility, performance, security, indexing/profile, validation, Git, or Publishing Service rules. After design work, follow the repository/factory validation and safe finalization workflow.
