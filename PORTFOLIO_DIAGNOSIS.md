# Portfolio diagnosis — tanujdargan.com (captured 2026-09-27)

Evidence: `audit/current/` holds desktop (Chromium 1440×900) and mobile (WebKit, iPhone 15) captures of the live site: fold and full-page screenshots plus full-scroll recordings (`current-desktop.mp4`, `current-mobile.mp4`). Zero console errors on either.

## The 10-second test

**What a research reviewer takes away today:**
"Third-year CS student. Purple gradients. Some kind of AI developer. Does hackathons. Has a code-snippet hero."
The first real fact below the fold is Pear Care, a startup most reviewers won't know. Amazon appears nowhere. Neither does Beri, any interpretability work, or the research sprint.

**What they should take away:**
"Tanuj Dargan builds ML systems and studies what happens inside models. Amazon Robotics AI intern with a return offer. Co-founded a shipped iOS app (Beri). Runs activation-steering and fine-tuning experiments and writes them up properly. I can try a demo right now."

The gap is not polish. The site answers a question nobody asks ("what's his tech stack?") and skips the one they do ask ("what has he done that I can check?").

## What's stale

| On the site | Reality (per brief, 2026-09) |
|---|---|
| "3rd Year Computer Science student" | CS at UVic, accelerated 3-year track, graduating 2027. The accelerated track is a signal, and it's buried in About. |
| `currentlyBuilding: "Medical AI @ Pear Care"` in the hero | Amazon Robotics AI (SDE intern, summer 2026, return offer), and co-founder of Beri. Pear Care is older work. |
| "Open to opportunities" pill | Has a return offer. Now it reads as unfocused. What's worth saying is which kind of opportunity (research programs). |
| Experience: Pear Care → MLH → DEIA → SOLIDS → CFAR | Missing Amazon, Beri, the Digital Minds sprint, steering research, ES-LoRA, the homelab (partly there as TDSLABS), and the community roles (Hack@JBCNOsh, VikeLabs, CDE 2026). |
| Resume PDF (`/resume.pdf`, last committed 2026-01-27) | No Amazon, no Beri, no research sprint. **Needs a new PDF from Tanuj** (flagged on the board). |
| GitHub stats cards (stars, streak, languages) | Top language is "Jupyter Notebook 51%". The streak card is a vanity metric, and it depends on two third-party services plus a Vercel proxy. |
| Location "Victoria, BC" | GitHub says Toronto (Amazon). Fine for now, but the contact block states it twice. |

## What's generic

1. **The hero is a template.** "Hi, I'm Tanuj" + gradient name + "Open to opportunities" pill + two CTAs + social icons + a fake `tanuj.ts` terminal that types itself. Thousands of student portfolios use this exact layout. The terminal takes 3.1 s to finish typing, so the one thing that moves hides the content.
2. **Purple-to-pink gradient on everything**: name, headings, buttons, borders, and a conic "RGB border" on the code card. When everything is accented, nothing is.
3. **Section labels that describe the section**: "ABOUT ME / Building at the intersection of AI & software", "EXPERIENCE / Where I've Worked", "PROJECTS / Featured Work", "SKILLS / What I Work With", "CONTACT / Let's Connect". Every one is filler.
4. **"I'm passionate about pushing the boundaries of what's possible with AI"** is the first sentence of About. It's the single most generic sentence in the genre.
5. **The skills wall**: 11 categories, 60 chips (Canva, Postman, VS Code, Git, Kaggle). A research reviewer infers the opposite of depth. Listing Git as a skill signals junior.
6. **Stat trio "3-Year / 2x / Top 10%"**: three different units, and none of them is the strongest proof point.
7. **Stock photography on project cards.** Hive and AIMO use unrelated Unsplash photos (a tree silhouette and a moon). It reads as filler.
8. **Cursor glow + background orbs + scroll progress bar.** Ambient effects that say nothing about the work and cost main-thread time on mobile (`mousemove` handler, three blurred orbs).

