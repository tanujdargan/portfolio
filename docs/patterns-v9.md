# Patterns for V9 "Depth"

These are the Mobbin references gathered for V9 in Sept 2026, written in the same format as PORTFOLIO_TASTE.md §4. Five searches were run:
- a full-screen dark water or shader hero with text over it
- a scroll timeline with a depth or altitude gauge and year markers
- predicted-versus-measured sensor readouts
- ambient sound toggles
- vertical gauges with a live numeric readout (iOS)

Mobbin stores single frames, so any motion described here is *(inferred)*. No reference had a generative ocean. The ocean itself is built from first principles (see the V9 index.tsx header). What the references supply is the chrome around the scene.

**V9-P1 Scene hero, stats on the floor.** *Src:* Unity "Go Create" ([screen](https://mobbin.com/screens/6359ec02-eb25-4da6-a46e-6d159479e739)).
- *Does/why:* A dark, moody 3D scene (a boat on a night sea) fills the viewport. The headline sits large in the sky. Three proof numbers ("20+", "3.6B", "82") sit in a row along the bottom edge, over the darkest part of the scene. The scene carries the mood and the stat row carries the proof, and neither covers the other.
- *Fits:* the V9 surface. The name and the one-line claim sit in the dusk sky, and the three `useProof()` points run in a hairline-topped row over the dark near-field water. The moon glitter is placed on the right, away from the text.
- *Build:*
  - A radial scrim sits behind the name, plus a bottom scrim that fades back to 0 at the hero's lower edge, so it leaves no seam.
  - The horizon is fixed at 58% on desktop and 64% on mobile. The shader and the CSS fallback share the same numbers.
  - **RM:** the same frame, frozen.

**V9-P2 Pinned year column over full-bleed imagery.** *Src:* Joby Aviation "Breakthroughs" ([section](https://mobbin.com/sites/sections/6944c2bb-f5b4-4bf0-b707-e4c048c17040)), V7 timeline ticks ([section](https://mobbin.com/sites/sections/a5b3c6c0-dd04-4ca2-b06b-4ee1c673c2a5)).
- *Does/why:* Joby lists its years in a column: the active year is bright and the rest are dim, all over a full-bleed forest photo. V7 draws a tick ruler with accent ticks at events. Together they show where you are in time and where the events sit, without a progress bar.
- *Fits:* the V9 depth gauge. A tick ruler scrolls under a fixed accent needle. Year bands (2026 to 2022) and accent dots mark each milestone.
- *Build:*
  - The ruler moves by a `translate3d` computed from scroll through anchors that are measured on resize only. There are no layout reads on scroll.
  - The readout shows metres in large tabular mono with the month and year under it.
  - **RM:** the same, because it's scroll-scrubbed and not ambient.

**V9-P3 Big number over a ruler.** *Src:* Me+ weight picker ([screen](https://mobbin.com/screens/186618f9-d714-42b0-baf1-01cfcfd932a7)), Runna elevation ([screen](https://mobbin.com/screens/892f40ae-8664-4096-b8dd-95c0d578c4e1)), Tide Guide ([screen](https://mobbin.com/screens/3f126a65-3ae1-46fc-90e2-331a302aeca8)).
- *Does/why:* Each one pairs a large numeral ("70.0 kg", "193 m", "0.7m") with a small unit and a ruler or curve right under it. You read the value first and then its context. Me+ makes the ruler itself the control.
- *Fits:* the gauge is a real `role="slider"`. You can drag the ruler to scrub the dive, and ↑/↓ jump to the previous or next station. On phones, where a draggable edge would fight scrolling, it collapses to a readout pill ("128 m · Jun 2025").
- *Build:*
  - Pointer capture on the window: 1 px of drag equals 0.9 m.
  - Keys step through the anchors with `scrollTo` (smooth unless reduced).
  - `aria-valuetext` reads "128 metres, Jun 2025".

**V9-P4 Forecast band against measured points.** *Src:* Databricks weather dashboard ([screen](https://mobbin.com/screens/662bc1c6-57e2-44b5-bf0d-18efe99395ef)), GitBook traffic ([screen](https://mobbin.com/screens/1dfc1ac5-3d51-4fcf-82d4-7a2109087afd)).
- *Does/why:* Databricks draws the forecast as a line with a shaded uncertainty band, set against the observed series. The gap between prediction and truth is the story, and the band says how much to trust the line.
- *Fits:* the SOLIDS satellite-to-deep-water sketch. A satellite beams onto the surface, and a dashed "inferred" column drops to a probe. The model's curve and band sit next to moored-sensor dots.
- *Build:*
  - The plot is SVG. A native range input steps the probe through 12 sensor depths, and dragging on the plot works too.
  - Four readouts: Depth, Predicted (accent), Sensor, Residual.
  - It is labelled "Illustrative". The real R² = 0.936 carries its `<Flag>`.

**V9-P5 Sound is opt-in and says so.** *Src:* mymind "Diving into your mind…" with a SOUND pill ([screen](https://mobbin.com/screens/29c2d334-fc1b-428a-960c-07190d42a18d)), SuperHi FM ([screen](https://mobbin.com/screens/9f01acf8-4ee1-40d9-92fa-412845e157f5)).
- *Does/why:* mymind's immersive "diving" transition keeps a small SOUND pill in a corner. SuperHi offers "Want some ambient music in the background?" behind a muted icon. The ambience is there if you ask for it and silent until you do.
- *Fits:* the V9 "Sound off" pill, bottom-right on desktop and next to the depth pill on phones.
- *Build:*
  - Nothing loads until the click: the audio module is a dynamic import, and the `AudioContext` is created in the handler.
  - The sound is synthesized: brown-noise swell through a lowpass that closes with depth, a drone that rises with depth, and a sonar ping, panned left or right, when a station resolves.
  - The button uses `aria-pressed`.

**V9-P6 Sonar ping resolves into a card.** *Src:* V7 accent event ticks ([section](https://mobbin.com/sites/sections/a5b3c6c0-dd04-4ca2-b06b-4ee1c673c2a5)), PayPal alternating timeline ([section](https://mobbin.com/sites/sections/2644f16d-1d3f-4cc5-ae0c-4521e8a03f2b)).
- *Does/why:* PayPal alternates cards left and right of a central spine with years on the spine. It's generic on white, but the structure scans fast. On a dark sea the spine becomes a sounding line and each event becomes a bioluminescent marker.
- *Fits:* every `useMilestones()` item, newest first. Steering, the Digital Minds sprint and Amazon come just below the surface, and Hack@JBCNOsh sits on the seabed.
- *Build:*
  - Two accent rings `scale(1 → 1 + 10·k)` and fade out. Then the card rises `26px·k` and fades in, once, driven by an IntersectionObserver.
  - The static HTML shows every card. JS only hides the ones below the fold.
  - The steering demo and the sensor get wide cards that span the spine.
  - **RM:** k = 0, so the transition is opacity only.

**V9-P7 Still water.** *Src:* Unity (a hero that is a composed still frame at rest).
- *Does/why:* Reduced motion must not look like a broken page. The ocean renders one composed frame at a fixed time: no loop, no ripples, no snow parallax. As you scroll, the waterline sweep becomes a crossfade.
- *Build:* the shader's `uMix` switches the split waterline to `mix()`. The loop stops, and the ocean renders a frame only when scroll changes depth.

**V9-P8 Logbook on the seabed.** *Src:* Joby (an editorial column after the immersive part), PayPal timeline (the full text version).
- *Does/why:* The immersive layer is the hook, and a recruiter still needs the document. At 474 m a gradient settles into solid ground. It holds the full log: expandable experience rows, 5 research write-ups, Beri (flagged), engineering, community, earlier work and contact.
- *Build:* the `.v9-log` background runs from transparent to `--bg` over 40svh. Once it covers the viewport, the WebGL loop pauses.
