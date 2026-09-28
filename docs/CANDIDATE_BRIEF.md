# Candidate brief: convergence round (C1–C4)

You are building ONE finished candidate for tanujdargan.com. This is not exploration. The bar is **ship it today**: finished details, real copy, no placeholder sections, no rough edges on mobile.

## Read first (in order)
1. `WHY_NOT_YET.md`. Your candidate must fix every item in "Across all three". Your final report must say how, point by point.
2. `docs/VARIANT_BRIEF.md` (contract, SSR rules, file rules) and its pass-2 addendum (content hooks, flags, perf lessons). Everything there still applies.
3. The three favourites you synthesise from. Read the code and look at the lab:
   - `src/variants/v4b`: story of the work over time, flip-counter metrics.
   - `src/variants/v6`: real activation data as the scene, Geist Mono + Newsreader pairing.
   - `src/variants/v9`: dusk-ocean feeling, italic display name, ocean sensor.

   Copy techniques and code INTO your directory freely. Never import from another variant.
4. `src/content/site.ts` holds the only facts. Use `useProof()`, `useCommunity()`, `useMilestones()`, `experience` (with `logo`), `research`, `engineering`, `earlier`, `beri`, `links`, `workLinkOrder`.

## Files you may touch
- ONLY `src/variants/<your id>/**` and `public/<your id>/**`.
- No new npm packages. Installed and usable: three, satellite.js (already wrapped by the orbit demo), framer-motion, the fonts listed in VARIANT_BRIEF.
- Don't run `npm run build` and don't commit.

## Shared pieces built for this round (use them, don't rebuild them)
- **Research instruments** via `<Demo kind="…" />` from `src/demos/Demo`:
  - `steering` (emotion/persona directions) and `lossmask` ("Does loss masking shape how a model talks about being shut down?"): **must keep, as is.**
  - `ocean`: v9's satellite-to-seabed sensor, lifted into a shared demo. **Must keep.**
  - `es` (ES-LoRA) and `retrieval` (billion-vector IVF).
  - `orbit`: live MarmotSat tracker (CelesTrak TLE, satellite.js SGP4, 3D globe, next pass over Victoria). It's being built in parallel; until it lands it renders nothing, so reserve its space with `--demo-h-orbit`. It's the **CFAR/MarmotSat** interactive.

  Every research project gets its instrument on the home page or one tap away (an expandable row counts, but the steering, loss-masking and ocean pieces must be reachable from home).
- **Org logos:** `<OrgLogo org={e.logo} height={18} />` from `src/shared/OrgLogo` (amazon, rbc, uvic, mlh, airflow, pearcare). Monochrome via `currentColor`. Every experience entry shows its mark.
- **Photography:**
  - `<ScrollTimelapse progress={motionValue} priority? position? className />` from `src/shared/ScrollTimelapse`. The caller sizes the box. Tanuj's Toronto skyline, golden hour → night, 0 → 1. The data and caption are in `src/data/timelapse.json`.
  - `src/data/unsplash.json`: 20 of his Unsplash photos (dusk, moon, skylines). Use `src + '?w=800&q=70&auto=format'`, with `aspect` for reserved space. Profile: https://unsplash.com/@tanuj_dargan (76 photos).
  - `src/data/youtube.json`: 8 of his timelapse videos (Mumbai day-to-night, 24 h West Mumbai, Cyclone Nisarga, YYZ lightning, moonrise…) with `thumb` and `url`. Link out; no iframes.
- **Links:** 7 now, adding YouTube and Unsplash. Use `<Links only={workLinkOrder} />` in tight headers; YouTube and Unsplash must still be one tap away (e.g. in the photography section and footer).

## Non-negotiables
1. **Recruiter test on a 393×659 visible area (iPhone 15 Safari):** name, one line in his voice, the 3 proofs from `useProof()` (Amazon, MarmotSat in orbit, research) with logos where they apply, and one-tap links. Nothing decorative above the name.
2. **Hierarchy, not a feed.** Three flagship stories told big:
   - Amazon Robotics (an LLM planning assistant in production at 180+ sites, $136.2M/yr projected, return offer);
   - the research (instruments);
   - MarmotSat (firmware he led, now in orbit, live tracker).

   Everything else is a dense, logo-led index. Beri is shown as "a food app I'm building", with a link to the case study at `${base}/beri`. **Never** call Beri co-founded, and never use "founder" for it.
3. **Personal layer:** the timelapse and photographs are part of the structure, not a gallery tacked on. There's a photography section with Unsplash photos and YouTube timelapses, linking to both profiles.
4. **Voice:** first person, specific, short. No buzzwords. No instrument jargon as the site's voice: keep "α", "λp" and "nprobe" inside the instruments.
5. **Length:** home ≤ ~8,000 px tall at 393 px wide. The depth lives in the write-ups (`${base}/research/<slug>` via `<ResearchArticle>`) and `${base}/beri` via `<BeriCaseStudy>`, wrapped in your chrome.
6. **No "unverified" anything** renders unless the lab badge toggle is on (`<Flag>` already handles itself; add nothing of your own).
7. **Performance (measured with Lighthouse mobile after build):**
   - LCP < 2.5 s, CLS < 0.1, a11y 100.
   - First-paint fonts ≤ ~80 KB (latin-only faces with measured fallbacks, per the addendum).
   - Any timelapse poster above the fold must be the ≤ 27 KB poster via `priority`. Never make a canvas or video the LCP element.
   - Heavy work (WebGL, the sequence) starts after first paint.
8. **Motion:** reduced motion gives designed stills and crossfades (the timelapse still scrubs, since the user drives it). WebGL has a designed static fallback. 60 fps target; pause offscreen.
9. **Flags:** default state (Beri on, VikeLabs/CDE off) must look finished. Also check `?show=vikelabs,cde` and `?show=vikelabs` (Beri off), with no gaps.

## Verify before reporting
- Dev server on your port.
- `node ~/dev/portfolio-tools/capture.mjs <url> /tmp/<id> <id> --no-video` at home, `/research/activation-steering`, `/research/ocean-sensing` and `/beri`. LOOK at every screenshot at both sizes and fix what's rough.
- Page height at 393 px: `node -e` with playwright, or read it from the full-page PNG height ÷ 3.
- `npx tsc --noEmit` clean for your dir; zero console errors.
- Report in ≤ 20 lines:
  - what you borrowed from v4b / v6 / v9;
  - how you fixed each WHY_NOT_YET item;
  - type system;
  - interactive moments;
  - known issues;
  - page height at 393 px.
