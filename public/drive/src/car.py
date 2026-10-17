# W4/W5 Drive: a 911-inspired coupe, modelled for this site (no third-party mesh, no badges or logos).
#   Blender -b --python public/drive/src/car.py -- [lookdev|bake]
# Blender is Z-up with +X forward and +Y to the car's left; glTF gets (x, z, -y), so the car faces +X in three.js too.
# Body: a 22-point x 25-section subdivision cage (the 911 roofline, the fender humps either side of a low bonnet,
# the teardrop side window, the wide rear haunches), arches cut with booleans, then details projected onto the
# surface with ray casts (light bar, door shut lines, intakes, engine-lid louvres). Interior for the first-person view.
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import hexcol, active, join

WORK = '/tmp/drive-blender'
os.makedirs(WORK, exist_ok=True)
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'lookdev'
PAINT = os.environ.get('PAINT', '#a31d1a')
lib.reset()
lib.gpu()
sc = bpy.context.scene

# ---------------------------------------------------------------- materials
def pmat(name, col, rough=0.5, metal=0.0, coat=0.0, emit=None, es=0.0, alpha=1.0, transmission=0.0, ior=1.45):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexcol(col), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.03
    if emit:
        b.inputs['Emission Color'].default_value = (*hexcol(emit), 1)
        b.inputs['Emission Strength'].default_value = es
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
        b.inputs['IOR'].default_value = ior
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m

M = dict(
    paint=pmat('paint', PAINT, rough=0.32, coat=1.0),
    glass=pmat('glass', '#0a0e14', rough=0.02, transmission=0.0, alpha=0.55),
    trim=pmat('trim', '#0e0f12', rough=0.55),
    well=pmat('well', '#08090b', rough=0.9),
    chrome=pmat('chrome', '#dfe3e8', rough=0.12, metal=1.0),
    rim=pmat('rim', '#c6cad0', rough=0.25, metal=1.0),
    tyre=pmat('tyre', '#141416', rough=0.85),
    disc=pmat('disc', '#55575c', rough=0.45, metal=1.0),
    caliper=pmat('caliper', '#c9a227', rough=0.4),
    head=pmat('head', '#ffffff', rough=0.1, emit='#eaf2ff', es=12.0),
    drl=pmat('drl', '#ffffff', emit='#f2f6ff', es=25.0),
    lens=pmat('lens', '#cfd8e2', rough=0.02, alpha=0.25),
    tail=pmat('tail', '#3a0505', rough=0.2, emit='#ff1a10', es=14.0),
    smoke=pmat('smoke', '#140607', rough=0.15),
    leather=pmat('leather', '#7a4426', rough=0.55),
    black=pmat('black', '#141416', rough=0.6),
    carpet=pmat('carpet', '#16161a', rough=0.95),
    alu=pmat('alu', '#8c9097', rough=0.35, metal=1.0),
    gauge=pmat('gauge', '#0b0c0f', rough=0.3, emit='#ffffff', es=0.0),
    needle=pmat('needle', '#ff6a1a', emit='#ff6a1a', es=6.0),
    mirror=pmat('mirror', '#4a5260', rough=0.08, metal=1.0),
)

# body back faces read as the cabin lining: a dark headliner in place of inside-out paint
def lining(m, col='#1a1a1e'):
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    out = nt.nodes['Material Output']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    d = nt.nodes.new('ShaderNodeBsdfDiffuse')
    d.inputs['Color'].default_value = (*hexcol(col), 1)
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mx.inputs['Fac'])
    nt.links.new(b.outputs['BSDF'], mx.inputs[1])
    nt.links.new(d.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], out.inputs['Surface'])
lining(M['paint'])

def gauge_mat():
    m = M['gauge']
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(os.path.join(WORK, 'gauges.png'))
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 1.6
gauge_mat()

def mesh_obj(name, verts, faces, mats=None, mi=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    for m in (mats or []):
        me.materials.append(m)
    if mi is not None:
        for p, i in zip(me.polygons, mi):
            p.material_index = i
    return o

def apply_mods(o):
    active(o)
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)

def smooth(o, angle=40):
    active(o)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

