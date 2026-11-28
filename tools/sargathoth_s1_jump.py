#!/usr/bin/env python3
"""Build Sargathoth Stage 1's jump strips from the committed base still (same procedural warp as tools/sargathoth_s1_anim.py, so the palette
and pixel grid never change; he is a limbless mound, so there is nothing for a skeleton to drive).

Usage: python3 -I tools/sargathoth_s1_jump.py public/assets/sargathoth-s1.png out-dir

Writes out-dir/sargathoth-s1-jump-rise.png (6 frames), sargathoth-s1-jump-air.png (4 frames, loop) and sargathoth-s1-jump-land.png (5 frames).
He jumps on gas bladders, so it is a buoyant stretch rather than a leap:
  rise: the heap bunches down flat, then shoots tall and thin; the crown trails and the fronds drag down behind.
  air:  held long and narrow, the bladders swelling and settling, fronds fluttering below, eyes pulsing.
  land: slaps flat and wide, rebounds a little, wobbles and settles back to the base.
Every frame stays inside its cell (the base is 236px in a 256px cell, so the squash is capped at 1.07 wide).
"""
import math, sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; FW, FH = 256, 192
base = np.asarray(Image.open(src).convert('RGBA')).copy(); assert base.shape == (FH, FW, 4), base.shape
top = int(np.nonzero(base[..., 3].any(1))[0].min()); H = FH - top
cols = np.nonzero(base[..., 3].any(0))[0]; cx = (cols.min() + cols.max()) / 2
gy, gx = np.mgrid[0:FH, 0:FW]; yc = gy + .5; xc = gx + .5
hn = np.clip((FH - yc) / H, 0, 1)
r, g, b = (base[..., k].astype(int) for k in range(3))
eye = (base[..., 3] > 0) & (r == 140) & (g == 255) & (b == 20)

def render(sx, sy, pulse=0.):
    ix = np.floor(sx).astype(int); iy = np.floor(sy).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < FW) & (iy < FH); o = np.zeros_like(base); o[ok] = base[iy[ok], ix[ok]]
    if pulse:
        e = np.zeros((FH, FW), bool); e[ok] = eye[iy[ok], ix[ok]]
        o[e, :3] = np.clip(o[e, :3].astype(float) * (1 + pulse) + (pulse > 0) * pulse * 60, 0, 255).astype(np.uint8)
    return o

def pose(sv, sh, drag=0., flutter=0., phase=0., swell=0., pulse=0.):
    """sv: vertical scale (>1 taller); sh: horizontal scale; drag: crown lag in px (+ = trails behind/left); flutter: frond sway in px;
    swell: extra bulge in the upper body (bladders), as a fraction."""
    sw = 1 + swell * np.exp(-((hn - .55) / .3) ** 2)                               # upper-body swell
    sway = -drag * hn ** 1.5 + flutter * hn ** 1.8 * np.sin(phase - 2.2 * hn)
    sy = FH - (FH - yc) / sv
    sx = cx + (xc - cx - sway) / (sh * sw)
    return render(sx, sy, pulse)

def rise(i):                  # 0-1 bunch down, 2-5 shoot up
    sv = [.84, .68, 1.18, 1.38, 1.5, 1.52][i]; sh = [1.04, 1.07, .93, .85, .8, .8][i]
    return pose(sv, sh, drag=[0, 0, 5, 9, 11, 11][i], flutter=[0, 0, 1.5, 2.5, 3, 3][i], phase=i * 1.3, pulse=[0, 0, .1, .2, .3, .3][i])

def air(i):                   # loop: long and narrow, bladders breathing
    p = 2 * math.pi * i / 4
    return pose(1.46 + .05 * math.sin(p), .82 - .02 * math.sin(p), drag=9, flutter=3.4, phase=p * 1.0, swell=.05 * math.sin(p + 1), pulse=.3 * math.sin(p))

def land(i):                  # slap flat, rebound, settle
    sv = [.62, .78, 1.1, .96, 1.0][i]; sh = [1.07, 1.06, .96, 1.02, 1.0][i]
    return pose(sv, sh, drag=[-2, 0, 3, 0, 0][i], flutter=[1, 1.4, 2, 1, 0][i], phase=i * 1.6, pulse=[.3, .2, .1, 0, 0][i])

for name, fn, n in (('rise', rise, 6), ('air', air, 4), ('land', land, 5)):
    strip = np.zeros((FH, FW * n, 4), np.uint8)
    for i in range(n):
        strip[:, i * FW:(i + 1) * FW] = fn(i); a = strip[:, i * FW:(i + 1) * FW, 3]
        assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'{name} frame {i} touches the cell edge'
    Image.fromarray(strip).save(f'{out}/sargathoth-s1-jump-{name}.png', optimize=True); print(name, strip.shape)
