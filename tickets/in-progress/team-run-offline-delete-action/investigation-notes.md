# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements remain approved; ARCH-REV-001 design-impact evidence incorporated; SR-002 design rework complete and ready for architecture re-review
- Investigation Goal: Determine why the observed Classroom Simulation member says `Offline` while the TeamRun has no permanent-delete action, reproduce the user's pending-approval shutdown sequence, and define the smallest safe correction.
- Scope Classification: `Medium`
- Scope Classification Rationale: The symptom is a compact row-action defect, but active deletion spans root lifecycle, destructive confirmation, exact persisted-package deletion, stream/context cleanup, and partial failures.
- Scope Summary: Whole-AgentTeam persisted history deletion only. No member deletion and no change to TeamRun continuation semantics.
- Primary Questions Resolved:
  - The whole TeamRun row owns stop/archive/delete actions.
  - Delete is suppressed solely because the root `isActive`; member `Offline` is not the gate.
  - The observed roots can be active and quiescent while their configured members are offline by design.
  - A complete server deletion contract exists but intentionally rejects active roots.
  - Stop while a member awaits tool approval is defective: termination waits for quiescence without interrupting the pending turn, while the root may be removed from manager lookup before teardown finishes.
  - The safe product correction is reliable descendant-first termination plus an explicit active-delete flow that stops the exact root before catalog deletion.

## Request Context

