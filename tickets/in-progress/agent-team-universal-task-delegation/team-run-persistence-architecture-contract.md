# TeamRun Persistence Architecture Contract

## Status

- Status: `User Approved — SR-009 Exact Three-File Contract With Reversible Tree-Only Task Settlement`
- Scope: one rooted TeamRun, its configured/persistent executions, task-created executions, formal delegated tasks, and ordinary Team communication
- Governing principle: persist each independent fact once, derive placement and ancestry from the rooted tree, and use concrete run IDs for exact executions
- Review state: ARCH-REV-004 passed SR-008; SR-009 corrects CRR-001 CR-F-004 and retains CR-F-001–CR-F-003 as implementation corrections

## 1. Executive Decision

One root TeamRun directory has exactly three current-schema authorities:

```text
<root-team-memory-dir>/
├── team_run_execution_tree.json
├── task_delegation_records.json
└── team_communication_messages.json
```

There is no `team_run_manifest.json` and no separately persisted frontend projection.

| File | One question it answers | Facts it must not own |
| --- | --- | --- |
| `team_run_execution_tree.json` | Which logical placements were mounted, how were persistent Agents configured, which concrete TeamRun/AgentRun identities existed, and where were task executions hosted? | delegator-to-assignee work edges, formal task status/history, message content |
| `task_delegation_records.json` | Who delegated which work to which logical recipient, which fresh execution owns it, and what is the formal task lifecycle/history? | runtime containment, launch configuration, ordinary messages |
| `team_communication_messages.json` | Which exact AgentRun sent an ordinary message to which exact AgentRun, and what was sent? | task lifecycle, execution containment, topology |

The three authorities represent the rooted execution without collapsing three different subjects into one record:

```text
execution tree = concrete execution containment
 task records  = durable work relationships and task state
 messages      = durable communication facts
```

## 2. Identity Contract

### 2.1 Canonical logical address

A canonical logical address identifies one mounted Agent or AgentTeam placement in the root topology:

```text
/product_manager
/qa
/qa/automation/tester
```

It is absolute, case-preserving, canonical, and stable for the mounted topology snapshot. It never contains a TeamRun ID or AgentRun ID.

The root AgentTeam is structurally represented by `rootTeam`. Its internal logical address is `/`, but `/` is not an Agent-facing message or task recipient because it does not identify an executable ingress.

### 2.2 Concrete execution identity

| Subject | Exact identity | Reason |
| --- | --- | --- |
| Agent execution | `agentRunId` | Globally collision-checked concrete AgentRun identity; sufficient for focus, exact messages, task authorization, events, memory, and token usage |
| Team execution | `teamRunId` | Concrete TeamRun identity; sufficient for Team grouping, task-Team binding, containment lookup, and lifecycle |
| Logical target for a new task/message | canonical absolute `address` / `recipientAddress` | Selects a mounted placement, not an already-created execution |

A canonical address is not an exact execution identity because several task executions may share one logical address. A concrete AgentRun ID is not a logical target for `delegate_task` because delegation creates a new execution from the mounted placement.

### 2.3 Removed composite identity

The target current schema removes `TeamExecutionAddress` and its parallel fields:

```text
rootTeamRunId + taskTeamRunIds[] + memberAddress + taskAgentRunId
```

That value was an ancestry locator required by the predecessor runtime. In the target:

- `agentRunId` identifies an exact Agent execution;
- `teamRunId` identifies an exact Team execution;
- the execution-tree index derives logical address, immediate owning TeamRun, root TeamRun, task-Team ancestry, and task-root ancestry from containment;
- file and stream boundaries carry the root TeamRun ID once when root correlation is required.

No target runtime, wire, frontend, token, application, external-channel, task, or communication contract reconstructs or serializes an ordered task-Team run-ID chain.

### 2.4 Structural root correlation

`team_run_execution_tree.json` stores the root ID once:

```text
rootTeam.teamRunId
```

The other two files each store `rootTeamRunId`, which must equal that value. This correlation is necessary because those files travel through their own repositories and APIs. A per-record root ID is not stored.

## 3. Exact `team_run_execution_tree.json` Schema

### 3.1 Top-level shape

```ts
type TeamRunExecutionTreeFileV1 = Readonly<{
  schemaVersion: 1;
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: Readonly<{
    applicationId: string;
    bindingId: string;
  }> | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecution;
}>;
```

### 3.2 Root and configured persistent TeamRun shapes

```ts
type RootConfiguredTeamExecution = Readonly<{
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunId: string;
  coordinatorAddress: CanonicalAgentAddress;
  members: readonly ConfiguredMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

type ConfiguredTeamExecution = Readonly<{
  address: CanonicalTeamAddress;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: CanonicalAgentAddress;
  members: readonly ConfiguredMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

type ConfiguredAgentExecution = Readonly<{
  address: CanonicalAgentAddress;
  agentDefinitionId: string;
  role: string | null;
  description: string | null;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
}>;

type ConfiguredMemberExecution =
  | ConfiguredAgentExecution
  | ConfiguredTeamExecution;
```

The root omits `address`, `role`, and `description` because its structural position already means `/` and the current product has no independent root-placement role/description. It retains `teamDefinitionName` because `/` has no basename from which the root display name can be derived.

The tree deliberately does not persist authored Team instructions or `teamBackendKind`. Team instructions remain owned by the referenced Team definition and are resolved by `teamDefinitionId`, as they are in the current restore path. The only supported Team runtime backend is reconstructed as `MIXED`; persisting that constant on every Team node would not preserve an independent run choice. Configured Agent instructions likewise remain owned by `agentDefinitionId` rather than copied into the TeamRun file.

### 3.3 Launch configuration

```ts
type AgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
}>;
```

This is the exact normalized configuration required to restore or lazily launch that persistent AgentRun.

- `workspaceRootPath` remains per configured Agent because supported explicit/application launch paths permit different member workspaces.
- `workspaceId` is not persisted; the filesystem workspace ID is derived from the root path.
- `platformAgentRunId` is outside `launchConfiguration` because it is an allocated provider execution binding, not a launch choice.
- A task Agent or task-Team member derives this immutable configuration from the configured Agent at the same logical address; task nodes do not copy it.

### 3.4 Task execution roots

Every concrete TeamRun owns a `taskExecutions` array. Its entries are structurally discriminated by the exact run-ID field:

```ts
type TaskAgentExecution = Readonly<{
  address: CanonicalAgentAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
}>;

type TaskTeamExecution = Readonly<{
  address: CanonicalTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
}>;

type TaskExecution = TaskAgentExecution | TaskTeamExecution;
```

A task root stores only execution-specific facts. `agentDefinitionId`, `teamDefinitionId`, role, description, coordinator address, and launch configuration are derived from the unique configured node at `address` in `rootTeam`.

