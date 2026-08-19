# Design Use-Case Validation

## Status And Purpose

`Complete — design evidence supplement; approval N/A`

This artifact self-validates the target design against every materially different approved TeamRun stop/delete case. It follows the data-flow spines in `design-spec.md` rather than proving the design only by file inventory. Each walkthrough starts from a supported state, traces the exact owner transitions, and checks the approved observable outcome and invariants.

This is a static design proof, not execution evidence. Downstream implementation and API/E2E work must still produce executable evidence with isolated fixtures.

## Authoritative Inputs

- `requirements.md` — approved requirements `REQ-001`–`REQ-016` and acceptance criteria `AC-001`–`AC-019`.
- `ui-ux-spec.md` — approved row, modal, pending, failure, accessibility, and post-terminal presentation.
- `runtime-reproduction-evidence.md` — exact supported pending-approval failure and clean-restore observations.
- `investigation-notes.md` — current production paths and code evidence.
- `design-spec.md` — target spines `DS-001`–`DS-007`, owners, interfaces, removal plan, and file mapping.

## Cross-Case Invariants

Every case below must preserve these invariants:

1. **Exact root identity:** stop, delete, guard, stream cleanup, history cleanup, and retry use the clicked `teamRunId`; summary and member identity never select a root.
2. **One managed root / one transition lane:** a nonterminal root remains in the one authoritative manager map; create, restore, and unmanaged history deletion for one exact ID are serialized through the manager-owned transition lane.
3. **No inactive-before-terminal projection:** no lifecycle `isActive=false`, `terminatedAt`, delete-ready UI, or physical delete occurs until every materialized descendant accepts termination.
4. **Whole-tree order:** close external admission and the admitted-materialization gate; join every entered materializing operation; drain queues; freeze/capture one exact recursive scope; dispatch interruption to all captured active leaf turns; wait for all captured AgentRuns to reach canonical terminal/quiescent state; settle task records; finish captured descendants; terminalize/unregister root.
5. **Pending tools never execute during shutdown:** Team code uses `AgentRun.interrupt()` and never Approve/Deny.
6. **Stop and delete remain separate authoritative server operations:** active Delete composes existing stop then existing guarded history delete; physical deletion never stops a runtime itself.
7. **Retry uses the same objects:** only an in-flight attempt is shared. Nonterminal failure releases that attempt promise without restoring/reconstructing the root, frozen scope, or accepted descendants.
8. **Offline is not terminal:** member runtime status does not grant direct deletion authority and does not prevent a managed root from accepting later continuation while it is still admitting.
9. **No production mutation in automated proof:** destructive execution uses isolated fixtures.
10. **Normal delete failure keeps a durable retry target:** candidate index failure leaves current state/package untouched; package-removal failure compensates and validates the original row/tree before normal failure returns.

## Validation Matrix