The user supplied a desktop screenshot showing the Classroom Simulation Team expanded into multiple similarly titled runs. The focused `/professor` member shows `Offline`; no delete button is apparent. The ticket was first investigated from the universal-task-delegation integration branch. After that work was finalized and promoted, the user explicitly requested deleting the old ticket worktree and re-bootstrapping this ticket from current `origin/personal`.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action`
- Current Branch: `codex/team-run-offline-delete-action`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-19; the recreated branch was then fast-forwarded after the tracked remote advanced. Current refreshed base commit is `0194fb4fffa69037a46aeace491024fdf816dde7`.
- Task Branch: `codex/team-run-offline-delete-action`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Re-bootstrap Result: the old worktree and old task branch at `eb79671448e7a2485f30476155e9f7cb6ea363ff` were removed at the user's request. The same canonical path and task-branch name were recreated from refreshed `origin/personal`; all four ticket artifacts were checksum-preserved across replacement. When `origin/personal` advanced by one delivery-record commit, the ticket branch was fast-forwarded to `0194fb4fffa69037a46aeace491024fdf816dde7`; relevant source files had no delta.
- Notes For Downstream Agents: Never delete or mutate either reported production TeamRun. Use the evidence below and isolated temporary fixtures for destructive validation. The single user-approved live reproduction fixture was deleted after capture.

## Supplemental Task Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `ui-ux-spec.md` | Specifies TeamRun row actions, active/inactive confirmation, accessibility, descendant-first stop presentation, and partial-failure recovery. | Approved 2026-08-19 |
| `runtime-reproduction-evidence.md` | Records the exact user-approved pending-approval stop experiment, code-correlated cause, clean restore control, and fixture cleanup. | Complete; evidence only; approval N/A |
| `design-use-case-validation.md` | Self-validates each materially different approved case through target data-flow spines and lifecycle invariants. | Complete; design evidence only; approval N/A |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-18 | Other | User request and `ctx_26850298b17c__image.png` | Establish symptom | Three same-summary TeamRuns show parent activity dots/small square actions; selected member says `Offline`; no trash action is visible. | No |
| 2026-08-18 | Command | `git fetch origin codex/agent-team-universal-task-delegation`; dedicated `git worktree add` | Original isolated ticket workspace | Original branch was created from `eb79671448e7a2485f30476155e9f7cb6ea363ff`; this bootstrap was later superseded at the user's request. | No |
| 2026-08-19 | Command | `git fetch origin personal`; checksum backup; `git worktree remove --force`; branch replacement; `git worktree add -b codex/team-run-offline-delete-action ... origin/personal` | Re-bootstrap after integration promotion | Old worktree/branch removed; current worktree recreated from `eb9fc2287a2650ddb73ae0a4b41c60e34040e965`, tracking `origin/personal`; artifact checksums matched before/after. | No |
| 2026-08-19 | Command | `git merge --ff-only origin/personal` | Keep the just-recreated ticket branch on the latest tracked base after a concurrent delivery-record advance | Branch fast-forwarded to `0194fb4fffa69037a46aeace491024fdf816dde7`; ticket artifacts remained unmodified and relevant runtime/history source had no delta. | No |
| 2026-08-18 | Code | `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistoryTreeState.ts`; `useWorkspaceHistoryMutations.ts` | Trace render and mutation gates | Active TeamRun renders stop; inactive `READY` renders archive/trash. `canTerminateTeam` is exactly `isActive`; delete composable repeats the same active guard. | Yes—correct in design |
| 2026-08-18 | Code | `team-run-history-service.ts`; `team-run-live-projection-service.ts`; `agent-team-run-manager.ts` | Find lifecycle authority | Root active is manager registration/`RootTeamRun.isActive`; configured member statuses are separate snapshots and may default to offline. | No |
| 2026-08-18 | Code | `mixed-team-manager.ts`; `mixed-agent-member-handle.ts`; `root-team-run.ts` | Explain active+offline | A root can remain active with no materialized member AgentRun. New exact member input calls `ensureReady()` and lazily creates/restores the configured member. | No |
| 2026-08-18 | Code | `team-run-history-catalog-service.ts`; GraphQL `deleteStoredTeamRun` | Verify deletion safety/ownership | Catalog rejects active root, then removes exact index row and exact TeamRun directory when inactive. | Yes—compose termination above catalog |
| 2026-08-18 | Read-only runtime | GraphQL `listWorkspaceRunHistory` on `127.0.0.1:29695` | Match screenshot to exact data | Three distinct IDs initially reported root active. Two reported all configured members offline. Duplicate summaries are presentation only. | No |
| 2026-08-18 | Read-only runtime | GraphQL `getTeamRunExecutionCheckpoint` for exact recent IDs | Determine work state | The two all-offline roots returned `hasOpenExecutionWork: false`, `changeSequence: 1`: active and quiescent, not terminated. | No |
| 2026-08-19 | Read-only production log | Exact-ID search in `/Users/normy/.autobyteus/server-data/logs/server.log` | Determine the concrete transition into active-root/all-members-offline | Both affected roots accepted Team WebSocket sessions, but focused-professor activation later failed with `TeamAgentActivationError: The prior native conversation context could not be restored.` The sessions closed while the root remained registered. | No for delete scope; restoration failure itself is separate |
| 2026-08-18 | Read-only runtime | Later `listWorkspaceRunHistory` observation | Observe two-step transition without performing it | Newest root was inactive with `terminatedAt: 2026-08-18T20:24:51.266Z`; the other two remained active/quiescent. | No |
| 2026-08-18 | Git | Earlier merge-base source and `git diff` | Determine regression origin | The earlier personal merge base already had stop-for-active/delete-for-inactive UI. The universal lifecycle exposes the ambiguous state; duplicate identity lookup was not introduced. | No |
| 2026-08-19 | Git / Code | Relevant-source diff from old base `eb796714...` to promoted personal `eb9fc2287...`, followed by current-source gate search | Revalidate investigation after re-bootstrap | No delta exists in the relevant component, mutation, history service/catalog, or TeamRun-manager files; current personal still suppresses active delete and the catalog still rejects active-package deletion. Prior root-cause evidence remains applicable. | No |
| 2026-08-19 | User-approved isolated runtime | Public GraphQL create/terminate/restore/delete plus Team/Agent WebSocket commands against `127.0.0.1:29695`; exact fixture `classroom_simulation_team_4c3801479a874b13ad3cf91b67bba633` | Reproduce the user's `autoExecuteTools=false -> approval pending -> shutdown` sequence and distinguish it from normal lazy offline state | Approval pending was reached with open work. Termination stopped advertising active but did not return within 60 seconds; explicit denial solely for cleanup let it finish. Clean restore projected active root + both offline, then new input activated professor and completed. Fixture was terminated/deleted. | Yes—termination design must settle pending approval and preserve one in-flight root identity |
| 2026-08-19 | Code | `RootTeamRun.terminate/runTermination`; `MixedTeamManager.prepareTermination`; `MixedAgentMemberHandle.prepareTermination`; `AgentRun.prepareTermination`; `AgentTeamRunManager.getTeamRun/terminateTeamRun` | Correlate runtime hang to lifecycle ownership | Root closes admission and enters `terminating`; member termination waits for AgentRun input quiescence without interrupting the pending approval turn. Manager lookup unregisters any root whose `isActive()` is false, including the still-terminating root. | Yes—reuse AgentRun interrupt before quiescence and retain manager ownership until terminal completion |
| 2026-08-19 | Code | `TeamRun`, `TeamRunBackend`, `MixedTeamManager`, configured/task Agent and Team registries/handles, `TeamRunResolver`, `TaskDelegationService.shutdownAndSettle` | Trace every configured/delegated/nested shutdown owner | The mixed backend already owns the full materialized descendant set, but root shutdown reaches task settlement/member termination without a prior whole-tree interruption phase. Both root and nested resolvers remove non-active runs on read, so ownership and admission are conflated at two levels. | Yes—add bounded root-shutdown interruption/quiescence phases and retain nonterminal execution ownership until accepted termination |
| 2026-08-19 | Code | `TeamRunService`, GraphQL termination/history resolvers, `agentTeamRunStore`, `useWorkspaceHistoryMutations`, `runHistoryMutationActions`, Team history row/modal | Derive the smallest active-delete composition | Existing stop-only already owns server termination stamping and exact client stream/member cleanup; existing history delete already owns exact local history/context/selection cleanup. The current mutation composable is the narrow owner that can sequence those two operations after one confirmation without a new server mutation or compatibility path. | Yes—extend the existing composable and preserve the catalog guard |
| 2026-08-19 | Command | `git fetch origin personal`; `git rev-list --left-right --count HEAD...origin/personal`; `git status --short --branch` | Revalidate dedicated workspace immediately before design | Ticket worktree remains dedicated, branch and `origin/personal` are `0/0` at `0194fb4fffa69037a46aeace491024fdf816dde7`; only ticket artifacts are untracked. | No |
| 2026-08-19 | User approval | Conversation approval after exact shutdown sequence confirmation | Lock requirements basis for design | User confirmed: close admission; interrupt/cancel pending approvals; wait settlement; fully stop every individual/delegated/nested execution; only then stop/unregister root and expose delete-ready UI. User instructed solution design to proceed using design principles. | No |
| 2026-08-19 | Architecture review | `design-review-report.md` (`ARCH-REV-001`, `AR-001`–`AR-003`) and `architecture-review-revision-record.md` | Validate SR-001 against approved partial-failure and lifecycle concurrency contracts | Overall direction passed, but current catalog order removes the durable row before package deletion, the managed-root check does not exclude concurrent restore through deletion, and existing drains do not join already-admitted asynchronous member/task preparation. | Yes—SR-002 bounded design correction |
| 2026-08-19 | Code | `TeamRunHistoryCatalogService.deleteTeamRun`, `TeamRunHistoryService.listTeamRunHistory`, `TeamRunV1PackageCatalog`, `TeamRunService.restoreTeamRun`, `AgentTeamRunManager.createTeamRun/restoreTeamRun` | Independently validate AR-001/AR-002 and locate the narrow owners | Catalog currently flushes row removal and publishes in-memory removal before `fs.rm`; history requires both row and execution tree; restore registers through the manager before catalog restoration recording. One-time pre-queue lookup therefore cannot protect the package. | Yes—catalog compensation plus one manager-owned exact-ID transition lane |
| 2026-08-19 | Code | `RootTeamRun.executeAgentCommand`/Team delivery/task methods; `TaskDelegationService.delegateTask`; mixed configured/task registries; task command queue | Independently validate AR-003 and identify the stabilization boundary | Team message and delegation can pass root admission, then await configured-member or task preparation before the existing task/persistence queues. Delegation preparation can create prepared Agent/Team objects and registration reservations before queue submission. Existing drains alone do not freeze the traversal set. | Yes—root admitted-operation gate plus frozen exact termination scope |
| 2026-08-18 | Tests | `WorkspaceAgentRunsTreePanel.spec.ts`; `runHistoryStore.spec.ts` | Inventory coverage | Tests assert inactive TeamRun delete and active stop separately, but do not cover active root + offline members, active-delete composition, or stream cleanup. | Yes—durable coverage required |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | User sees a persisted TeamRun row and its focused member | GraphQL history -> run-history projection -> TeamTreeNode -> `WorkspaceHistoryWorkspaceSection` | Root `isActive` selects stop or archive/delete; focused member status is independent. | UI/store/server tracing; runtime probe |
| `BEH-002` | System | User requests permanent TeamRun history deletion | component -> composable -> store -> GraphQL -> `TeamRunHistoryService` -> catalog | Frontend prevents active request; catalog independently rejects active root; inactive exact row/package is removed. | Source tracing |
| `BEH-003` | User | User selects stop for active TeamRun | component -> composable -> `agentTeamRunStore.terminateTeamRun` -> GraphQL -> `TeamRunService` -> manager/root -> catalog termination stamp -> client stream/context status cleanup | Stops runtime but intentionally retains history; later refresh makes row inactive and trash eligible. | Source tracing; later runtime observation |
| `BEH-004` | System | User sends new input to an active root whose member is offline | Team stream handler -> `RootTeamRun.executeAgentCommand` -> containing `TeamRun` -> mixed member handle -> `ensureReady()` -> AgentRun manager | Offline configured member is lazily activated/restored; root resumability is preserved. | Root/backend source tracing |
| `BEH-005` | User | User deletes one of multiple same-summary TeamRuns | Row action carries `team.teamRunId`; API/path validation uses exact ID | Summary cannot select deletion target; exact root identity is available throughout. | UI/API/storage tracing |
| `BEH-006` | User/System | User selects Team stop or confirmed active delete while a member awaits tool approval | row/store -> `terminateAgentTeamRun` -> manager/root -> mixed member -> `AgentRun.prepareTermination()` | Root enters `terminating`, but AgentRun quiescence waits on the unanswered approval; manager lookup can unregister the non-active root before teardown finishes; the public mutation can remain pending indefinitely. | User-approved exact runtime reproduction plus source tracing |

## Design Health Assessment Evidence

- Change posture: `Bug Fix / Behavior Change`
- Candidate root cause classification: `Missing Lifecycle Invariant / Boundary Ownership`, plus duplicated delete-policy coordination
- Refactor posture evidence summary: no subsystem rewrite is warranted. Add bounded whole-tree interruption/quiescence phases, separate nonterminal ownership from command admission in root and nested registries, make rejected/failed termination retry the same objects, and extend the existing UI mutation owner for stop-before-delete while retaining the catalog's physical safety guard.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot + live history | Parent root is active while member header is offline | The UI presents two valid but different lifecycle scopes without explaining which governs deletion. | UI copy/action design |
| UI source | `v-if canTerminateTeam` suppresses trash; trash itself is hover/focus hidden at desktop widths | The user must infer a two-step process from a small stop square. | Expose explicit delete |
| Server source | Root is resumable and members are lazy; catalog refuses active package deletion | Do not reinterpret offline as inactive. Coordinate root termination before storage deletion. | Service design |
| Existing tests | Only inactive delete and active stop are asserted | Observed state and partial failures are unprotected. | Add isolated coverage |
| Exact runtime reproduction | Stop remained pending until an explicit approval denial; restored root immediately showed active + both offline | Current termination does not supersede pending approval, and active/offline alone is a valid lazy state. | Add pending-approval stop/delete and clean-restore control coverage |

## Relevant Files / Components

- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` — renders TeamRun root activity and row actions.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` — owns generic delete confirmation modal and section bindings.
- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` — defines `canTerminateTeam(isActive)`.
- `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` — currently blocks active delete and coordinates confirmation/loading/toasts.
- `autobyteus-web/stores/runHistoryMutationActions.ts` — invokes GraphQL delete and removes exact local Team history/context/selection.
- `autobyteus-web/stores/agentTeamRunStore.ts` — owns Team stream disconnection and stop-only lifecycle cleanup.
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` — application-facing stored TeamRun history service.
- `autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts` — physical index/package deletion and active-root guard.
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` — root lifecycle authority and termination owner.
- `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` — active/resumable root and exact command routing.
- `autobyteus-server-ts/src/agent-team-execution/domain/agent-run.ts` — termination preparation currently waits for input quiescence; existing interrupt is the supported turn-cancellation primitive.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` — lazy configured-member activation/restoration.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` — configured nested-Team recursion and local termination attachment.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` and `mixed-task-team-execution-registry.ts` — active/prepared delegated execution ownership and settlement.
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts` — root-private TeamRun ownership currently pruned from activity reads.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` — deepest-first task interruption/settlement after root admission closes.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — row-action component coverage.
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` and server history/catalog tests — mutation and persistence coverage targets.

