#!/usr/bin/env python3
"""Key a black-background kaiju render and fit it into a transparent frame for PixelLab (tools/pixellab_animate.py).

Usage:
  python3 tools/prep_form_base.py render.webp out.png [--width 256] [--x 0] [--height 192] [--block 8] [--thr 40]

The near-black background is flood-filled from the border only, so dark outline/interior pixels survive. The
sprite is snapped to its native pixel grid (`--block` px per art pixel in the render), scaled with nearest-neighbour
to `--width`, and pasted at `--x` with its feet on the bottom row of a 256 x `--height` frame.

Padded bases (e.g. --width 205 --x 10) leave room in front of the snout for lunges and slams. Register strips
generated from one with `scale` (= width/256) and `anchor` (= x + 128*scale) in SPRITES so they draw at the
same size and position as full-frame strips.
"""
import argparse, numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=256); ap.add_argument('--x', type=int, default=0)
ap.add_argument('--height', type=int, default=192); ap.add_argument('--block', type=int, default=8)
ap.add_argument('--thr', type=int, default=40)
a = ap.parse_args()

p = np.asarray(Image.open(a.src).convert('RGB')).astype(int)
dark = p.sum(2) < a.thr
H0, W0 = dark.shape
flood = Image.fromarray(np.where(dark, 255, 0).astype(np.uint8)).copy()  # fromarray can be read-only; floodfill would no-op
seeds = [(x, 0) for x in range(0, W0, 64)] + [(x, H0 - 1) for x in range(0, W0, 64)] + \
        [(0, y) for y in range(0, H0, 64)] + [(W0 - 1, y) for y in range(0, H0, 64)] + [(W0 - 1, H0 - 1)]
for s in seeds:
    if flood.getpixel(s) == 255: ImageDraw.floodfill(flood, s, 128)
alpha = np.where(np.asarray(flood) == 128, 0, 255).astype(np.uint8)
img = Image.fromarray(np.dstack([p.astype(np.uint8), alpha]), 'RGBA')
img = img.crop(img.getbbox())
native = img.resize((round(img.width / a.block), round(img.height / a.block)), Image.NEAREST)
th = round(native.height * a.width / native.width)
fit = native.resize((a.width, th), Image.NEAREST)
if th > a.height or a.x + a.width > 256: raise SystemExit(f'sprite {a.width}x{th} at x={a.x} does not fit 256x{a.height}')
frame = Image.new('RGBA', (256, a.height), (0, 0, 0, 0)); frame.paste(fit, (a.x, a.height - th))
frame.save(a.out, optimize=True)
print(f'{a.out}: native {native.size}, sprite {a.width}x{th} at x={a.x}, frame 256x{a.height}')
