# W2 Playground: the things that move (rover, wheel, dish, buoy, boat, knockable props, the steering spine).
#   Blender -b --python public/w2/src/dyn.py -- [lookdev|bake]
# Each object keeps its own origin (pivot) and shares one 1024 atlas baked under soft studio light (albedo x AO x key);
# at runtime each object is tinted by the island's baked irradiance where it stands.
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import box, cyl, ico, torus, join, mat, hexcol

WORK = '/tmp/w2-blender'
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'lookdev'
lib.reset()
lib.gpu()
sc = bpy.context.scene
random.seed(5)

M = dict(
    coral=mat('coral', '#e8613d', var=0.05, rough=0.55),
    cream=mat('cream', '#efe5cf', var=0.04, rough=0.6),
    dark=mat('dark', '#2c2a33', var=0.05),
    rubber=mat('rubber', '#26242b', var=0.06, rough=0.95),
    glassd=mat('glassd', '#1d2a3c', var=0.02, rough=0.2),
    steel=mat('steel', '#c3c7cf', var=0.04, rough=0.5),
    panel=mat('panel', '#203a7a', var=0.04, rough=0.4),
    head=mat('head', '#fff3d6', emit='#fff1d0', es=6, var=0),
    amber=mat('amber', '#ffb340', emit='#ffaa30', es=6, var=0),
    tail=mat('tail', '#ff3b30', emit='#ff2a20', es=5, var=0),
    cyan=mat('cyan', '#7fe7ff', emit='#62dcff', es=4, var=0),
    orange=mat('orange', '#f2672a', var=0.05),
    white=mat('white', '#f1ede4', var=0.03),
    card=mat('card', '#c99b68', var=0.12, scale=4),
    tape=mat('tape', '#a9784c', var=0.06),
    label=mat('label', '#f6f1e6', var=0.02),
    wood=mat('wood', '#a8744c', var=0.14, scale=6),
    dwood=mat('dwood', '#6b4630', var=0.12, scale=6),
    teal=mat('teal', '#2f8f9a', var=0.06, rough=0.5),
    yellow=mat('yellow', '#f0b52a', var=0.05),
    red=mat('red', '#d63b2f', var=0.05),
    marble=mat('marble', '#f2eee6', var=0.04),
    gold=mat('gold', '#e0b25a', var=0.06, rough=0.4),
    hull=mat('hull', '#eae4d6', var=0.05),
    stripe=mat('stripe', '#2f8f9a', var=0.04),
)
OBJ = {}

def at(objs, name):
    o = join(objs, name)
    sc.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    OBJ[name] = o
    return o

# ---------------------------------------------------------------- rover (local +x forward, origin at axle height centre)
WR, WW = 0.36, 0.3
WX, WY = 0.66, 0.62

