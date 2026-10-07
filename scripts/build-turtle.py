"""Garden turtle with a scuted shell and four-leg walk, facing +X.
Run: blender --background --python scripts/build-turtle.py
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(31)
skin = mat('Olive pebbled skin', (.26,.32,.12), .63,
           image=texture('Turtle skin', (.29,.35,.15), (.16,.21,.075), (.43,.47,.23), scales=.38))
shell_mat = mat('Olive brown carapace', (.27,.28,.09), .42,
                image=texture('Shell growth mottling', (.29,.30,.10), (.14,.17,.045), (.43,.40,.17), contrast=.18))
seam = mat('Deep scute grooves', (.065,.077,.022), .72)
rim_mat = mat('Golden shell margin', (.44,.38,.16), .56)
belly = mat('Ochre plastron', (.52,.44,.23), .65)
black = mat('Black eyes and nostrils', (.008,.011,.006), .23)
iris = mat('Amber iris', (.48,.39,.13), .35)
claw = mat('Ivory claws', (.69,.63,.42), .6)
stripe = mat('Cream cheek stripes', (.57,.58,.29), .6)

ellipsoid('Plastron', (0,0,.32), (1.04,.76,.16), belly)
ellipsoid('Soft body', (0,0,.40), (.96,.66,.24), skin)
shell = pivot('Carapace', (0,0,0))

def dome(x,y,offset=0):
    return .46 + .60*math.sqrt(max(0,1-(x/1.12)**2-(y/.84)**2))+offset

# Upper half ellipsoid with a closed skirt; the shell underside is plastron.
verts, faces, uvs = [], [], []
for i in range(25):
    a = (i+.001)/24.001*math.pi/2
    for j in range(96):
        b = j/96*math.tau
        x,y = 1.12*math.sin(a)*math.cos(b), .84*math.sin(a)*math.sin(b)
        verts.append((x,y,.46+.60*math.cos(a)))
        uvs.append((j/96,i/24))
for i in range(24):
    for j in range(96):
        faces.append((i*96+j,(i+1)*96+j,(i+1)*96+(j+1)%96,i*96+(j+1)%96))
faces.append(tuple(reversed(range(96))))
mesh_object('Domed carapace', verts, faces, shell_mat, shell, uvs=uvs)
tube('Shell rim', [(1.12*math.cos(a),.84*math.sin(a),.46) for a in [j/160*math.tau for j in range(161)]], .034, rim_mat, shell, sides=12)

def groove(name, points, radius=.012, material=seam):
    samples=[]
    for p,q in zip(points,points[1:]):
        for j in range(12):
            t=j/12
            x,y=p[0]*(1-t)+q[0]*t,p[1]*(1-t)+q[1]*t
            samples.append((x,y,dome(x,y,.006)))
    x,y=points[-1]
    samples.append((x,y,dome(x,y,.006)))
    tube(name,samples,radius,material,shell,sides=8)

# Vertebral plates, paired costal plates, and small marginal scutes.
xs=[-.99,-.60,-.20,.20,.60,.99]
for s in (-1,1):
    edge=[(x,s*(.16 if abs(x)>.9 else .29)) for x in xs]
    groove('Vertebral border',edge)
    for x in xs[1:-1]:
        outer_y=.84*math.sqrt(1-(x/1.12)**2)*.93
        groove('Costal seam',[(x,s*.29),(x+.06,s*.52),(x,s*outer_y)])
for x in xs[1:-1]:
    groove('Vertebral seam',[(x,-.29),(x-.065,0),(x,.29)])
ring=[(1.12*.93*math.cos(j/160*math.tau),.84*.93*math.sin(j/160*math.tau)) for j in range(161)]
groove('Marginal border',ring,.014)
for j in range(24):
    a=j/24*math.tau
    groove('Marginal division',[(1.12*r*math.cos(a),.84*r*math.sin(a)) for r in (.93,.96,.985,.999)],.009)

head = pivot('Head sway', (.88,0,.45))
ellipsoid('Neck', (.12,0,0), (.44,.22,.20), skin, head)
ellipsoid('Head', (.54,0,.05), (.36,.28,.25), skin, head)
ellipsoid('Lower jaw', (.65,0,-.055), (.24,.23,.10), belly, head)
for s in (-1,1):
    ellipsoid('Eye iris', (.61,s*.247,.135), (.075,.031,.079), iris, head)
    ellipsoid('Eye pupil', (.635,s*.27,.145), (.038,.018,.045), black, head)
    ellipsoid('Nostril', (.858,s*.075,.092), (.012,.014,.012), black, head)
    tube('Cheek stripe',[(.27,s*.188,.035),(.43,s*.246,.01),(.65,s*.25,-.025)],.018,stripe,head)
    tube('Mouth line',[(.84,s*.10,-.05),(.76,s*.19,-.09),(.61,s*.226,-.09)],.009,seam,head)
tail = pivot('Tail sway',(-.93,0,.33))
tube('Pointed tail',[(0,0,0),(-.25,0,-.04),(-.49,0,-.10)],[.12,.065,.006],skin,tail,sides=16)

STRIDE,DUTY,FRAMES=.32,.72,96
legs=[]
for s in (-1,1):
    for i,x in enumerate((.66,-.68)):
        phase=(0 if s>0 else .5)+(0 if i==0 else .5)
        leg=Leg(f'leg_{s}_{i}',(x,s*.51,.40),(x+.12,s*.99,.10),(.40,.41),
                (.16,.13,.095),skin,phase,(.3 if i==0 else -.3,s,.3))
        paw=pivot(f'Foot_{s}_{i}',(0,0,0))
        ellipsoid('Broad foot',(0,0,0),(.22,.15,.10),skin,paw)
        for toe in (-1,0,1):
            cone('Claw',(.14,toe*.075,.01),(.27,toe*.085,-.025),.029,.004,claw,paw)
        legs.append((leg,paw))
for frame in range(FRAMES+1):
    p=frame/FRAMES
    for leg,paw in legs:
        leg.key(frame,p,STRIDE,DUTY,.09)
        dx,dz=gait_offset((p+leg.phase)%1,STRIDE,DUTY,.09)
        key_loc(paw,frame,leg.foot+Vector((dx,0,dz)))
    key_rot(head,frame,(0,.025*math.sin(p*math.tau),.035*math.sin(p*math.tau)))
    key_rot(tail,frame,(0,0,.06*math.sin(p*math.tau)))
print('STRIDE_PX',stride_px(STRIDE,DUTY))
export('turtle','Walk',FRAMES)
