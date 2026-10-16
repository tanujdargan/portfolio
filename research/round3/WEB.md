# WEB.md: what moves on 46 live sites, and what Tanuj should take

Research round 3, 2026-10-16. This round studies AI labs, dev tools and engineers' or researchers' personal sites. It does not redo the nine design studios in `STUDIO_TASTE.md`.

## Method

Every site was loaded in headless Chrome for Testing (Metal ANGLE, real WebGL and WebGPU) at 1440×900 desktop and 390×844 iPhone, with `prefers-color-scheme: dark`. The capture scripts are `/tmp/pw-research/cap.mjs` (generic pass) and `tgt.mjs` (site-specific interactions).

For each site the generic pass:
- took frames at 300 ms, 1.2 s and 2.5 s after load, then a settled first screen;
- swept the pointer across the hero, hovered the first in-content link, and ran a slow wheel scroll (180 px per step) with 7 frames along the way;
- recorded the whole session as video, plus a 16-frame contact sheet;
- on mobile, took the first screen and frames at 20 %, 45 % and 70 % of the page.

An init script instrumented each page:
- `getContext` was patched to log canvas context types (2d / webgl / webgl2 / webgpu).
- `requestAnimationFrame` was counted. **rAF/s at idle** means calls per second over 2 s with no input. 0 means the page is truly still; 60 or more means something renders every frame.
- Long tasks were summed as a TBT-like main-thread cost, along with LCP and CLS observers.
- `document.getAnimations()` was read at load, on hover and during scroll. That gives real durations, easings and properties for every CSS or WAAPI animation.
- Every JS and CSS file was grepped for `cubic-bezier(...)`, GSAP ease names, `linear()` springs and library signatures.

Captures (≈310 MB) are in `/Users/tanujd/Desktop/portfolio-research/web/<site>/`:
- `d-00-intro-*ms.png`: intro frames
- `d-01-first.png`, `d-02-pointer.png`, `d-03-hover.png`, `d-1x-scroll.png`: first screen, pointer, hover and scroll frames
- `m-0x-*.png`: mobile frames
- `desktop.mp4`, `mobile.mp4`, `sheet-desktop.jpg`: recordings and the contact sheet
- `report.json`: every measured number below
- `t-*.png`, `interaction.webm`: targeted probes on 16 sites

**How to read the numbers:**
- "LT" is total long-task time over 50 ms on desktop. A real Mac GPU keeps it lower than the container Lighthouse runs in `DIAGNOSIS.md`.
- Bundle signatures such as `d3` or `motionOne` are regex hits and can be false positives. Tech claims below rely on confirmed globals (`window.gsap`, `__THREE__`, `Lenis`) or on the canvas contexts actually created.

**Two sites were swapped out.**
- **perplexity.ai** is now the logged-in app shell, so I captured `perplexity.ai/comet` as well.
- **cassie.codes** has been retired to a "Thanks for reading" page over a WebGL image smear. It's kept as a footnote only.

---

## Group 1: AI labs and AI companies

### Anthropic: https://www.anthropic.com
- **First screen:** On cream #FAF9F5, a 61 px Anthropic Sans bold headline: "AI research and products that put safety at the frontier". "research" and "products" are underlined as links. A serif paragraph sits at the right, and below it is a large rounded card carousel ("Claude Haiku 5.5" lettered on a curved arc, collage art).
- **Motion:**
  - Headline words fade in **out of order**. Each word starts at about 30 % opacity and resolves to full at random offsets, and the whole line is done by about 500 ms (frames `t-intro-00…08`).
  - The model card's title art draws on a 2d canvas along an arc; rAF runs at 124/s at idle, so it renders continuously.
  - On scroll, the ANTHROP\C wordmark in the nav collapses to the "A\" monogram.
  - Hovers are plain colour changes over 200 ms.
- **Tech:** Webflow, GSAP 3.15 + ScrollTrigger + SplitText (globals confirmed), and Lottie in the bundle. Easings: `power2.out` most often, then `(.165,.84,.44,1)`.
- **Cost:** Light. LT 0 ms, LCP 0.3 s, but CLS 0.13 (the hero card loads late).
- **Transfers:**
  - The out-of-order word resolve is a calm, readable alternative to the scramble type DIAGNOSIS cut. No glyph noise, just opacity per word with jittered delays, finished in under 0.6 s.
  - The name collapsing to a monogram in the nav once you scroll.
- **Doesn't transfer:** The light editorial palette.

### OpenAI: https://openai.com
- **First screen:** Black. "What can I help with?" over a ChatGPT-style prompt box whose placeholder rotates real prompts ("Quiz me on vocabulary", "Plan a surf trip to Costa Rica…"), with chips below. Then a carousel of product cards.
- **Motion:**
  - The **placeholder cycles every few seconds**, as a typed or replaced prompt.
  - The carousel cards cross-fade (opacity and transform, 500 ms `(.4,0,.2,1)`).
  - Research cards are soft gradient images. Little else moves.
- **Tech:** Next.js App Router, Tailwind, Framer Motion in the bundle, and 2 autoplay videos. Easings: `(.22,1,.36,1)` and `(.16,1,.3,1)` are the most used.
- **Cost:** 17.5 MB of JS parsed and 53 MB of media requested. LT 513 ms. Heavy for what's visible.
- **Transfers:** The hero is an **input**, not a claim. A prompt box with rotating real examples tells you instantly what the thing does. For Tanuj: the steering demo's prompt field, pre-filled and cycling through the prompts he actually ran.
- **Doesn't transfer:** The weight, and the product-catalogue IA.

### Thinking Machines Lab: https://thinkingmachines.ai
- **First screen:** White, centred. A grey "THINKING MACHINES" wordmark in Chakra Petch, a "NEW Inkling" pill, then about 700 words of serif essay. The logo floats, and that's the only motion.
- **Motion:** The logo has two infinite CSS loops: `float` over 7 s and `gradRotate` over 8 s, both linear. The header hides and reveals on scroll (220 ms, `(.22,1,.36,1)`).
- **Tech:** Static HTML. 59 KB of JS in total. GT America with Iowan Old Style.
- **Cost:** About zero. LCP 0.56 s.
- **Transfers:** The confidence of a manifesto in plain prose for a research-lab audience. The tiny living logo is the only ornament.
- **Doesn't transfer:** It's light, and it has no proof of work on the home page.

### Physical Intelligence (π): https://www.physicalintelligence.company
- **First screen:** Cream. "Physical Intelligence (π)" in Signifier serif, a two-sentence mission in mono, then a **dated research log**: bordered mono cards ("π0.7: a Steerable Model with Emergent Capabilities · April 16"). Featured items have a thicker black border.
- **Motion:** Essentially none. Hover is 150 ms of colour and shadow. rAF 60/s, from a Next.js ticker.
- **Tech:** Next.js with Tailwind.
- **Cost:** Trivial.
- **Transfers:** A **research changelog** as the home page: date, title, one-line result, with emphasis by border weight. It's the most "lab" format of any site in this round and very close to what a reviewer wants. Mono plus a serif title gives warmth without decoration.
- **Doesn't transfer:** The palette and the total stillness.

### Mistral AI: https://mistral.ai
- **First screen:** #101013 near-black. "Mistral 🟧 is #1 in Sovereign AI." centred, with **pixel-art blocks** (orange, red and yellow squares and diamonds, a pixel cat) stacking up in the hero, and a client logo row.
- **Motion:**
  - The hero blocks **fall and stack like Tetris** on load. The bundle has a Matter.js signature, and two WebGL contexts are created (three r184 confirmed).
  - The headline gets an `animate-pop-in` over 500 ms with a `linear()` spring.
  - The footer has a huge pixel cat over an orange gradient band.
  - Scroll reveals use 500 ms opacity.
