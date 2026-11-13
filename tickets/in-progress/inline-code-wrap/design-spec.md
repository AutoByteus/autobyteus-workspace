# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-13); the user approved the Task.
- Behavior-defining supplements: none.
- User approval of the design: `Not required`.
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/investigation-notes.md`
- Authorities read (2026-11-13): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md`, `TESTING.md`, `autobyteus-web/docs/content_rendering.md`; the autobyteus-23 design (`tickets/done/markdown-code-block-wrap/design-spec.md`).
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

Rendered markdown lands in `.markdown-renderer-segments .markdown-body.prose` (`MarkdownRenderer.vue:9`) on every surface. Since autobyteus-23 the renderer stylesheet wraps fenced code (`MarkdownRenderer.vue:193-197`) and gives tables and display math their own scroll box (`:205-209`, `:216-224`). Inline text has no wrap rule, so a run with no break point longer than the line runs past the edge (BEH-101…104, PRB-101). Separately, the typography config hides inline code's backticks with `content: '""'` (`tailwind.config.js:79-84`), which still generates empty boxes; with them, Chromium leaves an inline-code item's end padding 1–6 px past the line when it ends a line (BEH-105, PRB-102/103). No structural problem: the right owners exist.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one declaration in the renderer stylesheet, two values in `tailwind.config.js`, the existing running-app cases extended, one docs paragraph.
- Architectural risk: `Low`
- Risk rationale: presentation only, inside existing owners; `.prose` is used only by `MarkdownRenderer.vue` (and the unused `FileDisplay.vue`), so the config change reaches nothing else; tables keep their size (PRB-101 F).
- Escalation trigger: return a `Design Impact` if a running-app surface still overflows sideways with both changes, or a preserved autobyteus-23 behavior (AC-105) breaks.

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `MarkdownRenderer.vue:184-226` | Wrap rules exist for `pre` only | Add `overflow-wrap: break-word` on `.markdown-body` | — |
| Code | `tailwind.config.js:79-84` | `code::before/after { content: '""' }` | Change to `content: 'none'` | — |
| Probe | PRB-101 (A–F) | A leaves headings/URLs/prose overflowing; C squeezes tables; F clears everything and keeps tables | DEC-001, DEC-002 | Running-app hosts (RSK-101) |
| Probe | PRB-102, PRB-103 | Empty pseudo boxes cause the end-padding overhang; F: 0 of 1151 widths overflow | DEC-003 | WebKit not run (RSK-102) |
| Probe | PRB-104 | 60 KB run: 8–13 ms insert | No extra mitigation | — |
| Code | `grep -rln "\bprose\b"` | `.prose` only in `MarkdownRenderer.vue`, `FileDisplay.vue` (unused) | Config change is scoped to rendered markdown | — |
| Test | `tests/e2e/mobile-code-wrap-cases.mjs:16-17, 140-144, 197-198` | MSP-50…52 tolerate inline overflow | Remove the tolerance; extend content | — |

## Intended Change

Let all text in rendered markdown wrap inside the line (`overflow-wrap: break-word` on the markdown body) and remove the empty backtick pseudo-elements so inline code's padding never hangs past the edge.

## Change Scope (Mandatory)