### 3.5 Task-Team member run bindings

A task Team is a fresh concrete execution of the configured Team at the same logical address. Its member bindings store only fresh run identity and provider binding:

```ts
type TaskTeamAgentExecution = Readonly<{
  address: CanonicalAgentAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
}>;

type TaskTeamNestedTeamExecution = Readonly<{
  address: CanonicalTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

type TaskTeamMemberExecution =
  | TaskTeamAgentExecution
  | TaskTeamNestedTeamExecution;
```

`members` records concrete member run bindings that were durably allocated/materialized. It does not copy the task Team's logical roster. The projector obtains the complete logical roster from the configured Team node at the task Team's `address` and overlays the bindings that exist. A newly created task Team persists its allocated subtree before work is released; migrated terminal history may legitimately contain only the concrete bindings that predecessor data can prove.

A task-Team root carries `startedAt`/`settledAt`. Nested configured TeamRun bindings do not repeat those timestamps because they share the enclosing task execution lifecycle. Independently delegated nested task roots have their own timestamps in the owning TeamRun's `taskExecutions`.

### 3.6 Structural discrimination; no redundant `kind`

The strict parser uses the containing field and mutually exclusive required keys:

| Context | Agent variant | Team variant |
| --- | --- | --- |
| `rootTeam.members` or configured Team `members` | requires `agentDefinitionId`, `agentRunId`, `launchConfiguration` | requires `teamDefinitionId`, `teamRunId`, `coordinatorAddress`, `members`, `taskExecutions` |
| any `taskExecutions` | requires `agentRunId`, `startedAt`, `settledAt`; forbids Team keys | requires `teamRunId`, `members`, `taskExecutions`, `startedAt`, `settledAt`; forbids Agent keys |
| task Team `members` | requires `agentRunId`, `platformAgentRunId`; forbids timestamps/configuration | requires `teamRunId`, `members`, `taskExecutions`; forbids timestamps/configuration |

No persisted `kind`, `relationshipToParent`, `memberPath`, `memberRouteKey`, task-Team chain, parent run ID, or duplicated lifecycle status is allowed.

### 3.7 Execution-tree invariants

1. All non-root addresses are strict canonical absolute addresses.
2. Configured addresses are unique across the root topology.
3. A configured Agent address has exactly one persistent `agentRunId`; a configured Team has exactly one persistent `teamRunId`.
4. Every `agentRunId` is unique in the file. Every `teamRunId` is unique in the file.
5. Each configured Team coordinator is exactly one direct configured Agent member.
6. Each task Agent address resolves to a configured Agent.
7. Each task Team address resolves to a configured Team.
8. Each task-Team member binding corresponds to a direct configured child of its source Team and preserves the same Agent/Team subject.
9. Tree containment is the only owner of immediate TeamRun parentage and ordered task-Team ancestry.
10. `settledAt: null` means the task execution can be live. A timestamp means it is terminal and cannot be contacted as a live execution.
11. Settled task nodes remain on disk for task/message/history referential integrity but are omitted from the live frontend execution tree.
12. A task execution root is referenced by exactly one task record after startup recovery completes.
13. `applicationBinding` is either `null` or one normalized application/binding pair shared by the root TeamRun. Migration rejects disagreeing non-null predecessor member contexts instead of selecting one.
14. When `applicationBinding` is non-null, the V6 per-Agent application execution context is derived from that binding plus the exact Agent node's `address` and `agentRunId`; it is not persisted again on the Agent node.

### 3.8 Persisted versus derived restore facts

| Runtime fact | Authority | Why it is not copied elsewhere |
| --- | --- | --- |
| Root display name | `rootTeam.teamDefinitionName` | `/` has no basename and history needs a stable root label. |
| Team authored name/instruction | Team definition selected by `teamDefinitionId` | Definition-authored content is not a concrete run allocation; current restore already resolves it from the definition service. |
| Agent authored instruction | Agent definition selected by `agentDefinitionId` | Same definition/run separation. |
| Team backend | supported runtime invariant `MIXED` | There is no current per-Team backend choice to preserve. |
| Agent launch choices | configured Agent `launchConfiguration` | These values are run-specific restore inputs and therefore are persisted once. |
| Workspace ID | workspace subsystem derived from `workspaceRootPath` | The path is the durable choice; the ID is a mechanical projection. |
| Team/application association | root `applicationBinding` | One root binding applies to the Team execution; per-Agent producer context derives from exact node identity. |
| Task launch choices | configured placement at task `address` | A task is a fresh execution of that mounted placement and does not own another configuration copy. |
| Team/member concrete ancestry | execution-tree containment | Parent IDs and ordered chains would be a second representation. |

## 4. Exact `task_delegation_records.json` Schema

### 4.1 Top-level and record shape

```ts
type TaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  records: readonly TaskDelegationRecord[];
}>;

type TaskExecutionReference =
  | Readonly<{ agentRunId: string }>
  | Readonly<{ teamRunId: string }>;

type TaskDelegationStatus =
  | "active"
  | "awaiting_review"
  | "accepted"
  | "interrupted";

type TaskDelegationRecord = Readonly<{
  taskId: string;
  delegatorAgentRunId: string;
  recipientAddress: CanonicalNonRootAddress;
  taskExecution: TaskExecutionReference;
  description: string;
  referenceFiles: readonly AbsoluteLocalPath[];
  status: TaskDelegationStatus;
  updates: readonly TaskUpdate[];
  createdAt: IsoTimestamp;
}>;
```

`recipientAddress` is retained even though the execution node has an `address`: it records the delegator's selected logical target. For an Agent target the two values match; for an AgentTeam it identifies the Team while exact contact enters through the coordinator AgentRun derived from the task Team node.

`status` is retained beside update history because it is the task's materialized current business state. The one task-transition owner writes both atomically and the strict reader replays updates to validate the stored status.

### 4.2 Update variants

```ts
type TaskSubmission = Readonly<{
  submissionId: string;
  message: string;
  referenceFiles: readonly AbsoluteLocalPath[];
  createdAt: IsoTimestamp;
}>;

type TaskReview = Readonly<{
  reviewId: string;
  reviewedSubmissionId: string;
  decision: "accept" | "request_revision";
  comment: string | null;
  referenceFiles: readonly AbsoluteLocalPath[];
  createdAt: IsoTimestamp;
}>;

type TaskInterruption = Readonly<{
  interruptionId: string;
  reason: string;
  createdAt: IsoTimestamp;
}>;

type TaskUpdate = TaskSubmission | TaskReview | TaskInterruption;
```

The strict parser discriminates updates by the mutually exclusive ID field. It does not persist a redundant `kind`.

Sender/receiver identities are not repeated on updates:

- every submission is authored by the exact assigned task AgentRun or the exact coordinator AgentRun derived from the assigned task TeamRun;
- every review is authored by `delegatorAgentRunId`;
- every interruption is authored by the root task lifecycle owner.

### 4.3 Reference files

A persisted reference is only its normalized absolute local path:

```ts
type AbsoluteLocalPath = string;
```

The API derives a stable reference ID from the owning task/message/update ID plus path and derives presentation type from the path. Per-reference `referenceId`, `type`, `createdAt`, and `updatedAt` are not persisted because the current product does not independently mutate them and their attachment time is the parent record/update/message timestamp.

### 4.4 Task invariants

1. `taskId` is unique within the root file.
2. `delegatorAgentRunId` resolves to exactly one Agent execution in the execution tree, including settled history.
3. `recipientAddress` resolves to one configured non-root Agent or AgentTeam.
4. `{agentRunId}` resolves to one task Agent root whose `address === recipientAddress`.
5. `{teamRunId}` resolves to one task Team root whose `address === recipientAddress`.
6. An active/awaiting task execution is unsettled.
7. An active/awaiting Team task has a concrete coordinator Agent binding at the configured coordinator address.
8. `accepted` can precede runtime settlement while open-child/runtime-work gates finish.
9. `interrupted` is terminal; its execution remains a valid unsettled terminal execution until the separate settlement command durably sets `settledAt`.
10. Update order is append-only and validates the state machine:

```text
active --submission--> awaiting_review
awaiting_review --request_revision--> active
awaiting_review --accept--> accepted
active|awaiting_review --interruption--> interrupted
```

11. A failed activation creates no record and no task ID is exposed as active.

## 5. Exact `team_communication_messages.json` Schema

```ts
type TeamCommunicationMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  messages: readonly TeamCommunicationMessage[];
}>;

type TeamCommunicationMessage = Readonly<{
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly AbsoluteLocalPath[];
  createdAt: IsoTimestamp;
}>;
```

### 5.1 Communication invariants

1. Both AgentRun IDs resolve in the same execution-tree package.
2. The sender and receiver can occupy the same logical address only if their concrete AgentRun IDs differ.
3. `messageId` is unique within the root and owns deduplication.
4. A formal task submission/review is not duplicated as an ordinary message.
5. Framework task notifications are not rewritten into task state; task state remains in the task file.
6. New delivery to a settled task AgentRun fails before append. Existing history remains readable.
7. Message type is a non-empty application/domain label; the communication owner does not infer task semantics from it.
8. A row is appended only while the exact receiver AgentRun owns one unreleased FIFO reservation for that input. The communication service submits an immutable one-shot append plan, not a full next snapshot. Under the root mutation lock, that plan validates current root/endpoints/reservation/message-ID absence, derives current-plus-message, and writes it through the phase-aware Team writer. Conflict or `not_renamed` cancels the plan/reservation; `committed` synchronously commits memory/event/reservation and releases the FIFO entry; `renamed_finalization_indeterminate` fail-stops the root with the reservation/event still hidden and produces no ordinary operation result. The file is accepted-message history, not a delivery/outbox queue, and reload never replays it into an AgentRun.
9. Overlapping accepted sends cannot derive from the same stale base. Same-receiver order is the synchronous AgentRun-reservation/plan-submission order; different receivers commit independently to their AgentRuns but all rows are retained in root-lock order. No persisted revision or retry/replay mechanism participates.

## 6. Exact Scenario Fixtures

The following checked-in JSON fixtures are normative examples of the schemas above. Each directory contains all three files, including empty authorities, so readers and tests validate the complete package rather than isolated fragments.

| Scenario | Directory | What it proves |
| --- | --- | --- |
| CASE-001 persistent only | `persistence-scenarios/case-001-persistent-only/` | configured root/nested TeamRun topology, per-Agent launch configuration, no tasks/messages |
| CASE-002 active task Agent | `persistence-scenarios/case-002-active-task-agent/` | cross-branch logical task target, task Agent hosted by the target TeamRun, exact ordinary messaging by AgentRun ID |
| CASE-003 nested task Team | `persistence-scenarios/case-003-nested-task-team/` | fresh task Team subtree, nested concrete Team binding, task created by a task-Team Agent, nested host containment, formal submission, exact peer message |
| CASE-004 settled task | `persistence-scenarios/case-004-settled-task/` | accepted task history and settled execution retained on disk |
| CASE-005 restart interruption | `persistence-scenarios/case-005-restart-interruption/` | nonterminal task converted to terminal `interrupted` with settled execution after restart |

Canonical absolute directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/persistence-scenarios`

No example-only attribute is allowed. Implementation schemas and fixtures must remain byte-shape compatible except for values and array cardinality.

A disposable strict validator accepted all 15 files and reported:

```text
PASS {'files': 15, 'agents': 43, 'teams': 22, 'taskRoots': 5, 'tasks': 5, 'messages': 2}
```

The durable implementation must replace that disposable script with project-native strict validators and tests.

## 7. Operation And Data-Flow Spines

### EXE-001 — create root TeamRun

```text
Team launch input
  -> TeamDefinitionTopologyPlanner mounts one canonical configured tree
  -> run identity allocators assign persistent TeamRun/AgentRun IDs
  -> TeamRunExecutionTree validates the current execution-containment snapshot
  -> TeamRunPersistenceCoordinator writes execution tree + empty task/message files through TeamRunFileCommitWriter
  -> not_renamed before complete package: ordinary launch failure, no publication, incomplete residue removed by later package scan
  -> renamed_finalization_indeterminate: no ordinary launch result and no publication; strict reopen determines whether a complete package survived
  -> all three committed: RootTeamRun registers its root TeamRun and becomes addressable/streamable
```

Owner: public `RootTeamRun` boundary. The planner owns construction, `TeamRunExecutionTree` owns accepted containment facts, and the persistence coordinator owns the physical commit.

### EXE-002 — universal task delegation to an Agent

```text
delegate_task(recipient_address)
  -> root TeamRecipientResolver resolves configured Agent
  -> TeamExecutionIndex derives caller Team ancestry
  -> TeamExecutionScopeResolver selects the nearest ancestor subtree containing the target Agent's parent address and follows configured Team members to the exact parent TeamRun
  -> root-owned TaskDelegationService allocates task/AgentRun IDs and prepares work behind a closed gate
  -> host seals the task Agent, local slot, activation payload, event lease, and immutable snapshots
  -> TeamRunPersistenceCoordinator commits tree first, then task; task-file directory sync is the COMMIT POINT
  -> one synchronous no-throw closure commits memory/local slot, enqueues activation, and opens work
  -> publisher isolates subscribers; result returns task_id/status/target_agent_run_id