- **Tech:** Next.js, three r184, GSAP / ScrollTrigger / SplitText and Lenis signatures in the bundle.
- **Cost:** LT 258 ms, LCP 2.5 s desktop and **5.7 s mobile**, CLS 0.11.
- **Transfers:** A **brand made of one primitive** (the pixel block) that is the logo, the loader, the hero and the footer. It's the same lesson as Shader's 1985 fiction, done with far less.
- **Doesn't transfer:** The physics-pile hero says nothing about the work, and mobile LCP is bad.

### Cohere: https://cohere.com
- **First screen:** White. A 96 px "Your AI. Your rules." with −1.92 px tracking, and a product screenshot over landscape art.
- **Motion:**
  - `fadeInUp` is used everywhere: 500–800 ms with a 150 ms stagger.
  - There's a 69 s linear logo marquee, and a dark section whose shader cone of light streams on scroll.
- **Tech:** Next.js, GSAP / ScrollTrigger / SplitText in the bundle, and 7 Lottie bundles.
- **Cost:** **CLS 2.12**, the worst measured in this round (sections pop in late). 8.4 MB of JS.
- **Transfers:** Nothing new. It's the generic enterprise template.
- **Lesson:** Fade-up-on-everything plus late layout reads as cheap even with good art.

### Perplexity: https://www.perplexity.ai and /comet
- **First screen:** The root is the logged-in app (sidebar, "What do you want to know?", ask box, a login popover): 94 words, dark #15191D. `/comet` is a Framer site with a light video hero and 200 words.
- **Motion:** The app is sparse (17 ms caret and colour transitions). Comet uses Framer's default appear-on-scroll and Lenis.
- **Tech:** Next.js with Framer Motion (app) and Framer (Comet).
- **Transfers:** The root URL *is* the product, with no marketing in between. It's the strongest version of "the work is live".
- **Doesn't transfer:** The rest is product chrome.

### Google DeepMind: https://deepmind.google
- **First screen:** Full-bleed **blue gradient field with a soft four-point star (the Gemini sparkle)** glowing behind "Our next era of frontier intelligence". The type is Google Sans Flex at 98 px, −2.7 px tracking.
- **Motion:**
  - The gradient and the star breathe slowly (a WebGL2 context, rAF 124/s at idle).
  - A tiny starfield drifts.
  - Below the hero: news cards, a podcast block and model tiles. The scroll reveals are standard.
- **Tech:** A custom component system. 19.5 MB of JS parsed, 9 videos and 13 2d canvases. Material easings dominate: `(0,0,.2,1)` ×318, `(.4,0,1,1)` ×297, `(.05,0,0,1)` ×202.
- **Cost:** LT 658 ms. It's heavy, but nothing blocks the first paint (LCP 1.0 s).
- **Transfers:** A **single soft luminous object** behind a short headline can carry a whole first screen if the object *is* the brand mark.
- **Doesn't transfer:** The sheer weight and the corporate news grid.

### Hugging Face: https://huggingface.co
- **First screen:** Dark navy #0B0F19. The 🤗 mascot, "The AI community building the future." at 48 px, and on the right a **real, dense screenshot-like block of the Hub** (trending models, tags, download counts).
- **Motion:**
  - There's almost none above the fold.
  - Near the footer, a **pile of about 150 🤗 SVG faces** bounces on staggered infinite loops (`bouncing` over 7–13 s, linear).
  - A Three/WebGL "inference provider" orbit sits mid-page.
- **Tech:** Svelte/Tailwind, IBM Plex Mono for data, and an `experimental-webgl` context.
- **Cost:** LT 867 ms, mostly hydration.
- **Transfers:** Showing **real dense data as the hero image**: a list of models with real numbers reads as authority. The playful pile is saved for the end of the page, so the joy comes after the proof.
- **Doesn't transfer:** The emoji brand.

### Cursor: https://cursor.com
- **First screen:** Warm near-black #14120B. A deliberately small 26 px CursorGothic line ("Cursor is your coding agent for building ambitious software."), two buttons, then a huge framed product window over a painted landscape.
- **Motion:** This is the signature of the whole round.
  - **The hero product window is a live DOM simulation, not a video.** `elementsFromPoint` over the hero returns `bg-theme-product-editor`, `thin-scrollbar`, and so on. The agent "types" a plan, the diff fills in, the panels switch ("Mission Control Interface"), and the sequence loops over about 7 s (frames `t-hero-00…05`).
  - Shimmer loading text (`shimmer`, 1.6 s linear) and "working" dot matrices (3.1 s loops) signal live agents.
  - Every later section is another small scripted product scene (Slack thread, CLI, PR review).
- **Tech:** Next.js, Framer Motion, `linear()` springs ×6, `(.22,1,.36,1)`. Berkeley Mono, EB Garamond accents.
- **Cost:** LT 258 ms, 13.6 MB JS. LCP 0.9 s (the text renders first).
- **Transfers:** **The demo performs at rest.** This answers DIAGNOSIS #5 exactly. The steering demo should *play itself*: type the prompt, sweep α from −0.9 to +0.9, rewrite the output, show the read-back jump, then hand control to the visitor on the first pointer input. Because it's DOM, it stays crisp, selectable, accessible and cheap.
- **Doesn't transfer:** The landscape painting, and the 1,900-word length.

### Sakana AI: https://sakana.ai (standout newer AI lab)
- **First screen:** White. "sakana.ai" plus the red fish logo, "Building Frontier AI in Japan", two buttons, and **schools of tiny line-drawn fish drifting across the whole viewport**.
- **Motion:**
  - A p5.js boids simulation on a full-viewport 2d canvas (rAF 120/s). Schools form, split and re-merge.
  - The fish respond to the pointer: they scatter, then regroup (frames `t-fish`, `t-fishmouse`).
  - In the footer the logo fish "swims" with radiating stroke lines.
- **Tech:** `window.p5` plus two 2d canvases. No WebGL.
- **Cost:** LT 0 ms, LCP 0.4 s, so cheap on a Mac. The background loop never sleeps, though.
- **Transfers:**
  - **Ambient motion that *is the thesis*.** Sakana means fish, and their research is about collective, nature-inspired intelligence, so the background explains the lab.
  - For Tanuj, the equivalent is a thin, slow field made of something real: MarmotSat's ground track, or token-probability glyphs. It has to be sparse enough that body copy sits on clean white space, which is where v6's point cloud failed.
- **Doesn't transfer:** The light theme.

### Black Forest Labs: https://bfl.ai (standout newer AI lab)
- **First screen:** A full-bleed **autoplay showreel of generated video** (horse, snowboarder, ocean) behind a 90 px "FLUX 3" (−4.5 px tracking), with chips "IMAGE · VIDEO · AUDIO · ACTION/PREDICTION" in IBM Plex Mono.
- **Motion:** The video cuts every 2–3 s. Below it: a 70 s logo marquee, and mono buttons that scale on hover (150 ms). The footer is a dark forest photo with an enormous wordmark.
- **Tech:** Next.js. 158 MB of media requested.
- **Cost:** **Mobile LCP 14.2 s.**
- **Transfers:** Mono chips naming the modalities directly under the hero title, as a compact proof line.
- **Doesn't transfer:** A video hero is a lie for a researcher (the output isn't his), and the weight is absurd.

