# Interaction and motion patterns for the studio round

Research date: 2026-09-28. The site is dark, and the work is six live demos: steering, loss masking, ES fine-tuning, GPU retrieval, ocean sensing and the CubeSat globe. The experience list uses full-colour logos. The current stack is React 18, framer-motion 11, three 0.186 and Vite. Neither GSAP nor Lenis is installed yet.

**Verification labels**
- **seen live**: I opened the site in Playwright (Chromium with SwiftShader) and captured the state myself. Where a number is given, I read it from the DOM or from the computed styles.
- **Codrops demo**: I opened the Codrops demo and interacted with it.
- **Mobbin**: I found it through the Mobbin MCP. These are static captures, so the motion is inferred.
- **article only**: the mechanics come from a write-up. I did not see them running.

Screenshots are in `research/patterns/`, referred to as *(shot: name)*.

**Budget key**: S = CSS or a few hundred bytes. M = under 10 KB, or GSAP core plus one plugin. L = a WebGL pass or a new 3D scene.

---

## 1. Type motion

### 1. Line-masked reveal (SplitText with `mask: "lines"`)
- **Source:** https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/ (Osmo demo), plus the tip list at https://tympanus.net/codrops/2025/09/03/7-must-know-gsap-animation-tips-for-creative-developers/
- **Mechanics:** Runs on first view or on section entry. Each line sits inside an `overflow:clip` wrapper and animates `yPercent 100 → 0`.
  - Lines: 0.8 s with a 0.08 s stagger.
  - Words: 0.6 s with a 0.06 s stagger.
  - Letters: 0.4 s with a 0.008 s stagger.
  - Ease: `CustomEase "0.625, 0.05, 0, 1"`.
  - `stagger: {each, from: "start" | "center" | "edges"}` changes the direction the wave travels.
- **Fits:** The hero name and role line. The one-sentence claim at the top of each demo.
- **Cost:** GSAP core plus SplitText is about 35 KB gzip. With framer-motion you can do the same with line spans and `y: "100%" → 0`, which avoids the extra bundle. Wait for fonts to load (`document.fonts.ready`) before splitting, or the lines will break in the wrong places.
- **Reduced motion:** Show the text statically, or cross-fade opacity for 150 ms. Keep `aria: true` so screen readers get the unsplit text.
- **Verified:** article only

