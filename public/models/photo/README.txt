JotColoring photo contours 2.0 — model provenance

Model: TEED (Tiny and Efficient Edge Detector), Xavier Soria et al.
Official source: https://github.com/xavysp/TEED
Source revision: 40fa4b1391dc6424f88989d0ca75d5b592c8681d
Checkpoint: checkpoints/BIPED/7/7_model.pth from the official repository
Checkpoint SHA-256: d0109e7f40e7d9f1f495d34947eb08167e8fbb0a13b4e6ab3121261fb8d5a416
License: MIT; copyright and conditions are in LICENSE-TEED.txt.

Export: fused final response followed by sigmoid; ONNX opset 17;
dynamic spatial dimensions, input photo [1,3,H,W], output edges [1,1,H,W].
PyTorch 2.15.0 legacy exporter (dynamo=False), ONNX 1.23.2.
Exported file: teed-biped-7-9f7e3406.onnx
Bytes: 248803
SHA-256: 9f7e3406f561ddd5d25fea1f09c36cb4a4bf4efcbe983a3ed3548788445e8c05
The application verifies this checksum before creating the model session.
Rebuild instructions and script: scripts/photo/export_teed.py in the source repository.

Browser runtime: onnxruntime-web 1.31.1 (MIT; LICENSE-ONNX-RUNTIME.txt).
Runtime WASM and JavaScript are bundled from the pinned package and served
from this site's own origin. No remote inference service receives photos.

Input uses BGR channels and the official [104.007,116.669,122.679] means.
JotColoring adds bounded low-light gain, aspect-preserving resize and padding,
two-scale edge fusion, connected thresholding, stroke thinning and cleanup.
This is outline extraction, not a generative image-redrawing model.
No claim is made that every photograph yields perfect contours or closed regions.
