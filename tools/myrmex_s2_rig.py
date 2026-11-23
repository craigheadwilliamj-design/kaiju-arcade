#!/usr/bin/env python3
"""Cutout rig for Myrmex Stage 2: poses the keyed sprite's own pixels, so frames never get redrawn (no shimmer).

Usage: python3 tools/myrmex_s2_rig.py OUT_DIR [--stride 24] [--lift 18] [--frames 16] [--duty 0.6]
Writes OUT_DIR/myrmex-s2.png (the rest pose in a 256x192 frame at x=55, feet on the bottom row) and OUT_DIR/myrmex-s2-walk.png.

Source: tools/myrmex-s2-native.png, the 146x122 sprite keyed from the render (key_render.py --square). Its far foreleg is
bent up in the air and its far hind leg is half hidden behind the near thigh, so both far legs are dropped and rebuilt as
copies of the near legs, darkened to FAR_DARK, drawn behind the body. Each walking leg is cut into three rigid pieces
(thigh/shin/foot, upper/lower/claws) by nearest bone line; everything else (body, head, wings, tail, middle legs, the
roots of the near legs under the body) is one body layer, except the two small middle legs, which swing as pendulums
with the stride.

Walk: big sweeping bug steps in a lateral sequence (near hind, near fore, far hind, far fore, a quarter cycle apart). Each
foot is planted for DUTY of the cycle, sliding back 2*STRIDE px along the ground, then lifts up to LIFT px in a high arc
(toes tipped down 30 degrees, eased so the leg whips through mid-swing) and reaches forward. Joint positions come from two-bone IK with the source's bone lengths, keeping each knee/elbow on the side it bends
in the art; each piece is rotated about its upper joint (RotSprite: Scale2x to 8x, rotate, sample centres) and placed on the new joint.
The body bobs 2px twice a cycle. The rest pose (all feet planted at home) is the base still.
"""
import argparse, math, os, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('out')
ap.add_argument('--stride', type=float, default=24); ap.add_argument('--lift', type=float, default=18)
ap.add_argument('--frames', type=int, default=16); ap.add_argument('--duty', type=float, default=0.6)
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
fore_foot = op & ~far_fore & (yy >= 105) & (xx >= 106) & (xx <= 134)
fore = op & ~far_fore & ~fore_foot & (((dist(SHO, ELB) <= 4.5) & (yy >= 64)) | (dist(ELB, WRI) <= 4.5))
pieces = {'thigh': hind & (dist(HIP, KNEE) <= dist(KNEE, ANKLE)), 'shin': hind & (dist(HIP, KNEE) > dist(KNEE, ANKLE)), 'hfoot': hind_foot,
          'upper': fore & (dist(SHO, ELB) <= dist(ELB, WRI)), 'lower': fore & (dist(SHO, ELB) > dist(ELB, WRI)), 'ffoot': fore_foot}
# Middle legs: one rigid piece each hanging from under the belly plates (the orange coxae stay on the body).
MID_N, MID_F = (80, 75), (88, 73)   # pivots: near (bright) and far (dark) middle legs
mid_n = op & (xx >= 75) & (xx <= 84) & (yy >= 77)
mid_f = op & ~fore & ~fore_foot & (xx >= 85) & (xx <= 95) & (yy >= 74)
body = op & ~far_hind & ~far_fore & ~hind & ~hind_foot & ~fore & ~fore_foot & ~mid_n & ~mid_f
def layer(mask, dark=1.0):
    im = src.copy(); im[~mask] = 0
    if dark != 1: im[..., :3] = (im[..., :3] * dark).astype(np.uint8)
    return im
BODY = layer(body); MIDN, MIDF = layer(mid_n), layer(mid_f); NEAR = {k: layer(m) for k, m in pieces.items()}; FAR = {k: layer(m, FAR_DARK) for k, m in pieces.items()}

def scale2x(im):
    """EPX/Scale2x: doubles pixel art, rounding diagonal steps instead of blocking them (the RotSprite upscale)."""
    p = np.pad(im, ((1, 1), (1, 1), (0, 0)), mode='edge'); P = p[1:-1, 1:-1]
    A_, B_, C_, D_ = p[:-2, 1:-1], p[1:-1, 2:], p[1:-1, :-2], p[2:, 1:-1]   # up, right, left, down
    eq = lambda u, v: (u == v).all(-1)
    out = np.repeat(np.repeat(P, 2, 0), 2, 1).copy()
    c0 = eq(C_, A_) & ~eq(C_, D_) & ~eq(A_, B_); c1 = eq(A_, B_) & ~eq(A_, C_) & ~eq(B_, D_)
    c2 = eq(D_, C_) & ~eq(D_, B_) & ~eq(C_, A_); c3 = eq(B_, D_) & ~eq(B_, A_) & ~eq(D_, C_)
    out[0::2, 0::2][c0] = A_[c0]; out[0::2, 1::2][c1] = B_[c1]; out[1::2, 0::2][c2] = C_[c2]; out[1::2, 1::2][c3] = D_[c3]
    return out
