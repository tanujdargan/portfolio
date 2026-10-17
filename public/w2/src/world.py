# W2 Playground: the island. Blender 5.0.1 headless:
#   Blender -b --python public/w2/src/world.py -- [lookdev|bake]
# Builds a small night island (terrain + six stations + scenery), renders look-dev stills, and bakes Cycles lighting
# into two atlases (terrain, props) plus an irradiance lightmap used to tint moving things at runtime.
# Coordinates: Blender Z-up metres. three.js gets (x, z, -y).
import bpy, bmesh, math, random, json, os, sys
import numpy as np
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import box, cyl, ico, torus, join, place, group, mat, point_light, spot_light, hexcol

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
WORK = '/tmp/w2-blender'
os.makedirs(WORK, exist_ok=True)
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'lookdev'
random.seed(11)
np.random.seed(11)

lib.reset()
lib.gpu()
sc = bpy.context.scene

# ---------------------------------------------------------------- layout
ST = {
    'board': (-5.4, -2.2),
    'pad': (-7.0, 15.0),
    'dock': (12.6, 8.2),
    'model': (12.0, -10.0),
    'log': (-2.0, -15.4),
    'pier': (-27.5, -3.0),
}
PLAZA_R = 4.6
WATER = 0.0
COLLIDERS = []  # ('c', x, y, r) | ('b', x, y, hx, hy, rot)
LIGHTS = []     # (x, y, z, hex, size)  -> runtime glow sprites
DYN = []        # (kind, x, y, z, rz)
PHYS_RAISE = [] # ('disc', x, y, r, h) | ('rect', x0, y0, x1, y1, h)

def R(th):
    return 26 + 2.4 * np.sin(3 * th + 0.5) + 1.4 * np.sin(5 * th + 2.1) + 0.7 * np.sin(9 * th + 1.0)

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def bez(a, c, b, n=24):
    a, b, c = np.array(a), np.array(b), np.array(c)
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b

def spoke(to, bend):
    p = np.array(to, float)
    d = np.linalg.norm(p)
    u = p / d
    a = u * (PLAZA_R - 0.5)
    mid = (a + p) / 2 + np.array([-u[1], u[0]]) * bend
    return bez(a, mid, p)

PATHS = [
    (spoke(ST['pad'], 2.0), 1.35),
    (spoke(ST['dock'], -1.6), 1.35),
    (spoke(ST['model'], 1.8), 1.35),
    (spoke(ST['log'], -1.4), 1.35),
    (spoke((-18.5, -3.0), 1.2), 1.35),
]
# outer loop (catmull-rom through the stations)
loop_pts = np.array([ST['pad'], (4.0, 19.0), ST['dock'], (19.0, -1.0), ST['model'], (6.0, -18.5), ST['log'], (-14.0, -13.0), (-21.0, -3.0), (-18.0, 8.0)])
def catmull(P, n=14):
    out = []
    N = len(P)
    for i in range(N):
        p0, p1, p2, p3 = P[(i - 1) % N], P[i], P[(i + 1) % N], P[(i + 2) % N]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(out[0])
    return np.array(out)
PATHS.append((catmull(loop_pts), 1.1))

MOUNDS = [(3.0, 22.0, 5.5, 1.5), (-17.0, 9.0, 4.5, 1.1), (-15.0, -16.0, 4.5, 1.3), (20.5, -8.0, 3.5, 0.9), (21.0, 2.0, 3.0, 0.7), (-9.0, 22.0, 3.0, 0.8)]

def path_dist(X, Y):
    D = np.full(X.shape, 1e9)
    for pts, w in PATHS:
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            ab = b - a
            L = max(ab @ ab, 1e-9)
            t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / L, 0, 1)
            dx, dy = X - (a[0] + t * ab[0]), Y - (a[1] + t * ab[1])
            D = np.minimum(D, np.sqrt(dx * dx + dy * dy) / w)
    return D  # in units of path half-width

def zone(X, Y):
    z = smooth(PLAZA_R + 2.5, PLAZA_R, np.hypot(X, Y))
    for k, (x, y) in ST.items():
        r = 3.6 if k != 'pier' else 0
        if r:
            z = np.maximum(z, smooth(r + 3, r, np.hypot(X - x, Y - y)))
    z = np.maximum(z, smooth(9, 6, np.hypot(X - 17.5, Y - 11.0)))  # warehouse yard
    return z

def nz(X, Y, f=0.11, seed=0):
    out = np.zeros(X.shape)
    for i in np.ndindex(X.shape):
        out[i] = noise.noise(Vector((X[i] * f, Y[i] * f, seed)))
    return out

def ground(X, Y, with_noise=True):
    r = np.hypot(X, Y)
    th = np.arctan2(Y, X)
    d = r - R(th)
    base = np.where(d < -5, 0.55, np.where(d < 0, 0.55 + (0.07 - 0.55) * smooth(-5, 0, d), 0.07 - 3.2 * smooth(0, 9, d)))
    inland = 1 - smooth(-7.5, -3.5, d)
    hills = np.zeros(X.shape)
    for (mx, my, mr, mh) in MOUNDS:
        q = np.hypot(X - mx, Y - my) / mr
        hills += mh * np.exp(-q * q * 1.6)
    if with_noise:
        hills += 0.28 * (nz(X, Y, 0.09, 1) + 0.5) + 0.08 * nz(X, Y, 0.35, 2)
    pd = path_dist(X, Y)
    flat = np.maximum(zone(X, Y), smooth(2.6, 1.0, pd))
    return base + hills * inland * (1 - flat), d, pd, flat

# ---------------------------------------------------------------- terrain albedo (painted texture, 2048 over [-40, 40])
def up(A, n):
    # bilinear upsample of a square field to n x n
    m = A.shape[0]
    t = np.linspace(0, m - 1, n)
    i0 = np.clip(np.floor(t).astype(int), 0, m - 2)
    f = (t - i0)[:, None]
    B = A[i0] * (1 - f) + A[i0 + 1] * f
    B = B[:, i0] * (1 - f.T) + B[:, i0 + 1] * f.T
    return B

