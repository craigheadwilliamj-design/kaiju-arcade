#!/usr/bin/env python3
"""Cutout rig for Myrmex Stage 2: poses the keyed sprite's own pixels, so frames never get redrawn (no shimmer).

Usage: python3 tools/myrmex_s2_rig.py OUT_DIR [--stride 14] [--lift 8] [--frames 12]
Writes OUT_DIR/myrmex-s2.png (the rest pose in a 256x192 frame at x=55, feet on the bottom row) and OUT_DIR/myrmex-s2-walk.png.

Source: tools/myrmex-s2-native.png, the 146x122 sprite keyed from the render (key_render.py --square). Its far foreleg is
bent up in the air and its far hind leg is half hidden behind the near thigh, so both far legs are dropped and rebuilt as
copies of the near legs, darkened to FAR_DARK, drawn behind the body. Each walking leg is cut into three rigid pieces
(thigh/shin/foot, upper/lower/claws) by nearest bone line; everything else (body, head, wings, tail, middle legs, the
roots of the near legs under the body) is one body layer.

Walk: a lateral-sequence gait (near hind, near fore, far hind, far fore, a quarter cycle apart). Each foot is planted for
three quarters of the cycle, sliding back STRIDE*2 px along the ground, then lifts LIFT px (toes tipped down) and swings
forward. Joint positions come from two-bone IK with the source's bone lengths, keeping each knee/elbow on the side it bends
in the art; each piece is rotated about its upper joint (nearest-neighbour, inverse-mapped) and placed on the new joint.
The body bobs 1px twice a cycle. Frame 0 is the rest pose, so the loop starts on the base still.
"""
import argparse, math, os, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('out')
ap.add_argument('--stride', type=float, default=14); ap.add_argument('--lift', type=float, default=8)
ap.add_argument('--frames', type=int, default=12)
A = ap.parse_args()
src = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), 'myrmex-s2-native.png')).convert('RGBA')).astype(np.uint8)
H, W = src.shape[:2]; op = src[..., 3] > 0; yy, xx = np.mgrid[0:H, 0:W]
FW, FH, OX = 256, 192, 55; OY = FH - H; FAR_DARK = 0.72

def dist(p, q):  # distance from every pixel to segment pq (pixel-index coordinates)
    px, py = q[0] - p[0], q[1] - p[1]; t = np.clip(((xx - p[0]) * px + (yy - p[1]) * py) / (px * px + py * py), 0, 1)
    return np.hypot(xx - p[0] - t * px, yy - p[1] - t * py)

# Joints in the source (x, y).
HIP, KNEE, ANKLE = (58, 74), (25, 88), (31, 110)        # near hind leg
SHO, ELB, WRI = (95, 60), (104, 92), (113, 107)         # near foreleg
# The source's far legs: the hind one (crossing behind the near thigh) and the bent-up fore one.
far_hind = op & ((dist((49, 75), (45, 92)) <= 3.5) | (dist((45, 92), (52, 110)) <= 3.5) | ((xx >= 49) & (xx <= 63) & (yy >= 105) & (yy <= 119))) & ~(dist(HIP, KNEE) <= 3.5)
edge = np.where(yy <= 78, 101, 104 + (yy - 72) * 0.2)
far_fore = op & (yy >= 70) & (yy <= 92) & (xx > edge + 0.5) & (xx < 135)
hind_foot = op & ~far_hind & (yy >= 109) & (xx >= 22) & (xx <= 48)
hind = op & ~far_hind & ~hind_foot & (((dist(HIP, KNEE) <= 5.5) & (xx <= 54)) | (dist(KNEE, ANKLE) <= 5))
fore_foot = op & ~far_fore & (yy >= 105) & (xx >= 106) & (xx <= 127)
fore = op & ~far_fore & ~fore_foot & (((dist(SHO, ELB) <= 4.5) & (yy >= 64)) | (dist(ELB, WRI) <= 4.5))
pieces = {'thigh': hind & (dist(HIP, KNEE) <= dist(KNEE, ANKLE)), 'shin': hind & (dist(HIP, KNEE) > dist(KNEE, ANKLE)), 'hfoot': hind_foot,
          'upper': fore & (dist(SHO, ELB) <= dist(ELB, WRI)), 'lower': fore & (dist(SHO, ELB) > dist(ELB, WRI)), 'ffoot': fore_foot}
body = op & ~far_hind & ~far_fore & ~hind & ~hind_foot & ~fore & ~fore_foot
def layer(mask, dark=1.0):
    im = src.copy(); im[~mask] = 0
    if dark != 1: im[..., :3] = (im[..., :3] * dark).astype(np.uint8)
    return im
BODY = layer(body); NEAR = {k: layer(m) for k, m in pieces.items()}; FAR = {k: layer(m, FAR_DARK) for k, m in pieces.items()}

gy, gx = np.mgrid[0:FH, 0:FW]
def blit(canvas, im, piv_src, piv_dst, ang=0.0):
    """Rotate im by ang (rad, clockwise on screen) about piv_src and put piv_src at piv_dst (frame coords); nearest sample."""
    c, s = math.cos(-ang), math.sin(-ang)
    dx, dy = gx + 0.5 - piv_dst[0], gy + 0.5 - piv_dst[1]
    sx = np.floor(c * dx - s * dy + piv_src[0] + 0.5).astype(int); sy = np.floor(s * dx + c * dy + piv_src[1] + 0.5).astype(int)
    ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H); out = np.zeros((FH, FW, 4), np.uint8); out[ok] = im[sy[ok], sx[ok]]
    m = out[..., 3] > 0; canvas[m] = out[m]
