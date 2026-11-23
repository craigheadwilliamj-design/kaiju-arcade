#!/usr/bin/env python3
"""Redraw a sprite strip's frames with PixelLab's /edit-animation-v2 (a text edit applied consistently across frames).

Usage: python3 tools/pixellab_edit_animation.py in-strip.png out-strip.png "edit description" \
           [--frames 0,1,2,3] [--batch 4] [--seed 0] [--palette sprite.png] [--frame-w 256]

Each frame is cropped to the union bounding box of the opaque pixels across the chosen frames (frames over 80px go 4 to
a request), sent in batches of --batch, and pasted back in place, so the strip keeps its frame size and alignment.
--palette locks every output pixel to the colours of that image (up to 256), which keeps separate batches from drifting.
Frames not listed in --frames are copied through unchanged. In a Claude Code cloud session the token is injected by the
network proxy.
"""
import argparse, base64, io, time, numpy as np
from PIL import Image
from pixellab_animate import call
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('description')
ap.add_argument('--frames'); ap.add_argument('--batch', type=int, default=4); ap.add_argument('--seed', type=int, default=0)
ap.add_argument('--palette'); ap.add_argument('--frame-w', type=int, default=256)
a = ap.parse_args()
im = Image.open(a.src).convert('RGBA'); FW = a.frame_w; n = im.width // FW; H = im.height
idx = [int(i) for i in a.frames.split(',')] if a.frames else list(range(n))
frames = [im.crop((i * FW, 0, i * FW + FW, H)) for i in range(n)]
alpha = np.zeros((H, FW), bool)
for i in idx: alpha |= np.asarray(frames[i])[..., 3] > 0
ys, xs = np.nonzero(alpha); box = tuple(int(v) for v in (max(xs.min() - 2, 0), max(ys.min() - 2, 0), min(xs.max() + 3, FW), min(ys.max() + 3, H)))
bw, bh = box[2] - box[0], box[3] - box[1]
pal = None
if a.palette:
    p = np.asarray(Image.open(a.palette).convert('RGBA')); cols = np.unique(p[p[..., 3] > 0][:, :3], axis=0)
    if len(cols) > 256:   # keep the 256 most used
        u, c = np.unique(p[p[..., 3] > 0][:, :3], axis=0, return_counts=True); cols = u[np.argsort(-c)[:256]]
    pal = {'colors': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cols]}
b64 = lambda f: base64.b64encode((lambda b: (f.save(b, 'PNG'), b.getvalue())[1])(io.BytesIO())).decode()
out = [f.copy() for f in frames]
for s in range(0, len(idx), a.batch):
    chunk = idx[s:s + a.batch]
    body = {'description': a.description, 'image_size': {'width': bw, 'height': bh}, 'seed': a.seed, 'no_background': True,
            'frames': [{'image': {'type': 'base64', 'format': 'png', 'base64': b64(frames[i].crop(box))}, 'size': {'width': bw, 'height': bh}} for i in chunk]}
    if pal: body['target_palette'] = pal
    job = call('POST', '/edit-animation-v2', body)['background_job_id']
    while (j := call('GET', f'/background-jobs/{job}'))['status'] == 'processing': time.sleep(6)
    if j['status'] != 'completed': raise SystemExit(f"job {job} {j['status']}: {str(j.get('last_response'))[:300]}")
    imgs = [Image.open(io.BytesIO(base64.b64decode(x['base64'] if isinstance(x, dict) else x))).convert('RGBA') for x in j['last_response']['images']]
    for i, g in zip(chunk, imgs):
        if g.size != (bw, bh): g = g.resize((bw, bh), Image.NEAREST)
        f = Image.new('RGBA', (FW, H)); f.paste(g, box[:2]); out[i] = f
    print(f'frames {chunk}: done, usage {j.get("usage")}')
strip = Image.new('RGBA', (FW * n, H))
for i, f in enumerate(out): strip.paste(f, (i * FW, 0))
strip.save(a.out, optimize=True); print(f'{a.out}: {n} frames, {len(idx)} edited, crop {bw}x{bh} at {box[:2]}')
