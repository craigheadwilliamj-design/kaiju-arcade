#!/usr/bin/env python3
"""Script the skeleton poses for Kaiban Stage 3's light combo, heavy and ranged (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/kaiban_s3_light_poses.py OUTDIR [DX] [STRIPS]   (run from the repo root; lights and ranged: DX -30, heavy: DX -20 heavy)

Reads tools/kaiban-s3-skeleton.json (the /estimate-skeleton result for kaiban-s3.png), shifts it by DX px (default -30) to match the
shifted base OUTDIR/base{DX}.png it also writes (sprite at x=44+DX; -30 keeps forward punches in the 256px frame), and
writes OUTDIR/{light1,light2,light3,heavy}.json ({first, frames}) plus OUTDIR/*_sheet.png stick-figure previews.
Each strip is a list of per-frame keyframes (lean, hip drop, and per-arm upper/fore angles in degrees from straight down,
positive swinging forward), eased between and ending on the base pose so the combo chains. LEFT is the screen-right arm.
  light1: front-fist jab, cocked back then fired straight out with a lean.
  light2: rear-fist haymaker, wound back behind him then swung across the body, front arm pulled back.
  light3: double-fist hammer, both fists overhead then slammed down in front, knees bending.
  ranged: debris shotgun, both fists dug into the street then heaved up and forward, released on frame 6.
  heavy: 13 frames, cut into heavyRear (1-5, both fists raised far back overhead) and heavySlam (6-13, both fists crashed down to the street).
"""
import json, math, sys
from PIL import Image, ImageDraw
OUT=sys.argv[1]; DX=int(sys.argv[2]) if len(sys.argv)>2 else -30; ONLY=sys.argv[3].split(',') if len(sys.argv)>3 else None
kp=json.load(open('tools/kaiban-s3-skeleton.json'))['keypoints']
B={p['label']:[p['x']*256+DX,p['y']*256] for p in kp}; Z={p['label']:int(p['z_index']) for p in kp}
B['LEFT LEG']=[148+DX,244]; B['RIGHT LEG']=[78+DX,244]
base=Image.open('public/assets/kaiban-s3.png'); left=Image.new('RGBA',base.size); left.paste(base,(DX,0)); left.save(f'{OUT}/base{DX}.png')
def ang(a,b): return math.degrees(math.atan2(b[0]-a[0],b[1]-a[1]))
LEN={s:(math.dist(B[f'{s} SHOULDER'],B[f'{s} ELBOW']),math.dist(B[f'{s} ELBOW'],B[f'{s} ARM'])) for s in ('LEFT','RIGHT')}
REST={s:(ang(B[f'{s} SHOULDER'],B[f'{s} ELBOW']),ang(B[f'{s} ELBOW'],B[f'{s} ARM'])) for s in ('LEFT','RIGHT')}
UPPER=['NOSE','NECK','LEFT EYE','RIGHT EYE','LEFT EAR','RIGHT EAR','LEFT SHOULDER','RIGHT SHOULDER']
def pose(lean=0,drop=0,L=None,R=None,step=0):
    q={k:v[:] for k,v in B.items()}
    for k in ('LEFT HIP','RIGHT HIP'): q[k][1]+=drop
    for k in ('LEFT KNEE','RIGHT KNEE'): q[k][1]+=drop*.5; q[k][0]+=drop*.4
    q['LEFT LEG'][0]+=step; q['LEFT KNEE'][0]+=step*.6
    hx=(q['LEFT HIP'][0]+q['RIGHT HIP'][0])/2; hy=(q['LEFT HIP'][1]+q['RIGHT HIP'][1])/2; t=math.radians(lean)
    for k in UPPER:
        dx,dy=q[k][0]-hx,q[k][1]+drop-hy; q[k]=[hx+dx*math.cos(t)-dy*math.sin(t), hy+dx*math.sin(t)+dy*math.cos(t)]
    for s,a in (('LEFT',L or REST['LEFT']),('RIGHT',R or REST['RIGHT'])):
        sh=q[f'{s} SHOULDER']; l1,l2=LEN[s]; u,f=map(math.radians,a)
        el=[sh[0]+l1*math.sin(u),sh[1]+l1*math.cos(u)]; q[f'{s} ELBOW']=el; q[f'{s} ARM']=[el[0]+l2*math.sin(f),el[1]+l2*math.cos(f)]
    return q
