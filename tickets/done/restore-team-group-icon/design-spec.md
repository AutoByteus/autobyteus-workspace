# Design Spec — restore-team-group-icon

## Solution And Approval Basis
- Status: **Ready — Architecture Design Complete**, D1 / SR-002, 2026-10-08.
- Requirements: R1 / REQ-001..005, AC-001..005, SCN-001..003, explicitly approved AP-001 in this conversation: “lets still use the people-group its much clearer”, “approve”, “basically we willb econsistant”. No intended-behavior expansion from R1.
- Behavior-defining supplements: none. Historical Product specifications: evidence only, not a required new Product handoff.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-team-group-icon/tickets/in-progress/restore-team-group-icon/investigation-notes.md`.
- Authorities read: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`; root `DESIGN.md`, `TESTING.md`, root/web `AGENTS.md` (2026-10-08). No closer applicable DESIGN.md. Design examples not needed.
- Conflicts: none. Web ARCHITECTURE.md's old Python-backend summary noted in investigation, not an authority for this renderer-only delta.
- Workspace: isolated `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-team-group-icon`, branch `codex/restore-team-group-icon`, fetched base `origin/personal@4a51482a5ef8c678d69a3ffc995d6876fd170a2f`; finalization target origin/personal through Delivery gates. Release/publish/installed-app change not authorized.

## Current-State Read And Intended Change
Team glyphs are explicitly chosen in four Vue templates, not failing to load. Delegated/collaborator Team projections converge on shared transient renderers under Agent/Team roots and the task-Team branch under Org roots. Stable/configured Team renderers already use filled people-group. Task worker and Memory task-group markers repeat the bolt. Preserve their surrounding presentation and all data/interaction owners.

Replace **only** the four Team identity `heroicons:bolt-20-solid` literals with **`heroicons:user-group-20-solid`** and update the two now-incorrect bolt comments. Keep every class, wrapper, event, prop, aria attribute and `data-team-icon="temporary-task-team"` selector unchanged. That selector describes the row role, not its required shape. Memory's role-specific box/color/size remain intentional preserved behavior. No “old role uses old glyph” compatibility branch or flag.

## Task Size And Architectural Risk (Completed After Design)
- `task_size`: **Small**. A narrow symbol substitution in four existing render owners, focused colocated assertions and proportionate renderer proof. No new feature/control flow; tests/docs support the same delta.
- `architectural_risk`: **Low**. Existing icon interface/assets and role predicates absorb the change. No API/shared-type/schema/persistence/security/concurrency/lifecycle/deployment/ownership boundary changes. Complete relevant paths traced (A-001..009).
- Payload versus structure: changed payload is four icon strings/two comments plus tests/docs. Structural surfaces are existing renderers only, no new owner or contract. Task-document length is not implementation size.
- Escalate to Solution Designer if an affected supported Team cannot be corrected at these existing render branches, icon availability needs a new asset pipeline, shared types/backend change is needed, or preserving behavior conflicts with group identity. Reclassify before broadening implementation; renewed approval only if intended behavior changes.

## Architecture Investigation Evidence
| Evidence | Canonical source in investigation | Decision |
| --- | --- | --- |
| E-001..007 | Four-component audit, git history and established filled group usage | Glyph restoration, not renderer repair/global bolt replacement |
| A-001..003 | AgentRunCollaborationContext, Team selectors/history rows, Org projector and actual Vue callers | Role-independent group in existing Team branches; leave projections/selection alone |
| A-004/005 | Task worker consumers/props and Memory page/group tree | Same icon replacement at equivalent surfaces, preserve density/role treatments |
| A-006..008 | Iconify usage, existing tests/probes and their limits | Reuse existing Icon; focused regression + actual rendered glyph proof |
| A-009 | Current settings/execution docs describe bolt | Delivery sync; historical tickets immutable |
No material architecture unknown remains. Exact installed-app update timing remains unknown and is not needed for implementation.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent / scenario | Trigger and preserved result | Target path |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/003/005, AC-001/003/005, SCN-001 | Expand run tree and recognize/select Team; same hierarchy, focus, status and selection | DS-001/002/003 below, existing renderers produce filled group |
| BEH-002 | REQ-002/003/005, AC-002/003/005, SCN-002 | Open Task or Memory views; recognize Team without changing worker openability/member inspection | DS-004/005 below, existing Team markers produce filled group |
| BEH-003 | REQ-004, AC-004, SCN-003 | User reads when/why report; precise source chronology and limits | DS-006, no production code needed |
All scenarios remain Supported Normal Scenario; fixtures reproduce established paths, not new requirements.

## Supplemental Task Artifacts
- `evidence/source-history.txt` (same package): pinned commit metadata/diffs and audited lines, REQ-004/AC-004, evidence only.
- Incoming manager plan and supplied screenshot: absolute references in investigation; scope/defect evidence only.
- Read-only historical `tickets/done/nested-team-hierarchy-ui/requirements-doc.md`, `tickets/done/delegated-row-clean-style/requirements-doc.md`: previous rationale; superseded glyph intent only. Do not modify Product/archived artifacts.

