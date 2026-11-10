#!/usr/bin/env python3
"""Shrink sprite PNGs for the single-file Artifact build (build-artifact.mjs) without touching public/assets.

Usage: python3 tools/shrink_sprites.py --out DIR --budget BYTES sprite.png [sprite.png ...]

If the sprites' combined size is over BUDGET, the largest ones are re-saved to DIR as 256-colour RGBA PNGs (no dithering)
until the total fits; sprites left under budget are not written and should be read from their original path. Prints a JSON
list of the file names that were shrunk. 256 colours is visually near-lossless for this pixel art (mean error ~1/255)."""
import argparse, json, os, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True); ap.add_argument('--budget', type=int, required=True)
ap.add_argument('files', nargs='+')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
sizes = {f: os.path.getsize(f) for f in a.files}
total, shrunk = sum(sizes.values()), []
for f in sorted(sizes, key=sizes.get, reverse=True):
    if total <= a.budget: break
    dst = os.path.join(a.out, os.path.basename(f))
    Image.open(f).convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)
    total += os.path.getsize(dst) - sizes[f]; shrunk.append(os.path.basename(f))
if total > a.budget: print(f'warning: still {total} bytes after shrinking everything', file=sys.stderr)
print(json.dumps(shrunk))
