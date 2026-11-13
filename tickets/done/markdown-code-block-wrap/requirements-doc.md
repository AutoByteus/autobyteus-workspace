# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `markdown-code-block-wrap` (Project Task `autobyteus-23`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Request / ticket: autobyteus-23 — "Wrap long lines in markdown code blocks instead of scrolling sideways, in the chat (event monitor) and in opened markdown files, on desktop and mobile."
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-13
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's conversation message of 2026-11-13 informing the user of the decisions DEC-001…DEC-006 (recorded in `solution-revision-record.md` SR-001). The user approved the work itself in the Task comment of 2026-11-13 ("lets work on it").
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements and their approved versions: none. The probe in `evidence/solution-probe/` is evidence, not a behavior-defining supplement.

## Problem And Desired Outcome

- **Problem:** In an agent's reply in the conversation (event monitor), a fenced code block without a language (often a prose draft) keeps every line on one visual line. Long lines are cut off at the right edge and can only be read by scrolling sideways (user screenshot: `evidence/user-report-screenshot.png`). The same renderer shows markdown files opened in the Files tab, and it runs in the desktop app and in the phone (`/mobile`) version.
- **Affected actors:** a user reading agent output in the chat, or reading a markdown file opened in the Files viewer, on desktop or phone.
- **Desired outcome:** long lines in rendered markdown code blocks wrap to the available width, so all text is visible without sideways scrolling, in the chat and in opened markdown files, on desktop and mobile.
- **Observable definition of success:** at narrow and wide widths, a rendered code block's content is never wider than its box (no horizontal overflow, no cut-off text); copying the block's text gives exactly the original text.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001…SCN-004 | A fenced block **without** a language renders as `white-space: pre` in a box with `overflow: auto`: long lines run past the box and are cut off or need a sideways scroll. Measured: content 1343 px wide in a 358 px box (390 px layout), also overflowing at 700 and 1280 px. | Lines wrap to the box width; no horizontal overflow at any width. | Monospace font, grey background, padding, line breaks and spaces of the original text. | Investigation notes PRB-001; `MarkdownRenderer.vue` styles; `tailwind.config.js` typography `pre` |
| BEH-002 | User | SCN-005 | A fenced block **with** a language (Prism-highlighted) already wraps: its `code` has `white-space: pre-wrap; word-wrap: break-word` from `MarkdownRenderer.vue`. A wrapped part of a line continues at the block's left edge. | Unchanged in effect: wraps the same way as BEH-001's blocks (one rule for all fenced code). | Syntax highlighting colors, `tab-size`, leading indentation of every line. | PRB-001 (python block 358/358 px, no overflow) |
| BEH-003 | User | SCN-001 | Inline code with a long path already wraps. | Unchanged. | Inline code look and wrapping. | User screenshot; PRB-001 |
| BEH-004 | User | SCN-006 | A table whose content cannot be wrapped narrower than the box (many columns, long unbroken cell content) becomes wider than the message or document (measured 1835 px in a 358–1248 px box) and runs past the right edge. Tables whose cells contain ordinary text already wrap inside the cells. | A table that still does not fit after wrapping scrolls sideways **inside its own box**; the message or document around it never becomes wider than the available width. | Tables that fit look exactly as today (full width, same cell styling). | PRB-001 |
| BEH-005 | User | SCN-006 | A long display equation (`$$…$$`, `math` fences) is rendered by KaTeX with `white-space: nowrap` and no overflow rule, so it runs past the right edge. | Same as BEH-004: scrolls sideways inside its own box. | Equation rendering and centering. | `katex.min.css` rules `.katex-display` (Read) |
| BEH-006 | User | SCN-007 | No copy button exists on rendered markdown code blocks or on the in-scope surfaces (chat message, Files markdown preview, phone viewer); users copy by selecting text. Selection of a wrapped block copies the original text (a soft wrap inserts no character). | Unchanged: selecting and copying a wrapped block gives exactly the original text. | Any copy behavior that exists. | `grep -i copy` over the conversation, file explorer and mobile viewer components (no matches); PRB-002 |
| BEH-007 | User | SCN-008 | `MarkdownRenderer.vue` is shared by every rich-markdown surface: chat text, Thinking, inter-agent and task-notification segments, the Messages panel, and every markdown file preview (desktop Files tab, phone Files screen, artifacts, team/message reference viewers). | Every surface gets the same wrapping (BEH-001…BEH-005). | Each surface's own layout. | Investigation notes "Consumers of the shared renderer" |
| BEH-008 | User | SCN-009 | Mermaid diagrams, file-path actions beside fenced code, heading links, images, app font-size scaling. | Unchanged. | All of it. | `docs/content_rendering.md` |
| BEH-009 | User | SCN-010 | A markdown file's **edit** view in the Files tab is the Monaco editor (raw source, not rendered markdown). | Unchanged; it remains the way to see the raw, unwrapped source. | Monaco behavior. | `FileExplorerTabs.vue` edit/preview modes |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User reading the chat (desktop, phone) | Read an agent's reply, including drafts in code blocks | Every line readable without sideways scrolling | Copying gives the original text |
| User reading a markdown file (desktop Files tab, phone Files screen) | Read a document | Same as above | Same |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Read a fenced code block with long lines in the chat (event monitor), desktop and phone | SCN-001, SCN-002, SCN-005 |
| UC-002 | Read a fenced code block with long lines in a markdown file opened in the Files viewer, desktop and phone | SCN-003, SCN-004, SCN-005 |
| UC-003 | Read content that cannot wrap (wide table, long display equation) without the message or document becoming wider than the screen | SCN-006 |
| UC-004 | Copy the text of a wrapped code block | SCN-007 |