## Runtime / Probe Findings

The three reported production roots and their logs were inspected read-only. After the user explicitly authorized experiments, one newly allocated exact fixture was mutated through public runtime APIs and then completely deleted; neither reported root was changed.

| Exact TeamRun | Initial Root State | Member State | Checkpoint | Later Observation |
| --- | --- | --- | --- | --- |
| `classroom_simulation_team_9e9c0eaa52324da08a327a66fa6d13be` | Active | `/professor` idle; `/student` idle | Later query found no active root | Inactive; `terminatedAt=2026-08-18T20:24:51.266Z` |
| `classroom_simulation_team_d1b2a267cdf44bc7856eec5430dac3b4` | Active | both offline | `changeSequence=1`, `hasOpenExecutionWork=false` | Still active/quiescent |
| `classroom_simulation_team_69b84cde65ea447f9d1a3185abbd08b7` | Active | both offline | `changeSequence=1`, `hasOpenExecutionWork=false` | Still active/quiescent |

The screenshot's small gray square on the recent TeamRun row is `heroicons:stop-20-solid`, not a disabled or missing trash icon. On an inactive row, archive/trash use `md:opacity-0` and appear only on row hover or focus-within.

### Exact Transition Into The Observed State

The state is reachable through the normal lazy TeamRun lifecycle, and the production log proves the failure variant occurred for the two reported roots:

