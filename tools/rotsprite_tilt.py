#!/usr/bin/env python3
"""Tilt each 256x192 frame of a strip clockwise by per-frame angles (degrees), RotSprite style (Scale2x three times, rotate
at 8x, sample each pixel centre), then bottom-align. Usage: python3 tools/rotsprite_tilt.py in.png out.png a0,a1,...
(rotation about the sprite's bounding-box centre; the last angle repeats for any further frames)"""
import sys, math, numpy as np
from PIL import Image
def scale2x(im):
    p=np.pad(im,((1,1),(1,1),(0,0)),mode='edge');P=p[1:-1,1:-1]
    A_,B_,C_,D_=p[:-2,1:-1],p[1:-1,2:],p[1:-1,:-2],p[2:,1:-1]
    eq=lambda u,v:(u==v).all(-1)
    out=np.repeat(np.repeat(P,2,0),2,1).copy()
    c0=eq(C_,A_)&~eq(C_,D_)&~eq(A_,B_);c1=eq(A_,B_)&~eq(A_,C_)&~eq(B_,D_)
    c2=eq(D_,C_)&~eq(D_,B_)&~eq(C_,A_);c3=eq(B_,D_)&~eq(B_,A_)&~eq(D_,C_)
    out[0::2,0::2][c0]=A_[c0];out[0::2,1::2][c1]=B_[c1];out[1::2,0::2][c2]=C_[c2];out[1::2,1::2][c3]=D_[c3]
    return out
def rot(f,deg):
    if not deg: return f
    a=np.asarray(f);ys,xs=np.nonzero(a[...,3]);cx,cy=(xs.min()+xs.max()+1)/2,(ys.min()+ys.max()+1)/2
    u=scale2x(scale2x(scale2x(a)));H,W=a.shape[:2]
    gy,gx=np.mgrid[0:H,0:W];px,py=gx+.5-cx,gy+.5-cy;t=math.radians(deg)
    sx=cx+px*math.cos(t)+py*math.sin(t);sy=cy-px*math.sin(t)+py*math.cos(t)   # inverse of a clockwise rotation
    ix=np.floor(sx*8).astype(int);iy=np.floor(sy*8).astype(int)
    ok=(ix>=0)&(iy>=0)&(ix<W*8)&(iy<H*8);out=np.zeros_like(a);out[ok]=u[iy[ok],ix[ok]]
    return out
src,dst,angs=sys.argv[1],sys.argv[2],[float(v) for v in sys.argv[3].split(',')]
im=np.asarray(Image.open(src).convert('RGBA'));n=im.shape[1]//256;outs=[]
for i in range(n):
    f=rot(im[:,i*256:(i+1)*256],angs[i] if i<len(angs) else angs[-1])
    ys=np.nonzero(f[...,3].any(1))[0];sh=191-ys.max();g=np.zeros_like(f);g[sh:]=f[:192-sh] if sh>0 else f;outs.append(g)
Image.fromarray(np.concatenate(outs,1)).save(dst)
