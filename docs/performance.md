# Performance and repeatable checks

The performance release keeps the existing design, routes, assets, storage bindings and deployment pipeline. It does not enable a paid service or change a plan.

## What changed

- The sharing controller and its CSS load after a Share action. The 58-app directory is built when opened; approved brand geometry lives in one content-addressed SVG sprite. Popular destinations, keyboard dismissal, image preparation, copy fallbacks and native sharing remain available.
- PDF generation remains a dynamic import. An explicit PDF bundle group separates the bundler runtime from the large PDF library, preventing that library from entering initial tool dependency graphs.
- Photo conversion uses lightweight canvas primitives. My Artwork loads painting composition when needed, and file saving no longer imports the Studio renderer.
- Default homepage featured items reuse its existing catalog result. Animal theme covers and the page cover share a bounded, indexed batch lookup and one hydration pass. A collection cover comes from its own published content with a verified thumbnail; an empty collection uses a category illustration. Publication and archival change the cache epoch, so the next request can use the updated selection.
- Above-the-fold comparisons are eager; the primary hero receives high priority and its exact catalog URL is preloaded in the document head, before the navigation markup. Lower animal-theme images and quick preview remain lazy. Image dimensions are retained.
- Content-addressed illustrations and checksum-verified model URLs have immutable browser caching. Changing their bytes requires a new URL.

## Public response cache

Only explicit public HTML, published catalog JSON and versioned public media routes qualify. Studio, photo/AI tools, My Artwork, admin, sessions, writes, unknown queries, Range requests, authorization and cookies bypass the cache. Only successful responses with the expected MIME type and without Set-Cookie/private/no-store are stored. Errors are never stored.

Keys include environment, exact build commit, trusted Cloudflare country and canonicalized path/query. Catalog-dependent entries also include the latest indexed publication outbox sequence. Normal publish/archive transactions advance this sequence; the next request uses a different key. Direct SQL changes that bypass the publication pipeline are unsupported: use the validated import/publish/archive tools. Search projection remains asynchronous and uses a short TTL.

The edge TTL is 120 seconds for catalog HTML, 60 seconds for JSON, 300 seconds for versioned media and 600 seconds for static information pages. HTML still revalidates in the browser. Private content receives no new cache policy. Cache failures fall back to the application. `X-JotColoring-Cache` reports HIT, MISS or BYPASS; `Server-Timing` reports application elapsed time. Cache API entries are local to a Cloudflare location, so first visits elsewhere can miss.

## Run the checks

Use the pinned Node and pnpm versions in package.json.

```
pnpm check
pnpm test
python3 -m unittest discover -s tests -p ops_test.py -v
python3 scripts/ops/secret_scan.py
pnpm build
pnpm perf:budget
node scripts/qa/site-performance.mjs https://staging.jotcoloring.com staging
node scripts/qa/site-performance.mjs https://jotcoloring.com production
```

The HTTP audit derives detail/download routes from the actual catalog. It checks 111 current route variants twice and saves reports under `.local/performance-v1/`. Entry-JS bytes in that HTTP report are entry files only. The separate bundle gate recursively follows static JS imports, excludes dynamic imports, and rejects eager PDF/starter/model engines. CI runs this gate after each build.

The cover lookup uses the category-membership and active-asset indexes and stops after the first eligible item in each collection; it does not pre-render pages for every future upload. Run large-catalog load tests before treating any target catalog size as a measured capacity. Category accuracy still depends on the reviewed category metadata assigned during import.

Use `scripts/qa/layout-audit.mjs` as a read-only DOM probe at desktop and mobile sizes, then inspect actual screenshots and use the controls. An automated overflow probe is not a replacement for visual review or interaction tests.

For comparable browser timings, test a compiled build or deployed site, disable browser cache, and repeat both rounds. Record the browser, viewport, CPU/network emulation and metric definition. DOMContentLoaded is not LCP, INP or a Lighthouse score. The first photo conversion must still download the local neural model and runtime; those files are not part of initial page navigation and later requests can reuse their browser cache. No claim is made that every device or connection reaches a perfect score.

References: [image loading priority](https://web.dev/articles/optimize-lcp), [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), [Rolldown code splitting](https://rolldown.rs/reference/OutputOptions.codeSplitting).
