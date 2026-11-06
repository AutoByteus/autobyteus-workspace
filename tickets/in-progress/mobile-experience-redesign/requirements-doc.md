# Requirements Document — mobile-experience-redesign (autobyteus-277)

## Document Status

- Status: `Draft`. It waits for the Product Team's design (requested 2026-11-06) and the user's decisions DEC-003 and DEC-004. The requirements become `Ready for Approval` when the user has confirmed the Product design.
- Current solution revision ID: `SR-001`
- Package identifier: `mobile-experience-redesign`
- Request / ticket: Project Task `autobyteus-277`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: not yet
- Exact approved requirements baseline / solution revision: none yet
- Behavior-defining supplements and their approved versions: the Product Team's UI/UX spec (to come; it needs the user's confirmation)
- Investigation: [investigation-notes.md](investigation-notes.md); evidence IDs E-01…E-08 are in its Source Log.

## Problem And Desired Outcome

- Problem: the `/mobile` web shell (Android now, iOS later) lists only top-level agent and team runs, as a flat list. Task agents and task teams that a run delegated never appear, so the user can't see or talk to them from the phone (E-01, E-03). Navigation is spread over Home, a "Switch work" sheet and five bottom tabs, with three copies of the run list. Remote work is invisible on the phone.
- Affected actors: the user away from his desk, on his phone, connected to his desktop node over Tailscale.
- Desired outcome: on the phone the user sees what is running, with the same delegation tree as the desktop's Runs view (local and remote). He opens any run in it and talks to it, answers and approves, starts work, and reads results. The layout is designed for a small screen and one hand.
- Observable definition of success: on the user's Android phone, a Project Task Manager run shows its task agents and task teams under it, with members and states, including runs on another node; tapping one opens its conversation with a composer. The user confirms the redesigned layout is good on his phone.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Flat list of top-level agent and team runs, 5 per agent, active first; no delegated rows, no Org runs (E-01, E-02) | The desktop Runs view's runs and tree: newest first by last activity; task agents and task teams nested under their delegator; team members; Org runs; older runs behind a fold | Archive, stop and delete rules where the phone offers them |
| BEH-002 | User | SCN-002 | Tapping a run shows only the run's own agent or the team's focused member (E-03) | Tapping any row, including a delegated child or a member, opens that agent's conversation with its composer | The shared conversation view and composer |
| BEH-003 | User | SCN-003 | Home, Switch sheet and 5 tabs; three copies of the run list | One clear navigation designed for a phone (Product design) | Pairing, troubleshooting, unpair |
| BEH-004 | User | SCN-004 | Start new from the Runs tab | Starting work is easy to reach from the main screen | Configure, create, then send the first message in Chat (mobile-run-config-chat-flow) |
| BEH-005 | System | SCN-005 | A run delegated to another node is invisible on the phone (E-05) | It appears under its delegator, marked with its node; it can be opened and talked to; an unreachable node shows a clear state | 278's rules for remote runs (text-only composer, no files or terminal) |
| BEH-006 | User | SCN-006 | Several nodes only through the Android shell's saved-node screen (E-07) | Per DEC-003 | Pairing, saved nodes |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| The user, outside | Follow and steer his agents from the phone | See, open, talk, approve, start, read | One hand, small screen, Tailscale |
| Android shell | Host the web shell | Unchanged unless DEC-003 needs it | No new permissions without approval |
| iOS shell (paused) | Host the same web shell later | Nothing breaks | iOS-safe web code |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | See runs and their delegation tree on the phone | SCN-001, SCN-005 |
| UC-002 | Open any run or delegated child and talk to it, answer and approve | SCN-002, SCN-005 |
| UC-003 | Navigate the mobile shell with one hand on a small screen | SCN-003 |
| UC-004 | Start work from the phone | SCN-004 |
| UC-005 | Read results (artifacts, files) of a run | SCN-003 |
| UC-006 | Remote nodes on the phone, as DEC-003 decides | SCN-005, SCN-006 |

### Out Of Scope

- iOS App Store review and a test environment (separate bookmark Task); iOS-specific shell work.
- Desktop layout changes, including the desktop left panel (385).
- New server capabilities, unless the user chooses DEC-003 option C, which would then be its own Task.
- Remote run files, terminal and workspace panels (278 FU-001).
- Push notifications to the phone.
- Changes to pairing security, Tailscale assumptions, or Android permissions.
- Editing agent, team or Org definitions on the phone.

### Non-Goals

- Full parity with every desktop panel; the Product design decides what is not on mobile (DEC-004).
- An offline mode.

### Preserved Behavior Boundary