| Case ID | Starting Shape | Primary / Local Spines | Expected Terminal Outcome | Result |
| --- | --- | --- | --- | --- |
| `VAL-001` | Active root; all configured members offline; no open work; user chooses Stop | `DS-001`, `DS-004`, `DS-005` | All no-active interrupts are benign; root becomes terminal/inactive; history remains | Pass |
| `VAL-002` | Same active/offline/quiescent root; user chooses Delete | `DS-002`, `DS-001`, `DS-005`, `DS-004`, `DS-006`, `DS-007` | Exact root stops fully, then held-exclusion compensated deletion removes exact package/UI state | Pass |
| `VAL-003` | Inactive persisted root; user chooses Delete | `DS-003`, `DS-004`, `DS-006`, `DS-007` | Exact package/UI state is removed without runtime restore or restore race | Pass |
| `VAL-004` | Configured Agent turn waits for tool approval | `DS-001`, `DS-005`, `DS-004` | Interrupt settles tool/turn without execution or user decision; descendants then root stop | Pass |
| `VAL-005` | Admitted delegated task Agent waits/prepares while Stop begins | `DS-001`, `DS-005`, `DS-004` | Gate joins commit-or-abort; captured Task Agent is interrupted/quiesced/settled/terminated before root; aborted candidate leaks nothing | Pass |
| `VAL-006` | Configured sub-Team and delegated/nested Team contain active or admitted-preparing leaves | `DS-001`, `DS-005`, `DS-004` | Gate stabilizes; frozen scope reaches all materialized leaves; descendants finish deepest-first; root last | Pass |
| `VAL-007` | Stop interruption or descendant termination fails | `DS-001`, `DS-004`, `DS-005` | Root stays managed/non-delete-ready, no terminal stamp, same objects retry | Pass |
| `VAL-008` | Repeated Stop or late materialization attempt while first attempt is in flight | `DS-001`, `DS-005` | Both stop callers join one root/scope; new materialization rejects; restore/create cannot duplicate | Pass |
| `VAL-009` | Stop succeeds but candidate-index or package deletion fails | `DS-002`, `DS-004`, `DS-006`, `DS-007` | Row is inactive and durably retained/compensated; retry performs deletion only | Pass |
| `VAL-010` | Several TeamRuns share one summary | `DS-001`–`DS-004`, `DS-006` | Only clicked exact root is stopped/deleted/cleaned | Pass |
| `VAL-011` | User cancels active or inactive delete confirmation | `DS-002`, `DS-003`, `DS-006` | No GraphQL call, runtime transition, storage mutation, or local cleanup | Pass |
| `VAL-012` | Retained stopped history is later restored | `DS-001`, `DS-004` | Restore may project active root with offline members; later message uses existing lazy activation | Pass |
| `VAL-013` | Inactive exact root is restored concurrently with Delete | `DS-003`, `DS-007` | One manager lane orders both: restore-first makes delete reject; delete-first prevents registration through completion | Pass |
| `VAL-014` | Message/delegation passed admission but is paused before registry materialization when Stop starts | `DS-001`, `DS-005` | Stop waits for register-or-abort, then freezes; no execution appears after scope capture | Pass |

## Per-Case Data-Flow Proof

### `VAL-001` — Stop Active Root With All Members Offline

**Given**

- The exact root is manager-owned and admitting.
- Every configured member projects `offline` and there is no open execution work.
- The user chooses Stop, not Delete.

**Flow**

1. `WorkspaceHistoryWorkspaceSection` sends the exact root ID through `agentTeamRunStore` and GraphQL to `TeamRunService` (`DS-001`).
2. `AgentTeamRunManager.getManagedTeamRun` returns the owned root. `RootTeamRun` closes external admission and its admitted-materialization gate, joins entered materializing operations, drains current queues, then freezes/captures the exact recursive scope (`DS-005`).
3. `FrozenTeamRunTerminationScope.interruptActiveTurns` visits the captured configured/task/nested objects. Offline or absent leaf runs yield no operation or `NO_ACTIVE_TURN`, which is the only benign rejected interrupt result.
4. `FrozenTeamRunTerminationScope.prepareMemberRuns` prepares every captured AgentRun; with no active input, quiescence is immediate.
5. Task records settle; local descendants accept termination; the root terminates last.
6. Terminal callback unregisters the exact root, then `TeamRunService` writes `terminatedAt`; the existing client stop cleanup disconnects the stream and projects members offline (`DS-004`).

**Proof checks**

- Member `offline` was not treated as proof of root terminality.
- No history package was deleted.
- The row becomes inactive/delete-ready only after the root terminal callback.
- Satisfies `REQ-002`, `REQ-011`, `REQ-014`–`REQ-016`; `AC-012`, `AC-017`, `AC-019`.

### `VAL-002` — Delete Active Root With All Members Offline

**Given** the `VAL-001` starting runtime shape, but the user chooses Delete.

**Flow**

1. The root parent row exposes Delete independently of its active state and the member statuses (`DS-002`).
2. `useWorkspaceHistoryMutations` captures `{ teamRunId, wasActive: true }`; the modal explains stop plus permanent deletion (`DS-006`).
3. Confirm first awaits the complete `DS-001` stop flow. The history delete API is not invoked while the root is managed.
4. Only after stop success does the composable invoke existing exact history deletion. At its queue head, the catalog enters `withUnmanagedHistoryDeletion(teamRunId, ...)`, rechecks the root is unmanaged, and holds the manager lane while DS-007 removes the candidate index/package (`DS-002`, `DS-007`).
5. Existing history mutation cleanup removes the exact history, resume/context, stream reference, and selection without substituting another row (`DS-004`).