1. `AgentTeamRunManager.createTeamRun()` or `restoreTeamRun()` constructs and registers the `RootTeamRun` first. Root lifecycle becomes active immediately.
2. Configured member AgentRuns are lazy. `MixedTeamManager.getLeafAgentStatusSnapshots()` emits `offline` for any configured member with no live handle/AgentRun.
3. When a user message targets the professor, `RootTeamRun.executeAgentCommand()` reaches `MixedAgentMemberHandle.ensureReady()`.
4. Because prior native conversation activity exists, the handle selects the native restore plan.
5. For both reported roots, that restore failed. The server log contains the exact error `TeamAgentActivationError: The prior native conversation context could not be restored.`
6. The professor never becomes an active AgentRun after that attempt; the student was never activated. Both therefore project offline.
7. Member activation failure does not terminate the root. The root remains active so a later command can retry activation. Since no delegated task or member turn remains open, the root checkpoint reports `hasOpenExecutionWork=false`.

Thus the state is not computed incorrectly: it is an **active retry-capable root with zero currently active member runtimes**. What is misleading is the single user-facing word `Active` and the current deletion gate, not the distinction itself.

### User-Approved Exact Reproduction

The isolated fixture matched the two reported configurations: professor `AUTOBYTEUS/deepseek-v4-flash`, student `CODEX/gpt-5.6-luna`, both `autoExecuteTools=false`.