## Task Design Health Assessment
- Posture: **Behavior Change / narrow UI correction**. Prior role-specific bolt was deliberate; current approval replaces that policy.
- Root cause: **Missing Invariant** relative to newly approved role-independent Team identity, not a failed icon renderer. Existing owners/interfaces and placement remain sound.
- Refactor: **No refactor needed**. Four literal presentation choices are not duplicated lifecycle, routing or validation coordination. A shared icon registry/component merely to replace these literals would add empty indirection and broaden scope. Reuse Icon directly; tests enforce the invariant at the consumers.
- Structural triggers considered: repeated coordination (absent; no new decision/state), boundary bypass (absent; existing stores/projections/props preserved), shared structure (unchanged), persistence (not affected), legacy (remove old glyph assertions/comments, no fallback). No deferred necessary refactor.
- Residual risk: future display surfaces can diverge; focused tests cover present supported surfaces without promising an icon-system redesign.

## Terminology
Team identity = glyph communicating entity kind, not delegation/collaboration role. A `temporary-task-team` data attribute remains a role/test selector; it does not require a bolt. Filled people-group here is the established 20-solid glyph, rendered at existing per-surface CSS dimensions.

## Legacy Removal And Persisted Data
- Policy: no backward compatibility; remove replaced Team bolt literals and outdated assertions/comments in this change. No flag or alternate old glyph path. No whole file/helper is obsolete.
- Persisted-data decision: **Not Affected**. No data/serialization model, reader or writer change; Vue presentation consumes identical rows. Migration/startup gate/backup plan: N/A. Never scan or rewrite user history for this task.

## Data-Flow Spine Inventory, Primary Spines And Narratives
| ID / scope | Chain (trigger through meaningful outcome) | Governing owners / narrative |
| --- | --- | --- |
| DS-001 Primary, BEH-001 | Expand Agent run -> WorkspaceHistoryWorkspaceSection/AgentRunTaskRows -> agentRunCollaborationStore -> AgentRunCollaborationContext.listTaskRows (collaborator + task nodes) -> WorkspaceTransientExecutionRow -> group glyph beside Team name | Collaboration context owns execution identity; store owns availability/selection; row owns glyph. Pointer/keyboard selection still opens coordinator/root through existing callbacks. |
| DS-002 Primary, BEH-001 | Expand Team run -> context.view navigation (with collaborator executions) -> buildRunHistoryTeamExecutionRows -> WorkspaceHistoryWorkspaceSection/WorkspaceTeamExecutionTree -> stable/transient row -> group glyph | Execution view owns live identity/status; history projector owns sidebar row shape; tree owns disclosure filtering; row owns icon. Stable row unchanged. |
| DS-003 Primary, BEH-001 | Expand Org run -> history section/collection -> projectAgentOrgHistoryRows (configured + collaborator/task trees) -> configured/task Team template -> group glyph | Org view/history remains data authority; collection owns local render and invokes state/actions for selection/disclosure. Only task-Team glyph changes. |
| DS-004 Primary, BEH-002 | Open Project/Temp Task board/detail -> Task data -> ProjectTaskRow or TaskRootSection -> ProjectTaskWorkers/presentTaskRoot -> group glyph and existing openability/status | Task data owns root binding; presentation utility owns worker state; component owns glyph; useTaskRootNavigation owns worker opening. |
| DS-005 Primary, BEH-002 | Open Memory Team/Org detail -> memoryExplorerStore -> pages/memory.vue -> CollaborationMemoryDetail/buildCollaborationMemberBlocks -> group headers/member buttons | Store/page own reads/actions; pure grouping owns teamRunId grouping; component owns group glyph and emits inspect intent. |
| DS-006 Primary, BEH-003 | User requests explanation -> pinned git metadata/diffs + historical intent -> investigation E-002..005 -> final handoff explanation | Solution Designer owns factual report; Delivery includes its durable references without claiming installed timing. |

### Return/Event Spines, Main-Line Owners And Off-Spine Concerns
Existing UI callbacks (row select/toggle -> parent/store/action -> updated selection/expansion) and streamed row publication remain unchanged; no new async event spine. No new bounded loop/state machine. Iconify is the glyph renderer; StatusDot, avatar, hierarchy branches, translation and task presentation helpers keep their current concerns off the changed glyph choice. Do not move these into a new identity owner.

### Ownership Boundaries, Encapsulation, Dependencies And Interfaces
Use existing row props and action/event interfaces: transient rows identify memberKind plus exact team/agent run IDs and memberAddress; TaskRootView has kind/hostRoot/teamRunId/ingressAgentRunId; Memory groups identify teamRunId/kind. Singular and explicit for this delta; no correction needed. Templates may consume their current public component/store interfaces and Icon; no direct server/persistence reads or new internals bypass. Existing projection/navigation boundaries remain authoritative. New facade, API or generic selector: N/A.

## Subsystem Reuse, File Responsibilities And Folder Mapping
Reuse existing Workspace History, Projects and Memory presentation owners. Draft and final responsibilities are identical after review: glyph rendering belongs in its current component; no reusable DTO/normalizer/schema is introduced and no shared-structure tightening is needed. Existing feature folders plus colocated tests are clear; splitting more would be artificial.

