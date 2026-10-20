# Round 3 · A playable variant (Bruno Simon style)

Research date: 2026-10-16. Purpose: decide whether one variant of the site should be a playable 3D world, and if so, which one. Nothing in the app was changed.

**Method.** I read the source of Bruno Simon's `folio-2019` and `folio-2025` (cloned, not run). I measured the live bruno-simon.com in Chromium at 1440×900 and in iPhone emulation at 390×844 (DPR 3, touch via CDP). Headless Chromium got the real GPU (ANGLE Metal on an Apple M5, WebGPU adapter `apple metal-3`). So the fps numbers below are real, but they come from a fast laptop GPU. Treat them as a ceiling, not a phone measurement. I also measured load under 9 Mbps / 85 ms RTT throttling, and I tested with `prefers-reduced-motion: reduce` and with WebGL/WebGPU removed. Other sites were surveyed the same way (§3). Captures and videos are in `~/Desktop/portfolio-research/3d/`, with a folder per site. Scripts are in `/tmp/pw-3d/`.

---

## 1. Bruno Simon, in depth

### 1.1 Two versions, two stacks

| | folio-2019 (Awwwards Site of the Year, per Creative Bloq) | folio-2025 (current bruno-simon.com) |
|---|---|---|
| Renderer | three r164 in the current repo (the 2024 Vite port), WebGL | three **r183 `three/webgpu`**: `WebGPURenderer`, shaders in **TSL**, falls back to WebGL2 automatically. Canvas reports `data-engine="three.js r183 webgpu"` |
| Lighting | **No lights at all.** Matcap materials (5 matcap PNGs: white/orange/green/brown/gray) plus fake blob shadows (planes under objects) | One Lambert node material coloured from a **palette texture** (every mesh uses UVs into one small palette image). One real shadow-casting light, shadow map 2048 (desktop) / 512 (mobile). Bloom (5 mips desktop, 2 mobile), a cheap DOF pass, fog, a day/night and seasonal cycle driving lighting |
| Physics | **cannon.js** `RaycastVehicle` (car = box chassis + 4 raycast wheels) | **Rapier** (`@dimforge/rapier3d`, WASM) `createVehicleController` (raycast vehicle). Fixed 1/60 step on mobile, adaptive on desktop. Collision groups for floor/objects/bumpers. Physics bodies come from **Blender object names** (`refLandingPhysicalFixed` → fixed body) |
| Controls | Arrows/WASD; on touch a DOM joystick plus boost/jump buttons | Keyboard, mouse drag (camera), **gamepad** (with Xbox glyphs), and touch: **one finger on the ground = drive toward the finger** (raycast to the ground plane; a ring around the car shows forward/back and the steering arc). Two fingers = camera/zoom. Tap on the car = jump. Context buttons (Interact / Unstuck / Prev / Next / Open / Close) appear only when relevant |
| Content | Drive onto floor "tiles" to open project pages (external links); projects are big 3D boards | **In-world.** Areas: Landing, Projects, Lab, Career, Social, Time Machine, Circuit, Bowling, Altar, Cookie, Toilet, Behind the Scene. Projects = a billboard with prev/next/open; Career = coloured light-trails on the ground with years (2008…2025); Social = statues with logos you can knock over (links still work). **A Map (M) teleports to any area**, and a menu holds Home / Options / Controls / Achievements |
| Assets | `static/` 17 MB in the repo (models 5.3 MB, sounds 7.2 MB) | Blender file 152 MB in `resources/`. Pipeline (`scripts/compress.js`): `gltf-transform etc1s` (KTX2/Basis textures) then `draco` (edgebreaker, position 12-bit, normal 6, uv 6). Textures shipped as `.ktx`. Instancing for trees, bushes, lanterns, bricks and pins. ~78,400 single-triangle grass blades in one geometry, looped around the car. Terrain = a 128×128 grid driven by a painted data texture |
| Social | none | Server (WebSocket) for "whispers" (30 live visitor messages with flags, OpenAI moderation), a daily circuit leaderboard, global cookie and altar counters. **38 achievements**, Konami code, seasonal events (Christmas, Easter, Black Friday) |
| Audio | Howler | Howler. A CC0 soundtrack by Kounine, spatialised ambient sound (wind, waves, rain, thunder), layered vehicle sounds (springs, hydraulics, tyres, boost, horn) |
| Dev time | not documented in what I found | "A little over a year" (Awwwards case study), with a YouTube devlog |

