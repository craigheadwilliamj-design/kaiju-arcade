#!/usr/bin/env python3
"""Script the skeleton poses for Belial Stage 3's two claw swipes so each uses its own hand (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/belial_s3_light_poses.py DIR near|far

Text prompts for "near claw" / "far claw" drew both swipes with the same hand. DIR/skel.json is tools/belial-s3-skeleton.json
(estimated on belial-s3.png pasted at x=28, y=64 in a 256x256 frame); every joint is shifted 28px left to match the attack base
(BL3_LEFT, sprite flush left, pasted at y=64). The estimate marks the RIGHT arm as the near one (z 0) and the LEFT as the far (z -4).
  near: light1, forward claw swipe. The near hand cocks back and up beside the head, rakes forward and down in front of the chest,
        follows through low and returns. The upper body pitches forward into the strike.
  far:  light2, backhand rake. The far hand shoots forward past the snout with the body lunging after it, hooks down and back
        under the chest, and returns.
Seven frames (the strip is the attack base followed by these; the last is the base pose). The other arm and the legs stay in the
base pose. Writes DIR/poses.json and DIR/poses_sheet.png. Run from the repo root.
"""
import json, math, sys
D, SIDE = sys.argv[1], sys.argv[2]
kp = json.load(open(f'{D}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256 - 28, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
ARM = 'RIGHT' if SIDE == 'near' else 'LEFT'
UPPER = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR', 'NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER',
         'LEFT ELBOW', 'RIGHT ELBOW', 'LEFT ARM', 'RIGHT ARM']
HIP = [(base['LEFT HIP'][0] + base['RIGHT HIP'][0]) / 2, (base['LEFT HIP'][1] + base['RIGHT HIP'][1]) / 2]
S0, E0, W0 = base[f'{ARM} SHOULDER'], base[f'{ARM} ELBOW'], base[f'{ARM} ARM']
L1, L2 = math.dist(S0, E0), math.dist(E0, W0)
# (hand offset from the shoulder in px, upper-body pitch in degrees: negative leans forward, forward shift px)
KEYS = {'near': [((-6, -26), 2, 0), ((-2, -34), 4, 0), ((26, -20), -4, 3), ((40, 4), -9, 6), ((32, 34), -7, 4), ((18, 42), -3, 2), (None, 0, 0)],
        'far':  [((30, -10), -5, 6), ((40, -4), -9, 12), ((34, 18), -8, 10), ((16, 34), -5, 6), ((4, 34), -2, 3), ((10, 33), -1, 1), (None, 0, 0)]}[SIDE]

def rot(p, c, t):
    dx, dy = p[0] - c[0], p[1] - c[1]; return [c[0] + dx * math.cos(t) + dy * math.sin(t), c[1] - dx * math.sin(t) + dy * math.cos(t)]

def ik(s, w, pref=(-1.0, 0.7)):
    d = min(math.dist(s, w), L1 + L2 - 0.5); ux, uy = (w[0] - s[0]) / max(math.dist(s, w), 1e-6), (w[1] - s[1]) / max(math.dist(s, w), 1e-6)
    a = math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    best = None
    for sg in (1, -1):
        kx, ky = ux * math.cos(a) + sg * uy * math.sin(a), -sg * ux * math.sin(a) + uy * math.cos(a)
        e = [s[0] + L1 * kx, s[1] + L1 * ky]; score = (e[0] - s[0]) * pref[0] + (e[1] - s[1]) * pref[1]
        if best is None or score > best[0]: best = (score, e)
    return best[1], [s[0] + d * ux, s[1] + d * uy]

def pose(key):
    hand, pitch, fwd = key; q = {k: v[:] for k, v in base.items()}
    if hand is None: return q
    for k in UPPER: q[k] = rot(q[k], HIP, math.radians(pitch)); q[k][0] += fwd
    s = q[f'{ARM} SHOULDER']; q[f'{ARM} ELBOW'], q[f'{ARM} ARM'] = ik(s, [s[0] + hand[0], s[1] + hand[1]])
    return q

def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
frames = [pose(k) for k in KEYS]
json.dump({'first': kps(base), 'frames': [kps(f) for f in frames]}, open(f'{D}/poses.json', 'w'))

from PIL import Image, ImageDraw
im = Image.open('public/assets/belial-s3.png').convert('RGBA'); sp = im.crop(im.getbbox()); pad = Image.new('RGBA', (256, 256)); pad.paste(sp, (0, 256 - sp.height))
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
sheet = Image.new('RGBA', (8 * 230, 140), (40, 40, 60, 255))
for i, f in enumerate([base] + frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = pad.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3)); c.alpha_composite(g)
    d = ImageDraw.Draw(c)
    for a, b in bones: d.line([tuple(f[a]), tuple(f[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((26, 116, 256, 256)), (i * 230, 0))
sheet.save(f'{D}/poses_sheet.png'); print(f'{D}/poses.json: 7 frames, {ARM} arm')
