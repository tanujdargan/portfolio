# Patterns for V6 "Latent space"

Mobbin web references gathered for V6 (Sept 2026), written in the same format as PORTFOLIO_TASTE.md §4. Three searches were run: dark heroes with a 3D or particle field, embedding and cluster plots, and slider panels over generated output. Mobbin shows single frames, so any motion described here is *(inferred)*.

**V6-P1 Words left, scene right.** *Src:* Resend hero ([screen](https://mobbin.com/screens/72bd36ac-0d76-4f93-b5a2-1a73afb92d92)), Graphite hero ([screen](https://mobbin.com/screens/b2c0cbe1-9772-446d-9f79-f613be2529c7)).
- *Does/why:* In both heroes the headline, one line of copy and two buttons fill the left 45%. The 3D object (a cube in Resend, glowing hexagon rings in Graphite) fills the right half and never runs under the text. The text stays readable and the scene can be loud.
- *Fits:* the V6 hero and every cluster stop. The camera aims so the active cluster lands right of centre, and the document panel sits on the left.
- *Build:* offset the look-at target to the left of the cluster centroid on desktop (≥ 900px). On mobile the cluster sits in the top third, above a panel with a solid backdrop. **RM:** the same frames, cut rather than flown.

**V6-P2 Labels pinned to the data.** *Src:* LangChain hero ([screen](https://mobbin.com/screens/b59685a4-716e-40e4-96ce-b5ce02c8841b)), Hume AI embedding plot ([screen](https://mobbin.com/screens/f0c483a8-e4f1-4068-b6ac-0fa4579d262b)).
- *Does/why:* LangChain puts mono pill labels ("Build", "Observe", "Evaluate", "Deploy") where its glowing curves begin. Hume labels regions of an emotion embedding with a colour square and a word ("Joy", "Calmness", "Fear"). Label and colour together name each region of the space.
- *Fits:* cluster names and the HUD. Each cluster keeps its tint in the scene, and its index chip in the document panel uses the same tint.
- *Build:* DOM labels in the mono face, `--c` per cluster shared by the shader colour and a CSS swatch.

**V6-P3 Parameter panel with mono values.** *Src:* FLORA canvas ([screen](https://mobbin.com/screens/e492029d-aacd-49cb-89b0-de086eeaa1e4)).
- *Does/why:* A small dark card in the top-right lists `MODEL Flux Dev`, `QUALITY 40` with a short slider, `SIZE`, and `SEED 891412874`. Labels are uppercase mono and values sit in chips. It reads as an instrument, not a form.
- *Fits:* the steering HUD, with rows for model, layer, concept, α and read-back projection.
- *Build:* a grid of label/value rows with tabular numbers. α is a native range input (keyboard and ARIA for free) that snaps to the 9 real α values.

**V6-P4 Strength slider inline with the prompt.** *Src:* Krea "AI Strength" ([screen](https://mobbin.com/screens/4561c02e-8911-4d23-be77-60b493940bbc)), Leonardo "Elements" ([screen](https://mobbin.com/screens/33109f54-d0fc-4077-bb41-250d7042484d)).
- *Does/why:* Krea puts its strength slider directly above the prompt field. Leonardo stacks a slider under each named style, with a Reset button. The control sits next to the text it changes, so cause and effect share one glance.
- *Fits:* the HUD shows the prompt ("Describe your morning."), α right under it, and the model's real steered answer typing out below.
- *Build:* prompt, then slider, then output in one card. A Reset button returns α to 0. **RM:** the output swaps without typing.

**V6-P5 Dot grid as ground.** *Src:* FLORA ([screen](https://mobbin.com/screens/e492029d-aacd-49cb-89b0-de086eeaa1e4)), Stitch ([screen](https://mobbin.com/screens/54bbd0f4-f90c-412d-94fc-165ac2cf7621)), Cloudflare bindings ([screen](https://mobbin.com/screens/fa011061-0438-45b8-9371-caa44424b211)).
- *Does/why:* A faint regular dot lattice tells you that you are on a canvas or in a space, not on a page. Stitch bends its dot field into a horizon.
- *Fits:* the static fallback (SVG dot lattice plus the real activation points), and the far background layer of the point field.
- *Build:* a CSS `radial-gradient` lattice at 4% white, never animated.

**V6-P6 A space that resolves from a skeleton.** *Src:* Higgsfield "Supercomputer memory" ([screen](https://mobbin.com/screens/6e29e638-e73a-447f-ad31-52a1f3301740)).
- *Does/why:* A centre node spokes out to icon nodes, and the far labels are grey skeleton pills, not yet resolved. Distance means "not decoded yet".
- *Fits:* clusters condense out of noise as the camera approaches, and their titles decode character by character on arrival.
- *Build:* a per-cluster `resolve` uniform mixes each point between a scattered and a home position. The DOM title runs a glyph scramble once per arrival. **RM:** no scramble, and points are drawn resolved.

**V6-P7 Overlay intensity is the user's call.** *Src:* Sprig heatmap ([screen](https://mobbin.com/screens/8388d7c2-e0af-4583-a0ee-6fa403200181)).
- *Does/why:* Click points are drawn over the captured page, and a "Heat opacity" slider sits in a popover. The overlay helps, but the reader decides how loud it is.
- *Fits:* the cursor-as-query glow and the steering displacement both scale with the lab motion level (Subtle, Default, Expressive).
- *Build:* one `uK` uniform multiplies drift, bend and query radius.
