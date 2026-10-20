# Diagnosis v2: the site is overloaded

Measured 2026-09-28 on the production build (`vite preview`), with Playwright at 393×852 (mobile) and 1440×900 (desktop).
- **Words:** every word in `<main>`.
- **Elements:** visible text blocks, links, buttons and media, counted per viewport-height window.
- **Focal points:** type ≥ 28px or media ≥ 60k px² in a window.
- **Cards over 25 words:** any list item, row, card or step whose default text exceeds 25 words.

Script: `~/dev/portfolio-tools/density.mjs`; raw output in `audit/density-*.json`. The lab dock adds ~17 links on desktop and 3 on mobile to the first screen; the figures below subtract it.

## The main problem

Too much competes at once. Every section shows everything it knows by default: dates, orgs, bullets, metrics, tags, links, a demo, a caption. The reader has to do the editing the site should have done. Research is the part that should stand out, and it gets buried under equally loud experience rows and indexes.

## v4b "Narrative: the work"

| Measure | Mobile | Desktop |
|---|---|---|
| Page height | **14,473 px** (17 screens) | 13,630 px (16 screens) |
| Words on the home page | **1,615** | 1,677 |
| First screen: elements / links / focal points | ~83 / ~26 / **7** | ~63 / ~20 / 3 |
| Busiest screen | 309 words | 342 words |
| Cards over 25 words by default | **42** | 42 |

Words by section: hero 90 · story 1,035 · index 552.

- **Everything is shown twice.** The story (1,035 words) and the index (552 words) describe the same 15 milestones. Half the page repeats the other half.
- **Seven focal points on the first mobile screen:** the name, the proofs, the counters, the category legend, the axis bars and the chips all shout. The eye has no landing spot.
- **The steps default to paragraphs.** One step runs to 118 words. None of it is hidden behind interaction, so a skim reader scrolls 17 screens.
- **Chart chrome costs more than it earns.** The per-category counts, legend and axis bars are visual detail competing with the one thing that matters in each step, the work itself.

## v6 "Latent space"

| Measure | Mobile | Desktop |
|---|---|---|
| Page height | **11,678 px** (14 screens) | 9,658 px (11 screens) |
| Words on the home page | 1,307 | 1,323 |
| First screen: elements / links / focal points | ~50 / ~10 / 2 | ~70 / ~13 / 2 |
| Busiest screen | 120 words | 176 words |
| Cards over 25 words by default | **20** | 20 |

Words by section: top 97 · research 372 · systems 125 · work 349 · hardware 145 · earlier 212 · contact 23.

- **Seven sections for three ideas.** Research, systems, work, hardware and earlier are cluster names from the 3D scene, not reader needs. "Systems" (125 words) and "hardware" (145) each hold one or two items.
- **Experience rows default to ~33–37 words** (org, role, dates, line, metric, tags). Over the cap before a single tap.
- **The hero has two steering controls:** the floating α console and the demo below it. Two focal points doing one job.
- **Mobile gaps pad the page.** 58svh "viewing gaps" per cluster keep 11.7k px mostly empty, which reads as slow rather than calm.

## What made v9 and the timelapse rounds fail (do not repeat)

1. **Gimmicks over clarity.** Depth = time, city = embedding space, sky = chronology: each metaphor needed explaining, and when it didn't, the reader still had to decode it before reaching the facts.
2. **Heavy media as the page's structure.** Full-screen shaders, an 80-frame image sequence and point fields set the pacing, forcing sticky scrims, contrast fixes and long scroll runways around the content.
3. **Style competing with content.** Italic display names, glowing counters and colour-per-category made every section a performance. Nothing was quiet, so nothing was important.
4. **Measured cost.** Mobile LCP drifted past budget every time the media layer grew. The fixes (masks, deferred hydration, opacity tricks) were real work spent on atmosphere rather than on the work.

## Rules for every new variant (P1–P5)

1. **First screen, 393 px:** name, one-line description, and one row of actions: Resume (PDF, new tab), GitHub, LinkedIn, X, Email. Nothing else competes. A compact copy of the actions stays reachable at all times, via a sticky header or a small floating bar.
2. **One idea per section.** Target 4–5 sections on home: work (experience), research, projects, maybe about, contact. Cut anything that doesn't earn its place. Generous whitespace.
3. **Experience:** logo, role, org, dates, one line. Details on expand or hover.
4. **Research and projects:** title, one-line hook, the interactive demo. The write-up lives on its own page ("Read more").
5. **Hard cap: ≤ 25 words per card by default.** Anything longer goes behind disclosure.
6. **Density targets** (measured with the same script before handoff):
   - home ≤ 700 words;
   - ≤ 25 visible elements and ≤ 2 focal points per screen;
   - 0 cards over 25 words;
   - mobile page ≤ 8,000 px, which demos make unavoidable to some degree.
7. **Demos are the core.** Keep them all: steering, loss masking, ocean sensing, ES-LoRA, retrieval, and the CFAR tracker. They share one shell (frame, sizing, controls, type, caption format, lazy mount) so they read as one family. None loads before it's near the viewport.
8. **Logos:** full-colour official marks, consistent size and baseline, SVG where available, crisp at 2×/3×.
9. **Media:** no compression artifacts. Properly sized AVIF/WebP, checked at 2×.
10. **Motion serves reading:** entrances once, interactions responsive, no ambient loops, a reduced-motion equivalent for every effect. No metaphor that needs a legend.
