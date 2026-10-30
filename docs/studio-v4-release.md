# JotColoring Studio v4 — delivery and verification

Prepared 2026-10-30. This release expands the Studio and the creative-route section without changing the approved site font, logo, Cloudflare plan, domain, R2 objects, or public catalog artwork.

## What changed

- A new painting desk with a central canvas, a separate tool rail, an inspector, focus view, left-handed layout, and a mobile drawer with a visible Done control. Compact landscape screens also use the mobile arrangement.
- Easy mode offers a simpler tool set and automatically constrains a stroke to the closed region where it begins. Fill assistance prefers a small nearby enclosed space over the surrounding page when a tap lands on a line.
- Brush sizes from 1–240 px, numeric entry, quick-size presets, exact HEX/RGB/HSL, six brush finishes, seven tip shapes, pressure, smoothing, opacity, flow, hardness, spacing, angle, scatter, rainbow, and live preview. Compatible stylus hardware is needed for pressure input.
- Region selection, rectangle/ellipse/freehand selection, selection union/subtract/intersection, growth/shrink/invert, selected paint, reusable session selection, selection fill/erase, and boundary protection. Gradient and patterned fills remain clipped to the selected region.
- Shapes, symmetry, local references, palette extraction/harmonies, recoloring, named layers, opacity/blending, alpha lock, clipping below, text styling, named checkpoints, and undo history.
- All seven download types: PNG, SVG, JPG, JPEG, DOCX (Word), PDF, and WEBP. A single ZIP can contain all seven. Downloads remain inside the Studio dialog.
- The homepage/category creative section now shows a real Studio session alongside separate Photo to Coloring Page and AI routes. Printing and usage guides and the two Studio social covers use actual workspace/export screenshots.

The [feature register](studio-v4-features.md) describes 130 implemented features and controls. This count includes individual controls within tools; it does not mean 130 independent painting engines.

## 1,000 ready-to-color pages

The Studio library contains 1,000 distinct black-and-white SVG scene compositions: **25 original subjects in 40 layouts each**. These are not 1,000 different subjects. They are separate from the existing 500 insertable object variants. Pages are generated locally from original vector drawings, rendered only as needed, and open as a new locally saved project.

Subject, text, coloring-mood and four detail filters work together, with 18 previews per page. The current pixel-derived assessments yield 809 Easy, 95 Medium, 66 Hard, and 30 Very Hard pages. Kids & beginners / Adults & detail lovers are browsing suggestions, not age restrictions.

## Automatic difficulty for future imports

Easy, Medium, Hard, and Very Hard are shared by homepage/category discovery, content badges, search, the catalog and Studio starter discovery. Public imported content derives its difficulty from the existing validated image analysis, not a filename or an arbitrary manual label. The validated score maps to four levels (0–22.99, 23–41.99, 42–71.99, 72–100). The analysis must match the source checksum and active content revision; replacing an image invalidates the previous recommendation.

Starter SVGs are analyzed from their actual rasterized pixels. The offline analyzer retains small closed cells and measures region counts, widths, area shares, and edge density. Its source checksum and method version are stored with each assessment. This is a visual complexity estimate, not a guaranteed measure of developmental suitability. Existing age recommendations remain a separate, broader guide.

Two additive lookup indexes support these filters: catalog migration 0008 and search migration 0006. Existing search documents are updated in bounded batches by `scripts/data/reindex-difficulty.ts`. It is read-only by default; `--apply` records a before/after plan and uses revision/current-value guards. Re-run for the returned `nextAfter` cursor when more than 200 items exist. Normal new imports project the new level automatically.

These indexes and bounded lookups are architectural provisions; this release does **not** claim a load test with five million records.

## Export and compatibility limits

