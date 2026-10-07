"""Build a fully modeled, articulated crab from the supplied photo reference."""
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
# Coordinate convention: +Y faces the claws, +X is sideways travel, +Z is up.
ref=bpy.data.images.load(str(ROOT/'image/animal/crab-walk.png'));ref.pack()
shell=mat('Photo sandy carapace',(.42,.3,.17),.87)
tex=shell.node_tree.nodes.new('ShaderNodeTexImage');tex.image=ref
shell.node_tree.links.new(tex.outputs['Color'],shell.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sand=mat('Warm sandy joints',(.38,.265,.14),.85)
pale=mat('Pincer ivory tips',(.62,.47,.29),.78)
jointmat=mat('Joint creases',(.16,.1,.05),.9)
eye=mat('Dark amber eyes',(.065,.04,.018),.3)

def photo_uv(o,body=False):
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='PhotoUV')
 for loop in o.data.loops:
  co=o.data.vertices[loop.vertex_index].co
  if body: x,y=264+co.x*96,263-co.y*98
  else: x,y=264+co.x*96,263-co.y*98-co.z*25
  uv.data[loop.index].uv=(x/2048,1-y/1117)

def ellipsoid(name,loc,scale,material=shell):
 o=sphere(name,loc,scale,material)
 if material==shell:photo_uv(o)
 return o

body=ellipsoid('Broad domed carapace',(0,0,.64),(.92,.79,.32));photo_uv(body,True)
ellipsoid('Ventral shell',(0,-.03,.49),(.82,.7,.17),sand)
# Low rim and small lateral teeth emphasize the shell silhouette.
for side in [-1,1]:
 for i in range(6):
  a=.15+i*.22;x=side*.88*math.cos(a);y=.76*math.sin(a)
  tube('Shell marginal tooth',[(x,y,.66),(x+side*.085,y+.045,.7)],.035,sand)
 for x in [.37]:
  tube('Eyestalk '+str(side),[(side*x,.61,.72),(side*.43,.83,.85)],.055,sand)
  ellipsoid('Eye '+str(side),(side*.43,.83,.85),(.08,.075,.075),eye)
 tube('Antenna '+str(side),[(side*.1,.74,.63),(side*.13,1,.67)],.014,sand)
 ellipsoid('Mouth plate '+str(side),(side*.12,.7,.51),(.13,.14,.085),sand)
# Small shell granules, combined in one mesh for efficient rendering.
v=[];f=[]
for i in range(650):
 x=random.uniform(-.87,.87);y=random.uniform(-.72,.72);q=(x/.92)**2+(y/.79)**2
 if q>.94:continue
 z=.64+.32*math.sqrt(1-q);r=random.uniform(.009,.022);k=len(v)
 v.extend([(x-r,y,z),(x,y-r,z),(x+r,y,z),(x,y+r,z),(x,y,z+r*.7)])
 f.extend([(k,k+1,k+4),(k+1,k+2,k+4),(k+2,k+3,k+4),(k+3,k,k+4)])
m=bpy.data.meshes.new('Shell grain');m.from_pydata(v,[],f);m.materials.append(sand)
o=bpy.data.objects.new('Fine shell granules',m);bpy.context.collection.objects.link(o)

def segment(name,a,b,r1,r2,material=shell):
 a,b=Vector(a),Vector(b);length=(b-a).length
 verts=[];faces=[]
 for z,r in [(0,r1),(length*.18,r1*1.12),(length*.8,r2*1.15),(length,r2)]:
  for j in range(10):
   t=j/10*math.tau;verts.append((r*math.cos(t),r*.8*math.sin(t),z))
 for i in range(3):
  for j in range(10):faces.append((i*10+j,i*10+(j+1)%10,(i+1)*10+(j+1)%10,(i+1)*10+j))
 faces.extend([tuple(reversed(range(10))),tuple(range(30,40))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material)
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=a;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y')
 for p in mesh.polygons:p.use_smooth=True
 if material==shell:photo_uv(o)
 return o

# Three rigid links per leg. A two-link solver keeps the foot on the floor
# during stance, with alternating sets lifting during the return stroke.
for side in [-1,1]:
 for i in range(4):
  root=Vector((side*.7,.47-i*.34,.55))
  target=Vector((side*(1.92 if i in [1,2] else 1.6),[1.26,.42,-.55,-1.3][i],.025))
  links=[segment('leg_%s_%s_%s'%(side,i,j),(0,0,0),(0,0,1),[.105,.077,.05][j],[.077,.048,.005][j]) for j in range(3)]
  for frame in range(49):
   phase=(frame/48+(i%2)*.5+(0 if side==1 else .5))%1
   stance=phase<.5
   dx=.22*(1-4*phase) if stance else -.22+.44*(phase-.5)*2
   lift=0 if stance else .2*math.sin((phase-.5)*math.tau)
   foot=target+Vector((dx,0,lift));ankle=foot+Vector((-side*.12,.04,.23))
   d=ankle-root;dist=d.length;mid=(root+ankle)/2
   # Equal-length links with a raised, outward elbow.
   normal=Vector((0,.9 if i<2 else -.9,1));normal=(normal-d.normalized()*normal.dot(d.normalized())).normalized()
   knee=mid+normal*math.sqrt(max(.01,.94**2-(dist/2)**2))
   points=[root,knee,ankle,foot]
   for j,o in enumerate(links):
    a,b=points[j:j+2];o.location=a;o.rotation_quaternion=(b-a).to_track_quat('Z','Y');o.scale.z=(b-a).length
    for prop in ['location','rotation_quaternion','scale']:o.keyframe_insert(data_path=prop,frame=frame)
    o.animation_data.action.name='Walk_'+o.name
# Two substantial arms and hooked pincers, held above the walking legs.
for side in [-1,1]:
 a=(side*.66,.5,.59);b=(side*1.04,.95,.75);c=(side*1.1,1.39,.9)
 segment('Claw upper arm '+str(side),a,b,.16,.19)
 ellipsoid('Claw elbow '+str(side),b,(.2,.19,.19),sand)
 segment('Claw forearm '+str(side),b,c,.18,.23)
 ellipsoid('Pincer palm '+str(side),(side*.94,1.64,.94),(.27,.37,.2))
 # Curved tapering fingers turn inward, leaving a visible gripping gap.
 for movable in [False,True]:
  pts=[(side*.85,1.82 if not movable else 1.55,.95),(side*.64,2.0 if not movable else 1.68,.96),(side*.4,2.02 if not movable else 1.78,.95),(side*.29,1.94 if not movable else 1.82,.95)]
  for j in range(3):segment(('Fixed' if not movable else 'Moving')+' pincer %s %s'%(side,j),pts[j],pts[j+1],[.13,.09,.045][j],[.09,.045,.003][j],pale)
scene=bpy.context.scene;scene.frame_start=0;scene.frame_end=48;scene.render.fps=60;scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'crab.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'crab.glb'),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True)
# Merge all rigid-link actions into a single portable Walk clip.
import json,struct
path=OUT/'crab.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);clip={'name':'Walk','samplers':[],'channels':[]}
for action in doc.get('animations',[]):
 offset=len(clip['samplers']);clip['samplers'].extend(action['samplers'])
 for channel in action['channels']:channel['sampler']+=offset;clip['channels'].append(channel)
doc['animations']=[clip];chunk=json.dumps(doc,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4);rest=raw[20+n:]
path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(chunk)+len(rest))+struct.pack('<II',len(chunk),0x4e4f534a)+chunk+rest)
print('CRAB_BUILD_OK',len(clip['channels']))
