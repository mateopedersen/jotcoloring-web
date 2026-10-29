# Photo conversion, shared controls and SVG refresh — local delivery

This work remains local at http://localhost:4322/. No deployment, Git push, plan change, R2 mutation or paid AI request was made.

## Photo to Coloring Page

The photo route now has its own converter instead of sending the reference to a generative image model. The earlier path reduced the reference to 480 pixels and asked the model to redraw it; it could change subjects, pose and composition. Existing private AI result endpoints remain available, and old photo job links offer a link to their earlier result.

`jot-photo-contours-1.1` processes actual decoded pixels in a browser worker. It applies monotonic shadow normalization, symmetric smoothing, edge-preserving bilateral filtering, RGB-channel gradients, non-maximum suppression, connected-edge hysteresis, small-component cleanup and optional one-pixel gap joining. Fine/Medium/Bold controls adjust the traced stroke coverage. The drawing is never cropped or geometrically warped, and no objects are synthesized. The source is not uploaded to an AI service.

The output is **an outline conversion**, not a claim that every color, shadow or hidden detail survives. Blur, very dark areas and texture can make visible contours ambiguous. Detail and smoothing controls, three presets and a comparison against the original help the user choose the result. It cannot recover information absent from the photograph. These limits are explained on the page.

### Input and interaction

- Still JPEG, PNG and WEBP, with actual signature/MIME and dimension validation before decoding; 20,000,000-byte / 32-megapixel input limits.
- Processing is bounded at 2.4 megapixels and a 2,400-pixel longest side. The complete scene and its aspect ratio are preserved. Very extreme aspect ratios are rejected instead of stretched.
- Browser decoding applies photograph orientation. An actual EXIF orientation-6 JPEG was tested: a 320×200 encoded image appeared as 200×320 in the converter.
- Upload/replace, drag-and-drop, presets, detail, smoothing, stroke weight, gap joining, cancellation, reset and original/outline/comparison views are implemented. New jobs cancel older workers and stale results cannot re-enable a download.
- Nothing is stored as a project until Color in Studio is chosen. Studio receives an uncolored PNG source on this device; the original photo is not sent to the server or stored in the project.

### Downloads

All six choices open the existing same-page download window. True extensions, MIME, bytes and signatures are retained. Files are prepared on demand; displayed sizes update after preparation.

| Choice | Output |
| --- | --- |
| PDF | A4 portrait/landscape as appropriate; one-bit, lossless drawing plus a separate colored credit overlay; strict 1,000,000-byte cap |
| Image | Lossless WEBP, encoded with the existing Photon 0.4.0 WASM codec; decoded pixels match PNG |
| PNG | Lossless, opaque white-background outline |
| JPG | High-quality JPEG for common image apps |
| SVG | Genuine vector paths representing the outline mask; the small brand credit alone is an embedded PNG |
| Word | Genuine DOCX package with the coloring PNG embedded, correct relationships, A4 layout and modern compatibility settings |

The JotColoring logo is placed in an **appended** white band below the drawing. It covers no source drawing pixels. SVG is not a photograph merely wrapped in an SVG file. DOCX contains an image and does not promise editable vector objects in Word.

The 1,566,855-byte lossless encoder is fetched from the site's own `/codecs/` asset only when Image is requested. Its Apache-2.0 license and package version/checksum are included beside it. There is no external inference call. Standard PNG/PDF/SVG/JPG/DOCX exports do not require this codec download.

## Shared arrows and equal controls

The reported duplicate arrow came from a native SVG plus a legacy CSS `::after` mask. The previous geometry audit checked SVG bounds and missed the second CSS-drawn arrow. That generating rule was removed. Shared support actions use one native SVG each, with a bounded viewBox and dedicated arrow cell.

Resource navigation uses five equal desktop tracks, with fixed icon/text/arrow columns. At smaller widths it becomes an equal-width, clipped horizontal rail; the current section is brought into view without scrolling the page vertically. Related action groups stretch to equal tracks. Photo format and download grids use equal row sizing, so longer descriptions cannot create taller individual cards.

An actual browser audit covered the 11 information pages at 320/390/768/1024/1440 pixels: 55 views, equal resource-button widths and heights, no page overflow, no duplicate generated arrows and no arrow outside its frame. The 15 photo view-mode/viewport combinations also showed no page overflow, unequal format controls or escaped arrows. These are targeted checks, not a claim that every possible browser/zoom/state has been verified.

## New SVG family

The 15-symbol `creative-tools-v2.svg` family is original native vector work with shared paper, wood, metal, enamel and paint shading. It covers coloring sheets, animals, flowers, mandalas, children's crayons, Studio, photo-to-outline, AI creation, saved artwork, printer, license, About, help, FAQ and contact.

Semantic corrections include crayons rather than a tree for children, a printer rather than a PDF file for the printing guide, an artwork portfolio for My Artwork, separate About/help/FAQ illustrations and matching photo/outline sheets for photo conversion. Header, footer and relevant category components share these assets. Functional favorite-toggle state is preserved. The logo and collection image files were not replaced.

All 15 drawings were rendered in a contact sheet and visually inspected; actual header/footer rendering was checked in the local browser. The icons are shaded vector illustrations, not photographs.

## Verification and evidence

- Automated suite: **162 passing tests**, including 14 photo tests. Coverage includes subject-coordinate preservation, translation invariance, equal-brightness color boundaries, invalid files, memory limits, exact PNG/WEBP pixels, SVG raster parity, real DOCX packaging, input checks and a maximum-size high-entropy PDF below the cap.
- Six actual files were downloaded through the browser, not only generated by a test helper. Paths and sizes are recorded with the local browser evidence.
- The downloaded DOCX opened in Microsoft Word without a repair dialog or Compatibility Mode; Page 1 of 1 and a complete drawing with the credit were visually checked. Word's view zoom was adjusted for this inspection; no source artwork was edited.
- A generated PDF was independently rendered with Poppler and visually inspected for a complete drawing and separate credit.
- Final shared-layout audit: 16 routes at 320/390/768/1024/1440 pixels, **80 views**, with zero horizontal page overflow, duplicate IDs or duplicate arrows. The resource-control audit above checks dimensions and arrow frames separately. Results are saved in `final-site-layout.json`.
- The converted local QA drawing was opened in Studio as a new project (`a071bf4a-6265-45c7-bbf8-55e0aa4c035b`), with its 1024×768 source intact. No existing artwork was replaced. An actual Studio screenshot is saved as `photo-opened-in-studio.png`.
- No live deployment or production AI transaction was exercised. Physical printing, all mobile devices, every photo subject and every office/vector application were not tested.

Evidence is under `outputs/photo-converter/`: test/check/build logs, `export-results.json`, generated test files, `pdf-rendered.png`, `word-final.png`, `six-format-downloads.png`, `conversion-browser-final.png`, `equal-resource-buttons.png`, `footer-creative-icons.png` and the vector contact sheet.

The photo preparation test image is a pre-existing local QA photograph. It is not included as an example on the public product page. Existing user artwork was not overwritten or deleted.
