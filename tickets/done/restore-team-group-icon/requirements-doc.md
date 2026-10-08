# Requirements Document — Restore Team group icon

## Document Status
- Package: `restore-team-group-icon`; task `project_task_103e288e-6ebb-45f2-9dc1-fc471c83e67f`.
- Status: **Approved**; baseline **R1 / SR-001**; current solution round **SR-002**, 2026-10-08.
- Owner: `/software_engineering_team/solution_designer`.
- Authorities read: solution-designer SKILL.md, references/requirements-engineering.md and requirements-doc-template.md; root/web AGENTS.md; root DESIGN.md and TESTING.md (all 2026-10-08).
- Approval: user approved manager plan/dispatch with “yes please”; user explicitly clarified “does not matter for delegated team or collaborator team, it should use people group”. Explicit R1 approval AP-001: after the R1 confirmation request in this conversation on 2026-10-08, user said “lets still use the people-group its much clearer”, then “approve”, then “basically we willb econsistant”. Applies to REQ-001..005, AC-001..005 and SCN-001..003, with no behavior-defining supplements. No release or installed-app change authorized.
- Incoming plan: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/2026-10-08-restore-team-group-icon/task-plan.md`.
- Behavior-defining supplements: none. Historical Product packages are cause evidence only, not a new normative visual baseline.

## Problem And Desired Outcome
The software engineering Team under a Project Task Manager run shows a lightning bolt. The user remembers a people-group symbol and wants Team identity to be people-group regardless of delegation/collaboration. Explain the source history and restore that identity consistently, without undoing the surrounding recent row cleanup.

## Relevant Current And Desired Behavior
| ID | Kind | Scenario | Current (evidence in investigation notes) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Delegated Team rows use a bolt; configured/stable Team rows use people-group. Both are explicit source choices. | Every affected Team identity glyph is the established filled people-group; role never selects a bolt. | Hierarchy, order, labels, selection, expansion, focus, status, layout/spacing, colors and other style. |
| BEH-002 | User | SCN-002 | Project/Temp Task Team worker lines and Memory task-Team groups use bolts; ordinary Memory Team groups use people-group. | Same Team identity symbol on equivalent markers. | Worker opening/disabled state, density, status/error, memory grouping/member inspection and task-role treatment other than glyph. |
| BEH-003 | Contract | SCN-003 | History records deliberately distinguish temporary Team execution using bolts; recent restyle enlarged/unboxed it and changed Org task-Team group to bolt. | Source-backed when/why explanation with precise dates/commits and uncertainty. | No claim to know the installed app upgrade date/version from screenshot alone. |

## Stakeholders, Actors And Outcomes
User: identify Teams at a glance and understand why appearance changed. Engineering: narrow regression-proof fix. Delivery: safe integration, explicit user verification and truthful delivery state. Concurrent Archive all task: no lost work.

## Scope Guardrail
### In-Scope Use Cases
- UC-001 / SCN-001: view/expand delegated, collaborator and configured Team identities in Workspace trees under Agent, Team and Org roots.
- UC-002 / SCN-002: recognize Teams in Project/Temp Task worker lines and Memory Team groups.
- UC-003 / SCN-003: receive a documented source-history explanation of the icon change.
### Out Of Scope
Icon-system redesign, avatar policy changes, new Team roles or workflows, backend/API/store/persistence change, unrelated lightning/capability symbols, Archive all functionality, release/publish/installed-app replacement. No user running app/data may be tested or altered.
### Non-Goals
Uniformize all existing outline/filled Team icons elsewhere, alter Memory role decorations, redesign clean delegated rows, infer an exact installation date.
### Preserved Boundary
BEH-001/002, REQ-003 and AC-003/005. Only identity glyph changes; role labels and other cues remain. Existing image-first Team avatars and non-Team identity distinctions remain.
### Review Authority
Blocking corrections must trace to an approved REQ/AC/preserved behavior. New product/policy/migration scope is a Requirement Gap requiring renewed user approval, not an automatic correction. Historical requirements requiring bolts are superseded only for this glyph under approved R1; do not edit historical records or discard their other constraints.

## Requirements And Traceability
| ID | Requirement | Behavior | UC / Scenario | Acceptance | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Use the established filled people-group symbol for Team identity regardless of delegated/collaborator/configured role on affected Workspace surfaces. | BEH-001 | UC-001 / SCN-001 | AC-001, AC-003 | Explicit user clarification; screenshot |
| REQ-002 | Apply the same correction to equivalent affected Team markers in Task worker lines and Memory groups. | BEH-002 | UC-002 / SCN-002 | AC-002, AC-003 | Approved manager scope; source audit |
| REQ-003 | Preserve layout, spacing, hierarchy, selection/expansion/focus, statuses, Agent/Org identities, Team avatars and unrelated capability icons. | BEH-001/002 | UC-001/002 / SCN-001/002 | AC-003, AC-005 | User constraint |
| REQ-004 | Explain source introduction/restyle dates, commits and rationale where established; distinguish explicit icon choice from rendering failure and state unknowns. | BEH-003 | UC-003 / SCN-003 | AC-004 | User request |
| REQ-005 | Supply passing focused durable regressions and changed-source rendered evidence with exact commands, files, limitations and pending delivery/user-verification steps; use isolated test-owned environments, preserve concurrent work, do not release/change installed app. | BEH-001/002/003 | UC-001/002/003 / SCN-001/002/003 | AC-005 | Approved task constraints, TESTING.md |

## Acceptance Criteria
| ID | Related REQ / BEH / SCN | Trigger | Observable outcome | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/003; BEH-001; SCN-001 | Display delegated and collaborator Teams under Agent/Team roots and delegated/configured Teams under Org roots. | People-group Team identity, no Team bolt; already-correct stable/configured Team icons unchanged. | Focused component assertions and rendered changed-source browser evidence. |
| AC-002 | REQ-002/003; BEH-002; SCN-002 | Display Team worker in compact/detail Task presentations and task/configured Memory Team groups (including nested groups). | All affected Team glyphs are filled people-group, with existing size/container/color/status/grouping retained. | Component cases plus rendered evidence. |
| AC-003 | REQ-001/002/003; BEH-001/002; SCN-001/002 | Click, keyboard select/focus, expand/collapse, show Agent/Org peers and available/unavailable Task workers. | Existing behavior/semantics and spacing unchanged; status/error/initials/avatar and non-Team icons intact, including model Fast/service-tier bolt. | Existing interaction regressions, focused assertions, DOM/visual inspection, diff audit. |
| AC-004 | REQ-004; BEH-003; SCN-003 | Final report is read. | Explicit source chronology with commit/date and documented rationale; no unsupported global group→bolt or installed-app timing claim. | Git diff/blame and historical artifacts. |
| AC-005 | REQ-003/005; all BEH/SCN | Validate and hand off fix. | Passing focused durable tests, changed-source rendered evidence, changed file and command/results list, test-owned cleanup and truthful untested/pending delivery notes; no installed-app/release claim or concurrent work overwrite. | Specialist reports and Delivery verification gates. |

## Relevant Scenarios And Journeys
All are **Supported Normal Scenario**, approved R1 (AP-001).
| ID | Kind / actor / goal | Supported trigger and sequence | Outcome and relevant alternate | Independent evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User recognizes a Team among workspace runs. | An Agent/Team/Org run has configured/collaborator/delegated executions; user expands root and Team, selects member, scans identities. | Group glyph identifies Teams; collapse/selection/status remain normal. No children still yields same Team identity without introducing a disclosure. | Supplied screenshot; agent_teams.md; history components and actual delegated/collaborator row support. |
| SCN-002 | User inspects assigned Team or saved Team memory. | Open Projects/Temp tasks board/detail or Memory Team/Org detail; scan worker/member groups, open listed worker or inspect member. | Same group symbol for Team; unavailable worker remains non-openable and Memory task grouping retains current role cues. | docs/projects.md; ProjectTaskWorkers.vue; CollaborationMemoryDetail.vue and its existing fixtures. |
| SCN-003 | User asks when and why the symbol changed. | Compare current screenshot with remembered appearance; inspect repository history and report facts. | Precise history with source limitation rather than speculation. | Original request; Git history and historical requirements. |
No manufactured error workflow or expanded product contract is introduced.

## UI / Quality / Data / External Contracts
- UI applies; glyph-only restoration. No Product Design work requested; Product-owned spec/ticket/runnable reference/confirmation: **N/A — not applicable** for this narrow fix. Screenshot is defect evidence, not a replacement specification.
- Quality QR-001 = REQ-003/005, AC-003/005: preserve interactions/geometry; render changed source with test-owned data per TESTING.md; retain limitations. No new performance or accessibility promise beyond preserved semantics.
- Persisted/external data affected: No. Existing user data must remain untouched; loss/reset acceptable: none. No migration or stored-data scan needed for this glyph request.
- Dependency: established frontend icon collection; technical feasibility verified by existing group symbols. No dependency upgrade requested.

## Assumptions / Open Decisions
- R1 approved (AP-001). No unresolved scope question: four affected production components identified, all within approved audit boundary.
- Source history cannot establish which installed-app update the user first saw. Do not inspect running app/private data to infer it.
- Memory keeps its existing task-role border/color and 12px inner icon; glyph changes only. Team size/style differences do not change semantic identity.

## Architecture Phase Input
Map approved SCN-001/002 to actual callers/renderers; verify collaborator routes, all affected markers and existing tests/probes. Choose the smallest existing-owner change without shared registry/refactor. Preserve historical reports, concurrent Archive all changes and all runtime contracts. Architecture may proceed against AP-001; target design is separately owned in design-spec.md.

## Readiness
Problem/current/desired/preserved behavior, boundaries, scenarios, linked testable REQ/ACs, operational constraints and uncertainties: **Yes**. Supplements: no behavior-defining supplement pending. Content ready for approval: **Yes**. User approval of R1 received: **Yes — AP-001**. Exact approved basis recorded: **Yes**. Ready for architecture: **Yes**.
