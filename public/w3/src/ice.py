# Ice crystal shards (one per activation-cloud point) and token tiles (one per Qwen token).
# Outputs: shards.glb (3 shard meshes), tile.glb, lookdev_ice.png
import sys, os, math, random
sys.path.append(os.path.dirname(__file__))
from common import *
import bmesh
from mathutils import Vector, Matrix, noise

sc = reset()
random.seed(7)


def shard(name, sides, r, h, tip, skew, seed):
    random.seed(seed)
    bm_ = bmesh.new()
    rings = []
    for k, (z, rr) in enumerate(((-h / 2, r * 0.82), (-h / 2 + h * 0.12, r), (h / 2 - tip, r * 0.96))):
        ring = []
        for i in range(sides):
            a = 2 * math.pi * i / sides + random.uniform(-0.12, 0.12)
            rad = rr * random.uniform(0.86, 1.08)
            ring.append(bm_.verts.new((math.cos(a) * rad + skew * z, math.sin(a) * rad, z)))
        rings.append(ring)
    top = bm_.verts.new((skew * h / 2 + random.uniform(-0.05, 0.05) * r, random.uniform(-0.1, 0.1) * r, h / 2))
    bot = bm_.verts.new((-skew * h / 2, 0, -h / 2 - r * 0.25))
    for a, b in zip(rings, rings[1:]):
        for i in range(sides):
            bm_.faces.new((a[i], a[(i + 1) % sides], b[(i + 1) % sides], b[i]))
    for i in range(sides):
        bm_.faces.new((rings[-1][i], rings[-1][(i + 1) % sides], top))
        bm_.faces.new((rings[0][(i + 1) % sides], rings[0][i], bot))
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:])
    me = bpy.data.meshes.new(name)
    bm_.to_mesh(me); bm_.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = r * 0.06; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(25)
    apply_mods(o)
    shade(o, 35)
    return o


shards = [
    shard('shard_a', 6, 0.16, 1.0, 0.28, 0.06, 1),
    shard('shard_b', 5, 0.2, 0.78, 0.22, -0.1, 2),
    shard('shard_c', 7, 0.13, 1.2, 0.36, 0.03, 3),
]
for i, s in enumerate(shards):
    s.location = (i * 0.6 - 0.6, 0, 0)

# token tile: a rounded slab, like a frosted keycap (1.0 x 0.42 x 0.14), subdivided for smooth highlights
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.2, 0))
tile = bpy.context.active_object; tile.name = 'tile'
tile.scale = (1.0, 0.42, 0.14)
bpy.ops.object.transform_apply(scale=True)
bv = tile.modifiers.new('bv', 'BEVEL'); bv.width = 0.045; bv.segments = 5; bv.limit_method = 'NONE'
apply_mods(tile)
shade(tile, 50)

# look-dev: glassy ice under a cool key + warm rim, dark background
ice = bpy.data.materials.new('ice'); ice.use_nodes = True
b = ice.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = hexc('#cfe6ff'); b.inputs['Roughness'].default_value = 0.08
b.inputs['Transmission Weight'].default_value = 1.0; b.inputs['IOR'].default_value = 1.31
for o in shards + [tile]:
    o.data.materials.append(ice)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#06080c')
for loc, e, c, s in (((-2, -2, 2.5), 300, '#bcd6ff', 2.0), ((2.5, 1.5, 0.5), 200, '#ffcf9a', 1.0), ((0, 2.5, -1.5), 120, '#5b8cff', 3)):
    bpy.ops.object.light_add(type='AREA', location=loc); L = bpy.context.active_object
    L.data.energy = e; L.data.size = s; L.data.color = hexc(c)[:3]
    bpy.ops.object.empty_add(location=(0, -0.3, 0)); t = bpy.context.active_object
    cc = L.constraints.new('TRACK_TO'); cc.target = t; cc.track_axis = 'TRACK_NEGATIVE_Z'; cc.up_axis = 'UP_Y'
bpy.ops.object.camera_add(location=(0.4, -4.2, 1.6)); cam = bpy.context.active_object; sc.camera = cam
bpy.ops.object.empty_add(location=(0, -0.4, 0)); t = bpy.context.active_object
cc = cam.constraints.new('TRACK_TO'); cc.target = t; cc.track_axis = 'TRACK_NEGATIVE_Z'; cc.up_axis = 'UP_Y'
cam.data.lens = 50
sc.render.resolution_x, sc.render.resolution_y = 1400, 900
sc.cycles.samples = 160
sc.render.filepath = os.path.join(OUT, 'lookdev_ice.png')
bpy.ops.render.render(write_still=True)

for o in shards + [tile]:
    o.data.materials.clear()
    o.location = (0, 0, 0)
export_glb(shards, os.path.join(OUT, 'shards.glb'))
export_glb([tile], os.path.join(OUT, 'tile.glb'))
print('DONE ice')