def albedo_mat(S):
    NA = 2048
    lo = 384
    xs = np.linspace(-S, S, lo)
    Xl, Yl = np.meshgrid(xs, xs)
    th = np.arctan2(Yl, Xl)
    dl = np.hypot(Xl, Yl) - R(th)
    pdl = path_dist(Xl, Yl)
    n1l = nz(Xl, Yl, 0.22, 5) + 0.5
    n2l = nz(Xl, Yl, 0.8, 6) + 0.5
    d, pd, n1, n2 = (up(a, NA) for a in (dl, pdl, n1l, n2l))
    rng = np.random.default_rng(3)
    fine = rng.random((NA, NA)).astype(np.float32)
    fine = (fine + np.roll(fine, 1, 0) + np.roll(fine, 1, 1) + np.roll(fine, (1, 1), (0, 1))) / 4
    def C(h):
        return np.array(hexcol(h), np.float32)[None, None]
    grass = C('#35614c') * (1 - n1[..., None]) + C('#46775a') * n1[..., None]
    grass = grass * (0.86 + 0.28 * fine[..., None]) * (0.92 + 0.16 * n2[..., None])
    dirt = C('#a7908a') * (0.9 + 0.2 * fine[..., None]) * (0.95 + 0.1 * n2[..., None])
    rim = C('#7a6670')
    sand = C('#cbb69c') * (0.93 + 0.14 * fine[..., None])
    wet = C('#9d8a78')
    deep = C('#55666c')
    pm = smooth(1.0, 0.94, pd)[..., None]
    rm = (smooth(1.12, 1.0, pd) * (1 - smooth(1.0, 0.94, pd)))[..., None]
    col = grass * (1 - pm) + dirt * pm
    col = col * (1 - rm * 0.7) + rim * rm * 0.7
    sm = smooth(-4.6, -4.2, d)[..., None]
    col = col * (1 - sm) + sand * sm
    wm = smooth(-0.5, 0.5, d)[..., None]
    col = col * (1 - wm) + wet * wm
    dm = smooth(1.5, 7, d)[..., None]
    col = col * (1 - dm) + deep * dm
    # pebbles on the paths, tiny flowers in the grass
    def specks(count, rad, colour, mask):
        ys, xs_ = rng.integers(0, NA, count), rng.integers(0, NA, count)
        keep = mask[ys, xs_] > 0.5
        ys, xs_ = ys[keep], xs_[keep]
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if dx * dx + dy * dy <= rad * rad:
                    col[np.clip(ys + dy, 0, NA - 1), np.clip(xs_ + dx, 0, NA - 1)] = colour[0, 0]
    specks(9000, 2, C('#8d7c7a'), pm[..., 0])
    specks(5000, 1, C('#c4b3aa'), pm[..., 0])
    grassmask = (1 - pm[..., 0]) * (1 - sm[..., 0])
    specks(1600, 2, C('#f3eadb'), grassmask)
    specks(1100, 2, C('#f6c94a'), grassmask)
    specks(900, 2, C('#ef8fb4'), grassmask)
    img = bpy.data.images.new('albedo', NA, NA, alpha=False, float_buffer=True)
    px = np.concatenate([col.reshape(-1, 3), np.ones((NA * NA, 1), np.float32)], 1).astype(np.float32)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(WORK, 'albedo.exr')
    img.file_format = 'OPEN_EXR'
    img.save()
    bpy.data.images.remove(img)
    img = bpy.data.images.load(os.path.join(WORK, 'albedo.exr'))
    m = bpy.data.materials.new('terrain')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    t.interpolation = 'Linear'
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'bake'
    nt.links.new(uvn.outputs['UV'], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    b.inputs['Specular IOR Level'].default_value = 0.2
    return m

# ---------------------------------------------------------------- terrain mesh
def terrain():
    N, S = 200, 40.0
    xs = np.linspace(-S, S, N + 1)
    X, Y = np.meshgrid(xs, xs)
    Z, d, pd, flat = ground(X, Y)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    W = N + 1
    keep = (d < 9.5)
    faces = []
    for j in range(N):
        for i in range(N):
            a = j * W + i
            if keep[j, i] or keep[j, i + 1] or keep[j + 1, i] or keep[j + 1, i + 1]:
                faces.append((a, a + 1, a + W + 1, a + W))
    me = bpy.data.meshes.new('terrain')
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    uv = me.uv_layers.new(name='bake')
    loops = np.zeros(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', loops)
    uvs = ((verts[loops, :2] + S) / (2 * S)).astype(np.float32)
    uv.data.foreach_set('uv', uvs.ravel())
    o = bpy.data.objects.new('terrain', me)
    sc.collection.objects.link(o)
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(albedo_mat(S))
    # remove orphan verts
    lib.active(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_loose()
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')
    return o

def gz(x, y):
    """Ground height at a point (no noise variance issues: same function)."""
    Z, *_ = ground(np.array([[x]]), np.array([[y]]))
    return float(Z[0, 0])

# ---------------------------------------------------------------- palette
M = dict(
    wood=mat('wood', '#8f5f3e', var=0.12, scale=6),
    wood2=mat('wood2', '#a8744c', var=0.12, scale=6),
    dwood=mat('dwood', '#5b3b2a', var=0.1, scale=6),
    plank=mat('plank', '#b08463', var=0.14, scale=5),
    iron=mat('iron', '#3d3a52', var=0.05),
    ironl=mat('ironl', '#3d3a52', var=0.05, noshadow=True),
    glass=mat('glass', '#ffc277', emit='#ffb565', es=14, var=0),
    glassc=mat('glassc', '#d9f3ff', emit='#bfe8ff', es=18, var=0),
    red=mat('red', '#ff4d3a', emit='#ff3b2a', es=10, var=0),
    stone=mat('stone', '#b9b3a8', var=0.1, scale=3),
    grout=mat('grout', '#6f6964', var=0.06),
    stone2=mat('stone2', '#9a948c', var=0.12, scale=3),
    marble=mat('marble', '#e3ddd2', var=0.06, scale=1.5),
    concrete=mat('concrete', '#a9a8a2', var=0.12, scale=1.2),
    hazard=mat('hazard', '#f0b52a', var=0.06),
    black=mat('black', '#2a2830', var=0.04),
    white=mat('white', '#ece7dc', var=0.04),
    steel=mat('steel', '#c9ccd3', var=0.05, rough=0.6),
    gantry=mat('gantry', '#d4523d', var=0.06),
    panel=mat('panel', '#203a7a', var=0.05, rough=0.5),
    gold=mat('gold', '#d7a44a', var=0.08, rough=0.5),
    wall=mat('wall', '#6f8ea3', var=0.08, scale=2),
    roof=mat('roof', '#4a4f61', var=0.08, scale=2),
    trim=mat('trim', '#e07a35', var=0.05),
    card=mat('card', '#c99b68', var=0.1, scale=4),
    rock=mat('rock', '#8f8a9e', var=0.18, scale=1.4),
    basalt=mat('basalt', '#625d76', var=0.14, scale=2),
    pine=mat('pine', '#2f5d4a', var=0.16, scale=1.8),
    pine2=mat('pine2', '#3c6e52', var=0.16, scale=1.8),
    bark=mat('bark', '#5a4034', var=0.1, scale=5),
    blossom=mat('blossom', '#e48aae', var=0.16, scale=1.6),
    blossom2=mat('blossom2', '#f2a7c0', var=0.14, scale=1.6),
    bush=mat('bush', '#3f7356', var=0.16, scale=2.2),
    paper=mat('paper', '#f3ead6', var=0.03),
    cork=mat('cork', '#b98a5c', var=0.18, scale=8),
    page=mat('page', '#f1e6cc', var=0.03),
    ribbon=mat('ribbon', '#c23b4b', var=0.02),
    teal=mat('teal', '#2fa39a', var=0.05),
    glow_pink=mat('glow_pink', '#ff7bb0', emit='#ff6aa8', es=10, var=0),
    glow_gold=mat('glow_gold', '#ffd27a', emit='#ffc95a', es=10, var=0),
    glow_violet=mat('glow_violet', '#9a7bff', emit='#8d6bff', es=10, var=0),
    glow_cyan=mat('glow_cyan', '#7fe7ff', emit='#62dcff', es=10, var=0),
    rope=mat('rope', '#c8b08a', var=0.1, scale=10),
)

WARM = (1.0, 0.62, 0.32)
COOL = (0.75, 0.88, 1.0)

def gl(o, x, y):
    return place(o, (x, y, 0))

# ---------------------------------------------------------------- props
def lantern(x, y, rz=0.0, h=None, light=True):
    z0 = gz(x, y) if h is None else h
    p = [
        box((0.34, 0.34, 0.14), (0, 0, 0.07), bevel=0.03, m=M['iron']),
        box((0.13, 0.13, 1.45), (0, 0, 0.8), bevel=0.02, m=M['ironl']),
        box((0.22, 0.22, 0.06), (0, 0, 1.52), bevel=0.015, m=M['ironl']),
        box((0.26, 0.26, 0.34), (0, 0, 1.73), bevel=0.01, m=M['glass']),
    ]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.045, 0.045, 0.38), (sx * 0.14, sy * 0.14, 1.73), bevel=0.008, segs=1, m=M['ironl']))
    p.append(box((0.32, 0.32, 0.04), (0, 0, 1.56), bevel=0.01, m=M['ironl']))
    p.append(cyl(0.29, 0.2, (0, 0, 2.0), rot=(0, 0, math.pi / 4), verts=4, r2=0.02, bevel=0.012, m=M['iron'], smooth=0))
    p.append(ico(0.04, (0, 0, 2.12), sub=1, m=M['iron']))
    group(p, (x, y, z0), rz)
    if light:
        point_light((x, y, z0 + 1.73), 170, (1.0, 0.52, 0.22), 0.12)
        LIGHTS.append((x, y, z0 + 1.73, '#ffb565', 1.0))
    COLLIDERS.append(('c', x, y, 0.28))
    return p

def pine(x, y, s=1.0, seed=0):
    rnd = random.Random(seed)
    z0 = gz(x, y) - 0.1
    p = [cyl(0.14 * s, 1.3 * s, (0, 0, 0.65 * s), verts=8, r2=0.09 * s, bevel=0, m=M['bark'], smooth=60)]
    tiers = rnd.choice([3, 4, 4])
    for i in range(tiers):
        r = (1.25 - i * 0.26) * s
        hgt = (1.15 - i * 0.12) * s
        zc = (0.95 + i * 0.62) * s + hgt / 2
        o = cyl(r, hgt, (0, 0, 0), verts=11, r2=0.06 * s, bevel=0, m=M['pine' if (i + seed) % 2 else 'pine2'], smooth=0)
        # jag the skirt and droop it a little
        for v in o.data.vertices:
            if v.co.z < 0:
                k = math.atan2(v.co.y, v.co.x)
                f = 0.86 if (round(k / (2 * math.pi / 11)) % 2) else 1.06
                v.co.x *= f
                v.co.y *= f
                v.co.z -= 0.12 * s * (f - 0.86) / 0.2
        o.rotation_euler = (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), rnd.uniform(0, 6.28))
        o.location = (0, 0, zc)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(50))
        p.append(o)
    group(p, (x, y, z0), rnd.uniform(0, 6.28))
    COLLIDERS.append(('c', x, y, 0.35 * s))
    return p

