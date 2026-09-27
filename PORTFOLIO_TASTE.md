# PORTFOLIO_TASTE.md: the quality bar for tanuj's site

These notes record what makes 35 Mobbin web references and 25 live personal/research sites feel premium, so the portfolio redesign can match their craft on a dark ground.
They are principles, not templates. A ref such as `#48` points to `references/portfolio/48-*.jpg`; `references/portfolio/index.json` has the source URL (and Mobbin image URL) for each.

How the evidence was gathered:
- Live sites were captured headless at 1440x900 (gwern at 1920x1080) with `prefers-color-scheme: dark`. Their computed type and every `cubic-bezier`, `linear()` and duration token in their stylesheets were extracted. The numbers below come from that pass, not from memory.
- Mobbin stores frames, not video, so the motion attributed to Mobbin refs is inferred from the frame and marked *(inferred)*.
- Stack assumed: React 18 + Vite + `framer-motion` 11.18 (installed), plain CSS.

---

## 1. Per-site notes

### Design engineers

**Emil Kowalski** (`#36`, `#37`)
- **One column, two inks.** The column is 644px, with one variable sans at 16/26.4. Names are #000 and descriptions #63635E. Section labels ("Today", "Projects") are body size. Spacing and ink do all the hierarchy.
- **Every claim is a live demo.** The animation article embeds a Dynamic-Island morph (Idle / Ring / Timer buttons) and a spring visualiser: stiffness/damping/mass sliders drive a plotted curve, with a Copy button (`#37`). The reader learns by touching the thing.
- **His easing vocabulary is small and deliberate.** Two curves recur in his CSS: `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out) and `cubic-bezier(0.32, 0.72, 0, 1)` (the iOS drawer curve from Vaul). Durations are 100/150/200/220/300ms, and 700ms is the only long one. Backdrop blur tops out at 1.5 to 4px.

**Rauno Freiberg** (`#38`, `#39`)
- **The bio is set as display type.** "Rauno Freiberg is an Estonian interaction designer…" runs at 75px with alternate lines indented, on a card in a horizontal rail. The next card peeks at the right edge. A tick-mark strip at the top shows your place in the rail.
- **Cursor as an instrument.** A yellow disc with a crosshair sits over the type, and `mix-blend-mode: difference` is in his CSS. One global curve: `cubic-bezier(.2,.8,.2,1)`.
- **Essays go dark and quiet** (`#39`). Ground is #161616, text #EDEDED at 16/28 over a 672px measure. The left ToC is grey, with the active item in white. Only single emphasised words switch to an italic serif ("*and*", "*down*"). Figures sit on light rounded cards.

**Paco Coursey** (`#40`)
- Ground is #1A1A1A with text #F2F2F2 in a 640px column. The body face is Söhne/Inter, and a **Newsreader italic** sets only the tagline ("*Crafting interfaces.*") and one closing phrase. One serif italic per screen is his whole personality layer.
- The index is three columns (Building / Projects / Writing), each item a title plus a two-line grey description. ↗ marks external links.
- **Motion is tokenised.** He defines the full Penner set as CSS vars (`--ease-in-quad` through `--ease-out-expo`) and uses `clip-path 0.3s` and `transform 0.4s, filter 0.4s` transitions, plus a `view-transition-name` reset.

**Josh W. Comeau** (`#41`, `#42`)
- **The springs are real CSS.** He ships spring curves as `linear()` easings with matching durations (`--spring-duration: 1.167s`, `--springy-spring-duration: 833ms`) and names the search modal with `view-transition-name`. The whole site uses spring physics without a JS runtime.
- **Tutorials are toys.** The sticky ToC highlights the active section (blue) with nested sub-items. A callout carries a hand-drawn bracket, and a like-heart reads "353,468". The nav has a sound toggle, so interactions make noise and can be muted. Body copy is 18/27 at ~686px.
- The dark ground is navy-black rather than neutral, with small-caps pink eyebrows. Warm and personal, but too candy for a research audience.

**Benji Taylor** (`#43`)
- One screen and no hero: a byline plus "Updated Aug 22, 2026", then bio paragraphs at 14/20 with -0.09px tracking. A year-grouped Writing table follows on hairlines, dd/mm dates right-aligned. The footer reads "2:12am in Los Angeles, California".
- **Named motion tokens** worth stealing verbatim: `--ease-snappy: cubic-bezier(.175,.885,.32,1.1)` at 220ms (a hint of overshoot), `--ease-smooth: cubic-bezier(.19,1,.22,1)` at 300ms, and `--ease-swift` at 800ms for big moves.

**Jhey Tompkins** (`#44`)
- Pure black, with a faint grid fading in from one corner. The headline is a DM Serif, over an uppercase mono role line. Inline links are coral, and there is a hand-drawn signature.
- **A live "now" stack** sits under the bio in dot-matrix mono: location, weather + local time, current experiment, game, now playing. It's the most personal ten pixels on any site here.

**Samuel Kraft** (`#45`)
- Ground is #161615 warm black. Body is 14/21, with secondary ink **#A1A09A**, a warm grey that doesn't go blue. Project cards are dark tiles, each holding a single rendered app icon. Small type used with complete confidence.

**Delba de Oliveira** (`#46`, light)
- Fraunces does everything (30px headings, 18/28 body), with Geist Mono for accents. Bold underlined links are the index. It proves a variable serif can carry a whole site. The lesson carries to dark, not the colours.

**Brian Lovin** (`#47`)
- Pure black. The bio is 24/32 in white at 70%; writing titles below are the same size in 100% white. **Two inks and one size step** make a complete hierarchy.

**Linear** (`#60`)
- Ground **#08090A**. Display is Inter Variable 64/64 at **weight 510, tracking -1.408px (-0.022em)**; secondary copy is #8A8F98 at 14/21. The product frame has 1px borders at roughly 8% white, and Berkeley Mono carries the technical accents.
- Curves: `cubic-bezier(0.32, 0.72, 0, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)`. Header blur and border transition at 120ms (`backdrop-filter .12s var(--ease-out-quad)`).

