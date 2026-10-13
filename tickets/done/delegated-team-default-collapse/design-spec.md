# Design Spec — Delegated Team Default Collapse

## Solution And Approval Basis
- Package: delegated-team-default-collapse / project_task_394f7ced-6597-41e8-824a-e2140c35b743; current solution revision SR-002.
- Design status: Ready (DS-B1).
- Requirements: Approved REQ-B1/SR-001, Solution Designer within direction; user-informed conversation 2026-10-13 beginning “The sidebar store explicitly opens every delegated team when collaboration data loads. I’m approving the requirements within your requested scope”. No behavior-defining supplements.
- Canonical investigation: /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/investigation-notes.md.
- Authorities read in full 2026-10-13: solution-designer references/architecture-design.md, references/design-principles.md and design-spec template; /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/DESIGN.md, TESTING.md, root/web/server AGENTS.md. design-examples.md not needed. No closer web DESIGN.md.
- Conflicts: None. Stale Python backend wording in web architecture overview is recorded as E-015, not assumed as runtime authority.
- Workspace/base: isolated requirements/delegated-team-default-collapse branch in /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse; refreshed origin/personal 8d52dc4eb378609ae2dca6089eb62678eeafe803. Finalization target origin/personal under Delivery gates; no merge/release authority from design approval.

## Current-State Read
The existing standalone-run collaboration store correctly owns per-host/per-team ephemeral disclosure. Publication, however, calls openNewTaskTeams, inserting EVERY indexed team into expandedTeams; autoExpanded suppresses reopening only during that store lifetime. A fresh frontend restart loses the suppression, so first inspection/snapshot opens everything again (E-002/003). Row rendering, exact navigation and Task execution have separate owners. The root issue is explicit UI policy, not evidence that selection itself restores/stops workers or that expansion causes latency. E-008..014 trace lifecycle, identity, callback reachability and persistence absence after requirements approval.

## Task Size And Architectural Risk (Mandatory)
- task_size: Small.
- Evidence: local policy deletion in one existing Pinia store plus removal of its now-unused stream callback seam; existing row/context/selection public behavior retained. Focused tests and one renderer/owned-stack regression probe may span more files but do not enlarge production architecture. Markdown volume and seven-team fixtures are payload/test volume, not broad implementation scope.
- architectural_risk: Low.
- Evidence: no new owner, API/query, schema, migration, security, concurrency, readiness or deployment contract. Existing explicit disclosure uses exact (hostRunId, teamRunId); current expansion already defaults false absent auto-opener. Store inspection/adoption/termination gates and transport state machine are unchanged; optional callback is internal and has one consumer solely for removed behavior.
- Escalation: return Design Impact if collapse requires altered hydration/publication completeness, lazy loading/caching, backend/stream contract changes, persistence, Team/Org-root changes, lifecycle changes or wider boundary restructuring. A behavior/scope change is Requirement Gap and needs approval. Timing uncertainty about the untouched latency path is not a justification to silently enlarge this Low-risk design.

## Architecture Investigation Evidence
| References in canonical investigation | Finding | Decision | Uncertainty |
| --- | --- | --- | --- |
| E-002/003/009 | Auto-opening belongs to store publication and collaborator-added callback | Remove implicit expansion, including dead callback seam | Exact user runtime pending |
| E-004/005/010/011 | Existing rendering and independent explicit navigation already fit | Keep store toggle + row activation and Task-root reveal unchanged | Validate rendered interactions |
| E-007/008/012/013 | All child details load independently of collapse | Measure separate readiness boundaries; no hydration redesign or speedup promise | Actual latency cause unknown |
| E-014 | Expansion memory-only, release deletes host state | Not Affected persisted-data decision | None for presentation fix |

## Intended Change
Make absence of a user disclosure choice mean collapsed for team rows in standalone Agent-run sidebars, including Project Task Manager. Data arrival, refresh, reconnect and newly added teams do not mutate disclosure. Preserve user-driven actions and current execution/state contracts.