1. Fresh creation projected root active and both configured members offline before any member activation.
2. Professor input activated the member and reached `TOOL_APPROVAL_REQUESTED` for `run_bash pwd`; checkpoint `hasOpenExecutionWork=true`.
3. `terminateAgentTeamRun` began at `04:41:14.912Z`. The Team stream projected inactive at `04:41:16.312Z`, but the mutation had not returned when the client timed out at 60 seconds.
4. Source tracing showed why: `AgentRun.prepareTermination()` waits for input quiescence, but no interrupt/cancellation is issued first, so the turn remains blocked on approval. At the same time, `RootTeamRun.isActive()` becomes false in `terminating`, and `AgentTeamRunManager.getTeamRun()` may unregister the still-tearing-down root.
5. An explicit denial was sent only to recover the fixture. The turn then completed and termination stamped `terminatedAt=2026-08-19T04:43:09.278Z`.
6. Clean restore at `04:43:53.541Z` again projected root active with both members offline. A new message lazily restored professor and completed normally with `CONTINUED`. Idle termination and exact deletion both succeeded; cleanup finished at `04:43:55.248Z`.

This establishes two separate conclusions:

- `root active + all members offline` is a normal, supported lazy/restored state.
- `stop while approval pending` is broken and is the concrete way the user's workflow can become stuck/inconsistent. It must be corrected for stop-only and before active-delete composition is safe.

