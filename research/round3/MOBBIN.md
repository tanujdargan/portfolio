# MOBBIN.md: round 3 references for an animated, dark, human site

Research round, 2026-10-16. Source: the Mobbin MCP (`search_sections`, `search_screens`, `search_flows`), web platform only. I ran 31 queries (listed at the end) and looked at roughly 250 returned screenshots. These are the 47 I kept. High-res copies and the visual board are at `~/Desktop/portfolio-research/mobbin/` (`index.html`, `img/`). That folder is local only because the images are third-party material.

**What I filtered out.** Studios already covered in round 2 kept coming back (Cloudstudio, basement, Kode Immersive, Unseen, Koto, Analogue, Shader). I skipped them unless the result showed a new mechanic. I also skipped anything in the families that failed before, as listed in DIAGNOSIS.md: dither or halftone screens (Base's halftone section, Unseen's RGB-split logo), scramble type, HUD micro-labels, and pannable canvases. Mobbin has few *personal* portfolios; the "portfolio" queries mostly returned template marketplaces (Craft, Framer, Readymag, Squarespace, Dribbble, Contra). So most of the references below are AI and dev-tool product sites, research-lab pages and hardware sites. That genre is closer to what Tanuj sells (shipped systems and research judgment) than agencies are, which is the genre problem DIAGNOSIS §2 raised.

**Reading the "fit" notes.** A reference fits if it helps a visitor learn one of the three proof points (Amazon production LLM, MarmotSat in orbit, the loss-masking finding) in 10 seconds, *or* makes a demo interesting at rest. Light-themed references are kept for mechanics only.

---

## 1. Heroes: AI companies and dev tools