- Pairing, re-pairing, unpair, reachability checks and troubleshooting (shell and web).
- Configure → create → first message in Chat (BEH-004).
- The shared conversation view, composer, tool approval and attachments as they work on the phone today.
- Desktop behavior: unchanged (the desktop Runs view, its read window while it is shown).
- Remote run rules of autobyteus-278.

### Prerequisites

None. autobyteus-278 (remote delegated runs under their delegator) and autobyteus-385 (desktop Runs view) are delivered on `personal`.

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The phone lists the same runs as the desktop Runs view: every non-archived top-level Agent, Team and Org run, newest first by last activity, with older runs behind a fold | BEH-001 | Must | The user can't find his runs; 385 settled the order and fold | N/A (desktop owners exist, E-04); phone payload measured in architecture (R-001) | The user's request; DEC-001 |
| REQ-002 | Under each run the phone shows its delegated work as the desktop does: task agents and task teams under an Agent run, members under a Team run (with their own delegated work), members under an Org run, each with its live state | BEH-001 | Must | The user's first point | N/A (E-04) | The user's request; DEC-001 |
| REQ-003 | Tapping any row (run, delegated child, member) opens that agent's conversation with its composer, so the user can follow it, send messages, answer questions and approve tools | BEH-002 | Must | "See and talk to delegated runs" | N/A (desktop target resolver exists, E-03) | DEC-002 |
| REQ-004 | A run on another node appears under its delegator with its node's name, state and title; opening and talking to it work as in 278, through the paired node only; an unreachable node shows a clear state and never blocks the list | BEH-005 | Must | The user's third point; 278 DEC-805 | Read (E-05): 278 streams remote runs through this node's server | 278 REQ-806 |
| REQ-005 | The mobile layout and navigation are redesigned for a phone, per the user-approved Product design: one-hand use, touch targets of at least 44×44 CSS px, one place for the run list, the screen used for content | BEH-003 | Must | The user's second point | N/A | Product design (pending) |
| REQ-006 | Starting work (a new agent or team run) is reachable from the main screen in one tap, and keeps the configure → create → Chat flow | BEH-004 | Must | One of the few things done outside | N/A | Preserved flow |
| REQ-007 | The user can read a run's results on the phone (artifacts and files, as the Product design places them) | BEH-003 | Must | "read results" | N/A (exists today) | Task |
| REQ-008 | Remote nodes on the phone, as the user decides in DEC-003 | BEH-006 | Must | The user's third point | Option A: Read (E-05, E-06). Option B: Read (E-07). Option C: no API today | DEC-003 (Needs user) |
| REQ-009 | What is not on mobile is decided in the Product design and listed in the approved spec; a feature left out is simply absent, without explanatory filler | BEH-003 | Must | The user's earlier rule: no mobile-only complexity | N/A | DEC-004 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Open the run list on the phone with more than 5 runs, including an Org run | Same runs and order as the desktop Runs view; newest 5, then the fold | Empty: the approved empty state | Component tests; device check |
| AC-002 | REQ-002 | SCN-001 | A Project Task Manager run has delegated a task agent and a task team | Both appear under it; the team shows its members; states are live | A child whose Task is DONE leaves, as on the desktop | Projection test; device check by the user |
| AC-003 | REQ-003 | SCN-002 | Tap a delegated task agent, then a task team member | Chat shows that agent's conversation and composer; a message sent reaches it; a pending tool approval can be approved | Back returns to the list | Component and E2E tests; device |
| AC-004 | REQ-004 | SCN-005 | A run delegates to a peer node | The remote run appears under it with the node name; opening shows its live conversation; a message reaches it | Peer down: the row stays and says the node is not reachable | Two-server test as in 278; device |
| AC-005 | REQ-005 | SCN-003 | Use the shell on a 360×800 CSS px viewport and on the user's phone | Matches the approved Product references; every touch target ≥ 44×44 CSS px; no horizontal scrolling | — | Visual comparison; the user's confirmation on his phone |
| AC-006 | REQ-006 | SCN-004 | From the main screen, start an agent run | One tap reaches setup; create opens Chat; the first message is sent there | — | Component test; device |
| AC-007 | REQ-007 | SCN-003 | Open a run's results | Artifacts and files read as approved | — | Component test |
| AC-008 | REQ-008 | SCN-006 | Per DEC-003 | Per DEC-003 | — | Per DEC-003 |
| AC-009 | REQ-009 | SCN-003 | Review the shell | Only the approved features appear; no explanatory filler for absent ones | A desktop route opened on the phone keeps today's notice | Review against the spec |
| AC-010 | all | — | Finish | Pairing, troubleshooting and unpair still work on Android device and emulator; the desktop is unchanged; the shared web shell renders on iOS Safari/WKWebView without errors | — | Device, emulator, desktop regression tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Entry | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user, outside | See what is running and what was delegated | Open the app | Paired, node reachable | Open → run list → expand a run | Runs and their delegation tree, with states | Node unreachable: the existing diagnostic | Supported Normal | The user's request; E-01, E-04 | REQ-001, REQ-002; AC-001, AC-002 |
| SCN-002 | User | The user | Talk to a delegated agent, answer, approve | Run list row | A delegated child exists | Tap the child → conversation → send or approve → back | The child receives the message; approval applied | Child closed meanwhile: back to its delegator, as on the desktop | Supported Normal | The user's request; E-03 | REQ-003; AC-003 |
| SCN-003 | User | The user | Move around the shell with one hand; read results | Any screen | Paired | Product design | Product design | — | Supported Normal | The user's request | REQ-005, REQ-007, REQ-009; AC-005, AC-007, AC-009 |
| SCN-004 | User | The user | Start a task | Main screen | Paired | Start → choose agent or team, folder, model → create → Chat → first message | A new run, listed at the top | Validation errors as today | Supported Normal | Earlier ticket; Task | REQ-006; AC-006 |
| SCN-005 | System + User | A delegator run; the user | See and talk to work on another node | Run list | A run delegated to a peer | Expand → remote row with node → open → talk | Remote conversation live, through the paired node | Peer down: "not reachable" state | Supported Normal | 278 | REQ-004; AC-004 |
| SCN-006 | User | The user | Use more than one node from the phone | Per DEC-003 | Per DEC-003 | Per DEC-003 | Per DEC-003 | — | Unclear until DEC-003 | Task point 4 | REQ-008; AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`.
- Linked UI/UX or interaction supplement: Product Team's UI/UX spec, pending. Brief: [product-design-request.md](product-design-request.md).
- Linked runnable UI reference, design repository, UI/UX specification: pending.
- Product ticket record and folder: pending (Product-owned).
- Design repository revision: pending.
- UI/UX user-confirmation reference: pending.
- Approved visual-reference baseline: pending.
- Normative visual and interaction details: pending; every visible detail in the approved references will be normative unless the spec marks it illustrative.
- Explicitly illustrative content: pending.
- Required screens, states, transitions: run list with the delegation tree (expanded, collapsed, fold, empty, loading, error, remote unreachable); run conversation (agent, team member, delegated child, remote child, read-only); start work; results; connection and troubleshooting; nodes per DEC-003.
- Product decisions that need the user: DEC-003, DEC-004 (below), and the user's worst problems (U-004).

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005; AC-005 | Accessibility | Touch targets ≥ 44×44 CSS px; text ≥ 12px except badges; reachable with one thumb as the design places primary actions | Phone viewports 360–430 CSS px wide | Visual check; automated size check where cheap |
| QR-002 | REQ-009 | Other | No mobile-only explanatory filler for things the desktop does not explain | All screens | Review |
| QR-003 | REQ-001; AC-001 | Performance | The run list appears within 2 s of opening on the user's phone over Tailscale with his real history; the poll does not make the phone sluggish | His history size | Measure in architecture (R-001) and on device |
| QR-004 | AC-010 | Compatibility | Shared web code runs in Android WebView and iOS WKWebView (no Android-only web APIs) | — | Review; Safari smoke check |
| QR-005 | all | Privacy | No secrets, tokens or pairing codes in screenshots or logs | All evidence | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` on the server. Phone local storage only.
- Must be preserved: the pairing session; the Android shell's saved nodes.
- Acceptable loss: mobile UI preferences (last tab, remembered team member focus) may reset once.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| autobyteus-278 remote run relay | Remote runs come through the paired node only | 278 DEC-801 | Peer latency |
| autobyteus-385 Runs view | The phone's list mirrors it | 385 REQ-008 | Shared read window between surfaces |
| Android WebView, iOS WKWebView | Shared web shell | Task | — |

