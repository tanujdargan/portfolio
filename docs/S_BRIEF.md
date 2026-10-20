# S-round brief: studio-grade variants (read fully before writing code)

You are building ONE full-site variant of tanujdargan.com: S1, S2, S3, S4 or S5. Other agents are building the others in parallel in the same repo, so the file rules are strict.

**Why this round exists.** The owner kept v6 and P2 from 20+ variants. The last round (P1–P5) was rejected as **too plain**: the earlier rounds' animation and interaction got stripped out. This round brings them back **at studio quality**: *restraint in information, richness in motion*. Few words, strong hierarchy, lots of interaction. **The work is the hero, not the name.**

## Read first (in this order)
1. `STUDIO_TASTE.md`: what makes basement, Koto, Kode, Unseen, Shader and others feel expensive, and the rules table at the end. **This is the quality bar.**
2. `WHY_V6_P2_WORK.md`: what the owner likes. Keep it.
3. `research/PATTERNS.md`: 59 patterns with mechanics. Your concept below names the ones to use by number.
4. `src/content/work.ts` (the six works and the compact roles: **use these**), `src/content/site.ts` (all facts; never invent any).
5. `src/variants/p2/index.tsx` and `src/variants/v6/index.tsx`: the variant contract mechanics (page switch, Link, jump, ResearchArticle, BeriCaseStudy, 404, the motion hook, the v6 warp transition). Copy the mechanics, not the look.

## Files you may touch
- ONLY `src/variants/<your id>/**`, plus `public/<your id>/**` if you need static assets.
- Do NOT edit `src/shared`, `src/demos`, `src/lib`, `src/content`, `src/routes.ts`, `src/App.tsx`, `vite.config.ts`, `package.json` or other variants. If you need a shared change, work around it in your directory and say so in your report. (S2 may *copy* files from `src/variants/v6/` into `src/variants/s2/` and change the copies. v6 itself must not change.)
- No `npm install`. No `npm run build` (it clobbers `dist/` for everyone). No git commits.
- Type-check with `npx tsc --noEmit -p .` and ignore errors in other variants' directories.

## Available building blocks (already in the repo)
- **Content:** `works`, `roles`, `prefetchDemo` from `src/content/work`. Plus `person`, `links`, `research`, `earlier`, `community`/`useCommunity`, `beri` from `src/content/site`.
- **Demos:** `<Demo kind="steering|lossmask|es|retrieval|ocean|orbit" />` from `src/demos/Demo`. It lazy-mounts near the viewport and renders the shared shell (`Frame`: title, provenance badge, controls, body, one-line caption, "Method" disclosure). **All six demos must be reachable from home.** Don't restyle demo internals beyond the tokens. Mount on interaction or proximity, and reserve the slot's height (the `--demo-h-*` vars) so nothing shifts.
- **Posters:** `<Poster k="steering" />` from `src/shared/Poster`. An SVG miniature of each demo, drawn from the demo's own real data at dev time. It's static HTML, crisp, and zero JS. It reads `--accent`, `--p-fg`, `--p-fg2`, `--p-fg3` and `--p-bg`. Use posters as the "live media" of indexes, previews, cards and textures. You can animate their strokes (`stroke-dasharray`/`stroke-dashoffset` on `.ac`, `.um`, `.acd` paths) so they draw in and feel live.
- **Type motion:**
  - `<Split text by="word|char" />` from `src/shared/Split`. SSR-safe; words sit in clip masks; each span carries `--i`. Animate `.s-split__i` / `.s-split__c` in your CSS.
  - `<Scramble text trigger="view|change|hover|none" run={n} />` from `src/shared/Scramble`. Glyph-noise decode; `change` morphs old text into new.
