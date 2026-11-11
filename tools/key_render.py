#!/usr/bin/env python3
"""Turn an upscaled pixel-art render into a clean native-resolution sprite and place it in a PixelLab-ready frame.

Usage:
  python3 -I tools/key_render.py render.webp out.png [--frame 256x192] [--x center] [--native native.png]

Why: renders come out at ~8x with a slightly non-square, offset pixel grid (e.g. 8.055 x 7.77 px per art pixel)
and lossy edges. Snapping to an assumed whole-number block, or keying a black background by brightness, produces
uneven doubled pixels and eats the dark outline and joint creases (the see-through gaps Stage 3 had).

This measures the real grid period and phase per axis from the image's edge rhythm, samples the median of the
central half of every cell, and keys by the render's alpha channel (>=50% is opaque). A render without alpha falls
back to a strict near-pure-black background key flooded from the border. Islands under 6 px are dropped. The
sprite is kept at native resolution (no rescale) and pasted bottom-aligned into the frame; register strips
generated from it with scale = sprite_width/256 and anchor = x + 128*scale.
"""
import argparse, numpy as np
from PIL import Image
from scipy import ndimage as nd

def grid(p, ax):
    """Pixel-grid period and phase along an axis, from the strongest periodic component of colour edges."""
    rgb = p[..., :3] * (p[..., 3:] / 255)
    prof = np.abs(np.diff(rgb, axis=ax)).sum(2).sum(0 if ax == 1 else 1)
    prof -= prof.mean(); n = np.arange(len(prof)); best = None
    for per in np.arange(4.0, 12.0, 0.005):
        z = (prof * np.exp(2j * np.pi * n / per)).sum()
        if best is None or abs(z) > best[0]: best = (abs(z), per, (-np.angle(z) / (2 * np.pi) * per) % per)
    return best[1], best[2]

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--frame', default='256x192'); ap.add_argument('--x', default='center')
ap.add_argument('--native', help='also write the cropped native sprite here')
ap.add_argument('--width', type=int, help='resample to this sprite width when the native sprite is too big for the frame: the measured grid is '
                'coarsened by native/target and cells are still median-sampled from the render, so colours stay crisp (no blending)')
a = ap.parse_args()

im = Image.open(a.src); has_alpha = 'A' in im.getbands()
p = np.asarray(im.convert('RGBA')).astype(float)
px, ox = grid(p, 1); py, oy = grid(p, 0)
if a.width:
    # Native sprite width from the measured grid, then scale both periods so the opaque span is a.width cells.
    cols = np.nonzero((p[..., 3] >= 128).any(0))[0]; k = (cols[-1] - cols[0] + 1) / px / a.width
    ox, oy = cols[0] % (px * k), oy; px, py = px * k, py * k
nx, ny = int((p.shape[1] - ox) // px), int((p.shape[0] - oy) // py)
cells = np.zeros((ny, nx, 4), np.uint8)
for j in range(ny):
    y0 = oy + j * py; ys = slice(int(round(y0 + py * .25)), int(round(y0 + py * .75)))
    for i in range(nx):
        x0 = ox + i * px; xs = slice(int(round(x0 + px * .25)), int(round(x0 + px * .75)))
        cells[j, i] = np.median(p[ys, xs].reshape(-1, 4), 0)
if has_alpha:
    A = cells[..., 3] >= 128
else:
    lab = nd.label(cells[..., :3].astype(int).sum(2) < 8)[0]
    edge = list(set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0})
    A = ~np.isin(lab, edge)
lab, k = nd.label(A, np.ones((3, 3))); sz = nd.sum(A, lab, range(1, k + 1))
A = np.isin(lab, [i + 1 for i in range(k) if sz[i] >= 6])
cells[..., 3] = np.where(A, 255, 0)
sprite = Image.fromarray(cells, 'RGBA'); sprite = sprite.crop(sprite.getbbox())
if a.native: sprite.save(a.native)
W, H = map(int, a.frame.split('x'))
x = (W - sprite.width) // 2 if a.x == 'center' else int(a.x)
if sprite.width + x > W or sprite.height > H: raise SystemExit(f'sprite {sprite.size} at x={x} does not fit {W}x{H}')
frame = Image.new('RGBA', (W, H), (0, 0, 0, 0)); frame.paste(sprite, (x, H - sprite.height)); frame.save(a.out, optimize=True)
print(f'{a.out}: grid {px:.3f}x{py:.3f} px (phase {ox:.2f},{oy:.2f}), sprite {sprite.width}x{sprite.height} at x={x}, '
      f'scale {sprite.width}/256, anchor {x + 128 * sprite.width / 256:g}')
