# Local photo drawing models

The default model is **Informative Drawings**, style 1 (CVPR 2022, Caroline Chan
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
implementation. It is not downloaded by the default drawing path. See its adjacent
MIT license and `docs/local/photo-contours-v2-2026-10-29.md` for provenance.
