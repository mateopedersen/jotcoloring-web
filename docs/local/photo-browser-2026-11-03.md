# Photo drawing browser update, November 3

The default photo route automatically processes a valid selection and retains an
idle worker between photos. It uses the existing MIT Informative Drawings style
1 network with a verified 8,424,317-byte compressed transport, instead of loading
the original 17 MB model and WASM runtime on the default path. No uploaded photo
is sent to a server. The source model and license remain in the repository.

`scripts/photo/prepare-drawing-webgl.mjs` fixes the analysis graph at 512 pixels,
folds shape-only operations, rounds initializer mantissas to eight bits and emits
checksums. Uniform image scaling plus replicated edge padding preserves framing;
padding is removed from the output. This derivative is not a newly trained model.

Browser regression investigation found incorrect output from the GPU execution
path on square portraits. The derivative uses two-pass hierarchical mean and
variance and expresses the last convolution as independent channel contributions
followed by their sum and bias. This avoids long fragment-shader normalization
loops and a large final convolution intermediate. A near-black or empty result
is rejected instead of being presented as a successful coloring sheet.

Eight real source photographs from the upstream Informative Drawings examples
and scikit-image test dataset were compared with the source ONNX network at the
same resolution and input settings. The maximum mean absolute output difference
was below 0.00003 on these eight fixtures. This measures numerical agreement with
the source model, not a universal image similarity score.

Chrome desktop and mobile-sized browser checks exercised all eight photographs.
The default GPU drawing path succeeded in all 16 conversions without falling
back; actual PDF downloads in both sizes stayed below 1 MB. A separate blocked
model-download case verified the bounded local fallback. Test artifacts are kept
in the operator task's private outputs/photo-fast-20261103 directory.

On GPU failure, the already licensed compact TEED derivative provides a contour
alternative. A no-download CPU method is the final fallback. Timeouts and cancel
prevent an unending loading screen. Refined drawing remains an explicit optional
slower method. No paid inference is enabled.

The network can simplify or miss fine details. Region counts are measured closed
spaces, not semantic object recognition or a guarantee that every object is one
fillable part. Compare original, outline settings, local fill testing, correction
and Studio remain available. Physical iPhone/Safari coverage must be reported
separately from Chrome viewport emulation. Neither perfect fidelity on arbitrary
photos nor a device-independent processing time is promised.
