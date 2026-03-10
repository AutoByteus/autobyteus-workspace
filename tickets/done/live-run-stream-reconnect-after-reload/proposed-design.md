# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Added background active-run recovery design, non-selecting hydrate/connect paths, and team stream context reattach behavior. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/live-run-stream-reconnect-after-reload/investigation-notes.md`
- Requirements: `tickets/in-progress/live-run-stream-reconnect-after-reload/requirements.md`
- Requirements Status: `Refined`

## Summary

Add a history-driven active-run recovery coordinator that runs after run-history fetches and restores live frontend state for all active single-agent runs and all active team runs. Recovery hydrates missing active contexts without selecting them, reconnects their WebSocket streams, and leaves inactive history rows on projection-only behavior. Team streaming also gains explicit context reattachment so an existing live `TeamStreamingService` never keeps mutating a detached team object after the store swaps in a new context.

## Goals

- Restore live frontend state for all backend-active runs after reload.
- Keep selection as a rendering concern, not a stream-subscription concern.
- Preserve center-pane conversation continuity and right-side activity continuity for selected recovered runs.
- Avoid regressions for inactive history open paths.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not preserve any selected-only recovery assumption as the primary model for active runs.
- Gate rule: design is invalid if it adds compatibility wrappers that keep “active runs only reconnect on explicit open/send” as a retained parallel behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Restore live subscriptions for all backend-active runs. | AC-001, AC-002 | Active agent/team runs reconnect after reload without send. | UC-001, UC-002 |
| R-002 | Active single-agent runs reconnect into frontend state after reload. | AC-001 | Active agents reconnect automatically. | UC-001 |
| R-003 | Active team runs reconnect into frontend state after reload. | AC-002 | Active teams reconnect automatically. | UC-002 |
| R-004 | Focused center monitor must bind to the same live-updating context that receives new segments. | AC-003, AC-004 | Selected recovered runs show current live output. | UC-003 |
| R-005 | Right activity and center monitor stay aligned after recovery. | AC-004 | Team/member activity and conversation remain on the same live object. | UC-003 |
| R-006 | Rehydrating/refocusing an active team preserves/restores focused-member context. | AC-004 | Focus stays on the intended live member. | UC-002, UC-003 |
| R-007 | Recovery must not depend on manual reopen. | AC-001, AC-002 | Background recovery restores active runs up front. | UC-001, UC-002 |
| R-008 | Inactive historical runs remain non-streaming. | AC-005 | Inactive reopen stays projection-only. | UC-004 |
| R-009 | Retention may be bounded while live updates continue. | AC-007 | No requirement to render infinite history. | UC-001, UC-002, UC-003 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | History data loads in `WorkspaceAgentRunsTreePanel.vue:onMounted -> runHistoryStore.fetchTree()`. Single-agent explicit open goes through `runOpenCoordinator`; team explicit open is inline in `runHistorySelectionActions`. | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `stores/runHistoryStore.ts`, `services/runOpen/runOpenCoordinator.ts`, `stores/runHistorySelectionActions.ts` | None blocking. |
| Current Naming Conventions | Orchestration helpers live under `services/*Coordinator.ts`; stores own UI-facing lifecycle actions; context stores own in-memory run objects. | `services/runOpen/runOpenCoordinator.ts`, `stores/agentRunStore.ts`, `stores/agentTeamContextsStore.ts` | None. |
| Impacted Modules / Responsibilities | `runHistoryStore` owns history fetch timing; `agentRunStore` / `agentTeamRunStore` own stream lifecycle; `agentContextsStore` / `agentTeamContextsStore` own live state identity. | Investigation notes sections 1-5 | None blocking. |
| Data / Persistence / External IO | Recovery needs GraphQL run/team resume + projection queries and WebSocket reconnect via existing streaming stores. | `graphql/queries/runHistoryQueries`, `runOpenCoordinator.ts`, `runHistorySelectionActions.ts`, `agentTeamRunStore.ts` | Background recovery may increase fetch volume for many active runs, but active counts are expected to be limited. |

## Current State (As-Is)

