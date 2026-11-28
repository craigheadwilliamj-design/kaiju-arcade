#!/usr/bin/env python3
"""Build Sargathoth Stage 1's climb strips from the committed base still (same procedural warp as tools/sargathoth_s1_crouch.py, so the
palette and pixel grid never change; he is a limbless mound, so he climbs by pouring himself into a tall column that hugs the wall).

Usage: python3 -I tools/sargathoth_s1_climb.py public/assets/sargathoth-s1.png out-dir

Writes out-dir/sargathoth-s1-climb-grab.png (5), sargathoth-s1-climb.png (8, loop), sargathoth-s1-climb-punch.png (8) and
sargathoth-s1-climb-mantle.png (9). Frames are 256x192 like the base and bottom-aligned, so SG1_NATIVE draws them (src/presentation.ts).
The column's wall-side edge sits on the wall line at frame x=WALL (the hitbox edge: 24 world units out at 120/236 world units per px,
so 128 + 24 * 236 / 120). The climb loop inches: the column stretches up, then the base catches up, fronds streaming down it.
  grab:   rears off the street, narrows and slides onto the wall line.
  climb:  inchworm cycle up the wall, fronds rippling, eyes steady.
  punch:  draws back off the wall, then a frond-fist slams in (flash on frame 4).
  mantle: the crown pours over the roof edge and the rest follows, settling to the base.
"""
import math, sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; FW, FH = 256, 192
base = np.asarray(Image.open(src).convert('RGBA')).copy(); assert base.shape == (FH, FW, 4), base.shape
top = int(np.nonzero(base[..., 3].any(1))[0].min()); H = FH - top
cols = np.nonzero(base[..., 3].any(0))[0]; cx = (cols.min() + cols.max()) / 2; BW = cols.max() - cols.min() + 1
gy, gx = np.mgrid[0:FH, 0:FW]; yc = gy + .5; xc = gx + .5
hn = np.clip((FH - yc) / H, 0, 1)
r, g, b = (base[..., k].astype(int) for k in range(3))
eye = (base[..., 3] > 0) & (r == 140) & (g == 255) & (b == 20)
WALL = 128 + 24 * 236 / 120          # ~175
TALL = 1.5                           # column height vs the base (hitbox is 69 tall, the base 46 world units)
NARROW = .2                          # column width vs the base (~47px, about the 48 world-unit hitbox)

def render(sx, sy, pulse=0., flash=0.):
    ix = np.floor(sx).astype(int); iy = np.floor(sy).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < FW) & (iy < FH); o = np.zeros_like(base); o[ok] = base[iy[ok], ix[ok]]
    if pulse:
        e = np.zeros((FH, FW), bool); e[ok] = eye[iy[ok], ix[ok]]
        o[e, :3] = np.clip(o[e, :3].astype(float) * (1 + pulse) + (pulse > 0) * pulse * 60, 0, 255).astype(np.uint8)
    if flash:
        a = o[..., 3] > 0; k = flash * 70 * np.clip((hn - .2) * 2, 0, 1)[..., None]
        o[a, :3] = np.clip(o[a, :3].astype(float) + k[a], 0, 255).astype(np.uint8)
    return o

def pose(sv, sh, edge=None, centre=None, slump=0., sway=0., phase=0., pulse=0., flash=0.):
    """sv/sh: vertical/horizontal scale; edge: x of the wall-side edge (else centre: x of the middle); slump: crown pushed toward +x;
    sway: frond ripple in px travelling down the column."""
    dcx = edge - (BW / 2) * sh if edge is not None else centre
    off = slump * hn ** 1.4 + sway * hn ** 1.2 * np.sin(phase - 5.0 * hn)
    sy = FH - (FH - yc) / sv
    sx = cx + (xc - dcx - off) / sh
    return render(sx, sy, pulse, flash)

def lerp(a, b, t): return a + (b - a) * t
def ease(t): return t * t * (3 - 2 * t)

def grab(i):  # mound -> column on the wall
    t = ease([.12, .35, .6, .85, 1.][i]); sh = lerp(1., NARROW, t)
    centre = lerp(cx, WALL - (BW / 2) * NARROW, t)
    return pose(lerp(1., TALL, t) + [.1, .06, .02, -.02, 0][i], sh, centre=centre, slump=[1, 3, 5, 3, 1][i], sway=[0, 1, 2, 2, 1][i], phase=i * 1.3,
                pulse=[0, .1, .15, .05, 0][i])

def climb(i):  # inchworm loop
    p = 2 * math.pi * i / 8
    return pose(TALL + .09 * math.sin(p), NARROW + .012 * math.sin(p + 1.5), edge=WALL, slump=2.5 + 1.5 * math.sin(p), sway=3.2, phase=-p,
                pulse=.04 * math.sin(p))

def punch(i):  # draw back, slam, recover; the slam may press the crown past the wall line
    slump = [-3, -7, -9, 11, 8, 4, 1, 0][i]; flash = [0, 0, 0, 1., .6, .2, 0, 0][i]
    return pose(TALL + [.02, .05, .07, -.04, -.02, 0, 0, 0][i], NARROW + [0, .01, .02, .04, .03, .015, .005, 0][i],
                edge=WALL + [0, -2, -3, 2, 1, 0, 0, 0][i], slump=slump, sway=[2, 2, 3, 2, 2, 2, 2.5, 3][i], phase=i * 1.1, pulse=[0, .05, .1, .2, .1, 0, 0, 0][i], flash=flash)

def mantle(i):  # column -> over the roof -> settled mound
    t = ease([0, .14, .3, .46, .62, .76, .88, .96, 1.][i]); sh = lerp(NARROW, 1., t)
    centre = lerp(WALL - (BW / 2) * NARROW, cx, t)
    sv = lerp(TALL, 1., t) + [0, .06, .1, .08, .04, -.04, -.03, .01, 0][i]
    return pose(sv, sh, centre=centre, slump=[3, 8, 14, 16, 11, 5, 2, 0, 0][i] * (1 - t * .6), sway=[3, 3, 2.5, 2, 1.5, 1, .6, .2, 0][i], phase=i * 1.2,
                pulse=[0, .05, .1, .1, .05, 0, 0, 0, 0][i])

for name, fn, n in (('grab', grab, 5), ('', climb, 8), ('punch', punch, 8), ('mantle', mantle, 9)):
    strip = np.zeros((FH, FW * n, 4), np.uint8)
    for i in range(n):
        strip[:, i * FW:(i + 1) * FW] = fn(i); a = strip[:, i * FW:(i + 1) * FW, 3]
        assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'{name or "climb"} frame {i} touches the cell edge'
        if name in ('', ):
            right = int(np.nonzero(a.any(0))[0].max())
            assert abs(right - WALL) <= 3, f'climb frame {i} wall edge at {right}, wall line {WALL:.0f}'
    Image.fromarray(strip).save(f'{out}/sargathoth-s1-climb{"-" + name if name else ""}.png', optimize=True); print(name or 'climb', strip.shape)