**Maxime Heckel** (`#59`)
- **Colour is set in oklch.** Ground is oklch(0.147 0.01 262), text oklch(0.937 0.027 262), body oklch(0.772 0.028 262). Every grey shares one hue, so the palette feels designed rather than defaulted.
- A floating pill header holds the current article title and a ToC chevron. Code blocks have a highlighted-line bar, and section headings end in a trailing hairline. His one easing overshoots slightly: `cubic-bezier(0.2, 0.85, 0.32, 1.2)`. WebGL/R3F demos are embedded in prose.

**Nanda Syahrasyad / nan.fyi** (`#58`, light)
- A fixed left rail holds the name as condensed serif display ("Not a Number") and a one-line blurb. Each post row is a line-drawn icon, a serif title, a date and a two-line summary. The featured course sits in a dashed frame with ✕ crop marks. The site is a clear model for a pure interactive-explainer index.

### Researchers and explainers

**Distill: "Why Momentum Really Works"** (`#48`)
- **The hero is the experiment.** A loss landscape sits above the title fold, with a draggable start point and two sliders (step-size α, momentum β) that re-run the optimiser live. Before reading a word you've already watched momentum overshoot.
- The title is a 56px serif at -0.02em. The byline grid (author / date / citation) has hairline dividers, and the body is 20/31 at 648px. Citations are bracketed blue numbers.

**Transformer Circuits: Scaling Monosemanticity** (`#49`)
- A sticky nested ToC runs down the left, and body copy is 17/28.8 at 704px in the system font. The distinctive figure is **token-level activation highlighting**: each token's background alpha equals the feature's activation, shown side by side across languages and images. It is the native visual language of interpretability, and Tanuj's steering work should speak it.

**Bartosz Ciechanowski** (`#50`)
- IBM Plex Sans at 19.2/30.7 (1.6 leading) over a 704px measure. **Part names in the prose are coloured to match the part in the figure.** A "globally pause" link in the intro stops every animation on the page, and each figure has its own pause button. The whole method is small, pausable, labelled demos between paragraphs.

**Gwern Branwen** (`#51`, `#57`)
- Dark mode is strictly monochrome: Source Serif 4 at 19/30, justified and hyphenated, with indented paragraphs, small-caps headings and dropcaps.
- **Sidenotes.** On wide viewports (captured at 1920px), footnotes become boxed, numbered notes in the right margin aligned to their reference (`#57`). Links get dotted underlines with ↓ markers and open previews on hover. The toolbar collapse uses 0.25s and 1s durations; everything else is nearly still.

**Chris Olah** (`#52`)
- Computer Modern at 18/27. Numbered comment bubbles sit in the margin. The diagrams use **one highlight colour that tracks the concept** (the blue h_t) through every figure in the post.

**Andrej Karpathy** (`#53`)
- A date, a blue link and one sentence, with no design at all. This sets the floor: if the one-sentence descriptions aren't this good, no amount of motion will save the page.

