# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-13); the user approved the work in the Task comment of 2026-11-13.
- Behavior-defining supplements: none.
- User approval of the design, when the direction requires it: `Not required` (the Task does not ask for design approval).
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/investigation-notes.md`
- Authorities read (2026-11-13): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md` (no closer `DESIGN*.md` under `autobyteus-web/`), `TESTING.md`, `autobyteus-web/docs/content_rendering.md`. `references/design-examples.md` not used (no shape needing an example beyond those below).
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

All rich markdown in the app (chat segments, the Messages panel, every markdown file preview on desktop and phone) is rendered by one component, `MarkdownRenderer.vue`, through `useMarkdownSegments.ts` (markdown-it → Prism/KaTeX/file-action rules → DOMPurify) into `div.markdown-body.prose` inside `div.markdown-renderer-segments` (`MarkdownRenderer.vue:9`). The component's global `<style>` block, scoped by `.markdown-renderer-segments`, owns code-block presentation for every surface.

That stylesheet wraps only code with a language class (`MarkdownRenderer.vue:191-193`: `code[class*="language-"] { white-space: pre-wrap; word-wrap: break-word }`). A fence without a language is rendered by markdown-it's default fence as `<pre><code>` with no class (`utils/markdownItPrism.ts:29-30`), so it keeps the browser's `white-space: pre` inside the typography `pre { overflow: auto }` (`tailwind.config.js` typography `pre`). That is the reported overflow (PRB-001). Tables (`<table>`, typography `width: 100%`) and KaTeX display math (`.katex-display > .katex { white-space: nowrap }`) have no contained overflow either (BEH-004, BEH-005).

There is no structural problem: the right owner exists; it lacks one rule for the general case.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one component stylesheet (`MarkdownRenderer.vue`), one new 20-line markdown-it plugin file, one `.use(...)` line in `useMarkdownSegments.ts`, unit tests, one docs section. No new owner, API or state.
- Architectural risk: `Low`
- Risk rationale: presentation-only change inside the existing renderer owner; no contract, persistence, security, concurrency, deployment or ownership-boundary change. The change reaches every rich-markdown surface by intent (REQ-003); the markup change (a wrapper `div` around tables) is sanitizer-safe (`div`/`class` allowed, `useMarkdownSegments.ts:391-398`) and the visual effect is measured (PRB-001).
- Escalation trigger: return a `Design Impact` if the wrapper is stripped or changes a narrow table's look, if any surface's own container still overflows after the renderer fix (RSK-001), or if the renderer change breaks an existing renderer behavior (AC-009).

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `MarkdownRenderer.vue:184-198` | Wrap rule only for `code[class*="language-"]`; `pre[class*="language-"]` has margin/padding/overflow | Move wrapping to all `pre`/`pre > code` in the markdown body; remove the language-only wrap declarations | — |
| Code | `utils/markdownItPrism.ts:16-30` | Language fences get classes; others use the default fence | The rule must not depend on a language class | — |
| Code | `useMarkdownSegments.ts:124-128` | `mdWithPrism` is the HTML renderer and takes markdown-it plugins | Table wrapper as a plugin `.use()`d there | — |
| Code | `useMarkdownSegments.ts:391-398` | DOMPurify keeps `class` (default + `ADD_ATTR`) and `div` | Wrapper survives sanitization; a unit test proves it | — |
| Probe | PRB-001 (`evidence/solution-probe/probe.cjs`, `fix.css`) | Candidate rules: every `pre` fits at 390/700/1280 px; wide table scrolls in its box; body never overflows | REQ-001, REQ-005 | Running-app containers (RSK-001) |
| Probe | PRB-002 | Selection copy equals source | REQ-004 | — |
| Probe | PRB-003 (`perf.cjs`) | 60 KB unbroken run: layout 7–36 ms with wrapping | No mitigation needed beyond the existing `long-unbroken-text` | — |
| Dep | `katex.min.css`; KaTeX markup via `@mdit/plugin-katex` | `.katex-display` wraps every display equation (`$$` blocks and `math` fences) | Contained scroll on `.katex-display` | Tall glyph clipping (RSK-002) |
| Test | `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:28` | Audits `MarkdownRenderer.vue` for px font sizes | New rules set no font sizes | — |

