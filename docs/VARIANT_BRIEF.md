# Variant brief (read fully before writing code)

You are building ONE full-site variant of tanujdargan.com. Other agents are building the other variants in parallel in the same repo, so the file rules below are strict.

## Read first
- `PORTFOLIO_DIAGNOSIS.md`: what's wrong with the current site.
- `PORTFOLIO_TASTE.md`: principles (§2), motion tokens (§3), patterns P01–P31 (§4), type systems (§5), anti-patterns (§6). Use the tokens, and cite the pattern IDs you use in a comment at the top of your index.tsx.
- `src/content/site.ts`: THE content. Every variant shows the same facts. Never invent facts. Write copy per variant, but only from these facts. Anything marked `unverified` must render its `<Flag>` (lab-only marker).
- `src/variants/v0/index.tsx` + `v0.css`: the reference implementation of the contract. Copy its mechanics, not its look.
- The owner strongly prefers dark themes. Every variant is dark. "Editorial" means editorial typography on a dark ground, never paper-white.

## Files you may touch
- ONLY `src/variants/<your id>/**` (replace the placeholder `index.tsx`, add CSS or components there) and, if you need static assets, `public/<your id>/**`.
- Do NOT edit `src/shared`, `src/demos`, `src/lib`, `src/content`, `src/routes.ts`, `src/App.tsx`, `index.html`, `package.json`, `vite.config.ts`, or other variants. If you need a shared change, work around it inside your directory and mention it in your final report.
- Do NOT run `npm install` except `three` (already installed). Fonts already installed: @fontsource-variable/{geist,geist-mono,newsreader,jetbrains-mono,instrument-sans,martian-mono,inter-tight,fraunces,onest,ibm-plex-sans}, @fontsource/{instrument-serif,ibm-plex-mono}. If the taste doc's pairing needs a font that isn't installed, pick from these instead. Do not add packages.
- Do NOT run `npm run build` (it clobbers `dist/` for everyone). Verify with `npx tsc --noEmit` (ignore errors outside your directory) and a dev server on your assigned port.
- Do NOT commit. The orchestrator commits.

## Contract
`src/variants/<id>/index.tsx` default-exports `({ page, base }: VariantProps) => JSX` (see `src/routes.ts`).
- `page.kind`: `'home' | 'research' | 'beri' | 'notfound'`. Research pages: render `<ResearchArticle slug={page.slug} base={base} />` from `src/shared/ResearchArticle`, wrapped in your chrome (nav/footer). Beri: `<BeriCaseStudy base={base} />`. You may add variant-specific framing around them, but reuse them, since they hold the write-ups.
- Internal links use `<Link to={`${base}/...`}>` from `src/lib/router`. `base` is `/lab/<id>` in the lab and `''` in production.
- Root element: `<div className="<id>">`. Scope ALL CSS under `.<id>` (variants' CSS coexist in one document when switching in the lab). Import fonts in your index.tsx.
- Set these tokens on your root class, because the shared article, Beri case study and demos read them: `--bg --bg-2 --fg --fg-2 --fg-3 --line --accent --font-display --font-body --font-mono --radius --measure --display-weight`.
- Demos: `<Demo kind="steering|lossmask|es|retrieval" />` from `src/demos/Demo` (lazy, themed by your tokens). `hero` prop on steering changes its title. `compact` is for narrow placements.
- Links: `<Links mode="icon|label|short|both" className=... />` from `src/shared/Links` renders resume/email/GitHub/LinkedIn/X.
- Motion: `useMotionPrefs()` from `src/lib/motion` gives `{ level, reduced, k, dur(), spring() }`. The lab's Subtle/Default/Expressive toggle MUST visibly change your motion. Scale distances by `k`, durations via `dur()`, springs via `spring()`. In CSS use `var(--k, 1)` and `var(--t, 1)`, which are set on `<html>`. Under reduced motion, use crossfades (never a dead page). Canvas or WebGL loops pause offscreen and when reduced.
- SSR: your component is rendered to static HTML with `renderToString`. No `window`/`document` at module scope or during render. Browser-only work goes in `useEffect`. Hero text must be visible in the static HTML. Don't start the LCP text at opacity 0 via Framer `initial` (that delays LCP until JS runs). Use CSS keyframe entrances (they run at first paint, see `.v0-in`) or animate only non-LCP elements.

## Hard requirements
1. **Recruiter test (mobile 393×852, iPhone Safari):** within the first screen, show the name, what he does (one line), the 3 proof points (Amazon Robotics AI + return offer · Beri co-founder · interpretability research), and one-tap links to resume, email, GitHub, LinkedIn and X. Links must stay one tap away while scrolling (sticky nav icons, a dock, or equivalent).
2. Same content as every other variant: proof points, research (5 items, linking to write-ups), Beri (linking to `/beri`), engineering, community, earlier work (demoted), contact.
3. At least 3 genuine interactive moments beyond hover colour, e.g. a demo, a scrubbable thing, an expanding row, copy-email morph, ⌘K, a cursor preview, a scroll-driven figure. At least one research demo on the home page.
4. A distinct type system and a distinct scale and pacing from the other variants (see your direction below).
5. Performance: no layout shift (reserve media sizes), transform/opacity-only animation, no scroll listeners doing layout. 60fps on a mid phone. Keep your JS chunk lean.
6. Accessibility: semantic landmarks, focus-visible styles, 44px touch targets on mobile, `aria` on custom controls, colour contrast ≥ 4.5:1 for body text.
7. Copy: short, specific, confident, and free of buzzwords. Never write "passionate", "leveraging", "cutting-edge", "innovative", "crafting" or "journey". Name the model, the number, the place.
8. No horizontal overflow at 360px.

## Verify before reporting
- `npx vite --port <your port> --strictPort` (background). Check `/lab/<id>`, `/lab/<id>/research/activation-steering`, and `/lab/<id>/beri`.
- Screenshots: `node ~/dev/portfolio-tools/capture.mjs http://localhost:<port>/lab/<id> /tmp/<id> <id> --no-video` gives desktop (Chromium) and mobile (WebKit iPhone 15) fold and full-page PNGs, plus the console error count. `node ~/dev/portfolio-tools/shot.mjs <url> <selector> <out.png> [width]` captures a single element. LOOK at the screenshots (Read tool) and iterate until it's genuinely good at both sizes. Zero console errors.
- Test with reduced motion: add `?motion=subtle`, and emulate reduced motion in a playwright snippet if you can.
- Final report (≤ 20 lines): what you built, the type system, the 3+ interactive moments, the patterns used, the known issues, and any shared change you wished for.
