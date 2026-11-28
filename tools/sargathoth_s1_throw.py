#!/usr/bin/env python3
"""Assemble Sargathoth's throw strip from a PixelLab clip (tools/pixellab_animate.py, PixMiniMax). The prop leaves on the key press, so the strip
starts already mid-throw: PixelLab's frame 0 (the idle base) is dropped, the clip's 7 frames follow (a kelp tentacle erupts from the crown, snaps
forward and up in an overhand whip, flicks open at full extension and recoils) and the base is appended as the settle frame.

Clip (first.png is the halved base at x=24, 256x192, the SG1_LEFT layout: git show e115616^:public/assets/sargathoth-s1-left.png):
  python3 tools/pixellab_animate.py first.png throw.png "a thick kelp tentacle erupts from the top of the mound and snaps forward and up in a hard overhand throwing whip, its tip flicking open at full extension, then recoils and sinks back into the mound; the mound itself stays still" --frames 8 --subject "a giant mound of seaweed and kelp grown through maritime debris, with glowing green eyes" --pose "a low heap of kelp facing right" --last first.png

Usage: python3 -I tools/sargathoth_s1_throw.py throw.png first.png out-dir     Writes out-dir/sargathoth-s1-throw.png (8 frames).
"""
import sys, numpy as np
from PIL import Image
clip_p, first_p, out = sys.argv[1:4]; FW, FH = 256, 192
clip = Image.open(clip_p).convert('RGBA'); first = Image.open(first_p).convert('RGBA'); assert clip.size == (FW * 8, FH) and first.size == (FW, FH)
frames = [clip.crop((i * FW, 0, (i + 1) * FW, FH)) for i in range(1, 8)] + [first]
strip = Image.new('RGBA', (FW * 8, FH))
for i, f in enumerate(frames):
    strip.paste(f, (i * FW, 0)); a = np.asarray(f)[..., 3]
    assert not a[:, 0].any() and not a[:, -1].any() and not a[0].any(), f'frame {i} touches the cell edge'
strip.save(f'{out}/sargathoth-s1-throw.png', optimize=True); print('throw', strip.size)
