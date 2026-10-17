# W3 "Descent": asset provenance

## Modelled for this variant (Blender 5.0.1, headless; scripts in `src/`)
- `models/cubesat.glb`, `tex/sat-*.webp`: an illustrative 3U CubeSat (340.5 x 100 x 100 mm, the size UVic and SatNOGS give for MarmotSat). The layout is not the flight hardware. Bake: AO (Cycles, 96 spp), plus emission bakes of albedo, roughness and metalness into a 2048 atlas. Script: `src/cubesat.py`.
- `models/shards.glb`, `models/tile.glb`: ice shards (one per activation-cloud point) and token keycaps. Script: `src/ice.py`.
- `models/rack.glb`, `tex/rack-lit.webp`: one selective-rack module with pallets and cartons. Overhead aisle lighting and AO are baked with Cycles (128 spp, denoised) into a 2048 atlas. This is an illustrative fulfillment-centre scene, not Amazon imagery. Script: `src/warehouse.py`.
- `models/probe.glb`, `tex/probe-*.webp`: an illustrative CTD-style sensor package on a mooring, not a specific Ocean Networks Canada instrument. Script: `src/probe.py`.
- `stills/*.webp`: frames rendered by this variant's own WebGL scene. They are the first-paint poster and the reduced-motion and no-WebGL fallbacks.

All meshes are compressed with `@gltf-transform/cli meshopt` and decoded with three's bundled `meshopt_decoder`.

## Third-party (public domain)
- `tex/earth-day-*.webp` and `tex/earth-pnw.webp`: NASA Visible Earth, Blue Marble Next Generation (topography and bathymetry, August 2004). The global map is 5400 x 2700; the regional crop comes from tile A1 (21600 x 21600). NASA imagery is in the public domain.
- `tex/earth-night.webp`: NASA Earth Observatory, Black Marble 2016. Public domain.
- `tex/earth-clouds.webp`: NASA Visible Earth, cloud combined 2048. Public domain.

## Fonts (loaded from node_modules, not copied)
- Mona Sans (GitHub), SIL Open Font License 1.1.
- Martian Mono (Evil Martians), SIL Open Font License 1.1.
