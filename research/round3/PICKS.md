# Tanuj's picks (2026-10-17)

Tanuj rejected every round-3 variant (H1–H4, X1). He called X1's procedural 3D assets "horrid". He then picked these 20 references in the research picker, with no notes (raw list in `picks.json`). **Build close to these references, not to my earlier syntheses.** He strongly prefers dark mode.

Captures (frames, desktop and mobile recordings, `report.json` with measured animations) live on disk:
- Mobbin images: `~/Desktop/portfolio-research/mobbin/img/<name>.webp`
- Live sites: `~/Desktop/portfolio-research/web/<slug>/` (`d-*.png`, `m-*.png`, `desktop.mp4`, `mobile.mp4`, `sheet-desktop.jpg`, `report.json`)
- 3D portfolios: `~/Desktop/portfolio-research/3d/<slug>/`

The write-ups are in `WEB.md`, `MOBBIN.md` and `INTERACTIVE.md` (sections 1 and 3) in this folder.

## Cluster 1: how the work is explained (Mobbin)
| Pick | What it is | Image |
|---|---|---|
| Giga | Annotated playback: a transcript plays and plain-language chips drop from the exact words | `mobbin/img/giga-emotion.webp` |
| Dovetail | Many sources wired into one product window | `mobbin/img/dovetail-hero.webp` |
| Dovetail | One lit step in a list, with its pipeline diagram | `mobbin/img/dovetail-noise.webp` |
| Wild | The visual is the process: scattered → aligned | `mobbin/img/wild-pixels.webp` |
| Rox | Exploded isometric layers, with the matching layer lit in the list | `mobbin/img/rox-layers.webp` |
| Waabi | A spec card overlapping the real model output | `mobbin/img/waabi-featured.webp` |
| Chronicle | A sentence that goes grey to white, plus a card rail | `mobbin/img/chronicle-twotone.webp` |

## Cluster 2: site craft and motion (live sites)
- **Dennis Snellenberg** (dennissnellenberg.com): Awwwards SOTD. Curved-edge curtain page transitions, magnetic buttons, big type, a hover image follower on the work list, smooth scroll.
- **Ravi Klaassens** (raviklaassens.com): Awwwards SOTD and Developer Award. `linear()` springs, precise micro-motion, a strong typographic grid.
- **Cassie Evans** (cassie.codes): playful SVG/GSAP character animation and personality. The live site is retired; the captures remain.
- **Black Forest Labs** (bfl.ai): a frontier AI lab; generated imagery as the hero, confident dark product type.
- **ElevenLabs** (elevenlabs.io): AI product polish; live audio/product widgets in the hero, glossy dark cards.
- **Raycast** (raycast.com): dark glass and 3D-lit hero objects, keyboard and command-palette motifs, keycaps.

## Cluster 3: 3D (6 picks; 3D matters to him, and the quality must match these)
- **Bruno Simon** (picked twice): a drivable toy car, physics, stations, a playful world.
- **igloo.inc**: scroll-driven cinematic 3D with premium shading (ice, glitch text).
- **Messenger (Abeto)**: a tiny planet with a character, streaming assets, gorgeous stylised art.
- **Jesse Zhou**: a baked-lighting Blender diorama (ramen shop) with signposts as menu.
- **Henry Heffernan**: a modelled desk and room where the monitor is a real interactive OS (HTML).
- **Thibault Introvigne**: a walkable astronaut with a joystick on mobile and an always-visible About.

**Quality bar for 3D:** modelled geometry with bevels and proper proportions, baked lighting/AO (Blender Cycles bake), considered materials and palette, and compressed glTF (Draco or meshopt, KTX2/webp textures). Never three.js primitives with flat colours. Blender 5.0.1 runs headless at `/Applications/Blender.app/Contents/MacOS/Blender -b --python <script>`. CC0 sources are allowed (Poly Haven, Kenney, Quaternius, ambientCG), with licences noted in `public/<id>/LICENSES.md`.
