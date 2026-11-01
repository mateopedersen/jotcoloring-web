# Native coloring outlines and Studio fill boundaries

Full-size printable WebP files retain the normalized grayscale artwork at its native pixel dimensions. The protected JotColoring footer is added in a larger canvas whose artwork box exactly matches those dimensions. Encode this boundary source losslessly, decode it, and compare the complete artwork bytes with the normalized source. Never shrink the drawing into the footer and then enlarge it again for Studio.

Studio removes a known footer with nearest-neighbor coverage so thin closed contours do not disappear through smoothing. Painting never changes the immutable outline; intentional dark pupils, noses, and character markings remain intact. PDF files keep their separately validated native grayscale image and footer.

Age-analysis trimming uses Sharp's line-art mode so a one-pixel outline is not removed as photographic noise. Analysis input has its own revision in the assessment/cache key; an input change must not reuse an older cached result. Existing accepted assessments remain immutable historical records.

A source-bound whole-batch review checks archive/PDF/WebP integrity, actual artwork, twice-reviewed copy, source identity, categories, and final output. For native export replacements, invalidate the former output approval, retain its history, verify exact native grayscale pixel equality and all asset checksums, and rerun the actual Studio fill algorithm against source-bound enclosed-region seeds. These component checks do not establish the semantics of unseen artwork or assert that every decorative stroke forms a closed shape.

Preserve IDs, URLs, supplied originals and unrelated imports. A seal may be superseded only before production dispatch, with the superseded seal and prior review evidence retained. Any already published or dispatched record uses the normal versioned revision path. Complete the authorized batch and its R2/backup/search checks before calling it verified live.
