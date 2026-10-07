"""Build a fully modeled, articulated honeybee from the supplied photo reference."""
import bpy, math, random
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/models'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(14)
def mat(name,c,rough=.55,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 m.diffuse_color=(*c,alpha)
 if alpha<1:m.surface_render_method='DITHERED';m.use_nodes=True
 return m
gold=mat('Honey ochre',(.48,.25,.035));dark=mat('Charcoal brown',(.018,.012,.008));eye=mat('Glossy compound eyes',(.009,.006,.005),.18)
vein=mat('Amber wing veins',(.21,.12,.042),.5)
wingmat=mat('Translucent wing membrane',(.8,.72,.53),.32,.42)
fuzzmat=mat('Golden thorax hairs',(.43,.25,.065),.9)
def sphere(name,loc,scale,material,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 if parent:o.parent=parent
 return o
def tube(name,points,radius,material,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=2
 s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False)
 if parent:o.parent=parent
 return o
# Continuous tapered abdomen with material bands assigned around its axis.
v=[];faces=[];rings=40;sides=48
for i in range(rings+1):
 t=i/rings;x=-1.75+1.55*t;r=.47*math.sin(math.pi*t)**.65
 for j in range(sides):
  a=j/sides*math.tau;v.append((x,r*math.cos(a),.6+r*.82*math.sin(a)))
for i in range(rings):
 for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
mesh=bpy.data.meshes.new('Segmented abdomen');mesh.from_pydata(v,[],faces);mesh.materials.append(gold);mesh.materials.append(dark)
o=bpy.data.objects.new('Striped tapered abdomen',mesh);bpy.context.collection.objects.link(o)
for p in mesh.polygons:
 t=(p.index//sides+.5)/rings;p.material_index=1 if t<.14 or int(t*8)%2==0 else 0;p.use_smooth=True
sphere('Fuzzy thorax',(.02,0,.67),(.58,.45,.49),gold)
sphere('Head',(.69,0,.68),(.35,.35,.37),dark)
for side in [-1,1]:
 sphere('Compound eye '+str(side),(.78,side*.265,.75),(.23,.14,.285),eye)
 tube('Antenna '+str(side),[(.87,side*.15,.93),(1.02,side*.18,1.18),(1.23,side*.28,1.19)],.023,dark)
 sphere('Antenna tip '+str(side),(1.23,side*.28,1.19),(.035,.035,.035),dark)
 tube('Mandible '+str(side),[(.9,side*.1,.5),(1.06,side*.08,.45),(1.11,0,.47)],.025,dark)
 for index,x in enumerate([.36,-.02,-.4]):
  pts=[(x,side*.3,.49),(x-.15,side*.55,.28),(x-.31,side*.62,-.05),(x-.12,side*.72,-.14)]
  tube('Leg %s %s'%(side,index),pts,.035,dark)
  sphere('Leg joint %s %s'%(side,index),pts[1],(.06,.06,.06),gold)
  for toe in [-1,1]:tube('Claw', [pts[-1],(x-.02,side*(.74+toe*.035),-.12)],.013,dark)
# Portable geometry fuzz (no particle-system dependency in GLB).
fv=[];ff=[]
for i in range(1800):
 z=random.uniform(-1,1);a=random.random()*math.tau;q=math.sqrt(1-z*z);n=Vector((q*math.cos(a),q*math.sin(a),z))
 p=Vector((.02+n.x*.58,n.y*.45,.67+n.z*.49));end=p+n*random.uniform(.018,.055)
 tangent=n.cross(Vector((0,0,1)))
 if tangent.length<.01:tangent=Vector((1,0,0))
 tangent.normalize();tangent*=.004;k=len(fv);fv.extend([p-tangent,p+tangent,end]);ff.append((k,k+1,k+2))
m=bpy.data.meshes.new('Fine fur');m.from_pydata(fv,[],ff);m.materials.append(fuzzmat);o=bpy.data.objects.new('Thorax fine golden fuzz',m);bpy.context.collection.objects.link(o)
# Four veined wings; all are actual thin meshes on articulated hinge objects.
for side in [-1,1]:
 for hind in [False,True]:
  pivot=bpy.data.objects.new(('hind' if hind else 'fore')+'_wing_'+str(side),None);bpy.context.collection.objects.link(pivot);pivot.location=(-.2 if hind else .08,side*.25,.97)
  length=1.12 if hind else 1.7;width=.24 if hind else .34
  outline=[]
  for i in range(40):
   a=i/40*math.tau;u=(1-math.cos(a))/2
   outline.append((-length*.52*u+width*math.sin(a),side*length*u, .04*math.sin(math.pi*u)))
  verts=[(-length*.26,side*length*.5,.06)]+outline
  faces=[(0,i+1,(i+1)%40+1) for i in range(40)]
  m=bpy.data.meshes.new('Wing membrane');m.from_pydata(verts,[],faces);m.materials.append(wingmat)
  o=bpy.data.objects.new('Veined '+pivot.name,m);bpy.context.collection.objects.link(o);o.parent=pivot
  tube('Wing rim',outline+[outline[0]],.009,vein,pivot)
  tube('Leading wing vein',[(0,0,0),(-length*.16,side*length*.4,.05),(-length*.52,side*length,.01)],.012,vein,pivot)
  for t in [.3,.48,.67,.83]:
   center=(-length*.52*t,side*length*t,.045)
   span=width*math.sin(math.pi*t)
   tube('Branch vein',[(center[0]-span,center[1],.03),center,(center[0]+span*.7,center[1]+side*.12,.03)],.006,vein,pivot)
  pivot.rotation_mode='XYZ'
  for frame in range(13):
   phase=frame/12*math.tau
   pivot.rotation_euler=(side*(.14+.67*math.sin(phase+(.18 if hind else 0))),0,side*(-.1 if hind else .08))
   pivot.keyframe_insert(data_path='rotation_euler',frame=frame)
  pivot.animation_data.action.name='Fly_'+pivot.name
scene=bpy.context.scene;scene.frame_start=0;scene.frame_end=12;scene.render.fps=60;scene.frame_set(0)
ref=bpy.data.images.load(str(ROOT/'image/animal/bee-fly.png'));ref.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'honeybee.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'honeybee.glb'),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True)
print('BEE_BUILD_OK')
# Blender exports each independent hinge as an action; bundle them into one
# portable Fly clip so other GLB viewers animate all four wings together.
import json, struct
path=OUT/'honeybee.glb'; raw=path.read_bytes(); json_len=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+json_len]); combined={'name':'Fly','samplers':[],'channels':[]}
for action in doc.get('animations',[]):
 offset=len(combined['samplers']);combined['samplers'].extend(action['samplers'])
 for channel in action['channels']:
  channel['sampler']+=offset;combined['channels'].append(channel)
doc['animations']=[combined]
chunk=json.dumps(doc,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4)
rest=raw[20+json_len:]
path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(chunk)+len(rest))+struct.pack('<II',len(chunk),0x4e4f534a)+chunk+rest)
print('FLY_CLIP_CHANNELS',len(combined['channels']))
