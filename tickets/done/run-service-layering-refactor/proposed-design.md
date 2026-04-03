# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined a service-boundary refactor that keeps managers internal and moves higher-level runtime callers onto stronger service APIs. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/run-service-layering-refactor/investigation-notes.md`
- Requirements: `tickets/done/run-service-layering-refactor/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`

## Summary

Refactor runtime launch/continuity callers so `AgentRunService` and `TeamRunService` are the authoritative public lifecycle boundaries for higher-level orchestration. Keep `AgentRunManager` and `AgentTeamRunManager` as internal runtime-registry/backend owners underneath those services. Remove the agent-side manager bypass in `ChannelBindingRunLauncher` by adding the missing service APIs for live-run lookup and channel-aware create semantics. Add a small symmetry helper on `TeamRunService` for active-or-restore resolution so repeated higher-level continuity logic is owned by the team service rather than repeated across callers.

## Goal / Intended Change

- Restore boundary encapsulation: callers above the service layer should not depend on both a service and its internal manager.
- Preserve existing external-channel continuity behavior.
- Remove launcher-owned agent lifecycle duplication and move that behavior into `AgentRunService`.
- Strengthen service APIs just enough that higher-level runtime callers stop compensating with direct manager access or repeated restore logic.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove direct agent manager dependency and launcher-owned metadata/history persistence from the external-channel runtime launch path in this scope.
- Gate rule: the design is invalid if it preserves mixed service-plus-manager access in higher-level runtime launch/continuity callers when the service boundary can own the behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Higher-level callers must not depend on both a service boundary and its internal manager. | `AC-001`, `AC-003` | Launcher/recovery callers use one authoritative boundary. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-002` | `AgentRunService` must expose the lifecycle/runtime access needed by higher-level runtime callers. | `AC-001`, `AC-003` | Missing agent-side APIs move into the service. | `UC-001`, `UC-002`, `UC-005` |
| `R-003` | Fresh agent creation must go through `AgentRunService`. | `AC-002` | No launcher-owned create duplication remains. | `UC-003` |
| `R-004` | Metadata/history persistence remains service-owned. | `AC-002` | No manual launcher persistence after direct manager create. | `UC-003` |
| `R-005` | Existing continuity semantics are preserved. | `AC-001`, `AC-002`, `AC-004` | Live reuse / restore / fresh-create / binding update still work. | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-006` | Team-side runtime continuity should use service-owned helpers where they improve symmetry. | `AC-004` | Team active-or-restore repetition is consolidated in service scope. | `UC-004`, `UC-005` |
| `R-007` | Managers remain internal runtime-registry/backend owners. | `AC-001`, `AC-004` | Service API grows; manager ownership stays internal. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | `ChannelBindingRunLauncher` is the continuity owner for external-channel dispatch, but the agent path bypasses its own service boundary. | `src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartAgentRun`, `resolveOrStartTeamRun` | Whether the smallest fix is one agent service helper or a slightly richer API pair. |
| Current Ownership Boundaries | `AgentRunService` already owns lifecycle + persistence; `AgentRunManager` owns live runtime registry/backends underneath. Team side is already service-first. | `src/agent-execution/services/agent-run-service.ts`, `src/agent-execution/services/agent-run-manager.ts`, `src/agent-team-execution/services/team-run-service.ts` | Whether `ChannelAgentRunFacade` should also stop using the manager in this ticket. |
| Current Coupling / Fragmentation Problems | Agent create logic is duplicated in the launcher and active-or-restore logic repeats across higher-level callers. | `channel-binding-run-launcher.ts`, `accepted-receipt-recovery-runtime.ts`, `channel-agent-run-facade.ts` | Whether any other higher-level caller in scope still needs direct manager access after service expansion. |
| Existing Constraints / Compatibility Facts | Live reuse must remain binding-owned in-process; restore must remain possible from persisted run ids; managers should not be removed. | Launcher tests, service restore/create implementations | None blocking. |
| Relevant Files / Components | Refactor is centered on agent/team run services plus external-channel runtime callers. | `agent-run-service.ts`, `team-run-service.ts`, `channel-binding-run-launcher.ts`, `accepted-receipt-recovery-runtime.ts`, `channel-agent-run-facade.ts`, `channel-team-run-facade.ts` | None blocking. |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | External-channel dispatch asks for an agent run for a binding | Bound agent run id is returned and persisted | `ChannelBindingRunLauncher` governing continuity, `AgentRunService` governing lifecycle | This is the exact spine where the current boundary bypass happens. |
| `DS-002` | `Primary End-to-End` | External-channel dispatch asks for a team run for a binding | Bound team run id is returned and persisted | `ChannelBindingRunLauncher` governing continuity, `TeamRunService` governing lifecycle | This is the comparison spine; it is already closer to the intended boundary shape. |
| `DS-003` | `Primary End-to-End` | Accepted-receipt recovery asks for a dispatch target run | Live or restored run handle is returned for observation/publication | `AcceptedReceiptRecoveryRuntime` governing recovery, services governing runtime resolution | This spine repeats the same service/manager split on the agent side today. |
| `DS-004` | `Bounded Local` | Service-level runtime resolution begins | Service returns live run / restored run / created run result with authoritative persistence side effects | `AgentRunService` / `TeamRunService` | The service-level internal continuity flow must become explicit so higher-level callers do not own it piecemeal. |

