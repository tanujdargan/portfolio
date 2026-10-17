# MarmotSat as an illustrative 3U CubeSat (340.5 x 100 x 100 mm, per UVic/SatNOGS). Not the flight hardware layout:
# body-mounted triple-junction cells, hard-anodized rails, a UHF tape-antenna deployer on +Z.
# Outputs: cubesat.glb (geometry + Atlas UV), cubesat_albedo.png, cubesat_orm.png (AO, rough, metal), cubesat_mask.png (cells),
# lookdev_cubesat.png.
import sys, os, math
sys.path.append(os.path.dirname(__file__))
from common import *
import bmesh
from mathutils import Vector, Matrix

sc = reset()
S = 1.0  # metres

alu = mat('alu', '#c3c7cd', 1.0, 0.34)
anod = mat('anod', '#3a3d43', 1.0, 0.42)
pcb = mat('pcb', '#0f1114', 0.0, 0.42)
gold = mat('gold', '#d2a24f', 1.0, 0.26)
steel = mat('steel', '#dcdde0', 1.0, 0.2)
kapton = mat('kapton', '#7a4d18', 0.0, 0.32)
glass = mat('glass', '#0a0c10', 0.0, 0.08)

# --- solar cell material: procedural gridlines on the CellUV map ---
cell = bpy.data.materials.new('cell')
cell.use_nodes = True
nt = cell.node_tree
N, L = nt.nodes, nt.links
bsdf = N['Principled BSDF']
uvn = N.new('ShaderNodeUVMap'); uvn.uv_map = 'CellUV'
sep = N.new('ShaderNodeSeparateXYZ'); L.new(uvn.outputs['UV'], sep.inputs[0])
mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 24
L.new(sep.outputs['X'], mul.inputs[0])
fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'; L.new(mul.outputs[0], fr.inputs[0])
lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.07; L.new(fr.outputs[0], lt.inputs[0])
bus = N.new('ShaderNodeMath'); bus.operation = 'GREATER_THAN'; bus.inputs[1].default_value = 0.955; L.new(sep.outputs['Y'], bus.inputs[0])
bus2 = N.new('ShaderNodeMath'); bus2.operation = 'LESS_THAN'; bus2.inputs[1].default_value = 0.985; L.new(sep.outputs['Y'], bus2.inputs[0])
bb = N.new('ShaderNodeMath'); bb.operation = 'MULTIPLY'; L.new(bus.outputs[0], bb.inputs[0]); L.new(bus2.outputs[0], bb.inputs[1])
# gridlines stop short of the busbar edge; clamp
lines = N.new('ShaderNodeMath'); lines.operation = 'MAXIMUM'; L.new(lt.outputs[0], lines.inputs[0]); L.new(bb.outputs[0], lines.inputs[1])
lines.name = 'w3_mask_lines'
# subtle large-scale tint variation across the cell (AR coating)
grad = N.new('ShaderNodeMapRange'); L.new(sep.outputs['Y'], grad.inputs['Value'])
grad.inputs['To Min'].default_value = 0.0; grad.inputs['To Max'].default_value = 1.0
mixc = N.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
mixc.inputs[6].default_value = hexc('#1a1d48'); mixc.inputs[7].default_value = hexc('#262a63')
L.new(grad.outputs[0], mixc.inputs['Factor'])
mixl = N.new('ShaderNodeMix'); mixl.data_type = 'RGBA'; mixl.name = 'w3_albedo'
L.new(lines.outputs[0], mixl.inputs['Factor']); L.new(mixc.outputs[2], mixl.inputs[6]); mixl.inputs[7].default_value = hexc('#b9bec7')
L.new(mixl.outputs[2], bsdf.inputs['Base Color'])
rmap = N.new('ShaderNodeMapRange'); rmap.name = 'w3_rough'; L.new(lines.outputs[0], rmap.inputs['Value'])
rmap.inputs['To Min'].default_value = 0.14; rmap.inputs['To Max'].default_value = 0.32
L.new(rmap.outputs[0], bsdf.inputs['Roughness'])
mmap = N.new('ShaderNodeMapRange'); mmap.name = 'w3_metal'; L.new(lines.outputs[0], mmap.inputs['Value'])
mmap.inputs['To Min'].default_value = 0.0; mmap.inputs['To Max'].default_value = 1.0
L.new(mmap.outputs[0], bsdf.inputs['Metallic'])
bsdf.inputs['Coat Weight'].default_value = 0.6
bsdf.inputs['Coat Roughness'].default_value = 0.05
bsdf.inputs['Thin Film Thickness'].default_value = 420
bsdf.inputs['Thin Film IOR'].default_value = 1.9

