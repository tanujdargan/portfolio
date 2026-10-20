# Why v6 and P2 work (and what S1+ must keep)

Out of 20+ variants, the owner kept **v6 "Latent space"** and **P2 "SWE classic"** (v4b is "fine"). They look nothing alike, so the preference isn't about a look. Below is what I think the two share and what each gets right on its own, read from the code and the captures in `public/board/`. Every S variant is checked against this list.

## What they share

1. **Dark, cool and technical, never cosy.** v6 is near-black with a star-dust point field. P2 is cool graphite. Neither uses paper, cream, warm editorial serif pages, or photography. (See memory: the owner strongly prefers dark and dislikes light/editorial.)
2. **Mono carries the facts.** Dates, metrics, indexes and coordinates are set in a monospaced face with tabular figures (Geist Mono in both). Mono reads as "engineer's instrument"; the proportional face is kept for prose. Numbers line up.
3. **An index you can see.** v6 has `00 Origin 01 02 03…` stops in the top bar with the active one lit. P2 has the `01 —— EXPERIENCE` scroll index in the pinned column, whose rule grows on the active item. Both tell you where you are and how much there is, at a glance, without a hamburger.
4. **The work is real, and it says so.** v6's scene *is* 120 real Qwen2.5-1.5B activations, and the HUD types out real steered outputs. P2 puts a "REAL MODEL OUTPUTS" badge on the demo. Nothing is decoration pretending to be data.
5. **Links are always one tap away and small.** v6 keeps five icon links in the top bar. P2 puts Resume as the only filled button and the other four as quiet icon squares. The name is never a call to action.
6. **Precision in the small moves.** P2 uses `cubic-bezier(.23,1,.32,1)`, 600 ms rises staggered 60 ms, springs on disclosures, and 150 ms colour hovers. v6 decodes titles from glyph noise once, on arrival. Nothing bounces for fun.

## What v6 gets right on its own

- **A signature interaction.** Dragging α bends a real embedding space while a real model's answer types out, flipping from "As an AI language model…" to "Ah, the sweet aroma of fresh coffee…". It is the one thing on any version of the site someone would screen-record.
- **Atmosphere with a reason.** The field isn't a background effect: its clusters are the sections, and the cursor is literally a query vector. Motion carries meaning.
- **The warp transition.** Opening a write-up makes the points rush past the camera while the page dissolves. It's a page transition that belongs to the site's idea.
- **Instrument-panel chrome:** coordinates (`centroid (6, 0, −70)`), `z +30`, a HUD in mono. It feels like software, not a brochure.

**v6's failures (don't repeat):** a giant name in the hero, seven sections for three ideas, two steering controls on one screen, 58svh empty "viewing gaps" on mobile, experience rows at 33–37 words.

## What P2 gets right on its own

- **Scannable in 20 seconds.** Date gutter, then a logo tile, then role · org, then one line, then +. The same grid runs down the whole page, so the eye learns it once.
- **Full-colour logos on uniform tiles.** Amazon, RBC, CfAR, UVic and MLH at 36px tiles with rounded corners, sitting on one baseline. Instantly credible.
- **Demos on demand.** "▶ Run demo" mounts the demo in place and "Write-up →" sits next to it. The demo is one tap away, not in the way.
- **A pinned identity column.** Name, one line, actions and index stay put while the work scrolls past. The work gets the wide column.
- **Nothing extra.** Four sections and one accent colour, with the copy cut to the bone.

**P2's failures (why it felt plain):** the name is still the biggest thing on screen. Hover is a colour change and little else. Sections just appear. No transition into a write-up. The demos are the most interesting thing on the site, but they're styled like the rest of the list rather than presented as exhibits.

## What v4b adds (it's "fine")

The time axis: the work laid out as a chronology, scroll-pinned, with each demo appearing at its milestone. The idea that the work has a shape over time is worth borrowing as a *navigation* device. It shouldn't be a 17-screen story again.

## The rules this gives S1+

| Keep | From | How S1+ must do it |
|---|---|---|
| Dark, cool, technical | both | near-black or graphite ground, one accent at most, no paper or warm editorial |
| Mono for facts, tabular figures | both | Geist Mono or JetBrains Mono for dates, metrics, indexes and coordinates |
| Visible index, active state | both | a numbered index with a live active marker, in the top bar or a rail |
| Real data, labelled | both | shared `Frame` provenance badges; any scene drawn from real data where possible |
| Small, always-there links | both | first screen, compact, never the focal point |
| A signature interaction with meaning | v6 | the effect must be about the work (steering, vectors, orbit, tokens), not generic eye candy |
| Page transition that belongs to the idea | v6 | custom transition into write-ups, driven by the variant's own visual idea |
| Scannable experience grid | P2 | logo tile, role · org, dates, one line; details on interaction |
| Demos on demand, presented as exhibits | P2 + new | index rows that come alive on hover, then open into the demo |
| Precise easing | P2 | expo-out family `cubic-bezier(.23,1,.32,1)` / `(.16,1,.3,1)`, and motion scaled by `--k` and `--t` |

**Fix in every S variant:** the name is small (nav-level or a signature). The first screen is about the work, not the person. Hover does something worth doing. Every section has a transition. Type moves.
