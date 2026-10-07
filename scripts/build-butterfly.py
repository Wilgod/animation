"""Build a fully modeled, articulated butterfly from the supplied photo reference."""
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
# Photo-mapped, scalloped wings traced from the first reference pose.
ref=bpy.data.images.load(str(ROOT/'image/animal/Butterfly.png'));ref.pack()
wingphoto=mat('Reference brown orange wing scales',(.5,.24,.07),.85)
nodes=wingphoto.node_tree.nodes; tex=nodes.new('ShaderNodeTexImage');tex.image=ref
wingphoto.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
wingphoto.use_backface_culling=False
sphere('Thorax',(0,0,.52),(.38,.17,.2),dark)
sphere('Tapered abdomen',(-.54,0,.49),(.48,.115,.13),dark)
sphere('Head',(.39,0,.56),(.19,.16,.18),dark)
for side in [-1,1]:
 sphere('Eye '+str(side),(.45,side*.12,.61),(.1,.065,.12),eye)
 tube('Clubbed antenna '+str(side),[(.46,side*.07,.68),(.74,side*.15,.94),(1.13,side*.32,1.16)],.012,dark)
 sphere('Antenna club '+str(side),(1.13,side*.32,1.16),(.045,.022,.024),gold)
 for i,x in enumerate([.18,-.04,-.24]):
  tube('Jointed leg %s %s'%(side,i),[(x,side*.1,.44),(x+.05,side*.32,.25),(x+.25,side*.4,.03),(x+.33,side*.44,.02)],.015,dark)
# Curled proboscis, a characteristic detail visible in the reference.
pts=[(.51,0,.48),(.65,0,.4)]
for i in range(49):
 a=i/48*math.tau*1.6;r=.1*(1-i/65)
 pts.append((.69+r*math.sin(a),0,.3+r*math.cos(a)))
tube('Coiled proboscis',pts,.009,gold)
fore=[(312,275),(287,209),(238,152),(182,108),(122,72),(91,60),(81,75),(84,88),(65,98),(85,108),(88,123),(108,142),(99,160),(74,177),(88,190),(111,200),(89,218),(66,231),(90,243),(133,246),(193,254),(253,269)]
hind=[(308,278),(253,269),(193,254),(133,246),(90,243),(83,263),(61,281),(37,301),(57,309),(84,309),(69,323),(93,325),(98,342),(113,345),(121,364),(140,357),(157,342),(174,329),(178,351),(198,344),(215,328),(226,338),(251,319),(273,303)]
for side in [-1,1]:
 for hindwing,outline in [(False,fore),(True,hind)]:
  pivot=bpy.data.objects.new(('hind' if hindwing else 'fore')+'_wing_'+str(side),None);bpy.context.collection.objects.link(pivot);pivot.location=(0,side*.1,.62)
  # x points toward the head; y spreads laterally; slight camber adds depth.
  verts=[((280-y)/145,side*(312-x)/145,.035*math.sin((312-x)/280*math.pi)) for x,y in outline]
  mesh=bpy.data.meshes.new('Scalloped wing surface');mesh.from_pydata(verts,[],[tuple(range(len(verts)))]);mesh.materials.append(wingphoto)
  uv=mesh.uv_layers.new(name='Reference UV')
  for loop in mesh.loops:
   x,y=outline[loop.vertex_index];uv.data[loop.index].uv=(x/2048,1-y/1117)
  o=bpy.data.objects.new('Photo patterned '+pivot.name,mesh);bpy.context.collection.objects.link(o);o.parent=pivot
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  mod=o.modifiers.new('Triangulated membrane','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Thin wing thickness','SOLIDIFY');mod.thickness=.008;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
  pivot.rotation_mode='XYZ'
  for frame in range(25):
   phase=frame/24*math.tau
   pivot.rotation_euler=(side*(.25+.85*math.sin(phase+(.1 if hindwing else 0))),0,0)
   pivot.keyframe_insert(data_path='rotation_euler',frame=frame)
  pivot.animation_data.action.name='Fly_'+pivot.name
scene=bpy.context.scene;scene.frame_start=0;scene.frame_end=24;scene.render.fps=60;scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'butterfly.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'butterfly.glb'),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True)
import json, struct
path=OUT/'butterfly.glb'; raw=path.read_bytes(); json_len=struct.unpack_from('<I',raw,12)[0]
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