parts = []
H = 0.34050 / 2
R = 0.0085  # rail section
rc = 0.05 - R / 2
for sx in (-1, 1):
    for sy in (-1, 1):
        parts.append(box('rail', (R, R, H * 2), (sx * rc, sy * rc, 0), anod, bevel=0.0009, segs=3))
        # rail end caps are bright machined aluminium (feet)
        for sz in (-1, 1):
            parts.append(box('foot', (R * 0.98, R * 0.98, 0.0012), (sx * rc, sy * rc, sz * (H + 0.0004)), alu, bevel=0.0004, segs=2))

# end frames: crossbars between rails at both ends and at the 1U/2U joints
for z in (-0.1645, -0.0548, 0.0548, 0.1645):
    hz = 0.006 if abs(z) > 0.1 else 0.003
    for ax in range(4):
        a = ax * math.pi / 2
        n = Vector((math.cos(a), math.sin(a), 0))
        loc = n * 0.0462 + Vector((0, 0, z))
        size = (0.004, 0.083, hz) if ax % 2 == 0 else (0.083, 0.004, hz)
        parts.append(box('bar', size, loc, alu, bevel=0.0006, segs=2))

# end plates
for sz in (-1, 1):
    parts.append(box('endplate', (0.083, 0.083, 0.0025), (0, 0, sz * 0.1662), alu, bevel=0.0006, segs=2))

# side PCBs + cells
CW, CH, GX, GY, CUT = 0.0385, 0.0745, 0.0025, 0.0035, 0.006


def cell_obj(name, origin, t, up, n):
    bm_ = bmesh.new()
    uvl = bm_.loops.layers.uv.new('CellUV')
    pts = [(0, 0), (CW, 0), (CW, CH - CUT), (CW - CUT, CH), (CUT, CH), (0, CH - CUT)]
    vs = [bm_.verts.new(origin + t * x + up * y) for x, y in pts]
    f = bm_.faces.new(vs)
    for lp in f.loops:
        p = lp.vert.co - origin
        lp[uvl].uv = (p.dot(t) / CW, p.dot(up) / CH)
    r = bmesh.ops.extrude_face_region(bm_, geom=[f])
    for v in [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]:
        v.co += n * 0.00035
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:])
    me = bpy.data.meshes.new(name)
    bm_.to_mesh(me)
    bm_.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(cell)
    return o


for ax in range(4):
    a = ax * math.pi / 2
    n = Vector((math.cos(a), math.sin(a), 0))
    t = Vector((-math.sin(a), math.cos(a), 0))
    up = Vector((0, 0, 1))
    pl = 0.0485
    size = (0.0016, 0.083, 0.322) if ax % 2 == 0 else (0.083, 0.0016, 0.322)
    parts.append(box('pcb', size, n * pl, pcb, bevel=0.0003, segs=1))
    face = n * (pl + 0.0008)
    x0 = -(2 * CW + GX) / 2
    y0 = -(4 * CH + 3 * GY) / 2
    for col in range(2):
        for row in range(4):
            o = face + t * (x0 + col * (CW + GX)) + up * (y0 + row * (CH + GY))
            # flip alternate rows so the busbars face each other like real strings
            parts.append(cell_obj('cell', o, t, up, n))
            # interconnect tabs between rows
            if row < 3:
                for k in (0.25, 0.75):
                    c = face + t * (x0 + col * (CW + GX) + CW * k) + up * (y0 + row * (CH + GY) + CH + GY / 2) + n * 0.0002
                    parts.append(box('tab', (0.004 if ax % 2 else 0.0006, 0.0006 if ax % 2 else 0.004, GY * 1.1), c, steel))
    # corner screws
    for sx in (-1, 1):
        for sz in (-1, 1):
            c = face + t * (sx * 0.037) + up * (sz * 0.1585)
            rot = (0, math.pi / 2, 0) if ax % 2 == 0 else (math.pi / 2, 0, 0)
            parts.append(cyl('screw', 0.0016, 0.0012, c, alu, verts=16, rot=rot, bevel=0.0003))
    # small gold pads / sun sensor in the top margin
    if ax == 1:
        c = face + up * 0.1585
        parts.append(box('sunsensor', (0.009, 0.0016, 0.005), c + n * 0.0006, glass, bevel=0.0004))
        for k in (-1, 1):
            parts.append(box('pad', (0.0018, 0.0006, 0.0018), c + t * (k * 0.008), gold))
    if ax == 3:
        c = face + up * -0.1585
        for k in range(5):
            parts.append(box('pad', (0.0006, 0.0018, 0.0016), c + t * ((k - 2) * 0.0035), gold))

