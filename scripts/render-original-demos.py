"""Original FRAMEFIELD procedural camera studies; no external imagery or footage.
Run: python3 scripts/render-original-demos.py. Requires Pillow and bundled ffmpeg.
"""
from PIL import Image, ImageDraw
import math, subprocess, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/media/originals';OUT.mkdir(parents=True,exist_ok=True)
W,H=768,432
FPS=24; FRAMES=144
FF=ROOT/'node_modules/ffmpeg-static/ffmpeg'
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(v):
 l=math.sqrt(dot(v,v));return tuple(x/l for x in v)
def box(x,y,z,w,h,d,color):
 v=[(x+sx*w/2,y+sy*h,z+sz*d/2) for sx,sy,sz in [(-1,0,-1),(1,0,-1),(1,1,-1),(-1,1,-1),(-1,0,1),(1,0,1),(1,1,1),(-1,1,1)]]
 return [(tuple(v[i] for i in ids),tuple(int(c*f) for c in color)) for ids,f in [([0,1,2,3],.82),([4,7,6,5],.96),([0,3,7,4],.69),([1,5,6,2],.9),([3,2,6,7],1.06)]]
# Read the scene palette from the design system; no CSS image filters.
css=(ROOT/'src/styles/pixel-theme.css').read_text()
def token(name):
 value=re.search(r'--ff-scene-'+name+r':\s*#([0-9a-fA-F]{6})',css).group(1)
 return tuple(int(value[i:i+2],16) for i in (0,2,4))
faces=[]
# Travertine courtyard: staggered flooring, columns and sculptural focal points.
for x in range(-12,13,2):
 for z in range(-12,15,2):faces+=box(x,-.15,z,1.98,.15,1.98,token('ground'))
for z in [-7,-3,1,5,9]:
 for x in [-5,5]:
  faces+=box(x,0,z,.55,5,.65,token('stone'))
  faces+=box(x,5,z,1.0,.35,1.05,token('stone'))
for z in [-7,-3,1,5,9]:faces+=box(0,5.35,z,10.5,.4,.7,token('stone'))
faces+=box(0,0,11,18,6,.4,token('wall'))
for x,z,h in [(-2,1,1.8),(0,4,2.8),(2,7,1.8)]:
 faces+=box(x,0,z,1.4,.45,1.4,token('recess'));faces+=box(x,.45,z,.8,h,.8,token('subject'))
# Planar diagonal sun shadows (original geometry).
for z in [-7,-3,1,5,9]:faces.append((((-5,.012,z),(-4.5,.012,z),(1.5,.012,z+3.2),(1,.012,z+3.2)),token('stone')))
for mode in ['dolly','tracking','pan','orbit']:
 p=subprocess.Popen([str(FF),'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','21','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{mode}.mp4')],stdin=subprocess.PIPE)
 for frame in range(FRAMES):
  t=frame/(FRAMES-1)
  if mode=='dolly':eye=(0,2.3,-10+5*t);target=(0,2.3,6)
  elif mode=='tracking':eye=(-3+6*t,2.6,-6);target=(-3+6*t,2.0,7)
  elif mode=='pan':eye=(0,2.5,-7);target=(-4+8*t,2.5,6)
  else:
   a=math.radians(-30+60*t);eye=(7*math.sin(a),3,4-7*math.cos(a));target=(0,1.9,4)
  f=norm(sub(target,eye));r=norm(cross(f,(0,1,0)));u=cross(r,f);scale=W/(2*math.tan(math.radians(50)/2))
  image=Image.new('RGB',(W,H),token('field'));draw=ImageDraw.Draw(image)
  projected=[]
  for vertices,col in faces:
   view=[(dot(sub(v,eye),r),dot(sub(v,eye),u),dot(sub(v,eye),f)) for v in vertices]
   if min(v[2] for v in view)<.1:continue
   depth=sum(v[2] for v in view)/len(view)
   pts=[(W/2+v[0]*scale/v[2],H/2-v[1]*scale/v[2]) for v in view]
   fog=min(.18,depth/180);color=tuple(round(c*(1-fog)+208*fog) for c in col)
   projected.append((depth,pts,color))
  for _,pts,color in sorted(projected,reverse=True,key=lambda p:p[0]):draw.polygon(pts,fill=color)
  if frame==48:image.save(OUT/f'{mode}.jpg',quality=92)
  p.stdin.write(image.tobytes())
 p.stdin.close()
 if p.wait()!=0:raise RuntimeError('Encoding failed')
 print(mode,'complete',flush=True)
