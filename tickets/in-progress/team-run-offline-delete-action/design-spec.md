# Design Spec

## Current-State Read

The defect crosses one UI action spine and one runtime lifecycle spine, but it does not require a new subsystem.

- The TeamRun parent row owns whole-run actions. It currently renders Stop when `team.isActive` and renders Archive/Delete only when inactive. Member rows are navigation/focus surfaces.
- The delete composable repeats the active-root prohibition, while `TeamRunHistoryCatalogService` independently and correctly refuses physical deletion of an active root.
- `RootTeamRun` is the root shutdown owner. It closes root admission, settles delegated-task records, and terminates materialized `TeamRun`s.
- `MixedTeamManager` already owns every materialized configured Agent, configured sub-Team, delegated task Agent, and delegated/nested Team below one local `TeamRun`. No parallel execution registry is needed.
- `AgentRun.interrupt()` already owns provider-specific active-turn interruption and the terminal tool/turn events required to cancel a pending approval. `AgentRun.prepareTermination()` closes Agent input and waits for canonical quiescence, but it does not itself interrupt the turn.
- Current root shutdown reaches `AgentRun.prepareTermination()` without first issuing an interrupt. A tool-approval turn therefore prevents quiescence and leaves the GraphQL stop mutation pending.
- Closing root admission and draining the task/persistence queues does not join every operation that already passed admission. Configured-member activation and delegated Agent/Team preparation can still be awaiting materialization before task-queue submission, so a later registry enumeration is not necessarily stable.
- `AgentTeamRunManager.getTeamRun()` and `TeamRunResolver.getActive()` remove a run from their maps when its admission-facing `isActive()` becomes false. This incorrectly treats `terminating` as unowned/terminal and can expose an inactive projection before teardown finishes.
- Termination promises at RootTeamRun, TeamRun/MixedTeamManager, and AgentRun level are permanently retained even after a rejected or thrown nonterminal attempt. That makes the required same-object retry impossible.
- Current history deletion checks root activity once before its queued work, flushes an index without the row, publishes that in-memory state, and only then recursively removes the package. Concurrent restore can register after the check, and package-removal failure can occur after the durable retry row is gone.
- Existing stop-only already performs the correct client stream/member-status cleanup after a successful GraphQL termination. Existing history delete already removes the exact history/resume/context/selection state. `useWorkspaceHistoryMutations` is the narrow existing UI owner that can sequence those two operations after one confirmation.

The exact runtime evidence and production-path details are authoritative in `investigation-notes.md` and `runtime-reproduction-evidence.md`.

## Intended Change

1. Separate **nonterminal ownership** from **new-work admission** for root and nested TeamRuns. A terminating or failed-but-retryable run remains owned until accepted terminal completion.
2. Add two explicit root-shutdown-only local phases across the existing materialized Team tree:
   - dispatch `AgentRun.interrupt()` to every active leaf turn, treating only `NO_ACTIVE_TURN` as a benign no-op;
   - prepare every materialized AgentRun for termination so canonical tool/turn settlement and input quiescence finish before any descendant provider is terminated.
3. Before those phases, close one RootTeamRun-owned admitted-materialization gate, await every operation that already passed admission until it either registers or aborts its candidate, then synchronously freeze local materialization and capture one recursive exact termination scope. The same frozen scope is retained for retry.
4. Preserve existing deepest-first task-record settlement, then terminate all captured descendant TeamRuns/AgentRuns, with the root TeamRun last.
5. Share one termination promise only while an attempt is in flight. If a nonterminal attempt rejects or returns `accepted: false`, retain the same frozen/prepared execution objects but release the promise so a later stop retries them.
6. Emit/persist terminal root state and release manager ownership only after every descendant succeeds.
7. Serialize create, restore, and unmanaged history deletion for one exact root ID through one narrow manager-owned transition lane. Catalog deletion acquires that lane inside its existing catalog queue, rechecks that the root is unmanaged, and holds exclusion through index/package completion.
8. Make catalog deletion a bounded compensating transition: retain the original row/state, flush candidate row removal without publishing it, remove the package, and publish success only after both complete. Index-write failure leaves the package and current row untouched; package-removal failure durably restores the captured index before the operation returns its normal failure result.
9. Expose permanent Delete for every persisted `READY` TeamRun parent row. For an active row, one confirmation invokes the existing stop operation and only after it succeeds invokes the existing guarded history delete. The separate stop-only action remains.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `REQ-001`, `REQ-002`; `AC-001`–`AC-003`, `AC-013` | Persisted TeamRun parent row | Investigation behavior map; screenshot; current component | Keep Stop for active rows and make Delete independently available for every `READY` persisted parent row. Member Offline remains separate presentation. | Row projection/action path, `DS-001`, `DS-002`, `DS-003` |
| `BEH-002` | System | `REQ-003`–`REQ-005`; `AC-004`–`AC-006` | Confirmed whole-TeamRun deletion | Current frontend blocks active delete; catalog deletes only inactive exact ID | Active delete composes exact stop then exact delete. Catalog holds one manager-owned exact-ID exclusion through its complete compensated index/package transition, so restore cannot register concurrently. | `DS-002`, `DS-003`, `DS-006`, `DS-007` |
| `BEH-003` | User | `REQ-006`; `AC-002`, `AC-003`, `AC-007` | Delete action / confirmation | Generic confirmation copy | Active copy says Stop + permanent delete; inactive copy says permanent history delete. Cancel has no effects. | `DS-002`, `DS-003`, `DS-006` |
| `BEH-004` | Contract | `REQ-007`, `REQ-008`; `AC-008`, `AC-009` | Same-summary TeamRuns and member hierarchy | Exact `teamRunId` already reaches server/storage | Preserve exact root identity; no summary/member selector and no member delete action. | All primary spines |
| `BEH-005` | System | `REQ-009`–`REQ-012`; `AC-010`–`AC-014`, `AC-018` | Stop/delete success or partial failure | Stop and delete currently own different client cleanup; current delete can remove the index row before package failure | Reuse stop cleanup before active deletion. Catalog publishes removal only on complete success and compensates the durable row before a package-removal failure returns, leaving inactive retryable history. | `DS-001`–`DS-004`, `DS-006`, `DS-007` |
| `BEH-006` | System | `REQ-013`–`REQ-016`; `AC-015`–`AC-019` | Stop or active delete while an active/pending or already-admitted operation can materialize a leaf | Exact runtime reproduction plus message/delegation source path | Close admission, join already-admitted materialization, freeze one exact recursive scope, interrupt all captured leaves, wait canonical quiescence, terminate every descendant, then terminalize/unregister root. Retry the same scope. | `DS-001`, `DS-004`, `DS-005` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/ui-ux-spec.md` | Exact row actions, confirmation, pending/error states, accessibility | `REQ-001`–`REQ-011`, `REQ-013`–`REQ-016`; `AC-001`–`AC-019` | Governs the frontend projection of stop/delete sequencing | Approved 2026-08-19 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/runtime-reproduction-evidence.md` | Exact pending-approval stop failure and restore control | `REQ-002`, `REQ-013`–`REQ-016`; `AC-001`, `AC-015`–`AC-019` | Proves production reachability and the reuse boundary around AgentRun interrupt | Complete; evidence only, approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/design-use-case-validation.md` | Per-case data-flow-spine self-validation | `REQ-001`–`REQ-016`; `AC-001`–`AC-019` | Checks the design's primary, return/event, and bounded-local spines against each materially different supported case | Complete; design evidence only, approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix / Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` and `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`, bounded
- Evidence: Team termination does not supersede an approval-pending turn before quiescence; already-admitted async activation/delegation can outlive current queue drains; root and nested read APIs remove non-admitting but nonterminal objects; permanent failure-promise caching defeats retry; the delete guard can race restore; and index-before-package deletion breaks visible retry on package failure.
- Design response: preserve the existing RootTeamRun -> TeamRun -> MixedTeamManager -> AgentRun ownership chain, add a RootTeamRun admitted-operation gate and one frozen recursive shutdown scope, separate owned lookup from active/admitting lookup, make termination caching in-flight-only on failure, add one manager-owned exact-ID transition lane, compensate catalog row removal on package failure, and remove the duplicated active-delete UI gate.
- Refactor rationale: a local `if` in the row would expose an unsafe action while stop can still hang and while manager ownership can disappear prematurely. The bounded lifecycle correction is required for the feature to be truthful.
- Intentional deferrals and residual risk: native conversation restoration failure remains a separate defect. This ticket makes such runs stoppable/deletable but does not repair their provider conversation state.

