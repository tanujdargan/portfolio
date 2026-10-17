# W4/W5 Drive: the world. A single road from a city at golden hour, over a river, out past the edge of town, through
# a tunnel, up two hairpins, along an alpine lake to a summit overlook that looks back at the city.
#   SKYS=2.4 Blender -b --python public/drive/src/world.py -- [preview|bake]
# The road, city, bridge, tunnel, props and stations are modelled here. The mountains are real elevation (the Teton
# Range, USGS 3DEP via the AWS terrain tiles, turned and scaled 0.75). Lighting is baked with Cycles into vertex colours
# under the Poly Haven "Qwantani Sunset" HDRI with its sun clamped out (RGB: sky + lamp irradiance), plus a separate
# sun-only shadow pass (A); the runtime adds the sun per pixel with PBR textures. Trees and grass are exported as
# instances (trees.bin, grass.bin) with the baked light where each one stands.
# Coordinates: Blender Z-up metres. three.js gets (x, z, -y).
import bpy, bmesh, math, os, sys, json, random
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.kdtree import KDTree
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import hexcol, active, join

WORK = '/tmp/drive-blender'
os.makedirs(WORK, exist_ok=True)
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'preview'
random.seed(7)
np.random.seed(7)
lib.reset()
lib.gpu()
sc = bpy.context.scene

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# ================================================================ route
CTRL = np.array([
    (0, -90, 8), (0, 0, 8), (1, 130, 8), (0, 260, 8), (0, 360, 9.5),
    (0, 440, 15.5), (0, 520, 15.5), (0, 600, 9.5),
    (12, 690, 8.5), (70, 780, 9), (165, 845, 11), (275, 895, 14),
    (370, 960, 20), (432, 1050, 30), (468, 1150, 41), (484, 1250, 50),
    (494, 1340, 56), (510, 1420, 61),
    (565, 1490, 68), (640, 1525, 76), (684, 1566, 82),
    (670, 1614, 88), (612, 1630, 94), (480, 1646, 106), (395, 1668, 114),
    (357, 1706, 120), (382, 1748, 126), (470, 1764, 134), (620, 1792, 146), (760, 1832, 156),
    (880, 1880, 164), (1000, 1928, 168.5), (1118, 1998, 171), (1210, 2098, 176),
    (1262, 2218, 190), (1292, 2330, 206), (1302, 2450, 219), (1284, 2556, 228), (1236, 2612, 233), (1186, 2604, 236), (1156, 2570, 237), (1140, 2548, 237),
], float)

def catmull(P, n=40, alpha=0.5):
    out = []
    N = len(P)
    for i in range(N - 1):
        p0 = P[i - 1] if i > 0 else 2 * P[0] - P[1]
        p1, p2 = P[i], P[i + 1]
        p3 = P[i + 2] if i + 2 < N else 2 * P[-1] - P[-2]
        def tj(ti, a, b):
            return ti + max(np.linalg.norm(b - a), 1e-6) ** alpha
        t0 = 0.0
        t1 = tj(t0, p0, p1)
        t2 = tj(t1, p1, p2)
        t3 = tj(t2, p2, p3)
        for t in np.linspace(t1, t2, n, endpoint=False):
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    out.append(P[-1])
    return np.array(out)

def resample(P, ds):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    s = np.arange(0, d[-1], ds)
    Q = np.stack([np.interp(s, d, P[:, k]) for k in range(3)], axis=1)
    return Q, s

dense = catmull(CTRL)
# heights: smooth the profile so grades change gently
RP, RS = resample(dense, 1.0)
for _ in range(40):
    RP[1:-1, 2] = 0.25 * RP[:-2, 2] + 0.5 * RP[1:-1, 2] + 0.25 * RP[2:, 2]
NR = len(RP)
LEN = RS[-1]
T = np.gradient(RP, axis=0)
T /= np.linalg.norm(T, axis=1, keepdims=True)
TH = T.copy()
TH[:, 2] = 0
TH /= np.linalg.norm(TH, axis=1, keepdims=True)
LEFT = np.stack([-TH[:, 1], TH[:, 0], np.zeros(NR)], axis=1)
# signed curvature (for banking and the speed limit)
hd = np.arctan2(TH[:, 1], TH[:, 0])
dh = np.unwrap(hd)
CURV = np.gradient(dh) / 1.0
for _ in range(10):
    CURV[1:-1] = 0.25 * CURV[:-2] + 0.5 * CURV[1:-1] + 0.25 * CURV[2:]

def s_at(x, y):
    i = int(np.argmin((RP[:, 0] - x) ** 2 + (RP[:, 1] - y) ** 2))
    return RS[i]

def idx(s):
    return int(np.clip(round(s), 0, NR - 1))

# zones along the route (metres of arc length)
S_BRIDGE = (s_at(0, 385), s_at(0, 575))
S_CITY_END = s_at(70, 780)
S_TUNNEL = (s_at(488, 1262), s_at(506, 1398))
print('ROUTE length %.0f m, bridge %s, tunnel %s' % (LEN, S_BRIDGE, S_TUNNEL))

# road cross-sections: half width of the paved surface
def half_width(s):
    return 10.5 - 5.9 * smoothstep(S_CITY_END, S_CITY_END + 120, s)

# ================================================================ terrain height
LAKE_C = np.array([930.0, 2150.0])
LAKE_R = 230.0
WATER = 163.0
RIVER_Y = 478.0
OVERLOOK = RP[-1]
CITY_P = np.array([0.0, 300.0, 8.0])
PEAKS = [(420, 3350, 1050, 1300), (1450, 3100, 880, 1000), (-200, 3100, 760, 1000), (-1350, 2050, 900, 1100),
         (-1500, 900, 620, 900), (2500, 2100, 820, 1100), (2350, 3600, 980, 1300), (900, 3900, 900, 1200)]

def nz2(X, Y, f, seed=0.0, octaves=1):
    out = np.zeros(X.shape)
    amp = 1.0
    for o in range(octaves):
        it = np.nditer([X, Y], flags=['multi_index'])
        layer = np.zeros(X.shape)
        for x, y in it:
            layer[it.multi_index] = noise.noise(Vector((float(x) * f, float(y) * f, seed + o * 17.3)))
        out += layer * amp
        amp *= 0.5
        f *= 2.0
    return out

def ridged(X, Y, f, seed, octaves=5):
    out = np.zeros(X.shape)
    amp, w = 1.0, np.ones(X.shape)
    flat = np.stack([X.ravel(), Y.ravel()], axis=1)
    for o in range(octaves):
        v = np.array([noise.noise(Vector((x * f, y * f, seed + o * 7.1))) for x, y in flat]).reshape(X.shape)
        v = 1.0 - np.abs(v)
        v = v * v * w
        w = np.clip(v * 2.0, 0, 1)
        out += v * amp
        amp *= 0.5
        f *= 2.0
    return out

def fbm(X, Y, f, seed, octaves=4):
    flat = np.stack([X.ravel(), Y.ravel()], axis=1)
    out = np.zeros(len(flat))
    amp = 1.0
    for o in range(octaves):
        out += amp * np.array([noise.noise(Vector((x * f, y * f, seed + o * 3.7))) for x, y in flat])
        amp *= 0.5
        f *= 2.0
    return out.reshape(X.shape)

# Real mountains: the Teton Range from USGS 3DEP elevation (public domain, via the AWS terrain tiles), turned so the
# range rises north of the route and Jackson Hole's flat floor carries the valley. Relief scaled to 0.75.
DEM = np.load(os.environ.get('DEM', '/tmp/drive-blender/dem.npy'))
DEM_PX, DEM_C0, DEM_R0, DEM_FLOOR, DEM_S = 27.6, 878.0, 668.0, 2063.0, 0.75

def dem(X, Y):
    col = np.clip(DEM_C0 - Y / DEM_PX, 0, DEM.shape[1] - 1.001)
    row = np.clip(DEM_R0 - X / DEM_PX, 0, DEM.shape[0] - 1.001)
    c0 = np.floor(col).astype(int)
    r0 = np.floor(row).astype(int)
    fc = col - c0
    fr = row - r0
    h = (DEM[r0, c0] * (1 - fc) * (1 - fr) + DEM[r0, c0 + 1] * fc * (1 - fr) + DEM[r0 + 1, c0] * (1 - fc) * fr + DEM[r0 + 1, c0 + 1] * fc * fr)
    return (h - DEM_FLOOR) * DEM_S

def natural(X, Y):
    """terrain before the road is cut in: a valley climbing north from the city, a foothill ridge, an alpine lake,
    and the real range behind it"""
    base = np.interp(Y, [-2000, 700, 1000, 1400, 1850, 2200, 2600, 4000], [8, 8, 22, 58, 150, 172, 205, 260])
    hills = 9 * fbm(X, Y, 1 / 260, 1.0, 3) * smoothstep(650, 1000, Y)
    d = dem(X, Y)
    h = base + hills + np.clip(d, 0, None) + np.clip(d, -60, 0) * 0.25
    h += 3 * fbm(X, Y, 1 / 70, 9.0, 2) * smoothstep(800, 1200, Y)
    # foothill ridge the road tunnels through
    rd = np.abs((Y - 1336) + 0.1 * (X - 494))
    h = np.maximum(h, 112 - rd * 0.55 - np.abs(X - 494) * 0.08 + 8 * fbm(X, Y, 1 / 120, 5.0, 2))
    # city plain and the river valley
    city = smoothstep(-650, -350, X) * smoothstep(650, 380, X) * smoothstep(780, 640, Y) * smoothstep(-700, -500, Y)
    h = h * (1 - city) + 8 * city
    riv = smoothstep(95, 55, np.abs(Y - RIVER_Y - 30 * np.sin(X / 260)))
    h = h * (1 - riv) - 4 * riv
    # alpine lake bowl
    ld = np.hypot(X - LAKE_C[0], Y - LAKE_C[1]) / LAKE_R
    ld = ld + 0.12 * fbm(X, Y, 1 / 120, 4.0, 2)
    h = np.where(ld < 1.0, np.minimum(h, WATER - 18 * (1 - ld)), np.minimum(h, WATER - 2 + (ld - 1) * 600))
    h = np.where(ld < 1.3, np.maximum(h, WATER - 18), h)
    return h

def view_clamp(X, Y, H):
    """keep the line of sight from the overlook down to the city open (a notch through the foothills)"""
    a = OVERLOOK[:2]
    ab = CITY_P[:2] - a
    t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / (ab @ ab), 0, 1)
    d = np.hypot(X - (a[0] + t * ab[0]), Y - (a[1] + t * ab[1]))
    line = (OVERLOOK[2] - 3) + ((CITY_P[2] + 40) - (OVERLOOK[2] - 3)) * t
    cap = line - 10 + d * 0.45
    w = smoothstep(0.03, 0.12, t) * smoothstep(0.97, 0.85, t)
    return np.where(w > 0, H * (1 - w) + np.minimum(H, cap) * w, H)

# nearest-route lookup
KD = KDTree(NR)
for i, p in enumerate(RP):
    KD.insert((p[0], p[1], 0), i)
KD.balance()

def nearest(X, Y):
    flat = np.stack([X.ravel(), Y.ravel()], axis=1)
    I = np.empty(len(flat), int)
    D = np.empty(len(flat))
    for k, (x, y) in enumerate(flat):
        co, i, d = KD.find((x, y, 0))
        I[k] = i
        D[k] = d
    return D.reshape(X.shape), I.reshape(X.shape)

def overlook_drop(X, Y, H):
    """the overlook is an edge: beyond a 14 m apron the ground falls away toward the city"""
    o = RP[-1]
    v = CITY_P[:2] - o[:2]
    v = v / np.linalg.norm(v)
    dx, dy = X - o[0], Y - o[1]
    d = np.hypot(dx, dy)
    cosang = (dx * v[0] + dy * v[1]) / np.maximum(d, 1e-3)
    cone = smoothstep(0.15, 0.55, cosang) * smoothstep(420, 260, d)
    cap = np.maximum(o[2] - 1.0 - np.clip(d - 14, 0, None) * 1.1, WATER + 4)
    return np.where(cone > 0, H * (1 - cone) + np.minimum(H, cap) * cone, H)

