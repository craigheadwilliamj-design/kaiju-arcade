#!/usr/bin/env python3
"""Animate a sprite with PixelLab's PixMiniMax endpoint and write a horizontal sprite strip.

Usage:
  PIXELLAB_TOKEN=... python3 tools/pixellab_animate.py first.png out-strip.png "idle breathing loop..." \
      --frames 8 --subject "a giant purple porcupine-mole kaiju" --pose "crouched on all fours facing right"

first.png must be <=256x256 with a transparent background. The API returns frame_count+1 frames
(index 0 is the input); the last frame is dropped only when it duplicates the first, so the strip loops cleanly. In a Claude Code cloud
session the token is injected by the network proxy, so PIXELLAB_TOKEN can be any placeholder.
"""
import argparse, base64, io, json, os, time, urllib.request
import numpy as np
from PIL import Image

API = 'https://api.pixellab.ai/v2'

def call(method, path, body=None):
    # 429 means too many jobs in flight at once (several strips generated in parallel): back off and retry.
    for wait in (15, 30, 60, 120, 240, 0):
        req = urllib.request.Request(API + path, method=method,
            data=json.dumps(body).encode() if body else None,
            headers={'Content-Type': 'application/json',
                     'Authorization': 'Bearer ' + os.environ.get('PIXELLAB_TOKEN', 'proxy-injected')})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or not wait: raise SystemExit(f'{method} {path}: HTTP {e.code} {e.read().decode()[:300]}')
            time.sleep(wait)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('first'); ap.add_argument('out'); ap.add_argument('motion')
    ap.add_argument('--frames', type=int, default=8, help='multiple of 4; the strip gets this many new frames after the input frame')
    ap.add_argument('--subject'); ap.add_argument('--pose')
    ap.add_argument('--direction', default='east'); ap.add_argument('--view', default='side')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--last', help='optional end pose (same size); pass the first frame again to force a closed loop')
    a = ap.parse_args()
    body = {'first_frame': {'type': 'base64', 'format': 'png', 'base64': base64.b64encode(open(a.first, 'rb').read()).decode()},
            'description': a.motion, 'frame_count': a.frames, 'no_background': True,
            'direction': a.direction, 'view': a.view, 'seed': a.seed}
    if a.subject: body['subject_description'] = a.subject
    if a.pose: body['initial_pose'] = a.pose
    if a.last: body['last_frame'] = {'type': 'base64', 'format': 'png', 'base64': base64.b64encode(open(a.last, 'rb').read()).decode()}
    job = call('POST', '/animate-pixminimax', body)['background_job_id']
    while (j := call('GET', f'/background-jobs/{job}'))['status'] == 'processing':
        time.sleep(6)
    if j['status'] != 'completed':
        raise SystemExit(f"job {job} {j['status']}: {j.get('last_response')}")
    frames = [Image.open(io.BytesIO(base64.b64decode(i['base64'] if isinstance(i, dict) else i))).convert('RGBA')
              for i in j['last_response']['images']]
    # Drop the final frame only if it duplicates the first (idle-style loops); otherwise it is the
    # in-between step that closes the loop (walk cycles) and must be kept.
    px = [np.asarray(f, dtype=np.int32) for f in frames]
    steps = sorted(int(np.abs(px[n + 1] - px[n]).sum()) for n in range(len(px) - 1))
    if int(np.abs(px[-1] - px[0]).sum()) < 0.5 * steps[len(steps) // 2]:
        frames = frames[:-1]
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h))
    for n, f in enumerate(frames): strip.paste(f, (n * w, 0))
    strip.save(a.out, optimize=True)
    print(f'{a.out}: {len(frames)} frames of {w}x{h}, usage {j.get("usage")}')

if __name__ == '__main__':
    main()