## Change Scope (Mandatory)
In scope UC-001..004: remove standalone-run implicit expansion, retain exact explicit navigation, add regression tests/rendered checks and initial-selection evidence. Deliberately leave Team/Org-root disclosure policies, row styling, Task execution, all-child hydration and server surfaces alone. Follow-up candidate: eager collaboration hydration/detail queries if measured latency warrants separate work; no confirmed broader root cause at design time. User-runtime question pending but shared-renderer fix bounded.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved requirement/AC | Supported trigger | Current evidence | Target path/lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/006; AC-001/006 | Startup/restart then manager selection; SCN-001/004 | E-002/003/008/009 | DS-001/003: publish contexts without disclosure side effect; rows query existing false default; no per-role string exception |
| BEH-002 | REQ-002/004; AC-002/004 | Explicit team disclosure/member/Task-root selection; SCN-002 | E-004/005/010/011 | DS-002: exact toggle/selection; preserve prior choices during publish and explicit target reveal |
| BEH-003 | REQ-003/006; AC-003/006 | Manual presentation interaction and status/task closure; SCN-003 | E-004/006/009/014 | DS-002/003: worker and conversation state unchanged; closure still removes completed rows/returns selection |
| BEH-004 | REQ-005; AC-005 | Initial manager selection with representative workload; SCN-001 | E-007/008/012 | DS-001/003 observable readiness timing/work counts; no new runtime owner or performance claim |

## Relevant Supplemental Task Artifacts
User screenshot: /home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_394f7ced-6597-41e8-824a-e2140c35b743/context/ctx_efad056b398c__ctx_c530ee43ec84_image.png. REQ-001/006, visual problem context only; not normative UI design or latency evidence. Product artifacts/review package: N/A — not requested.

## Task Design Health Assessment (Mandatory)
- Change posture: Bug Fix / approved default-behavior correction.
- Structural design issue found: No for this delta; local UI policy conflicts with requested behavior.
- Root cause classification: Local Implementation Defect (implicit auto-opening branch in correct existing UI owner).
- Refactor needed now: No broad refactor. Remove policy-only callback/state made unnecessary by clean-cut replacement.
- Trigger analysis: repeated-coordination/owner overload/boundary bypass/shared-structure looseness do not fire; one store owns exact disclosure and no duplicated new policy is introduced. Dead-code removal trigger fires for opener, suppression Set and callback seam. Persisted-data trigger absent: memory-only UI state.
- Design response: delete needless automatic work; no manager-name flag, second expansion store, delay timer, post-render reset or cache.
- Intentional deferral: eager detail hydration remains coherent with current complete-context contract; record as performance follow-up if evidence supports it. Unknown latency magnitude does not justify correctness-changing laziness.

## Terminology
Host: standalone AgentRun owning collaboration package. Team execution: exact teamRunId, not a displayed name/address. Implicit publication: stored inspection or stream snapshot/event arrival. Explicit reveal: deliberate team/Task-root navigation.

## Legacy Removal Policy (Mandatory)
Remove openNewTaskTeams and autoExpanded suppression; do not retain startup-only old/new branches. Compatibility wrappers/dual paths: None.

## Persisted Data / State Transition Decision
Not Affected. expandedTeams is ephemeral shallowReactive hostRunId -> readonly teamRunId[] (E-014); no serialization/storage API changes. Existing Tasks, trees, histories and conversations stay directly under current readers/writers. No migration/startup admission gate, old-schema branching or backup needed. REQ-003/AC-003 requires zero presentation-driven persisted mutations.

## Data-Flow Spine Inventory
| Spine | Scope | Behaviors | Start → end | Owner/importance |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 001/004 | User reveals manager role/run → history rows mount/host open → store inspect or selected-host sync → GraphQL inspection/snapshot + existing member hydration → context publication → task rows with collapsed members | collaboration store owns publication/disclosure separation; guarantees compact opening |
| DS-002 | Primary End-to-End | 002/003 | User team disclosure/row/Task root → component/Task-root navigation action → store exact toggle/select → context row filtering + active child target → member/coordinator conversation | store owns UI identity/state, selection/navigation owns conversation route; no execution command from collapse |
| DS-003 | Return-Event / bounded stream detail | 001/003/004 | Backend snapshot/event → stream processing/applyEvent → store publish/context update → reactive row projection → rendered sidebar | stream owns sequencing and context owns execution view; data arrival must not own disclosure |

## Primary Execution Spines And Narratives
DS-001 loads the manager's normal host conversation and collaboration rows through their existing separate paths. Stored inspection never restores a stopped host; active sync attaches current collaboration stream. Hydration still stages complete child state, then the store publishes it without touching disclosure. listTaskRows emits team rows but visits their members only on explicit true state. Parent role/workspace reveal remains unchanged.

DS-002 disclosure button changes one host/team ID without selection. Team body/Enter/Space intentionally toggles that team and selects coordinator via existing activateRow. Member selection keeps exact AgentRun target and opens host context as needed. Host row clears child selection but does not reset disclosure. Explicit Task-root navigation may open its target team only; preserve this exception to initial defaults.

