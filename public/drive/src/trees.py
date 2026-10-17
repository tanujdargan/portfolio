# Tree impostors from Poly Haven's "Fir Tree 01" (CC0, Rico Cilliers / Rob Tuytel). The full trees are 1–2 million
# polygons each, so they are rendered once into a 4-cell atlas (three firs and one turned): colour under an even sky
# (albedo with the canopy's own occlusion) and a view-space normal pass, so the runtime can light each billboard with
# the low sun per pixel.   Blender -b /tmp/drive-dl/fir/fir.blend --python trees.py -- <outdir>
import bpy, math, os, sys
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1]
sc = bpy.context.scene
p = bpy.context.preferences.addons['cycles'].preferences
p.compute_device_type = 'METAL'
p.get_devices()
for d in p.devices:
    d.use = d.type != 'CPU'
sc.render.engine = 'CYCLES'
sc.cycles.device = 'GPU'
sc.cycles.samples = int(os.environ.get('SPP', 64))
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
CW, CH = 512, 1024
sc.render.resolution_x, sc.render.resolution_y = CW, CH

trees = [('fir_tree_01_a_LOD0', 'fir_tree_01_trunk_a', 0.0), ('fir_tree_01_b_LOD0', 'fir_tree_01_trunk_b', 0.0), ('fir_tree_01_c_LOD0', 'fir_tree_01_trunk_c', 0.0), ('fir_tree_01_a_LOD0', 'fir_tree_01_trunk_a', 2.1)]
keep = {t[0] for t in trees} | {t[1] for t in trees}
for o in bpy.data.objects:
    if o.type in ('MESH', 'CURVE'):
        o.hide_render = o.name not in keep

# even sky light
w = bpy.data.worlds.new('even')
sc.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.8, 0.85, 0.95, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

cam_d = bpy.data.cameras.new('c')
cam_d.type = 'ORTHO'
cam_d.ortho_scale = 21.0  # 10.5 m wide x 21 m tall
cam = bpy.data.objects.new('c', cam_d)
sc.collection.objects.link(cam)
sc.camera = cam

def normal_mode(on):
    """swap every material's output for an emission of its view-space normal, keeping its alpha cut-out"""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        out_n = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
        if out_n is None:
            continue
        if on:
            m['orig'] = out_n.inputs['Surface'].links[0].from_socket.path_from_id() if out_n.inputs['Surface'].links else ''
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            vt = nt.nodes.new('ShaderNodeVectorTransform')
            vt.vector_type = 'NORMAL'
            vt.convert_from = 'WORLD'
            vt.convert_to = 'CAMERA'
            nt.links.new(geo.outputs['Normal'], vt.inputs['Vector'])
            mp = nt.nodes.new('ShaderNodeVectorMath')
            mp.operation = 'MULTIPLY_ADD'
            mp.inputs[1].default_value = (0.5, 0.5, -0.5)
            mp.inputs[2].default_value = (0.5, 0.5, 0.5)
            nt.links.new(vt.outputs['Vector'], mp.inputs[0])
            em = nt.nodes.new('ShaderNodeEmission')
            nt.links.new(mp.outputs['Vector'], em.inputs['Color'])
            tr = nt.nodes.new('ShaderNodeBsdfTransparent')
            mx = nt.nodes.new('ShaderNodeMixShader')
            mx.name = 'NMIX'
            a = bsdf.inputs['Alpha'] if bsdf else None
            if a is not None and a.links:
                nt.links.new(a.links[0].from_socket, mx.inputs['Fac'])
            else:
                mx.inputs['Fac'].default_value = 1.0
            nt.links.new(tr.outputs['BSDF'], mx.inputs[1])
            nt.links.new(em.outputs['Emission'], mx.inputs[2])
            m['keep_link'] = 1
            nt.links.new(mx.outputs['Shader'], out_n.inputs['Surface'])

def frame(name, trunk, rot):
    o = bpy.data.objects[name]
    t = bpy.data.objects[trunk]
    for x in bpy.data.objects:
        if x.type in ('MESH', 'CURVE'):
            x.hide_render = x.name not in (name, trunk)
    o.rotation_euler = (0, 0, rot)
    t.rotation_euler = (0, 0, rot)
    base = o.location
    cam.location = (base.x, base.y - 60, 10.5)
    cam.rotation_euler = (math.pi / 2, 0, 0)

renders = []
for mode in ('color', 'normal'):
    if mode == 'normal':
        normal_mode(True)
        sc.cycles.samples = 16
        sc.cycles.use_denoising = False
        sc.view_settings.view_transform = 'Standard'
    for k, (name, trunk, rot) in enumerate(trees):
        frame(name, trunk, rot)
        path = os.path.join(out, f'tree_{mode}_{k}.png')
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        renders.append(path)
print('TREES', renders)
