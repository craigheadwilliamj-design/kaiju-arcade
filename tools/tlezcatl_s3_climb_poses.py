#!/usr/bin/env python3
"""Script the skeleton poses for Tlézcatl Stage 3's climb set (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/tlezcatl_s3_climb_poses.py OUTDIR [STRIPS]   (shipped: OUTDIR)

Reads tools/tlezcatl-s3-skeleton.json with the walk's corrections (see tools/tlezcatl_s3_light_poses.py) and poses him in FINAL
frame coordinates (the unshifted base, TZ3_NATIVE anchor 127.5), so no shifting is needed afterwards. The wall is the vertical
line x = WALL (the hitbox edge 24 world units out: 24 / (120/181) = 36px right of the anchor); the claws grip it. Cling pose: the
body upright against the wall, hips low, near arm and far arm reaching up the wall, feet gripping it below, head turned up the wall,
the tail left to hang (the skeleton has no tail joints). Writes OUTDIR/{climbGrab,climb,climbPunch,climbMantle}.json ({first,
frames}) and *_sheet.png stick-figure previews; `first` is the base's standing skeleton for the grab and the cling pose for the rest.
  climbGrab: 5 frames, standing base -> leap onto the wall (blend with a hop), ends on the cling pose.
  climb: 8 frames, hand over hand: the hands alternate up the wall (lifting off it while they move up), the feet step opposite,
         the hips bob; closed on the cling pose.
  climbPunch: 8 frames from the cling: the near arm winds back off the wall (frames 1-3), drives into it (impact frame 5), recovers.
  climbMantle: 9 frames from the cling (shifted back 22px: the game slides him 0.3 body widths onto the roof) hauling over the edge
         and standing up on the base pose.
Run from the repo root.
"""
import json, math, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]; ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
kp = json.load(open('tools/tlezcatl-s3-skeleton.json'))['keypoints']
B = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; Z = {p['label']: int(round(p['z_index'])) for p in kp}
B['LEFT ARM'] = [186, 212]; B['RIGHT ARM'] = [151, 226]; B['LEFT HIP'] = [122, 206]; B['RIGHT HIP'] = [108, 204]
GROUND, WALL, L1, L2 = 251, 164, 26.0, 30.0
HEAD = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR']
LEN = {s: (math.dist(B[f'{s} SHOULDER'], B[f'{s} ELBOW']), math.dist(B[f'{s} ELBOW'], B[f'{s} ARM'])) for s in ('LEFT', 'RIGHT')}
HIPC = [(B['LEFT HIP'][0] + B['RIGHT HIP'][0]) / 2, (B['LEFT HIP'][1] + B['RIGHT HIP'][1]) / 2]
TORSO = math.degrees(math.atan2(B['NECK'][0] - HIPC[0], HIPC[1] - B['NECK'][1]))   # the base's torso lean from vertical (about 46)

def rot(p, c, t):  # rotate p about c by t degrees, positive = counter-clockwise on screen (nose up)
    t = math.radians(t); dx, dy = p[0] - c[0], p[1] - c[1]
    return [c[0] + dx * math.cos(t) + dy * math.sin(t), c[1] - dx * math.sin(t) + dy * math.cos(t)]

def ik(a, b, l1, l2, pick):  # two-bone IK a -> b; `pick` scores the candidate joint (lowest score wins)
    d = math.dist(a, b); D = min(max(d, abs(l1 - l2) + 0.5), l1 + l2 - 0.5); ux, uy = (b[0] - a[0]) / d, (b[1] - a[1]) / d
    ang = math.acos(max(-1, min(1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))))
    c = [[a[0] + l1 * (ux * math.cos(s * ang) - uy * math.sin(s * ang)), a[1] + l1 * (ux * math.sin(s * ang) + uy * math.cos(s * ang))] for s in (1, -1)]
    return min(c, key=pick), [a[0] + D * ux, a[1] + D * uy]