- **Smooth scroll:** `useLenis(on)` and `scrollToEl(el, reduced)` from `src/lib/lenis`. Wheel only; touch stays native; off under reduced motion. Optional.
- **Motion prefs:** `useMotionPrefs()` → `{ reduced, level, k, dur(), spring() }`. In CSS use `var(--k, 1)` (distance) and `var(--t, 1)` (duration); **never write default values for them**. The lab's Subtle/Default/Expressive toggle must visibly change your motion.
- **Links:** `<Links mode="icon|label|both|short" />` from `src/shared/Links` (Resume, GitHub, LinkedIn, X, Email). **Logos:** `<OrgTile org size />` (full-colour official marks on uniform tiles).
- **Other:** `<ResearchArticle slug base />` and `<BeriCaseStudy base />` for inner pages. `<Show when="beri">` wraps anything about Beri. `<Flag note>` marks unverified items. `Link`, `useRouter` from `src/lib/router`.
- **Libraries:** framer-motion 11, three 0.186, lenis. No GSAP; use framer-motion, WAAPI, CSS, and CSS scroll-driven animations (`animation-timeline: view()`) with a static fallback where unsupported.
- **Fonts** (installed; use latin-only `@font-face` pointing at the `…-latin-wght-normal.woff2` or `…-latin-standard-normal.woff2` files in node_modules, as `p2.css` and `v4b.css` do, plus a metric-matched local fallback `@font-face`): geist, geist-mono, mona-sans (wdth 75–125), ibm-plex-sans (wdth 85–100), @fontsource/ibm-plex-mono (static weights), instrument-sans (wdth 75–100), inter, jetbrains-mono, martian-mono (wdth). Also v6's subset files in `public/v6/` (Geist Mono and Newsreader). Budget: ≤ ~100 KB of fonts at first paint, 2 families.

## Non-negotiable rules
1. **The work is the hero.** At 1440×900 and 393×852 the first screen's focal point is the work: a live index, a demo, or a scene drawn from real data. The **name is small** (≤ 16px, nav-level or a quiet signature). At most one short line says who this is. **No giant name headline anywhere.**
2. **Resume, GitHub, LinkedIn, X and Email are on the first screen**, compact and never the focal point, and reachable at all times (fixed bar, corner HUD or dock). Resume opens the PDF in a new tab (`<Links>` handles it).
3. **Restraint in information:** home copy ≤ 600 words, excluding demo internals. ≤ ~25 visible words on the first screen, excluding link labels and the index of work titles. **No card or row over 25 words by default.**
4. **Experience:** logo tile, role, org, dates, one line. Bullets and the metric appear on interaction (expand, hover or tap). All six roles.
5. **Also on home, quietly:** Beri (inside `<Show when="beri">`, "a food app I'm building", linking to `${base}/beri`; **never** "founder" or "co-founder"), and "earlier work" (`earlier` from site.ts) as a single disclosure or one quiet line. Contact: email (copy-to-clipboard is nice) and the links.
6. **Richness in motion. Every variant must have all of these:**
   - **A signature interaction** someone would screenshot or tell a friend about. It must be *about the work* (steering, tokens, vectors, orbits), not generic eye candy.
   - **Custom page transitions** into write-ups and Beri, and back: a shared element via the View Transitions API, an accent wipe, a camera move, or a warp. App.tsx already wraps route changes in `document.startViewTransition` (skipped under reduced motion), so you can set `view-transition-name` on elements. For pseudo-element CSS, scope with `html:has(.s1) ::view-transition-group(…)`. To run your own exit animation before navigating, intercept the click as v6's `onClickCapture` does.
   - **Custom section transitions** (how each section arrives).
   - **Motion on type, not just on blocks:** split-word reveals, scramble decodes, per-letter rolls, variable-axis (wght/wdth) animation, context labels that morph.
   - **Hover or focus that does something worth doing.** On touch the equivalent is a scroll-centred active item, tap-to-preview, or press feedback (see "Mobile equivalents" in PATTERNS.md).
7. **Motion tokens** (STUDIO_TASTE):
   - `--ease-out: cubic-bezier(.16,1,.3,1)`
   - `--ease-io: cubic-bezier(.65,0,.35,1)`
   - `--ease-back: cubic-bezier(.34,1.56,.64,1)` (pops only)
   - durations 167 / 333 / 500 / 700 / 900 ms, times `var(--t, 1)`
   - no bouncing for fun and no ambient loops that never stop (a live demo is fine; decoration is not)
