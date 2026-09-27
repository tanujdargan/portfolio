# Patterns for V8 "Billion vectors"

Same format as PORTFOLIO_TASTE.md §4. Mobbin references were pulled with the Mobbin MCP (web platform, September 2026). Motion on Mobbin refs is inferred from the frames and marked *(inferred)*.

References used:
- Command palettes: Mintlify [screen](https://mobbin.com/screens/7c7ad31f-9dfe-4be7-83d7-6002fe31d4d0), fal [screen](https://mobbin.com/screens/d8e46a56-c6c6-4db3-b85f-83bd6cedc01f), Dropbox Dash [screen](https://mobbin.com/screens/489be514-9c73-4642-885c-e79872cf350f), Higgsfield [screen](https://mobbin.com/screens/ed02d9e2-8743-439b-a09d-a621d673a641), v0 [screen](https://mobbin.com/screens/29db691c-e7fb-4ee3-9f4b-e16c4970b92a).
- Search as the hero: Campsite [section](https://mobbin.com/sites/sections/e4547810-67d9-46bc-b103-77bb719fe9a6), Airbnb Resource Center [section](https://mobbin.com/sites/sections/04ec26fb-062e-4210-815d-08ef23fa0888), Serus [section](https://mobbin.com/sites/sections/59e1bf61-234b-4bc6-8190-d88dea1ccbef), mymind [section](https://mobbin.com/sites/sections/191d027d-69c2-4609-b3b6-60e57d42521e).
- Particle heroes: Squarespace [section](https://mobbin.com/sites/sections/c89f9f86-b4f8-4d83-ae11-71ba2fb6f5f3), Grok [section](https://mobbin.com/sites/sections/30ab578c-5e08-4070-905a-146bc41a8e12).
- Live counters and dashboards: Supabase [screen](https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9), Mintlify analytics [screen](https://mobbin.com/screens/03b084b9-d5ed-41be-a9ca-43445af854f2), Plain [screen](https://mobbin.com/screens/e892500e-f820-4e3e-af83-973bf50ed22e), Railway [screen](https://mobbin.com/screens/dd6801ce-350b-479d-b296-7210dbb2c252).
- Result lists: Basecamp [screen](https://mobbin.com/screens/71e7649e-4e4f-450c-92d1-d1e23b6338c0), Perplexity [screen](https://mobbin.com/screens/f8838e0b-1127-444d-80a1-e76f309c4030).

---

**V8-P1 Search is the nav.** *Src:* Campsite (search box as the hero object, "Search projects / people / tags" rows), Airbnb Resource Center (one input, suggestion chips under it), Mintlify and fal palettes (grouped rows, `ESC` pill, footer key hints).
- *Does/why:* The top bar holds one wide field, "Search the index", with example queries in grey and a `/` key hint. There are no section links. Every page is reachable as a search result, so the navigation shows off the retrieval work instead of describing it. Campsite and Airbnb show that a single field with 3–5 chips reads as "type here" at once. The palettes show the row anatomy: a title, a grey context line, a right-aligned meta column.
- *Fits:* top bar on every page; hero chips (`steering · amazon · satellite · retrieval`); 404 ("Search the index").
- *Build:*
  - A trigger button opens a `role="dialog"` with a `role="combobox"` input and a `role="listbox"` of options (`aria-activedescendant`, arrows, Enter). `/` and ⌘K open it from anywhere, Esc closes it, and Tab is trapped inside.
  - Panel: 600px wide, pinned top-left on desktop so the field stays visible on the right. Full-screen on mobile, with a transparent 26svh "window" band between the controls and the results so the retrieval animation shows on phones.
  - Enter animation: `translateY(-10px·k) scale(.985) → 0`, 260ms `ease-drawer`. Rows stagger at 40ms.
  - **RM:** fade only; the field cuts instead of flying.

**V8-P2 Retrieval replay.** *Src:* Grok (lines radiating from one point to scattered nodes), Squarespace (a dense point sphere with nothing else on screen); the IVF/CAGRA mechanics come from Tanuj's cuVS work.
- *Does/why:* A query shows the algorithm that answered it. The query lands as a white ring, the IVF coarse quantiser lights the `nprobe` nearest lists one by one, a greedy graph walk draws its hops (rejected neighbours in faint ink, the taken path in accent), and edges fan out to the top-k results, which get labels in the field. The camera flies to the query, and on selection it flies into the chosen vector before the route changes. Grok's radial lines show that edges alone can carry a hero. Here they carry meaning.
- *Fits:* search dialog on every page; the field is loaded on demand on write-up pages.
- *Build:*
  - One timeline in the render loop: probe `i` ramps at `0.12 + i·0.065 s`, then each hop takes 0.13s, then results reveal. Everything is scaled by the motion level's `t`.
  - Probe intensity is a `vec4[16]` uniform read per point by cell id. Hops are one `LINES` buffer whose vertex shader extends each segment by `clamp(uProg − order)`.
  - Result labels are DOM spans positioned from the same projection each frame, nudged apart when they collide.
  - **RM:** the final state appears at once, with a 220ms canvas crossfade in place of the flight.

**V8-P3 Counters that say what they are.** *Src:* Supabase (big number with a small uppercase label), Mintlify analytics and Plain (stat tiles with a unit and context line), Railway (live cost tiles).
- *Does/why:* Every number carries a provenance tag: **simulated** (the toy index: lists probed, hops, fraction read, recall against an exact scan), **measured** (the scoring time in your browser), **illustrative** (at 1B vectors on 8+ GPUs, the lab's measured 1–4M QPS means 10,000 such queries take 2.5–10 ms of GPU time). Dashboards earn trust by pairing each number with its unit and scope, and a research portfolio needs that more than a SaaS console does.
- *Fits:* search stats footer; the descent counter ("vectors in view, implied at 1B scale, the field draws ~1M"); the live field readout ("drawing 1,048,576 points · 60 fps · webgl2").
- *Build:*
  - Tags are 9.5px mono pills. Simulated uses the accent, measured a green, illustrative a neutral grey.
  - Numbers use tabular figures. The stats fade from 35% to 100% when the replay finishes.
  - **RM:** identical (text only).

**V8-P4 Scroll descent, 1B → 1.** *Src:* Squarespace (a single point cloud that fills the viewport), Supabase (one giant number as the headline).
- *Does/why:* Below the hero, a 260svh sticky stage turns scroll into a camera fall. The target rotates to centre by 45%, distance shrinks on a log scale from 9.6 to 0.075 units, a giant counter drops from 1,000,000,000 toward 1, and three captions state the facts in order. At the end, the vector under the crosshair becomes the DEIA project card with its six measured numbers. The page tells the scale story with the reader's own thumb.
- *Fits:* home, between the hero and the document layer.
- *Build:*
  - A passive scroll listener, rAF-throttled, reads `scrollY` against offsets cached on resize, writes `--p` on the stage, and hands `p` to the engine. There are no layout reads on scroll.
  - Captions and the card animate in CSS from `--p` (`clamp()`/`min()` opacity windows).
  - **RM:** `p` is quantised to 4 steps (1B, 1M, 1K, 1), each a crossfade. Captions and the card fade without travel.

**V8-P5 Nearest-neighbour halo.** *Src:* PORTFOLIO_TASTE P04/P18 (cursor labels that are useful); Grok (bright nodes among faint ones).
- *Does/why:* On fine pointers, a 120px ring follows the cursor and points inside it brighten and warm in the vertex shader. When a site vector is within 60px, the ring snaps to 34px around it and names it. Clicking empty field space opens that vector. The only thing that follows the cursor is a retrieval query.
- *Fits:* the hero and descent stage.
- *Build:*
  - `uMouse` in device pixels; per point `halo = 1 − smoothstep(0, 70·dpr, dist)` scales size and alpha.
  - The nearest vector is picked on the CPU from ~28 projected doc positions per frame. The ring eases with `1 − e^(−16·dt)`.
  - **RM:** the ring jumps rather than eases. Hidden on coarse pointers.

**V8-P6 The plain index.** *Src:* Basecamp and Perplexity result pages (dense, typographic lists with context lines).
- *Does/why:* Every vector the search can return is also printed as an ordinary link list, grouped by district (interpretability, retrieval + systems, industry, space + earth, community, products, "you are here"). It is the no-WebGL, no-JS and screen-reader route through the whole site, and it makes the metaphor honest: the index is real and readable.
- *Fits:* home, before Contact; the search dialog's list works the same without the canvas.
- *Build:*
  - CSS columns (`3 × 260px`), 44px rows, mono cell ids in the gutter.
  - Content is filtered by the same flags as the search pool (`?show=beri,vikelabs,cde`).
  - **RM:** static.