def road_blend(H, D, I):
    """cut and fill: flatten under the road, blend to the natural ground; leave the bridge span and tunnel alone"""
    S = RS[I]
    hw = half_width(S)
    rz = RP[I, 2] - 0.35
    # hillsides, not canyons: within ~400 m the ground stays within a cut/fill slope of the road
    lim = np.clip(H, rz - 0.55 * D, rz + 3 + 0.42 * D)
    k = smoothstep(450, 250, D)
    near_t = (S > S_TUNNEL[0] - 70) & (S < S_TUNNEL[1] + 70)
    k = np.where(near_t, 0.0, k)
    H = H * (1 - k) + lim * k
    w = smoothstep(hw + 2.5, hw + 26, D)
    out = rz * (1 - w) + H * w
    bridge = (S > S_BRIDGE[0] + 12) & (S < S_BRIDGE[1] - 12)
    tunnel = (S > S_TUNNEL[0] + 10) & (S < S_TUNNEL[1] - 10)
    out = np.where(bridge, H, out)
    out = np.where(tunnel, np.maximum(H, rz + 16), out)
    return out

def height(X, Y, near=None):
    H = natural(X, Y)
    H = view_clamp(X, Y, H)
    H = overlook_drop(X, Y, H)
    D, I = near if near is not None else nearest(X, Y)
    return road_blend(H, D, I)

# ================================================================ terrain mesh
def grid(x0, x1, y0, y1, step):
    xs = np.arange(x0, x1 + 1e-6, step)
    ys = np.arange(y0, y1 + 1e-6, step)
    X, Y = np.meshgrid(xs, ys)
    return X, Y

if MODE == 'heights':
    import time
    t = time.time()
    X, Y = grid(-1400, 2600, -900, 3700, 40)
    H = height(X, Y)
    print('HEIGHTS', X.shape, '%.1fs' % (time.time() - t), H.min(), H.max())
    # quick top-down shaded map as a PNG
    gy, gx = np.gradient(H, 40)
    shade = np.clip(0.6 + (gx * 0.5 - gy * 0.5) * 0.02, 0, 1)
    img = bpy.data.images.new('map', H.shape[1], H.shape[0])
    col = np.zeros((H.shape[0], H.shape[1], 4))
    hn = (H - H.min()) / (H.max() - H.min())
    col[..., 0] = shade * (0.3 + 0.7 * hn)
    col[..., 1] = shade * (0.35 + 0.5 * hn)
    col[..., 2] = shade * (0.3 + 0.4 * hn)
    col[H < WATER - 0.5, :3] = (0.1, 0.2, 0.35)
    col[..., 3] = 1
    for p in RP[::2]:
        i = int((p[1] + 900) / 40)
        j = int((p[0] + 1400) / 40)
        if 0 <= i < H.shape[0] and 0 <= j < H.shape[1]:
            col[i, j, :3] = (1, 0.3, 0.2)
    img.pixels = col.ravel()
    img.filepath_raw = os.path.join(WORK, 'map.png')
    img.file_format = 'PNG'
    img.save()

# ================================================================ materials (albedo; lighting is baked)
MATS = {}
def wmat(name, col, rough=0.9, emit=None, es=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexcol(col), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.2
    if emit:
        b.inputs['Emission Color'].default_value = (*hexcol(emit), 1)
        b.inputs['Emission Strength'].default_value = es
    MATS[name] = m
    return m

def vcol_mat(name='terrain'):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'alb'
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    b.inputs['Specular IOR Level'].default_value = 0.15
    MATS[name] = m
    return m

def lin(hexs):
    return np.array(hexcol(hexs))

PAL = dict(
    city=lin('#2a2b30'), meadow=lin('#3f5232'), forest=lin('#26352a'), field=lin('#4d4a33'),
    rock=lin('#6b6660'), cliff=lin('#4b4844'), snow=lin('#eef1f6'), shore=lin('#6e6656'),
    mud=lin('#35302b'), gravel=lin('#57524b'), lakebed=lin('#1e2a2c'),
)

def albedo(X, Y, H, slope, D, I):
    n1 = fbm(X, Y, 1 / 90, 21.0, 2)
    n2 = fbm(X, Y, 1 / 400, 33.0, 2)
    c = np.zeros(X.shape + (3,))
    meadow = np.clip(0.5 + 0.9 * n1 + 0.6 * n2, 0, 1)[..., None]
    c[:] = PAL['forest'] * (1 - meadow) + PAL['meadow'] * meadow
    lowfield = (smoothstep(350, 650, Y) * smoothstep(1100, 800, Y))[..., None] * np.clip(0.5 + n2, 0, 1)[..., None]
    c = c * (1 - lowfield) + PAL['field'] * lowfield
    rk = smoothstep(28, 42, slope + 8 * n1)[..., None]
    c = c * (1 - rk) + PAL['rock'] * rk
    hi = smoothstep(520, 680, H + 60 * n1)[..., None]
    c = c * (1 - hi) + PAL['cliff'] * hi
    sn = (smoothstep(560 + 80 * n2, 660 + 80 * n2, H) * smoothstep(48, 30, slope))[..., None]
    c = c * (1 - sn) + PAL['snow'] * sn
    sn2 = smoothstep(820, 900, H)[..., None] * 0.7
    c = c * (1 - sn2) + PAL['snow'] * sn2
    city = (smoothstep(-650, -350, X) * smoothstep(650, 380, X) * smoothstep(780, 640, Y) * smoothstep(-700, -500, Y))[..., None]
    c = c * (1 - city) + PAL['city'] * city
    sh = smoothstep(WATER + 3, WATER + 0.5, H)[..., None] * smoothstep(WATER - 3, WATER - 0.5, H)[..., None]
    c = c * (1 - sh) + PAL['shore'] * sh
    bed = smoothstep(WATER - 1, WATER - 4, H)[..., None]
    c = c * (1 - bed) + PAL['lakebed'] * bed
    riv = smoothstep(14, 4, H)[..., None] * (1 - city)
    c = c * (1 - riv) + PAL['mud'] * riv
    S = RS[I]
    gr = smoothstep(half_width(S) + 6, half_width(S) + 2, D)[..., None]
    c = c * (1 - gr) + PAL['gravel'] * gr
    return c

def zones(X, Y, H, D, I):
    """per-vertex masks for the runtime splat: u = made ground (gravel shoulders, the city), v = wet shore"""
    S = RS[np.clip(I, 0, NR - 1)]
    gravel = smoothstep(half_width(S) + 7, half_width(S) + 2.5, D) * smoothstep(3.5, 1.2, np.abs(H - RP[np.clip(I, 0, NR - 1), 2]))
    city = smoothstep(-650, -350, X) * smoothstep(650, 380, X) * smoothstep(780, 640, Y) * smoothstep(-700, -500, Y)
    shore = smoothstep(WATER + 3.5, WATER + 0.3, H) * (H > WATER - 30)
    riv = smoothstep(14, 4, H) * (1 - city)
    return np.clip(np.maximum(gravel, city), 0, 1), np.clip(np.maximum(shore, riv), 0, 1)

def set_zone_uv(o, zu, zv):
    me = o.data
    uv = me.uv_layers.new(name='zone')
    li = np.zeros(len(me.loops), np.int32)
    me.loops.foreach_get('vertex_index', li)
    a = np.stack([zu.ravel()[li], zv.ravel()[li]], axis=1).astype(np.float32)
    uv.data.foreach_set('uv', a.ravel())

def mesh_from_grid(name, X, Y, H, col, mats):
    ny, nx = X.shape
    verts = np.stack([X.ravel(), Y.ravel(), H.ravel()], axis=1)
    ii = np.arange(ny * nx).reshape(ny, nx)
    q = np.stack([ii[:-1, :-1].ravel(), ii[:-1, 1:].ravel(), ii[1:, 1:].ravel(), ii[1:, :-1].ravel()], axis=1)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(q.size)
    me.loops.foreach_set('vertex_index', q.ravel().astype(np.int32))
    me.polygons.add(len(q))
    me.polygons.foreach_set('loop_start', (np.arange(len(q)) * 4).astype(np.int32))
    me.update()
    me.validate()
    ca = me.color_attributes.new('alb', 'FLOAT_COLOR', 'POINT')
    c4 = np.concatenate([col.reshape(-1, 3), np.ones((ny * nx, 1))], axis=1).astype(np.float32)
    ca.data.foreach_set('color', c4.ravel())
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    for m in mats:
        me.materials.append(m)
    return o

STEP = float(os.environ.get('STEP', 8))
NEAR = (-800, 1700, -450, 2900)

def terrain_far():
    """the ranges beyond the near ground: a 30 m grid with a hole where the near mesh is, tucked 3 m under at the seam"""
    st = 40.0
    X, Y = grid(-6500, 7500, -3500, 11500, st)
    D = np.full(X.shape, 1e4)
    I = np.zeros(X.shape, int)
    H = natural(X, Y)
    inside = (X > NEAR[0] + 120) & (X < NEAR[1] - 120) & (Y > NEAR[2] + 120) & (Y < NEAR[3] - 120)
    seam = (X > NEAR[0] - 60) & (X < NEAR[1] + 60) & (Y > NEAR[2] - 60) & (Y < NEAR[3] + 60)
    H = np.where(seam, H - 3, H)
    gy, gx = np.gradient(H, st)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    col = albedo(X, Y, H, slope, D, I)
    o = mesh_from_grid('terrain_far', X, Y, H, col, [vcol_mat()])
    set_zone_uv(o, np.zeros(X.shape), smoothstep(WATER + 3.5, WATER + 0.3, H) * (H > WATER - 30))
    # drop the faces fully inside the near domain
    bm = bmesh.new()
    bm.from_mesh(o.data)
    kill = [f for f in bm.faces if all(NEAR[0] + 120 < v.co.x < NEAR[1] - 120 and NEAR[2] + 120 < v.co.y < NEAR[3] - 120 for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    md = o.modifiers.new('dec', 'DECIMATE')
    md.ratio = 0.33
    active(o)
    bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()
    print('FAR verts', len(o.data.vertices))
    return o

def terrain_near():
    import time
    t = time.time()
    X, Y = grid(*NEAR, STEP)
    D, I = nearest(X, Y)
    H = height(X, Y, (D, I))
    gy, gx = np.gradient(H, STEP)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    col = albedo(X, Y, H, slope, D, I)
    print('TERRAIN grid', X.shape, '%.1fs' % (time.time() - t))
    o = mesh_from_grid('terrain', X, Y, H, col, [vcol_mat()])
    set_zone_uv(o, *zones(X, Y, H, D, I))
    # keep detail near the road and in the view, collapse the far flanks
    vg = o.vertex_groups.new(name='keep')
    w = 0.3 + 0.7 * np.clip(1.0 - (D.ravel() - 30) / 400, 0.0, 1.0) ** 1.5
    for k in np.unique(np.round(w, 2)):
        ids = np.where(np.round(w, 2) == k)[0].tolist()
        vg.add(ids, float(k), 'REPLACE')
    md = o.modifiers.new('dec', 'DECIMATE')
    md.ratio = float(os.environ.get('DEC', 0.3))
    md.vertex_group = 'keep'
    md.vertex_group_factor = 8.0
    md.invert_vertex_group = True
    active(o)
    bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()
    print('TERRAIN verts', len(o.data.vertices), '%.1fs' % (time.time() - t))
    return o

# ================================================================ road
ROAD_STEP = 2

def road():
    ids = list(range(0, NR, ROAD_STEP))
    if ids[-1] != NR - 1:
        ids.append(NR - 1)
    nroad = 9
    verts, uvs, prof_m = [], [], []
    sections = []
    for i in ids:
        s = RS[i]
        hw = float(half_width(s))
        city = 1 - float(smoothstep(S_CITY_END, S_CITY_END + 120, s))
        bank = float(np.clip(-CURV[i] * 2.0, -0.07, 0.07))
        side = []
        # (lateral offset, height, u, kind)
        outer_h = 0.15 * city - 0.14 * (1 - city)
        skirt = [(-(hw + 3.2), -2.2, 0, 'skirt'), (-(hw + 3.0), outer_h, 0, 'shoulder'), (-(hw + 0.15), 0.15 * city, 0, 'edge'), (-hw, 0.0, 0, 'edge')]
        road_pts = [(-hw + 2 * hw * k / (nroad - 1), 0.0, k / (nroad - 1), 'road') for k in range(nroad)]
        prof = skirt + road_pts + [(-o, h, 1 - u, kd) for (o, h, u, kd) in reversed(skirt)]
        sec = []
        for (o, h, u, kd) in prof:
            p = RP[i] + LEFT[i] * o
            z = p[2] + h + bank * o
            sec.append((p[0], p[1], z, u, s / 12.0 / 400.0, kd, city))
        sections.append(sec)
    np_ = len(sections[0])
    V = []
    for sec in sections:
        V += [(x, y, z) for (x, y, z, *_r) in sec]
    faces, mi, fuv = [], [], []
    for j in range(len(sections) - 1):
        for k in range(np_ - 1):
            a = j * np_ + k
            b = a + 1
            c = b + np_
            d = a + np_
            faces.append((a, d, c, b))
            ka, kb = sections[j][k][5], sections[j][k + 1][5]
            city = sections[j][k][6]
            if ka == 'road' and kb == 'road':
                m = 0 if city > 0.5 else 1
            elif 'edge' in (ka, kb) and city > 0.5:
                m = 2  # kerb
            elif city > 0.5:
                m = 2  # pavement
            else:
                m = 3  # gravel shoulder
            mi.append(m)
            fuv.append([(sections[j][k][3], sections[j][k][4]), (sections[j + 1][k][3], sections[j + 1][k][4]), (sections[j + 1][k + 1][3], sections[j + 1][k + 1][4]), (sections[j][k + 1][3], sections[j][k + 1][4])])
    me = bpy.data.meshes.new('road')
    me.from_pydata(V, [], faces)
    me.update()
    for m in (wmat('road_city', '#2b2d32', 0.6), wmat('road_mtn', '#2e2f33', 0.7), wmat('concrete', '#6d6b67'), wmat('gravel', '#55504a')):
        me.materials.append(m)
    me.polygons.foreach_set('material_index', mi)
    uv = me.uv_layers.new(name='UVMap')
    for poly, fu in zip(me.polygons, fuv):
        for li, u in zip(poly.loop_indices, fu):
            uv.data[li].uv = u
    o = bpy.data.objects.new('road', me)
    sc.collection.objects.link(o)
    active(o)
    bpy.ops.object.shade_smooth()
    return o

# ================================================================ mesh builder
class MB:
    """accumulates quads/tris per material slot; one object at the end"""
    def __init__(self, name, mats):
        self.name = name
        self.mats = mats
        self.V, self.F, self.M, self.UV = [], [], [], []

    def add(self, verts, faces, m=0, uvs=None):
        b = len(self.V)
        self.V += [tuple(v) for v in verts]
        for k, f in enumerate(faces):
            self.F.append(tuple(b + i for i in f))
            self.M.append(m)
            self.UV.append(uvs[k] if uvs else None)

    def box(self, c, size, m=0, rz=0.0, uvscale=None, uvoff=(0, 0)):
        """axis box (rotated about z) with outward faces; facade UVs in metres/uvscale"""
        cx, cy, cz = c
        sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
        cs, sn = math.cos(rz), math.sin(rz)
        P = []
        for (x, y, z) in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)):
            lx, ly = x * sx, y * sy
            P.append((cx + lx * cs - ly * sn, cy + lx * sn + ly * cs, cz + z * sz))
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        uvs = None
        if uvscale:
            us, vs = uvscale
            w = [2 * sx, 2 * sy, 2 * sx, 2 * sy]
            z0, z1 = cz - sz, cz + sz
            uvs = [[(0, 0)] * 4, [(0, 0)] * 4]
            acc = 0.0
            for k in range(4):
                u0, u1 = (acc + uvoff[0]) / us / 16, (acc + w[k] + uvoff[0]) / us / 16
                v0, v1 = (z0 + uvoff[1]) / vs / 16, (z1 + uvoff[1]) / vs / 16
                uvs.append([(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
                acc += w[k]
        self.add(P, faces, m, uvs)

    def prism(self, base_pts, z0, z1, m=0, top=True):
        n = len(base_pts)
        V = [(x, y, z0) for (x, y) in base_pts] + [(x, y, z1) for (x, y) in base_pts]
        F = [tuple(range(n))[::-1]] if top else []
        if top:
            F.append(tuple(range(n, 2 * n)))
        for i in range(n):
            j = (i + 1) % n
            F.append((i, j, n + j, n + i))
        self.add(V, F, m)

    def tube(self, pts, r, m=0, segs=8):
        """a round section swept along a polyline"""
        pts = [Vector(p) for p in pts]
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = t.orthogonal().normalized()
            b = t.cross(a)
            rings.append([p + (a * math.cos(2 * math.pi * k / segs) + b * math.sin(2 * math.pi * k / segs)) * r for k in range(segs)])
        V = [v for ring in rings for v in ring]
        F = []
        for i in range(len(rings) - 1):
            for k in range(segs):
                k2 = (k + 1) % segs
                F.append((i * segs + k, i * segs + k2, (i + 1) * segs + k2, (i + 1) * segs + k))
        self.add(V, F, m)

    def sweep(self, prof, ids, m=0, mi_of=None, closed=False, vscale=None):
        """sweep a (lateral, up) profile along route samples ids (left-positive lateral)"""
        n = len(prof)
        V, F, UV = [], [], []
        for i in ids:
            for (o, h) in prof:
                p = RP[i] + LEFT[i] * o
                V.append((p[0], p[1], p[2] + h))
        for j in range(len(ids) - 1):
            for k in range(n - (0 if closed else 1)):
                k2 = (k + 1) % n
                F.append((j * n + k, j * n + k2, (j + 1) * n + k2, (j + 1) * n + k))
        self.add(V, F, m)

    def build(self, smooth_angle=35, bevel=0.0, segs=2):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.V, [], self.F)
        me.update()
        for m in self.mats:
            me.materials.append(m)
        me.polygons.foreach_set('material_index', self.M)
        if any(u is not None for u in self.UV):
            uv = me.uv_layers.new(name='UVMap')
            for poly, fu in zip(me.polygons, self.UV):
                if fu is None:
                    continue
                for li, u in zip(poly.loop_indices, fu):
                    uv.data[li].uv = u
        o = bpy.data.objects.new(self.name, me)
        sc.collection.objects.link(o)
        active(o)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.001)
        bpy.ops.object.mode_set(mode='OBJECT')
        if bevel:
            md = o.modifiers.new('b', 'BEVEL')
            md.width = bevel
            md.segments = segs
            md.limit_method = 'ANGLE'
            md.angle_limit = math.radians(50)
            md.use_clamp_overlap = True
            md.harden_normals = False
            bpy.ops.object.modifier_apply(modifier='b')
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth_angle))
        return o

