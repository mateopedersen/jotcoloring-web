# Shared artwork delivery

Public artwork stays in the existing R2 bucket and on its existing immutable asset URLs. Downloads, original files, checksums, review approvals and publication gates are unchanged.

Use `ArtworkImage.astro` for display images. Gallery and age pages prioritize one preload and eagerly request at most the first four images. Remaining cards, including cursor fragments, retain native lazy loading. Explicit responsive sizes accompany `auto` for browsers that need the fallback. A preload and its image must use the same srcset and sizes.

Collection covers use checksum-bound curated color variants or the current accepted thumbnail variants. Never turn a source filename into a new rendition URL or send an entire print original to a small cover. Missing responsive sources retain the common one-time original fallback.

The catalog continues through bounded signed batches on the same page. While the reader is at the top, an offscreen next batch must not compete with the initial images. Scrolling still loads ahead, without numbered pagination or a mandatory Show More control.

The shared layout preconnects only to the configured public JotColoring media host. No image transformation service, new R2 objects, paid inference or new cache rules are required.

Verification: image-policy, source-binding, media fallback and download integrity tests; Astro check/build and bundle budgets; Chromium and WebKit on mobile and desktop; actual public rendition responses and scroll/download interactions after deployment.