All paths below relative to `autobyteus-web/`:
| Change | Path | Responsibility/delta |
| --- | --- | --- |
| Modify | components/workspace/history/WorkspaceTransientExecutionRow.vue | Agent/Team-root Team glyph and comment only; preserve wrapper h-4/w-4/slate and all row code |
| Modify | components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue | Org task/collaborator Team glyph and comment only; preserve mr-1.5/h-4/w-4/slate and configured branch |
| Modify | components/projects/ProjectTaskWorkers.vue | Team glyph only; compact 14px/detail 16px inner icon, wrapper dimensions, all worker behavior unchanged |
| Modify | components/memory/CollaborationMemoryDetail.vue | TASK_TEAM inner glyph only; 12px inner/16px boxed wrapper, labels and else group icon unchanged |
| Modify | components/workspace/history/__tests__/WorkspaceTransientExecutionRow.spec.ts | Replace old bolt expectation; same group for relevant transient Team inputs, retain class/status/keyboard tests |
| Modify | components/workspace/history/__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts | Replace bolt/absent-group expectations; assert delegated/collaborator vs configured Team equality, keep disclosures/selection |
| Modify | components/projects/__tests__/ProjectTaskWorkers.spec.ts | Team glyph for both densities and relevant worker states; Agent/status/error/chevron preservation |
| Modify | components/memory/__tests__/CollaborationMemoryDetail.spec.ts | Group glyph for configured/task/nested Team headers, retain grouping/member actions |
| Reuse/extend as needed | components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts and tests/e2e/ relevant probes/fixtures | Stable/header identity preservation and rendered glyph/interaction proof. Implementation/API owner picks smallest durable coverage extension; no production fixture route left installed. |
| Delivery-owned docs sync | docs/agent_execution_architecture.md; docs/settings.md | Replace current bolt description with role-independent group wording, preserve other style statements |
| Add/maintain | this ticket's owned evidence/reports | History explanation, durable validation commands/results/screenshots/limits |

Add production files: none. Rename/Move/Remove production files: none. Applied pattern: existing Vue presentational branches only. New layers/registry/component: N/A. Main domain names remain Team/Agent/Org; no naming drift.

## Concrete Shape And Compatibility Rejection
Good: `<Icon icon="heroicons:user-group-20-solid" class="h-4 w-4" />` in the existing Team branch. Do not select group versus bolt from a role, task state, feature flag or prior saved-data version. Do not globally replace `heroicons:bolt` in model Fast/service-tier capabilities. Existing Memory wrapper branches may remain because they own preserved role styling, not alternate identity.

## Change Sequence / Validation Guidance
1. Record/retain approved package; make four surgical replacements and two comments. Preserve unrelated/concurrent changes; no refactor.
2. Update/add focused colocated glyph assertions while keeping behavioral regressions. Use current R1 AC references for changed symbol expectations; historical ticket remains intact.
3. Implementation self-check: `pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/WorkspaceTransientExecutionRow.spec.ts components/workspace/history/__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/projects/__tests__/ProjectTaskWorkers.spec.ts components/memory/__tests__/CollaborationMemoryDetail.spec.ts --run`. Install/prepare only worktree-owned dependencies/outputs as needed. Never count skipped/unrun cases as passing.
4. Render changed components in an owned Nuxt/Chrome browser probe per TESTING.md. Cover Agent/Team/Org Team identity, collaborator plus delegated inputs, stable/configured preservation, compact/detail Task worker and Memory configured/task/nested groups. Existing hierarchy/disclosure probes are useful, but marker count or mocked Icon string alone is insufficient: verify actual SVG group rendering/resolved shape, no Team bolt, geometry, selection/expansion and focus behavior. Inspect screenshots; retain DOM/assertion results and exact source revision/working diff. At least normal and constrained-width evidence; no mobile product claim.
5. API/E2E owns durable executable validation and coverage sufficiency; document mocked data/network boundaries truthfully. Renderer-only scope does not require a real model or packaged Electron run. If claiming full product/desktop delivery, a newly built isolated app and separate applicable authorization/gates are required. Never use installed user app or data.
6. Delivery synchronizes current docs, integrates against refreshed origin/personal with concurrent Archive all changes preserved, reruns affected checks as needed, obtains explicit user verification and completes allowed repository finalization. No release/installed-app alteration from AP-001.
7. Handoff includes source chronology (August 30 introduction, October 6 bare restyle/Org substitution; September 25 Memory, October 7 Task marker), changed files, command/results, evidence/cleanup paths, limitations and remaining delivery/user actions.

## Tradeoffs And Risks
Small local replacements preserve all existing per-surface sizes and color/role treatments rather than enforcing a new icon system. Test inputs must exercise collaborator paths because both roles share technical task-Team projections. Icon stubs can prove selected identifier but not loaded shape; real rendering closes that gap. Concurrent Archive all work may touch collection/history tests: merge minimal hunks, never overwrite files wholesale. No new performance work/global scans/caches; glyph render cost remains bounded per row. No implementation or validation result claimed by this design.
