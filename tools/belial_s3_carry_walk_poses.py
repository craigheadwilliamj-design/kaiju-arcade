#!/usr/bin/env python3
"""Script the skeleton poses for Belial Stage 3's carry-walk (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/belial_s3_carry_walk_poses.py DIR [FRAMES]   (shipped: DIR 8)

DIR/skel.json is /estimate-skeleton on the grab's last frame (arms straight up, claws together overhead; 256x256, base padded to
256 tall). The estimate dropped the near arm to his side, so both arms are set by hand reaching up to the joined claws. The
text-prompted carry-walk limped (the near foot stayed planted under him while only the far leg swung), so both feet run one
step cycle about a shared centre half a cycle apart (two-bone IK knees), phase 0 being the lift pose's own stance (ankles at 164
and 131), so the loop closes on it. The body bobs up as the legs pass; the arms and head ride along with the body, unchanged.
"""
import json, math, sys
D = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 8
kp = json.load(open(f'{D}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
base.update({'RIGHT ELBOW': [152, 140], 'RIGHT ARM': [166, 112], 'LEFT ELBOW': [181, 145], 'LEFT ARM': [177, 114]})
GROUND, CX, STR, LIFT, BOB = 244, 147.5, 16.5, 9.0, 2.0
L1, L2 = 22.0, 21.0
def leg(hip, ft):
    D_ = min(math.dist(hip, ft), L1 + L2 - 0.5); ux, uy = (ft[0] - hip[0]) / math.dist(hip, ft), (ft[1] - hip[1]) / math.dist(hip, ft)
    ang = math.acos(max(-1, min(1, (L1 * L1 + D_ * D_ - L2 * L2) / (2 * L1 * D_))))
    kx, ky = ux * math.cos(ang) + uy * math.sin(ang), -ux * math.sin(ang) + uy * math.cos(ang)
    return [hip[0] + L1 * kx, hip[1] + L1 * ky], [hip[0] + D_ * ux, hip[1] + D_ * uy]
def pose(ph):
    q = {k: v[:] for k, v in base.items()}
    bob = BOB * (1 - abs(math.cos(ph)))          # highest as the legs pass (mid-stance), lowest at full stride
    for k in q:
        if 'KNEE' not in k and 'LEG' not in k: q[k][1] -= bob
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):
        d = sgn * STR * math.cos(ph); lift = LIFT * max(0, -sgn * math.sin(ph)) ** 0.8
        q[f'{side} KNEE'], q[f'{side} LEG'] = leg(q[f'{side} HIP'], [CX + d, GROUND - lift])
    return q
def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
frames = [pose(2 * math.pi * i / N) for i in range(1, N + 1)]
json.dump({'first': kps(pose(0)), 'frames': [kps(f) for f in frames]}, open(f'{D}/poses.json', 'w'))
from PIL import Image, ImageDraw
g = Image.open(f'{D}/lift.png').convert('RGBA'); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3))
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
sheet = Image.new('RGBA', ((N + 1) * 140, 170), (40, 40, 60, 255))
for i, f in enumerate([pose(0)] + frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); c.alpha_composite(g); d = ImageDraw.Draw(c)
    for a, b in bones: d.line([tuple(f[a]), tuple(f[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((90, 86, 230, 256)), (i * 140, 0))
sheet.save(f'{D}/poses_sheet.png'); print(f'{D}/poses.json: {N} frames')
