# Illustrative fulfillment-centre racking: one 2-bay, 4-level selective rack module with pallets and cartons.
# Lighting (overhead aisle strips) and AO are baked with Cycles into one atlas; three.js draws it unlit + fog.
# Outputs: rack.glb, rack_lit.png, lookdev_rack.png
import sys, os, math, random
sys.path.append(os.path.dirname(__file__))
from common import *

sc = reset()
random.seed(11)

steel = mat('steel', '#3b4352', 0.6, 0.45)
beam = mat('beam', '#c9772a', 0.3, 0.42)
wood = mat('wood', '#8b6c49', 0.0, 0.8)
card = mat('card', '#a8845b', 0.0, 0.85)
card2 = mat('card2', '#8f6f4b', 0.0, 0.85)
tape = mat('tape', '#c9b48e', 0.0, 0.5)
wrap = mat('wrap', '#c7ccd2', 0.0, 0.3)
label = mat('label', '#e8e6e0', 0.0, 0.6)

BW, BD, HT = 2.7, 1.1, 6.0
levels = [0.15, 1.65, 3.15, 4.65]
parts = []
# uprights (frames) at x = 0, BW, 2BW; front and back
for i in range(3):
    x = i * BW
    for y in (0, BD):
        parts.append(box('upright', (0.09, 0.075, HT), (x, y, HT / 2), steel, bevel=0.008))
        parts.append(box('foot', (0.16, 0.14, 0.012), (x, y, 0.006), steel, bevel=0.003))
    # frame bracing (diagonals between front/back uprights)
    for k in range(7):
        z0 = 0.3 + k * 0.8
        parts.append(box('brace_h', (0.035, BD, 0.035), (x, BD / 2, z0), steel, bevel=0.006))
        d = math.atan2(0.8, BD)
        parts.append(box('brace_d', (0.03, math.hypot(BD, 0.8), 0.03), (x, BD / 2, z0 + 0.4), steel, bevel=0.005, rot=(d if k % 2 else -d, 0, 0)))
# beams
for b in range(2):
    x = b * BW + BW / 2
    for z in levels[1:]:
        for y in (0, BD):
            parts.append(box('beam', (BW - 0.09, 0.05, 0.12), (x, y, z - 0.06), beam, bevel=0.01))
        # wire decking
        for k in range(14):
            parts.append(box('deck', (0.012, BD, 0.02), (x - BW / 2 + 0.15 + k * 0.18, BD / 2, z + 0.005), steel))


def pallet(x, y, z):
    ps = []
    for k in range(5):
        ps.append(box('slat', (0.1, 1.0, 0.022), (x - 0.5 + k * 0.25, y, z + 0.133), wood, bevel=0.004))
    for k in range(3):
        ps.append(box('stringer', (1.2, 0.1, 0.1), (x, y - 0.42 + k * 0.42, z + 0.072), wood, bevel=0.006))
    for k in range(3):
        ps.append(box('bslat', (1.2, 0.1, 0.022), (x, y - 0.42 + k * 0.42, z + 0.011), wood, bevel=0.004))
    return ps


def cartons(x, y, z, hmax):
    ps = []
    cols, rows = random.choice(((3, 2), (2, 2), (4, 3), (3, 3)))
    w, d = 1.16 / cols, 0.96 / rows
    layers = random.randint(2, 4)
    h = min(hmax / layers, random.uniform(0.25, 0.4))
    for lz in range(layers):
        for cx in range(cols):
            for cy in range(rows):
                if lz == layers - 1 and random.random() < 0.25:
                    continue
                px = x - 0.58 + w * (cx + 0.5)
                py = y - 0.48 + d * (cy + 0.5)
                pz = z + 0.144 + h * (lz + 0.5)
                m = card if random.random() < 0.7 else card2
                ps.append(box('carton', (w - 0.012, d - 0.012, h - 0.008), (px, py, pz), m, bevel=0.01, segs=2))
                if lz == layers - 1:
                    ps.append(box('tape', (0.05, d - 0.01, 0.003), (px, py, pz + h / 2 - 0.002), tape))
                if cy == 0 and random.random() < 0.5:
                    ps.append(box('label', (min(0.18, w * 0.5), 0.003, min(0.12, h * 0.5)), (px, py - d / 2 + 0.004, pz), label))
    return ps


for b in range(2):
    for li, z in enumerate(levels):
        for p in range(2):
            if random.random() < 0.18:
                continue
            x = b * BW + 0.1 + 0.65 + p * 1.3
            y = BD / 2
            parts += pallet(x, y, z)
            parts += cartons(x, y, z, 1.25 if li < 3 else 1.0)

rack = join(parts, 'rack')
cull_hidden(rack, rays=24, dist=8)

# ------------- lighting for bake: aisle strips both sides, dim hall ambience -------------
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#0b0f16')
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
for y in (-1.6, BD + 1.6):
    for x in (BW * 0.5, BW * 1.5):
        bpy.ops.object.light_add(type='AREA', location=(x, y, 8.2))
        L = bpy.context.active_object; L.data.shape = 'RECTANGLE'; L.data.size = 2.4; L.data.size_y = 0.25
        L.data.energy = 900; L.data.color = hexc('#ffe7c4')[:3]
# floor for bounce
bpy.ops.mesh.primitive_plane_add(size=30, location=(BW, BD / 2, 0)); fl = bpy.context.active_object
fl.data.materials.append(mat('floor', '#3a3c40', 0, 0.6))

# look-dev
bpy.ops.object.camera_add(location=(-3.5, -9.0, 2.2)); cam = bpy.context.active_object; sc.camera = cam
bpy.ops.object.empty_add(location=(BW, BD / 2, 2.6)); t = bpy.context.active_object
c = cam.constraints.new('TRACK_TO'); c.target = t; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
cam.data.lens = 32
sc.render.resolution_x, sc.render.resolution_y = 1400, 900
sc.cycles.samples = 128
sc.render.filepath = os.path.join(OUT, 'lookdev_rack.png')
bpy.ops.render.render(write_still=True)
if os.environ.get('LOOKDEV_ONLY'):
    sys.exit(0)

atlas_uv(rack, margin=0.002, angle=50)
only_uv(rack, keep=('Atlas',))
img = image('rack_lit', 2048)
bake(rack, 'DIFFUSE_LIT', img, samples=128, margin=6)
save(img, os.path.join(OUT, 'rack_lit.png'))
clear_bake_nodes(rack)
rack.data.materials.clear()
export_glb([rack], os.path.join(OUT, 'rack.glb'))
print('DONE rack')
