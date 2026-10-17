import bpy, sys, os
import numpy as np
src, out = sys.argv[sys.argv.index('--') + 1:]
def load(p, cs='Non-Color'):
    im = bpy.data.images.load(p)
    im.colorspace_settings.name = cs
    return im
def save(arr, path, w, h):
    im = bpy.data.images.new('o', w, h, alpha=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels = arr.ravel()
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
for name, aid in (('grass', 'Grass004'), ('forest', 'Ground037'), ('rock', 'Rock035'), ('snow', 'Snow010A'), ('gravel', 'Gravel023'), ('asphalt', 'Asphalt033'), ('concrete', 'Concrete034')):
    d = os.path.join(src, aid)
    n = load(os.path.join(d, f'{aid}_1K-JPG_NormalGL.jpg'))
    r = load(os.path.join(d, f'{aid}_1K-JPG_Roughness.jpg'))
    n.scale(512, 512)
    r.scale(512, 512)
    N = np.array(n.pixels[:], np.float32).reshape(512, 512, 4)
    R = np.array(r.pixels[:], np.float32).reshape(512, 512, 4)
    P = np.stack([N[..., 0], N[..., 1], R[..., 0], np.ones((512, 512))], -1)
    save(P, os.path.join(out, f'{name}_nr.png'), 512, 512)
    os.system(f'cp "{os.path.join(d, aid + "_1K-JPG_Color.jpg")}" "{os.path.join(out, name + "_c.jpg")}"')
    print('PACK', name)
