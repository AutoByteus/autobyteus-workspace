# Design Spec — standalone-agent-run-root

## Solution And Approval Basis
- **Current solution revision ID:** `SR-006`. It adds § 11 "Root shutdown fence completion race" for the CRR-005
  Design Impact (API/E2E F-02; E-22). Everything else is as in SR-005. The requirements basis is `SR-002` (unchanged).
- **SR-005** refreshes the SR-004 design (ARCH-REV-002 Pass) onto the new base
  `b37d7a934` (E-15–E-21). The design substance is unchanged. The deltas are in "Base Refresh Deltas (SR-005)" below.
  The requirements basis is `SR-002` (unchanged).
- **Previous revision:** `SR-004` revised SR-003 for ARCH-REV-001 (AR-001–AR-003).
- **Approved requirements:** `requirements-doc.md`, Approved SR-002. The user said "no splitting. i think do it in this
  ticket. lets do it". Q-1–Q-4 were resolved as recommended.
- **Supplement:** the predecessor UI/UX spec, VIS-001–015 (host label, RD-004 rendering). No new visuals.
- **Design status:** `Ready`.
- **Investigation notes:** `investigation-notes.md` (E-01–E-22).
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`, branch
    `codex/standalone-agent-run-root`.
  - Base `origin/personal` @ `b37d7a934` (rebased 2026-10-04; originally `2d3b66005`). Target `personal`.
  - Branch head `9c3080a20` holds one checkpoint commit with the in-progress implementation and this ticket folder.

## Base Refresh Deltas (SR-005)
These are the only design changes from the rebase. Everything else in this spec stands as reviewed in ARCH-REV-002.
- **D-R1, no `containsRunId` (E-16).** Upstream removed run-ID uniqueness scanning. The standalone root's location
  service, and `CollaborationExecutionLocationService`, do not expose `containsRunId`. Do not reintroduce it. The
  location service keeps `findAgent`, `findAgentSync`, `listAgents` and `listHostRunIds`.
- **D-R2, the moved instruction keeps upstream's work-request section (E-17).** `renderStandaloneCollaborationInstruction`
  at its new path keeps the "Work Requests and Outcomes" section from the shared contract. Prompt snapshot updates for
  REQ-005 must be made on top of it.
- **D-R3, REQ-009 covers upstream guard drift (E-20).** AC-009 requires the guard suite to be green. On the new base it
  has two additional failures that come from upstream, not from this branch. Fix them as deliberate guard maintenance,
  each with a recorded reason (REQ-009 allows this). Do not weaken any rule.
  - AFB-004: the required-injection inventory for `AgentRunIdentityAllocator` still lists `agentRunManager`,
    `agentRunMetadataService`, `teamRunExecutionTreeLocationService` and `memoryDir`. `b5715ea5b` removed these options.
    Update the inventory to the allocator's current options.
  - Tool-registration readiness: add upstream's `registerProjectTaskTools` (`560a51129`) to the expected registration
    list, or follow the guard's own convention for new registrations.
  - If either cannot be resolved as maintenance (for example, the guard reveals a real production boundary violation),
    return a Design Impact.
- **D-R4, base failures outside scope (E-20).** 26 tests in `agent-run-manager`, `agent-run-provisioning-service`,
  `agent-api-status-projectors`, `autobyteus-status-projector`, `codex-tool-log-correlation` and
  `team-execution-view-projector` fail identically on clean `origin/personal` @ `b37d7a934`. They are not in this
  ticket's scope and must not be "fixed" here. Report them as base failures. Any **new** failure in those files is
  this branch's responsibility.
- **D-R5, terminology (E-18).** Wherever this spec says "Daily Assistant", read "General Agent (definition ID
  `autobyteus-daily-assistant`)". Live checks use General Agent.
- **D-R6, doc reference (E-19).** The REQ-007 docs edit targets `autobyteus-web/docs/chat.md` around line 295 (the
  "earlier events" limit), not line 262.
- **D-R7, fixture ownership (E-15).** The native root fixture keeps upstream's owned-resource cleanup.
  `native-root-fixture-cleanup.integration.test.ts` now lives under `tests/integration/standalone-agent-run-root/` and
  spies on `StandaloneAgentRunRootManager.prototype.endRoot`. It counts as a predecessor suite under the AC-001 gate.
- **Remaining implementation at refresh (E-21):** REQ-005, REQ-006, REQ-007, REQ-008, the REQ-003 size target
  (`standalone-agent-run-root.ts` 413 and `standalone-agent-run-lifecycle-service.ts` 450 lines; both must be at or under
  400), the D-R3 guard maintenance, the model-save root-cause record, the docs, and the live checks.

## Current-State Read
- **Standalone runs: one run, two owners (E-01).**
  - `StandaloneAgentRunLifecycleService` and `AgentRunManager` own the host AgentRun: activation, restore, metadata
    and termination.
  - `AgentRunCollaborationRoot` owns collaborators, copies, messages and the package. It is created by
    `AgentRunCollaborationRootManager` through `StandaloneAgentRunCollaborationBinding`:
    - `buildHostMemberExecutionContext`: the lifecycle pulls the host context from the root manager;
    - `onHostPublished`: the lifecycle pushes "ensure the root" after it publishes the host;
    - `terminateRoot`: the lifecycle asks the manager to end the root.
- **Workarounds this split forced:**
  - `resolveCommandReadyRoot` and the host-wake path (DS-009) go back into the lifecycle;
  - `standalone-run-liveness.ts` → `endRegisteredRoot` for history delete and archive;
  - the command coordinator calls `getActive(runId)` for mention admission;
  - the general process supervisor wires the manager into the lifecycle (`bindCollaboration`);
  - static `hasRegisteredRoot` and `endRegisteredRoot`.
- **Team runs.** Collaborator agents are pushed into `memberContexts` and `FlatTeamMemberConfigResolver` (E-02).
- **File sizes.** `agent-org-run.ts` 509, `agent-run-collaboration-root.ts` 502 lines (E-03).
- **Small gaps:** E-04–E-08.
- **Tests:** E-09.

## Task Size And Architectural Risk (Mandatory)
- **Task size:** `Large`. The standalone run ownership refactor touches the lifecycle, command coordinator, streams,
  history liveness, process supervisor and Agent-root module. Plus the Team-root registry, Org-root extraction, five
  small behavior fixes across server, web and contracts, and two test fixes.
- **Architectural risk:** `High`. Runtime ownership and lifecycle change for every eligible standalone run, including
  Daily Assistant. Concurrency (root gate and host activation). A shared delivery text change on every runtime.
- **SR-006:** still `Large`/`High`. § 11 changes the shared root-shutdown fence semantics used by every root on every
  runtime. It is small in code, but it sits in a concurrency-critical shared owner.
- **Escalation triggers:**
  - (SR-006) the fence cannot meet F-1–F-3 without changing `isRootShutdownQuiescent`, input admission or a runtime
    backend;
  - any predecessor standalone E2E needs a behavior change to pass;
  - host activation cannot run inside the root's command path without reversing the lock order;
  - a runtime cannot carry the new sender-address line.

## Architecture Investigation Evidence
| Source | Path | Decision |
| --- | --- | --- |
| Lifecycle binding | `agent-execution/services/standalone-agent-run-collaboration-binding.ts`; `standalone-agent-run-lifecycle-service.ts:46,74-81,362,422` | Remove the binding. The lifecycle becomes the host handle's activation backend, called by the root |
| Root manager | `agent-run-collaboration/services/agent-run-collaboration-root-manager.ts` (`ensureRoot`, `resolveCommandReadyRoot`, `terminateRoot`, statics) | Replaced by `StandaloneAgentRunRootManager` (`resolveRoot`, `stopRoot`, `endRoot`) |
| Callers | `api/websocket/index.ts:30-31`, `api/graphql/types/agent-run-collaboration.ts:47`, `api/graphql/services/collaborator-root-port-resolver.ts:46`, `api/rest/agent-collaboration-references.ts:18`, `agent-execution/runtime/general-process-run-supervisor.ts`, `agent-execution/services/agent-run-command-coordinator.ts:130`, `run-history/services/standalone-run-liveness.ts:38` | All rewired to the new manager |
| Team collaborator agents | `agent-team-execution/local/flat-team-execution-manager.ts#prepareCollaboratorAgent`, `registries/flat-team-member-config-resolver.ts#addCollaborator` | New `TeamRootCollaboratorAgentRegistry` |
| Token API | `api/graphql/types/token-usage-stats.ts#getAgentRunTokenUsageSummary` (exact run) | New `getStandaloneRunTokenUsageSummary`; the exact-run query is unchanged |
| Delivery text | `agent-collaboration/execution/communication/root-communication-runtime-builder.ts:20` | Add `sender address` |
| Display names | `autobyteus-web/utils/collaboration/memberDisplayName.ts`, `services/agentCollaboration/*` | The host label uses the host agent's name |
| Earlier events | `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowse*.ts`; `docs/chat.md:295` (was 262 before SR-005) | Inter-agent rendering |

