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
