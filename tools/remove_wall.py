#!/usr/bin/env python3
"""Erase a brown wall/post PixelLab sometimes paints next to a climbing kaiju (the game draws real buildings).
Usage: python3 tools/remove_wall.py strip.png out.png [X0]  -- deletes brown pixels at x >= X0 (default 240) in each
256-wide frame, then any opaque specks there not connected to the body. Check claws survived."""
import sys, numpy as np
from PIL import Image, ImageDraw
src,out,x0=sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 240
im=np.asarray(Image.open(src).convert('RGBA')).copy(); H=im.shape[0]; n=im.shape[1]//256
for i in range(n):
    f=im[:,i*256:(i+1)*256]; r,g,b,a=[f[...,k].astype(int) for k in range(4)]
    brown=(a>8)&(g>=0.38*r)&(b<=g+6)&(r<190)&(r>40)
    band=np.zeros(a.shape,bool); band[:,x0:]=True
    f[brown&band,3]=0
    # drop specks in the band not connected to the body: flood the opaque mask from a body pixel
    m=Image.fromarray(((f[...,3]>8)*255).astype(np.uint8)).copy()
    ys,xs=np.where(f[...,3]>8)
    if not len(xs): continue
    left=xs.argmin(); ImageDraw.floodfill(m,(int(xs[left]),int(ys[left])),128)
    keep=np.asarray(m)==128
    # body may be split; also keep anything left of the band
    keep|=~band
    f[~keep,3]=0
Image.fromarray(im).save(out,optimize=True)