## Intended Change

### 1. `StandaloneAgentRunRoot` (REQ-001). One owner per eligible standalone run.
- **New module.** `src/standalone-agent-run-root/` replaces `src/agent-run-collaboration/`. The `collaboration/`
  package store, tree schema and location service move along with it, with their names updated.
- **`StandaloneAgentRunRoot`** owns:
  - **the host handle** (`StandaloneHostAgentHandle`), the host's single execution, like an Org direct agent's handle;
  - collaborators and copies (`rootAgents` / `teams`, as today);
  - the index, communication, task lifecycle, collaborator admission and package persistence (unchanged components,
    moved);
  - one operation gate and the root lifecycle (`active → stopping → stopped`).
- **`StandaloneHostAgentHandle`.** Lazy readiness, mirroring `ConfiguredAgentExecutionHandle.ensureReady`.
  - Its backend is the existing standalone activation, which stays the only writer of `run_metadata.json`:
    `StandaloneAgentRunLifecycleService.activateHost(runId, {memberExecutionContext})`. This is the renamed internal
    `resolve`; the root passes the host member context in rather than the lifecycle pulling it.
  - A host that is not running (first use, after Stop and reopen, or after a crash) is activated or restored in its
    `ensureReady`. Every root path to the host (user command, child message, interrupt, approval) goes through it, so
    crash recovery is uniform.
  - **This removes** DS-009's special wake path and `resolveCommandReadyRoot`.