### 2. Scramble decode inside a clip-path wipe
- **Source:** thibaultguignand.com case study, https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/ (live site: https://www.thibaultguignand.com)
- **Mechanics:** Runs on block entry.
  1. Pre-render the target string with random glyphs (keeping spaces) so the final width is locked. Also lock the parent height with `getBoundingClientRect().height`.
  2. Split the text into chars and run `scrambleText` with the charset `A!B@C#D$E%F&G*H?J[K]L{M}N=O+P-QRSTUVWXYZ`.
  3. In parallel, animate `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over 0.6 s with `power2.out`.
  4. The clip hides the noise, so the reader only ever sees legible characters.
- **Fits:** Section labels ("02 / LOSS MASKING") and demo titles when a demo mounts. Also the loss-masking strip, where masked tokens could "decode" into the tokens that count. `src/variants/v6/Decode.tsx` already has a decoder to reuse.
- **Cost:** S if hand-rolled with rAF and `textContent`. M with GSAP ScrambleText, which is free since the Webflow acquisition.
- **Reduced motion:** Skip the scramble. Show the final text with a 150 ms opacity fade.
- **Verified:** article only (I saw the site live, but did not capture the scramble)

### 3. Glyph-noise HUD text that resolves in place
- **Source:** https://igloo.inc *(shot: igloo-hud-glyph-text-3d)*
- **Mechanics:** Small monospaced HUD blocks sit in the four corners (logo, a label, a paragraph at top right, a status line at bottom left). They render as bitmap glyph noise, then resolve into text. The 3D scene has numbered wireframe markers (23, 26, 56, 64, 65) linked by thin lines. The loading bar is also ASCII (see 54).
- **Fits:** The CubeSat tracker. Corner HUD for TLE epoch, altitude, velocity and next pass, re-decoded whenever a value changes. Numbered markers linked by lines suit ground stations.
- **Cost:** S for DOM text. Igloo itself is very heavy: it took about 20 s to settle on SwiftShader.
- **Reduced motion:** Show static values and update them without the decode.
- **Verified:** seen live

### 4. CSS-variable stagger for page entry
- **Source:** https://paco.me. I read the rules from its stylesheet.
- **Mechanics:**
  - `[data-animate]{--stagger:0;--delay:.12s;--start:0s}`
  - Under `@media (prefers-reduced-motion: no-preference)`, the element gets `animation: enter .6s ease both` with `animation-delay: calc(var(--stagger)*var(--delay) + var(--start))`.
  - `@keyframes enter{0%{opacity:0;transform:translateY(10px)}}`
  - Each block sets `style="--stagger:n"` inline.
  - A `[data-animation-controller=false]` switch turns the whole thing off.
- **Fits:** The baseline entry motion for every page: header, then intro, then the demo index. This is the "restraint" layer the louder patterns sit on.
- **Cost:** S, with no JS at all.
- **Reduced motion:** Built in, because the animation only exists inside `no-preference`.
- **Verified:** seen live

### 5. Typed repetition line
- **Source:** https://locomotive.ca/en hero *(shot: locomotive-hero-typed-repetition)*. Mechanics are also covered in https://tympanus.net/codrops/2022/04/13/on-scroll-text-repetition-animation/
- **Mechanics:** One phrase repeats down the column. Each copy extends further than the last ("Design / Design / Design & Code / Design & Ø\\\\") and the newest line is still being typed with glitch glyphs. Each line is a fresh copy of the previous one with more characters. The text is laid over full-bleed video.
- **Fits:** The hero role line: "Interpretability / Interpretability & firmware / Interpretability & firmware & retrieval".
- **Cost:** S.
- **Reduced motion:** Show only the final line.
- **Verified:** seen live

### 6. Per-letter roll on hover (duplicated glyph stack)
- **Source:** https://lusion.co. The DOM contains doubled letters ("PP LL AA YY RR EE EE LL" for PLAY REEL).
- **Mechanics:** Each character is stacked twice in a 1em-tall clip. On `pointerenter`, every column moves `translateY(-100%)` with about a 20 ms stagger, using Lusion's ease `cubic-bezier(0.35,0,0,1)`, which I counted 32 times in their CSS.
- **Fits:** The nav links, "Run demo" buttons and the email link.
- **Cost:** S (CSS transitions plus `--i` per span).
- **Reduced motion:** Use a plain colour change.
- **Verified:** seen live (DOM structure). I did not capture the hover mid-state, because Lusion screenshots timed out.

### 7. Variable-font weight that follows the cursor
- **Source:** https://codefronts.com/motion/css-text-hover-effects/ ("swell from 300 to 800").
- **Mechanics:** On `pointermove`, compute each glyph's distance d to the pointer and set `font-variation-settings: "wght" calc(300 + 500*(1 - d/R))` with R ≈ 120 px, easing with a lerp of about 0.15 per frame. Place a bold ghost copy underneath so the weight change never shifts layout.
- **Fits:** The name in the hero, or company names in the experience list. Inter Variable and Geist Mono are already installed.
- **Cost:** S to M. Touches up to about 30 spans per frame.
- **Reduced motion:** Use a static weight and a single hover state.
- **Verified:** article only

### 8. 3D cylinder text driven by scroll
- **Source:** https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/, demo https://tympanus.net/Tutorials/3DTextScroll/
- **Mechanics:**
  - The container gets `perspective: 70vw; transform-style: preserve-3d`.
  - Each line is placed at `y = sin(a)*r` and `z = cos(a)*r` plus `rotateX(a)`, with `backface-visibility: hidden`.
  - ScrollTrigger uses `scrub` and `end: "+=2000svh"`, and recomputes positions in `onUpdate`.
- **Fits:** At most one interstitial, for example the six demo names rolling past before the index. Use it sparingly.
- **Cost:** M. Needs a long scroll runway.
- **Reduced motion:** Show a flat list.
- **Verified:** Codrops demo

### 9. Sliced text on scroll
- **Source:** https://tympanus.net/codrops/2023/12/05/on-scroll-sliced-text-animation/, demo https://tympanus.net/Development/SlicedTextEffect
- **Mechanics:** The heading is duplicated into horizontal slices, each clipped with `clip-path: inset()`. On scroll, each slice gets its own x offset, so the word shears apart and then re-forms.
- **Fits:** The "loss masking" title, where the slice metaphor matches masked spans. Otherwise skip it.
- **Cost:** S to M.
- **Reduced motion:** Show the word whole.
- **Verified:** Codrops demo

---

## 2. Index, list and hover

### 10. Row hover with a lerped preview that follows the cursor
- **Source:** https://tympanus.net/codrops/2020/07/01/creating-a-menu-image-animation-on-hover/, demo https://tympanus.net/Tutorials/RapidImageHoverMenu/ *(shot: codrops-menu-image-hover)*
- **Mechanics:**
  - `mouseenter` on a row mounts a single `.hover-reveal`. It is not a trail.
  - `tx`, `ty`, `rotation` and `brightness` are lerped with `amt 0.08`.
  - Pointer speed, clamped to 100 px, maps to rotation between -60° and +60° and brightness between 1 and 4.
  - The inner and outer layers slide in from opposite sides over 0.2 s with `Sine.easeOut`, and the side depends on the pointer's direction.
  - The hovered row turns red. Confirmed live.
- **Fits:** The research and demo index. The preview should be a live mini-render of that demo (steering output, token strip, globe) rather than a JPEG.
- **Cost:** S to M. Keep one preview element and swap its content.
- **Reduced motion:** Pin the preview to a fixed slot with no rotation and a 150 ms fade.
- **Verified:** Codrops demo

### 11. Dimming the other rows (focus on one project)
- **Source:** https://gilhuybrecht.com *(shot: gilhuybrecht-index-row-dim-hover)*
- **Mechanics:** Each project is a row: a name followed by 3 to 5 numbered page thumbnails. Hovering one row dims every other row to about 30% brightness, and the hovered row stays full strength. Gil's dominant ease is `cubic-bezier(0.19,1,0.22,1)`, measured 13 times. In CSS this is `.list:has(.row:hover) .row:not(:hover){opacity:.3;filter:grayscale(1)}`, transitioning over about 300 ms.
- **Fits:** The experience list. Hovering Amazon Robotics keeps its logo full-colour and greys out the other logos and rows. This is the most restrained way to make the logos matter.
- **Cost:** S (`:has()` works in all evergreen browsers).
- **Reduced motion:** Keep the dim. Opacity is not motion, so it can be instant.
- **Verified:** seen live

### 12. An index row that expands into a detail view in place
- **Source:** https://gilhuybrecht.com *(shot: gilhuybrecht-index-expand-detail)*
- **Mechanics:** Clicking a row's thumbnail opens a split panel within about 750 ms. The left column holds the description, a numbered meta list (Dev, Client, Agency, Year), "See Live Site ↗" and "Back". The right side shows a large preview. The index stays underneath.
- **Fits:** Clicking a demo row opens that demo in place. Put the metric and paper link on the left and the live canvas on the right. No route change is needed.
- **Cost:** S to M with FLIP (framer-motion `layout`) or a same-document View Transition (see 18).
- **Reduced motion:** Cross-fade, or swap instantly.
- **Verified:** seen live

### 13. Text index over a full-bleed background that swaps
- **Source:** Nite Riot via Mobbin, https://mobbin.com/sites/sections/1aa05a05-6920-4f35-a581-3dcf42634162
- **Mechanics:** Three columns of small caps text (project, director, info) sit over a full-bleed black-and-white still. Hovering a row swaps the background, which I infer is a cross-fade.
- **Fits:** The demo list. The background becomes a dim (about 20%) frame of that demo: the ocean temperature field, the orbit globe, the retrieval point cloud.
- **Cost:** S to M. Preload six posters.
- **Reduced motion:** Cross-fade without scaling.
- **Verified:** Mobbin

### 14. Tag filter with a density slider
- **Source:** MOUTHWASH Studio via Mobbin, https://mobbin.com/sites/sections/7ea4ce8e-8811-462e-b5d9-f27d7c3e4ec6
- **Mechanics:** A mono tag list (ALL, 3D, AI, RESEARCH, SOUND, TOOL...) filters a row of coded tiles (RC-100, RC-101 and so on). A "VIEW" slider changes tile size.
- **Fits:** Only if the demos are shown as specimens. Tags could be interpretability, systems and space. This is lower priority.
- **Cost:** S, plus FLIP when filtering.
- **Reduced motion:** Re-layout instantly.
- **Verified:** Mobbin

### 15. Numbered hotspots with a background video crossfade
- **Source:** https://www.thibaultguignand.com *(shot: thibault-bracket-cursor-video-hotspots)*
- **Mechanics:**
  - After a two-line mono intro, six rhombus markers (1 to 6) sit at the edges of a full-bleed video, with "DISCOVER MY PROJECTS ↗" in the centre.
  - Hovering a marker snaps the four-corner cursor to it (see 34) and crossfades the video.
  - Per the case study, the crossfade is an OGL shader driven by one `progress` uniform. It combines a pixel-noise block mask (`step`), UV displacement and R/B chromatic offset, both shaped by a parabola that peaks at 0.5.
- **Fits:** The hero, directly. There are six demos and six markers. The centre field shows that demo running live.
- **Cost:** L for the shader version, S for a CSS cross-fade. Per the article, only the two active textures upload during a transition.
- **Reduced motion:** Swap with a 200 ms opacity fade.
- **Verified:** seen live (markers, cursor and video swap). The shader internals are article only.

### 16. Numbered dock with a hover preview card
- **Source:** https://austensor.com *(shot: austensor-numbered-dock-preview-card)*
- **Mechanics:**
  - The top bar is a pill dock of `01…11`. Each item is 34×28 px, Geist Mono at 11 px with 0.04em tracking.
  - On hover, the number gets `text-shadow: 0 0 10px rgba(255,255,255,.9)` and a card drops down with a thumbnail, "04 Depth" and the subtitle "WIREFRAME FIELD".
  - The active item is a white pill with black text at weight 800.
  - The same bar holds "AUTO TOUR [T]" and "AUDIO OFF".
  - Both the card and the number drop their transitions under reduced motion.
- **Fits:** Global navigation for the six demos, 01 to 06. This is the most on-brand find: dark, mono, research-lab tone.
- **Cost:** S.
- **Reduced motion:** Built in on this site.
- **Verified:** seen live

### 17. Scribble underline drawn on hover
- **Source:** Osmo demo in https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/
- **Mechanics:** On enter, pick one of six SVG scribble paths and draw it with DrawSVG (`0% → 100%`) over 0.5 s `power2.inOut`. On leave, erase it forwards.
- **Fits:** Inline links in prose (paper and repo links). Choose one hover language per site, so use this or the letter roll (6), not both.
- **Cost:** S. `stroke-dashoffset` works without GSAP.
- **Reduced motion:** Show a static underline.
- **Verified:** article only

---

## 3. Page and section transitions

### 18. Same-document View Transition from list to demo (shared element)
- **Source:** https://developer.chrome.com/docs/web-platform/view-transitions/same-document and https://developer.chrome.com/blog/view-transitions-in-2025. In use at darkroom.engineering and thibaultguignand.com, whose `::view-transition` rules I read.
- **Mechanics:**
  - Wrap the navigation in `document.startViewTransition(() => flushSync(() => navigate(path)))`. `flushSync` forces React to commit inside the callback.
  - Give the demo thumbnail and the demo canvas the same `view-transition-name`, or use `match-element` for lists (Chrome 137+).
  - Tune with `::view-transition-group(demo){animation-duration:.5s;animation-timing-function:cubic-bezier(.22,1,.36,1)}`.
  - Firefox 144 has same-document transitions but not types.
- **Fits:** Demo row or card into the demo page. Also experience row into its case study.
- **Cost:** No bundle cost. The Safari clip-path caching bug is handled with a 50 ms buffer and `void el.offsetHeight`, per the Thibault write-up.
- **Reduced motion:** darkroom sets `::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none}` under `reduce`.
- **Verified:** seen live (darkroom rules) and article

### 19. Typographic curtain between routes (a View Transition type)
- **Source:** https://darkroom.engineering. Clicking WORK plays it. *(shot: darkroom-curtain-view-transition)*
- **Mechanics:**
  1. The old page dims to about 40% (captured at 120 ms).
  2. A full-screen curtain of repeated pixel-type lines ("WORK:// DESIGNED TO BE BUILT, BUILT TO BE USED."), offset per line with scanlines, fills the screen at about 240 ms.
  3. The new page arrives.
  - The CSS uses `html:active-view-transition-type(curtain)::view-transition-old(root){animation:none}`, so the default cross-fade is disabled for this type and JS drives the curtain.
- **Fits:** Entering a demo: a curtain of "STEERING:// α = +4.0 ·" lines. Keep it very short (under 500 ms), or it becomes a toll.
- **Cost:** S to M.
- **Reduced motion:** darkroom disables all VT animations. Navigate instantly.
- **Verified:** seen live

### 20. Fade the chrome, then morph the clip-path
- **Source:** https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/
- **Mechanics:**
  - 0 to 0.3 s: the WebGL background, grid, side text and cursor fade out with `power2.inOut`.
  - 0.25 to 0.6 s: the content fades.
  - Then the View Transition clip-path morph runs.
  - The route chunk `import()` and the hero image preload start before the fade, so loading hides inside the animation.
- **Fits:** Any route that lazy-loads a heavy demo (three.js globe, ES sim). The fade covers chunk loading.
- **Cost:** S.
- **Reduced motion:** Skip the fade and navigate after loading.
- **Verified:** article only

### 21. "Next project" morph scrubbed at the bottom of the page
- **Source:** same Thibault article as 20.
- **Mechanics:**
  - At the page bottom, ScrollTrigger with `scrub: 1` drives several values: background `scale 1.3 → 1`, `clip-path inset(20% 40% 20% 40%) → inset(0)`, an SVG ring's `stroke-dashoffset` down to 0, and a counter from 0 to 100%.
  - A three-state machine controls commit. `hasSeenLowProgress` prevents auto-navigation if the user lands at 100%. Velocity above 2000 skips. A 250 ms commit timeout rolls back via `onLeaveBack`.
  - A click drives the same DOM writes.
- **Fits:** The end of each demo page leads to the next demo: "Loss masking → ES fine-tuning".
- **Cost:** M.
- **Reduced motion:** Use a plain "Next: ES fine-tuning →" link.
- **Verified:** article only

### 22. Five-bar wipe with the centre leading
- **Source:** https://tympanus.net/codrops/2026/08/27/goodgrowth-boot-sequences-spinning-discs-and-the-art-of-the-portfolio/ (live: https://goodgrowth.com)
- **Mechanics:** Five vertical bars collapse over 0.6 s each with `power3.inOut`. The centre bars go first, with 0.07 s between neighbours. Input is locked until the incoming page has built.
- **Fits:** An alternative to 19 if the pixel-type curtain feels too loud.
- **Cost:** S.
- **Reduced motion:** Use a cross-fade.
- **Verified:** article only (I saw the site's intro live)

### 23. Grid to fullscreen with FLIP, pushing the neighbours away
- **Source:** https://tympanus.net/codrops/2024/06/05/push-animation-on-grid-items/, demo http://tympanus.net/Development/PushGridItems/. Related: https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/
- **Mechanics:** Clicking a tile runs `Flip.from` so the tile fills the screen while the other tiles fly outward, away from it. The 2026 gallery version guards against rapid repeat clicks with four states (idle, opening, open, closing).
- **Fits:** Only if the demos are laid out as a grid of specimens.
- **Cost:** M (GSAP Flip) or S (framer-motion `layoutId`).
- **Reduced motion:** Swap instantly.
- **Verified:** Codrops demo

### 24. Clip-path reveal with a strong ease-in-out
- **Source:** https://emilkowal.ski/ui/the-magic-of-clip-path
- **Mechanics:** `clip-path: inset(0 0 100% 0) → inset(0)` over 1 s with `cubic-bezier(0.77,0,0.175,1)`, via CSS or WAAPI. It causes no layout shift. The same article covers a comparison slider (`inset(0 50% 0 0)` driven by drag) and a tab highlight (`inset(0 75% 0 0 round 17px)`).
- **Fits:**
  - Demo canvases wiping in on entry.
  - The comparison slider could compare the ocean demo's satellite surface field with the predicted deep-water temperature.
  - The tab highlight suits the loss-mask mode switch.
- **Cost:** S.
- **Reduced motion:** Remove the clip immediately.
- **Verified:** article only

---

## 4. Scroll choreography

### 25. Lenis smooth scroll synced to the animation ticker
- **Source:** https://github.com/darkroomengineering/lenis. The `lenis` class was present on thibaultguignand, goodgrowth, 14islands, locomotive, darkroom, gilhuybrecht, leoparpeix, meermohsin and bleibtgleich.
- **Mechanics:**
  - Defaults: `lerp 0.1`, `duration 1.2`, easing `t => Math.min(1, 1.001 - 2**(-10*t))`. Codrops Sticky Grid uses `lerp 0.08`.
  - GSAP sync: `lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0)`.
  - `syncTouch:false` by default, so touch keeps native scrolling.
- **Fits:** Site-wide, so the pinned and scrubbed moments (26, 27) feel weighted.
- **Cost:** A few KB. Wrap demo canvases in `data-lenis-prevent` so their own drag and wheel handling keeps working.
- **Reduced motion:** Lenis honours `prefers-reduced-motion` itself: smoothing is off and programmatic scrolls are instant.
- **Verified:** seen live (presence on 9 sites) and article (settings)

### 26. Pinned stage with scrubbed phases
- **Source:** https://tympanus.net/codrops/2026/03/02/sticky-grid-scroll-building-a-scroll-driven-animated-grid/, demo https://tympanus.net/Tutorials/StickyGridScroll/
- **Mechanics:** A `position: sticky` wrapper sits inside a 425vh block. One timeline runs with `scrub: true` in phases:
  - 0 to 45%: columns reveal.
  - 45 to 90%: scale to 2.05×, with the side columns pushed outward.
  - 90 to 95%: text appears.
  - 95 to 100%: hold.
  - Eases are `power1.inOut` and `power3.inOut`.
- **Fits:** The ocean explainer. Pin the panel, and let scroll carry the reader from the satellite's view of the surface down through the water column to the predicted deep temperature, one phase per stage of the pipeline. It also suits ES generations (scroll equals generations).
- **Cost:** M. Pinning needs care on iOS (use `svh`).
- **Reduced motion:** Unpin and show the phases as a stacked sequence of static frames.
- **Verified:** Codrops demo

### 27. Vertical wheel driving a horizontal track, with a tick minimap
- **Source:** https://rauno.me *(shot: rauno-horizontal-track-tick-minimap)*
- **Mechanics:**
  - Vertical wheel input moves a horizontal row of large cards (Craft, History of Software Design...), each with a small caption.
  - A tick ruler at top centre shows one tick per card, with the active card drawn as a wider outlined rectangle.
  - The cursor is a crosshair (see 35).
  - The site's only custom ease is `cubic-bezier(.2,.8,.2,1)`.
- **Fits:** A six-demo strip with a six-tick ruler. The ruler doubles as navigation: click a tick to jump.
- **Cost:** S to M.
- **Reduced motion:** Use native horizontal scroll with snap and no inertia.
- **Verified:** seen live

### 28. CSS scroll-driven animations (`animation-timeline: view()`)
- **Source:** https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view/
- **Mechanics:** `animation-timeline: view(); animation-range: entry 0% cover 30%;` ties keyframes to an element's pass through the viewport. `scroll()` does the same for page progress. Use `animation-range: contain` for edge-to-edge.
- **Fits:** Cheap entry motion on long pages, and a 1 px reading-progress line on the research write-ups.
- **Cost:** No JS. Runs off the main thread in Chromium and in Safari 26. Firefox has it behind a flag, so treat it as progressive enhancement.
- **Reduced motion:** Wrap it in `@media (prefers-reduced-motion: no-preference)`.
- **Verified:** article only

### 29. Scroll as a camera move through 3D scenes
- **Source:** https://igloo.inc and https://lusion.co (both seen live)
- **Mechanics:**
  - **Igloo:** scrolling moves the camera from the igloo exterior through fog into a crystal scene, with depth blur and chromatic fringing during the move.
  - **Lusion:** scrolling rotates a 3D tablet whose screen plays the reel. Below it, the project cards tilt in perspective as they enter.
- **Fits:** The CubeSat tracker only. Scroll pulls from a whole-Earth view down to the satellite's ground track over the next pass. Don't use it anywhere else.
- **Cost:** L. Both sites were slow on SwiftShader, and the Lusion screenshot timed out mid-move.
- **Reduced motion:** Use static camera positions per section, with cuts instead of moves.
- **Verified:** seen live

### 30. Progress dial made of ticks
- **Source:** Lightship via Mobbin, https://mobbin.com/sites/sections/1a07196e-95d2-4955-b46f-e610f8ab7fb2 (with Shopify Design's tick arc in the same search)
- **Mechanics:** A ring of fine ticks with a thick coloured arc growing along it. The centre headline reads "Canopy Stress Test: 1,000+ Cycles" with a pill button. It is presumably driven by scroll or playback progress.
- **Fits:** ES fine-tuning (the arc is generations completed, the centre is the fitness number from 53) or a retrieval batch progress indicator. It matches the instrument look.
- **Cost:** S (SVG `stroke-dasharray`).
- **Reduced motion:** Update the arc in steps with no tween.
- **Verified:** Mobbin

### 31. Section indicator that re-scrambles when the section changes
- **Source:** https://tympanus.net/codrops/2024/11/19/case-study-chaingpt-labs/
- **Mechanics:** A fixed corner label ("02 / LOSS MASKING") updates when ScrollTrigger crosses a section boundary, playing a short ScrambleText (about 0.4 s) between the old and new labels.
- **Fits:** A fixed top-left section readout. It pairs with 2 and 16.
- **Cost:** S.
- **Reduced motion:** Swap the text instantly.
- **Verified:** article only

---

## 5. Cursor

### 32. Magnetic button
- **Source:** https://tympanus.net/codrops/2020/08/05/magnetic-buttons/, demo https://tympanus.net/Development/MagneticButtons/ *(shot: codrops-magnetic-button)*
- **Mechanics:** The article gives no numbers, so I measured the demo. With the pointer 60 px right and 30 px down from the button's centre, the button settled at `translate(17.25px, 8.47px)`, a pull of about 0.29 of the offset. A filled circle follows the pointer inside the outline. Inner text can move at a different factor for parallax. On leave, it springs back (for example `elastic.out(1, 0.5)`, about 0.6 s).
- **Fits:** One or two primary actions only: "Run" on a demo and the email button.
- **Cost:** S.
- **Reduced motion:** No displacement. Keep the hover fill.
- **Verified:** Codrops demo (the factor is measured)

### 33. Cursor label pill that tilts with velocity
- **Source:** https://leoparpeix.com *(shot: leoparpeix-cursor-label-sound-optin)*
- **Mechanics:**
  - `.cursorIndication` is a yellow pill reading "CLICK — TO ENABLE SOUND". I captured it with inline `transform: translate(698px,450px) scale(1.106) rotate(4.24deg)`, so scale and rotation come from pointer velocity.
  - The inner text uses `transform-origin: 0% 100%` and `translate(0,-100%)`, so the pill hangs above and to the right of the pointer.
  - The site's dominant ease is `cubic-bezier(0.16,1,0.1,1)`, found 40 times.
- **Fits:** Over the demo canvases, labels that name the input: "DRAG — steer", "HOLD — run a generation", "DRAG — rotate orbit". This replaces instructions written in text.
- **Cost:** S (one element, rAF lerp).
- **Reduced motion:** Show a static label next to the canvas with no tilt.
- **Verified:** seen live

### 34. Corner-bracket cursor that snaps to its target
- **Source:** https://www.thibaultguignand.com. The DOM has `custom-cursor__corner--tl/tr/bl/br`. *(shot: thibault-bracket-cursor-video-hotspots)*
- **Mechanics:** Four corner brackets sit around the pointer. Over a target, they spring to the target's bounding box: "[2]" framed the hotspot in the capture.
- **Fits:** Demo controls (slider thumb, token cells in the loss-mask strip, retrieval query points). This is a "measurement reticle" that fits a research site.
- **Cost:** S.
- **Reduced motion:** Show the brackets on the target without the travel.
- **Verified:** seen live

### 35. Crosshair cursor over working surfaces
- **Source:** https://rauno.me, where there is a thin "+" crosshair over the cards *(shot: rauno-horizontal-track-tick-minimap)*
- **Mechanics:** Uses `cursor: none` and a 1 px crosshair element that follows the pointer 1:1, with no lag.
- **Fits:** The globe and ocean demos. Add a mono readout next to the crosshair: lat/lon over the globe, and depth plus °C over the ocean section. Here the cursor carries data.
- **Cost:** S.
- **Reduced motion:** No change needed, since it doesn't animate. Keep the system cursor on touch devices.
- **Verified:** seen live

### 36. Dot grid that glows near the cursor and ripples on click
- **Source:** Osmo "Glowing Interactive Dot Grid" in https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/
- **Mechanics:**
  - Dots within 200 px of the pointer glow.
  - Fast pointer moves (speed above 100) throw dots with InertiaPlugin.
  - A click sends a shockwave with a 325 px radius.
  - Dots return with `elastic.out(1, 0.75)` over 1.5 s.
- **Fits:** The background of the ES sim, where the dots are the population and a click perturbs it. Too playful as general decoration.
- **Cost:** M. Use canvas, not DOM dots.
- **Reduced motion:** Show a static grid, with the glow only on the dot under the pointer.
- **Verified:** article only

---

## 6. WebGL, shaders and 3D

### 37. Pointer flowmap displacement with RGB split
- **Source:** https://tympanus.net/codrops/2024/08/27/grid-displacement-texture-with-rgb-shift-using-three-js-gpgpu-and-shaders/, demo https://tympanus.net/Development/GridDistortionEffect/ *(shot: codrops-grid-displacement-rgb-shift)*. Also the Thibault and Goodgrowth case studies.
- **Mechanics:**
  - A GPGPU grid texture stores pointer velocity per cell. The demo exposes `relaxation`, `distance` and `strength` controls.
  - The fragment shader offsets UVs by that texture and samples R, G and B at different offsets. Thibault uses R 1.5×, G 0.5× and B 1.8× along the vector from the mouse to the pixel. Goodgrowth decays velocity by 0.94 per frame and uses ±0.05 R/B.
  - The Thibault version stops the rAF loop after 90 idle frames.
- **Fits:** Hovering the hero name or the demo poster frames. Keep it subtle and never apply it to the demos themselves.
- **Cost:** L (a full-screen pass). Stop rendering when idle.
- **Reduced motion:** Turn it off and render the texture flat.
- **Verified:** Codrops demo

### 38. One-uniform shader crossfade: block mask, displacement and chromatic split
- **Source:** Thibault case study (see 20)
- **Mechanics:** GSAP tweens `progress` from 0 to 1. Pixel-noise blocks are revealed with `step(noise, progress)`. UV displacement and R/B offset follow `4p(1-p)`, peaking mid-transition. Only two `needsUpdate` textures change during the transition.
- **Fits:** The media swap for 15 and 13.
- **Cost:** L.
- **Reduced motion:** Use an opacity crossfade.
- **Verified:** article only

### 39. Ordered (Bayer) dither as a post-process
- **Source:** https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/, demo https://tympanus.net/Development/DitheringShader *(shot: codrops-dithering-shader)*. Goodgrowth dithers in screen space so the pattern stays locked to the display.
- **Mechanics:** A post-processing pass takes luminance (0.299R + 0.587G + 0.114B), compares it with a 4×4 or 8×8 Bayer threshold, and quantises it to 2 to N levels, with optional pixelation.
- **Fits:** An idle or poster state for the three.js demos (globe, retrieval cloud). When the demo is not in focus it renders dithered, one-bit and cheap, and resolves to full colour on hover or focus. This gives a coherent "instrument" look across demos.
- **Cost:** M, one extra fullscreen pass. Error-diffusion dithers such as Floyd–Steinberg are sequential and CPU-bound (Efecto), so stick to ordered dither.
- **Reduced motion:** Not motion-related, so no change is needed.
- **Verified:** Codrops demo

### 40. ASCII render pass
- **Source:** https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/ and https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/
- **Mechanics:**
  - **Efecto:** one GPU cell per character, with glyphs generated procedurally in GLSL on a 5×7 grid.
  - **Shape-aware version:** targets about 4,600 cells and samples six points per cell (asymmetric columns). Each cell is matched to a 95-glyph atlas by Euclidean distance on six-value shape vectors, at about 570 ops per cell. Passes are scene, then cell, then composite, capped at 60 fps with 8 ms of slack.
- **Fits:** The billion-vector retrieval sim (dense regions as dense glyphs) or the site loader (see 54). Choose one of 39 or 40 per site.
- **Cost:** M to L.
- **Reduced motion:** Show a static ASCII frame.
- **Verified:** article only

### 41. Globe with drag, inertia, detents and adaptive quality
- **Source:** https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/ and the Goodgrowth case study (22)
- **Mechanics:**
  - **GitHub:** five layers (halo on a backside sphere, globe, about 12k five-sided region dots, spikes, arcs). The team monitors FPS and lowers quality if it can't hold 55.5 fps over the last 50 frames.
  - **Goodgrowth:** an orthographic camera (no pole distortion), scroll-coupled rotation, and magnetic detents at tile multiples with a snap constant of 0.571. On mobile, the snap starts from where the gesture began, and PMREM generation is deferred.
- **Fits:** The CubeSat tracker directly:
  - drag to rotate, with damped inertia (OrbitControls `enableDamping`, `dampingFactor` about 0.05)
  - a detent that snaps to the satellite's current sub-point when released near it
  - an FPS-based quality ladder
- **Cost:** L, but already paid for (three is a dependency).
- **Reduced motion:** No auto-rotation and no inertia. Snap directly.
- **Verified:** article only

### 42. Pointer-driven shader masks: circular reveal and hold-to-commit
- **Source:** https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/, demo https://tympanus.net/Tutorials/ShaderAnimationGSAP/
- **Mechanics:**
  - **Reveal:** `uMixFactor` goes 0 → 1 over 3 s `power3.out`, as a `smoothstep` circle from the raycast UV. Aspect is corrected, and `killTweensOf` runs on exit.
  - **Hold:** `uGrayscaleProgress` goes to 0.35 in 0.5 s, then to 1 after 0.12 s with `power2.in`. Releasing early reverses it.
  - **Ripple:** a 50×50-segment plane with vertex sine displacement, 1.5 s `power3.inOut`.
  - DOM planes follow `getBoundingClientRect()` each frame.
- **Fits:** "Hold to run" for the ES sim, where the progress fill commits one generation. The circular reveal could expose deep temperature under surface temperature in the ocean demo.
- **Cost:** L.
- **Reduced motion:** Use a click instead of hold and an instant reveal.
- **Verified:** Codrops demo (page loaded, variations listed). The values are article only.

### 43. Wordmark made of particles
- **Source:** https://austensor.com, where the logo is a point cloud with drifting coloured particles
- **Mechanics:** The name is rendered as thousands of points sampled from text glyphs. Points drift slightly and scatter away from the pointer.
- **Fits:** The name in the hero as an embedding cloud. This connects to the retrieval sim's "billion vectors" story. It could morph into the retrieval demo's cloud as you scroll.
- **Cost:** L. Sample glyphs once to a Float32Array and use `THREE.Points`.
- **Reduced motion:** Show static points, or the plain wordmark.
- **Verified:** seen live

---

## 7. Navigation

### 44. Command palette (⌘K)
- **Source:** cmdk by Paco (https://paco.me lists it under projects). Mobbin: Vapi https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b, Supabase https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7, Fey https://mobbin.com/screens/ff52ac90-4d18-4765-98da-df1e362a5ee1
- **Mechanics:** Groups (Actions, Recent, All pages) with right-aligned key hints. A footer shows ↑↓ navigate, ↵ select and Esc. It opens with a scale from 0.96 to 1 and fade over about 150 ms `ease-out`, with a blurred and dimmed backdrop. Fey teaches the shortcuts during onboarding with single-letter key badges next to each action.
- **Fits:** "Run steering at α = 4", "Open CubeSat tracker", "Copy email", "Download CV". Engineers expect this, and it is information-light.
- **Cost:** S to M (cmdk is about 5 KB).
- **Reduced motion:** Open and close instantly.
- **Verified:** Mobbin

### 45. Keyboard chips and an auto tour
- **Source:** https://austensor.com (the "AUTO TOUR [T]" chip in the dock) *(shot: austensor-numbered-dock-preview-card)*
- **Mechanics:** A mono chip shows the key in a small box. Pressing T steps through experiments on a timer, and number keys jump directly.
- **Fits:** "Press T to tour the six demos." Each demo runs its showcase preset for about 6 s, then advances. Keys 1 to 6 jump.
- **Cost:** S.
- **Reduced motion:** The tour still steps, but with cuts, no transitions, and a pause button.
- **Verified:** seen live (chip present). I did not press T.

### 46. A legend for each demo's inputs
- **Source:** https://austensor.com/ experiment 04 *(shot: austensor-experiment-interaction-protocol)*
- **Mechanics:** In the bottom-right corner, a small mono label "INTERACTION PROTOCOL" reads "[ DRAG ] Rotate space-time cage · [ SCROLL ] Zoom focus". The bottom-left has spec lines ("Lattice Topology: … / Edge Shader: … / Camera Rig: …"), and there is a centred "AUDIO" pill.
- **Fits:** Every demo gets a one-line input legend plus two or three spec lines (model, layer, dataset). This is the information-restraint answer: controls are named once, in a fixed place.
- **Cost:** S.
- **Reduced motion:** Not applicable.
- **Verified:** seen live

### 47. Drag or zoom canvas of all the work
- **Source:** Studio Freight via Mobbin, https://mobbin.com/sites/sections/2f12827e-5e12-4f35-9bc8-93d914ff9695 ("Drag or Scroll to Explore", 1X/2X zoom, (−)/(+)). Mechanics from https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/, demo https://tympanus.net/Tutorials/InfiniteCanvas/ *(shot: codrops-infinite-canvas)*
- **Mechanics:** Input accumulates into a target velocity, and the actual velocity lerps toward it, which gives coast-to-stop. Wheel zoom uses `scrollAccum += deltaY*0.006` with decay. Rendering keeps a 3×3×3 chunk window with deterministic layouts. On touch, DPR is capped at 1.25 and antialiasing is off.
- **Fits:** Probably not the main index: six items is too few for a canvas. It could be a "lab" page of experiments.
- **Cost:** L.
- **Reduced motion:** Show a static grid with no inertia.
- **Verified:** Mobbin and Codrops demo

### 48. View-mode toggles in the chrome
- **Source:** https://gilhuybrecht.com, where "Grid / Gallery" and "Normal / Star Wars" toggles sit in the bottom corners of the index *(shot: gilhuybrecht-index-row-dim-hover)*
- **Mechanics:** Two-state text toggles with the active word in white and the inactive one in grey. Switching re-lays out the index. "Star Wars" suggests a perspective crawl.
- **Fits:** "List / Specimens" for the demos. A single toggle keeps both of last round's directions available without a second page.
- **Cost:** S, plus FLIP.
- **Reduced motion:** Re-layout instantly.
- **Verified:** seen live (toggles present). I did not switch modes.

---

## 8. Sound and micro-feedback

### 49. Web Audio ticks scheduled ahead of time
- **Source:** Goodgrowth case study (22)
- **Mechanics:** All counter tick sounds are scheduled in one pass against `audioCtx.currentTime`, not with per-frame `play()` calls. The spacing follows the counter's ease (`power1.inOut`), and there is a rate ceiling (1/18 in their spec). On iOS the fallback handles AudioContext auto-suspend and the hardware mute switch with an animated EQ glyph.
- **Fits:** Steering slider detents (a tick per 0.5 of α), token toggles in loss masking, and a soft tick per ES generation. Sounds should come only from demo interactions, never on page hover.
- **Cost:** S (synthesised with an OscillatorNode plus a short gain envelope, no files).
- **Reduced motion:** Sound is a separate preference. Keep it off by default (50).
- **Verified:** article only

### 50. An opt-in audio pill in the chrome
- **Source:** https://austensor.com ("AUDIO OFF" chip), https://meermohsin.me (`sound-wave off` toggle plus "CLICK ANYWHERE TO ACTIVATE THE EXPERIENCE", looped `<audio>`), https://leoparpeix.com (the cursor pill "Click — to enable sound"), https://goodgrowth.com ("INSERT DISC" gate, "Best with sound on") *(shot: goodgrowth-insert-disc-sound-intro)*
- **Mechanics:** Sound starts off. A small pill with an animated equaliser glyph turns it on, and that user gesture resumes the AudioContext. The preference is saved to localStorage.
- **Fits:** One "SOUND OFF/ON" chip in the dock. Don't gate the site behind it the way Goodgrowth and Meer Mohsin do.
- **Cost:** S.
- **Reduced motion:** Freeze the equaliser glyph. Goodgrowth sets `#enter-audio .ea-eq i{animation:none;height:60%}` under `reduce`, which I read from its CSS.
- **Verified:** seen live

