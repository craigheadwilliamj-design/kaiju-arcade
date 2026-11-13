#!/usr/bin/env python3
"""Make a heavy-attack hold loop by shuddering one frame: the rows above SPLIT jitter 1px (right, back, left, back) while the
feet stay planted, so it can't drift from the rear strip's last pose and costs no generation.
Usage: python3 tools/shudder_hold.py strip.png FRAME out.png [SPLIT=200] [FRAME_W=256]"""
import sys
from PIL import Image
src,idx,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]; split=int(sys.argv[4]) if len(sys.argv)>4 else 200; fw=int(sys.argv[5]) if len(sys.argv)>5 else 256
im=Image.open(src).convert('RGBA'); f=im.crop((idx*fw,0,idx*fw+fw,im.height)); top=f.crop((0,0,fw,split)); feet=f.crop((0,split,fw,im.height))
s=Image.new('RGBA',(fw*4,im.height))
for n,dx in enumerate((0,1,0,-1)):
    s.alpha_composite(feet,(n*fw,split)); s.alpha_composite(top,(n*fw+dx,0))
s.save(out,optimize=True); print(out)