**Proof checks**

- One confirmation produces two ordered authoritative operations, not an unsafe direct delete or a new dual-purpose server API.
- The catalog guard remains effective even if the UI sequence regresses.
- Candidate index/package failure follows `VAL-009`; physical success is not published early.
- Satisfies `REQ-001`–`REQ-006`, `REQ-009`; `AC-001`, `AC-002`, `AC-004`, `AC-018`.

### `VAL-003` — Delete Inactive History

**Given** a persisted `READY` TeamRun row whose root is not manager-owned.

**Flow**

1. Delete opens inactive-specific confirmation and stores the exact ID (`DS-003`, `DS-006`).
2. Confirm skips `terminateTeamRun`; it calls existing guarded history delete directly.
3. At the catalog queue head, the manager exact-ID lane orders this delete against create/restore. The catalog rechecks no managed root, retains original state, and completes DS-007 for only the exact package/index row.
4. Existing client cleanup removes the exact retained state (`DS-004`).

**Proof checks**

- No restore, activation, or synthetic runtime object is created.
- A concurrent restore follows the deterministic `VAL-013` ordering; it cannot register inside the deletion window.
- Satisfies `REQ-004`, `REQ-006`, `REQ-009`; `AC-003`, `AC-005`.

### `VAL-004` — Configured Agent Pending Tool Approval

**Given** `autoExecuteTools=false` and one materialized configured Agent at `TOOL_APPROVAL_REQUESTED`.

**Flow**

1. Root closes external admission and the admitted-materialization gate, joins entered operations, then freezes one scope; no new Team work or local materialization can enter.
2. Whole-scope interrupt traversal reaches the captured configured handle and calls the existing `AgentRun.interrupt()` primitive. Team code does not approve or deny the invocation.
3. The interrupt produces supported terminal interrupted/cancelled tool and turn events. The tool body is never executed.
4. Only after all interrupt dispatches are launched does the quiescence phase wait for canonical event processing and input settlement.
5. Prepared AgentRun termination commits/finishes; all other descendants finish; root terminalizes last.
6. The public stop mutation returns success in the normal bounded window; active Delete may now continue to physical deletion.

**Proof checks**

- Removes the reproduced `prepareTermination()`-before-interrupt hang.
- Requires no additional approval action and introduces no Team-specific approval protocol.
- Satisfies `REQ-013`–`REQ-016`; `AC-015`–`AC-019`.

### `VAL-005` — Delegated Task Agent Preparation And Pending Approval

**Given** either (a) an active delegated-task Agent whose turn is approval-pending, or (b) a delegation that passed root admission and paused after preparing its Agent but before task-queue activation.

**Flow**

1. `RootTeamRun.delegateTask` entered the admitted-materialization gate before asynchronous host resolution/preparation.
2. Stop closes the gate. It cannot proceed to scope capture until this delegation completes its commit-or-abort path.
3. If task activation wins before closure is observed, the prepared handle is committed into the task registry; the gate then releases, MixedTeamManager freezes and captures it, and the scope invokes the same AgentRun interrupt semantics as a configured Agent.
4. If closure wins at the task queue head, the existing `isRootOpen` assertion rejects activation, cancels the TeamRun reservation if any, aborts the prepared execution, and only then releases the gate. No registry object remains to capture.
5. For the committed case, quiescence waits after whole-scope interrupt dispatch. Existing `TaskDelegationService.shutdownAndSettle` marks the task interrupted and persists deepest-first settlement after leaf quiescence.
6. The captured task execution terminates idempotently and registry removal cannot remove its reference from the frozen scope. Root completes after all remaining descendants.

**Proof checks**

- No task Agent is omitted because it is paused before queue submission, prepared rather than active, or removed during settlement.
- Task record settlement remains in its current owner and does not precede the shutdown-wide interruption phase.
- Satisfies `REQ-014`–`REQ-016`; `AC-016`, `AC-019`.