## Terminology

- **Managed / owned TeamRun**: the exact nonterminal runtime object retained by its manager/resolver, including while it is not accepting new commands.
- **Admitting / active TeamRun**: a managed TeamRun currently accepting normal runtime commands.
- **Terminal TeamRun**: all owned descendant executions have accepted termination; the root can be stamped/unregistered and projected inactive.
- **Root-shutdown interruption phase**: root-owned traversal that calls the existing AgentRun interrupt primitive for every materialized active leaf turn.
- **Root-shutdown quiescence phase**: root-owned traversal that prepares every materialized AgentRun and waits for canonical terminal/quiescent input state without yet terminating provider runtimes.
- **Admitted-materialization gate**: RootTeamRun-local gate that rejects new materializing operations after shutdown begins and joins every operation that entered before closure until it has registered or aborted its candidate.
- **Frozen termination scope**: the exact recursive set of configured, delegated, prepared, and nested execution objects captured after the admitted-materialization gate drains and local registries reject additions. It is retained across retries.
- **Exact-ID transition lane**: the manager-owned per-root serialization window shared by create, restore, and unmanaged history deletion. It stores no runtime and is not a second root registry.
- **Compensated catalog deletion**: catalog-local transition that withholds in-memory removal until index and package deletion both succeed and re-flushes the captured original index before returning a normal package-removal failure.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the active-root delete suppression in both the row and `useWorkspaceHistoryMutations`.
- Remove the empty `canTerminateTeam(isActive) => isActive` indirection from tree state and section contracts; use the root field directly for Stop/Archive presentation.
- Remove read-triggered unregistration from root and nested TeamRun lookup.
- Remove permanently cached failed termination attempts; retain only accepted terminal results and currently in-flight attempts.
- Remove the one-time pre-queue active-root delete check; replace it with a held exact-ID unmanaged deletion exclusion shared with create/restore.
- Remove index-state publication before package removal; replace it with one compensated catalog transition.
- Replace the fixed generic Team delete confirmation with one current dynamic active/inactive confirmation path; do not retain both.
- No compatibility wrapper, dual manager map, alternate approval-cancellation protocol, or second active-delete API is permitted.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: one TeamRun catalog row in `memory/team_run_history_index.json` and one exact root package under `memory/agent_teams/<teamRunId>/`; the observed definition has 37 rows.
- Relevant change: no file, row, serialization, or schema shape changes. Only lifecycle ordering and explicit disposal of the confirmed exact package change.
- Normal reader/writer behavior: current catalog/history readers consume retained packages unchanged. Current deletion flushes the index without the row before `fs.rm`; the target transition retains the current row/state until both operations succeed and compensates the durable index if package removal fails.
- Required semantics: non-target packages remain readable; manager-owned packages cannot be deleted; the confirmed exact terminal package may be discarded.
- Physical/operational constraints: no production mutation in automated validation; exact safe non-path ID remains mandatory; no partial member/package delete.
- Decision: `Directly Usable — No Migration`
- Rationale: retained data already has the current canonical shape, and the feature neither adds nor removes stored fields. The bounded delete compensation uses the already loaded canonical index row and does not introduce a marker, journal, alternate package shape, or migration.
- Supported IDs: `REQ-003`–`REQ-012`; `AC-004`–`AC-014`, `AC-018`, `AC-019`.

### Migration Plan

N/A — no stored representation changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `BEH-005`, `BEH-006` | Stop action | Inactive retained history row | `RootTeamRun` for gate/scope/shutdown; `TeamRunService` for API/stamp | Stop-only must stabilize and finish all descendants before inactive/delete-ready projection |
| `DS-002` | Primary End-to-End | `BEH-001`–`BEH-006` | Active-row Delete confirmation | Exact package and client row removed | `useWorkspaceHistoryMutations` for UI sequence; lifecycle/catalog owners per step | One user action safely composes existing stop and compensated delete boundaries |
| `DS-003` | Primary End-to-End | `BEH-001`–`BEH-005` | Inactive-row Delete confirmation | Exact package and client row removed | `TeamRunHistoryCatalogService` inside manager exact-ID exclusion | Inactive delete must not restore/activate concurrently and must retain a retry target on reported failure |
| `DS-004` | Return-Event | `BEH-005`, `BEH-006` | Agent/Team termination + catalog result | Team stream/history row/modal/toast | Existing stream/store owners | UI must become inactive only after terminal completion and distinguish partial failure |
| `DS-005` | Bounded Local | `BEH-006` | Root enters termination | Root terminal callback | `RootTeamRun` | Captures admitted-operation stabilization -> frozen scope -> interruption -> quiescence -> descendant termination |
| `DS-006` | Bounded Local | `BEH-002`, `BEH-003`, `BEH-005` | Delete confirmation | Stop failure, delete failure, or success | `useWorkspaceHistoryMutations` | Prevents delete before stop and gives one exact pending/failure state |
| `DS-007` | Bounded Local | `BEH-002`, `BEH-005` | Catalog Delete reaches queue head | Compensated failure or complete exact removal | `TeamRunHistoryCatalogService` with `AgentTeamRunManager` exclusion | Makes restore exclusion and the index/package success boundary explicit |

## Primary Execution Spine(s)

### `DS-001` — Stop Only

`TeamRun row Stop -> agentTeamRunStore.terminateTeamRun(teamRunId) -> terminateAgentTeamRun GraphQL -> TeamRunService -> AgentTeamRunManager managed root -> RootTeamRun closes/joins admitted-materialization gate -> frozen exact Team termination scope -> AgentRuns/backends -> root terminal callback/unregister -> catalog terminatedAt -> GraphQL success -> exact stream/member cleanup -> inactive retained history row`

### `DS-002` — Active Delete

`Active TeamRun row Delete -> active-specific confirmation -> useWorkspaceHistoryMutations -> DS-001 exact stop -> runHistoryStore.deleteTeamRun(teamRunId) -> deleteStoredTeamRun GraphQL -> TeamRunHistoryService -> TeamRunHistoryCatalogService -> DS-007 exact-ID exclusion + compensated index/package removal -> exact client history/context/selection cleanup`

### `DS-003` — Inactive Delete

