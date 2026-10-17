# W1 "Room": Tanuj's desk at night. Modelled in Blender, lit with real lights, baked to atlases for the web.
# Usage: Blender -b --python room.py -- <mode> [args]
#   lookdev <out.png> [samples] [cam]   render a still (cam: desk | mobile | screen)
#   bake <outdir> [samples] [size]      bake atlases + export GLB
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix, Euler, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['lookdev', '/tmp/w1-blender/lookdev.png']
MODE = argv[0]
random.seed(7)
R = math.radians

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------------------------------------------------------------- groups
# Each baked object belongs to an atlas group; hotspot objects keep their own mesh after the bake.
GROUP = {}   # obj name -> group
HOT = {}     # obj name -> hotspot id
NOBAKE = set()


def reg(o, g, hot=None):
    GROUP[o.name] = g
    if hot:
        HOT[o.name] = hot
    return o

# ---------------------------------------------------------------- materials
MATS = {}


def principled(name, color, rough=0.6, metal=0.0, spec=0.5, emit=None, strength=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.15
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    MATS[name] = m
    return m


def node(m, t, loc=(0, 0), **kw):
    n = m.node_tree.nodes.new(t)
    n.location = loc
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def link(m, a, b):
    m.node_tree.links.new(a, b)


def ramp(m, stops, loc=(-300, 0)):
    r = node(m, 'ShaderNodeValToRGB', loc)
    el = r.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
    el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]:
        e = el.new(p)
        e.color = (*c, 1)
    return r


def objcoords(m, scale=(1, 1, 1), loc=(-900, 0)):
    tc = node(m, 'ShaderNodeTexCoord', loc)
    mp = node(m, 'ShaderNodeMapping', (loc[0] + 200, loc[1]))
    mp.inputs['Scale'].default_value = scale
    link(m, tc.outputs['Object'], mp.inputs['Vector'])
    return mp


def wood(name, dark, light, scale=(1, 1, 14), rough=0.42, coat=0.3, grain=3.0):
    m = principled(name, light, rough=rough, coat=coat)
    b = m.node_tree.nodes['Principled BSDF']
    mp = objcoords(m, scale)
    wv = node(m, 'ShaderNodeTexWave', (-500, 100), wave_type='BANDS', bands_direction='Z' if False else 'X')
    wv.inputs['Scale'].default_value = grain
    wv.inputs['Distortion'].default_value = 6.0
    wv.inputs['Detail'].default_value = 3.0
    wv.inputs['Detail Scale'].default_value = 1.5
    link(m, mp.outputs['Vector'], wv.inputs['Vector'])
    nz = node(m, 'ShaderNodeTexNoise', (-500, -150))
    nz.inputs['Scale'].default_value = 40
    nz.inputs['Detail'].default_value = 6
    link(m, mp.outputs['Vector'], nz.inputs['Vector'])
    mix = node(m, 'ShaderNodeMix', (-320, 0), data_type='FLOAT')
    mix.inputs['Factor'].default_value = 0.35
    link(m, wv.outputs['Fac'], mix.inputs['A'])
    link(m, nz.outputs['Fac'], mix.inputs['B'])
    r = ramp(m, [(0.2, dark), (0.55, tuple((a + b) / 2 for a, b in zip(dark, light))), (0.85, light)], (-150, 0))
    link(m, mix.outputs['Result'], r.inputs['Fac'])
    link(m, r.outputs['Color'], b.inputs['Base Color'])
    return m


