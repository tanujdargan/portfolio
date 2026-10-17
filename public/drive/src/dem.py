# Stitch AWS Terrain Tiles (terrarium encoding, z12) around the Teton Range into one height array (metres) and save
# a hillshade preview. USGS 3DEP elevation (public domain) via the AWS Open Data terrain tiles.
#   Blender -b --python public/drive/src/dem.py -- <tiles dir> <out.npy>
import bpy, sys, os
import numpy as np
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
X0, X1, Y0, Y1 = 785, 789, 1491, 1495
rows = []
for y in range(Y0, Y1 + 1):
    row = []
    for x in range(X0, X1 + 1):
        im = bpy.data.images.load(os.path.join(src, f't_{x}_{y}.png'))
        im.colorspace_settings.name = 'Non-Color'
        a = np.array(im.pixels[:], np.float32).reshape(256, 256, 4)[::-1]  # top row first
        h = (a[..., 0] * 255) * 256 + a[..., 1] * 255 + a[..., 2] * 255 / 256 - 32768
        row.append(h)
    rows.append(np.concatenate(row, axis=1))
H = np.concatenate(rows, axis=0)  # north at row 0
np.save(out, H.astype(np.float32))
print('DEM', H.shape, H.min(), H.max())
gy, gx = np.gradient(H, 27.6)
sh = np.clip(0.55 + (-gx + gy) * 0.35, 0, 1)
img = bpy.data.images.new('hs', H.shape[1], H.shape[0])
hn = (H - H.min()) / (H.max() - H.min())
c = np.stack([sh * (0.4 + 0.6 * hn), sh * (0.45 + 0.4 * hn), sh * (0.4 + 0.3 * hn), np.ones_like(sh)], -1)[::-1]
img.pixels = c.ravel()
img.filepath_raw = out.replace('.npy', '.png')
img.file_format = 'PNG'
img.save()
