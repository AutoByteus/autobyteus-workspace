# Requirements Document

## Document Status
- Status: Approved
- Package identifier: delegated-team-default-collapse / project_task_394f7ced-6597-41e8-824a-e2140c35b743
- Request: UI: Keep delegated teams collapsed by default when opening Project Task Manager.
- Requirements owner: Solution Designer; date 2026-10-13.
- Authorities read: /home/autobyteus/workspace/autobyteus-workspace/.codex/skills/solution-designer/SKILL.md and references/requirements-engineering.md; root AGENTS.md; autobyteus-web/AGENTS.md; TESTING.md.
- Approved by: Solution Designer within the direction (user informed).
- Exact approved baseline: REQ-B1, SR-001, all BEH/SCN/UC/REQ/AC/DEC IDs below; no behavior-defining supplement.
- Approval reference: Solution Designer conversation message 2026-10-13 beginning “The sidebar store explicitly opens every delegated team when collaboration data loads. I’m approving the requirements within your requested scope”.
- Current solution revision: SR-002; approved requirements remain REQ-B1/SR-001 unchanged.
- Dispatch came from /project_task_manager; dispatch/release authorization is not inferred from requirements approval. Delivery still requires explicit user verification and applicable finalization/release rules.

## Problem And Desired Outcome
Selecting Project Task Manager after startup/restart exposes all delegated team members and floods the sidebar. Team rows should remain available, with member lists hidden until the user expands a particular team. Investigate separately the reported long initial selection; screenshot does not establish causality. Success is a compact usable sidebar, independent disclosures, preserved navigation and task state, with honest validation and runtime evidence.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current behavior | Desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001, SCN-004 | Standalone Agent-run collaboration publication opens every indexed team once per store lifetime, including after fresh startup | No automatic opening of team member lists merely from initial inspection, selected host, refreshed snapshot or newly appearing team | Workspace/role ancestors may reveal the selected manager and team rows; unrelated Team/Org sidebar behavior is unchanged | investigation E-002/E-003 |
| BEH-002 | User | SCN-002 | Team disclosure toggles one team ID under one host; team-row selection targets coordinator and member-row selection targets exact AgentRun | Preserve independent expand/collapse and exact selection; retain explicit disclosure choices across same-session refresh/reselection | Explicit Task-root navigation may open the requested team, but not siblings; collapse is not task stop/cancel | E-004/E-005 |
| BEH-003 | Contract | SCN-003 | Conversation, task/delegation and live state are independent of expansion; closed task executions disappear from navigation | No loss/modification of these states from presentation changes | Existing closure, navigation, conversation, composer and live-stream behavior | E-004/E-006 |
| BEH-004 | User/Operational | SCN-001 | User reports slow first selection; hydration loads all child projections/artifacts before publishing collaboration context | Investigate cold/warm selection and relevant work counts, distinguish timings from hypotheses; report unrelated causes as follow-up | No fabricated speedup or speculative performance redesign | E-007; user task |

## Stakeholders, Actors, And Outcomes
User manages multiple delegated tasks; must find a particular team without sidebar flooding and retain normal access to its members. Engineering must validate the actual changed build and disclose limitations; Delivery owns user verification, integration and cleanup.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Open/reselect the manager with multiple delegated teams after startup/restart | SCN-001, SCN-004 |
| UC-002 | Manually disclose a team and navigate to a member or explicit Task root | SCN-002 |
| UC-003 | Preserve task/conversation state and normal sidebar lifecycle | SCN-003 |
| UC-004 | Investigate initial-selection delay and validate changed behavior | SCN-001 |
### Out Of Scope
Task/worker stop, cancel or assignment semantics; persistence migrations; new UI design; browser/desktop shell redesign; Team/Org-root expansion-policy changes; wholesale lazy hydration/caching or backend performance refactor without additional evidence/approval. No production restart, upgrade, release or deployment is implied by this package.
### Non-Goals
No latency SLA or promised speedup; no cross-restart persistence of manual disclosure choices; no guarantee of collapsed team ancestors after explicit navigation to that team's child. Seven teams is representative test scale, not a product limit.
### Preserved Behavior Boundary
BEH-002/003 and REQ-002/003/004 govern retained behavior. Presentation collapse must never call task completion/cancel or worker termination.
### Review Authority
Blocking technical findings must cite approved REQ/AC/BEH IDs. New behavior, policy, migration obligation or unrelated optimization is a Requirement Gap requiring user approval; record adjacent proposals as non-authoritative follow-ups. Reviewer suggestions do not amend REQ-B1.

