#!/usr/bin/env python3
"""Build Sargathoth Stage 1's base sprite and its idle / walk strips (procedural: he is a limbless mound, so there is nothing for
a skeleton to drive; every frame is an inverse-mapped, nearest-neighbour warp of the base, so the palette and pixel grid never change).

Usage: python3 -I tools/sargathoth_s1_anim.py source.png out-dir

Writes out-dir/sargathoth-s1.png (256x192 base, feet on row 191), sargathoth-s1-idle.png (8 frames) and sargathoth-s1-walk.png (8 frames).
  idle: slow swell and settle (heap breathes from the ground up), fronds sway with a lag that grows with height, eyes pulse.
  walk: a lumbering heave. A pedal wave runs along the heap's underside (it rises and falls in x, moving right, like a slug), the body
        stretches low and lunges forward then bunches back up, the crown trails the base, fronds flap behind.
"""
import math, sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; FW, FH, N, COLORS, BODY_W = 256, 192, 8, 40, 236

# ---- base: crop to the art, drop to native pixel size, quantise to a small palette, hard alpha -----------------------------------
im = Image.open(src).convert('RGBA'); bb = im.getchannel('A').point(lambda v: 255 if v > 127 else 0).getbbox(); im = im.crop(bb)
h = round(im.height * BODY_W / im.width)
# eyes: the two bright lime slits (in the source's face area only; frond highlights are the same green). Quantising and the nearest-
# neighbour drop would lose them, so find them at full size, box-average the mask down and repaint them after quantising.
f = np.asarray(im).astype(int); fy, fx = np.mgrid[0:im.height, 0:im.width]; ex, ey = fx + bb[0], fy + bb[1]
em = (f[..., 3] > 0) & (f[..., 1] > 200) & (f[..., 0] < 190) & (f[..., 2] < 90) & (ex > 960) & (ex < 1230) & (ey > 440) & (ey < 560)
eye_small = np.asarray(Image.fromarray((em * 255).astype(np.uint8)).resize((BODY_W, h), Image.BOX)) > 60
im = im.resize((BODY_W, h), Image.NEAREST)
a = np.asarray(im).copy(); solid = a[..., 3] >= 128
q = Image.fromarray(a[..., :3]).quantize(COLORS, Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
a[..., :3] = np.asarray(q); a[..., 3] = np.where(solid, 255, 0); a[~solid] = 0
a[eye_small] = (140, 255, 20, 255)
base = np.zeros((FH, FW, 4), np.uint8); x0 = (FW - BODY_W) // 2; base[FH - h:, x0:x0 + BODY_W] = a
Image.fromarray(base).save(f'{out}/sargathoth-s1.png', optimize=True)
top = int(np.nonzero(base[..., 3].any(1))[0].min()); H = FH - top           # heap height; ground is row FH (bottom edge)
cols = np.nonzero(base[..., 3].any(0))[0]; cx = (cols.min() + cols.max()) / 2
gy, gx = np.mgrid[0:FH, 0:FW]; yc = gy + .5; xc = gx + .5

# glowing eyes: the two bright green clusters, pulsed by brightening/dimming only those pixels
r, g, b = (base[..., k].astype(int) for k in range(3))
eye = (base[..., 3] > 0) & (r == 140) & (g == 255) & (b == 20)
def render(sx, sy, pulse=0.):
    ix = np.floor(sx).astype(int); iy = np.floor(sy).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < FW) & (iy < FH); o = np.zeros_like(base); o[ok] = base[iy[ok], ix[ok]]
    if pulse:
        e = np.zeros((FH, FW), bool); e[ok] = eye[iy[ok], ix[ok]]
        o[e, :3] = np.clip(o[e, :3].astype(float) * (1 + pulse) + (pulse > 0) * pulse * 60, 0, 255).astype(np.uint8)
    return o
hn = np.clip((FH - yc) / H, 0, 1)                                              # 0 at the ground, 1 at the crown

def idle(t):
    p = 2 * math.pi * t / N
    sv = 1 + .05 * math.sin(p)                                                 # swell: heap grows taller, a touch narrower
    sh = 1 - .012 * math.sin(p)
    sway = 4.2 * hn ** 1.6 * np.sin(p - 1.6 * hn) + .8 * hn * np.sin(2 * p + 2.4 * hn)   # crown lags the base
    sy = FH - (FH - yc) / sv
    sx = cx + (xc - cx - sway) / sh
    return render(sx, sy, .25 * math.sin(p + .8))

def walk(t):
    p = 2 * math.pi * t / N
    heave = math.sin(p)                                                          # +1 stretched/lunging, -1 bunched up
    sv = 1 - .09 * heave                                                         # low and long when lunging, tall when bunched
    sh = 1 + .06 * heave
    lean = 9 * hn ** 1.3 * (np.sin(p - .9 * hn) * .5 + .5) - 2                # crown trails the base: forward at the lunge
    lean += 2.4 * hn ** 2 * np.sin(2 * p - 2 * hn)                             # fronds flap behind
    u = (xc - cx) / (BODY_W / 2)
    # pedal wave: ground-contact ripple moving right (travelling +x), strongest low down, fading towards the crown
    wave = .13 * np.sin(2 * math.pi * (u * 1.5 - t / N)) * np.exp(-hn * 3.2)
    sy = FH - (FH - yc) / ((sv) * (1 + wave))
    sx = cx + (xc - cx - lean - 3.0 * heave * (1 - hn)) / sh
    return render(sx, sy, .2 * math.sin(p + .4))

for name, fn in (('idle', idle), ('walk', walk)):
    strip = np.zeros((FH, FW * N, 4), np.uint8)
    for i in range(N): strip[:, i * FW:(i + 1) * FW] = fn(i)
    Image.fromarray(strip).save(f'{out}/sargathoth-s1-{name}.png', optimize=True); print(name, strip.shape)
