# P-variant brief (read fully before writing code)

You are building ONE full-site variant of tanujdargan.com: P1, P2, P3, P4 or P5. Other agents are building the others in parallel in the same repo, so the file rules are strict. The previous rounds failed because they were **overloaded**: too many words, too many elements, too many competing focal points, and gimmicks over clarity. This round is about restraint and craft.

## Read first
1. `DIAGNOSIS_V2.md`: the density audit and **the rules**. They are hard requirements, not suggestions.
2. `src/content/site.ts`: the only source of facts. Never invent or embellish. Write shorter copy from these facts where needed.
3. `src/variants/v4b/index.tsx`: the mechanics of the variant contract (page switch, Nav, Link, ResearchArticle, BeriCaseStudy, 404). Copy the mechanics, not the look. v4b and v6 are the references that were too crowded.
4. `docs/VARIANT_BRIEF.md`: the contract, SSR and performance lessons. Its "Hard requirements 1–3" (proof points on the first screen, "Beri co-founder", "≥3 interactive moments") are **superseded** by this brief.

## Files you may touch
- ONLY `src/variants/<your id>/**`, plus `public/<your id>/**` if you need static assets.
- Do NOT edit `src/shared`, `src/demos`, `src/lib`, `src/content`, `src/routes.ts`, `src/App.tsx`, `vite.config.ts`, `package.json` or other variants. If you need a shared change, work around it in your directory and say so in your report.
- No `npm install`. No `npm run build` (it clobbers `dist/` for everyone). No commits.
- `npx tsc --noEmit -p .` to type-check. Ignore errors in other variants' directories (they're mid-build).
- Fonts installed: @fontsource-variable/{geist, geist-mono, inter, inter-tight, instrument-sans, ibm-plex-sans, fraunces, newsreader, jetbrains-mono, martian-mono, space-grotesk}, @fontsource/{instrument-serif, ibm-plex-mono}. Use latin-only `@font-face` rules pointing at the `…-latin-wght-normal.woff2` files (see `v4b.css` top), with a metric-matched fallback `@font-face` using full local names. ≤ ~80 KB of fonts at first paint, at most 2 families.

