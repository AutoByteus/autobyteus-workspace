# Requirements Document — manage-nodes-professional (autobyteus-363)

## Document Status

- Status: `Approved` (SR-002). Requirements: Solution Designer within the direction, user informed (2026-11-01). The look: the user approved the Product Team's package: "i approve. looks good now." (2026-11-02, DEC-901).
- Current solution revision ID: `SR-002`
- Package: `manage-nodes-professional`
- Request / ticket: autobyteus-363, "Manage Nodes page: make it look professional"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-01 (updated 2026-11-02)
- Approved by and reference: Solution Designer within the direction; the user is informed in the Solution Designer's conversation, 2026-11-01. No `Needs user` decision exists outside the Product review.
- Exact approved baseline: this document at SR-002.
- Behavior-defining supplements: **the Product Team's approved package** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` with `visual-references/` VIS-001…VIS-037 (design repository `personal` @ `88e0e322b6b638f29d3a666e72d64a849301a08a`, ticket commit `07fdfcfc04ee…`), normative for the look. The 268 spec (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md`) stays normative for **behavior, states and copy meaning**, but not for the look.
- Investigation: [investigation-notes.md](investigation-notes.md). The user's screenshot: [user-screenshot-2026-11-01-beta10.png](user-screenshot-2026-11-01-beta10.png).

## Problem And Desired Outcome

- Problem: the user finds the Manage Nodes tab "very unprofessional" on beta v1.5.11-beta.10, even after the 268 rework. Since 268 the page has grown: 305 added the server version line and "Update to <version>" per remote node, designed in engineering without a Product pass. He named no single defect.
- Desired outcome: a Manage Nodes tab with a clear, consistent, professional visual design, in the app's existing design language, that he approves. It does everything it does today, in every state and context.
- Observable success: the delivered page matches the user-approved Product package, and every function and state of BEH-901 … BEH-908 still works.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-900 | User | The look in the screenshot | The look in the user-approved Product package | — |
| BEH-901 … BEH-908 | User | The functions and states listed in the investigation notes | Same, presented per the new design | All of them: actions, states, confirmations, copy meaning, contexts |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-901 | The owner reads this node's state and the remote-collaboration setting |
| UC-902 | The owner adds a node |
| UC-903 | The owner reads each node's state, version and offer, and acts on it (open, remove, rename, collaborate, fix, update) |

### Out Of Scope