RL,RR=REST['LEFT'],REST['RIGHT']
# keyframes: frame index (0 = base, 8 = last generated frame) -> pose kwargs
STRIPS={
 'light1':{0:{},1:dict(lean=-4,L=(-25,40),R=(5,110)),2:dict(lean=-6,L=(-30,60),R=(10,120)),3:dict(lean=6,L=(70,85),R=(10,120),step=6),
           4:dict(lean=10,L=(88,90),R=(5,115),step=8),5:dict(lean=9,L=(86,88),R=(5,115),step=8),6:dict(lean=4,L=(45,70),R=(0,80),step=4),7:dict(lean=1,L=(20,40),step=1),8:{}},
 'light2':{0:{},1:dict(lean=-5,R=(-30,0),L=(20,90)),2:dict(lean=-8,R=(-32,0),L=(25,110)),3:dict(lean=2,R=(10,60),L=(5,60)),
           4:dict(lean=10,R=(82,86),L=(-15,20),step=6),5:dict(lean=12,R=(92,94),L=(-20,15),step=8),6:dict(lean=7,R=(75,80),L=(-5,20),step=5),7:dict(lean=2,R=(20,40),step=2),8:{}},
 # heavy (generate with DX -20): rear (frames 1-5) and slam (6-13) in one generation. Rear raises both fists up and far back over
 # the head with the body arching back; slam brings both over the top and crashes them down to the street in front, deep crouch and
 # lean on impact (frames 8-10), then recovers to the base pose.
 'heavy':{0:{},1:dict(lean=-2,L=(40,80),R=(35,80)),2:dict(lean=-5,drop=-2,L=(100,140),R=(95,140)),3:dict(lean=-8,drop=-3,L=(150,175),R=(145,175)),
          4:dict(lean=-11,drop=-4,L=(170,195),R=(165,190)),5:dict(lean=-12,drop=-4,L=(175,200),R=(170,195)),
          6:dict(lean=-4,drop=-2,L=(140,140),R=(135,140)),7:dict(lean=10,drop=6,L=(90,80),R=(85,80),step=6),8:dict(lean=26,drop=24,L=(35,20),R=(30,20),step=10),
          9:dict(lean=30,drop=30,L=(30,15),R=(25,15),step=10),10:dict(lean=28,drop=28,L=(30,15),R=(25,15),step=10),11:dict(lean=16,drop=14,L=(25,20),R=(15,20),step=7),
          12:dict(lean=6,drop=5,L=(15,25),R=(0,25),step=3),13:{}},
 # ranged (generate with DX -30): debris shotgun. Leans and crouches deep, both fists driven into the street in front (frames 3-4),
 # then hauled up and forward underhand, released at head height on frame 6 (the strip's impact frame 5, 0-based), settling back.
 'ranged':{0:{},1:dict(lean=10,drop=6,L=(30,20),R=(25,20),step=4),2:dict(lean=22,drop=18,L=(35,20),R=(30,20),step=8),
           3:dict(lean=30,drop=32,L=(30,10),R=(25,10),step=10),4:dict(lean=30,drop=34,L=(20,0),R=(15,0),step=10),
           5:dict(lean=10,drop=12,L=(70,90),R=(65,90),step=10),6:dict(lean=-6,drop=-2,L=(110,120),R=(105,120),step=10),
           7:dict(lean=-2,drop=0,L=(55,55),R=(45,55),step=5),8:{}},
 'light3':{0:{},1:dict(lean=-3,L=(90,140),R=(80,140)),2:dict(lean=-6,L=(145,160),R=(140,160),drop=-2),3:dict(lean=-8,L=(150,170),R=(145,165),drop=-3),
           4:dict(lean=8,L=(110,100),R=(105,100),drop=2),5:dict(lean=18,L=(55,40),R=(50,40),drop=10,step=6),6:dict(lean=16,L=(45,30),R=(42,32),drop=9,step=6),7:dict(lean=7,L=(25,25),R=(5,25),drop=4,step=3),8:{}},
}
def full(kw):
    d=dict(lean=0,drop=0,step=0,L=RL,R=RR); d.update(kw); return d
def lerp(a,b,t):
    e=t*t*(3-2*t)
    return {k:(tuple(x+(y-x)*e for x,y in zip(a[k],b[k])) if isinstance(a[k],tuple) else a[k]+(b[k]-a[k])*e) for k in a}
def j(q): return [{'x':min(max(q[k][0]/256,0),1),'y':min(max(q[k][1]/256,0),1),'label':k,'z_index':Z[k]} for k in q]
bones=[('NECK','LEFT SHOULDER'),('NECK','RIGHT SHOULDER'),('LEFT SHOULDER','LEFT ELBOW'),('LEFT ELBOW','LEFT ARM'),('RIGHT SHOULDER','RIGHT ELBOW'),('RIGHT ELBOW','RIGHT ARM'),('NECK','LEFT HIP'),('NECK','RIGHT HIP'),('LEFT HIP','LEFT KNEE'),('LEFT KNEE','LEFT LEG'),('RIGHT HIP','RIGHT KNEE'),('RIGHT KNEE','RIGHT LEG'),('NECK','NOSE')]
for name,keys in STRIPS.items():
    if ONLY and name not in ONLY: continue
    frames=[pose(**full(keys[i])) for i in range(1,len(keys))]
    json.dump({'first':j(pose()),'frames':[j(q) for q in frames]},open(f'{OUT}/{name}.json','w'))
    sheet=Image.new('RGBA',(256*len(frames),256),(40,40,60,255))
    for i,q in enumerate(frames):
        c=Image.new('RGBA',(256,256),(40,40,60,255)); g=left.copy(); g.putalpha(g.getchannel('A').point(lambda a:a*.25)); c.alpha_composite(g); d=ImageDraw.Draw(c)
        for a,b in bones: d.line([tuple(q[a]),tuple(q[b])],fill=(0,255,255) if 'LEFT' in a+b else (255,255,0),width=3)
        sheet.paste(c,(i*256,0))
    sheet.save(f'{OUT}/{name}_sheet.png')
    ys=[min(min(p['y'] for p in fr) for fr in json.load(open(f'{OUT}/{name}.json'))['frames'])]
    xs=[(min(p['x'] for p in fr),max(p['x'] for p in fr)) for fr in json.load(open(f'{OUT}/{name}.json'))['frames']]
    print(name,'min y px',round(ys[0]*256),'x range px',round(min(a for a,b in xs)*256),round(max(b for a,b in xs)*256))
