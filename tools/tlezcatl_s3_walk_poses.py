#!/usr/bin/env python3
"""Script the skeleton poses for Tlézcatl Stage 3's theropod walk (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/tlezcatl_s3_walk_poses.py DIR [FRAMES] [STRIDE_PX] [LIFT_PX]   (shipped: DIR 12 26 9)

DIR holds skel.json, the /estimate-skeleton result for the Stage 3 base padded to 256x256 (sprite feet on the bottom row,
i.e. tlezcatl-s3.png pasted 64px down; a copy is tools/tlezcatl-s3-skeleton.json). Writes DIR/poses.json ({first, frames})
and DIR/poses_sheet.png, a stick-figure preview over the base, so poses can be checked before paying for a generation.

The estimate's head, neck and shoulders are kept. Corrections: the ankles go down onto the feet and the wrists out onto the
raised claws. The hips are moved together over the stride centre. The walk is bipedal. The two hind feet run the SAME step
cycle about a shared centre, half a cycle apart, so they pass each other: planted and sliding back along the ground line,
then lifted and carried forward. Feet that each step around their own spot never pass, and the walk reads as a limp. Frame
0 (the base) is full stride, near foot forward. Knees come from two-bone IK, bending forward. The body (head, shoulders,
arms) rises a few px as the legs pass and sinks at full stride. The hands stay raised in front of the chest and never
come down to the street. Run from the repo root.
"""
import json, math, sys
S = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 12
STR = float(sys.argv[3]) if len(sys.argv) > 3 else 26; LIFT = float(sys.argv[4]) if len(sys.argv) > 4 else 9
kp = json.load(open(f'{S}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
GROUND, CX = 251, 114            # ankle height on the street; stride centre (the base's feet sit at 140 and 88)
base['LEFT ARM'] = [186, 212]; base['RIGHT ARM'] = [151, 226]   # wrists on the far and near claws
base['LEFT HIP'] = [122, 206]; base['RIGHT HIP'] = [108, 204]
L1, L2 = 26.0, 30.0               # thigh and shin
BODY = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR', 'NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER',
        'LEFT ELBOW', 'RIGHT ELBOW', 'LEFT ARM', 'RIGHT ARM', 'LEFT HIP', 'RIGHT HIP']

def leg(hip, ft):
    D = min(math.dist(hip, ft), L1 + L2 - 0.5); ux, uy = (ft[0] - hip[0]) / math.dist(hip, ft), (ft[1] - hip[1]) / math.dist(hip, ft)
    ang = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    kx, ky = ux * math.cos(ang) + uy * math.sin(ang), -ux * math.sin(ang) + uy * math.cos(ang)   # knee toward +x
    return [hip[0] + L1 * kx, hip[1] + L1 * ky], [hip[0] + D * ux, hip[1] + D * uy]

def pose(ph):
    q = {k: v[:] for k, v in base.items()}
    rise = 3 * abs(math.sin(ph))          # legs passing at ph = pi/2, 3pi/2
    for k in BODY: q[k][1] -= rise
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):
        # LEFT: forward at ph 0, slides back through stance (0..pi), swings forward (pi..2pi). RIGHT: half a cycle behind.
        d = sgn * STR * math.cos(ph); lift = LIFT * max(0, -sgn * math.sin(ph))
        q[f'{side} KNEE'], q[f'{side} LEG'] = leg(q[f'{side} HIP'], [CX + d, GROUND - lift])
    low = max(q['LEFT LEG'][1], q['RIGHT LEG'][1])      # keep the planted ankle on the street
    for k in q: q[k][1] += GROUND - low
    return q

def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
first = pose(0); frames = [pose(2 * math.pi * i / N) for i in range(1, N + 1)]
json.dump({'first': kps(first), 'frames': [kps(f) for f in frames]}, open(f'{S}/poses.json', 'w'))

from PIL import Image, ImageDraw
im = Image.open('public/assets/tlezcatl-s3.png'); pad = Image.new('RGBA', (256, 256)); pad.paste(im, (0, 64))
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
cols = (N + 1 + 1) // 2; sheet = Image.new('RGBA', (cols * 200, 2 * 130), (40, 40, 60, 255))
for i, f in enumerate([first] + frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = pad.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3)); c.alpha_composite(g)
    d = ImageDraw.Draw(c)
    for a, b in bones: d.line([tuple(f[a]), tuple(f[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((40, 126, 240, 256)), ((i % cols) * 200, (i // cols) * 130))
sheet.save(f'{S}/poses_sheet.png')
print(f'{S}/poses.json: {N} frames, stride +-{STR}px, lift {LIFT}px')
