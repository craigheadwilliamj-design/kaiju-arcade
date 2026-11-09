import sys, numpy as np
from PIL import Image
from PIL import ImageDraw
src, out = sys.argv[1], sys.argv[2]
THR = int(sys.argv[3]) if len(sys.argv) > 3 else 40
im = Image.open(src).convert('RGB'); p = np.asarray(im).astype(int)
dark = p.sum(2) < THR
# flood-fill the near-black background from the border only, so dark outline/interior pixels survive
mask = Image.fromarray(np.where(dark, 255, 0).astype(np.uint8))
H0, W0 = dark.shape
flood = mask.copy()
for seed in [(0,0),(W0-1,0),(0,H0-1),(W0-1,H0-1)] + [(x,0) for x in range(0,W0,64)] + [(x,H0-1) for x in range(0,W0,64)] + [(0,y) for y in range(0,H0,64)] + [(W0-1,y) for y in range(0,H0,64)]:
    if flood.getpixel(seed)==255: ImageDraw.floodfill(flood, seed, 128)
bg = np.asarray(flood)==128
a = (~bg).astype(np.uint8) * 255
rgba = np.dstack([p.astype(np.uint8), a])
img = Image.fromarray(rgba, 'RGBA')
bb = img.getbbox(); img = img.crop(bb); print('bbox', bb, img.size)
# snap to the native pixel grid (8px blocks) by sampling block centres, then fit to 256 wide
B = 8
w, h = img.size; nw, nh = round(w / B), round(h / B)
native = img.resize((nw, nh), Image.NEAREST); print('native', native.size)
tw = 256; th = round(nh * tw / nw)
fit = native.resize((tw, th), Image.NEAREST); print('fit', fit.size)
H = int(sys.argv[4]) if len(sys.argv) > 4 else 192
assert th <= H, (th, H)
frame = Image.new('RGBA', (256, H), (0, 0, 0, 0)); frame.paste(fit, (0, H - th))
frame.save(out, optimize=True); print('wrote', out, frame.size)
