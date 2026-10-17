# W2 Playground: shared Blender helpers (materials, beveled primitives, joins, bakes).
# Run through world.py / dyn.py with Blender 5.0.1 headless. Everything is procedural; no external meshes.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler, noise

def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip('#')
    return tuple(srgb2lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

MATS = {}

def mat(name, col, rough=0.85, emit=None, es=0.0, var=0.08, scale=2.5, metal=0.0, noshadow=False):
    """Principled material with a little painterly value noise (it bakes into the atlas)."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    c = hexcol(col)
    if var > 0:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale
        nz.inputs['Detail'].default_value = 4.0
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        cr = nt.nodes.new('ShaderNodeValToRGB')
        cr.color_ramp.elements[0].position = 0.3
        cr.color_ramp.elements[1].position = 0.7
        cr.color_ramp.elements[0].color = (*[x * (1 - var) for x in c], 1)
        cr.color_ramp.elements[1].color = (*[min(1, x * (1 + var)) for x in c], 1)
        nt.links.new(nz.outputs['Fac'], cr.inputs['Fac'])
        nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*c, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = 0.25
    if emit:
        b.inputs['Emission Color'].default_value = (*hexcol(emit), 1)
        b.inputs['Emission Strength'].default_value = es
    if (emit and es > 0) or noshadow:
        # lamps let their own light out: shadow rays pass straight through the glowing part
        lp = nt.nodes.new('ShaderNodeLightPath')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mx = nt.nodes.new('ShaderNodeMixShader')
        out = nt.nodes['Material Output']
        nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs['Fac'])
        nt.links.new(b.outputs['BSDF'], mx.inputs[1])
        nt.links.new(tr.outputs['BSDF'], mx.inputs[2])
        nt.links.new(mx.outputs['Shader'], out.inputs['Surface'])
    MATS[name] = m
    return m

def vcol_mat(name='terrain'):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'Col'
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    b.inputs['Specular IOR Level'].default_value = 0.2
    MATS[name] = m
    return m

def active(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

def setmat(o, m):
    if m is None:
        return o
    o.data.materials.clear()
    o.data.materials.append(m)
    return o

def finish(o, bevel=0.0, segs=2, smooth=40, m=None, angle_limit=35):
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = o.modifiers.new('bev', 'BEVEL')
        md.width = bevel
        md.segments = segs
        md.limit_method = 'ANGLE'
        md.angle_limit = math.radians(angle_limit)
        md.use_clamp_overlap = True
        bpy.ops.object.modifier_apply(modifier='bev')
    if smooth:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth))
    setmat(o, m)
    return o

def box(size, loc, rot=(0, 0, 0), bevel=0.03, segs=2, m=None, name='box', smooth=40):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    return finish(o, bevel, segs, smooth, m)

def cyl(r, depth, loc, rot=(0, 0, 0), verts=16, bevel=0.02, segs=2, m=None, name='cyl', smooth=40, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finish(o, bevel, segs, smooth, m)

def ico(r, loc, sub=2, m=None, name='ico', scale=(1, 1, 1), disp=0.0, seed=0, freq=1.5, smooth=180):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    if disp:
        off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
        for v in o.data.vertices:
            n = v.co.normalized()
            v.co += n * disp * noise.noise(v.co * freq + off)
    o.scale = scale
    o.location = loc
    return finish(o, 0, 0, smooth, m)

def torus(R, r, loc, rot=(0, 0, 0), maj=24, mn=10, m=None, name='torus'):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mn, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finish(o, 0, 0, 180, m)

def join(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o

def place(o, loc=(0, 0, 0), rz=0.0):
    """Move a part built around the origin into the world (applied, so joins keep it)."""
    o.matrix_world = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rz, 4, 'Z') @ o.matrix_world
    active(o)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

def group(objs, loc, rz=0.0):
    for o in objs:
        place(o, loc, rz)
    return objs

def point_light(loc, energy, col, radius=0.12, name='pl'):
    d = bpy.data.lights.new(name, 'POINT')
    d.energy = energy
    d.color = col
    d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d)
    o.location = loc
    bpy.context.scene.collection.objects.link(o)
    return o

def spot_light(loc, rot, energy, col, size=60, blend=0.6, radius=0.1, name='sl'):
    d = bpy.data.lights.new(name, 'SPOT')
    d.energy = energy
    d.color = col
    d.spot_size = math.radians(size)
    d.spot_blend = blend
    d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return o

def uv_smart(objs, margin=0.003):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])
        o.data.uv_layers.new(name='bake')
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')

def bake_target(objs, img):
    """Add an active image node to every material on these objects (Cycles bakes into the active node)."""
    seen = set()
    for o in objs:
        for m in o.data.materials:
            if m is None or m.name in seen:
                continue
            seen.add(m.name)
            nt = m.node_tree
            for n in list(nt.nodes):
                if n.name == 'BAKE':
                    nt.nodes.remove(n)
            n = nt.nodes.new('ShaderNodeTexImage')
            n.name = 'BAKE'
            n.image = img
            nt.nodes.active = n

def bake(objs, img, kind='COMBINED', samples=192, color=True, margin=8):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = samples
    sc.render.bake.margin = margin
    sc.render.bake.use_clear = True
    rb = sc.render.bake
    rb.use_pass_direct = True
    rb.use_pass_indirect = True
    if kind == 'COMBINED':
        rb.use_pass_diffuse = True
        rb.use_pass_glossy = False
        rb.use_pass_transmission = False
        rb.use_pass_emit = True
    if kind == 'DIFFUSE':
        rb.use_pass_color = color
    bake_target(objs, img)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type=kind)

def gpu():
    p = bpy.context.preferences.addons['cycles'].preferences
    p.compute_device_type = 'METAL'
    p.get_devices()
    for d in p.devices:
        d.use = d.type != 'CPU'
