# TeamRun Management Contract

## Status

- Artifact type: Target ownership and refactor contract
- Status: `User Approved — SR-009 Corrects CRR-001 CR-F-004; CR-F-001–CR-F-003 Remain Implementation Corrections`
- Approval applicability: Yes; this supplement constrains R-007, R-012, R-015, R-040, R-047, R-048, AC-055, and AC-056
- Scope: the public rooted TeamRun boundary, one-TeamRun execution managers, exact TeamRun lookup, task/message/persistence ownership, and ordered frontend changes

## 1. Decision

The target preserves the sound part of the current architecture: **every materialized `TeamRun` has one `MixedTeamManager`, and that manager owns only that `TeamRun`.**

The target removes the unsound part: a child manager must not also behave like a root router, task ledger, communication owner, event bus, or global directory owner.

```text
AgentTeamRunManager                  process-wide catalog of active root runs
  -> RootTeamRun                     one public rooted TeamRun boundary
       -> TeamRunExecutionTree       one current execution-containment authority
       -> TeamExecutionIndex         derived exact identity/ancestry index
       -> TeamRunResolver            exact TeamRun access and configured-Team lazy materialization
       -> TaskDelegationService      one task lifecycle owner
       -> TeamCommunicationService   one accepted-message history owner
       -> TeamRunPersistenceCoordinator
       -> TeamRunEventPublisher      one ordered root event owner
       -> root TeamRun
            -> MixedTeamManager      one local TeamRun owner
                 -> configured-member registry
                 -> task-Agent registry
                 -> task-Team registry
                 -> child TeamRun handles
```

`RootTeamRun` is a thin authoritative facade over these explicit subject owners. It is not a new state blob. `TeamRun` remains one concrete Team execution. `MixedTeamManager` remains its private backend implementation.

## 2. Natural Terms

| Term | Exact meaning | Why this name |
| --- | --- | --- |
| `RootTeamRun` | the public boundary for one rooted Team execution and every execution/task/message contained by it | says which domain object and scope it represents; avoids vague `state` or `runtime` suffixes |
| `TeamRun` | one concrete Team execution, persistent or task-created | matches the existing domain subject |
| `MixedTeamManager` | the backend manager for exactly one mixed `TeamRun` | preserves the established name and narrows its responsibility instead of inventing a `MixedRootTeamRuntime` |
| `MixedConfiguredMemberRegistry` | live handles for the direct configured members of one TeamRun | `persistent` is inaccurate inside a task Team, whose configured members belong to a temporary TeamRun |
| `MixedTaskAgentExecutionRegistry` | direct task-Agent handles hosted by one TeamRun | already describes its owned variant precisely |
| `MixedTaskTeamExecutionRegistry` | direct task-Team handles hosted by one TeamRun | already describes its owned variant precisely |
| `TeamRunResolver` | resolves an exact `teamRunId` to its live `TeamRun`, materializing only an exact configured-Team ancestor chain when required | replaces several task-specific directories and chain-aware resolvers with one concrete responsibility |
| `TeamRunEventPublisher` | publishes accepted root-scoped changes in one monotonic order | its number is a change sequence, not a task revision or persisted schema version |

Forbidden target names include `RootTeamRunState`, `MixedRootTeamRuntime`, and a bare `revision` counter. They hide the subject or overload established task-revision language.

## 3. Current Evidence And Refactor Posture

### 3.1 What is already correct

- `MixedTeamRunBackendFactory` creates the root `MixedTeamManager`.
- `MixedSubTeamRunFactory.createOrRestore()` creates another `TeamRun`, backend, and manager for every materialized persistent or task subteam.
- A manager already has three distinct local handle collections: configured members, task Agents, and task Teams.
- Recursive termination already follows child handles.

This is an evidence-backed manager-per-TeamRun structure. Replacing it with one manager for the whole root would erase useful local lifecycle ownership and create a larger coordination object.

### 3.2 What is currently mixed

The current `MixedTeamManager` also:

- resolves root logical recipients;
- bubbles child communication through `parentBoundary`;
- interprets composite task-Team chains;
- reads root task-Agent and task-Team directories;
- owns a listener set and task-activation event barrier;
- performs root resource disposal from local termination;
- exposes task allocation, message routing, member commands, approvals, settlement, event publication, subscriptions, and local lifecycle through one broad `TeamManager` interface.

These are real supported paths, not hypothetical edge cases. Universal cross-branch delegation and exact-run messaging would make this mixing worse if added directly.

### 3.3 Refactor verdict

- Change posture: feature plus structural refactor.
- Root cause: boundary/ownership issue and duplicated routing/coordination.
- Refactor needed now: yes.
- Proportionate response: keep one manager per TeamRun, extract root-wide authority, and remove chain/directory/root-event concerns from local managers.

## 4. Authoritative Boundaries

### 4.1 `AgentTeamRunManager`

`AgentTeamRunManager` remains the process-wide catalog of **root** runs only. Its active map changes from `rootTeamRunId -> TeamRun` to `rootTeamRunId -> RootTeamRun`.

It owns:

- create, restore, lookup, and terminate of root runs;
- attachment of root-scoped streaming, communication, and file-change integrations exactly once;
- process-wide root lifecycle notifications.

It does not register child TeamRuns. Child executions are private to their `RootTeamRun`.

### 4.2 `RootTeamRun`

`RootTeamRun` is the only public entrypoint above a rooted execution. Public callers use it for:

- logical `recipient_address` resolution;
- exact `target_agent_run_id` resolution;
- task delegation, submission, review, and settlement;
- Agent input, approval, interruption, and exact command routing;
- initial execution-view snapshots and live subscriptions;
- root termination.

