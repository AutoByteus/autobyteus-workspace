# Task Agent Peer Sidebar — Design Spec

## Solution And Approval Basis
- Package: task-agent-peer-sidebar; current revision: SR-002.
- Status: Ready.
- Requirements: SR-001 explicitly approved by user message “Approve now work on it.” on 2026-09-26, captured in SR-002.
- Canonical requirements and investigation: absolute paths in solution-handoff.md; same directory as this file.
- Supplements: supplied screenshot is current-state evidence only; no Product spec/prototype requested.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar; branch codex/task-agent-peer-sidebar.
- Base: origin/personal@1676bede9d910ca40dc0331390a35f203206fd41; finalization target personal.

## Current-State Read
Shared Team navigation emits matched task Agents as children of recipient Agent rows. The workspace-history adapter passes through depth and derives hasChildren from parent keys. The renderer consequently indents, draws branches, and filters tasks behind collapsed regular-agent rows. The same history projection supplies auto-reveal ancestors. This is a presentation change, not a delegation or execution-tree change. See AE-001–004.

## Task Size And Architectural Risk
- task_size: Small.
- architectural_risk: Low.
- Actual production delta: one existing history presentation adapter, with focused projection/component/ancestry tests and a browser fixture/probe update as needed. No new runtime owner, shared type, API, route behavior, schema, security, concurrency or deployment change.
- Payload inventory: task documents, fixture expectations and documentation sync; their volume does not change scope.
- Escalation: any need to mutate shared Team navigation contracts, task availability/lifecycle, backend data, or broaden surfaces must return Design Impact/Requirement Gap. Do not silently expand scope.
- Independent review: N/A — not applicable unless configured routing or later escalation selects it.

## Architecture Investigation Evidence
| Evidence | Source | Decision | Uncertainty |
| --- | --- | --- | --- |
| AE-001 | teamExecutionTreeSelectors.ts; navigation consumers | Adapt sidebar projection, not shared selector | None material |
| AE-002 | runHistoryNavigationProjection.ts; tree-state composable | Depth and children in one projected authority | Regression tests required |
| AE-003 | history section and selection actions | Preserve exact run identity and handlers | Render/inspection checks required |
| AE-004 | view navigation purpose and task filtering | Preserve availability and retained-history policy | Regression checks required |
| AE-005 | existing component/browser test surfaces | Extend existing harness where suitable | Not executed in design phase |

## Intended Change
Make direct task-Agent rows peers of their corresponding Agent rows in workspace Team history. Keep existing immediate-after-recipient order and multiple-task order. Preserve task content, status, identity, click/keyboard actions and all actual Team/task-Team containment. Remove agent disclosure when delegated task Agents were its only displayed children. Outer Team run remains collapsible.

## Relevant Behavior And Production-Path Map
| Behavior | Kind / approved IDs | Trigger and current evidence | Target outcome and production path |
| --- | --- | --- | --- |
| BEH-001 | User; REQ-001/004, AC-001/004, SCN-001/003 | User opens Team after delegation; AE-001/002 | DS-001: source navigation → history peer projection → index/tree renderer; peers visible without agent expansion |
| BEH-002 | User; REQ-002/003, AC-002/005, SCN-002 | User activates row; AE-003 | DS-002: unchanged exact-run inspection; accessible level derives from projected depth |
| BEH-003 | System/User; REQ-003, AC-003/004, SCN-003 | Multiple tasks, live updates or retained inspection; AE-004 | DS-001/003: preserve source availability, row identity and history semantics while projecting peers |

## Relevant Supplemental Task Artifacts
User screenshot, absolute path in investigation notes/handoff: evidence for REQ-001/AC-001 only. No target UI/UX specification. Prior archived ticket is historical context, not normative authority.

## Task Design Health Assessment
- Posture: Behavior Change.
- Current design issue: Yes, a missing presentation invariant under the newly approved behavior.
- Root cause: Missing Invariant. Existing owner is sound; adapter previously equated source navigation parentage with desired sidebar hierarchy.
- Refactor needed now: No broader refactor. Extend the existing history projection in place, with a small pure/local derivation.
- Evidence: AE-001/002 show a single adapter can update all sidebar hierarchy consumers consistently.
- Do not fix by CSS-only padding (leaves collapse/ancestry wrong), auto-expanding agents (still nested), or changing shared selector (changes unrelated surfaces).
- Deferrals: no in-scope design debt deferred; broader existing source hierarchy remains intentionally unchanged.

