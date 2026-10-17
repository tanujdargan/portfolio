# The sky: Poly Haven "Qwantani Sunset (Pure Sky)" (CC0). Finds the sun in the HDRI and writes the runtime background
# (upper hemisphere, sRGB, exposure-matched) for three.js.   Blender -b --python sky.py -- <in.hdr> <out.png>
import bpy, sys, math, json, os
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
im = bpy.data.images.load(a[0])
w, h = im.size
px = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, :3]  # row 0 = zenith
lum = px @ np.array([0.2126, 0.7152, 0.0722], np.float32)
r, c = np.unravel_index(np.argmax(lum), lum.shape)
u, v = (c + 0.5) / w, 1 - (r + 0.5) / h
print('SUN pixel', r, c, 'u', u, 'v', v, 'lum', lum.max(), 'elev deg', (v - 0.5) * 180)
# upper hemisphere (+ 2 degrees below the horizon) at 4096 x 1072, exposure so the sky reads like a photo
ex = float(a[2]) if len(a) > 2 else 0.6
rows = int(h * (0.5 + 2 / 180))
up = px[:rows]
k = 1
pass
x = np.clip(up * ex, 0, None)
srgb = np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(np.clip(x, 0, 1), 1 / 2.4) - 0.055)
srgb = np.clip(srgb, 0, 1)
H2, W2 = srgb.shape[:2]
out = bpy.data.images.new('bg', W2, H2)
rgba = np.concatenate([srgb, np.ones((H2, W2, 1), np.float32)], -1)[::-1]
out.pixels = rgba.ravel()
out.filepath_raw = a[1]
out.file_format = 'PNG'
out.save()
json.dump({'sun_u': float(u), 'sun_v': float(v), 'rows': rows, 'h': h, 'w': w, 'exposure': ex, 'out_h': H2, 'out_w': W2}, open(a[1].replace('.png', '.json'), 'w'))
print('BG', W2, H2)
