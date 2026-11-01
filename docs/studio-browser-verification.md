# Studio browser checks

After changing painting, replay, or export code, run the normal typecheck and
tests, then `node scripts/qa/studio-taps.mjs` with an existing Playwright setup.
`PLAYWRIGHT_MODULE` can point to its installed module; optional
`JOT_CHROMIUM_EXECUTABLE` and `JOT_WEBKIT_EXECUTABLE` select existing browser
binaries. `JOT_QA_REPORT` saves the result and painting-source checksum.

Both engines are required. The check compiles the actual painting module, renders
six brush/eraser tap cases, and compares the press footprint with the completed
stroke pixel by pixel. A repeated pointer-up coordinate must retain the mark.
The helper does not download browsers or treat a missing engine as a passing test.

A non-browser canvas implementation can render a zero-length round stroke
differently from a browser. Passing only server-side raster checks is insufficient
for this regression. Also test an actual mouse stroke and touch tap through the
Studio UI, undo/redo, local save/reload, and actual downloads. Verify PNG, embedded
image SVG, JPG, JPEG, Word DOCX, PDF and WEBP bytes; the PDF limit remains
1,000,000 bytes. An SVG image wrapper is not editable vector paths.

Check mobile touch, tablet and desktop layouts, including the narrow and
intermediate gallery breakpoints. Hover descriptions must stay out of touch,
scrolling and slider gestures while keyboard image-link explanations and Escape
dismissal remain available. These checks do not establish perfect results on
every physical device; record the engines, dimensions and tested interactions.

Run `node scripts/qa/studio-exports.mjs` with the same browser variables after
export changes. It checks all seven real formats in both engines, decodes the
WEBP paint pixels, and verifies that the existing local codec is requested only
when native canvas WEBP encoding is unavailable. Preview images keep their
lightweight PNG fallback. The temporary server exposes only the test bundle and
committed codec, never the project directory or private files.