## External / Public Source Findings

Not applicable. This is a local product contract; no external source is required.

## Reproduction / Environment Setup

- No new server, container, or dependency install was started.
- Initial investigation queried the already-running Electron server only through read-only operations.
- After explicit user authorization, one newly allocated TeamRun fixture was exercised through the same public GraphQL/WebSocket contracts as the frontend. It was terminated and deleted after capture; its catalog row and package directory are absent.
- Later durable destructive validation must use isolated temporary data and verify only exact fixture paths.

## Findings From Code / Docs / Data / Logs

1. `Offline` in the focused member header is semantically correct for that configured AgentRun and does not describe the root TeamRun lifecycle.
2. The root activity dot/small stop icon is also semantically correct: the root remains registered, resumable, and able to lazily activate the member on new input.
3. The bug is the missing explicit destructive route and the discoverability mismatch between these two scopes, not corrupted data or duplicate row identity.
4. Existing two-step behavior is safe but too implicit: stop exact root, wait for history refresh, hover parent row, then delete.
5. The existing storage boundary already provides the needed last-line invariant: active packages cannot be removed.
6. The existing frontend history-mutation owner can compose stop-if-active then invoke the existing guarded catalog deletion; no new server mutation, migration, or general recovery framework is needed.
7. For the two exact reported roots, this was not only an abstract lazy state: production logs prove that prior native conversation restoration failed during professor activation. Fixing that separate continuation failure is not required to make failed/retry-capable TeamRuns deletable.
8. The user's remembered `autoExecuteTools=false` sequence is confirmed by stored launch configurations and exact reproduction. The stop action itself has a missing cancellation invariant: it cannot wait for a decision the user is explicitly trying to abandon by stopping.
9. Manager membership and command admission are currently conflated. A root in `terminating` rejects new work, but current `getTeamRun()` also removes it from manager ownership before its termination promise necessarily finishes. This permits lookup/projection inconsistency and makes idempotent stop/restore coordination unsafe.
10. The same read-pruning pattern exists inside `TeamRunResolver`: non-active nested TeamRuns disappear from ownership lookup even when their termination has not completed. Descendant-first shutdown therefore needs the same explicit `managed/nonterminal` versus `active/admitting` distinction at both root and nested TeamRun boundaries.
11. Current termination promises are cached even when a provider/local termination returns `accepted: false` or throws. Under the approved retry requirement, the promise may be shared while in flight but must be cleared after a nonterminal failure so the same prepared execution objects can be retried; accepted descendants remain idempotent.
12. Current deletion publishes an index without the row before recursively removing the package. A package-removal exception can therefore report failure after the only durable history row is already gone. The bounded correction must keep the current in-memory row until success and compensate the durable index from the captured original rows before returning a normal failure.
13. Restore and Delete are independently supported exact-ID operations. They currently have no shared exclusion window: restore can register after Delete's manager check and before physical removal. The process-level root manager is the narrow existing owner for one exact-ID transition lane shared by create, restore, and an unmanaged-history-delete callback.
14. Root admission closure is not itself a materialization barrier. An accepted message or delegation may still be between its admission check and configured/task registration when shutdown drains the current queues. RootTeamRun must track those admitted promises, wait them to either register or abort, then freeze local materialization and capture one exact recursive termination scope before interruption begins.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: `memory/team_run_history_index.json` contains one exact row per root; `memory/agent_teams/<rootTeamRunId>/` contains that root's execution tree/task records/team messages/member histories. The screenshot group has 37 history rows, including three recent distinct IDs.
- Relevant code-model, serialization, semantic, or physical-store change: none. The feature invokes existing exact-root disposal after lifecycle termination.
- Normal readers and writers: `TeamRunHistoryCatalogService` owns catalog rows and physical root directories; `TeamRunHistoryService` projects them; runtime services write while active.
- Representative direct-read evidence: live GraphQL identity/state and the index were inspected without mutation; exact IDs and status distinction agree.
- Required semantics and invariants preserved by direct use: retained roots remain directly usable; only the confirmed exact root is discarded; active package deletion remains forbidden at the catalog boundary.
- Decision: `Directly usable — no migration` for retained data; explicit discard for confirmed target.

