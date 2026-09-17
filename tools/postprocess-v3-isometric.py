#!/usr/bin/env python3
"""
postprocess-v3-isometric.py — true pixel-art enforcement on v3 isometric RPG backgrounds.

Pipeline:
  1. Quantize palette to 32 colors (preserves theme colors, removes smooth gradients).
  2. Downsample 4× with LANCZOS to a low-res "pixel grid" target (1344→336 wide).
  3. Upscale 4× back with NEAREST to the original size — preserves crisp pixel grid.
  4. Optional final 2× NEAREST upscale to 2688×1152 ("lo más grandes posibles").

Why this works: a single NEAREST upscale of a smooth photograph just stretches pixels —
no grid. Downsample→NEAREST upscale forces every "pixel" of the source to become a
chunky 4×4 (or 8×8 final) block, which IS true pixel art.

Final output:
  assets/backgrounds/stage{N}-{name}.png     2688 × 1152  (true pixel-art)
"""

import sys
from pathlib import Path

from PIL import Image

SRC_DIR = Path("assets/backgrounds/v3-rpg-isometric")
DST_DIR = Path("assets/backgrounds")

# Curated picks per stage: (variant_filename, final_name).
# Visual review rationale in session transcript.
PICKS = [
    ("stage1-bosque-v2.jpeg",   "stage1-bosque.png"),    # path with stone markers + clear tiles
    ("stage2-pueblo-v1.jpeg",   "stage2-pueblo.png"),    # central fountain as anchor
    ("stage3-rio-v4.jpeg",      "stage3-rio.png"),       # strict top-down: river meandering through forest tiles (Diablo 2 map view)
    ("stage4-vertedero-v1.jpeg", "stage4-vertedero.png"), # factory + chimney + leachate pool
    ("stage5-castillo-v2.jpeg", "stage5-castillo.png"),  # dramatic castle + village base
]

PALETTE_COLORS = 32  # Diablo 2 wilderness zones used ~256 colors; we tighten to 32 for chunky palette
DOWNSAMPLE_FACTOR = 4  # 1344/4 = 336 px wide — defines the pixel grid
FINAL_UPSCALE = 2  # then 336 * 4 (NEAREST) * 2 (NEAREST) = 2688 wide


def enforce_pixel_grid(src: Path, dst: Path) -> tuple[int, int]:
    img = Image.open(src).convert("RGB")

    # Step 1: quantize palette
    quantized = img.quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")

    # Step 2: downsample to pixel-grid target
    w, h = quantized.size
    target = (max(1, w // DOWNSAMPLE_FACTOR), max(1, h // DOWNSAMPLE_FACTOR))
    lowres = quantized.resize(target, Image.LANCZOS)

    # Step 3: NEAREST upscale back to original size
    chunky = lowres.resize((w, h), Image.NEAREST)

    # Step 4: final NEAREST upscale to "lo más grandes posibles"
    final_size = (w * FINAL_UPSCALE, h * FINAL_UPSCALE)
    final = chunky.resize(final_size, Image.NEAREST)

    final.save(dst, "PNG", optimize=True)
    return final_size


def main() -> int:
    DST_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Source: {SRC_DIR.resolve()}")
    print(f"Target: {DST_DIR.resolve()}")
    print(f"Palette: {PALETTE_COLORS} colors | Downsample: {DOWNSAMPLE_FACTOR}x | Final upscale: {FINAL_UPSCALE}x")
    print("-" * 70)

    for src_name, dst_name in PICKS:
        src = SRC_DIR / src_name
        dst = DST_DIR / dst_name
        if not src.exists():
            print(f"FAIL  {src_name} — not found")
            return 1
        size = enforce_pixel_grid(src, dst)
        kb = dst.stat().st_size // 1024
        print(f"OK    {src_name:30s} -> {dst_name:25s}  {size[0]}x{size[1]}  ({kb} KB)")

    print("-" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
