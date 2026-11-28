#!/usr/bin/env python3
"""Build Sargathoth Stage 1's grab strip and print the carry hold points. He has no limbs, so a thick frond lashes out from the front of his
crown, snags the prop at his feet and hauls it up onto the top of the mound, where he carries it (the carry strips are his idle and walk).
Same pixel grid as the Undertow strips: the halved base at x=24 in a 256x192 frame (the SG1_LEFT layout), the frond drawn on that grid.

Usage: python3 -I tools/sargathoth_s1_grab.py public/assets/sargathoth-s1.png public/assets/sargathoth-s1-idle.png public/assets/sargathoth-s1-walk.png out-dir [preview.gif]
Writes out-dir/sargathoth-s1-grab.png (9 frames) and prints the `hold` arrays for the grab, carry (idle) and carry-walk (walk) strips.
  0-2: the frond rears back, then whips out over the prop.   3-4: it slams down on the prop and coils round it.
  5-8: it hauls the prop up the front of the mound and lays it on the crown.
"""
import sys, numpy as np
from PIL import Image
src, idle_p, walk_p, out = sys.argv[1:5]; FW, FH, W, X0 = 256, 192, 118, 24
b = Image.open(src).convert('RGBA'); b = b.crop(b.getchannel('A').getbbox()); H0 = round(b.height * W / b.width)
b = b.resize((W, H0), Image.NEAREST); base = np.zeros((FH, FW, 4), np.uint8); base[FH - H0:, X0:X0 + W] = np.asarray(b)
YY, XX = np.mgrid[0:FH, 0:FW]
BLACK, OLIVE, LIGHT, DARK = (0, 0, 0, 255), (114, 121, 32, 255), (165, 164, 13, 255), (25, 67, 60, 255)   # from the base's own kelp greens
ROOT = (112, 160); SPOT = (152, 188)                  # where the frond leaves the mound; where the prop waits on the street (~66 world units ahead)
TOP = min(int(np.nonzero(base[:, 60:110, 3].any(1))[0].min()), FH)   # crown top row of the halved base
CROWN = (88, TOP + 6)                                   # the prop's resting point, lowered into the fronds

def bez(p0, p1, p2, n=40):
    t = np.linspace(0, 1, n)[:, None]; return (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + t ** 2 * np.array(p2)

def frond(f, tip, ctrl, coil=0.):
    """A tapering kelp arm from ROOT to tip along a quadratic curve: black outline, olive body, dark underside, bright upper edge."""
    pts = bez(ROOT, ctrl, tip); n = len(pts)
    for layer, grow in ((BLACK, 1.6), (DARK, 0.), (OLIVE, -1.6), (LIGHT, -3.4)):
        for k, (x, y) in enumerate(pts):
            r = (7.0 - 3.0 * k / (n - 1)) * (1 + coil * .25 * (k / n)) + grow
            if r <= 0: continue
            off = -1.5 if layer is LIGHT else (-.5 if layer is OLIVE else 0.)
            m = (XX - x) ** 2 + (YY - (y + off)) ** 2 <= r * r
            f[m] = layer
    return f

# (tip, control) per frame; None = no frond yet. holds follow the tip once it has the prop.
FR = [None,
      ((128, 140), (104, 138)),                     # rears up and back
      ((166, 160), (146, 134)),                     # whips out over the prop
      ((SPOT[0] + 2, SPOT[1] - 2), (168, 168)),     # slams down on it
      ((SPOT[0], SPOT[1]), (170, 176)),             # coils round it
      ((SPOT[0] - 2, SPOT[1] - 8), (166, 170)),     # tightens and lifts
      ((140, 168), (156, 168)),                     # hauls it up the front
      ((118, 150), (134, 160)),
      (CROWN, (110, 150))]                          # lays it on the crown
HOLD = [list(SPOT)] * 5 + [list(FR[5][0]), list(FR[6][0]), list(FR[7][0]), list(CROWN)]
frames = []
for i, d in enumerate(FR):
    f = base.copy()
    if d: frond(f, d[0], d[1], coil=1 if i in (3, 4) else 0)
    frames.append(f)
strip = np.zeros((FH, FW * 9, 4), np.uint8)
for i, f in enumerate(frames):
    strip[:, i * FW:(i + 1) * FW] = f; a = f[..., 3]
    assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'frame {i} touches the cell edge'
Image.fromarray(strip).save(f'{out}/sargathoth-s1-grab.png', optimize=True)
print('grab hold', HOLD)

def tops(path, n):
    im = np.asarray(Image.open(path).convert('RGBA')); assert im.shape[:2] == (FH, FW * n)
    res = []
    for i in range(n):
        a = im[:, i * FW:(i + 1) * FW, 3]; cols = np.nonzero(a.any(0))[0]; cx = int(round((cols.min() + cols.max()) / 2))
        c = a[:, cx - 18:cx + 18]; res.append([cx + 10, int(np.nonzero(c.any(1))[0].min()) + 12])
    return res
# The idle/walk strips are native size (SG1_NATIVE); the grab is on the halved grid at twice the pixel size, so the crown top matches in world units.
print('carry hold', tops(idle_p, 8)); print('carryWalk hold', tops(walk_p, 8))
if len(sys.argv) > 5:
    fr = []
    for f in frames:
        bg = Image.new('RGBA', (FW, FH), (44, 48, 66, 255)); bg.alpha_composite(Image.fromarray(f)); fr.append(bg.crop((0, 100, FW, FH)).resize((FW * 3, (FH - 100) * 3), Image.NEAREST))
    fr[0].save(sys.argv[5], save_all=True, append_images=fr[1:], duration=[70] * 8 + [600], loop=0)