- **`StandaloneAgentRunRootManager`.** A process singleton, injected through the supervisor; no statics.
  - `resolveRoot(runId)`: for **eligible** runs only. It returns the active root, or creates it by loading the package
    if one exists, otherwise an empty in-memory root. **It does not start the host.**
  - `stopRoot(runId)`: explicit Stop. It ends the children, then the host handle (through the lifecycle's termination),
    then unregisters.
  - `endRoot(runId)`: history delete or archive. Same as Stop, and idempotent.
  - `stopAll()`: process shutdown.
  - It registers each root in `ActiveCollaborationRootDirectory`.
- **Command routing (AR-002).**
  - **Eligible runs:** the coordinator keeps owning command records, dedupe, the initializing overlay (published when
    the host is not live) and acks. It delegates the activation-and-post section to an injected
    **`StandaloneRunCommandPort`**:
    ```ts
    postUserMessage(input: {
      runId: string;
      message: AgentInputUserMessage;
      mentions?: CollaboratorMention[];
      postOptions: AgentRunPostOptions;              // incl. lifecycleObserver, passed through unchanged
      onActiveRunReady?: (run: AgentRun) => void;    // e.g. agent-stream-handler#bindSessionToRun
    }): Promise<{
      run: AgentRun;                                 // the live host AgentRun (for activity/ack/overlay)
      admission: RootCollaboratorAdmissionResult | null;
      post: AgentRunPostResult;
    }>
    ```
  - The root executes it in its gate:
    1. `host.ensureReady()`, the same order as today's `resolveCommandReadyAgentRun`;
    2. `onActiveRunReady(run)`, which binds the live host stream before anything is posted;
    3. mention admission, if any. A failure returns the admission result, and the coordinator fails the command with
       `COLLABORATOR_ADD_FAILED` as today. The host is already active at that point, as today;
    4. `run.postUserMessage(message, postOptions)` with the composed content.
  - **Interrupt and tool approval** (eligible runs) are unchanged: they act only on a live host (`getActiveRun`). An
    offline host returns the existing not-active result and is **not** started.
  - **Ineligible runs** (server helpers, application-owned): the existing plain path is unchanged.
- **Agent-collaboration stream (AR-001, behavior preserved).**
  - `connect` → `manager.resolveRoot(runId)` → `root.ensureHostReady()` (the host handle's `ensureReady`). This is
    exactly today's effect, where connect restored the host through `resolveCommandReadyRoot`. A stopped run's host
    therefore starts when the user opens or messages its collaboration view, as today.
  - The snapshot's `isActive` is the host handle's real live state, which is `true` after a successful `ensureReady`.
  - A failure closes with `AGENT_ROOT_UNAVAILABLE`, as today.
  - Child commands are unchanged.
- **Other entry points that activate an eligible host (AR-003).** These are routed so that an eligible host is
  never started without its root and member context:

  | Entry point | Eligible run | Ineligible run |
  | --- | --- | --- |
  | `AgentRunService.createAgentRun` / `activatePreparedRun` | `manager.resolveRoot(runId)` → `root.ensureHostReady()` | Unchanged (lifecycle direct) |
  | `AgentRunService.restoreAgentRun` / `resolveAgentRun` (GraphQL `restoreAgentRun`) | Same | Unchanged |
  | `AgentRunService.resolveCommandReadyAgentRun` | Removed for eligible runs (callers use the port); kept for ineligible | Unchanged |

  - The lifecycle's `activateHost` requires the member-context argument for eligible metadata, and throws if it is
    missing. That makes a bypass a loud error, not a silent run without tools.
- **Lock order.** Root gate first, then the lifecycle transition lane (inside `ensureReady`). The lifecycle never calls
  back into the root, because the binding is gone, so the order cannot reverse.
- **No user-visible change** (Q-3):
  - Stop: children, then host, as today.
  - Host crash: the next command re-activates the host, as today. Children keep running, as today.
  - Delete and archive: `endRoot`. They no longer need the "lingering root" special case.
  - Restart: no roots until used, as today. The package is created on the first collaborator, as today.
- **Removed:**
  - `standalone-agent-run-collaboration-binding.ts`;
  - `AgentRunCollaborationRootManager` and its statics;
  - `bindCollaboration`;
  - `onHostPublished`;
  - `resolveCommandReadyRoot`;
  - the host-wake branch in delivery;
  - `standalone-run-liveness.ts#endRoot`'s special path, which becomes `manager.endRoot`.

### 2. `TeamRootCollaboratorAgentRegistry` (REQ-002)
- New `agent-team-execution/local/registries/team-root-collaborator-agent-registry.ts`. It holds collaborator agent
  handles (prepared lazily from collaborator entries) in the root `FlatTeamExecutionManager`, beside
  `collaboratorTeams`.
- `executeDirectAgentCommand`, `reserveDirectAgentInput`, `deliverToDirectAgent`, status snapshots,
  `freezeForRootTermination` and restore consult it.
- `memberContexts` and `FlatTeamMemberConfigResolver` go back to configured members only:
  `FlatTeamMemberConfigResolver.addCollaborator` and the `memberContexts.push` are removed.
- The index and resolver are unchanged: the `collaborator` kind keeps its `containingTeamRunId` = root.

### 3. File size (REQ-003)
- `agent-org-run.ts`: extract message delivery and resolution plus collaborator admission into
  `agent-org-execution/services/agent-org-run-message-delivery.ts`, mirroring `team-run-message-delivery.ts`. Target:
  at or under 400 effective lines.
- `standalone-agent-run-root.ts`: the new root is built split from the start:
  - `standalone-agent-run-root.ts`: lifecycle, gate, public API;
  - `standalone-root-message-delivery.ts`;
  - `standalone-host-agent-handle.ts`.

  Each file at or under 400 lines.

### 4. Self-delegation (REQ-004)
In `StandaloneAgentRunRoot.delegateTask`, an `agent` placement whose address equals the caller's `memberAddress` is
rejected with `COLLABORATION_SELF_TARGET_REJECTED`, using the same check and message as Team and Org.

### 5. Sender address (REQ-005, Q-1)
- `buildRootCommunicationInputMessage` content becomes:
  `You received a message from sender name: ${senderDisplayName}, sender address: ${senderIdentity.memberAddress}, sender id: ${senderIdentity.agentRunId}\nmessage:\n…`
- `sender_member_address` metadata is unchanged.
- The global direct (cross-root) builder `global-agent-run-message-runtime-builders.ts` adds the same line when the
  sender has a member context, for consistency.
- The web parser that recognizes this header for RD-004 rendering, if any, accepts the new line. It is a single owner;
  the implementation locates it.

### 6. Token roll-up (REQ-006, Q-2)
- New `token-usage/services/standalone-run-token-usage-summary-service.ts`. It sums the token records of the host run ID
  plus every agent run ID in the run's collaboration tree (collaborators, members of collaborator teams, task copies,
  recursively).
  - The tree comes from the live root if one is active, otherwise from the stored package.
  - Each record is counted once.
  - No new attribution data, so it works for existing runs.
- GraphQL `getStandaloneRunTokenUsageSummary(runId)` returns the same summary type.
- The web standalone run's token view calls it. `getAgentRunTokenUsageSummary` stays exact-run, for children and other
  callers.

### 7. Earlier events (REQ-007)
- The server's active-trace page projection emits the same inter-agent item (with `senderAgentRunId`, `senderAddress`)
  that the replay projection emits for user traces with `senderId` (predecessor RD-004).
- The web `eventMonitorActiveTraceBrowsePresentation.ts` renders it with `InterAgentMessageSegment`, labeled with
  `memberTitleName(senderAddress)`.

### 8. Host label (REQ-008)
In a collaborator's Team tab, the host's label uses the **host agent's name** (the run's agent name, e.g.
"Research Assistant") instead of `memberDisplayName(hostAddress)`. Collaborators and members keep the shared lowercase
row format of the predecessor (VIS-004/009/012). Implemented in `services/agentCollaboration/*` where the host's name is
derived (`nameAt` for `hostRunId`).