### `VAL-006` — Configured And Delegated Nested Teams

**Given** materialized configured sub-Teams and delegated/nested task Teams, with active leaves at multiple depths, plus a possible admitted nested-Team preparation.

**Flow**

1. The root gate joins any configured activation or task-Team preparation that already passed admission. A task-Team reservation either commits into TeamRunResolver/its host registry or cancels/aborts before the gate releases.
2. Root closes TeamRunResolver registration. Each MixedTeamManager closes local configured/task materialization, deduplicates active and prepared handles/Teams, recursively freezes materialized children, and returns the exact scope.
3. Recursive scope interruption traverses to leaf AgentRuns. Each local scope launches its captured leaf interrupts; the root does not begin quiescence until the complete recursive interrupt phase returns.
4. Recursive scope preparation waits for every captured AgentRun to be canonically quiescent.
5. Task records settle deepest-first through TaskDelegationService. Registry removal cannot alter the captured scope.
6. Scope finish terminates descendants; accepted child results are idempotent if encountered again through task settlement. The root TeamRun finishes last, then and only then is manager ownership released.

**Proof checks**

- Configured and delegated/nested execution sources use existing authoritative registries to capture one bounded scope; no shadow live tree/registry is introduced.
- The root never claims terminal success while a descendant remains active.
- Satisfies `REQ-016`; `AC-019`.

### `VAL-007` — Nonterminal Stop Failure And Retry

**Given** an interrupt rejects with a code other than `NO_ACTIVE_TURN`, throws, or a descendant finish returns nonaccepted.

**Flow**

1. The current stop returns failure through RootTeamRun -> manager -> service -> GraphQL (`DS-001`, `DS-004`).
2. Root lifecycle remains nonterminal and manager-owned. It does not emit inactive, write `terminatedAt`, enable post-stop Delete, or invoke storage deletion.
3. UI clears pending state, keeps history visible, and reports stop failure. Admission may remain closed because shutdown was already requested.
4. Each owner clears only its rejected/thrown in-flight attempt promise. RootTeamRun retains the same frozen scope; accepted descendants/prepared objects remain the same idempotent objects.
5. A later Stop resolves the same managed RootTeamRun and retries unresolved work through that scope; create/restore remains blocked while it is owned and local materialization remains frozen.

**Proof checks**

- Failure is truthful and retryable without duplicate root or new descendant runtime.
- Satisfies `REQ-005`, `REQ-010`, `REQ-014`; `AC-006`, `AC-010`, `AC-016`, `AC-019`.

### `VAL-008` — Concurrent Repeated Stop And Late Addition

**Given** the first stop is currently in flight.

**Flow**

1. Both stop callers use managed lookup, so a `terminating` root remains resolvable.
2. RootTeamRun returns the same current in-flight termination promise and, once captured, the same frozen scope.
3. Nested scopes/managers and AgentRuns also join only their current in-flight preparation/termination operations.
4. A root command arriving after gate closure rejects before materialization. A direct late task/configured registry addition after freeze also rejects as an invariant violation; it cannot mutate the scope.
5. Restore/create checks managed ownership through the manager transition lane and cannot create a second exact root.
6. Both stop callers observe the same accepted result or same attempt failure.

**Proof checks**

- No read path unregisters the root.
- Satisfies `REQ-014`; `AC-016`.

### `VAL-009` — Stop Success, Candidate-Index Or Package Deletion Failure

**Given** active Delete completed `DS-001`; the exact root is inactive/unmanaged; DS-007 then encounters one deterministic storage-operation failure.

**Flow A — candidate index write fails**

1. At the catalog queue head, manager exclusion is acquired and unmanaged state rechecked.
2. Catalog captures `originalRows` and builds `candidateRows` without the target but does not assign `state.rows`.
3. Candidate index flush fails. Package removal is never called; current in-memory rows, durable original index, package-catalog admission, and canonical package remain unchanged.
4. The operation returns failure and releases the manager lane.

**Flow B — package removal fails**

