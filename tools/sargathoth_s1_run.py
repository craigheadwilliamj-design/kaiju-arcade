#!/usr/bin/env python3
"""Build Sargathoth Stage 1's run strip from the committed base still (same procedural warp as tools/sargathoth_s1_anim.py, so the palette
and pixel grid never change; he is a limbless mound, so there is nothing for a skeleton to drive).

Usage: python3 -I tools/sargathoth_s1_run.py public/assets/sargathoth-s1.png out-dir

Writes out-dir/sargathoth-s1-run.png (8 frames of 256x192, same frame and anchor as the idle / walk strips).
  run: a surging gallop rather than the walk's lumber. One big gather-and-lunge per loop, two pedal-wave crests rolling along the underside
       (twice the walk's), the whole heap pitched forward with the crown leading and the fronds streaming back, a short hop at the top of
       the lunge. The width stays inside the frame (the body is 236px in a 256px cell), so the stretch comes from the lean and the squash.
"""
import math, sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; FW, FH, N = 256, 192, 8
base = np.asarray(Image.open(src).convert('RGBA')).copy()
assert base.shape == (FH, FW, 4), base.shape
top = int(np.nonzero(base[..., 3].any(1))[0].min()); H = FH - top           # heap height; ground is row FH (bottom edge)
cols = np.nonzero(base[..., 3].any(0))[0]; cx = (cols.min() + cols.max()) / 2
gy, gx = np.mgrid[0:FH, 0:FW]; yc = gy + .5; xc = gx + .5
hn = np.clip((FH - yc) / H, 0, 1)                                              # 0 at the ground, 1 at the crown
r, g, b = (base[..., k].astype(int) for k in range(3))
eye = (base[..., 3] > 0) & (r == 140) & (g == 255) & (b == 20)

def render(sx, sy, pulse=0.):
    ix = np.floor(sx).astype(int); iy = np.floor(sy).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < FW) & (iy < FH); o = np.zeros_like(base); o[ok] = base[iy[ok], ix[ok]]
    if pulse:
        e = np.zeros((FH, FW), bool); e[ok] = eye[iy[ok], ix[ok]]
        o[e, :3] = np.clip(o[e, :3].astype(float) * (1 + pulse) + (pulse > 0) * pulse * 60, 0, 255).astype(np.uint8)
    return o

def run(t):
    p = 2 * math.pi * t / N
    heave = math.sin(p)                                                          # +1 stretched / lunging, -1 gathered
    hop = max(0., math.sin(p + .5)) ** 2                                         # airborne bump just after the lunge starts
    sv = 1 - .15 * heave                                                         # low and long when lunging, tall when gathered
    sh = 1 + .03 * heave
    lean = 17 * hn ** 1.2 * (np.sin(p - .6 * hn) * .5 + .5) - 3                 # whole heap pitched forward, crown leading
    lean -= 7 * hn ** 2.2 * (1 - np.sin(p) * .5 - .5)                           # fronds stream back as the base gathers up
    lean += 3.2 * hn ** 2 * np.sin(2 * p - 2.4 * hn)                             # flutter on the stream
    u = (xc - cx) / (236 / 2)
    wave = .16 * np.sin(2 * math.pi * (u * 3 - t / N * 2)) * np.exp(-hn * 3.0)  # two crests, two loops per cycle: a fast slug ripple
    sy = FH - (FH - yc + 5 * hop) / (sv * (1 + wave))
    sx = cx + (xc - cx - lean - 4.0 * heave * (1 - hn)) / sh
    return render(sx, sy, .3 * math.sin(p + .4))

strip = np.zeros((FH, FW * N, 4), np.uint8)
for i in range(N): strip[:, i * FW:(i + 1) * FW] = run(i)
Image.fromarray(strip).save(f'{out}/sargathoth-s1-run.png', optimize=True)
for i in range(N):                                                               # keep every frame inside its cell
    fr = strip[:, i * FW:(i + 1) * FW, 3]; assert not fr[:, 0].any() and not fr[:, -1].any() and not fr[0].any(), f'frame {i} touches the cell edge'
print('run', strip.shape)