### ElevenLabs: https://elevenlabs.io (standout newer AI lab)
- **First screen:** Light. "Bringing technology to life" in Waldenburg 48 px light, with two small 516×172 canvases: **audio orbs and waveforms** that animate as voices "speak".
- **Motion:**
  - WebGL2 orb shaders pulse with the audio level.
  - Waveform paths draw in (`fadeInScaleY` over 300 ms, with 250 ms staggered `fadeIn` at a 500 ms delay).
  - Easing: `(.31,.325,0,.92)` ×10 is their custom out-curve.
- **Tech:** Next.js, Tailwind, WebGL2.
- **Cost:** **LT 1,694 ms**, mobile LCP 6.2 s.
- **Transfers:** A small **live visualiser in its own frame** (not full-bleed) shows the model working.
- **Doesn't transfer:** The length (10.8k px, 1,431 words) and the cost.

### Factory: https://factory.ai (standout newer AI startup)
- **First screen:** Light grey. A geometric asterisk logo, an uppercase "MAKE YOUR SOFTWARE IMPROVE ITSELF" in Geist 60 px, a mono sub-line in Geist Pixel, a `curl` install line, and a dark product window rising from below.
- **Motion:**
  - The product window **rises and scales as you scroll** (scrubbed with ScrollTrigger).
  - Section titles use SplitText.
  - Dark CTA cards have animated dither or noise.
  - Bundle easings: `power2.out` ×69, `power2.inOut` ×57.
- **Tech:** Next.js, three r182, GSAP (12 ScrollTrigger and 11 SplitText hits), and a Geist Pixel display face.
- **Cost:** 20 MB of video. Mobile LCP 14.4 s.
- **Transfers:** A pixel/mono display face used *only* for small labels, beside a clean grotesk.

---

## Group 2: product and dev-tool sites known for craft

### Linear: https://linear.app
- **First screen:** #08090A. "The product development system for teams and agents" in Inter Variable 64 px, weight 510, −1.4 px tracking, left-aligned. Below it, a **full-width, real-looking app window** that fades up from nearly black.
- **Motion:**
  - On load, the app window **brightens from about 10 % to full over roughly 1 s**, like a monitor warming up (contact sheet frames 1–3).
  - Below the fold, isometric wireframe diagrams draw in.
  - A **dot-matrix SVG** (`grid-dot-x-y-upDown`, 2.8 s loops, one keyframe per dot) animates a pulsing pattern.
  - Hover uses `filter` over 160 ms, `(.25,.46,.45,.94)`.
  - The house curve is `(.32,.72,0,1)` ×9: a fast-out with no overshoot.
  - **The reduced-motion string appears 47 times in the bundle**, the most careful of any site.
- **Tech:** Next.js, no animation library. CSS keyframes are generated per dot, plus Berkeley Mono.
- **Cost:** LT 101 ms, rAF 9.5/s at idle (the dot grid only). Mobile LCP 6.3 s from the hero image.
- **Transfers:**
  - The "**screen warms up**" reveal for a framed demo.
  - Per-dot CSS loops for tiny status matrices with no JS.
  - One house curve.
  - Rigorous reduced-motion handling.
- **Doesn't transfer:** The marketing length.

### Vercel: https://vercel.com
- **First screen:** Pure black. "Agentic Infrastructure" in Geist 64 px at **−3.84 px (−6 %) tracking**. A **3D shipping container labelled "Ship SF" hangs from a crane hook** in the centre, with client logos below.
- **Motion:**
  - The container **drops in on its cable and settles with a damped swing** (WebGPU three r185).
  - It **stays fixed in the viewport as you scroll**, with content passing behind it.
  - Dragging it swings it on the cable (`t-signdrag`).
  - rAF 180/s at idle, so it never sleeps.
- **Tech:** three r185 on **WebGPU** (4 webgpu contexts plus a WebGL fallback). Easings `(.16,1,.3,1)` and `(.32,.72,0,1)`.
- **Cost:** LT 616 ms. Only 306 words on the page.
- **Transfers:**
  - **One physical, draggable object as an event-specific signature.** The equivalent for Tanuj is the **MarmotSat CubeSat itself**: a small three.js model that the live tracker already justifies, draggable to spin, with the real TLE position driving its orientation.
  - Tracking at −6 % on the display line.
- **Doesn't transfer:** A fixed overlay object that covers scrolling content. It obscured copy in several frames. Keep the object in the hero.

### Raycast: https://www.raycast.com
- **First screen:** #07080A. A cluster of **glossy red diagonal glass slats** (WebGL2, three r186) behind "Your shortcut to everything." in Inter 64/600, with a "Download for Mac" button.
- **Motion:**
  - The slats shimmer, with light sliding along them, and shift subtly with the pointer.
  - Below: the Raycast window with **live keyboard-shortcut chips** (`option` + `command` + `L` keys light up as if pressed), star fields (18 stars fading over 250 ms), and a 3D keyboard section.
  - Easings: `(.23,1,.32,1)` ×21, `(.4,0,.22,.96)` ×11.
- **Cost:** LT 307 ms. Mobile LT 195 ms and LCP 6.7 s. Very long page (16k px).
- **Transfers:** **Keycap chips that animate the actual shortcut**: a cheap, legible way to show "this is interactive". The demos could show `drag α` or `← →` keycaps that press themselves once.
- **Doesn't transfer:** The length.

### Family: https://family.co
- **First screen:** White. "Your favorite crypto wallet." in 68 px Family Sans, framed by **bouncy illustrated characters** (a blue square face, a green blob, coins) arranged around it.
- **Motion:**
  - The characters **pop in on a back-out spring and idle-bob**.
  - Hovering cards **lifts transforms over 1,000 ms on `(0.19,1,0.22,1)`** (expo-out), measured on 13 elements. That's long and soft.
  - Testimonials run as a 120 s marquee.
  - The house curves are `(0.19,1,0.22,1)` ×38 and `(0.175,0.885,0.32,1.1)` ×9 (a slight overshoot).
- **Tech:** Next.js (pages router), styled-components, 9 videos, and Lottie in the bundle.
- **Cost:** 17.7 MB transferred, LCP 2.3 s.
- **Transfers:** **Long expo-out on hover (800–1,000 ms)** makes UI feel physically soft rather than snappy. Use it on demo cards.
- **Doesn't transfer:** The light, cartoon register.

### Dia (The Browser Company): https://www.diabrowser.com
- **First screen:** A **full-screen golden caustic-water shader** (WebGL2, three r176, full-viewport canvas) with a giant "DIA" in Exposure VAR serif rising behind a browser window. Inside the window, a scripted product demo plays: a sun icon, then "The Tuesday Brief" assembling, then "Your day".
- **Motion:**
  - The caustics move continuously (rAF 120/s).
  - The in-window demo cross-fades between states.
  - Scroll sections reveal headings over 400 ms on `(.77,0,.175,1)` and fades over 700 ms on `(.87,0,.13,1)`. Those are sharp in-out curves.
  - The CTA pill has a box-shadow "sunrise" glow on hover (420 ms, `(.22,1,.36,1)`).
- **Tech:** Next.js, three r176, Lenis signature, Exposure VAR variable serif.
- **Cost:** LT 115 ms. Mobile LCP 6.5 s. 6.7 MB of shader/"other" assets.
- **Transfers:** Like Cursor, it's a **scripted in-window product demo**. The pairing of variable serif and mono gives warmth.
- **Doesn't transfer:** The yellow.