- In scope: UC-101…UC-103. Areas: `MarkdownRenderer.vue` stylesheet; typography `code::before`/`code::after` in `tailwind.config.js`; the autobyteus-23 running-app cases `tests/e2e/mobile-code-wrap-cases.mjs` (and their fixture text); `autobyteus-web/docs/content_rendering.md` ("Long lines and wide content" text from autobyteus-23).
- Derived consumers: every `MarkdownRenderer.vue` consumer gets the new wrapping; `.prose` has no other consumer.
- Deliberately left alone: fenced code, table and math rules (autobyteus-23); inline code look (padding, background); user-message and other plain-text renderers; Monaco; hyphenation.
- Follow-ups: none new (autobyteus-23 FU-001, FU-003, FU-004 remain with the Project Task Manager).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101…104 | User | REQ-101, REQ-103; AC-101…103, AC-107 | Rendered markdown with long runs | Overflow (PRB-101) | Break inside only when longer than the line | DS-001/DS-002 → renderer stylesheet `.markdown-body { overflow-wrap: break-word }` |
| BEH-105 | User | REQ-102; AC-101…104 | Inline code ending a line | 1–6 px overhang | None | typography config `code::before/after { content: none }` |
| BEH-106 | User | REQ-104; AC-105 | Tables, math, fenced code | Own scroll / wrap | Preserved | — |
| BEH-107 | User | REQ-105; AC-106 | Copy | Original text | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/solution-probe/` | Reproduction, candidates, sweep | REQ-101…105 | `F.css` is the measured target (its `!important` is a probe convenience, not part of the design) | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (presentation)
- Current design issue found: `No`
- Structural triggers: none fire. Ruled out: *Capability-area reuse* (both changes go to the existing owners: renderer stylesheet for layout, typography config for inline code's generated content); *Several kinds or forms* (inline code, links, file-action links, linkified URLs, prose, headings, list items, table cells each traced in PRB-101; table cells keep min-content with `break-word`).
- Deliberate deviations: none.
- Root cause classification: `Local Implementation Defect` (no inline wrap rule at the renderer; empty generated boxes where none were meant).
- Refactor needed now: `No`
- Evidence: PRB-101…103.
- Design response: two declarations at their owners; tests updated.
- Intentional deferrals: none.

## Terminology

- **Unbreakable run**: text with no break opportunity (no space, no hyphen) longer than the line. No glossary change.

## Legacy Removal Policy (Mandatory)

- Obsolete: the `content: '""'` values (replaced by `'none'`); the inline-code tolerance in `mobile-code-wrap-cases.mjs` (`isInline` filtering at `:140-144`, conditions at `:197-198`) and its FU-002 comments.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` (rendering only).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-101…105 | Agent reply in a run (desktop, phone) | Text laid out within the message width | `MarkdownRenderer.vue` | UC-101 |
| DS-002 | Primary End-to-End | BEH-101…105 | Opened `.md` (desktop Files viewer, phone Files screen) | Same in the preview | `MarkdownRenderer.vue` | UC-102 |

## Primary Execution Spine(s)

