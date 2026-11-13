#!/usr/bin/env python3
"""Script the skeleton poses for Kaiban Stage 3's charge run and Stampede roar (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/kaiban_s3_charge_poses.py OUTDIR [DX] [STRIPS]   (run from the repo root; shipped: DX -20)

Reads tools/kaiban-s3-skeleton.json (the /estimate-skeleton result for kaiban-s3.png), shifts it DX px to match the shifted base
OUTDIR/base{DX}.png it also writes, and writes OUTDIR/{run,roar}.json ({first, frames}) plus OUTDIR/*_sheet.png stick-figure previews.
He stays upright like the walk instead of dropping onto his knuckles, so walk -> run -> walk never pops between silhouettes.
  run: 8-frame upright head-down tusk charge loop. Torso pitched forward, head dropped so the tusks lead, long strides with a short
       flight phase (both feet up on frames 2 and 6), fists pumping opposite the legs. The lowest foot sits on the ground line except
       in flight; the hips bob down on contact.
  roar: 8 frames after the base: fists hauled up and pounded on the chest twice (1-3), arms flung wide and head thrown back for the
       bellow (4-6, impact on strip frame 5), then pitched forward into run frame 0 (7-8), so the Stampede loop picks up seamlessly.
Angles are degrees from straight down, positive swinging forward (toward +x). LEFT is the near (screen-right) limb.
"""
import json, math, sys
from PIL import Image, ImageDraw
OUT=sys.argv[1]; DX=int(sys.argv[2]) if len(sys.argv)>2 else -20; ONLY=sys.argv[3].split(',') if len(sys.argv)>3 else None
kp=json.load(open('tools/kaiban-s3-skeleton.json'))['keypoints']
B={p['label']:[p['x']*256+DX,p['y']*256] for p in kp}; Z={p['label']:int(p['z_index']) for p in kp}
B['LEFT LEG']=[148+DX,244]; B['RIGHT LEG']=[78+DX,244]   # ankles down on the hooves
GROUND=244
base=Image.open('public/assets/kaiban-s3.png'); shifted=Image.new('RGBA',base.size); shifted.paste(base,(DX,0)); shifted.save(f'{OUT}/base{DX}.png')
def ang(a,b): return math.degrees(math.atan2(b[0]-a[0],b[1]-a[1]))
def seg(s,a,b): return math.dist(B[f'{s} {a}'],B[f'{s} {b}'])
ARM={s:(seg(s,'SHOULDER','ELBOW'),seg(s,'ELBOW','ARM')) for s in ('LEFT','RIGHT')}
LEG={s:(seg(s,'HIP','KNEE'),seg(s,'KNEE','LEG')) for s in ('LEFT','RIGHT')}
AREST={s:(ang(B[f'{s} SHOULDER'],B[f'{s} ELBOW']),ang(B[f'{s} ELBOW'],B[f'{s} ARM'])) for s in ('LEFT','RIGHT')}
LREST={s:(ang(B[f'{s} HIP'],B[f'{s} KNEE']),ang(B[f'{s} KNEE'],B[f'{s} LEG'])) for s in ('LEFT','RIGHT')}
HEAD=['NOSE','LEFT EYE','RIGHT EYE','LEFT EAR','RIGHT EAR']
UPPER=HEAD+['NECK','LEFT SHOULDER','RIGHT SHOULDER']
def rot(p,c,deg):  # rotate p about c; positive pitches forward (clockwise on screen, y down)
    t=math.radians(deg); dx,dy=p[0]-c[0],p[1]-c[1]; return [c[0]+dx*math.cos(t)-dy*math.sin(t), c[1]+dx*math.sin(t)+dy*math.cos(t)]
def fk(q,s,root,a,b,l):
    r=q[root]; u,f=map(math.radians,(a,b)); m=[r[0]+l[0]*math.sin(u),r[1]+l[0]*math.cos(u)]; return m,[m[0]+l[1]*math.sin(f),m[1]+l[1]*math.cos(f)]
def pose(lean=0,head=0,lift=0,L=None,R=None,LL=None,RL=None,ground=True,dx=0):
    """lean: torso pitch about the hips; head: extra pitch about the neck (+ down, - thrown back); lift: px off the ground line when
    ground is False (flight), else the lowest ankle is put on the ground line; L/R arm and LL/RL leg (upper, lower) angles."""
    q={k:v[:] for k,v in B.items()}
    hx=(q['LEFT HIP'][0]+q['RIGHT HIP'][0])/2; hy=(q['LEFT HIP'][1]+q['RIGHT HIP'][1])/2
    # Pitch the spine, not the shoulder line: the near/far shoulder offset is body breadth seen in three-quarter, so it rides along
    # unrotated (rotating it would drop the near shoulder as he leans).
    sm=[(q['LEFT SHOULDER'][0]+q['RIGHT SHOULDER'][0])/2,(q['LEFT SHOULDER'][1]+q['RIGHT SHOULDER'][1])/2]; sm2=rot(sm,(hx,hy),lean)
    for k in UPPER:
        if 'SHOULDER' in k: q[k]=[q[k][0]+sm2[0]-sm[0],q[k][1]+sm2[1]-sm[1]]
        else: q[k]=rot(q[k],(hx,hy),lean)
    for k in HEAD: q[k]=rot(q[k],q['NECK'],head)
    for s,a in (('LEFT',L or AREST['LEFT']),('RIGHT',R or AREST['RIGHT'])): q[f'{s} ELBOW'],q[f'{s} ARM']=fk(q,s,f'{s} SHOULDER',*a,ARM[s])
    for s,a in (('LEFT',LL or LREST['LEFT']),('RIGHT',RL or LREST['RIGHT'])): q[f'{s} KNEE'],q[f'{s} LEG']=fk(q,s,f'{s} HIP',*a,LEG[s])
    low=max(q['LEFT LEG'][1],q['RIGHT LEG'][1]); off=(GROUND-low)-(0 if ground else lift)
    for k in q: q[k]=[q[k][0]+dx,q[k][1]+off]
    return q