UP = 8   # RotSprite: Scale2x three times, rotate nearest at 8x, sample each output pixel's centre
def up8(im): return scale2x(scale2x(scale2x(im)))
gy, gx = np.mgrid[0:FH, 0:FW]
def blit(canvas, im, piv_src, piv_dst, ang=0.0):
    """Rotate im by ang (rad, clockwise on screen) about piv_src and put piv_src at piv_dst (frame coords)."""
    big = up8(im) if abs(ang) > 1e-6 else None
    c, s = math.cos(-ang), math.sin(-ang)
    dx, dy = gx + 0.5 - piv_dst[0], gy + 0.5 - piv_dst[1]
    fx, fy = c * dx - s * dy + piv_src[0], s * dx + c * dy + piv_src[1]
    out = np.zeros((FH, FW, 4), np.uint8)
    if big is None:
        sx, sy = np.floor(fx).astype(int), np.floor(fy).astype(int); ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H); out[ok] = im[sy[ok], sx[ok]]
    else:
        sx, sy = np.floor(fx * UP).astype(int), np.floor(fy * UP).astype(int); ok = (sx >= 0) & (sx < W * UP) & (sy >= 0) & (sy < H * UP); out[ok] = big[sy[ok], sx[ok]]
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
# FORE_BACK px further back, so a forward step ends at the art's (fully reached) claw position and the back of the sweep
# folds the elbow. Forelegs step FORE_STRIDE of the hind stride and lift FORE_LIFT of the hind lift.
FORE_BACK, FORE_STRIDE, FORE_LIFT = 16, 0.67, 0.8
MID_SWING = 16   # middle legs' swing either way, degrees
LIMBS = {'RH': (False, (HIP, KNEE, ANKLE), 0, 0, 0.00, 1, 1), 'RF': (False, (SHO, ELB, WRI), 0, -FORE_BACK, 0.25, FORE_STRIDE, FORE_LIFT),
         'LH': (True, (HIP, KNEE, ANKLE), 7, 16, 0.50, 1, 1), 'LF': (True, (SHO, ELB, WRI), 4, 14 - FORE_BACK, 0.75, FORE_STRIDE, FORE_LIFT)}
# far?, joints, root dx, foot dx (home), phase, stride scale, lift scale
def step(p, k=1, kl=1):
    """Foot x offset from home, lift and toe tilt at cycle phase p: planted for DUTY sliding back, then a high sweeping arc forward."""
    p %= 1; S = A.stride * k; D = A.duty
    if p < D: return S - 2 * S * p / D, 0.0, 0.0
    s = (p - D) / (1 - D); e = 0.5 - 0.5 * math.cos(math.pi * s)   # eased so the leg whips through mid-swing
    return -S + 2 * S * e, A.lift * kl * math.sin(math.pi * s) ** 0.8, math.radians(30) * math.sin(math.pi * s)
def frame(t, rest=False):
    cv = np.zeros((FH, FW, 4), np.uint8); bob = 0 if rest else round(2 * math.sin(4 * math.pi * t) ** 2)
    pose = {}
    for k, (far, jt, rdx, fdx, ph, sk, kl) in LIMBS.items():
        dx, lift, tilt = (0, 0, 0) if rest else step(ph + t, sk, kl)
        pose[k] = (far, jt, F(jt[0], rdx, -bob), F(jt[2], fdx + dx, -lift), tilt)
    # Middle legs swing like pendulums with the stride, out of phase with each other, with a quick flick at the end of
    # each swing (a sharpened sine), so they paddle along instead of hanging dead.
    mid = lambda ph: 0.0 if rest else math.radians(MID_SWING) * math.copysign(abs(math.sin(2 * math.pi * (t + ph))) ** 0.6, math.sin(2 * math.pi * (t + ph)))
    for k in ('LH', 'LF'): far, jt, r, f, tl = pose[k]; leg(cv, FAR, jt, r, f, tl)
    blit(cv, MIDF, (MID_F[0] + .5, MID_F[1] + .5), F((MID_F[0] + .5, MID_F[1] + .5), 0, -bob), mid(0.55))
    blit(cv, BODY, (0, 0), (OX, OY - bob))
    blit(cv, MIDN, (MID_N[0] + .5, MID_N[1] + .5), F((MID_N[0] + .5, MID_N[1] + .5), 0, -bob), mid(0.05))
    for k in ('RH', 'RF'): far, jt, r, f, tl = pose[k]; leg(cv, NEAR, jt, r, f, tl)
    return cv
os.makedirs(A.out, exist_ok=True)
Image.fromarray(frame(0, True)).save(os.path.join(A.out, 'myrmex-s2.png'), optimize=True)
strip = np.concatenate([frame(i / A.frames) for i in range(A.frames)], 1)
Image.fromarray(strip).save(os.path.join(A.out, 'myrmex-s2-walk.png'), optimize=True)
print(f'rest pose and {A.frames}-frame walk written to {A.out}')
