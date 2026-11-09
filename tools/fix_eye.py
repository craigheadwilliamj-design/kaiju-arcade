#!/usr/bin/env python3
"""Restore a detail that a PixelLab strip washed out (e.g. Mogurodon Stage 1 eye glint) by tracking it from frame 0.

Usage: python3 tools/fix_eye.py strip.png out.png   (eye search region is set for Mogurodon Stage 1; adjust `region` for other forms)
"""
import sys, numpy as np
from PIL import Image
src,out=sys.argv[1],sys.argv[2]; FW=256
im=np.asarray(Image.open(src).convert('RGBA')).copy(); n=im.shape[1]//FW
F=[im[:,i*FW:(i+1)*FW] for i in range(n)]
f0=F[0].astype(int); r,g,b,a=[f0[...,k] for k in range(4)]
region=np.zeros(a.shape,bool); region[70:110,200:240]=True
eye=region&(a>200)&(r>170)&(g>100)&(b<80)&(g-b>60)
ys,xs=np.where(eye); y0,y1,x0,x1=ys.min()-5,ys.max()+6,xs.min()-6,xs.max()+7
tpl=f0[y0:y1,x0:x1,:3]; tm=f0[y0:y1,x0:x1,3]>128
for i in range(1,n):
    f=F[i].astype(int); best=None
    for dy in range(-8,9):
        for dx in range(-8,9):
            p=f[y0+dy:y1+dy,x0+dx:x1+dx]; m=tm&(p[...,3]>128)
            # ignore the eye pixels themselves (they are the part that changed)
            m&=~eye[y0:y1,x0:x1]
            d=((p[...,:3]-tpl)**2).sum(-1)[m].mean()
            if best is None or d<best[0]: best=(d,dy,dx)
    _,dy,dx=best
    F[i][ys+dy,xs+dx]=F[0][ys,xs]
    print(i,'offset',dy,dx)
Image.fromarray(np.concatenate(F,1)).save(out,optimize=True)