```

The target AgentRun ID is the new task AgentRun ID.

### EXE-003 — universal task delegation to an AgentTeam

```text
delegate_task(recipient_address)
  -> root resolver resolves configured non-root Team
  -> execution index derives caller Team ancestry
  -> scope resolver selects the nearest ancestor subtree containing the target Team's parent address and follows configured Team members to the exact parent TeamRun
  -> task Team factory allocates and fully prepares fresh Team/member run bindings behind closed work gates
  -> TeamRunResolver reserves every fresh TeamRun ID without exposing it; preparation/event lease/snapshots are sealed
  -> TeamRunPersistenceCoordinator commits subtree first, then task; task-file directory sync is the COMMIT POINT
  -> one synchronous no-throw closure commits memory/registrations, enqueues activation, and opens coordinator work
  -> result returns coordinator AgentRun ID as target_agent_run_id
```

The task record references the task Team by `teamRunId`; the coordinator AgentRun is derived from that node and its configured coordinator address.

### EXE-004 — exact ordinary message

```text
send_message_to(recipient_address | target_agent_run_id)
  -> root recipient/execution resolver returns exact receiver AgentRun
  -> receiver AgentRun FIFO owner synchronously reserves the exact input without provider release
  -> rejected reservation returns with no communication row
  -> without await, TeamCommunicationService seals/submits immutable row + reservation + preallocated event slot
  -> persistence coordinator acquires the root mutation lock
  -> plan reads the service-owned current snapshot, validates root/endpoints/reservation/message-ID absence, and derives current-plus-message
  -> phase-aware writer returns not_renamed | renamed_finalization_indeterminate | committed while reservation blocks overtaking
  -> conflict/not_renamed synchronously cancels; indeterminate fail-stops the root with no normal result; neither dispatches provider input/event
  -> committed synchronously swaps message memory, commits event slot + reservation, then releases the exact reservation
  -> existing AgentRun FIFO dispatcher consumes it in reserved order
```

No message path edits task status, and the communication file is never replayed as an input queue.

### EXE-005 — result, review, and settlement

```text
submit_task_result
  -> immutable command enters root task-command FIFO
  -> at queue head, task service reads latest tasks and authorizes exact assignee AgentRun/source state
  -> derive cumulative task snapshot, append submission, and set awaiting_review in one task-file commit
  -> notify exact delegator AgentRun

review_task_result
  -> immutable command enters the same FIFO
  -> at queue head, read latest tasks and authorize exact delegator AgentRun/source state
  -> derive cumulative task snapshot, append review, and set active|accepted in one task-file commit
  -> notify assignee
  -> accepted task submits settlement through the same task-command FIFO after safe-settlement gates
  -> selected local TeamRun prepares reversible quiescence and waits prior reservations/dispatch without a root lock
  -> revalidate terminal task + exact execution, derive only the execution-tree settledAt change
  -> execution-tree not_renamed cancels quiescence and retains the same live terminal execution
  -> execution-tree committed synchronously detaches the execution and swaps tree/event truth
  -> committed cleanup capability terminates/disposes the exact Agent/task-Team subtree outside the root lock
```

Two different-task commands accumulate in queue order. Two commands for one task revalidate against the first command's committed state; only a still-valid next transition can proceed. No task caller supplies a complete `nextTasks` or `nextTree` snapshot.

### EXE-006 — initial frontend projection

```text
Team workspace connection enters `RootTeamRun`
  -> TeamRunEventPublisher subscribes/queues and opens the snapshot barrier
  -> RootTeamRun captures one consistent snapshot from tree/task/message owners
  -> root `TeamRun.getLeafAgentStatusSnapshots()` recursively supplies immutable configured/task Agent statuses
  -> TeamExecutionViewProjector builds tree/index/task/message DTOs and uses the canonical status mapper/DTO shared with live/history
  -> GraphQL/WebSocket returns one snapshot carrying current changeSequence
  -> TeamExecutionViewState indexes Agent nodes by agentRunId and Team nodes by teamRunId
  -> navigation renders containment and overlays task/message presentation
```

The browser never parses serialized composite keys or reconstructs parentage from run-ID chains.

### EXE-007 — live frontend update

```text
accepted root change
  -> TeamRunEventPublisher assigns changeSequence N+1
  -> TeamExecutionViewProjector emits one typed N+1 event
  -> one frontend reducer applies execution/task/message/status change
  -> change-sequence gap or conflict triggers full snapshot reload
```

Frontend-only expansion, selection, drafts, scroll, and unread state remain local and are not added to the three files.

## 8. In-Memory Root Boundary And Index

The three persisted subjects are coordinated behind one public `RootTeamRun` boundary. They do not become one mutable state object:

```ts
class RootTeamRun {
  private readonly rootExecution: TeamRun;
  private readonly executionTree: TeamRunExecutionTree;
  private readonly executionIndex: TeamExecutionIndex;
  private readonly teamRunResolver: TeamRunResolver;
  private readonly taskDelegationService: TaskDelegationService;
  private readonly communicationService: TeamCommunicationService;
  private readonly persistenceCoordinator: TeamRunPersistenceCoordinator;
  private readonly eventPublisher: TeamRunEventPublisher;
}
```

`RootTeamRun` is a thin authoritative facade. `TeamRunExecutionTree` owns containment, `TaskDelegationService` owns task records/lifecycle, and `TeamCommunicationService` owns accepted-message history/current state/append policy. `TeamRunPersistenceCoordinator` owns the root mutation lock and physical commits; for messages it executes the sealed service-owned append plan against current state inside that lock. `TeamRunEventPublisher` owns only non-persisted live ordering. Every concrete `TeamRun` privately owns one local `MixedTeamManager`; the full root/local contract is `team-run-management-contract.md`.

`TeamExecutionIndex` is derived, never persisted:

```text
agentRunId -> Agent node + canonical address + immediate TeamRun + ancestors + task root/null
 teamRunId -> Team node + canonical address + parent TeamRun + ancestors + task root/null
 address   -> configured logical Agent/Team node
scope+address -> configured Team descendant reached through members only
 task run  -> owning task record