def planks(name):
    m = principled(name, (0.2, 0.12, 0.07), rough=0.5, coat=0.15)
    b = m.node_tree.nodes['Principled BSDF']
    tc = node(m, 'ShaderNodeTexCoord', (-1100, 0))
    br = node(m, 'ShaderNodeTexBrick', (-700, 150), offset=0.5, offset_frequency=1, squash=1.0, squash_frequency=1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = 0.0025
    br.inputs['Mortar Smooth'].default_value = 0.1
    br.inputs['Brick Width'].default_value = 1.05
    br.inputs['Row Height'].default_value = 0.16
    br.inputs['Bias'].default_value = 0.0
    br.inputs['Color1'].default_value = (0.20, 0.115, 0.065, 1)
    br.inputs['Color2'].default_value = (0.135, 0.075, 0.045, 1)
    br.inputs['Mortar'].default_value = (0.03, 0.02, 0.015, 1)
    link(m, tc.outputs['Object'], br.inputs['Vector'])
    mp = node(m, 'ShaderNodeMapping', (-900, -200))
    mp.inputs['Scale'].default_value = (14, 1, 1)
    link(m, tc.outputs['Object'], mp.inputs['Vector'])
    wv = node(m, 'ShaderNodeTexWave', (-700, -200), wave_type='BANDS', bands_direction='Y')
    wv.inputs['Scale'].default_value = 3
    wv.inputs['Distortion'].default_value = 8
    wv.inputs['Detail'].default_value = 4
    link(m, mp.outputs['Vector'], wv.inputs['Vector'])
    mul = node(m, 'ShaderNodeMix', (-400, 0), data_type='RGBA', blend_type='MULTIPLY')
    mul.inputs['Factor'].default_value = 0.45
    link(m, br.outputs['Color'], mul.inputs['A'])
    g = ramp(m, [(0.0, (0.7, 0.7, 0.7)), (1.0, (1.15, 1.1, 1.05))], (-500, -200))
    link(m, wv.outputs['Fac'], g.inputs['Fac'])
    link(m, g.outputs['Color'], mul.inputs['B'])
    link(m, mul.outputs['Result'], b.inputs['Base Color'])
    return m


def noisy(name, color, amt=0.12, scale=60, rough=0.8, bump=0.0, **kw):
    m = principled(name, color, rough=rough, **kw)
    b = m.node_tree.nodes['Principled BSDF']
    tc = node(m, 'ShaderNodeTexCoord', (-900, 0))
    nz = node(m, 'ShaderNodeTexNoise', (-650, 0))
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 8
    link(m, tc.outputs['Object'], nz.inputs['Vector'])
    lo = tuple(c * (1 - amt) for c in color)
    hi = tuple(min(1, c * (1 + amt)) for c in color)
    r = ramp(m, [(0.3, lo), (0.7, hi)], (-400, 0))
    link(m, nz.outputs['Fac'], r.inputs['Fac'])
    link(m, r.outputs['Color'], b.inputs['Base Color'])
    if bump:
        bp = node(m, 'ShaderNodeBump', (-200, -250))
        bp.inputs['Strength'].default_value = bump
        link(m, nz.outputs['Fac'], bp.inputs['Height'])
        link(m, bp.outputs['Normal'], b.inputs['Normal'])
    return m


def cells(name):
    # solar cells: deep blue tiles with silver busbars
    m = principled(name, (0.02, 0.04, 0.12), rough=0.25, spec=0.8)
    b = m.node_tree.nodes['Principled BSDF']
    tc = node(m, 'ShaderNodeTexCoord', (-900, 0))
    br = node(m, 'ShaderNodeTexBrick', (-600, 0), offset=0.0, offset_frequency=1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = 0.0012
    br.inputs['Brick Width'].default_value = 0.02
    br.inputs['Row Height'].default_value = 0.02
    br.inputs['Color1'].default_value = (0.025, 0.05, 0.16, 1)
    br.inputs['Color2'].default_value = (0.02, 0.04, 0.13, 1)
    br.inputs['Mortar'].default_value = (0.5, 0.5, 0.55, 1)
    link(m, tc.outputs['Object'], br.inputs['Vector'])
    link(m, br.outputs['Color'], b.inputs['Base Color'])
    return m


def print_art(name):
    # framed print: an orbit around a small planet, drawn with rings in the shader
    m = principled(name, (0.02, 0.03, 0.06), rough=0.9)
    b = m.node_tree.nodes['Principled BSDF']
    tc = node(m, 'ShaderNodeTexCoord', (-1300, 0))
    sub = node(m, 'ShaderNodeVectorMath', (-1100, 0), operation='SUBTRACT')
    sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    link(m, tc.outputs['UV'], sub.inputs[0])

    def ring(sx, sy, r, w, y):
        sc = node(m, 'ShaderNodeVectorMath', (-900, y), operation='MULTIPLY')
        sc.inputs[1].default_value = (sx, sy, 1)
        link(m, sub.outputs['Vector'], sc.inputs[0])
        ln = node(m, 'ShaderNodeVectorMath', (-700, y), operation='LENGTH')
        link(m, sc.outputs['Vector'], ln.inputs[0])
        d = node(m, 'ShaderNodeMath', (-500, y), operation='SUBTRACT')
        d.inputs[1].default_value = r
        link(m, ln.outputs['Value'], d.inputs[0])
        a = node(m, 'ShaderNodeMath', (-350, y), operation='ABSOLUTE')
        link(m, d.outputs['Value'], a.inputs[0])
        lt = node(m, 'ShaderNodeMath', (-200, y), operation='LESS_THAN')
        lt.inputs[1].default_value = w
        link(m, a.outputs['Value'], lt.inputs[0])
        return lt

    r1 = ring(1, 0.62, 0.3, 0.004, 200)
    r2 = ring(1, 1, 0.12, 0.12, 0)
    r3 = ring(1, 1, 0.21, 0.0025, -200)
    mx = node(m, 'ShaderNodeMix', (0, 100), data_type='RGBA')
    mx.inputs['A'].default_value = (0.02, 0.03, 0.06, 1)
    mx.inputs['B'].default_value = (0.85, 0.82, 0.74, 1)
    add = node(m, 'ShaderNodeMath', (-50, 300), operation='MAXIMUM')
    link(m, r1.outputs[0], add.inputs[0])
    link(m, r3.outputs[0], add.inputs[1])
    link(m, add.outputs[0], mx.inputs['Factor'])
    mx2 = node(m, 'ShaderNodeMix', (150, 0), data_type='RGBA')
    link(m, mx.outputs['Result'], mx2.inputs['A'])
    mx2.inputs['B'].default_value = (0.12, 0.22, 0.42, 1)
    link(m, r2.outputs[0], mx2.inputs['Factor'])
    link(m, mx2.outputs['Result'], b.inputs['Base Color'])
    return m


def label_mat(name):
    # shipping label: white with barcode bars along U
    m = principled(name, (0.8, 0.8, 0.78), rough=0.7)
    b = m.node_tree.nodes['Principled BSDF']
    tc = node(m, 'ShaderNodeTexCoord', (-900, 0))
    sep = node(m, 'ShaderNodeSeparateXYZ', (-700, 0))
    link(m, tc.outputs['UV'], sep.inputs[0])
    nz = node(m, 'ShaderNodeTexWhiteNoise', (-500, 100), noise_dimensions='1D')
    mul = node(m, 'ShaderNodeMath', (-600, 100), operation='MULTIPLY')
    mul.inputs[1].default_value = 60
    link(m, sep.outputs['X'], mul.inputs[0])
    fl = node(m, 'ShaderNodeMath', (-550, 200), operation='FLOOR')
    link(m, mul.outputs[0], fl.inputs[0])
    link(m, fl.outputs[0], nz.inputs['W'])
    gt = node(m, 'ShaderNodeMath', (-350, 100), operation='GREATER_THAN')
    gt.inputs[1].default_value = 0.5
    link(m, nz.outputs['Value'], gt.inputs[0])
    band = node(m, 'ShaderNodeMath', (-350, -100), operation='LESS_THAN')
    band.inputs[1].default_value = 0.45
    link(m, sep.outputs['Y'], band.inputs[0])
    both = node(m, 'ShaderNodeMath', (-200, 0), operation='MULTIPLY')
    link(m, gt.outputs[0], both.inputs[0])
    link(m, band.outputs[0], both.inputs[1])
    mx = node(m, 'ShaderNodeMix', (0, 0), data_type='RGBA')
    mx.inputs['A'].default_value = (0.82, 0.81, 0.78, 1)
    mx.inputs['B'].default_value = (0.03, 0.03, 0.03, 1)
    link(m, both.outputs[0], mx.inputs['Factor'])
    link(m, mx.outputs['Result'], b.inputs['Base Color'])
    return m


# palette: ink-blue night room, walnut and oak, brass, one warm lamp, one cool screen
M = {
    'wall': noisy('wall', (0.10, 0.12, 0.17), amt=0.08, scale=90, rough=0.92, bump=0.08),
    'wallcut': principled('wallcut', (0.16, 0.18, 0.23), rough=0.9),
    'floor': planks('floor'),
    'skirting': principled('skirting', (0.13, 0.15, 0.2), rough=0.6),
    'walnut': wood('walnut', (0.06, 0.03, 0.015), (0.2, 0.1, 0.05)),
    'oak': wood('oak', (0.22, 0.13, 0.06), (0.45, 0.3, 0.16), grain=4),
    'blackmetal': principled('blackmetal', (0.025, 0.025, 0.028), rough=0.35, metal=0.0, spec=0.6),
    'alu': principled('alu', (0.32, 0.33, 0.35), rough=0.28, metal=0.6),
    'darkalu': principled('darkalu', (0.07, 0.075, 0.085), rough=0.3, metal=0.5),
    'brass': principled('brass', (0.55, 0.38, 0.16), rough=0.3, metal=0.8),
    'keycap': principled('keycap', (0.11, 0.115, 0.13), rough=0.55),
    'keycap2': principled('keycap2', (0.62, 0.6, 0.55), rough=0.55),
    'keyaccent': principled('keyaccent', (0.75, 0.22, 0.12), rough=0.5),
    'felt': noisy('felt', (0.05, 0.055, 0.065), amt=0.2, scale=300, rough=1.0),
    'screen': principled('screen', (0, 0, 0), rough=0.2, emit=(0.5, 0.68, 1.0), strength=0.55),
    'bulb': principled('bulb', (1, 0.9, 0.7), emit=(1.0, 0.72, 0.4), strength=40),
    'fairy': principled('fairy', (1, 0.9, 0.7), emit=(1.0, 0.62, 0.3), strength=18),
    'wire': principled('wire', (0.02, 0.02, 0.02), rough=0.5),
    'pcb': noisy('pcb', (0.02, 0.06, 0.045), amt=0.15, scale=400, rough=0.35, spec=0.7),
    'chip': principled('chip', (0.02, 0.02, 0.022), rough=0.45),
    'gold': principled('gold', (0.7, 0.5, 0.2), rough=0.25, metal=0.9),
    'led_g': principled('led_g', (0.1, 1, 0.3), emit=(0.15, 1.0, 0.35), strength=30),
    'led_r': principled('led_r', (1, 0.1, 0.1), emit=(1.0, 0.15, 0.1), strength=20),
    'led_c': principled('led_c', (0.2, 0.9, 1), emit=(0.25, 0.85, 1.0), strength=18),
    'cells': cells('cells'),
    'pages': noisy('pages', (0.72, 0.68, 0.6), amt=0.05, scale=600, rough=0.9),
    'nb_green': noisy('nb_green', (0.04, 0.12, 0.09), amt=0.15, scale=200, rough=0.7),
    'nb_terra': noisy('nb_terra', (0.42, 0.13, 0.06), amt=0.15, scale=200, rough=0.7),
    'nb_ink': noisy('nb_ink', (0.05, 0.07, 0.16), amt=0.15, scale=200, rough=0.7),
    'band': principled('band', (0.02, 0.02, 0.02), rough=0.6),
    'ceramic': principled('ceramic', (0.72, 0.68, 0.6), rough=0.25, spec=0.6),
    'pot': noisy('pot', (0.32, 0.13, 0.07), amt=0.12, scale=120, rough=0.85),
    'soil': noisy('soil', (0.04, 0.03, 0.02), amt=0.3, scale=200, rough=1),
    'leaf': noisy('leaf', (0.05, 0.16, 0.07), amt=0.25, scale=25, rough=0.5),
    'cardboard': noisy('cardboard', (0.42, 0.28, 0.15), amt=0.1, scale=150, rough=0.9),
    'tape': principled('tape', (0.5, 0.36, 0.2), rough=0.3),
    'label': label_mat('label'),
    'robot': principled('robot', (0.09, 0.1, 0.12), rough=0.4, coat=0.4),
    'robotaccent': principled('robotaccent', (0.85, 0.42, 0.08), rough=0.4),
    'rubber': principled('rubber', (0.015, 0.015, 0.015), rough=0.8),
    'leather': noisy('leather', (0.32, 0.12, 0.06), amt=0.1, scale=80, rough=0.45, bump=0.05),
    'rug': noisy('rug', (0.07, 0.065, 0.075), amt=0.25, scale=500, rough=1.0),
    'rugborder': noisy('rugborder', (0.2, 0.16, 0.12), amt=0.2, scale=500, rough=1.0),
    'frame': principled('frame', (0.02, 0.02, 0.02), rough=0.4),
    'matboard': principled('matboard', (0.78, 0.76, 0.7), rough=0.9),
    'print': print_art('print'),
    'book1': noisy('book1', (0.5, 0.42, 0.3), amt=0.1, scale=150, rough=0.7),
    'book2': noisy('book2', (0.08, 0.1, 0.18), amt=0.1, scale=150, rough=0.7),
    'book3': noisy('book3', (0.35, 0.08, 0.06), amt=0.1, scale=150, rough=0.7),
    'book4': noisy('book4', (0.12, 0.2, 0.15), amt=0.1, scale=150, rough=0.7),
    'glass': principled('glass', (0.6, 0.7, 0.8), rough=0.05),
    'sky': principled('sky', (0, 0, 0), emit=(0.02, 0.035, 0.08), strength=1.0),
    'cork': noisy('cork', (0.36, 0.24, 0.13), amt=0.3, scale=300, rough=0.95, bump=0.2),
    'note_y': principled('note_y', (0.8, 0.62, 0.22), rough=0.8),
    'note_b': principled('note_b', (0.35, 0.5, 0.62), rough=0.8),
    'pin_r': principled('pin_r', (0.7, 0.08, 0.05), rough=0.3),
    'pin_b': principled('pin_b', (0.08, 0.2, 0.6), rough=0.3),
    'ledstrip': principled('ledstrip', (1, 0.8, 0.6), emit=(1.0, 0.66, 0.38), strength=6),
}

# ---------------------------------------------------------------- geometry helpers


def finish(o, mat, bevel=0.0, seg=3, smooth=True, angle=35):
    col.objects.link(o) if o.name not in col.objects else None
    if isinstance(mat, list):
        for mm in mat:
            o.data.materials.append(M[mm])
    elif mat:
        o.data.materials.append(M[mat])
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL')
        bv.width = bevel
        bv.segments = seg
        bv.limit_method = 'ANGLE'
        bv.angle_limit = R(40)
        bv.harden_normals = False
    if smooth and o.type == 'MESH':
        o.data.shade_smooth()
        try:
            o.data.set_sharp_from_angle(angle=R(angle))
        except Exception:
            pass
    return o


def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    return o


def box(name, dims, loc, mat, bevel=0.003, seg=3, rot=(0, 0, 0), group='desk', hot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * dims[0], v.co.y * dims[1], v.co.z * dims[2]))
    o = mesh_obj(name, bm)
    o.location = loc
    o.rotation_euler = Euler([R(a) for a in rot])
    finish(o, mat, bevel=min(bevel, min(dims) * 0.45) if bevel else 0, seg=seg)
    return reg(o, group, hot)


def cyl(name, r, h, loc, mat, rot=(0, 0, 0), verts=40, bevel=0.0, seg=2, group='desk', hot=None, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = mesh_obj(name, bm)
    o.location = loc
    o.rotation_euler = Euler([R(a) for a in rot])
    finish(o, mat, bevel=bevel, seg=seg)
    return reg(o, group, hot)


def sphere(name, r, loc, mat, scale=(1, 1, 1), group='desk', hot=None, seg=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    o = mesh_obj(name, bm)
    o.location = loc
    finish(o, mat)
    return reg(o, group, hot)


def lathe(name, prof, loc, mat, segs=48, group='desk', hot=None, rot=(0, 0, 0)):
    # prof: list of (r, z) from outside bottom, around the rim, to inside bottom
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]):
        bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), steps=segs, angle=R(360), use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    o = mesh_obj(name, bm)
    o.location = loc
    o.rotation_euler = Euler([R(a) for a in rot])
    finish(o, mat, angle=50)
    return reg(o, group, hot)