## Terminology
“Peer” means sibling sidebar rows with equal depth. “Corresponding agent” is the recipient Agent row identified by the source navigation parent, not the delegator. “Task Agent” is navigation kind task_agent; task_team_agent means a member of a task Team and is not itself a separate delegated task.

## Design Reading Order
Approval/current state → evidence/behavior → transition policy → spines/ownership → exact projection → files/tests/sequence.

## Legacy Removal Policy
No backward compatibility; remove replaced in-scope behavior. Replace pass-through sidebar nesting for task Agents with one peer projection. No old/new layout flag, duplicate renderer, compatibility branch or persisted layout version.

## Persisted Data / State Transition Decision
Not Affected. Source execution tree, serialized task records and identity fields are unchanged; only ephemeral display depth/hasChildren differ. Expansion refs are in-memory booleans keyed by unchanged row keys. There are no task-data writes/migrations or permitted resets. Volume/I/O/rollback migration plan: N/A.

## Data-Flow Spine Inventory
| ID | Scope | Behavior | Start → end | Owner / importance |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/003 | Team run opening/delegation update → visible sidebar rows | Team view owns source availability; run history owns sidebar topology |
| DS-002 | Primary End-to-End | BEH-002 | Row activation → exact execution conversation | Existing selection/inspection owners, not projection |
| DS-003 | Return-Event | BEH-003 | Navigation/status update → refreshed row/index/status | Existing navigation publication/projection |

## Primary Execution Spines And Narratives
DS-001: Team run hydration or execution update → Team execution view listNavigationRows → buildRunHistoryTeamExecutionRows (peer projection) → runHistoryNavigationProjection (indexes) → WorkspaceTeamExecutionTree → stable/transient rows. Source owns which executions exist; adapter owns sidebar relationship; renderer shows the result.
DS-002: Row click/Enter/Space → WorkspaceHistoryWorkspaceSection.selectTeamDisplayRow → useWorkspaceHistorySelectionActions.onSelectTeamMember → runHistoryStore.selectTreeRun → existing member inspection/selection → focused conversation. Projection preserves exact IDs; auto-reveal uses the same projected hierarchy.
DS-003: Existing view/topology publication → navigation refresh/status patch → projected rows and reactive UI. No event policy changes.

## Spine Actors And Ownership Map
- Team execution view: source availability, lifecycle-purpose selection, exact execution identity.
- History execution-row builder: sidebar transformation only.
- History navigation projection/store: indexed display ancestry and row lookup.
- Tree/row components: disclosure, branches, accessible level, selection presentation.
- Selection/inspection actions: loading, error/retry, intent arbitration and focus.
Thin entry facades: existing component event forwarding only; no new facade or governing owner.

## Removal / Decommission Plan
| Remove | Replacement | Scope |
| --- | --- | --- |
| Pass-through task-Agent nesting beneath Agent rows in history adapter | Effective sidebar parent/depth derivation | This change |
| Tests asserting regular-agent disclosure and deeper task aria-level for this case | Peer-visible/no-disclosure/ancestry assertions | This change |
No files or source/runtime hierarchy deleted. No compatibility-only wrapper added.

## Return / Event And Bounded Local Spines
Return spine is DS-003 above. Bounded local spine within history projection: source keyed rows → effective sidebar placement → effective child membership → existing typed row conversion. This is a pure derived pass, not a new lifecycle/state machine.

## Off-Spine Concerns
| Concern | Serves | Responsibility | Boundary |
| --- | --- | --- | --- |
| Existing task heading/status presentation | Team view / rows | Description and lifecycle labels | Reuse without layout-dependent changes |
| Existing hierarchy branch component | Tree renderer | Draw projected depth/sibling connectors | No independent reparenting |
| Avatar/localization/loading feedback | Row components | Existing presentation/accessibility | No new copy/style system |
| Exact-run loading and intent arbitration | DS-002 selection owner | Correct conversation, failure/retry | Not moved into projection |

## Ownership Boundaries And Encapsulation
History consumes context.view.listNavigationRows(), not internal mutable execution-tree maps. Source identity/availability remains authoritative; history's existing display row contract is authoritative for sidebar depth and children. Components and ancestry must consume that contract, not independently flatten rows.
Forbidden: direct execution-tree mutation; address-only task selection; special CSS/renderer flattening; changing listNavigationRows globally for sidebar-only scope.

