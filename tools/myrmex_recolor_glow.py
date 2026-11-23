#!/usr/bin/env python3
"""Recolour Myrmex's stinger-tip glow from orange/yellow (it read as fire) to purple venom in a finished strip.

Usage: python3 tools/myrmex_recolor_glow.py strip.png glow-map.png out.png [--wings wing-map.png] [--grow 2] [--hue 290]

The glow's colours match his wing membrane, so it is found by place: glow-map.png is the same strip rendered by
`tools/myrmex_s2_rig.py --glow-only` (only the glow pixels, posed exactly as the strip was). Within that map grown by --grow
px, every orange-to-yellow pixel (hue 5-62, saturation >= .55, lightness >= .3) and every near-white one is turned to
--hue at its own lightness, so the white-hot core becomes a pale lavender core and the orange rim a deep magenta-purple.
With --wings (the strip rendered with --wings-only), pixels within 1px of a wing are left alone, so a stinger tucked
against a wing doesn't tint it. Prints how many pixels each frame changed.
"""
import argparse, colorsys, numpy as np
from PIL import Image
from scipy import ndimage as nd
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('glow'); ap.add_argument('out')
ap.add_argument('--grow', type=int, default=2); ap.add_argument('--wings', help='the strip rendered with --wings-only: pixels the wings cover are never recoloured'); ap.add_argument('--hue', type=float, default=290); ap.add_argument('--frame-w', type=int, default=256)
a = ap.parse_args()
im = np.asarray(Image.open(a.src).convert('RGBA')).copy(); gl = np.asarray(Image.open(a.glow).convert('RGBA'))
if gl.shape != im.shape: raise SystemExit(f'size mismatch: strip {im.shape} vs glow map {gl.shape}')
FW = a.frame_w; n = im.shape[1] // FW; counts = []
wg = np.asarray(Image.open(a.wings).convert('RGBA'))[..., 3] > 0 if a.wings else np.zeros(im.shape[:2], bool)
for f in range(n):
    sl = (slice(None), slice(f * FW, (f + 1) * FW))
    zone = nd.binary_dilation(gl[sl][..., 3] > 0, np.ones((3, 3)), iterations=a.grow) if (gl[sl][..., 3] > 0).any() else None
    c = 0
    if zone is not None:
        fr = im[sl]
        keep_off = nd.binary_dilation(wg[sl], np.ones((3, 3))) if wg[sl].any() else wg[sl]
        for y, x in zip(*np.nonzero(zone & (fr[..., 3] > 0) & ~keep_off)):
            r, g, b = fr[y, x, :3] / 255; h, l, s = colorsys.rgb_to_hls(r, g, b); h *= 360
            if (5 <= h <= 62 and s >= .55 and l >= .3) or l >= .85:
                nr, ng, nb = colorsys.hls_to_rgb(a.hue / 360, l, min(s, .9) if l < .85 else .9)
                fr[y, x, :3] = [round(v * 255) for v in (nr, ng, nb)]; c += 1
    counts.append(c)
Image.fromarray(im).save(a.out, optimize=True)
print(f'{a.out}: recoloured {counts}')