def rover():
    p = []
    # tub
    t = box((1.72, 1.0, 0.4), (0, 0, 0.3), bevel=0.12, segs=4, m=M['coral'], smooth=50)
    p.append(t)
    p.append(box((1.86, 0.84, 0.16), (0, 0, 0.12), bevel=0.06, segs=3, m=M['dark']))
    # cream belt line
    p.append(box((1.74, 1.02, 0.07), (0, 0, 0.36), bevel=0.03, segs=2, m=M['cream']))
    # cabin with raked windscreen
    c = box((0.92, 0.84, 0.46), (-0.12, 0, 0.72), bevel=0.1, segs=4, m=M['cream'], smooth=50)
    bm = bmesh.new()
    bm.from_mesh(c.data)
    for v in bm.verts:
        if v.co.z > 0.72:
            k = (v.co.z - 0.72) / 0.23
            if v.co.x > -0.12:
                v.co.x -= 0.22 * k * ((v.co.x + 0.12) / 0.46)
            v.co.y *= 1 - 0.08 * k
    bm.to_mesh(c.data)
    bm.free()
    p.append(c)
    # windows (dark glass insets)
    w = box((0.05, 0.66, 0.26), (0.24, 0, 0.78), rot=(0, -0.62, 0), bevel=0.03, segs=2, m=M['glassd'])
    p.append(w)
    for s in (-1, 1):
        p.append(box((0.5, 0.04, 0.22), (-0.14, s * 0.415, 0.78), bevel=0.03, segs=2, m=M['glassd']))
    p.append(box((0.04, 0.6, 0.2), (-0.585, 0, 0.78), bevel=0.02, segs=2, m=M['glassd']))
    # roof rack + light bar
    for s in (-1, 1):
        p.append(cyl(0.025, 0.72, (-0.16, s * 0.32, 0.99), rot=(0, math.pi / 2, 0), verts=8, bevel=0, m=M['dark']))
    for xx in (-0.42, -0.16, 0.1):
        p.append(cyl(0.02, 0.66, (xx, 0, 0.99), rot=(math.pi / 2, 0, 0), verts=8, bevel=0, m=M['dark']))
    p.append(box((0.12, 0.56, 0.08), (0.12, 0, 1.03), bevel=0.03, segs=2, m=M['dark']))
    # front grille, bumper
    p.append(box((0.08, 0.52, 0.16), (0.88, 0, 0.3), bevel=0.03, segs=2, m=M['dark']))
    for k in range(4):
        p.append(box((0.03, 0.42, 0.018), (0.92, 0, 0.25 + k * 0.035), bevel=0, m=M['coral']))
    p.append(box((0.16, 1.02, 0.14), (0.92, 0, 0.1), bevel=0.05, segs=3, m=M['dark']))
    p.append(box((0.14, 0.9, 0.12), (-0.92, 0, 0.12), bevel=0.05, segs=3, m=M['dark']))
    # fenders (chunky flares over each wheel)
    for sx in (-1, 1):
        for sy in (-1, 1):
            f = box((0.74, 0.3, 0.1), (sx * WX, sy * (WY + 0.02), 0.44), bevel=0.05, segs=3, m=M['dark'])
            p.append(f)
            for e in (-1, 1):
                p.append(box((0.12, 0.3, 0.16), (sx * WX + e * 0.37, sy * (WY + 0.02), 0.36), rot=(0, e * 0.6, 0), bevel=0.04, segs=2, m=M['dark']))
    # rear solar deck
    p.append(box((0.3, 0.86, 0.04), (-0.74, 0, 0.52), rot=(0, 0.12, 0), bevel=0.015, segs=1, m=M['steel']))
    for i in range(2):
        for j in range(4):
            p.append(box((0.12, 0.18, 0.02), (-0.8 + i * 0.13, -0.3 + j * 0.2, 0.545 - i * 0.015), rot=(0, 0.12, 0), bevel=0.004, segs=1, m=M['panel']))
    # mast with a camera head (two eyes)
    p.append(cyl(0.035, 0.55, (-0.45, 0.3, 1.2), verts=10, bevel=0, m=M['steel']))
    p.append(box((0.16, 0.3, 0.14), (-0.42, 0.3, 1.52), bevel=0.04, segs=3, m=M['cream']))
    for s in (-1, 1):
        p.append(cyl(0.045, 0.04, (-0.335, 0.3 + s * 0.075, 1.53), rot=(0, math.pi / 2, 0), verts=14, bevel=0.01, m=M['dark']))
    # whip antenna
    p.append(cyl(0.01, 0.85, (-0.6, -0.34, 1.1), rot=(0, -0.12, 0), verts=6, bevel=0, m=M['dark']))
    p.append(ico(0.035, (-0.65, -0.34, 1.52), sub=2, m=M['orange']))
    body = at(p, 'rover')
    g = []
    for s in (-1, 1):
        g.append(cyl(0.085, 0.04, (0.935, s * 0.36, 0.31), rot=(0, math.pi / 2, 0), verts=16, bevel=0.01, m=M['head']))
        g.append(box((0.03, 0.12, 0.06), (-0.98, s * 0.36, 0.3), bevel=0.01, m=M['tail']))
    for k in range(4):
        g.append(box((0.03, 0.09, 0.04), (0.18, -0.21 + k * 0.14, 1.03), bevel=0.008, m=M['amber']))
    at(g, 'rover_glow')
    return body

def wheel():
    p = [cyl(WR, WW, (0, 0, 0), rot=(math.pi / 2, 0, 0), verts=32, bevel=0.09, segs=4, m=M['rubber'], smooth=50)]
    n = 18
    for k in range(n):
        a = 2 * math.pi * k / n
        for s in (-1, 1):
            o = box((0.1, 0.12, 0.05), (0, 0, 0), bevel=0.02, segs=1, m=M['rubber'])
            o.location = (math.cos(a) * (WR + 0.005), s * 0.075 + (0.02 if k % 2 else -0.02), math.sin(a) * (WR + 0.005))
            o.rotation_euler = (0, -a + math.pi / 2, 0)
            lib.active(o)
            bpy.ops.object.transform_apply(location=True, rotation=True)
            p.append(o)
    for s in (-1, 1):
        p.append(cyl(0.19, 0.06, (0, s * 0.13, 0), rot=(math.pi / 2, 0, 0), verts=24, bevel=0.02, segs=2, m=M['cream']))
        p.append(cyl(0.07, 0.08, (0, s * 0.15, 0), rot=(math.pi / 2, 0, 0), verts=16, bevel=0.02, segs=2, m=M['coral']))
        for k in range(5):
            a = 2 * math.pi * k / 5
            p.append(cyl(0.018, 0.04, (math.cos(a) * 0.12, s * 0.165, math.sin(a) * 0.12), rot=(math.pi / 2, 0, 0), verts=8, bevel=0, m=M['dark']))
    return at(p, 'wheel')

