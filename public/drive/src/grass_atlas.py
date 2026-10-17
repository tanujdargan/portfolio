import bpy, numpy as np, sys
src = '/tmp/drive-dl/grass/'
def load(n):
    im = bpy.data.images.load(src + n)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    return np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1]  # row 0 = top
D = load('dry_diff.png'); G = load('Diffuse.png'); A = load('Alpha.png')
boxes = [(206, 763, 505, 902), (605, 774, 839, 877), (245, 909, 509, 996), (590, 884, 807, 1004)]
out = np.zeros((512, 1024, 4), np.float32)
for k, (x0, y0, x1, y1) in enumerate(boxes):
    mix = 0.75 if k % 2 == 0 else 0.55
    c = D[y0:y1, x0:x1, :3] * mix + G[y0:y1, x0:x1, :3] * (1 - mix)
    a = A[y0:y1, x0:x1, 0:1]
    rgba = np.concatenate([c, a], -1)
    # resize to 512x256 with nearest-ish sampling (bilinear via index math)
    H, W = rgba.shape[:2]
    yy = np.clip((np.arange(256) + 0.5) / 256 * H, 0, H - 1).astype(int)
    xx = np.clip((np.arange(512) + 0.5) / 512 * W, 0, W - 1).astype(int)
    cell = rgba[yy][:, xx]
    r, cc = k // 2, k % 2
    out[r * 256:(r + 1) * 256, cc * 512:(cc + 1) * 512] = cell
img = bpy.data.images.new('g', 1024, 512, alpha=True)
img.colorspace_settings.name = 'Non-Color'
img.pixels = out[::-1].ravel()
img.filepath_raw = '/tmp/drive-blender/grass_atlas.png'
img.file_format = 'PNG'
img.save()
print('GRASS atlas ok')