DS-003 stream snapshots/checkpoints use the same publish path as inspection. collaborator_added applies child contexts in place, task_execution_started retains reconnect snapshot logic, task closure keeps selection recovery. None implicitly opens teams. New teams therefore read false, while prior choices persist.

## Spine Actors, Ownership Map And Thin Facades
Sidebar/history actions own supported UI entry and navigation; useAgentRunCollaborationSync owns selected-host sync trigger; collaboration store owns expansion/selection, context publication, inspection and stream release; context/index owns exact execution identity and row projection; hydration/stream own complete context staging and transport sequencing; backend inspection/projection owns authoritative data. Existing active workspace target presents selected child context. No new wrapper/facade introduced (N/A).

## Removal / Decommission Plan (Mandatory)
| Remove | Evidence/why | Replacement | Scope |
| --- | --- | --- | --- |
| Store openNewTaskTeams + calls in publish/attach | Explicit obsolete auto-open policy E-002 | Existing false default + user toggle | In This Change |
| Store autoExpanded declaration/clear | Dead after opener removal; only suppression references E-002/014 | No replacement state needed | In This Change |
| Stream options.onCollaboratorAdded option + notification branch | Dead after sole consumer removal; rg E-009 finds one production consumer, solely expansion | Existing context.applyEvent still applies collaborator addition | In This Change |
| Old test asserting initial expansion | Assertion protects replaced policy, not retained guarantee | Collapsed-default/explicit-choice tests | In This Change |
No other dead-code finding established. Preserve onTaskExecutionsClosed, actual event application, task visibility and live send logic.

## Return/Event And Bounded Local Spines
DS-003 preserves current serialized socket frame processing, CONNECTED → snapshot staging → ready and checkpoint reconnect. Only post-event expansion notification disappears; do not simplify unrelated state machine or transport checks.

## Off-Spine Concerns Around The Spine
Activity/artifact projection commits and revision guards serve complete-context hydration; workspace resolution serves child contexts; Task summaries/locator serve sidebar rows; reduced-motion leave hooks serve row removal. All remain existing owners, not new critical-path caches or readiness semantics.

## Ownership Boundaries And Boundary Encapsulation Map
| Public boundary | Internals | Callers | Forbidden shortcut |
| --- | --- | --- | --- |
| collaboration store toggleTaskTeam/isTaskTeamExpanded/taskRows/selectChild | expansion record + context/index | AgentRunTaskRows, existing Task-root navigation | Component mutating stored tree/Task status or duplicating expansion records |
| collaboration store inspect/syncHost/attach | staged hydration and stream lifetime | sidebar and selected-host sync | Removing completeness/revision guards just to collapse UI |
No stronger API needed; existing boundary fully expresses local delta.

## Dependency Rules And Interface Boundary Mapping/Check
Keep component → collaboration store → context/hydration/stream. Existing navigation uses (hostRunId, teamRunId) for disclosure and (hostRunId, agentRunId) for child selection; each subject/identity singular, ambiguity Low. Do not key by role label/address, do not introduce role-specific exceptions or persist presentation to backend. Stored/live publish must not invoke toggle. No new query/command/interface. Internal policy-only callback deletion is not a change to collaboration transport DTOs.

## Naming, Capability Reuse And Subsystem Allocation
Existing agentRunCollaborationStore, AgentRunCollaborationContext and AgentRunTaskRows names fit concrete concerns. Reuse existing collaboration/sidebar capability; no manager or helper layer added. Naming drift Low. Test fixtures belong to existing tests/e2e and colocated __tests__, not production shared folders.

## Draft And Final File Responsibility Mapping
Draft confirmed as final: collaboration store remains UI publication/disclosure owner; streaming service remains ordered snapshot/event transport adapter; store/component/stream tests prove policy and unchanged interactions; browser probe supplies rendered boundary checks. No new production reusable structure extracted. Shared structure tightness: existing exact execution IDs retained; suppression state removed, no redundant new representation. Folder layout unchanged, clear owner boundaries, no over-splitting.