LIGHTS = []   # (x, y, z, kind) -> baked point lights + runtime glow sprites
def light(p, kind):
    LIGHTS.append((float(p[0]), float(p[1]), float(p[2]), kind))

# ================================================================ city
def road_clear(x, y, margin):
    co, i, d = KD.find((x, y, 0))
    return d > float(half_width(RS[i])) + margin

def city():
    mats = [wmat('facade_glass', '#27303d', 0.4), wmat('facade_stone', '#4b4741'), wmat('roof', '#2f3136'), wmat('metal', '#7d838b', 0.5), wmat('concrete', '#6d6b67')]
    mb = MB('city', mats)
    global MBX
    MBX = MB('cityx', mats)
    rng = random.Random(4)
    n = 0
    for bx in np.arange(-640, 520, 64):
        for by in np.arange(-560, 760, 72):
            if RIVER_Y - 120 < by < RIVER_Y + 90:
                continue
            # lots inside each block
            lots = [(bx + 4, by + 4, 56, 64)]
            if rng.random() < 0.55:
                lots = [(bx + 4, by + 4, 26, 64), (bx + 34, by + 4, 26, 64)]
            for (lx, ly, lw, ld) in lots:
                for _ in range(2 if rng.random() < 0.4 else 1):
                    w = rng.uniform(16, lw)
                    d = rng.uniform(16, min(ld, 46))
                    cx = lx + rng.uniform(w / 2, lw - w / 2 + 0.01)
                    cy = ly + rng.uniform(d / 2, ld - d / 2 + 0.01)
                    if not road_clear(cx, cy, max(w, d) * 0.72 + 6):
                        continue
                    if any(math.hypot(cx - kx, cy - ky) < kr + max(w, d) * 0.7 for (kx, ky, kr) in KEEPOUT):
                        continue
                    r = math.hypot(cx * 0.9, (cy - 160) * 0.8)
                    north = cy > RIVER_Y
                    core = math.exp(-(r / 300) ** 2)
                    h = 12 + (170 if not north else 30) * core * rng.uniform(0.45, 1.0) + rng.uniform(0, 26 if not north else 10)
                    if north and cy > 700:
                        h *= 0.5
                    if math.hypot(cx, cy) > 900:
                        continue
                    tower(mb, cx, cy, w, d, h, rng)
                    n += 1
    # overpasses across the freeway
    for yy in (130, 300):
        i = int(np.argmin(np.abs(RP[:, 1] - yy) + np.abs(RP[:, 0]) * 0.1))
        p = RP[i]
        mb.box((p[0], p[1], p[2] + 7.4), (60, 13, 1.2), 4)
        mb.box((p[0], p[1], p[2] + 8.4), (60, 0.3, 1.0), 3)
        for sgn in (1, -1):
            mb.box((p[0] + sgn * 24, p[1], p[2] + 3.5), (2.2, 9, 7), 4)
            mb.box((p[0], p[1] + sgn * 6.3, p[2] + 8.5), (60, 0.25, 1.0), 3)
    print('CITY buildings', n)
    return [mb.build(bevel=0.14, segs=1), MBX.build()]

def tower(mb, cx, cy, w, d, h, rng):
    rz = 0.0
    glass = rng.random() < 0.6
    m = 0 if glass else 1
    z = 8.0
    uo = (rng.randrange(0, 16) * 3.2, rng.randrange(0, 8) * 3.6)
    tiers = 1 if h < 50 else rng.choice([1, 2, 2, 3])
    ww, dd, hh = w, d, h
    for t in range(tiers):
        th = hh * (0.62 if t < tiers - 1 else 1.0) if tiers > 1 else hh
        if t == tiers - 1:
            th = h - (z - 8.0)
        mb.box((cx, cy, z + th / 2), (ww, dd, th), m, rz, uvscale=(3.2 * 16, 3.6 * 16), uvoff=uo)
        # parapet
        MBX.box((cx, cy, z + th + 0.6), (ww + 0.6, dd + 0.6, 1.2), 2)
        z += th
        ww *= rng.uniform(0.62, 0.82)
        dd *= rng.uniform(0.62, 0.82)
        if z - 8 >= h - 1:
            break
    top = z
    # roof furniture
    for _ in range(rng.randint(1, 3)):
        MBX.box((cx + rng.uniform(-ww / 3, ww / 3), cy + rng.uniform(-dd / 3, dd / 3), top + 1.6), (rng.uniform(3, 7), rng.uniform(3, 7), rng.uniform(2, 3.5)), 3)
    if h > 90 and rng.random() < 0.7:
        MBX.box((cx, cy, top + 9), (0.6, 0.6, 18), 3)
        light((cx, cy, top + 18.4), 'red')
    elif h > 60 and rng.random() < 0.5:
        mb.box((cx, cy, top + 3), (ww * 0.5, dd * 0.5, 6), 2)