# ---------------------------------------------------------------- body cage
# x, w (max half width), (y,z) of: shoulder, belt/bonnet edge, glass mid, DLO top, roof rail, roof mid; z of centreline
S = [
    (2.22, 0.62, (0.56, 0.47), (0.40, 0.495), (0.33, 0.50), (0.28, 0.502), (0.25, 0.504), (0.13, 0.507), 0.508),
    (2.15, 0.78, (0.70, 0.59), (0.48, 0.555), (0.41, 0.556), (0.36, 0.557), (0.33, 0.558), (0.17, 0.56), 0.56),
    (2.02, 0.86, (0.71, 0.735), (0.50, 0.615), (0.43, 0.618), (0.38, 0.62), (0.345, 0.621), (0.18, 0.624), 0.625),
    (1.86, 0.895, (0.715, 0.805), (0.52, 0.672), (0.45, 0.677), (0.40, 0.68), (0.365, 0.682), (0.19, 0.687), 0.689),
    (1.62, 0.91, (0.725, 0.84), (0.53, 0.725), (0.46, 0.731), (0.41, 0.734), (0.375, 0.736), (0.19, 0.742), 0.744),
    (1.38, 0.915, (0.74, 0.855), (0.55, 0.762), (0.48, 0.768), (0.43, 0.771), (0.39, 0.773), (0.20, 0.779), 0.781),
    (1.12, 0.91, (0.765, 0.86), (0.585, 0.788), (0.51, 0.793), (0.46, 0.796), (0.42, 0.798), (0.21, 0.804), 0.806),
    (0.86, 0.895, (0.80, 0.862), (0.65, 0.822), (0.57, 0.826), (0.52, 0.828), (0.48, 0.83), (0.24, 0.835), 0.837),
    (0.64, 0.885, (0.835, 0.866), (0.74, 0.873), (0.70, 0.875), (0.68, 0.877), (0.65, 0.879), (0.33, 0.865), 0.861),
    (0.42, 0.88, (0.845, 0.87), (0.75, 0.882), (0.71, 0.945), (0.675, 1.005), (0.635, 1.02), (0.32, 1.033), 1.038),
    (0.20, 0.88, (0.845, 0.875), (0.75, 0.888), (0.70, 1.015), (0.645, 1.125), (0.60, 1.147), (0.31, 1.17), 1.174),
    (-0.04, 0.88, (0.85, 0.88), (0.75, 0.895), (0.69, 1.055), (0.615, 1.207), (0.57, 1.237), (0.29, 1.263), 1.268),
    (-0.30, 0.885, (0.855, 0.885), (0.75, 0.90), (0.685, 1.065), (0.605, 1.215), (0.56, 1.258), (0.28, 1.29), 1.296),
    (-0.58, 0.905, (0.87, 0.89), (0.755, 0.905), (0.69, 1.04), (0.60, 1.17), (0.55, 1.24), (0.275, 1.272), 1.278),
    (-0.82, 0.93, (0.89, 0.893), (0.77, 0.912), (0.705, 0.99), (0.64, 1.075), (0.53, 1.195), (0.265, 1.228), 1.234),
    (-1.04, 0.955, (0.91, 0.893), (0.79, 0.92), (0.75, 0.94), (0.71, 0.955), (0.49, 1.135), (0.245, 1.168), 1.173),
    (-1.24, 0.97, (0.925, 0.89), (0.80, 0.925), (0.70, 0.955), (0.62, 0.99), (0.45, 1.075), (0.225, 1.105), 1.11),
    (-1.46, 0.972, (0.925, 0.885), (0.79, 0.925), (0.67, 0.958), (0.57, 0.985), (0.42, 1.015), (0.21, 1.04), 1.045),
    (-1.70, 0.965, (0.915, 0.875), (0.78, 0.915), (0.64, 0.94), (0.53, 0.955), (0.40, 0.965), (0.20, 0.975), 0.978),
    (-1.94, 0.94, (0.895, 0.86), (0.76, 0.89), (0.62, 0.91), (0.51, 0.92), (0.385, 0.926), (0.19, 0.932), 0.934),
    (-2.12, 0.895, (0.855, 0.845), (0.73, 0.87), (0.60, 0.885), (0.49, 0.892), (0.37, 0.896), (0.185, 0.90), 0.902),
    (-2.24, 0.82, (0.78, 0.815), (0.67, 0.835), (0.55, 0.845), (0.46, 0.85), (0.35, 0.853), (0.175, 0.856), 0.857),
    (-2.30, 0.70, (0.66, 0.75), (0.56, 0.77), (0.46, 0.778), (0.39, 0.78), (0.31, 0.782), (0.155, 0.785), 0.786),
]
ZB = {2.22: 0.24, 2.15: 0.19, -2.12: 0.22, -2.24: 0.27, -2.30: 0.34}

def zw_of(x):
    return float(np.interp(x, [-2.3, -1.2, 0.0, 1.2, 2.2], [0.58, 0.55, 0.50, 0.47, 0.44]))

def half_ring(row):
    x, w, p5, p6, p7, p8a, p8b, p9, z10 = row
    zb = ZB.get(x, 0.17)
    zw = zw_of(x)
    return [(0.0, zb), (w * 0.80, zb), (w * 0.965, zb + 0.05), (w, zb + 0.17), (w, zw), p5, p6, p7, p8a, p8b, p9, (0.0, z10)]

def full_ring(row):
    h = half_ring(row)
    left = h[1:11]
    right = [(-y, z) for (y, z) in reversed(left)]
    return [h[0]] + left + [h[11]] + right  # 22 points: 0 bottom centre, 1..10 left, 11 top centre, 12..21 right

NR = 22
# half segment k joins half positions k and k+1; positions: 0 bot,1,2 sill,3,4 max,5 shoulder,6 belt,7 glass,8 DLO top,9 rail,10 roof mid,11 top
def seg_of(i):
    """ring segment i (between ring idx i and i+1) -> half segment k"""
    if i <= 10:
        return i
    return 21 - i  # right side mirrored: 11->10, 12->9 ... 21->0

def cr(p0, p1, p2, p3, t, alpha=0.5):
    """centripetal Catmull-Rom between p1 and p2"""
    def tj(ti, a, b):
        return ti + max(np.linalg.norm(b - a), 1e-6) ** alpha
    t0 = 0.0
    t1 = tj(t0, p0, p1)
    t2 = tj(t1, p1, p2)
    t3 = tj(t2, p2, p3)
    tt = t1 + (t2 - t1) * t
    a1 = (t1 - tt) / (t1 - t0) * p0 + (tt - t0) / (t1 - t0) * p1
    a2 = (t2 - tt) / (t2 - t1) * p1 + (tt - t1) / (t2 - t1) * p2
    a3 = (t3 - tt) / (t3 - t2) * p2 + (tt - t2) / (t3 - t2) * p3
    b1 = (t2 - tt) / (t2 - t0) * a1 + (tt - t0) / (t2 - t0) * a2
    b2 = (t3 - tt) / (t3 - t1) * a2 + (tt - t1) / (t3 - t1) * a3
    return (t2 - tt) / (t2 - t1) * b1 + (tt - t1) / (t2 - t1) * b2

def resample(P, sub, closed):
    """P: (n, d). Returns (points, span index per output segment)"""
    n = len(P)
    out, span = [], []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if closed else (P[i - 1] if i > 0 else 2 * P[0] - P[1])
        p1 = P[i]
        p2 = P[(i + 1) % n]
        p3 = P[(i + 2) % n] if closed else (P[i + 2] if i + 2 < n else 2 * P[n - 1] - P[n - 2])
        for k in range(sub):
            out.append(cr(p0, p1, p2, p3, k / sub))
            span.append(i)
    if not closed:
        out.append(P[-1])
    return np.array(out), span

RSUB, XSUB = 4, 3