# ---------------------------------------------------------------- dish (yoke turns in azimuth, bowl in elevation)
def dish():
    y = [cyl(0.32, 0.16, (0, 0, 0.08), verts=20, bevel=0.03, m=M['white']), box((0.34, 2.06, 0.14), (0, 0, 0.2), bevel=0.04, m=M['white'])]
    for s in (-1, 1):
        y.append(box((0.18, 0.1, 0.62), (0, s * 0.99, 0.5), bevel=0.03, m=M['white']))
        y.append(cyl(0.07, 0.06, (0, s * 0.99, 0.75), rot=(math.pi / 2, 0, 0), verts=14, bevel=0.01, m=M['steel']))
    at(y, 'dish_yoke')
    bm = bmesh.new()
    rings, seg, f = 10, 36, 0.42
    rows = []
    for i in range(rings + 1):
        r = 0.02 + 0.9 * i / rings
        row = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            row.append(bm.verts.new((r * r / (4 * f) - 0.25, math.cos(a) * r, math.sin(a) * r)))
        rows.append(row)
    for i in range(rings):
        for j in range(seg):
            bm.faces.new((rows[i][j], rows[i][(j + 1) % seg], rows[i + 1][(j + 1) % seg], rows[i + 1][j]))
    me = bpy.data.meshes.new('bowl')
    bm.to_mesh(me)
    o = bpy.data.objects.new('bowl', me)
    sc.collection.objects.link(o)
    lib.active(o)
    md = o.modifiers.new('sol', 'SOLIDIFY')
    md.thickness = 0.04
    bpy.ops.object.modifier_apply(modifier='sol')
    lib.finish(o, 0, 0, 60, M['white'])
    b = [o, torus(0.92, 0.03, (r * 0 + 0.9 * 0.9 / (4 * f) - 0.25, 0, 0), rot=(0, math.pi / 2, 0), maj=48, mn=6, m=M['steel'])]
    b.append(cyl(0.12, 0.2, (-0.28, 0, 0), rot=(0, math.pi / 2, 0), verts=16, bevel=0.03, m=M['steel']))
    for k in range(3):
        a = 2 * math.pi * k / 3
        p0 = Vector((0.9 * 0.9 / (4 * f) - 0.25, math.cos(a) * 0.85, math.sin(a) * 0.85))
        p1 = Vector((f - 0.25, 0, 0))
        mid, d = (p0 + p1) / 2, p1 - p0
        st = cyl(0.015, d.length, mid, verts=6, bevel=0, m=M['steel'])
        st.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        lib.active(st)
        bpy.ops.object.transform_apply(rotation=True)
        b.append(st)
    b.append(cyl(0.06, 0.16, (f - 0.25, 0, 0), rot=(0, math.pi / 2, 0), verts=12, bevel=0.02, m=M['dark']))
    b.append(cyl(0.04, 1.96, (0, 0, 0), rot=(math.pi / 2, 0, 0), verts=12, bevel=0.01, m=M['steel']))
    at(b, 'dish')

# ---------------------------------------------------------------- knockables
def cone():
    p = [box((0.46, 0.46, 0.05), (0, 0, 0.025), bevel=0.02, m=M['orange']),
         cyl(0.18, 0.62, (0, 0, 0.36), verts=24, r2=0.035, bevel=0.01, m=M['orange'], smooth=60)]
    for z, r in ((0.3, 0.145), (0.46, 0.108)):
        p.append(cyl(r + 0.004, 0.07, (0, 0, z), verts=24, r2=r - 0.012, bevel=0, m=M['white'], smooth=60))
    at(p, 'cone')