### 51. UI sounds with slight pitch variation (use-sound)
- **Source:** https://www.joshwcomeau.com/react/announcing-use-sound-react-hook/
- **Mechanics:**
  - use-sound is about 1 KB gzip and lazy-loads Howler.
  - Use audio sprites so one file holds all the sounds.
  - Vary `playbackRate` slightly (for example 0.95 to 1.05), or raise it step by step on repeated actions.
  - Keep volume normalised, and stop sounds when the interaction ends.
  - Provide a keyboard-reachable mute, and never carry information in sound alone.
- **Fits:** Same targets as 49. Pitch rising with α on the steering slider is the one sound that also *explains* something.
- **Cost:** S to M.
- **Reduced motion:** Separate mute preference.
- **Verified:** article only

### 52. Number ticker (digit-column roll)
- **Source:** https://number-flow.barvian.me *(shot: numberflow-ticker)*
- **Mechanics:** A `<number-flow-react>` custom element. Each digit is a column that rolls to the new value, and the width is held so the layout never jumps. "Shuffle" changed 431.10 to ($3,243.60), with the sign and parentheses animating too. A `continuous` plugin makes the digits pass through the in-between values. It respects reduced motion.
- **Fits:** Every live readout:
  - retrieval QPS and recall@k
  - ES fitness and generation
  - ocean °C at depth
  - satellite altitude and velocity
  - the steering α value
