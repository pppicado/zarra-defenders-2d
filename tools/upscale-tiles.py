"""
Post-procesa los tiles del stage1-bosque para que llenen correctamente
la celda iso de 128x128 cuando se rotan π/4.

Pipeline:
  1. Cargar PNG original (64x64) del tile
  2. Identificar el color de fondo (esquina = marrón oscuro = "tierra")
     En realidad el tile es un cuadrado COMPLETO con patrón de tierra,
     sin fondo transparente. Eso es el asset original.
  3. Hacer el tile 4x más grande (256x256) usando NEAREST
  4. Marcar como transparente los píxeles que NO son parte del "asunto"
     (usando color de fondo como referencia — la mayoría de pixeles son del tile)
  5. Recortar al centro 128x128

PERO: como el tile ES un cuadrado con contenido en toda el área,
no podemos transparentar nada. La solución real es REGENERAR los tiles
con un prompt que produzca un diamond shape.

Esta es una solución ALTERNATIVA: hacer el tile 64x64 fill completo
del canvas 128x128 (escalado 2x), y dejarlo opaco. Cuando se rota π/4
en Pixi, el diamante 64*√2 ≈ 90px cubre menos que la celda 128.

La solución real es regenerar los tiles con shapes isometric.

Por ahora, simplemente ESCALAMOS los tiles 2x para que cuando se roten
formen un diamante del tamaño correcto.
"""
import sys
from pathlib import Path
from PIL import Image

SRC_DIR = Path('assets/tiles/stage1-bosque')
DST_DIR = Path('assets/tiles/stage1-bosque')

def upscale_tile(input_path, output_path, factor=2):
    im = Image.open(input_path).convert('RGBA')
    w, h = im.size
    new_w, new_h = w * factor, h * factor
    # Nearest-neighbor preserves pixel art
    upscaled = im.resize((new_w, new_h), Image.NEAREST)
    upscaled.save(output_path, 'PNG', optimize=True)
    print(f'  {input_path.name} ({w}x{h}) -> ({new_w}x{new_h})')

def main():
    pngs = sorted(SRC_DIR.glob('*.png'))
    print(f'Found {len(pngs)} tiles to upscale by 2x')
    for png in pngs:
        # Create upscaled version with .2x.png suffix
        out_name = png.stem + '_2x.png'
        out_path = DST_DIR / out_name
        upscale_tile(png, out_path, factor=2)

if __name__ == '__main__':
    main()
