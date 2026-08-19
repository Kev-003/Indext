# Brand Development Platform — Feature Spec (v1)

## Core Premise

A guided brand-development tool that encodes a real professional branding
process — not a keyword-to-template generator like Wix/Canva. The system
guides the user through the _thinking_ (interview, meaning extraction,
mind-mapping) and then supports _execution_ at whatever skill level the
user has, without ever handing them a pre-made finished asset to reskin.

The front door to the product is a single AI prompt, not a dashboard or a
wizard. The user talks to the system the way they'd talk to a design lead;
the system's replies aren't paragraphs of advice but working pieces of the
visual system itself — a mind-map canvas, a geometric constructor, a
palette picker — rendered inline and scoped to the specific brand under
discussion. The AI's job throughout is to _direct_, never to _execute_: it
decides which tool to hand the user next and pre-loads it with the user's
own derived material, but the user is always the one who drags the
primitive, draws the stroke, or picks the pairing. That boundary — carried
over from the original AutoDraw distinction in Section 4 — now applies to
the whole product, not just the sketch engine.

Two execution modes share the same guided process:

- **Beginner mode** — business owners / non-designers. Execution is
  scaffolded via constructive geometry and sketch beautification.
- **Experienced mode** — designers / skilled users. Execution is closer
  to a freeform canvas; the system's value is direction, not scaffolding.

Both modes funnel into a shared **brand asset management** system
afterward, which now also doubles as the persistent state store the AI
reads from and writes to for every brand in progress (see Section 10).

Stack direction: **Laravel + React (Inertia.js)** for the app shell and data
layer, with a **Rust-to-WASM module** handling the geometry-heavy sketch
processing (see Sketch Refinement Engine below), plus an **AI
orchestration layer** that decides which interactive component to render
next (see Interaction Model below).

---

## 0. Interaction Model — AI Prompt Front End & Generative UI

New in v1 — this section governs how every section below is actually
delivered to the user.

### Brands as the unit of state

A **brand** is the top-level project object — one per client, or one per
personal/side project for solo use. Everything downstream (interview
transcript, extracted keywords, mind-map graph, chosen primitives,
sketches, approved direction, guidelines, asset library) is state that
belongs to a specific brand, not to the user's account in general. The AI
prompt always operates _inside_ a brand context: a fresh conversation
either starts a new one ("build a brand for my sister's bakery") or
resumes an existing one ("pull up the Northline Coffee mind-map"), and the
AI is responsible for disambiguating which brand a message refers to when
more than one is in flight.

### Text in, component out

The main page is a single prompt input — no separate wizard nav, no fixed
step list. The AI reads the conversation and the active brand's current
state, and its response is either (a) plain conversational text — during
the interview, when giving critique, when asking a clarifying question —
or (b) a specific interactive component pulled from a fixed registry
(mind-map canvas, geometric constructor, freeform canvas + brief,
review/comparison view, applications checklist, guideline preview, asset
library), pre-parameterized with that brand's own derived material.
Because Blazor Server already keeps a live connection to the client, the
same channel carrying the chat can push the next component down without a
page transition — the AI's "response" and the UI update are the same
event.

### The boundary that has to hold

The AI never outputs a finished mark, palette, or layout as its answer. It
can only ever summon a tool, pre-loaded with content the user themselves
surfaced (their keywords, their chosen tangible objects, their sketch),
and the user acts inside that tool to actually produce the asset. This is
what keeps the product from becoming exactly the template-reskinning tool
it's positioned against — the AI-guided pivot has to make the guidance
smarter without making the output more automatic.

### What this replaces

Sections 1–10 below still describe the same pipeline and the same
underlying logic as v0. What changes is delivery: each section's UI is no
longer a step in a linear wizard the user clicks through — it's a
component the AI decides to surface, at the point in the conversation
where it's earned. A user could, in principle, ask "show me the mind-map
again" mid-conversation and get it back, rather than being forced through
prior wizard steps to reach it.

---

## 1. Guided Interview & Discovery

- Structured interview flow capturing the client's message, mission,
  audience, and tone — modeled on a real brand-discovery conversation,
  not a static form. With the AI-prompt front end, this _is_ the opening
  conversation for a new brand — there's no separate form to fill out
  before it begins.
