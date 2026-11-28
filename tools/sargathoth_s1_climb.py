#!/usr/bin/env python3
"""Build Sargathoth Stage 1's climb strips: his walk turned a quarter (belly to the wall, crown up), like Myrmex's climb. He is a slime:
the same crawl that moves him along the street moves him up the wall.

Usage: python3 -I tools/sargathoth_s1_climb.py public/assets/sargathoth-s1.png public/assets/sargathoth-s1-walk.png out-dir

Writes out-dir/sargathoth-s1-climb-grab.png (5), sargathoth-s1-climb.png (8, loop), sargathoth-s1-climb-punch.png (8) and
sargathoth-s1-climb-mantle.png (9). Frames are 256x256 (SG1_NATIVE draws them: same scale and anchor as the 256x192 strips, bottom-aligned).
The belly edge sits on the wall line at frame x=WALL (the hitbox edge: 24 world units out at 120/236 world units per px).
  grab:   from standing, he tips over onto his side and slides onto the wall (rotated about the belly, so the pixels stay the base's).
  climb:  the walk strip rotated 90 degrees counter-clockwise, exact pixels, no resampling.
  punch:  the crawl pose draws back off the wall, then the whole mass lunges in (flash on frame 4).
  mantle: tips back upright as he slides off the wall onto the roof, settling to the base.
"""
import math, sys, numpy as np
from PIL import Image
base_p, walk_p, out = sys.argv[1], sys.argv[2], sys.argv[3]; FW, FH, CH = 256, 192, 256
base = Image.open(base_p).convert('RGBA'); assert base.size == (FW, FH), base.size
walk = Image.open(walk_p).convert('RGBA'); assert walk.size == (FW * 8, FH), walk.size
WALL = 175; PX = 128; MID = 137         # belly mid-point on the wall: x, y (the column is 236 long, bottom-aligned)
B0 = (PX, CH)                            # belly mid-point standing on the floor of the cell

def cell(img):
    c = Image.new('RGBA', (FW, CH)); c.paste(img, (0, CH - FH)); return c

def put(img, angle, t, dx=0, dy=0, flash=0.):
    """Tip `img` (a 256x192 frame) counter-clockwise by `angle` about its belly, travelling a fraction t of the way to the wall."""
    c = cell(img)
    c = c.rotate(angle, resample=Image.NEAREST, center=B0, translate=(round((WALL - PX) * t + dx), round((MID - CH) * t + dy)))
    if flash:
        a = np.asarray(c).copy(); m = a[..., 3] > 0; a[m, :3] = np.clip(a[m, :3].astype(float) + flash * 70, 0, 255).astype(np.uint8); c = Image.fromarray(a)
    return c

def ease(t): return t * t * (3 - 2 * t)
def frame(strip, i): return strip.crop((i * FW, 0, (i + 1) * FW, FH))
def clinging(i): return put(frame(walk, i), 90, 1)

def grab(i):
    t = [.15, .4, .65, .85, 1.][i]; return put(frame(walk, i), 90 * ease(t), ease(t), dy=-10 * math.sin(math.pi * t))
def climb(i): return clinging(i)
def punch(i):
    dx = [0, 3, 5, -4, -2, 0, 0, 0][i]; return put(frame(walk, i), 90, 1, dx=dx, flash=[0, 0, 0, 1., .5, 0, 0, 0][i])
def mantle(i):
    t = [0, .12, .27, .43, .58, .72, .85, .95, 1.][i]; s = ease(t)
    return put(frame(walk, i % 8) if t < 1 else base, 90 * (1 - s), 1 - s, dy=-14 * math.sin(math.pi * t))

for name, fn, n in (('grab', grab, 5), ('', climb, 8), ('punch', punch, 8), ('mantle', mantle, 9)):
    strip = np.zeros((CH, FW * n, 4), np.uint8)
    for i in range(n):
        f = np.asarray(fn(i)); strip[:, i * FW:(i + 1) * FW] = f; a = f[..., 3]
        assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'{name or "climb"} frame {i} touches the cell edge'
        if name == '':
            right = int(np.nonzero(a.any(0))[0].max()); assert abs(right - WALL) <= 3, f'climb frame {i}: belly edge at {right}, wall line {WALL}'
    Image.fromarray(strip).save(f'{out}/sargathoth-s1-climb{"-" + name if name else ""}.png', optimize=True); print(name or 'climb', strip.shape)
