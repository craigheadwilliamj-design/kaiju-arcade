#!/usr/bin/env python3
"""Belial Stage 3 restyle: pull the Stage 3 render onto the Stage 1/2 palette and finish.
Usage: python3 -I tools/belial_s3_restyle.py in.png out.png [--colours 48]

The render came out olive (hue ~54, sat .29) with saturated rust spines/stripes (sat .54), a yellow-orange gland and ~6000 colours
of glossy shading; Stage 2 is grey-green (hue 95, sat .14) with umber-grey spines/stripes (hue 24, sat .22), a yellow-green lime
gland/drool/claws (hue 68, sat .7) and far fewer shades. Classes, keeping each pixel's lightness:
  crystals  hue 290..350, sat > .3            -> untouched (the Stage 3 marker)
  lime      hue 35..95, sat >= .5, light > .25 -> hue 68, sat .7, lightness x.85 (gland, drool, claws)
  rust      hue < 35 or > 350, sat > .2        -> hue 24, sat .22, lightness x.95 (spines, stripes)
  hide      everything else not near-black      -> hue 95, sat .14, lightness x1.12
Then the whole sprite is median-cut to --colours (no dither) to flatten the gloss. Outline (lightness < .1) is untouched.
"""
import argparse, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recolor_hls import hls, torgb

def restyle(a, colours=48):
    a = a.copy(); h, l, s = hls(a); op = a[..., 3] > 127; dark = l < .1
    crys = op & ~dark & (h >= 290) & (h <= 350) & (s > .3)
    lime = op & ~dark & (h >= 35) & (h <= 95) & (s >= .5) & (l > .25)
    rust = op & ~dark & ~crys & ((h < 35) | (h > 350)) & (s > .2)
    hide = op & ~dark & ~crys & ~lime & ~rust
    for m, (H, S, k) in [(hide, (95, .14, 1.12)), (rust, (24, .22, .95)), (lime, (68, .7, .85))]:
        new = torgb(H, S, np.clip(l * k, 0, 1)); a[..., :3] = np.where(m[..., None], np.round(new * 255), a[..., :3]).astype(np.uint8)
    if colours:
        q = np.asarray(Image.fromarray(a[..., :3]).quantize(colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
        a[..., :3] = q
    a[~op] = 0
    return a

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--colours', type=int, default=48)
    o = ap.parse_args()
    Image.fromarray(restyle(np.asarray(Image.open(o.src).convert('RGBA')), o.colours)).save(o.out, optimize=True)
