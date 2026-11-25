#!/usr/bin/env python3
"""Swing Myrmex Stage 3's tail and scythe forelegs on a finished strip (PixelLab moves only the body and legs).

Usage: python3 -I tools/myrmex_s3_sway.py in.png out.png [--tail DEG] [--arms DEG] [--tail-phase P] [--arms-phase P] [--cycles N]

Per frame the strip's own pixels are cut by region (offset by the frame's bob, measured from the top of the wings against frame 0),
erased, rotated RotSprite style (Scale2x three times, rotate at 8x, sample centres) about a pivot and pasted back. Angles follow
sin(2*pi*(N*i/frames + phase)); positive = clockwise (the tail tip leans forward, the blades swing back under the body).
Regions are in base coordinates (myrmex-s3.png, 173x123 sprite at x=41, feet on row 191):
  tail:  (x < 62 and y < 138) or (x < 88 and 81 <= y < 112), the curl above the back left of the first crystal; pivot (58, 135)
  arms:  y < 170 and (x >= 195, y >= 119 | x >= 182, y >= 123 | x >= 174, y >= 133): both scythe forelegs, stepped round the jaw
         (ends row 118) and the orange throat (x < 182 above row 133), clear of the front legs; pivot (176, 138) at the shoulder
"""
import argparse, math, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--tail', type=float, default=5); ap.add_argument('--arms', type=float, default=6)
ap.add_argument('--tail-phase', type=float, default=.125); ap.add_argument('--arms-phase', type=float, default=.625)
ap.add_argument('--cycles', type=float, default=1)
A = ap.parse_args(); FW = 256

def scale2x(im):
    p = np.pad(im, ((1, 1), (1, 1), (0, 0)), mode='edge'); P = p[1:-1, 1:-1]
    a, b, c, d = p[:-2, 1:-1], p[1:-1, 2:], p[1:-1, :-2], p[2:, 1:-1]; eq = lambda u, v: (u == v).all(-1)
    o = np.repeat(np.repeat(P, 2, 0), 2, 1).copy()
    c0 = eq(c, a) & ~eq(c, d) & ~eq(a, b); c1 = eq(a, b) & ~eq(a, c) & ~eq(b, d)
    c2 = eq(d, c) & ~eq(d, b) & ~eq(c, a); c3 = eq(b, d) & ~eq(b, a) & ~eq(d, c)
    o[0::2, 0::2][c0] = a[c0]; o[0::2, 1::2][c1] = b[c1]; o[1::2, 0::2][c2] = c[c2]; o[1::2, 1::2][c3] = d[c3]
    return o

def rot(layer, deg, cx, cy):
    if abs(deg) < 1e-3: return layer
    u = scale2x(scale2x(scale2x(layer))); H, W = layer.shape[:2]
    gy, gx = np.mgrid[0:H, 0:W]; px, py = gx + .5 - cx, gy + .5 - cy; t = math.radians(deg)
    sx = cx + px * math.cos(t) + py * math.sin(t); sy = cy - px * math.sin(t) + py * math.cos(t)
    ix = np.floor(sx * 8).astype(int); iy = np.floor(sy * 8).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < W * 8) & (iy < H * 8); o = np.zeros_like(layer); o[ok] = u[iy[ok], ix[ok]]
    return o

im = np.asarray(Image.open(A.src).convert('RGBA')).copy(); n = im.shape[1] // FW
yy, xx = np.mgrid[0:im.shape[0], 0:FW]
top = lambda f: int(np.nonzero((f[..., 3] > 0).any(1))[0].min()); t0 = top(im[:, :FW])
PARTS = [('tail', lambda x, y: ((x < 62) & (y < 138)) | ((x < 88) & (y >= 81) & (y < 112)), (58, 135), A.tail, A.tail_phase),
         ('arms', lambda x, y: (((x >= 195) & (y >= 119)) | ((x >= 182) & (y >= 123)) | ((x >= 174) & (y >= 133))) & (y < 170), (176, 138), A.arms, A.arms_phase)]
for i in range(n):
    f = im[:, i * FW:(i + 1) * FW]; dy = top(f) - t0
    for name, region, (px, py), amp, ph in PARTS:
        m = (f[..., 3] > 0) & region(xx, yy - dy)
        layer = np.where(m[..., None], f, 0).astype(np.uint8); f[m] = 0
        r = rot(layer, amp * math.sin(2 * math.pi * (A.cycles * i / n + ph)), px + .5, py + dy + .5)
        k = r[..., 3] > 0; f[k] = r[k]
Image.fromarray(im).save(A.out, optimize=True)
print(f'{A.out}: {n} frames, tail +/-{A.tail} deg, arms +/-{A.arms} deg')