def parcel():
    p = [box((0.5, 0.5, 0.5), (0, 0, 0), bevel=0.025, segs=2, m=M['card'])]
    p.append(box((0.12, 0.52, 0.008), (0, 0, 0.251), bevel=0, m=M['tape']))
    p.append(box((0.12, 0.008, 0.2), (0, -0.251, 0.15), bevel=0, m=M['tape']))
    p.append(box((0.16, 0.006, 0.11), (0.12, -0.252, -0.08), bevel=0.003, segs=1, m=M['label']))
    at(p, 'parcel')

def crate():
    s = 0.6
    p = [box((s - 0.06, s - 0.06, s - 0.06), (0, 0, 0), bevel=0.01, m=M['wood'])]
    for ax in range(3):
        for a in (-1, 1):
            for b in (-1, 1):
                size = [0.08, 0.08, 0.08]
                size[ax] = s
                loc = [0, 0, 0]
                o = [i for i in range(3) if i != ax]
                loc[o[0]] = a * (s / 2 - 0.04)
                loc[o[1]] = b * (s / 2 - 0.04)
                p.append(box(tuple(size), tuple(loc), bevel=0.012, segs=1, m=M['dwood']))
    for f in range(4):
        o = box((s * 1.25, 0.03, 0.08), (0, -s / 2 + 0.01, 0), rot=(0, math.pi / 4, 0), bevel=0.01, segs=1, m=M['dwood'])
        lib.place(o, (0, 0, 0), f * math.pi / 2)
        p.append(o)
    at(p, 'crate')

def barrel():
    p = [cyl(0.3, 0.9, (0, 0, 0.45), verts=24, bevel=0.03, segs=2, m=M['teal'], smooth=60)]
    for z in (0.22, 0.68):
        p.append(torus(0.305, 0.025, (0, 0, z), maj=24, mn=6, m=M['teal']))
    p.append(cyl(0.05, 0.03, (0.15, 0, 0.9), verts=10, bevel=0.005, m=M['steel']))
    at(p, 'barrel')

def buoy():
    p = [cyl(0.75, 0.5, (0, 0, 0.05), verts=32, bevel=0.15, segs=4, m=M['yellow'], smooth=60)]
    p.append(cyl(0.4, 0.35, (0, 0, 0.45), verts=24, bevel=0.06, segs=2, m=M['red']))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        o = cyl(0.03, 1.4, (math.cos(a) * 0.28, math.sin(a) * 0.28, 1.2), rot=(0, 0, 0), verts=8, bevel=0, m=M['white'])
        p.append(o)
    for z in (0.95, 1.55):
        p.append(torus(0.3, 0.025, (0, 0, z), maj=24, mn=6, m=M['white']))
    p.append(box((0.5, 0.5, 0.04), (0, 0, 1.92), rot=(0.25, 0, 0), bevel=0.01, m=M['panel']))
    p.append(cyl(0.06, 0.25, (0, 0, 2.08), verts=12, bevel=0.01, m=M['dark']))
    p.append(ico(0.09, (0, 0, 2.26), sub=2, m=M['amber']))
    p.append(cyl(0.025, 0.5, (0.18, 0.18, 2.1), verts=6, bevel=0, m=M['dark']))
    p.append(cyl(0.1, 0.5, (0, 0, -0.35), verts=12, r2=0.04, bevel=0.01, m=M['dark']))
    at(p, 'buoy')

def boat():
    bm = bmesh.new()
    st = 12
    secs = []
    for i in range(st + 1):
        t = i / st
        x = -1.5 + 3.0 * t
        w = 0.62 * math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.7 * (1 - 0.35 * t)
        d = 0.42 * (0.7 + 0.3 * math.sin(math.pi * t))
        zt = 0.25 + 0.12 * t * t
        ring = []
        for j in range(9):
            a = math.pi * j / 8
            ring.append(bm.verts.new((x, -math.cos(a) * w, zt - math.sin(a) * d * (0.6 + 0.4 * math.sin(a)))))
        secs.append(ring)
    for i in range(st):
        for j in range(8):
            bm.faces.new((secs[i][j], secs[i + 1][j], secs[i + 1][j + 1], secs[i][j + 1]))
    me = bpy.data.meshes.new('hull')
    bm.to_mesh(me)
    o = bpy.data.objects.new('hull', me)
    sc.collection.objects.link(o)
    lib.active(o)
    md = o.modifiers.new('sol', 'SOLIDIFY')
    md.thickness = 0.05
    bpy.ops.object.modifier_apply(modifier='sol')
    md = o.modifiers.new('sub', 'SUBSURF')
    md.levels = 1
    bpy.ops.object.modifier_apply(modifier='sub')
    lib.finish(o, 0, 0, 60, M['hull'])
    p = [o]
    for x in (-0.6, 0.35):
        p.append(box((0.22, 1.0, 0.05), (x, 0, 0.18), bevel=0.015, m=M['wood']))
    p.append(box((3.0, 0.04, 0.06), (0.0, 0, -0.05), bevel=0.01, m=M['dwood']))
    for s in (-1, 1):
        oar = cyl(0.025, 1.8, (-0.1, s * 0.3, 0.3), rot=(0, math.pi / 2, s * 0.2), verts=8, bevel=0, m=M['wood'])
        p.append(oar)
    at(p, 'boat')

