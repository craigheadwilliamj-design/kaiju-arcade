#!/usr/bin/env python3
"""Losslessly shrink sprite PNGs in place. Run it on new strips before committing them.

Usage: python3 tools/optimize_sprites.py [--check] [sprite.png ...]     (default: every PNG in public/assets)

A strip with at most 256 distinct RGBA colours is re-saved as an indexed PNG (palette + per-entry alpha); the rest are only
recompressed. Every result is decoded again and compared pixel for pixel with the original (RGB under transparent pixels included),
and a file is replaced only when it is identical and smaller. --check reports what would change without writing."""
import glob, io, os, sys
from PIL import Image

def indexed(im):
    colours = im.getcolors(maxcolors=256)
    if colours is None: return None
    palette = [c for _, c in colours]; index = {c: i for i, c in enumerate(palette)}
    raw = im.tobytes(); out = Image.new('P', im.size); out.putdata([index[tuple(raw[i:i + 4])] for i in range(0, len(raw), 4)])
    out.putpalette([v for c in palette for v in c[:3]])
    out.info['transparency'] = bytes(c[3] for c in palette)
    return out

def encode(im, **kw):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True, **kw); return b.getvalue()

args = [a for a in sys.argv[1:] if a != '--check']; check = '--check' in sys.argv
files = args or sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', '*.png')))
before = after = changed = 0
for f in files:
    raw = open(f, 'rb').read(); im = Image.open(io.BytesIO(raw)).convert('RGBA'); pixels = im.tobytes(); best = raw
    p = indexed(im)
    for data in ([encode(p, transparency=p.info['transparency'])] if p else []) + [encode(im)]:
        if len(data) < len(best) and Image.open(io.BytesIO(data)).convert('RGBA').tobytes() == pixels: best = data
    before += len(raw); after += len(best)
    if best is not raw:
        changed += 1
        if not check: open(f, 'wb').write(best)
print(f"{'would shrink' if check else 'shrank'} {changed}/{len(files)} files: {before/1e6:.2f} MB -> {after/1e6:.2f} MB")