def blossom(x, y, s=1.0, seed=0):
    rnd = random.Random(seed + 100)
    z0 = gz(x, y) - 0.05
    p = [cyl(0.16 * s, 1.9 * s, (0, 0, 0.95 * s), verts=9, r2=0.1 * s, bevel=0, m=M['bark'], smooth=60)]
    for k in range(2):
        a = rnd.uniform(0, 6.28) + k * 3.1
        br = cyl(0.07 * s, 1.0 * s, (0, 0, 0), verts=7, r2=0.04 * s, bevel=0, m=M['bark'], smooth=60)
        br.rotation_euler = (0.8, 0, a)
        br.location = (math.cos(a + 1.57) * 0.3 * s, math.sin(a + 1.57) * 0.3 * s, 1.75 * s)
        lib.active(br)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        p.append(br)
    for k in range(6):
        a = k * 1.05 + rnd.uniform(-0.3, 0.3)
        rr = 0.55 * s if k else 0
        r = rnd.uniform(0.75, 1.0) * s
        loc = (math.cos(a) * rr, math.sin(a) * rr, (2.5 + rnd.uniform(-0.2, 0.5)) * s + (0.35 * s if k == 0 else 0))
        p.append(ico(r, loc, sub=3, m=M['blossom' if k % 2 else 'blossom2'], scale=(1, 1, 0.82), disp=0.22 * s, seed=seed * 10 + k, freq=1.8 / s))
    group(p, (x, y, z0), rnd.uniform(0, 6.28))
    COLLIDERS.append(('c', x, y, 0.35 * s))
    return p

def bush(x, y, s=1.0, seed=0):
    rnd = random.Random(seed + 300)
    z0 = gz(x, y)
    p = []
    for k in range(3):
        a = k * 2.1 + rnd.uniform(0, 1)
        p.append(ico(rnd.uniform(0.4, 0.55) * s, (math.cos(a) * 0.35 * s, math.sin(a) * 0.35 * s, 0.25 * s), sub=2, m=M['bush'], scale=(1, 1, 0.75), disp=0.12 * s, seed=seed * 7 + k, freq=2.5))
    group(p, (x, y, z0), 0)
    return p

def rock(x, y, s=1.0, seed=0, z=None):
    rnd = random.Random(seed + 500)
    z0 = gz(x, y) if z is None else z
    o = ico(s, (0, 0, 0.15 * s), sub=2, m=M['rock'], scale=(1, rnd.uniform(0.7, 0.95), rnd.uniform(0.5, 0.7)), disp=0.28 * s, seed=seed, freq=0.9 / s, smooth=40)
    place(o, (x, y, z0), rnd.uniform(0, 6.28))
    COLLIDERS.append(('c', x, y, 0.8 * s))
    return [o]

def basalt(x, y, n=6, seed=0, spread=1.1, hmin=0.6, hmax=2.0):
    rnd = random.Random(seed + 700)
    p = []
    pts = []
    for k in range(n):
        for _ in range(30):
            dx, dy = rnd.uniform(-spread, spread), rnd.uniform(-spread, spread)
            if all(math.hypot(dx - a, dy - b) > 0.95 for a, b in pts):
                pts.append((dx, dy))
                break
    for k, (dx, dy) in enumerate(pts):
        h = rnd.uniform(hmin, hmax)
        z0 = min(gz(x + dx, y + dy), 0.2)
        o = cyl(0.52, h + 1.5, (x + dx, y + dy, z0 + h / 2 - 0.75), rot=(0, 0, rnd.uniform(0, 1)), verts=6, bevel=0.06, segs=2, m=M['basalt'], smooth=30)
        p.append(o)
    COLLIDERS.append(('c', x, y, spread + 0.4))
    return p

def bench(x, y, rz):
    z0 = gz(x, y)
    p = []
    for k in range(4):
        p.append(box((1.6, 0.11, 0.05), (0, -0.2 + k * 0.13, 0.45), bevel=0.015, m=M['wood2']))
    for k in range(3):
        p.append(box((1.6, 0.1, 0.05), (0, 0.27, 0.62 + k * 0.13), rot=(0.2, 0, 0), bevel=0.015, m=M['wood2']))
    for sx in (-0.65, 0.65):
        p.append(box((0.08, 0.5, 0.45), (sx, 0, 0.22), bevel=0.02, m=M['iron']))
        p.append(box((0.08, 0.06, 0.5), (sx, 0.29, 0.65), rot=(0.2, 0, 0), bevel=0.02, m=M['iron']))
    group(p, (x, y, z0), rz)
    COLLIDERS.append(('b', x, y, 0.85, 0.35, rz))
    return p

def fence(a, b, z=None):
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    n = max(1, int(L / 1.6))
    p = []
    rz = math.atan2(b.y - a.y, b.x - a.x)
    for i in range(n + 1):
        q = a.lerp(b, i / n)
        p.append(place(box((0.11, 0.11, 0.85), (0, 0, 0.42), bevel=0.02, m=M['dwood']), (q.x, q.y, gz(q.x, q.y) - 0.05), rz + random.uniform(-0.08, 0.08)))
    for i in range(n):
        q0, q1 = a.lerp(b, i / n), a.lerp(b, (i + 1) / n)
        mid = (q0 + q1) / 2
        zz = (gz(q0.x, q0.y) + gz(q1.x, q1.y)) / 2
        for hh in (0.38, 0.68):
            p.append(place(box((L / n + 0.1, 0.06, 0.09), (0, 0, hh), bevel=0.015, m=M['wood']), (mid.x, mid.y, zz), rz + random.uniform(-0.02, 0.02)))
    return p

# ---------------------------------------------------------------- plaza
def plaza():
    p = []
    rings = [(0.0, 0.9, 1), (0.95, 1.85, 10), (1.9, 2.85, 16), (2.9, 3.75, 22), (3.8, 4.6, 28)]
    gap = 0.05
    for ri, (r0, r1, n) in enumerate(rings):
        bm = bmesh.new()
        for j in range(n):
            if n == 1:
                circ = [(math.cos(t) * (r1 - gap), math.sin(t) * (r1 - gap)) for t in np.linspace(0, 2 * math.pi, 20, endpoint=False)]
                vs = [bm.verts.new((x, y, 0.0)) for x, y in circ]
                f = bm.faces.new(vs)
            else:
                a0 = 2 * math.pi * j / n + gap / r1
                a1 = 2 * math.pi * (j + 1) / n - gap / r1
                seg = 4
                outer = [(math.cos(a) * (r1 - gap / 2), math.sin(a) * (r1 - gap / 2)) for a in np.linspace(a0, a1, seg)]
                inner = [(math.cos(a) * (r0 + gap / 2), math.sin(a) * (r0 + gap / 2)) for a in np.linspace(a1, a0, seg)]
                vs = [bm.verts.new((x, y, 0.0)) for x, y in outer + inner]
                f = bm.faces.new(vs)
        r = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
        for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]:
            v.co.z = 0.09
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new('plz')
        bm.to_mesh(me)
        o = bpy.data.objects.new('plz', me)
        sc.collection.objects.link(o)
        rnd = random.Random(ri)
        mname = 'stone' if ri % 2 == 0 else 'stone2'
        lib.finish(o, bevel=0.025, segs=2, smooth=40, m=M[mname])
        o.location.z = 0.5
        lib.active(o)
        bpy.ops.object.transform_apply(location=True)
        p.append(o)
    # grout bed
    p.append(cyl(PLAZA_R + 0.15, 0.3, (0, 0, 0.42), verts=64, bevel=0.03, m=M['grout']))
    # compass inlay on the centre stone
    for k in range(4):
        a = k * math.pi / 2
        o = cyl(0.18, 0.02, (0, 0, 0), verts=3, bevel=0, m=M['gold'], smooth=0)
        o.scale = (3.4, 1, 1)
        o.location = (math.cos(a) * 0.32, math.sin(a) * 0.32, 0.6)
        o.rotation_euler = (0, 0, a)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        p.append(o)
    PHYS_RAISE.append(('disc', 0, 0, PLAZA_R + 0.1, 0.06))
    return p

