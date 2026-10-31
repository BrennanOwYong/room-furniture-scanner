
"""View a saved PE result. Reference: ../demo.py at b9dd1b1 (2026-10-30)."""

import argparse

import sys

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import torch

from demo import prepare_for_visualization

from lingbot_map.vis import PointCloudViewer

parser = argparse.ArgumentParser()

parser.add_argument('result')

parser.add_argument('--port', type=int, default=8080)

args = parser.parse_args()

data = torch.load(args.result, map_location='cpu', weights_only=True)

viewer = PointCloudViewer(pred_dict=prepare_for_visualization(data['predictions'], data['images']), port=args.port, downsample_factor=10)

viewer.run()

