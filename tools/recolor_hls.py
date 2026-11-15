import numpy as np
def hls(a):
    rgb=a[...,:3].astype(float)/255; mx=rgb.max(-1); mn=rgb.min(-1); l=(mx+mn)/2; d=mx-mn
    s=np.where(d==0,0,d/np.maximum(1e-6,1-np.abs(2*l-1))); r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    h=np.where(mx==r,((g-b)/np.maximum(d,1e-6))%6,np.where(mx==g,(b-r)/np.maximum(d,1e-6)+2,(r-g)/np.maximum(d,1e-6)+4))*60
    return h,l,s
def torgb(H,S,L):
    H=H/360; C=(1-np.abs(2*L-1))*S; X=C*(1-np.abs((H*6)%2-1)); m=L-C/2; k=int(H*6)%6
    tbl=[(C,X,0*C),(X,C,0*C),(0*C,C,X),(0*C,X,C),(X,0*C,C),(C,0*C,X)][k]; return np.stack([t+m for t in tbl],-1)
def recolor(a, hide=(95,.14,.92), red=(28,.2,.85)):
    """Hide: pink (hue 330..30, sat<.57). Red: spines/stripes (hue 330..30, sat>=.57). Both remapped keeping relative lightness."""
    h,l,s=hls(a); warm=(a[...,3]>0)&((h>=330)|(h<=30))&(l>.12)
    out=a.copy()
    for mask,(hu,sa,lm) in [(warm&(s<.57),hide),(warm&(s>=.57),red)]:
        new=torgb(hu,sa,np.clip(l*lm,0,1)); out[...,:3]=np.where(mask[...,None],np.round(new*255),out[...,:3]).astype(np.uint8)
    return out