def spine():
    p = [box((0.92, 0.92, 0.34), (0, 0, 0.17), bevel=0.14, segs=4, m=M['marble'], smooth=60)]
    at(p, 'spine')

def needle():
    bm = bmesh.new()
    pts = [(0.0, -0.09), (1.5, -0.05), (1.82, 0.0), (1.5, 0.05), (0.0, 0.09), (-0.3, 0.06), (-0.3, -0.06)]
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z = 0.05
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('needle')
    bm.to_mesh(me)
    o = bpy.data.objects.new('needle', me)
    sc.collection.objects.link(o)
    lib.finish(o, 0.015, 2, 40, M['gold'])
    at([o, cyl(0.16, 0.08, (0, 0, 0.04), verts=20, bevel=0.02, m=M['gold'])], 'needle')

rover()
wheel()
dish()
cone()
parcel()
crate()
barrel()
buoy()
boat()
spine()
needle()

names = list(OBJ.keys())
print('dyn objects', names)
# spread them out for an occlusion-free bake
for i, n in enumerate(names):
    OBJ[n].location = ((i % 5) * 5.0, (i // 5) * 5.0, 0)

w = bpy.data.worlds.new('studio')
sc.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.82, 0.84, 0.9, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.75
d = bpy.data.lights.new('key', 'SUN')
d.energy = 1.4
d.angle = math.radians(35)
k = bpy.data.objects.new('key', d)
k.rotation_euler = (math.radians(30), 0, math.radians(-30))
sc.collection.objects.link(k)
sc.view_settings.view_transform = 'Standard'

if MODE == 'lookdev':
    cd = bpy.data.cameras.new('c')
    co = bpy.data.objects.new('c', cd)
    sc.collection.objects.link(co)
    tgt = Vector((10, 3, 0.4))
    co.location = tgt + Vector((7, -14, 9))
    co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
    cd.angle_y = math.radians(40)
    cd.sensor_fit = 'VERTICAL'
    sc.camera = co
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = 64
    sc.render.resolution_x, sc.render.resolution_y = 1440, 900
    sc.render.filepath = os.path.join(WORK, 'lookdev-dyn.png')
    # close-up of the rover
    bpy.ops.render.render(write_still=True)
    OBJ['wheel'].location = OBJ['rover'].location + Vector((WX, -WY, 0))
    for sx, sy in ((1, 1), (-1, 1), (-1, -1)):
        bpy.ops.object.select_all(action='DESELECT')
        OBJ['wheel'].select_set(True)
        bpy.context.view_layer.objects.active = OBJ['wheel']
        bpy.ops.object.duplicate(linked=True)
        bpy.context.active_object.location = OBJ['rover'].location + Vector((sx * WX, sy * WY, 0))
    OBJ['rover_glow'].location = OBJ['rover'].location
    tgt = OBJ['rover'].location + Vector((0, 0, 0.5))
    co.location = tgt + Vector((3.2, -3.6, 2.4))
    co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(WORK, 'lookdev-rover.png')
    bpy.ops.render.render(write_still=True)
    sys.exit(0)

if MODE == 'bake':
    objs = [OBJ[n] for n in names]
    lib.uv_smart(objs, margin=0.004)
    img = bpy.data.images.new('dyn_bake', 1024, 1024, float_buffer=True)
    lib.bake(objs, img, 'COMBINED', samples=int(os.environ.get('SPP', 128)))
    img.filepath_raw = os.path.join(WORK, 'dyn.exr')
    img.file_format = 'OPEN_EXR'
    img.save()
    for o in objs:
        o.location = (0, 0, 0)
        o.data.materials.clear()
        while len(o.data.color_attributes):
            o.data.color_attributes.remove(o.data.color_attributes[0])
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, 'dyn.glb'), export_format='GLB', use_selection=True, export_materials='NONE', export_normals=False, export_texcoords=True, export_yup=True, export_apply=True)
    print('exported dyn')
