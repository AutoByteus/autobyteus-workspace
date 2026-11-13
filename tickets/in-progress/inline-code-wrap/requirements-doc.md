# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `inline-code-wrap` (Project Task `autobyteus-24`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Request / ticket: autobyteus-24 — "Let long paths in inline code wrap in rendered markdown, so the narrow Files viewer and phone-width chat never scroll sideways." Follow-up FU-002 of autobyteus-23 (`tickets/done/markdown-code-block-wrap/`).
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-13
- Approved by and reference: `Solution Designer within the direction (user informed)`; the user approved the Task ("That works. lets do it", Task comment 2026-11-13). The decisions DEC-001…DEC-004 were reported to the user in the Solution Designer's conversation on 2026-11-13 (`solution-revision-record.md` SR-001).
- Exact approved requirements baseline: this document at SR-001.
- Behavior-defining supplements: none.

## Problem And Desired Outcome

- **Problem:** autobyteus-23 made fenced code blocks wrap. A word with no break point that is longer than the line still runs past the right edge: a path in inline code, a link or bare URL, a long token in prose, or a long word in a heading. In the narrow desktop Files viewer (167 px beside the file tree) and in a phone-width chat, the document then scrolls sideways or is cut off. Measured today: inline code 16–159 px past the edge, links and bare URLs 311–454 px, prose tokens up to 764 px, and heading words up to 209 px. At least one of them overflows at 781 of 1151 widths between 150 and 1300 px (PRB-101, PRB-103). The user's own screenshot of autobyteus-23 shows the heading "Draft v1 — LinkedIn reply to Shubham Saboo (Elephant/Goldfish Model)" cut off in the Files viewer.
- **Desired outcome:** all text in rendered markdown wraps within the available width, on desktop and phone, in the chat and in opened markdown files. Nothing runs past the edge except content that has its own scroll box (wide tables, display math, from autobyteus-23).
- **Observable definition of success:** at every width, the rendered markdown root has no horizontal overflow from text, and its host does not scroll sideways. Copying gives the original text.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | User | SCN-101…104 | Inline code breaks only at the browser's normal opportunities (spaces, after `-`); a longer run runs past the edge (159 px at 167 px, 16 px at 310 px) | Breaks inside the run where needed; never past the edge | Inline code look (background, monospace, padding) | PRB-101; autobyteus-23 MSP-51, IMP-04 |
| BEH-102 | User | SCN-101…104 | Links, file-action links and bare URLs (linkify) do not break inside a long URL (up to 454 px past) | Same as BEH-101 | Link look and behavior (click, file actions) | PRB-101 |
| BEH-103 | User | SCN-101…104 | A prose word or token longer than the line runs past (up to 764 px) | Same | Prose breaks at spaces as today | PRB-101 |
| BEH-104 | User | SCN-101…104 | A heading word longer than the line runs past (up to 209 px); seen in the user's autobyteus-23 screenshot | Same | Heading size and weight | PRB-101; `tickets/done/markdown-code-block-wrap/evidence/user-report-screenshot.png` |
| BEH-105 | User | SCN-101…104 | An inline-code item that ends a line lets its right padding hang 1–6 px past the edge at certain widths (e.g. 179–183, 197–201, 274–275 px), so the host scrolls sideways by those pixels | Never past the edge | Same padding and look | PRB-102, PRB-103 |
| BEH-106 | User | SCN-105 | Wide tables and display equations scroll inside their own box; fenced code wraps (autobyteus-23) | Unchanged | All of it | autobyteus-23 AC-008; PRB-101 (table 1835 px in its box) |
| BEH-107 | User | SCN-106 | Selection copy gives the original text | Unchanged (a soft wrap adds no character) | — | PRB-101 `copyEqual` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User reading the chat (desktop, phone) or a markdown file (desktop Files viewer, phone Files screen) | Read everything without scrolling sideways | All text within the width | Copy gives the original text |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-101 | Read rendered markdown with long unbreakable text (inline-code paths, links/URLs, long tokens, long heading words) in the chat, desktop and phone | SCN-101, SCN-102 |
| UC-102 | Same in a markdown file in the Files viewer (desktop, including its narrow default width) and the phone Files screen | SCN-103, SCN-104 |
| UC-103 | Copy such text | SCN-106 |

### Out Of Scope