def freeway():
    mats = [wmat('concrete', '#6d6b67'), wmat('metal', '#7d838b', 0.5), wmat('lamp', '#fff1d8', 0.3, emit='#ffb469', es=30.0)]
    mb = MB('freeway', mats)
    s_end = S_CITY_END
    ids = [i for i in range(0, int(s_end) + 1, 2)]
    # median jersey barrier (not on the bridge deck, which has its own)
    seg = [i for i in ids if not (S_BRIDGE[0] - 5 < RS[i] < S_BRIDGE[1] + 5)]
    for run in runs(seg):
        mb.sweep([(-0.3, 0.0), (-0.12, 0.25), (-0.1, 0.95), (0.1, 0.95), (0.12, 0.25), (0.3, 0.0)], run, 0)
    # median lamp posts with twin arms
    for s0 in np.arange(20, s_end, 36.0):
        i = idx(s0)
        p = RP[i]
        mb.box((p[0], p[1], p[2] + 5.5), (0.35, 0.35, 11), 1)
        for sgn in (1, -1):
            a = p + LEFT[i] * sgn * 2.6
            mb.box(((p[0] + a[0]) / 2, (p[1] + a[1]) / 2, p[2] + 10.9), (0.18 + abs(LEFT[i][0]) * 2.6, 0.18 + abs(LEFT[i][1]) * 2.6, 0.18), 1)
            q = p + LEFT[i] * sgn * 3.0
            mb.box((q[0], q[1], q[2] + 10.75), (1.1, 1.1, 0.25), 1, rz=math.atan2(TH[i][1], TH[i][0]))
            mb.box((q[0], q[1], q[2] + 10.6), (0.9, 0.9, 0.06), 2, rz=math.atan2(TH[i][1], TH[i][0]))
            light((q[0], q[1], q[2] + 10.4), 'sodium')
    return mb.build(bevel=0.03)

def runs(ids):
    out, cur = [], []
    for i in ids:
        if cur and i - cur[-1] > 3:
            out.append(cur)
            cur = []
        cur.append(i)
    if len(cur) > 1:
        out.append(cur)
    return out

# ================================================================ bridge
def bridge():
    mats = [wmat('concrete', '#6d6b67'), wmat('metal', '#7d838b', 0.5), wmat('cable', '#c9d2dc', 0.4), wmat('lamp', '#fff1d8', 0.3, emit='#ffb469', es=30.0), wmat('tower', '#8a8781')]
    mb = MB('bridge', mats)
    a, b = S_BRIDGE[0] - 6, S_BRIDGE[1] + 6
    ids = list(range(int(a), int(b) + 1, 2))
    hw = 10.5
    # box girder under the deck, edge beams, parapets with a rail, median barrier
    mb.sweep([(hw + 3.4, 0.2), (hw + 3.4, -0.9), (hw - 1.0, -2.8), (-hw + 1.0, -2.8), (-hw - 3.4, -0.9), (-hw - 3.4, 0.2)], ids, 0)
    for sgn in (1, -1):
        o = sgn * (hw + 3.2)
        mb.sweep([(o - 0.25, 0.1), (o - 0.25, 1.05), (o + 0.25, 1.05), (o + 0.25, 0.1)], ids, 0)
        mb.sweep([(o - 0.06, 1.05), (o - 0.06, 1.35), (o + 0.06, 1.35), (o + 0.06, 1.05)], ids, 1)
    mb.sweep([(-0.3, 0.0), (-0.12, 0.25), (-0.1, 0.95), (0.1, 0.95), (0.12, 0.25), (0.3, 0.0)], ids, 0)
    # two H towers, cables fanning to the deck edges
    mid = (S_BRIDGE[0] + S_BRIDGE[1]) / 2
    for st in (mid - 48, mid + 48):
        i = idx(st)
        p = RP[i]
        top = p[2] + 78
        for sgn in (1, -1):
            leg = p + LEFT[i] * sgn * 15.5
            # tapered leg in three blocks
            for k, (z0, z1, wv) in enumerate(((-24, 20, 3.4), (20, 58, 2.8), (58, 78, 2.3))):
                mb.box((leg[0], leg[1], p[2] + (z0 + z1) / 2), (wv, wv * 1.4, z1 - z0), 4, rz=math.atan2(TH[i][1], TH[i][0]))
            light((leg[0], leg[1], top + 0.6), 'red')
        for zc in (22, 70):
            mb.box((p[0], p[1], p[2] + zc), (abs(LEFT[i][0]) * 31 + 2.4, abs(LEFT[i][1]) * 31 + 2.4, 2.6), 4)
        for sgn in (1, -1):
            leg = p + LEFT[i] * sgn * 15.5
            for k in range(1, 9):
                for dirn in (1, -1):
                    j = idx(st + dirn * k * 9.5)
                    q = RP[j] + LEFT[j] * sgn * (hw + 2.6)
                    t0 = Vector((leg[0], leg[1], top - 4 - k * 2.4))
                    t1 = Vector((q[0], q[1], q[2] + 0.6))
                    mb.tube([t0, t1], 0.16, 2, segs=5)
    # deck lamps
    for s0 in np.arange(a + 10, b, 36.0):
        i = idx(s0)
        p = RP[i]
        mb.box((p[0], p[1], p[2] + 5.5), (0.35, 0.35, 11), 1)
        for sgn in (1, -1):
            q = p + LEFT[i] * sgn * 3.0
            mb.box((q[0], q[1], q[2] + 10.75), (1.1, 1.1, 0.25), 1)
            mb.box((q[0], q[1], q[2] + 10.6), (0.9, 0.9, 0.06), 3)
            light((q[0], q[1], q[2] + 10.4), 'sodium')
    # piers into the river
    for st in np.arange(a + 30, b - 20, 46):
        i = idx(st)
        p = RP[i]
        mb.box((p[0], p[1], (p[2] - 3 - 4) / 2), (abs(LEFT[i][0]) * 14 + 3, abs(LEFT[i][1]) * 14 + 3, p[2] - 3 + 4), 0)
    return mb.build(bevel=0.05)

def water():
    """river and lake surfaces (runtime shades them; they bake nothing)"""
    mats = [wmat('water', '#0b1218', 0.05)]
    mb = MB('water', mats)
    xs = np.arange(-5000, 6001, 80)
    V, F = [], []
    for k, x in enumerate(xs):
        yc = RIVER_Y + 30 * math.sin(x / 260)
        V += [(x, yc - 95, 0.4), (x, yc + 95, 0.4)]
    for k in range(len(xs) - 1):
        F.append((2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1))
    mb.add(V, F, 0)
    n = 72
    V = [(LAKE_C[0], LAKE_C[1], WATER)] + [(LAKE_C[0] + 320 * math.cos(2 * math.pi * k / n), LAKE_C[1] + 320 * math.sin(2 * math.pi * k / n), WATER) for k in range(n)]
    F = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    mb.add(V, F, 0)
    o = mb.build()
    o.name = 'water'
    return o

# ================================================================ stations (arc length along the route)
ST = {}
def stations():
    ST['dock'] = 300.0
    ST['pad'] = S_CITY_END + 260
    ST['log'] = S_TUNNEL[0] - 4
    # the first hairpin: the tightest left turn after the tunnel
    a, b = int(S_TUNNEL[1]), int(S_TUNNEL[1] + 420)
    ST['hp1'] = float(RS[a + int(np.argmax(CURV[a:b]))])
    ST['model'] = ST['hp1'] - 46
    d = np.hypot(RP[:, 0] - LAKE_C[0], RP[:, 1] - LAKE_C[1])
    ST['pier'] = float(RS[int(np.argmin(d))])
    ST['board'] = float(LEN - 6)
    print('STATIONS', {k: round(v) for k, v in ST.items()})
KEEPOUT = []  # (x, y, r) no buildings

# ================================================================ trees (prototypes + instances)
def tree_protos():
    """two pines and a broadleaf, built far from the world and AO-baked into vertex colours"""
    mats = [wmat('bark', '#4a3a2e'), wmat('needles', '#24382c', 0.85), wmat('leaves', '#34442c', 0.85)]
    out = []
    rng = random.Random(3)
    for k, (tiers, H, R) in enumerate(((4, 13.0, 3.1), (5, 17.0, 3.4))):
        mb = MB(f'proto_pine{k}', mats)
        mb.box((0, 0, 1.5), (0.5, 0.5, 3.0), 0)
        for t in range(tiers):
            z0 = 2.2 + t * (H - 3) / tiers * 0.92
            r = R * (1 - t / (tiers + 0.6))
            z1 = z0 + (H - 2.2) / tiers * 1.55
            n = 9
            ring = [(r * math.cos(2 * math.pi * j / n + rng.uniform(-0.12, 0.12)), r * math.sin(2 * math.pi * j / n + rng.uniform(-0.12, 0.12)), z0 + rng.uniform(-0.2, 0.25)) for j in range(n)]
            inner = [(x * 0.25, y * 0.25, z0 + 0.6) for (x, y, _z) in ring]
            V = ring + inner + [(0, 0, z1)]
            F = [(j, (j + 1) % n, 2 * n) for j in range(n)]
            F += [((j + 1) % n, j, n + j, n + (j + 1) % n) for j in range(n)]
            mb.add(V, F, 1)
        out.append(mb.build(smooth_angle=60))
    mb = MB('proto_broad', mats)
    mb.box((0, 0, 2.2), (0.6, 0.6, 4.4), 0)
    for (x, y, z, r) in ((0, 0, 6.0, 3.0), (1.6, 0.6, 5.2, 2.2), (-1.3, -0.8, 5.4, 2.3), (0.3, -1.4, 7.2, 2.0)):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        for v in bm.verts:
            v.co *= 1 + 0.12 * noise.noise(v.co * 1.3 + Vector((x, y, z)))
            v.co.z *= 0.85
        V = [tuple(v.co + Vector((x, y, z))) for v in bm.verts]
        F = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        mb.add(V, F, 2)
    out.append(mb.build(smooth_angle=60))
    for o in out:
        o.location = (20000, 0, 0)
    return out