- Output of the interview feeds directly into keyword extraction — no
  generic "pick 3 mood words" shortcut.

## 2. Keyword Extraction & Mind Mapping

- Extract keywords from the interview conversation. Because the interview
  is already conversational with the AI doing the listening, extraction
  can happen inline, turn by turn, rather than as a separate batch step
  after the interview "ends."
- Once enough material exists, the AI's response becomes the **Mind-Map
  Canvas** component: keywords branch into related and derived words,
  with emphasis on surfacing **tangible, drawable objects** (not just
  abstract adjectives) that can become the seed of an actual mark.
- Three possible expansion mechanisms to derive related words, to be
  evaluated against each other:
    - **Thesaurus + design-psychology rule layer** — expand keywords via
      lexical relationships, then filter/weight results through a coded
      set of color/shape/type psychology principles authored from your
      own design judgment.
    - **Tree/graph algorithm approach** — model keyword relationships as
      a graph (e.g. word-association or semantic-distance graph) and use
      a traversal/expansion algorithm to surface related tangible
      concepts algorithmically.
    - **AI-assisted semantic expansion** _(new in v1)_ — use the same
      conversational model already running the interview to propose
      related tangible objects, constrained/grounded by the coded
      design-psychology rules so its suggestions aren't generic dictionary
      logic. This needs the same explainability scrutiny as Section 4's
      deliberately-non-AI choice: an LLM-expanded mind-map is harder to
      justify to a client than a rule-derived one, so this option has to
      earn its place on output quality, not just implementation
      convenience.
    - These aren't mutually exclusive — a graph structure can still be
      _seeded and weighted_ by the coded design-psychology rules, so the
      traversal isn't generic dictionary logic but reflects real design
      reasoning.
