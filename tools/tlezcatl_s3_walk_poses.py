#!/usr/bin/env python3
"""Script the skeleton poses for Tlézcatl Stage 3's theropod walk (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/tlezcatl_s3_walk_poses.py DIR [FRAMES] [STRIDE_PX] [LIFT_PX] [DX]   (shipped: DIR 12 26 9 30)

DIR holds skel.json, the /estimate-skeleton result for the Stage 3 base padded to 256x256 (sprite feet on the bottom row,
i.e. tlezcatl-s3.png pasted 64px down; a copy is tools/tlezcatl-s3-skeleton.json). DX shifts everything right to match a
base pasted DX px right: the walking tail swings out as a counterweight and needs the room behind him. Writes DIR/poses.json ({first, frames})
and DIR/poses_sheet.png, a stick-figure preview over the base, so poses can be checked before paying for a generation.

The estimate's head, neck and shoulders are kept. Corrections: the ankles go down onto the feet and the wrists out onto the
raised claws. The hips are moved together over the stride centre. The walk is bipedal. The two hind feet run the SAME step
cycle about a shared centre, half a cycle apart, so they pass each other: planted and sliding back along the ground line,
then lifted and carried forward. Feet that each step around their own spot never pass, and the walk reads as a limp. Frame
0 (the base) is full stride, near foot forward. Knees come from two-bone IK, bending forward. The upper body moves with
the gait so it does not ride the legs stiffly: it sinks into each footfall and rises as the legs pass, the head dips a
beat late and pitches with it, the shoulders roll (the one over the planted leg drops), and the arms swing opposite the
legs about the shoulders. The hands stay raised in front of the chest and never come down to the street. The tail has
no joints in the skeleton; the generation prompt asks for its sway. Run from the repo root.
"""
import json, math, sys
S = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 12
STR = float(sys.argv[3]) if len(sys.argv) > 3 else 26; LIFT = float(sys.argv[4]) if len(sys.argv) > 4 else 9
DX = int(sys.argv[5]) if len(sys.argv) > 5 else 0   # base shifted DX px right (room for the swinging tail)
kp = json.load(open(f'{S}/skel.json'))['keypoints']
base = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; z = {p['label']: int(round(p['z_index'])) for p in kp}
GROUND, CX = 251, 114            # ankle height on the street; stride centre (the base's feet sit at 140 and 88)
base['LEFT ARM'] = [186, 212]; base['RIGHT ARM'] = [151, 226]   # wrists on the far and near claws
base['LEFT HIP'] = [122, 206]; base['RIGHT HIP'] = [108, 204]
for k in base: base[k][0] += DX
CX += DX
L1, L2 = 26.0, 30.0               # thigh and shin
BODY = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR', 'NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER',
        'LEFT ELBOW', 'RIGHT ELBOW', 'LEFT ARM', 'RIGHT ARM', 'LEFT HIP', 'RIGHT HIP']

def leg(hip, ft):
    D = min(math.dist(hip, ft), L1 + L2 - 0.5); ux, uy = (ft[0] - hip[0]) / math.dist(hip, ft), (ft[1] - hip[1]) / math.dist(hip, ft)
    ang = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    kx, ky = ux * math.cos(ang) + uy * math.sin(ang), -ux * math.sin(ang) + uy * math.cos(ang)   # knee toward +x
    return [hip[0] + L1 * kx, hip[1] + L1 * ky], [hip[0] + D * ux, hip[1] + D * uy]

HEAD = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR']
BOB, HEADBOB, ROLL, ARM = 6.0, 4.0, 2.5, math.radians(14)   # shipped motion amounts (px, px, px, radians)

def rot(p, c, t):  # rotate p about c by t (positive = forward/up, y down)
    dx, dy = p[0] - c[0], p[1] - c[1]; return [c[0] + dx * math.cos(t) + dy * math.sin(t), c[1] - dx * math.sin(t) + dy * math.cos(t)]

def legs(q, ph):
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):
        # LEFT: forward at ph 0, slides back through stance (0..pi), swings forward (pi..2pi). RIGHT: half a cycle behind.
        d = sgn * STR * math.cos(ph); lift = LIFT * max(0, -sgn * math.sin(ph))
        q[f'{side} KNEE'], q[f'{side} LEG'] = leg(q[f'{side} HIP'], [CX + d, GROUND - lift])
    low = max(q['LEFT LEG'][1], q['RIGHT LEG'][1])      # keep the planted ankle on the street
    for k in q: q[k][1] += GROUND - low
    return q

# The reference skeleton (first) is the plain base: motion=False skips the arm swing and head dip, which are not at rest at ph 0.
def pose(ph, motion=True):
    q = {k: v[:] for k, v in base.items()}
    if not motion: ph = 0
    # Body bob: lowest at each heavy footfall (full stride, ph 0 and pi), highest as the legs pass. Two bobs per cycle.
    rise = BOB * abs(math.sin(ph))
    for k in BODY: q[k][1] -= rise
    if not motion: return legs(q, ph)
    # Head: dips into each footfall a beat late (follow-through), then lifts; pitches the snout down with the dip.
    hb = HEADBOB * math.cos(2 * ph - 0.9)
    for k in HEAD + ['NECK']: q[k][1] += hb * (0.6 if k == 'NECK' else 1)
    for k in HEAD: q[k] = rot(q[k], q['NECK'], -math.radians(4) * math.cos(2 * ph - 0.9))
    # Shoulders roll with the stride: the shoulder over the planted leg drops, the other rises (and surges forward a touch).
    for side, sgn in (('LEFT', 1), ('RIGHT', -1)):
        r = sgn * ROLL * math.sin(ph)
        for k in (f'{side} SHOULDER', f'{side} ELBOW', f'{side} ARM'): q[k][1] += r; q[k][0] -= 0.6 * r
        # Arms swing opposite the same-side leg about the shoulder (forearm trailing), staying raised in front of the chest.
        t = -sgn * ARM * math.cos(ph)
        sh = q[f'{side} SHOULDER']; el = rot(q[f'{side} ELBOW'], sh, t); wr = rot(q[f'{side} ARM'], sh, t)
        q[f'{side} ELBOW'], q[f'{side} ARM'] = el, rot(wr, el, 0.5 * t)
    return legs(q, ph)

def kps(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': z[k]} for k in q]
first = pose(0, motion=False); frames = [pose(2 * math.pi * i / N) for i in range(1, N + 1)]
json.dump({'first': kps(first), 'frames': [kps(f) for f in frames]}, open(f'{S}/poses.json', 'w'))

from PIL import Image, ImageDraw
im = Image.open('public/assets/tlezcatl-s3.png'); pad = Image.new('RGBA', (256, 256)); pad.paste(im, (DX, 64))
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
cols = (N + 1 + 1) // 2; sheet = Image.new('RGBA', (cols * 200, 2 * 130), (40, 40, 60, 255))
for i, f in enumerate([first] + frames):
    c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = pad.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * 0.3)); c.alpha_composite(g)
    d = ImageDraw.Draw(c)
    for a, b in bones: d.line([tuple(f[a]), tuple(f[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
    sheet.paste(c.crop((40 + DX, 126, 240 + DX, 256)), ((i % cols) * 200, (i // cols) * 130))
sheet.save(f'{S}/poses_sheet.png')
print(f'{S}/poses.json: {N} frames, stride +-{STR}px, lift {LIFT}px')
