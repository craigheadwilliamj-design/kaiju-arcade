#!/usr/bin/env python3
"""Script the skeleton poses for Belial Stage 3's Acid Vomit aim frames (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/belial_s3_aim_poses.py DIR   (DIR/skel.json: /estimate-skeleton on the vomit-start gape frame pasted at y=64
in a 256x256 frame; writes DIR/poses.json and DIR/poses_sheet.png)

The estimate put the eyes and nose inside the open jaws, so the head joints are set by hand from the gape frame (eye at 193,168,
snout at 210,166). Each frame turns the head about the neck to one of ANGLES (degrees, positive = nose up), and the neck and
shoulders follow at 40% about the hips, so the whole neck lifts rather than just the skull. Arms and legs stay in the gape pose.
"""
import json, math, sys
D = sys.argv[1]; ANGLES = [-25, -12, 0, 8, 18, 32, 45]
kp = json.load(open(f'{D}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
base.update({'NOSE': [210, 166], 'LEFT EYE': [194, 167], 'RIGHT EYE': [191, 168], 'LEFT EAR': [184, 164], 'RIGHT EAR': [180, 165], 'NECK': [163, 181]})
HEAD = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR']
NECKS = ['NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER', 'LEFT ELBOW', 'RIGHT ELBOW', 'LEFT ARM', 'RIGHT ARM']
HIP = [(base['LEFT HIP'][0] + base['RIGHT HIP'][0]) / 2, (base['LEFT HIP'][1] + base['RIGHT HIP'][1]) / 2]
def rot(p, c, t):
    dx, dy = p[0] - c[0], p[1] - c[1]; return [c[0] + dx * math.cos(t) + dy * math.sin(t), c[1] - dx * math.sin(t) + dy * math.cos(t)]
def pose(deg):
    q = {k: v[:] for k, v in base.items()}; t = math.radians(deg)
    for k in HEAD + NECKS: q[k] = rot(q[k], HIP, t * 0.4)
    for k in HEAD: q[k] = rot(q[k], q['NECK'], t * 0.6)
    return q
def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
frames = [pose(a) for a in ANGLES]
json.dump({'first': kps(base), 'frames': [kps(f) for f in frames]}, open(f'{D}/poses.json', 'w'))
from PIL import Image, ImageDraw
g = Image.open(f'{D}/gape256.png').convert('RGBA'); g.putalpha(g.getchannel('A').point(lambda a: a * 0.35))
sheet = Image.new('RGBA', (7 * 180, 130), (40, 40, 60, 255))
for i, f in enumerate(frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); c.alpha_composite(g); d = ImageDraw.Draw(c)
    for a, b in [('NECK', 'NOSE'), ('NECK', 'LEFT EAR'), ('LEFT EAR', 'LEFT EYE'), ('LEFT EYE', 'NOSE'), ('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('NECK', 'LEFT HIP')]:
        d.line([tuple(f[a]), tuple(f[b])], fill=(255, 255, 0), width=2)
    d.text((80, 116), f'{ANGLES[i]}', fill='white'); sheet.paste(c.crop((76, 110, 256, 240)), (i * 180, 0))
sheet.save(f'{D}/poses_sheet.png'); print(f'{D}/poses.json')
