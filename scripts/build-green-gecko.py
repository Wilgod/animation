"""Run with Blender --background --python scripts/build-green-gecko.py."""
import bpy, math, random
from mathutils import Vector, Matrix, Quaternion
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(28)

# Portable, packed skin texture: fine scales with irregular dark green markings.
size = 512
pixels = []
spots = [(random.random(), random.random(), random.uniform(.009,.025)) for _ in range(180)]
for y in range(size):
    for x in range(size):
        u,v = x/size,y/size
        dark = any((u-a)**2+(v-b)**2 < r*r for a,b,r in spots)
        grain = random.uniform(.75,1.2)
        edge = ((x + (y//5 % 2)*3)%6 == 0 or y%5 == 0)
        c = (.025,.16,.085) if dark else ((.12,.35,.13) if edge else (.22,.57,.23))
        pixels.extend([min(1,k*grain) for k in c]+[1])
tex = bpy.data.images.new('Emerald scales', width=size, height=size)
tex.pixels = pixels
tex.pack()
def material(name, color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1)
    m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.58
    return m
skin=material('Green patterned scales',(.12,.46,.15))
n=skin.node_tree.nodes.new('ShaderNodeTexImage'); n.image=tex
skin.node_tree.links.new(n.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
gold=material('Iris bronze',(.5,.38,.08)); black=material('Glossy black eyes',(.007,.012,.006))
black.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.16
parts=[]; bones=[]; legs=[]
def bone(name,a,b,parent=None): bones.append((name,a,b,parent)); return name
bone('body',(0,-.65,.27),(0,.65,.27))
bone('head',(0,.65,.27),(0,1.75,.27),'body')
def bind(obj,name,mat=skin):
    obj.data.materials.append(mat)
    g=obj.vertex_groups.new(name=name); g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    for p in obj.data.polygons: p.use_smooth=True
    parts.append(obj)
def ellipsoid(name,loc,scale,joint,mat=skin):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bind(o,joint,mat); return o
def link(name,a,b,r1,r2,joint):
    d=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True); bind(o,joint)
ellipsoid('Torso',(0,0,.31),(.285,.73,.22),'body')
# One continuous skull, traced as cross-sections from the supplied top view:
# narrow neck, broad temples, then a gradual taper to a blunt gecko snout.
head_sections=[(.57,.145,.295,.12),(.70,.16,.30,.12),(.84,.205,.305,.13),
               (.98,.252,.31,.137),(1.10,.258,.31,.137),(1.22,.228,.305,.125),
               (1.36,.178,.295,.103),(1.49,.125,.285,.080),
               (1.59,.078,.278,.060),(1.65,.042,.275,.041),(1.68,.008,.275,.012)]
hv=[]; hf=[]; hs=40
for y,w,z,h in head_sections:
    for i in range(hs):
        a=i/hs*math.tau
        # Flatter roof and underside than a spherical head.
        vz=math.copysign(abs(math.sin(a))**.8,math.sin(a))
        hv.append((w*math.cos(a),y,z+h*vz))
for j in range(len(head_sections)-1):
    for i in range(hs):
        a=j*hs+i; b=j*hs+(i+1)%hs
        hf.append((a,a+hs,b+hs,b))
hf.extend([tuple(range(hs)),tuple((len(head_sections)-1)*hs+i for i in reversed(range(hs)))])
hm=bpy.data.meshes.new('Tapered gecko skull'); hm.from_pydata(hv,[],hf); hm.update()
head=bpy.data.objects.new('Head - tapered skull and integrated snout',hm); bpy.context.collection.objects.link(head)
huv=hm.uv_layers.new()
for poly in hm.polygons:
    for li in poly.loop_indices:
        vi=hm.loops[li].vertex_index
        huv.data[li].uv=(vi%hs/hs,vi//hs/(len(head_sections)-1))
bpy.context.view_layer.objects.active=head; head.select_set(True)
sub=head.modifiers.new('Smooth anatomical contour','SUBSURF'); sub.levels=2
bpy.ops.object.modifier_apply(modifier=sub.name)
bind(head,'head')
jaw=material('Soft green lower jaw',(.23,.40,.14))
head.data.materials.append(jaw)
for poly in head.data.polygons:
    if poly.center.z < .235: poly.material_index=1
mouthmat=material('Mouth crease',(.035,.095,.027))
def crease(name,points,radius,mat):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.bevel_depth=radius; curve.bevel_resolution=3
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):
        p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH'); bind(bpy.context.object,'head',mat)
for s in [-1,1]:
    # Small lateral eyes sit within the temples instead of on top of the head.
    ellipsoid('Inset eye socket',(s*.225,1.175,.361),(.038,.073,.047),'head')
    ellipsoid('Bronze lateral eye',(s*.246,1.183,.364),(.022,.049,.033),'head',gold)
    ellipsoid('Vertical pupil',(s*.265,1.183,.368),(.006,.010,.026),'head',black)
    ellipsoid('Nostril',(s*.071,1.535,.332),(.012,.018,.006),'head',mouthmat)
    crease('Subtle mouth line',[(s*.237,1.00,.267),(s*.244,1.10,.263),
           (s*.214,1.23,.257),(s*.162,1.38,.251),(s*.108,1.51,.251),
           (s*.060,1.61,.258),(s*.012,1.67,.266)],.0035,mouthmat)
    for front in [True,False]:
        label=('front' if front else 'rear')+('_L' if s<0 else '_R')
        a=(s*.17,.53 if front else -.47,.28)
        b=(s*.43,.40 if front else -.29,.18)
        c=(s*.62,.60 if front else -.63,.09)
        upper=bone(label,a,b,'body'); lower=bone(label+'_shin',b,c,upper)
        foot=bone(label+'_foot',c,(c[0],c[1]+.15,c[2]),lower)
        legs.append((label,Vector(a),Vector(b),Vector(c),s,front))
        link(label+' upper',a,b,.09,.075,upper)
        ellipsoid(label+' elbow',b,(.079,.079,.079),lower)
        link(label+' lower',b,c,.071,.042,lower)
        ellipsoid(label+' palm',c,(.072,.095,.038),foot)
        for digit in range(5):
            angle=(-80+digit*40)*math.pi/180
            end=(c[0]+s*(.12*math.cos(angle)+.025),c[1]+.19*math.sin(angle),.055)
            mid=tuple(c[i]*.5+end[i]*.5 for i in range(3))
            link(label+' finger',c,mid,.025,.02,foot)
            link(label+' fingertip',mid,end,.02,.013,foot)
            ellipsoid(label+' toe pad',end,(.029,.034,.016),foot)
# A continuous tail mesh, smoothly weighted across five bending joints.
tailpoints=[(0,-.54,.27),(0,-.95,.23),(-.025,-1.38,.18),(-.02,-1.82,.13),(.10,-2.21,.09),(.38,-2.53,.06)]
for i in range(5): bone('tail_'+str(i),tailpoints[i],tailpoints[i+1],'body' if i==0 else 'tail_'+str(i-1))
verts=[]; faces=[]; rings=51; sides=16
for j in range(rings):
    t=j/(rings-1)*5; k=min(4,int(t)); f=t-k
    p=Vector(tailpoints[k]).lerp(Vector(tailpoints[k+1]),f)
    r=.13*(1-j/(rings-1))**1.15+.004
    for h in range(sides):
        a=h/sides*math.tau; verts.append(tuple(p+Vector((math.cos(a)*r,0,math.sin(a)*r*.8))))
for j in range(rings-1):
    for h in range(sides):
        a=j*sides+h; b=j*sides+(h+1)%sides; faces.append((a,b,b+sides,a+sides))
mesh=bpy.data.meshes.new('Continuous tail'); mesh.from_pydata(verts,[],faces); mesh.update()
o=bpy.data.objects.new('Flexible tail',mesh); bpy.context.collection.objects.link(o); parts.append(o); mesh.materials.append(skin)
groups=[o.vertex_groups.new(name='tail_'+str(i)) for i in range(5)]
for j in range(rings):
    t=max(0,j/(rings-1)*5-.5); k=min(4,int(t)); f=t-k if k<4 else 0
    groups[k].add(list(range(j*sides,(j+1)*sides)),1-f,'REPLACE')
    if k<4: groups[k+1].add(list(range(j*sides,(j+1)*sides)),f,'REPLACE')
uv=mesh.uv_layers.new()
for p in mesh.polygons:
    p.use_smooth=True
    for li in p.loop_indices:
        vi=mesh.loops[li].vertex_index; uv.data[li].uv=(vi%sides/sides,vi//sides/(rings-1))
bpy.ops.object.select_all(action='DESELECT')
armdata=bpy.data.armatures.new('Gecko skeleton'); rig=bpy.data.objects.new('Green Gecko Rig',armdata); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
for name,a,b,parent in bones:
    e=armdata.edit_bones.new(name); e.head=a; e.tail=b
    if parent: e.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in parts:
    mod=o.modifiers.new('Skeleton','ARMATURE'); mod.object=rig; o.parent=rig
STRIDE=.36
STANCE=.625
FRAMES=40
FPS=30
def aim(name, start, end):
    pb=rig.pose.bones[name]; rest=pb.bone
    q=(rest.tail_local-rest.head_local).rotation_difference(end-start)
    pb.matrix=Matrix.Translation(start) @ q.to_matrix().to_4x4() @ rest.matrix_local.to_3x3().to_4x4()
    bpy.context.view_layer.update()
max_error=0
for frame in range(FRAMES+1):
    phase=frame/FRAMES*math.tau
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0)
    body=rig.pose.bones['body']
    body.location=(.014*math.sin(phase),0,.005*math.cos(phase*2))
    bpy.context.view_layer.update()
    for label,a,b,c,s,front in legs:
        # Diagonal pairs alternate. During stance, the ankle moves backwards
        # at exactly the forward travel speed; swing reaches forward low to the ground.
        p=(frame/FRAMES+(0 if (front == (s<0)) else .5))%1
        if p < STANCE:
            forward=STRIDE*(.5-p/STANCE); lift=0
        else:
            t=(p-STANCE)/(1-STANCE)
            forward=STRIDE*(-.5+t*t*(3-2*t)); lift=.085*math.sin(math.pi*t)**2
        ankle=Vector((s*.51,(.57 if front else -.59)+forward,.051+lift))
        hip=body.matrix @ body.bone.matrix_local.inverted() @ a
        upper_length=(b-a).length; lower_length=(c-b).length
        direction=ankle-hip; distance=direction.length; axis=direction.normalized()
        assert abs(upper_length-lower_length)<distance<upper_length+lower_length, (label,frame,'unreachable foot')
        along=(upper_length**2-lower_length**2+distance**2)/(2*distance)
        pole=Vector((s*.18,-.38 if front else .38,.04))
        bend=(pole-axis*pole.dot(axis)).normalized()
        elbow=hip+axis*along+bend*math.sqrt(max(0,upper_length**2-along**2))
        aim(label,hip,elbow); aim(label+'_shin',elbow,ankle)
        foot=rig.pose.bones[label+'_foot']
        # Independent ankle joint keeps the palm and toes parallel to the floor.
        foot.matrix=Matrix.Translation(ankle) @ foot.bone.matrix_local.to_3x3().to_4x4()
        bpy.context.view_layer.update()
        max_error=max(max_error,(foot.head-ankle).length)
    for pb in rig.pose.bones:
        if pb.name.startswith('tail_') or pb.name=='head':
            angle=math.sin(phase-int(pb.name[-1])*.5)*.075 if pb.name.startswith('tail_') else -math.sin(phase)*.025
            rest=pb.bone.matrix_local.to_quaternion()
            pb.rotation_quaternion=rest.inverted() @ Quaternion((0,0,1),angle) @ rest
        for prop in ['rotation_quaternion','location','scale']:
            pb.keyframe_insert(data_path=prop,frame=frame,group=pb.name)
assert max_error < .0001, max_error
print('IK_FOOT_TARGET_MAX_ERROR',max_error)
rig.animation_data.action.name='Walk'
bpy.context.scene.frame_start=0; bpy.context.scene.frame_end=FRAMES; bpy.context.scene.render.fps=FPS
bpy.context.scene.frame_set(0)
rig['stride_length']=STRIDE
rig['stance_fraction']=STANCE
rig.show_in_front=True
# Keep the supplied motion sheet inside the editable Blender project.
ref=bpy.data.images.load(str(ROOT/'image/animal/small green Lizard.png')); ref.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'green-gecko.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'green-gecko.glb'),export_format='GLB',export_animations=True,export_frame_range=True)
print('GECKO_BUILD_OK',len(parts),'meshes',len(bones),'bones')