- Any behavior, data, API or server change.
- New functions, and removed functions.
- The Memory Sync, Phone Setup, Docker Guide and NFS Guide tabs, except a small adjustment the design needs (for example the shared tab bar), which the design states explicitly.
- A release (only on the user's word).

### Non-Goals

- No new information on the page (for example agent details) beyond what is shown today.
- No change to when nodes are asked (267/268 timing) or to the confirmations' content.

### Preserved Behavior Boundary

BEH-901 … BEH-908; the 268 spec's states, transitions and validation; the 305 row states (version, update, progress, notices, Copy command); accessibility (switch roles, labels, keyboard, live regions); English and Chinese; Docker-node window; browser without Open; narrow widths.

### Prerequisites

None found.

### Review Authority

The user decides the look (the Product Team's package, which he approves). The Solution Designer decides within the direction. Findings cite REQ, AC or BEH IDs.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-901 | The Manage Nodes tab gets a redesigned visual presentation (layout, hierarchy, spacing, controls, how node state and actions read), designed with the Product Team in the app's existing design language and approved by the user. | BEH-900 | Must |
| REQ-902 | Every function and state of BEH-901 … BEH-908 remains, with the same meaning and the same outcome. | BEH-901 … 908 | Must |
| REQ-903 | The rarely seen states are designed too, not only the common view: checking, each row line kind, partial result, Docker hint, update available, updating and restarting, update result and blocker notices with Copy command, a node that is not reachable, an empty list, an empty offer, this node off. | BEH-904 … 907 | Must |
| REQ-904 | The design holds in every context: desktop window on the embedded node, a window on a Docker node, browser (no Open), English and Chinese, narrow widths. | BEH-908 | Must |
| REQ-905 | No server, API, data or stored-format change. | — | Must |

## Acceptance Criteria

| ID | REQ | Given / When | Then | Verification |
| --- | --- | --- | --- | --- |
| AC-901 | REQ-901 | The delivered page, in every state the package shows | It matches the user-approved package's final references, except what the package marks illustrative | Visual comparison with the package's screenshots |
| AC-902 | REQ-902 | Add, open, remove, rename, collaborate on and off, each fixing button, Change address, update, Copy command, this node's switch, the rules disclosure | Each does what it did before (same requests, same confirmations, same results) | Existing tests stay green; browser probes as in 268/305 |
| AC-903 | REQ-903 | Each listed rare state | It is presented per the package | Component tests and probes |
| AC-904 | REQ-904 | Docker-node window, browser, zh-CN, 390 px | It is presented per the package without clipping | Probes and screenshots |
| AC-905 | REQ-905 | The change set | Touches only web presentation (components, styles, localization), and no server, Electron registry or store behavior | Review of the diff |

## Relevant Scenarios And Journeys

| ID | Actor | Trigger | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-901 | Owner | Opens Nodes → Manage Nodes | Reads this node and his nodes | Sees each node's state at a glance | Supported Normal |
| SCN-902 | Owner | Adds a node | As 268 UXJ-701/702 | As 268 | Supported Normal |
| SCN-903 | Owner | A node needs something (fix, update) | Reads the line and acts | As 268 UXJ-704 / 305 | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`.
- **UI authority (SR-002):** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` (Approved).
  - Final references: `visual-references/` VIS-001…037 (desktop, Docker window, browser, zh-CN, 390 px, every rare state).
  - Change log DC-901…913; diagnosis F1–F9 in `design-review-notes.md`; ticket record `product-ticket.md`.
  - Runnable reference: the design repository root, `corepack pnpm dev --port 4950`, `/nodes?nodeTab=manage`, runbook § `manage-nodes-professional`.
  - Every visible detail is normative except what the spec marks illustrative: node names, addresses, IDs, versions, counts, message texts from nodes, timing.
- **Authority split (spec § Provenance):** 268 and 305 stay normative for behavior, states, transitions, validation and copy meaning; this package replaces the look.
- **The user's confirmation:** "i approve. looks good now.", 2026-11-02, in the Product UI/UX Designer conversation.
- **Not approved:** alternative A1, the version in parentheses next to the name, which he asked about. It was not built and is not part of the approval (see DEC-905).

## Data Continuity

Not affected.

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-901 | What should the new look be? | Visible taste and product behavior that the direction does not settle; the Task assigns the diagnosis and options to the Product Team, and the choice to the user. | User (in the Product review) | Delegated to the Product review |
| DEC-902 | Can the design rearrange where functions sit (for example put Rename and Remove in a menu, or move the version into the details)? | Yes, as long as each function stays reachable and visible where the user needs it; that is presentation. In 268, the user explicitly rejected a ⋯ menu and some patterns ("tried in review and rejected by the user as unclean or redundant"). The Product Team must know those earlier rejections and bring any reversal to him as an option, not as a silent change. | Solution Designer | Decided |
| DEC-903 | Can copy change? | Wording may be polished for clarity in both languages, keeping each message's meaning, and no "peer" wording (268). New or removed messages would change behavior and are out of scope. | Solution Designer | Decided |
| DEC-905 | The user asked about A1 (the server version in parentheses next to the name, with the server column only when there is an update, progress or a problem) | The Product Team reports it was not built, and that the user approved without it ("looks good now"). Adding it now would change the approved look without his decision. **Decided: not part of this ticket.** It is mentioned to the user as an option he can ask for later. | Solution Designer | Decided |
| DEC-904 | Done-when | Per the Task: the redesigned page is delivered as the user approved it in the Product review, with the same functions, and finalized on `personal`. The user's design approval is the acceptance basis. No separate "the user has verified" step is part of done (the Project Task Manager's instruction). | Solution Designer | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-901 | UC-901…903 | AC-901 |
| REQ-902 | UC-901…903 | AC-902 |
| REQ-903 | UC-903 | AC-903 |
| REQ-904 | all | AC-904 |
| REQ-905 | all | AC-905 |

## Readiness Check

- Content ready: Yes. Approved within the direction (SR-001). Design phase: after the Product package is approved.
