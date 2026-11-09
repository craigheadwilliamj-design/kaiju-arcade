#!/usr/bin/env python3
"""Animate a sprite with PixelLab's PixMiniMax endpoint and write a horizontal sprite strip.

Usage:
  PIXELLAB_TOKEN=... python3 tools/pixellab_animate.py first.png out-strip.png "idle breathing loop..." \
      --frames 8 --subject "a giant purple porcupine-mole kaiju" --pose "crouched on all fours facing right"

first.png must be <=256x256 with a transparent background. The API returns frame_count+1 frames
(index 0 is the input); the last frame is dropped so the strip loops cleanly. In a Claude Code cloud
session the token is injected by the network proxy, so PIXELLAB_TOKEN can be any placeholder.
"""
import argparse, base64, io, json, os, time, urllib.request
from PIL import Image

API = 'https://api.pixellab.ai/v2'

def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={'Content-Type': 'application/json',
                 'Authorization': 'Bearer ' + os.environ.get('PIXELLAB_TOKEN', 'proxy-injected')})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('first'); ap.add_argument('out'); ap.add_argument('motion')
    ap.add_argument('--frames', type=int, default=8)
    ap.add_argument('--subject'); ap.add_argument('--pose')
    ap.add_argument('--direction', default='east'); ap.add_argument('--view', default='side')
    ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()
    body = {'first_frame': {'type': 'base64', 'format': 'png', 'base64': base64.b64encode(open(a.first, 'rb').read()).decode()},
            'description': a.motion, 'frame_count': a.frames, 'no_background': True,
            'direction': a.direction, 'view': a.view, 'seed': a.seed}
    if a.subject: body['subject_description'] = a.subject
    if a.pose: body['initial_pose'] = a.pose
    job = call('POST', '/animate-pixminimax', body)['background_job_id']
    while (j := call('GET', f'/background-jobs/{job}'))['status'] == 'processing':
        time.sleep(6)
    if j['status'] != 'completed':
        raise SystemExit(f"job {job} {j['status']}: {j.get('last_response')}")
    frames = [Image.open(io.BytesIO(base64.b64decode(i['base64'] if isinstance(i, dict) else i))).convert('RGBA')
              for i in j['last_response']['images']][:-1]
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h))
    for n, f in enumerate(frames): strip.paste(f, (n * w, 0))
    strip.save(a.out, optimize=True)
    print(f'{a.out}: {len(frames)} frames of {w}x{h}, usage {j.get("usage")}')

if __name__ == '__main__':
    main()