It owns no provider loop and no JSON parsing. It delegates to the subject owners below it. Callers must not depend on both `RootTeamRun` and its internal resolver, index, stores, services, or local managers.

### 4.3 `TeamRun`

`TeamRun` is the authoritative local boundary for one concrete Team execution. It privately owns one `MixedTeamManager` through its backend.

Root-owned services may ask a `TeamRun` to:

- prepare, activate, release, settle, or terminate one direct task execution;
- deliver input or a command to one exact direct AgentRun;
- materialize one exact configured child TeamRun;
- report local leaf status and open work;
- terminate its local descendants.

Root-owned services must not reach through `TeamRun` to `MixedTeamManager` or a registry.

### 4.4 `MixedTeamManager`

One manager owns exactly one `teamRunId`. It owns:

- lifecycle `active -> terminating -> terminated` for that TeamRun;
- the direct configured-member handles of that TeamRun;
- the direct task-Agent handles hosted by that TeamRun;
- the direct task-Team handles hosted by that TeamRun;
- local lazy creation and provider-handle mechanics;
- local preparation/release/termination and recursive child termination;
- local leaf status and local open-work inspection;
- translation of local Agent/child-Team events to the injected root event sink.

It must not own:

- arbitrary root address resolution or task-host selection;
- task records or task lifecycle policy;
- message history or message endpoint policy;
- `parentBoundary` bubbling;
- composite task-Team ancestry;
- root-scoped task directories;
- public listener sets, change ordering, or activation barriers;
- persistence stores or cross-file commit order;
- disposal of resources belonging to another TeamRun or to the root.

## 5. Root-Owned Subject Owners

### 5.1 `TeamRunExecutionTree`

Owns current execution-containment facts matching `team_run_execution_tree.json`. It accepts only validated current-schema nodes and produces immutable snapshots. It does not own tasks, messages, live handles, or event delivery.

### 5.2 `TeamExecutionIndex`

Is rebuilt from `TeamRunExecutionTree`. It derives:

- exact AgentRun and TeamRun node lookup;
- containing TeamRun and ancestor TeamRun sequence;
- configured placement and coordinator AgentRun;
- owning task execution and task ancestry;
- direct-child membership needed by a local `TeamRun` command.

It contains no independently mutable facts and is never persisted.

### 5.3 `TeamRunResolver`

Owns access to live `TeamRun` objects for one root:

```ts
interface TeamRunResolver {
  getActive(teamRunId: string): TeamRun | null;
  requireConfigured(teamRunId: string): Promise<TeamRun>;
  reserveTaskSubtree(teamRuns: readonly TeamRun[]): TeamRunRegistrationReservation;
  registerActive(teamRun: TeamRun): void;
  unregister(teamRunId: string, expected: TeamRun): void;
}
```

`requireConfigured()` is exact, not a search:

1. `TeamExecutionIndex` supplies the unique root-to-target TeamRun chain.
2. The resolver starts at the registered root TeamRun.
3. For each missing configured child, it asks the current parent `TeamRun` to materialize that exact direct `teamRunId`.
4. It registers the returned child and continues.
5. A task TeamRun must already be active; a missing or settled task TeamRun is rejected and is never recreated.

The resolver owns a private `teamRunId -> TeamRun` map. That map stores no address, task ID, parent ID, or ancestry; the execution index owns those facts.

### 5.4 `TaskDelegationService`

One instance belongs to one `RootTeamRun`. It owns task IDs, the immutable current task snapshot, lifecycle authorization, task-host selection, notifications, open-child checks, restart repair, settlement, and one private FIFO `TaskDelegationCommandQueue`. Activation, submit, review, interruption, and settlement enter that queue exactly once. No other component mutates task state.

It uses `TeamExecutionIndex` for facts and `TeamRunResolver` for exact local access. It never traverses local manager registries or invents a second execution graph. For activation, all fallible Agent/Team construction, registry reservation, and event sealing happen before queue admission, but the sealed command carries only an immutable activation proposal and prepared capabilities—not a complete next tree/task snapshot. At queue head, the service checks the root is still open, revalidates the exact caller/task/source state against its latest committed state, derives/strict-validates the cumulative next tree/task snapshots, and only then composes one typed `PreparedTaskMutationCommit`. This type is an under-owner physical plan, not a caller-facing mutation input.

The private command contract is discriminated and task-specific:

```ts
type TaskDelegationCommand =
  | { kind: "activate"; proposal: SealedTaskActivationProposal }
  | { kind: "submit_result"; callerAgentRunId: string; taskId: string; result: TaskResultInput }
  | { kind: "review_result"; callerAgentRunId: string; taskId: string; review: TaskReviewInput }
  | { kind: "interrupt"; taskId: string; reason: string }
  | { kind: "settle"; taskId: string };

type TaskShutdownCommand = Extract<TaskDelegationCommand, { kind: "interrupt" | "settle" }>;

interface TaskDelegationCommandQueue {
  submit(command: TaskDelegationCommand): Promise<TaskCommandInternalResult>;
  closeExternalAdmission(): void;
  submitShutdown(command: TaskShutdownCommand): Promise<TaskCommandInternalResult>;
  drain(): Promise<void>;
}
```

The queue is a bounded local sequencing mechanism inside the sole task owner. It is not persisted, contains no provider work, exposes no generic callback/mutate API, and is not a second ledger. Queue-admission order is the authoritative order across activation and every transition. `closeExternalAdmission()` rejects later tool/public submissions but retains the service-private shutdown lane; that lane accepts only interruption/settlement commands and joins the same FIFO. Root teardown drains pre-close commands, submits required shutdown commands through that lane, drains again, then begins AgentRun quiesce. Two commands for different tasks accumulate; two commands for one task revalidate at queue head, so only the first source-state-valid command succeeds. Public task result mapping and postcommit notification warnings remain in `TaskDelegationService`.