### 9. Tests (REQ-009)
- **Boundary guard.** Inject `AgentDefinitionService` and `AgentTeamDefinitionService` into
  `CollaboratorDefinitionCatalog` through constructor ports, built in the existing composition root where the other
  collaborator dependencies are wired. Remove both `getInstance()` calls. The guard stays as it is, so it is satisfied,
  not weakened.
- **`team-run-model-selection-save.test.ts`.**
  - Reproduce on a clean worktree from the base.
  - Root-cause the `NOT_FOUND` outcome. Its path is `TeamRunModelConfigMutator` and the stored-team lookups, which
    likely drifted from current package or catalog admission (`TeamRunPackageCatalog`) or readiness.
  - Fix the cause: the production code if it is a real defect, otherwise the fixtures.
  - Record the cause in the implementation handoff. A production defect that changes behavior → return a Design Impact.
  - SR-005: the suite passes on the branch (E-20). Only the cause record is outstanding.
- **Guard drift since the base refresh (SR-005, D-R3).** The guard suite is green only after the AFB-004 allocator
  inventory and the tool-registration list are brought in line with upstream.

### 11. Root shutdown fence completion race (SR-006; AC-001, AC-010; E-22)
- **Scope decision.** Fixed in this ticket. AC-001 (live gate) and AC-010 (preserved Stop) are approved acceptance
  criteria, and they cannot pass reliably without the fix. Fixing it keeps approved intent unchanged. The alternative, an
  AC-001 exception, would change approved acceptance and is rejected. No requirement edit is needed.
- **Owner.** `agent-execution/domain/agent-run-root-shutdown-fence.ts`, plus its use in `agent-run.ts`. No root-specific or
  runtime-specific code changes. Team, Org and standalone roots all benefit through the existing chain.
- **Rule F-1: a rejected interrupt is not a fence result.**
  - When `interruptActiveTurn()` resolves with `accepted: false`:
    - if the run is quiescent, settle `{ accepted: true }` (as today);
    - otherwise keep the attempt **open, awaiting quiescence**. Every later `evaluate()` (already scheduled after each
      dispatched event batch) settles `{ accepted: true }` once the run is quiescent.
  - Quiescence (`isRootShutdownQuiescent`) remains the only success signal. Do not parse runtime error text
    ("no active turn") to tell outcomes apart; the texts are runtime-specific (E-22), and the local turn-completion
    dispatch is authoritative.
  - Do not send a second interrupt within the same attempt.
- **Rule F-2: bounded wait.**
  - Starting from the rejection, the attempt waits at most `ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS`.
    Default 5000 ms; a named constant, injectable through the fence's constructor callbacks or options for tests.
  - When the wait expires, evaluate once more. If quiescent, settle accepted; otherwise settle the **original rejected
    interrupt result** (same code and message as today).
  - The timer is cleared whenever the attempt settles or fails. It is `unref`'d so it never holds the process open.
- **Rule F-3: only acceptance is irreversible.**
  - `{ accepted: true }` stays latched for the AgentRun's lifetime (unchanged).
  - A not-accepted result, or a rejected promise from an interrupt that throws, ends **that attempt only**. The next
    `fenceInputAndInterruptForRootShutdown()` call starts a new attempt: it reconciles the runtime snapshot and re-fences
    input idempotently (as today), then evaluates afresh, and may interrupt again if a turn is still active.
  - Concurrent callers during one attempt share that attempt's promise.
  - Input admission stays fenced across attempts. There is no reopening; root shutdown remains one-way for input.
  - This brings the AgentRun layer in line with `createFrozenRootTerminationScope`, which already clears its memo when a
    result is not accepted. The root-level retry (a second Stop; teardown `stopAll`) therefore reaches the AgentRun.
