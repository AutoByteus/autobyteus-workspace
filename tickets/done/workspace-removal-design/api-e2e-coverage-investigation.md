# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review Round 2 passed; API/E2E coverage investigation and execution requested.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a non-destructive `Remove from Workspaces` feature. Top-level desktop Workspaces rows must be registry-backed real filesystem workspaces, not history-created rows. Removing a workspace deletes only the persisted registry entry, closes active workspace/file-explorer state, clears related frontend history/selection/expansion state, and preserves filesystem contents, run/team history, memory, and artifacts. Removal must be row-specific, confirmed, accessible, not toggle expansion as a side effect, block active standalone/team work using canonical root comparison, remain absent after refresh/reload/restart, and allow re-add/load of the same root to restore visibility and preserved history access. Workspace history is subordinate to registered workspace rows and loads via `workspaceRunHistory(workspaceId)` when a row is expanded. Scoped workspace-history fetches intentionally must not perform global active-run reconciliation.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism was introduced, no old behavior was retained in scope, `workspace-id-mapping-store.ts` was removed, no hidden-root suppression list was added, and desktop mount-time global `fetchTree()` was removed from the Workspaces panel. Code review independently rechecked the legacy reference scan and passed.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Registry-backed `workspaces()` visible catalog | Changed | REQ-006, REQ-011, AC-005, AC-010; design DS-001; handoff backend summary | API/E2E must prove created registry entries list through `workspaces()` and removed entries no longer list. |
| `removeWorkspace(input: { workspaceId })` mutation | Added | REQ-004 through REQ-010; design DS-003; handoff key files | Add API durable coverage for success, non-destructive file/history preservation, visible removal, and failure/active-block behavior. |
| `workspaceRunHistory(workspaceId)` scoped query | Added | REQ-011, AC-008, AC-010; design DS-002 | Add API durable coverage for registered workspace resolution, scoped service call, and rejection after removal/unregistered IDs. |
| History-created top-level desktop workspace rows | Removed | Legacy Removal Policy and AC-010 | Existing projection coverage is valid; final execution must run it. No stale coverage requiring removal found. |
| Desktop Workspaces mount-time global history fetch | Removed | Design decommission plan; handoff legacy check | Existing component coverage is valid; add/execute checks that expansion uses scoped history and background refresh remains scoped. |
| Active-use blocking | Added | REQ-009, AC-007; design `WorkspaceRemovalGuard`; handoff active-use blocking note | Existing guard unit coverage is valid for canonical standalone/team/member roots; add API mutation evidence for row-preserving failure behavior. |
| Frontend row-level remove affordance and confirmation | Added | REQ-001 through REQ-005, AC-001 through AC-004, AC-009 | Add component durable coverage for remove button, no expansion side effect, cancel, success, and failure toasts/state. |
| Frontend cleanup after successful removal | Added/Changed | REQ-007, AC-006; handoff cleanup note; code review CR-002 | Existing store coverage validates selection pruning; add store/component durable coverage for file explorer cleanup and expansion pruning. |
| Scoped history fetch active-run behavior | Changed | Code review CR-001 resolution | Existing store regression coverage is valid; final execution must run it and observe no cross-workspace active-context reconciliation from scoped fetch. |
| Re-add same root restores visibility/history access | Preserved/Changed | REQ-010, AC-008; design DS-005 | Add API and/or service coverage to prove remove/re-add same root and scoped history access for registered workspace. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` create/list and metadata scenarios | GraphQL `createWorkspace`, `workspaces`, temp workspace, metadata resolution | DS-001, DS-005; REQ-006, REQ-010 | Needs Update | The file is the right API boundary but currently lacks `removeWorkspace`, active-blocking, and re-add checks; setup should also clean registry entries under test roots. | Add focused remove/re-add/active-block API scenarios and cleanup isolation. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | GraphQL global `listWorkspaceRunHistory` shape and removed legacy flat fields | Global/mobile recent path, schema compatibility cleanup | Needs Update | Still valid for global recent boundary, but does not cover new `workspaceRunHistory(workspaceId)`. | Add scoped query registered/unregistered scenarios. |
| `autobyteus-server-ts/tests/unit/run-history/services/workspace-run-history-service.test.ts` | Workspace grouped history aggregation | DS-002 service owner | Needs Update | Existing tests cover global grouping, but not new scoped `getWorkspaceRunHistory`. | Add scoped filter/empty group coverage. |
| `autobyteus-server-ts/tests/unit/workspaces/workspace-manager.test.ts` | Manager create/reuse/restart lookup/remove preserving files | DS-001, DS-003, DS-005; AC-005, AC-008 | Still Valid | Contains remove preserving files and registry deletion; restart lookup behavior around registry is relevant. | Execute in final backend suite. |
| `autobyteus-server-ts/tests/unit/workspaces/workspace-removal-guard.test.ts` | Active standalone and nested team member blockers with canonical root comparison; allows other workspaces | REQ-009, AC-007 | Still Valid | Directly maps to active-use blocking and canonical comparison. | Execute in final backend suite. |
| `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` | Registered descriptors are the only top-level source; history/draft-only removed roots ignored | REQ-011, AC-010; Legacy Removal Policy | Still Valid | Directly proves no history-created desktop top-level rows. | Execute in final frontend suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Mount behavior, expansion/collapse, row actions, create flow, interval refresh, run/team actions | AC-001 through AC-007, DS-002/DS-003 UI | Needs Update | Existing tests prove no eager `fetchTree` and expanded refresh path, but lack workspace removal confirmation/cancel/success/failure and explicit scoped expansion fetch assertion. | Add focused component scenarios. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Historical regressions for team focus/draft removal | UI regression boundaries | Still Valid | Not directly about workspace removal but remains valid adjacent coverage. | Execute with focused frontend suite. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Expansion/reveal state behavior | AC-006, DS-004 | Needs Update | It validates selected reveal but does not directly prove `pruneWorkspace` removes expansion state after workspace removal. | Add prune expansion scenario. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` scoped fetch and prune scenarios | Scoped workspace-history fetch avoids unrelated active reconciliation; prune clears global agent/team selection | CR-001, CR-002; REQ-007, AC-006 | Still Valid | Code review re-ran and passed; directly covers prior findings. | Execute in final frontend suite. |
| `autobyteus-web/stores/__tests__/workspaceStore.spec.ts` | Workspace metadata and file-explorer live-session state | REQ-007, AC-006 | Needs Update | Existing file-explorer live-session coverage is relevant but lacks `removeWorkspace` GraphQL success/failure cleanup. | Add store removal cleanup/failure scenarios. |
| Legacy reference scan `rg "workspace-id-mapping-store|WorkspaceIdMappingStore|saveWorkspaceIdMapping" ...` | No obsolete mapping-store references | No-legacy policy | Still Valid | Code review passed; must rerun as executable no-legacy evidence. | Execute after coverage edits. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No relevant stale/obsolete durable coverage found during investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | `removeWorkspace` removes registry visibility, preserves files, stays absent after list refresh, and re-adds same root with same ID | REQ-006, REQ-010, AC-005, AC-008, DS-003/DS-005 | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | This is the primary GraphQL boundary for the customer-visible persistence behavior. |
| API-002 | `removeWorkspace` blocks active standalone runs and leaves the workspace listed | REQ-009, AC-007, active-use blocking design | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Complements guard unit coverage with mutation-level failure/result evidence. |
| API-003 | `workspaceRunHistory(workspaceId)` resolves registered workspace root, calls scoped history service, and rejects missing/unregistered workspace IDs | REQ-011, AC-008, AC-010, DS-002 | `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | New GraphQL query currently lacks API boundary coverage. |
| API-004 | `WorkspaceRunHistoryService.getWorkspaceRunHistory` filters to one canonical root and returns an empty group for registered roots without history | DS-002 | `autobyteus-server-ts/tests/unit/run-history/services/workspace-run-history-service.test.ts` | Ensures the resolver's scoped service call is not only shape-mocked. |
| FE-001 | Workspace row remove action opens confirmation without toggling expansion; cancel has no side effect | REQ-001 through REQ-004, AC-001 through AC-004, AC-009 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Durable UI behavior not currently covered. |
| FE-002 | Successful workspace removal calls store removal, prunes history and expansion, and shows success | REQ-006, REQ-007, AC-005, AC-006 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Verifies the frontend return-event cleanup path. |
| FE-003 | Failed/blocked workspace removal leaves row visible and shows actionable error | REQ-008, REQ-009, AC-007 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Covers failure UX and row preservation. |
| FE-004 | Expanding a workspace calls `fetchWorkspaceHistory(workspaceId)` and renders loading/error/empty states | REQ-011, DS-002 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Makes scoped expansion behavior explicit beyond no-eager-fetch coverage. |
| FE-005 | `workspaceStore.removeWorkspace` clears metadata, file explorer state, live stream/session state on success and preserves state on failure | REQ-007, AC-006, AC-007 | `autobyteus-web/stores/__tests__/workspaceStore.spec.ts` | Direct store-level cleanup coverage is missing. |
| FE-006 | `useWorkspaceHistoryTreeState.pruneWorkspace` clears workspace/child expansion state | REQ-007, AC-006 | `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Completes expansion cleanup proof. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001/API-002 | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` setup/cleanup | Clean registry entries for per-test temp roots and include new mutation scenarios | DS-001/DS-003 | Prevents test registry pollution while exercising new removal API. |
| API-003 | `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` service mock | Extend mock to include `getWorkspaceRunHistory` and mocked workspace manager lookup | DS-002 | Existing list query tests remain valid. |
| FE-005 | `autobyteus-web/stores/__tests__/workspaceStore.spec.ts` mutation mock | Include `RemoveWorkspace` in mocked workspace mutations | DS-003 frontend store boundary | Existing create tests remain valid. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage identified. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-001 | Static source/grep checks for obsolete mapping store and hidden-root suppression references | No legacy/compatibility workspace visibility fallback remains | A grep is execution evidence, not a repository-resident test. |
| TMP-002 | Focused command execution of backend GraphQL/unit suites and frontend component/store suites | Validates durable coverage in realistic local Vitest execution | The commands are evidence; the tests themselves are durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full packaged Electron/browser app restart smoke | Existing repo has component/API tests and no ready packaged app/runtime started for this task stage; delivery owns later integrated refresh. API tests will exercise persisted registry semantics through GraphQL and manager/service boundaries. | Medium: true packaged restart timing/watcher behavior is not fully exercised. | Record as not tested; no escalation because durable API/store coverage exercises the behavior and no implementation defect is indicated. |
| Physical deletion of run history/memory/artifacts | Out of scope and explicitly forbidden; coverage will verify file preservation and history access rather than destructive deletion. | Low | None. |
| Active team/member blocking through GraphQL mutation | Existing guard unit coverage directly covers nested team/member canonical comparison. API mutation coverage will cover standalone active blocking; running both validates the policy and boundary. | Low-to-medium | If API standalone or guard unit fails, classify based on failure. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or compatibility wrapper discovered during investigation. | N/A |

## Execution Plan

1. Add/update the durable coverage listed above in the focused backend and frontend test files.
2. Run backend API/unit coverage: workspace GraphQL e2e, workspace run-history GraphQL e2e, workspace manager/removal guard/service unit tests.
3. Run frontend coverage: workspace panel specs, tree-state spec, workspace store spec, run-history store spec, projection spec.
4. Run no-legacy static scan and `git diff --check`.
5. Record final execution evidence in the canonical API/E2E execution coverage report.
6. Because repository-resident durable coverage will be added/updated after code review, return the cumulative package to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing tests are valid but insufficient for the new API/UI removal boundaries. Coverage edits are narrow, boundary-local, and tied directly to the approved workspace-removal behavior.