Activation and ordinary task-record transitions retain their prevalidated no-throw contract. Settlement is deliberately separate because terminal task truth is already durable before execution cleanup begins:

```ts
interface PreparedTaskActivationCommit {
  assertCommitReady(): void;          // last fallible precommit validation
  abortBeforeCommit(): Promise<void>; // preparation/resolver/event cleanup
  commitAfterDurability(): void;      // synchronous no-throw; includes memory, registration, event enqueue, gate release
}

type PreparedTaskMutationCommit =
  | {
      kind: "activation";
      nextTree: TeamRunExecutionTreeSnapshot;
      nextTasks: TaskDelegationRecordsSnapshot;
      activation: PreparedTaskActivationCommit;
    }
  | {
      kind: "record_transition";
      nextTasks: TaskDelegationRecordsSnapshot;
      cancelBeforeDurability(): void;
      commitAfterDurability(): void;
    };

interface PreparedTaskSettlement {
  readonly taskId: string;
  readonly binding: TaskExecutionBinding;
  cancelBeforeDurability(): void; // synchronous no-throw; restores the same local routability/admission
  commitAfterDurability(): CommittedTaskSettlement; // synchronous no-throw; detaches exact local execution
}

interface CommittedTaskSettlement {
  finishLocalTeardown(): Promise<AgentOperationResult>; // provider/handle disposal, outside root lock
}

interface PreparedTaskSettlementCommit {
  readonly nextTree: TeamRunExecutionTreeSnapshot;
  readonly settlement: PreparedTaskSettlement;
  commitTreeAndEvent(settlement: CommittedTaskSettlement): void; // synchronous no-throw current-tree/event swap
}
```

For activation, `commitAfterDurability()` is called exactly once only after both task writer results are `committed`. It performs no allocation, lookup, provider call, listener callback, I/O, or promise creation. All values, local/resolver map slots, immutable snapshots, and the hidden prepared event-batch slot it consumes were reserved and validated by `assertCommitReady()`. A `not_renamed` result permits `abortBeforeCommit()` and the existing task rejection. A `renamed_finalization_indeterminate` result invokes neither abort nor commit: the root fail-stop path owns disposal of the hidden preparation after the current operation loses its public result.

For settlement, `TaskDelegationService` first commits `accepted` or `interrupted` in `task_delegation_records.json`. A later queue-head settlement command resolves the exact local owner and asynchronously obtains `PreparedTaskSettlement` before it asks for the root lock. Preparation reserves the exact registry entry, closes new input, waits every previously reserved/committed/queued input and active dispatch, recursively prepares task-Team descendants, and rechecks local/open-child eligibility. It performs no backend termination, registry deletion, resolver unregistration, or durable mutation. The service then derives only `nextTree`. `not_renamed` invokes `cancelBeforeDurability()` and keeps the terminal task plus its same live execution. `committed` invokes `settlement.commitAfterDurability()` and `commitTreeAndEvent()` synchronously, then returns the opaque `CommittedTaskSettlement` to the task owner for teardown after the root lock unwinds. `renamed_finalization_indeterminate` invokes neither cancellation nor commit and enters root fail-stop. No root lock is held while preparation waits or committed teardown calls a provider.

### 5.5 `TeamCommunicationService`

One instance belongs to one `RootTeamRun`. It owns the immutable current message snapshot plus append/dedup/current-reference policy. It resolves the exact sender/receiver through the root index, obtains an unreleased reservation from the exact receiver AgentRun's existing FIFO owner, preallocates the correlated event slot, and—without an intervening await—submits one sealed one-shot append plan to the root persistence coordinator. It never derives or passes a full next-message snapshot before the coordinator acquires the root lock. Under-lock conflict or a `not_renamed` result cancels the event slot and reservation; `renamed_finalization_indeterminate` instead keeps them hidden for root fail-stop disposal and produces no ordinary result. It owns message records, not task state or another input queue.

The AgentRun seam used by communication is likewise exact:

```ts
type AgentRunInputReservationResult =
  | { reserved: false; code: AgentRunInputRejectionCode; message: string }
  | { reserved: true; reservation: AgentRunInputReservation };

interface AgentRunInputReservation {
  commit(): CommittedAgentRunInput; // synchronous no-throw; input becomes admitted but stays unreleased
  cancel(): void;                   // synchronous no-throw; valid only before commit
}
interface CommittedAgentRunInput {
  release(): void;                  // synchronous no-throw eligibility/latch flip; no inline provider/listener call
}
```

`reserved` is not the public collaboration `accepted` result. The reservation occupies the FIFO position but becomes `admitted` only at `commit()`. Commit/release mutate only preallocated FIFO state/wake latches; AgentRun lifecycle observers and the provider dispatcher drain afterward with their existing isolation, never inline inside the root commit. `AgentRun.postUserMessage()` uses the same primitive and immediately commits/releases for callers that require no Team-history transaction. The existing admission state owns `reserved | queued | claimed | forwarded | terminal`; `claimNext()` considers only the earliest nonterminal entry, so a later input cannot overtake an unresolved reservation. Ordinary AgentRun quiesce waits for each reservation to commit or cancel; root fail-stop owns exceptional disposal of a deliberately hidden indeterminate reservation before destroying the failed run.

The sealed message capability is exact and private to the root commit boundary:

