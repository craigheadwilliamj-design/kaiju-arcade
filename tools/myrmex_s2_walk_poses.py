#!/usr/bin/env python3
"""Script the skeleton poses for Myrmex Stage 2's four-legged walk (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/myrmex_s2_walk_poses.py DIR [FRAMES] [STRIDE_PX] [LIFT_PX]   (shipped: DIR 12 9 7)

DIR holds skel.json, the /estimate-skeleton result for myrmex-s2.png padded to 256x256 (pasted 64px down, feet on the bottom
row; a copy is tools/myrmex-s2-skeleton.json), and base256.png, that padded base. Writes DIR/poses.json ({first, frames}) and
DIR/poses_sheet.png, a stick-figure preview over the base, so poses can be checked before paying for a generation.

The humanoid skeleton maps onto him as: legs = the long hind legs, arms = the long clawed forelegs (wrists on the claws). The
small middle legs and the tail have no joints; the prompt asks for them. PixMiniMax walks kept gathering every foot under
his chest and lifting both hind feet, so the gait is scripted: a slow lateral-sequence walk (near hind, near fore, far hind,
far fore, a quarter cycle apart). Each foot is planted for three quarters of the cycle, sliding back along the street, then
lifts and swings forward, so three feet are always down and the hind feet stay behind the body. Hind knees bend backward
and foreleg elbows forward, from two-bone IK with the base's bone lengths. The body bobs 1px with the steps. The last frame
is the base pose, so the strip loops. Run from the repo root.
"""
import json, math, sys
S = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 12
STR = float(sys.argv[3]) if len(sys.argv) > 3 else 9; LIFT = float(sys.argv[4]) if len(sys.argv) > 4 else 7
kp = json.load(open(f'{S}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
GROUND = 250
# Corrections to the estimate: the near foreleg's elbow sat on a dangling middle leg; feet go down onto the claws.
base['RIGHT ELBOW'] = [156, 221]
base['RIGHT LEG'] = [88, GROUND]; base['LEFT LEG'] = [107, GROUND]
base['RIGHT ARM'] = [172, GROUND]; base['LEFT ARM'] = [184, GROUND]
LIMBS = {  # (root, joint, foot, phase at frame 0, bend: +1 joint toward +x)
    'RH': ('RIGHT HIP', 'RIGHT KNEE', 'RIGHT LEG', 0.00, -1),
    'RF': ('RIGHT SHOULDER', 'RIGHT ELBOW', 'RIGHT ARM', 0.25, 1),
    'LH': ('LEFT HIP', 'LEFT KNEE', 'LEFT LEG', 0.50, -1),
    'LF': ('LEFT SHOULDER', 'LEFT ELBOW', 'LEFT ARM', 0.75, 1)}
def offset(p):  # foot x offset from its home and lift for cycle phase p
    p %= 1
    if p < 0.75: return STR - 2 * STR * p / 0.75, 0.0
    s = (p - 0.75) / 0.25; return -STR + 2 * STR * s, LIFT * math.sin(math.pi * s)
home = {k: base[f][0] - offset(ph)[0] for k, (r, j, f, ph, b) in LIMBS.items()}
def ik(root, foot, L1, L2, bend):
    D = min(math.dist(root, foot), L1 + L2 - 0.5); ux, uy = (foot[0] - root[0]) / math.dist(root, foot), (foot[1] - root[1]) / math.dist(root, foot)
    ang = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)))) * bend
    # rotating (ux,uy) by -ang in screen coords (y down) swings the joint toward +x when the limb points down
    jx, jy = ux * math.cos(ang) + uy * math.sin(ang), -ux * math.sin(ang) + uy * math.cos(ang)
    return [root[0] + L1 * jx, root[1] + L1 * jy], [root[0] + D * ux, root[1] + D * uy]
frames = []
for i in range(1, N + 1):
    t = i / N; q = {k: v[:] for k, v in base.items()}
    bob = 1.0 * abs(math.sin(4 * math.pi * t))   # rises a touch as each pair passes
    for k in q:
        if k not in ('RIGHT LEG', 'LEFT LEG', 'RIGHT ARM', 'LEFT ARM'): q[k][1] -= bob
    for k, (r, j, f, ph, bend) in LIMBS.items():
        dx, lift = offset(ph + t); foot = [home[k] + dx, GROUND - lift]
        L1 = math.dist(base[r], base[j]); L2 = math.dist(base[j], base[f])
        q[j], q[f] = ik(q[r], foot, L1, L2, bend)
    if i == N: q = {k: v[:] for k, v in base.items()}
    frames.append([{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q])
first = [{'x': base[k][0] / 256, 'y': base[k][1] / 256, 'label': k, 'z_index': z[k]} for k in base]
json.dump({'first': first, 'frames': frames}, open(f'{S}/poses.json', 'w'))
from PIL import Image, ImageDraw
im = Image.open(f'{S}/base256.png')
bones = [('NECK', 'NOSE'), ('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG')]
cols = 4; sheet = Image.new('RGBA', (256 * cols, 128 * ((N + cols - 1) // cols)), (40, 40, 60, 255))
for n, f in enumerate([first] + frames[:-1]):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = im.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3)); c.alpha_composite(g)
    d = ImageDraw.Draw(c); P = {p['label']: (p['x'] * 256, p['y'] * 256) for p in f}
    for a, b in bones: d.line([P[a], P[b]], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((0, 128, 256, 256)), ((n % cols) * 256, (n // cols) * 128))
sheet.save(f'{S}/poses_sheet.png')