# ---------------------------------------------------------------- signpost + notice board (experience & contact)
def board_station():
    x, y = ST['board']
    bx, by = x - 1.6, y - 0.6
    z0 = gz(bx, by)
    p = []
    for sx in (-1.25, 1.25):
        p.append(box((0.16, 0.16, 2.6), (sx, 0, 1.3), bevel=0.03, m=M['dwood']))
    p.append(box((2.4, 0.12, 1.5), (0, 0, 1.55), bevel=0.03, m=M['cork']))
    for (w, h, zz) in ((2.6, 0.12, 2.36), (2.6, 0.12, 0.76)):
        p.append(box((w, 0.2, h), (0, 0, zz), bevel=0.03, m=M['wood']))
    for sx in (-1.22, 1.22):
        p.append(box((0.12, 0.2, 1.5), (sx, 0, 1.55), bevel=0.02, m=M['wood']))
    # little roof
    for s in (-1, 1):
        p.append(box((2.9, 0.62, 0.06), (0, s * 0.27, 2.62), rot=(-s * 0.45, 0, 0), bevel=0.02, m=M['roof']))
    rnd = random.Random(4)
    papers = [(-0.75, 1.85, 0.5, 0.62), (-0.1, 1.95, 0.42, 0.5), (0.6, 1.8, 0.55, 0.7), (-0.6, 1.2, 0.6, 0.45), (0.15, 1.25, 0.45, 0.55), (0.75, 1.15, 0.38, 0.4)]
    for (px, pz, w, h) in papers:
        p.append(box((w, 0.02, h), (px, -0.07, pz), rot=(0, rnd.uniform(-0.08, 0.08), 0), bevel=0.003, segs=1, m=M['paper']))
        p.append(ico(0.025, (px, -0.09, pz + h / 2 - 0.05), sub=1, m=M['ribbon']))
    group(p, (bx, by, z0), math.radians(-28))
    COLLIDERS.append(('b', bx, by, 1.4, 0.25, math.radians(-28)))
    # direction post with an arrow per station
    sx, sy = x + 0.6, y + 1.7
    z1 = gz(sx, sy)
    q = [box((0.16, 0.16, 3.1), (0, 0, 1.55), bevel=0.03, m=M['dwood']), cyl(0.12, 0.12, (0, 0, 3.16), verts=4, r2=0.01, rot=(0, 0, math.pi / 4), m=M['dwood'], smooth=0)]
    cols = {'pad': 'white', 'dock': 'trim', 'model': 'hazard', 'log': 'plank', 'pier': 'teal'}
    for i, (k, mn) in enumerate(cols.items()):
        tx, ty = ST[k]
        a = math.atan2(ty - sy, tx - sx)
        bm = bmesh.new()
        L, Hh = 1.05, 0.24
        pts = [(0.08, -Hh / 2), (L, -Hh / 2), (L + 0.16, 0), (L, Hh / 2), (0.08, Hh / 2)]
        vs = [bm.verts.new((px, 0, pz)) for px, pz in pts]
        bm.faces.new(vs)
        r = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
        for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]:
            v.co.y = 0.06
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new('arr')
        bm.to_mesh(me)
        o = bpy.data.objects.new('arr', me)
        sc.collection.objects.link(o)
        lib.finish(o, bevel=0.015, segs=2, smooth=40, m=M[mn])
        o.location = (0, 0, 2.75 - i * 0.33)
        o.rotation_euler = (0, 0, a)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        q.append(o)
    group(q, (sx, sy, z1), 0)
    COLLIDERS.append(('c', sx, sy, 0.25))
    lantern(x - 3.6, y + 1.2)
    return p + q

# ---------------------------------------------------------------- launch pad + ground station (MarmotSat)
def pad_station():
    x, y = 0.0, 0.0
    cx, cy = ST['pad'][0] + 0.5, ST['pad'][1] + 3.0
    z0 = 0.55
    p = []
    p.append(cyl(4.3, 0.5, (0, 0, 0.05), verts=8, rot=(0, 0, math.pi / 8), bevel=0.08, segs=3, m=M['concrete'], smooth=30))
    # hazard band
    n = 32
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        p.append(box((0.62, 0.3, 0.06), (math.cos(a) * 3.65, math.sin(a) * 3.65, 0.32), rot=(0, 0, a + math.pi / 2), bevel=0.015, m=M['hazard' if k % 2 else 'black']))
    # deck seams
    for k in range(4):
        a = k * math.pi / 4
        p.append(box((6.6, 0.05, 0.02), (0, 0, 0.305), rot=(0, 0, a), bevel=0, m=M['grout']))
    # plinth + deployer + CubeSat (scaled display model)
    p.append(box((1.5, 1.5, 0.5), (0, 0, 0.55), bevel=0.05, segs=3, m=M['steel']))
    p.append(box((1.1, 1.1, 0.12), (0, 0, 0.86), bevel=0.03, m=M['black']))
    cs = 0.62  # cube edge
    H3 = cs * 3
    zc = 0.92 + H3 / 2
    p.append(box((cs, cs, H3), (0, 0, zc), bevel=0.02, m=M['black']))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.07, 0.07, H3 + 0.08), (sx * cs / 2, sy * cs / 2, zc), bevel=0.012, m=M['steel']))
    # body panels with cells
    for face in range(4):
        a = face * math.pi / 2
        for row in range(6):
            for col in range(2):
                lx = (col - 0.5) * 0.24
                lz = 0.92 + 0.16 + row * 0.29
                o = box((0.21, 0.02, 0.26), (lx, -cs / 2 - 0.012, lz), bevel=0.004, segs=1, m=M['panel'])
                place(o, (0, 0, 0), a)
                p.append(o)
    # deployable wings
    for s in (-1, 1):
        w = box((0.05, 0.6, 1.7), (0, 0, 0), bevel=0.01, m=M['panel'])
        w.location = (s * (cs / 2 + 0.42), 0, zc + 0.05)
        w.rotation_euler = (0, s * -0.55, 0)
        lib.active(w)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        p.append(w)
        fr = box((0.03, 0.62, 0.04), (s * (cs / 2 + 0.05), 0, zc + 0.75), bevel=0.005, segs=1, m=M['steel'])
        p.append(fr)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        o = cyl(0.012, 1.1, (0, 0, 0), rot=(0, 1.2, 0), verts=6, bevel=0, m=M['steel'])
        o.location = (math.cos(a) * 0.55, math.sin(a) * 0.55, zc + H3 / 2 + 0.05)
        o.rotation_euler = (0, 1.25, a)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        p.append(o)
    p.append(box((cs - 0.1, cs - 0.1, 0.04), (0, 0, zc + H3 / 2 + 0.02), bevel=0.01, m=M['gold']))
    # gantry tower (lattice)
    gx, gy, gw, gh = 2.4, 1.6, 1.2, 7.2
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.12, 0.12, gh), (gx + sx * gw / 2, gy + sy * gw / 2, 0.3 + gh / 2), bevel=0.02, m=M['gantry']))
    lv = 6
    for i in range(lv + 1):
        zz = 0.3 + i * gh / lv
        for k in range(4):
            a = k * math.pi / 2
            o = box((gw, 0.08, 0.08), (0, gw / 2, 0), bevel=0.015, m=M['gantry'])
            place(o, (gx, gy, zz), a)
            p.append(o)
        if i < lv:
            for k in range(4):
                a = k * math.pi / 2
                L = math.hypot(gw, gh / lv)
                o = box((L, 0.05, 0.05), (0, gw / 2, 0), rot=(0, -math.atan2(gh / lv, gw) * (1 if i % 2 else -1), 0), bevel=0.01, m=M['white'])
                place(o, (gx, gy, zz + gh / lv / 2), a)
                p.append(o)
    # arm toward the cubesat + beacon
    p.append(box((2.0, 0.22, 0.18), (gx - 1.2, gy, 0.3 + gh * 0.66), bevel=0.03, m=M['gantry']))
    p.append(box((0.6, 0.5, 0.5), (gx, gy, 0.3 + gh + 0.25), bevel=0.05, m=M['white']))
    p.append(ico(0.14, (gx, gy, 0.3 + gh + 0.6), sub=2, m=M['red']))
    # floodlights on the gantry
    for (fx, fy, fz) in ((gx - 0.7, gy - 0.7, 4.4),):
        p.append(box((0.4, 0.2, 0.3), (fx, fy, fz), rot=(0.5, 0, 0.6), bevel=0.03, m=M['iron']))
        p.append(box((0.32, 0.03, 0.22), (fx - 0.03, fy - 0.11, fz - 0.03), rot=(0.5, 0, 0.6), bevel=0.005, segs=1, m=M['glassc']))
    # hazard posts
    for k in range(6):
        a = k * math.pi / 3 + 0.3
        if abs(math.atan2(math.sin(a - (-1.9)), math.cos(a - (-1.9)))) < 0.6:
            continue
        p.append(cyl(0.09, 0.9, (math.cos(a) * 4.6, math.sin(a) * 4.6, 0.25), verts=10, bevel=0.02, m=M['hazard']))
        p.append(cyl(0.095, 0.15, (math.cos(a) * 4.6, math.sin(a) * 4.6, 0.55), verts=10, bevel=0.01, m=M['black']))
    group(p, (cx, cy, z0 - 0.1), 0)
    point_light((cx + gx, cy + gy, z0 + gh + 0.6), 20, (1.0, 0.25, 0.2), 0.1)
    LIGHTS.append((cx + gx, cy + gy, z0 + gh + 0.6, '#ff4d3a', 0.8))
    spot_light((cx + gx - 0.8, cy + gy - 0.8, z0 + 4.3), (math.radians(55), 0, math.radians(140)), 700, COOL, size=70, blend=0.7, radius=0.15)
    LIGHTS.append((cx + gx - 0.8, cy + gy - 0.85, z0 + 4.1, '#cfefff', 1.0))
    point_light((cx, cy, z0 + 3.4), 25, COOL, 0.3)
    COLLIDERS.append(('b', cx, cy, 0.8, 0.8, 0))
    COLLIDERS.append(('b', cx + gx, cy + gy, 0.75, 0.75, 0))
    PHYS_RAISE.append(('disc', cx, cy, 4.15, 0.2))
    # ground-station dish (pedestal static; the head moves at runtime)
    dx, dy = cx - 5.4, cy + 1.2
    dz = gz(dx, dy)
    q = [cyl(0.55, 0.3, (0, 0, 0.15), verts=16, bevel=0.04, m=M['concrete']), cyl(0.18, 1.6, (0, 0, 1.05), verts=12, bevel=0.02, m=M['white']), box((0.5, 0.36, 0.3), (0, 0, 1.8), bevel=0.05, m=M['white'])]
    group(q, (dx, dy, dz), 0)
    DYN.append(('dish', dx, dy, dz + 1.95, 0))
    COLLIDERS.append(('c', dx, dy, 0.9))
    lantern(dx + 1.6, dy - 1.8)
    # cones
    for k, (ox, oy) in enumerate(((-3.6, -4.8), (-2.6, -5.2), (3.8, -4.4), (4.8, -3.6), (-4.8, 1.8))):
        DYN.append(('cone', cx + ox, cy + oy, gz(cx + ox, cy + oy), random.uniform(0, 6)))
    return p + q