- `fetchTree()` loads history rows but does not restore active runtime contexts.
- Single-agent explicit reopen has a keep-live-context policy.
- Team explicit reopen always rebuilds a projection context and inserts it into `agentTeamContextsStore`.
- Team streaming services hold a direct reference to one team context object and do not currently support reattaching that reference.

## Target State (To-Be)

- Every `fetchTree()` pass reconciles active history rows into active frontend contexts.
- Active agent recovery uses a non-selecting version of the existing single-agent run-open coordinator.
- Active team recovery uses a new non-selecting team run-open coordinator that hydrates a team context and reconnects the team stream.
- Selection only switches which already-live context is rendered.
- Team streaming services can reattach to a replacement team context when recovery or explicit open rebuilds a context object for the same team run.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: recovery orchestration belongs in service/store orchestration boundaries, not in components.
- SoC cause statement: history fetch decides what is active, coordinators decide how to hydrate/recover, run stores manage WebSocket lifecycles, and context stores own live object identity.
- Layering result statement: UI -> history store -> recovery/open coordinators -> run/team stores + context stores -> GraphQL/WebSocket boundaries.
- Decoupling rule statement: components do not own recovery logic; recovery coordinators call existing store contracts rather than reaching into WebSocket clients directly.
- Module/file placement rule statement: non-UI recovery orchestration lives in `services/runRecovery` / `services/runOpen`; state identity updates remain in stores.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` a background active-run recovery orchestration layer and `Add` a dedicated team run-open coordinator.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): a coordinator layer keeps history reconciliation policy out of view components and avoids duplicating hydrate/connect logic across fetch and explicit open paths.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Active-run hydrate/connect policy is needed in both history fetch recovery and explicit open paths. | Extract orchestration boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `runHistorySelectionActions.ts` currently owns team resume fetch, projection hydration, context creation, selection, and connect orchestration inline. | Split + lift coordination |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | Recovery coordinator decides which active runs need hydrate/reconnect and when to skip already-live contexts. | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | Without extraction, `runHistoryStore` and selection actions would duplicate hydrate/connect policy. | Change |

## Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Recover only the selected run after reload. | Smallest short-term change. | Violates clarified requirement; leaves other active runs stale. | Rejected | Product model is “running means live,” not “selected means live.” |
| B | Recover all active runs in background after each history fetch. | Matches requirement; keeps selection view-only; pre-warms contexts before user clicks. | Adds orchestration and more hydrate IO for active runs. | Chosen | Best fit for product requirement and avoids stale-on-click behavior. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` | Centralize active history reconciliation into live contexts. | history fetch, agent/team recovery | New orchestration boundary. |
| C-002 | Add | N/A | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Give team hydrate/open a reusable coordinator like single-agent open. | team history open, recovery | Removes inline team hydrate duplication. |
| C-003 | Modify | `autobyteus-web/services/runOpen/runOpenCoordinator.ts` | same | Support non-selecting/background active agent recovery. | active agent recovery | Reuse existing single-agent policy. |
| C-004 | Modify | `autobyteus-web/stores/runHistoryStore.ts` | same | Invoke active-run recovery after history fetch. | startup recovery, polling refresh | History remains the recovery trigger. |
| C-005 | Modify | `autobyteus-web/stores/runHistorySelectionActions.ts` | same | Delegate explicit team open to the new team coordinator. | explicit team selection | Keeps one team hydrate path. |
| C-006 | Modify | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | same | Allow reattaching the live service to a replacement team context. | team stream identity continuity | Prevent detached-context updates. |
| C-007 | Modify | `autobyteus-web/stores/agentTeamRunStore.ts` | same | Update `connectToTeamStream` to reattach existing services to the current context before return/reconnect. | team reconnect | Complements C-006. |
| C-008 | Modify | `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | same | Add active agent/team recovery regression coverage. | unit verification | No component-level ownership changes. |
| C-009 | Modify | `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` / `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | same | Add context-reattach and reconnect regressions. | unit verification | Covers stale-context split risk. |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Active run recovery orchestration | N/A | `services/runRecovery/activeRunRecoveryCoordinator.ts` | Frontend runtime recovery orchestration | Yes | Keep | Service layer is the right owner for cross-store recovery policy. |
| Team run hydrate/open orchestration | inline in `stores/runHistorySelectionActions.ts` | `services/runOpen/teamRunOpenCoordinator.ts` | Team history open/recovery orchestration | Yes | Split | Aligns with existing single-agent `runOpenCoordinator`. |
| History fetch timing | `stores/runHistoryStore.ts` | same | History query + fetch trigger | Yes | Keep | Store should trigger recovery after data refresh. |
| Team stream client identity | `services/agentStreaming/TeamStreamingService.ts` | same | WebSocket stream binding to team context | Yes | Keep | Object reference ownership belongs in streaming client. |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel` | Trigger startup/polling history fetch only | view lifecycle | recovery policy | No new view logic. |
| `runHistoryStore` | Fetch history and trigger active-run reconciliation | history data + fetch cadence | direct WebSocket client manipulation | Calls coordinators. |
| `activeRunRecoveryCoordinator` | Determine active runs requiring recovery and invoke hydrate/connect coordinators | active-run reconciliation policy | selection UI state | Runs after fetches. |
| `runOpenCoordinator` / `teamRunOpenCoordinator` | Hydrate active or historical contexts from history queries | per-run/team projection+resume orchestration | panel rendering logic | Agent version reused with background mode; team version new. |
| `agentRunStore` / `agentTeamRunStore` | Stream lifecycle actions | connect/reconnect/disconnect | history list ownership | Existing owner remains. |
| Context stores | In-memory live object identity | context objects | IO/requery policy | Team store may still use replace semantics if stream reattaches correctly. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep selected-only reopen recovery and add background recovery as optional secondary path | Minimal code churn | Rejected | Active-run recovery becomes the only correctness model; selection just renders recovered state. |
| Preserve inline team hydrate logic and add a second background-only team hydrate path | Faster local patch | Rejected | Move team hydrate/orchestration into one reusable coordinator. |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `services/runRecovery/activeRunRecoveryCoordinator.ts` | Add | orchestration | Active history -> background recovery policy | `recoverActiveRunsFromHistory(...)` | history groups/team runs -> hydrated live contexts | history types, run/team open coordinators, context stores |
| `services/runOpen/teamRunOpenCoordinator.ts` | Add | orchestration | Team resume/projection hydrate for select or background modes | `openTeamRunWithCoordinator(...)` | teamRunId/mode -> team context + resume config | GraphQL, team helpers, team run store |
| `services/runOpen/runOpenCoordinator.ts` | Modify | orchestration | Single-agent hydrate for select or background modes | existing `openRunWithCoordinator(...)` + non-select flag | runId -> agent context + optional selection | GraphQL, agent run store |
| `stores/runHistoryStore.ts` | Modify | store/orchestration trigger | Run history fetch + post-fetch recovery trigger | existing `fetchTree(...)` | network history -> local store + recovery pass | recovery coordinator |
| `stores/runHistorySelectionActions.ts` | Modify | selection orchestration | Team explicit open dispatch only | existing selection helpers | tree row -> team coordinator | team run open coordinator |
| `services/agentStreaming/TeamStreamingService.ts` | Modify | stream adapter | Maintain correct teamContext reference for live messages | `attachContext(teamContext)` | current context -> updated live binding | WebSocket client |
| `stores/agentTeamRunStore.ts` | Modify | stream lifecycle | Reattach existing team services to latest context | existing `connectToTeamStream(...)` | teamRunId -> connected/reattached stream | `TeamStreamingService` |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: responsibility stays clear at component/store/service boundaries.
- Layering note: recovery orchestration emerges because both history polling and explicit open need the same hydrate/connect policy.
- Decoupling check: dependencies remain one-way from UI -> store -> coordinator -> store/service -> transport.
- Module/file placement check: new service files make recovery/open ownership explicit instead of hiding policy in store actions.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `activeRunRecoveryCoordinator.ts` | Describes history-driven restoration of live runs. | New file. |
| File | N/A | `teamRunOpenCoordinator.ts` | Mirrors `runOpenCoordinator.ts` naming for team-specific hydrate/open logic. | New file. |
| API | N/A | `recoverActiveRunsFromHistory(...)` | Explicitly states trigger source and effect. | New coordinator API. |
| API | N/A | `attachContext(teamContext)` | Natural name for replacing stream target context reference. | Added to team stream service. |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `runHistorySelectionActions.ts` | Selection plus team hydrate/open orchestration | No | Split | C-005 |
| `runOpenCoordinator.ts` | Single-agent run open orchestration | Yes | N/A | C-003 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Add more recovery logic directly into `runHistoryStore.ts` | High | Extract coordinator and keep store as trigger/owner of history data only | Change | Store should not accumulate cross-run hydrate policy. |
| Keep team hydrate logic inline in selection actions because it already exists there | High | Split to `teamRunOpenCoordinator.ts` | Change | Existing placement is convenience-driven, not responsibility-driven. |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Manually reconnect only the currently selected run on mount | High | Recover all active runs from history | Reject shortcut | Violates requirement. |
| Force team stream reconnect without reattaching service context | High | Add explicit `attachContext(...)` and call it from store lifecycle | Reject shortcut | Otherwise stale-object writes remain possible. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `activeRunRecoveryCoordinator` | run history data, open coordinators, context stores | `runHistoryStore` | Medium | Keep it pure orchestration with no component imports. |
| `teamRunOpenCoordinator` | GraphQL, team helpers, team run store | recovery coordinator, selection actions | Medium | One reusable owner for team hydrate/connect logic. |
| `TeamStreamingService` | WebSocket transport | `agentTeamRunStore` | Low | Small focused API addition only. |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Component -> Store -> Coordinator Service -> Store/Transport Adapter -> IO`.
- Temporary boundary violations and cleanup deadline: `None`.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Inline team hydrate/open orchestration in `runHistorySelectionActions.ts` | Replace with coordinator call; remove duplicate fetch/build/connect logic. | No dual path retained. | Unit coverage for explicit team open and background team recovery. |