- **Rule F-4: diagnostics.** On a rejected interrupt, and again when the wait expires, log at warn level: the run ID, the
  local `activeTurn` (kind and turn ID), `hasPendingCommand`, and the interrupt result code and message. This settles
  race versus stale state and identifies the agent in future live failures.
- **Shape guidance (non-binding).** One way to do it is to make `AgentRunRootShutdownFence` a per-attempt latch with
  `begin()` returning the attempt's promise. `AgentRun` then holds the current attempt and replaces it only when the
  previous attempt settled not-accepted or failed. Keep `agent-run.ts` changes limited to attempt selection and
  diagnostics.
- **Tests (deterministic, unit):**
  - an interrupt rejected while the turn is still locally active, with the turn-completed dispatch arriving afterwards,
    settles `{ accepted: true }` with no second interrupt;
  - a rejected interrupt with no quiescence settles the original rejected result after the bound (fake timers), and the
    timer is cleared on every settle path;
  - after a failed attempt, a second `fenceInputAndInterruptForRootShutdown()` starts a new attempt and succeeds once
    the run is quiescent. Input stays fenced in between;
  - an accepted fence stays latched; concurrent callers share one attempt;
  - an interrupt that throws fails only that attempt;
  - (ARCH-REV-004 N-2) the run becomes quiescent without a canonical event dispatch (for example a pending command is
    cleared); the expiry-time evaluation settles `{ accepted: true }`. F-4 logs the turn ID at both rejection and
    expiry, so a turn change is visible;
  - Org: `agent-org-run-termination` covers a first Stop that fails, then a second Stop that succeeds (the frozen scope
    plus AgentRun retry).
  - The existing `agent-run.test.ts:779-903`, `agent-run-compaction-races`, `frozen-root-termination-scope`,
    `configured-agent-execution-handle` and Team/Org termination suites pass unchanged.
- **Live validation:** LE-O1 on Codex passes at least 10 times in a row; the AC-001 suites pass on Claude and Codex. Any
  F-4 warning seen in those runs is recorded with its turn state.

### 10. Malformed package (REQ-010, Q-4)
No change. The classification is recorded in the requirements.

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Req | Path |
| --- | --- | --- |
| BEH-001 Standalone command | REQ-001 | Coordinator → `manager.resolveRoot` → `root.executeHostCommand` → `host.ensureReady` |
| BEH-002 Child → host message | REQ-001 | Root delivery → `host.ensureReady` (no special wake) |
| BEH-003 Stop / delete / archive / shutdown | REQ-001 | `manager.stopRoot` / `endRoot` / `stopAll` |
| BEH-004 Team collaborator agent command | REQ-002 | Root TeamRun → registry |
| BEH-005 Self-delegation | REQ-004 | Root `delegateTask` check |
| BEH-006 Delivery text | REQ-005 | The runtime builder |
| BEH-007 Token totals | REQ-006 | Summary service → GraphQL → web |
| BEH-008 Earlier events | REQ-007 | Page projection → web presentation |
| BEH-009 Host label | REQ-008 | Web name derivation |
| BEH-010 Preserved | AC-010 | All of the above with no visible change |

## Relevant Supplemental Task Artifacts
The predecessor UI/UX spec (VIS-004/009/012/013) for labels and rendering.

## Task Design Health Assessment (Mandatory)
- **Change posture:** `Refactor` together with `Behavior Change` (small).
- **Current design issue found:** `Yes`.
- **Root cause:** `Boundary Or Ownership Issue` (one run, two owners; Team collaborator agents in configured-member
  structures) together with `File Placement Or Responsibility Drift` (file sizes).
- **Refactor needed now:** `Yes` (user-requested). See sections 1–3.
- **Deferred:** none.

## Terminology
- **`StandaloneAgentRunRoot`:** the single owner of an eligible standalone run.
- **Host handle:** the root-owned handle of the run's own agent.
- **Eligible:** neither a server helper nor application-owned (unchanged).

## Design Reading Order
Template order.

## Legacy Removal Policy (Mandatory)
`No backward compatibility; remove legacy code paths.` Every item in the Removal plan is removed in this change; no
aliases remain. The `src/agent-run-collaboration/` folder is moved, not duplicated.

## Persisted Data / State Transition Decision (Mandatory)
- **Stored subjects:** `memory/agents/<id>/run_metadata.json`, `memory/agents/<id>/collaboration/`
  (`collaboration_tree.json`, `communication_messages.json`, child memory), and the catalog row `hasCollaboration`.
- **Change:** none to format or semantics. The code owner and the module path change.
- **Decision:** `Not Affected`.
- **Token roll-up:** reads existing records and trees; no write.

## Data-Flow Spine Inventory
| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 | Host command (`SEND_MESSAGE`, interrupt, approve) for an eligible run | Delivered to the host (activated or restored as needed) | `StandaloneAgentRunRoot` |
| DS-002 | Child `send_message_to` to the host | Delivered to the host | `StandaloneAgentRunRoot` |
| DS-003 | Stop / delete / archive / shutdown | Root and its children ended | `StandaloneAgentRunRootManager` |
| DS-004 | Team collaborator agent command | Handle in the registry | Root `FlatTeamExecutionManager` |
| DS-005 | Token summary query | Rolled-up summary | Summary service |
| DS-006 | Earlier-events page | "From <Sender>:" | Page projection and presentation |

