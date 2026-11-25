#!/usr/bin/env python3
"""Strip PixelLab's grey smear from a strip whose base has no greys (e.g. Myrmex Stage 3: reds, oranges, pinks, black outline).
Usage: python3 -I tools/clean_greys.py in.png out.png [FRAME_W=256] [SAT=0.35]

A grey is an opaque pixel with saturation < SAT that isn't near-black outline (max channel > 0.12). Greys connected to the
transparent background (through other greys) are deleted; greys enclosed by the body take the most common non-grey colour among
their 8 neighbours (repeated until none are left). Gaps between legs, wings and antennae stay open (unlike fill_pinholes)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]
FW = int(sys.argv[3]) if len(sys.argv) > 3 else 256; SAT = float(sys.argv[4]) if len(sys.argv) > 4 else .35
im = np.asarray(Image.open(src).convert('RGBA')).copy(); total = [0, 0]
for i in range(im.shape[1] // FW):
    f = im[:, i * FW:(i + 1) * FW]
    c = f[..., :3].astype(float) / 255; mx = c.max(2); mn = c.min(2)
    op = f[..., 3] > 0; grey = op & ((mx - mn) / np.maximum(mx, 1e-6) < SAT) & (mx > .12)
    lab, _ = nd.label(grey | ~op, structure=np.ones((3, 3)))
    edge = grey & np.isin(lab, np.unique(lab[~op]))
    f[edge] = 0; total[0] += edge.sum(); grey &= ~edge
    while grey.any():
        changed = False
        for y, x in zip(*np.nonzero(grey)):
            nb = f[max(y - 1, 0):y + 2, max(x - 1, 0):x + 2].reshape(-1, 4); g = grey[max(y - 1, 0):y + 2, max(x - 1, 0):x + 2].ravel()
            nb = nb[(nb[:, 3] > 0) & ~g]
            if len(nb):
                cols, n = np.unique(nb, axis=0, return_counts=True); f[y, x] = cols[n.argmax()]; grey[y, x] = False; total[1] += 1; changed = True
        if not changed: f[grey] = 0; total[0] += grey.sum(); break
Image.fromarray(im).save(out, optimize=True)
print(f'{out}: removed {total[0]} edge greys, recoloured {total[1]} enclosed')