# +Z: antenna deployer board, burn-wire kapton strips, 4 tape antennas (turnstile)
top = 0.1690
parts.append(box('deployer', (0.0815, 0.0815, 0.0018), (0, 0, top), pcb, bevel=0.0004))
parts.append(box('deployer_frame', (0.06, 0.06, 0.0022), (0, 0, top + 0.0012), alu, bevel=0.0005))
parts.append(cyl('lens', 0.0085, 0.003, (0, 0, top + 0.0028), anod, verts=32, bevel=0.0006))
parts.append(cyl('lensglass', 0.0062, 0.0035, (0, 0, top + 0.003), glass, verts=32))
for ax in range(4):
    a = ax * math.pi / 2
    n = Vector((math.cos(a), math.sin(a), 0))
    t = Vector((-math.sin(a), math.cos(a), 0))
    parts.append(box('kapton', (0.007, 0.018, 0.0004) if ax % 2 == 0 else (0.018, 0.007, 0.0004), n * 0.034 + Vector((0, 0, top + 0.0011)), kapton))
    # tape antenna: thin curved strip leaving the board edge tangentially, 170 mm
    bm_ = bmesh.new()
    segs, w, Ln = 40, 0.005, 0.17
    start = n * 0.0405 + t * 0.03 + Vector((0, 0, top + 0.0004))
    rows = []
    for i in range(segs + 1):
        s = i / segs
        p = start + t * (-0.0) + n * 0.0 + (t * 0.0)
        along = n * 0  # placeholder
        # path: out along +t then slightly outward along n, sagging a touch toward -z
        c = start + t * (Ln * s) + n * (0.01 * s * s) + Vector((0, 0, -0.004 * s * s))
        row = []
        for j in range(5):
            u = j / 4 - 0.5
            curve = (u * u - 0.25) * 0.0012  # tape-measure cross-section
            row.append(bm_.verts.new(c + n * 0 + Vector((0, 0, u * w)) + n * curve))
        rows.append(row)
    for i in range(segs):
        for j in range(4):
            bm_.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    me = bpy.data.meshes.new('ant')
    bm_.to_mesh(me); bm_.free()
    o = bpy.data.objects.new('antenna', me)
    bpy.context.collection.objects.link(o)
    sm = o.modifiers.new('sol', 'SOLIDIFY'); sm.thickness = 0.00025
    apply_mods(o)
    o.data.materials.append(steel)
    shade(o, 60)
    parts.append(o)
    # spool housing
    parts.append(cyl('spool', 0.0042, 0.0062, n * 0.0405 + t * 0.026 + Vector((0, 0, top + 0.003)), alu, verts=20, bevel=0.0005))

# -Z: separation-spring plungers on two feet, kill switches
for sx, sy in ((1, 1), (-1, -1)):
    parts.append(cyl('plunger', 0.0022, 0.004, (sx * rc, sy * rc, -H - 0.0015), steel, verts=16, bevel=0.0004))
parts.append(cyl('rbf', 0.003, 0.002, (0.0, -0.0495, -0.135), gold, verts=20, rot=(math.pi / 2, 0, 0), bevel=0.0003))

sat = join(parts, 'cubesat')
# put its centre at origin, long axis on Z (Blender) -> -Y in glTF? keep: exporter converts Z-up to Y-up.
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
sat.location = (0, 0, 0)

