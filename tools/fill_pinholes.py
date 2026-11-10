#!/usr/bin/env python3
"""Fill thin (1-2px) transparent cracks enclosed by a sprite body (leftovers from background removal).
Usage: python3 tools/fill_pinholes.py sheet.png [out.png] [FRAME_W=256]
Per frame: finds transparent regions not connected to the frame border, keeps regions that have a "thick" core
(survive a 3x3 erosion -- real openings like jaws/leg gaps), fills the rest from neighbouring opaque colours."""
import sys, numpy as np
from PIL import Image, ImageDraw
def fill_frame(f):
    a=f[...,3]; opaque=a>=128
    h,w=opaque.shape
    p=Image.new('L',(w+2,h+2),0); p.paste(Image.fromarray((opaque*255).astype(np.uint8)),(1,1))
    ImageDraw.floodfill(p,(0,0),128)
    enclosed=(np.asarray(p)[1:-1,1:-1]==0)
    if not enclosed.any(): return 0
    # thick cores: pixels whose 3x3 neighbourhood is entirely enclosed-transparent
    pad=np.pad(enclosed,1); core=np.ones_like(enclosed)
    for dy in (0,1,2):
        for dx in (0,1,2): core&=pad[dy:dy+h,dx:dx+w]
    # regions containing a core are real openings -> keep (flood them out of the fill set)
    keep=np.zeros_like(enclosed)
    if core.any():
        m=Image.fromarray((enclosed*255).astype(np.uint8))
        ys,xs=np.where(core)
        seen=np.zeros_like(enclosed)
        for y,x in zip(ys,xs):
            if seen[y,x]: continue
            t=m.copy(); ImageDraw.floodfill(t,(int(x),int(y)),128)
            reg=np.asarray(t)==128; seen|=reg; keep|=reg
    todo=enclosed&~keep
    n=int(todo.sum()); rgb=f[...,:3].astype(float); known=opaque.copy()
    while todo.any():
        pk=np.pad(known,1); pc=np.pad(rgb,((1,1),(1,1),(0,0)))
        s=np.zeros((h,w,3)); c=np.zeros((h,w))
        for dy in (0,1,2):
            for dx in (0,1,2):
                if dy==1 and dx==1: continue
                k=pk[dy:dy+h,dx:dx+w]; s+=pc[dy:dy+h,dx:dx+w]*k[...,None]; c+=k
        sel=todo&(c>0)
        if not sel.any(): break
        rgb[sel]=s[sel]/c[sel][:,None]; known|=sel; todo&=~sel
    done=enclosed&~keep
    f[...,:3]=np.where(done[...,None],rgb.round().astype(np.uint8),f[...,:3]); f[...,3]=np.where(done,255,f[...,3])
    return n
if __name__=='__main__':
    src=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else src; fw=int(sys.argv[3]) if len(sys.argv)>3 else 256
    im=np.asarray(Image.open(src).convert('RGBA')).copy(); tot=0
    for i in range(im.shape[1]//fw): tot+=fill_frame(im[:,i*fw:(i+1)*fw])
    Image.fromarray(im).save(out,optimize=True); print(f'{src}: filled {tot}px')
