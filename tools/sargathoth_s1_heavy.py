#!/usr/bin/env python3
"""Build Sargathoth Stage 1's Undertow heavy strips (rear, hold, slam) as a breaking wave. Procedural like tools/sargathoth_s1_anim.py:
every frame is an inverse-mapped nearest-neighbour warp of the halved base, so the palette and pixel grid never change.

Usage: python3 -I tools/sargathoth_s1_heavy.py public/assets/sargathoth-s1.png out-dir [preview.gif]
Writes out-dir/sargathoth-s1-heavy-{rear,hold,slam}.png (256x192 frames, 118px mound at x=24, feet on row 191: the SG1_LEFT layout).
  rear: draws back (top leans left), then swells up into a tall column whose crest curls forward.
  hold: the cresting wave hangs and trembles.
  slam: the crest topples forward and crashes flat, spreading along the street, then rebounds and settles; debris sprays out.
"""
import sys, random, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; FW, FH, W, X0 = 256, 192, 118, 24
b = Image.open(src).convert('RGBA'); b = b.crop(b.getchannel('A').getbbox()); H0 = round(b.height * W / b.width)
b = b.resize((W, H0), Image.NEAREST); base = np.zeros((FH, FW, 4), np.uint8); base[FH - H0:, X0:X0 + W] = np.asarray(b)
solid = base[..., 3] > 0; pal = base[solid]; YY, XX = np.mgrid[0:FH, 0:FW]

def warp(rise=1., lean=0., hook=0., stretch=1., taper=0., sink=0.):
    """rise: vertical scale; lean: px the crest is pushed right (grows with height squared); hook: extra push on the top 40%;
    stretch: horizontal scale from the left edge; taper: narrows the column with height; sink: px the whole body is dropped."""
    hh = (FH - 1 - YY + sink) / rise; yf = hh / H0; ok = (yf >= 0) & (yf <= 1)
    s = lean * yf ** 2 + hook * np.clip(yf - .6, 0, 1) ** 2 * 6
    u = (XX - X0 - s) / stretch; c = W * .4; u = c + (u - c) * (1 + taper * yf)
    sx = np.rint(X0 + u).astype(int); sy = np.rint(FH - 1 - hh).astype(int)
    ok &= (sx >= 0) & (sx < FW) & (sy >= 0) & (sy < FH)
    f = np.zeros_like(base); f[ok] = base[sy[ok], sx[ok]]; return f

def spray(f, t, n, x, rng):
    """Debris flecks thrown off the crash: t = frames since impact."""
    for _ in range(n):
        vx, vy = rng.uniform(1.5, 7), rng.uniform(5, 13); px = int(x + vx * t + rng.uniform(-4, 4)); py = int(FH - 6 - (vy * t - .9 * t * t))
        if 0 <= px < FW - 1 and 0 <= py < FH - 1:
            col = pal[rng.randrange(len(pal))]; f[py:py + 2, px:px + 2] = col

def strip(frames, name):
    im = Image.new('RGBA', (FW * len(frames), FH))
    for n, f in enumerate(frames): im.paste(Image.fromarray(f), (n * FW, 0))
    im.save(f'{out}/sargathoth-s1-heavy-{name}.png', optimize=True); return im

# rear: coil back (top leans left), then rise into a column and curl the crest forward.
rear = [warp(), warp(1.3, -8, 0, 1., -.1), warp(1.9, -16, 0, 1., -.3), warp(2.4, 2, .8, 1., -.55), warp(2.8, 22, 1.7, 1., -.75)]
# hold: the crest hangs and trembles (the base crest jittering, feet planted).
hold = [warp(2.8 + dr, 22 + dl, 1.7, 1. + ds, -.75) for dr, dl, ds in ((0, 0, 0), (.06, 3, .01), (0, 6, 0), (-.06, 3, -.01))]
# slam: the crest topples forward over the base and crashes flat, then rebounds and settles.
SL = [dict(rise=2.8, lean=30, hook=2., taper=-.75), dict(rise=2.1, lean=56, hook=2.4, stretch=1.1, taper=-.6), dict(rise=1.3, lean=72, hook=1.6, stretch=1.35, taper=-.3),
      dict(rise=.6, lean=55, stretch=1.8), dict(rise=.42, lean=25, stretch=1.95), dict(rise=.7, lean=8, stretch=1.5, taper=.1), dict(rise=1.12, stretch=1.15, taper=0),
      dict(rise=.93, stretch=1.02), dict()]
rng = random.Random(7); slam = []
for n, p in enumerate(SL):
    f = warp(**p)
    if 3 <= n <= 7: spray(f, n - 2, [16, 12, 8, 5, 3][n - 3], X0 + W * .9 + 50, rng)
    slam.append(f)
strip(rear, 'rear'); strip(hold, 'hold'); strip(slam, 'slam')
if len(sys.argv) > 3:
    seq = [(f, 50) for f in rear] + [(f, 100) for f in hold] * 3 + [(f, 56) for f in slam] + [(slam[-1], 500)]; fr = []
    for f, d in seq:
        bg = Image.new('RGBA', (FW, FH), (44, 48, 66, 255)); bg.alpha_composite(Image.fromarray(f)); fr.append(bg.crop((0, 20, FW, FH)).resize((FW * 4, (FH - 20) * 4), Image.NEAREST).convert('P', palette=Image.ADAPTIVE, colors=128))
    fr[0].save(sys.argv[3], save_all=True, append_images=fr[1:], duration=[d for _, d in seq], loop=0, disposal=2)