# ---------------------------------------------------------------- warehouse dock (Amazon)
def dock_station():
    cx, cy = 18.4, 11.4
    rz = math.radians(-58)  # front (local -y) faces the plaza
    z0 = 0.5
    W, D, H = 8.0, 6.4, 4.0
    p = []
    p.append(box((W + 0.6, D + 0.6, 0.35), (0, 0, 0.12), bevel=0.04, m=M['concrete']))
    # walls with an opening at the front
    t = 0.2
    door_w, door_h = 3.4, 2.9
    p.append(box((W, t, H), (0, D / 2, H / 2 + 0.25), bevel=0.02, m=M['wall']))
    for s in (-1, 1):
        p.append(box((t, D, H), (s * W / 2, 0, H / 2 + 0.25), bevel=0.02, m=M['wall']))
    side = (W - door_w) / 2
    for s in (-1, 1):
        p.append(box((side, t, H), (s * (door_w / 2 + side / 2), -D / 2, H / 2 + 0.25), bevel=0.02, m=M['wall']))
    p.append(box((door_w, t, H - door_h), (0, -D / 2, door_h + (H - door_h) / 2 + 0.25), bevel=0.02, m=M['wall']))
    # corrugation ribs on the outside
    for s in (-1, 1):
        nrib = int(side / 0.3)
        for i in range(nrib):
            xx = s * (door_w / 2 + 0.15 + i * 0.3)
            p.append(box((0.06, 0.06, H - 0.1), (xx, -D / 2 - 0.12, H / 2 + 0.25), bevel=0.02, segs=1, m=M['wall'], smooth=60))
    for s in (-1, 1):
        for i in range(int(D / 0.3)):
            yy = -D / 2 + 0.2 + i * 0.3
            p.append(box((0.06, 0.06, H - 0.1), (s * (W / 2 + 0.12), yy, H / 2 + 0.25), bevel=0.02, segs=1, m=M['wall'], smooth=60))
    # trims
    p.append(box((door_w + 0.3, 0.28, 0.22), (0, -D / 2 - 0.05, door_h + 0.3), bevel=0.03, m=M['trim']))
    for s in (-1, 1):
        p.append(box((0.2, 0.28, door_h), (s * (door_w / 2 + 0.05), -D / 2 - 0.05, door_h / 2 + 0.25), bevel=0.03, m=M['trim']))
    for s in (-1, 1):
        for zz in (0.3, H + 0.2):
            p.append(box((W + 0.4, 0.3, 0.16), (0, s * (D / 2 + 0.05), zz), bevel=0.03, m=M['trim'] if zz > 1 else M['roof']))
    # roll-up door rolled at the top
    p.append(cyl(0.28, door_w, (0, -D / 2 + 0.25, door_h + 0.1), rot=(0, math.pi / 2, 0), verts=20, bevel=0.02, m=M['steel']))
    # roof (gable, with overhang)
    pitch = 0.22
    for s in (-1, 1):
        p.append(box((W / 2 + 0.7, D + 1.0, 0.16), (s * W / 4 * 1.05, 0, H + 0.25 + 0.5), rot=(0, s * pitch, 0), bevel=0.03, m=M['roof']))
    for s in (-1, 1):  # gable ends
        bm = bmesh.new()
        vs = [bm.verts.new(v) for v in ((-W / 2, 0, 0), (W / 2, 0, 0), (0, 0, W / 2 * math.tan(pitch)))]
        bm.faces.new(vs)
        r = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
        for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]:
            v.co.y = t
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new('gab')
        bm.to_mesh(me)
        o = bpy.data.objects.new('gab', me)
        sc.collection.objects.link(o)
        lib.finish(o, 0.02, 2, 40, M['wall'])
        o.location = (0, s * D / 2 - t / 2, H + 0.25)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True)
        p.append(o)
    # roof vents
    for xx in (-2.0, 2.0):
        p.append(cyl(0.3, 0.5, (xx, 1.2, H + 1.0), verts=12, bevel=0.03, m=M['steel']))
        p.append(cyl(0.42, 0.12, (xx, 1.2, H + 1.3), verts=12, r2=0.1, bevel=0.02, m=M['steel']))
    # high window strip (warm)
    for s in (-1, 1):
        for i in range(3):
            p.append(box((0.08, 0.9, 0.42), (s * (W / 2 + 0.16), -1.8 + i * 1.8, H - 0.4), bevel=0.01, m=M['glass']))
    # interior: floor glow, racking with boxes
    p.append(box((W - 0.4, D - 0.4, 0.04), (0, 0, 0.32), bevel=0, m=M['concrete']))
    rnd = random.Random(9)
    for rx in (-2.6, 0.0, 2.6):
        for lvl in range(3):
            p.append(box((1.8, 1.0, 0.06), (rx, 1.6, 0.8 + lvl * 1.0), bevel=0.01, m=M['trim']))
            for bxi in range(3):
                if rnd.random() < 0.85:
                    s_ = rnd.uniform(0.35, 0.5)
                    p.append(box((s_, s_ * 1.1, s_ * 0.8), (rx - 0.55 + bxi * 0.55, 1.6, 0.83 + lvl * 1.0 + s_ * 0.4), rot=(0, 0, rnd.uniform(-0.1, 0.1)), bevel=0.02, m=M['card']))
        for sx in (-0.9, 0.9):
            p.append(box((0.07, 1.0, 3.0), (rx + sx, 1.6, 1.8), bevel=0.01, segs=1, m=M['iron']))
    # conveyor out of the door
    p.append(box((0.9, 3.0, 0.12), (-0.9, -D / 2 - 0.4, 0.95), bevel=0.02, m=M['black']))
    for i in range(10):
        p.append(cyl(0.05, 0.86, (-0.9, -D / 2 - 1.8 + i * 0.3, 1.02), rot=(0, math.pi / 2, 0), verts=8, bevel=0, m=M['steel']))
    for sy in (-1.6, 0.8):
        for sx in (-0.4, 0.4):
            p.append(box((0.07, 0.07, 0.9), (-0.9 + sx, -D / 2 - 0.4 + sy, 0.5), bevel=0.01, m=M['iron']))
    p.append(box((0.55, 0.5, 0.4), (-0.9, -D / 2 + 0.4, 1.22), bevel=0.02, m=M['card']))
    # dock bumpers
    for s in (-1, 1):
        p.append(box((0.3, 0.2, 0.32), (s * 1.3, -D / 2 - 0.35, 0.35), bevel=0.03, m=M['black']))
    # pallets
    for (px, py) in ((2.5, -D / 2 - 1.0), (2.5, -D / 2 - 2.3)):
        for i in range(5):
            p.append(box((1.1, 0.16, 0.04), (px, py - 0.4 + i * 0.2, 0.42), bevel=0.01, segs=1, m=M['plank']))
        for i in range(3):
            p.append(box((1.1, 0.1, 0.1), (px, py - 0.4 + i * 0.4, 0.34), bevel=0.01, segs=1, m=M['wood']))
    # wall lamp over the door
    p.append(box((0.5, 0.36, 0.14), (0, -D / 2 - 0.3, door_h + 0.65), bevel=0.03, m=M['iron']))
    p.append(box((0.42, 0.28, 0.03), (0, -D / 2 - 0.32, door_h + 0.57), bevel=0.005, segs=1, m=M['glass']))
    group(p, (cx, cy, z0 - 0.05), rz)
    c, s_ = math.cos(rz), math.sin(rz)
    def L(lx, ly):
        return (cx + lx * c - ly * s_, cy + lx * s_ + ly * c)
    lx, ly = L(0, -D / 2 - 0.4)
    point_light((lx, ly, z0 + door_h + 0.2), 120, (1.0, 0.7, 0.4), 0.2)
    LIGHTS.append((lx, ly, z0 + door_h + 0.25, '#ffc070', 1.0))
    ix, iy = L(0, 0.5)
    point_light((ix, iy, z0 + 2.6), 300, (1.0, 0.72, 0.45), 0.6)
    COLLIDERS.append(('b', cx, cy, W / 2 + 0.3, D / 2 + 0.3, rz))
    cvx, cvy = L(-0.9, -D / 2 - 0.4)
    COLLIDERS.append(('b', cvx, cvy, 0.5, 1.5, rz))
    for (px, py) in ((2.5, -D / 2 - 1.0), (2.5, -D / 2 - 2.3)):
        qx, qy = L(px, py)
        COLLIDERS.append(('b', qx, qy, 0.55, 0.5, rz))
    # stack of parcels to knock over (runtime bodies)
    bx, by = L(-2.6, -D / 2 - 2.3)
    k = 0
    for row, n in enumerate((3, 2, 1)):
        for i in range(n):
            ox = (i - (n - 1) / 2) * 0.62
            qx, qy = bx + ox * c, by + ox * s_
            DYN.append(('parcel', qx, qy, gz(qx, qy) + 0.25 + row * 0.5, rz + random.uniform(-0.1, 0.1)))
    for (ox, oy) in ((-3.8, -D / 2 - 1.0), (-3.6, -D / 2 - 0.2)):
        qx, qy = L(ox, oy)
        DYN.append(('barrel', qx, qy, gz(qx, qy), 0))
    lantern(*L(-4.6, -D / 2 - 3.2))
    return p

