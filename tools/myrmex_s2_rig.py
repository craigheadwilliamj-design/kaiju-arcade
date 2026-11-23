#!/usr/bin/env python3
"""Cutout rig for Myrmex Stage 2: poses the keyed sprite's own pixels, so frames never get redrawn (no shimmer).

Usage: python3 tools/myrmex_s2_rig.py OUT_DIR [--frames 16] [--idle-frames 8] [--run-frames 12]   (gaits: MODES below)
Writes OUT_DIR/myrmex-s2.png (the rest pose in a 256x192 frame at x=55, feet on the bottom row) and OUT_DIR/myrmex-s2-walk.png,
-idle.png, -run.png and the jump strips (-jump-rise, -jump-air, -jump-flap, -jump-land).

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
ap.add_argument('--frames', type=int, default=16); ap.add_argument('--idle-frames', type=int, default=8)
ap.add_argument('--run-frames', type=int, default=12)
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
# The body is split too so it isn't a frozen block: tail, wings and head/neck each hinge on their joint to the core.
WING_P, HEAD_P = (81, 49), (99, 56)
wing_m = body & (xx >= 26) & (xx <= 90) & (yy <= 50) & (yy <= 26 + (xx - 26) * 0.45) & ~((xx <= 37) & (yy >= 20))
# Where the wing's lower-left edge overlaps the top of the tail curl (x 26-37, y 18-31), split by colour: orange/yellow wing
# membrane (green channel >= 90) and the dark outline touching it go with the wing, the red curl with the tail.
G, R = src[..., 1].astype(int), src[..., 0].astype(int)
amb = body & (xx >= 26) & (xx <= 37) & (yy >= 18) & (yy <= 31)
memb = amb & (G >= 90)
near = lambda m: np.pad(m, 1)[2:, 1:-1] | np.pad(m, 1)[:-2, 1:-1] | np.pad(m, 1)[1:-1, 2:] | np.pad(m, 1)[1:-1, :-2]
red = body & (R > 150) & (G < 90)
wing_m = (wing_m & ~amb) | memb | (amb & (R + G < 200) & near(memb) & ~near(red))
# The straight cut leaves the membrane's lower edge on the core (it gapped open when the wings fluttered): take all the
# membrane in the wing area and the dark outline round it, short of outline that also touches the red body.
reg = body & (xx >= 26) & (xx <= 90) & (yy <= 50) & ~((xx <= 37) & (yy >= 31))
memb = reg & (G >= 90)
wing_m |= memb | (reg & (R + G < 200) & near(memb) & ~near(red & ~wing_m))
tail_m = body & ~wing_m & ((xx <= 29) | ((xx <= 37) & (yy >= 20) & (yy <= 45)))
head_m = body & ~wing_m & (((xx >= 100) & (yy <= 58) & (yy <= 56 + (xx - 100) * -0.1 + 6)) | ((xx >= 86) & (yy <= 34)))
core_m = body & ~wing_m & ~tail_m & ~head_m
# Tail chain: joints on the seams between the plates down the middle of the curl, base to stinger. Each tail pixel goes
# to its nearest stretch of the centreline; the last stretch (the bulb) runs on into the stinger flame.
TAIL_J = [(31, 67), (20, 65), (10, 58), (5, 52), (4, 42), (6, 34), (10, 28), (21, 24), (31, 31)]
td = [dist(TAIL_J[i], TAIL_J[i + 1]) for i in range(len(TAIL_J) - 1)]
td[-1] = np.minimum(td[-1], dist(TAIL_J[-1], (35, 42)))
tseg = np.argmin(np.stack(td), 0)
def layer(mask, dark=1.0):
    im = src.copy(); im[~mask] = 0
    if dark != 1: im[..., :3] = (im[..., :3] * dark).astype(np.uint8)
    return im
BODY = layer(core_m); WINGS, HEAD = layer(wing_m), layer(head_m); MIDN, MIDF = layer(mid_n), layer(mid_f); NEAR = {k: layer(m) for k, m in pieces.items()}; FAR = {k: layer(m, FAR_DARK) for k, m in pieces.items()}
TAIL_SEGS = [layer(tail_m & (tseg == i)) for i in range(len(TAIL_J) - 1)]

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
# FORE_BACK px further back: a forward step ends at the art's (fully reached) claw position and the back of the sweep folds
# the elbow. Forelegs step FORE_STRIDE of the hind stride and lift FORE_LIFT of the hind lift.
FORE_BACK, FORE_STRIDE, FORE_LIFT = 16, 0.67, 0.8
TAIL_LAG = 0.55   # each tail joint's delay behind the one before (rad)
LIMBS = {'RH': (False, (HIP, KNEE, ANKLE), 0, 0, 1, 1), 'RF': (False, (SHO, ELB, WRI), 0, -FORE_BACK, FORE_STRIDE, FORE_LIFT),
         'LH': (True, (HIP, KNEE, ANKLE), 7, 16, 1, 1), 'LF': (True, (SHO, ELB, WRI), 4, 14 - FORE_BACK, FORE_STRIDE, FORE_LIFT)}
# far?, joints, root dx, foot dx (home), stride scale, lift scale
# Gaits. phases: each foot's offset in the cycle. stride/lift px, duty = planted share of the cycle. bob: (px, f) dips 2f times a cycle;
# low: px the body sits lower (legs work bent). tail/head/wings: (degrees either way, times per cycle); tail_off/head_off:
# held bend (tail: per joint, negative uncurls; head: positive dips). mid: middle legs' swing, (degrees, times per cycle).
MODES = {
    # Idle: feet planted, the body breathes 1px (knees and elbows flex), slow tail curl, head bob, wing twitch, leg sway.
    'idle': dict(phases=None, bob=(1, 1), low=0, tail=(2, 1), tail_off=0, head=(2, 1), head_off=0, wings=(2, 2), mid=(5, 1)),
    # Walk: big sweeping bug steps in a lateral sequence (near hind, near fore, far hind, far fore).
    'walk': dict(phases={'RH': 0, 'RF': .25, 'LH': .5, 'LF': .75}, stride=24, lift=18, duty=.6, bob=(2, 2), low=0,
                 tail=(3, 1), tail_off=0, head=(4, 2), head_off=0, wings=(3, 4), mid=(16, 1)),
    # Run: a low scuttling trot, diagonal pairs together (near hind + far fore, near fore + far hind), long strides with the
    # feet in the air more than half the time, the body dropped and bobbing hard, the tail partly uncurled to stream back,
    # the head thrust forward and down, the wings buzzing and the middle legs paddling fast.
    'run': dict(phases={'RH': 0, 'LF': 0, 'RF': .5, 'LH': .5}, stride=30, lift=14, duty=.42, bob=(3, 1), low=6,
                tail=(4, 2), tail_off=-3, head=(3, 2), head_off=7, wings=(7, 3), mid=(22, 2)),
}
def step(p, M, k=1, kl=1):
    """Foot x offset from home, lift and toe tilt at cycle phase p: planted for the duty sliding back, then a high arc forward."""
    p %= 1; S = M['stride'] * k; D = M['duty']
    if p < D: return S - 2 * S * p / D, 0.0, 0.0
    s = (p - D) / (1 - D); e = 0.5 - 0.5 * math.cos(math.pi * s)   # eased so the leg whips through mid-swing
    return -S + 2 * S * e, M['lift'] * kl * math.sin(math.pi * s) ** 0.8, math.radians(30) * math.sin(math.pi * s)
def render(P):
    """Draw one pose. P: bob (px up), feet {limb: (dx from home, lift px, toe tilt rad)}, mid (near, far) rad, tail [per-joint rad],
    head rad, wings rad (positive raises them toward upright)."""
    cv = np.zeros((FH, FW, 4), np.uint8); bob = P['bob']; piv = lambda p: (p[0] + .5, p[1] + .5)
    pose = {}
    for k, (far, jt, rdx, fdx, sk, kl) in LIMBS.items():
        dx, lift, tilt = P['feet'][k]
        pose[k] = (jt, F(jt[0], rdx, -bob), F(jt[2], fdx + dx, -lift), tilt)
    for k in ('LH', 'LF'): jt, r, f, tl = pose[k]; leg(cv, FAR, jt, r, f, tl)
    blit(cv, MIDF, piv(MID_F), F(piv(MID_F), 0, -bob), P['mid'][1])
    # The tail curls segment by segment, drawn tip first so each plate overlaps the next one out.
    js, phi = [F(piv(TAIL_J[0]), 0, -bob)], []
    for i in range(len(TAIL_J) - 1):
        a = (phi[-1] if phi else 0) + P['tail'][i]; phi.append(a)
        vx, vy = TAIL_J[i + 1][0] - TAIL_J[i][0], TAIL_J[i + 1][1] - TAIL_J[i][1]
        js.append((js[-1][0] + vx * math.cos(a) - vy * math.sin(a), js[-1][1] + vx * math.sin(a) + vy * math.cos(a)))
    for i in reversed(range(len(TAIL_J) - 1)): blit(cv, TAIL_SEGS[i], piv(TAIL_J[i]), js[i], phi[i])
    # Tail and head go under the core so it hides their seams; the wings go on top.
    blit(cv, HEAD, piv(HEAD_P), F(piv(HEAD_P), 0, -bob), P['head'])
    blit(cv, BODY, (0, 0), (OX, OY - bob))
    blit(cv, WINGS, piv(WING_P), F(piv(WING_P), 0, -bob), P['wings'])
    blit(cv, MIDN, piv(MID_N), F(piv(MID_N), 0, -bob), P['mid'][0])
    for k in ('RH', 'RF'): jt, r, f, tl = pose[k]; leg(cv, NEAR, jt, r, f, tl)
    return cv
NJ = len(TAIL_J) - 1
REST = dict(bob=0, feet={k: (0, 0, 0) for k in LIMBS}, mid=(0.0, 0.0), tail=[0.0] * NJ, head=0.0, wings=0.0)
def cycle_pose(t, M, mode):
    """The pose at cycle position t for a looping gait."""
    if mode == 'idle': bob = round(0.5 - 0.5 * math.cos(2 * math.pi * t))
    else: bob = round(M['bob'][0] * math.sin(2 * math.pi * M['bob'][1] * t) ** 2)   # sin^2: 2*f dips a cycle
    bob -= M['low']   # negative sinks the body
    feet = {k: step(M['phases'][k] + t, M, sk, kl) if M['phases'] else (0, 0, 0) for k, (_, _, _, _, sk, kl) in LIMBS.items()}
    # Middle legs swing like pendulums, out of phase, with a flick at the end of each swing (a sharpened sine).
    def mid(ph):
        x = math.sin(2 * math.pi * (M['mid'][1] * t + ph)); return math.radians(M['mid'][0]) * math.copysign(abs(x) ** 0.6, x)
    w = lambda d, lag: math.radians(d[0]) * math.sin(2 * math.pi * d[1] * t - lag)
    # A wave runs down the tail, each joint a beat after the one before, so the curl ripples and the stinger whips.
    tail = [math.radians(M['tail_off']) + w(M['tail'], 1.2 + TAIL_LAG * i) for i in range(NJ)]
    return dict(bob=bob, feet=feet, mid=(mid(0.05), mid(0.55)), tail=tail, head=math.radians(M['head_off']) + w(M['head'], 0.9), wings=w(M['wings'], 0))
def frame(t, mode=None): return render(cycle_pose(t, MODES[mode], mode) if mode else REST)

# Jump strips, posed by hand (degrees and px; feet lift toward the body, which stays put: physics moves the sprite).
# Wings: positive raises them toward upright, negative sweeps them back; alternating frames read as a buzz.
def jpose(bob=0, lift=0, hdx=0, fdx=0, tilt=0, wings=0, head=0, tail=0, wave=0, mid=0, t=0.0):
    """A jump pose: hind feet trail hdx px and forefeet fdx px from home, all lifted `lift` px with toes tipped `tilt` deg;
    the far pair follows a touch lower. tail: per-joint hold (negative uncurls); wave: tail ripple (deg) at phase t."""
    r = math.radians
    feet = {'RH': (hdx, lift, r(tilt)), 'LH': (hdx + 2, max(0, lift - 3), r(tilt)), 'RF': (fdx, lift * FORE_LIFT, r(tilt)), 'LF': (fdx + 2, max(0, lift * FORE_LIFT - 3), r(tilt))}
    tl = [r(tail) + r(wave) * math.sin(2 * math.pi * t - 1.2 - TAIL_LAG * i) for i in range(NJ)]
    return dict(bob=bob, feet=feet, mid=(r(mid), r(-mid * .7)), tail=tl, head=r(head), wings=r(wings))
AIR = dict(lift=28, hdx=-12, fdx=-6, tilt=30, tail=-1.5)   # tucked in the air, tail streaming a little
JUMP = {
    # Rise (8 frames, played once): crouch with the wings cocked up, spring off all fours on a downstroke, legs tuck as the
    # wings start buzzing; the last frame is the air loop's first.
    'jump-rise': [jpose(),
                  jpose(bob=-4, wings=8, head=3, tail=1),
                  jpose(bob=-7, wings=16, head=5, tail=2, mid=6),
                  jpose(bob=1, wings=-16, head=-4, tail=-1, mid=-10),
                  jpose(lift=10, hdx=-5, fdx=-2, tilt=15, wings=14, tail=-1.5, mid=-6),
                  jpose(lift=22, hdx=-10, fdx=-5, tilt=26, wings=-12, tail=-1.5, mid=4),
                  jpose(**AIR, wings=14, mid=8),
                  jpose(**AIR, wings=-12, mid=4)],
    # Air (6-frame loop): wings buzz three times a loop, legs dangle and sway, the tail ripples, the body bobs 1px.
    'jump-air': [jpose(**{**AIR, 'hdx': AIR['hdx'] + 3 * math.sin(2 * math.pi * i / 6), 'lift': AIR['lift'] - 2 * math.sin(2 * math.pi * i / 6)},
                       bob=round(math.sin(2 * math.pi * i / 6)), wings=14 if i % 2 else -12, wave=4, t=i / 6,
                       mid=8 * math.sin(2 * math.pi * i / 6), head=-2 * math.sin(2 * math.pi * i / 6)) for i in range(6)],
    # Flap (6 frames, played once on an air jump): wings thrown up high, then a hard downstroke as the legs kick down and back,
    # tucking again into the air pose.
    'jump-flap': [jpose(**AIR, wings=24, head=3, mid=10),
                  jpose(lift=10, hdx=-14, fdx=-10, tilt=35, tail=-3, wings=-22, head=-4, bob=1, mid=-14),
                  jpose(lift=13, hdx=-13, fdx=-8, tilt=30, tail=-2.5, wings=-14, head=-2, bob=1, mid=-8),
                  jpose(lift=22, hdx=-13, fdx=-7, tilt=30, tail=-2, wings=10, mid=4),
                  jpose(**AIR, wings=-10, mid=6),
                  jpose(**AIR, wings=14, mid=8)],
    # Land (5 frames, played once): feet down, the body sinks to soak it up with the wings flicking down, then settles.
    'jump-land': [jpose(bob=-3, wings=12, tail=-1, head=2, mid=6),
                  jpose(bob=-6, wings=-8, tail=1.5, head=4, mid=-6),
                  jpose(bob=-5, wings=4, tail=1, head=3, mid=3),
                  jpose(bob=-2, wings=-2, head=1, mid=-1),
                  jpose()],
}
os.makedirs(A.out, exist_ok=True)
Image.fromarray(frame(0)).save(os.path.join(A.out, 'myrmex-s2.png'), optimize=True)
for mode, n in (('walk', A.frames), ('idle', A.idle_frames), ('run', A.run_frames)):
    Image.fromarray(np.concatenate([frame(i / n, mode) for i in range(n)], 1)).save(os.path.join(A.out, f'myrmex-s2-{mode}.png'), optimize=True)
for name, poses in JUMP.items():
    Image.fromarray(np.concatenate([render(P) for P in poses], 1)).save(os.path.join(A.out, f'myrmex-s2-{name}.png'), optimize=True)
print(f'rest pose, walk, idle, run and the jump strips written to {A.out}')
