#!/usr/bin/env python3
"""Snap every opaque pixel of a strip to the nearest colour (RGB distance) of a base sprite's palette; alpha becomes 0/255.
Usage: python3 -I tools/snap_palette.py strip.png base.png out.png

PixelLab drifts off a flat base palette: outlines come back as dark greys, edges pick up grey smear. Snapping returns them to the
base's own colours (dark greys land on the outline black) without deleting anything, so thin outlines and gaps survive. Use it
on bases already reduced to a small palette (e.g. 48 colours)."""
import sys, numpy as np
from PIL import Image
src, base, out = sys.argv[1:4]
b = np.asarray(Image.open(base).convert('RGBA')); pal = np.unique(b[b[..., 3] > 0][:, :3], axis=0).astype(int)
a = np.asarray(Image.open(src).convert('RGBA')).copy(); m = a[..., 3] >= 128
px = a[m][:, :3].astype(int)
idx = np.concatenate([((px[i:i + 50000, None, :] - pal[None]) ** 2).sum(2).argmin(1) for i in range(0, len(px), 50000)])
a[m, :3] = pal[idx]; a[m, 3] = 255; a[~m] = 0
Image.fromarray(a).save(out, optimize=True)
print(f'{out}: {m.sum()} px snapped to {len(pal)} colours')
