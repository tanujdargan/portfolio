# V7 Mission control: patterns

Research pass: Mobbin web references for dark dashboards, telemetry logs, command consoles, globe/tracking views and status pages (searched 2026-09-27). Format follows PORTFOLIO_TASTE.md §4: *Src*, *Does/why*, *Fits*, *Build* (with **RM** for reduced motion).

Refs:
- `M1` Railway, usage dashboard with a red-ruled error-log panel: https://mobbin.com/screens/dd6801ce-350b-479d-b296-7210dbb2c252
- `M2` StackAI, analytics tiles (big number over a thin chart): https://mobbin.com/screens/03fb91f0-89d0-45e6-ada1-34d533a3febf
- `M3` Mintlify, KPI strip plus one chart: https://mobbin.com/screens/03b084b9-d5ed-41be-a9ca-43445af854f2
- `M4` Better Stack, "Telemetry → Live tail" with a timestamp column: https://mobbin.com/screens/5555d9cf-1760-4b61-a404-f8533e728a99
- `M5` Cloudflare, observability events with timestamp, type pill and message: https://mobbin.com/screens/ad394819-f3c4-4409-96cc-540329602310
- `M6` PlanetScale, console (one prompt on a dark well): https://mobbin.com/screens/a1fa1590-52b6-4554-b83c-03e998fe6537
- `M7` Laravel Cloud, command details with dotted key……value output: https://mobbin.com/screens/d846dc81-5058-489b-a885-95d1be9689df
- `M8` Visitors, a globe with a live dot and a compact stats dock: https://mobbin.com/screens/e3a55696-6526-49bc-b345-1b75da8f57d1
- `M9` Google Analytics, realtime overview (map with a floating per-minute panel): https://mobbin.com/screens/6db3d3ea-27ab-48e2-bd99-f349c703fae0
- `M10` OpenAI Platform, service health ("All systems operational", component rows, incident history): https://mobbin.com/screens/d605f83d-3869-4ecc-8874-b913e09e2930
- `M11` Customer.io, service list with a "Normal" status pill per row: https://mobbin.com/screens/b9743841-5a29-4454-bc39-133d7b0d7d9c
- `M12` incident.io, per-component uptime bars: https://mobbin.com/screens/12799f14-5784-4df2-97b6-7c9a8406fa09

---

**V7-P1 Globe as the live instrument, DOM as the readout.** *Src:* `M8`, `M9`, TASTE P29.
- *Does/why:* The satellite view is the one moving thing above the fold. Every number sits in DOM corners over it (position, altitude, UTC, pass), so the text stays crisp, selectable and translatable, and the canvas is never the LCP. In `M8` and `M9` the map carries the mood while the panel carries the facts. Same split here.
- *Fits:* hero right column (desktop), under the recruiter block (mobile).
- *Build:*
  - three r186 `WebGLRenderer`, imported in an effect after first paint + `requestIdleCallback`. Setup yields between steps so no task goes past ~55 ms at 4× CPU.
  - The Earth is one `ShaderMaterial`: a dot grid sampled from a 7 KB 1-bit Natural Earth land mask, night-side dots in the accent, a terminator band, a 30° graticule, and a fresnel rim. An additive back-face sphere gives the atmosphere.
  - Real orbit: NORAD 69912 elements (SatNOGS DB, Space-Track TLE), two-body + J2 secular drift. It is labelled "approximate" and shows the TLE age.
  - DPR capped at 1.5. The loop runs only when the stage intersects the viewport and the tab is visible.
  - HUD text is written with `textContent` at 4 Hz, never through a React render per frame.
  - **RM:** one composed frame (the next daylight moment with the terminator in view), marked FROZEN. The HUD is written once and the warp buttons are disabled.

**V7-P2 Time warp as the motion dial.** *Src:* mission-sim convention; `M9`'s "last 30 min / per minute" framing.
- *Does/why:* Orbit speed is an honest control: LIVE (1×) or a sim multiplier, always labelled (`SIM ×90`). The lab's motion level picks the default: subtle ×20, default ×90, expressive ×360. The user can override it with a 3-way segment or `/warp`.
- *Fits:* under the orbit stage, and the console.
- *Build:*
  - A `SimClock` rebases on every change so the satellite never jumps.
  - The segment is 30–40 px tall with `aria-pressed`.
  - **RM:** frozen.

