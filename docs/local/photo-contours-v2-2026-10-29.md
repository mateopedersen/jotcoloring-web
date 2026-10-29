# Photo contours 2.0

The previous direct-gradient converter sometimes dropped eyes, noses and mouth lines while outlining surface texture. The new default extracts contours with the official MIT-licensed TEED model, using local ONNX WASM inference. It does not ask a generative model to redraw a person or scene. The original direct tracer remains an explicit lightweight option.

## Image handling

- The full source is decoded with photograph orientation and retains its aspect ratio. Existing 20 MB / 32 MP input and 2.4 MP / 2400-pixel processing limits remain enforced.
- TEED runs at up to 1024 pixels and, for larger inputs, a second 512-pixel scale. Both preserve aspect ratio, replicate padding only at the right/bottom and use official BGR means. Fine edges are weighted by broader context to reduce texture.
- Underexposed images receive a bounded global gain derived from image percentiles. Flat images are not amplified. This modifies brightness for contour detection without changing positions or synthesizing features.
- Sigmoid predictions are normalized over unpadded pixels. Weak connected contours are retained, isolated specks removed and wide responses thinned while preserving holes. Only short breaks with source evidence are joined. Centerlines are connected when scaled back to output dimensions.
- Suitable existing black line drawings retain their original dark pixels rather than acquiring doubled stroke outlines.
- Enclosed white areas are counted using four-neighbor fill topology. This is a measured property of the output, not an accuracy score or a guarantee that every region is closed. Open areas can be painted with Studio's brush.

## Privacy, runtime and controls

The reviewed model is 248,803 bytes. The first smart conversion also loads approximately 14.8 MB of runtime WASM from the same site. No source photograph is uploaded and there is no paid inference call. Both model and runtime licenses ship with the assets; provenance and SHA-256 are in `public/models/photo/README.txt`. The model hash is checked before inference. `scripts/photo/export_teed.py` rebuilds the export from a separately reviewed official source and checksum-verified checkpoint.

The worker caches the model and edge maps for subsequent settings changes. Cancellation, replacement and reset terminate active work; job identifiers reject stale results. The interface exposes load/progress messages, friendly failure instructions, three presets, line weight, detail, texture smoothing, original/outline comparison and an explicit Direct trace alternative.

PDF, lossless Image (WEBP), PNG, JPG, vector-path SVG and DOCX downloads keep the existing same-page download flow. The strict PDF limit is 1,000,000 bytes. Studio receives the converted outline as a new private local project; existing projects are not overwritten.

## Validation

The complete automated suite passes 201 tests; the seven operations tests also pass. Type checking reports zero errors and zero warnings, with one existing Studio deprecation hint. Production and background-job builds pass.

Nine automated contour tests cover model checksum and real WASM inference, aspect ratio, BGR/alpha/padding, bounded exposure correction, invalid/flat output, topology-preserving thinning, source-supported gaps, linework preservation, connected scaling and an actual Studio flood-fill boundary. Fourteen existing photo tests cover validation, geometry and all six output formats, including exact PNG/WEBP pixels, SVG raster parity, DOCX packaging and a full-size high-entropy PDF below the limit.

Manual image review compares original, old and new output for a portrait, a grayscale person with equipment, two cat photographs, a coffee cup, an outdoor rocket scene, a darkened portrait, a rotated portrait and a 1536-pixel portrait variant. These are nine test inputs, not nine independent subjects. Public test photographs came from the official scikit-image v0.24.0 sample collection; they remain private QA evidence and are not published as JotColoring catalog artwork.

Actual local browser checks confirmed a 512×512 portrait conversion, original-aligned comparison, PDF and WEBP downloads, and a Studio fill that colored the hair without coloring the face or background. A 1536×1536 conversion completed in about 1.2 seconds on the test machine; cached preset updates took about 0.2–0.4 seconds. These are individual desktop observations, not mobile performance guarantees. Cancellation left downloads disabled, retry succeeded, and switching Direct trace back to Smart contours succeeded.

Responsive browser checks at 320, 390, 768 and 1440 CSS pixels found no horizontal page overflow and equal dimensions for all six format controls. These are emulated viewport checks, not physical-device tests.

Known limits: contour extraction still approximates photographic boundaries; shadows, fine texture, blur and hidden features can cause omissions or unwanted edges. No universal success percentage is asserted. Physical-device mobile performance, every possible input photograph and every external editing app are not exhaustively tested.

Primary references: [official TEED code and license](https://github.com/xavysp/TEED), [ICCV workshop paper](https://openaccess.thecvf.com/content/ICCV2023W/RCV/papers/Soria_Tiny_and_Efficient_Model_for_the_Edge_Detection_Generalization_ICCVW_2023_paper.pdf), [ONNX browser deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html), [scikit-image sample provenance](https://scikit-image.org/docs/stable/api/skimage.data.html).

Local comparison panels, logs and browser screenshots are in ignored `.local/photo-v2/`. Release workflow and live checks are recorded in the associated pull requests.