## Target Subsystem / Folder / File Mapping
Paths relative to task worktree.
| Change | Path | Responsibility / boundary |
| --- | --- | --- |
| Modify | autobyteus-web/stores/agentRunCollaborationStore.ts | Remove opener/suppression and calls; retain all manual state/inspect/transport/termination behavior |
| Modify | autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts | Remove now-dead optional onCollaboratorAdded seam/notification only |
| Modify | autobyteus-web/stores/__tests__/agentRunCollaborationStore.spec.ts | Replace obsolete assertion; stored/live snapshots, new teams, manual choices, fresh stores, same-address copies/host isolation |
| Add/extend | autobyteus-web/components/workspace/history/__tests__/AgentRunTaskRows*.spec.ts | Actual store/context component integration for multiple teams; disclosure/selection semantics, no sibling expansion |
| Modify as needed | autobyteus-web/services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts | Preserve collaborator addition/event sequence/Task closure without expansion callback |
| Add | autobyteus-web/tests/e2e/delegated-team-default-collapse-probe.mjs and optional fixtures/ | Durable rendered actual product component/owned stack regression; cover restart, identity and latency evidence |
| Modify | autobyteus-web/package.json | Register discoverable test:e2e:delegated-team-default-collapse command |
| Docs sync (Delivery-owned) | autobyteus-web/docs/agent_management.md and/or docs/projects.md | Describe collapsed default vs explicit Task-root reveal wherever relevant; no generic testing-guide ticket prose |
Components/AgentRunTaskRows/context/index/Task-root navigation production paths intentionally unchanged. Do not change Team/Org-root opensOnAppear flags for this ticket.

## Applied Patterns And Concrete Shape Example
No new pattern. Example: fresh store + teams A/B → A closed/B closed; user toggles A → A open/B closed; refresh or publish new C → A open/B closed/C closed; user collapses A → all closed; next frontend restart → all closed. Explicit Task-root B may open B and select its coordinator, never A/C. Avoid resetting all teams on each manager click (destroys manual choices) or keeping startup/loadSource-specific auto-open branches.

## Backward-Compatibility Rejection Log
| Candidate | Why rejected | Clean-cut replacement |
| --- | --- | --- |
| Manager-name conditional or stored-vs-live old expansion branch | Duplicate/dual disclosure policy, same user intent should not depend on hydration source | One default false, explicit actions only |
| Persisted preference/migration/collapse timer | Unnecessary state or timing workaround; default already false absent opener | Delete implicit mutation |
Derived layering: N/A — existing owners suffice.

## Change / Refactor Sequence
1. Reconfirm worktree and approved REQ-B1; capture baseline expansion and representative cold/warm work/timing evidence with test-owned fixture/stack before changing behavior.
2. Remove automatic opener/suppression and unused callback seam together; do not alter context event application or transport lifecycle.
3. Update obsolete unit assertion and add multi-team stored/live/reconnect/addition/refresh/manual-selection cases; run neighboring closure/termination/Task-root tests.
4. Add/run durable rendered regression probe, guard scripts and applicable focused web tests. Validate actual isolated changed-build product journey per TESTING.md; retain limits and user-runtime uncertainty.
5. Handoff implementation + evidence through configured route. API/E2E independently validates. Delivery handles docs, explicit user verification, finalization, release/runtime disposition and temporary-resource/worktree cleanup. Release requires RELEASE.md and applicable user authorization, not inferred from this design.

## Key Tradeoffs, Risks And Implementation Guidance
Deleting UI-only automatic state is smaller and more reliable than a post-render collapse/reset. Initial visible members disappear; exact navigation still reveals what user requests. Collapsing does not make member hydration lazy: expected source-derived 42 child projections + 42 file-change reads at seven six-member teams stays unchanged. Expected initial visible rows fall roughly 49 → 7; no measured time speedup claimed.

Performance validation must separate click→host committed, collaboration/team rows ready and selected-member ready. Record baseline/changed cold and warm samples, build pins, workload, request/row counts and failure/warmup limits; investigate related cost before claiming benefit. Propose unrelated eager-hydration issue as follow-up, not an unapproved fix.

Run examples after pnpm install and Nuxt prepare: pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRunCollaborationStore.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts components/workspace/history/__tests__/AgentRunTaskRowsSelect.spec.ts --run; add the new integration tests and neighboring closure/termination/compaction/Task-root tests. Durable browser command as mapped above; follow TESTING.md owned stack/runtime setup, not the user's active server/data. Fixtures that mock transport must supply all GraphQL/WebSocket boundaries and fail on browser errors; fixture pass is only renderer evidence, not full actual product/Electron pass.

Remaining user-only check: user confirms their actual runtime/version and final restarted-manager experience, especially whether the perceived long wait remains. Validation agent should do ordinary safe isolated setup, not shift it to the user. Temporary processes, tabs, data roots and models must be stopped/cleaned by their owner; keep durable screenshots/logs and worktree for Delivery until finalization.
