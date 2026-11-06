# Requirements Document — mobile-experience-redesign (autobyteus-277)

## Document Status

- Status: `Approved` (SR-003).
- Current solution revision ID: `SR-003` (SR-002 plus the user's removal of the optional marker, DEC-005). SR-001 (the Draft baseline for the Product brief) is in commit `24b9c8efc9`.
- Package identifier: `mobile-experience-redesign`
- Request / ticket: Project Task `autobyteus-277`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference:
  - **The user** approved the mobile UI/UX design on 2026-11-06, in the Product UI/UX Designer's conversation, after about 16 review rounds on his phone: "okayyy. everything is good now. i approve". Before that: "Perfect, I think I just experienced it and the user experience is really nice. … I'm fine with the user experience now".
  - His decisions in his words are recorded in the spec's Decisions and in DEC-004 and DEC-007 below.
  - The **Solution Designer**, within that direction, integrated the approved design into these requirements and recorded DEC-003 as option A, as built and approved. Option B waits as Task autobyteus-391 for his word. The user is informed in the Solution Designer's result of 2026-11-06.
- Exact approved requirements baseline: this document at SR-003.
- Behavior-defining supplement, normative: the Product Team's UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md` with `visual-references/VIS-001…VIS-029`.
  - Design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, branch `design/mobile-experience-redesign`, revision `976457a418d6355296c8a366bf403c865ee0646c`, accepted base `a0e18abb`.
  - Every visible detail in the screenshots is a requirement unless the spec marks it illustrative: run, agent, team and node names, ages, message and file texts, and "Embedded Node".
- Investigation: [investigation-notes.md](investigation-notes.md). Its Source Log holds evidence IDs E-01…E-09.

## Problem And Desired Outcome

- **Problem.**
  - The `/mobile` web shell (Android now, iOS later) lists only top-level agent and team runs, as a flat list.
  - Task agents and task teams that a run delegated never appear, so the user can't see or talk to them from the phone (E-01, E-03).
  - Navigation is spread over Home, a "Switch work" sheet and five bottom tabs, with three copies of the run list.
  - Remote work is invisible on the phone.
- **Affected actors.** The user away from his desk, on his phone, connected to his desktop node over Tailscale.
- **Desired outcome.**
  - The phone has one main screen: the desktop Runs view, with each run's delegation tree, local and remote.
  - A tap opens any agent's conversation, on a slim run screen that gives the conversation the space.
  - The agent's Artifacts, Files, Messages and Activity are behind one menu.
  - Starting an agent run is one round "+" button.
  - Connection, peers and unpair are in one sheet.
- **Observable definition of success.** On the user's Android phone:
  - a Project Task Manager run shows its task agents and task teams under it, with members and states, including runs on another node;
  - tapping one opens its conversation with a composer;
  - the screens match the approved references;
  - the user confirms on his phone.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Flat list of top-level agent and team runs, 5 per agent, active first; no delegated rows, no Org runs (E-01, E-02) | The run list = the desktop Runs view with each run's delegation tree (spec UXJ-001) | — |
| BEH-002 | User | SCN-002 | A tap shows only the run's own agent or the team's focused member (E-03) | A tap on any row opens that agent's conversation; a team or Org run opens its coordinator (UXJ-002) | The shared conversation view and composer |
| BEH-003 | User | SCN-003 | Home, Switch sheet, 5 tabs, member focus bar, Troubleshoot page | One list screen; a run screen with one bar and a ⋮ menu; view screens; a connection sheet (spec) | Pairing screens; the unsupported-route notice |
| BEH-004 | User | SCN-004 | Start new from the Runs tab: agent or team | "+" → New run: agents only; five rows with bottom sheets; Create run → Chat (UXJ-004) | Configure → create → first message in Chat |
| BEH-005 | System | SCN-005 | A run delegated to another node is invisible on the phone (E-05) | Under its delegator with its node chip; opens and talks as in 278; unreachable: a clear state (UXJ-003) | 278's rules (text-only composer, no remote files or terminal) |
| BEH-006 | User | SCN-006 | Several nodes only through the Android shell's saved nodes (E-07, E-09) | Option A: the paired node only, with a read-only peer list in the connection sheet (UXJ-006) | Pairing, saved nodes, multi-node pairing as it works today |
| BEH-007 | User | SCN-003 | Row actions on mobile rows: none (the old list); desktop rows have Stop, Archive, Delete | No row actions on the phone; Stop through the shared composer | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| The user, outside | Follow and steer his agents from the phone | See, open, talk, approve, start an agent run, read results | One hand, small screen, Tailscale |
| Android shell | Host the web shell | Unchanged | No new permissions |
| iOS shell (paused) | Host the same web shell later | Nothing breaks | Standard web APIs only |
| The desktop | — | Unchanged | Shares stores with the phone |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | See runs and their delegation tree on the phone | SCN-001, SCN-005 |
| UC-002 | Open any run or delegated child and talk to it, answer and approve | SCN-002, SCN-005 |
| UC-003 | Navigate the phone shell with one hand | SCN-003 |
| UC-004 | Start an agent run from the phone | SCN-004 |
| UC-005 | Read an agent's Artifacts, Files, Messages and Activity | SCN-003 |
| UC-006 | Check the connection, see peers (read-only), unpair | SCN-006 |

### Out Of Scope

- The desktop, including the desktop left panel (385).
- Pairing screens and the pairing flow (unchanged).
- Android and iOS shell changes.
- Switching between paired nodes inside the page: autobyteus-391 (DEC-003 B).
- Starting a run directly on a peer (DEC-003 C).
- Starting a Team or Org run from the phone.
- Push notifications.
- Remote files and terminal (278 FU-001).
- Editing definitions.
- A compact composer: the shared composer is unchanged.
- The iOS App Store question.
- New server capabilities.

### Non-Goals

- Full parity with every desktop panel. The approved list "What Is Not On The Phone" governs.
- An offline mode.

### Preserved Behavior Boundary

- Pairing, re-pairing and unpair (the baseline confirmation).
- The `?unsupported=…` notice, shown above the run list with the spec's text.
- The configure → create → first message in Chat flow (BEH-004).
- The shared conversation view, composer, tool approval and attachments.
- The desktop's behavior, including its Runs view and its read window while it is shown.
- 278's remote run rules.
- The Team messages screen keeps the source's loading and unavailable behavior (autobyteus-358, a known baseline gap).

### Prerequisites

None. autobyteus-278 and autobyteus-385 are delivered on `personal`.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The run list is the phone's only main screen. It lists the same runs as the desktop Runs view: every non-archived top-level Agent, Team and Org run, newest first by last activity, the newest 5 then "Show older (N)" / "Show fewer" (UIS-001, VIS-001…004) | BEH-001 | Must | The user's first point; 385 settled order and fold | Read (E-04); phone payload measured in architecture (R-001) | DEC-001; spec |
| REQ-002 | Under each run the list shows its delegated work as a tree: task agents and task teams under an Agent run; members under a Team and an Org run; a member's own delegated work under it. Each row shows its live state. A run with delegated work and an Org run start unfolded, a team's members folded; folding never stops anything; no counts, no separators (VIS-001, 002) | BEH-001 | Must | The user's first point | Read (E-04) | DEC-001; spec |
| REQ-003 | Tapping a row's body opens that agent's conversation with its composer; a team or Org run opens its coordinator. The run screen is one 56px bar (←, the name with state and "in <parent>", ⋮) and the conversation. It never shows navigation buttons as a fallback: while the conversation attaches it shows "Opening…", and it attaches again on its own after browser Back/Forward. After a new run's first message (its id changes) the run stays open and keeps its place (UIS-002, VIS-005, 014) | BEH-002 | Must | "See and talk to delegated runs" | Read (E-03) | DEC-002; spec; Product findings 1, 2 |
| REQ-004 | A run on another node sits under its delegator with its node chip, state and title; it opens and is talked to as in 278 (text-only composer), through the paired node only. An unreachable node: red dot, "Not reachable", the remote notice instead of the conversation, Retry; it never blocks the list (VIS-001, 020) | BEH-005 | Must | The user's third point | Read (E-05) | 278 REQ-806; spec UXJ-003 |
| REQ-005 | Layout, navigation, copy and states match the approved spec and screenshots: one list screen with a "+" button; the run screen; a ⋮ menu; view screens with 48px bars; bottom sheets; the system Back key walks view → run → list, closing an opened file or reference first; the list keeps its scroll position and marks the open run | BEH-003 | Must | The user's second point | N/A | Spec |
| REQ-006 | The round "+" (no words) opens New run for an **agent** run: Agent (preselected: the agent of the run you came from, else the Project Task Manager, else the first agent), Folder (with "Open a folder by path"), Runtime, Model, Auto approve tools; each choice is a bottom sheet; "Create run" is disabled with the reason when something is missing; it creates the run and opens its Chat for the first message; the new run is listed at the top (UIS-008, UIS-009, VIS-015…018) | BEH-004 | Must | One of the few things done outside | Read (exists today) | DEC-007 (the user); spec UXJ-004 |
| REQ-007 | The ⋮ menu offers Artifacts, Files, Messages (only for a member of a team or Org) and Activity, each its own screen for the open agent. Artifacts: one shown directly, several as rows. Files: tree, path line, one search over the workspace, no filters; an opened file full screen without "Attach". Messages: the team messages with file references; a reference opens the file. Activity: the agent's tool calls. Empty states as the spec. A remote run's Artifacts and Files say the files are on that node (UIS-003…007, VIS-006…013, 029) | BEH-003 | Must | "read results" | Read (components exist) | Spec UXJ-005 |
| REQ-008 | The node name in the list bar opens the connection sheet: the paired node's own name and URL, its state, "Check connection", **Peer nodes** read-only (name, reachable or not, what it offers), "Unpair this phone" with the baseline confirmation. When the paired node is not reachable, the bar says so and a banner offers "Check" (UIS-010, VIS-019, 024) | BEH-006 | Must | The user's third point (option A) | Read (E-06: `peerNodeOffer`, availability) | DEC-003 (A) |
| REQ-009 | Only the features in the spec's "What Is Not On The Phone" list's "On the phone" part appear; the "Not on the phone" items are simply absent, with no explanatory text | BEH-003, BEH-007 | Must | The user's rule: nothing the desktop doesn't have | N/A | DEC-004 (the user) |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Open the app with more than 5 runs, including an Org run | Same runs and order as the desktop Runs view; newest 5, "Show older (N)", "Show fewer" | Loading, empty, read error and node-not-reachable states as VIS-021…024 | Component tests; device |
| AC-002 | REQ-002 | SCN-001 | A Project Task Manager run has delegated a task agent and a task team | Both under it; the team folded with its members; a member's delegated work under the member; live states | A child whose Task is DONE leaves, as on the desktop | Projection/component tests; device by the user |
| AC-003 | REQ-003 | SCN-002 | Tap a delegated task agent, then a task team member, then a team run | Each opens that agent's (the team's coordinator's) conversation with its composer; a message reaches it; a pending approval can be approved; ← returns to the list at the same scroll with the run marked | During attach: "Opening…" only; after browser Back/Forward the conversation re-attaches; after a new run's first message the run stays open | Component and E2E tests; device |
| AC-004 | REQ-004 | SCN-005 | A run delegates to a peer node | The remote row under it with the node chip; opening shows its live conversation; a text message reaches it; the composer has no attachments or `@` | Peer down: red dot, "Not reachable"; opening shows the remote notice and Retry; other runs work | Two-server test as in 278; device |
| AC-005 | REQ-005 | SCN-003 | Use every surface at 390×844 and 360×800 and on the user's phone | Matches VIS-001…029 (illustrative content aside); every touch target ≥ 44×44 CSS px; no horizontal scrolling at 360×800; the system Back key walks file/reference → view → run → list | — | Visual comparison; size check; the user's confirmation on his phone |
| AC-006 | REQ-006 | SCN-004 | "+" on the list, once with no run opened before and once after opening a run | New run with the preselection rule; each row opens its sheet; Create run creates an agent run and opens its Chat; the first message is sent there; the new run tops the list | Missing choice: disabled button with the reason; a bad folder path: the product's error under the field | Component tests; device |
| AC-007 | REQ-007 | SCN-003 | On a team member's run, open each ⋮ item | Each screen as VIS-007…013, 029, for that agent; Messages only for team/Org members; Files search over the workspace; no filters; no Attach | Empty states as the spec; remote run: the "on that node" wording | Component tests |
| AC-008 | REQ-008 | SCN-006 | Tap the node name | The sheet with the node's own name, URL, state, Check connection, peers with reachability and offers, Unpair this phone | Paired node down: bar "Not reachable", banner with Check (VIS-024); unpair → baseline confirmation → pairing screen | Component tests; device |
| AC-009 | REQ-009 | SCN-003 | Review the shell | None of the "Not on the phone" items appears (no Home, Switch work, tabs, view switch, Team/Org start, row actions, Files filters, Attach) and no filler text | A desktop route on the phone: the notice above the run list | Review against the spec; tests for absence |
| AC-010 | all | — | Finish | Pairing, unpair and the unsupported notice work on an Android device and the emulator; the desktop is unchanged; the shell renders in iOS Safari/WKWebView without errors; no secrets in evidence | — | Device, emulator, desktop regression tests |

## Relevant Scenarios And Journeys

The journeys are the spec's UXJ-001…UXJ-008; this table maps them to the requirements.

| Scenario ID | Kind | Actor | Goal | Spec journey | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user, outside | See what is running and what was delegated | UXJ-001, UXJ-007 | Supported Normal | The user's request; E-01, E-04 | REQ-001, REQ-002; AC-001, AC-002 |
| SCN-002 | User | The user | Talk to any agent in the tree, answer, approve | UXJ-002 | Supported Normal | E-03 | REQ-003; AC-003 |
| SCN-003 | User | The user | Move around with one hand; read results | UXJ-005, UXJ-008 | Supported Normal | The user's review | REQ-005, REQ-007, REQ-009; AC-005, AC-007, AC-009 |
| SCN-004 | User | The user | Start an agent run | UXJ-004 | Supported Normal | The user's decision | REQ-006; AC-006 |
| SCN-005 | System + User | Delegator run; the user | See and talk to work on another node | UXJ-003 | Supported Normal | 278 | REQ-004; AC-004 |
| SCN-006 | User | The user | Check the connection, see peers, unpair | UXJ-006 | Supported Normal | DEC-003 A | REQ-008; AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`.
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md`.
- Runnable UI reference:
  - In the design worktree, run `corepack pnpm install --ignore-workspace --frozen-lockfile`, then `corepack pnpm exec nuxt dev --host 0.0.0.0 --port 3277`.
  - Entry: `/mobile`.
  - Runbook: `ui-reference-runbook.md`, section "mobile-experience-redesign".
- Product ticket record: `…/tickets/in-progress/mobile-experience-redesign/product-ticket.md`, with the user's screenshots in `evidence/user-screenshots/` (Product-owned).
- Design repository and revision:
  - Repository: `/Users/normy/autobyteus_org/autobyteus-web-design`.
  - Branch: `design/mobile-experience-redesign` @ `976457a418d6355296c8a366bf403c865ee0646c`.
  - Integration into `personal`: pending, by the user's standing rule. It is merged after implementation is confirmed.
- UI/UX user-confirmation reference: "okayyy. everything is good now. i approve" (2026-11-06).
- Approved visual-reference baseline: VIS-001…VIS-029.
- Normative details: everything in the spec and screenshots, with two exceptions.
  - The spec's "Implementation Fidelity Boundary" applies: the reference's stores, fixtures and component split are not a prescription.
  - Illustrative content: names, ages, message and file texts, node names, "Embedded Node". The product shows the paired node's own name.
- Known reference gaps engineering follows the product on: a remote run's composer is text-only (278). Files search covers the whole workspace. Message, activity and file content are real data.
- Product decisions that need the user: none open. DEC-003 B waits as autobyteus-391.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005; AC-005 | Accessibility | Touch targets ≥ 44×44 CSS px; text ≥ 12px except badges and chips; the list is a `tree` with `treeitem`s, `aria-level`, `aria-expanded`, `aria-current`; menus and sheets with their roles (spec Accessibility) | Phone viewports 360–430 px | Tests and review |
| QR-002 | REQ-009 | Other | No mobile-only explanatory filler | All screens | Review |
| QR-003 | REQ-001; AC-001 | Performance | The run list appears within 2 s of opening on the user's phone over Tailscale with his real history; the poll does not make the phone sluggish | His history size | Measure (architecture R-001; device) |
| QR-004 | AC-010 | Compatibility | Only standard web APIs (`history`, `dvh`, `env(safe-area-inset-*)`); renders in Android WebView and iOS WKWebView | — | Review; Safari smoke check |
| QR-005 | all | Privacy | No secrets, tokens or pairing codes in screenshots or logs | All evidence | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` on the server. Phone local storage only.
- Must be preserved: the pairing session; the Android shell's saved nodes.
- Acceptable loss: mobile UI preferences (last tab, remembered member focus, open context) may reset once.

## External Contracts And Dependencies

| Contract / Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| autobyteus-278 remote relay | Remote runs come through the paired node only | 278 DEC-801 | Peer latency |
| autobyteus-385 Runs view | The phone's list mirrors it | 385 REQ-008 | Shared read window between surfaces |
| Peer list and offers on the paired node | Read-only peers in the connection sheet | E-06 | Offer read takes up to ~20 s per peer |
| Android WebView, iOS WKWebView | Shared web shell | Task | — |

## Supplemental Artifacts

| Artifact Path | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| [product-design-request.md](product-design-request.md) | Brief to the Product Team | All | Sent 2026-11-06 | Not behavior-defining |
| Product UI/UX spec and VIS-001…029 (path above) | Normative UI | REQ-001…REQ-009 | Approved | The user, 2026-11-06 |
| [follow-ups.md](follow-ups.md) | FU-001 = autobyteus-391 | — | Sent | — |

## Assumptions

| Assumption ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's history size makes the complete read window acceptable on the phone | REQ-001 | Measure (R-001) | Open (architecture) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which runs and tree? | The user's first point | Own flat list vs the desktop Runs view's | One list everywhere; the second builder is today's bug. Desktop Runs view | Solution Designer | Decided |
| DEC-002 | What a tap does | "Talk to it" | Live with composer vs read-only | Live, as on the desktop; remote text-only per 278 | Solution Designer | Decided |
| DEC-003 | Remote nodes on the phone | Scope | A / B / C | **A**, as built in the design the user approved; read-only peer list in the connection sheet. B (switch between paired nodes in the page) is Task autobyteus-391, waiting for his word ("if we are able to pair with multiple ones, we can just switch between different nodes, right? That would be very convenient."). C has no API, not in scope | The user, through the approved design | Decided (A) |
| DEC-004 | What is not on the phone | Space | The spec's list | The user: "there's no need to switch between … a different workspace or project"; Files: "we do not have any filter"; Attach removed. The spec's list governs | User | Decided |
| DEC-005 | "Needs you" marker | Outside use | Optional in the first approved design | **Dropped by the user** (2026-11-06, after the approval, through the Product Team): "I suggest that don't like hallucinate and invent things up, remove those, please … Those are not possible in the application, I think." The run history has no state for a run waiting on the user (U-003, E-26). Not in this ticket; no follow-up | User | Dropped |
| DEC-006 | Android shell changes | Task: only if needed | — | None in this ticket | Solution Designer | Decided |
| DEC-007 | Team or Org runs from New run? | Scope of REQ-006 | — | The user: "For new run we only support to create a simple agent run" | User | Decided |
| DEC-008 | Row actions (Stop, Archive, Delete) on the phone | Space and mistakes | Desktop rows have them | Absent per the approved list; Stop stays in the composer | User (approved list) | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Product evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | UXJ-001, UXJ-007; VIS-001, 003, 004, 021…025 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 | VIS-001, 002 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 | UXJ-002; VIS-005, 014 |
| REQ-004 | UC-001, UC-002 | BEH-005 | AC-004 | SCN-005 | UXJ-003; VIS-020 |
| REQ-005 | UC-003 | BEH-003 | AC-005 | SCN-003 | All; VIS-025…028 |
| REQ-006 | UC-004 | BEH-004 | AC-006 | SCN-004 | UXJ-004; VIS-015…018, 028 |
| REQ-007 | UC-005 | BEH-003 | AC-007 | SCN-003 | UXJ-005; VIS-006…013, 026, 027, 029 |
| REQ-008 | UC-006 | BEH-006 | AC-008 | SCN-006 | UXJ-006; VIS-019, 024 |
| REQ-009 | UC-003 | BEH-003, BEH-007 | AC-009 | SCN-003 | "What Is Not On The Phone" |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-006; spec UXJ-001…UXJ-008, TR-001…TR-019.
- Constraints:
  - one list and one target resolver shared with the desktop;
  - the phone talks only to the paired node;
  - no shell changes;
  - standard web APIs;
  - the desktop unchanged.
- Deferred to architecture:
  - the phone's read window and poll (R-001);
  - how mobile navigation state relates to the desktop selection;
  - Back-key history;
  - the run id change at first message.
- Facts to verify:
  - payload of the complete history;
  - stream behavior when the phone sleeps;
  - pending approvals of runs not streamed.
- Risks: R-001, R-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Product design integrated: `Yes`
- UI/UX approval recorded: `Yes`
- Decisions visible with reasoning: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none