- **Cost:** S to M (dependency-free web component).
- **Reduced motion:** The library swaps values instantly.
- **Verified:** seen live

### 53. Code that updates as the controls move
- **Source:** Framer Motion playground via Mobbin, https://mobbin.com/sites/sections/e4f87706-6811-4b5f-99b1-eb25a70ed050 and https://mobbin.com/sites/sections/9f70191c-9fa2-4381-8bbc-7e701b2b34e7
- **Mechanics:** A code panel (`<motion.div animate={{x: 50, scale: 1.5}}>`) sits beside sliders. Moving a slider rewrites the literal in the code and moves the preview at the same time. The two captures show x going from 0 to 50 and scale from 1 to 1.5.
- **Fits:** The steering demo. Show `h = h + α · v_honesty` with α ticking live (52) as the slider moves, next to the model output. It is the most honest "this is real" signal the site can give.
- **Cost:** S.
- **Reduced motion:** Update the number without a roll.
- **Verified:** Mobbin

### 54. Haptics on touch
- **Source:** https://github.com/tijnjh/ios-haptics and Maximiliano Firtman's note at https://x.com/firt/status/2028807962295230776
- **Mechanics:** iOS Safari never implemented `navigator.vibrate`. The workaround clicks a hidden `<input type="checkbox" switch>` label, which fires a system haptic on iOS 17.4 to 26.4 (reportedly patched in 26.5). Android uses `navigator.vibrate(10)`.
- **Fits:** Slider detents on phones: steering α and ES generation. Treat it as a bonus only.
- **Cost:** S. It is a hack, so feature-detect it and never rely on it.
- **Reduced motion:** Tie it to the sound or feedback preference.
- **Verified:** article only