## Dependency Rules
Existing direction remains Team view public API → history projection → store/index → renderer. Selection event uses root TeamRun + agentRunId + memberAddress. No backend dependency added. Do not reach through the Team view into internal selectors from the history builder.

## Interface Boundary Mapping And Check
| Interface | Subject / explicit identity | Responsibility | Check |
| --- | --- | --- | --- |
| listNavigationRows() | Exact keyed AgentRun/TeamRun rows | Source navigation | Existing, unchanged |
| buildRunHistoryTeamExecutionRows(team, context) | Root TeamRun + context | Sidebar display projection | Existing, singular; no signature/type change |
| selectTeamDisplayRow / onSelectTeamMember | root TeamRun + agentRunId + address | Exact execution inspection | Existing, Low selector risk if IDs preserved |
| getTeamMemberNavigationAncestorRowKeys | TeamRun + AgentRun | Display ancestry | Existing, derived from projected rows |

## Main Domain Subject Naming Check
Existing names describe their subjects accurately. No new generic helper/service/manager needed. Local names should distinguish sourceNavigationRows from effective sidebar placement, not suggest runtime reparenting.

## Existing Capability Reuse And Subsystem Allocation
| Need | Existing owner | Decision |
| --- | --- | --- |
| Sidebar task placement | stores/runHistoryTeamExecutionRows.ts | Extend |
| Display ancestry | stores/runHistoryNavigationProjection.ts | Reuse; test |
| Branch/disclosure/aria rendering | components/workspace/history | Reuse |
| Conversation inspection/lifecycle | selection and Team view | Reuse unchanged |
No new subsystem or cross-cutting abstraction.

## Draft File Responsibility Mapping
Candidate delta is the existing history execution-row builder. Colocated store tests cover shape/identity/ancestry; history component tests cover visibility and events. Existing E2E probe may host the rendered regression.

## Reusable Owned Structures Check
Reuse TeamExecutionNavigationRow and RunHistoryTeamExecutionRow. No exported extra parent field is required. A local map keyed by source row.key is enough to determine projected placement and child membership. Do not standardize a second shared navigation schema or duplicate task identity. No repeated cross-file policy to extract.

## Shared Structure / Data Model Tightness Check
Existing row depth and hasChildren remain sidebar presentation fields with one meaning. Runtime identity/address/task/status fields are copied unchanged. No new optional fields, DTO changes or redundant persistent layout state.

## Exact Projection Algorithm
Implement inside buildRunHistoryTeamExecutionRows after existing root validation and before conversion:
1. Index source navigation rows by key (including root).
2. Determine effective sidebar placement for each descendant without mutating source rows:
   - For kind task_agent whose source parent is configured_agent or task_team_agent: use the source parent Agent's parentKey as effective parent, and that Agent's depth as effective source-relative depth. This promotes only the task leaf by one level.
   - All other rows retain source parentKey/depth. In particular task_team, task_team_member, task_team_agent, actual Team containment and tasks already parented to a Team remain unchanged.
3. Derive parentRowKeys from effective parents, not original source parents. Preserve original order; source already places matched tasks immediately after the corresponding Agent.
4. Convert to current history row shape with effectiveDepth - 1 (root is not rendered here). Determine hasChildren from effective child membership plus existing real container expandability / stable children. Agent rows with only promoted tasks must now be leaves; no phantom disclosure.
5. Preserve rowKey, root teamRunId, memberAddress, exact agentRunId/teamRunIdForNode, transientKind, label, task presentation and status verbatim.
6. Existing no-context configured-row path and invalid-root guards remain unchanged.

Source task Agents are leaves (AE-001), so this does not relocate a subtree. Source Agent parent kinds are distinguished explicitly; do not indiscriminately subtract one from every transient row. Task-Team member source rows can be the related Agent, but their container remains the actual task Team.
Use the existing stable.hasChildren/container rule without carrying stale source task-child membership into Agent disclosure. Tests should prove resulting rows and ancestry.