```ts
type TeamMessageAppendRejectionCode =
  | "TEAM_MESSAGE_COMMIT_CONFLICT"
  | "TEAM_MESSAGE_HISTORY_COMMIT_FAILED";

interface PreparedTeamMessageAppend {
  readonly rootTeamRunId: string;
  readonly messageId: string;
  prepareAgainstCurrent():
    | { prepared: false; code: "TEAM_MESSAGE_COMMIT_CONFLICT"; message: string }
    | { prepared: true; commit: PreparedTeamMessageCommit };
  cancelBeforePreparation(): void; // synchronous no-throw, one-shot
}

interface PreparedTeamMessageCommit {
  readonly nextMessages: TeamCommunicationMessagesSnapshot;
  cancelBeforeDurability(code: TeamMessageAppendRejectionCode): void; // no-throw
  commitAfterDurability(): void; // no-throw memory/event/reservation/latch flips; no inline callbacks/provider
}
```

`prepareAgainstCurrent()` may be invoked exactly once and only by `TeamRunPersistenceCoordinator` while it holds this root's mutation lock. Through private capabilities created by `TeamCommunicationService`, it reads that service's current immutable snapshot, verifies the root is open, both exact AgentRun endpoints remain current in the root index, the reservation still belongs to the exact receiver and is unresolved, and the message ID is absent. It then derives and validates `current.messages + message`, including the preallocated event slot. No current snapshot, mutable service object, generic callback, or lock handle is exposed to callers.

### 5.6 `TeamRunPersistenceCoordinator`

Owns the root mutation lock and the physical commit protocol. It has subject-specific operations rather than a generic `mutate(anything)` API:

```ts
type TeamRunFileRole = "execution_tree" | "task_records" | "communication_messages";
type TeamRunPreRenameStage =
  | "prepare_directory" | "write_temp" | "sync_temp" | "close_temp" | "rename";
type TeamRunDirectoryFinalizationStage =
  | "open_directory" | "sync_directory" | "close_directory";

type TeamRunFileWriteResult =
  | { outcome: "not_renamed"; file: TeamRunFileRole; stage: TeamRunPreRenameStage; cause: Error }
  | { outcome: "renamed_finalization_indeterminate"; file: TeamRunFileRole; stage: TeamRunDirectoryFinalizationStage; cause: Error }
  | { outcome: "committed"; file: TeamRunFileRole };

type TaskMutationCommitResult =
  | { outcome: "not_committed"; failedFile: TeamRunFileRole; treeOrphanMayExist: boolean; cause: Error }
  | { outcome: "committed" }
  | { outcome: "finalization_indeterminate"; file: TeamRunFileRole; stage: TeamRunDirectoryFinalizationStage };

type TaskSettlementCommitResult =
  | { outcome: "not_committed"; cause: Error }
  | { outcome: "committed"; settlement: CommittedTaskSettlement }
  | { outcome: "finalization_indeterminate"; file: "execution_tree"; stage: TeamRunDirectoryFinalizationStage };

type TeamMessageCommitResult =
  | { outcome: "conflict"; code: "TEAM_MESSAGE_COMMIT_CONFLICT"; message: string }
  | { outcome: "not_committed"; cause: Error }
  | { outcome: "committed" }
  | { outcome: "finalization_indeterminate"; stage: TeamRunDirectoryFinalizationStage };

type PreparedExecutionTreeCommit = Readonly<{
  nextTree: TeamRunExecutionTreeSnapshot;
  cancelBeforeDurability(): void;
  commitAfterDurability(): void;
}>;

interface TeamRunPersistenceCoordinator {
  commitTaskMutation(command: PreparedTaskMutationCommit): Promise<TaskMutationCommitResult>;
  commitTaskSettlement(command: PreparedTaskSettlementCommit): Promise<TaskSettlementCommitResult>;
  commitReservedMessageAppend(plan: PreparedTeamMessageAppend): Promise<TeamMessageCommitResult>;
  commitExecutionChange(change: PreparedExecutionTreeCommit): Promise<TaskMutationCommitResult>;
  readConsistent<T>(reader: () => T): Promise<T>;
}
```

`PreparedTaskMutationCommit` is created only while one `TaskDelegationService` command owns the task queue head. Its discriminated variants are `activation` (tree then task file) and `record_transition` (task file). They carry latest-state-derived snapshots plus prevalidated no-throw memory/event/reservation closures. `PreparedTaskSettlementCommit` writes only the execution tree because terminal task status is already current and durable. The coordinator owns neither task authorization nor task command ordering; it holds the root lock through the subject-specific physical commit and invokes a committed closure only after every required file reports `committed`.

On a settlement `not_renamed`, the coordinator synchronously cancels the prepared settlement and returns `not_committed`; there is no in-command persistence retry. On `committed`, it obtains the committed cleanup capability and applies the current-tree/event closure under the same lock, then returns that capability. The task owner finishes local teardown outside the lock. A postcommit teardown rejection cannot reverse durable `settledAt` and is never mapped as a persistence failure; it closes the affected root through the lifecycle fail-stop path so strict reload cannot recreate the settled execution.

For message append, the coordinator acquires the same root lock before calling `prepareAgainstCurrent()`, keeps it through the phase-aware write, and invokes the prepared commit's no-throw `commitAfterDurability()` only for `committed`. A preparation conflict calls the plan's cancel method and returns the narrow internal conflict. `not_renamed` calls `cancelBeforeDurability()` and returns `not_committed`; `TeamCommunicationService` alone maps that outcome to `TEAM_MESSAGE_HISTORY_COMMIT_FAILED`. There is no stale-plan retry.

The three Team stores share one strict `TeamRunFileCommitWriter`. Before successful rename, any error removes the temp file and returns `not_renamed`. After successful rename, directory open/sync/close failure returns `renamed_finalization_indeterminate`; the writer never pretends the prior final file remains. Successful required directory finalization returns `committed`. The selected base's best-effort generic `atomicWriteJsonFile()` remains available to unrelated owners but is not used by any of these three stores.

