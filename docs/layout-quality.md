# Layout checks for new content and components

The shared layout constraints are in `src/styles/layout-constraints.css`. Keep long titles and descriptions wrapping inside their own columns; use `minmax(0, 1fr)` for flexible grid tracks, and let card action rows align at the bottom. Do not hide page overflow to conceal a layout problem.

Category labels use `CategoryLabel.astro` and the taxonomy-backed `categoryPresentation()` resolver. New catalog entries automatically receive the relevant category illustration. A category without reviewed artwork uses the neutral collection icon. Keep share actions separate in the upper-right corner; do not reuse them as category artwork.

`scripts/qa/layout-audit.mjs` exports read-only browser probes for page overflow, clipped labels, arrow containment, aligned action rows, missing image descriptions, broken loaded images, overlapping card controls, and underfilled empty-board sections. Run both probes after page content settles and after opening interactive surfaces. A clean probe is followed by a screenshot review; it does not prove every possible display is perfect.

For each release:

1. Enumerate every current taxonomy path and published content URL, plus the public static pages, downloads, age filters, empty search results and 404 page.
2. Check all routes at mobile and desktop widths. Repeat representative templates at 320 and 768 CSS pixels.
3. Open the mobile menu, cookie settings, share/download dialogs, My Artwork dialogs and all Studio inspector tabs. Check keyboard focus as well as pointer controls.
4. Inspect an empty board collection, an existing collection, long titles and descriptions, and the narrowest controls. Do not delete or modify a user's saved artwork to create test states.
5. Run `pnpm check`, `pnpm test`, operations tests, the secret scan, a production build and `pnpm perf:budget` before publishing. Verify the actual deployed release afterward.

Local audit results and screenshots belong in ignored `outputs/` folders. Report the measured routes and widths, and distinguish browser emulation from physical-device testing.

## Check the controls themselves

Run `measureMobileControls()` as well as the two original probes. A page with no horizontal scrollbar can still have clipped button labels, misplaced SVGs or an action group that requires sideways scrolling. Decorative SVGs marked `aria-hidden` still occupy visual space and must be measured. Ignore genuinely hidden tooltip text and closed disclosures, then open those disclosures and inspect their visible controls separately.

Use 320 px for the complete current route list in both the system font and the Manrope fallback. In local development only, append `__qa_font=fallback` to a page URL to force the fallback font without changing the production typography. Repeat representative templates at 360, 390, 430 and 768 px, and verify desktop layouts. The development font switch is disabled in production builds.

For Studio, check all seven tabs, both states of the brush-size disclosure, the library, element picker and all seven export-format tiles. Check a short landscape viewport as well as portrait. Controls must not cover the canvas when their drawer is closed. The drawing tool rail fits in two rows on narrow phones and one row in landscape; it is not an intentional horizontal scroller. Brush controls start collapsed on compact screens and stay expanded on desktop.

Astro component styles do not automatically select SVG roots rendered inside another component. Use an explicit `:global(svg)` selector within the component's own class scope for those SVG children; do not rely on a scoped selector that silently misses them.