def build_body():
    # cage rows, plus a shrunken ring beyond each end so the nose and tail round over
    rows = []
    for row in S:
        rows.append(np.array([(row[0], y, z) for (y, z) in full_ring(row)]))
    def shrunk(r, dx, k):
        c = r.mean(axis=0)
        q = r.copy()
        q[:, 1] = q[:, 1] * k
        q[:, 2] = c[2] + (q[:, 2] - c[2]) * (k + 0.1)
        q[:, 0] += dx
        return q
    rows = [shrunk(rows[0], 0.022, 0.6)] + rows + [shrunk(rows[-1], -0.026, 0.6)]
    xs = [r[0, 0] for r in rows]
    # resample every ring around (closed), then every ring index along x (open)
    rings = []
    for r in rows:
        q, rspan = resample(r, RSUB, True)
        rings.append(q)
    rings = np.array(rings)  # (nrows, NRr, 3)
    nr = rings.shape[1]
    cols = []
    for i in range(nr):
        q, xspan = resample(rings[:, i, :], XSUB, False)
        cols.append(q)
    G = np.stack(cols, axis=1)  # (nx, nr, 3)
    nx = G.shape[0]
    verts = [tuple(v) for v in G.reshape(-1, 3)]
    faces, mi = [], []
    for j in range(nx - 1):
        cj = xspan[j]  # row span index (0 = shrunk front ring -> first row)
        xm = (xs[cj] + xs[cj + 1]) / 2
        for i in range(nr):
            a = j * nr + i
            b = j * nr + (i + 1) % nr
            c = (j + 1) * nr + (i + 1) % nr
            d = (j + 1) * nr + i
            faces.append((a, d, c, b))
            k = seg_of(rspan[i])
            m = 0
            if k == 0:
                m = 2
            if 1 <= cj <= len(S) - 1:
                if k in (6, 7) and -1.04 < xm < 0.64:
                    m = 1
                if k in (9, 10) and -0.04 < xm < 0.64:
                    m = 1
                if k in (9, 10) and -1.46 < xm < -0.82:
                    m = 1
            mi.append(m)
    for end in (0, nx - 1):
        ring = G[end]
        c = ring.mean(axis=0)
        ci = len(verts)
        verts.append(tuple(c))
        for i in range(nr):
            a = end * nr + i
            b = end * nr + (i + 1) % nr
            faces.append((a, b, ci) if end == 0 else (b, a, ci))
            mi.append(0)
    o = mesh_obj('body', verts, faces, [M['paint'], M['glass'], M['trim'], M['well']], mi)
    active(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o

# ---------------------------------------------------------------- wheel arches
FX, RX = 1.22, -1.23
WR = 0.345

def arches(body):
    cut = []
    for (x, r) in ((FX, 0.378), (RX, 0.386)):
        for s in (1, -1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=r, depth=0.62, location=(x, s * 0.96, WR + 0.005), rotation=(math.pi / 2, 0, 0))
            c = bpy.context.active_object
            c.data.materials.append(M['well'])
            cut.append(c)
    cj = join(cut, 'cutter')
    md = body.modifiers.new('arch', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.object = cj
    md.solver = 'EXACT'
    md.material_mode = 'TRANSFER'
    apply_mods(body)
    bpy.data.objects.remove(cj)

def split_glass(body):
    active(body)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    body.active_material_index = 1
    bpy.ops.object.material_slot_select()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    g = [o for o in bpy.context.selected_objects if o != body][0]
    g.name = 'glass'
    return g

# ---------------------------------------------------------------- surface projection (decals)
class Surf:
    def __init__(self, o):
        self.bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())

    def hit(self, origin, d):
        loc, nor, _, _ = self.bvh.ray_cast(Vector(origin), Vector(d).normalized(), 10)
        return (loc, nor) if loc else (None, None)

    def patch(self, name, plane, d, nu, nv, off, m, mask=None, thick=0.0):
        """plane(u,v)->origin of a ray along d; a quad grid of hits lifted by off along the normal (+ an optional
        extruded rim of `thick` back toward the body so it reads as a part, not a sticker)."""
        P = {}
        for i in range(nu + 1):
            for j in range(nv + 1):
                u, v = i / nu, j / nv
                if mask and not mask(u, v):
                    continue
                loc, nor = self.hit(plane(u, v), d)
                if loc is None:
                    continue
                P[(i, j)] = (loc + nor * (off(u, v) if callable(off) else off), nor)
        verts, faces, idx = [], [], {}
        for k, (p, _) in P.items():
            idx[k] = len(verts)
            verts.append(p)
        for i in range(nu):
            for j in range(nv):
                q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                if all(k in idx for k in q):
                    faces.append(tuple(idx[k] for k in q))
        if not faces:
            return None
        o = mesh_obj(name, verts, faces, [m])
        active(o)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        if thick:
            md = o.modifiers.new('sol', 'SOLIDIFY')
            md.thickness = thick
            md.offset = -1
            apply_mods(o)
        smooth(o, 50)
        return o

def rrect(rx=0.5, ry=0.5, r=0.25):
    def f(u, v):
        x, y = abs(u - 0.5) * 2, abs(v - 0.5) * 2
        if x <= 1 - r or y <= 1 - r:
            return x <= 1.0001 and y <= 1.0001
        return (x - (1 - r)) ** 2 + (y - (1 - r)) ** 2 <= r * r + 1e-6
    return f

def details(body):
    s = Surf(body)
    parts = []
    # full-width rear light bar, with a smoked band around it
    parts.append(s.patch('tailbar', lambda u, v: (-3, -0.76 + 1.52 * u, 0.785 + 0.028 * v), (1, 0, 0), 64, 2, 0.006, M['tail']))
    parts.append(s.patch('tailband', lambda u, v: (-3, -0.80 + 1.60 * u, 0.765 + 0.068 * v), (1, 0, 0), 64, 3, 0.003, M['smoke']))
    # door shut lines and handles
    for sg in (1, -1):
        for x0 in (0.60, -0.64):
            parts.append(s.patch('gap', lambda u, v, x0=x0, sg=sg: (x0 + 0.006 * u, sg * 2, 0.24 + 0.62 * v), (0, -sg, 0), 1, 24, 0.0015, M['trim']))
        parts.append(s.patch('gapb', lambda u, v, sg=sg: (0.60 - 1.24 * u, sg * 2, 0.235 + 0.006 * v), (0, -sg, 0), 24, 1, 0.0015, M['trim']))
        parts.append(s.patch('handle', lambda u, v, sg=sg: (-0.36 - 0.17 * u, sg * 2, 0.775 + 0.03 * v), (0, -sg, 0), 24, 6, 0.006, M['alu'], rrect(r=0.9), thick=0.004))
        parts.append(s.patch('rocker', lambda u, v, sg=sg: (0.86 - 1.72 * u, sg * 2, 0.165 + 0.10 * v), (0, -sg, 0), 60, 6, 0.003, M['trim']))
        # side intake ahead of the rear wheel (the haunch vent)
        parts.append(s.patch('sideint', lambda u, v, sg=sg: (-0.78 - 0.14 * u, sg * 2, 0.30 + 0.12 * v), (0, -sg, 0), 14, 14, 0.002, M['trim'], rrect(r=0.7)))
    # front: centre intake, two side intakes with a blade, number-plate recess left blank
    parts.append(s.patch('intake_c', lambda u, v: (3, -0.36 + 0.72 * u, 0.24 + 0.10 * v), (-1, 0, 0), 48, 10, 0.002, M['trim'], rrect(r=0.6)))
    for sg in (1, -1):
        parts.append(s.patch('intake_s', lambda u, v, sg=sg: (3, sg * (0.44 + 0.26 * u), 0.22 + 0.19 * v), (-1, 0, 0), 26, 20, 0.002, M['trim'], rrect(r=0.5)))
        parts.append(s.patch('blade', lambda u, v, sg=sg: (3, sg * (0.45 + 0.24 * u), 0.305 + 0.012 * v), (-1, 0, 0), 10, 1, 0.012, M['black']))
        # thin LED indicator strip above the side intake
        parts.append(s.patch('ind', lambda u, v, sg=sg: (3, sg * (0.47 + 0.22 * u), 0.445 + 0.012 * v), (-1, 0, 0), 10, 1, 0.003, M['drl']))
    # engine-lid louvres
    parts.append(s.patch('grille', lambda u, v: (-1.62 - 0.42 * u, -0.36 + 0.72 * v, 3), (0, 0, -1), 22, 28, 0.002, M['trim'], rrect(r=0.3)))
    for k in range(9):
        y = -0.33 + k * 0.0825
        parts.append(s.patch('slat', lambda u, v, y=y: (-1.64 - 0.38 * u, y + 0.03 * v, 3), (0, 0, -1), 10, 1, 0.012, M['black']))
    # rear diffuser band and exhaust tips
    parts.append(s.patch('diff', lambda u, v: (-3, -0.70 + 1.40 * u, 0.30 + 0.10 * v), (1, 0, 0), 24, 3, 0.002, M['trim']))
    return [p for p in parts if p]

# ---------------------------------------------------------------- lamps
def headlamp(body, sg):
    """911 lamps: a round lamp on the front slope of each fender, projected so it follows the surface (reads oval)."""
    surf = Surf(body)
    d = Vector((-0.78, 0, -0.62)).normalized()
    c0, _ = surf.hit(Vector((1.97, sg * 0.645, 0.76)) - d * 1.5, d)
    U = Vector((0, 1, 0))
    V = d.cross(U).normalized()
    R = 0.105
    def pl(u, v, r=R):
        return c0 + U * ((u - 0.5) * 2 * r) + V * ((v - 0.5) * 2 * r) - d * 1.5
    def ring(a, b):
        return lambda u, v: a * a <= ((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2 <= b * b
    def disc(b):
        return lambda u, v: ((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2 <= b * b
    rr = lambda u, v: ((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2
    parts = [
        surf.patch('lampring', pl, d, 40, 40, 0.006, M['chrome'], ring(0.86, 1.0)),
        surf.patch('lampbase', pl, d, 24, 24, 0.004, M['smoke'], disc(0.88)),
        surf.patch('lens', pl, d, 24, 24, lambda u, v: 0.008 + 0.012 * (1 - rr(u, v)), M['lens'], disc(0.9)),
        surf.patch('proj', lambda u, v: pl(u, v, 0.034), d, 16, 16, 0.009, M['head'], disc(1.0)),
        surf.patch('projr', lambda u, v: pl(u, v, 0.048), d, 24, 24, 0.0085, M['chrome'], ring(0.7, 1.0)),
    ]
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        cx, cy = math.cos(a) * 0.068, math.sin(a) * 0.068
        tx, ty = -math.sin(a), math.cos(a)
        parts.append(surf.patch('drl', lambda u, v, cx=cx, cy=cy, tx=tx, ty=ty: c0 + U * (cx + tx * (u - 0.5) * 0.034 + cx / 0.068 * (v - 0.5) * 0.008) + V * (cy + ty * (u - 0.5) * 0.034 + cy / 0.068 * (v - 0.5) * 0.008) - d * 1.5, d, 6, 1, 0.0095, M['drl']))
    o = join([p for p in parts if p], f'headlamp{sg}')
    return o

def exhausts():
    parts = []
    for y in (-0.11, 0.11):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.045, depth=0.12, location=(-2.29, y, 0.29), rotation=(0, math.pi / 2, 0))
        c = bpy.context.active_object
        c.scale = (1, 1.35, 1)
        c.data.materials.append(M['chrome'])
        md = c.modifiers.new('s', 'SOLIDIFY')
        md.thickness = 0.006
        parts.append(c)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.04, depth=0.01, location=(-2.27, y, 0.29), rotation=(0, math.pi / 2, 0))
        d = bpy.context.active_object
        d.scale = (1, 1.35, 1)
        d.data.materials.append(M['well'])
        parts.append(d)
    for p in parts:
        apply_mods(p)
    o = join(parts, 'exhaust')
    smooth(o, 40)
    return o

def mirrors():
    parts = []
    for sg in (1, -1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=1, location=(0, 0, 0))
        h = bpy.context.active_object
        h.scale = (0.07, 0.105, 0.05)
        active(h)
        bpy.ops.object.transform_apply(scale=True)
        for v in h.data.vertices:
            if v.co.x < 0:
                v.co.x *= 0.25  # flat back where the glass sits
            v.co.z += 0.012 * (v.co.y * sg / 0.105) ** 2 * 0  # keep it simple
        h.data.materials.append(M['paint'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1, depth=0.006, location=(-0.016, 0, 0), rotation=(0, math.pi / 2, 0))
        g = bpy.context.active_object
        g.scale = (0.044, 0.096, 1)
        active(g)
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        g.data.materials.append(M['mirror'])
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0.03, -sg * 0.07, -0.035))
        st = bpy.context.active_object
        st.scale = (0.05, 0.07, 0.016)
        active(st)
        bpy.ops.object.transform_apply(scale=True)
        md = st.modifiers.new('b', 'BEVEL')
        md.width = 0.007
        md.segments = 3
        apply_mods(st)
        st.data.materials.append(M['black'])
        o = join([h, g, st], 'mirror')
        o.matrix_world = Matrix.Translation((0.50, sg * 0.985, 0.955)) @ Matrix.Rotation(sg * 0.10, 4, 'Z')
        active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        parts.append(o)
    o = join(parts, 'mirrors')
    smooth(o, 45)
    return o

# ---------------------------------------------------------------- wheels
def lathe(name, prof, segs, m, axis_y=True):
    """revolve (r, y) profile points (closed loop) about the Y axis"""
    verts, faces = [], []
    n = len(prof)
    for k in range(segs):
        a = 2 * math.pi * k / segs
        for (r, y) in prof:
            verts.append((r * math.cos(a), y, r * math.sin(a)))
    for k in range(segs):
        k2 = (k + 1) % segs
        for i in range(n - 1):
            faces.append((k * n + i, k * n + i + 1, k2 * n + i + 1, k2 * n + i))
    o = mesh_obj(name, verts, faces, [m])
    active(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=1e-5)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o

def wheel(name, width, r=WR):
    hw = width / 2
    rr = 0.254  # 20-inch rim
    tyre = lathe('tyre', [(rr - 0.005, -hw + 0.01), (rr + 0.03, -hw - 0.004), (r - 0.03, -hw + 0.004), (r - 0.006, -hw + 0.02), (r, -hw + 0.05), (r, hw - 0.05), (r - 0.006, hw - 0.02), (r - 0.03, hw - 0.004), (rr + 0.03, hw + 0.004), (rr - 0.005, hw - 0.01)], 64, M['tyre'])
    # rim barrel with a lip
    barrel = lathe('barrel', [(rr - 0.012, -hw + 0.012), (rr - 0.004, -hw + 0.004), (rr + 0.006, -hw + 0.004), (rr - 0.02, -hw + 0.02), (rr - 0.024, hw - 0.03), (rr + 0.004, hw - 0.006), (rr + 0.008, hw), (rr - 0.004, hw + 0.004), (rr - 0.014, hw - 0.012)], 64, M['rim'])
    parts = [tyre, barrel]
    face = hw - 0.025
    # five twin spokes, dished
    for k in range(5):
        for off in (-0.13, 0.13):
            a = 2 * math.pi * k / 5 + off
            bpy.ops.mesh.primitive_cube_add(size=1)
            sp = bpy.context.active_object
            sp.scale = (0.17, 0.028, 0.02)
            active(sp)
            bpy.ops.object.transform_apply(scale=True)
            md = sp.modifiers.new('b', 'BEVEL')
            md.width = 0.006
            md.segments = 2
            apply_mods(sp)
            for v in sp.data.vertices:
                t = min(1, max(0, (v.co.x + 0.085) / 0.17))
                v.co.y += -0.035 * t  # dish
                v.co.z *= 1.15 - 0.45 * t  # taper
                v.co.x += 0.155
            sp.matrix_world = Matrix.Rotation(-a, 4, 'Y') @ Matrix.Translation((0, face - 0.005, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'X').inverted() @ Matrix.Rotation(math.pi / 2, 4, 'X')
            active(sp)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            sp.data.materials.append(M['rim'])
            parts.append(sp)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.075, depth=0.05, location=(0, face, 0), rotation=(math.pi / 2, 0, 0))
    hub = bpy.context.active_object
    md = hub.modifiers.new('b', 'BEVEL')
    md.width = 0.012
    md.segments = 3
    apply_mods(hub)
    hub.data.materials.append(M['rim'])
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.032, depth=0.012, location=(0, face + 0.025, 0), rotation=(math.pi / 2, 0, 0))
    cap = bpy.context.active_object
    cap.data.materials.append(M['black'])
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.19, depth=0.03, location=(0, -0.02, 0), rotation=(math.pi / 2, 0, 0))
    disc = bpy.context.active_object
    disc.data.materials.append(M['disc'])
    # the barrel's inner face, so the wheel never looks hollow
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=rr - 0.02, depth=0.01, location=(0, -hw + 0.03, 0), rotation=(math.pi / 2, 0, 0))
    back = bpy.context.active_object
    back.data.materials.append(M['well'])
    parts += [hub, cap, disc, back]
    o = join(parts, name)
    smooth(o, 35)
    return o

def calipers():
    parts = []
    for (x, wd) in ((FX, 0.245), (RX, 0.295)):
        for sg in (1, -1):
            yc = sg * (0.79 if x > 0 else 0.80)
            bpy.ops.mesh.primitive_cube_add(size=1)
            c = bpy.context.active_object
            c.scale = (0.15, 0.05, 0.06)
            active(c)
            bpy.ops.object.transform_apply(scale=True)
            md = c.modifiers.new('b', 'BEVEL')
            md.width = 0.018
            md.segments = 3
            apply_mods(c)
            # wrap it on the disc edge, behind the axle and above it
            a = math.radians(-35 if x > 0 else 215)
            c.matrix_world = Matrix.Translation((x, yc - sg * 0.0, WR)) @ Matrix.Rotation(-a, 4, 'Y') @ Matrix.Translation((0.165, -sg * 0.0 + sg * (wd / 2 - 0.1), 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
            active(c)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            c.data.materials.append(M['caliper'])
            parts.append(c)
    o = join(parts, 'calipers')
    smooth(o, 40)
    return o

# ---------------------------------------------------------------- interior
EYE = Vector((-0.42, 0.37, 1.06))

def rbox(name, size, loc, m, bev=0.02, segs=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bev:
        md = o.modifiers.new('b', 'BEVEL')
        md.width = bev
        md.segments = segs
        md.limit_method = 'ANGLE'
        apply_mods(o)
    o.data.materials.append(m)
    smooth(o, 40)
    return o

def extrude_profile(name, prof, y0, y1, m, bev=0.015):
    """a side profile in (x, z), extruded across y"""
    n = len(prof)
    verts = [(x, y0, z) for (x, z) in prof] + [(x, y1, z) for (x, z) in prof]
    faces = [tuple(range(n))[::-1], tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    o = mesh_obj(name, verts, faces, [m])
    active(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    if bev:
        md = o.modifiers.new('b', 'BEVEL')
        md.width = bev
        md.segments = 3
        md.limit_method = 'ANGLE'
        apply_mods(o)
    smooth(o, 40)
    return o

DIALS = [(0.205, 0.042, 'oil', 2), (0.112, 0.05, 'speed', 1), (0.0, 0.058, 'tach', 0), (-0.112, 0.05, 'power', 3), (-0.205, 0.042, 'fuel', 4)]
DIAL_N = Vector((-math.cos(math.radians(16)), 0, math.sin(math.radians(16))))  # facing the driver
DIAL_C = Vector((0.47, 0.37, 0.818))
_up = (Vector((0, 0, 1)) - DIAL_N * DIAL_N.z).normalized()
DIAL_B = Matrix((_up.cross(DIAL_N), _up, DIAL_N)).transposed().to_4x4()  # columns: right, up, normal
SWEEP = (-135, 135)

def dial_face(name, c, r, cell):
    col, row = cell % 3, cell // 3
    u0, v0 = col / 3, 1 - (row + 1) / 2
    verts, uvs, faces = [(0, 0, 0)], [(u0 + 1 / 6, v0 + 0.25)], []
    n = 48
    for k in range(n):
        a = 2 * math.pi * k / n
        verts.append((math.cos(a) * r, math.sin(a) * r, 0))
        uvs.append((u0 + (math.cos(a) + 1) / 6, v0 + (math.sin(a) + 1) / 4))
    for k in range(n):
        faces.append((0, 1 + k, 1 + (k + 1) % n))
    o = mesh_obj(name, verts, faces, [M['gauge']])
    uv = o.data.uv_layers.new(name='UVMap')
    for poly in o.data.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            uv.data[li].uv = uvs[vi]
    o.matrix_world = Matrix.Translation(c) @ DIAL_B
    return o

def interior():
    parts = []
    # dashboard: dark top, leather face; the driver's bay is recessed for the cluster
    dash = [(0.80, 0.885), (0.62, 0.885), (0.47, 0.875), (0.40, 0.855), (0.37, 0.80), (0.38, 0.62), (0.46, 0.45), (0.80, 0.40)]
    bay = [(0.80, 0.885), (0.62, 0.885), (0.56, 0.88), (0.53, 0.84), (0.52, 0.74), (0.40, 0.66), (0.38, 0.62), (0.46, 0.45), (0.80, 0.40)]
    parts.append(extrude_profile('dashR', dash, -0.76, 0.075, M['black'], bev=0.02))
    parts.append(extrude_profile('dashL', dash, 0.665, 0.76, M['black'], bev=0.02))
    parts.append(extrude_profile('bay', bay, 0.07, 0.67, M['black'], bev=0.015))
    parts.append(extrude_profile('dashlo', [(0.375, 0.79), (0.37, 0.70), (0.385, 0.60), (0.46, 0.44), (0.47, 0.45), (0.40, 0.61), (0.39, 0.70), (0.395, 0.79)], -0.74, 0.075, M['leather'], bev=0.004))
    # cluster hood: a cowl that overhangs the five dials
    parts.append(extrude_profile('binnacle', [(0.375, 0.912), (0.42, 0.936), (0.50, 0.946), (0.60, 0.93), (0.60, 0.88), (0.50, 0.915), (0.42, 0.905), (0.38, 0.898)], 0.37 - 0.29, 0.37 + 0.29, M['black'], bev=0.012))
    for sy in (0.37 - 0.29, 0.37 + 0.29):
        parts.append(extrude_profile('cheek', [(0.38, 0.90), (0.60, 0.93), (0.60, 0.70), (0.46, 0.70)], sy - 0.012, sy + 0.012, M['black'], bev=0.006))
    parts.append(rbox('dialback', (0.04, 0.58, 0.20), (0.495, 0.37, 0.80), M['black'], bev=0.01, rot=(0, math.radians(16), 0)))
    # centre screen (the route map at runtime) and the vents either side
    sc_c = Vector((0.40, 0.0, 0.715))
    parts.append(rbox('screenbez', (0.03, 0.30, 0.14), tuple(sc_c + Vector((0.012, 0, 0))), M['black'], bev=0.008, rot=(0, math.radians(12), 0)))
    scr = rbox('screen', (0.004, 0.27, 0.115), tuple(sc_c - Vector((0.004, 0, 0))), M['glass'], bev=0.0, rot=(0, math.radians(12), 0))
    scr.name = 'screen'
    scr_uv(scr)
    # dials: bezel, face (gauge atlas), the two moving needles are separate objects
    faces, dl = [], []
    for (dy, r, key, cell) in DIALS:
        c = DIAL_C + Vector((0, dy, 0)) + DIAL_N * (0.0 if key == 'tach' else -0.006)
        bpy.ops.mesh.primitive_torus_add(major_radius=r + 0.004, minor_radius=0.0045, major_segments=48, minor_segments=8)
        t = bpy.context.active_object
        t.matrix_world = Matrix.Translation(c) @ DIAL_B
        t.data.materials.append(M['alu'])
        parts.append(t)
        f = dial_face(f'dial_{key}', c - DIAL_N * 0.002, r, cell)
        dl.append(f)
        faces.append((c, key, r))
    # steering wheel (its own pivot), column, stalks
    sw = steering_wheel()
    # centre console, shifter, seats, door cards, floor, mirror
    parts.append(rbox('console', (0.80, 0.22, 0.30), (-0.05, 0, 0.38), M['black'], bev=0.04))
    parts.append(extrude_profile('tunnel', [(0.40, 0.62), (0.20, 0.50), (-0.45, 0.48), (-0.45, 0.24), (0.40, 0.24)], -0.11, 0.11, M['black'], bev=0.03))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.028, location=(-0.02, 0, 0.62))
    knob = bpy.context.active_object
    knob.scale = (1, 1, 1.3)
    knob.data.materials.append(M['alu'])
    parts.append(knob)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.009, depth=0.12, location=(-0.02, 0, 0.56))
    stk = bpy.context.active_object
    stk.data.materials.append(M['black'])
    parts.append(stk)
    for sy in (0.37, -0.37):
        parts += seat(sy)
    for sg in (1, -1):
        parts.append(rbox('door', (1.10, 0.07, 0.56), (-0.06, sg * 0.80, 0.58), M['leather'], bev=0.03))
        parts.append(rbox('doortop', (1.10, 0.11, 0.05), (-0.06, sg * 0.80, 0.865), M['black'], bev=0.02))
        parts.append(rbox('arm', (0.40, 0.08, 0.05), (-0.25, sg * 0.75, 0.68), M['black'], bev=0.02))
    parts.append(rbox('floor', (2.0, 1.5, 0.04), (-0.15, 0, 0.22), M['carpet'], bev=0.0))
    parts.append(rbox('shelf', (0.45, 1.5, 0.30), (-1.15, 0, 0.62), M['black'], bev=0.04))
    parts.append(rbox('rmirror', (0.02, 0.24, 0.06), (0.03, 0, 1.19), M['black'], bev=0.012))
    parts.append(rbox('rmglass', (0.004, 0.22, 0.045), (0.018, 0, 1.19), M['mirror'], bev=0.0))
    parts.append(rbox('rmstem', (0.04, 0.02, 0.06), (0.06, 0, 1.23), M['black'], bev=0.006))
    for vy in (-0.2, 0.2):
        parts.append(rbox('vent', (0.014, 0.07, 0.05), (0.37, vy, 0.745), M['trim'], bev=0.006))
    for p in parts:
        if p.type == 'MESH' and not p.data.materials:
            p.data.materials.append(M['black'])
    o = join(parts, 'interior')
    smooth(o, 40)
    dials = join(dl, 'dials')
    return o, sw, faces, dials, scr

def scr_uv(o):
    """0..1 UVs across the screen face (for the route map canvas at runtime)"""
    uv = o.data.uv_layers.new(name='UVMap')
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    y0, y1, z0, z1 = min(ys), max(ys), min(zs), max(zs)
    for poly in o.data.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            v = o.data.vertices[vi].co
            uv.data[li].uv = ((y1 - v.y) / (y1 - y0), (v.z - z0) / (z1 - z0))

def seat(sy):
    p = []
    p.append(rbox('cush', (0.50, 0.40, 0.11), (-0.42, sy, 0.33), M['leather'], bev=0.04, rot=(0, math.radians(-6), 0)))
    for s in (1, -1):
        p.append(rbox('bol', (0.48, 0.07, 0.15), (-0.42, sy + s * 0.19, 0.36), M['leather'], bev=0.03, rot=(0, math.radians(-6), 0)))
    back = rbox('back', (0.12, 0.44, 0.62), (-0.74, sy, 0.68), M['leather'], bev=0.05, rot=(0, math.radians(-16), 0))
    p.append(back)
    for s in (1, -1):
        p.append(rbox('wing', (0.14, 0.07, 0.48), (-0.70, sy + s * 0.21, 0.62), M['leather'], bev=0.03, rot=(0, math.radians(-16), 0)))
    p.append(rbox('head', (0.10, 0.26, 0.20), (-0.86, sy, 1.06), M['leather'], bev=0.05, rot=(0, math.radians(-16), 0)))
    return p

SW_C = Vector((0.06, 0.37, 0.715))
SW_TILT = math.radians(24)  # wheel plane leans back from vertical

def steering_wheel():
    parts = []
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.017, major_segments=64, minor_segments=12, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
    rim = bpy.context.active_object
    rim.data.materials.append(M['black'])
    parts.append(rim)
    for a in (0, math.pi, -math.pi / 2):
        bpy.ops.mesh.primitive_cube_add(size=1)
        sp = bpy.context.active_object
        sp.scale = (0.025, 0.15, 0.045 if a != -math.pi / 2 else 0.05)
        active(sp)
        bpy.ops.object.transform_apply(scale=True)
        md = sp.modifiers.new('b', 'BEVEL')
        md.width = 0.01
        md.segments = 3
        apply_mods(sp)
        sp.matrix_world = Matrix.Rotation(a, 4, 'X') @ Matrix.Translation((0.01, 0.1, 0))
        active(sp)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        sp.data.materials.append(M['black'] if a != -math.pi / 2 else M['alu'])
        parts.append(sp)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.068, depth=0.06, location=(0.02, 0, 0), rotation=(0, math.pi / 2, 0))
    hub = bpy.context.active_object
    hub.scale = (1, 1.15, 0.95)
    active(hub)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    md = hub.modifiers.new('b', 'BEVEL')
    md.width = 0.02
    md.segments = 4
    apply_mods(hub)
    hub.data.materials.append(M['black'])
    parts.append(hub)
    # a top-dead-centre marker so the rotation reads
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.18))
    tdc = bpy.context.active_object
    tdc.scale = (0.03, 0.012, 0.02)
    tdc.data.materials.append(M['caliper'])
    parts.append(tdc)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.03, depth=0.4, location=(0.22, 0, 0), rotation=(0, math.pi / 2, 0))
    col = bpy.context.active_object
    col.data.materials.append(M['black'])
    parts.append(col)
    o = join(parts, 'wheel_steer')
    for p in [o]:
        active(p)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    smooth(o, 35)
    # local +X is the column axis (toward the dash); lean it so the wheel faces the driver
    o.matrix_world = Matrix.Translation(SW_C) @ Matrix.Rotation(SW_TILT, 4, 'Y')
    return o

