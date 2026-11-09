#!/usr/bin/env python3
"""Restore a detail that a PixelLab strip washed out (e.g. Mogurodon Stage 1's gold eye) by tracking the head.

Usage:
  python3 tools/fix_eye.py strip.png out.png [--ref base.png] [--radius 8] [--region Y0,Y1,X0,X1] [--offset FRAME:DY,DX ...]

The eye pixels and the head patch around them come from --ref (a single 256-wide frame with the eye intact;
defaults to the strip's own frame 0). Each frame is searched within +-radius px for the best head match and
the eye is stamped there. Check the result and pass --offset for any mis-tracked frame (big squashes can move
the head past the radius). The eye colour test is set for Mogurodon Stage 1; the default --region fits the full-frame
Stage 1 base (use 100,130,175,205 for the padded mogurodon-s1-pad base). Adjust `is_eye` for other forms.
"""
import argparse, numpy as np
from PIL import Image

FW = 256
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--ref'); ap.add_argument('--radius', type=int, default=8)
ap.add_argument('--pad', type=int, default=6, help='head-patch margin around the eye used for matching')
ap.add_argument('--region', default='70,110,200,240', help='y0,y1,x0,x1 box in the ref that contains the eye')
ap.add_argument('--offset', action='append', default=[], help='manual override for a mis-tracked frame: FRAME:DY,DX')
a = ap.parse_args()

im = np.asarray(Image.open(a.src).convert('RGBA')).copy(); H = im.shape[0]; n = im.shape[1] // FW
F = [im[:, i * FW:(i + 1) * FW] for i in range(n)]
ref = np.asarray(Image.open(a.ref).convert('RGBA')).astype(int) if a.ref else F[0].astype(int)
if ref.shape[0] != H:  # ref may be a different height; align bottoms
    pad = np.zeros((H, FW, 4), int); h = min(H, ref.shape[0]); pad[H - h:] = ref[ref.shape[0] - h:]; ref = pad

r, g, b, al = [ref[..., k] for k in range(4)]
ry0, ry1, rx0, rx1 = map(int, a.region.split(','))
region = np.zeros(al.shape, bool); region[ry0:ry1, rx0:rx1] = True
is_eye = region & (al > 200) & (r > 170) & (g > 100) & (b < 80) & (g - b > 60)
ys, xs = np.where(is_eye)
if not len(xs): raise SystemExit('no eye pixels found in ref')
P = a.pad; y0, y1, x0, x1 = ys.min() - P + 1, ys.max() + P, xs.min() - P, xs.max() + P + 1
tpl = ref[y0:y1, x0:x1, :3]; tm = (ref[y0:y1, x0:x1, 3] > 128) & ~is_eye[y0:y1, x0:x1]

R = a.radius
manual = {int(k): tuple(map(int, v.split(','))) for k, v in (o.split(':') for o in a.offset)}
for i in range(n):
    if i in manual:
        dy, dx = manual[i]; F[i][ys + dy, xs + dx] = ref[ys, xs].astype(np.uint8); print(i, 'offset', dy, dx, '(manual)'); continue
    f = F[i].astype(int); best = None
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            if y0 + dy < 0 or x0 + dx < 0 or y1 + dy > H or x1 + dx > FW: continue
            p = f[y0 + dy:y1 + dy, x0 + dx:x1 + dx]; m = tm & (p[..., 3] > 128)
            if m.sum() < tm.sum() * .6: continue
            d = ((p[..., :3] - tpl) ** 2).sum(-1)[m].mean()
            if best is None or d < best[0]: best = (d, dy, dx)
    if best is None: print(i, 'no match, skipped'); continue
    _, dy, dx = best
    F[i][ys + dy, xs + dx] = ref[ys, xs].astype(np.uint8)
    print(i, 'offset', dy, dx)
Image.fromarray(np.concatenate(F, 1)).save(a.out, optimize=True)