# ---------------------------------------------------------------- the model monument (steering)
def model_station():
    cx, cy = ST['model']
    cx, cy = cx + 1.2, cy - 1.4
    z0 = gz(cx, cy)
    p = []
    p.append(cyl(3.3, 0.3, (0, 0, 0.1), verts=48, bevel=0.05, segs=3, m=M['stone2']))
    p.append(cyl(2.5, 0.22, (0, 0, 0.34), verts=48, bevel=0.05, segs=3, m=M['marble']))
    # dial ticks: 9 alphas from -1.2 to +1.2 over 240 degrees
    for i in range(9):
        a = math.radians(-120 + i * 30) - math.pi / 2  # centred toward -y (camera side)
        mn = 'glow_violet' if i < 4 else ('white' if i == 4 else 'glow_gold')
        L = 0.5 if i in (0, 4, 8) else 0.34
        o = box((0.1, L, 0.04), (0, 0, 0), bevel=0.01, m=M[mn])
        o.location = (math.cos(a) * (2.0 - L / 2), math.sin(a) * (2.0 - L / 2), 0.46)
        o.rotation_euler = (0, 0, a - math.pi / 2)
        lib.active(o)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        p.append(o)
    p.append(torus(2.18, 0.03, (0, 0, 0.45), maj=64, mn=6, m=M['gold']))
    p.append(cyl(0.75, 0.25, (0, 0, 0.55), verts=24, bevel=0.04, m=M['iron']))
    # four corner stones
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        p.append(box((0.5, 0.5, 0.6), (math.cos(a) * 3.0, math.sin(a) * 3.0, 0.45), rot=(0, 0, a), bevel=0.06, segs=3, m=M['stone']))
        p.append(ico(0.12, (math.cos(a) * 3.0, math.sin(a) * 3.0, 0.82), sub=2, m=M['glow_gold'] if k % 2 else M['glow_violet']))
    group(p, (cx, cy, z0), 0)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        COLLIDERS.append(('c', cx + math.cos(a) * 3.0, cy + math.sin(a) * 3.0, 0.4))
    point_light((cx, cy, z0 + 1.6), 60, (1.0, 0.8, 0.55), 0.4)
    COLLIDERS.append(('c', cx, cy, 0.9))
    PHYS_RAISE.append(('disc', cx, cy, 3.25, 0.25))
    PHYS_RAISE.append(('disc', cx, cy, 2.45, 0.45))
    DYN.append(('spine', cx, cy, z0 + 0.68, 0))
    DYN.append(('needle', cx, cy, z0 + 0.47, 0))
    lantern(cx - 4.2, cy + 2.4)
    return p

# ---------------------------------------------------------------- logbook pavilion (loss masking)
def log_station():
    cx, cy = ST['log']
    cx, cy = cx - 0.4, cy - 3.0
    z0 = gz(cx, cy)
    W = 3.4
    p = []
    for i in range(int(W / 0.26)):
        p.append(box((W, 0.24, 0.08), (0, -W / 2 + 0.14 + i * 0.26, 0.2), rot=(0, 0, random.uniform(-0.01, 0.01)), bevel=0.012, segs=1, m=M['plank']))
    for sx in (-1, 1):
        p.append(box((0.16, W + 0.2, 0.18), (sx * (W / 2 - 0.1), 0, 0.08), bevel=0.02, m=M['dwood']))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.18, 0.18, 2.6), (sx * (W / 2 - 0.15), sy * (W / 2 - 0.15), 1.5), bevel=0.03, m=M['dwood']))
    p.append(box((W + 0.4, 0.18, 0.18), (0, 0, 3.55), bevel=0.03, m=M['dwood']))
    for sy in (-1, 1):
        p.append(box((W, 0.16, 0.16), (0, sy * (W / 2 - 0.15), 2.75), bevel=0.02, m=M['dwood']))
    # shingle rows
    pitch = 0.45
    for s in (-1, 1):
        for row in range(6):
            yy = s * (0.15 + row * 0.38)
            zz = 3.55 - (0.15 + row * 0.38) * math.tan(pitch) + 0.05
            for col in range(9):
                p.append(box((0.42, 0.44, 0.05), (-W / 2 - 0.2 + 0.21 + col * 0.42 + (0.1 if row % 2 else 0), yy, zz), rot=(-s * pitch, 0, 0), bevel=0.012, segs=1, m=M['roof']))
    # lectern with the logbook
    q = [box((0.5, 0.5, 0.08), (0, 0, 0.3), bevel=0.02, m=M['dwood']), box((0.16, 0.16, 1.0), (0, 0, 0.8), bevel=0.02, m=M['dwood'])]
    top = box((0.8, 0.6, 0.06), (0, 0, 0), bevel=0.02, m=M['wood2'])
    top.rotation_euler = (0.38, 0, 0)
    top.location = (0, 0, 1.33)
    lib.active(top)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    q.append(top)
    for s in (-1, 1):
        pg = box((0.36, 0.5, 0.06), (0, 0, 0), bevel=0.025, segs=3, m=M['page'])
        pg.rotation_euler = (0.38, s * 0.12, 0)
        pg.location = (s * 0.19, 0, 1.39)
        lib.active(pg)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        q.append(pg)
    q.append(box((0.03, 0.02, 0.3), (0.02, -0.25, 1.2), rot=(0.2, 0, 0), bevel=0.005, segs=1, m=M['ribbon']))
    # a candle
    q.append(cyl(0.04, 0.16, (0.33, 0.2, 1.48), verts=10, bevel=0.01, m=M['paper']))
    q.append(ico(0.03, (0.33, 0.2, 1.6), sub=1, m=M['glass']))
    group(q, (0, -0.4, 0), 0)
    # hanging lantern
    p.append(cyl(0.01, 0.6, (0, 0.6, 3.15), verts=6, bevel=0, m=M['iron']))
    p.append(box((0.24, 0.24, 0.3), (0, 0.6, 2.72), bevel=0.01, m=M['glass']))
    p.append(cyl(0.2, 0.12, (0, 0.6, 2.93), verts=4, r2=0.02, rot=(0, 0, math.pi / 4), m=M['iron'], smooth=0))
    # stool + book pile
    p.append(cyl(0.22, 0.45, (0.9, 0.8, 0.47), verts=14, bevel=0.03, m=M['wood']))
    for i, (w, h, c) in enumerate(((0.34, 0.08, 'ribbon'), (0.3, 0.07, 'teal'), (0.32, 0.09, 'panel'))):
        p.append(box((w, w * 0.75, h), (-1.0, 1.0, 0.27 + i * 0.085), rot=(0, 0, i * 0.4), bevel=0.01, m=M[c]))
    rz = math.radians(8)
    group(p + q, (cx, cy, z0), rz)
    point_light((cx, cy + 0.6, z0 + 2.7), 60, WARM, 0.15)
    LIGHTS.append((cx, cy + 0.6, z0 + 2.72, '#ffb565', 0.9))
    point_light((cx + 0.33, cy - 0.2, z0 + 1.6), 4, WARM, 0.03)
    COLLIDERS.append(('b', cx, cy, W / 2, W / 2, rz))
    lantern(cx + 2.8, cy + 2.6)
    return p + q