LOOK = {'tach': 3.4 / 9, 'speed': 96 / 320}

def needles(faces):
    """needles point at 12 o'clock in their own frame (local +Y), pivot at the dial centre, turn about local +Z"""
    out = []
    for (c, key, r) in faces:
        if key not in ('tach', 'speed'):
            continue
        verts = [(-0.004, -0.18 * r, 0), (0.004, -0.18 * r, 0), (0.0015, 0.86 * r, 0), (-0.0015, 0.86 * r, 0)]
        n = mesh_obj(f'needle_{key}', verts, [(0, 1, 2, 3)], [M['needle']])
        md = n.modifiers.new('s', 'SOLIDIFY')
        md.thickness = 0.0015
        apply_mods(n)
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.008, depth=0.004, location=(0, 0, 0.002))
        cap = bpy.context.active_object
        cap.data.materials.append(M['black'])
        n = join([n, cap], f'needle_{key}')
        n.matrix_world = Matrix.Translation(c + DIAL_N * 0.004) @ DIAL_B
        out.append(n)
    return out

def pose_needles(nd, on=True):
    for n in nd:
        key = n.name.split('_')[1]
        ang = SWEEP[0] + (SWEEP[1] - SWEEP[0]) * (LOOK[key] if on else 0)
        c = n.matrix_world.translation.copy()
        n.matrix_world = Matrix.Translation(c) @ DIAL_B @ Matrix.Rotation(math.radians(-ang), 4, 'Z')