def ik(root, foot, j_rest, r_rest, f_rest):
    """Joint position for a two-bone limb from root to foot, bending the same way as in the rest pose."""
    L1, L2 = math.dist(r_rest, j_rest), math.dist(j_rest, f_rest)
    D = min(math.dist(root, foot), L1 + L2 - 0.01); ux, uy = (foot[0] - root[0]) / math.dist(root, foot), (foot[1] - root[1]) / math.dist(root, foot)
    a = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    side = math.copysign(1, (f_rest[0] - r_rest[0]) * (j_rest[1] - r_rest[1]) - (f_rest[1] - r_rest[1]) * (j_rest[0] - r_rest[0]))
    best = None
    for sg in (1, -1):
        jx, jy = ux * math.cos(sg * a) - uy * math.sin(sg * a), ux * math.sin(sg * a) + uy * math.cos(sg * a)
        J = (root[0] + L1 * jx, root[1] + L1 * jy)
        if math.copysign(1, (foot[0] - root[0]) * (J[1] - root[1]) - (foot[1] - root[1]) * (J[0] - root[0])) == side: best = J
    return best
ang = lambda p, q: math.atan2(q[1] - p[1], q[0] - p[0])
def leg(canvas, P, joints, root, foot, foot_tilt):
    (r0, j0, f0), (n1, n2, n3) = joints, ('thigh', 'shin', 'hfoot') if joints[0] == HIP else ('upper', 'lower', 'ffoot')
    L = math.dist(r0, j0) + math.dist(j0, f0) - 0.3; D = math.dist(root, foot)
    if D > L: foot = (root[0] + (foot[0] - root[0]) * L / D, root[1] + (foot[1] - root[1]) * L / D)   # out of reach: claws stay on the limb
    J = ik(root, foot, j0, r0, f0)
    blit(canvas, P[n1], (r0[0] + .5, r0[1] + .5), (root[0] + .5, root[1] + .5), ang(root, J) - ang(r0, j0))
    blit(canvas, P[n2], (j0[0] + .5, j0[1] + .5), (J[0] + .5, J[1] + .5), ang(J, foot) - ang(j0, f0))
    blit(canvas, P[n3], (f0[0] + .5, f0[1] + .5), (foot[0] + .5, foot[1] + .5), foot_tilt)

F = lambda p, dx=0, dy=0: (p[0] + OX + dx, p[1] + OY + dy)   # source -> frame coords
# Far legs: the near legs' pieces, hip/shoulder a little further back on the body, feet spread like the source's hind pair.
# The forelegs are almost straight in the art (shoulder to claws 50.0px of 50.7px of bone), so their feet are planted
# FORE_BACK px further back to give the elbows room to bend, and step FORE_STRIDE of the hind stride.
FORE_BACK, FORE_STRIDE = 10, 0.7
LIMBS = {'RH': (False, (HIP, KNEE, ANKLE), 0, 0, 0.00, 1), 'RF': (False, (SHO, ELB, WRI), 0, -FORE_BACK, 0.25, FORE_STRIDE),
         'LH': (True, (HIP, KNEE, ANKLE), 7, 16, 0.50, 1), 'LF': (True, (SHO, ELB, WRI), 4, 14 - FORE_BACK, 0.75, FORE_STRIDE)}
# far?, joints, root dx, foot dx, phase, stride scale
def step(p, k=1):
    p %= 1; S = A.stride * k
    if p < 0.75: return S - 2 * S * p / 0.75, 0.0, 0.0
    s = (p - 0.75) / 0.25; return -S + 2 * S * s, A.lift * math.sin(math.pi * s), math.radians(14) * math.sin(math.pi * s)
def frame(t):
    cv = np.zeros((FH, FW, 4), np.uint8); bob = round(math.sin(4 * math.pi * t) ** 2)
    pose = {}
    for k, (far, jt, rdx, fdx, ph, sk) in LIMBS.items():
        dx, lift, tilt = step(ph + t, sk); dx0 = step(ph, sk)[0]
        pose[k] = (far, jt, F(jt[0], rdx, -bob), F(jt[2], fdx + dx - dx0, -lift), tilt)
    for k in ('LH', 'LF'): far, jt, r, f, tl = pose[k]; leg(cv, FAR, jt, r, f, tl)
    blit(cv, BODY, (0, 0), (OX, OY - bob))
    for k in ('RH', 'RF'): far, jt, r, f, tl = pose[k]; leg(cv, NEAR, jt, r, f, tl)
    return cv
os.makedirs(A.out, exist_ok=True)
Image.fromarray(frame(0)).save(os.path.join(A.out, 'myrmex-s2.png'), optimize=True)
strip = np.concatenate([frame(i / A.frames) for i in range(A.frames)], 1)
Image.fromarray(strip).save(os.path.join(A.out, 'myrmex-s2-walk.png'), optimize=True)
print(f'rest pose and {A.frames}-frame walk written to {A.out}')