def cling(hx=112, hy=194, lean=12, tilt=0, hL=(WALL, 110), hR=(WALL, 128), fL=(WALL - 2, 228), fR=(WALL - 4, 248), dx=0):
    """Clinging pose: hip centre (hx, hy), torso `lean` degrees from vertical toward the wall, head tilted up `tilt` more,
    hands hL/hR and feet fL/fR planted on the wall line (x clamped to WALL), the whole figure shifted dx."""
    q = {k: v[:] for k, v in B.items()}
    for k in q:
        if 'KNEE' not in k and 'LEG' not in k: q[k] = rot(q[k], HIPC, TORSO - lean)
    for k in q:
        if 'KNEE' not in k and 'LEG' not in k: q[k][0] += hx - HIPC[0]; q[k][1] += hy - HIPC[1]
    c = q['NECK']
    if tilt:
        for k in HEAD: q[k] = rot(q[k], c, tilt)
    for s, h in (('LEFT', hL), ('RIGHT', hR)):     # arms reach up the wall, elbows hang back and down
        q[f'{s} ELBOW'], q[f'{s} ARM'] = ik(q[f'{s} SHOULDER'], [min(h[0], WALL), h[1]], *LEN[s], pick=lambda e: e[0] - 0.3 * e[1])
    for s, f in (('LEFT', fL), ('RIGHT', fR)):     # legs: knees away from the wall, feet gripping it
        q[f'{s} KNEE'], q[f'{s} LEG'] = ik(q[f'{s} HIP'], [min(f[0], WALL), f[1]], L1, L2, pick=lambda e: e[0])
    for k in q: q[k][0] += dx
    return q

def stand():
    q = {k: v[:] for k, v in B.items()}
    q['LEFT KNEE'], q['LEFT LEG'] = ik(q['LEFT HIP'], [140, GROUND], L1, L2, pick=lambda e: -e[0])
    q['RIGHT KNEE'], q['RIGHT LEG'] = ik(q['RIGHT HIP'], [88, GROUND], L1, L2, pick=lambda e: -e[0])
    return q

def blend(a, b, t, bump=0):
    q = {k: [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t - bump * math.sin(math.pi * t)] for k in a}
    return q

def cyc(i, n=8):  # hand-over-hand cycle at phase i/n; i = 0 (and n) is the cling pose
    p = 2 * math.pi * i / n; c, s = math.cos(p), math.sin(p)
    yl, yr = 119 - 9 * c, 119 + 9 * c                      # far hand 110 at the cling, near hand 128
    return dict(hy=194 - 3 * s * s, lean=12 + 1.5 * s,
                hL=(WALL - 7 * max(0, -s), yl), hR=(WALL - 7 * max(0, s), yr),
                fL=(WALL - 2 - 5 * max(0, s), 238 - 10 * c), fR=(WALL - 4 - 5 * max(0, -s), 238 + 10 * c))

REST = cling()
PUNCH = [(150, 126, 10), (128, 118, 5), (118, 110, 3), (150, 124, 16), (WALL + 4, 128, 20), (WALL, 128, 16), (WALL, 128, 13), None]
STRIPS = {
    'climbGrab': ('stand', [blend(stand(), REST, t, bump=14) for t in (0.2, 0.42, 0.66, 0.86, 1.0)]),
    'climb': ('rest', [cling(**cyc(i)) for i in range(1, 9)]),
    'climbPunch': ('rest', [cling(hR=(h[0], h[1]), lean=h[2]) if h else REST for h in PUNCH]),
    'climbMantle': ('rest', [blend(cling(dx=-22), stand(), t, bump=18) for t in (0.1, 0.22, 0.36, 0.5, 0.64, 0.76, 0.87, 0.95, 1.0)]),
}
def j(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': Z[k]} for k in q]
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
base = Image.open('public/assets/tlezcatl-s3.png'); pad = Image.new('RGBA', (256, 256)); pad.paste(base, (0, 64)); pad.save(f'{OUT}/base0.png')
for name, (start, frames) in STRIPS.items():
    if ONLY and name not in ONLY: continue
    first = stand() if start == 'stand' else REST
    json.dump({'first': j(first), 'frames': [j(q) for q in frames]}, open(f'{OUT}/{name}.json', 'w'))
    sheet = Image.new('RGBA', (256 * (len(frames) + 1), 256), (40, 40, 60, 255))
    for i, q in enumerate([first] + frames):
        c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); d = ImageDraw.Draw(c); d.line([(WALL, 0), (WALL, 255)], fill=(110, 90, 90))
        for a, b in bones: d.line([tuple(q[a]), tuple(q[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
        sheet.paste(c, (i * 256, 0))
    sheet.save(f'{OUT}/{name}_sheet.png')
    xs = [q[k][0] for q in frames for k in q]; ys = [q[k][1] for q in frames for k in q]
    print(name, 'x', round(min(xs)), round(max(xs)), 'y', round(min(ys)), round(max(ys)))