8. **Dark.** The owner strongly dislikes light, paper or cream themes. Use a near-black or graphite ground, a strict grey ramp, and colour only as an event: per-work `accent` from `works` for transitions and active states.
9. **Mobile is as good as desktop, not a degraded afterthought.** Design the 393px layout deliberately. Touch targets are ≥ 44px. Never put a drag surface in the page's scroll path (except S3, whose canvas *is* the page). WebGL DPR ≤ 1.5 on phones.
10. **Performance:**
    - LCP < 2.5 s on Lighthouse mobile; CLS 0; 60 fps target; transform and opacity only.
    - WebGL, three.js and heavy JS load **after first paint** (`requestIdleCallback`), pause when off-screen or the tab is hidden, and never run at SSR.
    - **The prerender defers JS until first paint plus ~900 ms**, so the static HTML must already look complete: posters are SVG in the HTML, so use them.
    - LCP rule: CSS entrance keyframes start at `opacity: 0.01`, never 0. No Framer `initial={{opacity:0}}` on the hero.
11. **Fallbacks:**
    - **Reduced motion:** every effect has an equivalent (cross-fade or instant), and nothing auto-plays.
    - **WebGL:** test with `?gl=0` and when context creation fails. Show the posters or the SVG.
    - **No JS:** the SSR HTML reads as a complete page.
12. **Accessibility:**
    - landmarks, a skip link, focus-visible styles, keyboard access to every interaction (including your signature), `aria-expanded` on disclosures
    - contrast ≥ 4.5:1 for body text, no horizontal overflow at 360px
    - any canvas that carries content has a DOM equivalent
13. **Contract:**
    - `src/variants/<id>/index.tsx` default-exports `({ page, base }: VariantProps)` and handles `page.kind` = `home | research | beri | notfound`.
    - Root `<div className="<id>">`. Scope ALL CSS under `.<id>` and prefix classes `<id>-`.
    - Home content goes in `<main id="main">` with a `<section id=…>` per section.
    - Tokens on your root, because the demos, article and case study read them: `--bg --bg-2 --fg --fg-2 --fg-3 --line --accent --font-display --font-body --font-mono --radius --measure --display-weight`.
    - Internal links use `<Link to={`${base}/…`}>`. In-page jumps use `scrollIntoView` or `scrollToEl` with preventDefault; a hash change re-routes.
    - SSR: no `window` or `document` at module scope or during render.
14. **Copy:** short, specific, confident. No buzzwords ("passionate", "leveraging", "cutting-edge", "innovative", "crafting", "journey"). Name the model, the number, the place. Use the hooks in `work.ts` or shorter ones. **Never invent a fact.**

## Verify before reporting (loop until it's genuinely good, not just done)
- Run the dev server on YOUR port in the background: `npx vite --port <port> --strictPort`. Check `/lab/<id>`, `/lab/<id>/research/activation-steering`, `/lab/<id>/beri`, and `/lab/<id>/nope` (404).
- Screenshots: `node ~/dev/portfolio-tools/capture.mjs http://localhost:<port>/lab/<id> /tmp/<id> <id> --no-video` (desktop Chromium and mobile WebKit, fold and full page, console error count). `node ~/dev/portfolio-tools/shot.mjs <url> <selector> <out.png> [width]` shoots one element. For interactions (hover, expand, transitions), write a small Playwright script in /tmp that imports from `/Users/tanujd/dev/portfolio-tools/node_modules/playwright/index.mjs`, hovers or clicks, and takes screenshots mid-animation.
- **LOOK at every screenshot** with the Read tool: mobile fold, desktop fold, full page, the signature interaction mid-flight, an expanded experience row, a write-up page. Critique against STUDIO_TASTE.md: would it look at home next to basement, Koto, Kode? Is it too plain? Too crowded? Is the work the hero? Iterate.
- Density: `node ~/dev/portfolio-tools/density.mjs http://localhost:<port>/lab/<id> <id> > /tmp/<id>-density.json`. The lab dock adds ~17 links on desktop and 3 on mobile to the first window.
- Zero console errors. Test `?motion=subtle` and `?motion=expressive`, emulated reduced motion, and `?gl=0` if you use WebGL.
- **Final report (≤ 30 lines):**
  - the concept
  - the signature interaction and how it works
  - the transitions (page, section, type)
  - type and palette
  - sections with word counts
  - density numbers
  - mobile approach
  - the studio references you drew on (by pattern number or studio)
  - fallbacks
  - known issues
  - any shared change you wished for

---

## The concepts

Each is a distinct studio-grade idea. Borrow principles; never copy a studio's layout.

