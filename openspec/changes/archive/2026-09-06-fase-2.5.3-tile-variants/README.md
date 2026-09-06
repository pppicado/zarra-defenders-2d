# F2.5.3 — Tile variants with natural-variation prompt

## Why
F2.5.2 tiles (40 PNGs) were visually inconsistent — minimax generated "slabs" or repetitive patterns because prompts requested magenta chroma key. The prompt template assumed diamonds; with squares no alpha is needed.

## What
- 120 PNGs (5 stages × 8 variants × 3 lighting alternatives)
- v3 prompt: natural-variation, no chroma key, asymmetric distribution
- Manifest schema v2 with alternative + lighting fields
- Gallery updated to render variant-groups of 3 alts
- 40 v2 static tiles archived to _discarded/v2-square-static/

## Result
PR #7 merged at commit 478115f.