# ---------------------------------------------------------------- pier + buoy (ocean)
PIER = dict(x0=-19.0, x1=-33.0, y=-3.0, w=2.6, z=0.62)

def pier_station():
    x0, x1, y, w, zt = PIER['x0'], PIER['x1'], PIER['y'], PIER['w'], PIER['z']
    p = []
    n = int(abs(x1 - x0) / 0.3)
    rnd = random.Random(3)
    for i in range(n):
        xx = x0 - 0.15 - i * 0.3
        if rnd.random() < 0.03:
            continue
        p.append(box((0.27, w + rnd.uniform(-0.08, 0.08), 0.08), (xx, y + rnd.uniform(-0.05, 0.05), zt - 0.04 + rnd.uniform(-0.015, 0.015)), rot=(rnd.uniform(-0.02, 0.02), 0, rnd.uniform(-0.03, 0.03)), bevel=0.012, segs=1, m=M['plank' if rnd.random() < 0.7 else 'wood2']))
    for sy in (-1, 1):
        p.append(box((abs(x1 - x0), 0.16, 0.2), ((x0 + x1) / 2, y + sy * (w / 2 - 0.15), zt - 0.18), bevel=0.02, m=M['dwood']))
    for i in range(int(abs(x1 - x0) / 1.8) + 1):
        xx = x0 - 0.6 - i * 1.8
        for sy in (-1, 1):
            p.append(cyl(0.13, 3.0, (xx, y + sy * (w / 2 + 0.05), zt - 1.3), verts=10, bevel=0.03, m=M['dwood']))
            if i % 2 == 0:
                p.append(cyl(0.13, 0.4, (xx, y + sy * (w / 2 + 0.05), zt + 0.25), verts=10, bevel=0.04, m=M['dwood']))
    # rope rails between bollards
    for sy in (-1, 1):
        pts = [x0 - 0.6 - i * 3.6 for i in range(int(abs(x1 - x0) / 3.6) + 1)]
        for a, b in zip(pts[:-1], pts[1:]):
            for k in range(6):
                t0, t1 = k / 6, (k + 1) / 6
                sag = lambda t: -0.12 * math.sin(math.pi * t)
                xa, xb = a + (b - a) * t0, a + (b - a) * t1
                za, zb = zt + 0.38 + sag(t0), zt + 0.38 + sag(t1)
                L = math.hypot(xb - xa, zb - za)
                o = cyl(0.022, L, ((xa + xb) / 2, y + sy * (w / 2 + 0.05), (za + zb) / 2), rot=(0, math.pi / 2 + math.atan2(zb - za, xb - xa) * -1, 0), verts=6, bevel=0, m=M['rope'])
                p.append(o)
    # lamps at the end
    for sy in (-1, 1):
        lantern(x1 + 0.5, y + sy * (w / 2 - 0.25), h=zt)
    # crates on the pier (runtime bodies)
    for (ox, oy, oz) in ((-24.0, -3.8, 0), (-24.0, -3.0, 0), (-24.0, -3.4, 1)):
        DYN.append(('crate', ox, oy, zt + 0.3 + oz * 0.6, random.uniform(-0.2, 0.2)))
    DYN.append(('buoy', -36.5, -6.5, 0.0, 0))
    DYN.append(('boat', -30.0, -0.4, 0.0, 0.08))
    PHYS_RAISE.append(('rect', x1, y - w / 2, x0 + 1.2, y + w / 2, None))
    return p

# ---------------------------------------------------------------- scatter
def scatter():
    p = []
    occupied = [(0, 0, PLAZA_R + 2.0)]
    for k, (x, y) in ST.items():
        occupied.append((x, y, 4.0))
    occupied += [(18.4, 11.4, 7.0), (-6.5, 18.0, 6.0), (-12.0, 19.0, 2.2), (13.2, -11.4, 4.5), (-2.4, -18.4, 3.6), (-7.0, -3.0, 2.4)]
    def free(x, y, r):
        Z, d, pd, flat = ground(np.array([[x]]), np.array([[y]]), with_noise=False)
        if d[0, 0] > -4.2 or pd[0, 0] < 1.8:
            return False
        for (ox, oy, orr) in occupied:
            if math.hypot(x - ox, y - oy) < orr + r:
                return False
        return True
    rnd = random.Random(21)
    trees = 0
    tries = 0
    while trees < 44 and tries < 4000:
        tries += 1
        a = rnd.uniform(0, 6.283)
        rr = rnd.uniform(6, 25)
        x, y = math.cos(a) * rr, math.sin(a) * rr
        s = rnd.uniform(0.8, 1.35)
        if not free(x, y, 1.2 * s):
            continue
        occupied.append((x, y, 1.1 * s))
        # pines toward the rim, blossoms near the centre
        near = rr < 12
        if near and rnd.random() < 0.6:
            p += blossom(x, y, s * 0.9, trees)
        else:
            p += pine(x, y, s, trees)
        trees += 1
    for i in range(26):
        for _ in range(200):
            a = rnd.uniform(0, 6.283)
            rr = rnd.uniform(5, 24)
            x, y = math.cos(a) * rr, math.sin(a) * rr
            if free(x, y, 0.6):
                occupied.append((x, y, 0.6))
                p += bush(x, y, rnd.uniform(0.7, 1.2), i)
                break
    # fallen petals under the blossom trees and along the paths
    pet = []
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.data.materials and o.data.materials[0].name.startswith('blossom')][:60]:
        c = o.matrix_world.translation
        for k in range(10):
            a, rr = rnd.uniform(0, 6.283), rnd.uniform(0.3, 2.6)
            x, y = c.x + math.cos(a) * rr, c.y + math.sin(a) * rr
            pet.append(box((0.13, 0.08, 0.012), (x, y, gz(x, y) + 0.02), rot=(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), rnd.uniform(0, 6.28)), bevel=0, m=M['blossom2' if k % 2 else 'blossom'], smooth=0))
    p += pet
    # beach rocks
    for i in range(14):
        a = rnd.uniform(0, 6.283)
        if abs(math.atan2(math.sin(a - math.pi), math.cos(a - math.pi))) < 0.25:
            continue
        rr = float(R(a)) + rnd.uniform(-2.5, 1.5)
        x, y = math.cos(a) * rr, math.sin(a) * rr
        p += rock(x, y, rnd.uniform(0.5, 1.1), i)
    # basalt columns (a few clusters in the shallows)
    for (a, off, n) in ((2.3, 1.5, 7), (0.2, 0.8, 5), (-1.2, 2.0, 6), (-2.6, 1.0, 5), (1.2, 2.6, 4)):
        rr = float(R(a)) + off
        p += basalt(math.cos(a) * rr, math.sin(a) * rr, n, int(a * 10))
    # lanterns along the spokes
    for pts, w in PATHS[:5]:
        for t in (0.45, 0.85):
            i = int(t * (len(pts) - 1))
            a, b = pts[i], pts[min(i + 1, len(pts) - 1)]
            dv = b - a
            nrm = np.array([-dv[1], dv[0]]) / (np.linalg.norm(dv) + 1e-9)
            side = 1 if t < 0.6 else -1
            q = a + nrm * side * 1.9
            p += lantern(float(q[0]), float(q[1]))
    # plaza benches + fence on the north beach
    for a in (math.radians(200), math.radians(-35)):
        p += bench(math.cos(a) * (PLAZA_R + 1.2), math.sin(a) * (PLAZA_R + 1.2), a - math.pi / 2)
    p += fence((10.0, 20.5), (6.0, 23.4))
    p += fence((-20.0, 12.5), (-22.0, 8.0))
    # loose cones around the paths
    for (x, y) in ((5.6, 4.4), (6.2, 5.6), (-4.0, 8.5), (7.5, -5.8)):
        DYN.append(('cone', x, y, gz(x, y), rnd.uniform(0, 6)))
    for (x, y) in ((-10.0, -6.5), (-10.6, -7.3), (-9.6, -7.6)):
        DYN.append(('crate', x, y, gz(x, y) + 0.3, rnd.uniform(0, 1)))
    return p

