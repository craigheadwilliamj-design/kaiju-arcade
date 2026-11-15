#!/usr/bin/env python3
"""Script the skeleton poses for Tlézcatl Stage 3's light combo, heavy and Flame Jet (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/tlezcatl_s3_light_poses.py OUTDIR [DX] [STRIPS]   (shipped: OUTDIR -30)

Reads tools/tlezcatl-s3-skeleton.json (the /estimate-skeleton result for the base padded to 256x256, sprite pasted 64px
down) with the walk's corrections (wrists on the raised claws, hips together, ankles on the street from two-bone IK),
shifted DX px (default -30: sprite at x=7, so the rakes and the lunge stay in the 256px frame). Writes OUTDIR/base{DX}.png
(the padded, shifted base to generate from), OUTDIR/{light1,light2,light3}.json ({first, frames}) and *_sheet.png
stick-figure previews. Each strip is per-frame keyframes ending on the base pose so the combo chains:
lean (degrees, + pitches the upper body forward/down about the hips), drop (px, hips sink), step (px, front foot forward),
surge (px, upper body and hips forward), head (px, head thrust forward along the neck), and per-arm (upper, fore) angles in
degrees from straight down, + swinging forward. LEFT is the far arm and front foot; RIGHT is the near arm.
  light1: near-claw overhead rake: cocked up beside the horns, raked down in front of the snout (impact frame 4).
  light2: far-claw hook rake: wound back, shot out past the snout at jaw height, hooked down (impact frame 3).
  light3: lunging bite: rears the head back, then drives head and shoulders forward and low, jaws snapping (impact frame 3).
  heavy: 13 frames, cut into heavyRear (1-5: rears tall, head up, both claws thrown overhead) and heavySlam (6-13: starts on the
         crash, both claws and the chest driven down into the street in a deep crouch, then recovers to the base pose).
  jet: 15 frames for the Flame Jet, cut into jetStart (1-5: inhales with the head reared back, then drops forward into the breath
       pose, jaws wide), jetAim (the breath pose with the head tilted to the scripted angles: frames 7,6,5,8,9,10,11 at
       -24,-12,0,15,30,45,58 degrees, the aim range is -25 to +58) and jetEnd (12-15: jaws shut, settles onto the base pose).
       `tilt` (degrees, + raises the snout) turns the head about the neck.
Run from the repo root.
"""
import json, math, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]; DX = int(sys.argv[2]) if len(sys.argv) > 2 else -30; ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
kp = json.load(open('tools/tlezcatl-s3-skeleton.json'))['keypoints']
B = {p['label']: [p['x'] * 256, p['y'] * 256] for p in kp}; Z = {p['label']: int(round(p['z_index'])) for p in kp}
B['LEFT ARM'] = [186, 212]; B['RIGHT ARM'] = [151, 226]; B['LEFT HIP'] = [122, 206]; B['RIGHT HIP'] = [108, 204]
for k in B: B[k][0] += DX
GROUND, CX, STANCE = 251, 114 + DX, 26        # base feet at CX+-26 (140 and 88 unshifted)
L1, L2 = 26.0, 30.0
HEAD = ['NOSE', 'LEFT EYE', 'RIGHT EYE', 'LEFT EAR', 'RIGHT EAR']
UPPER = HEAD + ['NECK', 'LEFT SHOULDER', 'RIGHT SHOULDER']
base = Image.open('public/assets/tlezcatl-s3.png'); pad = Image.new('RGBA', (256, 256)); pad.paste(base, (DX, 64)); pad.save(f'{OUT}/base{DX}.png')

def ang(a, b): return math.degrees(math.atan2(b[0] - a[0], b[1] - a[1]))
LEN = {s: (math.dist(B[f'{s} SHOULDER'], B[f'{s} ELBOW']), math.dist(B[f'{s} ELBOW'], B[f'{s} ARM'])) for s in ('LEFT', 'RIGHT')}
REST = {s: (ang(B[f'{s} SHOULDER'], B[f'{s} ELBOW']), ang(B[f'{s} ELBOW'], B[f'{s} ARM'])) for s in ('LEFT', 'RIGHT')}

