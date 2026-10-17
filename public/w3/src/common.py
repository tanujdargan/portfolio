# Shared Blender helpers for W3 "Descent" assets. Blender 5.0.1, run headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python <asset>.py -- <outdir>
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/w3-blender'
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception as e:
        print('GPU setup failed', e)
    sc.cycles.samples = 128
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    return sc


def hexc(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB -> linear
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*c, a)


def mat(name, color, metal=0.0, rough=0.5, emit=None, emit_strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(color) if isinstance(color, str) else color
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = hexc(emit)
        b.inputs['Emission Strength'].default_value = emit_strength
    m['w3_metal'] = metal
    m['w3_rough'] = rough
    return m


def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def box(name, size, loc, m=None, bevel=0.0, segs=2, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    if rot:
        o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel > 0:
        bm = o.modifiers.new('bevel', 'BEVEL')
        bm.width = bevel
        bm.segments = segs
        bm.limit_method = 'ANGLE'
        bm.harden_normals = True
        apply_mods(o)
    if m:
        o.data.materials.append(m)
    shade(o)
    return o


def cyl(name, r, depth, loc, m=None, verts=24, rot=None, bevel=0.0, segs=2):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    o = bpy.context.active_object
    o.name = name
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    if bevel > 0:
        bm = o.modifiers.new('bevel', 'BEVEL')
        bm.width = bevel
        bm.segments = segs
        bm.limit_method = 'ANGLE'
        apply_mods(o)
    if m:
        o.data.materials.append(m)
    shade(o)
    return o


def shade(o, angle=40):
    bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
        except Exception:
            pass


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


def atlas_uv(o, margin=0.004, angle=60):
    """Make 'Atlas' the active UV map and smart-unwrap into it (other UV maps untouched)."""
    me = o.data
    uv = me.uv_layers.get('Atlas') or me.uv_layers.new(name='Atlas')
    me.uv_layers.active = uv
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=1.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    return uv


def image(name, size, alpha=False, non_color=False):
    img = bpy.data.images.get(name)
    if img:
        bpy.data.images.remove(img)
    img = bpy.data.images.new(name, size, size, alpha=alpha, float_buffer=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def set_bake_target(o, img):
    for m in o.data.materials:
        nt = m.node_tree
        n = nt.nodes.get('w3_bake') or nt.nodes.new('ShaderNodeTexImage')
        n.name = 'w3_bake'
        n.image = img
        for x in nt.nodes:
            x.select = False
        n.select = True
        nt.nodes.active = n


def clear_bake_nodes(o):
    for m in o.data.materials:
        n = m.node_tree.nodes.get('w3_bake')
        if n:
            m.node_tree.nodes.remove(n)


def bake(o, kind, img, samples=64, margin=8):
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.render.bake.margin = margin
    set_bake_target(o, img)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    if kind == 'DIFFUSE_COLOR':
        sc.render.bake.use_pass_direct = False
        sc.render.bake.use_pass_indirect = False
        sc.render.bake.use_pass_color = True
        bpy.ops.object.bake(type='DIFFUSE')
    elif kind == 'DIFFUSE_LIT':
        sc.render.bake.use_pass_direct = True
        sc.render.bake.use_pass_indirect = True
        sc.render.bake.use_pass_color = True
        bpy.ops.object.bake(type='DIFFUSE')
    elif kind == 'COMBINED':
        bpy.ops.object.bake(type='COMBINED')
    else:
        bpy.ops.object.bake(type=kind)


def save(img, path):
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()


def swap_to_emission(o, value_fn):
    """Temporarily route each material to an emission of value_fn(material) -> (r,g,b). Returns restore fn."""
    saved = []
    for m in o.data.materials:
        nt = m.node_tree
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        link = out.inputs['Surface'].links[0] if out.inputs['Surface'].links else None
        src = link.from_socket if link else None
        em = nt.nodes.new('ShaderNodeEmission')
        em.name = 'w3_tmp_em'
        v = value_fn(m, nt)
        if isinstance(v, tuple):
            em.inputs['Color'].default_value = (*v, 1)
        else:
            nt.links.new(v, em.inputs['Color'])
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        saved.append((m, src))

    def restore():
        for m, src in saved:
            nt = m.node_tree
            out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            nt.nodes.remove(nt.nodes['w3_tmp_em'])
            if src:
                nt.links.new(src, out.inputs['Surface'])
    return restore


def export_glb(objs, path, extra=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    kw = dict(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_texcoords=True, export_normals=True,
              export_materials='EXPORT', export_yup=True)
    if extra:
        kw.update(extra)
    bpy.ops.export_scene.gltf(**kw)


def earth_world(w, strength=1.0):
    """Space look-dev world: black sky above, a bright blue-white Earth filling the lower hemisphere (with cloud breakup)."""
    w.use_nodes = True
    nt = w.node_tree; N, L = nt.nodes, nt.links
    bg = N['Background']
    tc = N.new('ShaderNodeTexCoord')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Generated'], sep.inputs[0])
    mr = N.new('ShaderNodeMapRange'); L.new(sep.outputs['Z'], mr.inputs['Value'])
    mr.inputs['From Min'].default_value = -0.12; mr.inputs['From Max'].default_value = -0.02
    mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0
    noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 6; noise.inputs['Detail'].default_value = 8
    L.new(tc.outputs['Generated'], noise.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); L.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.45; ramp.color_ramp.elements[0].color = hexc('#163a6b')
    ramp.color_ramp.elements[1].position = 0.62; ramp.color_ramp.elements[1].color = hexc('#c9d6e6')
    # thin bright limb band at the horizon
    limb = N.new('ShaderNodeMapRange'); L.new(sep.outputs['Z'], limb.inputs['Value'])
    limb.inputs['From Min'].default_value = -0.03; limb.inputs['From Max'].default_value = 0.04
    limb.interpolation_type = 'SMOOTHSTEP'
    lb = N.new('ShaderNodeMath'); lb.operation = 'PINGPONG'; lb.inputs[1].default_value = 0.5; L.new(limb.outputs[0], lb.inputs[0])
    lc = N.new('ShaderNodeMix'); lc.data_type = 'RGBA'; lc.inputs[6].default_value = hexc('#000000'); lc.inputs[7].default_value = hexc('#7fb2ff')
    L.new(lb.outputs[0], lc.inputs['Factor'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    L.new(mr.outputs[0], mix.inputs['Factor']); L.new(lc.outputs[2], mix.inputs[6]); L.new(ramp.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength


def cull_hidden(o, rays=40, dist=2.0):
    """Delete faces that can't be seen from outside (every hemisphere ray hits the mesh). Saves atlas space."""
    from mathutils.bvhtree import BVHTree
    import random
    random.seed(3)
    me = o.data
    bm_ = bmesh.new(); bm_.from_mesh(me)
    bm_.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm_)
    dirs = []
    for i in range(rays):
        # cosine-ish hemisphere samples in tangent space
        u, v = random.random(), random.random()
        r = math.sqrt(u); th = 2 * math.pi * v
        dirs.append(Vector((r * math.cos(th), r * math.sin(th), math.sqrt(max(0, 1 - u)))))
    dead = []
    for f in bm_.faces:
        n = f.normal
        if n.length < 1e-9:
            continue
        c = f.calc_center_median()
        t = n.orthogonal().normalized(); b = n.cross(t)
        pts = [c] + [v.co * 0.8 + c * 0.2 for v in f.verts]
        vis = False
        for p0 in pts:
            for d in dirs:
                dw = (t * d.x + b * d.y + n * d.z).normalized()
                hit = tree.ray_cast(p0 + n * 1e-5, dw, dist)
                if hit[0] is None:
                    vis = True; break
            if vis:
                break
        if not vis:
            dead.append(f)
    bmesh.ops.delete(bm_, geom=dead, context='FACES')
    bm_.to_mesh(me); bm_.free()
    print('cull_hidden removed', len(dead))


def only_uv(o, keep=('Atlas', 'CellUV')):
    me = o.data
    for nm in [l.name for l in me.uv_layers]:
        if nm not in keep and not nm.startswith('.'):
            me.uv_layers.remove(me.uv_layers[nm])
    a = me.uv_layers.get('Atlas')
    if a:
        me.uv_layers.active = a
        a.active_render = True
