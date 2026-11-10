#!/usr/bin/env python3
"""Delete tiny detached specks (opaque islands of <= MAX px, 8-connected, not part of the largest shape) from each frame of a strip.
Usage: python3 tools/remove_specks.py sheet.png [out.png] [FRAME_W=256] [MAX=4]   (needs scipy)"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else src
fw=int(sys.argv[3]) if len(sys.argv)>3 else 256; mx=int(sys.argv[4]) if len(sys.argv)>4 else 4
im=np.asarray(Image.open(src).convert('RGBA')).copy(); tot=0
for i in range(im.shape[1]//fw):
    f=im[:,i*fw:(i+1)*fw]; lab,k=nd.label(f[...,3]>0,np.ones((3,3)))
    if k<2: continue
    sz=nd.sum(f[...,3]>0,lab,range(1,k+1)); kill=np.isin(lab,[j+1 for j in range(k) if sz[j]<=mx and sz[j]<sz.max()])
    f[kill]=0; tot+=int(kill.sum())
if tot: Image.fromarray(im).save(out,optimize=True)
print(f'{src}: removed {tot}px')