def tube(name, pts, r, mat, group='desk', res=8, hot=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    sp = cu.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    sp.use_endpoint_u = True
    sp.order_u = 4 if len(pts) >= 4 else len(pts)
    sp.resolution_u = res
    cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu)
    col.objects.link(o)
    o.data.materials.append(M[mat])
    return reg(o, group, hot)


def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    col.objects.link(e)
    return e


def look_rot(direction, up='Y'):
    return Vector(direction).to_track_quat('-Z', up).to_euler()

# ================================================================ ROOM SHELL
T = 0.12      # wall thickness
H = 2.55      # wall height
X0, X1 = -1.45, 1.5
Y0, Y1 = -1.05, 1.6

floor = box('floor', (X1 - X0 + T, Y1 - Y0 + T, T), ((X0 - T + X1) / 2, (Y0 + Y1 + T) / 2, -T / 2), 'floor', bevel=0.01, group='room')
backwall = box('backwall', (X1 - X0 + T, T, H + T), ((X0 - T + X1) / 2, Y1 + T / 2, (H - T) / 2), 'wall', bevel=0.01, group='room')
leftwall = box('leftwall', (T, Y1 - Y0, H + T), (X0 - T / 2, (Y0 + Y1) / 2, (H - T) / 2), 'wall', bevel=0.01, group='room')

# window opening in the left wall
WY0, WY1, WZ0, WZ1 = -0.25, 0.8, 0.98, 2.0
cut = box('cut', (0.6, WY1 - WY0, WZ1 - WZ0), (X0 - T / 2, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2), None, bevel=0)
GROUP.pop('cut')
bo = leftwall.modifiers.new('win', 'BOOLEAN')
bo.object = cut
bo.operation = 'DIFFERENCE'
bo.solver = 'EXACT'
leftwall.modifiers.move(len(leftwall.modifiers) - 1, 0)  # boolean before bevel
cut.hide_render = True
cut.hide_viewport = True

# skirting boards
box('skirt_b', (X1 - X0, 0.018, 0.09), ((X0 + X1) / 2, Y1 - 0.009, 0.045), 'skirting', bevel=0.003, group='room')
box('skirt_l', (0.018, Y1 - Y0, 0.09), (X0 + 0.009, (Y0 + Y1) / 2, 0.045), 'skirting', bevel=0.003, group='room')

# window frame (4 sides + mullions) and sill
FD = T + 0.03
fx = X0 - T / 2 + 0.01
fw = 0.055
box('wf_top', (FD, WY1 - WY0, fw), (fx, (WY0 + WY1) / 2, WZ1 - fw / 2), 'frame', bevel=0.004, group='room', hot='window')
box('wf_bot', (FD, WY1 - WY0, fw), (fx, (WY0 + WY1) / 2, WZ0 + fw / 2), 'frame', bevel=0.004, group='room', hot='window')
box('wf_l', (FD, fw, WZ1 - WZ0), (fx, WY0 + fw / 2, (WZ0 + WZ1) / 2), 'frame', bevel=0.004, group='room', hot='window')
box('wf_r', (FD, fw, WZ1 - WZ0), (fx, WY1 - fw / 2, (WZ0 + WZ1) / 2), 'frame', bevel=0.004, group='room', hot='window')
box('wf_mv', (0.04, 0.03, WZ1 - WZ0 - 2 * fw), (fx, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2), 'frame', bevel=0.003, group='room', hot='window')
box('wf_mh', (0.04, WY1 - WY0 - 2 * fw, 0.03), (fx, (WY0 + WY1) / 2, WZ0 + (WZ1 - WZ0) * 0.62), 'frame', bevel=0.003, group='room', hot='window')
box('sill', (0.16, WY1 - WY0 + 0.14, 0.035), (X0 + 0.06, (WY0 + WY1) / 2, WZ0 - 0.0175), 'oak', bevel=0.006, group='room', hot='window')
glass = box('GLASS', (0.004, WY1 - WY0 - 0.02, WZ1 - WZ0 - 0.02), (fx - 0.005, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2), 'glass', bevel=0)
GROUP.pop('GLASS')
NOBAKE.add('GLASS')

# sky outside (replaced by a shader on the web)
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
sky = mesh_obj('SKY', bm)
sky.scale = (1.0, 2.2, 1.8)
sky.rotation_euler = (0, R(90), 0)
sky.location = (X0 - 1.4, 0.4, 1.5)
sky.data.materials.append(M['sky'])
NOBAKE.add('SKY')

