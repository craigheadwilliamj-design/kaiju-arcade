#!/usr/bin/env python3
"""Erase thin wall/ledge lines PixelLab draws next to a climbing kaiju.

Usage: python3 tools/erase_wall_lines.py in.png out.png [--frame-w 256] [--min 8] [--dark 170]

A dark pixel (R+G+B < --dark) is part of a wall line when it sits in a straight run of at least --min dark pixels (vertical or
horizontal) that is at most 2px thick with clear space on both sides (a 1px line has both neighbours clear; a 2px one is clear 1px
on one side and 2px on the other). A limb's outline has the limb on its inner side, so it survives. Prints how many pixels each frame lost.
"""
import argparse, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--frame-w', type=int, default=256); ap.add_argument('--min', type=int, default=8); ap.add_argument('--dark', type=int, default=170)
a = ap.parse_args()
im = np.asarray(Image.open(a.src).convert('RGBA')).copy(); FW = a.frame_w; out = []
for f in range(im.shape[1] // FW):
    fr = im[:, f * FW:(f + 1) * FW]; H, W = fr.shape[:2]
    dark = (fr[..., 3] > 0) & (fr[..., :3].astype(int).sum(-1) < a.dark)
    op = fr[..., 3] > 0; kill = np.zeros_like(dark)
    for axis in (0, 1):   # 0: vertical runs, 1: horizontal runs
        d = dark if axis == 0 else dark.T; o = op if axis == 0 else op.T; k = np.zeros_like(d)
        for c in range(d.shape[1]):
            col = d[:, c]; r = 0
            while r < len(col):
                if not col[r]: r += 1; continue
                e = r
                while e < len(col) and col[e]: e += 1
                if e - r >= a.min:
                    clear = lambda cc: (o[r:e, cc].mean() if 0 <= cc < d.shape[1] else 0) < .4
                    # at most 2px thick with clear space on BOTH sides (a leg's outline has the leg on its inner side)
                    if (clear(c - 1) and (clear(c + 1) or clear(c + 2))) or (clear(c + 1) and clear(c - 2)): k[r:e, c] = True
                r = e
        kill |= k if axis == 0 else k.T
    fr[kill] = 0; out.append(int(kill.sum()))
Image.fromarray(im).save(a.out, optimize=True); print(f'{a.out}: erased {out}')