```

The index is the only current-execution authority for deriving concrete ancestry and owner-local facts. Public operations use `RootTeamRun`; they do not depend on both that boundary and its stores/index/managers. Root services use `TeamRunResolver` to reach one exact local `TeamRun`, never a manager or registry directly.

## 9. Frontend Contract

The frontend displays a projection of the execution tree, not a second execution model.

- Tree containment comes only from the execution file.
- The navigation projector groups concrete executions under their canonical logical placement. A task execution appears as an indented child row beneath that placement, never merged onto the primary execution's row.
- This visual grouping does not change persisted containment and does not make a task execution a child of the primary AgentRun/TeamRun. The placement groups sibling concrete executions that share an address; exact run IDs remain the row identities.
- Every Agent or AgentTeam task row uses the same visible label: `Task:` plus a normalized, truncated prefix of the task description. The row icon and AgentTeam expand/collapse affordance convey the execution variant. Ordinary navigation has no secondary task-ID or run-ID label; exact IDs remain internal identities. Opening the row reveals the full description.
- Exact Agent focus/input/history uses `agentRunId`.
- Exact Team expansion/group identity uses `teamRunId`.
- Logical labels/configuration use the node `address` and configured snapshot.
- Formal task labels/state/edges come from task records.
- Messages use exact sender/receiver AgentRun IDs.
- Settled task roots remain queryable in history but are absent from the live navigation tree.

The target removes:

- serialized `TeamExecutionAddress` map keys;
- `taskTeamRunIds` parsing in frontend consumers;
- placeholder task trees manufactured independently from events;
- duplicate lifecycle ownership across GraphQL hydration, WebSocket handlers, focus, status, and cleanup;
- candidate convenience fields such as `taskSummaries` or `recentActivity` that have no independent domain authority.

One `TeamExecutionViewProjector` and one `TeamExecutionViewState` reducer own initial and live projection respectively. Snapshot and live DTOs carry `changeSequence`; it is a connection-order fact, is not persisted, and is not called `revision`.

## 10. Physical Write And Recovery Contract

### 10.1 Runtime serialization

One private FIFO `TaskDelegationCommandQueue` inside `TaskDelegationService` serializes every task lifecycle mutation from current-state read through result. One `TeamRunPersistenceCoordinator` root lock serializes subject-specific physical changes to the three authorities. Callers never write stores directly, no task mutation bypasses the task queue, and neither boundary accepts a generic mutate callback.

Each individual file write uses:

```text
normalize -> validate -> write same-directory temp -> fsync file -> atomic rename -> fsync directory
```

The strict Team writer returns exactly one internal result:

```ts
type TeamRunFileWriteResult =
  | { outcome: "not_renamed"; file: TeamRunFileRole; stage: PreOrRenameStage; cause: Error }
  | { outcome: "renamed_finalization_indeterminate"; file: TeamRunFileRole; stage: "open_directory" | "sync_directory" | "close_directory"; cause: Error }
  | { outcome: "committed"; file: TeamRunFileRole };
```

It records successful rename before directory finalization. A failure before that point removes the temp file and is known not to have changed the final pathname. A failure after rename is not converted to ordinary failure or hidden as best effort. The three target stores use this writer; unrelated existing users of the generic best-effort writer are outside this boundary.

### 10.2 Task command logical commit

`TaskDelegationService` owns one private FIFO `TaskDelegationCommandQueue` for the root. `activate`, `submit_result`, `review_result`, `interrupt`, and `settle` are immutable commands, not complete replacement snapshots. Every task command follows the same bounded local spine:

```text
accepted task command
  -> wait at one TaskDelegationService-owned FIFO
  -> at queue head read latest authoritative task records and execution tree
  -> authorize the exact caller/system actor and validate the exact source state
  -> derive one cumulative typed task-mutation plan from that current state
  -> validate all next task/tree references
  -> TeamRunPersistenceCoordinator acquires the root mutation lock and performs the typed physical commit
  -> committed record transition: synchronously swap task memory and publish the preallocated event
  -> committed settlement: synchronously detach exact execution, swap tree memory, publish settlement, and return local cleanup capability
  -> not_renamed: leave memory unchanged and return the operation-owned rejection
  -> renamed_finalization_indeterminate: fail-stop the root and produce no ordinary task result