def place_trees(terr_fn):
    """forest on the slopes: never in the city, the water, on the road or above the tree line"""
    rng = np.random.default_rng(5)
    pts = []
    X = rng.uniform(NEAR[0], NEAR[1], 220000)
    Y = rng.uniform(NEAR[2], NEAR[3], 220000)
    keep = (Y > 640)
    X, Y = X[keep], Y[keep]
    dens = 0.55 + 0.6 * fbm(X.reshape(1, -1), Y.reshape(1, -1), 1 / 260, 41.0, 2)[0]
    keep = rng.random(len(X)) < np.clip(dens, 0, 1)
    X, Y = X[keep], Y[keep]
    D, I = nearest(X.reshape(1, -1), Y.reshape(1, -1))
    D, I = D[0], I[0]
    H = height(X.reshape(1, -1), Y.reshape(1, -1), (D.reshape(1, -1), I.reshape(1, -1)))[0]
    e = 3.0
    hx = (height((X + e).reshape(1, -1), Y.reshape(1, -1))[0] - height((X - e).reshape(1, -1), Y.reshape(1, -1))[0]) / (2 * e)
    hy = (height(X.reshape(1, -1), (Y + e).reshape(1, -1))[0] - height(X.reshape(1, -1), (Y - e).reshape(1, -1))[0]) / (2 * e)
    slope = np.degrees(np.arctan(np.hypot(hx, hy)))
    hw = half_width(RS[I])
    ok = (D > hw + 9) & (slope < 36) & (H < 780) & (H > WATER + 1.5) & (np.hypot(X - LAKE_C[0], Y - LAKE_C[1]) > LAKE_R + 12)
    ok &= np.abs(Y - RIVER_Y) > 110
    # leave the overlook view and the stations open
    o = RP[-1]
    ok &= np.hypot(X - o[0], Y - o[1]) > 70
    for k in ('pad', 'pier'):
        p = RP[idx(ST[k])]
        ok &= np.hypot(X - p[0], Y - p[1]) > 55
    X, Y, H = X[ok], Y[ok], H[ok]
    # the visible slopes beyond the near ground: forest up to the tree line, thinner with distance
    FX = rng.uniform(-3500, 5000, 260000)
    FY = rng.uniform(-1500, 8000, 260000)
    out = ~((FX > NEAR[0] + 40) & (FX < NEAR[1] - 40) & (FY > NEAR[2] + 40) & (FY < NEAR[3] - 40))
    FX, FY = FX[out], FY[out]
    fd = 0.5 + 0.7 * fbm(FX.reshape(1, -1), FY.reshape(1, -1), 1 / 420, 43.0, 2)[0]
    keep = rng.random(len(FX)) < np.clip(fd, 0, 1) * 0.32
    FX, FY = FX[keep], FY[keep]
    FH = natural(FX.reshape(1, -1), FY.reshape(1, -1))[0]
    e = 20.0
    fhx = (natural((FX + e).reshape(1, -1), FY.reshape(1, -1))[0] - natural((FX - e).reshape(1, -1), FY.reshape(1, -1))[0]) / (2 * e)
    fhy = (natural(FX.reshape(1, -1), (FY + e).reshape(1, -1))[0] - natural(FX.reshape(1, -1), (FY - e).reshape(1, -1))[0]) / (2 * e)
    fsl = np.degrees(np.arctan(np.hypot(fhx, fhy)))
    fok = (fsl < 36) & (FH < 820) & (FH > WATER + 1.5) & (FY > 600) & (np.abs(FY - RIVER_Y) > 110)
    FX, FY, FH = FX[fok], FY[fok], FH[fok]
    X, Y, H = np.concatenate([X, FX]), np.concatenate([Y, FY]), np.concatenate([H, FH])
    n = len(X)
    kind = rng.integers(0, 3, n)
    sc_ = rng.uniform(0.7, 1.3, n) * np.where(H > 500, 0.75, 1.0)
    sap = rng.random(n) < 0.18
    sc_ = np.where(sap, rng.uniform(0.25, 0.45, n), sc_)
    rot = rng.uniform(0, 2 * np.pi, n)
    print('TREES', n, 'near', n - len(FX))
    return np.stack([X, Y, H - 0.3, rot, sc_, kind], axis=1)

def place_grass():
    """tussocks along both shoulders for the whole drive out of town (not on the bridge or in the tunnel)"""
    rng = np.random.default_rng(9)
    xs, ys = [], []
    for i in range(int(S_CITY_END + 60), NR - 2):
        s0 = RS[i]
        if S_TUNNEL[0] - 6 < s0 < S_TUNNEL[1] + 6:
            continue
        hw = float(half_width(s0))
        for side in (1, -1):
            for row, (o0, o1, pk) in enumerate(((hw + 2.0, hw + 5.0, 1.6), (hw + 5.0, hw + 12.0, 1.3), (hw + 12.0, hw + 30.0, 0.7))):
                k_ = int(pk) + (1 if rng.random() < pk - int(pk) else 0)
                for _ in range(k_):
                    o = rng.uniform(o0, o1) * side
                    p = RP[i] + LEFT[i] * o + TH[i] * rng.uniform(-0.5, 0.5)
                    xs.append(p[0])
                    ys.append(p[1])
    X = np.array(xs)
    Y = np.array(ys)
    D, I = nearest(X.reshape(1, -1), Y.reshape(1, -1))
    H = height(X.reshape(1, -1), Y.reshape(1, -1), (D, I))[0]
    e = 1.5
    hx = (height((X + e).reshape(1, -1), Y.reshape(1, -1))[0] - height((X - e).reshape(1, -1), Y.reshape(1, -1))[0]) / (2 * e)
    hy = (height(X.reshape(1, -1), (Y + e).reshape(1, -1))[0] - height(X.reshape(1, -1), (Y - e).reshape(1, -1))[0]) / (2 * e)
    slope = np.degrees(np.arctan(np.hypot(hx, hy)))
    ok = (slope < 38) & (np.hypot(X - LAKE_C[0], Y - LAKE_C[1]) > LAKE_R + 4) & (D[0] > half_width(RS[I[0]]) + 1.8)
    X, Y, H = X[ok], Y[ok], H[ok]
    n = len(X)
    print('GRASS', n)
    return np.stack([X, Y, H - 0.05, np.zeros(n), rng.uniform(0.55, 1.25, n), rng.integers(0, 4, n)], axis=1)

