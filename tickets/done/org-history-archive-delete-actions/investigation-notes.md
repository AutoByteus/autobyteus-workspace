# Investigation Notes — Stopped AgentOrg History Archive/Delete

## Investigation Meta

- Package identifier: `ORG-HISTORY-ARCHIVE-DELETE-20260921-001`
- Request / ticket: `org-history-archive-delete-actions`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions` / `codex/org-history-archive-delete-actions`
- Resolved base remote / branch / revision: `origin/personal` / `personal` / `8db5101f413a88216b90d55ec563e3b5f80b1c9b`
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Fresh `origin/personal` fetched; local/remote revision identity verified; isolated worktree/branch created. The shared `personal` checkout's unrelated modified/untracked files were not touched.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Investigation status: Requirements approved in `SR-001`; architecture investigation and design complete in `SR-002`.

## Initial Request And Clarifications

- Original request: “for the stopped agent org, there is no archive or delete button … for stopped agent team, we have archive and delete button. please bootstrap a ticket to fix it from the origin/personal branch”.
- Clarifications: Two screenshots show the AgentOrg gap and Team comparator.
- Constraint: Base/finalize on `origin/personal`.
- Initial ambiguity: UI-only bug versus missing end-to-end capability.
- Resolution: Incomplete end-to-end feature. AgentOrg has persisted archive fields/filtering and an unused internal delete method, but no archive command and no GraphQL/web archive-delete path.
- Approval: On 2026-09-21 the user approved the bounded Team-parity baseline with: “basically, this functionality is similar to agent team, please now work on it”.

## Product And Domain Understanding

- Product area: Workspace left-panel history for top-level AgentOrg roots.
- “AgentOrg history” is a retained execution package, distinct from the AgentOrg definition.
- Mounted Teams inside an AgentOrg are not independent root lifecycle subjects.
- Archive means hide from default history without content deletion; Delete means permanent exact-run removal after confirmation.

## Source Log

| Date | Type | Exact Source | Finding |
| --- | --- | --- | --- |
| 2026-09-21 | User/Image | `ctx_eb5d81993043__image.png` | Stopped AgentOrg row has no archive/delete controls. |
| 2026-09-21 | User/Image | `ctx_95c5df976e09__image.png` | Stopped Team row shows Archive/Delete before relative time. |
| 2026-09-21 | Command | Fresh fetch/ls-remote/worktree add from `origin/personal` | Isolated base is `8db5101f4`; final target is `origin/personal`. |
| 2026-09-21 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | AgentOrg row renders Stop only when active; no stopped lifecycle actions. |
| 2026-09-21 | Code | `WorkspaceHistoryWorkspaceSection.vue` | Team row renders stopped-only archive/delete, isolates clicks, disables conflicts and follows hover/focus/narrow behavior. |
| 2026-09-21 | Code | `useWorkspaceHistoryMutations.ts`, `workspaceHistorySectionContracts.ts`, `WorkspaceAgentRunsTreePanel.vue` | Shared interaction contracts support Agent/Team only; no AgentOrg pending/confirmation/archive/delete. |
| 2026-09-21 | Code | `runHistoryMutationActions.ts`, `runHistoryStore.ts`, `runHistoryTypes.ts`, `runHistoryMutations.ts` | Client mutation/store path exists only for Agent and Team. |
| 2026-09-21 | Code | `agent-org-run-history-catalog-service.ts` | Internal `deleteStored(orgRunId)` exists but is unused; it removes the index then package with index compensation. No archive method exists. |
| 2026-09-21 | Code | `collaboration-root-history-service.ts` | Inactive AgentOrg rows with `archivedAt` are already excluded from default mixed history. |
| 2026-09-21 | Code | AgentOrg tree/index domain, schema and stores | Both current formats already contain `archivedAt`; no schema migration is required. |
| 2026-09-21 | Code | `agent-org-run-manager.ts`, `agent-org-run-service.ts`, `api/graphql/types/agent-org-run.ts` | Manager owns per-root transitions; history mutation has no public serialized boundary; API exposes no archive/delete. |
| 2026-09-21 | Code | Team catalog/service/resolver | Team Archive writes tree then index; Team Delete is permanent; active/conflicting roots are protected. |
| 2026-09-21 | Code | `agent-org-run-manager.ts` lifecycle methods and private `withTransition` | Create, restore, stopped-config mutation and terminate already serialize by exact `orgRunId`; exposing a narrow inactive-history operation through the manager is sufficient to prevent archive/delete racing those transitions. |
| 2026-09-21 | Code | `agent-org-run-execution-tree-store.ts`, `agent-org-run-history-index-store.ts`, `agent-memory-layout.ts` | Current stores validate the AgentOrg tree/index and atomic file writes; layout rejects unsafe identities. Bounded mutation compensation/readback can remain inside the catalog without a new persistence subsystem. |
| 2026-09-21 | Code | `agentOrgContextsStore.ts`, `useWorkspaceHistorySubjectActions.ts`, `WorkspaceAgentRunsTreePanel.vue` | Retained AgentOrg context has an exact `disconnect(orgRunId)`; router-aware history composition already owns AgentOrg route behavior, so successful removal can retire context and leave the exact selected route without moving navigation into Pinia. |
| 2026-09-21 | Code | `localization/messages/{en,zh-CN}/workspace.ts` and localization guards | Editable locale sources and established guard/audit paths can own AgentOrg-specific action, confirmation and feedback copy. |
| 2026-09-21 | Doc | `autobyteus-server-ts/docs/modules/run_history.md` | Canonical Archive/Delete meaning and current no-unarchive limitation. |
| 2026-09-21 | Historical design | `tickets/done/flat-agent-organization-model/design-spec.md` `DS-025` | Original architecture anticipated a typed subject browse/stop/archive/delete port, but current AgentOrg slice implemented browse/stop only. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Trigger | Current Path And Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| BEH-001 | Inspect stopped AgentOrg row | Mixed history -> AgentOrg parser/projector -> row with open/member controls, no Archive/Delete | Screenshot/component | High |
| BEH-002 | Read AgentOrg history | AgentOrg catalog/index/tree -> mixed list; inactive `archivedAt` rows filtered | Server source | High |
| BEH-003 | Attempt permanent AgentOrg history deletion | No supported UI/API trigger; internal catalog method only | Catalog/resolver/client absence | High |
| BEH-004 | Act on stopped Team comparator | Team row -> mutation composable -> store -> GraphQL -> Team owner | Team source | High |
| BEH-005 | Agent/Team mutation settles | Pending/confirmation -> server result -> exact cleanup -> quiet refresh -> toast | Web source | High |

## Relevant Codebase And Technical Facts

| Path / Owner | Current Responsibility | Implication |
| --- | --- | --- |
| `AgentOrgRunHistoryCatalogService` | AgentOrg history/index mutation and internal delete | Remains archive/delete persistence owner. |
| `AgentOrgRunManager` | Active registry and exact per-root transition lane | Must guard/serialize history mutation; an external `getActive` check alone can race. |
| `AgentOrgRunService` / `AgentOrgRunResolver` | Subject-explicit lifecycle/config/API boundary | Add explicit AgentOrg operations here; mixed read facade remains read-only. |
| `CollaborationRootHistoryService` | Read-only mixed Team/Org history list | Existing filter makes archive disappear after refresh. |
| `runHistoryMutationActions` / `runHistoryStore` | Client mutation and local history cleanup | Add exact AgentOrg operations and prune only target state. |
| `useWorkspaceHistoryMutations` | Pending, confirmation and toast policy | Extend shared policy without ambiguous IDs or a divergent modal. |
| `WorkspaceAgentRunsTreePanel` / subject actions | Action composition and AgentOrg route ownership | Successful selected-target removal must navigate away and retire context. |
| `WorkspaceAgentOrgHistoryCollection` | Root/member row rendering | Add stopped-only isolated controls while keeping whole-row disclosure/open. |

## Structural And Payload Surface Inventory

### Payload Surfaces

- AgentOrg V1 execution tree and history row `archivedAt`.
- Exact root package directory containing tree, messages, tasks, member traces/attachments.
- GraphQL success/message payloads.
- English and Simplified Chinese UI text.

### Structural Surfaces

- Manager per-root transition; catalog queue/index/package; run service/resolver.
- Apollo mutation documents/types; Pinia mutation actions/store.
- Shared mutation composable and confirmation; history contracts/panel/row.
- AgentOrg exact context and route cleanup.

### Structural Impact

- API change: Present, two explicit AgentOrg mutations.
- Persistence schema change: Absent; existing fields are sufficient.
- Security/privacy: Bounded destructive exact-path operation.
- Concurrency/lifecycle: Present; coordinate with manager transition.
- Migration/deployment: Absent.

## Runtime, Probe, Or Reproduction Findings

| Method | Observation | Implication |
| --- | --- | --- |
| User's actual Electron screenshots | Released UI visibly differs between stopped AgentOrg and Team. | Current-behavior proof is sufficient without mutating user history. |
| Static production-path trace | AgentOrg delete is unreachable; archive command is absent. | Not a CSS-only bug. |

No live archive/delete was attempted because it would mutate retained user data and the source plus screenshots already prove the gap.

## Persisted Data And State Facts

- Subject: one exact `memory/agent_orgs/<orgRunId>/...` package and its `memory/agent_org_run_history_index.json` row.
- Readers/writers: AgentOrg manager/persistence/tree/sidecar stores, history catalog/index, mixed list and retained inspection/projection owners.
- Archive preservation: all target content; only tree/index archive projections change.
- Delete loss: exact target package/index only after confirmation.
- Must preserve: all definitions, workspace registry, other roots, external/provider state.
- Migration decision input: Existing data is directly usable; no migration.

## Product Design Request Context

- Product Design request: `Not stated`.
- Comparator: Existing production Agent Team row and modal/toast conventions.
- Prototype: N/A; no new experience exploration needed.
- Required states: active, stopped eligible, pending, delete confirm/cancel, success, failure.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_eb5d81993043__image.png` | User | AgentOrg gap | UI | Read-only, proposed SR-001 evidence |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_95c5df976e09__image.png` | User | Team comparator | UI/policy | Read-only, proposed SR-001 evidence |
| `tickets/done/flat-agent-organization-model/design-spec.md` `DS-025` | Historical AORG ticket | Earlier typed action-port intent | Architecture context | Historical only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Status |
| --- | --- | --- | --- |
| ASM-001 | Assumption | Team parity includes current non-destructive archive, confirmed permanent delete, stopped-only eligibility and no unarchive UI. | Confirmed by the user's explicit approval of `SR-001`. |
| RISK-001 | Risk | Existing unused delete does not share the manager transition lane. | Design must add a narrow owner-controlled inactive-history mutation boundary. |
| RISK-002 | Risk | Copying a third set of loosely related confirmation IDs can fragment UI policy. | Design a tight subject-discriminated target or justify a smaller extension. |
| RISK-003 | Risk | Pruning only the list can leave selected AgentOrg route/center stale. | Design exact context retirement and route navigation on success. |

## Architecture Investigation Findings

- No generic history schema or new subsystem is needed.
- Extend the AgentOrg catalog rather than the read-only mixed history facade.
- Use the manager's exact-root transition ownership; do not rely only on a pre-check.
- Use subject-explicit GraphQL names and `orgRunId`, never a mixed generic ID guess.
- Keep persistence mutation in the store/service owner and route effects in a router-aware owner.
- Existing formats are directly usable; no migration.
- The change must not expose the catalog directly to GraphQL: `AgentOrgRunService` remains the subject lifecycle boundary, while `AgentOrgRunHistoryCatalogService` owns storage mutation behind it.
- One subject-discriminated pending-delete target in the shared web composable is tighter than adding a third mutually exclusive identifier; per-subject pending maps remain appropriate for rendering.
- Archive needs a bounded tree/index compensation rule, and Delete needs verified index restoration if package removal fails, so ordinary failure cannot be presented as completed mutation.

## Requirement Implications

- The gap is end-to-end, so acceptance covers persistence, lifecycle/API, client cleanup and UI—not just icons.
- Team is the behavioral comparator, but AgentOrg remains the authoritative root.
- Archive and Delete require separate data-continuity acceptance.
- Server-side eligibility is mandatory despite hidden active-row controls.

## Notes For Architecture Design

- Map `SCN-001` and `SCN-002` through row -> client mutation -> explicit API -> manager/catalog -> tree/index/package -> refresh/context/route.
- Preserve `SCN-003` by serializing exact-root lifecycle eligibility.
- Keep `CollaborationRootHistoryService` read-only.
- Reuse V1 `archivedAt`; no migration/alternate state.
- Test Team/Agent paths as adjacent regressions.
- Completed size/risk: Medium/High because this spans destructive backend lifecycle/persistence/API and frontend state/UI while remaining inside existing AgentOrg and history ownership.