## Relevant Scenarios And Journeys
| ID | Kind/actor/goal | Supported trigger and start | Product-level sequence and expected outcome | Alternate/error | Validity/evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User; manager opens existing work | Application startup/restart, then select Project Task Manager role/conversation with several delegated teams | Open workspace/role/run, load normal collaboration state; team rows visible and members hidden; no later automatic expansion without user action | Empty delegated list shows no rows; normal load failure stays normal failure, not stop/cancel | Supported Normal Scenario; user task/screenshot, E-002/003 | REQ-001/005/006, AC-001/005/006 |
| SCN-002 | User; inspect one team's work | Click one team disclosure in loaded sidebar | Expand only that execution; select member, see exact conversation; collapse it; choose another team or explicitly open Task root | Shared addresses across delegated copies must remain separate by execution; existing Task-root action reveals only its target | Supported Normal Scenario; user task, E-004/005 | REQ-002/004/006, AC-002/004/006 |
| SCN-003 | System/user; maintain current delegation state | Background updates/task closure while navigating/collapsing | Status/conversations refresh normally, worker execution continues, completed task visibility follows existing behavior | Existing selection recovery when task disappears remains intact | Supported Normal Scenario; user preserved-state constraint and existing E-006 tests | REQ-003/006, AC-003/006 |
| SCN-004 | User/system; continue navigation in same session | Select manager again or normal collaboration refresh/new team appears | Existing explicit disclosure choices survive unchanged; new teams start collapsed; no sibling auto-opening | Fresh frontend store after restart has no manual disclosure choices | Supported Normal Scenario; user “merely selecting” constraint, E-002/003 | REQ-001/002, AC-001/002 |

## Requirements
| ID | Requirement | Behavior | Priority | Rationale/source |
| --- | --- | --- | --- | --- |
| REQ-001 | Teams beneath standalone Agent runs, including Project Task Manager, default collapsed on startup/restart and first appearance; opening/selecting host or publishing collaboration data does not open member lists | BEH-001 | Must | User default-collapse direction; DEC-001/002 |
| REQ-002 | Manual disclosure changes only the chosen execution under its host, retaining the choice through same-session refresh/reselection; members remain selectable | BEH-002 | Must | User manual-navigation requirement |
| REQ-003 | Preserve conversations, delegation state, task status, execution and unrelated sidebar interactions; presentation operations neither stop nor cancel work | BEH-003 | Must | User preservation constraint |
| REQ-004 | Preserve explicit Task-root and coordinator/member navigation, allowing targeted reveal without automatically opening sibling teams | BEH-002/003 | Must | Normal navigation contract E-005 |
| REQ-005 | Investigate initial-selection delay with documented setup, work counts and comparable cold/warm observations; report limits and follow-ups; only claim improvements demonstrated in comparable evidence | BEH-004 | Must | User latency request, TESTING.md |
| REQ-006 | Add durable regression coverage and realistic rendered changed-build checks; identify tested runtime/layers, remaining user-only check, actual delivery state and cleanup | BEH-001/002/003/004 | Must | User done conditions, TESTING.md |

## Acceptance Criteria
| ID | REQ | Behavior/scenario | Preconditions/trigger | Observable expected outcome | Alternate/failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001 | BEH-001; SCN-001/004 | Fresh app/store and seven teams; select role/run; settle initial load and refresh/reconnect | All listed team rows available; no member row visible without user expansion; new teams default collapsed | No teams is harmless; load errors handled by existing policy | Fresh Pinia stored/live publication regression, rendered restart/reselection |
| AC-002 | 002 | BEH-002; SCN-002/004 | Multiple teams, including repeated address copies; expand one, refresh/reselect, then collapse | Only chosen team's members visible; manual open/closed choices not overwritten; member targets exact conversation | Independent host/copy identity; siblings stay closed | Store/component assertions and rendered click/key disclosure + exact member selection |
| AC-003 | 003 | BEH-003; SCN-003 | Existing task state/conversations; expand/collapse, navigate, background update | Task/delegation/conversation state not rewritten by presentation; no stop/cancel request; unrelated actions still work | Existing task completion removes rows and returns selection normally | State/API assertions and focused neighboring regressions |
| AC-004 | 004 | BEH-002/003; SCN-002 | Manually select team/coordinator/member or explicitly open Task root | Correct coordinator/member conversation; explicit reveal affects only requested team | Regular host-row selection returns to host, preserving disclosure choices | Existing selection/Task-root tests plus changed-build journey |
| AC-005 | 005 | BEH-004; SCN-001 | Representative manager with seven teams, documented build/runtime/dataset | Baseline/changed cold and warm observations, request/row counts and readiness boundaries recorded; limits explicit | If exact delay not reproduced, report that and evidence-led separate follow-up rather than speedup | Validation report with stage definitions, timings, work counts |
| AC-006 | 006 | all; SCN-001/002/003 | Completed change ready for validation/delivery | Durable tests pass, rendered checks asserted not screenshot-only, cleanup and actual merged/released/runtime state explicit | Browser fixture alone is not real Electron/product-journey proof; failures/skips/remaining user check recorded | Implementation/API-E2E reports and Delivery receipt/user verification |