### Arc: https://arc.net
- **First screen:** Cream with Arc's colour gradients. It's now a "Try Dia" redirect page: a testimonial wall in Marlin Soft and an infinite marquee.
- **Motion:** A 78 s linear marquee and 300 ms fades.
- **Tech:** Next.js, 4 videos.
- **Transfers:** Little. The product is in maintenance mode, and the craft has moved to Dia.

### Resend: https://resend.com
- **First screen:** Black. "Email for developers" in **Domaine serif 96 px** on the left, and on the right a **glossy black Rubik's-cube-like 3D object** slowly turning and re-forming.
- **Motion:**
  - The cube rotates, and its sub-blocks shift.
  - The headline and buttons fade up from grey on load (1.5 s, `(.36,.66,.6,1)`).
  - There's a rainbow conic-border CTA that rotates over 30 s, and a code editor that live-renders the email it compiles.
  - The header slides down on scroll (1 s).
- **Tech:** Next.js, three r149 plus a Spline signature, and 5 videos.
- **Cost:** **LT 5,113 ms** on desktop, the worst main thread in this round. 10 MB of JS. rAF 240/s at idle.
- **Transfers:** A serif display paired with a dark 3D "material" object reads luxe.
- **Lesson on cost:** Several always-on 3D scenes stacked down one page wreck the main thread. Pause what's off-screen.

### Stripe: https://stripe.com
- **First screen:** White, with the famous **WebGL gradient ribbon** (orange, pink, violet) sweeping across the top right. The headline is "Financial infrastructure to grow your revenue." in Söhne 48/300, its second sentence in lighter purple. A tiny mono line above it reads "**Global GDP running on Stripe: 1.73344311%**".
- **Motion:**
  - **The GDP counter ticks live.** It went 1.73344310 → 1.73344311 → 1.73344312 across 3 one-second reads (probe `t`), with each digit rolling.
  - The ribbon flows continuously (rAF 121/s).
  - Bento cards reveal with `clip-path` and transform (800 ms, `(.165,.84,.44,1)`).
  - Hover moves an arrow along `(.25,1,.5,1)` ×52, the house curve.
  - The nav uses **a CSS scroll-driven animation** (`detect-scroll` on a `ScrollTimeline`) to change state without JS.
- **Tech:** Next.js, three r178, 11 canvases (WebGL2 ×6). Söhne variable.
- **Cost:** LT 1,972 ms (many canvases), 2,300 words.
- **Transfers:**
  - **One small, real, live number above the headline.** It's the best instrument-layer example in this round because it's a fact, not decoration, and it's the opposite of DIAGNOSIS's fake HUD.
  - For Tanuj: "MarmotSat · now over 47.2°N 12.9°W · next pass over Victoria 21:14". One line, mono, real.
  - Scroll-driven nav state in pure CSS.

### Warp: https://www.warp.dev
- **First screen:** Off-white. "Open infrastructure for cloud software factories" in Azeret SemiMono 54 px, with a framed **grid of about 300 dots where blue cells light up as agents come online**.
- **Motion:**
  - The dots pulse (`pulse` loops over 1.8 s and 2.4 s).
  - Tags type themselves (`tag-type`: 900 ms `max-width` typing, then `tag-online` at a 960 ms delay, then a 240 ms blinking cursor ×4).
  - On scroll, a full-width blue section bar appears with a sticky in-page nav.
- **Tech:** Next.js, 2d canvases, and `data-motion-reveal` attributes.
- **Cost:** 27 MB of images (heavy), but LT 569 ms.
- **Transfers:** The **"typed tag, then goes ONLINE" micro-sequence**: three CSS keyframes, no JS, and very legible. Status chips on demos could do exactly this ("REAL · loading Qwen2.5-1.5B → READY").

---

## Group 3: personal sites (engineers, designers, researchers)

### Rauno Freiberg: https://rauno.me
- **First screen:** Grey #EDEDED. A white card with "Rauno Freiberg / is an Estonian / interaction designer…" in staggered indents, a **giant yellow circle** overlapping it, and a ruler of tick marks at the top as the scroll indicator.
- **Motion:**
  - **The vertical wheel drives a horizontal strip of cards.** The probe confirmed `scrollY` = 1500 while the strip moved sideways (sticky + translateX).
  - The cards are type-as-image ("DD", "Craft", "Objects"), and pixel-hand cursors animate.
  - Frames fade in at 350 ms with an 800 ms delay.
  - The curve is `(.2,.8,.2,1)` plus one `linear()` spring.
- **Tech:** Next.js, only 52 words.
- **Cost:** Zero long tasks.
- **Transfers:** The tick-ruler scroll indicator.
- **Doesn't transfer:** The horizontal strip (DIAGNOSIS already cut pannable boards), the light theme, and the 52 words (a designer can do that; a researcher can't).

### Emil Kowalski: https://emilkowal.ski
- **First screen:** Off-white #FDFDFC. Small 14 px text: name, "Design Engineer", "Today", and lists of Projects and Writing with one-line descriptions. 225 words.
- **Motion:**
  - **One hover highlight**: a soft grey pill sits behind the hovered row (frame 7 of the contact sheet shows it on "aiforui.dev" and then on "Building a Toast Component"). It's an instant background, not a sliding blob.
  - Everything else is static.
  - The bundle shows his known vocabulary: `(.19,1,.22,1)`, `(.32,.72,0,1)` and a `linear()` spring.
- **Tech:** Next.js. 3.8 MB of JS for a text page.
- **Transfers:** Restraint, and a list as the IA. Every row is a project with a one-line *outcome*, which is the fix for DIAGNOSIS #4.
- **Doesn't transfer:** The palette.

