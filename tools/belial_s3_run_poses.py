#!/usr/bin/env python3
"""Script the skeleton poses for Belial Stage 3's hind-leg run (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/belial_s3_run_poses.py DIR [FRAMES] [DX]   (shipped: DIR 8 0)

Adapted from tools/tlezcatl_s3_run_poses.py. DIR/skel.json is tools/belial-s3-skeleton.json (PixelLab /estimate-skeleton on
belial-s3.png pasted at y=64 in a 256x256 frame); writes DIR/poses.json and DIR/poses_sheet.png. Text-prompted runs limped:
each foot stepped around its own spot and the arms didn't alternate.

A run, not a fast walk. Both hind feet run the same cycle about a shared centre, half a cycle apart, with a longer stride
and high knee lift. At full extension (ph 0 and pi) both feet are off the street: the flight phase. At mid-stance the
body compresses over the planted leg. The upper body pitches forward and low about the hips, the head bobbing a beat late. The arms are tucked up high in front of the chest, pumping opposite the legs; the hands never come near
the street. The reference skeleton (first) is the plain base; every output frame carries the lean. Run from the repo root.
"""
import json, math, sys
S = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 8; DX = int(sys.argv[3]) if len(sys.argv) > 3 else 0
STR, LIFT = 22.0, 13.0            # stride half-length and swing-foot lift, px
FLY, SQUASH = 4.0, 3.0            # body height in flight (full extension); sink over the planted leg at mid-stance
LEAN, HEADBOB, ARM = math.radians(8), 2.0, math.radians(16)
kp = json.load(open(f'{S}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
GROUND, CX = 243, 150             # ankle line (toes reach the bottom row); stride centre a little forward of the stance's
base['LEFT HIP'] = [156, 206]; base['RIGHT HIP'] = [146, 205]   # estimate had the hips 15px apart; both legs hang off one pelvis
for k in base: base[k][0] += DX
CX += DX
L1, L2 = 22.0, 21.0
HEAD = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR']
UPPER = HEAD + ['NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER', 'LEFT ELBOW', 'RIGHT ELBOW', 'LEFT ARM', 'RIGHT ARM']

def rot(p, c, t):  # rotate p about c by t (positive = nose up, y down)
    dx, dy = p[0] - c[0], p[1] - c[1]; return [c[0] + dx * math.cos(t) + dy * math.sin(t), c[1] - dx * math.sin(t) + dy * math.cos(t)]

def leg(hip, ft):
    D = min(math.dist(hip, ft), L1 + L2 - 0.5); ux, uy = (ft[0] - hip[0]) / math.dist(hip, ft), (ft[1] - hip[1]) / math.dist(hip, ft)
    ang = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    kx, ky = ux * math.cos(ang) + uy * math.sin(ang), -ux * math.sin(ang) + uy * math.cos(ang)
    return [hip[0] + L1 * kx, hip[1] + L1 * ky], [hip[0] + D * ux, hip[1] + D * uy]

def legs(q, ph, stride=STR, cx=None):
    cx = CX if cx is None else cx
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):
        d = sgn * stride * math.cos(ph); lift = LIFT * max(0, -sgn * math.sin(ph)) ** 0.8
        q[f'{side} KNEE'], q[f'{side} LEG'] = leg(q[f'{side} HIP'], [cx + d, GROUND - lift])
    low = max(q['LEFT LEG'][1], q['RIGHT LEG'][1])
    for k in q: q[k][1] += GROUND - low
    return q

def pose(ph, motion=True):
    q = {k: v[:] for k, v in base.items()}
    if not motion: return legs(q, 0, 17, 147 + DX)   # the base's own stance (ankles at 164 and 130)
    hipc = [(q['LEFT HIP'][0] + q['RIGHT HIP'][0]) / 2, (q['LEFT HIP'][1] + q['RIGHT HIP'][1]) / 2]
    for k in UPPER: q[k] = rot(q[k], hipc, -LEAN)                       # pitch forward and down about the hips
    sink = SQUASH * abs(math.sin(ph))                                   # compress over the planted leg
    for k in q:
        if 'KNEE' not in k and 'LEG' not in k: q[k][1] += sink
    hb = HEADBOB * math.cos(2 * ph - 0.9)                               # head bobs a beat late
    for k in HEAD: q[k][1] += hb
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):                      # arms tucked high, pumping opposite the legs
        t = -sgn * ARM * math.cos(ph)
        sh = q[f'{side} SHOULDER']; el = rot(q[f'{side} ELBOW'], sh, t + math.radians(10)); wr = rot(q[f'{side} ARM'], sh, t + math.radians(10))
        q[f'{side} ELBOW'], q[f'{side} ARM'] = el, rot(wr, el, math.radians(20))
    q = legs(q, ph)
    fly = FLY * math.cos(ph) ** 2                                       # flight at full extension: both feet off the street
    for k in q: q[k][1] -= fly
    return q

def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
first = pose(0, motion=False); frames = [pose(2 * math.pi * i / N) for i in range(1, N + 1)]
json.dump({'first': kps(first), 'frames': [kps(f) for f in frames]}, open(f'{S}/poses.json', 'w'))

from PIL import Image, ImageDraw
im = Image.open('public/assets/belial-s3.png'); pad = Image.new('RGBA', (256, 256)); pad.paste(im, (DX, 64))
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
cols = (N + 2) // 2; sheet = Image.new('RGBA', (cols * 220, 2 * 140), (40, 40, 60, 255))
for i, f in enumerate([first] + frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = pad.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3)); c.alpha_composite(g)
    d = ImageDraw.Draw(c); d.line([(0, GROUND), (255, GROUND)], fill=(90, 90, 110))
    for a, b in bones: d.line([tuple(f[a]), tuple(f[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((36, 116, 256, 256)), ((i % cols) * 220, (i // cols) * 140))
sheet.save(f'{S}/poses_sheet.png')
print(f'{S}/poses.json: {N} frames')