## Where the eye goes vs where it should go

**Desktop fold (1440×900)** — eye path today:
1. "Tanuj" in a purple gradient (largest, highest contrast)
2. the glowing code card (motion + RGB border)
3. the purple "Resume" button in the nav
4. "View My Work"

Nothing in that path is a fact. The first fact (UVic CS) sits in 32 px grey at position 5.

**Should be:** name → one-line claim (what he does) → three proof points (Amazon Robotics AI + return offer · Beri, shipped iOS app · interpretability research with a live demo) → one-tap links. The demo is the hook for research readers, so it should be visible or one scroll away.

**Mobile fold (iPhone 15, 393×852)** is broken outright:
- **The code card renders above the name.** The whole first screen is a fake terminal. Name, role and proof points are all below the fold. **Fails the recruiter test.**
- **The page overflows horizontally.** The full-page capture is 448 CSS px wide on a 393 px viewport, so the page wobbles sideways in Safari.
- The nav "Resume" button is 52 px tall with gradient fill and competes with the name for the header.
- Code lines are centre-aligned (`text-align` inherited), which is wrong for code, and they truncate mid-word while typing ("currentlyBuildi").
- The page is 13,700 CSS px tall on mobile, about 16 screens of scrolling to reach contact.

## What a research reviewer specifically misses

- **No research artifact.** No write-up, no figure, no demo. The claims "research positions 4+" and "AI researcher" have nothing behind them to click.
- **Results without method.** "R² = 93.6%" (SOLIDS) and "1–4M QPS" (DEIA) are good numbers, but there's no question, no baseline, and no "what I'd do next". A researcher reads a bare metric as a resume line, not as research.
- **No sign of taste in problem choice.** The sprint notes show real research judgment. Tanuj found that the λ-weight sweep had already been published (Jindal et al., TACL 2025) and moved the claim to the representation level. That is exactly the kind of thing Anthropic Fellows reviewers look for, and none of it is on the site.

## Performance and technical debt (observed)

- Three third-party image services (GitHub stats, top languages, streak) sit on the critical scroll path. Each is a cold fetch that can fail.
- `framer-motion` whole-page `useScroll` + `useSpring` progress bar, plus a `mousemove` listener writing `style.left/top` on every event (layout-triggering properties, not transforms).
- No meta description, no Open Graph tags, no social card, no structured data. Title is "Tanuj Dargan | AI Developer & Researcher". A shared link unfurls as a bare URL.
- The repo has an abandoned half-migration (untracked `src/pages/Home.tsx`, `src/components/Nav.tsx`, `src/data/portfolio.ts`, `src/lib/utils.ts`) that imports Tailwind, `lenis`, `clsx` and `tailwind-merge`, none of which are installed. It doesn't build. `src/data/portfolio.ts` is the right idea (content as data), and the redesign keeps that idea.

## Fix list (drives V0 and every variant)

1. Above the fold on a 393 px screen: name, a one-line claim, three proof points, and links to resume, email, GitHub, LinkedIn and X. No decorative element above the name.
2. Kill: the code card, gradient text, the skills wall, GitHub stat cards, cursor glow, orbs, stock photos, "passionate", and the "Open to opportunities" pill.
3. Lead with Amazon Robotics AI (return offer), Beri, and research with a live demo. Demote Pear Care, the hackathons and AIMO to an "Earlier" list.
4. Every research item gets a page: question, method, result, what I'd do next.
5. One accent colour, used for exactly one job.
6. Real SEO: description, OG/Twitter card (designed), JSON-LD `Person`, canonical, and prerendered HTML so the text exists before JS runs.
7. Mobile: no horizontal overflow, 44 px touch targets, `100svh`-safe hero, safe-area insets.
8. Reduced motion means crossfades, not a static page (same principle as Beri MOTION.md §1.6).
