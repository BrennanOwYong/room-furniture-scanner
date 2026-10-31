#!/bin/bash

#SBATCH --job-name=lingbot-map

#SBATCH --partition=gpu

#SBATCH --gpus=h100-47:1

#SBATCH --mem=32G

#SBATCH --cpus-per-task=4

#SBATCH --time=02:55:00

set -euo pipefail

cd /home/b/brenowy/brennan_work/lingbot-map

export OMP_NUM_THREADS=4

export PYTHONUNBUFFERED=1

if [ "$#" -lt 1 ]; then echo 'Usage: sbatch scripts/run-video-pe.sh incoming/video.mp4 [output-name]'; exit 2; fi

video="$1"

name="${2:-video-$(date +%Y%m%d-%H%M%S)}"

case "$name" in *[!a-zA-Z0-9_-]*|'') echo 'Output name must contain only letters, digits, hyphens or underscores'; exit 2;; esac

.venv/bin/python demo.py --model_path models/lingbot-map.pt --video_path "$video" --fps 5 --mode windowed --window_size 64 --overlap_keyframes 8 --keyframe_interval 2 --use_sdpa --num_scale_frames 2 --camera_num_iterations 4 --save_predictions "outputs/$name.pt" --no_viewer

