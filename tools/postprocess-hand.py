"""
Post-procesa una imagen JPEG de minimax a un sprite PNG con alpha.

Pipeline:
  1. Cargar JPEG original (1024x1024)
  2. Encontrar bounding box del sujeto (todos los pixeles no-blanco/no-gris-claro)
  3. Recortar al bounding box + margin de 2px
  4. Redimensionar a 64x64 con NEAREST (preserva pixel art)
  3. Cuantizar a 16 colores (paleta limitada estilo SNES)
  5. Chroma-key: pixeles casi-blancos (R,G,B > 230) -> alpha 0
  6. Guardar como PNG con alpha

Uso:
  python3 tools/postprocess-hand.py assets/sprites/_hand-attempts/attempt-04-fist.jpeg assets/sprites/hand_pen.png
"""
import sys
from PIL import Image

def main(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    print(f'Input: {input_path} {img.size}')

    # 1) Bounding box of the non-background subject.
    # Background is near-white/light-gray. We treat any pixel where ALL channels > 220 as bg.
    w, h = img.size
    bg_threshold = 220
    bbox_pixels = img.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, _ = bbox_pixels[x, y]
            if not (r > bg_threshold and g > bg_threshold and b > bg_threshold):
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    if min_x >= max_x or min_y >= max_y:
        print('ERROR: no subject found (all pixels are background)', file=sys.stderr)
        sys.exit(1)

    # 2) Crop with 2px margin.
    margin = 2
    box = (max(0, min_x - margin), max(0, min_y - margin),
           min(w, max_x + 1 + margin), min(h, max_y + 1 + margin))
    cropped = img.crop(box)
    print(f'Cropped to bbox {box} -> {cropped.size}')

    # 3) Resize to 64x64 with NEAREST (pixel art).
    resized = cropped.resize((64, 64), Image.NEAREST)
    print(f'Resized to 64x64')

    # 4) Quantize to 16 colors (palette).
    quantized = resized.quantize(colors=16, method=Image.FASTOCTREE).convert('RGBA')
    print(f'Quantized to 16 colors')

    # 5) Chroma-key: any pixel with R,G,B all > 220 -> alpha 0
    # 6) Snap remaining alpha to binary (0 or 255)
    pixels = quantized.load()
    final = Image.new('RGBA', quantized.size)
    out_px = final.load()
    transparent_count = 0
    for y in range(64):
        for x in range(64):
            r, g, b, a = pixels[x, y]
            if r > 220 and g > 220 and b > 220:
                out_px[x, y] = (0, 0, 0, 0)
                transparent_count += 1
            else:
                out_px[x, y] = (r, g, b, 255)

    print(f'Chroma-key applied: {transparent_count} transparent pixels ({transparent_count/(64*64)*100:.1f}%)')

    # 7) Save as PNG.
    final.save(output_path, 'PNG', optimize=True)
    print(f'Saved: {output_path}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: postprocess-hand.py <input.jpeg> <output.png>', file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
