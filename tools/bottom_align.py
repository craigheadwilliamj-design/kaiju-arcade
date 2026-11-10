#!/usr/bin/env python3
"""Shift each 256-wide frame of a strip down so its lowest opaque pixel sits on the bottom row (jump strips must be
bottom-aligned: physics moves the kaiju, the art only changes pose). Usage: python3 tools/bottom_align.py in.png out.png"""
import sys, numpy as np
from PIL import Image
src,out=sys.argv[1],sys.argv[2]; FW=256
im=Image.open(src).convert('RGBA'); H=im.height; n=im.width//FW; res=Image.new('RGBA',im.size,(0,0,0,0))
for i in range(n):
    f=im.crop((i*FW,0,(i+1)*FW,H)); bb=f.getbbox(); dy=H-bb[3]
    res.paste(f,(i*FW,dy)) if dy else res.paste(f,(i*FW,0)); print(i,'shift',dy)
res.save(out,optimize=True)