# ---------------------------------------------------------------- lights + world
def setup_light():
    w = bpy.data.worlds.new('night')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*hexcol('#4a4fa8'), 1)
    bg.inputs['Strength'].default_value = 0.7
    d = bpy.data.lights.new('moon', 'SUN')
    d.energy = 1.0
    d.color = (0.66, 0.72, 1.0)
    d.angle = math.radians(9)
    o = bpy.data.objects.new('moon', d)
    o.rotation_euler = (math.radians(50), math.radians(0), math.radians(-150))
    sc.collection.objects.link(o)
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0

def water_plane():
    bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, WATER))
    o = bpy.context.active_object
    o.name = 'WATER'
    m = bpy.data.materials.new('water')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexcol('#123c52'), 1)
    b.inputs['Roughness'].default_value = 0.25
    b.inputs['Alpha'].default_value = 0.75
    o.data.materials.append(m)
    return o

def camera(name, target, offset, fov, w, h):
    cd = bpy.data.cameras.new(name)
    cd.sensor_fit = 'VERTICAL'
    cd.angle_y = math.radians(fov)
    co = bpy.data.objects.new(name, cd)
    sc.collection.objects.link(co)
    tgt = Vector(target)
    co.location = tgt + Vector(offset)
    d = tgt - co.location
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return co

# ---------------------------------------------------------------- build
terr = terrain()
setup_light()
static = []
static += plaza()
static += board_station()
static += pad_station()
static += dock_station()
static += model_station()
static += log_station()
static += pier_station()
static += scatter()

# lantern helper returns lists that already got grouped; flatten anything that slipped in twice
static = list({o.name: o for o in static if o and o.name in bpy.data.objects}.values())
# lanterns created inside station builders are not in the returned lists: collect every mesh except terrain
static = [o for o in sc.objects if o.type == 'MESH' and o.name not in ('terrain',)]

print('static meshes', len(static))
props = join(static, 'props')
lib.active(props)

# ---------------------------------------------------------------- physics + layout export
def phys_grid():
    S, step = 40.0, 0.5
    xs = np.arange(-S, S + 1e-6, step)
    X, Y = np.meshgrid(xs, xs)
    Z, d, pd, flat = ground(X, Y)
    for r in PHYS_RAISE:
        if r[0] == 'disc':
            _, x, y, rad, h = r
            m = np.hypot(X - x, Y - y) < rad
            Z = np.where(m, np.maximum(Z, Z * 0 + (0.55 + h)), Z)
        else:
            _, x0, y0, x1, y1, h = r
            m = (X >= min(x0, x1)) & (X <= max(x0, x1)) & (Y >= y0) & (Y <= y1)
            hh = PIER['z'] if h is None else 0.55 + h
            Z = np.where(m, np.maximum(Z, hh), Z)
    # grass density: inland, off paths/zones, not sand
    gd = (1 - smooth(-5.5, -4.2, d)) * smooth(1.0, 1.6, pd) * (1 - zone(X, Y))
    for (cx, cy, rr) in [(18.4, 11.4, 6.0), (-6.5, 18.0, 5.2), (13.2, -11.4, 3.8), (-2.4, -18.4, 2.6)]:
        gd *= smooth(rr, rr + 1.0, np.hypot(X - cx, Y - cy))
    return xs, Z, gd

xs, HZ, GD = phys_grid()
n = len(xs)
# three.js space: x = bx, z = -by. Grid rows go along three z (= -by), so flip rows.
HZt = HZ[::-1, :].astype(np.float32)
GDt = (np.clip(GD[::-1, :], 0, 1) * 255).astype(np.uint8)
os.makedirs(os.path.join(OUT, 'world'), exist_ok=True)
with open(os.path.join(OUT, 'world', 'height.bin'), 'wb') as f:
    f.write(HZt.tobytes())
    f.write(GDt.tobytes())

def t3(x, y, z=0.0):
    return [round(x, 3), round(z, 3), round(-y, 3)]

layout = {
    'grid': {'n': int(n), 'min': -40.0, 'step': 0.5},
    'water': WATER,
    'terrainUV': {'min': -40.0, 'size': 80.0},
    'stations': {k: t3(x, y, gz(x, y) if k != 'pier' else PIER['z']) for k, (x, y) in ST.items()},
    'colliders': [(['c', *t3(c[1], c[2])[0::2], c[3]] if c[0] == 'c' else ['b', *t3(c[1], c[2])[0::2], c[3], c[4], -c[5]]) for c in COLLIDERS],
    'lights': [[*t3(x, y, z), col, s] for (x, y, z, col, s) in LIGHTS],
    'dyn': [[k, *t3(x, y, z), -rz] for (k, x, y, z, rz) in DYN],
    'spawn': t3(0, -0.5, 0.62),
    'paths': [[t3(float(a), float(b))[0::2] for a, b in pts[::3]] for pts, w in PATHS],
}
with open(os.path.join(OUT, 'world', 'layout.json'), 'w') as f:
    json.dump(layout, f)
print('layout written', len(COLLIDERS), 'colliders', len(LIGHTS), 'lights', len(DYN), 'dyn')

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'world.blend'))

# ---------------------------------------------------------------- look-dev or bake
FOFF = (8.5, -17.5, 16.5)
CAMS = {
    'follow': ((0, 2, 0.6), FOFF, 30),
    'overview': ((-1.5, 1.5, 0), (13.0, -40.0, 37.0), 34),
}
for k in (os.environ.get('CAMS') or '').split(','):
    if k in ST:
        x, y = ST[k]
        CAMS['st-' + k] = ((x, y + 1.5, 0.6), FOFF, 30)
if os.environ.get('ONLY'):
    CAMS = {k: v for k, v in CAMS.items() if k in os.environ['ONLY'].split(',')}

def render(name, cam, w, h, spp=96):
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = spp
    sc.cycles.use_denoising = True
    sc.render.filepath = os.path.join(WORK, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', sc.render.filepath)

if MODE == 'lookdev':
    wp = water_plane()
    for k, (t, off, fov) in CAMS.items():
        cam = camera(k, t, off, fov, 1440, 900)
        render('lookdev-' + k, cam, 1440, 900)
    sys.exit(0)

if MODE == 'bake':
    gpu_size_t, gpu_size_p = 2048, 2048
    # terrain colour+light atlas
    it = bpy.data.images.new('terrain_bake', gpu_size_t, gpu_size_t, float_buffer=True)
    lib.bake([terr], it, 'COMBINED', samples=int(os.environ.get('SPP', 160)))
    # props atlas
    lib.uv_smart([props], margin=0.0015)
    ip = bpy.data.images.new('props_bake', gpu_size_p, gpu_size_p, float_buffer=True)
    lib.bake([props], ip, 'COMBINED', samples=int(os.environ.get('SPP', 160)))
    # irradiance lightmap for moving things (light only, no albedo)
    il = bpy.data.images.new('light_bake', 512, 512, float_buffer=True)
    # sample the light at rover-body height so floors (plaza, pads, plinths) don't shadow the map
    terr.location.z += 0.55
    lib.bake([terr], il, 'DIFFUSE', samples=96, color=False)
    terr.location.z -= 0.55
    for img, name in ((it, 'terrain'), (ip, 'props'), (il, 'light')):
        img.filepath_raw = os.path.join(WORK, name + '.exr')
        img.file_format = 'OPEN_EXR'
        img.save()
    print('baked')
    # export meshes (geometry + bake UV only)
    for o in (terr, props):
        while len(o.data.color_attributes):
            o.data.color_attributes.remove(o.data.color_attributes[0])
        o.data.materials.clear()
    bpy.ops.object.select_all(action='DESELECT')
    terr.select_set(True)
    props.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, 'world.glb'), export_format='GLB', use_selection=True, export_materials='NONE', export_normals=False, export_texcoords=True, export_yup=True, export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'world-baked.blend'))
    print('exported')