## Intended Change

Make wrapping the renderer's rule for every fenced code block, not only for blocks with a language; give content that cannot wrap (tables, display math) its own horizontal scroll box. Everything stays inside the existing renderer owner.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004. Areas: the `MarkdownRenderer.vue` stylesheet, a markdown-it table plugin used by `useMarkdownSegments.ts`, their unit tests, the "Markdown Rendering" section of `autobyteus-web/docs/content_rendering.md`.
- Derived consumers: every `MarkdownRenderer.vue` consumer (investigation notes, "Consumers Of The Shared Renderer") gets the new presentation; decision: all change, none needs its own edit (DEC-004).
- Deliberately left alone: the Monaco editor (Edit view), plain-text renderers (`UserMessage.vue`, tool/terminal/write-file segments), `MermaidDiagram.vue` (already contained), inline code, Prism theme import, the `long-unbroken-text` mechanism, the per-surface containers (`AIMessage.vue`, `FileViewer.vue`, `MarkdownPreviewer.vue`), and `AIMessage.vue`'s own scoped `pre` style (does not reach rendered markdown, which lives in a child component; not touched).
- Follow-ups: FU-001 (unused `FileDisplay.vue`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…004; AC-001…004, 006, 007 | Reply or `.md` with a no-language fence | Overflows (PRB-001) | Wraps; copy unchanged | DS-001 / DS-002 → renderer stylesheet rule `pre`, `pre > code` |
| BEH-002 | User | REQ-001, REQ-002; AC-005 | Fence with a language | Wraps already | Same rule (moved from language-only to general); highlighting unchanged | DS-001 / DS-002 |
| BEH-004 | User | REQ-005; AC-008 | Wide table | Overflows | Table inside `div.markdown-table-scroll` that scrolls; table look unchanged | DS-003 (render) + stylesheet |
| BEH-005 | User | REQ-005; AC-008 | Long display equation | Overflows | `.katex-display` scrolls itself | Stylesheet |
| BEH-003, 006, 008, 009 | User | REQ-006; AC-009 | Existing | Existing | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/solution-probe/` | Reproduction and candidate | REQ-001…005 | `fix.css` is the measured candidate the rules below follow; not normative CSS text | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (presentation)
- Current design issue found: `No`
- Structural triggers: none fire. Plausible ones ruled out: *Capability-area reuse* — the renderer stylesheet and the markdown-it plugin set already own this, and are reused; *Empty indirection* — the table plugin is a markdown-it render rule that changes HTML (owns a transformation), following `markdownItPrism.ts`; *Several kinds or forms* — the rule serves fences with and without a language, math fences, `$$` math and tables, each traced above; *Responsibility overload* — `useMarkdownSegments.ts` (443 lines) only gains one `.use()` line, the rule lives in its own file.
- Deliberate deviations: none.
- Root cause classification: `Local Implementation Defect` (the wrap rule is attached to the language-specific selector instead of all fenced code).
- Refactor needed now: `No`
- Evidence: `MarkdownRenderer.vue:191-193`; PRB-001.
- Design response: general `pre`/`pre > code` rule in the same stylesheet, replacing the language-only wrap declarations; table plugin; display-math rule.
- Refactor rationale: owner and boundary are correct.
- Intentional deferrals: none.

## Terminology

- **Fenced code block**: a ```` ``` ```` block in markdown, with or without a language, other than Mermaid (`mermaid`/`mmd`, rendered as diagrams) and math fences (`math`, `katex`, `latex`, `math-inline`, rendered by KaTeX).
- **Soft wrap**: a visual line break added by layout; no character is added to the text.
- No project glossary word is introduced or changed (`GLOSSARY.md` not affected).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the `white-space`/`word-wrap` declarations in the language-only rule (`MarkdownRenderer.vue:192-193`), replaced by the general rule.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — rendering only; no stored data read or written differently.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 004, 005, 007 | Agent reply text in a run (desktop or phone) | Wrapped code / contained table in the chat | `MarkdownRenderer.vue` | Chat use case (UC-001, UC-003) |
| DS-002 | Primary End-to-End | BEH-001, 002, 004, 005, 007 | User opens a `.md` file (desktop Files tab, phone Files screen) | Same in the file preview | `MarkdownRenderer.vue` | File use case (UC-002, UC-003) |
| DS-003 | Bounded Local | BEH-004 | markdown tokens | sanitized HTML segment | `useMarkdownSegments` | Where the table wrapper is produced |

## Primary Execution Spine(s)

- DS-001: `AgentEventMonitor -> AIMessage -> TextSegment (or Think / InterAgent / SystemTaskNotification segment) -> MarkdownRenderer -> useMarkdownSegments (parse -> render with plugins -> sanitize) -> rendered segment + renderer stylesheet -> browser layout`
- DS-002: `FileExplorerTabs (desktop) | MobileFileViewer (phone) -> FileViewer -> MarkdownPreviewer -> MarkdownRenderer -> useMarkdownSegments -> rendered segment + renderer stylesheet -> browser layout`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The chat passes each text segment's markdown to the shared renderer, which builds sanitized HTML and shows it under its stylesheet; the stylesheet decides how code, tables and math lay out at the available width | Monitor, message, segment, renderer | `MarkdownRenderer.vue` | Prism highlighting, KaTeX, table plugin, DOMPurify |
| DS-002 | The file viewer picks the markdown previewer, which passes the file text to the same renderer | File viewer, previewer, renderer | `MarkdownRenderer.vue` | Same, plus workspace image resolver (unchanged) |
| DS-003 | Tokens are rendered by `mdWithPrism`; the table plugin's `table_open`/`table_close` rules wrap each table; DOMPurify keeps the wrapper | Render rules, sanitizer | `useMarkdownSegments` | — |

## Spine Actors / Main-Line Nodes

`AgentEventMonitor`/`FileViewer` (host surfaces), `MarkdownRenderer.vue` (presentation owner), `useMarkdownSegments` (HTML producer).

## Ownership Map

- `MarkdownRenderer.vue` stylesheet: owns how rendered markdown lays out (code wrapping, contained scroll of tables and display math) for every surface.
- `useMarkdownSegments`: owns the HTML shape (plugins, sanitization).
- `utils/markdownItScrollableTables.ts` (new): owns one transformation: each rendered table is wrapped in its scroll box.
- Host surfaces: own their containers only; unchanged.

## Thin Entry Facades / Public Wrappers

N/A — none added.

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `white-space: pre-wrap; word-wrap: break-word;` in `.markdown-renderer-segments .markdown-body code[class*="language-"]` (`MarkdownRenderer.vue:192-193`) | The general fenced-code rule covers language blocks | General `pre` / `pre > code` rule | Keep the rule's font-family, font-size, line-height |

No dead code in the touched files (checked: `MarkdownRenderer.vue`, `useMarkdownSegments.ts`). Dead code elsewhere: FU-001.

## Return Or Event Spine(s)

N/A — no events change.

## Bounded Local / Internal Spines

- Parent owner `useMarkdownSegments`: `tokens -> mdWithPrism.renderer.render (fence rule, table_open/table_close rules, KaTeX) -> DOMPurify.sanitize -> html segment` (DS-003). It matters only because the wrapper must be emitted by the renderer and survive sanitization.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Table scroll wrapper (markdown-it plugin) | DS-003 | `useMarkdownSegments` | Wrap `<table>…</table>` in `<div class="markdown-table-scroll">` | A table cannot get its own scroll box from CSS alone without changing its layout (`display: block` on a table stops it filling the width) | Per-surface wrappers would duplicate it |

## Ownership Boundaries

`MarkdownRenderer.vue` is the only authority for rendered-markdown presentation; host surfaces must not add code-wrap rules of their own (that would split the policy per surface). `useMarkdownSegments` is the only producer of the HTML.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `MarkdownRenderer.vue` | `useMarkdownSegments`, plugins, stylesheet | All consumers listed in the investigation notes | A consumer styling `.markdown-body pre` itself | Extend the renderer stylesheet |

## Dependency Rules

- `useMarkdownSegments.ts` → `utils/markdownItScrollableTables.ts` (like `utils/markdownItPrism.ts`). The plugin depends only on `markdown-it` types.
- Consumers keep depending only on `MarkdownRenderer.vue`.
- Process-wide bindings or after-construction collaborators added or used: `None`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `markdownItScrollableTables(md: MarkdownIt): void` | A markdown-it instance | Install `table_open`/`table_close` render rules | N/A | A markdown-it plugin: changes rendered HTML (a transformation), not a forwarding layer |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `markdownItScrollableTables` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Table plugin | `markdownItScrollableTables` | Yes | Yes (follows `markdownItPrism`) | Low | — |
| Wrapper class | `markdown-table-scroll` | Yes | Yes (new, single meaning) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Code wrapping | `MarkdownRenderer.vue` stylesheet | Extend | It already owns code-block presentation for all surfaces |
| Table wrapper markup | markdown-it plugins used by `useMarkdownSegments` (`markdownItPrism`) | Extend (new plugin file in the same place) | Same mechanism, one concern per plugin |
| Long-run performance | `long-unbroken-text` (`app.vue:72`) | Reuse unchanged | PRB-003 |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| Markdown rendering (`components/conversation/segments/renderer/`, `composables/useMarkdownSegments.ts`, `utils/markdownIt*.ts`) | Code wrap, table/math contained scroll | DS-001…003 | `MarkdownRenderer.vue` | Extend |

## Draft File Responsibility Mapping

| File | Area | Owner | Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `components/conversation/segments/renderer/MarkdownRenderer.vue` (`<style>`) | Markdown rendering | Renderer | Layout rules | Existing stylesheet of the owner | — |
| `utils/markdownItScrollableTables.ts` (new) | Markdown rendering | `useMarkdownSegments` | Table wrapper render rules | One markdown-it plugin, one concern | — |
| `composables/useMarkdownSegments.ts` | Markdown rendering | — | `.use(markdownItScrollableTables)` on `mdWithPrism` | One line | — |

## Reusable Owned Structures Check

N/A — no repeated structure.

## Shared Structure / Data Model Tightness Check

N/A — no shared structure.

## Final File Responsibility Mapping

Same as the draft.

## Applied Patterns

markdown-it plugin (render-rule override), as `markdownItPrism`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | File (modify `<style>`) | Renderer | Rules below | Owner's stylesheet | px font sizes; surface-specific rules |
| `autobyteus-web/utils/markdownItScrollableTables.ts` | File (add) | `useMarkdownSegments` | Wrap tables | Next to `markdownItPrism.ts` | Any other render rule |
| `autobyteus-web/composables/useMarkdownSegments.ts` | File (modify) | — | Use the plugin on `mdWithPrism` | Existing plugin chain | — |
| `autobyteus-web/utils/__tests__/markdownItScrollableTables.spec.ts` or `composables/__tests__/useMarkdownSegments.spec.ts` | Test | — | See Guidance | Colocated tests | — |
| `autobyteus-web/docs/content_rendering.md` | Doc (modify, "Markdown Rendering") | — | Describe wrapping and contained scroll, and that the Edit view keeps raw source | Renderer's doc | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `utils/markdownIt*.ts` | Off-Spine Concern | Yes | Low | Existing plugin location |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Code wrap rule | `.markdown-renderer-segments .markdown-body pre, .markdown-renderer-segments .markdown-body pre > code { white-space: pre-wrap; overflow-wrap: anywhere; }` | Wrapping only `code[class*="language-"]` (today), or adding a rule in `AIMessage.vue`/`MarkdownPreviewer.vue` per surface | One rule, one owner, all fences; specificity 0,2,1/0,2,2 beats Prism (0,1,1) and typography (`:where`, 0,1,0) |
| Table box | Rendered: `<div class="markdown-table-scroll"><table>…</table></div>`; CSS: `.markdown-renderer-segments .markdown-body .markdown-table-scroll { max-width: 100%; overflow-x: auto; }` | `table { display: block; overflow-x: auto }`: a block-displayed table no longer fills the width, so narrow tables change look | Keeps narrow tables as today (REQ-005) |
| Display math | `.markdown-renderer-segments .markdown-body .katex-display { max-width: 100%; overflow-x: auto; overflow-y: hidden; }` | Forcing KaTeX to wrap | KaTeX cannot wrap display math |
| Plugin | `md.renderer.rules.table_open = (t, i, o, e, self) => '<div class="markdown-table-scroll">' + self.renderToken(t, i, o)`; `table_close` → `self.renderToken(...) + '</div>'` | Regex post-processing of the HTML string | Token rules keep attributes and nesting correct |

`overflow-wrap: anywhere` (not `break-word`) also lowers the block's min-content width, so a code block inside a table cell or flex item can shrink too. The rule sets no `word-break`, so ordinary lines break at spaces and only unbreakable runs break inside.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the language-only wrap declarations next to the general rule | Minimal diff | Rejected | Removed; the general rule covers them |
| Per-surface opt-in (prop on `MarkdownRenderer`) | Limit blast radius | Rejected (DEC-004) | One behavior everywhere |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add `utils/markdownItScrollableTables.ts` and `.use()` it on `mdWithPrism` in `useMarkdownSegments.ts` (after `markdownItPrism`).
2. In `MarkdownRenderer.vue` `<style>`: add the general fenced-code rule; remove `white-space`/`word-wrap` from the `code[class*="language-"]` rule; add `.markdown-table-scroll` and `.katex-display` rules.
3. Unit tests (below); update `docs/content_rendering.md`.

## Key Tradeoffs

- Plain soft wrap instead of a hanging indent (DEC-003): continuation of a wrapped indented line starts at the block's left edge; in exchange the highlighted HTML and the copied text stay untouched.
- Wrapping source code too (DEC-001): consistent with today's language blocks; the raw unwrapped source of a markdown file stays available in the Files tab's Edit view.

## Risks

- RSK-001: a host container might overflow independently of the renderer; covered by browser cases in each surface.
- RSK-002: `overflow-y: hidden` on `.katex-display` could clip a tall glyph; check one tall equation (e.g. a fraction or integral) in the browser cases.

## Guidance For Implementation

- Reproduction to start from: `evidence/solution-probe/probe.cjs` (command in the investigation notes, PRB-001). Without `fix.css` it shows the overflow; the app change must produce the candidate's measurements in the real surfaces.
- Unit tests (happy-dom/jsdom cannot measure layout, so they prove structure and text): (a) a table renders inside `div.markdown-table-scroll` after sanitization (`// @vitest-environment jsdom`, per TESTING.md for DOMPurify specs), a table inside a list item too; (b) a no-language fence's `code` text equals the original fence content exactly (no inserted characters), as does a language fence's text; (c) existing `useMarkdownSegments`/`MarkdownRenderer` specs and `app-font-size-fixed-px-audit.integration.test.ts` pass.
- Rendered checks (the AC-001…AC-008 evidence, real Chromium): the chat and a markdown file preview on desktop at ≈1280 and ≈700 px windows, and on the phone bundle at ≈390 px (phone chat and phone Files screen), with: a no-language fence of long prose lines, a python fence with an indented long line, a 200+ character URL in a fence, an 8-column table of unbreakable cells, a narrow table, a long `$$` equation and one tall equation. Assert per `pre`: `scrollWidth <= clientWidth`; per markdown body: no horizontal overflow; wide table: its `.markdown-table-scroll` scrolls; selection copy equals the source; screenshots of each. TESTING.md requires the phone case in `pnpm -C autobyteus-web test:e2e:mobile-shell`; `tests/e2e/mobile-heading-links-cases.mjs` (autobyteus-480) is the precedent for desktop Files, phone viewer and conversation cases on this renderer.
- Do not set any px font size in the renderer stylesheet (font-size audit).