# rug
lathe_unused = None
box('rug', (1.7, 1.15, 0.012), (0.05, 0.3, 0.006), 'rugborder', bevel=0.005, group='room')
box('rug_in', (1.6, 1.05, 0.004), (0.05, 0.3, 0.013), 'rug', bevel=0.002, group='room')

# framed print on the back wall
box('pf', (0.42, 0.025, 0.54), (-1.0, Y1 - 0.0125, 1.62), 'frame', bevel=0.004, group='room')
box('pm', (0.38, 0.004, 0.50), (-1.0, Y1 - 0.026, 1.62), 'matboard', bevel=0, group='room')
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
pr = mesh_obj('print', bm)
pr.scale = (0.15, 0.2, 1)
pr.rotation_euler = (R(90), 0, 0)
pr.location = (-1.0, Y1 - 0.0285, 1.64)
finish(pr, 'print', smooth=False)
reg(pr, 'room')

# string lights along the top of the back wall
hooks = [(-1.38, 2.3), (-0.45, 2.33), (0.5, 2.3), (1.42, 2.33)]
pts = []
for (xa, za), (xb, zb) in zip(hooks, hooks[1:]):
    for i in range(10):
        t = i / 10
        x = xa + (xb - xa) * t
        z = za + (zb - za) * t - 0.14 * math.sin(math.pi * t)
        pts.append((x, Y1 - 0.03, z))
pts.append((hooks[-1][0], Y1 - 0.03, hooks[-1][1]))
tube('fairy_wire', pts, 0.0018, 'wire', group='room', res=4)
for i, p in enumerate(pts[1:-1:2]):
    s = sphere(f'fairy_{i}', 0.011, (p[0], p[1] - 0.004, p[2] - 0.016), 'fairy', scale=(1, 1, 1.3), group='room', seg=12)

# plant in the corner by the window
lathe('pot', [(0.13, 0.0), (0.15, 0.02), (0.17, 0.3), (0.175, 0.31), (0.16, 0.31), (0.155, 0.26)], (-1.32, 1.3, 0), 'pot', group='room')
cyl('soil', 0.155, 0.01, (-1.32, 1.3, 0.265), 'soil', group='room')


def leaf(name, base, length, width, lean, yaw, twist):
    bm = bmesh.new()
    n = 10
    rows = []
    for i in range(n + 1):
        t = i / n
        w = width * (1 - t ** 2.2) * (0.55 + 0.45 * math.sin(math.pi * min(1, t * 1.4)))
        z = length * t
        x = math.sin(lean) * z * t
        a = twist * t
        row = [bm.verts.new((x + math.cos(a) * s * w, math.sin(a) * s * w, z)) for s in (-1, 0, 1)]
        rows.append(row)
    for r0, r1 in zip(rows, rows[1:]):
        bm.faces.new((r0[0], r0[1], r1[1], r1[0]))
        bm.faces.new((r0[1], r0[2], r1[2], r1[1]))
    for row in rows:
        row[1].co.y += 0.004  # keel
    o = mesh_obj(name, bm)
    o.location = base
    o.rotation_euler = (0, 0, yaw)
    sol = o.modifiers.new('sol', 'SOLIDIFY')
    sol.thickness = 0.004
    finish(o, 'leaf', angle=60)
    return reg(o, 'room')


for i in range(11):
    a = i / 11 * math.tau + random.uniform(-0.2, 0.2)
    r = random.uniform(0.0, 0.07)
    leaf(f'leaf_{i}', (-1.32 + math.cos(a) * r, 1.3 + math.sin(a) * r, 0.25), random.uniform(0.45, 0.82), random.uniform(0.035, 0.05), random.uniform(0.15, 0.4), a, random.uniform(-0.9, 0.9))

# ================================================================ DESK
DX0, DX1, DY0, DY1, DZ = -0.75, 0.9, 0.9, 1.56, 0.75
dcx, dcy = (DX0 + DX1) / 2, (DY0 + DY1) / 2
box('desktop', (DX1 - DX0, DY1 - DY0, 0.035), (dcx, dcy, DZ - 0.0175), 'walnut', bevel=0.006, group='desk')
for i, (x, y) in enumerate([(DX0 + 0.05, DY0 + 0.05), (DX1 - 0.05, DY0 + 0.05), (DX0 + 0.05, DY1 - 0.05), (DX1 - 0.05, DY1 - 0.05)]):
    box(f'leg_{i}', (0.04, 0.04, DZ - 0.035), (x, y, (DZ - 0.035) / 2), 'blackmetal', bevel=0.004, group='desk')
box('rail_b', (DX1 - DX0 - 0.1, 0.03, 0.06), (dcx, DY1 - 0.05, DZ - 0.07), 'blackmetal', bevel=0.003, group='desk')
box('rail_l', (0.03, DY1 - DY0 - 0.1, 0.06), (DX0 + 0.05, dcy, DZ - 0.07), 'blackmetal', bevel=0.003, group='desk')
box('rail_r', (0.03, DY1 - DY0 - 0.1, 0.06), (DX1 - 0.05, dcy, DZ - 0.07), 'blackmetal', bevel=0.003, group='desk')
# drawer
box('drawer', (0.42, DY1 - DY0 - 0.08, 0.1), (0.6, dcy + 0.02, DZ - 0.035 - 0.05), 'walnut', bevel=0.004, group='desk')
box('drawer_h', (0.12, 0.012, 0.012), (0.6, DY0 + 0.025, DZ - 0.035 - 0.05), 'brass', bevel=0.003, group='desk')

# desk mat
box('deskmat', (0.86, 0.34, 0.003), (0.02, 1.07, DZ + 0.0015), 'felt', bevel=0.0015, group='desk')

# ---------------- monitor (front faces -Y)
MX, MY, MZ = 0.02, 1.36, 1.08
SW, SH = 0.60, 0.375
box('mon_body', (SW + 0.024, 0.024, SH + 0.032), (MX, MY, MZ - 0.004), 'darkalu', bevel=0.007, seg=4, group='desk', hot='screen')
box('mon_back', (0.36, 0.04, 0.24), (MX, MY + 0.025, MZ), 'darkalu', bevel=0.02, seg=4, group='desk', hot='screen')
box('mon_neck', (0.06, 0.025, 0.3), (MX, MY + 0.06, DZ + 0.17), 'alu', bevel=0.008, group='desk', hot='screen')
box('mon_base', (0.24, 0.17, 0.012), (MX, MY + 0.03, DZ + 0.006), 'alu', bevel=0.005, seg=4, group='desk', hot='screen')
box('mon_chin', (0.08, 0.002, 0.004), (MX, MY - 0.0125, MZ - SH / 2 - 0.011), 'alu', bevel=0, group='desk')
bm = bmesh.new()
hw, hh = SW / 2, SH / 2
v = [bm.verts.new(p) for p in [(-hw, 0, -hh), (hw, 0, -hh), (hw, 0, hh), (-hw, 0, hh)]]
bm.faces.new(v)
scr = mesh_obj('SCREEN', bm)
scr.location = (MX, MY - 0.0125, MZ + 0.004)
scr.data.materials.append(M['screen'])
NOBAKE.add('SCREEN')

# ---------------- keyboard
KX, KY = 0.0, 1.06
box('kb_case', (0.33, 0.115, 0.016), (KX, KY, DZ + 0.0045 + 0.008), 'darkalu', bevel=0.005, seg=4, group='small', rot=(3, 0, 0))
pitch = 0.0188
cols = 15
rows_k = 5
for r in range(rows_k):
    x = KX - pitch * (cols - 1) / 2
    widths = [1] * cols
    if r == 4:
        widths = [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1, 1, 1]
    elif r == 3:
        widths = [2.25] + [1] * 10 + [1.75, 1, 1]
    elif r == 2:
        widths = [1.75] + [1] * 11 + [2.25, 1]
    elif r == 1:
        widths = [1.5] + [1] * 12 + [1.5, 1]
    x = KX - pitch * 15 / 2
    for c, w in enumerate(widths):
        kw = pitch * w - 0.0025
        cx = x + pitch * w / 2
        x += pitch * w
        y = KY + 0.038 - r * pitch
        z = DZ + 0.022 + 0.0009 * (rows_k - r)
        mat = 'keycap'
        if (r == 0 and c == 0) or (r == 2 and c == len(widths) - 2):
            mat = 'keyaccent'
        elif r == 4 and c == 3:
            mat = 'keycap2'
        elif (r == 0 and c >= 12) or (r == 4 and c in (0, 1, 2, 4, 5)):
            mat = 'keycap2'
        box(f'key_{r}_{c}', (kw, pitch - 0.0025, 0.009), (cx, y, z), mat, bevel=0.0022, seg=2, group='small')