- Plain-text renderers outside `MarkdownRenderer.vue` (user messages already use `break-words`; tool and terminal segments).
- The Monaco editor.
- Typographic hyphenation (`hyphens: auto`).
- FU-003 and FU-004 of autobyteus-23 (math parsing, KaTeX SVG).

### Non-Goals

- No change to how ordinary text breaks: it breaks at spaces and hyphens first, as today. A word is broken inside only when it is longer than the whole line.

### Preserved Behavior Boundary

BEH-106, BEH-107; autobyteus-23 REQ-001…REQ-006 (fenced code wraps; wide tables and display math scroll in their own box; copy; inline code look; heading links; Mermaid; file actions).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior is a `Requirement Gap` and needs the user's approval.
- An adjacent concern outside the boundary is a non-blocking follow-up unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-101 | In rendered markdown, a run of text with no break point that is longer than the line is broken inside to fit the line. This applies to inline code, links (including file-action links and linkified URLs), prose and headings. Text with normal break points breaks there, as today. | BEH-101…104 | Must | Task; user direction "should automatically wrap, instead of showing the horizontal scroll" | PRB-101 candidate: no text past the root at 167, 202, 262, 310, 1248 px | Task; DEC-001, DEC-004 |
| REQ-102 | No part of an inline-code box (its padding included) runs past the content edge at any width. | BEH-105 | Must | Even a few pixels make the Files viewer scroll sideways | PRB-103: 0 of 1151 widths (150–1300 px) overflow with the candidate | DEC-003 |
| REQ-103 | REQ-101/REQ-102 hold in the chat and in markdown files, on desktop (including the 167 px Files viewer) and on the phone, and on every other surface that shares the renderer. | — | Must | Task | One shared renderer (autobyteus-23 investigation) | Task |
| REQ-104 | Wide tables and display equations keep scrolling in their own box; a table cell's unbreakable content is not broken to make the table narrower. Fenced code is unchanged. | BEH-106 | Must | Preserve autobyteus-23 DEC-006 | PRB-101: candidate C (`anywhere` on the body) squeezes the 1835 px table to 221 px by breaking cell words; candidate F keeps 1835 px in its box | DEC-002 |
| REQ-105 | Copying wrapped text gives the original text, with no added characters or line breaks. | BEH-107 | Must | Task | PRB-101 | Task |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | REQ-101, REQ-102, REQ-103 | BEH-101…105; SCN-103 | Desktop Files viewer at its default width beside the file tree (≈167 px at a 1280 px window), a markdown file with a long inline-code path, a file-action/linked path, a long bare URL, a long token, a heading with long words, and short inline code ending a line in a list | No text or inline-code box past the document; the viewer does not scroll sideways (`scrollWidth == clientWidth` of `MarkdownPreviewer`'s container) | — | Running-app browser case + screenshot |
| AC-102 | same | SCN-101 | Desktop chat at 1280 and 700 px windows, same content in an agent reply | Same, for the message body and the feed | — | Running-app browser case + screenshot |
| AC-103 | same | SCN-102, SCN-104 | Phone bundle at 390 and 360 px: chat (the agent's answer, an inter-agent message) and the phone Files screen | Same | — | `test:e2e:mobile-shell` case + screenshots |
| AC-104 | REQ-102 | BEH-105 | Renderer content above, host width swept 150…1300 px in 1 px steps with the app's CSS | 0 widths with horizontal overflow | — | Width-sweep check in real Chromium (implementation evidence) |
| AC-105 | REQ-104 | BEH-106 | The 8-column table of unbreakable cells, a long display equation, a fenced block | Table keeps its full width and scrolls in its box; equation scrolls in its box; fenced code wraps as in autobyteus-23 | — | Existing MSP-50…52 assertions stay green |
| AC-106 | REQ-105 | BEH-107 | Select and copy a wrapped inline path and a wrapped URL | Copied text equals the original | — | Browser case (selection/clipboard) |
| AC-107 | REQ-101 | BEH-103 | Ordinary prose and a hyphenated path that fit at a break point | Breaks at spaces/hyphens as today, not mid-word | — | Screenshot review; sweep shows no regression |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-101 | User | Desktop user | Read an agent reply | Desktop chat | Reply contains long paths/URLs | Read | Fits the width | — | Supported Normal Scenario | Task | AC-102 |
| SCN-102 | User | Phone user | Same | Phone run screen | Same | Read | Same | — | Supported Normal Scenario | Task | AC-103 |
| SCN-103 | User | Desktop user | Read a markdown file | Files tab, default width beside the tree | File with long paths/headings | Open | Same | — | Supported Normal Scenario | Task; autobyteus-23 screenshot | AC-101 |
| SCN-104 | User | Phone user | Same | Phone Files screen | Same | Open | Same | — | Supported Normal Scenario | Task | AC-103 |
| SCN-105 | User | Any | Read a wide table / equation | Any | — | Scroll that box | Unchanged from autobyteus-23 | — | Supported Explicit Edge Scenario | autobyteus-23 | AC-105 |
| SCN-106 | User | Any | Copy wrapped text | Any | — | Select, copy | Original text | — | Supported Normal Scenario | Task | AC-106 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (text layout only). Product Design: N/A — not applicable (not requested).
- Required responsive behavior: REQ-101…REQ-104 at every width; checked at ≈167, 360, 390, 700, 1280 px and swept 150–1300 px.
- Product decisions that need the user: none (DEC-001…DEC-004 decided within the direction).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-101 | REQ-101 | Performance | Very long unbroken runs stay cheap to lay out (autobyteus-358 `long-unbroken-text`) | 60 KB run in a paragraph | PRB-104: insert 8–13 ms, relayout 4–6 ms (before 11–30 / 0 ms) |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Chromium line breaking with empty `::before`/`::after` boxes in inline code | An empty generated box at the end of inline code leaves the code's end padding past the line (BEH-105) | PRB-102 (Reproduced: `content: none` removes it at every width) | Low |
| WebKit (iOS phone app) | `overflow-wrap: break-word` is long supported | — | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/solution-probe/` | Reproduction, candidates A–F, width sweep, performance | REQ-101…105 | Evidence | Not behavior-defining |

## Assumptions

None material.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Only inline code (the Task's suggestion), or all text in rendered markdown? | Done-when: "no sideways scrolling in the narrow Files viewer" | Candidate A (`overflow-wrap: anywhere` on inline code only) fixes inline code, but headings, URLs and prose tokens still overflow by up to 764 px, so the viewer still scrolls sideways (PRB-101). The user's own autobyteus-23 screenshot shows a cut-off heading | All text in rendered markdown. It is the only way to meet the Task's outcome on real documents, it matches the user's direction ("should automatically wrap"), and it is one inherited rule at the same owner | Solution Designer | Decided |
| DEC-002 | `overflow-wrap: break-word` or `anywhere` for that rule? | Tables | `anywhere` also shrinks a table cell's minimum width, so the 8-column table is squeezed to 221 px with words broken into letters instead of scrolling (PRB-101 candidate C), against autobyteus-23 DEC-006 | `break-word` on the markdown body: same wrapping of text, and tables keep their size and their own scroll | Solution Designer | Decided |
| DEC-003 | How is the 1–6 px end-padding overhang (BEH-105) removed? | REQ-102 | The cause is reproduced: the typography config's `code::before`/`code::after` with `content: '""'` (meant to hide the default backticks) still creates empty boxes, and with them Chromium leaves the end padding past the line. With `content: none` the overhang is gone at all 1151 widths; other attempts (`box-decoration-break: clone`, margins, `anywhere` on code) do not remove it (PRB-102) | Hide the backticks with `content: none`; nothing visible changes (the boxes were empty) | Solution Designer | Decided |
| DEC-004 | How do long words break? | Readability | Words break inside only when longer than the line; no hyphenation | A heading word such as "LinkedIn" in a 167 px viewer breaks as "LinkedI / n" instead of being cut off; ordinary text is unchanged | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | UC-101, UC-102 | BEH-101…104 | AC-101…103, AC-107 | SCN-101…104 | PRB-101 |
| REQ-102 | UC-101, UC-102 | BEH-105 | AC-101…104 | SCN-101…104 | PRB-102, PRB-103 |
| REQ-103 | UC-101, UC-102 | — | AC-101…103 | SCN-101…104 | — |
| REQ-104 | — | BEH-106 | AC-105 | SCN-105 | PRB-101 |
| REQ-105 | UC-103 | BEH-107 | AC-106 | SCN-106 | PRB-101 |

## Architecture Phase Input

- Approved scenarios: SCN-101…SCN-106.
- Constraints: one shared renderer; tables keep their own scroll; no px font sizes in the renderer stylesheet.
- Technical facts to verify: where `.prose` is used (the config change reaches every `.prose`).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval basis: `N/A`
- Decisions visible with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed)
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none