On `renamed_finalization_indeterminate`, the coordinator synchronously invokes `RootTeamRun.enterPersistenceFailStop()` before releasing the root lock. That latch rejects new root operations; the current prepared execution/message reservation/event slot stays hidden and unreleased; no memory snapshot is swapped; no provider/subscriber work starts; and the in-flight service does not map a normal `AgentOperationResult`. After the lock unwinds, root-owned fail-stop teardown closes its execution/API streams and disposes the failed instance. The normal strict root loader—on explicit reopen or server restart—is the only re-entry and reconciles whichever final paths survived. Other roots remain unaffected.

The coordinator never decides task state, recipient policy, message content/dedup rules, public operation results, or presentation, and exposes no generic mutate callback.

### 5.7 `TeamRunEventPublisher`

Owns one non-persisted monotonic `changeSequence` for the lifetime of one active `RootTeamRun` instance.

```ts
type SequencedTeamRunEvent = TeamRunEvent & {
  changeSequence: number;
};
```

- The sequence increments only after an accepted in-memory change is ready for publication.
- It is not a task revision, schema version, persisted field, or cross-restart identity.
- A restored root starts a new sequence; every connection begins from a fresh snapshot carrying the current sequence.
- Local managers only call an injected event sink. They do not own subscribers or allocate sequence numbers.
- For task preparation, `TaskDelegationService` opens one activation-event lease and passes its lease-scoped event sink through the selected `TeamRun` to the prepared handle. The publisher buffers local initialization/status/events for that lease.
- Preparation ends by sealing the execution and lease: no provider work and no further task-local event can occur until the work gate opens. `TeamRunEventPublisher.sealTaskActivation()` validates the payload/budget and reserves one hidden `PreparedTeamRunEventBatch` queue slot containing the correlated activation plus retained events before any file write.
- After durable tree/task commit, one synchronous no-throw closure commits immutable memory snapshots, consumes pre-reserved local/`TeamRunResolver` slots, flips the already-reserved event batch to publishable, and opens the work gate. Sequence assignment and subscriber callbacks drain later; each subscriber exception is isolated.
- Preparation, sealing, registration-reservation, validation, or `not_renamed` persistence failure aborts the lease and prepared execution and discards retained events. A `renamed_finalization_indeterminate` result leaves the sealed batch hidden until root fail-stop disposal; neither branch publishes an uncommitted execution.
- Snapshot connection uses one publisher barrier: subscribe/queue, read one consistent tree/task/message snapshot, collect canonical leaf status through the root `TeamRun`, capture the current sequence, publish the snapshot, then drain later events in sequence order.
- The frontend accepts only `changeSequence === current + 1`; a gap triggers one fresh snapshot.

## 6. Local Manager Interface Shape

The broad current `TeamManager` interface is replaced by a local `TeamRunBackend` contract. Exact method names may follow repository conventions, but the subject split is mandatory:

```ts
interface TeamRunBackend {
  isActive(): boolean;
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;

  deliverToDirectAgent(input: DirectAgentInput): Promise<AgentOperationResult>;
  executeDirectAgentCommand(input: DirectAgentCommand): Promise<AgentOperationResult>;
  getOrCreateConfiguredChildTeam(teamRunId: string): Promise<TeamRun>;

  prepareTaskAgent(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution>;
  prepareTaskTeam(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution>;
  prepareDirectTaskSettlement(input: PrepareDirectTaskSettlementInput): Promise<PreparedTaskSettlement>;

  terminate(): Promise<AgentOperationResult>;
}
```

Every command uses exact run IDs and requires the selected execution to be a direct child of this TeamRun according to the root index-derived command. A local manager never parses an absolute recipient address or chooses which TeamRun should receive a command.

`PreparedTaskExecution` is an in-memory opaque preparation token plus the newly allocated exact execution binding. It is not persisted and is not a second lifecycle model. Its contract is exact:

```ts
interface PreparedTaskExecution {
  readonly binding: TaskExecutionBinding;
  readonly preparedTeamRuns: readonly TeamRun[]; // empty for an Agent task
  sealForCommit(): void;                         // fallible; validates and closes event/work production
  commit(): CommittedTaskExecution;              // synchronous no-throw after seal
  abort(): Promise<void>;                        // precommit cleanup only
}
interface CommittedTaskExecution {
  releaseWork(): void;                           // synchronous no-throw latch; no provider call
}
```

For a Team task, `TeamRunResolver.reserveTaskSubtree(preparedTeamRuns)` validates every exact run ID and returns a hidden registration reservation before persistence. Its `commit()`/`cancel()` operations are synchronous no-throw; reserved TeamRuns are not returned by normal lookup until commit. `TaskDelegationService` combines that reservation, sealed local preparation, immutable activation proposal, and sealed event lease, then submits it to its one command queue. Only at queue head does the service revalidate the latest tree/tasks and construct the activation `PreparedTaskMutationCommit`. `committed` task-file finalization is the commit point. The root commit then performs only pointer/map/latch operations whose contract forbids recoverable failure. Memory exhaustion/process death is process failure, not a recoverable `not_started` branch; strict reload repair governs its durable residue.

`prepareDirectTaskSettlement()` is the symmetric local-owner capability for removal. For a task Agent it reserves the exact task-Agent registry entry and obtains a prepared AgentRun termination. For a task Team it recursively prepares the exact task TeamRun subtree leaf-first and reserves every corresponding local registry/resolver slot. Once returned, `cancelBeforeDurability()` and `commitAfterDurability()` are synchronous no-throw one-shot operations. Commit removes the exact handles from normal lookup and transfers them to `CommittedTaskSettlement`; it does not call provider termination inline. This capability contains no task status, address resolution, file state, or retry policy.

## 7. Data-Flow Spines

### MGR-001 — persistent direct Agent message

