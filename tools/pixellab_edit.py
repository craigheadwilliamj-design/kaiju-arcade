#!/usr/bin/env python3
"""Edit a sprite with PixelLab's Pixen image-edit endpoint (/edit-image-pixen) and save the result.

Usage:
  python3 tools/pixellab_edit.py src.png out.png "make him an older, massive, heavily armoured version..." \
      [--seed 7] [--width 256 --height 192]

Pixen keeps the source's pose, composition and pixel style and changes only what the prompt asks for, so it is how
a new stage's base is made when there's no render for it (Belial Stage 1 from the Stage 2 base, Stage 3 likewise).
src.png must be <=256 per side with sides a multiple of 4 (pad with transparency, never rescale). The result comes
back on a transparent background at the target canvas size (default: the source's). Same auth as
pixellab_animate.py: in a Claude Code cloud session the proxy injects the token.
"""
import argparse, base64, io, time
from PIL import Image
from pixellab_animate import call

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('description')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--width', type=int); ap.add_argument('--height', type=int)
    a = ap.parse_args()
    body = {'image': {'type': 'base64', 'format': 'png', 'base64': base64.b64encode(open(a.src, 'rb').read()).decode()},
            'description': a.description, 'seed': a.seed, 'no_background': True}
    if a.width: body['width'] = a.width
    if a.height: body['height'] = a.height
    r = call('POST', '/edit-image-pixen', body)
    job = r['background_job_id']
    while (j := call('GET', f'/background-jobs/{job}'))['status'] == 'processing':
        time.sleep(5)
    if j['status'] != 'completed':
        raise SystemExit(f"job {job} {j['status']}: {j.get('last_response')}")
    res = j['last_response']
    img = res.get('image') or (res.get('images') or [None])[0]
    Image.open(io.BytesIO(base64.b64decode(img['base64'] if isinstance(img, dict) else img))).convert('RGBA').save(a.out)
    print(f'{a.out}: usage {j.get("usage")}')

if __name__ == '__main__':
    main()
