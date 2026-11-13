#!/usr/bin/env python3
"""Script the skeleton poses for Kaiban Stage 3's walk (PixelLab /animate-with-skeleton-v3).

Usage: python3 tools/kaiban_s3_walk_poses.py DIR FRAMES ARM_DEG LEG_DEG [STRIDE_PX]   (shipped: DIR 12 45 0 20; LEG_DEG unused)

DIR holds skel.json (the /estimate-skeleton result for kaiban-s3.png; a copy is tools/kaiban-s3-skeleton.json). Writes
DIR/poses.json ({first, frames}: first_frame_keypoints and one 18-joint skeleton per frame) and DIR/poses_sheet.png, a
stick-figure preview over the base, so poses can be checked before paying for a generation. Both arms swing +-ARM_DEG
about the shoulders in opposite phase, each foot runs a step cycle +-STRIDE_PX under its hip opposite the same-side arm
(planted and sliding back, then lifted and carried forward) with knees from two-bone IK, the hips sink at full stride, and the lowest ankle stays on the ground line. Run from the repo root.
"""
import json, math, sys
S=sys.argv[1]; N=int(sys.argv[2]); A=math.radians(float(sys.argv[3])); B=math.radians(float(sys.argv[4]))
kp=json.load(open(f'{S}/skel.json'))['keypoints']
base={p['label']:[p['x']*256,p['y']*256] for p in kp}; z={p['label']:int(p['z_index']) for p in kp}
base['LEFT LEG']=[148,244]; base['RIGHT LEG']=[78,244]   # ankles down on the hooves
STR,H=float(sys.argv[5]) if len(sys.argv)>5 else 20,10   # stride half-length and swing-foot lift, px
FOOT={'LEFT':140,'RIGHT':92}   # mid-stride foot x under each hip (the three-quarter view keeps them apart)
def rot(p,c,t):  # swing forward (+x) by t about c, y down
    dx,dy=p[0]-c[0],p[1]-c[1]; return [c[0]+dx*math.cos(t)+dy*math.sin(t), c[1]-dx*math.sin(t)+dy*math.cos(t)]
frames=[]
for i in range(1,N+1):
    ph=2*math.pi*i/N; q={k:v[:] for k,v in base.items()}
    bob=0
    for side,sgn in (('LEFT',1),('RIGHT',-1)):
        t=sgn*A*math.sin(ph)
        sh=q[f'{side} SHOULDER']; el=rot(q[f'{side} ELBOW'],sh,t); wr=rot(q[f'{side} ARM'],sh,t)
        wr=rot(wr,el,0.15*max(t,0))   # forearm leads a little on the forward swing
        q[f'{side} ELBOW'],q[f'{side} ARM']=el,wr
        # Legs: each foot runs a real step cycle under its hip, opposite the same-side arm. Stance (half the cycle): planted on
        # the ground line, sliding back. Swing: lifted and carried forward. Knees come from two-bone IK, bending forward.
        d=-sgn*STR*math.sin(ph); lift=H*max(0,-sgn*math.cos(ph))
        hip=q[f'{side} HIP']; L1=math.dist(base[f'{side} HIP'],base[f'{side} KNEE']); L2=math.dist(base[f'{side} KNEE'],base[f'{side} LEG'])
        hip[1]+=2.5*abs(math.sin(ph))   # hips sink at full stride, rise as the legs pass
        ft=[FOOT[side]+d,244-lift]; D=min(math.dist(hip,ft),L1+L2-0.5)
        ux,uy=(ft[0]-hip[0])/math.dist(hip,ft),(ft[1]-hip[1])/math.dist(hip,ft)
        ang=math.acos(max(-1,min(1,(L1*L1+D*D-L2*L2)/(2*L1*D))))
        kx,ky=ux*math.cos(ang)+uy*math.sin(ang), -ux*math.sin(ang)+uy*math.cos(ang)   # rotate toward +x (knee forward)
        q[f'{side} KNEE']=[hip[0]+L1*kx,hip[1]+L1*ky]; q[f'{side} LEG']=[hip[0]+D*ux,hip[1]+D*uy]
    for k in q: q[k][1]-=bob
    # keep the lowest ankle on the ground line
    low=max(q['LEFT LEG'][1],q['RIGHT LEG'][1]); 
    for k in q: q[k][1]+=244-low
    frames.append([{'x':min(max(q[k][0]/256,0),1),'y':min(max(q[k][1]/256,0),1),'label':k,'z_index':z[k]} for k in q])
first=[{'x':base[k][0]/256,'y':base[k][1]/256,'label':k,'z_index':z[k]} for k in base]
json.dump({'first':first,'frames':frames},open(f'{S}/poses.json','w'))
# preview
from PIL import Image, ImageDraw
im=Image.open('public/assets/kaiban-s3.png')
bones=[('NECK','LEFT SHOULDER'),('NECK','RIGHT SHOULDER'),('LEFT SHOULDER','LEFT ELBOW'),('LEFT ELBOW','LEFT ARM'),('RIGHT SHOULDER','RIGHT ELBOW'),('RIGHT ELBOW','RIGHT ARM'),('NECK','LEFT HIP'),('NECK','RIGHT HIP'),('LEFT HIP','LEFT KNEE'),('LEFT KNEE','LEFT LEG'),('RIGHT HIP','RIGHT KNEE'),('RIGHT KNEE','RIGHT LEG'),('NECK','NOSE')]
sheet=Image.new('RGBA',(256*N//2,512),(40,40,60,255))
for i,f in enumerate(frames):
    c=Image.new('RGBA',(256,256),(40,40,60,255)); g=im.copy(); g.putalpha(g.getchannel('A').point(lambda a:a*0.25)); c.alpha_composite(g)
    d=ImageDraw.Draw(c); P={p['label']:(p['x']*256,p['y']*256) for p in f}
    for a,b in bones: d.line([P[a],P[b]],fill=(0,255,255) if 'LEFT' in a+b else (255,255,0),width=3)
    sheet.paste(c,((i%(N//2))*256,(i//(N//2))*256))
sheet.save(f'{S}/poses_sheet.png')
