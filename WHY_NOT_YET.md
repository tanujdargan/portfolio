# Why nothing lands yet: v4b, v6, v9

Studied side by side at 1440 and 393 (captures in `public/board/v4b|v6|v9-*`), on 2026-09-27. Each of these three is the best at one thing. None is a website yet: each is a direction wearing a website's clothes.

---

## v4b "Narrative: the work"

**What it gets right**
- **The only honest story structure.** 2022 → 2026, told through the work, one milestone at a time. It answers the question a reviewer actually has: what has this person done lately, and is it compounding?
- **Numbers carry the milestones.** "$136.2M/yr", "1–4M QPS" and "In orbit" pass the playhead as flip counters, and the reader gets the metric before the prose.
- **Demos sit where they belong.** Retrieval appears at DEIA and ES at ES-LoRA, inside the chronology.

**What holds it back**
- **Everything is monospace.** Martian Mono display plus JetBrains Mono body means labels, headlines and paragraphs share one voice. It reads as a terminal log, not a person. There's no hierarchy between reading text and metadata.
- **Every milestone has the same weight.** Hack@JBCNOsh (2022) and Amazon Robotics get identical cards, identical spacing and an identical flip. The first big number on the page is "450+" from a high-school hackathon, the least important fact on the site, in the most prominent slot.
- **The pacing is mechanical and sparse.** A 44svh minimum per step leaves small text floating in a large void. It's 7,100 px on desktop and 14,200 px on mobile, which a 10-second skim never finishes.
- **Nothing personal.** There are no images, no first-person sentences beyond the hero, and no sense of what he is like or what he wants next.
- **Demo chrome is generic.** The shared demo frame looks the same as in every other variant, so the instrument doesn't feel native to the page.

## v6 "Latent space"

**What it gets right**
- **The strongest identity of any variant.** The scene is not decoration: it is the real Qwen2.5 activation data, and the α slider bends it while the real model answer types out. A reviewer sees the research running without being told about it.
- **The type pairing works.** Geist Mono for display and instrument labels, Newsreader for reading. The serif makes the prose feel written.
- **Restraint in the hero.** Name, one line, three proofs, links, with the scene as the right-hand half.

**What holds it back**
- **It feels like a demo.** The floating steering console in the hero duplicates the steering demo further down. Two controls do the same thing, and the hero reads as a tech showcase before it reads as a person.
- **The flight stops mattering after cluster 01.** Below the fold the clusters become section headings ("Industry", "Systems & retrieval") over plain lists, which reads like a CV under a starfield. The scene idles behind content it no longer explains.
- **Too long on mobile.** Deliberate 58svh "viewing gaps" per cluster push the page to 11,300 px.
- **No person, no light, no place.** It's all dark space, with no photograph and nothing that says who is behind the data.
- **The details are rough.** Overview labels overlap, and badges and links wrap inconsistently between sections.

## v9 "Depth"

**What it gets right**
- **The only variant with feeling.** A dusk sea with a moon glitter path is the first thing across all 11 variants that makes you stop. It's generative, calm, and unmistakably not a template.
- **The metaphor is his work.** Satellite to deep water is exactly his SOLIDS project, and the sensor probe turns it into an instrument you can use.
- **The italic display name** has more personality than any other hero.

**What holds it back**
- **The metaphor is explained, not felt.** "Depth is time. The surface is now. Every hundred metres…" is a paragraph of instructions. If a design needs a legend, the reader is working too hard.
- **Underwater, it becomes a timeline template.** The milestones are small, uniform cards alternating left and right of a line: the most common portfolio timeline there is, just darker. Below ~150 m the ground is almost black, and secondary text loses contrast.
- **The hero wastes the water.** The claim is small, and the proofs sit at the very bottom edge of the first screen. The shader gets the space the person should have.
- **Demos float.** The steering demo at the surface is a card in the sea, not part of it.
- **It's heavy for what it says.** A full-screen shader runs for the whole page, while the content that matters is text.

---

## Across all three

1. **No person.** There's no photo, no first-person line about what he's doing now and wants next, and nothing he made that isn't work. The Unsplash photos and the timelapses are the missing layer. They are dusk, moon and skyline, the same palette all three variants reach for synthetically.
2. **No hierarchy of importance.** Everything gets the same card. A finished site has 3 flagship stories told big: **Amazon** (production LLM system), **the research** (the instruments), and **MarmotSat** (hardware in orbit). The rest is an index.
3. **Demos feel like a gallery.** They are the best part of the site and are presented as embedded widgets. Each research piece needs one sentence of why before the instrument, the instrument at full measure, and one sentence of result after.
4. **Skim affordances are missing.** There are no logos. Scanning for "Amazon, RBC, UVic" means reading. Organisation marks would do in 200 ms what the rows do in 5 s.
5. **Too long.** Mobile pages run 11–14k px. Target ≤ 8,000 px on a 393 px phone for the home page; the depth lives in the write-ups.
6. **Copy is labels, not sentences.** "SIM ×90", "01 / 05", "100 M A YEAR". Instrumentation is good on the instruments and bad as the site's voice.
7. **Badges and flags leak into the reading experience.** The yellow "unverified" chips made every page look unfinished. They are now lab-only and off by default.

## What the combined site should be

**One sentence:** a calm, editorial, dark site with one living backdrop (v9's dusk, now his own timelapse and photographs) that holds real research instruments (v6's real-data interactivity), organised as a short story of the work with clear importance (v4b's chronology, with hierarchy).

- **Type:** a display face with character (a serif italic, as in v9), a readable body serif or sans (as in v6), and mono only for data and instrument labels. Three sizes on the home page, no more.
- **First screen (393 px):** name, one line in his voice, 3 proofs with org logos, links. Nothing decorative above the name. The timelapse or dusk sits behind it only when it costs nothing for LCP (poster first, sequence after paint).
- **Pacing:**
  - Now: Amazon, and Beri as the thing he's building.
  - Research: 5 instruments, each why → instrument → result.
  - Built: MarmotSat with the live tracker.
  - Earlier work as a dense index, then photography, then contact.
- **Density:** home ≤ 8k px on mobile. Research gets full-width instruments; everything else gets one line and a logo.
- **Personal layer:** the scroll-scrubbed timelapse as the thread between sections (dusk → night as the page goes from "now" to "earlier"), a photography section drawn from Unsplash and YouTube, and first-person sentences.
- **Details:** consistent link rows, one accent colour that means "live", real loading states, no orphan badges, and reduced motion as a designed still. It must pass the mobile Lighthouse budget, as every variant has.

Every C-candidate below states which of these it fixes and how.
