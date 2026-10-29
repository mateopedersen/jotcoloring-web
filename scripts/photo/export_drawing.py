"""Export the reviewed Informative Drawings model (no downloads or deployment).

Architecture adapted from Caroline Chan's MIT-licensed Informative Drawings,
commit 2349aee4daf7cb01d8de645b0bbb4f4392fd1395. See the distributed license.
Input: RGB 0..1, spatial dimensions divisible by four. Output: white-paper gray.
Use torch 2.15.0 / onnx 1.23.2 and the hash-verified official Space model.pth.
"""
import argparse, hashlib
from pathlib import Path
import torch
from torch import nn

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.conv_block = nn.Sequential(nn.ReflectionPad2d(1), nn.Conv2d(channels, channels, 3), nn.InstanceNorm2d(channels), nn.ReLU(), nn.ReflectionPad2d(1), nn.Conv2d(channels, channels, 3), nn.InstanceNorm2d(channels))
    def forward(self, x): return x + self.conv_block(x)

class Generator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model0 = nn.Sequential(nn.ReflectionPad2d(3), nn.Conv2d(3,64,7), nn.InstanceNorm2d(64), nn.ReLU())
        self.model1 = nn.Sequential(nn.Conv2d(64,128,3,stride=2,padding=1), nn.InstanceNorm2d(128), nn.ReLU(), nn.Conv2d(128,256,3,stride=2,padding=1), nn.InstanceNorm2d(256), nn.ReLU())
        self.model2 = nn.Sequential(*[ResidualBlock(256) for _ in range(3)])
        self.model3 = nn.Sequential(nn.ConvTranspose2d(256,128,3,stride=2,padding=1,output_padding=1), nn.InstanceNorm2d(128), nn.ReLU(), nn.ConvTranspose2d(128,64,3,stride=2,padding=1,output_padding=1), nn.InstanceNorm2d(64), nn.ReLU())
        self.model4 = nn.Sequential(nn.ReflectionPad2d(3), nn.Conv2d(64,1,7), nn.Sigmoid())
    def forward(self, photo): return self.model4(self.model3(self.model2(self.model1(self.model0(photo)))))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('checkpoint',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    if hashlib.sha256(args.checkpoint.read_bytes()).hexdigest()!='c686ced2a666b4850b4bb6ccf0748031c3eda9f822de73a34b8979970d90f0c6': raise SystemExit('Unreviewed checkpoint.')
    if args.output.exists(): raise SystemExit('Choose a new output path.')
    torch.set_num_threads(4);model=Generator().eval();model.load_state_dict(torch.load(args.checkpoint,map_location='cpu',weights_only=True))
    torch.onnx.export(model,torch.zeros(1,3,256,256),str(args.output),input_names=['photo'],output_names=['drawing'],dynamic_axes={'photo':{2:'height',3:'width'},'drawing':{2:'height',3:'width'}},opset_version=17,dynamo=False)
    print(hashlib.sha256(args.output.read_bytes()).hexdigest(),args.output.stat().st_size)