# ------------- look-dev render -------------
def lookdev(path, samples=160):
    w = bpy.data.worlds.new('w'); sc.world = w
    earth_world(w)
    def aim(o, tgt=(0, 0, 0)):
        bpy.ops.object.empty_add(location=tgt); e = bpy.context.active_object
        c = o.constraints.new('TRACK_TO'); c.target = e; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    bpy.ops.object.light_add(type='SUN', location=(-1.2, -1.6, 1.1))
    sun = bpy.context.active_object; sun.data.energy = 7.0; sun.data.angle = math.radians(0.6)
    sun.data.color = hexc('#fff1dc')[:3]; aim(sun)
    bpy.ops.object.light_add(type='AREA', location=(0.3, -0.4, -1.0))
    fill = bpy.context.active_object; fill.data.energy = 6; fill.data.size = 1.6; fill.data.color = hexc('#4f86d9')[:3]; aim(fill)
    bpy.ops.object.light_add(type='AREA', location=(1.0, 0.8, 0.8))
    rim = bpy.context.active_object; rim.data.energy = 12; rim.data.size = 0.6; rim.data.color = hexc('#cfe0ff')[:3]; aim(rim)
    bpy.ops.object.camera_add(location=(0.75, -1.05, 0.42))
    cam = bpy.context.active_object; sc.camera = cam
    cam.data.lens = 55
    aim(cam, (0, 0, 0.0))
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    sc.cycles.samples = samples
    sc.render.film_transparent = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


sat.rotation_euler = (math.radians(8), math.radians(-6), math.radians(-8))
lookdev(os.path.join(OUT, 'lookdev_cubesat.png'))
sat.rotation_euler = (0, 0, 0)
if os.environ.get('LOOKDEV_ONLY'):
    sys.exit(0)

# ------------- bake -------------
cull_hidden(sat)
atlas_uv(sat, margin=0.002, angle=55)
only_uv(sat)
SZ = 2048
sc.cycles.samples = 64


def albedo_fn(m, nt):
    n = nt.nodes.get('w3_albedo')
    if n:
        return n.outputs[2]
    c = nt.nodes['Principled BSDF'].inputs['Base Color'].default_value
    return (c[0], c[1], c[2])


def rough_fn(m, nt):
    n = nt.nodes.get('w3_rough')
    if n:
        return n.outputs[0]
    r = m['w3_rough']; return (r, r, r)


def metal_fn(m, nt):
    n = nt.nodes.get('w3_metal')
    if n:
        return n.outputs[0]
    r = m['w3_metal']; return (r, r, r)


def mask_fn(m, nt):
    v = 1.0 if m.name == 'cell' else 0.0
    return (v, v, v)


for name, fn, nc in (('albedo', albedo_fn, False), ('rough', rough_fn, True), ('metal', metal_fn, True), ('mask', mask_fn, True)):
    img = image('sat_' + name, SZ if name != 'mask' else 1024, non_color=nc)
    restore = swap_to_emission(sat, fn)
    bake(sat, 'EMIT', img, samples=1, margin=6)
    restore()
    save(img, os.path.join(OUT, f'cubesat_{name}.png'))

sc.world.light_settings.ao_factor = 1.0
sc.world.light_settings.distance = 0.03
img = image('sat_ao', SZ, non_color=True)
bake(sat, 'AO', img, samples=96, margin=6)
save(img, os.path.join(OUT, 'cubesat_ao.png'))
clear_bake_nodes(sat)

# glTF: geometry + Atlas UV only; textures are loaded separately as webp.
sat.data.uv_layers.remove(sat.data.uv_layers['CellUV'])
for m in list(sat.data.materials):
    pass
# collapse materials to two slots so three.js can treat cells differently (iridescence/clearcoat)
body = bpy.data.materials.new('body')
cells = bpy.data.materials.new('cells')
idx = {i: (1 if m.name == 'cell' else 0) for i, m in enumerate(sat.data.materials)}
for p in sat.data.polygons:
    p.material_index = idx[p.material_index]
sat.data.materials.clear()
sat.data.materials.append(body)
sat.data.materials.append(cells)
for o in list(bpy.data.objects):
    if o != sat:
        bpy.data.objects.remove(o)
export_glb([sat], os.path.join(OUT, 'cubesat.glb'))
print('DONE cubesat')