# mouse
sphere('mouse', 0.03, (0.32, 1.05, DZ + 0.012), 'darkalu', scale=(0.62, 1.0, 0.42), group='small')

# ---------------- lamp (base back-left, shade over the dev board)
LB = Vector((-0.52, 1.38, DZ))
cyl('lamp_base', 0.075, 0.022, LB + Vector((0, 0, 0.011)), 'blackmetal', bevel=0.006, group='desk')
cyl('lamp_base_ring', 0.076, 0.004, LB + Vector((0, 0, 0.0235)), 'brass', group='desk')
P0 = LB + Vector((0, 0, 0.045))
P1 = Vector((-0.5, 1.24, 1.2))
P2 = Vector((-0.34, 1.08, 1.17))
HEAD_DIR = Vector((0.06, -0.08, -1)).normalized()


def rod(name, a, b, r, mat):
    d = b - a
    o = cyl(name, r, d.length, (a + b) / 2, mat, verts=20, group='desk')
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


cyl('lamp_post', 0.012, 0.03, LB + Vector((0, 0, 0.035)), 'brass', group='desk')
for s in (-1, 1):
    off = Vector((0.012 * s, 0, 0))
    rod(f'lamp_arm1_{s}', P0 + off, P1 + off, 0.0045, 'blackmetal')
    rod(f'lamp_arm2_{s}', P1 + off, P2 + off, 0.0045, 'blackmetal')
for i, p in enumerate((P0, P1, P2)):
    o = cyl(f'lamp_joint_{i}', 0.014, 0.04, p, 'brass', verts=24, bevel=0.002, group='desk')
    o.rotation_euler = (0, R(90), 0)
# springs
rod('lamp_spring', P0.lerp(P1, 0.15) + Vector((0, 0.012, 0)), P0.lerp(P1, 0.7) + Vector((0, 0.012, 0)), 0.003, 'alu')
# shade
shade_tip = P2 + HEAD_DIR * 0.02
shade = lathe('lamp_shade', [(0.02, 0.0), (0.024, -0.03), (0.07, -0.13), (0.072, -0.135), (0.067, -0.132), (0.0195, -0.032), (0.016, -0.004)], shade_tip, 'blackmetal', group='desk')
shade.rotation_euler = (-HEAD_DIR).to_track_quat('Z', 'Y').to_euler()
bulb_pos = shade_tip + HEAD_DIR * 0.07
sphere('lamp_bulb', 0.026, bulb_pos, 'bulb', group='desk')
empty('PIN_lamp', bulb_pos)
spot = bpy.data.lights.new('lamp_spot', 'SPOT')
spot.energy = 70
spot.color = (1.0, 0.72, 0.45)
spot.spot_size = R(120)
spot.spot_blend = 0.55
spot.shadow_soft_size = 0.03
so = bpy.data.objects.new('lamp_spot', spot)
so.location = bulb_pos + HEAD_DIR * 0.02
so.rotation_euler = HEAD_DIR.to_track_quat('-Z', 'Y').to_euler()
col.objects.link(so)
pt = bpy.data.lights.new('lamp_fill', 'POINT')
pt.energy = 1.2
pt.color = (1.0, 0.7, 0.45)
pt.shadow_soft_size = 0.02
po = bpy.data.objects.new('lamp_fill', pt)
po.location = bulb_pos - HEAD_DIR * 0.03
col.objects.link(po)
tube('lamp_cable', [(LB.x + 0.05, LB.y + 0.05, DZ + 0.004), (LB.x + 0.1, LB.y + 0.15, DZ + 0.003), (LB.x + 0.12, DY1 + 0.02, DZ - 0.05), (LB.x + 0.15, DY1 - 0.02, 0.3), (LB.x + 0.2, DY1 - 0.05, 0.005)], 0.003, 'wire', group='desk')

# ---------------- dev board (OBC) under the lamp
BX, BY, BRZ = -0.33, 1.02, -14
board = bpy.data.objects.new('board_root', None)
col.objects.link(board)
board.location = (BX, BY, DZ)
board.rotation_euler = (0, 0, R(BRZ))
board.scale = (1.5, 1.5, 1.5)
bparts = []


def bpart(o):
    o.parent = board
    bparts.append(o)
    return o


PW, PH = 0.1, 0.07
bpart(box('pcb', (PW, PH, 0.0016), (0, 0, 0.0078), 'pcb', bevel=0.0012, seg=2, group='small', hot='board'))
for i, (x, y) in enumerate([(-PW / 2 + 0.004, -PH / 2 + 0.004), (PW / 2 - 0.004, -PH / 2 + 0.004), (-PW / 2 + 0.004, PH / 2 - 0.004), (PW / 2 - 0.004, PH / 2 - 0.004)]):
    bpart(cyl(f'standoff_{i}', 0.0025, 0.007, (x, y, 0.0035), 'brass', verts=12, group='small', hot='board'))