- This step is the core differentiator vs. template tools: recommendations
  downstream must trace back to the _specific_ objects/relationships
  surfaced here, not a generic category lookup (e.g. "playful → round
  shapes"). Keeping this derivation-based rather than lookup-based is
  what keeps the tool honest — and it's the reason the AI-assisted option
  above can't just paraphrase a generic answer.

## 3. Sketching / Mark Construction (mode-dependent)

Mode can be asked directly by the AI at the start of a new brand, or
inferred from how the user describes themselves during the interview
("I run a bakery" vs. "I'm a designer building out X"). Either way, from
that point on the AI's responses for this brand consistently surface the
matching component below.

### Beginner Mode — Constructive Geometry

- User builds a mark from geometric primitives (circles, arcs, lines,
  grids) inside the **Geometric Constructor** component, rather than
  freehand drawing or picking a template.
- Primitives, grid guides, and boolean operations (union/subtract/
  intersect) are pre-loaded based on the tangible objects derived from
  the user's own mind map — not a generic shape library.
- Curated, principle-based color and type pairings are presented as
  guided _choices_ within the same component, not a free-for-all color
  wheel or a single auto-generated answer — meaningful decision-making
  preserved even without color-theory knowledge.
- **Sketch Refinement Engine** (see Section 4) lowers the execution
  barrier further by cleaning up freehand input in real time, inside
  the same component.

### Experienced Mode — Guided Freeform

- Skilled users get the same interview → mind-map → direction output,
  but delivered as creative direction (a brief) rendered alongside a
  freeform canvas component, rather than construction scaffolding.
- Canvas is closer to freeform; user executes with their own hand skill,
  informed by the system's reasoning rather than constrained by it.
- Optionally exportable as a structured creative brief for use in
  external tools (Illustrator, Affinity, etc.).

## 4. Sketch Refinement Engine (shared infrastructure)

Automates "fewest points possible" vector cleanup from raw freehand
input — deterministic geometry, not ML/AI, so it's fast, explainable, and
free to run. This stays entirely outside the AI orchestration layer in
Section 0: the conversational model decides _when_ to surface the
constructor component, but never touches the point data inside it.

Pipeline:

1. **Raw input capture** — dense point sequence from pointer/touch input.
2. **Path simplification** — Ramer–Douglas–Peucker (RDP) algorithm to
   collapse dense noisy point sequences down to essential vertices.
3. **Corner detection** — angle-change analysis to distinguish intended
   sharp corners from segments that should smooth into continuous curves.
4. **Curve fitting** — Schneider bezier-fitting algorithm to produce
   minimal cubic bezier segments through the simplified points, output
   directly as SVG path data.
5. **Geometric snapping** — optional pass that detects near-perfect
   primitives (circles, straight lines, right angles) within tolerance
   and snaps to true geometric regularity.

Important distinction from tools like Google AutoDraw: this refines the
**user's own strokes**, it never swaps them out for pre-made library
art. The shape stays theirs — the tool only removes shakiness and
excess complexity, not creative authorship.

Implementation note: candidate for a Rust-to-WASM module (e.g. using
`kurbo`/`lyon` from the Linebender ecosystem) called from the Blazor
JS interop layer — keeps Rust in the stack for the one piece that
benefits most from it, even though the app shell is Blazor.

## 5. Presenting Sketches / Feedback Capture

- Structured review flow, delivered as a **Review** component the AI
  surfaces once sketches exist — for presenting initial directions (to a
  client, or to oneself in solo use) and capturing which direction
  resonates. The AI can prompt for reactions in conversation alongside
  the component, but the choice itself is made inside the component, not
  by describing a preference in text for the AI to interpret —
  replacing ad hoc email/Slack feedback threads with structured,
  trackable rounds.

## 6. Vector Refinement & Icon+Type Composition

- Continued refinement of the chosen direction into final vector art and
  icon/type lockups, using the same construction/beautification
  components as initial sketching — the AI re-surfaces the same
  Geometric Constructor or freeform canvas, now scoped to the chosen
  direction rather than open exploration.

## 7. Brand Applications & Guidelines

- System-generated checklist of applications to declare based on the
  client's industry/needs (print, social, signage, etc.), delivered as a
  checklist component — ensures nothing is missed, without generating
  the applications themselves.
- Do's and don'ts documentation support.

## 8. Related On-Brand Assets

- Once the core system (logo, palette, type) is established, support
  deriving consistent variations/extensions within that system, via the
  same constructor components now scoped to the established system's
  constraints.

## 9. Brand Guide Assembly & Handoff

- Automated compilation of all approved decisions (logo, palette, type
  system, usage rules, application examples) into a polished, exportable
  brand guide document, surfaced as a preview component the AI assembles
  once every prior stage for the brand is marked approved.

## 10. Brand Asset Management (post-handoff, ongoing)

- Central library for logos, color systems, fonts, and guidelines —
  versioned, shareable via links, accessible without a designer needing
  to resend files.
- In v1 this is no longer just a post-handoff archive: it's the
  persistent store behind every brand from the first interview message
  onward, which is what lets the AI resume a brand mid-conversation and
  lets a component reload exactly the state it left off in.
- This is the natural home for recurring subscription value, since it's
  ongoing utility rather than a one-time output.

---

## Open Questions / Next Decisions

- Keyword-expansion mechanism: thesaurus+rules vs. graph/tree algorithm
  vs. AI-assisted semantic expansion vs. hybrid — needs a prototype
  comparison before committing, now specifically weighing explainability
  against quality for the AI-assisted option.
- Component protocol: how does the AI actually request a specific
  component — a fixed tool-call/function-calling schema per component
  (mind-map, constructor, review, etc.), or a more open-ended generation
  approach? A fixed schema per component is safer for the "never outputs
  a finished asset" boundary, since the AI can only ever pick from a
  known, constrained set of tools rather than generate arbitrary UI.
- Mode selection: does the AI ask explicitly at the start of a new
  brand, or infer it from how the user talks about themselves, with a
  manual override available?
- Multi-brand disambiguation: how much can the AI infer from context
  alone ("the coffee shop one") before it needs an explicit brand-picker
  in the UI?
- Scope of v1: full pipeline (Sections 1–10) is a large build. Likely
  candidate for phased delivery — discovery/mind-map + brand asset
  management could plausibly ship before the full sketch-refinement
  engine is production-ready, and before every component in the
  registry exists.
- Business model: subscription (ongoing asset management + evolving
  methodology) rather than one-time purchase, given the ASP.NET/cloud
  direction.