def write_inst(path, items, tint):
    P = np.stack([items[:, 0], items[:, 2], -items[:, 1]], axis=1)
    lo = P.min(axis=0)
    hi = P.max(axis=0)
    qp = np.round((P - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
    lt = np.clip(np.log2(np.maximum(tint[:, :3], 1e-3)) * 24 + 160, 0, 255)
    qb = np.stack([np.clip(items[:, 4] / 1.5 * 255, 0, 255), items[:, 5], lt[:, 0], lt[:, 1], lt[:, 2], np.clip(tint[:, 3], 0, 1) * 255], axis=1).round().astype(np.uint8)
    with open(path, 'wb') as f:
        f.write(np.array([len(P), 3], np.uint32).tobytes())
        f.write(np.stack([lo, hi], axis=0).astype(np.float32).tobytes())
        f.write(qp.tobytes())
        f.write(qb.tobytes())

# ================================================================ mountain road furniture
def mountain_props():
    mats = [wmat('metal', '#7d838b', 0.5), wmat('post', '#d9d6cf'), wmat('reflector', '#ff9b3d', 0.3, emit='#ff9b3d', es=0.0), wmat('concrete', '#6d6b67')]
    mb = MB('mprops', mats)
    a = int(S_CITY_END + 140)
    # which side drops away: sample the ground 14 m out on each side
    ids = np.arange(a, NR - 4, 2)
    L = RP[ids] + LEFT[ids] * 14
    Rr = RP[ids] - LEFT[ids] * 14
    hl = height(L[:, 0].reshape(1, -1), L[:, 1].reshape(1, -1))[0]
    hr = height(Rr[:, 0].reshape(1, -1), Rr[:, 1].reshape(1, -1))[0]
    for side, hs in ((1, hl), (-1, hr)):
        drop = (RP[ids, 2] - hs) > 1.8
        tun = (RS[ids] > S_TUNNEL[0] - 4) & (RS[ids] < S_TUNNEL[1] + 4)
        sel = [int(i) for i, d, t in zip(ids, drop, tun) if d and not t]
        for run in runs(sel):
            if len(run) < 8:
                continue
            o = side * (4.6 + 1.0)
            prof = [(o, 0.42), (o + side * 0.07, 0.56), (o + side * 0.07, 0.64), (o, 0.78)]
            mb.sweep(prof, run[::2] if len(run) > 20 else run, 0)
            for i in run[::4]:
                p = RP[i] + LEFT[i] * (o + side * 0.18)
                mb.box((p[0], p[1], p[2] + 0.3), (0.16, 0.16, 0.9), 0)
    # delineator posts every 50 m both sides (white, with an amber reflector)
    for s0 in np.arange(S_CITY_END + 150, LEN - 20, 50.0):
        if S_TUNNEL[0] - 6 < s0 < S_TUNNEL[1] + 6:
            continue
        i = idx(s0)
        for side in (1, -1):
            p = RP[i] + LEFT[i] * side * 6.6
            rz = math.atan2(TH[i][1], TH[i][0])
            mb.box((p[0], p[1], p[2] + 0.55), (0.12, 0.1, 1.1), 1, rz=rz)
            q = p - TH[i] * 0.06
            mb.box((q[0], q[1], p[2] + 0.92), (0.02, 0.08, 0.12), 2, rz=rz)
    return mb.build()

# ================================================================ tunnel
def arch_pts(n=17, w=6.3, spring=4.4, apex=7.4):
    pts = [(-w, 0.0), (-w, spring)]
    for k in range(1, n):
        a = math.pi - math.pi * k / n
        pts.append((w * math.cos(a), spring + (apex - spring) * math.sin(a)))
    pts += [(w, spring), (w, 0.0)]
    return pts

def tunnel():
    mats = [wmat('tunnel', '#8c8780', 0.8), wmat('concrete', '#6d6b67'), wmat('lamp', '#fff1d8', 0.3, emit='#ffb469', es=30.0), wmat('portal', '#5b5853'), wmat('sign_log', '#111214', 0.5)]
    mb = MB('tunnel', mats)
    a, b = S_TUNNEL[0] - 2, S_TUNNEL[1] + 2
    ids = list(range(int(a), int(b) + 1, 2))
    arch = arch_pts()
    # inner lining faces inward (reverse the profile)
    mb.sweep(list(reversed([(x, y - 0.4) for (x, y) in arch])), ids, 0)
    # lamps along the crown
    for s0 in np.arange(a + 6, b - 4, 12.0):
        i = idx(s0)
        p = RP[i]
        for side in (1, -1):
            q = p + LEFT[i] * side * 3.6
            mb.box((q[0], q[1], q[2] + 6.4), (1.4 if abs(TH[i][0]) > 0.7 else 0.3, 1.4 if abs(TH[i][1]) > 0.7 else 0.3, 0.12), 2)
            light((q[0], q[1], q[2] + 6.2), 'tunnel')
    # portals: a thick face with the arch cut out, a cap beam and the plaque on the entry
    for end, sgn in ((a, 1), (b, -1)):
        i = idx(end)
        p = RP[i]
        outer = []
        W, Ht = 14.0, 13.0
        for (x, y) in arch:
            # project each arch point outward to the portal's rectangle
            ang = math.atan2(y - 3.0, x)
            ox = max(-W, min(W, x + math.cos(ang) * 30))
            oy = max(-2.5, min(Ht, y + math.sin(ang) * 30))
            outer.append((ox, oy))
        V, F = [], []
        for dz in (0.0, -sgn * 2.4):
            for (x, y) in arch:
                q = p + LEFT[i] * x + TH[i] * dz
                V.append((q[0], q[1], p[2] + y - 0.4))
            for (x, y) in outer:
                q = p + LEFT[i] * x + TH[i] * dz
                V.append((q[0], q[1], p[2] + y - 0.4))
        n = len(arch)
        for k in range(n - 1):
            F.append((k, k + 1, n + k + 1, n + k) if sgn > 0 else (k, n + k, n + k + 1, k + 1))
            F.append((2 * n + k, 3 * n + k, 3 * n + k + 1, 2 * n + k + 1) if sgn > 0 else (2 * n + k, 2 * n + k + 1, 3 * n + k + 1, 3 * n + k))
            F.append((n + k, n + k + 1, 3 * n + k + 1, 3 * n + k) if sgn > 0 else (n + k, 3 * n + k, 3 * n + k + 1, n + k + 1))
        mb.add(V, F, 3)
        c = p + TH[i] * (sgn * 0.2)
        mb.box((c[0], c[1], p[2] + 12.9), (abs(LEFT[i][0]) * 30 + abs(TH[i][0]) * 3.6 + 0.4, abs(LEFT[i][1]) * 30 + abs(TH[i][1]) * 3.6 + 0.4, 1.0), 1)
        if sgn > 0:
            plaque(mb, p + TH[i] * (-0.25) + Vector((0, 0, 0)), i, 8.4, 9.6, 4.8, 4, facing=-1)
    return mb.build(smooth_angle=50, bevel=0.04)

def plaque(mb, p, i, z, w, h, m, facing=-1, lateral=0.0, rz_extra=0.0):
    """a sign face (UV 0..1) facing back down the road (facing=-1) at height z"""
    t = Vector((TH[i][0], TH[i][1], 0))
    l = Vector((LEFT[i][0], LEFT[i][1], 0))
    if rz_extra:
        rot = Matrix.Rotation(rz_extra, 3, 'Z')
        t = rot @ t
        l = rot @ l
    c = Vector((p[0], p[1], p[2])) + l * lateral
    n = t * facing
    right = -l if facing < 0 else l
    # sign face looks along n: corners in (right, up)
    P = [c + right * (-w / 2) + Vector((0, 0, z - h / 2)), c + right * (w / 2) + Vector((0, 0, z - h / 2)), c + right * (w / 2) + Vector((0, 0, z + h / 2)), c + right * (-w / 2) + Vector((0, 0, z + h / 2))]
    P = [q + n * 0.05 for q in P]
    # make the quad face along n
    e1, e2 = P[1] - P[0], P[3] - P[0]
    f = (0, 1, 2, 3) if e1.cross(e2).dot(n) > 0 else (0, 3, 2, 1)
    uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
    mb.add(P, [f], m, [[uv[k] for k in f]])
    # backing board
    back = c - n * 0.15 + Vector((0, 0, z))
    bw = (abs(right.x) * (w + 0.5) + abs(n.x) * 0.3, abs(right.y) * (w + 0.5) + abs(n.y) * 0.3)
    return c

# ================================================================ station props
def ground_z(x, y):
    return float(height(np.array([[x]]), np.array([[y]]))[0, 0])

def lathe_mb(mb, prof, segs, m, M4):
    V, F = [], []
    n = len(prof)
    for k in range(segs):
        a = 2 * math.pi * k / segs
        for (r, z) in prof:
            V.append(tuple(M4 @ Vector((r * math.cos(a), r * math.sin(a), z))))
    for k in range(segs):
        k2 = (k + 1) % segs
        for i in range(n - 1):
            F.append((k * n + i, k2 * n + i, k2 * n + i + 1, k * n + i + 1))
    mb.add(V, F, m)

def frame(i, lateral, ahead=0.0):
    p = RP[i] + LEFT[i] * lateral + TH[i] * ahead
    return Vector((p[0], p[1], p[2])), Vector((TH[i][0], TH[i][1], 0)), Vector((LEFT[i][0], LEFT[i][1], 0))

def oriented_box(mb, c, t, l, size, m):
    """box with local x along t, y along l"""
    rz = math.atan2(t.y, t.x)
    mb.box(tuple(c), size, m, rz=rz)

def sign_board(mb, c, n, w, h, z, m_face, m_frame, posts=2, post_m=None):
    """a sign face (UVs 0..1) looking along n, on posts"""
    n = Vector((n.x, n.y, 0)).normalized()
    right = Vector((-n.y, n.x, 0)) * -1  # viewer's right when facing the sign
    up = Vector((0, 0, 1))
    base = c + up * z
    P = [base + right * (-w / 2) + up * (-h / 2), base + right * (w / 2) + up * (-h / 2), base + right * (w / 2) + up * (h / 2), base + right * (-w / 2) + up * (h / 2)]
    P = [q + n * 0.12 for q in P]
    e1, e2 = P[1] - P[0], P[3] - P[0]
    order = (0, 1, 2, 3) if e1.cross(e2).dot(n) > 0 else (0, 3, 2, 1)
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    mb.add(P, [order], m_face, [[uvs[k] for k in order]])
    rz = math.atan2(n.y, n.x)
    mb.box(tuple(base - n * 0.08), (0.14, w + 0.3, h + 0.3), m_frame, rz=rz)
    for k in range(posts):
        off = (k / max(posts - 1, 1) - 0.5) * w * 0.7 if posts > 1 else 0
        q = c + right * off - n * 0.15
        mb.box((q.x, q.y, c.z + (z - h / 2) / 2), (0.22, 0.22, z - h / 2 + 0.2), post_m if post_m is not None else m_frame, rz=rz)

STATION_INFO = {}

def station_props():
    M = dict(metal=0, frame=1, conc=2, sign_dock=3, sign_pad=4, sign_log=5, sign_model=6, sign_pier=7, sign_board=8, chevron=9, lamp=10, wood=11, dish=12, hut=13, red=14, stone=15)
    mats = [wmat('metal', '#7d838b', 0.5), wmat('frame', '#1c1e22', 0.6), wmat('concrete', '#6d6b67'),
            wmat('sign_dock', '#101114', 0.5), wmat('sign_pad', '#101114', 0.5), wmat('sign_log', '#101114', 0.5), wmat('sign_model', '#101114', 0.5),
            wmat('sign_pier', '#101114', 0.5), wmat('sign_board', '#101114', 0.5), wmat('chevron', '#1a1a1a', 0.5),
            wmat('lamp', '#fff1d8', 0.3, emit='#ffd9a8', es=30.0), wmat('wood', '#6b4a33'), wmat('dish', '#d9dbdf', 0.5), wmat('hut', '#a9a49b'), wmat('red', '#ff3020', 0.4, emit='#ff3020', es=20.0), wmat('stone', '#5f5b55')]
    mb = MB('stations', mats)

    # 1. downtown billboard (Amazon Robotics), right of the freeway, angled toward the traffic
    i = idx(ST['dock'] + 40)
    c, t, l = frame(i, -21.5)
    n = (-t * 0.82 + l * 0.57).normalized()
    c.z = 8.0
    for k in (-1, 1):
        q = c + Vector((-n.y, n.x, 0)) * k * 6.0
        oriented_box(mb, Vector((q.x, q.y, 8.0 + 7.5)), n, Vector((-n.y, n.x, 0)), (0.9, 0.9, 15.0), M['metal'])
    sign_board(mb, c, n, 22.0, 11.0, 20.5, M['sign_dock'], M['frame'], posts=0)
    walk = c + n * 1.2
    oriented_box(mb, Vector((walk.x, walk.y, 14.7)), n, Vector((-n.y, n.x, 0)), (1.4, 22.0, 0.15), M['metal'])
    for k in (-0.75, -0.25, 0.25, 0.75):
        q = c + Vector((-n.y, n.x, 0)) * k * 22 * 0.5 * 2 + n * 2.2
        oriented_box(mb, Vector((q.x, q.y, 14.95)), n, Vector((-n.y, n.x, 0)), (2.2, 0.15, 0.15), M['metal'])
        oriented_box(mb, Vector((q.x, q.y, 15.1)), n, Vector((-n.y, n.x, 0)), (0.6, 0.9, 0.35), M['frame'])
        light((q.x, q.y, 15.0), 'flood')
    STATION_INFO['dock'] = dict(look=list(c + Vector((0, 0, 20.5))))
    KEEPOUT.append((c.x, c.y, 26.0))

    # 2. ground station (MarmotSat): a dish on a knoll left of the road, a sign on the right
    i = idx(ST['pad'] + 30)
    c, t, l = frame(i, 58.0, 40.0)
    gz = ground_z(c.x, c.y)
    c.z = gz
    mb.box((c.x, c.y, gz + 1.0), (9, 9, 3.0), M['conc'])
    lathe_mb(mb, [(0.0, 2.5), (1.4, 2.5), (1.4, 5.0), (0.0, 5.0)], 20, M['dish'], Matrix.Translation(c))
    aim = Matrix.Translation(c + Vector((0, 0, 7.2))) @ Matrix.Rotation(math.atan2(-l.y, -l.x) + 0.5, 4, 'Z') @ Matrix.Rotation(math.radians(50), 4, 'Y')
    prof = [(0.0, 0.0)] + [(r, 0.055 * r * r) for r in np.linspace(0.6, 5.6, 9)]
    lathe_mb(mb, prof + [(5.6, 0.055 * 5.6 * 5.6 + 0.12)] + [(r, 0.055 * r * r + 0.12) for r in np.linspace(5.6, 0.6, 9)] + [(0.0, 0.12)], 40, M['dish'], aim)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        p0 = aim @ Vector((4.6 * math.cos(a), 4.6 * math.sin(a), 1.2))
        p1 = aim @ Vector((0, 0, 4.4))
        mb.tube([p0, p1], 0.07, M['metal'], segs=5)
    f = aim @ Vector((0, 0, 4.5))
    mb.box(tuple(f), (0.6, 0.6, 0.8), M['frame'])
    light(tuple(aim @ Vector((0, 0, 5.1))), 'red')
    mb.tube([c + Vector((0, 0, 5.0)), aim @ Vector((0, 0, 0))], 0.9, M['dish'], segs=10)
    hut = c + l * -9.0 + t * 6.0
    hz = ground_z(hut.x, hut.y)
    mb.box((hut.x, hut.y, hz + 1.5), (6, 4, 3.2), M['hut'], rz=math.atan2(t.y, t.x))
    mb.box((hut.x, hut.y, hz + 3.25), (6.6, 4.6, 0.3), M['frame'], rz=math.atan2(t.y, t.x))
    mast = c + t * -8.0 + l * 4.0
    mz = ground_z(mast.x, mast.y)
    mb.box((mast.x, mast.y, mz + 5.0), (0.3, 0.3, 10.0), M['metal'])
    mb.box((mast.x, mast.y, mz + 10.0), (0.8, 0.8, 0.5), M['frame'])
    light((mast.x, mast.y, mz + 9.7), 'flood')
    for k in range(24):
        a = 2 * math.pi * k / 24
        q = c + Vector((math.cos(a), math.sin(a), 0)) * 14
        qz = ground_z(q.x, q.y)
        mb.box((q.x, q.y, qz + 1.0), (0.1, 0.1, 2.0), M['metal'])
    si = idx(ST['pad'])
    sc_, st_, sl_ = frame(si, -(4.6 + 3.2))
    sign_board(mb, sc_, -st_, 7.0, 3.5, 3.9, M['sign_pad'], M['frame'])
    STATION_INFO['pad'] = dict(look=list(aim @ Vector((0, 0, 2.0))), sign=list(sc_ + Vector((0, 0, 3.9))))

    # 3. the tunnel portal plaque is built with the tunnel (sign_log)
    i = idx(ST['log'])
    STATION_INFO['log'] = dict(look=list(Vector(RP[idx(S_TUNNEL[0] - 2)]) + Vector((0, 0, 9.6))))

    # 4. hairpin: a chevron row on the outside of the bend, and the sign before it
    for ds in np.arange(-28, 29, 9.5):
        i = idx(ST['hp1'] + ds)
        side = -1 if CURV[i] > 0 else 1
        c, t, l = frame(i, side * (4.6 + 2.0))
        sign_board(mb, c, -t if True else t, 1.2, 1.5, 1.6, M['chevron'], M['frame'], posts=1, post_m=M['metal'])
    i = idx(ST['model'])
    c, t, l = frame(i, -(4.6 + 3.2))
    sign_board(mb, c, -t, 7.0, 3.5, 3.9, M['sign_model'], M['frame'])
    STATION_INFO['model'] = dict(look=list(c + Vector((0, 0, 3.9))))

    # 5. lake pull-off: a timber pier with a lantern, an information board by the road
    i = idx(ST['pier'])
    c, t, l = frame(i, 0)
    v = Vector((LAKE_C[0] - c.x, LAKE_C[1] - c.y, 0)).normalized()
    side = 1 if v.dot(l) > 0 else -1
    start = c + l * side * 9.0
    for k in range(13):
        q = start + v * (k * 3.5)
        mb.box((q.x, q.y, WATER + 1.2), (3.6 if abs(v.x) > 0.7 else 3.0, 3.0 if abs(v.x) > 0.7 else 3.6, 0.22), M['wood'], rz=math.atan2(v.y, v.x))
        for sg in (1, -1):
            pp = q + Vector((-v.y, v.x, 0)) * sg * 1.6
            mb.box((pp.x, pp.y, WATER - 1.0), (0.3, 0.3, 4.4), M['wood'])
            if k % 2 == 0:
                mb.box((pp.x, pp.y, WATER + 2.0), (0.12, 0.12, 1.4), M['wood'])
    end = start + v * (12 * 3.5)
    mb.box((end.x, end.y, WATER + 3.3), (0.18, 0.18, 4.2), M['frame'])
    mb.box((end.x, end.y, WATER + 5.5), (0.6, 0.6, 0.6), M['lamp'])
    light((end.x, end.y, WATER + 5.5), 'lantern')
    bc = c + l * side * 7.5 - t * 6
    bc.z = RP[i][2]
    sign_board(mb, bc, -t, 6.0, 3.0, 2.9, M['sign_pier'], M['frame'])
    STATION_INFO['pier'] = dict(look=list(end + Vector((0, 0, 3.0))), sign=list(bc + Vector((0, 0, 2.9))))

    # 6. overlook: a stone apron and parapet at the edge, a railing, coin binoculars, a bench, the last sign
    i = NR - 1
    c, t, l = frame(i, 0, 4.0)
    for k in range(-5, 6):
        q = c + t * 8.0 + l * k * 2.2
        mb.box((q.x, q.y, c.z + 0.45), (1.0, 2.3, 0.9), M['stone'], rz=math.atan2(t.y, t.x))
        if k % 2 == 0:
            mb.box((q.x, q.y, c.z + 1.25), (0.1, 0.1, 0.8), M['metal'])
    rail0 = c + t * 8.0 + l * -11.0 + Vector((0, 0, 1.6))
    rail1 = c + t * 8.0 + l * 11.0 + Vector((0, 0, 1.6))
    mb.tube([rail0, rail1], 0.05, M['metal'], segs=6)
    bino = c + t * 6.6 + l * 2.0
    mb.box((bino.x, bino.y, c.z + 0.6), (0.18, 0.18, 1.2), M['metal'])
    oriented_box(mb, bino + Vector((0, 0, 1.35)), t, l, (0.5, 0.36, 0.34), M['frame'])
    for sg in (1, -1):
        q = bino + t * 0.28 + l * sg * 0.09 + Vector((0, 0, 1.38))
        mb.tube([q - t * 0.05, q + t * 0.12], 0.06, M['metal'], segs=10)
    bench = c + t * 5.4 + l * -4.5
    oriented_box(mb, bench + Vector((0, 0, 0.45)), t, l, (0.5, 2.0, 0.08), M['wood'])
    oriented_box(mb, bench + Vector((0, 0, 0.22)), t, l, (0.4, 1.8, 0.44), M['frame'])
    for sg in (1, -1):
        q = c + t * 2.0 + l * sg * 7.0
        mb.box((q.x, q.y, c.z + 2.5), (0.16, 0.16, 5.0), M['frame'])
        mb.box((q.x, q.y, c.z + 5.1), (0.5, 0.5, 0.3), M['lamp'])
        light((q.x, q.y, c.z + 5.0), 'lantern')
    sc_ = c + t * 3.0 + l * -6.5
    sign_board(mb, sc_, (-t * 0.5 + l * 0.85).normalized(), 5.0, 2.5, 2.3, M['sign_board'], M['frame'])
    STATION_INFO['board'] = dict(look=list(Vector(CITY_P) + Vector((0, 0, 40))), sign=list(sc_ + Vector((0, 0, 2.3))))
    return mb.build(bevel=0.02)

# ================================================================ preview (Workbench, vertex colours)
def preview_cam(name, loc, look, lens=24):
    d = bpy.data.cameras.new(name)
    d.lens = lens
    d.clip_end = 20000
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

def preview(shots):
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'VERTEX'
    sh.show_shadows = True
    sh.show_cavity = False
    sc.render.resolution_x, sc.render.resolution_y = 1440, 900
    sc.view_settings.view_transform = 'Standard'
    for name, loc, look, lens in shots:
        sc.camera = preview_cam(name, loc, look, lens)
        sc.render.filepath = os.path.join(WORK, f'pv-{name}.png')
        bpy.ops.render.render(write_still=True)

def drive_cam(s, back=0, up=1.2, ahead=40, lens=24):
    i = idx(s)
    p = RP[i] - LEFT[i] * 2.0 - TH[i] * back
    j = idx(s + ahead)
    q = RP[j] - LEFT[j] * 2.0
    return (p[0], p[1], p[2] + up), (q[0], q[1], q[2] + up * 0.6), lens

if MODE == 'preview':
    terr = terrain_near()
    far = terrain_far()
    rd = road()
    stations()
    stp = station_props()
    ct = city()
    fw = freeway()
    br = bridge()
    wt = water()
    tn = tunnel()
    mp = mountain_props()
    protos = tree_protos()
    TREES = place_trees(None)
    # preview: real instances so the shots show the forest
    for (x, y, z, r, k_, kd) in TREES[::3]:
        ob = bpy.data.objects.new('t', protos[int(kd)].data)
        ob.location = (x, y, z)
        ob.rotation_euler = (0, 0, r)
        ob.scale = (k_, k_, k_)
        sc.collection.objects.link(ob)
    # road-colour stand-in so Workbench vertex mode shows it
    shots = []
    for k in ('dock', 'pad', 'model', 'pier'):
        shots.append(('st-' + k, *drive_cam(ST[k] - 70, ahead=70)))
    for nm, s0 in (('city', 60), ('bridge', S_BRIDGE[0] - 60), ('edge', S_CITY_END + 150), ('tunnel', S_TUNNEL[0] - 120), ('hairpin', S_TUNNEL[1] + 200), ('lake', s_at(1000, 1928) - 100), ('summit', LEN - 120)):
        shots.append((nm, *drive_cam(s0)))
    o = RP[-1]
    c = CITY_P
    shots.append(('overlook', (o[0], o[1], o[2] + 3), (c[0], c[1], c[2] + 30), 30))
    shots.append(('overhi', (o[0] + 300, o[1] + 300, o[2] + 400), (o[0], o[1], o[2]), 24))
    shots.append(('aerial', (600, -900, 1400), (700, 1500, 100), 28))
    preview(shots)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'world.blend'))

