# Studio research B: Neon, Koto, Kode, Cofounder

Captured 2026-09-28 with headless Chromium (Playwright 1.63, SwiftShader WebGL) at 1440×900 and iPhone 15 (393×852, touch scroll via CDP `synthesizeScrollGesture`). Desktop scroll used `mouse.wheel` in 30px steps 20ms apart. Per-site folders hold `desktop-fold.jpg`, `desktop-01..05.jpg`, `desktop-hover-*.jpg`, `desktop-case-t150/t450/t900/t1600.jpg` (frames 150/450/900/1600ms after clicking into a case study), `desktop-case.jpg`, `desktop-case-02.jpg`, the matching `mobile-*` files, and `desktop.mp4` / `mobile.mp4` (15fps, 960px or 390px wide, all under 2.5 MB).

How the numbers were measured:
- **Tech** comes from `page.evaluate` globals and DOM markers. I also fetched every same-origin JS and CSS bundle and grepped it for library signatures, `cubic-bezier()`, `ease:` strings and durations (`/tmp/studios/probe2.mjs`). Bundled libraries don't show up as `window.*` globals, so on Koto, Kode and Neon the bundle grep found the libraries the globals missed.
- **Hover timings** come from sampling computed styles 40–1400ms after `mouse.move` and reading the `transition` value in effect.
- **SwiftShader caveat:** WebGL and video run at a low frame rate in software rendering, so the videos run slower than real time on Kode Immersive in particular. Its desktop recording is 8.5 minutes of wall time. Treat motion *durations* from CSS and JS as authoritative, and durations read off the videos as approximate.
- **Word counts** are "fold" (text nodes inside the first viewport that are laid out and not `display:none`) and "page" (`body.innerText`). The fold count includes text that is laid out but visually hidden, such as cookie banners and collapsed dropdowns. Where that inflates the number I also give a visual count read from the screenshot.