# ---------------------------------------------------------------- build
body = build_body()
arches(body)
glass = split_glass(body)
smooth(body, 60)
smooth(glass, 60)
det = details(body)
hl = [headlamp(body, 1), headlamp(body, -1)]
ex = exhausts()
mi = mirrors()
cal = calipers()
wheels = {}
for nm, x, sg, w in (('wheel_fl', FX, 1, 0.245), ('wheel_fr', FX, -1, 0.245), ('wheel_rl', RX, 1, 0.295), ('wheel_rr', RX, -1, 0.295)):
    o = wheel(nm, w)
    yc = (0.79 if x > 0 else 0.80) * sg
    if sg < 0:
        o.matrix_world = Matrix.Rotation(math.pi, 4, 'Z')
        active(o)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    o.location = (x, yc, WR)
    wheels[nm] = o
inter, sw, dial_faces, dials, screen = interior()
nd = needles(dial_faces)
if MODE == 'lookdev':
    pose_needles(nd)

# shell: paint body + details + lamps + mirrors + calipers joined into one node (pivot at ground centre)
shell = join([body] + det + hl + [ex, mi, cal], 'shell')

def lookdev_scene():
    w = bpy.data.worlds.new('dusk')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    # Generated on the world is the view direction
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    el = ramp.color_ramp.elements
    el[0].position = 0.0
    el[0].color = (*hexcol('#07080c'), 1)
    el[1].position = 1.0
    el[1].color = (*hexcol('#0a0f2a'), 1)
    for p, c in ((0.49, '#0d0f16'), (0.505, '#e07a5a'), (0.53, '#b85a78'), (0.6, '#3a2d63'), (0.75, '#141a40')):
        e = el.new(p)
        e.color = (*hexcol(c), 1)
    mp = nt.nodes.new('ShaderNodeMapRange')
    mp.inputs['From Min'].default_value = -1
    mp.inputs['From Max'].default_value = 1
    nt.links.new(sep.outputs['Z'], mp.inputs['Value'])
    nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.6
    # ground: wet-ish asphalt disc
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=40, fill_type='NGON', location=(0, 0, 0))
    g = bpy.context.active_object
    g.data.materials.append(pmat('asphalt', '#15161a', rough=0.45))
    # lights: cool sky key above, warm low rim from the sunset side, a small fill
    def area(loc, rot, e, col, size):
        d = bpy.data.lights.new('a', 'AREA')
        d.energy = e
        d.color = hexcol(col)
        d.size = size
        o = bpy.data.objects.new('a', d)
        o.location = loc
        o.rotation_euler = rot
        sc.collection.objects.link(o)
    area((0, 0, 6), (0, 0, 0), 900, '#9fb4ff', 6)
    area((-7, 5, 1.6), (math.radians(80), 0, math.radians(-125)), 1400, '#ff9a6a', 4)
    area((6, -5, 2), (math.radians(70), 0, math.radians(50)), 300, '#c9a8ff', 4)
    area((-0.1, 0.0, 1.15), (0, 0, 0), 6, '#ffd2b0', 0.6)

