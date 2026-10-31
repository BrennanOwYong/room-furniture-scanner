"""Check real LingBot-Map results or prepare a short video from example frames.

References checked 2026-10-30:
https://docs.pytorch.org/docs/2.8/generated/torch.load.html
https://docs.opencv.org/4.x/dd/d9e/classcv_1_1VideoWriter.html
https://github.com/robbyant/lingbot-map/blob/main/demo.py
"""
import argparse
import json
from pathlib import Path


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def prepare_video(args):
    import cv2

    source = Path(args.frames)
    paths = sorted(p for p in source.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})[:args.count]
    require(len(paths) == args.count, f"Need {args.count} source frames; found {len(paths)}")
    first = cv2.imread(str(paths[0]))
    require(first is not None, f"Cannot read {paths[0]}")
    height, width = first.shape[:2]
    width, height = width // 2 * 2, height // 2 * 2
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(output), cv2.VideoWriter_fourcc(*"mp4v"), args.fps, (width, height))
    require(writer.isOpened(), "Video encoder did not open")
    try:
        for path in paths:
            frame = cv2.imread(str(path))
            require(frame is not None, f"Cannot read {path}")
            writer.write(cv2.resize(frame, (width, height)))
    finally:
        writer.release()
    capture = cv2.VideoCapture(str(output))
    decoded = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            require(frame.shape[:2] == (height, width), "Decoded dimensions changed")
            decoded += 1
    finally:
        capture.release()
    require(decoded == args.count, f"Decoded {decoded} frames, expected {args.count}")
    print(json.dumps({"status": "PASS", "video": str(output), "frames": decoded, "fps": args.fps, "bytes": output.stat().st_size}))


def verify(args):
    import torch

    path = Path(args.result)
    require(path.is_file() and path.stat().st_size > 0, "Saved result is missing or empty")
    payload = torch.load(path, map_location="cpu", weights_only=True)
    require(isinstance(payload, dict), "Saved result must be a dictionary")
    predictions = payload.get("predictions", payload)
    images = payload.get("images", predictions.get("images"))
    require(isinstance(images, torch.Tensor), "Saved input images are missing")
    if images.ndim == 5 and images.shape[0] == 1:
        images = images[0]
    require(images.ndim == 4 and images.shape[1] == 3, f"Unexpected images shape: {tuple(images.shape)}")
    frames, _, height, width = images.shape
    require(frames == args.expected_frames, f"Got {frames} frames, expected {args.expected_frames}")
    require(torch.isfinite(images).all().item(), "Input images contain non-finite values")
    required = {"depth": 4, "depth_conf": 3, "extrinsic": 3, "intrinsic": 3}
    for key, dimensions in {"world_points": 4, "world_points_conf": 3}.items():
        if predictions.get(key) is not None:
            required[key] = dimensions
    tensors = {}
    report = {"status": "PASS", "result": str(path), "bytes": path.stat().st_size, "frames": frames, "arrays": {}}
    for key, dimensions in required.items():
        value = predictions.get(key)
        require(isinstance(value, torch.Tensor), f"Missing tensor {key}")
        if value.ndim == dimensions + 1 and value.shape[0] == 1:
            value = value[0]
        require(value.ndim == dimensions, f"Unexpected {key} dimensions: {tuple(value.shape)}")
        require(value.shape[0] == frames and value.numel() > 0, f"Invalid {key} frame count or empty array")
        require(torch.isfinite(value).all().item(), f"{key} contains non-finite values")
        tensors[key] = value.float()
        report["arrays"][key] = {"shape": list(value.shape), "min": float(value.min()), "max": float(value.max())}
    require(tensors["depth"].shape == (frames, height, width, 1), "Depth dimensions do not match images")
    require(tensors["depth_conf"].shape == (frames, height, width), "Depth confidence dimensions mismatch")
    if "world_points_conf" in tensors:
        require(tensors["world_points_conf"].shape == (frames, height, width), "Point confidence dimensions mismatch")
    require((tensors["depth"] > 0).all().item(), "Depth must be positive")
    require(tensors["extrinsic"].shape == (frames, 3, 4), "Unexpected camera transform shape")
    require(tensors["intrinsic"].shape == (frames, 3, 3), "Unexpected camera calibration shape")
    require((tensors["intrinsic"][:, [0, 1], [0, 1]] > 0).all().item(), "Camera focal lengths must be positive")
    rotation = tensors["extrinsic"][:, :3, :3]
    require(torch.allclose(rotation @ rotation.transpose(-1, -2), torch.eye(3).expand(frames, 3, 3), atol=0.02, rtol=0.02), "Camera rotations are not orthonormal")
    require(torch.allclose(torch.linalg.det(rotation), torch.ones(frames), atol=0.02, rtol=0.02), "Camera rotation determinant is not one")
    if "world_points" in tensors:
        points = tensors["world_points"]
        require(points.shape == (frames, height, width, 3), "Point dimensions do not match images")
        report["point_source"] = "direct model output"
    else:
        # Reconstruct world coordinates from the predicted depth and camera calibration.
        yy, xx = torch.meshgrid(torch.arange(height), torch.arange(width), indexing="ij")
        pixels = torch.stack((xx, yy, torch.ones_like(xx)), dim=-1).float()
        rays = torch.einsum("fij,hwj->fhwi", torch.linalg.inv(tensors["intrinsic"]), pixels)
        camera_points = rays * tensors["depth"]
        translation = tensors["extrinsic"][:, :3, 3]
        points = torch.einsum("fji,fhwj->fhwi", rotation, camera_points - translation[:, None, None, :])
        report["point_source"] = "predicted depth and camera calibration"
    require(torch.isfinite(points).all().item(), "Derived world points contain non-finite values")
    require(points.std().item() > 1e-6, "Point cloud is degenerate")
    report["world_point_count"] = frames * height * width
    report["world_points_range"] = {"min": float(points.min()), "max": float(points.max())}
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    video = commands.add_parser("prepare-video")
    video.add_argument("--frames", required=True)
    video.add_argument("--output", required=True)
    video.add_argument("--count", type=int, default=12)
    video.add_argument("--fps", type=int, default=6)
    check = commands.add_parser("verify")
    check.add_argument("--result", required=True)
    check.add_argument("--expected-frames", type=int, required=True)
    options = parser.parse_args()
    (prepare_video if options.command == "prepare-video" else verify)(options)
