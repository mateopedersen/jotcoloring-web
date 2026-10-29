# Photo conversion, age recommendations, editorial SEO and layout release

## Photo conversion

The default now uses the MIT-licensed Informative Drawings style 1 network,
exported from the official checksum-verified checkpoint. Source composition and
aspect ratio are preserved through bounded, uniform scaling. Edge-aware smoothing
reduces surface texture. Photo-guided region closure follows existing ink and source
color boundaries, rather than creating a replacement scene. Intermediate gray edges
are retained for smooth printing. Direct trace and line-art preservation remain
available. No photo is uploaded; no paid inference API is called.

Eight actual inputs were compared: an owner-supplied portrait, another portrait,
a cat, a cup, a rocket scene, a grayscale photograph, an underexposed portrait and
a rotated portrait. Local processing took 4.49–8.39 seconds (one desktop, model
already available). This is not a speed or accuracy guarantee. Dense fur and texture
can still produce busy lines, and the model may simplify details. No percentage of
likeness is claimed. First use downloads approximately 32 MB of same-origin model
and runtime assets. The model's actual bytes and license are checked in tests.

Actual browser checks covered an independent cat conversion, comparison, cancel
and retry, all six export formats, and import into Studio. The supplied portrait's
hair, face/neck and shirt were filled separately in Studio without filling the
white background. Private photographs and their outputs remain outside Git.
PDF exports stay below 1,000,000 bytes; PNG/WEBP preserve the rendered outline;
JPG, DOCX and real tonal SVG paths are also available. The PDF may use fewer gray
levels to satisfy the size cap; it does not silently invent image resolution.

Primary sources: [official model](https://github.com/carolineec/informative-drawings),
[CVPR paper](https://openaccess.thecvf.com/content/CVPR2022/papers/Chan_Learning_To_Generate_Line_Drawings_That_Convey_Geometry_and_Semantics_CVPR_2022_paper.pdf),
[official weights](https://huggingface.co/spaces/carolineec/informativedrawings).
Competitor interfaces and other contour approaches were inspected; no competitor
code or private user image was submitted to those services.

## Age recommendations

Version `jot-age-vision-2.0.0` measures actual enclosed coloring spaces, their usable
width, and the share occupied by broad versus small regions. It no longer favors
only the center of the picture. Broad characters are not outweighed solely by
small background decorations. Local CLIP image analysis supplies bounded visual
context. All 18 current source images were analyzed again. The snowman now suggests
ages 6–8; the floral mandala remains adult coloring. These are detail-based starting
points, not clinical developmental assessments or minimum permitted ages.

New image or model versions require a matching checksum-bound assessment. Import
validation rejects stale or incomplete analysis. The same band is projected into
catalog filters, search, detail pages and age collections. No visible “18+” badge
was added.

## Editorial and SEO

All 18 actual source images were visually inspected. The finite review ledger in
`content/reviews/catalog-2026-10-29.json` contains distinct titles, alt text and
scene-specific descriptions tied to source checksums. Stable IDs, URLs, licenses
and original media bytes are preserved. This ledger is not a way to claim unseen
future images were reviewed. New preparation requires an explicit description and
alt text; inspect each source before writing them.

Public copy uses US-English wording and concrete task names. Photo and text tools
are crawlable, while private artwork and download utility pages remain noindex.
Clean collection pagination is self-canonical and crawlable; search/filter variants
are noindex. Animal subcollections and nonempty age collections enter the sitemap.
HTML, Open Graph and Twitter titles/descriptions share the same page identity.
Reusable WebPage/CollectionPage and BreadcrumbList schema supplies the visible
hierarchy. Existing source-bound image licensing schema remains in place.
61 social covers were regenerated with current copy. Hash-addressed older covers
are retained because cached pages and shared links may still reference them.

Guidance used: [Google title links](https://developers.google.com/search/docs/appearance/title-link),
[Google image best practices](https://developers.google.com/search/docs/appearance/google-images),
[crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
No keyword-volume data, ranking result or indexing guarantee is claimed.

## Layout and regression checks

82 route addresses were visited in two full rounds at desktop and phone widths.
After fixes, all 82 were rechecked at 320 and 1440 CSS pixels (164 observations).
Additional tablet widths (768/1024), long searches, empty results, pagination and
open download/share/cookie windows were checked. Layout evidence is in
`docs/evidence/layout-audit-2026-10-29.json`.

Shared fixes cover photo preview aspect ratios, long card titles and aligned action
rows, age cards, resource arrows, readable footer and collection-note columns,
Studio's mobile project title, and AI example cards. `layout-constraints.css`
applies these rules to future content. The read-only `scripts/qa/layout-audit.mjs` probe provides reusable overflow, text-width, arrow, image and card-row checks; run it on new routes at 320, 390, 768, 1024 and 1440 CSS pixels, including open dialogs. It was also executed on the corrected tablet homepage. It does not hide body overflow to conceal
errors. Native select arrows remain a shared control. Existing intentional
horizontal category/resource scrollers are excluded from page-overflow failures.

214 automated tests and 7 operations tests pass. Type checking reports no errors
or warnings (one existing compatibility hint for beforeunload). The staging build
passes. The bounded HTTP verifier checks current copy, ages, searches, page metadata,
OG bindings, source checksums and real PDF/WEBP downloads. Local run: 161 checks,
124 requests, all passed. Production publication is not confirmed by these local
results; remote deployment and verification receipts are recorded separately.

This is evidence for tested states, not a claim that no browser, viewport or future
content could ever reveal a defect. New templates and imports should repeat these
checks. Five-million-item capacity was not load-tested in this release.