---

## 9. Loading and intro

### 55. Corner counter preloader
- **Source:** https://lusion.co (a large "100" in the bottom-left while the "L" assembles from two panels) *(shot: lusion-counter-preloader)*. Also gilhuybrecht.com (a small centred "55%") and meermohsin.me (a huge script "002" on red), all seen live.
- **Mechanics:** The counter is tied to real asset progress, not a timer. When it completes, the counter and mark exit, and the page reveals with the site's main ease (`cubic-bezier(0.35,0,0,1)` at Lusion).
- **Fits:** Only if the site really waits on something, such as the globe textures and TLE data. Put a small mono counter in a corner, never centred and never large.
- **Cost:** S.
- **Reduced motion:** Show a static "Loading…" and skip the exit choreography.
- **Verified:** seen live

### 56. ASCII progress bar
- **Source:** https://igloo.inc (`-===+++===` centred on a grey field)
- **Mechanics:** The characters fill left to right (`-` → `=` → `+`) as the loader advances. Then the 3D scene fades in.
- **Fits:** The loader for the three.js routes (globe, retrieval). It fits a mono and firmware look ("flashing" the demo), and pairs with 40.
- **Cost:** S.
- **Reduced motion:** Same bar, which is not motion.
- **Verified:** seen live

### 57. Two-line intro, then the media fades up
- **Source:** https://www.thibaultguignand.com
- **Mechanics:**
  1. A black screen shows only "THIBAULT — CREATIVE DEVELOPER / I EXPLORE THE WEB BETWEEN DESIGN AND CODE…" in small centred mono caps.
  2. After about 6 s, the full-bleed video fades up, the six markers appear and the headline becomes "DISCOVER MY PROJECTS ↗".
  - The ease tokens in its CSS are `cubic-bezier(0.87,0,0.13,1)` for the in-out and `cubic-bezier(0.22,1,0.36,1)` for the out.
