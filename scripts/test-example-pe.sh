#!/bin/bash

#SBATCH --job-name=lingbot-test

#SBATCH --partition=gpu

#SBATCH --gpus=h100-47:1

#SBATCH --mem=32G

#SBATCH --cpus-per-task=4

#SBATCH --time=00:20:00

set -euo pipefail

cd /home/b/brenowy/brennan_work/lingbot-map

export OMP_NUM_THREADS=4 PYTHONUNBUFFERED=1

nvidia-smi -L

.venv/bin/python scripts/verify_reconstruction.py prepare-video --frames example/courthouse --output incoming/smoke.mp4 --count 12 --fps 6

.venv/bin/python demo.py --model_path models/lingbot-map.pt --video_path incoming/smoke.mp4 --fps 6 --first_k 12 --use_sdpa --num_scale_frames 2 --save_predictions outputs/smoke.pt --no_viewer

.venv/bin/python scripts/verify_reconstruction.py verify --result outputs/smoke.pt --expected-frames 12 > outputs/smoke-verification.json

cat outputs/smoke-verification.json

