"""Export the reviewed official TEED checkpoint; never download or deploy anything.

Use Python with torch==2.15.0 and onnx==1.23.2. Obtain and review the official
xavysp/TEED source at 40fa4b1391dc6424f88989d0ca75d5b592c8681d first.
Pass that source directory, its 7_model.pth checkpoint, and a NEW output path:
  python scripts/photo/export_teed.py /reviewed/TEED /reviewed/7_model.pth /tmp/teed.onnx
Compare the resulting SHA with public/models/photo/README.txt. Changes in the
exporter may change binary serialization; rerun inference tests before replacing.
"""
import argparse
import hashlib
from pathlib import Path
import sys
import types

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('checkpoint', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
expected = 'd0109e7f40e7d9f1f495d34947eb08167e8fbb0a13b4e6ab3121261fb8d5a416'
if hashlib.sha256(args.checkpoint.read_bytes()).hexdigest() != expected:
    raise SystemExit('Checkpoint SHA-256 does not match the reviewed source.')
if args.output.exists():
    raise SystemExit('Choose a new output path; existing files are not overwritten.')

import torch
sys.path.insert(0, str(args.source.resolve()))
# ted.py imports this unused CLI helper. Avoid its unrelated image libraries.
stub = types.ModuleType('utils.img_processing')
stub.count_parameters = lambda model: sum(p.numel() for p in model.parameters())
sys.modules['utils.img_processing'] = stub
from ted import TED


class Edges(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.model = TED()
        self.model.load_state_dict(torch.load(args.checkpoint, map_location='cpu', weights_only=True))

    def forward(self, photo):
        return torch.sigmoid(self.model(photo)[-1])


torch.set_num_threads(4)
model = Edges().eval()
torch.onnx.export(
    model, torch.zeros(1, 3, 512, 512), str(args.output),
    input_names=['photo'], output_names=['edges'],
    dynamic_axes={'photo': {2: 'height', 3: 'width'}, 'edges': {2: 'height', 3: 'width'}},
    opset_version=17, dynamo=False,
)
print(hashlib.sha256(args.output.read_bytes()).hexdigest(), args.output.stat().st_size)