## Primary Execution Spine(s)
- **DS-001:**
  `stream / GraphQL → AgentRunCommandCoordinator (dedupe, overlay) → StandaloneAgentRunRootManager.resolveRoot →
  StandaloneAgentRunRoot.executeHostCommand [gate] → (admission if mentions) → StandaloneHostAgentHandle.ensureReady →
  StandaloneAgentRunLifecycleService.activateHost [lane] → AgentRun.post`.
- **DS-003:**
  `AgentRunService.terminateAgentRun / history delete / archive → manager.stopRoot | endRoot → root.terminate
  [gate fenced] → children → host handle terminate → unregister`.

## Spine Narratives (Mandatory)
| Spine | Narrative |
| --- | --- |
| DS-001 | Eligibility comes from the metadata (`isCollaborationEligibleStandaloneRun`). For an eligible run, the coordinator resolves the root (creating it if needed, without starting anything), then asks the root to execute the host command. In its gate, the root runs mention admission if mentions are present, as today, then calls the host handle's `ensureReady`. That activates a prepared run, restores a stopped or crashed one through the lifecycle lane, or returns the live run, passing the root-built host member context. The root then posts. The coordinator keeps owning command records and the status overlay. |
| DS-002 | Root delivery to the host address or run ID calls `host.ensureReady()` and posts. This is the same path as DS-001, so there is no special wake code. |
| DS-003 | The manager fences the root and terminates children, then the host handle asks the lifecycle to terminate the AgentRun and record termination in the catalog, as `AgentRunService.terminateAgentRun` does today. Then it unregisters. Delete and archive call `endRoot` before their catalog mutation. It is idempotent: with no root it does nothing, and a plain run is terminated as today. |
| DS-004 | The root TeamRun's command methods check configured handles, then `TeamRootCollaboratorAgentRegistry`. Collaborator handles are prepared from collaborator entries (lazily) and restored with the root. |
| DS-005 | The summary service resolves the tree (live root, else stored package), collects the run IDs, and sums the records once each. |
| DS-006 | The page projection mirrors the replay rule (a user trace with `senderId` becomes an inter-agent item), and the web presentation renders it. |

## Spine Actors / Main-Line Nodes
`AgentRunCommandCoordinator`, `StandaloneAgentRunRootManager`, `StandaloneAgentRunRoot`, `StandaloneHostAgentHandle`,
`StandaloneAgentRunLifecycleService` (host activation backend only), root `FlatTeamExecutionManager` with
`TeamRootCollaboratorAgentRegistry`, `StandaloneRunTokenUsageSummaryService`.

## Ownership Map
- **`StandaloneAgentRunRoot`:** the whole run (host handle, children, messages, package, gate, lifecycle).
- **`StandaloneHostAgentHandle`:** host readiness and termination requests.
- **Lifecycle service:** host activation and termination mechanics and **`run_metadata.json` writes**. It holds no
  reference to roots.
- **Manager:** the registry of roots plus process wiring.
- **The coordinator:** command records and overlays.

## Thin Entry Facades / Public Wrappers
| Facade | Owner |
| --- | --- |
| Coordinator (eligible runs) | Root via manager |
| Agent-collaboration stream | Manager / root |
| `AgentRunService.terminateAgentRun` (eligible) | `manager.stopRoot` |

## Removal / Decommission Plan (Mandatory)
| Item | Replaced By |
| --- | --- |
| `agent-execution/services/standalone-agent-run-collaboration-binding.ts` | Root-owned host handle |
| `StandaloneAgentRunLifecycleService.bindCollaboration`, the `collaboration` field, `onHostPublished` call, `terminateRoot` delegation, `buildHostMemberExecutionContext` pull | `activateHost(runId, {memberExecutionContext})` |
| `AgentRunCollaborationRootManager` (incl. statics `hasRegisteredRoot`, `endRegisteredRoot`, `resolveCommandReadyRoot`, `ensureRoot`) | `StandaloneAgentRunRootManager` |
| `AgentRunCollaborationRoot` host-wake branch | `host.ensureReady` |
| `src/agent-run-collaboration/` folder | `src/standalone-agent-run-root/` |
| `standalone-run-liveness.ts` root special case | `manager.endRoot` |
| `FlatTeamMemberConfigResolver.addCollaborator`, `memberContexts.push` | `TeamRootCollaboratorAgentRegistry` |
| `CollaboratorDefinitionCatalog` `getInstance()` calls | Injected ports |

## Return Or Event Spine(s)
Unchanged: `collaborator_added`, `task_execution_started`, communication, presentation. The host stream is unchanged.

## Bounded Local / Internal Spines
- **Root lifecycle:** `active → stopping (fenced) → stopped`.
- **Host handle readiness:** `offline | activating | live`, with one readiness attempt, joined by concurrent callers
  (the `ConfiguredAgentExecutionHandle` pattern).

## Off-Spine Concerns Around The Spine
| Concern | Owner |
| --- | --- |
| Eligibility | `isCollaborationEligibleStandaloneRun` (unchanged) |
| Host member context | `standalone-host-member-context-builder.ts` (moved from `agent-run-collaboration-host-context-builder.ts`) |
| Token summary | Summary service |

## Ownership Boundaries
- Only the lifecycle service writes the host's metadata, and only roots write collaboration packages.
- The manager does not reach into root internals.
- Callers never use the lifecycle for eligible-run commands directly.

## Boundary Encapsulation Map
| Boundary | Forbidden Bypass |
| --- | --- |
| `StandaloneAgentRunRoot` | Coordinator, stream or history calling the lifecycle or `AgentRunManager` directly for an eligible run's commands or termination |
| `TeamRootCollaboratorAgentRegistry` | Pushing collaborator nodes into configured-member structures |