**Lilian Weng** (`#54`)
- Dark long-form (#1D1E20, text #C4C4C5 at 16/25.6, 720px). Its **white-background diagrams pasted onto dark** show exactly what not to do: each figure is a flashbang. Theme every figure.

**Neel Nanda** (`#55`)
- Counterexample: a Squarespace three-column blog grid with centred bold serif titles. It gives no sign of the research, and every post looks alike.

**The Pudding** (`#56`)
- Ground #191919. Issue numbers (#223) sit in outlined pills with the month/year right-aligned. **Every card thumbnail is a real chart** on a saturated field. Type is Gooper SemiCondensed with Atlas Typewriter. The data is the art direction.

### Mobbin (web), grouped

- **Heroes:**
  - Resend `#01`: thin serif display on near-black beside one side-lit monochrome 3D object.
  - LangChain `#02`: a hairline diagram of four mono-labelled stages converging is the hero art.
  - Chronicle `#03`: a giant 1px-outline wordmark.
  - Grok `#04`: a radial point field with hairline spokes, which reads as an embedding space.
  - Unseen `#05`: a chromatic-split wordmark on warm charcoal.
- **Work indexes:**
  - Nite Riot `#06`: a dense small-caps three-column table over a desaturated still.
  - A24 `#07`: display-size titles with tiny mono year superscripts.
  - Cloudstudio `#08`: numbered tiles, each with one big metric.
  - Studio Freight `#09`: a draggable canvas with 1X/2X zoom.
  - Koto `#10`: a sticky caption beside scrolling media, with local time in the header.
  - Freshman `#11`: Nº 01 rows on dotted rules.
- **Narrative:**
  - Giga `#12`: a glowing progress rail with steps 1-3 lit and 4-5 dimmed.
  - Wild `#13`: a pixel scatter that converges into a line, then fans out.
  - Titan `#14`: a radial dial that rotates the active step into place *(inferred)*.
  - Dovetail `#15`: a vertical hairline stepper whose active node expands.
  - Greptile `#16`: STEP 01-03 wireframe diagrams on a blueprint grid.
- **Data:**
  - Giga `#17`: proof cards with purpose-built micro-charts ("each dot = 1%").
  - Mixpanel `#18`: a field of mono digits as texture.
  - Origin `#19`: an annotated scrubbable line with a "today" cursor.
  - Dovetail `#20`: dotted wiring into a product frame.
- **Footers:**
  - Legend `#21`: a lit 3D scene, with mono meta on column rules.
  - Runway `#22`: a clipped outline wordmark.
  - Mammoth `#23`: large serif links.
  - Resend `#24`: an "All systems operational" status pill.
- **Nav:**
  - Linear `#25`: ⌘K palette with kbd badges.
  - Fourmula `#26`: centred pill nav with a live scroll "0%".
  - BitcoinOS `#28`: a full-screen numbered menu on hairlines.
- **Other:**
  - Garden `#27`: a dither/scanline shader in one accent.
  - Sana `#29`: a case study that puts three big metrics before the Challenge section.
  - Perplexity `#30`: a mono byline pair over a 2px rule.
  - T1 `#31`: labelled macro-photo tiles.
  - Framer `#32`: a demo pane beside its source code.
  - Mews `#33`: odometer years.
  - Handshake `#34`: a sticky year index.
  - Büro `#35`: a chapters table and a witty floating pill.

---

## 2. Principles for this portfolio

1. **Show the work running.** The strongest sites put a live, touchable experiment where a hero image would go (`#48`, `#37`). Tanuj has one no one else has, a steering vector, so the first interaction on the site should be dragging α.
2. **Ten-second read, ten-minute depth.** Above the fold: name, one sentence, three proofs (Amazon Robotics AI + return offer, Beri, a research result), and links. Everything else is depth for people who stay. Brian Lovin and Benji fit a complete identity in one viewport (`#43`, `#47`).
3. **One column, one measure; figures break out.** Prose sits at 62-68ch (640-704px, per Paco, Rauno, Ciechanowski and Transformer Circuits). Figures may widen to 960-1120px. Sidenotes live in the margin (`#57`).
4. **A warm, hue-consistent dark.**
   - Ground #0C0C0B-#161615, never #000 or GitHub's #0D1117.
   - Primary ink #EDEDEC. Secondary ink #A1A09A (`#45`). Hairlines are white at 8%.
   - Define the greys in oklch with one shared hue (`#59`).
5. **Two inks and one accent, and the accent means "live".** Use the accent only for the interactive or data element: the steered token, the active step, the live dot. Olah and Ciechanowski use colour as a pointer, never as decoration (`#50`, `#52`).
6. **Numbers are proof and get display treatment.** Use tabular mono with a small grey unit: "1B vectors · 38 ms p99", not "worked on retrieval" (`#08`, `#17`, `#29`).
7. **Type makes the hierarchy.** Allow at most three size steps on the homepage. Emphasis comes from ink, an italic serif word or a mono label, never from boxes, gradients or badges (`#36`, `#40`).
8. **Motion explains a state change or it doesn't ship.** Allowed: entrances that establish order, shared elements that keep continuity, and figures that respond to input. There are no ambient loops outside the 3D variant, and those pause (`#50`).
9. **Fast, interruptible and tokenised.** UI motion is ≤300ms and retargets mid-flight. Every curve comes from the token table in §3 (Paco's and Benji's discipline).
10. **Theme every figure for dark.** No white boxes pasted on a dark page (`#54`). Figures use the same inks, hairlines and accent as the prose.
11. **Some texture only Tanuj could have:** Victoria local time, "currently: Amazon Robotics AI", the Beri app icon, a figure from his own experiments (`#44`, `#43`). Personal beats clever.
12. **Reduced motion is a designed state.** Travel and blur become opacity, scrubbing becomes stepping, loops stop, and every idea stays legible.

---

## 3. Motion tokens (use these, nothing else)

| Token | Value | Source | Use |
|---|---|---|---|
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Emil `#37` | entrances, popovers, hover-in |
| `ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Emil, Linear `#60` | menus, sheets, anything travelling >100px |
| `ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Linear, Benji | hero text reveals, large type |
| `ease-snappy` | `cubic-bezier(0.175, 0.885, 0.32, 1.1)` | Benji `#43` | small controls only (≤44px), 220ms |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Penner | non-user-driven A→B moves |
| `linear` | `linear` | n/a | scroll-scrubbed values, progress |
| spring `snap` | `{ type: "spring", stiffness: 520, damping: 42 }` (ζ≈0.92) | n/a | nav pill, tab indicator, toggles |
| spring `layout` | `{ stiffness: 380, damping: 38 }` (ζ≈0.97) | n/a | `layoutId` shared elements, list reflow |
| spring `soft` | `{ stiffness: 220, damping: 30 }` (ζ≈1.0) | n/a | panels, case-study expand, full-width things |
| spring `follow` | `{ stiffness: 260, damping: 28, mass: 0.6 }` | n/a | cursor-following previews |
| spring `pop` | `{ stiffness: 600, damping: 24 }` (ζ≈0.49) | n/a | a check icon on commit, nothing larger than 24px |
| `scrollSmooth` | `useSpring(p, { stiffness: 140, damping: 30, restDelta: 0.001 })` | n/a | smoothing scroll-linked values |

Durations: press 100ms, hover colour 150ms, tooltip 150ms, popover 180ms, menu 240ms, section entrance 450ms, hero sequence ≤900ms in total. Staggers are 40-60ms, capped at 8 items. Exits run at 0.7× the entrance and use `ease-in`-free curves (fade only).

Reduced motion, globally:

```tsx
<MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 38 }}>
```

This drops transform and layout animation while keeping opacity. Canvases and loops read `useReducedMotion()`. In CSS, `@media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms; transition-duration: 150ms; } }` applies to opacity and colour only.

---

## 4. Motion and interaction patterns

Format: **Pxx name**, followed by:
- *Src:* the source refs.
- *Does/why:* what it does and why it works.
- *Fits:* where it goes on Tanuj's site.
- *Build:* React + Framer Motion + CSS, with the reduced-motion fallback marked **RM**.

Variant labels: V0 refined, V1 research lab, V2 design engineer, V3 immersive 3D, V4 narrative scroll, V5 wildcard.

### Hero and identity

**P01 Steering slider as the hero.** *Src:* Distill `#48`, Emil spring visualiser `#37`.
- *Does/why:* A prompt and a model completion sit under one slider labelled "joy vector, α". Dragging α from -8 to +8 rewrites the completion from flat to elated. It proves the research in two seconds and needs no explanation. Nobody else's portfolio can do this.
- *Fits:* hero (V0, V1, V2); the emotion/persona vectors write-up.
- *Build:*
  - Precompute completions at 17 α steps into JSON. No live model.
  - Snap the slider to steps with a `snappy` thumb. Swap text with `<AnimatePresence mode="popLayout">` keyed by α: `initial={{opacity:0, filter:"blur(4px)"}} animate={{opacity:1, filter:"blur(0px)"}}`, 180ms `ease-out`.
  - Tokens that differ from α=0 get the accent underline, fading in at 120ms.
  - Show the value in tabular mono, e.g. `α = +4.0`. Arrow keys step, and the slider has `aria-valuetext`.
  - **RM:** no blur, 120ms opacity crossfade.

**P02 Bio as a display sentence, revealed line by line.** *Src:* Rauno `#38`, Linear `#60`, Resend `#01`.
- *Does/why:* The name and role read as one sentence set large ("Tanuj Dargan builds retrieval at Amazon Robotics AI and steers language models at night"). The lines rise out of masks in order, so hierarchy is established once and then it's still.
- *Fits:* hero (V2, V4).
- *Build:*
  - Wrap each line in `overflow: clip`, with the inner span `initial={{y:"100%"}} animate={{y:0}}` at `ease-expo` 700ms, stagger 60ms.
  - Split lines at authored `<br>`s, not with measuring JS, to avoid layout shift.
  - Display type: 56-72px, -0.022em tracking, weight 480-510.
  - **RM:** lines render in place; opacity 0→1 over 200ms.

**P03 Live "now" line.** *Src:* Jhey `#44`, Benji `#43`, Resend `#24`, Koto `#10`.
- *Does/why:* One mono line proves a human is here and current: "● 14:07 in Victoria · interning at Amazon Robotics AI · shipping Beri 1.4". The dot is the only live accent.
- *Fits:* hero footer line (all variants), footer.
- *Build:*
  - Time comes from `Intl.DateTimeFormat("en-CA",{timeZone:"America/Vancouver",hour:"2-digit",minute:"2-digit"})`, updated on the minute boundary via `setTimeout`.
  - Minute digits roll using P17.
  - The dot has a CSS `@keyframes pulse { 50% { opacity:.35 } }` over 2.4s.
  - **RM:** static dot, digits swap without motion.

**P04 Embedding field.** *Src:* Grok `#04`, Wild `#13`, Studio Freight `#09`.
- *Does/why:* A few thousand points (a real UMAP of persona vectors, or a sample of the billion-vector index) drift very slowly. Hovering a cluster labels it in mono; clicking one flies to the matching project. The site becomes a space you move through.
- *Fits:* 3D variant hero (V3); retrieval case study.
- *Build:*
  - `@react-three/fiber` `<points>` with a custom shader; points sized 1.5-3px, colour set by cluster at 60% alpha.
  - Camera `lerp` of 0.06 per frame toward the target. Drift: `sin(t*0.05)` offsets of ≤0.3 units.
  - `frameloop="demand"` when idle; pause with an `IntersectionObserver` offscreen.
  - **RM:** render one static frame into a `<canvas>`, keep hover labels, and turn camera flights into cuts.

**P05 Grain and edge vignette.** *Src:* Garden `#27`, Resend `#01`, Legend `#21`.
- *Does/why:* Large dark areas band on cheap displays and feel flat. A 3-4% static grain and a soft vignette at the top edge make the black feel like a surface.
- *Fits:* global (V1, V3, V4).
- *Build:*
  - A fixed full-screen `::after` with an SVG `feTurbulence` (baseFrequency .8, numOctaves 3) as a data-URI background, `opacity:.035`, `mix-blend-mode: overlay`, `pointer-events:none`.
  - Never animate it: moving grain costs a full-screen repaint per frame.
  - **RM:** identical (it's static).

### Research demos and write-ups

**P06 Token activation strip.** *Src:* Transformer Circuits `#49`, Olah `#52`.
- *Does/why:* Text is shown as tokens whose background alpha equals a feature's activation, the native visual of interpretability. For the SFT loss-masking work, the same strip shows which tokens carry loss: prompt tokens dimmed and hatched, response tokens lit. A toggle switches "mask on/off".
- *Fits:* research demos (V1, V2), write-ups.
- *Build:*
  - Each token is a `<span>` with `background: color-mix(in oklch, var(--accent) calc(var(--a)*100%), transparent)`.
  - On toggle, transition `--a` via `@property --a { syntax:'<number>'; inherits:false; initial-value:0 }` over 240ms `ease-out`, with a 6ms per-token stagger (`transition-delay: calc(var(--i)*6ms)`, cap 300ms).
  - Hovering a token shows its value in a mono tooltip after 150ms.
  - **RM:** no stagger; instant alpha.

**P07 Scrubbable parameter with live plot.** *Src:* Emil `#37`, Distill `#48`, Origin `#19`.
- *Does/why:* One slider, one plot, one takeaway. For ES-based LoRA finetuning: slide population size or σ and watch the reward curve and variance band reshape.
- *Fits:* research demos, write-ups (V1, V2).
- *Build:*
  - Precompute curves for each slider step and draw with SVG `<path>`.
  - On change, interpolate between paths with `flubber`, or keep the point count fixed and animate `d` via `useSpring` per point with `layout` spring values.
  - Axis labels in mono 11px at #A1A09A; the variance band is the accent at 15%.
  - **RM:** swap paths without interpolation.

**P08 Sticky figure, stepping text.** *Src:* Koto `#10`, Handshake `#34`, Titan `#14`.
- *Does/why:* The figure pins while short text steps scroll past, and each step changes the figure's state. The reader controls the pace, and one figure carries one argument.
- *Fits:* narrative variant (V4); SFT write-up; Beri case study.
- *Build:*
  - Grid: text column 42ch, figure column `position: sticky; top: 12vh`.
  - The step index comes from an `IntersectionObserver` with `rootMargin: "-45% 0px -45% 0px"`.
  - The figure animates between discrete states with the `soft` spring. Don't tie it continuously to scroll.
  - Inactive step text sits at 40% opacity with a 200ms transition.
  - **RM:** the same, with crossfades instead of moves. Below 900px width, drop the pin and put the figure inline above each step.

**P09 Process rail.** *Src:* Giga `#12`, Dovetail `#15`, Greptile `#16`.
- *Does/why:* One horizontal (or vertical) hairline carries 4-5 named stages, and the lit portion shows where you are in the explanation. It works well for a pipeline: embed → shard across GPUs → IVF-PQ search → rerank → return.
- *Fits:* retrieval case study; satellite firmware (boot → telemetry → downlink).
- *Build:*
  - A 1px SVG line with an accent overlay `scaleX` driven by `useScroll({ target, offset:["start 70%","end 50%"] })` → `useSpring` (`scrollSmooth`), `transform-origin: left`.
  - Stage labels flip from #6B6B66 to #EDEDEC as they're passed (150ms).
  - Progressive enhancement: `animation-timeline: view()` in CSS where supported.
  - **RM:** stages light in discrete steps, with no fill animation.

**P10 Sidenotes.** *Src:* gwern `#57`, Olah `#52`, Distill `#48`.
- *Does/why:* Asides sit next to the claim they qualify, so the main text stays clean and skeptical readers get their citations without jumping.
- *Fits:* write-ups (V1).
- *Build:*
  - Markup: `<aside>` right after the reference.
  - At ≥1280px: `float: right; margin-right: -280px; width: 240px`, Newsreader 14/21 at #A1A09A.
  - Below 1280px the aside collapses under a tappable superscript and expands with `height:auto` via Framer `animate={{height:"auto"}}` (`soft`).
  - Hovering the number or the note brightens both (150ms).
  - **RM:** expands without height animation.

**P11 Colour-linked terms.** *Src:* Ciechanowski `#50`, Olah `#52`.
- *Does/why:* "The **steering vector**" in prose shares the figure's accent colour. Hovering the term makes the figure element pulse once. Prose and figure become one object.
- *Fits:* write-ups, research demos.
- *Build:*
  - `data-term="vec"` on both. A shared `onPointerEnter` sets a React context value.
  - The figure element animates `scale: [1, 1.06, 1]` over 360ms `ease-out`, and the stroke goes to 2px.
  - Keep to four term colours or fewer, all at oklch L 0.78.
  - **RM:** colour/stroke change only, no scale.

**P12 Global pause.** *Src:* Ciechanowski `#50`.
- *Does/why:* A single "pause motion" control in the nav stops every loop and demo, and each figure also has its own pause button. It respects the reader, and it signals care to exactly the audience he's courting.
- *Fits:* nav (all variants, required for V3).
- *Build:*
  - A `MotionPrefs` context with `{ paused }`, initialised from `prefers-reduced-motion`.
  - Loops check it: R3F `frameloop={paused?"never":"always"}`, `<video>` pause, CSS `animation-play-state: paused` via a `data-paused` attribute on `<html>`.
  - Persist in `localStorage`.
  - **RM:** defaults to paused.

**P13 Link previews.** *Src:* gwern `#51`.
- *Does/why:* Hovering a paper or repo link shows a small card (title, one line, source) after a short delay. Readers check a reference without leaving.
- *Fits:* write-ups, project list.
- *Build:*
  - Open after 350ms of hover intent and close after 150ms of leave; `@floating-ui/react` for placement.
  - Enter: `opacity 0→1, scale .97→1, y 4→0`, 160ms `ease-out`, `transform-origin` toward the link. Exit: 110ms fade.
  - Data comes from a static JSON map, so nothing is fetched at hover time.
  - **RM:** fade only.

**P14 Sticky ToC with sliding indicator.** *Src:* Josh `#42`, Rauno `#39`, Transformer Circuits `#49`.
- *Does/why:* A grey list of sections with a 1px bar that slides to the active one, so you always know where you are in a long piece.
- *Fits:* write-ups (V1, V2).
- *Build:*
  - Active section comes from `IntersectionObserver` on headings (`rootMargin "-20% 0px -70% 0px"`).
  - The bar is `<motion.span layoutId="toc-bar">` with the `snap` spring. Active text goes #EDEDEC, the rest #6B6B66, with a 150ms colour transition.
  - Hidden below 1100px, where it's replaced by P15.
  - **RM:** the bar jumps; colour still transitions.

**P15 Floating article pill with progress.** *Src:* Maxime `#59`, Fourmula `#26`.
- *Does/why:* After the h1 scrolls away, a small pill (title + progress ring) appears at the top. Tapping it opens the ToC. Context is kept at no cost in space.
- *Fits:* write-ups (mobile, and V2 desktop).
- *Build:*
  - Show when the h1's `IntersectionObserver` reports not intersecting. Enter `y:-12→0, opacity` with the `snap` spring.
  - The ring is an SVG circle whose `pathLength` is bound to `useScroll().scrollYProgress` through `scrollSmooth`.
  - The pill has `backdrop-filter: blur(12px) saturate(1.4)` on `oklch(0.16 0.01 262 / .72)`.
  - **RM:** fade in; the ring updates without smoothing.

**P16 Demo beside its source.** *Src:* Framer Motion docs `#32`, Maxime `#59`.
- *Does/why:* For design-engineering pieces, the live demo sits next to the 10 lines that drive it. Hovering a code line highlights what it controls. Readers see both the result and the source.
- *Fits:* write-ups (V2); the "how I built Beri's motion" piece.
- *Build:*
  - Two-pane grid (figure 60% / code 40%) that stacks under 900px.
  - Line highlight bar in accent at 12%. Hovering a line sets `data-focus` on the demo element, which gets a 1px accent outline (150ms).
  - Use Shiki with a custom dark theme built from the site's own greys.
  - **RM:** no change needed.

### Work, proof and the Beri case study

**P17 Odometer numbers.** *Src:* Mews `#33`, Giga `#17`.
- *Does/why:* Metrics roll into place once when they enter view (1B vectors, 38ms p99, Beri's user count), so the number registers as a result rather than decoration.
- *Fits:* project rows, case studies, "now" line.
- *Build:*
  - Each digit is a `motion.span` column of 0-9 with `overflow: clip; height: 1lh`.
  - Animate `y: -digit * 1lh` with the `layout` spring, staggering digits right-to-left by 30ms. Trigger `useInView({ once: true, margin: "-15%" })`.
  - Tabular mono with `font-variant-numeric: tabular-nums`.
  - **RM:** render the final value.

**P18 Index table with hover preview.** *Src:* Nite Riot `#06`, A24 `#07`, Benji `#43`, Freshman `#11`.
- *Does/why:* Projects are one row each: Nº, title, one metric, year, on hairlines. Hovering a row dims the siblings and floats a preview image that trails the cursor. Recruiters scan it as a list; the curious get the visual.
- *Fits:* work section (V0, V2, V5).
- *Build:*
  - Rows: `grid-template-columns: 3ch 1fr auto 6ch`. The parent uses `:has(.row:hover) .row:not(:hover) { opacity:.4 }` with 200ms.
  - Preview: fixed-position `motion.div` whose x/y are `useSpring(pointer, follow)`, 320×200, radius 10, `scale .9→1, opacity` in 180ms `ease-out`.
  - Touch devices: no preview; the row expands with a thumbnail instead.
  - **RM:** preview appears in a fixed spot beside the list, fade only.

**P19 One proof metric per project.** *Src:* Cloudstudio `#08`, Sana `#29`, Giga `#17`.
- *Does/why:* Each project leads with its single strongest number and a one-line caption, before any prose.
- *Fits:* project rows, case-study openers.
- *Build:*
  - Metric at 40-56px in the display face, weight 300-400, tabular.
  - The caption is mono 12px #A1A09A with a max width of 28ch. Pair with P17.
  - **RM:** n/a (static).

**P20 Card to case-study shared element.** *Src:* Framer `#32`, Koto `#10`.
- *Does/why:* The Beri tile (app icon + name) grows into the case-study header, and the icon and title keep their identity across the jump. Back returns them to the tile.
- *Fits:* work → Beri case study (all variants).
- *Build:*
  - Same-page overlay: `layoutId={"proj-"+id}` on the icon and title, with the `soft` spring. The background page scales to 0.98 and dims to 50%.
  - Multi-page: `document.startViewTransition(() => flushSync(navigate))`, `view-transition-name: beri-icon`, and `::view-transition-group(*){ animation-duration: 380ms; animation-timing-function: cubic-bezier(0.32,0.72,0,1) }`. Feature-detect and fall back to a plain route change.
  - **RM:** crossfade 150ms (`::view-transition-group(*){ animation: none }` plus an old/new fade).

**P21 Phone frame, scroll-scrubbed recording.** *Src:* Koto `#10` (sticky caption + media), Sana `#29`.
- *Does/why:* A pinned iPhone frame plays a real Beri screen recording, and scroll position drives `currentTime`. The captions on the left name each moment ("Pantry → recipe in one swipe"), so the app's motion is shown rather than claimed.
- *Fits:* Beri case study (V0, V4).
- *Build:*
  - Encode an H.264 with keyframes every 6 frames (`-g 6`) so seeking is smooth.
  - `useScroll({target})` → `scrollSmooth` → a `useMotionValueEvent` that sets `video.currentTime = p * duration` inside `requestAnimationFrame`.
  - Captions step via P08. Frame: CSS border 10px #1C1C1B, radius 44px, inner radius 34px.
  - **RM:** replace with 4 still frames, each with its caption.

**P22 Hairline diagram draw-on.** *Src:* LangChain `#02`, Dovetail `#20`, Greptile `#16`.
- *Does/why:* System diagrams (GPU shards, satellite subsystems) are 1px lines with mono labels. Lines draw on once in data-flow order, so the reader follows the flow in the right sequence.
- *Fits:* retrieval and firmware case studies; V1/V3 hero art.
- *Build:*
  - `motion.path initial={{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true, margin:"-20%"}}`, 600ms `ease-in-out`, staggered 80ms in flow order. Nodes fade in at 150ms when their inbound edge completes.
  - Stroke is white at 20%; the active path is the accent.
  - **RM:** draw everything at once, fade in 200ms.

**P23 Micro-chart proof cards.** *Src:* Giga `#17`, Pudding `#56`.
- *Does/why:* Each result gets a tiny purpose-built chart ("each dot = 1% of eval prompts", before/after bars) rather than a generic stat. It reads as research, not marketing.
- *Fits:* research results, Beri metrics.
- *Build:*
  - SVG dot grid 10×10. On view, dots light in reading order with a 4ms stagger (cap 400ms total), opacity .15→1, 120ms each.
  - Mono legend 11px.
  - **RM:** render lit.

### Navigation, contact, footer

**P24 Nav pill with sliding hover.** *Src:* Fourmula `#26`, Linear `#60`.
- *Does/why:* A small centred pill (Work · Research · Writing · ⌘K). The hover background slides between items instead of blinking, which reads as one control.
- *Fits:* nav (V0, V2).
- *Build:*
  - `<motion.span layoutId="nav-hover">` rendered under the hovered item with the `snap` spring; the pill background fades out (120ms) on leave.
  - Current-page item text #EDEDEC, others #A1A09A.
  - Pill: `backdrop-filter: blur(12px)`, 1px border white at 8%, radius 999px. It gains a shadow after scrollY > 8 (120ms, as Linear does).
  - **RM:** hover background jumps; colour still fades.

**P25 Command menu.** *Src:* Linear `#25`, Paco (⌘K author) `#40`.
- *Does/why:* ⌘K opens a palette: jump to section, copy email, open CV, toggle motion, open GitHub. Engineers try it immediately, and it signals taste without a paragraph.
- *Fits:* nav (all variants).
- *Build:*
  - `cmdk` package. Overlay fades at 120ms; the panel goes `scale .96→1, opacity 0→1` over 180ms `ease-out` with `transform-origin: top center`.
  - Rows 36px, with a 2px accent bar on the active row (`layoutId`, `snap`) and kbd badges on the right in mono 11px.
  - Exit: 120ms fade.
  - **RM:** fade only.

**P26 Numbered full-screen menu (mobile).** *Src:* BitcoinOS `#28`.
- *Does/why:* On mobile the menu is a full-screen sheet of 01-05 numbered rows on hairlines in display type. It feels like a table of contents, not a hamburger drawer.
- *Fits:* nav, mobile.
- *Build:*
  - Sheet `clipPath: inset(0 0 100% 0) → inset(0)` at 420ms `ease-drawer`. Rows `y 16→0, opacity` with a 40ms stagger after 120ms.
  - Close reverses at 0.7× duration. Lock body scroll. Focus-trap with `inert` on the page behind.
  - **RM:** fade the sheet in; no row stagger.

**P27 Copy-email morph.** *Src:* Resend `#24`, Emil (Sonner) `#36`.
- *Does/why:* The contact action is the email itself as a button. Clicking it swaps the icon to a check and the label to "Copied" in place, then reverts. No toast and no mailto surprise.
- *Fits:* contact, footer, ⌘K.
- *Build:*
  - `AnimatePresence mode="popLayout" initial={false}` on the icon: exit `scale .6, opacity 0, filter blur(2px)` over 120ms; enter uses the `pop` spring.
  - Label width animates via `layout` on the button (`layout` spring). Revert after 1600ms.
  - `navigator.clipboard.writeText` with a `mailto:` fallback.
  - **RM:** instant swap, no scale/blur.

**P28 Outline wordmark footer.** *Src:* Chronicle `#03`, Runway `#22`, Legend `#21`.
- *Does/why:* The site ends on "TANUJ DARGAN" set huge in a 1px outline, clipped at the bottom edge. On hover (or when it enters view) the fill wipes in from the left. It's a confident ending that costs no content.
- *Fits:* footer (V0, V3, V4).
- *Build:*
  - Two stacked copies: outline (`-webkit-text-stroke: 1px rgba(255,255,255,.18); color: transparent`) and fill (`#EDEDEC`), the fill clipped by `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` over 900ms `ease-expo`.
  - Size `clamp(64px, 16vw, 280px)`, tracking -0.04em.
  - **RM:** show the fill statically at 12% white.

### Variant-specific

**P29 Dithered shader HUD.** *Src:* Garden `#27`, Unseen `#05`, Grok `#04`.
- *Does/why:* In the 3D variant, the hero scene (a satellite, or the embedding field) renders through an ordered-dither or scanline pass in one accent. HUD corner labels in mono read like telemetry ("ALT 525 KM · LINK OK"). It ties satellite firmware and ML to one visual language.
- *Fits:* 3D variant (V3).
- *Build:*
  - R3F plus a `postprocessing` custom `Effect` doing a Bayer 4×4 threshold on luminance, with pixel size 2.
  - Cap DPR at 1.5; `frameloop="demand"` with an invalidate on pointer move. The scene rotates 0.02 rad/s.
  - The HUD is plain DOM over the canvas with `mix-blend-mode: difference`.
  - **RM / P12 paused:** a pre-rendered dithered poster image with the same HUD.

**P30 Chapter scroll with pinned years.** *Src:* Büro `#35`, Handshake `#34`, Mews `#33`.
- *Does/why:* The narrative variant tells the story in chapters: satellite firmware at UVic → GPU retrieval → Amazon Robotics AI → interpretability → Beri. The year range sits pinned in the top corners and odometers (P17) as chapters pass. A "(05) Chapters" table at the top doubles as navigation.
- *Fits:* narrative scroll variant (V4).
- *Build:*
  - Chapters are `min-height: 100svh` sections. The pinned year is `position: fixed` and updates from the P08 observer.
  - Chapter titles in display type reveal with P02 masks.
  - The chapter table rows are anchor links with `scroll-behavior: smooth`, disabled under RM.
  - **RM:** year updates without roll; no masks.

**P31 Degrading type as a steering meter.** *Src:* Mixpanel `#18` (text as data texture), Transformer Circuits `#49`.
- *Does/why:* Wildcard only. The hero sentence is set in Redaction, and as the α slider (P01) moves away from 0 the sentence steps through Redaction 10 → 35 → 70 → 100, growing more pixelated. The typeface itself shows an intervention on a representation. Memorable and entirely his.
- *Fits:* wildcard variant (V5) hero.
- *Build:*
  - Load `@fontsource/redaction` and `-10/-35/-70/-100`. Stack five copies of the sentence in one grid cell and crossfade by `|α|` bucket (opacity 160ms `ease-out`).
  - Crossfading avoids the jump a live font swap would cause. Only the active and neighbour layers are visible.
  - **RM:** single swap at release, no crossfade.

---

## 5. Type systems (all self-hostable, all verified on npm, v5.3.x)

Variable packages register as `"<Family> Variable"`; import axis files explicitly (e.g. `@fontsource-variable/newsreader/opsz.css`). On dark grounds, set text weight ~20 units lighter than you would on light, because light-on-dark reads heavier. Give every face a metric-matched fallback (`size-adjust`, `ascent-override`) so nothing shifts on load.

**V0 Refined.** Geist + Geist Mono, with a Newsreader italic accent.
- Packages: `@fontsource-variable/geist` (wght 100-900), `@fontsource-variable/geist-mono`, `@fontsource-variable/newsreader` (`opsz-italic.css`).
- Scale:
  - Name/nav 15/22 at 500.
  - Body 16/26 at 380, with a 640px measure.
  - Display 48/52 at 500, -0.025em.
  - Labels Geist Mono 12/16, +0.02em, #A1A09A.
- One Newsreader italic phrase per screen at opsz 24 (Paco `#40`). Numbers use Geist Mono tabular.
- Why: neutral, current and precise. The serif italic adds the human note without becoming a theme.

**V1 Research lab (editorial on dark).** Newsreader + IBM Plex Mono.
- Packages: `@fontsource-variable/newsreader` (opsz 6-72, wght 200-800), `@fontsource/ibm-plex-mono` (400, 500).
- Scale:
  - Title 60/64 at opsz 72, wght 360, -0.015em.
  - Body 19/30 at opsz 16, wght 380, 64ch.
  - Sidenotes 14/21 at opsz 10, #A1A09A.
  - Figure labels, bylines and captions in Plex Mono 11/16, uppercase +0.06em.
- Old-style figures in prose (`font-variant-numeric: oldstyle-nums`); tabular lining in tables.
- Why: Distill/gwern authority (`#48`, `#57`) set dark and warm; Plex Mono reads as lab instrumentation next to it.

**V2 Design engineer (minimal).** Inter + Commit Mono.
- Packages: `@fontsource-variable/inter` (`opsz.css`, opsz 14-32), `@fontsource/commit-mono`.
- Scale:
  - Body 14/21 at 420 (Samuel Kraft `#45` density).
  - Display 64/64 at 510, -0.022em (Linear `#60`), opsz 32.
  - Mono 12/18.
- Features: `font-feature-settings: "cv11","ss03","tnum"` (single-storey a, round quotes, tabular numbers).
- Why: this is the reference face of the design-engineering world. It stays distinctive only with extreme restraint: two inks, one size step. Use it only if the motion carries the personality.

**V3 Immersive 3D (HUD).** Mona Sans + Martian Mono, with Doto for readouts.
- Packages: `@fontsource-variable/mona-sans` (`wdth.css`, wdth 75-125, wght 200-900), `@fontsource-variable/martian-mono` (`wdth.css`, wdth 75-112.5), optional `@fontsource-variable/doto` for large numerals.
- Scale:
  - Display Mona Sans at wdth 125, wght 300, 72-96px, -0.03em.
  - HUD labels Martian Mono 11px at wdth 87.5, uppercase, +0.08em.
  - Readouts Doto 32-48px.
- Width can animate on scroll: `font-variation-settings: "wdth" var(--w)` driven by `useTransform(scrollYProgress, [0,1], [125, 90])`.
- Why: width axes read as instrument panels; Doto echoes Jhey's dot-matrix `#44` and satellite telemetry.

**V4 Narrative scroll (display).** Fraunces + Hanken Grotesk.
- Packages: `@fontsource-variable/fraunces` (`full.css` and `full-italic.css`; opsz 9-144, SOFT 0-100, WONK 0-1), `@fontsource-variable/hanken-grotesk`.
- Scale:
  - Chapter titles Fraunces 120-160px at opsz 144, wght 300, SOFT 50, -0.035em, with italics at WONK 1.
  - Body Hanken 18/29 at 400, 60ch.
  - Captions 13/20.
- Why: at opsz 144 and light weight, Fraunces' contrast shines on black, and the italic has real voice for story beats. Avoid Instrument Serif here: in 2026 it is every AI landing page.

**V5 Wildcard.** Redaction family + DM Mono.
- Packages: `@fontsource/redaction` plus `@fontsource/redaction-10`, `-20`, `-35`, `-50`, `-70`, `-100`, and `@fontsource/dm-mono`.
- Scale:
  - Hero 72-120px in Redaction (regular) stepping through the degraded cuts (P31).
  - Body in Redaction 18/28.
  - Metadata in DM Mono 12/18.
- Why: a serif whose cuts get progressively corrupted is a direct metaphor for intervening on a model. It's a strange choice, and only credible because his research makes it make sense.

Also verified and usable: `@fontsource-variable/source-serif-4` (gwern's face, opsz 8-60), `@fontsource/instrument-serif`, `@fontsource-variable/instrument-sans`, `@fontsource-variable/bricolage-grotesque` (opsz 12-96, wdth 75-100), `@fontsource-variable/jetbrains-mono`, `@fontsource/ibm-plex-serif`, `@fontsource-variable/ibm-plex-sans`. Not on npm: `@fontsource/departure-mono`, `@fontsource/pp-neue-montreal`, and the `-variable` builds of DM Mono, Commit Mono and Young Serif.

---

## 6. Anti-patterns (what makes CS-student portfolios generic)

Several of these are on the current site; they go.

- **"Hi, I'm Tanuj" in gradient text.** The greeting wastes the most valuable line on the page, and indigo→violet gradient text (the current `--gradient-1`, #6366F1) is the default Tailwind-template look. Replace it with the sentence P02 describes, in one ink.
- **GitHub readme-stats and streak cards.** Third-party images in a mismatched "midnight-purple" theme and `#0D1117` background. Slow and off-brand, they show activity, not ability. Nobody at Anthropic or Cohere has hired for a commit streak. Delete them.
- **Cursor glow blobs, scroll progress bars in gradient, particles.** Decoration posing as interactivity. The only thing following the cursor should be useful (P18 preview).
- **Skill bars, logo walls and "Skills" as a section.** "Python 90%" is meaningless. Show the skills in the work: a CUDA kernel number, a steering plot, a SwiftUI animation.
- **About / Skills / Experience / Projects / Contact, in that order.** It's the template skeleton, and it buries the research below four scrolls. Lead with proof.
- **Every block fades up on scroll.** Once everything animates, nothing signals importance, and a skimming recruiter waits on content. Animate order in the hero, then leave things still.
- **Typewriter role cyclers** ("I build… AI | apps | satellites"). They hide the claim behind a timer.
- **Project cards with a thumbnail, three lines of copy and "View Project / GitHub" buttons.** Identical cards flatten Beri, a shipped product, down to the level of a class project. Use rows with one metric (P18, P19) and give Beri its own case study.
- **Vague verbs and adjectives:** "passionate", "leveraging", "cutting-edge", "innovative solutions". Name the model, the dataset, the number.
- **Space Grotesk plus gradient plus glass cards.** Around 2021 this was the look of every hackathon landing page. Now it reads as a template.
- **Blue-black GitHub dark (#0D1117) or pure #000 with pure #FFF text.** It's either borrowed or harsh. Use warm, hue-consistent greys (Principle 4).
- **Light figures pasted onto dark** (`#54`), and **screenshots of Jupyter plots** with default matplotlib styling. Re-render them in the site's palette.
- **"Download Resume" as the primary CTA, and "10+ projects / 5+ hackathons" counters.** Counting things is what you do when the things aren't shown. The CV goes in ⌘K and the footer.
- **Instrument Serif italic headline plus "Crafting…" copy plus a grain gradient.** It's the 2025-26 AI-startup look, and he'd look like a clone of his own audience.
- **Autoplaying 3D with no pause and a 4MB bundle on the homepage.** It fails the 10-second skim on a laptop and a phone alike. 3D belongs to V3 only, behind P12.

---

## 7. What goes on this site first

1. **P01 Steering slider hero.** The one thing no other applicant can show. It proves interpretability work in two seconds.
2. **P18 + P19 Index rows, one proof metric each, with a hover preview.** A 10-second skim of Amazon Robotics AI, Beri, retrieval, research and satellite.
3. **P06 Token activation strip.** The native visual of the field, reused for steering and SFT loss-masking.
4. **P20 + P21 Beri shared-element transition into a scroll-scrubbed phone recording.** Proves product craft with his own app's real motion.
5. **P03 + P27 Live "now" line and copy-email morph.** Human, current and one click to contact, with P25 ⌘K behind it.