- DS-001: `AgentEventMonitor -> AIMessage -> TextSegment (and other segments) -> MarkdownRenderer -> useMarkdownSegments -> .markdown-body + renderer stylesheet + typography styles -> browser layout`
- DS-002: `FileExplorerTabs | MobileFileViewer -> FileViewer -> MarkdownPreviewer -> MarkdownRenderer -> (same)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001/002 | The surface passes markdown to the shared renderer; its HTML is laid out under the renderer stylesheet and the typography styles; the new inherited `overflow-wrap` lets the browser break unbreakable runs at the line end, and inline code no longer carries empty generated boxes | Surface, renderer | `MarkdownRenderer.vue` | Typography config |

## Spine Actors / Main-Line Nodes

Host surfaces; `MarkdownRenderer.vue`.

## Ownership Map

- `MarkdownRenderer.vue` stylesheet: how rendered markdown lays out (now also inline wrapping).
- `tailwind.config.js` typography `DEFAULT.css`: base look of `.prose` elements, including inline code's generated content.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `content: '""'` for `code::before`/`code::after` (`tailwind.config.js:80, 83`) | Creates empty boxes that cause BEH-105; `none` hides the backticks without a box | `content: 'none'` | Same keys |
| Inline-code tolerance in `tests/e2e/mobile-code-wrap-cases.mjs` (`:16-17`, `:140-144`, `:197-198`, the `inlineCodePast` exception) | FU-002 is fixed | Inline code counted like all other text: nothing past the root | Keep reporting `inlineCodePast` only if it stays useful; it must be empty |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Typography config | DS-001/002 | Renderer | Base `.prose` styles | Tailwind typography is configured there | Overriding it in the renderer would leave two places defining inline code's generated content |

## Ownership Boundaries

Host surfaces must not add their own wrap or `overflow-x: clip` rules; layout of rendered markdown stays in the renderer stylesheet. `overflow-x: clip` on hosts was considered and rejected: it would hide real overflow, which is how the original bug looked (cut-off text).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `MarkdownRenderer.vue` | stylesheet, typography styles | all consumers | per-surface text-wrap rules | extend the renderer stylesheet |

## Dependency Rules

No dependency change. Process-wide bindings added or used: `None`.

## Interface Boundary Mapping

N/A — no interface added.

## Interface Boundary Check

N/A.

## Main Domain Subject Naming Check

N/A — no new names.

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Inline wrapping | Renderer stylesheet | Extend | Owns markdown layout (autobyteus-23) |
| Backtick hiding | Typography config | Extend (fix the value) | Owns `.prose` base styles |
| Running-app evidence | `mobile-code-wrap-cases.mjs` (MSP-50…52) in `test:e2e:mobile-shell` | Extend | Already covers desktop chat, Files viewer and phone at the required sizes |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| Markdown rendering (`components/conversation/segments/renderer/`, `tailwind.config.js` typography) | Inline wrapping, inline code generated content | DS-001/002 | Extend |

## Draft File Responsibility Mapping

| File | Concern | Change |
| --- | --- | --- |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Layout rules | Add `.markdown-renderer-segments .markdown-body { overflow-wrap: break-word; }` |
| `autobyteus-web/tailwind.config.js` | Typography base | `'code::before': { content: 'none' }`, `'code::after': { content: 'none' }` |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | Running-app cases | Remove the inline tolerance; add content (below) |
| `autobyteus-web/docs/content_rendering.md` | Docs | Say that long words, URLs and inline code wrap in rendered markdown |

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

Same as the draft.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As in the draft mapping; no new files or folders.

## Folder Boundary Check

N/A — no placement change.

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Inline wrap | `.markdown-renderer-segments .markdown-body { overflow-wrap: break-word; }` (inherited by inline code, links, prose, headings, list items, table cells) | `overflow-wrap: anywhere` on `.markdown-body` (squeezes tables, PRB-101 C); `anywhere` on inline code only (PRB-101 A leaves headings and URLs overflowing); `word-break: break-all` (breaks ordinary words) | Breaks only runs longer than the line; table min-content unchanged |
| Backticks | typography `'code::before': { content: 'none' }` | `content: '""'` (empty box, BEH-105); `box-decoration-break: clone` (worse, PRB-102) | No generated box at all |

The `pre` rule from autobyteus-23 keeps `overflow-wrap: anywhere` and wins by specificity; it is not changed.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the test tolerance for inline overflow | Smaller test diff | Rejected | Tolerance removed |
| `overflow-x: clip` on hosts | Hide the few-pixel overhang | Rejected | Cause removed (DEC-003) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. `tailwind.config.js`: `content: 'none'` for both pseudo-elements.
2. `MarkdownRenderer.vue`: add the `.markdown-body` rule next to the autobyteus-23 rules.
3. `mobile-code-wrap-cases.mjs`: extend the fixture with the user's heading ("# Draft v1 — LinkedIn reply to Shubham Saboo (Elephant/Goldfish Model)"), a long bare URL, a long token, and a list item ending in short inline code; require nothing past the root (inline code included), no host or page overflow, at every size it already runs (desktop answer/message 1280 and 700, Files viewer 167 / maximized / 700 drawer, phone answer/file/message 390 and 360); copy of a wrapped inline path and URL equals the source.
4. Docs paragraph.

## Key Tradeoffs

- A word longer than the line breaks inside (e.g. "LinkedI / n" in a 167 px viewer) rather than being cut off or scrolling; ordinary text is unaffected.
- One inherited rule for all text instead of inline code only: covers headings and URLs that the Task's outcome needs.

## Risks

- RSK-101: a running-app host could add overflow; the extended MSP cases check every host.
- RSK-102: WebKit is not run (Linux); the rules are standard CSS.

## Guidance For Implementation

- Reproduction to start from: `evidence/solution-probe/probe.cjs` and `sweep.cjs` (commands in investigation notes PRB-101, PRB-103); without a candidate they show the overflow, the change must make `sweep.cjs` report `0 widths overflow` on the app's CSS.
- Checks: the width sweep on the changed CSS (AC-104) as implementation evidence; the renderer/composable specs and `app-font-size-fixed-px-audit.integration.test.ts` stay green; the extended MSP-50…52 run in `pnpm -C autobyteus-web test:e2e:mobile-shell` (AC-101…103, AC-105, AC-106), with screenshots.
- No px font sizes in the renderer stylesheet.