def cam(name, loc, look, lens=35, fov=None):
    d = bpy.data.cameras.new(name)
    if fov:
        d.lens_unit = 'FOV'
        d.angle = math.radians(fov)
        d.sensor_fit = 'HORIZONTAL'
    else:
        d.lens = lens
    d.clip_start = 0.02
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    o.location = loc
    dvec = Vector(look) - Vector(loc)
    o.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
    return o

def render(o, path, spp=96, res=(1440, 900)):
    sc.camera = o
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = spp
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy'
    sc.render.filepath = path
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)

if MODE == 'lookdev':
    lookdev_scene()
    D = os.environ.get('OUTDIR', WORK)
    shots = os.environ.get('SHOTS', 'f3q,r3q,side,fp,chase').split(',')
    if 'f3q' in shots:
        render(cam('f3q', (5.0, 3.6, 1.25), (0, 0, 0.55), lens=40), os.path.join(D, 'car-front34.png'))
    if 'r3q' in shots:
        render(cam('r3q', (-5.0, 3.4, 1.55), (0, 0, 0.6), lens=40), os.path.join(D, 'car-rear34.png'))
    if 'side' in shots:
        render(cam('side', (0, 8.5, 0.75), (0, 0, 0.62), lens=50), os.path.join(D, 'car-side.png'))
    if 'fp' in shots:
        render(cam('fp', tuple(EYE), tuple(EYE + Vector((1, 0, -0.1))), fov=72), os.path.join(D, 'car-fp.png'))
    if 'chase' in shots:
        render(cam('chase', (-7.2, 0, 2.5), (2.5, 0, 0.7), lens=32), os.path.join(D, 'car-chase.png'))
    if 'cluster' in shots:
        render(cam('cl', (0.26, 0.37, 0.88), tuple(DIAL_C), fov=70), os.path.join(D, 'car-cluster.png'), spp=48)
    if 'top' in shots:
        render(cam('top', (0, 0, 9), (0, 0, 0), lens=35), os.path.join(D, 'car-top.png'))
    if 'low' in shots:
        render(cam('low', (4.6, -2.4, 0.55), (0, 0, 0.6), lens=32), os.path.join(D, 'car-low.png'))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'car.blend'))

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