if MODE == 'sight':
    o = RP[-1] + np.array([0, 0, 2.5])
    c = CITY_P + np.array([0, 0, 20])
    ts = np.linspace(0.005, 1, 400)
    P = o[None, :] * (1 - ts[:, None]) + c[None, :] * ts[:, None]
    X = P[:, 0].reshape(1, -1)
    Y = P[:, 1].reshape(1, -1)
    H = height(X, Y)[0]
    for k in range(0, 400, 20):
        print('SIGHT t=%.3f line=%.1f terrain=%.1f %s' % (ts[k], P[k, 2], H[k], 'BLOCK' if H[k] > P[k, 2] else ''))
    print('SIGHT blocked', int((H > P[:, 2]).sum()), 'of 400; overlook z', o[2], 'heading', TH[-1])


# ================================================================ lighting for the bake
SKY = [(0.0, '#06070b'), (0.49, '#0b0d14'), (0.502, '#d8785c'), (0.53, '#a8587a'), (0.58, '#4a3772'), (0.68, '#1d2252'), (1.0, '#0a0e2a')]
HDRI = os.environ.get('HDRI', '/tmp/drive-dl/hdri/sunset_4k.hdr')
_su, _sv = 0.5999755859375, 0.533447265625   # the sun's pixel in the HDRI (sky.py)
_az = (_su - 0.5) * 2 * math.pi
_el = (_sv - 0.5) * math.pi
SUN_DIR = Vector((-math.cos(_az) * math.cos(_el), math.sin(_az) * math.cos(_el), math.sin(_el))).normalized()  # west-north-west, 6 degrees up
MOON_DIR = Vector((0.45, -0.55, 0.70)).normalized()

def bake_world(strength=1.0):
    w = bpy.data.worlds.new('dusk')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = SKY[0][0], (*hexcol(SKY[0][1]), 1)
    el[1].position, el[1].color = SKY[-1][0], (*hexcol(SKY[-1][1]), 1)
    for p_, c_ in SKY[1:-1]:
        e = el.new(p_)
        e.color = (*hexcol(c_), 1)
    mp = nt.nodes.new('ShaderNodeMapRange')
    mp.inputs['From Min'].default_value = -1
    mp.inputs['From Max'].default_value = 1
    nt.links.new(sep.outputs['Z'], mp.inputs['Value'])
    nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    w.light_settings.distance = 6.0

def sun(name, d, col, strength, angle=1.0):
    L = bpy.data.lights.new(name, 'SUN')
    L.energy = strength
    L.color = hexcol(col)
    L.angle = math.radians(angle)
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return o

LIGHT_KIND = {
    'sodium': ('SPOT', 9000, '#ffab5e', 0.35),
    'tunnel': ('POINT', 1300, '#ffa456', 0.3),
    'flood': ('POINT', 9000, '#ffe4c0', 0.5),
    'lantern': ('POINT', 1600, '#ffc983', 0.25),
}

def bake_lights():
    sun('alpenglow', SUN_DIR, '#ff8466', float(os.environ.get('SUN', 2.6)), 1.5)
    sun('moon', MOON_DIR, '#8fa4ff', float(os.environ.get('MOON', 0.12)), 2.0)
    n = 0
    for (x, y, z, kind) in LIGHTS:
        if kind not in LIGHT_KIND:
            continue
        typ, power, col, rad = LIGHT_KIND[kind]
        L = bpy.data.lights.new(kind, typ)
        L.energy = power
        L.color = hexcol(col)
        L.shadow_soft_size = rad
        if typ == 'SPOT':
            L.spot_size = math.radians(150)
            L.spot_blend = 0.6
        o = bpy.data.objects.new(kind, L)
        o.location = (x, y, z)
        sc.collection.objects.link(o)
        n += 1
    print('LIGHTS baked', n, 'of', len(LIGHTS))

def encode(v):
    v = np.maximum(v, 0)
    c = v / (1.0 + v)
    return np.power(c, 1 / 2.2)

def bake_vcols(objs, spp):
    for o in objs:
        me = o.data
        for ca in list(me.color_attributes):
            if ca.name == 'bake':
                me.color_attributes.remove(ca)
        ca = me.color_attributes.new('bake', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = ca
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = spp
    rb = sc.render.bake
    rb.target = 'VERTEX_COLORS'
    rb.use_pass_direct = True
    rb.use_pass_indirect = True
    rb.use_pass_diffuse = True
    rb.use_pass_glossy = False
    rb.use_pass_transmission = False
    rb.use_pass_emit = True
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type='COMBINED')

def finish_vcols(o):
    me = o.data
    ca = me.color_attributes['bake']
    a = np.zeros(len(ca.data) * 4, np.float32)
    ca.data.foreach_get('color', a)
    a = a.reshape(-1, 4)
    raw = a[:, :3].copy()
    a[:, :3] = encode(raw)
    a[:, 3] = 1
    ca.data.foreach_set('color', a.ravel())
    me.color_attributes.active_color = me.color_attributes['bake']
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    for nm in [c.name for c in me.color_attributes if c.name != 'bake']:
        try:
            me.color_attributes.remove(me.color_attributes[nm])
        except RuntimeError as e:
            print('keep attr', o.name, nm, e)
    return raw

def split_tiles(o, size=700.0):
    """cut a big object into ground tiles so the runtime can frustum-cull"""
    out = [o]
    while True:
        me = o.data
        if len(me.polygons) == 0:
            break
        c = np.zeros(len(me.polygons) * 3)
        me.polygons.foreach_get('center', c)
        c = c.reshape(-1, 3)
        keys = np.floor(c[:, 0] / size).astype(int) * 1000 + np.floor(c[:, 1] / size).astype(int)
        u = np.unique(keys)
        if len(u) <= 1:
            break
        sel = keys == u[-1]
        me.polygons.foreach_set('select', sel)
        active(o)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_mode(type='FACE')
        bpy.ops.object.mode_set(mode='OBJECT')
        me.polygons.foreach_set('select', sel)
        me.update()
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        new = [x for x in bpy.context.selected_objects if x != o]
        for x in new:
            x.name = f'{o.name.split("_t")[0]}_t{u[-1]}'
        out += new
    return out