### 1.2 Measured on the live site (2026-10-16)

| | Desktop 1440×900 | Mobile 390×844 emulated |
|---|---|---|
| DOMContentLoaded | 2.4 s | 2.0 s |
| "Click to start" visible (unthrottled fibre) | ~4–6 s (a ring "progress" arc fills first, then the diorama of car + tree + lamp) | same |
| Same, at 9 Mbps / 85 ms (fast 4G) | — | **9.7 s** for the last required glb/ktx/wasm/js (5.36 MB) |
| Transfer before audio | ~5.6 MB: Rapier WASM **1.66 MB**, main JS **1.0 MB**, Basis transcoder 0.5 MB, Draco decoder 0.28 MB, glb 0.98 MB, ktx 0.86 MB, analytics 0.16 MB | same core |
| Total after 30 s | **15.2 MB** (one music track `Boy.mp3` is 6.4 MB, plus ~3 MB of ambient loops) | 7.6 MB (music hadn't started) |
| fps (M5 GPU) | 60 median, p90 frame 16.7 ms, idle and driving | 60 at DPR 3. Still 60 with 4× CPU throttle, so the cost is on the GPU |
| DOM content | 0 visible headings, 0 visible links at rest. 19 links / 6 headings exist inside hidden modals. Body text empty | same |
| `prefers-reduced-motion` | **Ignored.** Identical experience | same |
| No WebGL/WebGPU | **Blank dark screen.** JS error `Cannot read properties of null (reading 'getSupportedExtensions')`. No message, no fallback | same |

What the captures show (`bruno-simon/`):
- `d-t1s.png` → `d-t3s.png` → `d-t6s.png`: the loader is part of the world. A glowing arc on a grid fills into a ring, and the ring reveals the start diorama with a hand-lettered "CLICK TO START".
- `d-drive2.png`: after the click, an autumn world with a bridge, river, lanterns and a trail line behind the car.
- `d-z-2-Career.png`: the Career area at night. The light-trail timeline sits beside a projects billboard ("Three.js Journey") with arrow buttons.
- `d-z-3-Social.png`: social statues (GitHub, LinkedIn, X, Discord…) with interact diamonds. A thrown whisper reads "GREAT WORKS!".
- `m-z-4-career.png`: on a portrait phone the same Career scene is cropped. The projects board is cut off at the right edge, so the camera framing was designed for landscape.
- `d-y-*.png` is a failed run, kept because it shows a real fragility. Teleporting via scripted DOM clicks skipped the reveal step and left an empty grid with only the year label. Normal map clicks (`d-z-*`) work.
- Videos: `video-explore3-d/` (desktop map → Career → Social → Lab), `video-mobile/` (tap to start, finger driving, map teleport).

**Path to content (desktop):** load (~5 s) → click → read the keyboard diagram near the spawn → drive, or press M → click "Career" pin → ~2 s teleport → read the in-world board. That's 10–15 s to the first fact about Bruno, if you know to press M. The menu's Home tab has one paragraph of real text ("My name is Bruno Simon, and I'm a creative developer…"). There's no CV link anywhere at rest.

**Path to content (mobile):** load (~10 s on 4G) → tap → one finger drives (works, and it's good) → map button (top right) → tap pin → teleport. Only the "Unstuck" context button shows while driving. Public reports: iOS long-press menus fire while finger-driving, and there's a stutter/freeze after load on iOS (mattdesl on HN suspects texture upload and shader compile).

### 1.3 What public reaction says

- HN thread (item 46206531) and GeekNews (topic 24963). Praise: "a strongly consistent art style", easter eggs, "the attention to detail and joy that clearly went into it". Criticism: "functions poorly as a website", "very impressive as an art project, but terrible as an actual home page", "CPU usage is almost 100% all the time" (M3), 60–70 W draw, "takes a min to load even when it shows the circle complete", Linux Chrome freezes with WebGPU disabled, and "once I'd have spent dozens of hours on this; now I browse it for 30 seconds".
- Bruno himself (Mux interview, 2024): "currently it's a matter mostly of performance"; browser devices have "a quarter of the power" of native; "you need to load all the data", and bandwidth "is not the case in every country". He picked a car because it's easier to steer than a first-person character (Micro Machines). Awwwards case study: "Most of the time, performance is the real constraint on creativity."

### 1.4 Delightful vs gimmicky

**Delightful, and why:**
1. **One toy with physical consequences.** The car is fun in the first second, before you've learned anything. Crates explode, statues tip, bowling pins scatter. Every control has a visible, physical answer.
2. **A coherent hand-made world.** Palette texture, one art direction, hand-lettered UI, sounds for everything. Nothing looks like a stock asset.
3. **The loader is the world.** No percentage bar. The ring that draws itself becomes the stage.
4. **Generous secrets and social traces.** Achievements, whispers from real visitors, a leaderboard. The world rewards a second visit.
5. **Real controls on every input.** Finger-follow driving on touch is better than a virtual joystick.

**Gimmicky, and why it matters more for Tanuj than for Bruno:**
1. **The content is an afterthought.** Bruno's portfolio *is* the proof of his job (a WebGL teacher). The world is the CV. Tanuj's proofs (production ML, a satellite in orbit, interpretability findings) are not "I can make 3D", so a world that hides them behind driving has nothing to show for itself.
2. **No reduced-motion, no no-WebGL path, no DOM content, no CV.** A lab recruiter on a locked-down laptop gets a black screen.
3. **Weight.** 5.4 MB before you can move, 15 MB in 30 s. Rapier's WASM alone (1.66 MB) is 15× the current page's whole initial JS budget (110 KB).
4. **Always rendering.** It renders every frame even when nothing moves, which is why HN measured near-100% CPU.
5. **Readable text in the canvas** (the project boards, the years) is tiny on a phone, and landscape framing crops it in portrait.

---

## 2. Techniques worth stealing (and which to skip)

| Technique | Bruno | For Tanuj |
|---|---|---|
| WebGPU + TSL | Yes | **Skip.** The repo is on three 0.186 WebGL with hand GLSL (`globe.ts`). WebGPU adds the TSL node system to the bundle and crashes some Linux Chrome. Stay on `WebGLRenderer` |
| Rapier WASM | 1.66 MB | **Skip.** `@dimforge/rapier3d-compat` measured 1,614 KB gz. `cannon-es` is 72 KB gz. Better still for a rover on flat ground: a **kinematic controller in ~150 lines** (heightfield lookup, simple bicycle steering, spring suspension faked visually). No physics engine at all |
| Raycast vehicle | Yes | Only if Concept B is chosen. Fake it (see above) |
| Palette texture + one material | Yes (2025) | **Steal.** One 16×1 palette texture, every procedural mesh coloured by vertex attribute or UV into it. Theme-aware (dark default) by swapping the palette |
| Matcaps / no lights | Yes (2019) | **Steal** for mobile tier: matcaps generated at runtime from a canvas gradient, so no image fetch |
| Blob shadows | Yes (2019) | **Steal.** One radial-gradient quad under each object. Shadow maps only on the desktop tier |
| Baked lighting in Blender | Partly | Skip. No modelling pipeline for Tanuj; procedural geometry has nothing to bake into. Use vertex-colour AO computed at build time if needed |
| Instancing + looping fields | Yes | Steal for grass/stars/antenna field. `InstancedMesh`, one draw call |
| KTX2/Draco | Yes | Probably unnecessary. With procedural geometry, total assets can stay under ~300 KB, so the 0.8 MB of decoders would cost more than they save |
| Loader as world | Yes | **Steal**, but the loader must also be the content (see §4) |
| Finger-follow driving | Yes | **Steal** if there's locomotion |
| Map teleport | Yes | **Steal, and make it the default.** A station list that is real HTML buttons, always visible |
| In-canvas text | Yes | **Skip.** All readable text is DOM (overlays/sheets), so it's crisp, translatable, selectable and screen-reader visible. This is DIAGNOSIS item 7 (S4's dithered labels) |
| Continuous render loop | Yes | **Skip.** Render on demand: stop the loop when nothing animates, the tab is hidden, a sheet covers the canvas, or reduced motion is on |
| Audio | 10 MB | Off by default; one ~40 KB synthesized (WebAudio) radio-static/beep set, no music files |
| Achievements/secrets | 38 | 2–3 small ones max. Cheap delight, no weight |

---

## 3. Other playable / 3D sites

<!-- OTHERS -->

---

## 4. Rules for Tanuj's playable variant

These follow from §1–§3 and from `DIAGNOSIS.md` (main-thread cost, unreadable labels, spectacle over content) and `REQUIREMENTS.md` (10-second test, ≤ 110 KB initial JS, Lighthouse ≥ 95, reduced motion honoured, readable with JS off).

1. **The first paint is the plain proof card, not a loader.** SSR HTML: name, the three proofs (Amazon · MarmotSat · Apart), **Resume (PDF)**, email, socials, and a "Plain version" link. It's visible in < 1.5 s on 4G. The 3D world loads *behind* it and the card docks to a corner when the world is ready. A recruiter never waits for WebGL to reach the resume.
2. **No "click to start" gate.** The world is already alive. The first input moves something.
3. **Every station is reachable without playing.** A station list (HTML buttons) is always on screen. Tapping one flies the camera there and opens its sheet. Playing is the scenic route, never the only one.
4. **All readable text is DOM.** The canvas carries shapes, light and motion. Sheets carry words and the existing React demos (`SteeringDemo`, `LossMaskDemo`, `OceanDemo`, `OrbitDemo`) mounted unchanged.
5. **Budgets.** World chunk ≤ 250 KB gz JS including three (three is 185 KB gz in today's build), ≤ 300 KB of other assets, no WASM, no audio files. Cap DPR at 1.5 on mobile and 2 on desktop. 60 fps on desktop, ≥ 30 fps on a mid Android (Pixel 6a class). TBT on the SSR shell < 200 ms (the world boots after `requestIdleCallback` and first input or 2 s).
6. **Render on demand.** The loop sleeps when idle, hidden, covered or in reduced motion. This answers the "100% CPU" criticism.
7. **Fallbacks are designed, not accidental.** No WebGL → the main variant (`/`) with a one-line note. Reduced motion → a still render of the world (prerendered AVIF poster) with the same station hotspots as DOM buttons; camera moves become cuts; the satellite updates every 10 s (already the §6 rule in REQUIREMENTS). Save-Data or `deviceMemory ≤ 2` → poster mode by default with a "Load 3D" button.
8. **Real data is the spectacle.** Every animated thing should be true: the real Sun angle at Victoria, the real MarmotSat position, real steering outputs. This is what the v6 diagnosis praised ("the decoration is the research") without v6's cost.

---

## 5. Three concepts

### Concept A · "Pass": a ground station on a Victoria hilltop at night

**World and metaphor.** A small low-poly diorama: a hilltop above the Strait with a 3-m dish, a portable cabin, a mast with the callsign VA7UVS, and the sea below. The sky is the **real sky over Victoria right now**: Sun/terminator from `sunPos`, and **MarmotSat drawn where it actually is** (SGP4 from `tle.json`, already in `src/demos/orbit/`). Most of the time it's below the horizon, so the dish idles and a pass clock counts down. During a real pass (several a day, a few minutes each) the dish slews to track it and the radio crackles. The metaphor: *everything Tanuj builds is a signal you can tune in to.* The one thing nobody else's portfolio can do: "the satellite I wrote firmware for is above you in 2 h 14 min."

**Stations (each one an object in the compound; tap → camera eases to it → a DOM sheet opens):**
| Object | Proof | What's in the sheet |
|---|---|---|
| The dish + pass clock | MarmotSat firmware, NORAD 69912 | `OrbitDemo` (globe, next pass). A "Warp to next pass" button speeds up the sky until the satellite rises, and the dish swings to follow |
| Cabin workstation (lit monitor) | Amazon LLM planning assistant | The metric panel: 180+ sites, 60%+ time-to-insight, $136.2M/yr projected. Amazon logo. No fake screenshots |
| Radio console with a big dial | Activation steering on Qwen2.5-1.5B | **The dial is α.** Turning it (drag, or arrow keys) moves through the 9 real α values in `steering.json`. The cabin speaker's text, shown in the sheet, rewrites live, and the cabin light shifts warm/cold with the joy/distress direction. Labelled "replication" |
| Logbook on the desk | Apart: SFT loss masking and shutdown distress | `LossMaskDemo`: the real Qwen tokens, the loss-landing highlight, the finding stated first |
| Tide buoy in the water below | Ocean temperature probe (SOLIDS) | `OceanDemo`, labelled illustrative. Dragging the probe line in the sheet lowers a probe from the buoy in the world |
| Noticeboard by the door | Experience, more work, contact | Experience rows, then Resume / email / GitHub / LinkedIn |

**Controls.** Desktop: drag to orbit within a clamped arc (camera-controls, 11 KB gz), wheel to zoom 2 steps, click objects, keys 1–6 jump to stations, Esc closes a sheet. Touch: one-finger drag orbits, tap selects, the station rail along the bottom is the main nav (44 px targets). The only "play" is direct manipulation: slewing the dish by dragging it, turning the dial, lowering the probe, flicking the cabin light. Optional small toy: a maintenance rover you can tap-to-drive around the compound (kinematic, no physics).

**Resume in 10 seconds.** The SSR proof card shows from the first paint with Resume (PDF) as the primary button. When the world loads the card docks top-left and keeps the Resume button. The noticeboard repeats it.

**Reduced motion / no WebGL.** Reduced motion: prerendered still of the hilltop (AVIF, ~60 KB) with hotspots as DOM buttons. The dish position is computed but only updated every 10 s. No camera flights. No WebGL: redirect to `/` with "This version needs WebGL; here's the same content." JS off: the SSR proof card plus a link list of all stations.

**Build plan.**
- Libraries: `three` (already in the repo), `camera-controls` (11 KB gz), existing `satellite.js` subset (`src/demos/orbit/sgp4.ts`), existing demos. No physics engine. WebAudio for 3 synthesized sounds.
- Assets: **all procedural.** Terrain = noise heightfield (one `PlaneGeometry`, 64×64). Dish = lathe geometry. Cabin = extruded boxes. Sea = a plane with a cheap normal-noise shader. Stars = a `Points` buffer from a ~1,500-star subset of a public-domain catalogue, baked to a 12 KB binary. Palette texture 16×1. Blob shadows. Vertex-colour AO. Zero glTF.
- Budgets: world chunk ~215 KB gz (three 185 + world ~30), assets ~90 KB (stars, land mask, poster AVIF), 0 WASM. Initial route still ≤ 110 KB (the world is lazy).
- Effort: **~2–3 weeks** for one person with this repo: 3 days scene and palette, 3 days camera/stations/sheets, 2 days live sky and dish tracking (reusing `model.ts`), 2 days dial/probe/logbook interactions, 2 days fallbacks, perf tier and Lighthouse, 2 days polish and sound.

### Concept B · "Field Day": drive a rover between stations (closest to Bruno)

**World and metaphor.** A small island (abstracted Vancouver Island coast) with a six-wheel rover. Stations around a loop road: a **launch pad** with the CubeSat on its deployer (MarmotSat), a **warehouse** with automated shelves (Amazon), a **lab tent** whose floor is an activation landscape (steering), a **dock with a buoy** (ocean probe), and a **chalkboard** in an amphitheatre (loss masking). Metaphor: *a field day of everything he's built.*

**How proofs appear.** Drive into a station's ring → context button "Open" (Bruno's pattern) → DOM sheet with the demo. The lab tent floor bends with α: driving across it, the rover is pushed toward the joy or distress basin, and the steered sentence shows in the sheet. The launch pad has a live "next pass" sign; at pass time a light streaks across the sky.

**Controls.** Desktop: WASD/arrows, Shift boost, Space hop, Enter interact, M map. Touch: Bruno's finger-follow driving (one finger on the ground = drive toward it), two-finger orbit, context buttons. Gamepad free via the Gamepad API.

**Resume in 10 seconds.** Same SSR proof card, docked. The map/station list is always visible, and "Resume" is in it.

**Reduced motion / no WebGL.** Reduced motion: no driving. The map becomes the interface: an illustrated top-down poster with station buttons, and sheets open directly. No WebGL: `/`.

**Build plan.**
- Libraries: `three`, `cannon-es` (72 KB gz) *or* a custom kinematic rover (preferred: 0 KB, deterministic, no tunnelling issues on a flat island), `camera-controls`.
- Assets: procedural island (signed-distance coastline → heightfield), rover from primitives (box + 6 cylinders + mast), instanced trees/rocks from a few low-poly primitives. Optional free CC0 kit (Kenney "Space Kit"/"Nature Kit", CC0) for a few props via glTF ≤ 150 KB total after `gltf-transform` quantize. No paid assets.
- Budgets: ~260–330 KB gz JS (three + world + optional cannon-es), assets ≤ 250 KB. Mobile tier: DPR 1.25, no shadow map, matcaps.
- Effort: **~5–7 weeks.** Driving feel alone (tuning, camera follow, collisions, getting unstuck, touch steering, iOS long-press suppression) is the bulk. Bruno took a year with a much bigger world. This one is also the most likely to land as "art project, terrible home page".

### Concept C · "Steer": a walk through the model's activation space

**World and metaphor.** A terrain built from Qwen2.5-1.5B's layer-17 projection (the `cloud.pos`/`cloud.neg` points in `steering.json` become hills and basins). A small glowing marble is "the model's state"; you roll it with tilt (gyro on phones, mouse on desktop). **The α dial bends the terrain**: positive α raises a slope toward the joy basin, so the marble rolls there and the steered output appears. Loss masking appears as a path of token stones that light by where the loss lands. MarmotSat and Amazon are a "sky" layer: a satellite crosses the dome at its real time, and a constellation of 180 points (sites) for Amazon.

**How proofs appear.** Steering and loss masking are *native* to the world; they are the world. Amazon, MarmotSat and ocean are bolted on as sky decorations with DOM sheets.

**Controls.** Desktop: mouse tilt / arrows roll the marble, a dial slider for α (native `input[type=range]` with `aria-valuetext`). Touch: drag to tilt (gyro opt-in, iOS needs a permission prompt), slider docked at the bottom.

**Resume in 10 seconds.** Same SSR card.

**Reduced motion / no WebGL.** Reduced motion: a static contour map (SVG, from the same data) with the slider still working, as a re-coloured basin plus text. No WebGL: `/`.

**Build plan.** `three`, custom marble physics on a heightfield (gradient descent with damping, ~80 lines), procedural everything, data already in the repo. ~220 KB gz JS, ~40 KB assets. Effort **~3–4 weeks.** Risk: this is v6 again (a latent-space scene), and DIAGNOSIS showed that reviewers read it as "real data used as wallpaper". It is also the weakest for recruiters: the strongest credential (Amazon) becomes a decoration.

---

## 6. Recommendation

**Build Concept A, "Pass".** Borrow exactly two things from B: finger-follow tap-to-drive for an optional maintenance rover, and Bruno's teleport map (as the always-visible station rail).

Why:
1. **It's the only concept where the 3D earns its place.** The live satellite over Victoria is true, specific to Tanuj, and impossible on a flat page in the same way. Bruno's world proves "I make 3D". Tanuj's world proves "the thing I built is up there right now". A recruiter remembers that, and a lab reviewer gets the real demos one tap away.
2. **It fixes the three failures in DIAGNOSIS.** Main-thread cost (render-on-demand, no physics, procedural, ~215 KB gz). Unreadable labels (all text is DOM). Spectacle over content (the proof card is the first paint; every station is a button).
3. **It works on phones.** A fixed diorama frames well in portrait, a tap-and-drag diorama has no driving to learn, and there's no iOS long-press fight.
4. **It's the cheapest to make excellent** (2–3 weeks vs 5–7 for B). It reuses `src/demos/orbit/*` and every existing demo unchanged.
5. **The play is honest.** Slewing a dish, turning a steering dial, lowering a probe: each toy *is* the demo, which is the "headline rewrites as α changes" idea that DIAGNOSIS called the one motion worth keeping.

What would change my mind: if Tanuj's goal is "this should feel like a game first", B is the only one that does. It should then still ship with A's rules (§4), and it costs at least twice as much.

**Before building, a gate:** a 2-day spike of A's scene (terrain, dish, sky, MarmotSat in the right place, station rail, one sheet). Measure it on a real mid-range Android over 4G. If it can't hold 30 fps at DPR 1.5 within a 250 KB gz chunk, stop.