1. Candidate index flush succeeds, but `state.rows` is still the original map and the manager lane remains held.
2. Exact canonical package removal fails under the supported single-operation failure model.
3. Catalog re-flushes `originalRows`, verifies the exact row and execution tree are readable, retains package-catalog admission/current state, then returns failure and releases the lane.

**UI/retry flow**

1. Stop cleanup has already projected the exact root inactive and disconnected its Team stream.
2. History mutation never optimistically removes the row; the ordinary failure result is emitted only after the durable retry target is established.
3. UI reports that the Team stopped but history deletion failed and clears pending state.
4. Retry targets the now-inactive row and follows `DS-003`/`DS-007`; it does not restore or terminate again.

**Proof checks**

- The partial outcome remains truthful rather than rolling UI back to active or losing the row on refresh/relaunch.
- `state.rows` and `TeamRunV1PackageCatalog` change only after full deletion success.
- No generic filesystem journal or combined stop-delete API is introduced.
- Satisfies `REQ-010`; `AC-011`.

### `VAL-010` — Same-Summary Exact Identity

**Given** two or more rows share the same summary.

**Flow**

1. Row action passes its bound exact `teamRunId` into the pending target.
2. Stop, managed guard, catalog delete, stream/context cleanup, and selection cleanup each use that exact ID.
3. Summary and focused member address are presentation only.

**Proof checks**

- The clicked row alone changes; every other same-summary run remains byte/state identical.
- Satisfies `REQ-007`, `REQ-008`; `AC-008`, `AC-009`.

### `VAL-011` — Cancel Confirmation

**Given** either active or inactive delete confirmation is open.

**Flow**

1. Cancel clears the local pending confirmation target/modal state.
2. Neither stop nor delete store action is invoked.

**Proof checks**

- No runtime, GraphQL, storage, stream, context, history, or selection side effect.
- Satisfies `REQ-006`; `AC-007`.

### `VAL-012` — Restore Retained Stopped History

**Given** Stop-only completed and retained the package.

**Flow**

1. A later explicit restore sees no currently managed root and materializes the existing canonical package unchanged.
2. Root becomes active/admitting; configured members may initially be offline.
3. A later message follows the existing `ensureReady()` lazy activation/restore path.

**Proof checks**

- No migration or package rewrite is introduced.
- Active-root/all-members-offline remains a supported state rather than being reclassified as terminated.
- Satisfies `REQ-002`, `REQ-011`, `REQ-015`; `AC-017`.

### `VAL-013` — Concurrent Restore And Delete

**Given** one inactive, admitted exact package and concurrent supported Restore and Delete requests.

**Restore wins the manager lane first**

1. Restore acquires the exact-ID transition lane before package load/materialization.
2. It loads and registers the exact RootTeamRun, then releases the lane before awaiting catalog restored-state recording.
3. Delete reaches the catalog queue and waits for/acquires the same lane. Its managed-root recheck now fails, so no candidate index or package mutation begins.

**Delete wins the manager lane first**

1. At the catalog queue head, Delete acquires the lane, rechecks unmanaged, and holds it through DS-007.
2. Restore cannot pass its identity transition boundary while the canonical package/index is changing.
3. On deletion success, Restore later acquires the lane but package admission/load fails and no root registers. On compensated deletion failure, Restore later sees the intact canonical package and may register normally.

**Proof checks**

- There is no interval in which a live exact root owns a package being removed.
- The catalog does not stop a runtime, and the manager does not mutate storage.
- Lock order has no cycle: catalog obtains `catalog queue -> manager lane`; manager create/restore releases the lane after registration before catalog record calls.
- Satisfies `REQ-005`; `AC-006`.

### `VAL-014` — Already-Admitted Message Or Delegation Versus Stop

**Given** either a user/Team message paused inside configured `ensureReady`, or delegation paused after preparation and before task-queue activation, after it passed root admission.

**Flow**

1. The operation already owns one admitted-materialization gate slot.
2. Stop synchronously closes external admission and the gate. New commands reject, but Stop waits for this slot.
3. Message path either finishes registering/reserving its exact configured Agent input or unwinds its failed activation. Delegation either commits prepared handles/reservations before root closure is observed or the queue-head root-open check aborts/cancels them.
4. The operation releases the slot only after its candidate is authoritatively registered or gone.
5. Root drains current task/persistence work, closes resolver registration, and freezes local registries. The captured scope therefore includes every committed object, while aborted objects are absent and disposed.
6. Interrupt/quiescence/settlement/finish then use only that scope. Any attempted addition after freeze rejects.