## Supplemental Artifacts

| Artifact Path | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| [product-design-request.md](product-design-request.md) | Brief to the Product Team | All | Sent 2026-11-06 | Not behavior-defining |
| Product UI/UX spec (path to come) | Normative UI | REQ-001…REQ-009 | Pending | The user's confirmation required |

## Assumptions

| Assumption ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The phone's main use is following and steering running work, not authoring definitions | Shapes the layout | The user, in Product review | Open |
| ASM-002 | The user's history size makes the complete read window acceptable on the phone | REQ-001 | Measure (R-001) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which runs and which tree does the phone show? | The user's first point | (a) Mobile's own flat list extended with children; (b) the desktop Runs view's runs and tree | The user asks for it "like the desktop"; 385 settled order, nesting and fold, and 278 put remote runs in the same data. One list everywhere avoids a second builder drifting again (that drift is today's bug). **(b)**. The Product design decides how the tree looks on a phone | Solution Designer | Decided |
| DEC-002 | What does a tap on a delegated row do? | "Talk to it" | (a) Open its conversation with a composer; (b) open read-only | The desktop opens it live with a composer, 278 added talking to remote runs; the user asks to talk. **(a)**; remote runs keep 278's text-only composer | Solution Designer | Decided |
| DEC-003 | How far do remote nodes go on the phone? | Scope, security, Android shell | **A.** Through the paired node only: remote delegated runs under their delegator (see, talk, stop); remote work starts by asking an agent on the paired node to delegate (e.g. the Project Task Manager), as on the desktop. Optionally a read-only list of the peers the paired node knows, with reachability and what each offers (`peerNodeOffer`). No new server API. **B.** A plus moving between several nodes the phone is paired with: the Android shell already keeps a list of saved nodes (E-07); the web shell gets a "switch node" entry that returns to it. Each node is paired with its own QR and must be reachable over Tailscale. Touches the Android shell (no new permission). Pairing with several nodes already works today; only the in-shell switch is missing (E-09). The user asked for a follow-up for it during the Product review (2026-11-06): FU-001. **C.** Start a run directly on a peer through the paired node: a new cross-node launch API and a new kind of request between nodes; its own Task | A gives "no difference between local and remote" for delegated work with no new risk, and matches how remote work starts on the desktop. B is cheap and useful if he works with more than one desktop. C is a new server capability with security weight, better as its own Task. **Recommend A, with the read-only peer list; B if he uses several desktops; C as a follow-up Task** | User | Needs user |
| DEC-004 | What is not on mobile? | Space on a small screen | The Product design proposes; today not on mobile: terminal, VNC, browser, settings, updates, folder picker, applications, Projects (E-08) | My recommendation for the Product brief: keep runs and their tree, conversation (talk, answer, approve), start work, results (artifacts, files read); leave out the Workspaces and Projects groupings of the desktop panel, definitions editing, settings, terminal, VNC, browser, applications. The user approves through the Product design | User (through UI approval) | Needs user |
| DEC-005 | A "needs you" marker on runs waiting for an approval or an answer? | "answer a question, approve" | History has no such state (U-003); live contexts know it only for streamed runs | Valuable outside, but unproven for runs the phone does not stream. **The Product design may propose it as a marked optional element; architecture checks feasibility before it becomes a requirement** | Solution Designer | Decided (conditional) |
| DEC-006 | Android shell changes | Task: only if needed | — | None for A; B needs a small shell entry point. No new permissions either way | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Product evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | Pending |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 | Pending |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 | Pending |
| REQ-004 | UC-001, UC-002, UC-006 | BEH-005 | AC-004 | SCN-005 | Pending |
| REQ-005 | UC-003 | BEH-003 | AC-005 | SCN-003 | Pending |
| REQ-006 | UC-004 | BEH-004 | AC-006 | SCN-004 | Pending |
| REQ-007 | UC-005 | BEH-003 | AC-007 | SCN-003 | Pending |
| REQ-008 | UC-006 | BEH-006 | AC-008 | SCN-006 | Pending |
| REQ-009 | UC-003 | BEH-003 | AC-009 | SCN-003 | Pending |

## Architecture Phase Input

- Approved scenario IDs: pending approval (SCN-001…SCN-006).
- Constraints: one list and one target resolver shared with the desktop; the phone talks only to the paired node; no new permissions; iOS-safe web code.
- Deferred to architecture: the phone's read window and poll; how `mobileWorkStore` relates to the desktop selection; the "needs you" feasibility (DEC-005).
- Facts to verify: payload size of the complete history for the user's node; stream behavior when the phone sleeps.
- Risks: R-001, R-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`, except the layout, which the Product design defines
- Scope and non-goals are clear: `No`, until DEC-003 and DEC-004
- Requirements and acceptance criteria are testable and traceable: `Yes`, except AC-005, AC-008, AC-009, which depend on the Product design and DEC-003
- Applicable scenarios are covered: `Yes`, SCN-006 pending DEC-003
- Product design integrated: `No` (pending)
- UI/UX approval recorded: `No` (pending)
- Decisions visible with reasoning: `Yes`
- Content ready for approval: `No`
- Remaining content blocker: the Product design and the user's decisions DEC-003, DEC-004

### Approved Basis Ready For Design

- Approval recorded: `No`
- Exact basis recorded: `No`
- Ready for architecture design: `No`
- Remaining blocker: as above