- PDF creation enforces **1,000,000 bytes maximum**. If necessary, the print copy is progressively optimized; the actual exported dimensions and optimization are shown. A page is A4; no US Letter choice is presented.
- SVG contains a lossless embedded PNG inside a self-contained SVG document. It is not a vector reconstruction of brush marks. Use editable project backup for editing layers/history.
- JPG and JPEG use the same encoding with different extensions. Word is a real DOCX with the colored image, not a renamed bitmap.
- Old project schemas 1/2 upgrade to schema 3. Existing browser saves remain available; backups validate new settings as well as older projects.
- Projects, photos, references and palettes remain on the current device. A reference is not included in downloads. Local saves are not cross-device cloud sync. Export an editable backup for portability.
- Flattened PDFs do not preserve source layer semantics or automatically identify body parts. Insertable vector objects retain named parts.

## Verification evidence

- **264 JavaScript/TypeScript tests passed**, including rendering, fill boundaries, composable brush tips, geometric selections, old/new backup round trips, all seven encoders, touch-fill cancellation, bounded pinch logic, future-import classification, and exact difficulty filters.
- **7 operations tests passed** (backup/restore, corruption, traversal, snapshots, thresholds and source scanning).
- Astro/type check: zero errors and zero warnings; one existing browser-compatibility deprecation hint for `beforeunload.returnValue`. Site build and jobs dry-run passed.
- Query-plan assertions confirm both new difficulty lookup indexes are used. A real D1 development-runtime failure on Hard collection pages was fixed by grouping category counts in one query; a ten-category regression test covers the compound-SELECT limit.
- All **1,000** SVG pages rasterize as distinct, nonempty black-and-white drawings. All source images were programmatically inspected; contact-sheet samples were visually reviewed. This is not a claim of 1,000 individual manual art reviews.
- Studio: **70 layout checks**, two rounds at 1440×950, 1024×768, 390×844, 320×720, and 844×390 over the canvas and six inspector tabs. No horizontal overflow, clipped text/arrows, missing alt text, or broken images in those checks.
- Affected site pages: **40 further layout checks**, two rounds over 10 routes at desktop and mobile widths. Local page filters and all four Studio starter filters return correctly labeled results.
- Actual browser workflows exercised fill, exact color, wide brush, layers, selections, checkpoint restore, saving/reload, Easy mode, mobile inspector, seven separate downloads and the ZIP pack. Pixel comparison of a protected 80 px brush stroke found **31,715 changed pixels and zero outside the protected region**, allowing a 2 px edge tolerance.
- Actual browser exports of the colored sample: PNG 175,004 B; SVG 233,685 B; JPG/JPEG 90,025 B each; DOCX 162,914 B; PDF **100,977 B**; WEBP **43,454 B**. Signatures, dimensions and colored pixels verified; SVG and DOCX embed the exact PNG; PDF has one page. A randomized high-entropy PDF stress test also exercises the under-1 MB optimization path.

**Testing limits:** mobile layout and interaction were tested with browser viewport emulation. The available browser does not expose physical multi-touch injection; no physical iPhone/Android/stylus pressure test is claimed. Touch cancellation/pinch calculations have automated tests. DOCX package structure and embedded pixels were checked; it was not opened in Microsoft Word. Passing checks do not guarantee that every browser/hardware combination is defect-free.

## Reproduce and operate

Run `pnpm check`, `pnpm test`, `python3 -m unittest discover -s tests -p ops_test.py -v`, `python3 scripts/ops/secret_scan.py`, and `pnpm build`. Compile jobs with the existing Wrangler dry-run. Rebuild starter pixel assessments with `node --import tsx scripts/studio/assess-starters.ts` after changing source SVGs, then review the new contact sheets. Source edits must not retain stale checksums.

Existing GitHub Verify → Deploy reviewed environment remains the only code publisher. Apply the two additive indexes and the guarded search-label update to the intended environment; do not change queues, routes, resources or plans during this release. Verify staging first, then merge staging into main for production. The release workflow verifies artifact hashes, commit identity and the exact jobs→web deployment versions.

Official design references consulted: [Krita selections](https://docs.krita.org/en/user_manual/selections.html), [Photopea selections](https://www.photopea.com/learn/selections), [Photopea brush tools](https://www.photopea.com/learn/brush-tools), and [Kleki FAQ](https://help.kleki.com/faq/). No third-party painting source was copied and no paid service was added.
