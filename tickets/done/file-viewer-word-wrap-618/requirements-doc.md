# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `file-viewer-word-wrap-618` (autobyteus-618)
- Request: Project Task `autobyteus-618` (founder UX request, 2026-11-23, with phone screenshots; comment 2026-11-24 adds `draft-v1.txt`)
- Requested by: `/project_task_manager`
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-24
- Approved by and reference: `Solution Designer within the direction (user informed)`, in my message to the founder in this conversation, 2026-11-24
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** a text or code file opened from the File Explorer (`tsconfig.json`, `pnpm-workspace.yaml`, `draft-v1.txt`) shows long lines clipped at the right edge, with horizontal scrolling, on the phone and the desktop.
- **Cause (read):** the viewer's Monaco editor starts with `wordWrap: 'off'` when its caller passes no setting (`autobyteus-web/components/fileExplorer/MonacoEditor.vue:80-83`). The viewer (`FileViewer.vue:103-107`) passes none.
  - A "Toggle Word Wrap" editor action exists (`MonacoEditor.vue:139-153`, in the context menu). It applies its own change only while the setting is not passed by the caller (`isWordWrapControlled`, `:97, 141-143`).
  - The phone uses the same web viewer (`MobileFileViewer.vue:43, 62`).
- **Desired outcome:** text and code files open with word wrap on, on desktop and phone. Line numbers stay, and wrapped lines keep their line's indentation. The existing toggle still turns wrap off and on.

## Relevant Current And Desired Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Wrap off by default | On by default, for every text file the shared viewer opens (File Explorer, phone Files, and the reference and artifact viewers that use the same `FileViewer`) | Line numbers; syntax highlighting; editing and save; Markdown/HTML preview modes (not Monaco) |
| BEH-002 | "Toggle Word Wrap" switches per editor | Unchanged: it now switches from on to off, and back | Its behavior and place |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use case |
| --- | --- |
| UC-001 | Open a text or code file in the shared file viewer on desktop or phone and read it without horizontal scrolling |

### Out Of Scope

- A remembered wrap preference across files or sessions.
- A visible wrap button on the phone, where the context-menu toggle is hard to reach.
- Rendered previews (Markdown, HTML), images and other media.

### Non-Goals

None.

### Preserved Behavior Boundary

The preserved column above.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| REQ | Requirement | BEH |
| --- | --- | --- |
| REQ-001 | The editor opens text files with word wrap on, wrapping at the editor's width. A wrapped line keeps the indentation of its line (Monaco's `wrappingIndent: 'same'`, its default). | BEH-001 |
| REQ-002 | The existing toggle turns wrap off and on again | BEH-002 |
| REQ-003 | Line numbers, highlighting, editing and save are unchanged | BEH-001 |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | Open `pnpm-workspace.yaml`, `tsconfig.json` and a long-line `.txt` (synthetic) at a phone viewport (about 390 px wide) and a desktop viewport | No line wider than the editor; no horizontal scroll; wrapped lines indented like their line; line numbers shown | Rendered check at both widths, with screenshots |
| AC-002 | REQ-002 | Run "Toggle Word Wrap" | Wrap turns off (horizontal scroll returns), then on again | Unit test |
| AC-003 | REQ-001 | A caller that passes `wordWrap` | Its value still wins | Unit test |

## Relevant Scenarios And Journeys

| SCN | Kind | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | User | The founder opens a file from Files, on desktop or phone | Reads it without horizontal scrolling | Supported Normal Scenario (screenshots) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, a default only. The founder asked for it explicitly; no new control.

## Quality And Non-Functional Requirements

None.

## Data Continuity And Acceptable Loss

- `No`.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Where to set the default? | Passing `wordWrap` from `FileViewer` would make the setting "controlled", and the toggle would stop applying its own change (`MonacoEditor.vue:141-143`). Changing the editor's own default from `'off'` to `'on'` keeps the toggle working and gives every viewer of text the same reading behavior. | Solution Designer | Decided |
| DEC-002 | Only the File Explorer, or every text viewer? | `MonacoEditor` has one user, `FileViewer`, which also serves the phone Files screen and the reference and artifact viewers. Reading a long line is the same problem everywhere, so one default is consistent. | Solution Designer | Decided |
| DEC-003 | A phone wrap button, or a remembered preference? | Not asked for, and new UI. Recorded as a possible follow-up (FU-001), not built. | Solution Designer | Decided |

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (a default the founder asked for)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