- **Fits:** The hero intro: one sentence about who this is, then the demo field comes up. Cap it at about 1.5 s here; Thibault's 6 s is too long for a recruiter visit. Show it once per session.
- **Cost:** S.
- **Reduced motion:** Show the final state immediately.
- **Verified:** seen live

### 58. Mosaic that assembles around the headline
- **Source:** https://www.studiofreight.com (tiles pack the margins around "Moving Missions Forward")
- **Mechanics:** Project tiles pop into grid slots around a centred serif headline, leaving the centre empty for the type. It reads as a sequenced reveal.
- **Fits:** Specimen mode only (48): six demo posters assembling around the name.
- **Cost:** S to M.
- **Reduced motion:** Show all tiles at once.
- **Verified:** seen live (final state only)

### 59. Spiral gather boot
- **Source:** Goodgrowth case study (22)
- **Mechanics:** Thumbnails spiral into the centre over 1.3 s. Angle and radius tween separately (`power1.in` for angle, `power2.in` for radius) with a 0.09 s stagger, so the path is not a fixed curve. The "Insert Disc" CD rotates with CSS `rotateY`. The counter replaces O with 0 so it rhymes with the logo.
- **Fits:** Too branded for this site. It is listed as the upper bound of intro spectacle.
- **Cost:** M.
- **Reduced motion:** Skip it.
- **Verified:** article only (I saw the Insert Disc gate live)