### Paco Coursey: https://paco.me
- **First screen:** #1A1A1A dark. A 16 px name, an italic *Crafting interfaces* in Newsreader serif, then three columns: Building / Projects / Writing, each item a title plus a grey one-liner.
- **Motion:** A **staggered entrance**: 7 blocks run `enter` over 600 ms each (opacity + translateY), driven by a `data-animate` stagger index. The whole page is assembled in about 1 s, then it's still.
- **Tech:** Next.js. 582 KB JS, 194 words. A serif italic accent inside sans copy.
- **Cost:** Zero.
- **Transfers:** **The best dark, readable personal page in the set.**
  - One serif italic phrase per paragraph for warmth (the fix for "lifeless" in DIAGNOSIS #8).
  - A three-column index at 14 px.
  - An entrance that ends quickly.
  - The "Now" section.

### Maxime Heckel: https://maximeheckel.com
- **First screen:** Electric-blue full-bleed WebGL. **Two glass "M" shapes on a blueprint isometric grid** refract the grid lines, with floating annotation text and "THE ONLINE HOME OF MAXIME'S CRAFT" in 24 px Inter at the bottom left. The last word cycles: WORK, then CRAFT, then CREATIONS.
- **Motion:**
  - On load the glass letters **slide in along the isometric axis** from black (frames 1–3), and the scene fades in over 600 ms.
  - The hero word **cycles every few seconds** through clip-path keyframes (`k-cBVbyC`, 10 s).
  - Scrolling goes to a dark page of work cards, **each a live WebGL or video demo** (caustics, raymarching, a box of balls, WebGPU glass), with a 300 ms blur-to-sharp `filter` reveal.
  - The about text arrives on an 850 ms `linear()` curve.
- **Tech:** Next.js, R3F, three r182, **30 WebGL contexts** created in total, 15 videos. iA Writer Quattro for prose.
- **Cost:** LT 1,801 ms, LCP 4.2 s desktop and **17 s mobile**. 59 MB of media.
- **Transfers:**
  - **Work cards that are live miniatures of the actual demos**: the closest analogue to Tanuj's situation (an engineer whose demos are the portfolio).
  - The cycling last word in the title.
  - Blur-to-sharp card reveal.
- **Doesn't transfer:** 30 WebGL contexts. Use one shared renderer, or a poster plus live-on-focus.

### Josh W. Comeau: https://www.joshwcomeau.com
- **First screen:** Dark navy with **cloud silhouettes**. The 3D mascot sits on a cloud, and a **rainbow of dashed arcs bursts out of him** (a 2d canvas, 1000×520). Below: article list, categories, popular content.
- **Motion:**
  - The rainbow particle arc animates continuously and tracks the pointer.
  - The logo has small "scooch" animations (300 ms at a 750 ms delay), and **SVG strokes self-draw** (`selfDraw` 600 ms at a 1.2 s delay).
  - Icons drop in (600–700 ms, staggered by 100 ms).
  - Links get a hand-drawn underline on hover (125 ms).
  - 11 reduced-motion hits and 9 View Transition hits in the bundle.
- **Tech:** Next.js, custom CSS-in-JS. Wotfard + Cartograph CF.
- **Cost:** LT 340 ms.
- **Transfers:** **Small delightful motions bound to his own identity** (a mascot, sound toggles, self-drawing logo), all after the content is readable.
- **Doesn't transfer:** The cute register.

### Brittany Chiang: https://brittanychiang.com
- **First screen:** Slate #0F172A. A sticky left column: "Brittany Chiang" at 48 px, a role, a one-liner, a **scroll-spy nav (ABOUT / EXPERIENCE / PROJECTS)**, and social icons. The right column scrolls: about, experience rows (date · role · company ↗ · description · teal tech pills).
- **Motion:**
  - **A cursor spotlight**: `radial-gradient(600px at Xpx Ypx, rgba(29,78,216,.15), transparent 80%)` updated on `mousemove` (probe values at 300/300, then 1100/700).
  - The active nav item's leading line grows from 32 to 64 px.
  - Hovering an experience row dims the other rows and lifts a card background. It's the "one lit thing" pattern done in CSS.
- **Tech:** Next.js, Tailwind. Zero rAF at idle and zero long tasks.
- **Cost:** About zero.
- **Transfers:** **The most-copied developer portfolio layout for a reason.**
  - Sticky identity on the left with content scrolling on the right.
  - Spy-nav lines.
  - Dim-the-siblings hover.
  - A 15 %-alpha blue spotlight that adds life at no cost.
  - Mobile collapses cleanly to one column.
- **Doesn't transfer:** It's so common that it now reads as a template. Use the mechanics, not the look.

### Bartosz Ciechanowski: https://ciechanow.ski (interactive-explainer author)
- **First screen:** A blue header bar with the name, then the latest article ("Moon"). Inter text, then a **black full-width figure: a 3D Moon with the current date and time (10/16/2026 02:55 PM)**, draggable, with a time slider.
- **Motion:**
  - **Every figure is a hand-written WebGL or 2d canvas.** One article has **120 canvases.** Words in the prose such as "date and time" are coloured to match the control they refer to.
  - All motion is user-driven: dragging rotates, sliders scrub time.
- **Tech:** Vanilla JS. One file per article, 1.4 MB JS, no framework.
- **Cost:** rAF **3,300/s** at idle (each canvas loops), LT 3.5 s. Fine on a Mac, wasteful in general.
- **Transfers:**
  - **The gold standard of an explorable figure**: real model, real data, the current state of the world, controls labelled inline in the prose by colour.
  - Tanuj's write-up pages should be this: prose, then a figure you drag, then prose, with the slider's name coloured in the sentence.
- **Doesn't transfer:** The always-on loops. Render on input or visibility only.

### Chris Olah (colah's blog): https://colah.github.io (ML interpretability researcher)
- **First screen:** A dark nav bar, a grass photo background, and a white panel: "Recent Exciting Things!" with three bordered cards (Transformer Circuits, Multimodal Neurons, Circuits). Each card is a **figure from the paper** (an attention equation, feature visualisations, a circuit diagram).
- **Motion:** None. jQuery, 0 rAF.
- **Transfers:** **Cards whose thumbnail is the paper's key figure, not a stock image.** This is the interpretability field's founding look, and reviewers at labs know it. A thumbnail of Tanuj's loss-masking token view or the steering read-back plot signals the genre immediately.
- **Doesn't transfer:** The 2014 styling.

### Andrej Karpathy: https://karpathy.ai (ML researcher)
- **First screen:** White, a photo, "Andrej Karpathy" in default sans-serif, a bio paragraph, then a long list of projects and talks with thumbnails.
- **Motion:** None. **Zero JS** is loaded.
- **Transfers:** Proof that the most-read ML researcher site is a single static HTML file. The content carries it: dated items, each with one sentence.
- **Doesn't transfer:** Everything visual.

### Gwern Branwen: https://gwern.net (AI writer and researcher)
- **First screen:** Dark-mode capable (it rendered dark here). A blackletter G logo, a bordered nav, a long bio in Source Serif 4 with small-caps lead-ins ("NAVIGATION:", "FEATURES:"), Newest / Popular lists, and a **floating toolbar of mode toggles** on the right (dark / light / auto, reader mode, popups, search, help).
- **Motion:**
  - **Hover popups**: hovering any link opens a preview of the target page (250 ms opacity at a 100 ms delay).
  - The mode selector transitions over 1 s.
  - anime.js is loaded.
- **Cost:** **CLS 0.59** (fonts and popups shift the layout). LT 31 ms.
- **Transfers:** **Link previews on hover** for a research audience: hovering "Apart sprint finding" could preview the result figure. Small caps as section lead-ins.
- **Doesn't transfer:** The density and the fussiness.

### Jay Alammar: https://jalammar.github.io (ML explainer author)
- **First screen:** White, "Jay Alammar" in light Helvetica, a tagline ("Visualizing machine learning one concept at a time"), and a long post list with **illustrated thumbnails** (The Illustrated Transformer and others).
- **Motion:** Static home. Posts embed animated GIFs and videos of tensors flowing.
- **Tech:** Jekyll, jQuery and d3.
- **Transfers:** Pastel, labelled tensor diagrams have become the visual language of ML explainers. A short looping clip of the token-highlight view is cheaper than a live embed for list thumbnails.
- **Doesn't transfer:** The 33k px home page.

### Amelia Wattenberger: https://wattenberger.com (GitHub Next research engineer, data-viz)
- **First screen:** White. "Hi, I'm **Amelia Wattenberger**" in a heavy serif (Parclo) with a **green gradient fill that animates across the letters**, a blue flower sticker reading "this site is a WIP / go to the old one" that rotates, and two lines of italic-bold intro.
- **Motion:**
  - The gradient sweeps across the name (on hover it changes to a blue/teal gradient).
  - The flower sticker rotates continuously.
  - The page is a masonry of **29 autoplay videos**, each a small screen recording of a project, with an italic caption and a tag pill.
- **Tech:** Svelte, minimal JS (617 KB). 75 MB of video.
- **Cost:** 75 MB of video, but LT 0 and LCP 0.8 s, because the videos are lazy.
- **Transfers:** **A wall of short silent screen recordings of real work**, each captioned in one line. It's the cheapest way to make every project "live". Use it for the secondary projects (retrieval, ES-LoRA) that DIAGNOSIS demoted.
- **Doesn't transfer:** Light, and visually busy.

### Anthony Fu: https://antfu.me
- **First screen:** Pure black. "Anthony Fu" at 36/800, then a paragraph where every project is an **inline logo chip** (Vitest, Slidev, VueUse…), with links underlined. **Thin generative "plum branch" lines grow** from the page edges on a full-viewport 2d canvas.
- **Motion:**
  - The branches grow procedurally for a few seconds, then stop.
  - The text paragraphs slide in (`slide-enter`: 1 s each, staggered by 90 ms, 15 paragraphs).
  - Hovering a link animates its underline colour (300 ms).
- **Tech:** Vue/Vite SSG, one 2d canvas, DM Mono.
- **Cost:** 371 KB JS, LT 6 ms.
- **Transfers:** **Generative decoration that grows once, then stops**: life without permanent cost. Inline org-logo chips in prose ("Firmware lead on [MarmotSat logo]", "LLM assistant at [Amazon logo]") give colour and credibility at once, which fixes DIAGNOSIS #8's "no colour except logos in white squircles".
- **Doesn't transfer:** Nothing major. It's the closest temperament match in Group 3.

### Jhey Tompkins: https://jhey.dev
- **First screen:** Black. "Making your ideas click" in DM Serif 64 px, a Doto pixel-mono subtitle ("JHEY TOMPKINS — BRAND DESIGN STUDIO @ SHOPIFY"), a paragraph whose links are in coral, a **self-drawing signature**, and a **5-row live status block in pixel mono**: location, weather and time ("47.9°F • 22:59"), latest CodePen, Steam game, Spotify track. A faint grid at the bottom right brightens around the cursor.
- **Motion:**
  - The card reveal is 350 ms of scale, translate, blur and opacity at a 500 ms delay.
  - The signature `draw`s over 832 ms of strokes at a 750 ms delay, then fills (500 ms).
  - **The status rows first show `xxxxxxxx` placeholders, then resolve to real data** (frames `t-sig-00` and `t-sig-04`).
  - The grid glows under the pointer (`t-grid`).
- **Tech:** Next.js, GSAP signature, View Transitions, Doto font. 80 KB JS.
- **Cost:** About zero (LCP 7.5 s here was a font swap on the pixel face).
- **Transfers:**
  - **An instrument layer made of real, personal data**, in a pixel-mono face, short and below the bio, never in the header. The Tanuj version: "MarmotSat: over the South Atlantic · next pass 21:14 PDT", "Last run: steering sweep, Qwen2.5-1.5B", "Reading: …".
  - A self-drawn signature as the one flourish.

### Olivier Larose: https://www.olivierlarose.com (Awwwards-listed developer and educator)
- **First screen:** #121212. A centred stack: "OLIVIER LAROSE / INDEPENDENT DESIGN ☼ENGINEER☼ / BASED IN MONTREAL / FOLIO©2026" in PP Editorial New, with a script swash on the initials, plus tiny mono metadata at both edges.
- **Motion:**
  - **The intro builds the stack line by line from a single line** (frames 1–3, about 1.2 s).
  - **The cursor leaves a trail of white pixel blocks** that snap to a grid and fade (`grid-flash`, 300 ms per cell).
  - The "☼" sun icon rotates 1.2 s on `(.7,0,.13,1)`.
  - The project index rows slide in (1.5 s, `(.33,1,.68,1)`), and each row's text slides per cell (600 ms).
  - **Hovering a row inverts it to a solid white band** (250 ms).
- **Tech:** Hand-written JS (25 KB in total), Lenis. Typefaces: Editorial New, Supply Mono, Mondwest pixel.
- **Cost:** LT 0, LCP 0.4 s, 53 KB transferred. The best weight-to-delight ratio in the round.
- **Transfers:**
  - **A dense project index table** (Project · Category · Client · Year) where hover inverts the row.
  - A pixel-snapped cursor trail as cheap texture.
  - Proof that serious motion can ship in 25 KB.
- **Doesn't transfer:** The 2,000 px single-scroll stays readable only because it's an index.

### Dennis Snellenberg: https://dennissnellenberg.com (Awwwards SOTD, developer portfolio)
- **First screen:** A loader cycling **"Hello / Hallå / Bonjour…" one word at a time** on #1C1D20. A **curved black curtain lifts** to reveal a grey hero: his photo, "Freelance Designer & Developer", a "Located in the Netherlands" pill with a spinning globe, and a **216 px marquee of his name** scrolling at the bottom.
- **Motion:**
  - Greeting words swap about every 150 ms over roughly 1.5 s.
  - The curtain lifts with a **bezier-curved bottom edge** (the edge bows as it moves).
  - The marquee **speeds up and reverses direction with scroll velocity**.
  - Magnetic buttons, and Barba page transitions with the same curved curtain.
- **Tech:** GSAP 3.9 + ScrollTrigger, Locomotive Scroll, Barba, jQuery.
- **Cost:** CLS 0.38, mobile LCP 6.6 s.
- **Transfers:** The **curved-edge curtain** is a nicer route transition than a straight wipe.
- **Doesn't transfer:**
  - A **name marquee is exactly the "name billboard" DIAGNOSIS rejects.**
  - A loader that greets you costs 1.5 s, and recruiters won't wait.

### Ravi Klaassens: https://raviklaassens.com (Awwwards SOTD and Developer Award)
- **First screen:**
  - A black loader: "R ⚔ K" letters split apart while a small photo grows into a full-bleed portrait.
  - The portrait is a dark-backed head shot **dissolved into red pixel-smear distortion** (WebGL2, full-viewport canvas).
  - "Ravi Klaassens. Design & Code for those who refuse to settle." in ReplicaLL 30 px.
  - A dense 3-column mono nav.
- **Motion:**
  - The pointer **smears the portrait** (a flowmap displacement; frame `t-flow`).
  - Small animated bar-chart loops in the nav (`bar1–4`, 0.7–1.2 s).
  - Secondary buttons wipe with `clip-path` over 400 ms on `(.32,.72,0,1)`. Nav buttons spring on a `linear()` curve over 450 ms.
  - The page goes black → light grey → black. A giant red "House of Klaassens" footer band.
- **Tech:** Webflow, GSAP 3.15 + ScrollTrigger + SplitText, Lenis, Barba.
- **Cost:** LT 0, rAF 206/s.
- **Transfers:** A **light/dark rhythm between sections** (DIAGNOSIS #8 asked for exactly this). An awards list as a plain ruled table.
- **Doesn't transfer:** A distorted self-portrait hero is agency vocabulary.

### Aristide Benoist: https://aristidebenoist.com (Awwwards SOTD developer)
- **First screen:** #141414. A **"001 → 067" loader counter** (top-left), then the "ARISTIDE" logo in condensed TNY, and a centred **gallery of vertical image slices** (WebGL) with tiny meta text.
- **Motion:** The slices assemble from the right, sliding and widening. Scroll and drag pan the slice gallery. Hovering a slice widens it.
- **Tech:** Hand-rolled WebGL, 68 KB JS.
- **Cost:** Tiny JS, 3.8 MB of images.
- **Transfers:** The counter loader is honest when it maps to real loading. Use it only if the steering model or TLE fetch takes time.
- **Doesn't transfer:** The images-only portfolio.

### Bruno Simon: https://bruno-simon.com (Awwwards SOTM, the canonical 3D portfolio)
- **First screen:** A WebGPU loading floor, a glowing ring and a purple dot grid. Then "CLICK TO START": an isometric diorama with a little car.
- **Motion:** You **drive the car with the arrow keys** through the portfolio world (Rapier physics). Explosions, signage, "SERVER CONNECTED" (multiplayer).
- **Tech:** three r183 on WebGPU, Rapier, GSAP. 0 words in the DOM.
- **Cost:** LT 1.8 s desktop, and **504 WebGPU contexts** were requested on mobile (retries).
- **Transfers:** The lesson is the counter-example. **0 readable words**, an explicit click gate, and every fact behind gameplay. It's famous, delightful, and the wrong genre for a research hire.

### Shu Ding: https://shud.in
- **First screen:** Off-white. An italic serif nav at the left (about / thoughts / projects / guestbook) beside a hairline, and a 16 px "Shu Ding" heading with three paragraphs. 117 words.
- **Motion:** Hover colour only (150 ms). View Transitions between routes.
- **Transfers:** An italic serif nav as the only ornament. View Transitions for route changes at zero JS cost.
- **Doesn't transfer:** Light.

### Lynn Fisher: https://lynnandtonic.com
- **First screen:** Dark grain texture. "LYNN FISHER" in a rough display face, red. "Designer for the Web", then a **table-of-contents nav with dot leaders and roman numerals** (ABOUT ……… I, WORK ……… II…), and "v. XIX" (the 19th yearly redesign).
- **Motion:** None at load (the fun is in resize-responsive art on inner pages).
- **Tech:** Static, 11 KB JS.
- **Transfers:** **A versioned, yearly-redesign identity** ("v. XIX") and a book-like table of contents. For Tanuj, numbering demos "Fig. 1–4" like a paper ties the site to research culture.

*Footnote: Cassie Evans (cassie.codes) has retired her portfolio to a single "Thanks for reading" note over a full-screen WebGL fluid smear of a flower photo (three r170, WebGL2). It's a reminder that a beautiful canvas can't carry content.*

---

## Cross-site measurements

| | Words on page | rAF/s at idle | Long tasks (desktop) | LCP (desktop / mobile) | Live demo in hero? |
|---|---|---|---|---|---|
| Cursor | 1,890 | 0 | 258 ms | 0.9 / 0.4 s | **Yes (DOM sim)** |
| Dia | 588 | 120 | 115 ms | 0.2 / 6.5 s | Yes (DOM sim in window) |
| Stripe | 2,299 | 121 | 1,972 ms | 0.8 / 0.6 s | Live counter |
| Linear | 1,476 | 9.5 | 101 ms | 2.0 / 6.3 s | App screenshot, warms up |
| Vercel | 306 | 180 | 616 ms | 0.3 / 0.3 s | 3D object |
| Sakana | 698 | 120 | 0 ms | 0.4 / 0.3 s | Boids field |
| Maxime Heckel | 1,139 | 60 | 1,801 ms | 4.2 / 17 s | Live WebGL cards |
| Brittany Chiang | 652 | 0 | 0 ms | 1.4 / 1.1 s | No (spotlight) |
| Paco | 194 | 0 | 0 ms | 7.8 s (font swap) / — | No (stagger) |
| Jhey | 129 | 0 | 0 ms | 7.5 s (pixel-font swap) / 1.8 s | Live status rows |
| Olivier Larose | 1,061 | 60 | 0 ms | 0.4 / 0.2 s | Index + pixel trail |
| Resend | 2,178 | 240 | **5,113 ms** | 0.7 / 0.7 s | 3D object |
| Bruno Simon | **0** | 120 | 1,838 ms | — | Game, click-gated |

**Easing consensus across the 46 sites:**
- The expo-out family dominates again: `(.16,1,.3,1)`, `(.22,1,.36,1)`, `(.19,1,.22,1)`, `(.23,1,.32,1)`, `(.25,1,.5,1)`.
- The newer house curve at Linear, Vercel, Emil and Ravi is **`(.32,.72,0,1)`**: out-curve, no overshoot, shorter tail.
- `linear()` springs now ship at Cursor (×6), Factory, Linear, Rauno, Emil, Ravi, Perplexity and Maxime.
- Material `(.4,0,.2,1)` remains the Tailwind default and reads generic.

This confirms the tokens already in `STUDIO_TASTE.md`. Add `(.32,.72,0,1)` for UI responses of 200–300 ms.

**What the dev and research crowd does that studios don't:**
1. The product *runs* in the hero as DOM (Cursor, Dia, OpenAI's prompt box).
2. The live number is a fact (Stripe GDP, Jhey's status rows, Ciechanowski's current-date Moon).
3. Motion ends. Paco, Anthony Fu and Olivier assemble the page in about 1 s, then go still (rAF 0).
4. Reduced motion is taken seriously: 47 hits at Linear, 49 at OpenAI, 17 at Vercel, 18 at BFL.

---

## The 10 strongest transferable techniques (ranked)

1. **The demo plays itself at rest, as DOM (Cursor, Dia).**
   - *What:* A scripted 6–8 s loop runs inside the real demo component: type the prompt, sweep α from −0.9 to +0.9, rewrite the output token by token, and spike the read-back plot from −8.0 to +9.6. The first pointer, key or touch on the frame stops the script and hands over control, with a small "your turn" chip.
   - *Where:* The **hero** (the steering demo) and the loss-masking demo (auto-toggle the three regime tabs once).
   - *Why first:* It fixes DIAGNOSIS #5 directly and costs no extra rendering.
2. **One real live number above the headline (Stripe's GDP ticker, Jhey's status rows).**
   - *What:* One mono line of true telemetry, with digits rolling: "MarmotSat · 51.2°N 3.4°W · next pass over Victoria 21:14". It's computed with the SGP4 the site already ships.
   - *Where:* Above the hero proof line, and again in the MarmotSat row.
   - *Rule:* Real or nothing, and never more than one line. This is the honest replacement for the cut HUD.
3. **Figures as explorables with colour-keyed prose (Ciechanowski).**
   - *What:* In write-ups, a control's name in the sentence takes the control's colour ("drag **α** to steer toward *joy*"), and the figure sits between paragraphs, not in a dashboard.
   - *Where:* Every **write-up page**, and the one-sentence finding above each home-page demo.
4. **The dark, readable index with "one lit row" (Brittany Chiang, Olivier Larose, Emil).**
   - *What:* Rows of outcome-titled work. Hover or focus brightens the row (or inverts it, as at Olivier) and dims its siblings to about 40 % over 200 ms on `(.32,.72,0,1)`. Add a low-alpha cursor spotlight `radial-gradient(600px at x y, rgb(… / .12), transparent 80%)`.
   - *Where:* The **work and experience lists**. On mobile, the scroll-centred row lights instead.
5. **The page assembles in about 1 s, then goes still (Paco, Anthony Fu, Anthropic).**
   - *What:* Block stagger with opacity + 8 px translate, 600 ms each, 60–90 ms apart. Headline words resolve in jittered order and are done by 600 ms. Then rAF drops to 0.
   - *Where:* The **first load** only (session-flagged), skipped under reduced motion.
6. **One physical signature object you can grab (Vercel's crane container, Resend's cube, Maxime's glass M).**
   - *What:* A small three.js **MarmotSat CubeSat** with solar panels, oriented by the real TLE. Drag spins it with inertia, and it settles back.
   - *Where:* The **hero's right side** or the MarmotSat section. Mount it on idle, give it a static poster first, DPR ≤ 1.5, and pause it off-screen.
   - *Rule:* Never fixed over scrolling copy.
7. **The "screen warms up" reveal and the typed status chip (Linear, Warp).**
   - *What:* A demo frame fades from about 10 % to 100 % over 900 ms, like a monitor powering on. Its status chip types "loading Qwen2.5-1.5B…" (`max-width` steps over 900 ms), then flips to "● REAL · READY" (CSS only).
   - *Where:* Every **demo frame** as it enters the viewport.
8. **Inline org-logo chips in prose (Anthony Fu, Hugging Face's real-data hero).**
   - *What:* Small colour logos inline with the words: "LLM assistant in production at [Amazon] across 180+ sites · firmware lead for [MarmotSat] · finding at [Apart]".
   - *Where:* The **hero proof line** and experience rows.
   - *Why:* Instant colour and credibility. It fixes DIAGNOSIS #3 and #8 with no motion budget.
9. **Paper-figure thumbnails and short silent clips for secondary work (colah, Alammar, Wattenberger).**
   - *What:* The key figure of each project as its thumbnail. Projects without a live demo get a 4–6 s muted loop (AV1/H.264 under 400 KB, `preload=none`, played only when visible).
   - *Where:* The **"More work"** grid (retrieval, ES-LoRA, ocean archive).
10. **A long expo-out hover lift on demo cards, plus pressed keycaps (Family, Raycast).**
    - *What:* Cards lift 4–6 px over 800 ms on `(.19,1,.22,1)`, so they feel soft rather than snappy. A `← →` or "drag" keycap chip presses itself once the first time a demo comes into view.
    - *Where:* **Demo cards and controls.** It teaches the interaction without instructions.

*Honourable mentions:*
- **Gwern's hover link-previews**, for a research audience.
- **Dennis's curved-edge curtain**, for the transition into a write-up.
- **Stripe's scroll-driven nav state in pure CSS.**
- **Sakana's thesis-as-background** (only if the field is sparse and real).

---

## Whole-site direction concepts

### A. "Running" (the live-instrument site)
**Pitch:** The site is a dark, quiet page where Tanuj's work is visibly *running*. One small mono telemetry line at the top is real (MarmotSat's position, and the next pass over Victoria). Under the name sits a single proof sentence with inline colour logos (Amazon, MarmotSat, Apart). The first thing that moves is the steering demo playing itself: the prompt types, α sweeps, the sentence rewrites from refusal to joy, and the read-back plot jumps. Everything else is a readable index that lights one row at a time. It takes Cursor's and Stripe's "the product is live, the number is real" and applies it to a researcher.
- **Signature interaction:** Touch the demo and the script yields to you mid-sweep. The α handle is wherever the script left it, and a pressed `drag` keycap fades.
- **Hero:** Left: name (small), the proof line with logo chips, and the Resume (PDF) button. Right: the steering demo frame, which warms up from 10 % and runs the scripted sweep. Above both: one telemetry line with rolling digits.
- **Demos:** Inline in an outcome-titled index. Each row opens in place into its live demo, with the finding sentence first and "REAL / ILLUSTRATIVE · Method" chips. The status chip types, then shows READY.
- **Risks:**
  - The scripted loop must be honest. Only replay real cached outputs, and say so.
  - Telemetry can creep back into HUD clutter; cap it at one line.
  - The hero's model weights must not block LCP. Ship cached outputs and load the live model on demand.

### B. "Explorable" (the interactive-essay site)
**Pitch:** Built after Ciechanowski, colah and Distill. The home page is a short essay in a warm serif on near-black: three paragraphs, one per thesis (*models have internal states you can steer; training choices decide what they voice; I ship this into production and into orbit*). Each paragraph is followed by a figure you can play with. The navigation is a table of contents with dot leaders and "Fig. 1–4". It reads like a paper you can touch, which is exactly the genre lab reviewers trust.
- **Signature interaction:** A word in the sentence and the control share a colour. Hovering "**α**" in the prose highlights the slider, and dragging the slider re-underlines the clause it proves.
- **Hero:** Title, a one-line abstract with logo chips, and Fig. 1, the steering contrast pair (α = −0.9 vs +0.9), shown side by side at rest and already interesting.
- **Demos:** As numbered figures within the text (Fig. 1 steering, Fig. 2 loss masking with regime tabs, Fig. 3 the MarmotSat globe with the current pass, Fig. 4 the ocean probe). Each has a caption, a REAL/ILLUSTRATIVE marker and a "Method ↗" link. Secondary work appears as a references list with figure thumbnails.
- **Risks:**
  - Too long for a 10-second recruiter skim. It needs a proof strip and the Resume button above the essay.
  - Serif-on-dark needs careful contrast and size (18 px+).
  - It could read as a blog rather than a portfolio.

### C. "One lit thing" (the restrained index)
**Pitch:** The craft of Paco, Brittany Chiang and Olivier Larose, tuned for Tanuj. It has a sticky left identity column, and a right column that is an index of outcome-titled rows: research, systems, hardware. The page assembles in under a second and then is still. The only ambient life is a faint cursor spotlight. Hovering or scroll-focusing a row lights it, dims the rest, and wakes a *live miniature* of that demo in the row's thumbnail slot (poster first, then live). Click and the row expands in place into the full demo. It's the fastest to read, the cheapest to run, and its delight lives in exactness.
- **Signature interaction:** Focusing a row makes its thumbnail come alive. The steering mini-plot ticks, the satellite dot moves along its track, and the masking tokens flicker between regimes. The other rows dim to 40 % and pause.
- **Hero:** Left column: name, a one-line role, the proof line with logo chips, Resume and socials, and a scroll-spy nav with growing lines. Right column: the index starts immediately, so it doubles as the hero.
- **Demos:** As row thumbnails that become live on focus and expand in place into the full component. Write-ups use the explorable pattern from B.
- **Risks:**
  - It's the closest to the Brittany template, so it needs its own type and colour (a serif-italic accent, logo colour) to avoid "plain and lifeless" (DIAGNOSIS #8).
  - Touch needs scroll-centred focus, not hover.

### D. "Orbit" (the one-object site)
**Pitch:** This is the "signal" ambition, done the way Vercel, Resend and DeepMind do it: one beautiful physical object, not a filter over everything. A small, well-lit 3D **MarmotSat** hangs in the hero at its real orientation for this minute, over a sparse dot-globe showing its ground track. Text is never dithered, never behind the object, and never canvas. The object is the identity: it's in the favicon, it becomes a small dot in the nav once you scroll (as Anthropic collapses its wordmark), and it's the loader if one is ever needed. Below the hero, the site is option A's live index.
- **Signature interaction:** Grab the satellite to spin it with inertia; it settles back to its true attitude. The telemetry line under it updates live, and "next pass over Victoria 21:14" is a real prediction.
- **Hero:** The satellite and its track on the right (WebGL, DPR ≤ 1.5, a static poster until idle). On the left: name, proof line, Resume. The steering demo is the first block below the fold, with a finding sentence.
- **Demos:** The same as A. The satellite tracker demo *is* the hero, so the MarmotSat row links back up to it.
- **Risks:**
  - It foregrounds the hardware credential over the AI research one. Lab readers want interpretability first, so the proof line must lead with research.
  - 3D cost on mobile.
  - It needs a good model asset.
  - It's closest in spirit to what "didn't hit right". Ship it only if the object reads as craft, not as decoration.

**Recommendation:** Build **A** on **C**'s skeleton. Running demos, plus one real telemetry line, plus a lit index, plus explorable write-ups (from B). Keep D's satellite as an optional upgrade inside the MarmotSat row rather than the hero.

---

## Sources
- Awwwards listings used to find portfolio candidates: [Developer inspiration](https://www.awwwards.com/inspiration_search/developer/), [Ravi Klaassens profile](https://www.awwwards.com/raviklaassens/)
- All other observations come from the live sites listed above, captured 2026-10-16.
