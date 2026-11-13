#!/usr/bin/env python3
"""Animate a sprite from scripted skeleton poses with PixelLab's /animate-with-skeleton-v3 and write a horizontal strip.

Usage: python3 tools/pixellab_skeleton.py base.png poses.json out.png --action walk --description "..." [--seed 7]

poses.json is {first, frames}: the 18-joint skeleton the base is in, and one skeleton per output frame (3-15), x/y as
0-1 fractions of the image (tools/kaiban_s3_*_poses.py write these). Cost is by frame count: 8 frames = 3 generations,
15 = 4. The reference frame is not returned. In a Claude Code cloud session the token is injected by the network proxy.
"""
import argparse, base64, io, json, time
from PIL import Image
from pixellab_animate import call
ap=argparse.ArgumentParser(); ap.add_argument('base'); ap.add_argument('poses'); ap.add_argument('out')
ap.add_argument('--action',required=True); ap.add_argument('--description',required=True); ap.add_argument('--seed',type=int,default=0)
ap.add_argument('--direction',default='east'); ap.add_argument('--view',default='side')
a=ap.parse_args(); P=json.load(open(a.poses))
body={'description':a.description,'action':a.action,'direction':a.direction,'view':a.view,
      'first_frame':{'type':'base64','format':'png','base64':base64.b64encode(open(a.base,'rb').read()).decode()},
      'first_frame_keypoints':P['first'],'keypoints':P['frames'],'template_id':'mannequin','seed':a.seed,'no_background':True}
job=call('POST','/animate-with-skeleton-v3',body)['background_job_id']
while (j:=call('GET',f'/background-jobs/{job}'))['status']=='processing': time.sleep(8)
if j['status']!='completed': raise SystemExit(f"job {job} {j['status']}: {str(j.get('last_response'))[:300]}")
imgs=[Image.open(io.BytesIO(base64.b64decode(i['base64'] if isinstance(i,dict) else i))).convert('RGBA') for i in j['last_response']['images']]
w,h=imgs[0].size; s=Image.new('RGBA',(w*len(imgs),h))
for n,f in enumerate(imgs): s.paste(f,(n*w,0))
s.save(a.out,optimize=True); print(f'{a.out}: {len(imgs)} frames of {w}x{h}, usage {j.get("usage")}')