def leg(hip, ft):
    D = min(math.dist(hip, ft), L1 + L2 - 0.5); ux, uy = (ft[0] - hip[0]) / math.dist(hip, ft), (ft[1] - hip[1]) / math.dist(hip, ft)
    a = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    kx, ky = ux * math.cos(a) + uy * math.sin(a), -ux * math.sin(a) + uy * math.cos(a)   # knee bends forward
    return [hip[0] + L1 * kx, hip[1] + L1 * ky], [hip[0] + D * ux, hip[1] + D * uy]

def pose(lean=0, drop=0, step=0, surge=0, head=0, tilt=0, L=None, R=None, hands=None):
    q = {k: v[:] for k, v in B.items()}
    for k in q:
        if 'KNEE' not in k and 'LEG' not in k: q[k][0] += surge; q[k][1] += drop
    hx = (q['LEFT HIP'][0] + q['RIGHT HIP'][0]) / 2; hy = (q['LEFT HIP'][1] + q['RIGHT HIP'][1]) / 2; t = math.radians(lean)
    for k in UPPER:
        dx, dy = q[k][0] - hx, q[k][1] - hy; q[k] = [hx + dx * math.cos(t) - dy * math.sin(t), hy + dx * math.sin(t) + dy * math.cos(t)]
    nk = q['NECK']; ux, uy = q['NOSE'][0] - nk[0], q['NOSE'][1] - nk[1]; n = math.hypot(ux, uy)
    for k in HEAD: q[k] = [q[k][0] + head * ux / n, q[k][1] + head * uy / n]
    if tilt:
        c, t2 = q['NECK'], math.radians(tilt)
        for k in HEAD: dx, dy = q[k][0] - c[0], q[k][1] - c[1]; q[k] = [c[0] + dx * math.cos(t2) + dy * math.sin(t2), c[1] - dx * math.sin(t2) + dy * math.cos(t2)]
    for s, a in (('LEFT', L or REST['LEFT']), ('RIGHT', R or REST['RIGHT'])):
        sh = q[f'{s} SHOULDER']; l1, l2 = LEN[s]; u, f = map(math.radians, a)
        el = [sh[0] + l1 * math.sin(u), sh[1] + l1 * math.cos(u)]; q[f'{s} ELBOW'] = el; q[f'{s} ARM'] = [el[0] + l2 * math.sin(f), el[1] + l2 * math.cos(f)]
        if hands:   # crouch: claw planted on the street hands[s] px in front of the shoulder, elbow bent up and back (two-bone IK)
            tx, ty = sh[0] + hands[s], GROUND - 2; D = min(math.hypot(tx - sh[0], ty - sh[1]), l1 + l2 - 0.5); ux, uy = (tx - sh[0]) / math.hypot(tx - sh[0], ty - sh[1]), (ty - sh[1]) / math.hypot(tx - sh[0], ty - sh[1])
            a2 = math.acos(max(-1, min(1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D)))); kx, ky = ux * math.cos(a2) - uy * math.sin(a2), ux * math.sin(a2) + uy * math.cos(a2)
            q[f'{s} ELBOW'] = [sh[0] + l1 * kx, sh[1] + l1 * ky]; q[f'{s} ARM'] = [sh[0] + D * ux, sh[1] + D * uy]
    q['LEFT KNEE'], q['LEFT LEG'] = leg(q['LEFT HIP'], [CX + STANCE + step, GROUND])
    q['RIGHT KNEE'], q['RIGHT LEG'] = leg(q['RIGHT HIP'], [CX - STANCE, GROUND])
    return q

