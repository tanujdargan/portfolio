# W4/W5 · Drive: asset provenance

## Made for this site (same licence as the site)
| File | What | How |
|---|---|---|
| `car.glb`, `car_ao.webp` | The 911-inspired coupé: body, glass, lamps, wheels, the five-dial cockpit. No Porsche logos, badges or lettering. | Modelled procedurally in Blender 5.0.1 (`src/car.py`); AO baked with Cycles. |
| `world.glb` (city, freeway, bridge, road, tunnel, guard rails, signs, stations, terrain meshes) | The route and everything on it. | Modelled procedurally in Blender (`src/world.py`); sky, lamp and sun-shadow light baked into vertex colours with Cycles. |
| `signs.webp` | The six roadside signs. Every claim comes from `src/content/curated.ts`. | `src/signs.mjs` (HTML rendered with Playwright). |
| `trees_color.webp`, `trees_normal.webp` | Fir impostor atlas (colour + view-space normals). | Rendered from Poly Haven's Fir Tree 01 (below) with `src/trees.py`. |
| `grass.webp` | Four grass tussock cards. | Cropped from Poly Haven's Grass Medium 01 textures (below) with `src/grass_atlas.py`. |
| `sky.webp` | The upper hemisphere of the HDRI below, exposure-matched. | `src/sky.py`. |
| `poster-*.webp`, `stills/*.webp` | First-paint posters and the reduced-motion stills. | Frames of the live world captured with Playwright (`?driveposter=1`). |
| gauge atlas (inside `car.glb`) | Dial faces. | `src/gauges.mjs`. |

## Third-party (no attribution required; credited anyway)
| Asset | Source | Author | Licence |
|---|---|---|---|
| Qwantani Sunset (Pure Sky) HDRI | https://polyhaven.com/a/qwantani_sunset_puresky | Greg Zaal, Jarod Guest (Poly Haven) | CC0 1.0 |
| Fir Tree 01 (rendered to impostors) | https://polyhaven.com/a/fir_tree_01 | Rico Cilliers (modelling), Rob Tuytel (photography) | CC0 1.0 |
| Grass Medium 01 (textures, cropped) | https://polyhaven.com/a/grass_medium_01 | Rico Cilliers, Rob Tuytel | CC0 1.0 |
| Grass004, Ground037, Rock035, Snow010A, Gravel023, Asphalt033, Concrete034 (`tex/*.webp`, packed and downsized) | https://ambientcg.com | Lennart Demes (ambientCG) | CC0 1.0 |
| Elevation of the Teton Range (the mountains, turned and scaled 0.75) | AWS Open Data Terrain Tiles, terrarium z12 tiles 785–789 × 1491–1495, from USGS 3DEP | U.S. Geological Survey | Public domain |
| Geist, Instrument Sans (sign and gauge lettering) | Vercel; Rodrigo Fuenzalida / Instrument | | SIL OFL 1.1 |

The car is not a third-party model. No CC0 or CC-BY 911-shaped coupé with an interior could be downloaded without
credentials (Sketchfab needs a token; Poly Pizza, Kenney, Quaternius and the three.js/Khronos samples have no 911-like
car), so it was modelled here.

## Rebuild
1. `node src/gauges.mjs`, `node src/signs.mjs` (Playwright).
2. Download the HDRI (4k .hdr), the fir `.blend` with its textures, the grass textures, the ambientCG 1K-JPG sets and
   the terrain tiles into `/tmp/drive-dl/` (see the scripts for paths).
3. `Blender -b --python src/dem.py -- /tmp/drive-dl/dem /tmp/drive-blender/dem.npy`
4. `Blender -b --python src/sky.py -- <hdr> /tmp/drive-blender/sky_bg.png 0.18`, then `cwebp`.
5. `Blender -b <fir.blend> --python src/trees.py -- <out>`; `Blender -b --python src/grass_atlas.py`; `Blender -b --python src/packtex.py -- <tex dir> <out>`.
6. `Blender -b --python src/car.py -- bake` and `SKYS=2.4 Blender -b --python src/world.py -- bake`.
7. `npx @gltf-transform/cli meshopt` on both `.glb` files; copy `meta.json`, `trees.bin`, `grass.bin`.