## Final File Responsibility / Target Folder Mapping
All paths relative to worktree.
| Action / file | Owner and concern | Must not contain |
| --- | --- | --- |
| Modify autobyteus-web/stores/runHistoryTeamExecutionRows.ts | Sole sidebar peer placement and typed row conversion | Shared lifecycle changes or tree mutation |
| Modify autobyteus-web/stores/__tests__/runHistoryTeamExecutionRows.spec.ts | Peer depths/hasChildren/order, multiple/retained/nested task-Team cases | New historical product scope |
| Modify autobyteus-web/stores/__tests__/runHistoryNavigationProjection.spec.ts | Correct task ancestry after promotion | Independent production topology logic |
| Modify autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts | Leaf agent, task visibility, aria/event regression | Manual fixture-only proof without projection test |
| Reuse/extend tests/e2e/task-agent-monitor-visibility-probe.mjs + fixtures/task-agent-monitor-visibility.page.vue under autobyteus-web | Rendered peer visibility and direct inspection evidence | Permanent test route in production |
| Delivery docs sync: autobyteus-web/docs/agent_teams.md if needed | Describe new sidebar behavior | Runtime contract rewrite |
Production renderer/composables/shared selectors: expected unchanged. If implementation discovers a local necessity, document it against approved IDs; material scope changes return for design revision.

## Applied Patterns And Folder Boundary Check
Pure presentation projection at existing adapter boundary; no new abstraction pattern. Existing stores and colocated tests form a clear presentation/read-model concern. Existing components own visuals; existing services own execution. Low mixed-layer/over-split risk; no folder moves.

## Concrete Shape Guidance
Before: worker(depth 0, children=true), task-A(depth 1), task-B(depth 1), reviewer(depth 0).
After: worker(depth 0, children=false), task-A(depth 0), task-B(depth 0), reviewer(depth 0).
Inside task Team: task-Team(depth 0), member(depth 1), delegated task-Agent(depth 1); keep container disclosure.
Avoid: task-Team member moved to root; hiding tasks with old agent collapse; shared source parent mutation; task selection by matching address.

## Backward-Compatibility Rejection Log
| Mechanism | Decision | Replacement |
| --- | --- | --- |
| Old/new layout toggle or persisted version | Rejected | Single sidebar peer projection |
| Force expansion to conceal old nesting | Rejected | Correct peer depth/hasChildren |
| CSS-only indentation override | Rejected | Shared display topology consumed by renderer and ancestry |
Migration compatibility: N/A; no persisted data change.

## Derived Layering
Existing source execution view → presentation read model → UI. No additional layers.

## Change / Refactor Sequence
1. Add focused projection/ancestry regression assertions using current supported fixtures.
2. Implement effective peer placement and child-membership derivation in the existing adapter.
3. Update component fixtures/expectations to peers; prove tasks visible with all Agent expansion flags false and agent click does not toggle task children.
4. Run affected projection/component/inspection suites with --run; update relevant regressions, not unrelated snapshots.
5. Render browser-equivalent sidebar and verify AC-001–005 with direct task/regular-agent selection, multiple rows, narrow-sidebar readability and actual Team collapse. Save screenshot/evidence; no image-generation substitute.
6. API/E2E owner executes durable/system validation; delivery owns docs sync, explicit user verification, finalization and any release/cleanup.
No temporary seam or compatibility branch remains.

## Key Tradeoffs
Keeping sidebar-specific placement in the existing adapter avoids unintended Team Members/mobile/token surface changes. It deliberately differs from source navigation parentage but remains a single authoritative sidebar projection used by rendering and ancestry. Immediate-after-agent ordering preserves association without implying parenthood.

## Risks
- Depth-only change would leave phantom children/auto-reveal; test both topology fields and indexed ancestry.
- Broad transient flattening would break task-Team containers; promote only task_agent with Agent parent.
- Same-address multiple tasks must retain exact AgentRun keys.
- Availability/history must stay source-owned; do not make hidden/settled tasks visible as a side effect.
- Rendered/e2e checks not yet run; this is design readiness, not implementation success.

## Guidance For Implementation
Use assigned worktree and package. Honor autobyteus-web/AGENTS.md (explicit git paths; --run tests). Keep scope to approved REQ/AC IDs. Implementer owns source/self-checks, API/E2E owns executable validation, delivery owns finalization. Return requirement/design/unclear findings rather than altering intended behavior. Include approved requirements, this design, canonical investigation and cumulative revision record downstream. Independent review artifacts N/A if routing skips review.