AL,AR=AREST['LEFT'],AREST['RIGHT']; LL0,RL0=LREST['LEFT'],LREST['RIGHT']
print('rest arms',[tuple(round(x) for x in AREST[s]) for s in AREST],'legs',[tuple(round(x) for x in LREST[s]) for s in LREST])
# Run cycle, near leg (LEFT) phase. Legs: (thigh, shin). Contact: leg reaching forward, shin near vertical. Passing: thigh under,
# shin folded back. Push-off: thigh back, shin back. Swing: knee driven high forward, shin tucked.
CONTACT=(36,14); DOWN=(8,-12); PUSH=(-28,-38); FLIGHT_BACK=(-22,-70); TUCK=(25,-45); KNEEUP=(55,10)
# Arms (upper, fore): pumping fist forward with the elbow bent / driven back behind the hip.
FWD=(45,105); BACK=(-45,15); MID=(10,70)
RUN=[   # near leg contact -> down -> push -> flight -> far leg contact -> down -> push -> flight
 dict(lean=24,head=14,LL=CONTACT,RL=FLIGHT_BACK,L=BACK,R=FWD),
 dict(lean=26,head=14,LL=DOWN,RL=TUCK,L=MID,R=MID),
 dict(lean=24,head=12,LL=PUSH,RL=KNEEUP,L=FWD,R=BACK,ground=False,lift=6),
 dict(lean=23,head=13,LL=FLIGHT_BACK,RL=CONTACT,L=FWD,R=BACK,ground=False,lift=3),
 dict(lean=24,head=14,LL=FLIGHT_BACK,RL=CONTACT,L=FWD,R=BACK),
 dict(lean=26,head=14,LL=TUCK,RL=DOWN,L=MID,R=MID),
 dict(lean=24,head=12,LL=KNEEUP,RL=PUSH,L=BACK,R=FWD,ground=False,lift=6),
 dict(lean=23,head=13,LL=CONTACT,RL=FLIGHT_BACK,L=BACK,R=FWD,ground=False,lift=3),
]
CHEST_L=(30,-165); CHEST_R=(75,150)   # fist folded onto the chest (near arm), far fist swung across onto it
UP_L=(70,-170); UP_R=(95,175)          # fist cocked up off the chest for the next blow
WIDE_L=(120,150); WIDE_R=(-120,-150)   # arms flung wide and up
ROAR=[
 dict(lean=-2,head=-3,L=UP_L,R=(20,60)),
 dict(lean=-5,head=-6,L=CHEST_L,R=UP_R),            # near fist pounds
 dict(lean=-5,head=-6,L=UP_L,R=CHEST_R),            # far fist pounds
 dict(lean=-6,head=-6,L=CHEST_L,R=UP_R),            # near again
 dict(lean=-12,head=-38,L=WIDE_L,R=WIDE_R),         # head thrown back (bellow on strip frame 5 = this + the base)
 dict(lean=-13,head=-42,L=(125,155),R=(-125,-155)),
 dict(lean=6,head=4,L=(35,70),R=(-25,10),LL=(22,2),RL=(-8,-25)),
 dict(lean=18,head=11,L=(-20,30),R=(45,100),LL=(26,6),RL=(-18,-50)),
]
ROAR.append(RUN[0])
STRIPS={'run':RUN,'roar':ROAR}
def j(q): return [{'x':min(max(q[k][0]/256,0),1),'y':min(max(q[k][1]/256,0),1),'label':k,'z_index':Z[k]} for k in q]
bones=[('NECK','LEFT SHOULDER'),('NECK','RIGHT SHOULDER'),('LEFT SHOULDER','LEFT ELBOW'),('LEFT ELBOW','LEFT ARM'),('RIGHT SHOULDER','RIGHT ELBOW'),('RIGHT ELBOW','RIGHT ARM'),('NECK','LEFT HIP'),('NECK','RIGHT HIP'),('LEFT HIP','LEFT KNEE'),('LEFT KNEE','LEFT LEG'),('RIGHT HIP','RIGHT KNEE'),('RIGHT KNEE','RIGHT LEG'),('NECK','NOSE')]
for name,keys in STRIPS.items():
    if ONLY and name not in ONLY: continue
    frames=[pose(**kw) for kw in keys]
    json.dump({'first':j(pose()),'frames':[j(q) for q in frames]},open(f'{OUT}/{name}.json','w'))
    sheet=Image.new('RGBA',(256*len(frames),256),(40,40,60,255))
    for i,q in enumerate(frames):
        c=Image.new('RGBA',(256,256),(40,40,60,255)); g=shifted.copy(); g.putalpha(g.getchannel('A').point(lambda a:a*.25)); c.alpha_composite(g); d=ImageDraw.Draw(c)
        d.line([(0,GROUND),(256,GROUND)],fill=(90,90,90))
        for a,b in bones: d.line([tuple(q[a]),tuple(q[b])],fill=(0,255,255) if 'LEFT' in a+b else (255,255,0),width=3)
        sheet.paste(c,(i*256,0))
    sheet.save(f'{OUT}/{name}_sheet.png')
    xs=[x for q in frames for x,_ in q.values()]; ys=[y for q in frames for _,y in q.values()]
    print(name,len(frames),'frames; x',round(min(xs)),round(max(xs)),'y',round(min(ys)),round(max(ys)))