**Theme caveat.** The user prefers dark mode. Koto (#060606) and Kode Immersive (#FF4C00 orange, then black) are dark or saturated. Kode Media's home page is mostly white with black bands. Neon (white with black film imagery) and Cofounder (#F5F5F2 cream) are light, and I take only mechanics from those two, not palettes.

---

## 1. Koto — https://koto.com

**URL and verification.** `koto.studio` 301-redirects to `https://koto.com/`. The page title reads "Koto, an international creative agency building impactful brands", and the site shows Koto's own case studies (Amazon, Instagram wordmark, Fitbit Ace LTE, Microsoft Copilot+PC, Tripadvisor) plus five offices (LA, NY, London, Berlin, Sydney). This is the brand studio.

**Stack.**
- Next.js App Router (`/_next/static/chunks/app/[...slug]`) with Tailwind v4 (`--tw-*` vars, `md:grid-cols-16`).
- GSAP **3.13.0** with ScrollTrigger, SplitText and CustomEase, all bundled, so there is no `window.gsap`.
- A Rive runtime chunk, and 8 GLSL shader strings in one chunk. No `<canvas>` was mounted on the home page.
- No Lenis or Locomotive: scroll is native.
- 15 `<video>` and 75 `<img>` on the home page. Cookiebot handles consent.

**Type.**
- **Family.** One custom superfamily, "GT Kotoheim" in three cuts: `gtKotoheimCondensed` 300 for display, `gtKotoheim` 350/400 for text, and `gtKotoheimMono` for labels.
- **Display.** 48px/48px Condensed Light, tracking −0.48px (−0.01em), sentence case. It is always a **two-line, two-tone pair**: line 1 in white (e.g. "We're Koto", "Our work", "Contact") and line 2 in `rgb(152,152,152)` (e.g. "The Creative Company", the project name, "Press and careers").
- **Section statement.** 38px/41.8px, also two-tone: the first sentences in white, the trailing clause in grey.
- **Body.** 14–16px, weight 350.
- **Labels.** Mono 9–11px UPPERCASE: the nav "WORK ABOUT SERVICES…", the metadata "2025, MARKETPLACES", "[ VIEW ALL ]", "SAY HELLO / LA@KOTO.COM", and a live clock "23:58 UTC-7" top-right. 9px mono uses −0.18px tracking.
- **Size scale is tiny and strict:** 48 / 38 / 16 / 14 / 12 / 11 / 9. Nothing bigger than 48px on a 1440px screen.

**Palette.**
- Page `#060606`, panels `#141414` / `#202020`, text white, secondary `#989898`, tertiary `#595959`.
- Overlays: `oklab(0.12 0 0 / 0.5–0.8)` for dimming and white at 5–10% for glass.
- The only accent is the **yellow logo**. All other colour comes from the work media.

**Grid.**
- 16 columns at 1440px (80.5px columns, 8px gutters) and 8 columns on mobile.
- The home work section is a 2-column split: a sticky text column on columns 1–6 and the media column on 7–16.
- The case page uses a 336px sticky left rail and a ~1070px content column.

**Motion (observed and measured).**
- **Intro.** Black for about 600ms, then the full-bleed hero video fades up under the nav (`desktop-intro-600/1500.jpg`). The cookie bar slides in bottom-left.
- **Hero to strip.** On scroll, the full-bleed hero video shrinks to a ~316px-tall strip inset by about 7px from the viewport edges. The 38px statement then appears below it, revealed line by line through a mask: in `desktop-01.jpg` the line "New York, London, Berlin and Sydney." is half-clipped at its baseline. That is SplitText lines with an overflow mask.
- **Nav morph.** Once you scroll past the hero, the six-link mono nav collapses into a dark glass pill ("Koto HOME ·") at top-left. On a case page the pill reads "WORK · INSTAGRAM" and **animates its width**: `transition: width 0.4s cubic-bezier(0.65,0,0.35,1)` (measured; 195px on home, ~320px on a case). Pill internals use `0.25s cubic-bezier(0.85,0,0.85,1)`, `0.317s cubic-bezier(0.15,0,0.15,1) 0.083s` and `0.083s cubic-bezier(1,0,1,1)`.
- **Frame-quantised timing.** Durations in CSS and JS are multiples of 1/60s: .083 (5 frames), .133, .167 (10f), .217, .267, .317, .333 (20f), .5, .667 (40f), 1.0. Eases are sharp in-out curves: `cubic-bezier(.65,0,.35,1)`, `(.15,0,.15,1)`, `(.75,0,.85,1)`, `(0,0,0,1)`. GSAP uses `power2.inOut`, plus `linear` (63×) for scrubbed timelines.
- **Nav hover.** Mono label colour goes from 70% white to 100% in `0.167s linear` (measured).
- **Work section.** The left column is sticky with "Our work / {Project}". As each card crosses the centre, the grey second line swaps to that project's name and the paragraph and client lockup below change with it. The **active card is full brightness and every other card is dimmed** to roughly 20% (frames in the video and `desktop-02/03.jpg`). All cards are autoplaying muted videos.
- **Hover on a work card.** A small mono chip "↗ VIEW CASE" appears at the cursor position (seen at the pointer in `desktop-case-t150.jpg`).
- **Page transition (shared element).** Clicking the Instagram card:
  - At 150ms the card media is still in place, the page dims and the left text fades.
  - At 450ms the media has grown from (540,197, 884×496) to (361,25, ~1063×597), with the rest of the page black.
  - By 900ms it has settled as the case hero (352,16), and a new sticky left rail has faded in: title, grey subtitle, "SOCIAL MEDIA · 2026", and a chapter index (Challenge / The Impossible Brief / The Process / Solution) with a • marking the active item.
  - Total about 700–900ms. It is a real FLIP-style morph of the card into the hero.
- **Mobile.** The tap fades the page to black (t450 is pure black) and then the case page cuts in with a full-bleed video, a ← back button and title plus subtitle below. There is no FLIP on mobile.
- **Cursor.** Native. Only the "VIEW CASE" chip follows the pointer over media.

**How the work is presented.** A vertical stack of large 16:9 video cards (~877×493 on the right). The descriptive text sits in the sticky left column, not on the card. A 3-up "STUDIO NEWS" grid follows with mono PRESS tags and dates. The page ends in a Contact section styled as a definition list (label on the left, value on the right, 1px dividers) plus a small photo card of the LA office with "SAY HELLO / LA@KOTO.COM". Case pages have a sticky chapter rail on the left, a big media hero, then a 2-column prose block (H3 on the left, 16px grey paragraphs on the right) alternating with full-width media.

**Word count.**
- Desktop: fold 185 measured (inflated by the cookie banner and the hidden nav dropdown). About 16 words are visible: the nav plus "We're Koto / The Creative Company". Page 804.
- Mobile: fold 80, page 518.

**What makes it feel expensive (concrete).**
1. One type superfamily in three widths, used at only 7 sizes, with display type capped at 48px: restraint instead of giant type.
2. Two-tone headings (white line, then #989898 line) replace eyebrow labels and subtitles.
3. A 9–11px uppercase mono metadata layer, including a live local-time clock, that reads like an instrument panel.
4. The sticky label column updates to the project under the viewport centre while inactive cards dim to about 20%, so only one thing is lit at a time.
5. A true shared-element transition: the card becomes the case hero in about 0.7s with an in-out cubic, and the case rail (chapter index with •) arrives with it.
6. Timings quantised to 60fps frames with sharp symmetric in-out curves, so every UI move feels mechanical and deliberate.
7. The nav pill tweens its *width* to fit the breadcrumb (0.4s `.65,0,.35,1`) instead of swapping content.

**Patterns (with how they map to the ML-demo portfolio).**

| # | Name | Mechanics | Portfolio application |
|---|---|---|---|
| K1 | Sticky label and focused-card index | Left column `position: sticky`. A ScrollTrigger (or IntersectionObserver at 50% of the viewport) sets the active index. The line-2 label crossfades (Koto uses ~0.167–0.333s linear/in-out). Non-active cards get a black overlay at about 0.8 opacity with `0.133s linear 0.083s` | Sticky rail reading "Research / Activation steering" that swaps to "Loss masking", "ES fine-tuning" and so on as each live demo card reaches centre. Only the centred demo animates at full brightness and the others dim and **pause their render loops**, which also saves CPU. |
| K2 | Two-tone title pair | Two lines at the same size. Line 1 is #fff, line 2 is #989898. No other hierarchy device | "Tanuj Dargan / ML research engineer". Per demo: "Activation steering / Live explainer". Experience: "Anthropic / Research engineer, 2025". |
| K3 | Hero video to inset strip | ScrollTrigger scrub on `clip-path: inset()` or height from 100vh to ~316px with about 7px inset, ease linear (scrubbed) | Open on the live CubeSat orbit globe at full screen. On scroll it shrinks into a 300px "telemetry strip" that stays live above the intro paragraph. |
| K4 | SplitText line mask reveal | Statement split into lines, each wrapped in `overflow: hidden`, `yPercent: 100 → 0`, stagger ~0.083s, ease `.15,0,.15,1`, about 0.5s | The one-paragraph research statement. Keep it to a single use. |
| K5 | Cursor chip "↗ VIEW CASE" | A small mono chip absolutely positioned at the pointer, visible only over a card and fading in 0.133s | Over a demo card: "↗ OPEN DEMO" or "▶ RUN". Over a logo row: "↗ ROLE". |
| K6 | FLIP card to case hero | Read the card rect, route change, animate the hero from that rect to its final rect over about 0.7s with `cubic-bezier(.65,0,.35,1)`. The other content fades in over 0.333s | The live canvas of the demo *is* the element that grows. Clicking the ES-sim card expands the running sim into the full-page explainer without restarting it: keep the same canvas node, which is a strong "it's real" signal. |
| K7 | Width-morphing breadcrumb pill | Pill `transition: width .4s cubic-bezier(.65,0,.35,1)`. The text inside swaps with a y-roll of 0.317s delayed 0.083s | A top-left pill reading "TD · HOME", which becomes "TD · RESEARCH · STEERING" inside a demo. |
| K8 | Sticky chapter rail with an active dot | Case page left rail list. The active item is white with a 3px dot and inactive items are #989898. Set by scroll position | Demo explainer pages: "Setup / Intervention / Result / Code" rail, with the dot moving as you scroll the explainer. |
| K9 | Live clock in mono | "HH:MM UTC±N" in the nav at 11px mono, #989898 | A UTC clock next to the CubeSat tracker ("next pass 14:02 UTC"), which ties the ambient detail to real data. |
| K10 | Definition-list contact | Label column and value column, 1px #202020 dividers, rows about 125px tall | Experience list: company logo plus name on the left, role and dates on the right, dividers between rows, no cards. |

---

## 2. Kode — https://kodemedia.com (plus sub-brand https://kodeimmersive.com)

**URL and verification.**
- `kode.agency` doesn't resolve, `kode.co.uk` is for sale, `kode.design` is a coming-soon page, and `kode.studio` redirects to an unrelated personal site.
- Awwwards lists **"Kode Media – SOTD, Oct 6 2022"** linking to `https://kodemedia.com/`, with the page title "KODE | Production Studio. London.".
- Awwwards also lists **"KODE Immersive – SOTD"** linking to `https://kodeimmersive.com/`. Its footer gives INFO@KODEMEDIA.COM and 41 Mitchell St London, so it is the same KODE studio's immersive division.
- I captured both. `kode/` is the main studio site and `kode-immersive/` is the WebGL site.
- Other Kode-named sites exist: kodeclubs.com (Kode Sports Club, a 2020 SOTD, not a studio), kodestudio.co.za, and kode-design.com (does not resolve).

### 2a. KODE Media — kodemedia.com

**Stack.**
- Custom build by Malvah on the Locomotive boilerplate: `o-grid`, `c-thumb_title` and `u-padding-*` class names.
- jQuery, Owl Carousel, Swiper CSS, imagesLoaded and Flowplayer for video.
- GSAP **3.11.0** with ScrollTrigger and Locomotive Scroll bundled in `app.js`. `html.has-scroll-smooth` was not set, so Locomotive appears to run in native mode.
- No WebGL. 11 videos.

**Type.**
- One family, **Aeonik Pro Regular**, everything UPPERCASE, weight 400 only (bold only on thumb titles).
- Scale 432 / 200 / 100 / 30.6 / 18 / 16px:
  - 432px/345.6px "KODE LONDON" as a horizontal marquee (white "KODE", #FF4C00 "LONDON").
  - 200px/160px "WORK".
  - 100px/80px manifesto "WE CREATE STORIES PEOPLE LOVE, SHARE AND REMEMBER."
  - 30.6px for the services list with an orange asterisk: "*PRODUCTION / BRANDED CONTENT / PHOTOGRAPHY / POST PRODUCTION / CREATIVE".
  - Thumb captions 16px: title bold, client regular, and "// DIRECTOR" right-aligned.
- Tracking normal and line-height 0.8 on display: very tight leading, never tight tracking.

**Palette.** White `#FFFFFF`, black `#000`, grey `#B4B4B4`, and one accent, **orange `#FF4C00`**. The nav and logo use `mix-blend-mode: difference`: they are black over white, white over video, and the logo turns cyan over the orange "LONDON" (`desktop-05.jpg`).

**Grid.** 5 columns of 264px with 20px gutters at 1440px. Work thumbs alternate **left (columns 1–3) / right (columns 3–5)** in a staggered zig-zag with about 180px of vertical air between items. The hero grid is `903px 211px`.

**Motion.**
- **Intro.** The full-bleed hero video is revealed by a black panel sliding off vertically: at 1.5s the top half is still black and the bottom is video. The giant KODE wordmark sits over the video in a blended brown tone.
- **Page transition.** Measured frames on desktop:
  - At 150ms, an **orange #FF4C00 panel wipes in from the left**, already about 670px wide and slightly translucent (the thumbnail is faintly visible through it).
  - At 450ms the screen is fully orange.
  - At 900ms the orange is exiting to reveal a grey #B4B4B4 layer.
  - At 1600ms the case page shows: full-bleed video, a centred 100px "WATCH" rendered in a difference blend over the video, the title bottom-left and "SCROLL" bottom-right.
  - Total about 1.2–1.5s. The ease measured in CSS is `cubic-bezier(0.38,0.005,0.215,1)` (60 occurrences in the bundle, the signature ease). Other transitions are `transform .3s` with the same curve and `opacity .6s cubic-bezier(.215,.61,.355,1)`.
  - On mobile the transition is a grey top loading bar followed by a crossfade.
- **Thumb hover.** No computed-style change on title or caption. Thumbs are autoplaying videos, so the hover is effectively "nothing moves except the footage". The case "WATCH" label is a difference-blended word, not a button chrome.
- **Footer.** A 432px KODE–LONDON marquee in a black band, then a white footer with a 90px-wide black chevron (the ">" from the logo) and "// CONTACT US" links. `duration:18s` appears in the CSS, which is likely the marquee loop.

**How the work is presented.** A LATEST feed of video thumbs in a zig-zag, each with a three-part caption: **TITLE** (bold), CLIENT (regular) and "// DIRECTOR" on the right. There are no descriptions. A horizontal Owl carousel (DEPOP etc.) sits before the services list. Case pages are one full-screen video, the title, then "// SEE ALL WORK" in 100px on a black band (54 words on the whole case page).

**Word count.** Desktop fold **6** ("SCROLL", "//", "©2026" plus nav), page 958 (most of it in hidden director and news lists). Mobile: fold 12, page 959.

### 2b. KODE Immersive — kodeimmersive.com

**Stack.**
- Nuxt 3 (Vue) with Tailwind.
- GSAP **3.12.5** with ScrollTrigger and SplitText. Lenis (`html.lenis`).
- **three.js r178** (`window.__THREE__ = "178"`, WebGL2 canvases at 1440×900 ×2) plus **Rapier3D 0.18 physics** (`@dimforge/rapier3d-compat` loaded from jsDelivr).
- Lottie, 212 GLSL shader strings in the main bundle, 10 canvases, and a custom `div.mouse-cursor`.

**Type.**
- **OT Brut** (a condensed serif) for display, at 200px with tracking **−16px (−0.08em)** and line-height 0.9: "001", "IDEATE", "INNOVATE WITH PURPOSE". On mobile it is 60px with −4.8px tracking.
- 120px OT Brut for the justified manifesto wall.
- Aeonik Pro 16px uppercase for all UI, with bracket syntax: "[ SOUND ON ]", "[ 001 ]", "[ AR ]", "[ ENTER ]".

**Palette.** html bg **#FF4C00** with black type and a white nav, then a white manifesto section, then a black footer. There is a pixelated or mosaic gradient behind the 3D objects on mobile.

**Grid.** A 5-column `site-grid` with 10px gaps. A 3-column variant, and subgrid for the nav bar.

**Motion.**
- **Loader.** A mono counter "008 → 100" in the top-right, a blinking caret, and the logo **type-scramble** ("KODE IM*E|" resolving to "KODE.IMMERSIVE"). Then a "[ ENTER ]" gate that starts the audio.
- **Hero.** A **glass chevron** (the logo's ">") in a WebGL transmission material rotates over "INNOVATE WITH PURPOSE" and **refracts the headline behind it**. A circular cursor ring follows the pointer.
- **Manifesto.** A white section with justified 120px serif text reveals line by line. A "SCRATCH AROUND" prompt appears with orange dash marks, which reads as an interactive scratch-to-reveal.
- **Pinned services.** The section is pinned. The sequence is "001 IDEATE" (a 3D asterisk assembles from noisy particles), then "002" (a torus), then "003 DELIVER" (a lumpy cross). The object **morphs per step** while the big serif number and word change. A centre nav bar shows a scroll-percent counter "[ 036 ]", "[ 050 ]", "[ 083 ]".
- **Footer.** Black, with 3D extruded letters piled by Rapier physics and a giant KODE.IMMERSIVE wordmark.
- **Nav hover.** `transform 0.3s cubic-bezier(0,0,.2,1)` y-roll and `color 0.5s cubic-bezier(0,0,.2,1)`. JS eases are `power2.out` (21×), `elastic.out(2,0.45)` and `expo`.

**Word count.** Desktop fold 72 measured (visually about 12), page 245. Mobile fold 68, page 214.

**What makes KODE feel expensive (both sites).**
1. One grotesk (Aeonik), all caps, one weight, one accent colour (#FF4C00) used only for the transition wipe, the asterisk and "LONDON".
2. Captions follow a fixed three-slot syntax, **TITLE / CLIENT // DIRECTOR**, with "//" as the brand separator everywhere ("// CONTACT US", "// SEE ALL WORK").
3. A full-screen brand-colour wipe as the page transition (the accent colour *is* the transition), on one signature ease `cubic-bezier(.38,.005,.215,1)`.
4. The nav in `mix-blend-mode: difference` so it never needs a background.
5. Bracketed mono-ish UI ("[ 036 ]") with a scroll-percent counter.
6. Very few words: 6 visible words on the home fold.
7. Kode Immersive: display serif at −0.08em tracking, shader glass that refracts the actual headline, per-section 3D morphs, and a physics footer.

**Patterns.**

| # | Name | Mechanics | Portfolio application |
|---|---|---|---|
| D1 | Accent-colour page wipe | A fixed full-screen panel in the accent colour, `scaleX 0→1` from the left (transform-origin left) in about 0.35–0.45s, then route swap, then `scaleX 1→0` from the right with the same curve `cubic-bezier(.38,.005,.215,1)`. Opacity about 0.92 | Use the accent once: e.g. the steering-vector colour as the wipe into a demo page. It doubles as a loading mask while the WebGL or WASM demo boots. |
| D2 | Difference-blend nav and labels | `mix-blend-mode: difference; color: #fff` on the fixed nav and on the "WATCH" overlay | The nav over live canvases (orbit globe, ocean field) stays legible with no backdrop. Use "RUN" or "OPEN" as a difference-blended overlay word on demo previews. |
| D3 | Three-slot caption syntax | `TITLE` bold, `CLIENT` regular, right-aligned `// DIRECTOR`. All 16px caps | Demo cards: `ACTIVATION STEERING` / `Gemma-2 2B, live` // `2025`. Experience rows: `COMPANY` / role // dates. |
| D4 | Zig-zag feed | 5-column grid. Odd items span columns 1–3, even items columns 3–5, about 180px vertical gap. Media autoplays muted | Six demos alternating left and right, each a live mini render. The asymmetric gutter gives each one room to breathe without cards. |
| D5 | Giant marquee sign-off | A 432px word pair "KODE LONDON" with the second word in the accent colour, translateX loop of about 18s linear | Footer "TANUJ DARGAN — LONDON" (or "— CONTACT"), with the second word in the accent. Run it only while it's on screen. |
| D6 | Loader counter and type-scramble | A mono "000→100" counter tied to real asset progress. The logo characters cycle through random glyphs and lock in left to right (about 40ms per character) | Tie the counter to real demo preloading (model weights, tile data). Scramble "TANUJ DARGAN" once. Skip on repeat visits. |
| D7 | Scroll-percent bracket counter | "[ 036 ]" in the centre bar, updated from scroll progress with 3-digit zero padding | A reading-progress counter on long explainers ("[ 042 ] / LOSS MASKING"). |
| D8 | Pinned sequence with object morph | ScrollTrigger pin. Each step swaps the big serif number and word (SplitText chars) and morphs the 3D object (asterisk, torus, cross). Eases `power2.out` / `expo` | The ES fine-tuning explainer as pinned steps "001 SAMPLE / 002 EVALUATE / 003 UPDATE", with the population cloud reshaping at each step. Or the retrieval sim: "001 EMBED / 002 INDEX / 003 SEARCH". |
| D9 | Refractive glass over the headline | A three.js MeshTransmissionMaterial-style object rendered over a DOM-matched text plane so the headline refracts | A lighter-weight version: the CubeSat model passing over the name, or a lens over the token strip that magnifies the masked tokens. |
| D10 | Physics footer | Rapier rigid bodies for 3D letters dropping into a pile. The cursor pushes them | A token-strip footer where tokens fall and stack. It ties back to the loss-masking demo. |

---

## 3. Neon — https://www.neonrated.com (NEON, the film studio)

**URL and verification.**
- `neon.studio` is a parked domain ($49,988), `neon.design` doesn't resolve, and `neon.co` doesn't resolve.
- `weareneon.com`, `neon-studio.com` and `neon.nyc` are GoDaddy for-sale pages.
- **`neon.agency`** is a small Cargo-hosted agency site. It loads, but I found no Awwwards or Godly listing for it.
- The only award-level "Neon" I could find is **NEON (NEON Rated)**, the independent film studio: Awwwards **SOTD, Feb 28 2026** ("Neon Rated", linking to `https://neonrated.com`). `neon.tech` (Postgres) was excluded as instructed.
- I captured neonrated.com. **Caveat:** it is a film distributor ("studio" in the film sense), not a design agency. If the user meant a different Neon design studio, I couldn't find one with a live award-level site.

**Stack.**
- Next.js App Router with Tailwind.
- **Lenis 1.3.8** (`html.lenis`) and **Framer Motion** (eases in JS: `[.19,1,.22,1]`, `[.77,0,.175,1]`, `[.4,0,.1,1]`, `[.25,.1,.35,1]`; durations .3 / .4 / .5 / .6 / .95 / 1).
- **Embla** carousels.
- No GSAP, no WebGL. Built by 27b ("Website by 27b" in the footer).

**Type.**
- **Girott** 700 at 160px/144px with tracking **−4.8px (−0.03em)**, UPPERCASE, for film titles ("FJORD", "ANATOMY OF A FALL"). On mobile 70px with −2.1px tracking.
- Section heads are Girott 41px uppercase ("IN THEATERS", "COMING SOON", "WATCH NOW", "AWARD WINNERS").
- **Focal** 400/500/700 at 14px with −0.14px tracking for body and UI. 9–12px Focal caps for eyebrow labels ("IN THEATERS OCT 9, 2026").
- The footer wordmark is a huge custom stencil-like "NEON" where the **"O" is a rounded-rect window playing a film still** (ANORA).

**Palette.**
- White page with `#F3F3F3` tiles, black text, and full-bleed film stills.
- **Per-film accent colours** re-tint the UI: a green nav with "DOWNLOAD ZINE"; navy `rgb(56,96,190)`-ish on the Anatomy of a Fall page, where the title *type* also takes the film colour.
- Root CSS vars define the motion vocabulary: `--ease-out: cubic-bezier(0.16,1,0.3,1)`, `--ease-snappy: cubic-bezier(0.19,1,0.22,1)`, `--ease-anticipate: cubic-bezier(1,-0.4,0.35,0.95)`, `--ease-spring: linear(…)`. The spring is a CSS `linear()` with about 4% overshoot peaking at ~40%.

**Grid.** 4 columns of 333px with 16px gaps (`gap-[1.6rem]`, `font-size: 10px` root so 1rem = 10px). Rows are horizontally scrolling Embla tracks with ← → buttons next to the section head.

**Motion.**
- **Intro.** Black, with "FJORD" and its eyebrow already visible, then the still fades in underneath (the type loads before the image, `desktop-intro-600.jpg`). A bottom progress bar (a thin white/green line) runs as the **autoplay timer** of the hero carousel. Pagination is a pill plus dots.
- **Floating nav capsule.** A centred ~350px white box: hamburger, "NEON", and search / heart / account / bag icons. Under it sits a **contextual tray** with a thumbnail and CTA ("GET TICKETS →", "WATCH NOW ▷", "DOWNLOAD ZINE →"). Both **re-colour to the current film or section** (green, navy).
- **Hero cursor.** Two invisible 50vw halves with custom cursors act as prev/next. A thin large "→" arrow and a ▷ play glyph are drawn on the image.
- **Card hover.** Heart and ▷ icons fade in bottom-left: `opacity 0.3s cubic-bezier(0.4,0,0.2,1)` (measured, settled by ~400ms), and an "↗" arrow is prefixed to the title caption.
- **Page transition (mobile tap, real navigation).** At 150ms the old hero is still visible. At 450ms the screen is **pure black with the film title and eyebrow in place**. At 900ms the new still has faded in under the title. So it is title-first, then image, about 0.9s. On desktop, the click on a carousel card was absorbed by Embla's drag handling, so the desktop case frames come from a direct load.
- **Mobile menu.** A white card drops out of the capsule with big Girott items (Home / Shop / In Theaters / Watch Now / All Films) while the page dims to grey.

**How the work is presented.** Films are the "work": a hero carousel of full-bleed stills with 160px titles, then horizontal rows by status (In Theaters / Coming Soon / Watch Now / Award Winners with laurel icons / merch). Film pages are hero plus director spread ("JUSTINE TRIET" at 148px on the film-colour panel, with a quote), then a Gallery row.

**Word count.** Desktop fold 10, page 254. Mobile fold 8, page 227.

**What makes it feel expensive.**
1. Giant condensed title (160px, −0.03em) over full-bleed stills, with almost no other words.
2. A per-item accent colour that re-themes the nav capsule, the CTA tray and even the title type.
3. The nav is a floating object with a context-sensitive CTA drawer.
4. Custom easing tokens (`.16,1,.3,1` out, a spring written as CSS `linear()`, an anticipate curve) used consistently.
5. Title-before-image loading: the text is there instantly and the image fades in.
6. The footer wordmark with a live-media counter in the "O".

**Patterns.**

| # | Name | Mechanics | Portfolio application |
|---|---|---|---|
| N1 | Per-item accent re-theme | Each item defines `--accent`. The nav capsule background and tray, the title colour and the progress bar transition to it (~0.3s `.16,1,.3,1`) when the item is active | Give each demo one signature colour (steering vectors violet, loss mask amber, ocean teal, orbit cyan). The nav and progress bar take that colour while the demo is in view. On a dark base this is the main colour system. |
| N2 | Floating capsule with a context tray | Fixed, centred nav box. Below it a tray slides down (height and opacity about 0.3s) with a thumbnail and one CTA that changes per section | Tray reads "▷ RUN STEERING DEMO", "↗ PAPER", or "● LIVE: ISS PASS IN 12:04" depending on the section. |
| N3 | Autoplay progress bar | A 2px bar at the hero bottom, `scaleX 0→1` linear over the slide duration, which resets on change | Show demo "uptime" or step progress: the ES sim's generation counter as a bar, or the retrieval sim's query progress. |
| N4 | Split-screen prev/next cursor | Two 50vw hit zones with custom arrow cursors. Click advances the carousel | A hero carousel of three live demos. Left or right half steps the demo (e.g. increase or decrease steering strength), not just slides. |
| N5 | Hover icon reveal and ↗ prefix | Icons `opacity 0→1 .3s cubic-bezier(.4,0,.2,1)`. Caption gains a "↗" glyph | Demo cards: ▷ (run inline) and ↗ (open) icons fade in. Experience rows: "↗" appears before the company name. |
| N6 | Title-first transition | Navigate, then black plus title SSR'd in its final place, then media fades in (~0.45s) | For heavy demos: show the demo title and a one-line claim immediately on black, then fade the canvas in when WebGL is ready, so there's never a blank screen. |
| N7 | Media-in-letter wordmark | A giant footer wordmark where one counter (the "O") is a rounded-rect video or image window | "TANUJ" where the "U" or "O" window shows the live orbit tracker or ocean field. Keep it static on mobile. |
| N8 | CSS `linear()` spring tokens | `--ease-spring: linear(0, …, 1.0428 40%, …, 1)` for UI pops. `--ease-anticipate: cubic-bezier(1,-.4,.35,.95)` for exits | Token set for the site: out `(.16,1,.3,1)`, snappy `(.19,1,.22,1)`, spring via `linear()` for toggles and sliders in demos. |

---

## 4. Cofounder — https://cofounder.co

**URL and verification.**
- `cofounder.studio` is an unconnected Wix domain and `cofounder.design` has expired.
- Godly lists **"Cofounder" → https://cofounder.co/** (godly.design/website/cofounder). Awwwards gives it an **Honorable Mention** ("cofounder-2") linking to cofounder.co and credits the design to **Altalogy PRO**. The footer confirms "Design by Altalogy".
- **Caveat:** Cofounder is an AI product ("AI company operating system" by The General Intelligence Company of New York), not a design studio. It is the award-listed "Cofounder" site. I found no design studio called Cofounder with an award-level site.

**Stack.**
- Next.js built with Turbopack, React, Tailwind v4, and one Svelte-compiled chunk (an embedded widget).
- No GSAP, Lenis or WebGL. Motion is CSS transitions with Tailwind custom eases, plus PostHog.
- The hero is layered pixel-art images, not canvas.

**Type.**
- **TT Neoris** at 400 for everything display: h1 46px/49.7px, section statements 40px/46px (two-tone, 80% then 50% alpha), h3 36px with +0.32px tracking.
- Body 16px (a trial variable at weight 460 with +0.15px tracking); nav 15px at weight 410.
- **IBM Plex Mono** 7–12px for metadata:
  - "1.0 — LAUNCH", "2.0 — GROW", "3.0 — OPERATE" at 11px uppercase, +1.32px (0.12em), 50% alpha.
  - Step numbers "2.1", "2.2" at 10px.
  - "Chapter I–IV" at 8px.
  - "Read this chapter (III)" at 12px.
- **Departure Mono** (a pixel mono) for numeric tickers ("211", "9.262", "44.264", "+34%") and a keyboard-grid texture (26px, +7.8px tracking).
- No uppercase display type.

**Palette.**
- `--background: #f5f5f2`, `--foreground: #171717`, with text at 50–85% alpha of `rgb(38,35,35)`.
- Sections in the saturated sky blue `rgb(26,111,209)` of the pixel-art hero.
- Pixel-art illustration (park, laptop, sunflowers, rocket, satellite dish, bullet train) is the whole visual identity.
- It is light, so take the mechanics, not the palette.

**Grid.** Centred content about 1000px wide. Feature rows are `340px | 634px` alternating sides with a 78px gap. Card grids are 3-up at 24–40px gaps.

**Motion.**
- **Intro.** The pixel scene is static. Three glassy "Task Completed / Task running" toasts appear stacked with a slight 3D perspective tilt (absent at 600ms, present by 4s).
- **Hero edge.** A **dithered pixel "grass" edge** dissolves the hero into the cream page. A pixel-sky band returns later ("Build across industries").
- **Nav.** A segmented glass pill ("How to | Start | Build | Sell | Scale"). Hover fades in a highlight pill: `opacity 0.2s cubic-bezier(0,0,.2,1)` (measured). Text colour and weight transition in 0.06s.
- **Chapter cards.** On hover the card media **lifts 72px**: `transform 0.5s cubic-bezier(0.22,1,0.36,1)` (measured).
- **Ease set in CSS:** `(.23,1,.32,1)` ×23, `(.22,1,.36,1)` ×13, springy `(.34,1.3,.64,1)` and `(.34,1.56,.64,1)`. Durations 0.14 / 0.2 / 0.28 / 0.4 / 0.5s, and 460 / 700 / 800ms in JS.
- **Page transition.** None. The Next.js soft navigation was complete at 450ms with no animation (the t150 screenshot failed).
- **Guide pages.** A left sticky ToC with Roman-numeral chapters "(I) How to start", "(II) How to build", sub-items with ○/● state dots, and a sticky "Try in Cofounder →" button. A right-edge **tick-mark minimap** of scroll position. On mobile the ToC collapses to a sticky bar "How to run a company with Cofoun… [Try →]".

**How the work is presented.** Product UI, not portfolio: numbered chapters "1.0 Launch / 2.0 Grow / 3.0 Operate", each a two-column row with a live-looking UI mock (an agent graph with Design / Marketing / Operations nodes, an email campaign report showing "58%" open rate). Then an accordion of steps (2.1 Customer research, 2.2 Prospect discovery…). Then 4 chapter cards with pixel art ("Chapter 3 · How To Sell"). A customer logo row carries a "Case Studies →" pill.

**Word count.** Desktop fold 56, page 1,088 (1,336 after lazy content). Mobile fold 36, page 977. The wordiest site of the four.

**What makes it feel expensive.**
1. A single commissioned illustration language (pixel art) carried through hero, cards and section breaks, with dithered pixel edges instead of straight section borders.
2. Numbered-chapter information architecture (1.0 / 2.1 / Chapter III / (II)) in small, widely tracked Plex Mono at 50% alpha.
3. UI mocks that look like real product state (graphs, stats in a pixel mono).
4. Two-tone 40px statements at 80% and 50% alpha.
5. Soft expo-out eases `(.22,1,.36,1)` / `(.23,1,.32,1)` everywhere, with durations of 0.5s or less.
6. A long-form guide with a sticky Roman-numeral ToC and a tick minimap.

**Patterns.**

| # | Name | Mechanics | Portfolio application |
|---|---|---|---|
| C1 | Numbered-chapter IA in mono | "2.0 — GROW" 11px Plex Mono uppercase, +0.12em, 50% alpha above a 36–40px statement. Sub-steps "2.1…2.4" | Research section as "1.0 — INTERPRETABILITY", "2.0 — TRAINING", "3.0 — SYSTEMS", "4.0 — HARDWARE", with each demo as 1.1, 2.1 and so on. It gives a research-paper feel. |
| C2 | Two-tone alpha statement | Same size. Clause 1 at 80% alpha, clause 2 at 50% | "I build interpretability tools / and the infrastructure to run them at scale." |
| C3 | Floating status toasts | Glassy chips ("● Task Completed · New webpage") stacked with slight perspective, staggered in. Green status dot | Live status chips over the hero: "● Orbit · ISS pass in 12:04", "● ES sim · gen 214, reward 0.83", "● Index · 1.2B vectors". Real data, updated live. |
| C4 | Card media lift on hover | `translateY(-72px)` on the inner media over 0.5s `cubic-bezier(.22,1,.36,1)`, revealing the caption or CTA underneath | Demo cards: the preview lifts to reveal "▷ Run inline · ↗ Explainer · Paper". |
| C5 | Dithered pixel section edge | Bottom edge of the hero as a stepped, dithered mask (an image or `mask-image` with a pixel noise PNG) | On a dark site: a dithered edge where the ocean-sensing field or the orbit starfield dissolves into the page. Or dither the token strip's boundary. |
| C6 | Sticky Roman-numeral ToC with a tick minimap | Left ToC "(I) … (II) …" with ○/● dots. Right-edge ticks for sections, with the active tick highlighted | Long demo explainers (steering, loss masking), where the minimap ticks double as "cells" of the explainer. |
| C7 | Pixel-mono numeric tickers | Departure Mono for changing numbers ("9.262", "+34%") | All live numbers in demos (loss, recall@k, altitude km, SST °C) in a pixel or tabular mono so they read as instrument output. |
| C8 | Segmented glass nav with a hover pill | Nav items in one pill. A highlight span fades in `opacity .2s cubic-bezier(0,0,.2,1)` behind the hovered item | Nav: "Research · Work · Writing · Contact" in one pill on dark glass. |

---

## Cross-site takeaways for a dark ML-research portfolio

- **Dark and restrained:** Koto is the closest model. #060606 base, one type family in three widths, display capped at about 48px, two-tone titles, a mono metadata layer, and colour coming only from the work. For this portfolio the "work media" is the live demos, so they supply all the colour.
- **One accent, used as an event:** KODE's #FF4C00 appears almost only in the page wipe, the asterisk and "LONDON". Neon gives each item its own accent. Combined: one colour per demo, and the transition into a demo floods in that colour.
- **Live things as the hero media:** every studio's work cards are autoplaying video. The equivalent here is running demos, gated so that only the centred one animates (Koto's focus-dimming).
- **Transitions that keep continuity:** Koto's FLIP of the card media into the case hero is the most transferable. With a canvas demo, move the *same* running canvas so the state carries over.
- **Where mechanics were not observable:** I didn't see a custom cursor on Koto, KODE Media or Neon (Neon only has hero prev/next zones); Kode Immersive has a ring cursor. Mobile menus didn't open in the captures for Koto and KODE Media (the tap hit but the screenshot shows the page), so I don't report their mobile menu behaviour.

Scripts: `/tmp/studios/capture.mjs` (screens and video), `/tmp/studios/probe2.mjs` (bundle scan and measured hovers). Raw JSON reports are in `/tmp/studios/raw/*.json`.