`Inactive TeamRun row Delete -> inactive-specific confirmation -> useWorkspaceHistoryMutations -> runHistoryStore.deleteTeamRun(teamRunId) -> deleteStoredTeamRun GraphQL -> TeamRunHistoryService -> TeamRunHistoryCatalogService -> DS-007 exact-ID exclusion + compensated index/package removal -> exact client cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The user stops one exact root. The root closes and joins admitted materialization, freezes one exact scope, interrupts/quiesces it, settles tasks, terminates descendants, then releases root ownership and receives `terminatedAt`. | TeamRun row, RootTeamRun, frozen scope, AgentRun, catalog row | RootTeamRun | lifecycle publication, task persistence, stream cleanup |
| `DS-002` | The confirmed active delete reuses stop-only and does not enter compensated physical delete until stop returned success. | TeamRun row, active root, terminal package | UI mutation owner plus existing server owners | confirmation, pending state, partial-failure toast |
| `DS-003` | The inactive exact package enters the catalog's held unmanaged-root exclusion; a concurrent restore either wins first and makes delete reject or waits until deletion has completed. | TeamRun history row/package | TeamRunHistoryCatalogService | safe path ID, local selection cleanup |
| `DS-004` | Agent terminal events unblock quiescence; only root terminal ownership release emits inactive. Client stores then update exact runtime/history presentation. | Agent event, root lifecycle, client context | Existing AgentRun/manager/store publishers | status projection and quiet refresh |
| `DS-005` | Root shutdown joins all admitted materialization, freezes a stable recursive object set, orders interruption/quiescence/settlement/finish, and retries that same scope. | RootTeamRun, frozen local Team scopes, AgentRuns | RootTeamRun | delegated task settlement and persistence drain |
| `DS-006` | One pending delete target stores exact identity and whether stop is required; cancel is side-effect-free and failures select truthful recovery copy. | Pending delete target | useWorkspaceHistoryMutations | modal and toasts |
| `DS-007` | At the catalog queue head, one exact-ID manager lane excludes create/restore. The catalog keeps current state, flushes candidate row removal, removes the package, then publishes success; package failure first compensates the durable original index. | exact root ID, index row set, root package | TeamRunHistoryCatalogService | manager exclusion, index writer, package catalog admission |

## Spine Actors / Main-Line Nodes

- `WorkspaceHistoryWorkspaceSection`: renders exact root row actions.
- `useWorkspaceHistoryMutations`: owns confirmation and active stop-then-delete UI sequencing.
- `agentTeamRunStore`: existing stop request and exact runtime-client cleanup.
- `runHistoryStore`: existing exact stored-history request and local history cleanup.
- `TeamRunService`: application-facing root lifecycle/stamp boundary.
- `AgentTeamRunManager`: process owner of exact nonterminal RootTeamRun identities.
- `RootTeamRun`: governing admission/materialization gate, frozen-scope capture, and root shutdown order.
- `FrozenTeamRunTerminationScope`: one exact recursive shutdown object set retained for the root attempt and retry.
- `TeamRun` / `MixedTeamManager`: one local TeamRun, materialization freeze, and its materialized direct execution set.
- `AgentRun`: leaf turn interruption, canonical quiescence, and provider termination.
- `TeamRunHistoryService` / `TeamRunHistoryCatalogService`: stored-history facade and physical exact deletion.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| UI mutation composable | modal target, active/inactive copy, stop-before-delete sequence, pending/toast outcome | server lifecycle truth or filesystem deletion |
| TeamRunService | public termination call and terminal history stamp | descendant traversal |
| AgentTeamRunManager | exact root registration, managed vs active lookup, exact-ID create/restore/delete transition lane, same-root termination joining, final unregister notification | member interruption policy or physical history deletion |
| RootTeamRun | root admission/materialization gate, frozen-scope capture, phase order, task shutdown, final terminal transition | provider-specific approval cancellation |
| FrozenTeamRunTerminationScope | immutable object-identity traversal for interrupt, quiescence, and finish across retry | new materialization, root catalog state, or task-record mutation |
| TeamRun/MixedTeamManager | freeze local materialization; capture direct configured/task Agent and Team handles; aggregate local termination | root catalog stamp or UI state |
| MixedAgentMemberHandle | exact local AgentRun access and benign `NO_ACTIVE_TURN` interpretation for root shutdown | new tool-approval protocol |
| AgentRun | canonical interrupt, input quiescence, provider termination, in-flight retry cache | Team hierarchy |
| TeamRunResolver | root-private ownership of materialized TeamRuns | activity policy via destructive reads |
| History catalog | exact queued index/directory deletion, captured-row compensation, and held unmanaged-root exclusion use | stopping a runtime or root identity registration |

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL termination resolver | TeamRunService / RootTeamRun | transport result mapping | shutdown ordering |
| GraphQL history resolver | TeamRunHistoryService/catalog | transport result mapping | active-root termination |
| TeamRun | TeamRunBackend/MixedTeamManager | stable exact local Team boundary | duplicate registries |
| Pinia store actions | server lifecycle/history owners | client request and exact local synchronization | server safety decisions |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Active-root Delete `v-if` suppression | Active delete now has safe stop-first composition | Independent Stop and Delete conditions on root row | In this change | Archive remains inactive-only |
| `onDeleteTeam` active guard | Duplicates render policy and blocks approved flow | Exact pending target + stop-first confirm path | In this change | `deleteLifecycle === READY` remains |
| `canTerminateTeam` pass-through | Empty indirection | Direct `team.isActive` checks | In this change | Remove from contracts/tests |
| Root manager read-pruning | Drops nonterminal owner | Explicit active and managed lookups; unregister on terminal callback only | In this change | No compatibility alias |
| TeamRunResolver read-pruning / `unregisterInactive` | Drops partially terminating descendants | managed lookup/list + `unregisterTerminated`/explicit settlement removal | In this change | Preserve exact objects for retry |
| Permanent caching of failed termination attempt | Makes retry impossible | in-flight-only cache on nonaccepted/error | In this change | Accepted terminal result remains idempotent |
| Queue-drain-as-stable-tree assumption | Admitted activation/delegation can still materialize outside current queues | Root admitted-materialization gate + frozen recursive scope | In this change | Local registries reject additions after freeze |
| One-time pre-queue active-root delete guard | Restore can register after the check | Manager exact-ID transition lane held by catalog through completion | In this change | Create/restore use the same lane |
| Index state publication before package removal | Package failure loses visible durable retry row | Captured original rows + candidate flush + compensation before normal failure | In this change | No persisted marker/journal |
| Fixed generic Team delete message | Cannot describe stop consequence | active/inactive computed copy | In this change | Agent-run delete copy remains separate |

## Return Or Event Spine(s)

`AgentRun backend terminal event -> AgentRun event pipeline/input admission -> quiescence waiter resolves -> local prepared termination -> descendant finish -> RootTeamRun terminal -> AgentTeamRunManager unregister + isActive=false lifecycle -> Team stream/store -> member offline + row inactive -> Stop UI completes`

`Catalog delete result -> on complete index/package success: runHistoryStore exact cleanup -> Team context/resume/history/selection removed -> tree refresh -> success toast`

`Catalog index/package failure -> original catalog state remains or is durably compensated -> exact inactive history remains -> failure result -> refresh retains retryable row -> partial-failure toast`

No inactive root lifecycle event is emitted on termination start or nonterminal failure.

## Bounded Local / Internal Spines

### `DS-005` — RootTeamRun shutdown state machine

Parent owner: `RootTeamRun`

`close external admission + admitted-materialization gate -> await every admitted materializing operation to register or abort -> drain task/persistence queues -> close TeamRunResolver registration + freeze local materialization/capture recursive scope -> dispatch interrupts to all captured active leaf turns -> wait all captured leaf AgentRuns prepared/quiescent -> deepest-first task record interruption/settlement -> finish captured descendants -> mark root terminated -> unregister exact root -> persist terminatedAt`

Invariants:

1. Root methods that can reach `requireTeamRun`, configured `ensureReady`, direct-input reservation, or delegated Agent/Team preparation enter the gate before their first admission-dependent await and release it only after registration/abort is complete. This includes user/member execution commands, ordinary/exact Team delivery, and delegation submit/review flows that can notify a member.
2. Closing the gate is synchronous with root shutdown admission closure. New entrants reject. Operations already inside either complete their authoritative registration/queue commit or abort/cancel their prepared handles and reservations; shutdown awaits all of them.
3. Only after the gate and current task/persistence queues drain does RootTeamRun close TeamRunResolver registration and call `rootRun.freezeForRootTermination()`. Each MixedTeamManager synchronously closes configured/task materialization, captures deduplicated active and prepared handles/TeamRuns, recursively freezes materialized children, and returns one `FrozenTeamRunTerminationScope`.
4. The scope, not a later registry enumeration, is the shutdown source of truth. It is cached on RootTeamRun and retained after a nonterminal failure. Task settlement may remove registry entries, but it cannot remove object references from the scope.
5. Interrupt dispatch is a whole-scope phase. Local traversal starts all available leaf interruptions before the following quiescence phase waits.
6. `NO_ACTIVE_TURN` is a successful no-op; any other interrupt rejection/error is a nonterminal stop failure.
7. Preparation waits for canonical `TURN_INTERRUPTED`/terminal processing and submitted-input quiescence. A provider interrupt acknowledgment alone is not treated as settled.
8. Provider termination begins only after the quiescence phase completes for the captured tree. Existing task settlement remains deepest-first and is allowed to operate on already captured/prepared objects while materialization is closed.
9. Root terminal/unregister happens only after every captured `finish()` returns accepted.
10. A failed attempt retains ownership and the frozen scope and releases only the in-flight promise, so retry reuses the same prepared/committed objects. Successfully terminated children remain idempotent.

### `DS-006` — Delete confirmation

Parent owner: `useWorkspaceHistoryMutations`

`target exact parent row -> capture teamRunId + active consequence -> open correct confirmation -> cancel OR mark exact delete pending -> if active await existing terminateTeamRun -> if termination failed retain row/error -> else await existing deleteTeamRun -> success cleanup OR inactive retained partial-failure`

### `DS-007` — Exact catalog deletion transition

Parent owner: `TeamRunHistoryCatalogService`; exact root-transition exclusion owner: `AgentTeamRunManager`

`catalog queue head -> manager exact-ID transition lane -> recheck no managed root -> capture original rows/current row -> flush candidate index without row -> remove exact canonical package -> publish in-memory rows + package-catalog exclusion -> success`

Failure branches:

- Candidate index flush throws/fails: the catalog never changes `state.rows`, never calls package removal, retains package admission, and returns failure.
- Package removal throws under the supported single-operation failure model: the catalog re-flushes the captured original rows, verifies the exact original row and canonical execution tree are again readable, retains package admission and `state.rows`, then returns failure. It must not return the ordinary `{ success: false }` before that compensation/validation completes.
- Success is authoritative only after candidate index persistence and canonical package removal both complete. Only then does the catalog replace in-memory rows, exclude the ID from `TeamRunV1PackageCatalog`, release the exact-ID lane, and return success.
- The exact-ID lane is also used by manager create/restore from their initial duplicate/managed check through root registration. Therefore either restore registers first and Delete rechecks/rejects, or Delete holds exclusion until completion and restore cannot load/register the disappearing package.

Bounded failure assumption: this ticket covers deterministic application I/O failure at the candidate index write or package-removal operation and the required single compensation. Simultaneous failure of the compensating index write, external filesystem tampering, process/power loss, or partial media corruption is not added as a generic transaction/journal problem in this ticket.

## Off-Spine Concerns Around The Spine

| Concern | Related Spines | Serves Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Tool approval cancellation | `DS-001`, `DS-005` | AgentRun | provider-specific interrupt and canonical terminal events | Already supports all runtime kinds | Team layer could invent conflicting approval semantics |
| Admitted-operation stabilization | `DS-001`, `DS-005` | RootTeamRun | join operations that passed root admission before frozen-scope capture | Existing queues do not cover pre-queue activation/delegation preparation | A late descendant can survive root terminality |
| Frozen execution scope | `DS-001`, `DS-005` | TeamRun/MixedTeamManager | close local materialization and retain exact descendant object references through retry | Registry membership can change during settlement | Re-enumeration can omit or replace an execution |
| Task record settlement | `DS-001`, `DS-005` | RootTeamRun/TaskDelegationService | mark active tasks interrupted and persist deepest-first settlement | Retains execution-tree/task invariants | UI/manager would bypass durable task state |
| Lifecycle projection | `DS-004` | AgentTeamRunManager | publish active until terminal, inactive once | Prevents premature delete-ready UI | Root read lookup could unregister early |
| Confirmation/toasts | `DS-002`, `DS-003`, `DS-006` | UI mutation owner | consequence and partial failure | User-facing truth | Server domain would acquire presentation policy |
| Path safety/catalog serialization | `DS-002`, `DS-003` | History catalog | safe ID, queued index/filesystem mutation | Physical deletion safety | Frontend cannot enforce storage truth |
| Exact root transition exclusion | `DS-002`, `DS-003`, `DS-007` | AgentTeamRunManager | serialize create/restore/unmanaged deletion for one ID | Prevents live root/package race | One-time catalog lookup can become stale |
| Delete compensation | `DS-002`, `DS-003`, `DS-007` | History catalog | keep original state and durably restore it before normal package-failure result | Preserves visible retry target | UI cannot reconstruct a deleted index row |
| Client stream/context cleanup | `DS-001`, `DS-002`, `DS-004` | Existing Pinia stores | exact disconnect/status/history/selection cleanup | Avoid stale deleted runtime UI | Component-local cleanup would fragment state |

## Ownership Boundaries

- Normal command callers use active/admitting root lookup. Termination, deletion guards, lifecycle projection, and restore exclusion use managed/nonterminal lookup.
- `AgentTeamRunManager` remains the only process-level root directory. Callers must not infer ownership from `RootTeamRun.isActive()`.
- `AgentTeamRunManager` also owns the narrow per-ID transition lane because it is the only owner that can atomically order root registration against an unmanaged-history delete. The lane contains no runtime object and is not an alternate root registry.
- `TeamRunResolver` remains private to one RootTeamRun and retains each materialized nested TeamRun until explicit terminal/settlement removal.
- RootTeamRun owns admitted-operation stabilization, then obtains one frozen recursive scope through TeamRun; it never reaches directly into AgentRun registries.
- MixedTeamManager freezes and snapshots its existing configured/task registries once; it does not create a shadow runtime registry. The returned scope retains object references only for the bounded shutdown attempt/retry.
- MixedAgentMemberHandle is the only Team backend object allowed to obtain the local AgentRun and call its existing interrupt/preparation methods.
- Physical delete never invokes termination. It enters the manager's unmanaged-history exclusion, verifies no managed root exists, and owns only the compensated index/package transition.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulated Mechanisms | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| TeamRunService | manager + catalog termination stamp | GraphQL/application orchestration | resolver calling RootTeamRun and catalog separately | add lifecycle method to service |
| AgentTeamRunManager | managed root map + exact-ID transition lane + lifecycle listeners | TeamRunService, projections, catalog safety boundary | callers reading map, unregistering on `isActive`, or checking then mutating outside the lane | explicit active/managed and unmanaged-delete methods |
| RootTeamRun | admitted-materialization gate, task service, resolver, persistence, frozen root scope | manager | manager traversing members or assuming queue drain freezes materialization | extend RootTeamRun shutdown method |
| TeamRun/MixedTeamManager | configured/task registries, materialization freeze, frozen local scope | RootTeamRun/TaskDelegationService | RootTeamRun calling AgentRunManager or later re-enumerating registries | add exact freeze/capture method |
| AgentRun | backend interrupt/quiescence/termination | MixedAgentMemberHandle | Team layer approving/denying tool directly | reuse AgentRun methods |
| History catalog | index store + package directory + captured-row compensation | TeamRunHistoryService | UI deleting filesystem/index or publishing row removal before package success | keep complete DS-007 inside catalog |

## Dependency Rules

Allowed:

- UI section -> UI action contract -> history mutation composable -> existing Team and history stores.
- GraphQL -> TeamRunService -> AgentTeamRunManager -> RootTeamRun.
- RootTeamRun admitted gate -> TeamRun freeze facade -> TeamRunBackend/MixedTeamManager -> frozen scope -> handles -> AgentRun.
- RootTeamRun -> TaskDelegationService and persistence coordinator within the existing root boundary.
- TeamRunHistoryService -> TeamRunHistoryCatalogService -> exact storage.
- Catalog queue -> narrow `withUnmanagedHistoryDeletion(teamRunId, operation)` manager exclusion -> catalog-owned mutation.
- Manager create/restore -> the same private exact-ID transition lane -> root register before lane release.

Forbidden:

- Member status, summary, address, or AgentRun ID deciding root deletion.
- Catalog or GraphQL history resolver stopping a TeamRun.
- RootTeamRun directly enumerating AgentRunManager globals.
- A materializing RootTeamRun operation awaiting outside the admitted-operation gate, or a registry accepting new prepared/active executions after freeze.
- New provider/tool-approval cancellation code in Team classes.
- Any read method unregistering a nonterminal root/nested TeamRun.
- A second manager map, compatibility alias, or alternate active-delete mutation path.
- Emitting inactive or deleting storage before all descendant termination finishes.
- Checking managed ownership once and releasing it before index/package deletion finishes.
- Publishing in-memory index removal before package deletion succeeds or returning ordinary package failure before durable row compensation.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `AgentTeamRunManager.getActiveTeamRun` | admitting RootTeamRun | normal command/event ingress lookup | exact `teamRunId` | no mutation on read |
| `AgentTeamRunManager.getManagedTeamRun` | nonterminal RootTeamRun | termination join/projection/safety lookup | exact `teamRunId` | returns terminating/retryable root |
| `AgentTeamRunManager.hasManagedTeamRun` | root ownership observation | workspace/projection/read-only safety checks | exact `teamRunId` | not sufficient for asynchronous deletion |
| `AgentTeamRunManager.withUnmanagedHistoryDeletion` | exact root identity transition | serialize catalog deletion with create/restore and hold unmanaged recheck | exact `teamRunId` + catalog callback | callback runs only while root remains excluded; no runtime shutdown |
| `AgentTeamRunManager.terminateTeamRun` | root termination | join/start exact root attempt | exact `teamRunId` | unregister only terminal callback |
| `RootTeamRun.terminate` | rooted execution | own DS-005 sequence | intrinsic exact root | in-flight-only failed-attempt cache |
| `RootTeamRun` admitted-operation gate | root materialization admission | wrap/join operations that can materialize before shutdown scope capture | intrinsic exact root | private owned mechanism, not a public generic queue |
| `TeamRun.freezeForRootTermination` | local Team subtree | close local materialization and return exact recursive scope | intrinsic TeamRun | called once after root gate/queues drain |
| `FrozenTeamRunTerminationScope.interruptActiveTurns` | captured Team subtree | whole-scope interrupt dispatch phase | captured intrinsic identities | no provider termination |
| `FrozenTeamRunTerminationScope.prepareMemberRuns` | captured Team subtree | recursive AgentRun quiescence phase | captured intrinsic identities | no task record mutation/provider stop |
| `FrozenTeamRunTerminationScope.finish` | captured Team subtree | finish same captured descendants | captured intrinsic identities | idempotent accepted children; retry unresolved objects |
| `TeamRun.isTerminated` | local TeamRun | explicit ownership terminal check | intrinsic TeamRun | replaces `!isActive` inference |
| `TeamRunHistoryCatalogService.deleteTeamRun` | stored root package | DS-007 held-exclusion compensated physical delete | exact safe `teamRunId` | returns normal failure only with original durable retry target |
| `useWorkspaceHistoryMutations.onDeleteTeam` | TeamRun row | active/inactive confirmation target | exact `teamRunId` + consequence snapshot | no member selector |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| active root lookup | Yes | Yes | Low | clean-cut rename from ambiguous lookup |
| managed root lookup | Yes | Yes | Low | add explicit method |
| unmanaged history deletion exclusion | Yes | Yes | Low | manager lane shared with create/restore |
| admitted-materialization gate | Yes | intrinsic exact root | Low | keep private to RootTeamRun |
| freeze/capture termination scope | Yes | intrinsic exact subtree | Low | immutable object references for one root shutdown |
| scope interrupt/quiescence/finish | Yes | captured exact subtree | Low | keep phases separate from task settlement |
| delete stored TeamRun | Yes | Yes | Low | retain safe path validation |
| UI delete target | Yes | Yes | Low | store root ID, never focused member |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Process-owned root | managed RootTeamRun | Yes | Low | use `managed`, not `activeRoots` |
| Command-admitting root | active RootTeamRun | Yes | Low | explicit lookup |
| Materialized nested runtime | managed TeamRun | Yes | Low | resolver retains until terminal |
| Root accepted async work | admitted materializing operation | Yes | Low | distinguish from provider turn/open task |
| Immutable shutdown set | frozen TeamRun termination scope | Yes | Low | distinguish object snapshot from runtime registry |
| Serialized exact identity change | exact-ID transition lane | Yes | Low | never call it a second root manager |
| Leaf pretermination | member-run termination preparation | Yes | Low | avoid generic shutdown helper |
| Whole stored history | TeamRun history/package | Yes | Low | never call member history |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Pending approval cancellation | AgentRun interrupt/backend adapters | Reuse | Already produces supported terminal semantics across runtimes |
| Input quiescence | AgentRun prepared termination | Reuse | Waits canonical turn/input settlement |
| Descendant traversal | MixedTeamManager configured/task registries | Extend | Already authoritative for all materialized direct executions |
| Admitted async stabilization | RootTeamRun operation boundary | Extend | Root already owns admission and can join the exact operations that may materialize descendants |
| Stable shutdown object set | TeamRun/MixedTeamManager registries | Extend | Freeze/capture once after the gate drains; do not invent another live registry |
| Root identity/lifecycle | AgentTeamRunManager | Extend | Existing process owner needs explicit managed lookup |
| Restore/delete exclusion | AgentTeamRunManager exact root identity ownership | Extend | One per-ID lane can serialize registration and unmanaged deletion without moving storage into manager |
| Nested identity/lifecycle | TeamRunResolver | Extend | Existing root-private owner needs nonterminal retention |
| Stop client cleanup | agentTeamRunStore | Reuse | Already disconnects exact stream and clears member runtime state |
| History cleanup | runHistoryStore/mutation actions | Reuse | Already removes exact row/resume/context/selection |
| Physical deletion | history catalog | Extend transition | Existing queue/path ownership is correct; ordering/compensation is not |
| Active delete sequencing | useWorkspaceHistoryMutations | Extend | Existing confirmation/pending/toast owner |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team root lifecycle | ownership, admitted gate, exact-ID lane, phase order, final event | `DS-001`, `DS-004`, `DS-005`, `DS-007` | AgentTeamRunManager/RootTeamRun | Extend | no new runtime manager |
| Mixed local Team execution | materialization freeze, captured descendant traversal/preparation/finish | `DS-005` | TeamRun/MixedTeamManager/frozen scope | Extend | reuse registries and retain object refs only |
| Agent execution | interrupt/quiescence/provider stop/retry | `DS-005` | AgentRun | Extend cache semantics only | no Team policy |
| Run history persistence | held unmanaged exclusion, compensated exact package delete | `DS-002`, `DS-003`, `DS-007` | History service/catalog | Extend catalog transition | no stop orchestration |
| Workspace history UI | row actions/confirmation/sequence/toasts | `DS-001`–`DS-003`, `DS-006` | component/composable/stores | Extend | no new menu |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `root-team-run.ts` | root lifecycle | RootTeamRun | admitted-operation gate, frozen-scope cache, DS-005 orchestration and retry | governing state machine | frozen scope |
| `frozen-team-run-termination-scope.ts` | Team lifecycle | captured scope contract | exact interrupt/quiescence/finish surface retained through retry | same tight type crosses Team facade/backend | new tight shared contract |
| `agent-team-run-manager.ts` | root lifecycle | Manager | managed/active lookup, exact-ID transition lane, terminal unregister | process root identity owner | lifecycle snapshot |
| `mixed-team-manager.ts` | local Team | MixedTeamManager | close materialization, capture recursive scope, retryable finish | existing registry owner | frozen scope |
| `mixed-agent-member-handle.ts` | local Team | Agent handle | exact AgentRun interrupt/preparation | owns local run pointer | AgentOperationResult |
| `team-run-resolver.ts` | local Team | resolver | nonterminal nested ownership | existing root-private directory | none |
| `task-delegation-service.ts` | root task lifecycle | task service | close/abort admitted prepared activation and drain before freeze; settle captured tasks | existing delegation owner | existing reservations/prepared task execution |
| `team-run-history-catalog-service.ts` | history | catalog | held exclusion, candidate index, package removal, compensation/publish | existing exact storage owner | captured original row set |
| `useWorkspaceHistoryMutations.ts` | UI | composable | active/inactive delete sequence | existing mutation owner | pending target shape local |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owner | Decision | Redundancy Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Active vs managed root lookup | No new file; manager methods | AgentTeamRunManager | Keep methods on owner | Yes | Yes | generic run registry |
| Frozen root-shutdown phases | `domain/frozen-team-run-termination-scope.ts` | Team execution | One narrow scope type is returned by TeamRun/backend and implemented by MixedTeamManager | Yes | Yes | generic lifecycle framework or live registry |
| Admitted-operation counter/waiters | No new shared file; private RootTeamRun gate | RootTeamRun | Used by one owner only | Yes | Yes | application-wide operation queue |
| Exact-ID operation chaining | No new shared file; private manager lane plus narrow public method | AgentTeamRunManager | Used only to serialize registration and unmanaged deletion | Yes | Yes | second root registry or generic lock service |
| Catalog candidate/original rows | Local values in `deleteTeamRun` | History catalog | One mutation only; no reusable transaction type | Yes | Yes | generic filesystem transaction/journal |
| Pending delete target | local type in composable | UI mutation owner | Keep local | Yes | Yes | global modal state |

Only the frozen Team termination scope crosses an existing Team facade/backend boundary and merits a shared domain contract. The root gate, manager lane, and catalog compensation remain private to their single owners.

## Shared Structure / Data Model Tightness Check

| Structure | Clear Meaning Per Field? | Redundancy Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunLifecycleSnapshot { teamRunId, isActive }` | Yes, if `isActive` means nonterminal root lifecycle | Yes | Medium current | publish false only on terminal ownership release; document contract |
| `FrozenTeamRunTerminationScope` | Yes: one captured object set and three ordered shutdown capabilities | Yes | Low | no lookup/materialization methods and no mutable registry exposure |
| Pending Team delete target `{ teamRunId, wasActive }` | Yes | Yes | Low | do not store summary/member IDs |
| `AgentOperationResult` | Existing | N/A | Low | interpret only `NO_ACTIVE_TURN` as benign in root-shutdown interrupt phase |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Concern | Why This File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Agent execution | AgentRun | clear failed/rejected termination promise for same-object retry; retain accepted idempotency | existing leaf lifecycle owner | existing prepared result |
| `.../agent-team-execution/domain/frozen-team-run-termination-scope.ts` | Team execution | frozen scope contract | exact interrupt, member preparation, and finish methods over one captured object set | crosses existing Team facade/backend boundary | new tight domain contract |
| `.../agent-team-execution/backends/team-run-backend.ts` | Team execution | backend contract | `freezeForRootTermination` and terminal check | exact Team backend boundary | frozen scope |
| `.../domain/team-run.ts` | Team execution | TeamRun facade | forward freeze/capture and `isTerminated` | stable facade | frozen scope/backend contract |
| `.../backends/mixed/mixed-team-run-backend.ts` | Team execution | adapter | delegate freeze/capture and terminal check | current adapter | frozen scope |
| `.../backends/mixed/mixed-team-manager.ts` | Team execution | MixedTeamManager | close local materialization, deduplicate/capture configured + active/prepared task handles/Teams recursively, implement retryable frozen scope | authoritative local registry owner | frozen scope + existing handles |
| `.../backends/mixed/members/mixed-configured-member-registry.ts` | Team execution | configured registry | reject new configured handle/materialization after freeze; expose existing materialized handles for capture | current configured registry | existing handles |
| `.../backends/mixed/members/mixed-task-agent-execution-registry.ts` | Team execution | task-Agent registry | reject prepare/activation additions after freeze; expose deduplicated active + prepared handles for capture/settlement | current task-Agent registry | existing handles |
| `.../backends/mixed/members/mixed-task-team-execution-registry.ts` | Team execution | task-Team registry | reject prepare/registration additions after freeze; expose deduplicated active + prepared TeamRuns for recursive capture/settlement | current task-Team registry | existing TeamRuns |
| `.../members/mixed-agent-member-handle.ts` | Team execution | Agent handle | exact leaf interrupt/preparation; benign no-active result | owns AgentRun pointer/readiness | AgentOperationResult |
| `.../members/mixed-sub-team-member-handle.ts` | Team execution | sub-Team handle | recurse only into materialized child | owns child pointer | TeamRun methods |
| `.../services/team-run-resolver.ts` | Team execution | nested directory | active vs managed lookup/list, close registration before freeze, explicit terminal removal | current root-private registry | none |
| `.../task-delegation/task-delegation-service.ts` | Team tasks | TaskDelegationService | admitted prepared activation abort/commit and queue drain before freeze; deepest-first shutdown settlement on captured objects | current task owner | prepared task/reservation types |
| `.../domain/root-team-run.ts` | Root lifecycle | RootTeamRun | private admitted-materialization gate, wrap materializing entry methods, frozen-scope cache, DS-005 order, terminal state, retry cache | governing root owner | frozen scope |
| `.../services/agent-team-run-manager.ts` | Root lifecycle | Manager | managed map, explicit lookup, private per-ID transition chaining, create/restore participation, held unmanaged-history-delete callback, terminal-only unregister | process exact root owner | lifecycle snapshot |
| Root-manager consumers named below | projections/safety | existing owners | select active or managed lookup intentionally | call-site contract update | manager interface |
| `.../run-history/services/team-run-history-catalog-service.ts` | persistence | catalog | enter held unmanaged exclusion at queue head; capture original rows; candidate index flush; package removal; compensation/validation; publish only success | physical delete owner | manager exclusion callback + local row maps |
| `.../run-history/services/team-run-v1-package-catalog.ts` | persistence admission | package catalog | exclude exact package only after DS-007 success; retain admission on compensated failure | current package admission owner | none |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | UI | row | independent Stop/Delete rendering/disabled state | current row owner | action contract |
| `.../WorkspaceAgentRunsTreePanel.vue` | UI | panel | dynamic confirmation message wiring | existing modal owner | composable state |
| `.../workspaceHistorySectionContracts.ts` | UI | contract | remove `canTerminateTeam` | current section boundary | no new type |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | UI | tree state | remove empty termination predicate | existing navigation owner | none |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | UI | mutation owner | active stop-then-delete, exact pending state, partial errors | current sequencing owner | local tight target |

