# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current requirements revision ID: `RER-001`
- Request / ticket: `subteam-aggregate-status`
- Requirements owner: `/requirements_engineering_team/requirements_engineer`
- Date: `2026-08-29`
- Approval state and reference: Awaiting explicit user approval of the `RER-001` intended behavior, especially the recursive aggregation scope and mixed-status precedence.

## Problem And Desired Outcome

- Problem: Stable nested Team rows in the Workspaces/Teams execution tree do not display a status indicator. When such a Team is collapsed, running member activity is hidden even though leaf Agent rows correctly show live status dots.
- Affected actors or systems: A user monitoring a TeamRun with configured nested Teams; the Workspaces/Teams sidebar execution tree.
- Desired outcome: Each stable nested Team row shows a presentation-only aggregate status dot before its Team avatar. The dot summarizes the live statuses of Agent executions inside that Team, remains visible while the Team is collapsed, and follows the existing Agent status color language.
- Observable definition of success: In the reported case, where `product_prototyper` is `running` and `prototype_bootstrapper` is `idle`, the collapsed `product_design_prototyping_team` row displays a pulsing blue status dot between its disclosure affordance and its `P` avatar without requiring the Team to be expanded.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A stable Agent row renders its five-state status dot, but a stable nested Team row renders no dot because the row-level status component is conditionally limited to Agent rows. | Every stable nested Team row with a `TEAM` badge renders an aggregate status dot before its avatar. | Row label, avatar, `TEAM` badge, timestamp, selection styling, indentation, and disclosure placement remain unchanged except for the added dot. | User screenshots; `WorkspaceHistoryWorkspaceSection.vue`; `StatusDot.vue`. |
| BEH-002 | System | Exact Agent execution statuses are projected independently as `running`, `initializing`, `idle`, `error`, or `offline`; structural Team rows have `currentStatus: null`. | The UI derives a presentation-only nested-Team summary from the current descendant Agent execution statuses; it does not create an authoritative Team runtime status. | Exact Agent statuses remain authoritative and continue to drive Agent-row presentation and Agent actions. | `runHistoryTeamRows.ts`; `runHistoryTeamExecutionRows.ts`; `runHistoryNavigationPatches.ts`; `agent_integration_minimal_bridge.md`. |
| BEH-003 | User | Collapsing a nested Team hides its descendants and therefore hides every descendant Agent status dot. | The aggregate dot remains visible and current in both expanded and collapsed states. | Existing row-body and disclosure expand/collapse behavior remains unchanged. | User collapsed-state screenshot; `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistoryTreeState.ts`. |
| BEH-004 | Contract | The public stream exposes exact leaf-Agent `AGENT_STATUS` and binary root-Team lifecycle; it deliberately exposes no aggregate Team status event. | Aggregate presentation is computed only from status data already present in the current frontend execution projection. | No API, WebSocket, persisted-data, root-Team lifecycle, or interrupt/readiness contract changes. | `autobyteus-ts/docs/agent_team_streaming_protocol.md`; `autobyteus-web/docs/agent_execution_architecture.md`. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Team-run user | Monitor work without expanding every nested Team. | A collapsed nested Team visibly reports whether any contained Agent execution is working or otherwise non-offline. | The summary must not obscure active work in a mixed-status Team. |
| Frontend execution tree | Present current Agent and Team hierarchy accurately. | Recompute the Team-row summary when descendant status projection changes. | Must use scoped descendants only and must not infer status from root-Team liveness. |
| Runtime and streaming boundaries | Preserve exact execution identity and status authority. | Continue to transport exact Agent status and binary root-Team lifecycle only. | No new aggregate status contract or persisted Team status is authorized. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: View the aggregate status of a stable configured nested Team while that Team is expanded.
- `UC-002`: View the same aggregate status while the nested Team is collapsed.
- `UC-003`: Observe the nested-Team dot update when a contained Agent execution changes status.
- `UC-004`: Aggregate Agent executions recursively within deeper nested Teams and currently projected task-scoped descendants that belong to the displayed nested-Team subtree.
- `UC-005`: Inspect the status meaning through accessible status copy without relying on color alone.