```

The queue owns business ordering and latest-state derivation; the coordinator owns only root-lock serialization and phase-aware physical writes. The coordinator accepts three exact subject operations: activation (`tree + tasks`), record transition (`tasks`), and terminal-execution settlement (`tree` only). It never accepts a generic callback or a caller-precomputed snapshot from outside the task owner. Different-task mutations accumulate in queue-admission order. A second command for the same task revalidates after the first command commits, so it proceeds only if its required source state is still valid. No notification is sent until the corresponding record transition is durably `committed`.

### 10.3 Task activation logical commit

The filesystem cannot atomically rename two independent files. The target uses one locked logical commit whose recoverable work ends before durability:

1. `TaskDelegationService` opens a root activation-event lease and asks the selected local TeamRun to prepare the complete Agent or Team execution behind a closed work gate; provider input cannot start;
2. for Team tasks, `TeamRunResolver` reserves every fresh TeamRun ID in a hidden registration reservation; normal exact lookup cannot observe it;
3. build an immutable activation proposal and correlated event; `PreparedTaskExecution.sealForCommit()` finishes construction and prevents further task-local events until release; `TeamRunEventPublisher.sealTaskActivation()` validates the lease budget/payload and reserves one hidden prepared event-batch slot containing the activation plus retained events;
4. submit the sealed proposal to the one FIFO task-command queue. At queue head, revalidate the open root, exact caller/recipient/host, task-ID absence, reservations, and latest authoritative tree/tasks; derive and strictly validate cumulative next tree/task snapshots. `PreparedTaskActivationCommit.assertCommitReady()` validates local registry slots, resolver reservation, immutable snapshots, event queue capacity, coordinator ingress, and no-work-release latch. Every operation through this step may fail and is abortable;
5. use the phase-aware writer to replace `team_run_execution_tree.json` first; continue only on `committed`;
6. use the phase-aware writer to replace `task_delegation_records.json` second. A `committed` task-file result after the committed tree write is the exact **durable activation commit point**;
7. invoke one synchronous no-throw commit closure: replace immutable tree/task memory snapshots, consume local/TeamRun registration reservations, and flip the already-reserved prepared event batch to publishable. Later publisher drain assigns consecutive `changeSequence` values to activation then retained events;
8. synchronously open the no-throw Agent/coordinator work latch. Provider dispatch occurs later through the existing AgentRun owner;
9. return `{task_id,status:"active",target_agent_run_id}`. Subscriber callbacks drain after enqueue and each exception is isolated.

Preparation/validation failure or a `not_renamed` writer result aborts the prepared execution, resolver reservation, and event lease and returns `not_started`; it leaves no active task, public TeamRun registration, event, or released work. If the tree committed and the task file is `not_renamed`, the only residue is an unreferenced unreleased tree node removed by strict reload repair. A `renamed_finalization_indeterminate` result for either file does **not** abort and return `not_started`: the coordinator latches root persistence fail-stop, leaves preparation/event/work hidden, emits no domain result, and closes the failed root after the lock unwinds. Strict reload later removes a tree-only orphan or interrupts/settles a surviving durable task. There is no recoverable failure branch after the commit point. Process loss after the commit point but before release similarly returns no public result; reload uses the durable files as truth and never replays task work. A provider failure after step 8 is an active task runtime outcome, not activation failure.

### 10.4 Accepted-message commit

One Team message crosses a file boundary and the existing AgentRun FIFO boundary without adding an outbox or second queue:

1. resolve and authorize exact sender/receiver AgentRun IDs; build one immutable message record and one canonical Agent input sharing the same `messageId`;
2. synchronously call `AgentRun.reserveUserMessage()`. Rejection returns immediately with no row. Success appends one `reserved` entry to the existing FIFO; that entry blocks later inputs from overtaking it, starts no provider work, and emits no public `admitted` fact yet;
3. in the same call stack with no intervening `await`, `TeamCommunicationService` preallocates the correlated `TEAM_MESSAGE_RECORDED` event slot and seals one one-shot `PreparedTeamMessageAppend` containing only the immutable message, exact reservation, event slot, and private access to its own current-state cell/current-reference validator;
4. call `TeamRunPersistenceCoordinator.commitReservedMessageAppend(plan)`. The coordinator queues/acquires the existing root mutation lock before invoking the plan. No caller-derived `nextMessages` or expected-base value crosses this boundary;
5. while holding the lock, `plan.prepareAgainstCurrent()` verifies the root is open; both endpoints still resolve to active same-root AgentRuns; the reservation is unresolved and belongs to the exact receiver; and `messageId` is absent. It derives/strict-validates `currentMessages + message` from the service-owned current snapshot. Conflict calls no-throw cancellation and returns a narrow internal conflict; `TeamCommunicationService` maps it to `{accepted:false,code:"TEAM_MESSAGE_COMMIT_CONFLICT",...}`;
6. the coordinator writes that exact derived snapshot through the phase-aware writer. `not_renamed` calls `cancelBeforeDurability()`, returns narrow `not_committed`, and the communication service maps `TEAM_MESSAGE_HISTORY_COMMIT_FAILED`. `renamed_finalization_indeterminate` latches root fail-stop, does not cancel/commit/release the reservation or event slot, and produces no normal collaboration result;
7. after durable success and before releasing the root lock, the prepared commit performs only synchronous no-throw operations: swap the service's immutable message-state pointer, flip the preallocated event slot publishable, commit the exact AgentRun reservation, and flip its committed FIFO entry eligible. AgentRun observers/provider dispatch and event subscribers drain only after this stack with their existing isolation; no callback/provider call occurs inline;
8. return the existing accepted collaboration envelope. Subscriber delivery drains later with isolation.

`AgentRun.postUserMessage()` is refactored over the same reserve/commit/release primitive for ordinary callers, so admission policy, active-turn behavior, FIFO order, interruption, and provider adapters remain singular. A reservation is a scoped AgentRun capability, not a Team-owned queue. Two overlapping plans cannot both derive from `M0`: the second prepares only after the first memory swap, so it writes `M0+A+B`. Synchronous reservation and plan submission with no intervening await preserves same-receiver FIFO order; different receivers have no shared provider order, while their rows are ordered and retained by root-lock acquisition. There is no persisted revision, stale-plan retry, replay, or expected-base loop.

Root teardown first marks the root closing, rejecting new task commands/message plans; then it drains the task queue and every already-submitted root-lock operation to `committed`, `not_committed`, or root fail-stop; only afterward does it run system interruption/settlement through the same task queue and quiesce/destroy AgentRuns. It never waits for a task command or reservation while holding the lock ahead of that work. Direct AgentRun quiesce racing a submitted append waits for that reservation's commit/cancel or root fail-stop disposal. A process loss or indeterminate finalization after rename may leave the history row without provider processing; no public success is returned and reload never replays the row.

### 10.5 Terminal task execution settlement

Task relationship completion and execution cleanup are deliberately two durable facts:

1. acceptance or interruption first commits the terminal task status in `task_delegation_records.json` through the normal task FIFO;
2. a later settlement command rereads the current terminal task and current execution tree, rejects open child tasks, and resolves the exact owner `TeamRun`;
3. outside the root lock, the local owner returns one opaque `PreparedTaskSettlement`. It reserves the exact task registry entry, closes new input, waits every earlier unresolved AgentRun reservation plus active dispatch, recursively prepares a task-Team subtree, and rechecks local open work. It performs no provider termination, registry deletion, resolver unregistration, file write, or event publication;
4. at the same task queue head, revalidate the terminal record and exact unsettled binding, then derive and validate only `nextTree` with that execution's `settledAt`;
5. under the root lock, write `team_run_execution_tree.json` through the phase-aware writer;
6. on `not_renamed`, synchronously cancel the prepared capability in reverse order and restore the same routable/admitting execution. Task status remains terminal and tree `settledAt` remains null. No in-command persistence retry occurs;
7. on `renamed_finalization_indeterminate`, call neither cancel nor commit, preserve the hidden capability, latch root persistence fail-stop, and expose no ordinary result;
8. on `committed`, synchronously commit the capability so the exact execution is absent from normal local/root lookup, swap the immutable tree pointer, and enqueue the settlement event. Return the committed cleanup capability to `TaskDelegationService`;
9. after the root lock unwinds, the capability terminates/disposes the exact Agent or task-Team subtree and releases inactive `TeamRunResolver` registrations. Provider calls never occur under the root lock;
10. if committed cleanup rejects, durable `settledAt` remains authoritative. The root enters lifecycle fail-stop and closes; the error is not mapped as a persistence failure and no rollback/recreation occurs. Strict reload omits the settled execution.

An ordinary `AgentRun` termination preparation never deletes an unresolved Team-message reservation. It becomes ready only after every reservation already submitted before quiescence has committed or cancelled and every released/active dispatch has reached its owned terminal point. Only exceptional root fail-stop disposal may force-release a deliberately hidden finalization-indeterminate reservation.

This seam adds no `settling` status, retry loop, outbox, second task ledger, fourth Team JSON file, or provider-specific lifecycle owner.

### 10.6 Startup/reopen repair

Before a TeamRun becomes readable/contactable:

1. inspect the target file set. A target-only root-creation residue that lacks any of the three required files and has no predecessor source is never cataloged; remove/ignore it with a diagnostic. A predecessor package remains migration-owned rather than entering this loader;
2. strict-load all three files for a complete target package;
3. remove any unreferenced task execution node left by an interrupted activation commit;
4. for every task execution with `settledAt: null`, record settlement at the recovery timestamp because live task recovery is not supported;
5. preserve `accepted` tasks and append an interruption/update only to `active` or `awaiting_review` tasks;
6. validate every task/message AgentRun/TeamRun reference again;
7. persist repaired files under the same root lock through the same phase-aware writer;
8. if repair returns `not_renamed` or `renamed_finalization_indeterminate`, keep the root unavailable and return a root-load diagnostic; never expose a partially reconciled instance;
9. only after every required repair write is `committed` and the package revalidates may the root expose history or allow a new runtime.

This is current-schema crash/finalization recovery, not a legacy reader or compatibility fallback. A failed root instance is never reused in memory. Explicit reopen and server restart both enter this same strict loader; other roots remain available.

### 10.7 Retention

Task execution nodes, records, messages, and Agent memory remain together for the life of the root TeamRun history package. This ticket adds no per-node compaction. Existing archive/delete behavior may remove the whole root package as one retention action after authorization.

## 11. Persisted-Data Transition

### 11.1 Decision

- Framework-owned TeamRun/task/communication/token/external-channel data: **Migration Required**.
- Application framework project data: **Discard or Rebuild**; the application framework remains forward-only and receives no compatibility/migration machinery.
- Agent memory/raw trace directories: **Directly Usable — No Physical Relayout**; execution-tree ancestry indexes the existing paths.

### 11.2 New migration owner

A new independently pending startup migration owns the clean cut:

```text
20260814_team_run_execution_tree_v1
```

It runs after the base branch's canonical-identity migration but never relies on changing or rerunning a completed predecessor ID. Current runtime readers accept only complete validated three-file V1 packages cataloged by the migration attempt; unresolved predecessor packages remain invisible to them.

### 11.3 Supported predecessor evidence

The predecessor stores contain enough exact facts for safe reconstruction in supported cases:

- schema-v3 Team metadata supplies configured logical addresses, persistent TeamRun/AgentRun IDs, launch settings, handoffs, timestamps, and application context;
- task `taskRun.address` supplies the logical task root and exact task AgentRun or task TeamRun ID;
- task sender/receiver addresses, token rows' exact `run_id`, and task-Team physical memory directories correlate executed task-Team Agents to logical addresses;
- physical directory ancestry supplies concrete nested TeamRun containment when a nested task-Team member executed;
- communication endpoints and token rows provide a cross-check for task-Team Agent mapping.

For an application-bound predecessor root, every non-null member application context must agree on `applicationId` and `bindingId`; the migration writes that pair once as top-level `applicationBinding`. It derives the V6 producer identity from each exact target Agent node rather than carrying predecessor per-member composite producer objects forward.

Predecessor task-Team allocations that never produced any durable member execution evidence are not invented. Terminal migrated task Teams may therefore contain only provable concrete member bindings while their full logical roster remains derivable from the configured source Team.

### 11.4 Migration sequence

```text
startup before root catalog exposure
  -> inventory every predecessor/current root package + token DB + external-channel rows
  -> for each predecessor root, build its exact AgentRun/TeamRun correlation index
  -> plan its three V1 JSON targets plus dependent token/external-channel changes
  -> validate the complete root-local cross-file graph with zero unresolved references
  -> retry bounded transient planning/staging operations without changing source bytes
  -> create that root's durable backup and same-directory staged JSON files
  -> promote that complete V1 root package idempotently
  -> independently convert the complete supported token cohort in one store-owned DB transaction from protected predecessor evidence
  -> update successfully planned external-channel exact entry identity to AgentRun ID
  -> re-read every promoted package/row with target-only readers
  -> catalog only complete validated V1 roots
  -> record SUCCEEDED only when no predecessor root remains unresolved; otherwise record retryable FAILED with root-local diagnostics
  -> after the migration attempt finishes, open server listen with the valid target-root catalog (possibly empty)