```text
send_message_to tool
  -> RootTeamRun resolves logical or exact recipient
  -> TeamExecutionIndex derives receiver AgentRun + containing TeamRun
  -> TeamRunResolver materializes the exact configured TeamRun chain if needed
  -> containing TeamRun synchronously asks its direct AgentRun FIFO owner for one unreleased reservation
  -> reservation rejection returns with no history row
  -> without awaiting, TeamCommunicationService seals/submits immutable message + reservation + event slot
  -> persistence coordinator acquires root mutation lock
  -> append plan reads the service-owned current message state, revalidates current root/endpoints/reservation/message-ID absence, and derives current-plus-message
  -> phase-aware writer reports not_renamed | renamed_finalization_indeterminate | committed
  -> only committed triggers the synchronous no-throw message-state/event/reservation/FIFO release
  -> existing AgentRun FIFO dispatcher forwards it in order
```

Owner: `RootTeamRun` at the public boundary; `TeamCommunicationService` owns the message state/policy and sealed append capability; `TeamRunPersistenceCoordinator` owns the root lock/physical commit; the receiver `AgentRun` remains the sole FIFO/admission owner; the selected `TeamRun` only reaches its direct AgentRun. No Team service queues, retries, or replays input. Root-lock acquisition order is communication-history order. Same-receiver FIFO order is identical because synchronous reservation and plan submission have no intervening await; different receivers have independent provider order while both accepted rows remain in root commit order.

### MGR-002 — task Agent activation in another branch

```text
delegate_task tool
  -> RootTeamRun/TeamRecipientResolver resolves recipient_address
  -> TaskDelegationService validates caller and chooses host with TeamExecutionIndex
  -> TeamRunResolver returns the exact host TeamRun
  -> TaskDelegationService opens root activation-event lease
  -> host TeamRun prepares a direct task Agent with the lease-scoped event sink and no work release
  -> host seals the prepared execution; resolver reserves any fresh TeamRun IDs; publisher seals the event lease
  -> TaskDelegationService submits one immutable activation proposal to its FIFO task-command queue
  -> at queue head, revalidate latest root/tree/tasks and derive one cumulative commit-ready tree/task/memory/registration/event plan
  -> TeamRunPersistenceCoordinator writes tree, then task through phase-aware writer results; committed task finalization is the COMMIT POINT
  -> one synchronous no-throw closure swaps memory, consumes reservations, enqueues activation+retained events, and opens the work gate
  -> publisher later drains subscribers with per-subscriber error isolation
  -> tool returns task_id/status/target_agent_run_id
```

### MGR-003 — task Team activation

```text
TaskDelegationService selects host TeamRun
  -> task service opens root activation-event lease
  -> host TeamRun prepares fresh task Team subtree with lease-scoped event sink
  -> host seals the full prepared task Team; TeamRunResolver reserves every exact subtree run ID
  -> one root task-command queue revalidates latest current state and derives cumulative tree/task snapshots
  -> persistence coordinator commits tree subtree + task record; committed task-file finalization is the COMMIT POINT
  -> one synchronous no-throw closure commits memory, local handles, reserved TeamRun registrations, activation+retained event enqueue, and coordinator work-gate release
  -> publisher later drains activation first and retained/live events after it
```

No task TeamRun is root-addressable before durable activation. If any precommit step or `not_renamed` write fails, the host aborts the preparation, resolver reservation, and event lease; no TeamRun is registered, no activation/status event is published, and no work is released. `renamed_finalization_indeterminate` instead fail-stops the root with the preparation hidden and emits no normal result. After the commit point there is no recoverable activation/publication failure branch.

### MGR-004 — exact Agent command

```text
browser/tool command with agentRunId
  -> RootTeamRun
  -> TeamExecutionIndex derives containing teamRunId and validates active ownership
  -> TeamRunResolver returns exact TeamRun
  -> TeamRun executes command against exact direct AgentRun
  -> AgentRun result returns through RootTeamRun
```

### MGR-005 — task settlement and local teardown

```text
review_task_result(accept) / supported task interruption
  -> TaskDelegationService queue head commits accepted | interrupted in task_delegation_records.json
  -> later settlement command rereads current task/tree/index and checks open child tasks
  -> TeamRunResolver returns the exact owner TeamRun
  -> owner TeamRun prepares exact direct task settlement without a root lock
  -> prepared settlement closes new input and waits earlier AgentRun reservations/dispatch plus recursive child work
  -> task queue rechecks terminal task + exact live binding and derives tree-only settledAt change
  -> persistence coordinator acquires root lock and writes team_run_execution_tree.json
  -> not_renamed: synchronously cancel preparation, reopen the same execution, leave terminal task/tree unchanged
  -> renamed_finalization_indeterminate: preserve hidden preparation, fail-stop root, emit no ordinary result
  -> committed: synchronously detach local handles, swap tree, enqueue settlement event, return committed cleanup capability
  -> after root lock: capability terminates/disposes exact Agent/task-Team subtree and resolver unregisters inactive TeamRuns
```

For root teardown, `RootTeamRun` first closes external task/message admission and drains earlier task commands/root-lock work, then submits required interruptions and settlements through the same shutdown lane and exact spine above. The local manager disposes only its own handles. Root services dispose only root records, listeners, and directories after committed local cleanup. Teardown never acquires the root lock and then waits on an AgentRun reservation, provider, or task command queued behind that lock. A direct AgentRun quiesce racing an already-submitted message plan waits for that exact reservation to commit or cancel; it does not cancel or bypass the root message commit independently.

### MGR-006 — initial snapshot and live changes