if MODE == 'stats':
    for o in sc.objects:
        if o.type == 'MESH':
            print('TRIS', o.name, tris(o))

if MODE == 'bake':
    # AO for the shell and the cabin into one 1024 atlas, with a ground plane so the sills and floor darken
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    ground = bpy.context.active_object
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = 0.7
    lib.uv_smart([shell, inter], margin=0.004)
    glass.hide_render = True
    img = bpy.data.images.new('car_ao', 1024, 1024)
    lib.bake([shell, inter], img, kind='AO', samples=int(os.environ.get('SPP', 96)), margin=6)
    img.filepath_raw = os.path.join(WORK, 'car_ao.png')
    img.file_format = 'PNG'
    img.save()
    bpy.data.objects.remove(ground)
    glass.hide_render = False
    for m in bpy.data.materials:
        if m.node_tree and 'BAKE' in m.node_tree.nodes:
            m.node_tree.nodes.remove(m.node_tree.nodes['BAKE'])
    pose_needles(nd, on=False)
    keep = [shell, inter, glass, dials, screen, sw] + nd + list(wheels.values())
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep:
        o.select_set(True)
    bpy.context.view_layer.objects.active = shell
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, 'car.glb'), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT', export_image_format='WEBP', export_extras=False)
    print('EXPORTED', [o.name for o in keep])
