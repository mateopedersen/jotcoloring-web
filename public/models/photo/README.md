# Local photo drawing models

The drawing network is **Informative Drawings**, style 1 (CVPR 2022, Caroline Chan
and coauthors), MIT license. Official code:
https://github.com/carolineec/informative-drawings/tree/2349aee4daf7cb01d8de645b0bbb4f4392fd1395
Official weights: https://huggingface.co/spaces/carolineec/informativedrawings
(`model.pth`, style 1; see the upstream app's checkpoint mapping).

Source checkpoint SHA-256:
`c686ced2a666b4850b4bb6ccf0748031c3eda9f822de73a34b8979970d90f0c6`

Exported ONNX: `informative-drawing-544fb9a4.onnx`, 17,217,777 bytes,
SHA-256 `544fb9a41348734fb3c83dd1decf7548b981c4127b986b151ea2ec79c63ed988`.
Reproduce with `scripts/photo/export_drawing.py` and the verified checkpoint.
The MIT copyright/permission notice is adjacent to the model. The browser checks
both its size and checksum before inference. Artwork is never sent to this model's
publisher. Inference, edge-aware smoothing, tonal cleanup and photo-guided region
closure run in a local Worker. No paid API is used.

This is an image-to-drawing network, not a pixel-identical transformation. It can
simplify details; source composition, dimensions and proportions are preserved.
Paintable-boundary cleanup uses existing lines and source color contrast. It does
not recognize semantic parts such as ears or eyes. Keep the comparison control
and lightweight direct trace alternative available.

The earlier TEED asset remains for reproducibility of the previous contour
implementation. Its GPU derivative is downloaded only if the compact drawing path cannot run. See its adjacent
MIT license and `docs/local/photo-contours-v2-2026-10-29.md` for provenance.

November 3 browser update: the default uses the compact GPU transport described
in `drawing-webgl.json` (8,424,317 bytes), without the WASM download. The fixed
512 grid uses uniform resizing and replicated padding, then discards padding.
`scripts/photo/prepare-drawing-webgl.mjs` reproduces shape constant folding,
eight-bit mantissa rounding and gzip transport from the source above. The
application verifies both compressed and decoded SHA-256 before inference.
Two browser-specific failures are avoided without retraining: two-pass instance
normalization uses hierarchical averages instead of long GPU loops, and the
final convolution sums independent channel contributions instead of allocating
an oversized im2col texture. The opset-12 graph is checked against the source
network. Invalid, empty or excessively dense results trigger another local
processor instead of being reported as successful drawings.
This is a compressed derivative, not a newly trained model or an exact copy of
the original weights. On eight recorded comparison photos its mean absolute
output difference was below 0.00005; this is not a general similarity guarantee.

The compact TEED derivative `teed-webgl-390ad3ec.onnx` is a 248,700-byte GPU
fallback. Its two constant-axis operators use opset 12; weights are unchanged.
`scripts/photo/prepare-teed-webgl.mjs` reproduces it from the verified earlier
TEED export. GPU-unavailable browsers retain a bounded source-coordinate CPU
fallback, and processing has a cancel/timeout path. Results still depend on the
source photo. Cropping, regeneration, remote inference and paid APIs are absent.