## Primary Execution / Data-Flow Spine(s)

- `DS-001`: `ChannelBindingRunLauncher -> AgentRunService -> AgentRunManager -> AgentRunMetadataService/AgentRunHistoryIndexService -> ChannelBindingService`
- `DS-002`: `ChannelBindingRunLauncher -> TeamRunService -> AgentTeamRunManager -> TeamRunMetadataService/TeamRunHistoryIndexService -> ChannelBindingService`
- `DS-003`: `AcceptedReceiptRecoveryRuntime -> AgentRunService/TeamRunService -> active or restored run`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `ChannelBindingRunLauncher` | External-channel continuity policy owner | Decides whether a binding reuses, restores, or replaces a run id. |
| `AcceptedReceiptRecoveryRuntime` | Recovery orchestrator | Resolves a run handle for already-accepted external work. |
| `AgentRunService` | Authoritative agent lifecycle boundary | Owns agent run lookup, restore, create, and metadata/history persistence orchestration. |
| `TeamRunService` | Authoritative team lifecycle boundary | Owns team run lookup, restore, create, and metadata/history persistence orchestration. |
| `AgentRunManager` | Internal agent runtime registry/backend owner | Owns live active runs and backend create/restore operations. |
| `AgentTeamRunManager` | Internal team runtime registry/backend owner | Owns live team runs and backend create/restore operations. |
| `ChannelBindingService` | Binding persistence owner | Persists the resolved bound run id back onto the binding. |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The launcher applies binding-owned continuity policy, but delegates all agent lifecycle work to `AgentRunService`. The service resolves live state, restores when possible, or creates a fresh run and records the authoritative metadata/history before the launcher persists the bound run id. | `ChannelBindingRunLauncher`, `AgentRunService`, `ChannelBindingService` | `ChannelBindingRunLauncher` for continuity policy, `AgentRunService` for lifecycle | Workspace lookup, metadata/history services, binding registry ownership check |
| `DS-002` | The launcher applies the same continuity policy for teams and delegates runtime resolution to `TeamRunService`, which owns active-or-restore and create behavior. | `ChannelBindingRunLauncher`, `TeamRunService`, `ChannelBindingService` | `ChannelBindingRunLauncher` for continuity policy, `TeamRunService` for lifecycle | Launch-preset expansion, team metadata/history services |
| `DS-003` | Recovery code asks the service boundary for a usable run handle instead of stitching together manager lookup plus restore logic itself. | `AcceptedReceiptRecoveryRuntime`, `AgentRunService`, `TeamRunService` | `AcceptedReceiptRecoveryRuntime` for recovery sequencing | None beyond service-owned lookup/restore |
| `DS-004` | Inside each service, the internal flow resolves an active run or creates/restores one through the internal manager, while keeping persistence side effects inside the service. | `AgentRunService`, `TeamRunService`, internal managers | respective service | managers, metadata/history services, workspace manager |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `ChannelBindingRunLauncher` | Binding-owned continuity policy and binding run-id persistence | direct runtime-manager create/restore internals or manual run metadata/history writes | It may decide which path is taken, but not own lower-level lifecycle implementation. |
| `AcceptedReceiptRecoveryRuntime` | Recovery sequencing for accepted receipts | direct manager/service split logic when the service can own it | It should ask for a usable run handle, not recreate the resolution boundary. |
| `AgentRunService` | agent lifecycle API, active-run lookup, restore/create orchestration, metadata/history writes | binding-specific persistence policy | This is the authoritative agent boundary for higher-level callers. |
| `TeamRunService` | team lifecycle API, active-or-restore helper, create/restore/get, metadata/history writes | binding-specific persistence policy | Already close to target shape; gains a small symmetry helper. |
| `AgentRunManager` | live agent run registry/backends | higher-level continuity policy or history persistence policy | Internal owned mechanism. |
| `AgentTeamRunManager` | live team run registry/backends | higher-level continuity policy or history persistence policy | Internal owned mechanism. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| `WorkspaceManager` | `AgentRunService`, `TeamRunService` | Resolve workspace ids from launch presets/metadata | `Yes` |
| `AgentRunMetadataService` / `AgentRunHistoryIndexService` | `AgentRunService` | Persist authoritative metadata/history side effects | `Yes` |
| `TeamRunMetadataService` / `TeamRunHistoryIndexService` | `TeamRunService` | Persist authoritative metadata/history side effects | `Yes` |
| Binding live-run registry | `ChannelBindingRunLauncher` | Enforce in-process ownership before reusing a currently live run | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent active-run lookup for higher-level callers | `agent-execution/services/agent-run-service.ts` | `Extend` | This is the authoritative agent lifecycle boundary already. | N/A |
| Agent continuity create semantics with authoritative persistence | `agent-execution/services/agent-run-service.ts` | `Extend` | The service already owns lifecycle + metadata/history writes. | N/A |
| Team active-or-restore helper | `agent-team-execution/services/team-run-service.ts` | `Extend` | The team service already owns the lifecycle boundary and already exposes `getTeamRun`. | N/A |
| External-channel continuity policy | `external-channel/runtime/channel-binding-run-launcher.ts` | `Reuse` | The launcher is the right owner for binding continuity policy. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/services` | agent lifecycle boundary APIs and internal manager encapsulation | `DS-001`, `DS-003`, `DS-004` | `AgentRunService` | `Extend` | Add the missing higher-level service APIs here instead of creating a wrapper service. |
| `agent-team-execution/services` | team lifecycle boundary APIs | `DS-002`, `DS-003`, `DS-004` | `TeamRunService` | `Extend` | Add a small symmetry helper if it reduces repeated higher-level logic. |
| `external-channel/runtime` | binding continuity and accepted-receipt recovery orchestration | `DS-001`, `DS-002`, `DS-003` | launcher/recovery owners | `Reuse` | Remove bypasses; do not add a new helper layer. |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `external-channel/runtime` -> `agent-execution/services`
  - `external-channel/runtime` -> `agent-team-execution/services`
  - `agent-execution/services` -> `agent-execution/services/agent-run-manager` (internal)
  - `agent-team-execution/services` -> `agent-team-execution/services/agent-team-run-manager` (internal)
- Authoritative public entrypoints versus internal owned sub-layers:
  - Public for higher-level callers: `AgentRunService`, `TeamRunService`
  - Internal owned mechanisms: `AgentRunManager`, `AgentTeamRunManager`, metadata/history services
- Forbidden shortcuts:
  - `ChannelBindingRunLauncher` directly calling `AgentRunManager.createAgentRun(...)`
  - higher-level callers manually writing run metadata/history after manager calls
  - higher-level callers depending on both service and internal manager for the same lifecycle concern
- Boundary bypasses that are not allowed:
  - service-plus-manager mixed dependency in launch/recovery orchestration
- Temporary exceptions and removal plan:
  - None planned in this scope

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Extend existing services and remove higher-level manager bypasses.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - Lowest-complexity fix that preserves current subsystem ownership.
  - Improves testability by moving lifecycle logic behind one boundary.
  - Lowers evolution cost by removing duplicated create/restore semantics from callers.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`):
  - `Modify existing services and remove bypasses in higher-level callers.`

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `Yes` | Agent active-or-restore and create semantics repeat across launcher/recovery/facade callers. | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | `Yes` | `ChannelBindingRunLauncher` currently owns continuity policy plus agent lifecycle persistence details. | Split |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | Service API expansion stays on the existing lifecycle boundary. | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | Managers and metadata/history services serve service or launcher owners directly. | Keep |
| Authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | `Yes` | New service APIs eliminate direct manager dependency in higher-level callers. | Fix |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | Agent/team services are extended rather than wrapped. | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `Yes` | Repeated lifecycle access patterns move into service methods. | Extract |
| Current structure can remain unchanged without spine/ownership degradation | `No` | Agent launcher bypass currently degrades boundary encapsulation. | Change |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Keep manager access in higher-level callers and treat services as partial façades | Smallest code churn | Normalizes the architectural violation and preserves duplicated lifecycle logic | `Rejected` | Violates the workflow encapsulation rule and leaves drift risk in place. |
| `B` | Add a new external-channel-specific launch service/facade on top of current services/managers | Could isolate the launcher surface | Adds indirection while leaving the service boundary underpowered | `Rejected` | Empty indirection risk; existing lifecycle services are the correct owners. |
| `C` | Extend `AgentRunService`/`TeamRunService` and move higher-level callers onto them | Preserves ownership and removes bypasses | Requires targeted service API additions and test updates | `Chosen` | Best fit for the existing subsystem boundaries. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `src/agent-execution/services/agent-run-service.ts` | same | Add service-owned live-run lookup and service-owned create semantics needed by higher-level runtime callers. | Agent lifecycle boundary | Keep manager internal. |
| `C-002` | `Modify` | `src/agent-team-execution/services/team-run-service.ts` | same | Add a small service-owned active-or-restore helper for symmetry and repeated caller cleanup. | Team lifecycle boundary | No manager exposure. |
| `C-003` | `Modify` | `src/external-channel/runtime/channel-binding-run-launcher.ts` | same | Remove direct agent manager dependency and manual metadata/history persistence. | External-channel continuity | Continuity policy stays here. |
| `C-004` | `Modify` | `src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | Replace repeated higher-level active-or-restore logic with service-owned helper usage. | External-channel recovery | Agent and team sides cleaned together. |
| `C-005` | `Modify` | `src/external-channel/runtime/channel-agent-run-facade.ts` | same | Replace higher-level live-run fetch via manager with service-owned lookup if the strengthened service boundary makes that clean. | External-channel dispatch | Keep only if it reduces mixed boundary usage materially. |
| `C-006` | `Modify` | unit tests in `tests/unit/external-channel/runtime/` and `tests/unit/agent-execution/services/` | same | Update expectations to the new service-owned behavior and cover new APIs. | Validation | Required for Stage 6/7. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct `agentRunManager` dependency in `ChannelBindingRunLauncher` | Service API becomes sufficient for higher-level lifecycle needs. | `AgentRunService` APIs | `In This Change` | Core architectural removal |
| Launcher-owned agent metadata/history persistence after create | Persistence belongs to the service boundary. | `AgentRunService.createAgentRun(...)` | `In This Change` | Removes lifecycle duplication |
| Repeated higher-level active-or-restore logic in external-channel recovery callers | Service helper becomes authoritative. | `AgentRunService` / `TeamRunService` helper(s) | `In This Change` | Reduce repeated coordination |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/services/agent-run-service.ts` | `agent-execution/services` | `AgentRunService` | Authoritative agent lifecycle API for higher-level callers, including live lookup/restore/create orchestration and authoritative persistence side effects | One service boundary for agent lifecycle | Uses existing manager and history services |
| `src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution/services` | `TeamRunService` | Authoritative team lifecycle API, including active-or-restore helper for higher-level callers | One service boundary for team lifecycle | Uses existing team manager and history services |
| `src/external-channel/runtime/channel-binding-run-launcher.ts` | `external-channel/runtime` | `ChannelBindingRunLauncher` | Binding-owned continuity policy only | One continuity owner | Uses service boundaries only |
| `src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | `external-channel/runtime` | `AcceptedReceiptRecoveryRuntime` | Recovery sequencing | One recovery orchestrator | Uses service boundaries only |
| `src/external-channel/runtime/channel-agent-run-facade.ts` | `external-channel/runtime` | `ChannelAgentRunFacade` | Post-launch agent dispatch sequencing | One dispatch orchestrator | Uses `AgentRunService` and publisher |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `src/agent-execution/services/agent-run-service.ts` | `Modify` | `DS-001`, `DS-003`, `DS-004` | `AgentRunService` | Add `getAgentRun(...)`; optionally add `resolveAgentRun(...)`; extend `createAgentRun(...)` with internal options for initial summary/status while preserving current defaults | `getAgentRun`, `restoreAgentRun`, `createAgentRun` | Avoid channel-specific leakage in public GraphQL input types |
| `src/agent-team-execution/services/team-run-service.ts` | `Modify` | `DS-002`, `DS-003`, `DS-004` | `TeamRunService` | Add `resolveTeamRun(...)` helper for active-or-restore ownership | `getTeamRun`, `restoreTeamRun`, `resolveTeamRun` | Small symmetry improvement |
| `src/external-channel/runtime/channel-binding-run-launcher.ts` | `Modify` | `DS-001`, `DS-002` | `ChannelBindingRunLauncher` | Use service lookups/restore/create methods only; keep binding registry ownership check local | `resolveOrStartAgentRun`, `resolveOrStartTeamRun` | Remove direct manager/history service fields |
| `src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | `Modify` | `DS-003` | `AcceptedReceiptRecoveryRuntime` | Use service-owned active-or-restore helper(s) | `resolveAgentRun`, `resolveTeamRun` usage | Cleaner recovery boundary |
| `src/external-channel/runtime/channel-agent-run-facade.ts` | `Modify` | `DS-001` | `ChannelAgentRunFacade` | Fetch the active run through service-owned lookup after launch instead of using the manager directly | `dispatchToAgentBinding` | Keep only if service lookup is enough |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-run-service.ts` | `src/agent-execution/services/agent-run-service.ts` | same | agent lifecycle boundary | `Yes` | `Low` | `Keep` | Correct owner already exists. |
| `team-run-service.ts` | `src/agent-team-execution/services/team-run-service.ts` | same | team lifecycle boundary | `Yes` | `Low` | `Keep` | Correct owner already exists. |
| `channel-binding-run-launcher.ts` | `src/external-channel/runtime/channel-binding-run-launcher.ts` | same | binding continuity owner | `Yes` | `Low` | `Keep` | File stays, responsibility narrows. |
| `accepted-receipt-recovery-runtime.ts` | `src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | accepted-receipt recovery owner | `Yes` | `Low` | `Keep` | File stays, boundary use improves. |
| `channel-agent-run-facade.ts` | `src/external-channel/runtime/channel-agent-run-facade.ts` | same | dispatch façade | `Yes` | `Low` | `Keep` | File stays, dependency surface shrinks. |

## Concrete Design Example

- Agent binding continuity:
  - `ChannelBindingRunLauncher` checks whether the binding-owned local registry still owns the cached run id.
  - If yes, it asks `AgentRunService.getAgentRun(runId)` whether the run is live and reuses it only when both conditions hold.
  - If not reusable, it asks `AgentRunService.restoreAgentRun(runId)` to restore the persisted run id.
  - If restore fails, it asks `AgentRunService.createAgentRun(input, { initialSummary, initialLastKnownStatus: "ACTIVE" })`.
  - `AgentRunService` performs the manager interaction and metadata/history persistence internally, then returns the created run id.
  - `ChannelBindingRunLauncher` persists the chosen run id back to the binding.

This keeps continuity policy in the launcher and lifecycle ownership in the service, without a mixed dependency on the internal manager.