RL, RR = REST['LEFT'], REST['RIGHT']
TUCK_L, TUCK_R = (RL[0] - 25, RL[1] + 40), (RR[0] - 25, RR[1] + 40)   # claws pulled in to the chest
STRIPS = {
 'light1': {0: {}, 1: dict(lean=-3, R=(85, 140), L=TUCK_L), 2: dict(lean=-7, drop=-2, R=(125, 165), L=TUCK_L),
            3: dict(lean=-8, drop=-2, R=(135, 175), L=TUCK_L), 4: dict(lean=8, drop=3, step=6, surge=4, R=(105, 90), L=TUCK_L),
            5: dict(lean=13, drop=5, step=8, surge=6, R=(75, 45), L=TUCK_L), 6: dict(lean=9, drop=4, step=7, surge=4, R=(50, 30)),
            7: dict(lean=3, drop=1, step=3, surge=1), 8: {}},
 'light2': {0: {}, 1: dict(lean=-4, L=(-25, 30), R=TUCK_R), 2: dict(lean=-7, drop=-1, L=(-35, 20), R=TUCK_R),
            3: dict(lean=9, drop=3, step=8, surge=6, L=(85, 95), R=(RR[0] - 35, RR[1] + 30)),
            4: dict(lean=12, drop=4, step=10, surge=8, L=(95, 85), R=(RR[0] - 35, RR[1] + 30)),
            5: dict(lean=12, drop=5, step=10, surge=7, L=(70, 25), R=TUCK_R), 6: dict(lean=7, drop=3, step=6, surge=4, L=(45, 10)),
            7: dict(lean=2, drop=1, step=2, surge=1), 8: {}},
 'light3': {0: {}, 1: dict(lean=-6, drop=-2, head=-4, L=TUCK_L, R=TUCK_R), 2: dict(lean=-9, drop=-3, head=-6, L=TUCK_L, R=TUCK_R),
            3: dict(lean=20, drop=8, step=12, surge=10, head=14, L=TUCK_L, R=TUCK_R),
            4: dict(lean=22, drop=9, step=14, surge=12, head=16, L=TUCK_L, R=TUCK_R),
            5: dict(lean=16, drop=6, step=12, surge=9, head=8, L=TUCK_L, R=TUCK_R), 6: dict(lean=9, drop=3, step=7, surge=5, head=3),
            7: dict(lean=3, drop=1, step=2, surge=1), 8: {}},
 'heavy': {0: {}, 1: dict(lean=-5, drop=-2, L=(60, 100), R=(55, 100)), 2: dict(lean=-12, drop=-4, L=(120, 150), R=(115, 150)),
           3: dict(lean=-18, drop=-6, L=(150, 175), R=(145, 175)), 4: dict(lean=-22, drop=-7, L=(160, 185), R=(155, 185)),
           5: dict(lean=-23, drop=-7, L=(162, 188), R=(157, 188)),
           6: dict(lean=24, drop=12, step=12, surge=6, head=4, L=(80, 60), R=(75, 60)),
           7: dict(lean=28, drop=15, step=14, surge=7, head=4, L=(78, 55), R=(73, 55)),
           8: dict(lean=27, drop=14, step=14, surge=7, head=3, L=(78, 55), R=(73, 55)),
           9: dict(lean=22, drop=11, step=12, surge=6, head=2, L=(65, 50), R=(58, 50)),
           10: dict(lean=14, drop=7, step=8, surge=4, L=(45, 50), R=(35, 50)), 11: dict(lean=8, drop=6, step=5, surge=3),
           12: dict(lean=3, drop=2, step=2, surge=1), 13: {}},
 # crouch: 5 frames dropping off the hind legs onto all fours (hips and chest sink, upper body pitched forward over the planted feet,
 # head thrust low and forward, both claws planted on the street ahead of the shoulders); crouchLoop: 4 breathing frames on that pose
 # (frame 4 = it). Generate crouch from the unshifted base (DX 0), then crouchLoop from crouch's last frame (first = that pose).
 'crouch': {0: {}, 1: dict(lean=7, drop=9, step=2, surge=2, tilt=1, L=(RL[0] + 15, RL[1] + 10), R=(RR[0] + 15, RR[1] + 10)),
            2: dict(lean=14, drop=20, step=4, surge=5, tilt=3, L=(RL[0] + 25, RL[1] + 25), R=(RR[0] + 22, RR[1] + 25)),
            3: dict(lean=19, drop=30, step=6, surge=10, head=2, tilt=5, hands={'LEFT': 26, 'RIGHT': 30}),
            4: dict(lean=21, drop=36, step=6, surge=10, head=2, tilt=6, hands={'LEFT': 28, 'RIGHT': 32}),
            5: dict(lean=22, drop=38, step=6, surge=10, head=2, tilt=6, hands={'LEFT': 28, 'RIGHT': 32})},
 'crouchLoop': {0: dict(lean=22, drop=38, step=6, surge=10, head=2, tilt=6, hands={'LEFT': 28, 'RIGHT': 32}),
                1: dict(lean=21, drop=37, step=6, surge=10, head=2, tilt=7, hands={'LEFT': 28, 'RIGHT': 32}),
                2: dict(lean=20, drop=36, step=6, surge=10, head=2, tilt=8, hands={'LEFT': 28, 'RIGHT': 32}),
                3: dict(lean=21, drop=37, step=6, surge=10, head=2, tilt=7, hands={'LEFT': 28, 'RIGHT': 32}),
                4: dict(lean=22, drop=38, step=6, surge=10, head=2, tilt=6, hands={'LEFT': 28, 'RIGHT': 32})},
 'jet': {0: {}, 1: dict(lean=-3, tilt=10, L=TUCK_L, R=TUCK_R), 2: dict(lean=-7, drop=-2, tilt=25, head=-3, L=TUCK_L, R=TUCK_R),
         3: dict(lean=-9, drop=-3, tilt=35, head=-5, L=TUCK_L, R=TUCK_R), 4: dict(lean=10, drop=3, step=4, surge=3, tilt=-6, head=6),
         **{i: dict(lean=8 - 0.2 * a, drop=2, step=4, surge=2, tilt=a, head=5) for i, a in ((5, 0), (6, -12), (7, -24), (8, 15), (9, 30), (10, 45), (11, 58))},
         12: dict(lean=5, drop=1, step=3, surge=1, tilt=25, head=2), 13: dict(lean=3, step=2, surge=1, tilt=8), 14: dict(lean=1, step=1, tilt=2), 15: {}},
}
def full(kw): d = dict(lean=0, drop=0, step=0, surge=0, head=0, tilt=0, L=RL, R=RR, hands=None); d.update(kw); return d
def j(q): return [{'x': min(max(q[k][0] / 256, 0), 1), 'y': min(max(q[k][1] / 256, 0), 1), 'label': k, 'z_index': Z[k]} for k in q]
bones = [('NECK', 'LEFT SHOULDER'), ('NECK', 'RIGHT SHOULDER'), ('LEFT SHOULDER', 'LEFT ELBOW'), ('LEFT ELBOW', 'LEFT ARM'),
         ('RIGHT SHOULDER', 'RIGHT ELBOW'), ('RIGHT ELBOW', 'RIGHT ARM'), ('NECK', 'LEFT HIP'), ('NECK', 'RIGHT HIP'),
         ('LEFT HIP', 'LEFT KNEE'), ('LEFT KNEE', 'LEFT LEG'), ('RIGHT HIP', 'RIGHT KNEE'), ('RIGHT KNEE', 'RIGHT LEG'), ('NECK', 'NOSE')]