bpart(box('mcu', (0.016, 0.016, 0.0018), (0.004, 0.002, 0.0095), 'chip', bevel=0.0005, seg=1, group='small', hot='board'))
bpart(box('chip2', (0.009, 0.006, 0.0014), (-0.02, 0.012, 0.0093), 'chip', bevel=0.0004, seg=1, group='small', hot='board'))
bpart(box('chip3', (0.007, 0.007, 0.0014), (0.028, -0.01, 0.0093), 'chip', bevel=0.0004, seg=1, group='small', hot='board'))
bpart(box('xtal', (0.006, 0.0025, 0.002), (0.004, -0.014, 0.0096), 'alu', bevel=0.0008, seg=2, group='small', hot='board'))
bpart(box('usb', (0.009, 0.008, 0.0032), (-PW / 2 + 0.003, -0.005, 0.0102), 'alu', bevel=0.0012, seg=2, group='small', hot='board'))
for i in range(12):
    bpart(box(f'cap_{i}', (0.002, 0.0012, 0.0012), (-0.03 + (i % 6) * 0.005, -0.022 + (i // 6) * 0.034, 0.0092), 'book1', bevel=0, group='small', hot='board'))
for row, y in enumerate((PH / 2 - 0.004, -PH / 2 + 0.004)):
    bpart(box(f'hdr_{row}', (0.0254 * 3.2, 0.0025, 0.0025), (0.01, y, 0.0099), 'chip', bevel=0.0003, seg=1, group='small', hot='board'))
    for i in range(16):
        bpart(box(f'pin_{row}_{i}', (0.0006, 0.0006, 0.006), (0.01 - 0.0254 * 1.6 + 0.0025 + i * 0.0051, y, 0.0125), 'gold', bevel=0, group='small', hot='board'))
bpart(box('led1', (0.0016, 0.0009, 0.0007), (0.03, 0.006, 0.0089), 'led_g', bevel=0, group='small', hot='board'))
bpart(box('led2', (0.0016, 0.0009, 0.0007), (0.03, 0.01, 0.0089), 'led_r', bevel=0, group='small', hot='board'))
empty('PIN_board', (BX, BY, DZ + 0.03))
tube('usb_cable', [(BX - 0.05, BY - 0.0, DZ + 0.01), (BX - 0.09, BY + 0.03, DZ + 0.006), (BX - 0.04, BY + 0.2, DZ + 0.004), (MX - 0.15, MY + 0.05, DZ + 0.004), (MX - 0.05, MY + 0.06, DZ + 0.05)], 0.0022, 'wire', group='small')

# ---------------- notebooks (stack on the right, a pen on top)
NX, NY = 0.6, 1.13
nb = [('nb_green', 0.0, 4), ('nb_terra', 0.014, -6), ('nb_ink', 0.028, 9)]
for i, (mat, z, rz) in enumerate(nb):
    zz = DZ + z
    o_c = box(f'nb{i}_cover', (0.152, 0.212, 0.0135), (NX, NY, zz + 0.00675), mat, bevel=0.0025, seg=2, rot=(0, 0, rz), group='small', hot='notebooks')
    o_p = box(f'nb{i}_pages', (0.149, 0.2, 0.011), (NX + 0.003 * math.cos(R(rz)), NY + 0.003 * math.sin(R(rz)), zz + 0.00675), 'pages', bevel=0.0008, seg=1, rot=(0, 0, rz), group='small', hot='notebooks')
    o_b = box(f'nb{i}_band', (0.006, 0.214, 0.0145), (NX + 0.05 * math.cos(R(rz)), NY + 0.05 * math.sin(R(rz)), zz + 0.00675), 'band', bevel=0.001, seg=1, rot=(0, 0, rz), group='small', hot='notebooks')
pen = cyl('pen', 0.0045, 0.15, (NX - 0.01, NY - 0.01, DZ + 0.042 + 0.0045), 'brass', rot=(0, 90, 32), verts=16, group='small', hot='notebooks')
empty('PIN_notebooks', (NX, NY, DZ + 0.06))

# mug
lathe('mug', [(0.036, 0.0), (0.04, 0.004), (0.041, 0.095), (0.037, 0.095), (0.036, 0.012), (0.0, 0.012)], (0.42, 1.3, DZ), 'ceramic', group='desk')
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=False, segments=24, radius=0.025)
mh = mesh_obj('mug_handle_path', bm)
bpy.data.objects.remove(mh)
handle = bpy.data.curves.new('mug_handle', 'CURVE')
handle.dimensions = '3D'
handle.bevel_depth = 0.006
sp = handle.splines.new('BEZIER')
sp.bezier_points.add(2)
for p, c in zip(sp.bezier_points, [(0.039, 0, 0.078), (0.068, 0, 0.05), (0.039, 0, 0.022)]):
    p.co = c
    p.handle_left_type = p.handle_right_type = 'AUTO'
ho = bpy.data.objects.new('mug_handle', handle)
ho.location = (0.42, 1.3, DZ)
ho.rotation_euler = (0, 0, R(-40))
col.objects.link(ho)
ho.data.materials.append(M['ceramic'])
reg(ho, 'desk')

# ---------------- shelf on the back wall, CubeSat and books
SX0, SX1, SZ = 0.4, 1.3, 1.5
box('shelf', (SX1 - SX0, 0.22, 0.03), ((SX0 + SX1) / 2, Y1 - 0.1, SZ), 'oak', bevel=0.005, group='desk')
for i, x in enumerate((SX0 + 0.08, SX1 - 0.08)):
    box(f'bracket_v_{i}', (0.02, 0.012, 0.14), (x, Y1 - 0.006, SZ - 0.085), 'blackmetal', bevel=0.002, group='desk')
    box(f'bracket_h_{i}', (0.02, 0.16, 0.012), (x, Y1 - 0.09, SZ - 0.021), 'blackmetal', bevel=0.002, group='desk')
box('ledstrip', (SX1 - SX0 - 0.04, 0.008, 0.004), ((SX0 + SX1) / 2, Y1 - 0.17, SZ - 0.017), 'ledstrip', bevel=0, group='desk')
# books
bx = SX0 + 0.03
for i, (w, h, mat, tilt) in enumerate([(0.03, 0.24, 'book2', 0), (0.026, 0.22, 'book1', 0), (0.038, 0.25, 'book3', 0), (0.024, 0.2, 'book4', 0), (0.03, 0.23, 'book1', -14)]):
    if tilt:
        bx += 0.03
    box(f'book_{i}', (w, 0.16, h), (bx + w / 2, Y1 - 0.1, SZ + 0.015 + h / 2), mat, bevel=0.002, rot=(0, tilt, 0), group='desk')
    bx += w + 0.002
# CubeSat on a little stand
CX, CY, CZ = 1.06, Y1 - 0.11, SZ + 0.015
box('cs_stand', (0.19, 0.19, 0.016), (CX, CY, CZ + 0.008), 'walnut', bevel=0.004, group='small', hot='cubesat')
csz = CZ + 0.016
CW, CHt = 0.13, 0.26
for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
    box(f'cs_rail_{i}', (0.0085, 0.0085, CHt + 0.012), (CX + sx * (CW / 2 - 0.004), CY + sy * (CW / 2 - 0.004), csz + (CHt + 0.012) / 2), 'alu', bevel=0.0012, seg=2, group='small', hot='cubesat')
for j, z in enumerate((csz + 0.006, csz + CHt / 2 + 0.006, csz + CHt + 0.006)):
    for k, rz in enumerate((0, 90)):
        box(f'cs_frame_{j}_{k}', (CW - 0.004, 0.006, 0.006), (CX, CY, z), 'alu', bevel=0.001, rot=(0, 0, rz), group='small', hot='cubesat')
# body + solar panels
box('cs_body', (CW - 0.01, CW - 0.01, CHt), (CX, CY, csz + 0.006 + CHt / 2), 'darkalu', bevel=0.001, group='small', hot='cubesat')
for k, (dx, dy, rz) in enumerate([(0, -1, 0), (1, 0, 90), (0, 1, 180), (-1, 0, 270)]):
    for u in range(2):
        zc = csz + 0.006 + CHt / 4 + u * CHt / 2
        box(f'cs_panel_{k}_{u}', (CW - 0.02, 0.0025, CHt / 2 - 0.016), (CX + dx * (CW / 2 - 0.004), CY + dy * (CW / 2 - 0.004), zc), 'cells', bevel=0.0006, seg=1, rot=(0, 0, rz), group='small', hot='cubesat')
# antenna deployer + tape antennas
box('cs_top', (CW - 0.012, CW - 0.012, 0.004), (CX, CY, csz + CHt + 0.011), 'pcb', bevel=0.0008, group='small', hot='cubesat')
for i in range(4):
    a = R(45 + 90 * i)
    base = Vector((CX, CY, csz + CHt + 0.013))
    tip = base + Vector((math.cos(a) * 0.17, math.sin(a) * 0.17, 0.04 if i % 2 else 0.02))
    rod(f'cs_ant_{i}', base + Vector((math.cos(a) * 0.035, math.sin(a) * 0.035, 0)), tip, 0.0012, 'alu')
    o = bpy.data.objects[f'cs_ant_{i}']
    GROUP[o.name] = 'small'
    HOT[o.name] = 'cubesat'
empty('PIN_cubesat', (CX, CY, csz + CHt + 0.06))


# ---------------- cork pinboard above the boxes (roles, pinned)
PBX, PBZ = 1.08, 1.08
box('pb_frame', (0.6, 0.022, 0.4), (PBX, Y1 - 0.011, PBZ), 'oak', bevel=0.004, group='desk', hot='pinboard')
box('pb_cork', (0.56, 0.006, 0.36), (PBX, Y1 - 0.024, PBZ), 'cork', bevel=0.0, group='desk', hot='pinboard')
cards = [(-0.19, 0.08, 4, 'pages'), (-0.07, 0.09, -5, 'note_y'), (0.06, 0.07, 3, 'pages'), (0.19, 0.08, -3, 'note_b'), (-0.13, -0.08, -2, 'note_b'), (0.0, -0.09, 6, 'pages'), (0.15, -0.08, -6, 'note_y')]
for i, (dx, dz, rot, mat) in enumerate(cards):
    box(f'pb_card_{i}', (0.085, 0.0015, 0.11 if i % 2 else 0.095), (PBX + dx, Y1 - 0.028, PBZ + dz), mat, bevel=0, rot=(0, rot, 0), group='desk', hot='pinboard')
    sphere(f'pb_pin_{i}', 0.006, (PBX + dx, Y1 - 0.032, PBZ + dz + 0.04), ['led_r', 'brass', 'keyaccent'][i % 3] if False else ['pin_r', 'brass', 'pin_b'][i % 3], group='desk', hot='pinboard', seg=10)
empty('PIN_pinboard', (PBX, Y1 - 0.05, PBZ + 0.24))

# ---------------- Amazon corner: a stack of boxes and a drive-unit robot carrying a parcel


def parcel(name, dims, loc, rz, hot='amazon', label=True):
    o = box(name, dims, loc, 'cardboard', bevel=0.004, seg=2, rot=(0, 0, rz), group='desk', hot=hot)
    t = box(name + '_tape', (dims[0] + 0.002, 0.05, 0.0016), (loc[0], loc[1], loc[2] + dims[2] / 2 + 0.0004), 'tape', bevel=0.0005, seg=1, rot=(0, 0, rz), group='desk', hot=hot)
    c = math.cos(R(rz)); s = math.sin(R(rz))
    if label:
        lw, lh = min(0.14, dims[0] * 0.45), min(0.09, dims[2] * 0.4)
        off = Vector((dims[0] * 0.18, -dims[1] / 2 - 0.0008, -dims[2] * 0.12))
        off = Matrix.Rotation(R(rz), 3, 'Z') @ off
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        lo = mesh_obj(name + '_label', bm)
        lo.scale = (lw, lh, 1)
        lo.rotation_euler = (R(90), 0, R(rz))
        lo.location = Vector(loc) + off
        finish(lo, 'label', smooth=False)
        reg(lo, 'desk', hot)
    return o


parcel('box_a', (0.5, 0.38, 0.32), (1.22, 1.3, 0.16), 4)
parcel('box_b', (0.38, 0.3, 0.24), (1.2, 1.32, 0.32 + 0.12), -7)
parcel('box_c', (0.26, 0.22, 0.17), (1.26, 1.34, 0.56 + 0.085), 11, label=False)
# robot
RX, RY, RRZ = 1.02, 0.66, -28
robot = bpy.data.objects.new('robot_root', None)
col.objects.link(robot)
robot.location = (RX, RY, 0)
robot.rotation_euler = (0, 0, R(RRZ))
rparts = []


def rpart(o):
    o.parent = robot
    rparts.append(o)
    return o


rpart(box('rb_body', (0.3, 0.24, 0.075), (0, 0, 0.05), 'robot', bevel=0.022, seg=5, group='desk', hot='amazon'))
rpart(box('rb_stripe', (0.302, 0.242, 0.012), (0, 0, 0.03), 'robotaccent', bevel=0.004, seg=2, group='desk', hot='amazon'))
rpart(cyl('rb_turntable', 0.085, 0.014, (0, 0, 0.094), 'rubber', bevel=0.004, group='desk', hot='amazon'))
rpart(box('rb_led', (0.004, 0.08, 0.006), (0.151, 0, 0.058), 'led_c', bevel=0, group='desk', hot='amazon'))
for i, (x, y) in enumerate([(0.1, 0.12), (-0.1, 0.12), (0.1, -0.12), (-0.1, -0.12)]):
    o = rpart(cyl(f'rb_wheel_{i}', 0.022, 0.016, (x, y, 0.022), 'rubber', rot=(90, 0, 0), verts=24, bevel=0.003, group='desk', hot='amazon'))
rp = parcel('rb_parcel', (0.2, 0.17, 0.13), (0, 0, 0.101 + 0.065), 6, label=True)
for n in ('rb_parcel', 'rb_parcel_tape', 'rb_parcel_label'):
    rpart(bpy.data.objects[n])
empty('PIN_amazon', (1.16, 1.25, 0.8))

# ---------------- chair (pulled back, turned toward the room)
CHX, CHY, CHR = -0.62, 0.42, 200
chair = bpy.data.objects.new('chair_root', None)
col.objects.link(chair)
chair.location = (CHX, CHY, 0)
chair.rotation_euler = (0, 0, R(CHR))


def cpart(o):
    o.parent = chair
    return o


for i in range(5):
    a = R(90 + 72 * i)
    leg = cpart(box(f'ch_leg_{i}', (0.3, 0.035, 0.025), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.07), 'blackmetal', bevel=0.008, seg=3, rot=(0, -6, math.degrees(a)), group='room'))
    cpart(sphere(f'ch_caster_{i}', 0.025, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.03), 'rubber', scale=(1, 0.7, 1), group='room', seg=16))
cpart(cyl('ch_hub', 0.04, 0.05, (0, 0, 0.09), 'blackmetal', bevel=0.006, group='room'))
cpart(cyl('ch_gas', 0.022, 0.32, (0, 0, 0.27), 'alu', group='room'))
cpart(box('ch_seat', (0.48, 0.46, 0.075), (0, 0, 0.47), 'leather', bevel=0.032, seg=6, group='room'))
cpart(box('ch_seatbase', (0.4, 0.38, 0.03), (0, 0, 0.42), 'blackmetal', bevel=0.008, group='room'))
cpart(box('ch_back', (0.44, 0.06, 0.48), (0, -0.25, 0.86), 'leather', bevel=0.03, seg=6, rot=(-8, 0, 0), group='room'))
cpart(box('ch_spine', (0.05, 0.025, 0.36), (0, -0.25, 0.55), 'blackmetal', bevel=0.008, rot=(-14, 0, 0), group='room'))
for s in (-1, 1):
    cpart(box(f'ch_arm_{s}', (0.04, 0.26, 0.025), (s * 0.25, 0.0, 0.66), 'blackmetal', bevel=0.01, group='room'))
    cpart(box(f'ch_armpost_{s}', (0.025, 0.03, 0.2), (s * 0.25, -0.06, 0.55), 'blackmetal', bevel=0.006, group='room'))

# ---------------- pins / anchors for the web
empty('PIN_screen', (MX, MY - 0.02, MZ + SH / 2 + 0.06))
empty('PIN_window', (X0 + 0.05, (WY0 + WY1) / 2, WZ1 + 0.1))


# ---------------- glow anchors for the web (bulbs and LEDs), world positions
bpy.context.view_layer.update()
empty('GLOW_lamp', bulb_pos)
for i, p in enumerate(pts[1:-1:2]):
    empty(f'GLOW_fairy_{i}', (p[0], p[1] - 0.004, p[2] - 0.016))
empty('GLOW_board', board.matrix_world @ Vector((0.03, 0.008, 0.009)))
empty('GLOW_robot', robot.matrix_world @ Vector((0.152, 0, 0.058)))

# ================================================================ LIGHTS
moon = bpy.data.lights.new('moon', 'AREA')
moon.shape = 'RECTANGLE'
moon.size = WY1 - WY0
moon.size_y = WZ1 - WZ0
moon.energy = 220
moon.color = (0.5, 0.62, 1.0)
mo = bpy.data.objects.new('moon', moon)
mo.location = (X0 - 0.35, (WY0 + WY1) / 2 + 0.25, (WZ0 + WZ1) / 2 + 0.25)
mo.rotation_euler = look_rot((1, -0.35, -0.5), 'Z')
col.objects.link(mo)
# soft room fill so shadows hold colour (simulates bounce from an off-screen ceiling)
fill = bpy.data.lights.new('fill', 'AREA')
fill.shape = 'DISK'
fill.size = 2.5
fill.energy = 10
fill.color = (0.45, 0.55, 0.9)
fo = bpy.data.objects.new('fill', fill)
fo.location = (0.4, 0.2, 3.4)
fo.rotation_euler = (0, 0, 0)
col.objects.link(fo)
for i, p in enumerate(pts[1:-1:4]):
    l = bpy.data.lights.new(f'fl{i}', 'POINT')
    l.energy = 0.6
    l.color = (1, 0.65, 0.35)
    l.shadow_soft_size = 0.01
    lo = bpy.data.objects.new(f'fl{i}', l)
    lo.location = (p[0], p[1] - 0.04, p[2] - 0.03)
    col.objects.link(lo)

world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.006, 0.012, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
scene.world = world

# ================================================================ CAMERAS
CAMS = {
    # name: (location, target, lens mm, resolution)
    'desk': ((3.9, -3.1, 2.55), (0.0, 0.75, 0.95), 40, (1440, 900)),
    'close': ((1.25, -0.05, 1.45), (0.05, 1.2, 0.9), 35, (1440, 900)),
    'mobile': ((1.95, -1.65, 1.62), (-0.02, 1.0, 1.0), 30, (780, 1688)),
    'screen': ((0.02, 0.35, 1.1), (0.02, 1.36, 1.08), 35, (1440, 900)),
}


def make_cam(key):
    loc, tgt, lens, res = CAMS[key]
    cd = bpy.data.cameras.new('cam_' + key)
    cd.lens = lens
    cd.sensor_width = 36
    cd.sensor_fit = 'HORIZONTAL' if res[0] >= res[1] else 'VERTICAL'
    co = bpy.data.objects.new('cam_' + key, cd)
    co.location = loc
    co.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    col.objects.link(co)
    return co, res

# ================================================================ RENDER SETTINGS


def cycles(samples):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 2
    scene.cycles.sample_clamp_indirect = 4.0
    try:
        scene.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1


EXPOSURE = 1.35


def tonemap(px):
    # Linear -> ACES (Narkowicz fit) -> sRGB, applied identically to look-dev stills and baked atlases.
    import numpy as np
    x = np.clip(px * EXPOSURE, 0, None)
    y = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
    y = np.clip(y, 0, 1)
    return np.where(y <= 0.0031308, 12.92 * y, 1.055 * np.power(y, 1 / 2.4) - 0.055)


def save_tonemapped(img_float, path, w, h):
    import numpy as np
    a = np.empty(w * h * 4, dtype=np.float32)
    img_float.pixels.foreach_get(a)
    a = a.reshape(-1, 4)
    a[:, :3] = tonemap(a[:, :3])
    a[:, 3] = 1
    out = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    out.colorspace_settings.name = 'sRGB'
    out.pixels.foreach_set(a.ravel())
    out.filepath_raw = path
    out.file_format = 'PNG'
    out.save()
    return out


def denoise_image(img):
    """Run the compositor's Denoise node over a float image (Blender 5 compositor node groups)."""
    w, h = img.size
    sc = bpy.data.scenes.new('dn')
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    try:
        sc.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    tree = bpy.data.node_groups.new('dn_tree', 'CompositorNodeTree')
    sc.compositing_node_group = tree
    tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    n_img = tree.nodes.new('CompositorNodeImage')
    n_img.image = img
    n_dn = tree.nodes.new('CompositorNodeDenoise')
    try:
        n_dn.inputs['HDR'].default_value = True
    except Exception:
        try:
            n_dn.use_hdr = True
        except Exception:
            pass
    n_out = tree.nodes.new('NodeGroupOutput')
    tree.links.new(n_img.outputs['Image'], n_dn.inputs['Image'])
    tree.links.new(n_dn.outputs['Image'], n_out.inputs[0])
    sc.render.use_compositing = True
    sc.camera = bpy.data.objects.new('dn_cam', bpy.data.cameras.new('dn_cam'))
    sc.collection.objects.link(sc.camera)
    bpy.ops.render.render(scene=sc.name)
    rr = bpy.data.images['Render Result']
    tmp = f'/tmp/w1-blender/_dn_{img.name}.exr'
    sc.render.image_settings.file_format = 'OPEN_EXR'
    sc.render.image_settings.color_depth = '32'
    rr.save_render(tmp, scene=sc)
    res = bpy.data.images.load(tmp)
    res.colorspace_settings.name = 'Linear Rec.709'
    return res


def apply_all_modifiers():
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(col.objects):
        if o.type == 'CURVE' and (o.name in GROUP):
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            bpy.ops.object.convert(target='MESH')
            o.select_set(False)
    for o in list(col.objects):
        if o.type == 'MESH' and o.modifiers:
            bpy.context.view_layer.objects.active = o
            for m in list(o.modifiers):
                try:
                    bpy.ops.object.modifier_apply(modifier=m.name)
                except Exception as e:
                    print('modifier fail', o.name, m.name, e)


# ================================================================ MODES
if MODE == 'lookdev':
    out = argv[1]
    samples = int(argv[2]) if len(argv) > 2 else 128
    camkey = argv[3] if len(argv) > 3 else 'desk'
    cycles(samples)
    scene.cycles.use_denoising = True
    cam, res = make_cam(camkey)
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = int(argv[4]) if len(argv) > 4 else 100
    glass.hide_render = True
    scene.render.image_settings.file_format = 'OPEN_EXR'
    scene.render.image_settings.color_depth = '32'
    tmp = out.replace('.png', '.exr')
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(tmp)
    w, h = im.size
    save_tonemapped(im, out, w, h)
    print('LOOKDEV', out)

elif MODE == 'bake':
    outdir = argv[1]
    samples = int(argv[2]) if len(argv) > 2 else 128
    size = int(argv[3]) if len(argv) > 3 else 2048
    only = argv[4].split(',') if len(argv) > 4 else None
    os.makedirs(outdir, exist_ok=True)
    cycles(samples)
    cam, _ = make_cam('desk')
    scene.camera = cam
    glass.hide_render = True
    apply_all_modifiers()
    bpy.data.objects.remove(cut)
    groups = {}
    for n, g in GROUP.items():
        if n in bpy.data.objects:
            groups.setdefault(g, []).append(bpy.data.objects[n])
    SIZES = {'room': size, 'desk': size, 'small': size}
    # 1) UVs: one atlas per group, islands packed across every object in the group
    for g, objs in groups.items():
        bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            me = o.data
            while me.uv_layers:
                me.uv_layers.remove(me.uv_layers[0])
            me.uv_layers.new(name='bake')
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=R(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=True, margin_method='FRACTION', margin=0.004)
        bpy.ops.object.mode_set(mode='OBJECT')
    # 2) bake each group
    view_from = 'ACTIVE_CAMERA'
    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True
    scene.render.bake.use_pass_diffuse = True
    scene.render.bake.use_pass_glossy = True
    scene.render.bake.use_pass_transmission = False
    scene.render.bake.use_pass_emit = True
    scene.render.bake.margin = 12
    scene.render.bake.view_from = view_from
    imgs = {}
    for g, objs in groups.items():
        if only and g not in only:
            continue
        sz = SIZES[g]
        img = bpy.data.images.new(f'bake_{g}', sz, sz, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'Linear Rec.709'
        mats = set()
        for o in objs:
            for s in o.material_slots:
                if s.material:
                    mats.add(s.material)
        for m in mats:
            nt = m.node_tree
            n = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage')
            n.name = 'BAKE'
            n.image = img
            for x in nt.nodes:
                x.select = False
            n.select = True
            nt.nodes.active = n
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        print('BAKING', g, len(objs), 'objects')
        bpy.ops.object.bake(type='COMBINED', use_clear=True, margin=12)
        img.filepath_raw = f'{outdir}/{g}_raw.exr'
        img.file_format = 'OPEN_EXR'
        img.save()
        try:
            dn = denoise_image(img)
        except Exception as e:
            print('DENOISE FAILED', e)
            dn = img
        tm = save_tonemapped(dn, f'{outdir}/{g}.png', sz, sz)
        imgs[g] = f'{outdir}/{g}.png'
        print('BAKED', g)
    bpy.ops.wm.save_as_mainfile(filepath=f'{outdir}/baked.blend')
    # 3) swap materials for the baked atlas, join statics per group, keep hotspots separate
    for g, objs in groups.items():
        if g not in imgs:
            continue
        bm_ = bpy.data.materials.new(f'baked_{g}')
        bm_.use_nodes = True
        nt = bm_.node_tree
        im = bpy.data.images.load(imgs[g])
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = im
        p = nt.nodes['Principled BSDF']
        nt.links.new(tx.outputs['Color'], p.inputs['Base Color'])
        p.inputs['Roughness'].default_value = 1
        for o in objs:
            o.data.materials.clear()
            o.data.materials.append(bm_)
        # parent-free world transforms before joining
        for o in objs:
            if o.parent:
                mw = o.matrix_world.copy()
                o.parent = None
                o.matrix_world = mw
        buckets = {}
        for o in objs:
            key = HOT.get(o.name, 'static')
            buckets.setdefault(key, []).append(o)
        for key, bobjs in buckets.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in bobjs:
                o.select_set(True)
            bpy.context.view_layer.objects.active = bobjs[0]
            if len(bobjs) > 1:
                bpy.ops.object.join()
            j = bpy.context.view_layer.objects.active
            j.name = f'{g}_{key}' if key == 'static' else f'HS_{key}_{g}'
    # 4) export
    for n in ('SCREEN', 'GLASS', 'SKY'):
        pass
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:
        if o.type == 'MESH' and (o.name.startswith(('room_', 'desk_', 'small_', 'HS_')) or o.name in ('SCREEN', 'GLASS', 'SKY')):
            o.select_set(True)
        if o.type == 'EMPTY' and o.name.startswith(('PIN_', 'GLOW_')):
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f'{outdir}/room.glb', export_format='GLB', use_selection=True, export_normals=False,
                              export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_apply=True,
                              export_yup=True, export_extras=False)
    print('EXPORTED', f'{outdir}/room.glb')

elif MODE == 'save':
    bpy.ops.wm.save_as_mainfile(filepath=argv[1])
