"""Belial hide recolour: pink hide -> grey-green, red spines/stripes -> dark umber-grey, red/pink slash effects -> acid green.
Usage: python3 -I tools/belial_recolor.py in.png out.png [FRAME_W=256]
Warm pixels (hue 330..20, or up to 40 when very light; not near-black) split by saturation: < .57 hide, >= .57 spines/stripes. An effect is a warm
8-connected component (per class, per frame) whose pixels largely border transparency: body regions sit inside the black
outline, slash smears float on the background."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, __import__('os').path.dirname(__file__))
from recolor_hls import hls, torgb
HIDE=(95,.14,.92); RED=(25,.22,.72); FX=(78,.78,1.0)
def paint(out,mask,l,spec):
    hu,sa,lm=spec; new=torgb(hu,sa,np.clip(l*lm,0,1)); out[...,:3]=np.where(mask[...,None],np.round(new*255),out[...,:3]).astype(np.uint8)
def frame(f):
    h,l,s=hls(f); op=f[...,3]>0; warm=op&((h>=330)|(h<=20)|((h<=40)&(l>.75)))&(l>.12)
    fx=np.zeros_like(op); stats=[]
    for cls in (warm&(s<.57), warm&(s>=.57)):
        lab,k=nd.label(cls,np.ones((3,3)))
        for i,sl in enumerate(nd.find_objects(lab)):
            if sl is None: continue
            y0,y1,x0,x1=max(sl[0].start-1,0),sl[0].stop+1,max(sl[1].start-1,0),sl[1].stop+1
            c=lab[y0:y1,x0:x1]==i+1
            if c.sum()<12: continue
            ring=nd.binary_dilation(c,np.ones((3,3)))&~c; t=(ring&~op[y0:y1,x0:x1]).sum()/max(ring.sum(),1); o=(ring&op[y0:y1,x0:x1]&(l[y0:y1,x0:x1]<.12)).sum()/max(ring.sum(),1)
            if t>=.38 and o<.3: m=np.zeros_like(op); m[y0:y1,x0:x1]=c; fx|=m; stats.append((int(c.sum()),round(float(t),2)))
    fx&=~nd.binary_dilation(op&(l<.12),np.ones((3,3)),iterations=2)  # spines swallowed by a smear keep their outline: stay body
    out=f.copy(); paint(out,warm&~fx&(s<.57),l,HIDE); paint(out,warm&~fx&(s>=.57),l,RED); paint(out,fx,l,FX)
    return out,stats
src,dst=sys.argv[1],sys.argv[2]; fw=int(sys.argv[3]) if len(sys.argv)>3 else 256
a=np.asarray(Image.open(src).convert('RGBA')); res=a.copy()
for i in range(a.shape[1]//fw):
    res[:,i*fw:(i+1)*fw],st=frame(a[:,i*fw:(i+1)*fw])
    if st: print(src.split('/')[-1],'frame',i,'fx',st)
Image.fromarray(res).save(dst)