### Out Of Scope

- The Monaco editor (edit view of a file, code files opened in Files) and its wrap setting.
- Plain-text renderings that do not go through `MarkdownRenderer.vue` (user messages, tool-call/terminal/write-file segments, mobile activity items). They already wrap or are separate components.
- Adding copy buttons to code blocks (none exist today).
- The unused `components/conversation/segments/renderer/FileDisplay.vue` (recorded as FU-001).

### Non-Goals

- No toggle between wrapped and unwrapped code (DEC-002).
- No indentation-aware hanging indent for wrapped continuation lines (DEC-003).

### Preserved Behavior Boundary

BEH-002 (highlighting), BEH-003, BEH-006, BEH-008, BEH-009; REQ-006; AC-009. Cross-cutting invariant: the rendered text content of every code block is byte-for-byte the original fence content; only its visual line breaking changes.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every fenced code block rendered as code (with or without a language) wraps long lines to the width of its box. A run of characters with no break opportunity (a long URL, a long token) breaks where needed. No code block content is wider than its box. | BEH-001, BEH-002 | Must | The user's request | PRB-001 candidate: 0 px overflow at 390/700/1280 px, including a 280-character URL | User (Task); DEC-001 |
| REQ-002 | Wrapping only adds visual (soft) line breaks: every original line starts on a new visual line, with its original leading spaces and tabs, and blank lines stay. Font, background, highlighting and tab width are unchanged. | BEH-001, BEH-002 | Must | "Indentation must stay readable" (Task) | PRB-001 screenshots | Task; DEC-003 |
| REQ-003 | REQ-001/REQ-002/REQ-005 apply in the chat (event monitor) and in markdown files opened in the Files viewer, on desktop and on the phone, and on every other surface that shares the same markdown rendering. | BEH-007 | Must | One shared renderer; consistent reading everywhere | `MarkdownRenderer.vue` is the single renderer for all consumers (Read) | Task; DEC-004 |
| REQ-004 | Selecting and copying the text of a wrapped code block yields exactly the original text (no added line breaks, spaces or characters). | BEH-006 | Must | "Copy buttons still copy the original text" (Task); no copy button exists, so selection copy is the copy path | PRB-002: selection text equals the fence source at all widths | Task; DEC-005 |
| REQ-005 | Content that cannot wrap (a table still wider than its box after its cells wrap, a long display equation) scrolls sideways inside its own box. The message or document around it is never wider than the available width, and nothing is cut off. Content that fits looks as today. | BEH-004, BEH-005 | Must | Task: "If some content really can't wrap, say what it does instead" | PRB-001 candidate: table box scrolls (1835 px in a 358 px box), body 0 px overflow | DEC-006 |
| REQ-006 | Preserved: inline code, prose, headings and heading links, Mermaid diagrams, images, file-path actions beside fenced code (Event Monitor), syntax highlighting, app font-size scaling, the Monaco edit view. | BEH-003, BEH-008, BEH-009 | Must | No regression | Existing tests | Scope |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001; SCN-001 | Desktop chat at a wide (≈1280 px window) and a narrow (≈700 px window) size; an agent reply with a no-language fence whose lines are longer than the feed | Every line is fully visible, wrapped; the `pre` has no horizontal overflow (`scrollWidth ≤ clientWidth`) | — | Browser probe in real Chromium: DOM measurement + screenshots |
| AC-002 | REQ-001, REQ-003 | BEH-001; SCN-002 | Phone (`/mobile`) run screen, ≈390 px wide, same reply | Same as AC-001 | — | Phone-bundle browser case (`test:e2e:mobile-shell`, per TESTING.md) + screenshot |
| AC-003 | REQ-001, REQ-003 | BEH-001; SCN-003 | Desktop Files tab, markdown file in preview, wide and narrow panel | Same as AC-001 | — | Browser probe + screenshots |
| AC-004 | REQ-001, REQ-003 | BEH-001; SCN-004 | Phone Files screen, the same markdown file opened | Same as AC-001 | — | Phone-bundle browser case + screenshot |
| AC-005 | REQ-001, REQ-002 | BEH-002; SCN-005 | A fence with a language (e.g. `python`) with an indented long line, and a no-language fence with an indented long line | Both wrap; highlighting kept; each original line starts on a new visual line with its original indentation; blank lines kept | — | Probe measurement + screenshot; unit test of the rendered structure |
| AC-006 | REQ-001 | BEH-001; SCN-001 | A fence with a ≥200-character unbroken token (URL) | It breaks inside the box; no horizontal overflow | — | Probe measurement |
| AC-007 | REQ-004 | BEH-006; SCN-007 | Select all text of a wrapped block and copy | The copied text equals the fence's original content exactly | — | Probe: selection `toString()` equals the source; unit test: code element text equals source |
| AC-008 | REQ-005 | BEH-004, BEH-005; SCN-006 | A table with 8 columns of unbreakable content, and a long display equation, at ≈390 px and ≈1280 px | The table / equation box scrolls sideways itself; the message or document body has no horizontal overflow; a table that fits is full width as today | — | Probe measurement + screenshots; unit test of the rendered structure |
| AC-009 | REQ-006 | BEH-003, BEH-008, BEH-009 | Existing behavior | Existing `MarkdownRenderer`/`useMarkdownSegments` tests and the Mermaid probe still pass; inline code, file-path action links beside fenced code, heading links unchanged | — | `pnpm -C autobyteus-web test:nuxt` (renderer/composable specs), existing probes as impacted |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Read an agent reply | Desktop app, agent run conversation | Reply contains a fenced block with long lines | Open the run; read | All lines readable, wrapped | — | Supported Normal Scenario | User screenshot; Task | REQ-001…004; AC-001, AC-005…007 |
| SCN-002 | User | Phone user | Same | `/mobile` run screen (`MobileRunTargetView` → `AgentEventMonitor`) | Same | Same | Same | — | Supported Normal Scenario | Task ("both mobile and desktop") | AC-002 |
| SCN-003 | User | Desktop user | Read a markdown file | Files tab → open `.md` (preview) | File has a fenced block with long lines | Open the file | Same | — | Supported Normal Scenario | Task; user screenshot (draft-v1.md open) | AC-003 |
| SCN-004 | User | Phone user | Same | Phone Files screen → open `.md` (`MobileFileViewer`) | Same | Same | Same | — | Supported Normal Scenario | Task | AC-004 |
| SCN-005 | User | Any | Read source code in a block with a language | Any surface | Fence with a language | Read | Wraps like other blocks, highlighting and indentation kept | — | Supported Normal Scenario | Task "open, for the team" | AC-005 |
| SCN-006 | User | Any | Read content that cannot wrap | Any surface | Wide table or long display equation | Read; scroll that box sideways | Only that box scrolls; nothing cut off | — | Supported Explicit Edge Scenario (named by the Task) | Task | AC-008 |
| SCN-007 | User | Any | Copy a block's text | Any surface | Wrapped block | Select its text, copy | Original text copied | — | Supported Normal Scenario | Task | AC-007 |
| SCN-008 | User | Any | Read markdown on other surfaces sharing the renderer | Thinking, inter-agent/task notifications, Messages panel, artifact/reference viewers | Same content | Read | Same wrapping | — | Supported Normal Scenario | Shared renderer | REQ-003 |
| SCN-009 | User | Any | Existing rich content | Any surface | Mermaid, inline code, file actions, heading links | Use as today | Unchanged | — | Supported Normal Scenario | `docs/content_rendering.md` | AC-009 |
| SCN-010 | User | Desktop user | See raw unwrapped source of a markdown file | Files tab → Edit | — | Switch to Edit | Monaco raw source, unchanged | — | Supported Normal Scenario | `FileExplorerTabs.vue` | AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (visual text layout only)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested)
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable; candidate screenshots in `evidence/solution-probe/candidate-fix/` are illustrative evidence
- Normative visual and interaction details: REQ-001…REQ-005
- Explicitly illustrative fixture content or permitted implementation variation: the probe's text and exact CSS
- Required responsive behavior: same outcome at ≈390, ≈700 and ≈1280 px layouts
- Product decisions that need the user: none (all open points were delegated to the team by the Task; DEC-001…DEC-006)

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003; AC-001…AC-004 | Compatibility | Same result in the desktop (Electron/Chromium) renderer and the phone web bundle | All in-scope surfaces | Desktop probe + phone-bundle case |
| QR-002 | REQ-001 | Performance | No new per-render work on long text beyond styling; the existing `long-unbroken-text` cheap-shaping for ≥1000-char runs stays effective | Streaming chat | Design keeps it CSS/markup-only; review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (rendering only).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Chromium CSS text wrapping (`white-space: pre-wrap`, `overflow-wrap`) | Soft wraps add no characters to selection/copy | PRB-002 (Measured in Chromium) | Low |
| `@tailwindcss/typography` `pre` styles, `prismjs/themes/prism.css`, KaTeX CSS | Their `white-space`/`overflow` rules must be overridden at the renderer | Read + PRB-001 | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/solution-probe/` | Reproduction and candidate measurement | REQ-001…005 | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "Copy buttons" in the Task means copying the block's text; there is no copy button on these surfaces | AC-007 targets selection copy | Verified by grep (BEH-006); API/E2E confirms in the running UI | Confirmed by reading |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Do blocks with a language (real source code) wrap too, or keep a way to see them unwrapped? | Task leaves it open | (a) wrap all; (b) keep source unwrapped; (c) per-block toggle. Evidence: blocks with a language **already** wrap today (BEH-002); only no-language blocks scroll. | (a) Wrap all fenced code the same way. It is the user's stated direction ("markdown renders long lines wrapped"), it matches what language blocks already do, so nothing a user sees for source code changes, and one rule keeps all surfaces consistent. The unwrapped raw source of a markdown file stays available in the Files tab's Edit view (Monaco); in the chat, copying gives the exact original. A toggle would add UI for no reported need. | Solution Designer | Decided |
| DEC-002 | Add a wrap/unwrap toggle? | Extra UI | See DEC-001 | No (non-goal). | Solution Designer | Decided |
| DEC-003 | How does indentation stay readable when an indented line wraps? | Task: "Indentation must stay readable" | (a) plain soft wrap: original line starts and indentation kept exactly, continuation at the block's left edge (what language blocks do today); (b) hanging indent per line, which needs each source line split into its own element, rewriting Prism's highlighted HTML across lines and putting copy fidelity (REQ-004) at risk | (a). Every original line still starts on its own line at its exact indentation, so structure is readable; this matches the existing wrapped language blocks and common "wrap lines" views. (b) costs a per-line HTML rewrite of highlighted code and risks the copied text, for a small gain. | Solution Designer | Decided |
| DEC-004 | Which other places share the rendering, and do they change? | Task asks to name them | All rich-markdown surfaces use `MarkdownRenderer.vue` (BEH-007) | They all change the same way: a code block reads the same everywhere, and the fix belongs at the shared renderer rather than per surface. | Solution Designer | Decided |
| DEC-005 | What do "copy buttons" mean here? | AC-007 | No copy button exists on these surfaces (BEH-006) | Selection copy is the copy path; it must give the original text. No copy button is added. | Solution Designer | Decided |
| DEC-006 | What does content that cannot wrap do? | Task asks | Wide tables and long display equations overflow today (BEH-004, BEH-005). Options: (a) scroll inside their own box; (b) force breaks inside table cells anywhere (unreadable narrow columns); (c) leave as is | (a): only that box scrolls sideways; the message/document stays within the screen and nothing is cut off. This is the common practice (GitHub renders tables in a scrollable block). Tables that fit look unchanged. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001…AC-006 | SCN-001…SCN-005 | PRB-001 |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-005 | SCN-005 | PRB-001 |
| REQ-003 | UC-001, UC-002 | BEH-007 | AC-001…AC-004 | SCN-001…SCN-004, SCN-008 | Consumer inventory |
| REQ-004 | UC-004 | BEH-006 | AC-007 | SCN-007 | PRB-002 |
| REQ-005 | UC-003 | BEH-004, BEH-005 | AC-008 | SCN-006 | PRB-001 |
| REQ-006 | — | BEH-003, BEH-008, BEH-009 | AC-009 | SCN-009, SCN-010 | Existing tests |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-010.
- Constraints: one shared renderer; rendered text of a code block stays the original; phone and desktop share the renderer.
- Deferred to design: exact place of the rules (renderer stylesheet vs. markup), how tables get their own scroll box, how the probe/tests are organized.
- Technical facts to verify: CSS precedence over typography/Prism/KaTeX rules; the file-path action links beside fenced code; DOMPurify keeps any added wrapper markup.
- Known risks: an added table wrapper must survive sanitization and not change narrow-table appearance.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