```

If any task-Team Agent or nested TeamRun mapping is ambiguous, the migration reports the root/task/message/token identifiers, leaves that root's predecessor bytes unchanged, excludes that root from the current target catalog, and remains `FAILED` so the established migration runner retries it on a later startup. It never guesses from directory order, display text, or a preferred legacy field. A failing predecessor root does not block valid target roots, newly created Teams, GraphQL/WebSocket startup, or application startup. If no predecessor root converts, the server starts with no restored historical Team roots.

A retry recognizes already-promoted V1 roots, validates/skips them, and resumes only unresolved predecessor roots idempotently. Historical parsing, correlation, backups, and staged recovery remain isolated under `app-data-migrations`; normal runtime code enumerates only validated V1 packages and has no dual reader, alias, fallback serializer, empty compatibility projection, lazy conversion, or V3 branch. Migration resilience therefore does not weaken the forward-only source cut.

Token conversion does not wait for every execution-tree root to be cataloged. Every supported predecessor token row already owns exact `run_id`; optional `root_team_run_id` derives directly from its predecessor Team execution context without resolving that Agent into a target tree node. Before the table rebuild, migration retains a protected predecessor table/backup as evidence for any excluded root's later JSON retry. The store then converts the complete supported token cohort atomically to target columns. Current token runtime reads only the target table; migration-only retry may consult the protected predecessor evidence. No current service reads the predecessor table or joins it as a fallback.

### 11.5 Token, application, and external-channel clean cuts

- Token usage keeps `run_id` as the exact Agent execution and `root_team_run_id` as optional Team root context. The composite `execution_address_json` and legacy route/task identity columns are removed through the store-owned transactional table rebuild after validation.
- Team application producer identity becomes `agentRunId`; `applicationId`/`bindingId` are stored once as the root `applicationBinding` and/or application binding store. Per-Agent composite producer context is derived rather than copied into every launch configuration.
- Team external-channel output correlation becomes `{teamRunId, entryAgentRunId}`. `targetMemberAddress` remains the logical configured dispatch target; an observed output stores the exact AgentRun that produced it.
- Application backend-definition and frontend SDK Team execution contracts move atomically from V5 to V6. Constants, source types, backend/frontend SDKs, devkit writers/validators/templates, server manifest/parser/definition loader, web consumers, tests, and generated/vendored `dist` artifacts must agree on V6. No V5 adapter is admitted and no application data migration is added.

## 12. Field Tightness Audit

| Field/candidate | Verdict | Reason |
| --- | --- | --- |
| canonical `address` on nodes | Keep | intrinsic logical placement; not derivable from run ID without the tree and required to mount/project the tree |
| `agentRunId` / `teamRunId` | Keep | exact concrete identity |
| `recipientAddress` on task | Keep | delegator's logical intent; for Team tasks differs from coordinator ingress |
| task `status` plus updates | Keep | materialized current state plus append-only audit history; one owner validates equality |
| per-Agent `workspaceRootPath` | Keep | supported member-specific launch fact |
| `workspaceId` | Remove | derived from workspace root path |
| task copies of launch/definition/role/description | Remove | invariant projection from configured node at the same address |
| task-Team copies of coordinator/configuration | Remove | invariant projection from configured Team node |
| Team-bound Agent context copies of TeamRun/config/runtime/task facts | Remove | derive from `{rootTeamRunId, memberAddress, agentRunId}` through the root execution index; keep authored instruction/operation handlers outside identity |
| `TeamExecutionAddress` / task-Team run chain | Remove | exact run ID plus tree containment is smaller and complete |
| owner TeamRun ID on every Agent reference | Remove | derived by execution index; root context exists at aggregate/stream boundary |
| persisted node `kind` | Remove | exact structural variants and container context discriminate safely |
| `relationshipToParent` / parent IDs | Remove | tree containment is authoritative |
| task update sender/receiver | Remove | fixed by task roles and update variant |
| reference object metadata | Remove | path plus parent identity/timestamp derives current behavior |
| `startedAt` / `settledAt` on task roots | Keep | independent execution lifecycle facts; not equivalent to formal task status |
| `schemaVersion` per file | Keep | independently stored strict contract and migration admission |
| `applicationBinding` at root | Keep when non-null | restore requires application/binding identity; producer Agent identity derives per node |
| Team instruction / Agent instruction | Do not copy | definition-authored content remains owned by `teamDefinitionId` / `agentDefinitionId`, matching current restoration |
| `teamBackendKind` | Remove from persisted tree | current Team runtime is unconditionally `MIXED`; not an independent run selection |
| `taskSummaries` / `recentActivity` | Do not add | unowned convenience duplication; projection can compute presentation |

The resulting three files contain no field solely to make one reader convenient.

## 13. Removal Inventory

The implementation must remove, not deprecate:

- `team_run_metadata.json` current writer/reader after migration; replace with `team_run_execution_tree.json`;
- `TeamExecutionAddress`, DTOs, serializers, parsers, composite keys, and `taskTeamRunIds` traversal;
- `ActiveTaskExecutionBinding.kind` plus composite execution address; replace with exact structural run reference and execution-tree lookup;
- per-record task sender/receiver execution addresses and update sender/receiver copies;
- communication sender/receiver execution addresses;
- duplicated task/communication reference metadata;
- per-Agent Team application execution-address copies;
- external-channel `entryExecutionAddress`;
- token `executionAddressJson` and route/task identity fallbacks;
- frontend maps and consumers keyed by serialized execution address;
- separate task-node materializers that manufacture execution topology from events/records;
- relative Agent-facing address parsing and direct-child task eligibility;
- any compatibility reader/writer, alias, guessed default, or fallback introduced only for the predecessor schema.

Migration-only converters may retain historical field knowledge under the isolated migration folder.

## 14. Validation Contract

Implementation and downstream coverage must prove:

1. strict schema acceptance for all 15 normative fixture files;
2. rejection of extra keys, mixed Agent/Team keys, duplicated IDs, invalid addresses, invalid coordinators, and invalid task state replay;
3. deterministic projection of each fixture into the expected live tree;
4. active task Agent, active task Team, nested task, repeated same-address task, cross-branch task, accepted settlement, and restart interruption;
5. exact messages by AgentRun ID in persistent, task-Agent, and task-Team contexts;
6. task Team delegation returns the configured coordinator AgentRun ID;
7. task activation failure and injected write failure expose neither an active record nor released work;
8. crash residue repair removes orphan task nodes and terminalizes stale nonterminal tasks before listen;
9. migration from representative schema-v3 persistent/task-Agent/task-Team/nested-task/message/token/external-channel data;
10. ambiguous predecessor correlation is root-local no-mutation, leaves the migration retryable, excludes only that root, and does not block target-only startup or new Team creation;
11. token DB conversion preserves protected predecessor evidence, converts the complete supported cohort transactionally, proves forced second-write/table-copy rollback plus bounded retry, and leaves current runtime with only the target table contract;
12. frontend initial snapshot and live deltas use the same projector/reducer and no consumer parses composite keys;
13. a source allowlist scan finds no target runtime use of `TeamExecutionAddress`, `taskTeamRunIds`, `taskAgentRunId`, `memberRouteKey`, `memberPath`, or `entryExecutionAddress` outside migration evidence;
14. AutoByteus, Codex, and Claude execute the universal absolute-address task/message scenarios using the maintained imported nested-classroom Team.

### 14.1 Focused lifecycle/projection proof additions

- Agent and Team activation inject `not_renamed` failure at preparation, registration reservation, event seal/budget, tree write, and task write; each returns `not_started` with no public registration/event/work.
- Activation finalization-indeterminate proof shows no ordinary catch/cancel/abort/not-started mapping after rename. Successful activation proves `releaseWork()` flips synchronously within the no-throw committed closure before the active result; provider execution and subscriber callbacks still drain later with isolation.
- Message tests reserve one FIFO entry, force current-reference/message-ID/file commit failure, prove cancel/no dispatch/no row, then prove successful row-before-release and no overtaking by a later direct input.
- A deterministic concurrency barrier forces two same-receiver sends and two different-receiver sends to reserve from the same initial message state before either physical write completes. The final file/memory contains one row per accepted call; same-receiver provider dispatch matches reservation/plan-submission order; different-receiver history matches root-lock order; no plan writes `M0+A` over `M0+B`.
- A deterministic task-command barrier submits two valid different-task transitions from the same initial task state and proves the queue commits `T0+A` then `T0+A+B`; same-task competing commands revalidate against the first committed state and only a still-valid transition succeeds. Activation, submit, review, interruption, and settlement all use this same queue and no caller supplies complete replacement snapshots.
- Agent and nested task-Team settlement starts from durable `accepted` and `interrupted` records. It proves preparation is non-destructive; an earlier exact `send_message_to` reservation resolves before readiness; `not_renamed` restores the same exact execution; `renamed_finalization_indeterminate` exposes/releases nothing; and `committed` changes lookup/tree/event truth before provider cleanup outside the lock. Forced postcommit cleanup rejection closes the root without reversing `settledAt`.
- Phase-injection tests for all three Team JSON authorities distinguish `not_renamed`, `renamed_finalization_indeterminate`, and `committed`. Pre-rename failure permits clean abort/cancel; post-rename finalization uncertainty latches only the affected root unavailable, returns no ordinary domain result, releases no task/message work, and requires strict reload before re-exposure.
- Teardown/quiesce tests mark the root closing while message plans are queued: new plans reject; earlier plans commit or cancel; only then AgentRuns terminate. The test proves no root-lock/reservation deadlock and no release after destroyed-run cleanup.
- Connection tests collect configured lazy, task-Agent, and nested task-Team Agent status through the root `TeamRun`; initial/live/history use one status mapper/DTO.
- A status change forced on each side of snapshot collection is either in the initial snapshot or the next queued sequence; no browser reconstruction or duplicate status model is admitted.

## 15. Final Architecture Verdict

The target is one intuitive model:

```text
logical address chooses a mounted placement
run ID chooses an exact existing execution
tree containment says where execution lives
task record says who delegated work to which fresh execution
message record says which AgentRun talked to which AgentRun
```

This is smaller than the predecessor architecture because it removes parallel address/path/route/chain representations rather than wrapping them. It remains truthful for nested TeamRuns, task AgentTeams, restart history, frontend focus, exact messaging, and universal same-root delegation.
