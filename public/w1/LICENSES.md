# W1 · Room — asset provenance

Everything in the room is modelled from scratch in Blender 5.0.1 by `src/room.py` (headless, procedural materials),
lit with Cycles and baked into three 2048 px atlases (`room.glb`; `room-1k.glb` is the same scene with 1024 px atlases
for phones). No third-party models, textures or HDRIs are used.

Posters (`poster-*.webp`) are screenshots of that baked scene in the browser.

Fonts (bundled from node_modules at build time): Mona Sans (SIL OFL 1.1, GitHub), Geist Mono (SIL OFL 1.1, Vercel).
Decoder: meshoptimizer's decoder ships inside three.js (MIT).

Rebuild: `Blender -b --python src/room.py -- bake <outdir> 160 2048`, then `src/pack.sh <outdir>/room.glb public/w1`.