### Out Of Scope

- Adding a public or persisted aggregate Team status model or changing `AGENT_STATUS` / `TEAM_RUN_LIFECYCLE` contracts.
- Changing the existing binary activity dots on Team-definition group rows or exact root TeamRun rows.
- Adding aggregate dots to transient task-Team rows, top-level workspace rows, or Team catalog/configuration screens.
- Changing Agent status semantics, command readiness, interrupt behavior, Team liveness, selection, expansion, hierarchy, sorting, timestamps, or deletion/archival actions.
- Displaying member counts, progress percentages, multiple simultaneous status icons, or a status breakdown on the Team row.

### Non-Goals

- Defining an authoritative runtime lifecycle for a structural Team container.
- Preserving a last-known aggregate status after descendant execution statuses become offline or unavailable.
- Redesigning the sidebar or the existing status color palette.

### Preserved Behavior Boundary

- Preserve the exact Agent status behavior in `BEH-002` and the interaction/contract boundaries in `BEH-003` and `BEH-004`.
- `REQ-005`, `REQ-006`, `AC-008`, `AC-009`, and `AC-010` are mandatory no-regression boundaries.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Each stable configured nested Team row represented with a `TEAM` badge shall show one aggregate status dot after its disclosure chevron or alignment spacer and immediately before its Team avatar. | BEH-001, BEH-003 | Must | Makes status visible in the exact location requested and preserves hierarchy alignment. | User request and screenshots. |
| REQ-002 | The aggregate shall consider every currently projected descendant row that owns an Agent execution within that nested-Team subtree, recursively through deeper configured Teams. While present in that subtree, task-scoped Agent executions shall also count; sibling and ancestor executions shall not. | BEH-002 | Must | A collapsed Team should summarize all work it currently contains without leaking unrelated status. | Proposed clarification of the user's “team itself” intent; `DEC-001` approval pending. |
| REQ-003 | The aggregate status precedence shall be: `running` if any descendant is running; otherwise `initializing` if any descendant is initializing; otherwise `error` if any descendant is in error; otherwise `idle` if any descendant is idle; otherwise `offline`. Missing, null, unknown, or an empty descendant set shall resolve to `offline`. | BEH-002, BEH-003 | Must | Guarantees that active work remains visible in mixed-status Teams while retaining the existing five-state language for non-running states. | Reported running+idle example; existing `StatusDot` semantics; `DEC-001` approval pending. |
| REQ-004 | The Team-row dot shall use the existing solid status-dot presentation: running blue with pulse, initializing amber with pulse, error red, idle green, and offline/unknown gray. | BEH-001, BEH-002 | Must | Maintains visual consistency with descendant Agent rows. | `workspaceStatusDotPresentation.ts`; user screenshots. |
| REQ-005 | The aggregate dot shall update from current projected descendant statuses whether the nested Team is expanded or collapsed, without requiring disclosure, selection, navigation, or manual refresh and without adding a network request or polling loop. | BEH-003, BEH-004 | Must | Collapsed-state monitoring is the core requested outcome. | User request; current reactive execution projection. |
| REQ-006 | The aggregate shall be presentation-only. It shall not be persisted, transported as a new contract field/event, or used to determine TeamRun liveness, Agent readiness, message routing, command admission, stop/interrupt availability, or deletion/archival behavior. | BEH-002, BEH-004 | Must | Prevents a UI summary from becoming false runtime authority. | Existing documented status boundary. |
| REQ-007 | The Team-row aggregate status shall expose a localized, human-readable status name to assistive technology and as hover help; color shall not be the only machine-readable indication. | BEH-001 | Should | Makes the newly added status meaning perceivable beyond color. | Existing `TeamActivityDot` accessibility pattern; requirements quality review. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004, REQ-005 | A nested Team contains one `running` Agent and one `idle` Agent. | Its row shows a pulsing blue dot before the Team avatar in both expanded and collapsed states. | Expanding or collapsing does not change the aggregate while descendant statuses are unchanged. | Focused component test matching the reported example plus visual inspection. |
| AC-002 | REQ-003, REQ-004 | No descendant is running; at least one is `initializing`. | The Team row shows a pulsing amber dot. | A simultaneous `running` descendant changes the aggregate to blue. | Status-precedence unit/component matrix. |
| AC-003 | REQ-003, REQ-004 | No descendant is running or initializing; at least one is `error`. | The Team row shows a red dot. | A simultaneous running/initializing descendant takes the higher precedence specified by `REQ-003`. | Status-precedence unit/component matrix. |
| AC-004 | REQ-003, REQ-004 | Descendants are a mix of `idle` and `offline`, with none running, initializing, or error. | The Team row shows a green dot. | If all descendants become offline, missing, or unknown, it becomes gray. | Status-precedence unit/component matrix. |
| AC-005 | REQ-002, REQ-003 | An Agent in a deeper nested configured Team or a currently projected task-scoped Agent inside the subtree is running while direct configured Agents are idle/offline. | Every stable configured Team ancestor within that scoped subtree resolves to running/blue; unrelated sibling Team rows do not. | A task or Agent outside the subtree has no effect. | Recursive hierarchy component test with sibling isolation. |
| AC-006 | REQ-003, REQ-005 | A contained Agent transitions from running to idle while its Team row is collapsed. | The visible Team dot changes from pulsing blue to green in the same reactive UI update after the status projection changes, without expanding or manually refreshing. | Repeated no-op status projection does not create duplicate indicators. | Reactive component/store integration test. |
| AC-007 | REQ-001, REQ-003 | A stable nested Team has no descendant Agent status available. | Exactly one gray aggregate dot is rendered before the Team avatar. | The row never renders a blank gap, multiple aggregate dots, or an invented active state. | Empty/unknown-state component test. |
| AC-008 | REQ-001, REQ-004 | Compare an Agent row and nested Team row at the same hierarchy depth. | Dot size, colors, pulse behavior, and spacing follow the existing solid Agent status-dot visual language; the Team dot occupies the requested position before the avatar. | No unrelated typography, badge, avatar, timestamp, or indentation change occurs. | DOM/class assertions and visual regression inspection. |
| AC-009 | REQ-005, REQ-006 | A user clicks or keyboard-activates the nested Team row or its disclosure control after the indicator is added. | Existing expand/collapse and selection behavior executes exactly once and remains unchanged. | The dot itself does not introduce a separate selection, focus, or command action. | Existing interaction regression suite plus targeted assertions. |
| AC-010 | REQ-006 | The new indicator is exercised during live and historical Team views. | Exact Agent statuses and binary root-Team activity remain authoritative; no new API/WebSocket/persistence field or request is required. | If implementation evidence shows a contract or lifecycle change is necessary, downstream must return `Design Impact` rather than silently expanding scope. | Static contract diff/guard plus network and store tests. |
| AC-011 | REQ-007 | The Team aggregate is running, initializing, error, idle, or offline. | The rendered indicator exposes the corresponding localized status name through an accessible label and hover help without becoming an extra interactive control. | The status is not announced as an unlabeled decorative dot. | Accessibility attribute/component test. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Team-run user | The Product Design & Prototyping Team is expanded; one member is running and one is idle. | User observes the Team row, then collapses it. | The Team row is blue before and after collapse, so work remains visible. | REQ-001, REQ-003, REQ-005; AC-001. |
| SCN-002 | System | Exact descendant `AGENT_STATUS` projection | A nested Team is collapsed and currently blue. | The running descendant becomes idle. | The Team row becomes green without disclosure or manual refresh. | REQ-003, REQ-005; AC-006. |
| SCN-003 | System | Nested execution projection | A deeper nested or task-scoped Agent inside Team A is running; Team B is a sibling. | The aggregate is evaluated for both stable Team rows. | Team A and its stable ancestors report running; Team B remains based only on its own subtree. | REQ-002; AC-005. |
| SCN-004 | Contract | Team stream/status boundary | A nested Team dot is rendered. | Runtime commands, liveness, and persistence operate. | They continue to use exact Agent status and binary root-Team lifecycle, not the presentation aggregate. | REQ-006; AC-010. |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: The three user-supplied screenshots are current-state evidence and are inventoried in `investigation-notes.md`; no separate requirements-owned UI specification is needed.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — not applicable`
- Product prototype ticket record and folder (externally owned): `N/A — not applicable`
- Prototype revision or commit: `N/A — not applicable`
- UI/UX user-confirmation reference: Awaiting approval of `RER-001`.
- Approved visual-reference baseline: `N/A — no final prototype; existing status dots and user screenshots define the relevant visual language and placement.`
- Normative visual and interaction details, including the approved final references: One solid aggregate dot appears after the disclosure/spacer and before the Team avatar; mapping and precedence are specified by `REQ-003` and `REQ-004`; it remains visible when collapsed; it is informational and non-interactive.
- Explicitly illustrative fixture content or permitted implementation variation: Names, initials, timestamps, selection state, and example Team composition in the screenshots are illustrative. The relative dot placement, one-dot presentation, status mapping, and collapsed visibility are normative. Minor spacing may follow the established Agent-row spacing token as long as `AC-008` passes.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Workspaces/Teams sidebar; nested configured Team rows; expanded and collapsed; all five aggregate states; live status transitions; existing desktop responsive truncation; localized accessible status name.
- Explicitly unresolved product decisions: `DEC-001`—user approval of recursive/task-scoped aggregation and the mixed-status precedence proposed in `REQ-002` and `REQ-003`.

### Aggregate Status Decision Table

Evaluate rows from top to bottom; the first matching condition wins.

| Priority | Descendant condition within the nested-Team subtree | Team-row aggregate | Visual result |
| --- | --- | --- | --- |
| 1 | Any `running` Agent execution | `running` | Pulsing blue |
| 2 | Otherwise, any `initializing` Agent execution | `initializing` | Pulsing amber |
| 3 | Otherwise, any `error` Agent execution | `error` | Red |
| 4 | Otherwise, any `idle` Agent execution | `idle` | Green |
| 5 | Otherwise (all offline/missing/unknown, or no Agent descendant) | `offline` | Gray |

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Accessibility | Each aggregate exposes a localized status name to assistive technology and hover help, without becoming an extra tab stop; it is not an unlabeled color-only machine-readable signal. | Every aggregate state. | Attribute and localization test. |
| QR-002 | Performance | A projected descendant status change updates the aggregate through the existing reactive UI update without a new fetch, poller, or full-page reload. | Expanded and collapsed nested Team rows. | Spy/network assertion and reactive component test. |
| QR-003 | Reliability | Aggregation is deterministic for mixed, empty, unknown, recursive, and sibling-isolation cases according to the decision table. | Current execution projection. | Table-driven tests. |
| QR-004 | Compatibility | Existing Agent dots, root TeamRun activity dots, Team-definition any-active dots, selection, disclosure, and history behaviors remain unchanged. | Workspaces/Teams sidebar. | Existing focused regression suites. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Existing TeamRun history, execution tree, exact Agent statuses, binary root-Team activity, selection, and disclosure state.
- Loss, reset, rebuild, or regeneration that is acceptable: The presentation-only aggregate may be recomputed on every projection/render and is not retained across application restarts.
- Retention, privacy, compliance, volume, downtime, or operational constraints: None beyond existing status projection behavior.
- Unknowns requiring downstream investigation: None for requirements readiness; downstream must re-enter if implementation proves a persisted or external contract change is necessary.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Exact Agent status projection | Remains the source for each Agent execution's five-state status. | `agent_integration_minimal_bridge.md`; `AgentStatus.ts`. | None identified. |
| Root TeamRun lifecycle | Remains binary `isActive` and independent of member status. | `agent_team_streaming_protocol.md`; `agent_execution_architecture.md`. | Aggregate styling must not be mistaken for root liveness authority. |
| Current execution-tree projection | Supplies hierarchy, depth/parentage, stable and transient execution rows, and current exact statuses used by the presentation summary. | `runHistoryTeamExecutionRows.ts`; `runHistoryNavigationProjection.ts`; `runHistoryNavigationPatches.ts`. | Live patches update exact execution rows; aggregate must observe the current projection, not stale nested payload copies. |
| Existing status-dot visual language | Defines the five status colors and pulse behavior. | `StatusDot.vue`; `workspaceStatusDotPresentation.ts`. | Accessible copy must be added around the new Team summary without changing Agent-dot behavior. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_4bdbf7a22eca__image.png` | Current expanded hierarchy showing nested Team rows without dots and leaf status dots. | REQ-001, AC-008 | Current-state evidence | Not behavior-defining approval; user-supplied evidence. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_e2a356bf2caa__image.png` | Current reported running+idle example. | REQ-003, AC-001 | Current-state evidence | Not behavior-defining approval; user-supplied evidence. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_d8d617902516__image.png` | Current collapsed-state visibility gap. | REQ-005, AC-001 | Current-state evidence | Not behavior-defining approval; user-supplied evidence. |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | “Team status” means a presentation summary of contained Agent statuses, not a new authoritative Team lifecycle. | Current contracts explicitly have no aggregate Team status, while the user's goal is collapsed visual awareness. | User approval of `REQ-006`; downstream recheck. | Proposed; awaiting approval. |
| ASM-002 | Work visibility takes precedence over error/idle/offline visibility in a mixed Team, producing the order in `REQ-003`. | The user's explicit example requires running+idle to show busy/blue. | User approval of `DEC-001`. | Proposed; awaiting approval. |
| ASM-003 | “Contained members” includes recursive and currently projected task-scoped Agent descendants, not only direct configured Agents. | Otherwise collapsed Teams could still hide active work performed inside deeper/task execution. | User approval of `DEC-001`. | Proposed; awaiting approval. |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve the recursive descendant scope and precedence `running > initializing > error > idle > offline` proposed by `REQ-002` and `REQ-003`? | This defines every mixed and nested state, not only the reported running+idle example. | Recommended: approve as written because it always surfaces active work; alternative: configured direct members only or a different error precedence. | User | Pending explicit approval. |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001, BEH-003 | AC-001, AC-007, AC-008 | SCN-001 | Three user screenshots. |
| REQ-002 | BEH-002 | AC-005 | SCN-003 | Execution projection code evidence; no prototype. |
| REQ-003 | BEH-002, BEH-003 | AC-001–AC-007 | SCN-001–SCN-003 | Running+idle screenshot; decision table. |
| REQ-004 | BEH-001, BEH-002 | AC-001–AC-004, AC-008 | SCN-001 | Existing status-dot presentation. |
| REQ-005 | BEH-003, BEH-004 | AC-001, AC-006, AC-009 | SCN-001, SCN-002 | Collapsed-state screenshot; projection code. |
| REQ-006 | BEH-002, BEH-004 | AC-009, AC-010 | SCN-004 | Status/lifecycle contract docs. |
| REQ-007 | BEH-001 | AC-011 | SCN-001 | Existing Team activity accessibility pattern. |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: Exact Agent status authority; binary root-Team liveness; exact execution-tree scoping; no new request/poller; existing status palette and row interactions.
- Decisions intentionally deferred to architecture design: None currently identified. If implementation evidence cannot derive the presentation safely from the existing execution projection, downstream must report `Design Impact` rather than creating a transport, persistence, or lifecycle contract.
- Technical facts architecture should verify: Structural Team rows currently carry no five-state status; exact current Agent statuses are present in execution rows and receive reactive patches; nested payload copies may be stale after row-level patches, so the current projection is the factual presentation source.
- Known feasibility or integration risks: A derived dot could accidentally be treated as authoritative Team status; recursive aggregation must honor subtree boundaries and current row updates. These are requirement guardrails, not target design instructions.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A — a prototype is not needed; explicit requirements approval is pending`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Requirements package ready for downstream route: `No`
- Remaining blocker: Explicit user approval of the intended behavior and `DEC-001`.

## Architecture Design Routing Assessment

Not performed. Per the Requirements Engineering workflow, routing assessment begins only after the user explicitly approves the intended behavior and the Readiness Check passes. Preliminary evidence is retained in `investigation-notes.md`; no downstream route or outcome classification is authorized yet.
