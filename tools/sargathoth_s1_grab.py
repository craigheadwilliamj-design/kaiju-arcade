#!/usr/bin/env python3
"""Assemble Sargathoth Stage 1's grab strip from two PixelLab clips and print the hold points (the carry strips reuse his idle and walk).
He has no limbs: a thick kelp tentacle rears up out of the crown, whips out to the street, coils round the prop, hauls it onto the crown
and withdraws. The art is PixelLab's (tools/pixellab_animate.py, PixMiniMax); only the stitching and hold points are done here.

Inputs (256x192 frames, the halved base at x=24: the SG1_LEFT layout; first.png is that base, git show e115616^:public/assets/sargathoth-s1-left.png):
  python3 tools/pixellab_animate.py first.png haul.png "a thick kelp tentacle rears up from the top of the mound, whips forward and down to the ground in front, coils tightly around something at ground level, then hauls it back up and lays it on top of the mound's crown; the mound itself stays still" --frames 8 --subject "a giant mound of seaweed and kelp grown through maritime debris, with glowing green eyes" --pose "a low heap of kelp facing right"
  python3 tools/pixellab_animate.py last.png tuck.png "the kelp tentacle laid over the top of the mound sinks and tucks back into the mound until only the heap remains; the mound itself stays still" --frames 4 --subject (same) --pose "a low heap of kelp with a tentacle draped over its crown" --last first.png
  (last.png is the final frame of haul.png.) Seeds are the defaults (0), so the clips regenerate the same way.

Usage: python3 -I tools/sargathoth_s1_grab.py haul.png tuck.png public/assets/sargathoth-s1-idle.png public/assets/sargathoth-s1-walk.png out-dir
Writes out-dir/sargathoth-s1-grab.png (13 frames: haul 0-8, then tuck 1-4) and prints the carry hold arrays.
Grab hold points (frame px, the prop's bottom-centre; measured on the tentacle's ball tip and checked on an overlay): the prop waits at the spot
the tentacle lands on (frames 0-2), rides the tip up the front of the mound (3-8) and rests on the crown while the tentacle withdraws (9-12).
"""
import sys, numpy as np
from PIL import Image
haul_p, tuck_p, idle_p, walk_p, out = sys.argv[1:6]; FW, FH = 256, 192
haul = Image.open(haul_p).convert('RGBA'); tuck = Image.open(tuck_p).convert('RGBA'); assert haul.size == (FW * 9, FH) and tuck.size == (FW * 5, FH)
frames = [haul.crop((i * FW, 0, (i + 1) * FW, FH)) for i in range(9)] + [tuck.crop((i * FW, 0, (i + 1) * FW, FH)) for i in range(1, 5)]
strip = Image.new('RGBA', (FW * 13, FH))
for i, f in enumerate(frames): strip.paste(f, (i * FW, 0))
strip.save(f'{out}/sargathoth-s1-grab.png', optimize=True)
HOLD = [[205, 188]] * 3 + [[221, 184], [212, 184], [170, 168], [157, 176], [152, 166], [118, 128]] + [[88, 152]] * 4
print('grab hold', HOLD)

def tops(path, n):
    im = np.asarray(Image.open(path).convert('RGBA')); assert im.shape[:2] == (FH, FW * n)
    res = []
    for i in range(n):
        a = im[:, i * FW:(i + 1) * FW, 3]; cols = np.nonzero(a.any(0))[0]; cx = int(round((cols.min() + cols.max()) / 2))
        c = a[:, cx - 18:cx + 18]; res.append([cx + 10, int(np.nonzero(c.any(1))[0].min()) + 12])
    return res
# idle/walk are native size (SG1_NATIVE) and the grab is on the halved grid at twice the pixel size: +10 px across and +12 down in native
# pixels is the crown spot (88,152) of the grab in world units.
print('carry hold', tops(idle_p, 8)); print('carryWalk hold', tops(walk_p, 8))