## Dependency Rules
- `standalone-agent-run-root/*` may depend on `agent-execution/services` (lifecycle activation API, `AgentRunManager`
  read), `agent-collaboration/*` and `run-history/store`.
- `agent-execution/*` must not import `standalone-agent-run-root/*`. Two components reach the root, both only through
  ports injected by the supervisor, which prevents an import cycle:
  - the coordinator, through `StandaloneRunCommandPort`;
  - `AgentRunService`, through `StandaloneRunLifecyclePort` (`resolveRootAndEnsureHost(runId)` for
    create/activate/restore/resolve, and `stopRoot(runId)` for `terminateAgentRun`, eligible runs only).

## Interface Boundary Mapping
| Interface | Shape |
| --- | --- |
| `StandaloneAgentRunRootManager.resolveRoot(runId)` | → `StandaloneAgentRunRoot` (eligible) \| null (ineligible) |
| `StandaloneAgentRunRoot.executeHostCommand(cmd)` | post, interrupt or approve; plus `mentions` for post |
| `StandaloneAgentRunLifecycleService.activateHost(runId, {memberExecutionContext})` | → AgentRun |
| `StandaloneAgentRunLifecycleService.terminateHost(runId)` | → result (catalog terminated record) |
| GraphQL `getStandaloneRunTokenUsageSummary(runId)` | → `TokenUsageRunSummaryGraphql` |
| Delivery header | `sender name: …, sender address: …, sender id: …` |

## Interface Boundary Check
All interfaces have a singular responsibility and explicit IDs. Low risk.

