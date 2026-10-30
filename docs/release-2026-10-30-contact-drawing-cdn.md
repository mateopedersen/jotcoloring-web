# Contact, drawing board, readability, and R2 delivery

## Visitor changes

- The contact page groups questions by topic and opens the JotColoring Google Form inline only on request. A required reply email, optional name, topic, optional page URL, and message are collected. Licensing requests carry their draft into this same contact flow. Google receives connection details only when the visitor opens its form.
- The free drawing board at `/drawing-board/` starts with a blank landscape canvas, an eight-color drawing palette, four brush sizes, rainbow strokes, drawing prompts, and a reversible Start Over action. Existing Studio tools, local saves, elements, lettering, and exports remain available. Tablet controls collapse to leave more room for the canvas.
- Studio's page library has larger previews, collection shortcuts, useful difficulty descriptions, and clearer paging. Its 10,000 entries are combinations of 125 subjects, 20 compositions, and four detail levels; they are not 10,000 individually illustrated source drawings. The library is loaded when opened rather than on every saved-artwork visit.
- Shared readable text sizes, category navigation, home actions, creator controls, and the footer replace small or low-contrast labels. The owner-requested duplicate footer/hero copy was removed.

## Contact administration

Editor: https://docs.google.com/forms/d/13RjvyGvvg2syy41EikFJBXrm6aIIbVH_-VOvQrzWZY8/edit

The form belongs to the Jot Coloring Google account. New-response email notifications were enabled there. A labeled SETUP TEST response was accepted by Google Forms; inbox delivery was not independently inspected. Questions and prefill field IDs are centralized in `src/contact/config.ts`. If questions are recreated in Google Forms, update those IDs and repeat the prefill test.

## R2 and CDN operations

Public media: https://assets.jotcoloring.com

This custom domain serves only `jotcoloring-production-published` in the existing Cloudflare account. It shares account billing with UltraClipart while retaining separate buckets. Originals, private jobs, backups, and staging remain separate. No new paid plan was enabled; existing R2 storage and operation charges still apply.

New publication uses `published/<category>/<slug>/<role>.<sha256-prefix>.<extension>`. These are content-addressed files: a changed file gets a new URL. Existing versioned object paths remain valid. `processImport` and `publishContent` use the same key resolver, and the catalog derives public URLs from stored object keys. Downloads validate the published revision before redirecting to the CDN.

The public CDN has a response-header transform, `JotColoring public assets CORS on cached responses` (rule `a4c65a876e714f5997f3646e4b9bef1b`). It sets `Access-Control-Allow-Origin: *` and exposes file length/type/range headers on GET/HEAD responses under `/published/` and `/og/` on the assets hostname. These files are already public and requests carry no private credentials. This makes cached images usable in canvas and cached PDFs downloadable across browsers, including requests that omit Origin. The rule does not apply to private buckets, application pages, writes, or API credentials. The bucket's preflight policy remains limited to the explicit site/staging/local origins. Cloudflare documents the interaction between [R2 CORS and cached custom-domain files](https://developers.cloudflare.com/r2/buckets/cors/).

After releases or CDN edits, run `node scripts/qa/public-media.mjs production`. It checks a bounded catalog sample (up to 48 items), PDF size, public media headers without Origin, repeated GETs with Origin, a real edge-cache HIT, contact/drawing routes, and robots directives. A successful HEAD request alone does not establish that a browser can download a cross-origin file.

Generated social cards are uploaded with `node scripts/ops/sync-og-assets.mjs --apply`, using the current authorized Wrangler session path in `JOT_WRANGLER_AUTH_FILE`. Run without `--apply` first. The tool validates dimensions and checksums, refuses mismatched existing files, and verifies upload bytes. Existing catalog cache metadata can be repaired with `sync-published-cache.mjs <saved-public-catalog.json>` (plan first, then `--apply`); it only updates verified existing published files.

The Cloudflare cache rule is limited to GET/HEAD under `/published/` and `/og/` on the assets domain and respects origin cache headers. Browser caching respects existing headers; Smart Tiered Cache and Early Hints are enabled. Rocket Loader and paid optimization products remain off. The assets robots file allows crawling; the production site's robots file allows crawling and advertises its sitemap. Private routes still require their own access controls and are not made public by robots directives.

Never overwrite bytes at a content-addressed URL. To withdraw a file, withdraw the catalog record, remove that exact public object, and purge that exact CDN URL. Old immutable URLs can otherwise remain cached. Do not expose any private bucket through this domain.

## Validation and limits

Before release: 305 application tests, seven operations tests, type checking, production build, and the initial JavaScript budget passed. Studio's static entry graph is 181,429 decoded bytes (88,315 gzip), below its 200,000-byte gate. The library remains an on-demand chunk.

Read-only layout and control probes passed on 23 representative routes at 320, 390, 768, and 1440 CSS pixels: 92 route/viewport combinations. This covers the shared page families and the new contact/drawing routes. These probes do not establish correctness on every physical device.

A final wide-screen review removed the public site's 1,800-pixel body cap from the full-screen Studio. Studio layout/control probes also passed at 320, 390, 768, 1024, 1440, and 2560 pixels, with the canvas workspace using the full available window width.

Browser checks exercised drawing, rainbow strokes, undo/redo, save, library opening, and an actual seven-format ZIP export. Exported PNG, SVG, JPG, JPEG, DOCX, PDF, and WEBP files were inspected; the test PDF was 24,633 bytes. The contact form loaded inline with the selected topic. Physical tablet pen/touch input has not been tested on hardware; the in-app browser does not expose touch injection.

Eighty-one generated OG objects were uploaded and read back with matching checksums. Repeated CDN GET requests produced HIT. Capacity for millions of catalog items is an architectural target, not a load-test result. Existing bounded search, queued ingestion, content hashes, and direct CDN media delivery must be monitored with real traffic; the current catalog is not evidence of million-item performance.
