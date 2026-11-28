#!/usr/bin/env python3
"""Build Sargathoth Stage 1's crouch strips from the committed base still (same procedural warp as tools/sargathoth_s1_anim.py, so the
palette and pixel grid never change; he is a limbless mound, so there is nothing for a skeleton to drive).

Usage: python3 -I tools/sargathoth_s1_crouch.py public/assets/sargathoth-s1.png out-dir

Writes out-dir/sargathoth-s1-crouch-down.png (5 frames), sargathoth-s1-crouch.png (4 frames, loop) and sargathoth-s1-crouch-up.png (5 frames).
A form with crouch art is drawn at full size while crouched (src/game.ts), so the strips carry the squash themselves: he settles to
CROUCH x his height (about the crouch hitbox, 38/69) and spreads to the cell's edge. The Holdfast stance can reuse these (docs/SARGATHOTH_KIT.md).
  down: the heap sinks and spreads, fronds slumping, digging in.
  loop: pressed low and anchored, breathing slowly, the fronds barely stirring, eyes dim and steady.
  up:   heaves back up with a small overshoot, then settles to the base.
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
CROUCH = .6

def render(sx, sy, pulse=0.):
    ix = np.floor(sx).astype(int); iy = np.floor(sy).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < FW) & (iy < FH); o = np.zeros_like(base); o[ok] = base[iy[ok], ix[ok]]
    if pulse:
        e = np.zeros((FH, FW), bool); e[ok] = eye[iy[ok], ix[ok]]
        o[e, :3] = np.clip(o[e, :3].astype(float) * (1 + pulse) + (pulse > 0) * pulse * 60, 0, 255).astype(np.uint8)
    return o

def pose(sv, sh, slump=0., sway=0., phase=0., pulse=0.):
    """slump: crown pushed forward (+) as the heap sinks; sway: frond sway in px."""
    off = slump * hn ** 1.4 + sway * hn ** 1.8 * np.sin(phase - 2.0 * hn)
    sy = FH - (FH - yc) / sv
    sx = cx + (xc - cx - off) / sh
    return render(sx, sy, pulse)

def down(i):
    sv = [.9, .78, .67, .61, CROUCH][i]; sh = [1.01, 1.03, 1.05, 1.07, 1.07][i]
    return pose(sv, sh, slump=[1, 3, 5, 4, 3][i], sway=[0, 1, 1.5, 1.2, 0.8][i], phase=i * 1.4, pulse=[0, -.1, -.2, -.25, -.25][i])

def loop(i):
    p = 2 * math.pi * i / 4
    return pose(CROUCH + .018 * math.sin(p), 1.07 - .006 * math.sin(p), slump=3, sway=.9, phase=p, pulse=-.2 + .05 * math.sin(p))

def up(i):
    sv = [.66, .82, 1.05, 1.03, 1.0][i]; sh = [1.06, 1.03, .98, .995, 1.0][i]
    return pose(sv, sh, slump=[2, -1, -3, -1, 0][i], sway=[1, 1.8, 2, 1, 0][i], phase=i * 1.5, pulse=[-.1, 0, .15, .05, 0][i])

for name, fn, n in (('down', down, 5), ('', loop, 4), ('up', up, 5)):
    strip = np.zeros((FH, FW * n, 4), np.uint8)
    for i in range(n):
        strip[:, i * FW:(i + 1) * FW] = fn(i); a = strip[:, i * FW:(i + 1) * FW, 3]
        assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'{name or "loop"} frame {i} touches the cell edge'
    Image.fromarray(strip).save(f'{out}/sargathoth-s1-crouch{"-" + name if name else ""}.png', optimize=True); print(name or 'crouch', strip.shape)