## Main Domain Subject Naming Check
`StandaloneAgentRunRoot`, `StandaloneAgentRunRootManager` (user's choice), `StandaloneHostAgentHandle`,
`TeamRootCollaboratorAgentRegistry` (as requested). Root kind `"agent"` is unchanged.

## Existing Capability / Subsystem Reuse Check
- Reused unchanged: `RootAgentExecutionRegistry`, `RootTeamExecutionDirectory`, the task lifecycle, the communication
  engine, admission, the package store.
- The host handle follows the `ConfiguredAgentExecutionHandle` pattern.

## Subsystem / Capability-Area Allocation
| Area | Change |
| --- | --- |
| `src/standalone-agent-run-root/` | New (moved from `agent-run-collaboration`) |
| `agent-execution/services` | Lifecycle API narrowed; coordinator routing; binding removed |
| `agent-team-execution/local` | New registry |
| `agent-org-execution/services` | Extracted delivery |
| `token-usage/services`, `api/graphql` | Summary |
| `agent-collaboration/execution/communication` | Header |
| `autobyteus-web` | Token query use, earlier events, host label |

## Draft File Responsibility Mapping
Folded into the final mapping below.

## Reusable Owned Structures Check
None new beyond the host handle.

## Shared Structure / Data Model Tightness Check
Not affected.

## Final File Responsibility Mapping
| File | Change |
| --- | --- |
| `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` | Root: gate, lifecycle, public API (≤400) |
| `src/standalone-agent-run-root/domain/standalone-host-agent-handle.ts` | Host readiness and termination |
| `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | Root registry, `resolveRoot`, `stopRoot`, `endRoot`, `stopAll`, directory registration |
| `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts` | Delivery and resolution (moved) |
| `src/standalone-agent-run-root/**` | Moved: tree, index, adapters, persistence, location, member view projection, builder, prompt (renamed from `agent-run-collaboration-*`) |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | `activateHost(runId, {memberExecutionContext})`, `terminateHost`; binding removed |
| `agent-execution/services/agent-run-command-coordinator.ts` | Eligible runs → `StandaloneRunCommandPort` |
| `agent-execution/services/agent-run-service.ts` | `terminateAgentRun` → eligible runs → `manager.stopRoot` |
| `agent-execution/runtime/general-process-run-supervisor.ts` | Wire the new manager; remove `bindCollaboration` |
| `run-history/services/standalone-run-liveness.ts` | `manager.endRoot` |
| `api/websocket/index.ts`, `api/graphql/types/agent-run-collaboration.ts`, `api/graphql/services/collaborator-root-port-resolver.ts`, `api/rest/agent-collaboration-references.ts` | Use the new manager |
| `agent-team-execution/local/registries/team-root-collaborator-agent-registry.ts` (new); `flat-team-execution-manager.ts`; `flat-team-member-config-resolver.ts` | REQ-002 |
| `agent-org-execution/services/agent-org-run-message-delivery.ts` (new); `agent-org-run.ts` | REQ-003 |
| `agent-collaboration/execution/communication/root-communication-runtime-builder.ts`; `agent-communication/services/global-agent-run-message-runtime-builders.ts` | REQ-005 |
| `token-usage/services/standalone-run-token-usage-summary-service.ts` (new); `api/graphql/types/token-usage-stats.ts` | REQ-006 |
| Server active-trace page projection (the event-monitor page service) | REQ-007 server item |
| web `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts` | REQ-007 rendering |
| web `services/agentCollaboration/*` (host name) | REQ-008 |
| web standalone token view (the store or component calling `getAgentRunTokenUsageSummary` for a standalone run) | Use the new query |
| `agent-collaboration/collaborators/collaborator-definition-catalog.ts` and its composition | REQ-009 injection |
| `tests/unit/agent-team-execution/team-run-model-selection-save.test.ts` and/or production cause | REQ-009 |
| `agent-execution/domain/agent-run-root-shutdown-fence.ts` | SR-006 § 11: F-1 open on rejected interrupt, F-2 bounded wait, F-3 per-attempt latch (only acceptance irreversible) |
| `agent-execution/domain/agent-run.ts` (`fenceInputAndInterruptForRootShutdown`, fence wiring) | SR-006 § 11: attempt selection, F-4 diagnostics |
| `tests/unit/agent-execution/agent-run-root-shutdown-fence.test.ts` (new), `agent-run.test.ts`, `agent-org-run-termination.test.ts` | SR-006 § 11 tests |
| Docs | `agent_run_collaboration.md` → `standalone_agent_run_root.md`; `agent_communication.md` (header, root ownership); `agent_team_execution.md` (registry); `token_usage.md` (roll-up); web `chat.md` (removes the earlier-events limitation) |

## Applied Patterns
- **Handle:** the lazy readiness host handle.
- **Registry:** the root manager and the Team collaborator agent registry.
- **Port:** `StandaloneRunCommandPort` (dependency inversion for the coordinator).

## Target Subsystem / Folder / File Mapping
As above. `src/standalone-agent-run-root/` replaces `src/agent-run-collaboration/`.

## Folder Boundary Check
- The new module parallels `agent-org-execution`. Low risk.

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Host command | Coordinator → `resolveRoot` → `root.executeHostCommand` → `host.ensureReady` | The lifecycle activating the host, then pushing `onHostPublished` |
| Crash | The next command or message → `ensureReady` restores the host | A special wake path |
| Header | `sender name: lead, sender address: /eng/lead, sender id: lead_9a…` | Basename only |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep `AgentRunCollaborationRootManager` as an alias | Rejected |
| Keep the binding for ineligible runs | N/A: ineligible runs never had a root |
| A new token attribution column | Rejected: roll-up from the tree |

## Derived Layering
Unchanged.

## Change / Refactor Sequence
1. **REQ-009 boundary injection and the model-save root cause first.** This gets a green baseline for the refactor.
2. **REQ-002 registry** (Team root). Team-root suites stay green.
3. **REQ-003 Org extraction** (behavior-neutral). Org suites stay green.
4. **REQ-001:**
   1. move the module;
   2. host handle;
   3. manager;
   4. lifecycle API;
   5. coordinator, port and supervisor wiring;
   6. stream, GraphQL, REST and history callers;
   7. remove the binding, statics and wake path.

   **All predecessor standalone suites must pass unchanged** (`standalone-agent-collaborator-mention.e2e`,
   `agent-initiated-collaborators.e2e`, the Agent-root unit and integration tests).
5. REQ-004, REQ-005 (with prompt and delivery snapshot updates), REQ-006, REQ-007, REQ-008.
6. Docs.

## Key Tradeoffs
- **The lifecycle service remains the host's activation backend** instead of being merged into the root. This keeps the
  metadata and catalog semantics untouched and limits risk for Daily Assistant.
- **Stream connect still restores the host (AR-001).** This preserves the predecessor's observable behavior (Q-3),
  even though child commands no longer technically need the host running.

## Risks
- The REQ-001 blast radius covers every eligible standalone run. Mitigation: the unchanged predecessor E2E suites are
  the acceptance gate, plus a live Daily Assistant check.
- A mismatch in host readiness concurrency (user command and child message at once). Mitigation: a single readiness
  attempt in the handle.
- The delivery header change affects every runtime. Snapshot and live checks are required.
- **Web parser:** any web parsing of the delivery header (RD-004 rendering) accepts headers both with and without
  `sender address`, so stored history keeps rendering.
- **(SR-006) Shared fence semantics.** The change affects Stop for every root on every runtime.
  - Risk: a stale local turn delays Stop by up to the bound (5 s) before failing. Mitigation: F-2's bound, F-3's retry
    and F-4's diagnostics.
  - Risk: retrying after failure could re-interrupt a new turn. This is acceptable, because input stays fenced, so the
    only turn that can be active is one that was already in flight.
  - Root cause not proven (race vs stale). F-1 resolves the completion race. Stale local state is only **bounded and
    diagnosed**, not resolved: `reconcileRuntimeSnapshot` keeps a local IDENTIFIED turn, so F-2 fails after the bound,
    F-3 allows a retry, and F-4 records the state. A live F-4 expiry warning that shows a local IDENTIFIED turn is
    escalated as a Design Impact (ARCH-REV-004 N-1).

## Guidance For Implementation
- **AC-001 gate:** every predecessor standalone and Agent-root test passes **without behavior edits**. Only renames and
  imports may change.
- **Live checks:**
  - Daily Assistant chat;
  - `@` bring-in, collaborator reply, Stop/reopen and host crash on Claude and one external runtime;
  - delete and archive of a run with collaborators.
- **New tests:**
  - host handle concurrent readiness;
  - **AR-001:** connect on a stopped run starts the host, and the snapshot shows `isActive: true`. A failed mention on a
    stopped run leaves the host active, as today;
  - **AR-002:** the first message to a stopped run binds the host stream (`onActiveRunReady`) before posting, passes
    `lifecycleObserver` and other options, and command records and overlays behave as today. Interrupt or approval on an
    offline host returns not-active without starting it;
  - **AR-003:** GraphQL `createAgentRun` and `restoreAgentRun` for an eligible definition create a root and host with the
    member context. A direct lifecycle `activateHost` without one throws;
  - `resolveRoot` without host start;
  - `stopRoot` ordering;
  - Team collaborator registry routing and restore;
  - Org extraction parity;
  - self-delegation;
  - the header on every runtime;
  - token roll-up for live and stored runs (with copies and team members counted once);
  - earlier-events rendering;
  - host label;
  - the boundary guard is green;
  - model-save suite green, with its root cause recorded.
