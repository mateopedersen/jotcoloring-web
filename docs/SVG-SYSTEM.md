# JotColoring vector system

UI illustrations are original vector drawings in `scripts/icons/build-svg-library.py`. The generated, content-addressed sprite and `src/icons/catalog.json` form one shared registry for navigation, categories, download formats, ages, library actions, search suggestions and Studio tools. The artwork has one light source, material-specific shading and a common 128-unit canvas. Small arrows and functional controls use one clear stroke on a 24-unit canvas.

## Add or change an illustration

1. Add a named drawing and descriptive label in the builder. Use a recognizable silhouette, an appropriate material and safe transparent edges. Do not add platform logos or catalog coloring drawings to this decorative set.
2. Run `python3 scripts/icons/build-svg-library.py`, then `node --import tsx scripts/icons/inventory.ts`.
3. Use `VectorIcon`, `GlyphIcon`, `ArrowIcon` or `SceneArt`; client-side UI uses `illustrationMarkup` / `illustrationHref`. Do not duplicate inline definitions in cards. Respect the existing accessible button/link label.
4. Review `/svg-preview/` locally at large and button sizes. This route returns 404 outside the local environment.
5. Run `pnpm check` and `pnpm test`. The raster checks cover every illustrated icon at 24, 48 and 128 pixels, visible content, clipped edges, nested scene references, sprite integrity and the social-image renderer. Check affected pages and dialogs on a small screen as well.

A content hash in the filename prevents old and new icon definitions being mixed after publication. Compatibility sheets retain the previous public sprite URLs for cached pages. Studio tool names, existing control events, the favorite pressed state and its accessible label stay intact.

The approved JotColoring logo, the actual social-platform glyphs and their license stay recognizable. Social button frames were refined without distorting the marks. The 500 insertable Studio objects (25 base drawings × 20 variants) and photo-derived SVG exports remain monochrome coloring content. The two style choices now show actual black-and-white line styles. Existing raster OG images are not silently overwritten; future builds use the new icon renderer.

Inventory: `docs/evidence/svg-inventory-v3.json`. The user-facing CSV includes decorative graphics, preserved brand assets and generated coloring-object entries separately. A passing layout probe is a measured check, not a guarantee for every possible device or browser.
