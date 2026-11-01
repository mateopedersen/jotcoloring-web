"""Local, image-conditioned color references. No provider API or paid inference.

The model supplies color only. Original ink and the existing brand band are
composited back byte-for-byte. Outputs are candidates, never self-approved.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

VERSION = "image-conditioned-colors-v1"
MODEL_REVISION = "794cd159538149ad9830848508c31f0ea7088e58"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build_prompt(observation, colors=""):
    if not isinstance(observation, str) or not 15 <= len(observation) <= 1600:
        raise ValueError("A source-reviewed description is required")
    if not isinstance(colors, str) or len(colors) > 1800:
        raise ValueError("Invalid reviewed color guidance")
    return (
        "Color this exact black-and-white drawing: " + observation + " "
        "Preserve every original black outline, pose, proportions and all objects. "
        + colors + " "
        "Leave empty background and holes inside objects pure white. Clean vivid "
        "hand-colored illustration with gentle shading. Do not add any new objects, "
        "background scenery or patterns. Do not change the drawing."
    )


def transfer_colors(line, prior, region_colors=()):
    """Region-anchored color transfer. Never publishes the model's new contours."""
    h, w = line.shape[:2]
    prior = cv2.resize(prior, (w, h), interpolation=cv2.INTER_CUBIC)
    # Remove model ink before transfer, including antialiased border remnants.
    dark = np.max(prior, axis=2) < 75
    neutral = np.ptp(prior.astype(np.int16), axis=2) < 24
    mask = (dark & neutral).astype(np.uint8) * 255
    prior = cv2.inpaint(prior, cv2.dilate(mask, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
    prior = cv2.bilateralFilter(prior, 7, 35, 9)
    gray = np.min(line, axis=2)
    barrier = cv2.morphologyEx((gray < 206).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(1 - barrier, connectivity=4)
    if n < 150:
        # Close small contour gaps before identifying surrounding paper; an open
        # paw or hair strand must not be erased along with the background.
        gap = max(3, min(17, round(w / 80) | 1))
        barrier = cv2.morphologyEx((gray < 206).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((gap, gap), np.uint8))
        n, labels, stats, _ = cv2.connectedComponentsWithStats(1 - barrier, connectivity=4)
    layer = prior.copy()
    distance = cv2.distanceTransform(1 - barrier, cv2.DIST_L2, 3)
    coherent = 0
    border_ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        roi = labels[y:y+hh, x:x+ww] == i
        interior = roi & (distance[y:y+hh, x:x+ww] > 1.5)
        if not interior.any():
            interior = roi
        pix = prior[y:y+hh, x:x+ww][interior]
        hsv = cv2.cvtColor(pix.reshape(1, -1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
        bins = np.where(hsv[:, 1] < 35, 18 + hsv[:, 2] // 64, hsv[:, 0] // 10)
        counts = np.bincount(bins, minlength=22)
        mode = counts.argmax()
        if i in border_ids and area > h*w*.12 and n < 150:
            # Sparse line art: the surrounding sheet is paper, not an invitation
            # to invent a landscape. The source segmentation owns this decision.
            layer[y:y+hh, x:x+ww][roi] = 255
            continue
        # A region joined through an open contour can contain sky and clouds.
        # Preserve the image-conditioned variation instead of flooding both.
        if area > h*w*.4 or (area > h*w*.01 and counts[mode]/len(pix) < .6):
            continue
        base = np.median(pix[bins == mode], axis=0)
        light = np.mean(prior[y:y+hh, x:x+ww], axis=2)
        center = np.median(light[interior])
        shade = np.clip((light+60)/(center+60), .88, 1.08)
        colors = np.clip(base[None, None, :]*shade[:, :, None], 0, 255).astype(np.uint8)
        layer[y:y+hh, x:x+ww][roi] = colors[roi]
        coherent += 1
    # Optional, source-bound editorial corrections for a known character/material.
    # A point identifies one enclosed original region, never a bounding rectangle.
    for correction in region_colors:
        xx, yy, color = correction["x"], correction["y"], correction["color"]
        if not (isinstance(xx, (int, float)) and isinstance(yy, (int, float)) and 0 <= xx < 1 and 0 <= yy < 1):
            raise ValueError("Invalid reviewed region point")
        if not isinstance(color, str) or len(color) != 7 or color[0] != "#":
            raise ValueError("Invalid reviewed region color")
        rgb = [int(color[p:p+2], 16) for p in (1, 3, 5)]
        label = labels[int(yy*h), int(xx*w)]
        if not label or label in border_ids or stats[label, 4] > w*h*.35:
            raise ValueError("Reviewed correction must select an enclosed original region")
        layer[labels == label] = rgb
    result = np.round(layer.astype(np.float32)*(gray[:, :, None]/255.)).astype(np.uint8)
    result[gray < 80] = line[gray < 80]
    return result, {"regions": n-1, "coherent_regions": coherent,
                    "original_dark_pixels": int(np.sum(gray < 80)),
                    "changed_dark_pixels": int(np.sum(np.any(result[gray < 80] != line[gray < 80], axis=1)))}


def prepare(job, model, executable, out):
    source = Path(job["input"]).resolve()
    data = source.read_bytes()
    if digest(data) != job["source_sha256"]:
        raise ValueError("Source changed after review: " + str(source))
    if out.exists():
        raise ValueError("Use a new output folder; existing results are immutable")
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    w, h = image.size
    if w*h > 25_000_000 or min(w, h) < 64:
        raise ValueError("Unsupported source dimensions")
    bottom = h - max(8, round(min(w*.055, h*.065))) if job.get("brand_footer") else h
    out.mkdir(parents=True)
    art = image.crop((0, 0, w, bottom))
    # One uniform scale + padding: never stretch the source to fit the model.
    scale = min(768/art.height, 768/art.width)
    aw, ah = round(art.width*scale), round(art.height*scale)
    mw, mh = (aw+15)//16*16, (ah+15)//16*16
    x, y = (mw-aw)//2, (mh-ah)//2
    input_image = Image.new("RGB", (mw, mh), "white")
    input_image.paste(art.resize((aw, ah), Image.Resampling.LANCZOS), (x, y))
    input_image.save(out/"model-input.png")
    prompt = build_prompt(job["observation"], job.get("colors", ""))
    (out/"prompt.txt").write_text(prompt)
    cmd = [str(executable), "--model", str(model), "--base-model", "flux2-klein-4b", "--low-ram",
           "--mlx-cache-limit-gb", "1", "--image-paths", str(out/"model-input.png"),
           "--prompt-file", str(out/"prompt.txt"), "--steps", "4", "--seed", "42",
           "--width", str(mw), "--height", str(mh), "--output", str(out/"color-prior.png"), "--make-conf"]
    env = {**os.environ, "HF_HUB_OFFLINE": "1", "HF_HUB_DISABLE_TELEMETRY": "1"}
    with (out/"inference.log").open("w") as log:
        subprocess.run(cmd, check=True, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600)
    prior = Image.open(out/"color-prior.png").convert("RGB")
    if prior.size != (mw, mh):
        raise ValueError("Unexpected model output dimensions")
    prior = prior.crop((x, y, x+aw, y+ah))
    colored, metrics = transfer_colors(np.array(art), np.array(prior), job.get("region_colors", []))
    result = np.array(image)
    result[:bottom] = colored
    Image.fromarray(result).save(out/"color-reference.webp", lossless=True, method=6)
    output = (out/"color-reference.webp").read_bytes()
    decoded = np.array(Image.open(out/"color-reference.webp").convert("RGB"))
    metrics["footer_unchanged"] = bool(np.array_equal(decoded[bottom:], np.array(image)[bottom:]))
    if metrics["changed_dark_pixels"] or not metrics["footer_unchanged"]:
        raise ValueError("Original ink/footer integrity failed")
    report = {"version": VERSION, "model": "mflux-community/flux2-klein-4b-mflux-q4",
              "model_revision": MODEL_REVISION, "license": "Apache-2.0", "id": job["id"],
              "source_sha256": digest(data), "catalog_source_sha256": job.get("catalog_source_sha256"),
              "reference_sha256": digest(output), "prompt_sha256": digest(prompt.encode()),
              "width": w, "height": h, "art_height": bottom, "bytes": len(output), "metrics": metrics,
              "review_status": "pending_visual_review", "observation": job["observation"],
              "color_guidance": job.get("colors", ""), "references": job.get("references", []),
              "region_colors": job.get("region_colors", [])}
    (out/"report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--executable", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    jobs = json.loads(Path(args.jobs).read_text())
    if not isinstance(jobs, list) or not 1 <= len(jobs) <= 100:
        raise ValueError("Use a bounded batch of 1–100 drawings")
    for job in jobs:
        if not isinstance(job.get("id"), str) or not all(c.isalnum() or c in "-_" for c in job["id"]):
            raise ValueError("Invalid content ID")
        report = prepare(job, Path(args.model).resolve(), Path(args.executable).resolve(), Path(args.output).resolve()/job["id"])
        print(json.dumps({"id": job["id"], "status": report["review_status"], "metrics": report["metrics"]}), flush=True)