```text
Team workspace connection
  -> RootTeamRun opens TeamRunEventPublisher connection barrier
  -> persistence coordinator readConsistent captures tree/tasks/messages
  -> root TeamRun recursively collects immutable `TeamAgentStatusSnapshot` values for lazy configured leaves and active task Agent/task-Team leaves
  -> while event sequence allocation remains paused, projector maps each status through the same `projectTeamAgentStatus` function/strict `TeamAgentStatusDto` used by live/history and captures base changeSequence S
  -> snapshot is sent atomically; barrier opens; queued events receive S+1... in publication order
  -> frontend TeamExecutionViewState replaces its aggregate atomically
  -> queued later events drain in strict changeSequence order
  -> frontend selectors render placement-grouped execution rows
```

If status changes during collection, its root event is already queued. When collection saw the earlier status, the queued S+1 event advances it; when collection saw the later status, the queued event is an idempotent same-value application. Task activation is serialized by the same root mutation/event barriers, so a task status can never precede the task node that identifies its AgentRun. Settled task handles are absent from recursive collection.

### MGR-007 — overlapping task lifecycle commands

```text
submit_task_result(task-A) and review_task_result(task-B)
  -> RootTeamRun authorizes root/caller context and submits two immutable commands
  -> TaskDelegationCommandQueue admits A then B (or B then A) in one FIFO order
  -> head A reads authoritative current tasks T0, revalidates exact task/caller/source state, derives T0+A
  -> persistence coordinator commits T0+A; no-throw memory/event commit completes; result A is determined
  -> head B reads authoritative current tasks T0+A, revalidates exact task/caller/source state, derives T0+A+B
  -> persistence coordinator commits T0+A+B; no-throw memory/event commit completes; result B is determined
  -> notifications drain after each durable transition; notification warning never reverses task state
```

For two commands targeting the same task, the second sees the first command's latest state. It either applies a still-valid next transition or returns the existing lifecycle-invalid result; it never derives from `T0` and never retries. Activation proposals, submit, review, interruption, and settlement use this one order.

### MGR-008 — post-rename finalization indeterminate

```text
task/message command under root mutation lock
  -> strict TeamRunFileCommitWriter writes + syncs temp
  -> rename succeeds
  -> directory open/sync/close fails
  -> writer returns renamed_finalization_indeterminate(file,stage)
  -> persistence coordinator synchronously latches RootTeamRun persistence fail-stop
  -> no memory/event/registration/work/FIFO release and no ordinary AgentOperationResult mapping
  -> after lock unwind, failed root closes streams and disposes its hidden live instance
  -> explicit reopen/server restart strict-loads the three final paths
  -> loader removes tree-only orphan or interrupts/settles surviving nonterminal task; surviving messages remain history and are never replayed
  -> root is admitted only after repair writes and validation commit successfully
```

This fail-stop is root-scoped: other root TeamRuns and new Team creation remain available. It is not a retry, rollback, fourth file, or compatibility reader.

## 8. Dependency Rules

Allowed:

```text
AgentTeamRunManager -> RootTeamRun
RootTeamRun -> root subject owners
TaskDelegationService -> private TaskDelegationCommandQueue + TeamExecutionIndex + TeamRunResolver + persistence + event publisher
TeamCommunicationService -> TeamExecutionIndex + TeamRunResolver + persistence + event publisher
TeamRunPersistenceCoordinator -> TeamRunFileCommitWriter + three private stores + RootTeamRun fail-stop latch
TeamRunResolver -> TeamExecutionIndex + private live TeamRun map + TeamRun local boundary
TeamRun -> private TeamRunBackend/MixedTeamManager
MixedTeamManager -> local registries + provider handles + injected event sink
```

Forbidden:

- public caller -> `RootTeamRun` and internal service/index/manager;
- root service -> `MixedTeamManager` or local registry;
- child TeamRun/manager -> parent/root boundary for routing policy;
- local manager -> task/message stores, persistence coordinator, or root listener set;
- task/message service -> physical directory ancestry or composite chain;
- communication caller -> precomputed full message snapshot or generic persistence-lock callback;
- task caller -> precomputed complete tree/task snapshot, direct store/coordinator call, or task mutation outside `TaskDelegationService`'s one command queue;
- persistence coordinator/store -> public `AgentOperationResult`, task/message policy, retry, rollback, or best-effort Team file sync;
- frontend/component -> backend manager or serialized execution key.

## 9. Exact Removal And Rename Inventory

| Current item | Target action | Replacement |
| --- | --- | --- |
| `RootTeamRunState` proposal | remove from current design before implementation | `RootTeamRun` facade plus explicit tree/task/message/persistence/event owners |
| generic root `revision` | rename and narrow | non-persisted `changeSequence` owned only by `TeamRunEventPublisher` |
| `commitReservedMessage(nextMessages)` complete-snapshot boundary | remove | `commitReservedMessageAppend(PreparedTeamMessageAppend)` derives from current state under root lock |
| `commitTaskActivation(nextTree,nextTasks)` / `commitTaskTransition(nextTasks)` precomputed-snapshot boundaries | remove | one task queue head constructs typed `PreparedTaskMutationCommit`; coordinator returns a narrow internal phase result |
| destructive `settleDirectTask()` before execution-tree durability | remove | `prepareDirectTaskSettlement()` -> tree-only root commit -> committed local teardown capability |
| direct task/message store temp-write/rename implementations and Team use of best-effort `atomicWriteJsonFile()` | remove from the three Team authorities | strict shared `TeamRunFileCommitWriter` phase result |
| broad `TeamManager` root/local interface | split | root operations on `RootTeamRun`; local operations on `TeamRun`/backend |
| `MixedPersistentMemberRegistry` | rename | `MixedConfiguredMemberRegistry` |
| `MixedParentBoundaryContext` / `parentBoundary` | remove | root services route by exact tree/index/run IDs |
| `TaskTeamActiveExecutionResolver` | remove | `TeamExecutionIndex` + `TeamRunResolver` |
| `task-agent-directory.ts` | remove after root transition | tree/index for facts; manager registry for local handles |
| `task-team-active-run-directory.ts` | remove | `TeamRunResolver` private exact TeamRun map |
| manager-owned `TeamRecipientResolver` | move to root composition | one root logical resolver shared by message/task |
| manager event listener set | remove | root `TeamRunEventPublisher` |
| manager task-activation event barrier | remove | root task activation sequencing and root event publisher barrier |
| local termination disposing root directories | remove | each root owner disposes its own resources |
| copied `taskId`, `teamExecutionAddress`, task-Team chain in `MixedTeamRunContext` | remove | task records + execution tree/index |

