#!/usr/bin/env python3
# tools/generate-papeleta-firmada.py
#
# Generates the F4d papeleta sprite: a 20x24 px transparent PNG showing a
# cream rectangle with a thin black outline and a diagonal signature line.
#
# Size rationale: hand sprite is 64x64 px (scaled to 76.8x76.8 at hand.scale=1.2).
# F4d spec: "papeleta is 30% of the hand size" -> 64 * 0.3 ~ 19.2 px linear.
# Rounded to 20x24 (slightly taller to evoke a vertical document).
#
# Style: pixel-art, matching the F3 hand_pen.png aesthetic (cream + black outline +
# single accent line). Same NEAREST scale mode as the other sprites.
#
# Run: python3 tools/generate-papeleta-firmada.py
# Output: assets/sprites/papeleta_firmada.png
from PIL import Image, ImageDraw

W, H = 20, 24
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))  # transparent
draw = ImageDraw.Draw(img)

# 1px black outline + cream fill (matches hand_pen.png style)
draw.rectangle([(0, 0), (W - 1, H - 1)], outline=(17, 17, 17, 255), fill=(255, 245, 214, 255))

# Diagonal signature stroke (mid-blue, evoking fountain pen ink)
draw.line([(5, H - 6), (W - 5, 4)], fill=(42, 77, 143, 255), width=1)

# Small "fold" crease at top-right (suggests a signed document)
draw.line([(W - 4, 2), (W - 2, 4)], fill=(17, 17, 17, 255), width=1)

img.save('assets/sprites/papeleta_firmada.png', 'PNG')
print('Wrote assets/sprites/papeleta_firmada.png (' + str(W) + 'x' + str(H) + ' RGBA)')
