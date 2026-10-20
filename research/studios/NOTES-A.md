# Studio research, set A: basement, Cloudstudio, Shader, Analogue, Unseen

Captured 2026-09-28. Every observation below comes from the live sites, from my screenshots and scroll videos in this folder, from computed styles read in the page, or from the sites' own JS and CSS bundles. Where I'm inferring from a still frame rather than measuring, I say so.

## Method (and two deviations from the brief)

- I used Playwright Chromium in headless mode at 1440×900 and at iPhone 15 size (393×659, DPR 2, touch, iOS UA). Mobile scrolling uses real touch gestures (CDP `Input.synthesizeScrollGesture`). Desktop scrolling uses `mouse.wheel` in 50 px steps every 20 ms. Screenshots are JPEG q70. Videos are mp4 at 960 px (desktop) and 390 px (mobile), crf 32 or 36, all under 2.3 MB.
- **Deviation 1: renderer.** I switched from SwiftShader to `--use-angle=metal --enable-gpu`. SwiftShader ran shader.se at **0.5 fps**, and each `mouse.wheel` call took 3.6–6.4 s, so the sites were effectively unusable. Metal ran the same page at about 13 fps with roughly 50 ms per wheel event.
- **Deviation 2: Shader's renderer.** Shader uses three.js **WebGPURenderer** (TSL node materials). In headless Chromium, WebGPU→Metal fails with Tint errors ("swizzle view instruction still has usages after lowering") and the page renders black. I hid `navigator.gpu` in an init script so three falls back to its WebGL2 backend. After that it renders fully.
- Headless GPU frame rates are lower than on a real machine, so the videos look somewhat choppier than the live sites.
- Per-studio files: `desktop-fold.jpg`, `desktop-01..0N.jpg`, `desktop-hover*.jpg`, `desktop-case*.jpg`, the `mobile-*` equivalents, `desktop.mp4` and `mobile.mp4`. There's also `tech.json` (the raw computed-style, font, grid, easing and bundle-grep dump) and, for three sites, `animations.txt` (`document.getAnimations()` read at load, on hover, and 50/250/600/1200 ms after the case-study click).
- Caveat on the stack detection: grepping bundles for "taxi", "hydra" and "astro" produced false positives from minified identifiers. I only report libraries that were confirmed by a global, a class name, or an unambiguous signature.

---

## 1. basement.studio

**URL:** https://basement.studio/. It loaded with title "basement.studio | We make cool shit that performs" and a description that begins "basement.studio is a digital studio crafting brands, websites, 3D experiences…". The page shows the basement. wordmark, and the footer says "the team behind the Geist typeface".

**Stack:** Next.js (App Router, `self.__next_f`), React, and three.js r180 (`window.__THREE__ = "180"`) via react-three-fiber. Two full-viewport canvases, one of them WebGL2. Framer Motion signatures are in the bundles. There's no Lenis class; the page uses native scroll with `scroll-behavior: smooth`. Tailwind is evident from the class names and the default `cubic-bezier(0.4,0,0.2,1)` easing (12 rules).

**Type:**
- Families: Geist (sans) for everything, Geist Mono for the HUMAN/MACHINE toggle and small labels, and "flauta", a custom display face used for the giant `BSMNT` footer wordmark.
- H1: 87 px, weight 600, line-height 78 px (0.9), tracking −3.48 px (**−4 %**), colour #E6E6E6.
- Section heads ("Featured Projects", "We're here to create the extraordinary.", "Let's make an impact together.", "hello@basement.studio"): 76 px, weight 600, line-height 68 px, tracking −3.04 px (−4 %), colour #C4C4C4.
- Project names 38 px/600/−1.52 px, body 16 px/400, UI 12–13 px/600. A few labels use 12–14 px uppercase with normal tracking.
- Case is sentence case throughout. Uppercase only appears in the mono toggle.

**Palette:** background #000. Text #E6E6E6 and #FFF, secondary #C4C4C4, muted #757575. Hairlines and tiles #2E2E2E. One accent: **#FF4D00** (orange), used for the "Online" dot, the active HUMAN label, the active nav item, and the whole MACHINE page.

**Grid:** 12 columns with a 12 px gap and 16 px outer padding. Variants use 6, 8 and 10 columns inside it. The client-logo wall is 6 columns of bordered tiles.

**Motion:**
- *Intro:* The first screen is an R3F 3D scene of the studio's basement (stairs, arcade cabinet, basketball hoop, CRT wall, a man and a dog). It first draws as **white wireframe edges on black with dithered pixel noise** (visible at 4.5 s). Around 6–7 s it resolves into the lit, textured render. See the first row of the video; `desktop-fold.jpg` shows the wireframe state and `desktop-scene-loaded.jpg` the textured one. The only words on screen are the nav and a HUMAN/MACHINE pill.
- *Scroll:* Native scroll. The H1 and intro paragraph sit under the 3D scene (`--canvas-offset: 80svh`).
- *Featured projects:* A sticky accordion stack. As you scroll, the active project's media panel (left, 8 of 12 columns) expands to about 390 px tall, the previous one collapses to a thin strip, and its paragraph and title (title right-aligned, 38 px) stay pinned beside it.
- *Hover on a project:* The media plays a video loop. A black `[View Project]` label (13 px, white on black) follows the cursor over the media and fades in on a **200 ms ease-out WAAPI opacity** animation; the fade-out is a 200 ms `cubic-bezier(0.4,0,0.2,1)` transition. That's measured.
- *Ambient CSS animations:* `pulse` 2 s on the orange Online dot, a 6 s linear `diagonalPatternAnimation` on striped panels (the contact block has diagonal hatching), and `machine-reveal`/`machine-flicker` keyframes for the MACHINE mode.
- *Page transition:* On click, the screen goes **fully black** (captured at 300 ms), then the case page mounts. On mobile the case images show blurred placeholders at 300 ms before sharpening.
- *Cursor:* The system cursor, plus the `[View Project]` follower label.
- *HUMAN / MACHINE toggle:* A fixed pill at bottom centre. MACHINE goes to `/ai/home`: an **orange-on-black monospace, plain-text "machine-readable index" of the whole site** ("PLAIN-TEXT MIRROR OF BASEMENT.STUDIO FOR AI AGENTS, CRAWLERS, AND HUMANS WHO PREFER IT RAW"). It has ASCII-art BSMNT, `/HOME /SERVICES…` path nav, and `NAME ........ BASEMENT.STUDIO` key/value rows. The nav also shows "Press [/] to chat" and an "Online (3)" presence count.