---

## Ease tokens measured live
These are the most frequent `cubic-bezier` values in each site's stylesheets, with the count in brackets:
- Lusion: `(0.35,0,0,1)` ×32, `(0.4,0,0.1,1)` ×26
- Léo Parpeix: `(0.16,1,0.1,1)` ×40
- Gil Huybrecht: `(0.19,1,0.22,1)` ×13, `(0.23,1,0.32,1)` ×8
- Locomotive: `(0.215,0.61,0.355,1)` ×46
- Linear: `(0.32,0.72,0,1)` ×4
- Goodgrowth and Thibault: `(0.22,1,0.36,1)`, with Thibault also using `(0.87,0,0.13,1)` for in-out

The shared shape across all of them is a fast start with a very long, soft settle. Suggested tokens for this site:
- `--ease-out: cubic-bezier(0.16,1,0.3,1)`
- `--ease-in-out: cubic-bezier(0.87,0,0.13,1)`
- durations of 150, 300, 600 and 900 ms

## Reduced-motion practice seen live
- **Paco:** motion exists only inside `(prefers-reduced-motion: no-preference)`. This is the best default.
- **darkroom:** `::view-transition-*{animation:none}` under `reduce`.
- **Austensor:** hides its route overlay and removes the dock and preview transitions under `reduce`.
- **Thibault and Goodgrowth:** a global `*{transition-duration:.01ms;animation-duration:.01ms}` reset. Blunt, but it works.
- **Lenis:** turns smoothing off by itself.