**Proof checks**

- Queue drain is not falsely treated as the admission barrier.
- Deterministic coverage must pause both message activation and task Agent/Team preparation at the described seam and assert Stop does not capture/finish early.
- Satisfies `REQ-014`–`REQ-016`; `AC-016`, `AC-019`.

## Negative-Path And Shortcut Rejection Proof

| Rejected Shortcut | Case That Would Fail | Design Boundary That Prevents It |
| --- | --- | --- |
| Show Delete only after separate Stop | `VAL-002` | Independent Stop/Delete rendering plus `DS-006` stop-first composition |
| Treat all members offline as root inactive | `VAL-001`, `VAL-012` | Root lifecycle projection and managed lookup remain authoritative |
| Call `prepareTermination()` before interrupt | `VAL-004`, `VAL-005` | Separate whole-tree interrupt and later quiescence phases in `DS-005` |
| Interrupt only configured direct Agents | `VAL-005`, `VAL-006` | MixedTeamManager traverses configured, task Agent, task Team, and nested registries |
| Treat task/persistence drain as a stable materialization set | `VAL-005`, `VAL-006`, `VAL-014` | Root admitted-operation gate and frozen recursive scope |
| Re-enumerate registries independently for each shutdown phase | `VAL-006`–`VAL-008`, `VAL-014` | One scope retains exact object references across phases/retry |
| Unregister when `isActive()` becomes false at termination start | `VAL-007`, `VAL-008` | Managed map and terminal-only callback removal |
| Cache a failed termination promise forever | `VAL-007` | In-flight-only cache; clear on nonterminal outcome |
| Catalog stops a runtime before deletion | `VAL-002`, `VAL-009` | Catalog is guard/delete only; UI composes server operations |
| Check root once before queued deletion | `VAL-003`, `VAL-013` | Manager exact-ID lane held from unmanaged recheck through deletion outcome |
| Publish index removal before package success | `VAL-009` | Catalog retains current state and compensates original durable rows on package failure |
| Select by summary or member | `VAL-010` | Exact root ID at every interface |
| Optimistically remove row before storage success | `VAL-009` | Existing history cleanup runs only on successful delete result |

## Requirements And Spine Completeness Check

| Authority Set | Covered By |
| --- | --- |
| `BEH-001`–`BEH-006` | Behavior-to-spine map in `design-spec.md`; `VAL-001`–`VAL-012` |
| `REQ-001`–`REQ-016` | At least one per-case proof above; lifecycle requirements concentrated in `VAL-004`–`VAL-008` and `VAL-014`; delete integrity in `VAL-009`/`VAL-013` |
| `AC-001`–`AC-019` | Explicit proof-check references above; UI/accessibility remains governed by approved `ui-ux-spec.md` and downstream rendered coverage |
| Primary spines `DS-001`–`DS-003` | `VAL-001`–`VAL-003`, `VAL-009`, `VAL-010` |
| Return/event spine `DS-004` | `VAL-001`–`VAL-010` where server outcome changes presentation |
| Bounded local spines `DS-005`–`DS-007` | `VAL-001`, `VAL-002`, `VAL-004`–`VAL-011`, `VAL-013`, `VAL-014` |

## Validation Conclusion

The design is internally consistent for the observed active-root/all-members-offline state, approval-pending configured and delegated Agents, already-admitted message/delegation materialization, nested Team executions, successful stop/delete, both catalog failure positions, concurrent stop, concurrent restore/delete, exact-identity selection, cancel, and later restore. Every deletion path is gated by full terminal root completion and a held exact-ID exclusion; every normal package failure durably compensates its retry row; and every nonterminal shutdown failure retains one exact manager-owned root/frozen-scope retry target. No case requires a second runtime registry, approval protocol, combined server mutation, persisted-data migration, generic filesystem journal, or production-data mutation.
