# W2 · Playground: asset provenance

All 3D geometry, materials and lighting were made procedurally for this site in Blender 5.0.1 (scripts in `src/`:
`world.py` for the island and stations, `dyn.py` for the rover and moving props, `lib.py` helpers). Lighting and AO are
baked with Cycles into `world/terrain.webp`, `world/props.webp`, `world/dyn.webp` and `world/light.webp`. No third-party
models, textures or HDRIs are used.

| File | Source | Licence |
|---|---|---|
| `fonts/amatic-sc-700-latin.woff2` | Amatic SC Bold by Vernon Adams, via Google Fonts | SIL Open Font License 1.1 |
| `world/*.glb`, `world/*.webp`, `world/height.bin`, `world/layout.json`, `poster-*.webp` | Made for this site (see `src/`) | Same as the site |

Rebuild: `Blender -b --python src/world.py -- bake`, `Blender -b --python src/dyn.py -- bake`, then denoise (OIDN via the
compositor), WebP via `cwebp`, and `npx @gltf-transform/cli meshopt`. `poster-*.webp` are frames of the live world at
its overview camera, captured with Playwright (`?w2poster=d|m`).