**V7-P3 Subsystem panel = one area of work, one status, real readouts.** *Src:* `M10`, `M11`, `M2`, `M3`.
- *Does/why:* Status pages earn trust with a component name, a status word and a few numbers. Mapping the work to EPS / OBC / TTC / ADCS / PAYLOAD / HERITAGE / GROUND (and RIDESHARE for Beri when its flag is on) turns a CV into something to scan. Each value is a site.ts metric (180+ sites, $136.2M/yr, 180→15 min, 1–4M QPS, R² 0.936…) set in large tabular mono over a small mnemonic.
- *Fits:* §01 Subsystems.
- *Build:*
  - `dl` grid with 1 px gaps on a line-colour background, so the rules come free.
  - A "NOMINAL" status in the ok green.
  - An odd last cell spans the row, so there are no empty holes whichever flags are on.
  - **RM:** identical and static.

**V7-P4 Telemetry packets, one at a time.** *Src:* `M4`, `M5`.
- *Does/why:* A single round-robin ticker (950 ms default; 1600 subtle; 520 expressive) picks one panel and one readout. That cell flashes the accent for 900 ms and the panel's packet line types in: `PKT 00012 · APID 03 · QUERY.RATE=1–4M QPS · CRC OK`. The panels feel live without anything counting fake numbers. The packet only replays values that are already on the page.
- *Fits:* every subsystem panel.
- *Build:*
  - One `setInterval`, gated by an IntersectionObserver on the section and by `document.hidden`.
  - The flash is an opacity-only `::after`.
  - The typed line is `clip-path` with `steps()`.
  - **RM:** no ticker; "LINK IDLE · n CHANNELS".

**V7-P5 YAMCS-style command line.** *Src:* `M6`, `M7`, TASTE P25.
- *Does/why:* The console is the site's ⌘K, dressed as a ground-station command line: `/tlm amazon`, `/open research steering`, `/downlink resume`, `/pass`, `/warp 600`, `/signal on`. Suggestions list the commands, so nobody has to guess the grammar. ACK/NAK replies in green/red teach it in one try. Commands that move the view close the console so the result is visible.
- *Fits:* the top bar on desktop (always visible, `/` or ⌘K focuses it), and a sheet under the bar on phones (›_ button).
- *Build:*
  - One `input role="combobox"` with `aria-activedescendant` over a `listbox`.
  - ↑/↓ move through the list, Tab completes, Enter sends, ↑ on an empty list walks the history, and Esc closes.
  - The panel opens with scale .97→1 over 180 ms `ease-out`.
  - **RM:** no transform; it opens in place.

**V7-P6 Event log as tail -f.** *Src:* `M4` (Live tail), `M1` (log panel), `M5`.
- *Does/why:* The milestones are rows in a fixed-height log (timestamp · channel · event · metric). The channel codes are SCI / OPS / ENG / CMP / GND. The first time the log scrolls into view, lines arrive one by one and the box follows the tail; after that it's a normal scrollable log. A PAUSE control stops it.
- *Fits:* §03 Event log.
- *Build:*
  - Lines are armed (hidden) only if the section is below the fold at mount, so SSR and no-JS readers see everything.
  - The reveal is a CSS `clip-path` + opacity animation with a 120 ms stagger. `animationstart` scrolls the box.
  - `useMilestones()` keeps flags honest.
  - **RM:** every line present, no box animation.

**V7-P7 Downlink transition between pages.** *Src:* the brief; `M7`'s "Finished · Just now" confirmation.
- *Does/why:* Opening a write-up plays a short acquisition: a scan-lined sheet wipes down, shows `DOWNLINK · research/activation-steering`, fills a progress bar, flashes `RX LOCK`, then wipes away to reveal the page. The page opens with a "DOWNLINK COMPLETE" strip and a way back to MCC. Page changes feel like fetching data from the spacecraft, and the delay is short (300 ms before navigating).
- *Fits:* every internal link (queue, log, panel detail, console `/open`).
- *Build:*
  - Overlay `clip-path` keyframes `inset(0 0 100% 0) → inset(0) → inset(100% 0 0 0)` over 920 ms × `--t` with `ease-drawer`. Navigation fires at 300 ms × level.
  - Modifier-clicks bypass it.
  - **RM:** a 320 ms opacity blink.

**V7-P8 Signal: sound as an opt-in instrument.** *Src:* ground-station audio; `M12`-style explicit status toggles.
- *Does/why:* SIGNAL is OFF by default and says so. Turning it on starts a very quiet band-passed noise bed with a slow drift, plus short beeps on telemetry packets, commands (two-tone ACK, low NAK), downlinks and AOS over Victoria. It adds presence for people who want it and costs nothing for people who don't.
- *Fits:* the top bar toggle and `/signal on|off`.
- *Build:*
  - Web Audio only: a 2 s noise buffer → biquad band-pass 1.4 kHz → gain 0.028 with an LFO. No files.
  - The context is created on the click and closed when turned off.
  - The bars icon animates only while on and not reduced.
  - **RM:** the audio still works on request; the icon stays still.