### S1 · Index (clarity; P2 elevated to studio polish)
**Idea:** P2's two-column engineer's site, where the right column opens with the work as a big live index rather than experience. Koto's restraint, Gil Huybrecht's focus-dim, and the Codrops hover-preview done properly.
- **Desktop layout:** a pinned left column (~30%) holds a quiet signature (name 14px, one line such as "ML systems and interpretability · CS at UVic '27"), the links (Resume as the one filled pill, four icon buttons), and a numbered section index (01 Work · 02 Experience · 03 Contact) whose rule grows on the active item. Keep P2's DNA.
- **Work index:** the right column opens with it. Six rows: `n` in mono, the short title in Geist 56–72px at −4% tracking and line-height 0.95, the metric right-aligned in mono, and the meta small.
- **Signature, "the lens":** hovering a row dims every other row to ~25% (PATTERNS 11). A lens window (~420×163) follows the cursor with lerp 0.12 and a tilt driven by velocity (±5°) (10). It opens with a clip-path iris (`inset(50%)` → 0, 333ms `--ease-out`). Inside, that work's `<Poster>` draws itself in (stroke-dashoffset), tinted with the work's accent, plus a mono tag (provenance). The row title does a per-letter roll (6), staggered 12ms.
- **Click a row:** it opens *in place* into an exhibit (12). A framer-motion `layout` height animation expands a spec sheet on the left (basement's hairline key/value rows: Where · When · Data · Result) and mounts the live `<Demo>` on the right. Add "Read the write-up →" and "Close". Only one exhibit is open at a time. The metric scrambles in.
- **Write-up transition:** the row title carries a `view-transition-name`, so it morphs into the article title (18); the rest cross-fades with a short upward shift.
- **Experience:** P2's date-gutter rows with logo tiles, focus-dim on hover, and a tap disclosure for the bullets and metric.
- **Section entrances:** words rise out of masks (`<Split>`).
- **Mobile:** the pinned column becomes a compact top block, then the index at full width with titles ~40px. The row crossing a centre band (IntersectionObserver with `rootMargin -45% 0 -45% 0`) becomes active: its poster slides open inline (height plus clip) and the others dim (Mobile equivalents 4). Tap opens the exhibit. There's a sticky mini bar with icon links.
- **Type and colour:** Geist + Geist Mono. Graphite `#0b0b0c`, grey ramp, accent only in the lens and the active state.
- **Smooth scroll:** Lenis.

### S2 · Latent (v6 elevated; experimental WebGL)
**Idea:** v6's real activation space, rebuilt so the work is the hero and the craft goes up a level. Start by copying `src/variants/v6/{scene.ts,bus.ts,Decode.tsx}` into `src/variants/s2/` and adapting them.
- **Hero:** there's no name headline; the name sits in the top-left at 13px mono. The first screen is the field of real Qwen2.5-1.5B activations, plus the model's real output sentence set large (Newsreader 36–56px, left, 2–4 lines, with a mono label: "Qwen2.5-1.5B · layer 17 · joy · α +0.00 · real outputs").
- **Signature, "drag the model's mood":** a horizontal α rail (a big, thumb-friendly native range input restyled, snapping to the real α values in steering.json; arrow keys work). Dragging it:
  - bends the field (v6's bus → scene),
  - re-writes the sentence: the old output scrambles out and the new real output types in (`Scramble trigger="change"` or a typing effect),
  - ticks the read-back projection in mono,
  - makes the cursor glow shift from cyan (negative) to orange (positive).
  - Offer concept chips (joy, distress, certainty) as in v6's HUD.
- **Numbered dock (16):** 01–06 for the six works in the top bar. Hover shows a preview card with that work's `<Poster>`; click flies the camera to that cluster and scrolls to the section. The active number is a white pill.
- **Sections:** at most six stops, and each must earn its place: e.g. Steering (hero) · Research (lossmask, es) · Systems (retrieval, ocean) · Hardware (orbit) · Experience · Contact.
  - Each stop has a two-tone title that decodes on arrival, one line, the metric, and "Run the demo", which opens the `<Demo>` in a glass panel over the field.
  - Experience is compact rows with logo tiles.
  - Fix v6's failures: no 58svh empty gaps (sections are sized by content), no giant name, no duplicate steering controls, and experience rows ≤ 25 words by default.
- **Page transition:** keep and polish v6's warp (points rush past as the page dissolves) into write-ups. Coming back flies you in.
- **Mobile:** the field is a fixed backdrop (low DPR, fewer points), the α rail is a large slider under the sentence (it must not hijack vertical scroll), the dock becomes a bottom chip row, and sections scroll normally.
- **Fallbacks:** `?gl=0` or failure shows `public/v6/fallback.svg`. Reduced motion: no warp and no flight; cuts instead.
- **Type:** Geist Mono + Newsreader (the files in `public/v6`).

### S3 · Board (experimental navigation)
**Idea:** the home page is a zoomable research board (a dark dot-grid canvas), like a lab whiteboard. You pan, zoom, and **fly into** a work; the fly-in *is* the transition, and the work comes alive.
- **SSR / no-JS:** the server renders a **list view**: a plain, fast, complete page (LCP, SEO, a11y). After hydration the list **assembles into the board** with a FLIP: each card flies from its list position to its board position, staggered. That's the intro. A "List / Board" view toggle (48) stays in the HUD, and reduced motion defaults to the list.
- **The board:** a CSS-transformed world (no WebGL needed): `transform: translate3d() scale()` on one layer, with the pan/zoom state in refs and applied in rAF.
  - It holds six **exhibit cards**, each with a `<Poster>`, a big number, the short title, the metric and the tag, in a loose, deliberate composition (not a grid).
  - Also: an **experience shelf** (six logo tiles with role lines), a small **Beri** card (flagged), and an **earlier** note cluster.
  - A **signature card**: name small, one line.
- **HUD:** fixed corners, mono, Koto-like. Name and links top-left; zoom % and coordinates top-right; a minimap bottom-right with a viewport rectangle (click to jump); tour and list toggle bottom-left.
- **Interactions:**
  - Drag to pan with inertia (velocity decay ~0.92/frame).
  - Wheel or trackpad pinch (ctrl+wheel) zooms around the cursor, clamped 0.35–2.5.
  - Double-click empty space zooms in.
  - Keys: `1–6` fly to a work, `0` or Esc returns to the overview, arrows pan, `+` and `−` zoom.
  - Auto tour (`T`) flies through the six.
  - Camera flights are ~700ms `--ease-io`, interpolating scale in log space.
  - **Semantic zoom:** far out, cards show only the number and short name, set large (type counter-scales so it stays legible). Close in, the hook and meta fade in. Type changes width (IBM Plex Sans `wdth`) with zoom.
- **Signature, "fly in and it comes alive":** clicking or tapping a card flies the camera to frame it. At arrival the poster cross-fades into the **live `<Demo>`** mounted at that size, and panning locks while a card is open (the demo takes input). "Read the write-up →" morphs the card into the article (a View Transition shared element). Close or Esc flies back out.
- **Mobile:** the board is full-screen with no page scroll, so dragging is safe: one-finger pan, pinch zoom. A bottom thumb dock holds a horizontal chip row for the six works plus "List". Tap a chip or card to fly in. The HUD has icon links at the top. It must feel native: 60fps and no accidental zoom (`touch-action: none` on the board only).
- **Type:** IBM Plex Sans Variable (wdth + wght) + IBM Plex Mono. Colour: a near-black blue-grey ground, dots at 7% white, accent per work on the open card and the minimap.
- **Accessibility:** every card is a real button in logical tab order, and the list view is always available.

### S4 · Signal (experimental shader)
**Idea:** a full-bleed WebGL "screen" behind a text index, showing the in-focus work as a dithered 1-bit signal. Switching work is like **tuning a channel**. It's inspired by Nite Riot's index over swapping stills (13), Thibault Guignand's shader crossfade (15, 38), and dithering (39).
- **Hero:**
  - **Screen:** a fragment shader draws the current work's `<Poster>`, rasterised to a texture (serialise the poster SVG with the right CSS colours inlined → Image → canvas → texture). It's scaled up to fill the viewport, slowly drifting, with ordered Bayer dithering and a faint scanline, in grey, with the work's accent on its accent strokes.
  - **Index:** bottom-left, six rows of the short names in **Mona Sans at display size**. Hovering or focusing a row animates the **width axis**: the active row goes wide (wdth 125, wght 700) and the others condense (wdth 75, wght 300), 500ms `--ease-out` (7).
  - **HUD:** a small mono line in the corners ("CH 02 · MARMOTSAT · REAL TLE · NORAD 69912"), which scrambles on change.
- **Signature, "channel switch":** changing work runs one `progress` uniform (0 → 1 over ~700ms) through a block-noise mask plus a UV displacement and chromatic split that peak mid-way (38). The HUD label scrambles to the new channel. **A lens:** the pointer reveals the un-dithered, full-colour signal inside a soft circle that follows the cursor with lerp (42). Idle auto-cycle every ~6s with a thin progress bar (Neon N3); it pauses on interaction and is off under reduced motion.
- **Tune in (click a row):** the dither resolves (the threshold eases to full resolution) while the screen zooms slightly. A panel slides up with the **live `<Demo>`**, the hook, the metric and "Read the write-up →". The write-up transition is a **full-screen wipe in the work's accent** (Kode D1) that hides the route change.
- **Below the fold** (normal scrolling, and the shader pauses when off-screen): experience as a dense list with logo tiles (focus-dim on hover, disclosure on tap), a quiet Beri line, earlier work in a disclosure, and contact. Section titles decode.
- **Mobile:** the shader runs at DPR 1 and a smaller texture. The index becomes a vertical list where the row crossing the centre is active (it switches the channel), or a snap row; choose the better one after looking. Tap to tune in. There's no lens on touch; press-and-hold shows it instead.
- **Fallbacks:** without WebGL, the SVG posters show with a CSS crossfade. Reduced motion: no drift, no auto-cycle, and a crossfade instead of the noise transition.
- **Type:** Mona Sans (wdth/wght) + Martian Mono (HUD). Colour: `#050506`, dither grey, accent per channel.

### S5 · Spec (clarity; Koto restraint + basement spec sheets + a MACHINE mode)
**Idea:** the calmest variant, but alive. One lit exhibit at a time, with an instrument layer of real telemetry.
- **Desktop layout (Koto K1):** a sticky left caption column. Its two-tone heading is capped at 48px (Instrument Sans condensed, `wdth` ~80): line 1 "Selected work" in white, line 2 the current work's name in grey. Line 2 **morphs** (`Scramble trigger="change"`) as each exhibit crosses the centre. Below it: the hook, a basement-style spec sheet (hairline key/value: Where · When · Data · Result), and "Read the write-up →".
- **Exhibit stack:** the right column stacks the six exhibits. Each is the live `<Demo>` itself, mounted as it nears. **Only the centred exhibit is lit**; the others dim to ~20% with an ~333ms transition (K1).
- **First screen:** the caption column and the first exhibit (steering), plus a tiny intro line. No name headline.
- **Instrument layer:** the nav is a 10–11px uppercase mono bar with the name (small), the links, a **live UTC clock**, and a **live MarmotSat readout** computed client-side from `src/demos/orbit/model.ts` and the TLE (e.g. `MARMOTSAT 48.4°N 123.4°W · 517 KM`). It's real, and it ticks every second after hydration.
- **Signature, "HUMAN / MACHINE":** a pill at bottom-centre (basement). MACHINE turns the whole page into a plain-text, monospace, key/value mirror of the site for agents (ASCII rules, `NAME ........ TANUJ DARGAN`, a work index with metrics and links, experience rows, and links). The switch is the moment: **every visible text node scrambles into glyph noise and resolves into the machine version**, the layout collapses to one mono column, and the accent flips to a terminal colour. HUMAN reverses it. It's keyboard accessible, and the state persists in sessionStorage.
- **Experience:** Koto's definition-list style with hairline dividers and logo tiles. Hover or tap expands the bullets and metric.
- **Page transition:** the lit exhibit panel morphs into the write-up header (View Transition shared element, Koto K6, ~700ms `--ease-io`). On research pages, add a sticky chapter rail (K8) listing the article's h2s with an active dot.
- **Mobile:** the caption column becomes a sticky top label bar that morphs as each exhibit becomes active. Exhibits run full-width, with the same dimming. The MACHINE pill stays at bottom-centre.
- **Type:** Instrument Sans (wdth/wght) + JetBrains Mono. Colour: `#060606`, grey ramp `#e8e8e8 / #989898 / #595959 / #1f1f1f`, and the per-work accent only on the lit exhibit's hairline and badge.
