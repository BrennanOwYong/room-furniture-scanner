# Room furniture scanner

A research prototype for turning phone captures into an inspectable room with selectable furniture and evidence-backed dimensions. Homeowners capture the room; interior designers use it to help choose replacements.

Start with the [problem statement](PROBLEM-STATEMENT.md). This is code and experiment documentation, not a finished mobile app.

## Current state

- LingBot-Map produces estimated depth and cameras from video.
- Additions to `demo.py` save predictions and allow processing without an interactive viewer.
- `scripts/view-saved.py` opens a saved reconstruction with the upstream viewer.
- `scripts/fit_gaussians.py` fits actual Gaussian splats to a saved test reconstruction.
- Processing and Gaussian rendering checks passed on an H100. Visual reconstruction quality remains inadequate for furniture purchasing decisions.
- Object recognition, selectable furniture, reliable real-world dimensions, and shape completion are not implemented.

Private recordings, model weights, generated geometry, and logs are excluded. Large upstream example datasets and binary assets are not bundled in this source snapshot.

## Setup

Use Linux with an NVIDIA graphics processing unit (GPU) for the tested setup. Create a Python 3.10 environment and install the documented PyTorch versions before the project dependencies:

```sh
python3.10 -m venv .venv
. .venv/bin/activate
pip install torch==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cu128
pip install -e '.[vis]'
mkdir -p models incoming outputs logs
```

Download `lingbot-map.pt` from the [official model repository](https://huggingface.co/robbyant/lingbot-map/tree/main) into `models/`. Put your own video in `incoming/`.

```sh
python demo.py --model_path models/lingbot-map.pt \
  --video_path incoming/video.mp4 --fps 5 \
  --use_sdpa --save_predictions outputs/video.pt --no_viewer

python scripts/view-saved.py outputs/video.pt --port 8080
```

These are initial processing settings, not established best-quality settings. The upstream demo crops portrait footage to a square. The viewer opens on port 8080 on the machine running it; remote access requires separate connection setup.

## Gaussian experiment

The fixed-input experiment expects `outputs/brennan-video.pt`, the filename used in the original test. Change that input explicitly before using another result.

```sh
pip install gsplat==1.5.3 ninja==1.13.2
python scripts/fit_gaussians.py
```

Compilation needs a compatible CUDA toolkit, the NVIDIA software used to compile and run GPU code, and a C++ compiler. Ensure the active environment's executable directory and the CUDA compiler are on the command search path.

The experiment keeps camera estimates fixed and does not adapt the number of Gaussians during fitting. It has no object recognition, measurement calibration, or completion. Evaluation withholds image colours from fitting, but the starting geometry was estimated from the whole video. Its image metrics are not an independent reconstruction benchmark.

## Working together

1. Review the problem statement and current limitations.
2. Establish repeatable room captures with known reference dimensions.
3. Compare reconstruction approaches before choosing the geometry foundation.
4. Demonstrate one selectable table before adding completion and shopping recommendations.

The `scripts/*-pe.sh` batch scripts and `PE-SETUP.md` record the university experiment and contain machine-specific assumptions. Adapt them before using another machine. Production hosting and processing permissions must be arranged separately from the university test allocation.

## Source and attribution

Based on [Robbyant LingBot-Map](https://github.com/robbyant/lingbot-map), upstream commit `b9dd1b1de535e6d36e777fb42b8433c781bfd783`. Original copyright and attribution are preserved in the source, [LICENSE.txt](LICENSE.txt), and [CITATION.cff](CITATION.cff). The [upstream README](README.upstream.md) retains the original documentation; its example assets are not bundled here.

This private repository is a source snapshot with additional experiment scripts and documentation. It is not an official Robbyant release and does not preserve upstream Git history. Source licence obligations continue to apply.

## References

- [Official source and setup](https://github.com/robbyant/lingbot-map)
- [Official model download](https://huggingface.co/robbyant/lingbot-map/tree/main)
- [Gaussian rendering](https://docs.gsplat.studio/main/apis/rasterization.html)
- [Object scene research notes](OBJECT-SCENE-RESEARCH.md)