---

## Strongest 8 for this site
1. **Numbered dock with preview cards (16), combined with numbered hotspots and a live background swap (15).** This is the navigation and hero for six demos.
2. **Shared-element View Transition from row to demo (18)**, optionally with a very short typographic curtain (19). It costs no bundle.
3. **Cursor label pill (33), corner-bracket reticle (34) and a per-demo input legend (46).** Inputs are named by motion, not paragraphs.
4. **Number tickers (52) plus live code sync on steering (53).** These make the demos read as real instruments.
5. **Dimming the other experience rows (11)** so one full-colour logo is in focus at a time.
6. **Scramble decode for labels (2), with glyph-noise HUD telemetry on the CubeSat (3).**
7. **Pinned, scrubbed ocean explainer (26) on Lenis (25).** The one place scroll choreography carries meaning.
8. **Globe with drag, inertia, detents and adaptive quality (41), with a crosshair lat/lon readout (35).**

The baseline under all of these is the CSS-variable stagger (4).

---

## Mobile equivalents
How the studio sites I checked translate hover to touch. Captured at 390×844 with touch and an iOS UA *(shot: mobile-equivalents-tg-gil-leo-loco)*, plus sources:

1. **Show the preview inline.** On mobile, Gil Huybrecht's hover-dim index becomes a two-column list: project name, then its thumbnails always visible, with no dimming. Locomotive's text-only work index gains a thumbnail and a "(+)" expander on every row. *Here:* on touch, each demo row shows its poster frame inline, and tapping it plays the demo in place (12). (Seen live.)
2. **Hide hotspots and keep the centrepiece.** Thibault's mobile keeps the video and "DISCOVER MY PROJECTS ↗" and drops the six corner markers and the cursor. *Here:* hide the dock previews (16) and the cursor pills (33). Show the legend (46) as static text. (Seen live.)
3. **Horizontal swipe with neighbours peeking.** Léo Parpeix turns into a snap carousel with the next and previous cards visible at the edges. The cursor sound pill becomes static inline text ("CLICK | TO ENABLE SOUND"). (Seen live.)
4. **Active row driven by scroll position instead of hover.** Use a centre band with IntersectionObserver (`rootMargin: "-45% 0px -45% 0px"`), or CSS `@container scroll-state(snapped: x)` on snap items (Chrome/Edge 133+, not yet in Firefox or Safari), to mark the row in the middle of the screen as "hovered". That fires 11 and 13 as you scroll. Sources: https://developer.chrome.com/blog/css-scroll-state-queries and https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/carousel-snap-highlights.md
5. **Tap to preview, second tap to open.** Long-press triggers the hover class and a tap follows the link: https://github.com/vin-ni/hover-on-touch. The general alternatives (primary action on tap, preview on a second tap or its own page) are at https://uxpickle.com/alternatives-to-hover-interaction-on-touchscreens/. Gate hover-only code with `@media (hover:hover) and (pointer:fine)` so touch taps don't leave stuck `:hover` states.
6. **Gyroscope as the "mouse".** `deviceorientation` gamma and beta drive the parallax or glow that the pointer drives on desktop. iOS 13+ needs `DeviceOrientationEvent.requestPermission()` inside a user gesture, so ask on the first tap and fail silently. Chrome 152 exposes `requestPermission` on desktop too, so don't use it to detect iOS. Throttle the events. Sources: https://dev.to/trekhleb/gyro-web-accessing-the-device-orientation-in-javascript-2492 and https://github.com/parallax-editor/parallax-engine/pull/66. *Here:* tilt the phone to rotate the CubeSat globe slightly, or to shift the ocean layers.
7. **Tune WebGL for touch.** Cap DPR at 1.25 and turn off antialiasing (Codrops Infinite Canvas). Warm up shaders to avoid WebKit's deferred compile hitch. Use smaller preview textures and defer GLB and PMREM loading. Snap from where the gesture started (Goodgrowth). Keep native touch scrolling (Lenis `syncTouch:false` by default).
8. **Touch feedback in place of hover.** Use a short press-scale (0.97) or ripple on tap: https://uxmovement.medium.com/the-hover-effect-for-mobile-buttons-ed9735fd5edc. Add optional haptics on detents (54). On iOS, handle the hardware mute switch and AudioContext suspend with a visual fallback, such as Goodgrowth's animated EQ glyph.

---

## Access notes
- **activetheory.net** returned a "Not Supported" page to headless Chromium with SwiftShader, so I have nothing from it.
- **godly.website** now redirects (301) to recent.design, which is a general design feed with no site-level listings. I used the Awwwards "transitions" collection and Sites of the Day instead, both of which WebFetch reached.
- **Lusion** mid-interaction screenshots timed out on SwiftShader. Only the loader and the scrolled states were captured.
- **Mobbin** results are static, so the motion for 13, 14, 30, 44, 47 and 53 is inferred from the layout.
- **Not examined:** obys, dogstudio, resn, vercel.com and stripe.com. Linear and 14islands were only probed (ease values and Lenis presence).
