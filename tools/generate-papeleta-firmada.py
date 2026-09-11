#!/usr/bin/env python3
# tools/generate-papeleta-firmada.py
#
# Generates the F4d papeleta sprite: a 40x48 px transparent PNG (F4f, was 20x24)
# showing a cream rectangle with a thin black outline, a diagonal signature
# stroke, and a top-right fold crease.
#
# Size rationale: hand sprite is 64x64 px (scaled to 76.8x76.8 at hand.scale=1.2).
# F4f: user request "el doble de grandes" -> 20x24 * 2 = 40x48 px. New linear
# ratio vs hand = 40/64 ~ 62% (was 30%).
#
# Style: pixel-art, matching the F3 hand_pen.png aesthetic (cream + black
# outline + single accent line). Same NEAREST scale mode as the other sprites.
#
# Run: python3 tools/generate-papeleta-firmada.py
# Output: assets/sprites/papeleta_firmada.png
from PIL import Image, ImageDraw

W, H = 40, 48
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))  # transparent
draw = ImageDraw.Draw(img)

# 1px black outline + cream fill (matches hand_pen.png style)
draw.rectangle([(0, 0), (W - 1, H - 1)], outline=(17, 17, 17, 255), fill=(255, 245, 214, 255))

# Diagonal signature stroke (mid-blue, evoking fountain pen ink)
draw.line([(10, H - 12), (W - 10, 8)], fill=(42, 77, 143, 255), width=2)

# Small "fold" crease at top-right (suggests a signed document)
draw.line([(W - 8, 4), (W - 4, 8)], fill=(17, 17, 17, 255), width=2)

img.save('assets/sprites/papeleta_firmada.png', 'PNG')
print('Wrote assets/sprites/papeleta_firmada.png (' + str(W) + 'x' + str(H) + ' RGBA)')

