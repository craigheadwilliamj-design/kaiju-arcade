#!/usr/bin/env python3
"""Pack sprite strips into sheets for the Artifact build (build-artifact.mjs) without touching public/assets.

Usage: python3 tools/pack_sprites.py --out DIR --format webp|png MANIFEST.json

MANIFEST.json is {"sheetName": ["assets/a.png", ...], ...}; paths are relative to public/. Each group becomes one sheet
DIR/sheetName.<ext> (shelf-packed, strips stacked in rows at most 4096 px wide; a group is split into sheetName-2... only if a
sheet would pass 8192 px tall). Prints the atlas as JSON: {"assets/a.png": ["sheetName.<ext>", x, y, w, h], ...}.

webp = lossless WebP (pixel-exact, about the size of a 256-colour PNG; Chrome, Firefox, Safari 14+).
png  = one 256-colour RGBA PNG per sheet, no dithering (mean error ~1/255 on this art), for browsers without WebP."""
import argparse, json, os
from PIL import Image

MAX_W, MAX_H = 4096, 8192
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True); ap.add_argument('--format', choices=['webp', 'png'], default='webp')
ap.add_argument('manifest')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
atlas = {}

def write(name, strips):
    # Tallest first, so each shelf row wastes little height; strips never exceed MAX_W (16 frames x 256 = 4096).
    strips.sort(key=lambda s: (-s[1].height, s[0]))
    x = y = row = 0; placed = []
    for path, im in strips:
        if x + im.width > MAX_W: y += row; x = row = 0
        placed.append((path, im, x, y)); x += im.width; row = max(row, im.height)
    sheet = Image.new('RGBA', (MAX_W if any(p[2] for p in placed) else max(i.width for _, i in strips), y + row))
    for path, im, px, py in placed:
        sheet.paste(im, (px, py)); atlas[path] = [f'{name}.{a.format}', px, py, im.width, im.height]
    dst = os.path.join(a.out, f'{name}.{a.format}')
    if a.format == 'webp': sheet.save(dst, 'WEBP', lossless=True, quality=100, method=4)
    else: sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)

for name, paths in json.load(open(a.manifest)).items():
    part, strips, height = 1, [], 0
    for path in paths:
        im = Image.open(os.path.join('public', path)).convert('RGBA')
        if strips and height + im.height > MAX_H:  # rough: rows of one strip each is the worst case
            write(name if part == 1 else f'{name}-{part}', strips); part += 1; strips, height = [], 0
        strips.append((path, im)); height += im.height * im.width / MAX_W
    if strips: write(name if part == 1 else f'{name}-{part}', strips)
print(json.dumps(atlas))