## The rules (from the owner, verbatim in spirit)
1. **First screen (393×852):** your name, a one-line description, and ONE row of actions: **Resume** (the PDF, new tab), **GitHub**, **LinkedIn**, **X**, **Email**. Nothing else competes. A compact copy of the actions stays reachable at all times via a sticky header or a small floating bar, without clutter. Use `<Links>` from `src/shared/Links`.
2. **One idea per section, generous whitespace.** 4–5 home sections: work (experience), research, projects, maybe about, contact. Cut what doesn't earn its place: "earlier" and community can be one quiet line or a disclosure, or cut.
3. **Experience entries:** logo tile, role, org, dates, one line. Bullets and the metric go behind expand (tap) or hover. Use `<OrgTile org={e.logo} />` from `src/shared/OrgLogo`: full-colour official marks on uniform 40×40 tiles (pass `size` for 32–44). Don't use the old one-ink `OrgLogo`.
4. **Research and projects:** title, one-line hook, the interactive demo. The write-up lives on its own page (`/research/<slug>`, rendered by `ResearchArticle`) behind "Read more" / "Read the write-up".
5. **Hard cap: ≤ 25 words per card by default.** Longer text goes behind disclosure.
6. **Density targets** (measure them, see below): home copy ≤ 700 words excluding demo internals; ≤ 25 visible elements and ≤ 2 focal points per screen; 0 cards over 25 words; mobile page ≤ 8,000 px (demos make some of this unavoidable, so show some demos on tap instead of all inline).
7. **Demos are the core.** All six stay reachable from home: steering, lossmask (research), es, retrieval, ocean (research), and **orbit** (the live MarmotSat tracker, a project: the CubeSat whose onboard-computer firmware Tanuj led). Use `<Demo kind=… />` from `src/demos/Demo`. It lazy-mounts near the viewport and already renders the shared shell (`Frame`: title, provenance badge, controls, body, a one-line caption and a "Method" disclosure). Don't restyle demo internals beyond the tokens. Nothing heavy on first paint. To keep the page short you may mount a demo on tap ("Try it") instead of inline. Keep the slot's reserved height so nothing shifts.
8. **Logos:** tiles only (rule 3). Consistent size and alignment.
9. **Media:** you shouldn't need any. If you add images, use properly sized AVIF/WebP, check them at 2×, and reserve their size.
10. **Motion serves reading.** Entrances once, responsive interactions, no ambient loops, and a reduced-motion equivalent for every effect. No metaphor that needs a legend: no depth = time, no city = embedding space, no glowing counters, no italic display names, no colour-per-category rainbow.
11. **Dark.** The owner strongly prefers dark mode and dislikes light or paper-white editorial themes. Every P variant is dark. "Editorial" means editorial typography on a dark ground.
12. **Beri:** show it only inside `<Show when="beri">` (it's on in production). Describe it as "a food app I'm building" (see `beri.oneLiner`). NEVER "co-founder" or "founder". It links to `${base}/beri`.
13. Copy: short, specific, confident, no buzzwords ("passionate", "leveraging", "cutting-edge", "innovative", "crafting", "journey"). Name the model, the number, the place. `unverified` items render `<Flag note=…/>` (lab-only badge, off by default).

## Contract (unchanged)
- `src/variants/<id>/index.tsx` default-exports `({ page, base }: VariantProps)`. It handles `page.kind` = `home | research | beri | notfound`. Research pages: `<ResearchArticle slug={page.slug} base={base} />`; Beri: `<BeriCaseStudy base={base} />`; both wrapped in your chrome.
- Root `<div className="<id>">`. Scope ALL CSS under `.<id>` and prefix classes `<id>-`. Home content goes in `<main id="main">` with a `<section id=…>` per section (the density tool reads them).
- Tokens on your root, because the demos, article and case study read them: `--bg --bg-2 --fg --fg-2 --fg-3 --line --accent --font-display --font-body --font-mono --radius --measure --display-weight`.
- Internal links: `<Link to={`${base}/…`}>` from `src/lib/router`. In-page section jumps: `scrollIntoView` with preventDefault (a hash change re-routes). See `jump()` in v4b.
- Motion: `useMotionPrefs()` → `{ reduced, k, dur(), spring() }`. The lab's Subtle/Default/Expressive toggle must visibly change your motion. In CSS use `var(--k, 1)` and `var(--t, 1)`; **never write default values for them**.
- SSR: no `window`/`document` at module scope or during render. **LCP rule:** CSS entrance keyframes must start at `opacity: 0.01`, never 0 (Chrome doesn't count opacity-0 text at first paint, and the late repaint becomes LCP; measured +1 s). Never use Framer `initial={{opacity:0}}` on hero text. Hero text is real DOM text in the static HTML.
- Accessibility: landmarks, a skip link, focus-visible styles, 44px touch targets on mobile, contrast ≥ 4.5:1 for body text, `aria-expanded` on disclosures (native `<details>` is fine), no horizontal overflow at 360px.
- Performance: transform/opacity-only animation; no scroll listeners doing layout (IntersectionObserver / CSS scroll-driven animations are fine); keep your chunk lean. Heavy work after first paint.

## Verify before reporting (loop until it's genuinely good)
- Dev server on YOUR port: `npx vite --port <port> --strictPort` (background). Check `/lab/<id>`, `/lab/<id>/research/activation-steering` and `/lab/<id>/beri`.
- Screenshots: `node ~/dev/portfolio-tools/capture.mjs http://localhost:<port>/lab/<id> /tmp/<id> <id> --no-video` (desktop Chromium plus mobile WebKit, fold and full page, console error count). `node ~/dev/portfolio-tools/shot.mjs <url> <selector> <out.png> [width]` captures one element. LOOK at them with the Read tool: mobile fold, desktop fold, full page, and an expanded experience row. Iterate.
- Density: `node ~/dev/portfolio-tools/density.mjs http://localhost:<port>/lab/<id> <id> > /tmp/<id>-density.json`. Read `copyWords`, `height`, the per-window `elements`/`focal`, and `longCards`. Hit the targets in rule 6 (the lab dock adds ~17 links on desktop and 3 on mobile to the first window; subtract them).
- Zero console errors. Test `?motion=subtle` and `?motion=expressive`, and emulate reduced motion.
- Final report (≤ 25 lines): the idea, the type system and palette, the section list with word counts, the density numbers (mobile height, copy words, max elements/focal per screen, long cards), the interactions, known issues, and any shared change you wished for.

---

## Directions

### P1 · Refined
v4b/v6 with every DIAGNOSIS_V2 problem fixed: this is the "just make it good" baseline. Calm, clean, fast. Graphite ground, one quiet accent, Geist + Geist Mono (or one sans + one mono of your choice). Hero: name, line, actions. Sections: Work (six tiles and rows, expandable), Research (five items: steering and loss-masking demos inline, the other three on tap), Projects (MarmotSat with the live orbit tracker; Beri; 3–4 earlier projects as one-line rows), Contact. A slim sticky header appears after the hero with the name and icon links. It should feel finished, the way a senior designer's own site feels: nothing extra.

### P2 · SWE classic
The best software engineer's portfolio: crisp type, clear hierarchy, experience and projects scannable in seconds. Think of the classic two-column layout, done better: on desktop, a left column pinned with name, line, actions and a section index that tracks scroll (IntersectionObserver); on the right, a scrolling column with Experience (a date gutter, then logo tile, role · org, one line; the whole row is a disclosure), Research and Projects (title, hook, stack chips ≤ 3, "Run demo" mounts the demo inline, "Write-up →"). On mobile it stacks with a compact sticky top bar. Inter / Inter Tight or IBM Plex Sans + a mono for dates. Tabular numerals. Hover states that are precise, not flashy. A recruiter should scan the whole page in 20 seconds.

### P3 · Research-forward
The demos are the hero. After a first screen that obeys rule 1 (on desktop the first demo may peek below the fold), the page is a sequence of research "plates", one per screen: a small numeral, the title, a one-line hook, the demo large and centred, and "Read the write-up →". Restrained editorial layout on a dark ground, a lot of air, a narrow measure, a serif for titles (Newsreader or Fraunces at text optical size, upright, never italic display) with a quiet sans or mono for meta. Order: steering, loss-masking, then ES, retrieval, ocean, then the orbit tracker as "Also: hardware in orbit". Experience comes after the research as a quiet, compact list with tiles (expand for detail). Mobile height will be higher here because of the demos. Mount the lower demos on tap to stay near the target, and report the height.

### P4 · Creative but restrained
Distinctive motion and interaction, still minimal: the creativity lives in the details, not in gimmicks. Candidates (pick 3–4 and execute them perfectly): experience rows that expand with a shared-layout animation (Framer `layout`) and a tile that slides into place; section headings that settle in with a variable-font weight or width shift as they enter; an action row where each link has a precise micro-interaction (the icon nudges, the Resume shows "PDF ↗" on hover, Email copies with a morph to "Copied"); a scroll-linked progress hairline in the sticky bar; a cursor-following preview of the demo on hover over a research title (desktop only, with a tap-to-open equivalent on mobile). Everything obeys the Subtle/Default/Expressive toggle and reduced motion. One sans (Instrument Sans, Space Grotesk or Geist) plus a mono. Page structure as simple as P1.

### P5 · Wildcard
Your best idea for an unmistakably crafted portfolio, within all the rules. The orchestrator's suggestion, which you may beat: **"Specimens."** Below the rule-1 first screen, the research and projects appear as a calm grid of specimen cards. Each card has a title, a one-line hook and a small static poster drawn in SVG from the same source as its demo: real data in `src/data/*.json` for steering (projection curve), loss masking (token strip) and the TLE (MarmotSat ground track via `src/demos/orbit/model.ts`); for the illustrative ES, retrieval and ocean demos, the demo's own generator and parameters. Posters render at SSR time, so it's zero-JS and crisp. Tapping a card expands it in place (View Transitions API or a Framer layout animation, with a reduced-motion crossfade) into the full live demo with "Read the write-up →". Experience is a compact tiled list. It's crafted because every poster is real data, drawn precisely, not decoration. Whatever you choose: no legend-needing metaphor, no heavy media, ≤ 2 focal points per screen.