**1. Antimetal: the OS desktop hero** · [Mobbin](https://mobbin.com/sites/sections/38557cd6-0834-4d5a-b186-89ac968d8332)
- *What it is:* The whole viewport is a dark "desktop": a menubar with Blog / Careers / Get access on the left and a live date and clock on the right ("Mon Nov 10 11:56 AM"). A centred two-line serif-less headline sits above a floating editor window with a diff panel and a white "Deploy" button. The background is a faint vertical-stripe texture.
- *Motion (inferred):* the editor window is a scripted product loop (code appears, then the diff, then the button is pressed).
- *Fit:* **Strong as a frame, careful with the clock.** "The page is a computer you're looking at" is a fiction a recruiter gets instantly, and the windows could be the real demos (a steering window, a tracker window). DIAGNOSIS §6 warns against decorative clocks, so a clock should only appear if it's doing a job, such as showing MarmotSat's next pass time.

**2. The Content Architecture: "This is the actual repo"** · [Mobbin](https://mobbin.com/sites/sections/29bfe158-19c6-48e3-b87a-f4e5e03b0e6f)
- *What it is:* A real file tree (`.agents`, `app`, `components`, `CLAUDE.md`, `README.md`) and a README rendered in a dark IDE frame, with a terminal pane underneath (`~/the-content-architecture > get-access`). There's a mono caption bar ("THIS IS THE ACTUAL REPO"), a minimap, and a status bar ("MAIN · UPDATED 2 DAYS AGO · 78 COMMITS").
- *Fit:* **Good as one idea, not the whole site.** "This is the actual code" is the honesty move Tanuj's demos already make ("Real model outputs"). It could make a strong write-up or "how this site works" page. As a hero it reads as dev-tool sales.

**3. Grok (xAI): starburst with a split two-tone headline** · [Mobbin](https://mobbin.com/sites/sections/30ab578c-5e08-4070-905a-146bc41a8e12)
- *What it is:* A black field with hairline rays from a single point and small pale-blue squares on some rays. "Understand" sits bottom-left in white and "The Universe" sits mid-right in grey, so the headline is split across the burst. The nav is mono, uppercase and widely tracked.
- *Fit:* **Medium.** The split headline anchored to a visual is a good type move. The particle burst is decorative wallpaper, the same problem as v6's point cloud. Use it only if the points are real (for example token positions or steering directions).

**4. Daylight: serif headline split across a photo** · [Mobbin](https://mobbin.com/sites/sections/4db3eb21-9348-4652-9e4e-e286971f8091)
- *What it is:* A dusk photo of pylons. "The grid has" in big serif sits top-left, and "no master" sits bottom-right, so the reader's eye crosses the image. Two tiny mono labels sit in the corners ("DAYLIGHT", "OUR THESIS").
- *Fit:* **Strong for warmth.** This is the warm, human dark palette DIAGNOSIS §8 says every version lacked. A real photo (MarmotSat on the bench, a launch) with a split serif line would read as a person, not a terminal.

**5. Dovetail: product window wired to its inputs** · [Mobbin](https://mobbin.com/sites/sections/57c3f21b-b420-47cc-be74-8b45ab45aea5)
- *What it is:* A black page with a faint grid. App-icon tiles (Play Store, Teams, Salesforce) sit on dashed connector lines that run into a dark analytics window with a colour bar chart and a table. The headline is left-aligned with a mono eyebrow ("AI ANALYSIS").
- *Fit:* **Strong for the Amazon story.** "Many sources wired into one system" is exactly the shape of an LLM planning assistant serving 180+ sites, drawn without a decorative shader.

**6. Sunday: mission paragraph plus a research-video card** · [Mobbin](https://mobbin.com/sites/sections/5e6c0e4f-4006-4e38-85b7-5d9394dd7e9f)
- *What it is:* A black page with one large white paragraph ("We own the entire stack: software, hardware, data, training, and model evaluation"). Under it is a bordered card: a short caption on the left and a video on the right, overlaid with "ACT-1" and a "Research Video 2025" pill.
- *Fit:* **Strong.** It's a research lab that also ships hardware, which is Tanuj's mix. "Own the stack" plus one real artifact card is a calm, credible pattern.

---

## 2. Live demos embedded in the page

**7. Giga: "Emotion-aware call handling"** · [Mobbin](https://mobbin.com/sites/sections/268ceb6c-6798-499f-be9f-f452ac0f75e6) — **best match in the round**
- *What it is:* On near-black, a purple audio waveform runs across the page with stepped intensity bands. Under it a transcript scrolls horizontally ("…I've been on hold for 30 minutes, this is ridiculous!…"). Small tick marks drop from specific words to grey annotation chips: "Service delay mentioned", "Urgency indicator detected", "Profanity + high emotion". The heading is serif ("Emotion-aware call handling") with a mono eyebrow ("HOW IT WORKS").
- *Motion (inferred):* the transcript and waveform scroll as a loop, and chips pop in as their words pass the playhead.
- *Fit:* **Direct transfer to the loss-masking demo.** Replace the waveform with the per-token loss, the transcript with the real fine-tuning tokens, and the chips with "loss lands here", "assistant-only mask" and "distress expressed". It performs at rest, which fixes DIAGNOSIS §5.

**8. Framer Motion docs: parameter playground** · [Mobbin](https://mobbin.com/sites/sections/9f70191c-9fa2-4381-8bbc-7e701b2b34e7)
- *What it is:* A three-part panel: a magenta stage with a white square, a code pane (`<motion.div animate={{ x: 50, scale: 1.5 }}>`) on dark, and four labelled sliders with numeric steppers (X, Y, Scale, Rotate). The code updates as the sliders move. The resting caption says "Tweak the parameters to animate."
- *Fit:* **Strong for steering.** Stage = model output, code = `generate(prompt, alpha=+0.6, vector="joy")`, slider = α. Showing the call that produced the output is the research-honest version of PATTERNS #53 ("code that updates as the controls move").

**9. Framer Motion docs: tap-to-open layout demo** · [Mobbin](https://mobbin.com/sites/sections/dc938a66-a9a8-48e7-87bc-8b925e61d1b4)
- *What it is:* A violet stage with four skeleton cards ("Tap to open a card."), next to the exact `layoutId` / `AnimatePresence` code that drives it.
- *Fit:* **Medium.** It's a demo-plus-source layout. It suits write-up pages more than the home page.

**10. OpenAI DALL·E 3: same prompt, two models** · [Mobbin](https://mobbin.com/sites/sections/88a31de0-8431-4a5e-a8df-8761600e6676)
- *What it is:* One centred sentence ("Even with the same prompt, DALL·E 3 significantly improves upon DALL·E 2.") above two equal images side by side, each captioned with the model name and the full prompt.
- *Fit:* **Strong for the steering resting state.** Open on α = −0.9 and α = +0.9 side by side with the same prompt, instead of α = 0 (DIAGNOSIS §5). The comparison carries the message before anyone touches a control.

**11. OpenAI DALL·E 2: result stats with a paper link** · [Mobbin](https://mobbin.com/sites/sections/2740b6f4-c138-41e3-bcb1-a73038df24c9)
- *What it is:* On dark grey, one serif sentence states the eval ("…when evaluators were asked to compare 1,000 image generations"). Below are two big numbers ("71.7% preferred for caption matching", "88.8% preferred for photorealism") and a white "VIEW RESEARCH PAPER" pill.
- *Fit:* **Strong.** This is how to show a number *with* its context, the fix for v4b's context-free "Neutral" / "+9.6" (DIAGNOSIS §4). The sentence comes first, then the number with its unit and meaning, then the method link.

**12. Goldsand: savings simulator** · [Mobbin](https://mobbin.com/sites/sections/d76a3205-fbe5-4d55-abff-88cb84b13d72)
- *What it is:* A rounded card. The left side has a big green result ("$64,450"), the input slider ("Initial deposit $500") and a sub-caption. The right side is a stacked bar chart from "Today" to "30Y", with emoji milestones floating above the bars.
- *Fit:* **Medium, for its structure.** The result is huge, the control is small, and the chart is annotated in place. The emoji markers become annotations ("joy switches on here") on the read-back plot. The light theme is mechanics only.

**13. Cartesia: data travelling along the wires** · [Mobbin](https://mobbin.com/sites/sections/caaf2ec4-e54a-441f-b1e0-12a2926be8a0)
- *What it is:* A pipeline with three nodes (Ink speech-to-text → Your code → Sonic TTS) and four tool nodes below (LLM, API, Guardrails, Tools). The *actual utterance* is printed along the connectors ("my flight to the afternoon" goes in, "Sure, let me help you with th…" comes out). Organic line bundles flow in and out at the edges.
- *Fit:* **Strong for the Amazon system.** Show a planner's request travelling along the wire into the assistant and a plan coming out. Real (or realistic, labelled) strings on the edges explain the system with no HUD.

**14. Dovetail: "From noise to knowledge"** · [Mobbin](https://mobbin.com/sites/sections/987c2b93-5574-49b7-b9d0-f2b1e2058e9a)
- *What it is:* On the left, a vertical list of five steps with one active (square bullet, bright, with a description). The other four are grey. On the right, a diagram: source cards (SURVEY RESPONSES, INDUSTRY_REPORT.PDF, REVIEWS, CUSTOMER CALLS, SUPPORT TICKETS) feed a glowing "GENERATING DOC" node, which feeds a "Q2 Priorities Report" document.
- *Fit:* **Strong.** The step list is the "one lit thing" rule from STUDIO_TASTE applied to a story, not to cards. It would suit the Amazon section (inputs → planner LLM → plan) or the Apart method.

**15. Vercel: annotated live sparklines** · [Mobbin](https://mobbin.com/sites/sections/bee45d3f-2707-4946-9e34-a7e88ad3be44)
- *What it is:* Three coloured line series (blue, green, red) run across the page, each tagged with small query chips that are real syntax (`WHERE cache='hit'`, `GROUP BY source_path`, `VISUALIZE bandwidth_incoming`, `MAX`, `AVG`). A three-column feature row sits below.
- *Fit:* **Medium-strong.** The chips label the data in its own language. For the ocean probe or steering read-back, the axis notes could be the real call (`project(h, v_joy)`) instead of decoration.

**16. Cartesia Ink: try it, with a topic shuffle** · [Mobbin](https://mobbin.com/sites/sections/80ad413d-fe11-4cde-b784-2732fea74a89)
- *What it is:* A large demo panel with a mic button, a "NEED A TOPIC?" label, a shuffle icon, and a prompt suggestion ("What's your go-to comfort movie or show?").
- *Fit:* **Medium.** It's a light theme, but the idea is good: the demo suggests the first input, so nobody faces a blank control. Steering could open with "Try: *Describe your morning*", with a shuffle.

**17. Whop: dark dashboard with mono totals** · [Mobbin](https://mobbin.com/sites/sections/87bd4d14-a351-43c2-b72a-9c9caeef9eb7)
- *What it is:* A dark product dashboard with green bar sparklines in stat cards, floating over a warm ember glow. Below it, three monospaced live totals ("21,379 / $429,539,701 / 7,972,240") with small labels.
- *Fit:* **Medium.** The ember glow behind a dark UI is a warmth trick. The mono totals work if they're real and labelled.

---

## 3. Globes, orbits and data-viz heroes

**18. Seasats: "Mission after mission"** · [Mobbin](https://mobbin.com/sites/sections/c68ddfae-31e1-4a8a-ba35-53579d069d96)
- *What it is:* A deep-green globe filling the lower two-thirds. White vessel icons sit along dotted mission tracks, with pulsing dotted rings at waypoints. The serif headline is top-left with "Click and drag to explore featured missions", and a mono filter pill at the bottom (ALL / COMMERCIAL / DEFENSE / SCIENCE).
- *Fit:* **Strong for MarmotSat.** It's a real vehicle on a real track, with an instruction and filters. It's coloured, not black, which helps with warmth. MarmotSat's ground track plus "next pass over Victoria" belongs here.

**19. Tempo: dotted globe with a searchable list** · [Mobbin](https://mobbin.com/sites/sections/3578b307-c7c0-45ff-94e5-9607a7604abf)
- *What it is:* The left half has a serif headline, a search field, region chips, and a country list with counts. The right half is a dotted-land globe with blue points.
- *Fit:* **Medium.** A list paired with a globe lets the globe answer a question. For MarmotSat, the list could be upcoming passes, and choosing one would spin the globe to it.

**20. GitHub: globe arcs with a live event card** · [Mobbin](https://mobbin.com/sites/sections/c28b4e25-f037-4f5e-8a7c-29ba3e40b5c5)
- *What it is:* A glowing dotted globe with pink arcs. One arc ends in a dark card in mono: "#67 ros-drivers/video_stream_opencv · C++ · Opened in Sydney, merged in Tokyo".
- *Fit:* **Strong as a caption pattern.** One real event, captioned where it happens on the globe. For the tracker: "MarmotSat · over 49.2°N 123.4°W · next pass 21:14 PDT".

**21. Base: rolling digit tickers over a dot map** · [Mobbin](https://mobbin.com/sites/sections/82283dd4-9b04-4dff-b1e9-eedbf7d55a85)
- *What it is:* The digits of "$12B", "2.?K" and "?74" are caught mid-roll (each column scrolls independently) beside a grey dot-matrix map with one orange point.
- *Fit:* **Medium.** The digit roll (PATTERNS #52) suits a value that really changes, like MarmotSat's altitude. It's a gimmick for static numbers.

**22. Wild: "Explore. Generate. Refine. Scale."** · [Mobbin](https://mobbin.com/sites/sections/eef9343d-0d21-41e4-9524-54462b7612db)
- *What it is:* A pixel-square scatter that starts chaotic in blue on the left, converges into a tight band in the middle and fans into an ordered yellow shape on the right. Four numbered steps (01–04) sit beneath, aligned to the phases. The light theme reads as an editorial diagram.
- *Fit:* **Strong as a concept.** A visual that *is* the process. For Tanuj, it could show fine-tuning or steering as a population of tokens or activations moving from scattered to aligned. Drawn from real data, it's the only "particle" idea that passes DIAGNOSIS §7.

**23. Railway: split-flap live board** · [Mobbin](https://mobbin.com/sites/sections/fdccd8a8-b0fc-4cf4-ac07-75a7775ee4e3)
- *What it is:* A navy page with a departures board: labels in dim split-flap letters (USERS, SERVICES, DEPLOYMENTS, REQUESTS, LOGS) and white flap digits on the right. The headline above reads "113.1M+ deploys per month (and counting)", with the subhead "Real-time usage…".
- *Fit:* **Medium.** It's charming and readable, unlike scrambled headings, because each label resolves once and stays. It could suit a "live" strip for MarmotSat (ALT / VEL / NEXT PASS). It's too much for static résumé numbers.

**24. Resend: stats with a provenance line** · [Mobbin](https://mobbin.com/sites/sections/b35011ab-ad11-4671-82db-c8d722383d20)
- *What it is:* A black page with a two-tone headline ("Actions speak / louder than words") and three stats ("< 36min", "93.25%", "137,084"). Each stat has its plain-English definition *above* the number. A footnote reads "Real-time data from the past 30 days via Plain".
- *Fit:* **Strong.** Definition first, then the number, then the source. It's the cleanest model for Tanuj's metrics (180+ sites, R² 0.936, read-back −8.0 → +9.6).

---

## 4. Hardware and objects

**25. Zipline: hotspots plus a condition toggle** · [Mobbin](https://mobbin.com/sites/sections/ce7e2b2b-54f9-4a13-952e-4a895a0f7c30)
- *What it is:* A white drone in profile over a giant ghosted "P1". Red square hotspots sit on the tail, the rotor and the payload bay. A segmented toggle ("Sunny / Stormy") above it changes the scene.
- *Fit:* **Strong for MarmotSat.** Show a render or photo of the CubeSat with hotspots on the onboard computer, radio and solar panels, each opening one line about the firmware Tanuj wrote. The toggle could be "Day / Eclipse" (power budget). A dark version is easy.

**26. Rox: exploded isometric layers** · [Mobbin](https://mobbin.com/sites/sections/f81fe9bd-84ae-40e5-8ddd-6a406a3442fc)
- *What it is:* Dark wireframe slabs stacked in isometric view (Application → Agent Swarm → Layer → System of Context → Data Sources), with module tiles on each slab. A left list highlights the active layer in amber, and a right caption explains it ("Act from anywhere…").
- *Fit:* **Strong for firmware and the planning stack.** A MarmotSat OBC stack (hardware → RTOS → drivers → mission logic) or the Amazon assistant (data → retrieval → LLM → planner UI), with scroll or click lighting one layer at a time.

**27. Telepathic Instruments: one object, one label** · [Mobbin](https://mobbin.com/sites/sections/e19b1448-2e4b-4614-b64d-9f2cda0540c5)
- *What it is:* A tan-and-graphite synth on black, lit from above. One short spec ("Keyboard: a single-octave, velocity-sensitive keyboard…") sits to the right. There's an orange mono marquee at the top and a neon-green CTA bottom-right.
- *Fit:* **Medium-strong.** It's the dark product-shot language for a CubeSat: one object, one sentence, and the next scroll step moves the label to the next part.

**28. BitcoinOS: radial labels on a hero object** · [Mobbin](https://mobbin.com/sites/sections/0b1b8080-36b2-43dd-a4ab-ee790c67bf91)
- *What it is:* A glowing amber orb in a cinematic desert scene. Six "+ label" items (Rollups & True L2s, Trustless Bridging…) are connected to the orb by thin leader lines, and there's a square section-dot nav on the right edge.
- *Fit:* **Medium.** The leader-line labelling is good. The crypto-epic imagery is not Tanuj.

---

## 5. Work index, research lists and write-ups

**29. Waabi: research card over a real model output** · [Mobbin](https://mobbin.com/sites/sections/95a84933-dbe0-42c0-8325-947e4ac430a0)
- *What it is:* A full-bleed jet-colormap 4D occupancy render (the actual research output). A dark card overlaps its right edge with pink topic tags, a serif title ("DIO: Decomposable implicit 4D occupancy-flow world model"), the venue ("CVPR 2025"), the authors and a round arrow button. A white pill nav ("waabi | Research") floats at the top.
- *Fit:* **Strong.** "The research output is the image" is the right move for Tanuj, as DIAGNOSIS says of v6. Each research item gets its real figure (read-back plot, token heatmap) as the hero, with a spec card overlapping it.

**30. Waabi: dark publications list** · [Mobbin](https://mobbin.com/sites/sections/9aaa2fb5-80ec-483f-98b3-e3dcf5217ffb)
- *What it is:* A large serif "Publications". Rows have pink pill tags, then the venue and year, a serif title, the authors, and a circular arrow on the right, with hairline rules between rows.
- *Fit:* **Strong.** The research list in Tanuj's colours. Replace the venue with "Apart Research sprint · 2026".

**31. Cartesia: research grouped by year** · [Mobbin](https://mobbin.com/sites/sections/b8608ed1-0d62-4162-92ba-539871655c72)
- *What it is:* A two-column grid. A large grey serif year (2025, 2024) sits in the gutter, with serif paper titles, authors and arrows on the right, inside a ruled frame.
- *Fit:* **Medium.** The year gutter is a good experience-section device too. It's light, so mechanics only.

**32. Anthropic: publications table** · [Mobbin](https://mobbin.com/sites/sections/d5bb06da-6fc9-42c0-a989-28c0b7321375)
- *What it is:* A plain table (title / team / date) with topic filter pills above it (Overview, Interpretability, Alignment, Societal Impacts).
- *Fit:* **Medium.** It's the register lab reviewers trust. Filtering by theme (Interpretability / Systems / Hardware) matches DIAGNOSIS's advice to group by theme.

**33. Nite Riot: dense dark index** · [Mobbin](https://mobbin.com/sites/sections/1aa05a05-6920-4f35-a581-3dcf42634162)
- *What it is:* A black-and-white behind-the-scenes photo, overlaid with a three-column all-caps index (PROJECT / DIRECTOR // PHOTOGRAPHER / INFO-location), about 25 rows. The nav includes a location and clock and "WORK⁽²⁸⁾" counts.
- *Fit:* **Medium.** Dense, confident and dark. The "//" caption syntax echoes Kode. It's useful for a "More work" index, not the hero.

**34. Freshman: centred names with flanking images** · [Mobbin](https://mobbin.com/sites/sections/3641b988-b26c-471d-a177-c5fc2254b123)
- *What it is:* Big condensed serif surnames stacked and centred, each with a tiny first name on the left and a handwritten location on the right. Two images float in the side margins (the hovered row's media).
- *Fit:* **Medium.** It's a hover-preview index with type as the carrier. It's light and editorial, which the owner rejected, so it's mechanics only.

**35. Linear: dark write-up header** · [Mobbin](https://mobbin.com/sites/sections/58253722-b6e5-40c4-b1e0-ee513061c7f9)
- *What it is:* A glowing app-icon glyph sitting on an ECG heartbeat line across a dark grid. Below it: a category ("Craft"), the title, a one-paragraph standfirst, and the author and date.
- *Fit:* **Strong for write-up pages.** Each write-up gets a single drawn glyph from its own data (a read-back step function, an orbit ellipse) as the header art.

**36. A24: titles as the index** · [Mobbin](https://mobbin.com/sites/sections/b645a881-adf5-43f3-a86c-758cd54f0b72)
- *What it is:* Huge tight grotesk film titles stacked flush-left, each with a tiny superscript mono year.
- *Fit:* **Mechanics only (light).** If titles are outcomes ("Loss masking decides shutdown distress"), a big-type index reads in seconds.

---

## 6. Timeline and experience

**37. V7: tick-ruler timeline** · [Mobbin](https://mobbin.com/sites/sections/a5b3c6c0-dd04-4ca2-b06b-4ee1c673c2a5)
- *What it is:* A horizontal ruler of evenly spaced thin ticks, with events marked by orange ticks. Under the event ticks are the date and a two-line serif caption ("Raises $33M in series A", "Celebrates its 5th birthday"). Arrow buttons step through it.
- *Fit:* **Strong.** A compact experience strip: each tick is a month and the accent ticks are Amazon, MarmotSat launch, the Apart sprint and graduation (Apr 2027). It's dark-adaptable and avoids v4b's 14,000 px pinned axis.

**38. Büro: chapters table with year ranges** · [Mobbin](https://mobbin.com/sites/sections/bcad6cf8-5eb5-4590-bb1f-b8f4d4ecfb88)
- *What it is:* "2006" and "2024" sit in the top corners. A split headline ("Keep going. One small / thing after another."), a hand-drawn line crossing the text, and a "(04) Chapters" table with ranges (The Early Years 2004–2012…). A floating dark pill reads "Scroll, this is a website!!".
- *Fit:* **Medium.** The chapters table with ranges is a compact experience index, and the pill shows a human voice in the chrome. It's light.

**39. Heron AI: numbered tab strip on a blueprint** · [Mobbin](https://mobbin.com/sites/sections/1fe1d979-0175-41b8-9d0a-15ab35c48fa8)
- *What it is:* A five-tab strip ([01] SEES YOUR MODEL … [05] EVERYWHERE YOU DESIGN) with the active tab inverted to black. Below it, an isometric line drawing of a building cut by one red plane, with dimension callouts ([0.2303]).
- *Fit:* **Medium-strong (mechanics).** One red plane cutting a line drawing is a great "one accent as an event" image. For loss masking, a red plane could cut through the token sequence where the loss applies. It's light and cream, so it needs a dark port.

---

## 7. Command menus, navigation, contact and footer

**40. Fey: teaching the shortcuts** · [Mobbin](https://mobbin.com/screens/ff52ac90-4d18-4765-98da-df1e362a5ee1)
- *What it is:* A dark onboarding screen: "It's in your hands" (gradient lavender to peach), "For now, press [space] to continue". Below it, a list (AAPL, TSLA…) with a command panel whose right column shows the shortcut keys (X, A, F, I, E) highlighted in a blue outline.
- *Fit:* **Strong for keyboard navigation.** A one-line hint ("press J/K to move, ↵ to open the demo") and a visible key column are more human than a hidden ⌘K. The gradient on two words is a warmth cue.

**41. Devin: command menu with breadcrumb results** · [Mobbin](https://mobbin.com/screens/e37a4e69-9a61-4f36-803d-edbd89c1229d)
- *What it is:* A search for "crud" returns results as paths (Settings › Review › Add "Devin Review" link…). The footer has key hints (↑↓ Navigate, esc Close, ⌘↵ Open in new tab, ↵ Open).
- *Fit:* **Medium.** If the site gets ⌘K (PATTERNS #44), results should show where they live ("Research › Loss masking › Token view").

**42. Resend: footer with a status pill** · [Mobbin](https://mobbin.com/sites/sections/9301c687-40d0-4d8d-bbb8-b1325bac2679)
- *What it is:* A black footer: address, four icon buttons, a pill reading "● All systems operational", and five link columns.
- *Fit:* **Strong as a small, real touch.** A footer pill "● MarmotSat in orbit · last contact 2h ago" is honest telemetry with one job, unlike a HUD.

**43. Daylight: warm glow footer** · [Mobbin](https://mobbin.com/sites/sections/2c33a0e6-3add-4a11-b4b8-d8b66ba00597)
- *What it is:* A near-black footer lit by a burnt-orange radial glow from the bottom corners. A stacked wordmark, a large nav list, and an outlined email pill with a solid button.
- *Fit:* **Strong for palette.** One warm light source on black solves "lifeless" without leaving dark mode.

**44. Cosmos: giant clipped wordmark** · [Mobbin](https://mobbin.com/sites/sections/277145c1-b152-4185-ba3a-5568988cc33a)
- *What it is:* A grey "COSMOS©" at around 200px, cut off by the bottom edge, under a two-line statement and three link columns on charcoal.
- *Fit:* **Medium.** It's the one place a big name is fine (the footer, after the work), which answers DIAGNOSIS's "name billboard" problem by moving the name, not deleting it.

**45. BitcoinOS: numbered full-screen menu** · [Mobbin](https://mobbin.com/sites/sections/c1dc63b8-957a-4567-970b-bd3a21232beb)
- *What it is:* The menu splits into a cropped image on the left and numbered heavy caps rows (01 TOKEN … 08 MERCH) with arrows and hairlines, grouped under "[ Product ]" and "[ Company ]".
- *Fit:* **Medium.** A good mobile menu pattern. The type is too loud for Tanuj.

**46. Siena Film Foundation: dark bio cards** · [Mobbin](https://mobbin.com/sites/sections/039627e5-89e9-4fc1-8144-235e1eb5bb49)
- *What it is:* Two cards with dotted borders on black. Each has a B&W portrait on the left and, on the right, a tiny "FOUNDER" label, a condensed caps name and a short bio.
- *Fit:* **Medium.** A humane "about" block if Tanuj wants a portrait. Dotted borders feel hand-made rather than terminal.

**47. Chronicle: two-tone statement plus a card rail** · [Mobbin](https://mobbin.com/sites/sections/d56f6dd4-a959-448d-a7cc-c0c2f145fce4)
- *What it is:* A black page with a sentence whose first half is grey and second half is white ("Build polished outputs with widgets that / come with pixel perfect design, interactivity and motion"). Below is a horizontal rail of dark media cards with prev/next.
- *Fit:* **Medium-strong.** Grey-then-white sentence emphasis is Koto's two-tone heading done as one line, and works as an outcome statement per project.

---

## Synthesis

### What Mobbin added that round 2 didn't have
Round 2 learned *how studios move*. Mobbin's AI, dev-tool and hardware sites show *how a live system is explained*. The strongest references all do the same three things. They show real data in motion (Giga's transcript, Cartesia's wire strings, GitHub's event card, Seasats' tracks). They annotate it in place with plain-English chips. And they look interesting before the visitor does anything. That fills the gap DIAGNOSIS kept finding: the demos were real but silent at rest, and the motion was decoration.

### The 10 strongest transferable ideas, ranked

1. **Annotated playback (Giga #7).** A real sequence (tokens, loss, activations) plays slowly across the screen, and plain-language chips drop from the exact positions where something happens. It runs at rest and explains itself. Use it for the loss-masking demo and as the steering read-back.
2. **Contrast-first resting state (OpenAI #10).** Every demo opens on a side-by-side of the two most different outputs for the same prompt, with one sentence above. Controls come second.
3. **Definition → number → source (Resend #24, OpenAI #11).** Every metric appears as a short definition, then the number, then a provenance line ("Real outputs · Qwen2.5-1.5B · method"). This kills the context-free giant number.
4. **Data on the wire (Cartesia #13, Dovetail #5 and #14).** Systems work is drawn as a pipeline whose edges carry real strings. Use it for the Amazon assistant (request → retrieval → LLM → plan) without exposing anything confidential: realistic, labelled examples.
5. **One lit step in a list plus its diagram (Dovetail #14, Rox #26).** A left list of steps or layers with one active, and the right diagram lights the matching part. On mobile it becomes a scroll-snapped step. It's how a firmware stack or method becomes legible.
6. **Hotspots on the real object (Zipline #25, Telepathic #27).** MarmotSat as an object on black with 3–4 hotspots (OBC, radio, power, deploy). Each opens one sentence about what Tanuj wrote. An optional Day/Eclipse toggle shows the power budget.
7. **Globe with a caption at the event (Seasats #18, GitHub #20, Tempo #19).** The tracker gets filter chips (Now / Next pass / Ground track) and one mono card pinned where the satellite is ("next pass over Victoria 21:14 PDT"). A pass list beside it spins the globe.
8. **Demo + the call that produced it (Framer #8).** Stage, sliders and a live code line (`steer(prompt, v="joy", α=+0.6)`) under each research demo. It's honest and literate, and labs read code faster than prose.
9. **One warm light source on black (Daylight #4 and #43, Whop #17).** Keep dark mode, add an ember or dusk glow and one real photograph. It fixes "lifeless" (DIAGNOSIS §8) with no light theme.
10. **Tick-ruler timeline (V7 #37) and a real status pill (Resend #42).** Experience as a compact ruler with accent ticks, and a single honest status line ("● MarmotSat in orbit") in the footer instead of HUD telemetry.

### Three whole-site directions

**A. "Playback": the site explains itself as it plays.** *(ideas 1, 2, 3, 8, 9)*
- The first screen is one dark, warm-lit stage where a real steering sweep plays as annotated playback. The prompt sits on the left. The output rewrites as α crosses +0.3 → +0.6, and a chip drops at the jump ("joy switches on: read-back −8.0 → +9.6"). Above it is one serif line of positioning and the three proof lines (Amazon · MarmotSat · Apart), each in the definition → number → source format.
- Scrolling moves the playhead into the next "track": loss-masking tokens with chips, then the MarmotSat pass, then the ocean probe. Each track has a "take the controls" button that reveals the sliders and the code line.
- Type is a warm serif for statements plus a neutral sans for UI. One accent (ember) marks the playhead and the chips.
- *Why it could hit:* it's animated and alive, but every moving pixel is a finding. It keeps v6's "the research is the visual" and S2's rewriting headline, and drops the HUD and the scramble.

**B. "Workbench": three real objects on one dark bench.** *(ideas 5, 6, 7, 4, 10)*
- The home page is a dark, lit tabletop with three objects: a CubeSat (hotspots), a "model" window (steering contrast), and a warehouse planning window (data-on-the-wire diagram). Hover or tap on an object lifts it and dims the others, following the "one lit thing" rule. On mobile they become three tall cards in a scroll-snap.
- Opening an object is a shared-element transition into its page. Each page has a left step or layer list with the matching diagram lit (Rox and Dovetail), the spec card from S5, and the write-up.
- Experience is a tick ruler under the bench. The footer has the status pill and a warm glow.
- *Why it could hit:* it's human and physical (things you built, not a terminal), the strongest credential is literally on the table, and the motion is lift, light and travel rather than noise.

**C. "Mission control, done honestly": live systems as the portfolio.** *(ideas 7, 4, 3, 10, 1)*
- The site is a calm dark operations view where every panel is something live or real. MarmotSat's globe is the large panel (Seasats and GitHub caption style). A "planning assistant" pipeline panel shows a request travelling along the wire. A "research" panel shows the annotated playback. A slim footer pill shows the real status.
- Each panel's title is an outcome sentence, not a codename ("An LLM planner in production at 180+ Amazon sites"). Panels expand in place (S1's row-opens-in-place) into the full demo.
- There are no clocks, coordinates or IDs unless they come from MarmotSat itself. There's one accent, and the only motion is data moving.
- *Why it could hit:* it carries the ambition of the dithered "signal" screen but swaps metaphor for real telemetry and plain labels. That's the version that "hits".

**My pick to prototype first:** A (Playback). It is the only one where the hero itself proves the research claim in under 10 seconds with no interaction, which is the test every earlier round failed. B is the best fallback if Tanuj wants it to feel more human and less "ML".

---

## Query log (31 queries, all web)

`search_sections` unless noted:
1. dark hero section of an AI company with animated product visualization
2. developer tool landing page hero with live code or terminal demo on dark background
3. personal portfolio website hero with name and introduction
4. *(screens)* personal portfolio site of a designer or engineer listing selected projects
5. interactive product demo embedded in landing page where visitor can try the feature
6. bento grid of feature cards with live charts and animated UI on dark background
7. case study gallery grid of projects with hover previews
8. company timeline or milestones section with years along a vertical line
9. dark footer with large contact call to action and email
10. *(screens)* command menu palette opened over a website with search and keyboard shortcuts
11. hero with interactive cursor-following spotlight or particle effect
12. scroll storytelling section with pinned visual and steps of text changing as you scroll
13. hero with real-time data visualization such as globe, network graph or live chart
14. AI research paper or publication page with abstract, authors and figures
15. side by side comparison of two AI model outputs with a toggle or slider
16. tabbed feature showcase where selecting a tab swaps a live product preview, dark theme
17. space or satellite company website section with orbit visualization on dark background
18. hardware product with labeled hotspots and callouts on a dark background
19. AI chat demo in landing page streaming an answer with highlighted tokens or annotations
20. stats section with large animated numbers and small labels on dark background
21. project case study page header with title, role, year and metadata columns on dark background
22. headline text that highlights word by word as the user scrolls
23. list of projects as text rows where hovering a row reveals an image preview
24. dark mode marketing site hero with glowing grid lines and gradient light beam
25. interactive slider control that changes a visual output in real time on a landing page
26. about section with founder portrait, short bio and credentials on dark background
27. *(flows)* opening a project from a grid into a full case study page with animated transition
28. footer with giant wordmark name spanning full width on dark background
29. AI research lab homepage hero with mission statement
30. logo strip of companies and institutions shown as credentials under a hero
31. architecture diagram of a system with animated data flowing between nodes

**Weak spots.** Queries 3, 4, 22, 27 and 30 returned mostly generic or template material: Mobbin indexes products, not personal sites, and its screenshots are stills, so scroll-linked text effects and transitions don't show. The cursor-effect query (11) returned nothing new beyond Opacity's multiplayer cursors (light theme, not kept). All motion notes above are inferred from stills.