## Constraints / Dependencies / Compatibility Facts

- Exact `teamRunId` is authoritative across UI, GraphQL, runtime, catalog, and directory resolution.
- Member `offline` and root `isActive` are intentionally independent.
- Root termination may drain open delegated work and member runtimes; active delete must not bypass it.
- Pending tool approval is open work that requires explicit interruption/cancellation by termination; waiting for spontaneous quiescence is not sufficient.
- The manager must distinguish `owned/in-flight termination` from `admitting new work`; a non-admitting root must not become restorable until the existing root reaches a terminal outcome.
- Catalog deletion validates a safe non-path ID and refuses active roots.
- Current generic modal copy is insufficient for an active-delete consequence.
- Existing independent Agent and archive behavior must remain out of this change.

## Open Unknowns / Risks

- The target design must avoid leaving an exact Team WebSocket registration after successful active deletion.
- A partial stop-success/delete-failure state must be represented as inactive retained history, not rolled back or hidden.
- The native conversation restoration failure is material evidence but remains a separate defect unless the user explicitly expands this ticket.
- The design must use existing AgentRun interrupt semantics rather than introduce a second generic approval-cancellation or termination framework.

## Notes For Architecture Reviewer

Do not reinterpret all-members-offline as root inactivity. Review both verified states: (1) active root, both configured members offline, `hasOpenExecutionWork=false`; and (2) active professor turn blocked at tool approval, `hasOpenExecutionWork=true`, stop mutation waiting on quiescence. For SR-002, also verify the admitted-message/delegation stabilization boundary, one frozen retry scope, the manager exact-ID create/restore/delete lane, and DS-007 candidate-index/package compensation. No data migration, combined stop-delete API, second runtime manager, generic filesystem journal, or broad tool-approval redesign is requested.