for name, keys in STRIPS.items():
    if ONLY and name not in ONLY: continue
    frames = [pose(**full(keys[i])) for i in range(1, len(keys))]
    first = pose(**full(keys[0])); json.dump({'first': j(first), 'frames': [j(q) for q in frames]}, open(f'{OUT}/{name}.json', 'w'))
    sheet = Image.new('RGBA', (256 * (len(frames) + 1), 200), (40, 40, 60, 255))
    for i, q in enumerate([first] + frames):
        c = Image.new('RGBA', (256, 256), (40, 40, 60, 255)); g = pad.copy(); g.putalpha(g.getchannel('A').point(lambda a: a * .3)); c.alpha_composite(g)
        d = ImageDraw.Draw(c); d.line([(0, GROUND), (255, GROUND)], fill=(90, 90, 110))
        for a, b in bones: d.line([tuple(q[a]), tuple(q[b])], fill=(0, 255, 255) if 'LEFT' in a + b else (255, 255, 0), width=2)
        sheet.paste(c.crop((0, 56, 256, 256)), (i * 256, 0))
    sheet.save(f'{OUT}/{name}_sheet.png')
    xs = [q[k][0] for q in frames for k in q]; ys = [q[k][1] for q in frames for k in q]
    print(name, 'x', round(min(xs)), round(max(xs)), 'min y', round(min(ys)))