def tc(p):
    """Blender (x, y, z) -> three.js (x, z, -y)"""
    return [round(float(p[0]), 2), round(float(p[2]), 2), round(float(-p[1]), 2)]

def export_meta(trees, tint):
    step = 2
    ids = list(range(0, NR, step))
    meta = dict(
        len=float(LEN), step=step,
        p=[tc(RP[i]) for i in ids],
        l=[[round(float(LEFT[i][0]), 4), 0, round(float(-LEFT[i][1]), 4)] for i in ids],
        k=[round(float(CURV[i]), 5) for i in ids],
        zones=dict(bridge=list(S_BRIDGE), tunnel=list(S_TUNNEL), city=float(S_CITY_END), water=WATER, river=0.4),
        stations={k: dict(s=round(ST[k], 1), **{kk: tc(vv) for kk, vv in STATION_INFO.get(k, {}).items()}) for k in ('dock', 'pad', 'log', 'model', 'pier', 'board')},
        hairpin=round(ST['hp1'], 1),
        lights=[tc((x, y, z)) + [kind] for (x, y, z, kind) in LIGHTS],
        sun=tc(SUN_DIR), moon=tc(MOON_DIR), city=tc(CITY_P), dem=dict(px=DEM_PX, c0=DEM_C0, r0=DEM_R0),
    )
    with open(os.path.join(WORK, 'meta.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    # trees, 12 bytes each: x, y, z (three) as uint16 over the bounds; scale, kind, tint rgb (log), sun as uint8
    P = np.stack([trees[:, 0], trees[:, 2], -trees[:, 1]], axis=1)
    lo = P.min(axis=0)
    hi = P.max(axis=0)
    qp = np.round((P - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
    lt = np.clip(np.log2(np.maximum(tint[:, :3], 1e-3)) * 24 + 160, 0, 255)
    qb = np.stack([np.clip(trees[:, 4] / 1.5 * 255, 0, 255), trees[:, 5], lt[:, 0], lt[:, 1], lt[:, 2], np.clip(tint[:, 3], 0, 1) * 255], axis=1).round().astype(np.uint8)
    T = P
    with open(os.path.join(WORK, 'trees.bin'), 'wb') as f:
        f.write(np.array([len(P), 3], np.uint32).tobytes())
        f.write(np.stack([lo, hi], axis=0).astype(np.float32).tobytes())
        f.write(qp.tobytes())
        f.write(qb.tobytes())
    print('META', len(meta['p']), 'route pts', len(T), 'trees')

def bake_protos(protos):
    """AO for the tree prototypes, on their own, into vertex colours"""
    bpy.ops.mesh.primitive_plane_add(size=40, location=(20000, 0, 0))
    g = bpy.context.active_object
    for o in protos:
        o.location = (20000, 0, 0)
    for o in protos:
        me = o.data
        ca = me.color_attributes.new('bake', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = ca
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.render.bake.target = 'VERTEX_COLORS'
    sc.cycles.samples = 128
    bpy.ops.object.select_all(action='DESELECT')
    for o in protos:
        o.select_set(True)
    bpy.context.view_layer.objects.active = protos[0]
    bpy.ops.object.bake(type='AO')
    bpy.data.objects.remove(g)
    for o in protos:
        me = o.data
        ca = me.color_attributes['bake']
        a = np.zeros(len(ca.data) * 4, np.float32)
        ca.data.foreach_get('color', a)
        a = a.reshape(-1, 4)
        # height gradient on top of the AO: lighter tips
        z = np.array([v.co.z for v in me.vertices])
        g_ = 0.55 + 0.45 * np.clip(z / max(z.max(), 1), 0, 1)
        a[:, :3] = np.clip(a[:, :3] * g_[:, None], 0, 1) ** (1 / 2.2)
        a[:, 3] = 1
        ca.data.foreach_set('color', a.ravel())
        o.location = (0, 0, 0)

def hdri_world(strength=1.0, clamp=6.0):
    """the HDRI as the world light, with the sun clamped out (it comes back per pixel at runtime)"""
    w = bpy.data.worlds.new('hdri')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(HDRI)
    cl = nt.nodes.new('ShaderNodeMix')
    cl.data_type = 'RGBA'
    cl.blend_type = 'DARKEN'
    cl.inputs['Factor'].default_value = 1.0
    nt.links.new(env.outputs['Color'], cl.inputs['A'])
    cl.inputs['B'].default_value = (clamp, clamp, clamp, 1)
    nt.links.new(cl.outputs['Result'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    return w

def bake_pass(objs, kind, attr, spp):
    for o in objs:
        me = o.data
        if attr in me.color_attributes:
            me.color_attributes.remove(me.color_attributes[attr])
        ca = me.color_attributes.new(attr, 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = ca
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = spp
    rb = sc.render.bake
    rb.target = 'VERTEX_COLORS'
    rb.use_pass_direct = True
    rb.use_pass_indirect = True
    rb.use_pass_color = False
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type=kind)

def read_attr(o, attr):
    ca = o.data.color_attributes[attr]
    a = np.zeros(len(ca.data) * 4, np.float32)
    ca.data.foreach_get('color', a)
    return a.reshape(-1, 4)

if MODE == 'bake':
    import time
    t0 = time.time()
    stations()
    stp = station_props()
    terr = terrain_near()
    far = terrain_far()
    rd = road()
    ct, ctx = city()
    fw = freeway()
    br = bridge()
    wt = water()
    tn = tunnel()
    mp = mountain_props()
    TREES = place_trees(None)
    world_objs = [terr, far, rd, ct, ctx, fw, br, tn, mp, stp]
    wt.hide_render = True
    # pass 1: sky and lamps, no sun -> irradiance
    hdri_world(float(os.environ.get('SKYS', 1.0)))
    bake_lights()
    for ob in list(sc.objects):
        if ob.type == 'LIGHT' and ob.data.type == 'SUN':
            ob.hide_render = True
    bake_pass(world_objs, 'DIFFUSE', 'bake', int(os.environ.get('SPP', 128)))
    print('BAKED irradiance %.0fs' % (time.time() - t0))
    # pass 2: the sun alone -> shadow (1 lit, 0 shadowed)
    for ob in list(sc.objects):
        if ob.type == 'LIGHT':
            ob.hide_render = True
    sl = sun('sunshadow', SUN_DIR, '#ffffff', 3.0, 1.2)
    bake_pass(world_objs, 'SHADOW', 'shadow', 32)
    print('BAKED shadow %.0fs' % (time.time() - t0))
    for o in world_objs:
        irr = read_attr(o, 'bake')
        sh = read_attr(o, 'shadow')
        irr[:, :3] = encode(irr[:, :3])
        irr[:, 3] = np.clip(sh[:, 0], 0, 1)
        o.data.color_attributes['bake'].data.foreach_set('color', irr.ravel())
        me = o.data
        me.color_attributes.active_color = me.color_attributes['bake']
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        for nm in [c.name for c in me.color_attributes if c.name != 'bake']:
            try:
                me.color_attributes.remove(me.color_attributes[nm])
            except RuntimeError:
                pass
    for n_ in MATS['terrain'].node_tree.nodes:
        if n_.type == 'VERTEX_COLOR':
            n_.layer_name = 'bake'
    # tree tint: irradiance + sun shadow where each tree stands
    tb = np.concatenate([read_attr(terr, 'bake'), read_attr(far, 'bake')])
    vs = [v.co.copy() for v in terr.data.vertices] + [v.co.copy() for v in far.data.vertices]
    kd = KDTree(len(vs))
    for k, v in enumerate(vs):
        kd.insert(v, k)
    kd.balance()
    near_i = np.array([kd.find((x, y, z))[1] for (x, y, z, *_r) in TREES])
    c = np.power(np.clip(tb[near_i, :3], 0, 0.999), 2.2)
    tint = np.concatenate([c / (1 - c), tb[near_i, 3:4]], axis=1)
    export_meta(TREES, tint)
    GRASS = place_grass()
    gi = np.array([kd.find((x, y, z))[1] for (x, y, z, *_r) in GRASS])
    gc = np.power(np.clip(tb[gi, :3], 0, 0.999), 2.2)
    write_inst(os.path.join(WORK, 'grass.bin'), GRASS, np.concatenate([gc / (1 - gc), tb[gi, 3:4]], axis=1))
    for o in [far, terr]:
        for uvl in [u for u in o.data.uv_layers if u.name != 'zone']:
            o.data.uv_layers.remove(uvl)
    for o in [fw, br, mp]:
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])
    tiles = []
    for o in (terr, ct, ctx, rd, fw, mp):
        tiles += split_tiles(o)
    keep = tiles + [far, br, tn, stp, wt]
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep:
        o.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, 'world.glb'), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT', export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'world-baked.blend'))
    print('DONE %.0fs' % (time.time() - t0), len(keep), 'objects')

if MODE == 'bake_old':
    import time
    t0 = time.time()
    stations()
    stp = station_props()
    terr = terrain_near()
    far = terrain_far()
    rd = road()
    ct = city()
    fw = freeway()
    br = bridge()
    wt = water()
    tn = tunnel()
    mp = mountain_props()
    protos = tree_protos()
    TREES = place_trees(None)
    bake_protos(protos)
    bake_world(float(os.environ.get('SKYS', 0.9)))
    bake_lights()
    ct, ctx = ct
    world_objs = [terr, far, rd, ct, ctx, fw, br, tn, mp, stp]
    wt.hide_render = True
    # albedo of the near terrain (to turn its bake back into irradiance for the tree tints)
    alb = np.zeros(len(terr.data.vertices) * 4, np.float32)
    terr.data.color_attributes['alb'].data.foreach_get('color', alb)
    alb = alb.reshape(-1, 4)[:, :3]
    bake_vcols(world_objs, int(os.environ.get('SPP', 160)))
    print('BAKED %.0fs' % (time.time() - t0))
    raws = {o.name: finish_vcols(o) for o in world_objs}
    for n_ in MATS['terrain'].node_tree.nodes:
        if n_.type == 'VERTEX_COLOR':
            n_.layer_name = 'bake'
    irr = raws['terrain'] / np.maximum(alb, 0.02)
    kd = KDTree(len(terr.data.vertices))
    for k, v in enumerate(terr.data.vertices):
        kd.insert(v.co, k)
    kd.balance()
    tint = np.array([irr[kd.find((x, y, z))[1]] for (x, y, z, *_r) in TREES])
    tint = np.clip(tint, 0, 4)
    export_meta(TREES, tint)
    # strip what the runtime does not use
    for o in [terr, far, ct, fw, br, mp]:
        if o in (ct,):
            continue
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])
    tiles = []
    for o in (terr, ct, ctx, rd, fw, mp):
        tiles += split_tiles(o)
    keep = tiles + [far, br, tn, stp, wt] + protos
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep:
        o.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, 'world.glb'), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_texcoords=True, export_normals=False,
                              export_materials='EXPORT', export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'world-baked.blend'))
    print('DONE %.0fs' % (time.time() - t0), len(keep), 'objects')

if MODE == 'lakecheck':
    stations()
    i = idx(ST['pier'])
    p = RP[i]
    v = np.array([LAKE_C[0] - p[0], LAKE_C[1] - p[1]])
    dlen = np.linalg.norm(v)
    v = v / dlen
    ts = np.arange(0, 120, 6.0)
    X = (p[0] + v[0] * ts).reshape(1, -1)
    Y = (p[1] + v[1] * ts).reshape(1, -1)
    H = height(X, Y)[0]
    print('LAKE road z', p[2], 'dist to centre', dlen, 'R', LAKE_R)
    for t, h in zip(ts, H):
        print('LAKE t=%3d h=%.1f %s' % (t, h, 'WATER' if h < WATER else ''))