## 10. Sequenced Refactor

1. Add the target `RootTeamRun` boundary and move `AgentTeamRunManager` root registration/integrations to it without changing product behavior.
2. Add current-schema `TeamRunExecutionTree`, `TeamExecutionIndex`, `TeamRunResolver`, and the three-file stores behind `RootTeamRun`.
3. Move logical/exact routing, task lifecycle, communication acceptance/history, persistence ordering, and root event subscription to the root subject owners; route every task lifecycle command through one private FIFO task queue; replace task/message precomputed snapshot boundaries with typed task commands or the sealed message append plan; add the strict Team file phase-result writer.
4. Shrink `TeamRun`/`TeamRunBackend` to exact local operations and inject one root event sink.
5. Rename the configured-member registry and remove parent-boundary/composite-chain/task-directory dependencies from local managers and child factories.
6. Route task activation, submit, review, interruption, settlement, task Team registration, exact messaging, commands, status, and teardown through the new boundaries; split terminal task-record transition from tree-only settlement; add root-scoped persistence/lifecycle fail-stop and strict reload for indeterminate or postcommit-cleanup failures.
7. Cut backend/frontend transport to `changeSequence`; remove generic `revision` and all old composite-key consumers.
8. Remove obsolete files/types/branches only after repository allowlist scans show every production caller uses the target boundary.

## 11. Validation Seams

- Factory seam proves one manager is created for each root, configured child TeamRun, task TeamRun, and nested task TeamRun.
- Boundary seam proves public callers receive only `RootTeamRun`; root services never import `MixedTeamManager` or registries.
- Lazy configured-Team seam proves an exact host TeamRun is materialized by index-provided chain and registered once.
- Cross-branch task seam proves only the selected host manager prepares the fresh execution while the root service owns task state.
- Exact-run message/command seam proves the index selects one containing TeamRun and the manager receives only a direct run-ID command.
- Task command seam forces concurrent different-task submit/review and same-task competing transitions behind a barrier; it proves cumulative latest-state derivation in queue order, first-valid same-task semantics, activation-versus-transition ordering, and no task mutation outside the queue.
- Activation commit seam injects Agent and Team preparation, registration-reservation, event-seal/budget, tree-write, and task-write `not_renamed` failures and proves `not_started`, no registration/event/work; post-commit commit/event-enqueue/gate operations are no-throw and subscriber failure is isolated.
- Activation truth seam proves `renamed_finalization_indeterminate` never re-enters ordinary catch/abort/not-started handling, and proves successful `commitAfterDurability()` flips `releaseWork()` synchronously before the active result while provider execution still drains asynchronously.
- Message logical-commit seam forces two same-receiver plans and two different-receiver plans to reserve against the same initial state before either write finishes; all accepted calls retain one row, same-receiver provider order matches reservation/submission order, different-receiver rows follow root commit order, and no later input overtakes an unresolved reservation.
- Phase-aware writer seam injects before rename, immediately after rename, directory-open/sync/close, and successful finalization for tree/task/message files. Only `not_renamed` maps to clean cancel/rejection; only `committed` releases; indeterminate latches fail-stop, yields no domain result, and strict reload repairs whichever files survived.
- Message failure/teardown seam injects root-closing, current-endpoint, reservation-mismatch, duplicate-message-ID, and `not_renamed`; each cancels without row/event/dispatch. It also proves close rejects new task/message admission, drains earlier operations, serializes system interruption/settlement, then quiesces AgentRuns without task-queue/root-lock/reservation deadlock.
- Settlement seam starts from a durable `accepted` and `interrupted` task, prepares exact Agent and nested task-Team quiescence, and proves: earlier submitted Team-message reservations resolve before readiness; `not_renamed` restores the same routable execution; `renamed_finalization_indeterminate` exposes no result and releases nothing; `committed` makes the execution non-routable before the event/result and tears down only outside the root lock; postcommit cleanup rejection closes the root without rolling back `settledAt`.
- Initial status seam proves configured lazy, task Agent, and nested task-Team Agent snapshots use the same immutable status mapper/DTO as live/history; snapshot/event races yield snapshot-or-next-sequence with no loss.
- Termination seam proves local managers dispose only local handles while root services dispose only root resources.
- Snapshot race seam proves subscription barrier + consistent snapshot + `changeSequence` produces no lost/duplicated change.
- Allowlist scan rejects production `parentBoundary`, composite task-Team chain routing, task directories, manager-owned root resolver/listeners, `RootTeamRunState`, and bare event `revision`.

## 12. Non-Goals

- one giant manager for the entire rooted TeamRun;
- a new generic `runtime` abstraction;
- flattening the execution tree into a global graph;
- persisting live TeamRun objects or `changeSequence`;
- merging task records or communication messages into execution nodes;
- changing provider AgentRun input policy (the narrow reservation seam preserves the existing FIFO owner and policy);
- adding a persisted task/message revision, expected-base retry, outbox, replay, second task ledger/input queue, or fourth Team file to solve concurrent mutations/finalization;
- changing the three current JSON authorities or their field shapes.