## Applied Patterns

- **State machine** inside RootTeamRun: active -> terminating/retryable -> terminated. It controls admission, admitted-operation stabilization, one frozen scope, phase order, and the sole terminal callback.
- **Quiescence barrier** private to RootTeamRun: counts only admitted operations capable of materialization and joins them before scope capture.
- **Registry** inside AgentTeamRunManager and TeamRunResolver: explicit managed and active lookup over one authoritative map; no duplicate runtime registry.
- **Keyed serialization lane** private to AgentTeamRunManager: orders create/restore registration against one exact unmanaged history deletion without owning storage.
- **Adapter** at TeamRunBackend/MixedTeamRunBackend: forwards exact local lifecycle capabilities to MixedTeamManager.
- **Compensating state transition** inside the history catalog: candidate index removal is not published until package removal succeeds; package failure restores the captured durable rows.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/` | Folder | Team domain | RootTeamRun gate/state, TeamRun facade, frozen termination-scope contract | current domain location | frontend or catalog policy |
| `.../backends/mixed/` | Folder | mixed local Team runtime | local materialization freeze, exact scope capture, member handles | current backend owner | root catalog policy |
| `.../services/agent-team-run-manager.ts` | File | process root owner | managed identity/lifecycle and exact-ID transition lane | current manager | member registry or storage mutation |
| `.../services/team-run-resolver.ts` | File | root-private nested owner | managed nested identity and registration closure | current resolver | provider logic |
| `.../task-delegation/task-delegation-service.ts` | File | root task owner | prepare/activation abort-or-commit and queue stabilization | current task owner | root terminal publication |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | leaf owner | retryable termination cache | current AgentRun | Team traversal |
| `autobyteus-server-ts/src/run-history/services/` | Folder | history | held-exclusion compensated exact delete | current persistence boundary | runtime shutdown or identity registration |
| `autobyteus-web/components/workspace/history/` | Folder | history UI | row/modal presentation | current surface | backend lifecycle |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | File | UI use case | active/inactive delete sequence | existing mutation coordinator | storage safety logic |

Root-manager consumer call-site audit is mandatory in:

- `TeamRunService`
- `TeamRunLiveProjectionService`
- `TeamRunHistoryService`
- `TeamRunHistoryCatalogService`
- `TeamRunExecutionTreeLocationService`
- `WorkspaceRemovalGuard`
- Team stream/communication/task projection and routing services that currently call `getTeamRun`, `getActiveRun`, or `listActiveRuns`

Each call site must select active/admitting lookup for new commands and managed lookup for ownership, lifecycle projection, workspace safety, or exact tree reads. Destructive catalog deletion must use the held `withUnmanagedHistoryDeletion` boundary, not a one-time boolean lookup. Create/restore must use the same manager transition lane through registration. No ambiguous compatibility alias remains.

Root admitted-materialization call-site audit is mandatory in `RootTeamRun` for:

- `executeAgentCommand` (including `postMessage`)
- `deliverInterAgentMessage`
- `deliverExactAgentMessage`
- `delegateTask`
- `submitTaskResult`
- `reviewTaskResult`

Each method enters the private gate before its first admission-dependent asynchronous step and releases only after configured/direct-input/task registration or abort is authoritative. Task-service system notifications are covered by their enclosing submit/review operation; shutdown interruption/settlement emits no new materializing notification. `resolveRecipient`, snapshots, lifecycle reads, and platform-binding persistence do not materialize descendants and remain outside the gate.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| Team domain | Main-line domain-control | Yes | Low | Root gate/state, Team facade, and tight frozen-scope contract stay here |
| mixed backend | Persistence-provider/runtime adapter | Yes | Low | Local execution traversal is provider/backend mechanics |
| Team services | Main-line domain-control | Yes | Low | Process and root-private registries remain separate files |
| run history services | Persistence | Yes | Low | Physical deletion remains isolated |
| web history component/composable | Presentation/application UI | Yes | Low | Existing split already matches rendering vs mutation sequencing |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Root lookup | `getActiveTeamRun(id)` for a command; `getManagedTeamRun(id)` for stop/guard | `getTeamRun(id)` that unregisters when `isActive` is false | Ownership and admission are different facts |
| Stop ordering | `close gate -> join admitted materialization -> freeze scope -> interrupt all -> quiesce all -> settle tasks -> finish scope -> terminal root` | `close -> drain known queues -> enumerate while a delegated preparation can still register -> unregister root` | Covers approval and already-admitted materialization races |
| Admitted message interleaving | message enters gate, pauses in `ensureReady`; Stop closes gate and waits; message either registers the handle or aborts; only then scope capture occurs | Stop snapshots registries while `ensureReady` later inserts a handle | Makes the descendant set stable without a generic queue |
| Delete/restore interleaving | catalog reaches queue head, acquires manager lane, rechecks unmanaged, holds through index/package outcome; restore uses same lane | catalog checks `hasManaged`, awaits queue/I/O, while restore registers | Protects one exact package from live runtime acquisition |
| Delete package failure | retain current state; candidate index flush; `fs.rm` fails; re-flush captured original rows + validate retry target; return failure | publish row removal, then report `fs.rm` failure | Enforces `REQ-010`/`AC-011` at the storage owner |
| Active delete | composable awaits existing Stop, then existing Delete | catalog automatically terminates; component directly deletes | Keeps lifecycle and persistence owners separate |
| Retry | one in-flight promise; clear after nonterminal failure; reuse prepared objects | cache the first false/rejected promise forever or construct replacement root | Preserves exact identity and retryability |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep ambiguous `getTeamRun` alias | reduce call-site edits | Rejected | update callers to active or managed method |
| Add second manager map for terminating roots | easy separation | Rejected | one managed map plus explicit lookup predicates |
| Add Team-specific tool denial | unblock approval | Rejected | reuse AgentRun interrupt/canonical terminal behavior |
| Keep inactive-only delete and add tooltip instructions | smallest UI edit | Rejected | approved active delete sequence |
| Add server `stopAndDeleteTeamRun` beside existing calls | atomic-looking API | Rejected | existing UI owner composes authoritative stop and guarded delete; no duplicate path |
| Add persisted lifecycle status/migration | represent stopping | Rejected | in-memory managed ownership plus existing terminal stamp is sufficient |
| Add a generic operation queue/termination framework | stabilize admitted activation | Rejected | private RootTeamRun materialization gate plus one frozen Team scope |
| Add a generic filesystem journal/transaction layer | compensate exact delete | Rejected | catalog-local captured-row compensation under the supported single-operation failure model |

## Derived Layering

Explanatory only:

`Vue row/modal -> UI mutation composable -> Pinia request/cleanup stores -> GraphQL facade -> Team lifecycle or history service -> domain owner -> runtime backend or storage`

The UI does not bypass server owners, and server facades do not bypass RootTeamRun/MixedTeamManager or the catalog.

## Change / Refactor Sequence

1. Add the manager's private exact-ID transition lane. Route create/restore through it from initial identity check through root registration; expose only the narrow held unmanaged-history-delete callback.
2. Rework catalog Delete as DS-007 inside the existing catalog queue: held manager exclusion, captured original rows, candidate index flush, package removal, compensation/validation, package-catalog exclusion and in-memory publication only on success. Add both failure positions and restore/delete interleaving coverage.
3. Add the tight `FrozenTeamRunTerminationScope` contract and `freezeForRootTermination` through TeamRunBackend, TeamRun, MixedTeamRunBackend, and MixedTeamManager. Close local materialization and capture configured plus active/prepared task Agent/Team objects recursively.
4. Add RootTeamRun's private admitted-materialization gate and wrap every current entry path that can asynchronously materialize a TeamRun/AgentRun or direct input. Close/join it before task/persistence drains and scope capture. Close TeamRunResolver registration at the same stabilization boundary.
5. Implement frozen-scope leaf interruption by reusing AgentRun interrupt and preparation; add deterministic coverage for pending approval/no-active/rejection plus message/delegation-versus-Stop interleavings and late-add rejection.
6. Change TeamRunResolver to retain managed nonterminal TeamRuns and remove only terminal/settled objects.
7. Reorder RootTeamRun shutdown to DS-005 and make RootTeamRun/frozen scope/MixedTeamManager/AgentRun termination caches retry the same objects after nonterminal failure.
8. Change AgentTeamRunManager to one managed map with explicit active/managed APIs, same-root termination joining, and terminal-only unregister/lifecycle false.
9. Update every manager/resolver caller to the correct explicit lookup or held transition boundary; preserve workspace safety.
10. Expand server unit/integration coverage before UI exposure.
11. Remove active-delete UI gates and empty `canTerminateTeam`; render independent Stop/Delete actions with combined pending disables.
12. Add active/inactive confirmation state and stop-then-delete sequencing in `useWorkspaceHistoryMutations`, reusing existing store cleanup.
13. Update component/store coverage and add realistic isolated lifecycle/API execution evidence. Do not touch production roots.
14. Remove obsolete assertions that expect read-pruning, one-time delete guards, index publication before package completion, or a permanently failed termination promise; do not retain compatibility paths.

## Key Tradeoffs

- Explicit frozen-scope `interruptActiveTurns`, `prepareMemberRuns`, and `finish` methods are preferred over a boolean mode on `prepareTermination()`. They make the approved ordering reviewable and avoid changing normal task-settlement semantics.
- One frozen scope is preferred over separately re-enumerating mutable registries for interrupt, quiescence, and finish. It retains exact object references without becoming a live registry.
- A private root admitted-operation gate is preferred over forcing configured activation and pre-queue task preparation into one generic command queue. It stabilizes only operations that can change the materialized shutdown set.
- One manager/resolver map plus explicit lookup methods is preferred over active/terminating duplicate maps, which could diverge.
- A private per-ID manager transition lane is preferred over a second global manager or catalog-owned runtime flag. It makes create/restore registration and deletion mutually exclusive while preserving their owners.
- Catalog-local compensation is preferred over a persisted generic transaction journal. The target code covers deterministic index-write/package-removal failures and does not claim power-loss or media-corruption recovery.
- Active delete remains two existing server mutations behind one UI confirmation. This is proportionate because physical deletion must remain separately guarded and stop-only must remain independently usable.
- A failed stop may leave admission closed while the exact root stays manager-owned. This is truthful and retryable; reopening partially interrupted work would be less safe and is not required.

## Risks

- If interrupt traversal omits prepared task executions or materialized nested teams, a hidden pending approval could still block shutdown. Coverage must include active and prepared task Agent/Team registries plus configured subteams.
- If any materializing root entry path bypasses the admitted-operation gate, scope capture can still miss a late execution. The call-site audit and message/delegation race tests are mandatory.
- If local task/configured registries remain open after scope capture, an internal path can violate the stable-set invariant. Freeze must reject additions while allowing settlement of captured objects.
- If lifecycle `isActive=false` is emitted at termination start, the old premature delete-ready defect remains. Tests must hold it true until terminal callback.
- If failed termination caches are not cleared consistently at all three levels, retry can remain stuck on an old result.
- Task settlement runs after leaf quiescence. Its current idempotent prepared-termination behavior must be tested so already-prepared task executions settle without reactivating or duplicating teardown.
- UI active-delete relies on exact stop success before delete. Both controls must be disabled for the same exact row while either stop or delete is pending.
- If catalog Delete acquires the manager exclusion outside the catalog queue, lock ordering can deadlock with restore catalog recording. Acquire the catalog queue first, then the manager lane; manager create/restore must release the lane immediately after registration and before awaiting catalog record updates.
- If package-removal failure is returned before compensating/validating the original durable index/tree, the visible retry contract remains broken. Ordinary failure is conditional on compensation completion.
- The bounded compensation does not cover simultaneous compensation failure, process/power loss, external tampering, or partial media corruption; adding a durable generic transaction/recovery subsystem is intentionally outside this user-approved scope.
- Native conversation restore may still fail after later restore; this remains explicitly out of scope.

## Guidance For Implementation

- Treat the user-approved DS-005 order as an invariant, not a best-effort suggestion.
- Close and join the root admitted-materialization gate before scope capture; do not infer stability from task/persistence drains alone.
- Freeze local materialization and capture one scope once. Launch interruption calls across that captured scope before entering the quiescence-wait phase.
- Do not call Approve/Deny from Team code. Only call `AgentRun.interrupt()` and then existing termination preparation.
- Treat `NO_ACTIVE_TURN` as the only benign rejected interrupt result. Propagate other nonaccepted results as stop failure.
- Never unregister from a read path. Only explicit accepted terminal completion or already-established task settlement may remove an owned run.
- Keep termination retry on the same objects. Do not restore a second root or reconstruct descendant runtimes during a failed stop retry.
- Do not emit inactive, write `terminatedAt`, disconnect the client stream, or call catalog deletion until every descendant finish succeeded.
- Preserve read-only managed lookup where appropriate, but catalog Delete must use the held unmanaged-history deletion exclusion, not a one-time guard.
- In DS-007, do not assign `state.rows = candidateRows` until package removal succeeds. On package failure, re-flush and validate the captured original state before returning ordinary failure; call `packageCatalog.exclude` only on success.
- Keep the lock order `catalog queue -> manager exact-ID lane`; do not await catalog writes while a manager create/restore lane is still held after root registration.
- Use exact `teamRunId` end to end. Add same-summary negative assertions.
- Automated destructive validation must allocate isolated temporary packages and must never mutate the two reported production roots.