## UI, Interaction, And Experience Requirements
Applicable: Yes. Existing team rows/disclosure controls, summaries/status dots, keyboard access and member selection are retained; only their implicit initial expansion changes. Screenshot is illustrative problem context, not an approved redesign. No Product Design request; separate UI/UX spec, ticket/repository, runnable visualizer or approved visual references: N/A — not applicable.

## Quality And Non-Functional Requirements
QR-001: REQ-005/AC-005, performance evidence not SLA; capture click-to-host readiness separately from collaboration row readiness and member readiness, at the reported scale. QR-002: REQ-003/AC-003 data continuity; zero presentation-driven task/conversation changes. QR-003: REQ-002/006 accessibility/operability; retain existing disclosure and navigation affordances and test their semantics.

## Data Continuity And Acceptable Loss
Persistent data must not change for collapse behavior. Preserve all conversations, task IDs/status, delegations and work. Ephemeral UI expansion choices may reset on app/store restart (the requested default). User-data deletion, migration, credential/config changes or live worker restarts are not permitted as testing shortcuts.

## External Contracts And Dependencies
Shared renderer in desktop and browser; exact user OS/runtime/version not yet confirmed (async question sent). Validate renderer with browser coverage and full journey with isolated changed-build Electron as TESTING.md directs. Existing collaboration transport/hydration contract stays unchanged.

## Supplemental Artifacts
User screenshot absolute path is in investigation inventory; evidence-only, no behavior-defining supplement or separate approval needed. No Product-owned artifact.

## Assumptions
ASM-001: reported manager is a standalone Agent-run sidebar path, supported by screenshot's role/conversation hierarchy and current source; validate in rendered journey. ASM-002: worker Linux environment is not proof of user runtime; request clarification and retain this uncertainty if unanswered.

## Decisions
| ID | Question/evidence | Reasoning and recommendation | Owner/status |
| --- | --- | --- | --- |
| DEC-001 | Manager-only special case or shared existing standalone-run disclosure policy? | Same store owns all these rows; a name/role exception would duplicate presentation policy. Apply collapsed-by-default consistently to standalone Agent-run team rows, including hosted collaborators shown as delegated rows. Do not change unrelated Team/Org-root policies. | Solution Designer, Decided within direction |
| DEC-002 | New live/snapshot teams and same-session manual state? | “Collapsed by default” and “merely selecting” should not depend on which data loader supplied rows. New teams default closed; retain explicit choices, avoiding reset-on-every-selection and future automatic reopen. No persisted preference needed. | Solution Designer, Decided within direction |
| DEC-003 | Explicit Task-root navigation vs selecting manager? | Task-root is deliberate target navigation, not default host selection. Preserve its targeted reveal and existing exact member selection; siblings remain closed. | Solution Designer, Decided within direction |
| DEC-004 | Is sidebar flood proof of latency cause? | No; hydration already has independent per-member work. Measure before claims; visual fix does not authorize broad lazy-hydration redesign. Report that separately if warranted. | Solution Designer, Decided within direction |
Needs user: None for REQ-B1. Runtime answer improves verification but does not alter approved behavior.

## Traceability
REQ-001 → UC-001, BEH-001, SCN-001/004, AC-001.
REQ-002 → UC-002, BEH-002, SCN-002/004, AC-002.
REQ-003 → UC-003, BEH-003, SCN-003, AC-003.
REQ-004 → UC-002/003, BEH-002/003, SCN-002, AC-004.
REQ-005 → UC-004, BEH-004, SCN-001, AC-005.
REQ-006 → UC-001..004, all BEH/SCN IDs, AC-006.

## Architecture Phase Input
Map SCN-001..004 to existing expansion and selection owners. Verify publication/reconnect/added-team paths, row identity, targeted navigation, persistence absence and source-derived hydration work counts. Decide smallest clean removal and test locations. Latency cause remains an evidence question, not a required new cache or lifecycle contract.

## Readiness Check
Content readiness: Yes for evidence-backed current behavior, desired/preserved behavior, scope/non-goals, testability/traceability, supported scenarios, material decisions, data-continuity and measurable evidence requirements. Product UI/UX approval: N/A. No material behavior blocker. Approval and exact REQ-B1 basis recorded with user-informed message above: Yes. Approved basis ready for architecture design: Yes.