**How work is presented:**
- Home: 4 featured projects in the sticky stack, each with a big media panel, a 3-line paragraph at about 20 px, and the name at right in 38 px.
- Then a 4-column capabilities grid with grey tag chips.
- Case page (`desktop-case.jpg`): a **sticky left column about 240 px wide** holding a hairline-ruled metadata table (Client with favicon, Year, Type, a stacked Awards list, Link), three short paragraphs, and "More Projects" links pinned at the bottom. The right side is an edge-to-edge image mosaic with 8 px gaps: a colour-swatch strip, a laptop mock, full-width screenshots.

**Words:** 11 on the first screen (nav plus toggle only). 373 on the whole home page.

**What makes it feel expensive:**
- The first screen is a **real 3D scene of their physical space** with no headline. The type waits until you scroll.
- The wireframe-to-shaded resolve during load turns a loading state into a reveal.
- One accent colour (#FF4D00) on pure black. Every other colour is a grey step (#E6E6E6, #C4C4C4, #757575, #2E2E2E).
- The display type is tight: −4 % tracking with line-height 0.9 at 76–87 px, in one family.
- The case-page meta table uses hairline dividers and a fixed-width label column. It reads like a spec sheet.
- The MACHINE mode is a confident signal to AI-savvy clients.

**Patterns:**
1. **Wireframe→render intro.** Trigger: the 3D scene mounts. The scene draws as edge lines and dithered points, then swaps to shaded materials once assets load (about 5–7 s here). *Portfolio use:* draw the CubeSat tracker's globe and orbit, or the retrieval sim's vector space, as wireframe edges or point cloud first, then fill in once data and textures arrive. The loading state becomes the intro.
2. **HUMAN / MACHINE toggle.** A fixed bottom pill toggles to a plain-text mono mirror of the site for agents. *Portfolio use:* this fits an ML engineer almost perfectly. Ship `/machine` or `llms.txt`-style pages: key/value CV rows, a demo index with the claims and numbers, orange mono on black.
3. **Sticky accordion project stack.** Trigger: scroll. The active item's media height animates from a strip to about 390 px while the previous one collapses; the paragraph and title stay pinned. *Portfolio use:* stack the six demos. Each one expands into a live mini-canvas while it's active, and the others shrink to 40 px strips showing name and metric.
4. **Cursor-following action label.** On mousemove over the media, a `[View Project]` chip (13 px, black background) tracks the pointer and fades in over 200 ms ease-out. *Portfolio use:* over a demo preview, show `[Run demo]` or `[Open sim]` next to the cursor.
5. **Spec-sheet case layout.** A sticky 240 px left column with a hairline-ruled key/value table and "More projects" at the bottom; media scrolls on the right. *Portfolio use:* demo pages with a left table (Model, Method, Dataset, Params, Result, Paper, Code) and the live demo scrolling on the right.
6. **Client wall in bordered tiles.** A 6×n grid of equal cells with 1 px #2E2E2E borders and monochrome logos. *Portfolio use:* the experience list as a tiled logo grid, each tile opening role, dates and a one-liner.
7. **Presence plus command affordances.** "Online (3)" with a pulsing 2 s orange dot, and "Press [/] to chat". *Portfolio use:* a live status dot on the CubeSat tracker ("MarmotSat · live · pass in 14 min") and `/` to open a command palette over the demos.
8. **Giant footer wordmark.** `BSMNT.26` in a custom face across the full width above the footer links. *Portfolio use:* a full-bleed monogram or name, or a vector-dimension string such as `1,000,000,000 × 768`, as the footer.

---

## 2. Cloudstudio (cloudstudio.es)

**URL:** https://cloudstudio.es/. The obvious guesses didn't work: `cloud.studio` redirects to "Cloud Studio IoT" (an industrial-IoT SaaS, not a studio); `cloudstudio.co`, `cloudstudio.io` and `cloud.design` are parked; `cloudstudio.ai`, `cloudstudio.design` and `thecloud.studio` don't resolve; `studiocloud.co` sits behind a human-verification wall. The Awwwards entry **"Cloudstudio this site is awake"** (Honorable Mention / SOTD, July 2026, tagged Design Agencies, Three.js + Matter.js + Vanilla JS) links to cloudstudio.es. The live page matches that entry: its title is "Cloudstudio — AI that actually ships", its first screen says "This site is awake. Choose your driver", and it lists `hello@cloudstudio.es`. **Caveat:** this is an AI-native dev studio in Spain. If the user meant a different "Cloud Studio", this entry should be swapped out.

**Stack:** Vanilla JS in a multi-page build, with separate script files `lenis.js`, `three.js`, `organism.js`, `matter.js`, `lottie.js`, `game.js` and `mascot.js`. There's a small React island (`react-dom.js`, `dc-runtime.js`). three.js r160 and Lenis are confirmed (`html.lenis`, `window.lenis`). Lenis options: `duration 1050`, `wheelMultiplier 1`, `smoothWheel`. There are 14 canvases: two WebGL2 (the particle "organism", the mascot) and the rest 2D (small particle avatars and the physics toolkit). Matter.js drives the "drag & throw" toolkit tags.

**Type:**
- Families: Bricolage Grotesque (400–800) for display and body, Geist Mono 400/500 for labels.
- H1 "AI that actually ships.": **158 px, weight 700, line-height 0.9, tracking −7.11 px (−4.5 %)**.
- H2 83 px/700/−2.9 px. H3 60 px weight 800, uppercase, −2.1 px.
- Card titles 38.4 px/700/−0.77 px. Body 18.7 px/600.
- Mono labels are 10–12 px uppercase with tracking +0.72 to +2 px, in parentheses: "( CHOOSE YOUR DRIVER )", "( CLAUDE · RAG · MCP )".
- Giant ghost numerals "01/02/03" at 576 px with 5–7 % alpha sit behind the service cards.

**Palette:** a light theme. Background **#FFF48D** (butter yellow), ink #0E0E0C, paper #FAF7EA, ink-soft #3A3A30, muted #8F8F80, success #46C98B. Dark sections use #0E0E0C with yellow text. The site re-themes per "driver" (`cs-theme-ready`). Case pages switch to off-white with an indigo accent.

**Grid:** 2-column sections with a 72 px gap and 44 px padding. A 4-column stats row with a 43 px gap. The work grid is 2 columns of dark image cards.

**Motion (tokens read from `:root`):**
- `--ease-out: cubic-bezier(0.16,1,0.3,1)` is used in 51 rules. `--ease-back: cubic-bezier(0.34,1.56,0.64,1)` in 13. `--ease-inout: cubic-bezier(0.76,0,0.24,1)`.
- `--dur-1 .2s`, `--dur-2 .34s`, `--dur-3 .5s`, `--dur-4 .7s`.
- About 30 named keyframes: `cs-bob`, `cs-rotword`, `cs-flowdot`, `cs-stamp-slam`, `cs-scan`, `cs-type` and so on.

What moves:
- *Gate/loader:* A "This site is awake." screen offers 8 selectable **particle mascots** ("Dot — the quick tour") in a black dock, with "Let Dot drive →" and "Skip · explore yourself". The eyebrow fades in over 500 ms and translates over 550 ms on `ease-out`; the dock fades in over 700 ms after a 200 ms delay (measured). Skipping triggers a **black iris wipe**: a black circle grows from the centre to cover the screen, then the mascot's eyes blink in the dark (`desktop-fold-after-gate.jpg`, video 0:08).
- *Hero:* A WebGL particle "organism" morphs continuously: sphere, then scattered cloud, then particles spelling **"LIVE"**, then back to a sphere (video 0:09–0:15). The headline stays put.
- *Rotating word:* "We don't just call **APIs. / scripts. / demos.**" cycles on a 6.5 s `cs-rotword` loop.
- *Service cards:* Stacked cards that pin and overlap on scroll ("Agents & applied AI" dark, "SaaS products" yellow, "Web & apps"). Each contains a live mini-UI: a flow diagram, animated progress bars (`cs-bar` 2.4 s), a bar chart, and floating chips like "ENGINE ONLINE" and "$0.0142 / RUN" bobbing on 4.6 s and 5.4 s offset loops.
- *Stats:* Count-ups ("18+ years shipping", "352K+ open source downloads", "<4w to first deploy") over a dark constellation canvas. The work-card metrics also count up from 0 (0 → 25 → 100 in the video).
- *Work grid:* Hover measured. Image scales over **900 ms** on `(0.16,1,0.3,1)`. The grey tint overlay fades over **550 ms**, so the card goes from **desaturated/dark to full colour**. The ↗ arrow pops over **450 ms** on the back-out `(0.34,1.56,0.64,1)`. The title shifts over 600 ms. The **cursor morphs into a "CASE STUDY" pill**: width, height, padding and radius animate over 300 ms on `ease-out`, and the label fades over 250 ms.
- *Toolkit:* Tech tags ("MCP servers", "RAG pipelines", "Claude", "DeepSeek", "Vercel AI SDK") are Matter.js bodies you can drag and throw inside a black rounded box. The mascot flies over and says "Mine!".
- *Scroll-spy:* A vertical column of dots on the right edge labels the active section ("HOW WE WORK", "TOOLKIT", "SELECTED WORK").
- *Case page (`/work/agents`):* The "Agents" title letters rise over **1100 ms** (`rise` keyframe per letter). The status pill "ENGINE ONLINE · 474 RUNS · SCORE 100" fades in over 1000 ms after a 450 ms delay. Floating workflow-node cards ("RSS News Feed", "LLM Generate", "Post to X") drift around the title. A 34 s marquee of worker roles runs underneath.
- *Mobile:* A fixed bottom dock holds mute, "BOOK A CALL →" and play. The touch scroll got held by the physics canvas at "Our toolkit" (visible in `mobile-03..05`): a real UX trap.

**How work is presented:** "Selected work" is a 2-column grid of dark, desaturated screenshot cards. Each card has an index ("01 ↗"), a name, a mono sub-label ("AI workers · Orchestration"), a big counted metric at right ("100 avg run score", "2026 edition"), and a live-data chip. The last cell is "SLOT 06 · OPEN — Your product on this wall. Book a call". Case pages have a giant word title, a one-line pitch, two buttons ("Visit the platform ↗", "All work"), a 4-column meta row (Client / Deliverable / Role / Workforce), then "Personnel files" sections with real product screenshots.

**Words:** about 35–40 on the first screen after the gate (plus the cookie card). **1,119 on the home page**, the most text-heavy of the five.

**What makes it feel expensive:**
- Each service card contains a **working miniature of the product** (live bars, a flow graph, chips with real-looking numbers like "$0.0142 / RUN") instead of an illustration.
- Numbers are first-class: counted up, in mono, right-aligned against the title.
- The motion tokens are consistent: one expo-out curve and one back-out curve across the whole site.
- The hover turns a grey card into full colour, and the cursor becomes a labelled pill.
- It commits to a personality (particle mascot, a game, sound toggle), though for this user's taste the yellow theme is the opposite of what's wanted.

**Patterns:**
1. **Iris-wipe gate.** Trigger: the "Skip" or "Let Dot drive" click. A full-screen black circle scales from the centre (`clip-path: circle()` or a scaled element), then the scene fades up. *Portfolio use:* the transition from the landing page into a full-screen demo, such as a circle expanding from the "Run" button into the steering explainer.
2. **Particle organism that re-forms into words.** A WebGL points cloud tweens between target shapes (sphere, cloud, the glyphs "LIVE"). *Portfolio use:* the retrieval sim hero: a billion-vector cloud (sampled) that condenses into the query's top-k neighbours or spells "k=10".
3. **Live mini-UI inside a card.** Cards contain animated product fragments (progress bars on a 2.4 s loop, a flow diagram, bobbing metric chips). *Portfolio use:* each demo card on the index runs a 3-second live loop: a token strip with masked tokens greying out, an ES loss curve ticking down, the satellite's ground track advancing.
4. **Count-up metrics in mono.** When a card enters the viewport, a right-aligned number counts up from 0, with a small mono caption. *Portfolio use:* "1.2B vectors", "p99 38 ms", "reward +14 %", "alt 517 km", all counted up on reveal.
5. **Grey-to-colour hover with cursor morph.** Tint opacity to 0 over 550 ms; image scale over 900 ms on `(0.16,1,0.3,1)`; arrow pops over 450 ms on back-out; the cursor grows into a text pill over 300 ms. *Portfolio use:* experience logos in mono grey that turn brand colour on hover; the demo cursor becomes "RUN ▸".
6. **Throwable tag physics.** Tech tags are Matter.js bodies inside a bounded box that you can drag and throw. *Portfolio use:* a small "stack" playground (PyTorch, JAX, vLLM, FAISS…). Keep it off the main scroll path on mobile: it swallowed touch scroll here.
7. **Right-edge scroll-spy dots.** Fixed dots show a label on the active section. *Portfolio use:* an index of the six demos down the right edge.
8. **Per-letter rise on the case title.** Each glyph is its own element, translating on a 1.1 s keyframe, with the status chip fading in 450 ms later. *Portfolio use:* demo page titles ("Activation steering") rise in, then a live status chip ("MODEL LOADED · 7B · CPU") appears.

---

## 3. Shader (shader.se)

**URL:** https://www.shader.se/. The title is "Shader Development Studio" and the meta description reads "…Interactive 3D and AI Solutions. Based in Sweden…". The content says "A Creative Development Studio, Plugged into the Future" and gives the address Laxholmstorget 3, Norrköping, with `hello@shader.se`. Awwwards lists "Shader Development Studio" as SOTD (awwwards.com/sites/shader-development-studio). `shader.studio` is an unrelated "Local Stream" app.

**Stack:**
- Next.js on Vercel (`?dpl=` asset param), React, three.js **r183 using WebGPURenderer / TSL** (it falls back to WebGL2 when WebGPU is missing), and react-three-fiber.
- Lenis is bundled (`duration .8`, `wheelMultiplier 1`, `smoothWheel`), but `body` is `overflow-hidden overscroll-none select-none`: the "page" is one full-screen canvas driven by wheel and section snapping.
- The DOM holds only an accessible mirror of the content: STIX Two Text at 16 px, nav buttons, a carousel with "Previous project / View project / Next project", and a skip link. **All visible type is rendered in WebGL.**

**Type:**
- One family: **STIX Two Text** (a serif), rendered in the canvas with CRT glow and bloom.
- The hero headline looks to be about 90–100 px on desktop, in 4 lines, with a warm white glow. That's an estimate from the screenshot; it's canvas text, so there's no computed style.
- Nav is about 16 px serif with underlines. Section titles like "Making Digital Storytelling More Playful, Powerful, and Alive" are centred serif at roughly 48 px on cream paper.
- The boot screen uses a monospace system font.

**Palette:**
- Black and deep-violet night backgrounds, with foreground **#FCF9F3** (warm white).
- A CRT-blue boot screen (#2B2BA8-ish, estimated from the screenshot).
- Cream-paper "print ad" sections (#EFE8DA-ish, estimated) with **Apple-style rainbow stripes** as dividers.
- Photography is warm, grainy '80s corporate stock: three men with beige PCs.

**Grid:** not measurable (canvas). The About section is visibly a **3-column newspaper layout** with a centred headline above.

**Motion:**
- *Loader:* A **DOS-style boot screen**: striped SHADER logo, "Shader Development Studio, Website Version 1.02", a segmented progress bar, and "Copyright (c) Shader Development Studio AB, 2026". It shows for about 8 s headless (video 0:02–0:10).
- *Global post-processing:* The whole viewport is a **curved CRT**: rounded vignette corners, scanline grain, slight chromatic fringing, and bloom on light text. Everything, including the nav, sits under it.
- *Hero:* A 3D Commodore PET-style computer whose **screen cycles through project previews** about once a second (green island, orange, blue, pink phone, yellow footprints; video 0:12–0:17). The headline sits on a cloudy violet backdrop.
- *Scroll:* Wheel or touch **snaps section to section** with camera moves; the URL hash updates (`#selected-work`, `#about-us`, `#contact`). Continuous scrolling inside the carousel doesn't move on; the next section needs more wheel or a nav click.
- *Work carousel:* A **curved 3D film strip** (sprocket holes top and bottom) wraps the viewport like a cylinder. The centred frame is the active project. The project title ("eHealth Arena", "Select Concept", "Gamily") and "3D Showroom · View project" sit above it. ←/→ buttons rotate the strip about one frame per click over roughly 1 s (estimated from video frames), and page dots show 10 items. The frames play video previews.
- *Section change:* A **page curl**. On mobile the next section peels in like paper (`mobile-01` in the first run shows the curl corner). On desktop the About sheet slides up over the carousel (video 0:25).
- *Case view:* "View project" opens an **in-canvas overlay sheet** (cream paper, "Close ×" top right) with the title, type and 3-paragraph description on the left and a **horizontal gallery** of large screenshots on the right that scrolls horizontally with the wheel. It ends in "Next Project — Alamance Foods — Continue →" (mobile).
- *Contact:* "Hello" in giant glowing serif over 3D beige telephones, a fax-style "Act now! Book a Consultation" coupon with a dashed cut line and scissors icon, and "Worldwide Business Certified Company" seals.
- Durations found in the bundle: `.15`, `.3`, `.5`, `.8`, `1`, `1.25`, `1.3`, `1.5` (seconds).

**How work is presented:** Only one project is on screen at a time, on the film strip. Name and type sit above in glowing serif; there's no metrics row. Detail lives in the overlay sheet, not on separate routes.

**Words:** about 22 visible on the first screen after boot (nav, the 9-word headline, "Scroll to Inspect Our Closed Deals"). The DOM mirror holds **515** words, mostly the About copy.

**What makes it feel expensive:**
- **One coherent fiction** (a 1985 corporate software company) carried through every surface: boot loader, CRT post-processing, stock-photo founders, fax coupon, "certified company" seals, the copy ("Inspect Our Closed Deals").
- The work is shown **inside a 3D object**: the PET's screen, the film strip.
- A single serif family with glow, so the tech feels warm rather than neon.
- Everything is canvas and the DOM is a clean accessible mirror, so craft and a11y coexist.

**Patterns:**
1. **Boot-screen loader.** On load, a full-screen DOS panel ("Version 1.02") with a segmented progress bar tied to asset loading. *Portfolio use:* the CubeSat tracker opens with a ground-station console boot (`MARMOTSAT GS v0.3 … TLE fetched … SGP4 ok`) whose progress is the real TLE fetch.
2. **CRT post-processing shell.** A full-screen pass adding barrel curvature, vignette, scanlines, chromatic fringe and bloom on text. *Portfolio use:* if applied very subtly to the satellite tracker or a terminal-style demo, it makes a "mission control" feel; keep it off the reading surfaces.
3. **Preview cycling on an in-scene screen.** A 3D monitor texture swaps between project clips about every 1 s. *Portfolio use:* the hero shows a single device or panel that cycles one-second loops of each demo.
4. **Curved film-strip carousel.** A cylindrical strip of frames rotates one step per ← or → press, the title swaps above, and frames play video. *Portfolio use:* a "reel" of the six demos. Probably too gimmicky for research work, but the wrap-around, one-at-a-time focus is transferable.
5. **Section snap with hash sync.** A wheel threshold advances one section with a camera move and updates `location.hash`. *Portfolio use:* for a demo-first page, snap between full-screen demos with deep-linkable hashes (`#steering`, `#loss-masking`).
6. **Overlay case sheet.** "View project" slides up a paper sheet over the scene: left text column, horizontal gallery on the right, "Close ×", and "Next project → Continue" at the end. *Portfolio use:* open a demo's write-up as a sheet over the running demo, so the demo keeps running behind it.
7. **Page-curl section transition.** The next section peels in like paper (mobile). *Portfolio use:* not recommended as-is. A single use for turning from "demo" to "paper" could work.
8. **Print-ad about section.** A centred serif headline over three justified columns with a cut-out portrait. *Portfolio use:* an "About / Research statement" set as a journal page: three columns, drop cap, figure. It suits research people.

---

## 4. Analogue (analogueagency.com)

**URL:** https://analogueagency.com/. The title is "Analogue · Brand & Digital Design Agency · Amsterdam" and the page says "Analogue is a brand and digital design studio in Amsterdam… Vitra, Nike, Tony's Chocolonely, Leica". The address is Oudeschans 26-H, Amsterdam. `analogue.agency` is parked on GoDaddy.

**Stack:** **Framer** (`meta generator = "Framer 9180a24"`, `data-framer-*`), with Lenis (`html.lenis`) and Framer Motion (WAAPI animations are visible in `getAnimations()`). One WebGL canvas (1152×720) renders the hero's radial light-streak starburst. The body has `framer-cursor-none`, i.e. a custom cursor.

**Type:**
- Families: **Graphik Medium** (500) everywhere, Graphik Semibold for small UI, and **"LCDDot TR"** (a dot-matrix LCD face) for nav labels. The document also registers about 20 other faces for case pages (ABC Favorit, GT Ultra, Real Head…).
- Statement: **60 px/500, line-height 1.0, tracking −3 px (−5 %)**, set letter by letter (each glyph a span).
- Secondary 40 px/500/−2 px. UI 11–12 px. Nav in LCDDot at 20 px uppercase, +0.5 px.
- In the statement, key words are grey (#7A7A7A) links: "digital design studio", "Vitra", "Nike", "Tony's Chocolonely".

**Palette:** a light page (#EDEDED background, #1C1C1C text, #7A7A7A grey). The hero is a deep navy (#060A1A-ish) WebGL starburst. There's an electric-blue #0038FF newsletter card, and each case supplies its own colour (Atomic red, Vitra orange).

**Grid:** no CSS grid; Framer stacks. Work images run edge to edge with about **8 px outer margins and gaps** and about 12 px radius. The "Jump to" row is 4 small square image cards with 11 px captions.

**Motion (measured with `getAnimations`):**
- *Intro:* The headline "Emotion is the heart of every decision" (about 18 px, white, centred over the starburst) **fades in letter by letter**: per-glyph opacity, durations up to 2000 ms, ease **`cubic-bezier(0.44,0,0,1)`**, staggered delays. The nav pill enters on a **1000 ms transform after a 2000 ms delay**.
- *Scroll:* The full-bleed hero **shrinks into an inset rounded card** (about 64 px margins, 12 px radius) while the headline **splits**: "Emotion is the heart" slides left and "of every decision" slides right (video 0:08–0:10). Scroll-linked; Lenis smooths it.
- *Floating pill nav:* A frosted pill ("WORK · analogue · ABOUT", top centre, roughly a third of the viewport wide). Over the work section it **turns into a project label**: an orange pill "Vitra: 100 years Panton · SEE CASE" with the client logo, which changes content and colour for each project as you scroll ("Equip · SEE CASE", "ILGM.com", "Ask phill"). This is the signature interaction.
- *Case transition (measured):* The page goes white with an empty grey pill, then the case's **brand-colour block fills the frame** (Atomic red). The case headline words ("Prepare yourself…") fade in on a **400 ms spring** (a `linear()` easing with 39 stops) with a **75 ms per-word stagger**. The nav fades over 1000 ms on `(0.44,0,0,1)`. A client-list ticker scrolls linearly over 626 s.
- *Hover:* Nothing measurable on the work images (no WAAPI or CSS change). Feedback comes from the cursor and the pill label instead.
- Only two CSS transitions site-wide: `color .15s` and `opacity .4s ease-out`.

**How work is presented:** Home: statement, then a "Jump to" row (Website of the Year / New case / Our team / Contact), then "Our work / See all", then **full-width product photography stacked with 8 px gaps**, with no titles on the images. The label lives in the floating pill. Case page: a brand-colour hero card with the logo, then "Crafting Atomic's 2025 vision, strategy and touchpoints." with Year/Deliverables columns, then giant product renders (ski goggles arranged in a column).

**Words:** about 9 on the first screen (headline plus nav). **133 on the whole home page**, the least of the five.

**What makes it feel expensive:**
- **Images carry the page**; there are no captions on the work.
- The single project label is the **morphing nav pill** (it changes text and colour on scroll).
- The −5 % tracked 60 px Graphik statement with grey inline brand links.
- The letter-by-letter intro on a slow `(0.44,0,0,1)` curve.
- Brand-colour case openers.
- A dot-matrix LCD nav face as a small, idiosyncratic detail.

**Patterns:**
1. **Nav pill becomes a context label.** On scroll into each work item, the fixed top pill changes content (logo, title, "SEE CASE") and background colour. *Portfolio use:* while scrolling the demo stack, the top pill reads "Loss masking · 2025 · OPEN DEMO" and switches to the demo's accent colour. For the experience list: "Anthropic · 2024–now".
2. **Hero-to-card shrink.** A scroll-linked transform scales the full-bleed hero into an inset rounded card (0 → about 64 px margins, 0 → 12 px radius) while the headline halves translate apart. *Portfolio use:* the live steering demo is full-bleed on load, then shrinks into its card as you scroll into the index.
3. **Per-letter fade intro.** Each glyph is a span; opacity runs 0→1 over up to 2 s on `cubic-bezier(0.44,0,0,1)` with stagger. *Portfolio use:* a one-line hero ("I make models legible") types in softly. Keep it short.
4. **Inline grey links in the statement.** The statement is 60 px Graphik and named entities are #7A7A7A links. *Portfolio use:* "ML engineer working on **interpretability**, **RL fine-tuning** and **retrieval at scale**", where each grey phrase links to its demo.
5. **Caption-less full-bleed work stack.** 8 px gaps, 12 px radius, one image per row, no text. *Portfolio use:* only for the one or two most visual demos (ocean sensing, satellite). Research needs labels, so pair it with pattern 1.
6. **Brand-colour case opener.** The case page opens on a full-screen block in the client's colour with the logo, before the content. Words spring in with a 75 ms stagger over 400 ms. *Portfolio use:* each demo page opens on a solid panel in the demo's accent colour with a one-line claim, then the live demo.
7. **"Jump to" shortcut row.** Four small image cards with 11 px captions under the statement. *Portfolio use:* "Jump to: Steering · Loss masking · ES · Retrieval · Ocean · Satellite", with 1-second looping thumbnails.
8. **Dot-matrix nav face.** LCD-style type for nav only. *Portfolio use:* a pixel or LCD face for the satellite tracker's HUD (telemetry readouts) only.

---

## 5. Unseen Studio (unseen.co)

**URL:** https://unseen.co/. The title is "Unseen Studio® – Brand, Digital & Motion" and the description includes "Design Studio of the Year – Awwwards". The page shows "UNSEEN STUDIO®", `projects@unseen.co`, and a Bristol (+44 0117) phone number. `unseen.studio` is parked.

**Stack:**
- WordPress theme (`wp-theme-unseen`).
- **Highway.js** router (`[data-router-view]`) for page transitions.
- **ASScroll** smooth scroll (`html.asscroll-disabled` on the fixed pages).
- three.js r143, **GSAP + ScrollTrigger** in `theme.js`/`vendor.js`, **Howler** (sound, with an "Enter / Enter without audio" gate), and a split-text utility.
- One full-screen WebGL2 canvas. On home and on /projects/, **all headline type and the project grid are WebGL** (MSDF text; "Creating the unexpected" isn't in the DOM). Project data sits in an inline JSON block with `"link"` fields.

**Type:**
- **Neue Montreal** (sans) paired with **Saol Display** (a high-contrast serif, roman and italic).
- Hero: "Creating the" in Saol Display italic, stacked over "unexpected" in Neue Montreal. It's WebGL, so the size is estimated at about 70 px from the screenshot.
- Case titles repeat the mix: "*PROJECTS/*" in Saol italic caps, "KIKK 2024" in Neue Montreal at about 80 px, "FESTIVAL" roman and "*IDENTITY*" italic.
- "Selected Projects": 57.6 px/400, tracking −1.15 px (−2 %).
- Menu items: **90 px Saol Display**, tracking −1.44 px, each letter a DIV, numbered with 9 px superscripts ("01 Index", "02 Projects").
- Body 14.4–17.3 px; labels 10–11.5 px uppercase. The "View our work" pill is 15 px.

**Palette:** a light, warm world. Gate #EFDED9 (dusty pink); the 3D room is pink stucco with lilac water and sky blue. Text #212121/#000, secondary #424242. Projects page is off-white (#F1EDEB) with white arches; case pages are pure white. The only dark element is the round black menu and sound buttons.

**Grid:** the projects grid is WebGL: 2 columns of image planes (about 570 px wide each on desktop) with the title plus type underneath each, divided by a hairline with a ↘ arrow. The case page uses a centred 3-column meta block (overview paragraph / Services / Date + Client + Location).

**Motion (bundle counts; GSAP eases found as strings):**
- `expo.out` ×45, `power2.out` ×29, `expo.in` ×26, `power4.out` ×13, `power4.in` ×9, `sine.out`, `elastic.out`.
- Durations: `1` ×59, `.5` ×35, `.8` ×21, `2`, `1.5`, `3`.
- CSS: `transform 1s cubic-bezier(0.16,1,0.3,1)`, `opacity .7s cubic-bezier(0.19,1,0.22,1)`, `scale/fill .4s cubic-bezier(0.87,0,0.13,1)` (expo in-out), `color .5s ease-out`.

What moves:
- *Gate:* Pink screen with a pair of googly eyes, a 3-line blurb, and "Enter ↘" or "ENTER WITHOUT AUDIO". On entering, the pink fades and the **3D room fades up**. A glass sphere floats; there are water reflections and floating petals.
- *Letter-cycling loader:* During route loads, a single large letter in the centre of a white page cycles through **U-N-S-E-E-N** (`desktop-case-loader-stalled.jpg`). Headless, it stalled for over 5 s on an in-app transition; a direct load rendered fine.
- *Hero:* A single fixed screen with no scroll. The mouse gives parallax to the camera and room. On mobile, the WebGL headline **distorts like a reflection in water** mid-transition ("Creating the unexpected" smeared into the floor, `mobile-transition-projects-b`).
- *Menu:* The round "••" button opens a **cream panel sliding in from the right**, about 40 % width on desktop and full-screen on mobile. It lists 90 px Saol items with numbered superscripts; the current page is greyed ("Index"). Contacts and socials sit in small type at the bottom.
- *Route change home → projects:* The camera moves through the room and it **fades to white**, then the arches environment and project planes fade in (`transition-projects*`). The nav's active item switches to italic Saol ("*Projects*"): **the active state is a change of typeface**, not colour or underline.
- *Projects grid:* Scroll drives WebGL planes with a **velocity-based bend/curl**: images at the top edge curl back like paper when scrolling fast (`desktop-05`, `mobile-04`). Paper butterflies and petals drift through. Hovering a tile bends and lifts it slightly (`desktop-hover-item`, estimated from frames). Filter pills: "All 20 · Branding 8 · Digital 20 · Motion 5 · Experiment 6".
- *Click behaviour:* Some tiles open the **live client site in a new tab** (Hubtown, Poly, OceanX); others route to an on-site case page (KIKK 2024, Letter).
- *Case page:* The headline appears on white with the title lines **mask-revealed line by line** (mid-animation on mobile: "PROJ… LETTER / PREMI… / EXPER…"). The overview paragraph lines fade up with stagger. There's a grainy 3D logo in the middle. Media further down are WebGL planes that **bend at their edges while scrolling** (`desktop-case-03`). A custom ring cursor (hollow circle) follows the mouse, with a "hold" ring variant for press-and-hold. A bottom-centre "UNSEEN (globe) WORLD" toggle links to their 3D world.

**How work is presented:** A curved WebGL grid of full-colour hero stills with small two-line captions (name / discipline). Filterable. The last row ends with "Looking for a creative partner for your project? projects@unseen.co". Case pages are editorial: a mixed serif/sans title spread, then Services/Date/Client/Location, then full-bleed photography and process sections ("True/False", "A Unique Touch", "Process generative visual exploration").

**Words:** 25 on the gate, and about 14 visible after entering ("A brand, digital & motion studio · Creating the unexpected · View our work · Index Projects Contact · Our 2025 Wrapped"). **96 on the home page.**

**What makes it feel expensive:**
- Everything the user sees is **one continuous 3D world**. Pages are camera moves, not reloads.
- The **serif-italic / grotesk pairing** sets the voice, and the nav's active state is expressed as a change of typeface.
- Velocity-reactive image planes make scroll feel physical.
- A sound opt-in gate, a tiny custom ring cursor, and a numbered 90 px serif menu.
- Very little text.

**Patterns:**
1. **Active state as a typeface change.** The active nav item switches from Neue Montreal roman to Saol italic (no colour change); the transition is `color .5s ease-out` plus a font swap. *Portfolio use:* the current section in the nav rendered in the serif italic, e.g. "*Research*".
2. **Scroll-velocity plane bend.** WebGL image planes get vertex displacement proportional to scroll velocity: edges curl, then relax on `expo.out` over about 1 s. *Portfolio use:* the demo thumbnails in the index bend subtly under fast scroll. Cheap with a small shader, and it signals "this is a real-time GPU site" to ML people.
3. **Numbered giant-serif menu panel.** Slide-in panel from the right; items at 90 px Saol with superscript indices; current item greyed; contacts in small type at the bottom. *Portfolio use:* menu items "01 Demos / 02 Research / 03 Experience / 04 Contact" in a serif at display size.
4. **Mixed serif-italic / sans titles.** Half the words in each title are Saol italic and half Neue Montreal, stacked with offset alignment ("*PROJECTS/* KIKK 2024 … FESTIVAL *IDENTITY*"). *Portfolio use:* demo titles like "*Activation* Steering" and "*Loss* Masking", with an italic serif for the concept word.
5. **Line-mask reveal on case titles.** Each title line sits in an `overflow:hidden` wrapper and translates in from 100 %, on `expo.out` over about 1 s with about 0.1 s stagger (eases and durations from the bundle; the per-line stagger is estimated from frames). *Portfolio use:* the standard title reveal on every demo page.
6. **Sound opt-in gate.** "Enter" versus "Enter without audio" before the WebGL world, using Howler. *Portfolio use:* only for the ocean-sensing demo (hydrophone audio?). Otherwise skip it: gates cost impatient recruiters.
7. **Camera-move route transitions.** Instead of a DOM fade, the persistent 3D scene moves the camera or dissolves to the next environment while Highway swaps the DOM. *Portfolio use:* if a persistent background scene exists (e.g. a slow point-cloud), each route could dolly it to a new framing.
8. **External-or-internal tile routing.** Tiles open either a case page or the live site. *Portfolio use:* demos open in place; papers and repos open externally with a ↗ glyph. Make the difference visible (Unseen doesn't).

---

## Cross-studio takeaways for this portfolio (dark, ML research demos)

1. **Show the work as working software, not images** (Cloudstudio's live mini-UIs, Shader's in-scene previews). Each index card should run a 2–3 s real loop of its demo: token strip masking, ES curve, ground track.
2. **One accent on true black with a strict grey ramp** (basement: #000, then #E6E6E6, #C4C4C4, #757575, #2E2E2E, plus #FF4D00). This matches the user's dark-mode preference and is the cheapest "expensive" signal.
3. **Tight display tracking**: −4 % to −5 % at 60–160 px with line-height 0.9–1.0, as on basement, Analogue and Cloudstudio. Mono labels at 10–12 px uppercase with +0.7 to +2 px tracking (Cloudstudio).
4. **Motion tokens: one expo-out curve** (`cubic-bezier(0.16,1,0.3,1)`, used by Cloudstudio and Unseen), one back-out curve for pops (`0.34,1.56,0.64,1`), and durations of 200/340/500/700/900 ms. Hover image scale 900 ms; tint 550 ms; cursor morph 300 ms.
5. **A spec-sheet case layout** (basement's sticky key/value column) with a **machine-readable mirror** (basement's MACHINE mode). Both suit an ML engineer better than editorial layouts.
6. **A context pill that relabels on scroll** (Analogue) as the single navigation affordance while moving through the demo stack.
7. **Traps seen live:** physics canvases capturing touch scroll on mobile (Cloudstudio), WebGPU-only rendering going black where WebGPU is broken (Shader, until it falls back), gates and letter loaders that stall on slow networks (Unseen), and fully canvas-rendered text that needs a DOM mirror for accessibility and SEO (Shader does this well).
