#!/usr/bin/env python3
"""
postprocess-long-bg.py — composite stage LONG panoramic + pixel-art processing.

For each stage, takes 3 horizontal segments (a/b/c), composites them into one
very wide panoramic (4032x576 raw), then runs the pixel-art pipeline
(quantize -> 4x downsample -> 2x upscale) producing final 2688x384 or similar.

But for a TRUE "rail scroller" effect, we composite AFTER pixel-art:
  - per segment: 2688x1152 final (per-post-processed)
  - 3 segments side-by-side: 8064x1152 final (7:1 panoramic)
This keeps each segment crisp at its own local resolution, then stitches.

Outputs:
  - assets/backgrounds/long-bg-composites/long-stage{N}-{name}.png (8064x1152)
  - assets/backgrounds/long-bg-composites/long-stage{N}-{name}.raw.png (4032x576, soft)
"""

import argparse
import sys
from pathlib import Path

from PIL import Image

SRC_DIR = Path("assets/backgrounds/long-bg")
DST_DIR = Path("assets/backgrounds/long-bg-composites")

PALETTE_COLORS = 32
DOWNSAMPLE_FACTOR = 4
FINAL_UPSCALE = 2

# Per-stage downsample overrides (Stage 2 = La Hoz needs more detail preserved)
DOWNSAMPLE_OVERRIDES = {2: 2}

# Final picks per stage: (seg-a, seg-b, seg-c) variants
PICKS = {
    1: ("s1-seg-a-iterA-v3",  "s1-seg-b-iterA-v2",  "s1-seg-c-iterA-v2"),
    2: ("s2-seg-a-iterA-v3",  "s2-seg-b-iterA-v2",  "s2-seg-c-iterA-v2"),
    3: ("s3-seg-a-iterA-v3",  "s3-seg-b-iterA-v3",  "s3-seg-c-iterA-v3"),
    4: ("s4-seg-a-iterA-v1",  "s4-seg-b-iterA-v2",  "s4-seg-c-iterA-v2"),
    5: ("s5-seg-a-iterA-v2",  "s5-seg-b-iterA-v2",  "s5-seg-c-iterA-v2"),
}

STAGE_NAMES = {
    1: "lashoyas",  2: "lahoz",  3: "lahunde",  4: "ayora",  5: "acuifero",
}


def enforce_pixel_grid(img: Image.Image, downsample_factor: int = DOWNSAMPLE_FACTOR) -> Image.Image:
    """Quantize → downsample LANCZOS → upscale NEAREST (chunky pixel art)."""
    quantized = img.quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    w, h = quantized.size
    target = (max(1, w // downsample_factor), max(1, h // downsample_factor))
    lowres = quantized.resize(target, Image.LANCZOS)
    chunky = lowres.resize((w, h), Image.NEAREST)
    return chunky


def composite_long_panoramic(stage_num: int) -> int:
    a_name, b_name, c_name = PICKS[stage_num]
    a_path = SRC_DIR / f"{a_name}.jpeg"
    b_path = SRC_DIR / f"{b_name}.jpeg"
    c_path = SRC_DIR / f"{c_name}.jpeg"
    for p in (a_path, b_path, c_path):
        if not p.exists():
            print(f"FAIL  {p} missing")
            return 1

    DST_DIR.mkdir(parents=True, exist_ok=True)
    stage_name = STAGE_NAMES[stage_num]
    out_path = DST_DIR / f"long-stage{stage_num}-{stage_name}.png"
    raw_path = DST_DIR / f"long-stage{stage_num}-{stage_name}.raw.png"

    ds = DOWNSAMPLE_OVERRIDES.get(stage_num, DOWNSAMPLE_FACTOR)

    # Load segments
    a = Image.open(a_path).convert("RGB")
    b = Image.open(b_path).convert("RGB")
    c = Image.open(c_path).convert("RGB")
    # Resize to consistent 1344x576 (they already are, but enforce)
    seg_size = (1344, 576)
    a = a.resize(seg_size)
    b = b.resize(seg_size)
    c = c.resize(seg_size)

    # Step 1: raw composite (no pixel processing) — used as reference for catalog preview
    raw_w = seg_size[0] * 3  # 4032
    raw_h = seg_size[1]      # 576
    raw_composite = Image.new("RGB", (raw_w, raw_h), (0, 0, 0))
    raw_composite.paste(a, (0, 0))
    raw_composite.paste(b, (seg_size[0], 0))
    raw_composite.paste(c, (seg_size[0] * 2, 0))
    raw_composite.save(raw_path, "PNG", optimize=True)
    kb_raw = raw_path.stat().st_size // 1024
    print(f"RAW   {raw_path.name}  {raw_w}x{raw_h}  ({kb_raw} KB)")

    # Step 2: pixel-art EACH segment first (so each retains local detail) then composite
    a_pixel = enforce_pixel_grid(a, downsample_factor=ds)
    b_pixel = enforce_pixel_grid(b, downsample_factor=ds)
    c_pixel = enforce_pixel_grid(c, downsample_factor=ds)
    # Final scale to 2688x1152 each
    a_final = a_pixel.resize((a_pixel.width * FINAL_UPSCALE, a_pixel.height * FINAL_UPSCALE), Image.NEAREST)
    b_final = b_pixel.resize((b_pixel.width * FINAL_UPSCALE, b_pixel.height * FINAL_UPSCALE), Image.NEAREST)
    c_final = c_pixel.resize((c_pixel.width * FINAL_UPSCALE, c_pixel.height * FINAL_UPSCALE), Image.NEAREST)
    seg_final_size = a_final.size

    final_w = seg_final_size[0] * 3  # 8064
    final_h = seg_final_size[1]      # 1152
    final = Image.new("RGB", (final_w, final_h), (0, 0, 0))
    final.paste(a_final, (0, 0))
    final.paste(b_final, (seg_final_size[0], 0))
    final.paste(c_final, (seg_final_size[0] * 2, 0))
    final.save(out_path, "PNG", optimize=True)
    kb = out_path.stat().st_size // 1024
    print(f"DEF   {out_path.name}  {final_w}x{final_h}  ({kb} KB)  [3 segments × {seg_final_size[0]}x{seg_final_size[1]} px32/ds{ds}]")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", type=int, choices=[1, 2, 3, 4, 5],
                    help="If set, process only this stage")
    args = ap.parse_args()
    stages = [args.stage] if args.stage else [1, 2, 3, 4, 5]
    for sn in stages:
        rc = composite_long_panoramic(sn)
        if rc != 0:
            return rc
    print("-" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(main())
