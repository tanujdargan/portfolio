# Illustrative oceanographic sensor package on a mooring line (CTD-style pressure housing in a protective cage,
# syntactic-foam float above). Not a specific Ocean Networks Canada instrument.
# Outputs: probe.glb, probe_albedo.png, probe_orm.png, lookdev_probe.png
import sys, os, math
sys.path.append(os.path.dirname(__file__))
from common import *

sc = reset()
hous = mat('housing', '#3a414b', 1.0, 0.34)
ti = mat('ti', '#9aa1aa', 1.0, 0.3)
foam = mat('foam', '#d8642a', 0.0, 0.55)
yellow = mat('yellow', '#d9b232', 0.0, 0.45)
black = mat('rubber', '#121316', 0.0, 0.7)
glass = mat('glass', '#0d1a22', 0.0, 0.05)
rope = mat('rope', '#c8c3b4', 0.0, 0.85)
cu = mat('zinc', '#b8b4ab', 1.0, 0.5)

parts = []
# pressure housing (vertical cylinder) with end caps
parts.append(cyl('housing', 0.09, 0.9, (0, 0, 0), hous, verts=48, bevel=0.01, segs=3))
for z in (0.47, -0.47):
    parts.append(cyl('cap', 0.098, 0.06, (0, 0, z), ti, verts=48, bevel=0.012, segs=3))
    for k in range(8):
        a = k * math.pi / 4
        parts.append(cyl('bolt', 0.008, 0.02, (math.cos(a) * 0.075, math.sin(a) * 0.075, z + math.copysign(0.035, z)), ti, verts=12, bevel=0.002))
# connectors on top cap
for k, a in enumerate((0.3, 2.4, 4.4)):
    parts.append(cyl('conn', 0.016, 0.06, (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.53), black, verts=20, bevel=0.004))
# sensor head below: conductivity cell + temp probe + pump
parts.append(cyl('cell', 0.035, 0.22, (0.03, 0, -0.62), black, verts=32, bevel=0.006))
parts.append(cyl('cellglass', 0.02, 0.24, (0.03, 0, -0.62), glass, verts=24))
parts.append(cyl('temp', 0.008, 0.18, (-0.05, 0.02, -0.6), ti, verts=16, bevel=0.002))
parts.append(cyl('pump', 0.04, 0.12, (-0.03, -0.05, -0.56), yellow, verts=32, bevel=0.008))
parts.append(cyl('anode', 0.025, 0.05, (0.0, 0.06, -0.52), cu, verts=20, bevel=0.005))
# stainless cage: 4 vertical bars + 3 rings
for k in range(4):
    a = k * math.pi / 2 + math.pi / 4
    parts.append(cyl('bar', 0.012, 1.55, (math.cos(a) * 0.17, math.sin(a) * 0.17, -0.08), ti, verts=12))
for z in (0.68, 0.0, -0.84):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.012, major_segments=48, minor_segments=10, location=(0, 0, z))
    o = bpy.context.active_object; o.data.materials.append(ti); shade(o); parts.append(o)
# lifting bail and shackle
bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.012, major_segments=32, minor_segments=10, location=(0, 0, 0.78), rotation=(math.pi / 2, 0, 0))
o = bpy.context.active_object; o.data.materials.append(ti); shade(o); parts.append(o)
for k in range(2):
    a = k * math.pi
    parts.append(cyl('bailbar', 0.01, 0.2, (math.cos(a) * 0.12, 0, 0.72), ti, verts=10, rot=(0, math.copysign(0.6, math.cos(a)), 0)))
# rope up to the float
parts.append(cyl('rope', 0.012, 0.8, (0, 0, 1.2), rope, verts=10))
# syntactic foam float with a yellow band
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.32, segments=48, ring_count=24, location=(0, 0, 1.9))
o = bpy.context.active_object; o.data.materials.append(foam); shade(o, 80); parts.append(o)
bpy.ops.mesh.primitive_torus_add(major_radius=0.322, minor_radius=0.03, major_segments=64, minor_segments=10, location=(0, 0, 1.9))
o = bpy.context.active_object; o.data.materials.append(yellow); shade(o); parts.append(o)
parts.append(cyl('floatcap', 0.06, 0.12, (0, 0, 2.24), ti, verts=24, bevel=0.01))
parts.append(cyl('floatcap2', 0.06, 0.12, (0, 0, 1.56), ti, verts=24, bevel=0.01))
# rope below (to anchor, fades into the dark)
parts.append(cyl('rope2', 0.012, 3.0, (0, 0, -2.4), rope, verts=10))

probe = join(parts, 'probe')
cull_hidden(probe, rays=24, dist=6)

w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#06303f')
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
bpy.ops.object.light_add(type='SUN', rotation=(0.2, 0.15, 0)); s = bpy.context.active_object
s.data.energy = 3; s.data.color = hexc('#9fe6ff')[:3]; s.data.angle = math.radians(8)
bpy.ops.object.light_add(type='AREA', location=(1.5, -1.5, 0.5)); L = bpy.context.active_object
L.data.energy = 60; L.data.size = 1; L.data.color = hexc('#bfeaff')[:3]
bpy.ops.object.empty_add(location=(0, 0, 0)); t = bpy.context.active_object
c = L.constraints.new('TRACK_TO'); c.target = t; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
bpy.ops.object.camera_add(location=(1.6, -3.4, 1.2)); cam = bpy.context.active_object; sc.camera = cam
bpy.ops.object.empty_add(location=(0, 0, 0.9)); t2 = bpy.context.active_object
c = cam.constraints.new('TRACK_TO'); c.target = t2; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
cam.data.lens = 40
sc.render.resolution_x, sc.render.resolution_y = 900, 1200
sc.cycles.samples = 128
sc.render.filepath = os.path.join(OUT, 'lookdev_probe.png')
bpy.ops.render.render(write_still=True)
if os.environ.get('LOOKDEV_ONLY'):
    sys.exit(0)

atlas_uv(probe, margin=0.003, angle=50)
only_uv(probe, keep=('Atlas',))


def albedo_fn(m, nt):
    c = nt.nodes['Principled BSDF'].inputs['Base Color'].default_value
    return (c[0], c[1], c[2])


for name, fn, nc in (('albedo', albedo_fn, False), ('rough', lambda m, nt: (m['w3_rough'],) * 3, True), ('metal', lambda m, nt: (m['w3_metal'],) * 3, True)):
    img = image('p_' + name, 1024, non_color=nc)
    r = swap_to_emission(probe, fn)
    bake(probe, 'EMIT', img, samples=1, margin=6)
    r()
    save(img, os.path.join(OUT, f'probe_{name}.png'))
sc.world.light_settings.distance = 0.25
img = image('p_ao', 1024, non_color=True)
bake(probe, 'AO', img, samples=96, margin=6)
save(img, os.path.join(OUT, 'probe_ao.png'))
clear_bake_nodes(probe)
probe.data.materials.clear()
for o in list(bpy.data.objects):
    if o != probe:
        bpy.data.objects.remove(o)
export_glb([probe], os.path.join(OUT, 'probe.glb'))
print('DONE probe')