## Error Handling And Edge Cases

- If active recovery for one run fails, recovery continues for other active runs and logs the failure.
- Recovery skips already-live subscribed contexts to avoid repeated projection fetches on every quiet history refresh.
- If a run becomes active in history after initial load, the next quiet refresh recovers it.
- Inactive history open remains explicit and non-streaming.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001,R-002,R-007,R-009 | Recover active single-agent runs after reload/history fetch | Yes | Yes | Yes | UC-001 |
| UC-002 | R-001,R-003,R-006,R-009 | Recover active team runs after reload/history fetch | Yes | Yes | Yes | UC-002 |
| UC-003 | R-004,R-005,R-006 | User focuses an already-recovered active team/member and sees aligned center/right live state | Yes | N/A | Yes | UC-003 |
| UC-004 | R-008 | Inactive history open remains projection-only | Yes | N/A | Yes | UC-004 |

## Performance / Security Considerations

- Recovery adds additional projection/resume queries only for active runs lacking a subscribed context.
- Background recovery should tolerate small active-run counts; if counts grow later, batching/caching can be added in the coordinator without changing UI contracts.
- No new credentials or persistence surfaces are introduced.

## Migration / Rollout (If Needed)

- No schema migration required.
- Rollout is frontend-only and guarded by existing run-history data plus existing runtime streams.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001, T-002 | `runHistoryStore.spec.ts` active recovery cases | Planned |
| C-002 | T-003 | `runHistoryStore.spec.ts` / new coordinator-covered tests via store path | Planned |
| C-003 | T-004 | `runHistoryStore.spec.ts`, `agentRunStore.spec.ts` impacted path | Planned |
| C-004 | T-005 | `runHistoryStore.spec.ts` | Planned |
| C-005 | T-006 | history selection regression tests | Planned |
| C-006 | T-007 | `TeamStreamingService.spec.ts` | Planned |
| C-007 | T-008 | `agentTeamRunStore.spec.ts` | Planned |
| C-008 | T-009 | `runHistoryStore.spec.ts` | Planned |
| C-009 | T-010 | `agentTeamRunStore.spec.ts`, `TeamStreamingService.spec.ts` | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | User clarification | Requirement Gap | Selected-only recovery would under-specify active-run liveness. | Yes | Background active-run recovery became the target direction. | Closed |

## Open Questions

- Whether bounded retention should remain “allowed but unchanged” in this ticket or receive an explicit implementation follow-up remains a post-fix optimization question, not a blocker for live recovery correctness.
