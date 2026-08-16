# Design Spec

## Design Status

- Status: `Refined — SR-009 resolves CRR-001 CR-F-004; preserves CR-F-001–CR-F-003 as implementation corrections; self-validated for complete architecture re-review`
- Requirements basis: `requirements.md` plus intended-behavior supplements listed below
- Persisted-data decision: supported framework data requires one isolated migration; application data is discarded/rebuilt
- Architecture-review state: ARCH-REV-004 passed cumulative SR-008; CRR-001 then returned CR-F-004 / Design Impact because MGR-005 terminated/unregistered local execution before a fallible settlement write. SR-009 corrects that order without reopening the accepted rooted architecture.

## Current-State Read

The user-selected base already has the correct conceptual foundation:

- one rooted `TeamRunConfig` and canonical `AgentTeamAddress` topology;
- recursive persistent and task TeamRun composition;
- globally allocated AgentRun/TeamRun IDs;
- root logical recipient lookup;
- coordinator ingress for AgentTeam targets;
- exact `send_message_to(target_agent_run_id)` routing;
- correlated Team Agent/status/event contracts; and
- a frontend topology snapshot plus mutable execution state.

The current architecture becomes difficult at six boundaries:

1. `delegate_task` resolves a valid root placement, then a task-only adjacency mapper rejects it.
2. Root task IDs/records coexist with per-TeamRun services and ledgers, so lifecycle routing depends on locality.
3. `TeamExecutionAddress` combines logical address, task-Team ancestry, and optional task Agent identity, yet task-Team Agent paths still need a separate AgentRun ID.
4. persisted Team metadata omits task execution containment, so task/event/frontend layers reconstruct it independently.
5. application, token, external-channel, GraphQL/WebSocket, and frontend contracts propagate the composite identity and serialized keys; and
6. one `MixedTeamManager` is correctly created per materialized TeamRun, but its broad interface also mixes root recipient/task/directory/event/disposal responsibilities into that local owner.

This is not a greenfield rewrite. The target preserves the rooted topology, recursive TeamRun runtime, provider behavior, and task/message product semantics while replacing the unhealthy ownership and identity seams. ARCH-REV-001 through ARCH-REV-004 accepted the rooted topology, exact run identity, three-file model, task FIFO, phase-aware writer, and root/local manager boundaries. CRR-001 confirms those structures but exposes one lifecycle-order contradiction in SR-008: MGR-005 destructively terminated/unregistered an accepted or interrupted task execution before the fallible settlement write, while R-040 allowed that release only after `committed`. SR-009 uses the existing durable distinction between terminal task status and execution-tree `settledAt`: terminal status commits first; the local owner issues a reversible quiescence capability; settlement writes only the execution tree; and destructive cleanup starts only after durable settlement. No persisted state, file, queue, retry/replay loop, compatibility path, or second owner is added.

## Intended Change

Adopt one compact identity and ownership model:

```text
logical mounted placement  = canonical absolute address
exact Agent execution      = AgentRun ID
exact Team execution       = TeamRun ID
concrete ancestry          = execution-tree containment
delegated-work relationship = task record
ordinary communication     = message record
```

A public `RootTeamRun` boundary coordinates explicit execution-tree, task, communication, persistence, lookup, and event owners. It has exactly three current Team-execution JSON authorities:

```text
team_run_execution_tree.json
task_delegation_records.json
team_communication_messages.json
```

Both logical tools use the same absolute root resolver. `delegate_task` selects any valid same-root placement, resolves the exact Team execution that must host it, creates one fresh execution, durably commits tree plus task state before work release, and returns its exact Agent ingress. `send_message_to` uses either the same logical placement resolver or an exact existing AgentRun ID.

Every materialized root, configured subteam, task Team, and nested task Team retains one private `MixedTeamManager`. Root services resolve the exact containing TeamRun and call that local boundary; no child manager bubbles policy to a parent or accesses root task directories.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved Outcome | Evidence | Target Production Path | Lifecycle Boundary | Spine IDs |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Absolute-only universal same-root logical target | Valid target reaches root resolver before adjacency failure | tool -> canonical parser -> root recipient resolver | before lookup/mutation | DS-001, DS-002, DS-004 |
| BEH-002 | One root task lifecycle owner and one complete logical mutation order | root IDs/records versus per-Team services, overlapping submit/review proof, and CRR-001 settlement-order evidence | tool router -> `RootTeamRun` -> `TaskDelegationService` command FIFO -> queue-head current-state derivation -> typed record or tree-only settlement commit | task command queue through typed durable commit and local cleanup handoff | DS-004–DS-008, DS-016 |
| BEH-003 | Fresh Agent/AgentTeam execution; Team ingress through coordinator | existing factories/allocators plus current post-write throw sites | root task service -> sealed execution/registration/event plan -> durable commit -> no-throw release | task-file durable commit point | DS-005, DS-006, DS-008 |
| BEH-004 | Logical address plus intrinsic run IDs; no composite locator | allocator and stream-binding evidence | root execution index lookup/containment | construction and strict read | DS-003–DS-011 |
| BEH-005 | Exact submit/review/settle independent of locality and lost-update safe | current inference branches, independent concurrent lifecycle transitions, and CRR-001 terminate-before-write witness | root task service -> terminal task-record transition -> reversible local quiescence -> tree-only settlement commit -> local cleanup | task state machine command plus committed-only execution release | DS-007, DS-008, DS-016 |
| BEH-006 | One frontend execution owner and truthful placement-grouped navigation/status | serialized map/materializer plus supported `TeamRun.getLeafAgentStatusSnapshots()` connection path | root snapshot barrier -> tree/task/message/status projector -> one reducer -> selectors/focus/expansion | snapshot base sequence then queued live events | DS-010, DS-011, DS-018, DS-019 |
| BEH-007 | One provider-neutral absolute/universal instruction | current duplicated copy | server renderer/contracts -> provider adapters | AgentRun composition | DS-015 |
| BEH-008 | Optional advisory handoffs | current minimal service | configured handoffs -> member context -> minimal rows | prompt/tool discovery | DS-015 |
| BEH-009 | Exactly three current JSON authorities, exact dependent run IDs, and phase-truthful writes | current store/data audit, overlapping-message proof, and rename-before-directory-sync source trace | root subject owner -> logical mutation owner -> persistence coordinator -> strict phase-aware Team writer | serialized logical commit plus explicit physical phase result | DS-008–DS-014 |
| BEH-010 | Fail closed without artificial adjacency result | parser/mapper trace | parser/resolver/authorizer/validator -> stable error | before reserve/write/start | DS-017 |
| BEH-011 | Minimal result and exact bidirectional contact with truthful accepted history | exact router, AgentRun dispatch-before-return evidence, concurrent complete-snapshot lost-update proof, and CRR-001 reservation/quiesce race | delegation result/work packet -> exact router -> AgentRun reservation -> sealed root-ordered append -> current-state durable row -> release; ordinary quiesce awaits the plan | task commit or root-locked message append plus reservation-aware termination preparation | DS-002–DS-008, DS-016 |
| BEH-012 | No live task recovery; deterministic strict root reopen after crash or persistence fail-stop | runtime work not recoverable | package loader -> repair planner -> phase-aware durable repair -> expose only the valid root | root admission/re-entry | DS-009 |
| BEH-013 | Isolated per-root migration and forward-only runtime | local stores/completed migration lifecycle plus user-approved non-blocking failure rule | migration attempt -> independent root plan/stage/promote -> target-only catalog -> server start | pre-catalog migration attempt; root-local admission | DS-012–DS-014 |
| BEH-014 | One local manager per materialized TeamRun, with root policy outside it | root/child factories plus current broad manager/interface audit | public `RootTeamRun` -> root subject owner -> index/`TeamRunResolver` -> exact `TeamRun` -> private local manager | TeamRun creation, exact local command, and recursive termination | DS-002–DS-007, DS-016, DS-020 |

### Material Premise Classification For CRR-001

| Premise ID | Finding | Classification | Supported initiating basis | Design effect |
| --- | --- | --- | --- | --- |
| SR009-MP-001 | CR-F-001 activation finalization-indeterminate handling | `Reachable` | exposed `delegate_task` -> root activation -> approved R-040 phase-aware Team writer | finalization-indeterminate preserves hidden preparation, latches root fail-stop, and yields no ordinary result |
| SR009-MP-002 | CR-F-002 deferred work-gate release | `Reachable` | every successful exposed `delegate_task` | the synchronous no-throw committed closure flips `releaseWork()` before the active result can return |
| SR009-MP-003 | CR-F-003 reservation deletion during task settlement | `Reachable` | concurrent exposed `send_message_to(target_agent_run_id)` and `review_task_result(accept)` inside one root | local settlement preparation waits every earlier reservation/dispatch; ordinary termination never deletes it |
| SR009-MP-004 | CR-F-004 destructive cleanup before a failed tree write | `Reachable` | exposed accepted review or supported shutdown interruption -> settlement -> approved R-040 `not_renamed` outcome | quiescence is reversible until tree durability; destructive cleanup begins only after `committed` |

`investigation-notes.md` records the complete independent production witnesses. The reviewer probes reproduce SR009-MP-003 and the writer phase behavior but are not used as their initiating basis. No CRR-001 conclusion depends only on a callable method, injected test failure, or hidden-state mutation.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Governing Use | Status |
| --- | --- | --- | --- | --- |
| `universal-task-delegation-behavior-contract.md` | Target/host/failure matrix | R-001–R-024 | Logical and runtime selection behavior | User-approved / self-validated |
| `task-delegation-interaction-contract.md` | Tool result, packet, exact communication, submit/review | R-025–R-031 | Agent-facing task/message interaction | User-approved / self-validated |
| `agent-team-collaboration-system-instruction.md` | Exact prompt copy | R-013–R-014, R-022 | Provider-neutral injection | User-approved / self-validated |
| `team-execution-ownership-analysis.md` | Current-to-target architecture analysis | R-007–R-012, R-032–R-044 | Evidence and responsibility reasoning | Reconciled with SR-009 |
| `team-run-persistence-architecture-contract.md` | Exact schemas, invariants, spines, recovery, migration | R-032–R-046 | Canonical detailed data contract | User-approved / self-validated |
| `team-execution-tree-ui-ux-spec.md` | Exact live navigation hierarchy, task labels, Agent focus, task-Team expansion, responsive/accessibility behavior | R-015–R-016, R-047; AC-018, AC-039–AC-041, AC-052–AC-054 | Product projection and interaction contract | User-approved / self-validated |
| `team-run-management-contract.md` | Exact `RootTeamRun`/`TeamRun`/`MixedTeamManager` boundaries, names, local/root spines, dependency rules, and removal inventory | R-007, R-012, R-040, R-048; AC-055–AC-056 | Root/local execution management architecture | User-approved / self-validated |
| `persistence-scenarios/README.md` and 15 JSON files | Exact normative states | AC-033–AC-044 | Schema and cross-file examples | User-approved; strict disposable validation passed |
| `solution-self-validation.md` | Design-principle audit, complete use-case/spine coverage, contradiction checks, and validation evidence | BEH-001–BEH-014; UC-001–UC-021; R-001–R-048; AC-001–AC-056 | Solution-quality evidence; no new product behavior | Completed / Pass / approval N/A |
| `execution-model-visualization.html` | Joined-model visualization | N/A | Human context only | Not a UI requirement |

All canonical absolute paths are recorded in `investigation-notes.md`.

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior change plus architectural refactor and schema contraction
- Initial design issue signal: Yes
- Root cause classification: missing root lifecycle owner; local/root manager responsibility drift; conflated containment/relationship; duplicated identity; duplicated projection; persisted-structure drift; and, for CR-F-004, a lifecycle commit-boundary contradiction between local destructive teardown and root durable truth
- Refactor decision: required now
- Why a local guard removal is insufficient: it would allow cross-branch targets into code that still chooses service, host, task chain, parent TeamRun, notification path, settlement, and frontend parent from caller locality
- Healthy structures to preserve: rooted topology, canonical address parser, Team recipient traversal, recursive TeamRun creation/handles, run-ID allocators, coordinator projection, AgentRun input admission/FIFO, task state machine outcomes, exact message router, correlated Team stream protocol, one root task FIFO, phase-aware writer, and one local manager per TeamRun
- Structures to replace: relative recipient expressions, per-Team task ownership, broad root/local `TeamManager` surface, parent-boundary/task-directory routing, `TeamExecutionAddress`, path/route/chain identity, old Team metadata, repeated task/message participants, application V5 Team identity, frontend serialized execution map and separate task materializer
- SR-009 response: retain the accepted owners; replace only destructive `settleDirectTask()` with a local-owner-issued reversible `PreparedTaskSettlement`, make terminal task status and tree-only settlement distinct commits, and place destructive cleanup after the durable tree commit. CR-F-001–CR-F-003 remain implementation fixes under the same owners.
- Residual deferral: none that leaves in-scope behavior on a known-bad boundary; visual redesign and live task recovery remain out of scope because the target does not depend on them

## Terminology

| Term | Exact Meaning |
| --- | --- |
| canonical logical address | absolute non-root filesystem-like mounted placement, for example `/qa/automation/tester` |
| persistent execution | concrete AgentRun/TeamRun allocated when the root configured topology is launched |
| task execution root | fresh task Agent or task AgentTeam created by one delegation and referenced by one task record |
| task-Team member binding | fresh AgentRun/TeamRun binding inside a task AgentTeam, inheriting configured facts by logical address |
| `RootTeamRun` | public rooted execution/authorization boundary identified by the root `teamRunId`; a thin facade over explicit subject owners |
| `TeamRun` | one concrete persistent or task Team execution, with one private local manager |
| `changeSequence` | non-persisted monotonic ordering number allocated by `TeamRunEventPublisher` for one active RootTeamRun instance; not a task revision or schema version |
| exact Agent | one `agentRunId` |
| exact Team | one `teamRunId` |
| concrete recipient scope | caller-applicable concrete Team subtree selected by segment-aware logical containment |
| host Team execution | exact TeamRun at the target placement's logical parent, reached through configured-member descent inside the concrete recipient scope |
| execution tree | concrete containment of persistent and task executions |
| task edge | delegator AgentRun -> fresh task execution relationship in a task record |
| message edge | sender AgentRun -> receiver AgentRun fact in a communication record |
| live projection | derived view excluding settled task execution nodes; not persisted |

## Design Reading Order

1. Read identity/removal and persisted transition decisions.
2. Read the spine inventory and DS-001 through DS-020 narratives.
3. Read ownership/interfaces and exact file mapping.
4. Use `team-run-persistence-architecture-contract.md` for exact JSON types and invariants.
5. Use `team-run-management-contract.md` for exact root/local execution-manager boundaries and spines.
6. Use `persistence-scenarios/` for concrete state examples.
7. Follow the change sequence; do not introduce a temporary production dual model.

## Legacy Removal Policy (Mandatory)

This is a clean cut.

- Normal runtime, APIs, events, application packages, and frontend accept only current exact run-ID models.
- Historical schema/path/route/chain knowledge exists only under `src/app-data-migrations/migrations/team-run-execution-tree-v1/` and its tests/fixtures.
- No alias type, deprecated field, fallback serializer, dual reader, lazy conversion, address guess, provider-specific bypass, or old-key parser is permitted.
- One migration attempt finishes before the target root catalog is exposed. A failed predecessor root remains uncataloged and retryable; it is never read by current runtime and does not block valid roots, new Team creation, or server listen.
- Historical completed ticket documents may retain old terminology as evidence; current long-lived docs and source may not.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

### Decision

| Data Cohort | Outcome | Reason |
| --- | --- | --- |
| Released framework Team metadata/task/message/token/external state | `Migration Required` | target filenames/shapes and exact identity change; local retained history is material |
| Existing Agent memory directories/raw traces/history | `Directly Usable — No Relayout` | physical paths and run IDs remain useful and are migration evidence |
| Application framework data, fixtures, installed bundles | `Discard or Rebuild` | no supported users/predecessor contract; direct forward-only V6 cut |

### Stored subject, volume, semantics, invariants

- Root Team memory: 507 directories, 501 Team metadata files, 343 communication files, 2 task files/5 task Team records in the inspected local cohort.
- Token DB: 941,711,360 bytes, 171,891 ledger rows, 203 task-Team-shaped composite rows at investigation time; exact `run_id` is already present.
- Required preserved meaning: known root/persistent/provable task run IDs, mounted addresses, launch settings, task/message content, reference paths, timestamps, usage facts, and unambiguous external bindings.
- Unacceptable: invented run identity, lost known task/message history, partial token rewrite, guessed contradictory route, or current runtime reading an old shape.

### Migration Plan (Only When Decision Is `Migration Required`)

**New owner:** `20260814_team_run_execution_tree_v1` in a new migration folder. Implementation must verify the ID is not already registered; it must not reuse/change `20260517`, `20260703`, or `20260801` code/records.

**Input contract:** outputs accepted by the user-selected base after all earlier pending migrations plus directly target-current packages on idempotent rerun. Residual predecessor input that earlier migration legitimately leaves is either explicitly mapped by the new converter or remains an unresolved root-local migration input; runtime never reads it.

**Sequence:**

1. Discover every predecessor/current root Team memory directory and its dependent token/external records before mutation.
2. For each predecessor root independently, build a read-only evidence index from schema-v3 metadata, current task/message records, physical TeamRun/AgentRun directories, token exact `run_id`, and external bindings.
3. Plan that root's target execution tree, compact task records, compact message records, token row changes, and external target changes in memory.
4. Reconstruct a binding only when all available sources agree. A retained reference with missing/conflicting exact identity fails only that root's plan.
5. Validate the planned root package with current strict parsers and the cross-file validator; bounded transient planning/staging failures may be retried before any source mutation.
6. Write that root's durable protected backup manifest and source copies without exposing them to normal runtime paths.
7. Stage the complete root JSON package in same-filesystem temporary paths and validate staged bytes again.
8. Promote the complete root package idempotently; move obsolete `team_run_metadata.json` out of the live root into the protected backup only after all target files are durable.
9. Independently convert the complete supported token cohort through one store-owned SQL transaction/table-rebuild boundary using exact `run_id` plus optional root context; preserve the predecessor token table/backup as migration-only evidence for unresolved root retry. Any injected transaction failure rolls back every target row/table change before bounded retry.
10. Convert successfully planned external-channel Team output targets to `{teamRunId,entryAgentRunId}` and validate their exact roots.
11. Discard/rebuild project-owned application data/fixtures; do not put them through this migration.
12. Re-read every promoted current file/row through target-only readers and catalog only complete valid V1 roots.
13. Mark the new migration record `SUCCEEDED` only when no predecessor root remains unresolved. Otherwise retain `FAILED` with actionable root-local diagnostics so the established runner retries it later.
14. After the migration attempt finishes, `startConfiguredServer` may open GraphQL, WebSocket, target runtime, and application startup with the valid target-root catalog, including an empty catalog. New Teams remain available.

**Failure and retry:** unsafe input remains byte-stable before promotion and the unresolved root is excluded. Already promoted V1 roots are idempotently revalidated/skipped on retry. A root never serves mixed state; the server may still serve other validated V1 roots and create new Teams. This resilience lives entirely in the migration/catalog boundary and introduces no predecessor parser, dual reader, lazy converter, fallback, or empty compatibility projection into normal source.

**Token independence:** every supported predecessor token row already carries exact `run_id`; optional root context is projected directly from predecessor Team execution context and does not require cataloging that run in a target execution tree. The migration preserves a protected predecessor token table/backup, atomically rebuilds the complete supported cohort into target columns, and gives current token runtime only the target table. An excluded root's later migration retry may use the protected evidence; normal services never do.

**Rollback:** automatic production rollback is not designed. Protected backups support operator-approved recovery; implementation/API-E2E must not modify operational data outside an explicitly disposable target.

## Data-Flow Spine Inventory

| Spine ID | Type | Behaviors | Trigger | Success Output | Governing Owner | Why Separate |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded local | BEH-001, BEH-010 | logical recipient address | resolved immutable placement or error | `TeamRecipientResolver` behind root facade | one grammar/topology lookup |
| DS-002 | Primary | BEH-001, BEH-011 | logical `send_message_to` | exact AgentRun input plus message record | root message boundary | address selects placement/current execution |
| DS-003 | Primary | BEH-004, BEH-011 | exact `target_agent_run_id` | exact AgentRun input plus same-root message record | global router then root boundary | exact existing run path |
| DS-004 | Bounded local | BEH-002–BEH-005 | caller AgentRun + target placement | authorized caller + exact host TeamRun | root execution index/scope resolver | shared task/message execution resolution |
| DS-005 | Primary | BEH-002–BEH-004, BEH-011 | delegate to Agent | active fresh task Agent + minimal result | root task service | Agent activation variant |
| DS-006 | Primary | BEH-002–BEH-004, BEH-011 | delegate to AgentTeam | active fresh task Team + coordinator ingress result | root task service | Team subtree activation variant |
| DS-007 | Primary | BEH-005, BEH-011 | submit/review/interruption/settlement | durable task transition, notification, or settled execution | root task service/state machine plus selected local TeamRun settlement capability | formal lifecycle and committed-only local release |
| DS-008 | Bounded local | BEH-002, BEH-003, BEH-005, BEH-009 | task lifecycle command or reserved message append | cumulative durable fact, clean reversible cancellation, or phase-truthful fail-stop | task/message logical owners with `TeamRunPersistenceCoordinator` and strict Team writer | exact logical and physical commit boundaries |
| DS-009 | Primary | BEH-012 | root package startup/reopen | repaired validated root or root-local unavailability | root package loader/repair planner | crash/current-state recovery |
| DS-010 | Primary | BEH-006, BEH-009 | workspace open/restore | exact tree/task/message/status initial view | `RootTeamRun` snapshot barrier + `TeamExecutionViewProjector` | initial derived view with canonical status |
| DS-011 | Return/event | BEH-006, BEH-009 | accepted root/event change | ordered strict execution-view event | `TeamRunEventPublisher` + projector + frontend reducer | live projection |
| DS-012 | Primary | BEH-013 | pending migration attempt | valid target-root catalog plus root-local diagnostics for unresolved predecessors | JSON migration owner | historical JSON conversion without runtime compatibility |
| DS-013 | Bounded local | BEH-013 | token plan | all-or-nothing exact run-ID token rows | token store transaction | large SQL atomicity |
| DS-014 | Primary | BEH-009, BEH-013 | V6 application launch/stream | exact run-ID application binding/events | application contracts/orchestration | forward-only package boundary |
| DS-015 | Primary | BEH-007, BEH-008 | Team Agent composition | identical prompt/tools/handoffs | server instruction/tool owners | provider-neutral exposure |
| DS-016 | Return/event | BEH-002, BEH-005, BEH-011, BEH-012, BEH-014 | terminal task settlement/root teardown | reversible quiescence, durable tree removal, then exact local/root resources disposed by their owners | `TaskDelegationService` + selected `TeamRun` capability + `RootTeamRun` lifecycle | reservation-safe committed-only terminal cleanup |
| DS-017 | Secondary | BEH-010 | invalid input/state/evidence | stable error, zero exposed mutation | earliest authoritative boundary | fail-closed invariant |
| DS-018 | Primary | BEH-006 | user selects a task Agent row | exact task AgentRun focused in Agent workspace | frontend execution state + workspace focus owner | Agent task navigation |
| DS-019 | Primary | BEH-006 | user selects a task AgentTeam row | exact fresh TeamRun members expanded/collapsed | frontend execution state + navigation presentation owner | Team task navigation |
| DS-020 | Bounded local | BEH-014 | root service has one exact containing `teamRunId` plus direct run command | one exact local handle result | `TeamRun` local boundary / private `MixedTeamManager` | prevents root-policy leakage into local manager |
| DS-021 | Primary | BEH-004, BEH-009, BEH-014 | launch a new configured root Team | durable three-file root package plus addressable `RootTeamRun` | `AgentTeamRunManager` -> `RootTeamRun` | creation is distinct from restart repair |
| DS-022 | Primary | BEH-007, BEH-008 | Team Agent calls `get_handoff_rules` | ordered minimal advisory rows | root collaboration context/handoff owner | discovery is a real tool path, not prompt composition |
| DS-023 | Bounded local | BEH-003, BEH-005, BEH-011 | task create/submit/review includes reference files | validated absolute-local paths and durable parent-owned references | task input/reference owner | reference admission must precede task mutation |
| DS-024 | Return/event | BEH-005, BEH-011 | durable submit/review transition | exact-peer system notification or truthful warning | task state owner -> notification dispatcher | notification failure cannot roll back a durable transition |
| DS-025 | Primary | BEH-004, BEH-014 | browser/tool exact Agent command | command result from one exact AgentRun | `RootTeamRun` -> exact `TeamRun` | approvals, interrupt, and direct input need the same local boundary |
| DS-026 | Primary | BEH-012, BEH-014 | terminate one root TeamRun | recursively terminated local executions and disposed root owners | `AgentTeamRunManager` -> `RootTeamRun` | root teardown is not task settlement |
| DS-027 | Bounded local | BEH-004, BEH-009, BEH-013 | AgentRun usage event | token row keyed by exact run ID and optional root TeamRun ID | token usage owner/store | current attribution must not reconstruct composite identity |
| DS-028 | Primary | BEH-004, BEH-009, BEH-013 | external-channel delivery to a Team-bound execution | exact entry AgentRun input/result | external binding owner -> root exact-run boundary | external ingress is a supported exact-identity consumer |
| DS-029 | Secondary | BEH-004, BEH-006, BEH-009 | history/file-change/monitor query by exact run | derived physical context or projected event | owning history/monitor service via root tree/index | dependent consumers must derive placement without a second identity model |

## Primary Execution Spine(s)

### DS-005 — Universal Agent delegation

```text
provider tool
  -> DelegateTask argument parser (absolute input only)
  -> TaskDelegationToolService (thin caller-context extraction)
  -> root TeamRun facade
  -> TeamRecipientResolver (logical Agent placement)
  -> TeamExecutionIndex.authorizeAgentRun(callerAgentRunId)
  -> TeamExecutionScopeResolver.resolve(target parent address, caller ancestry)
  -> TaskDelegationService prepares/seals activation, then admits one immutable activate command to its private FIFO
  -> TeamRunResolver returns the exact host TeamRun
  -> TaskDelegationService opens a root activation-event lease
  -> host TeamRun/private manager prepares exact AgentRun behind a closed work gate
  -> preparation is sealed; local slot and activation event are validated; no later local event/work can occur before release
  -> at queue head, TaskDelegationService reads latest tree/tasks, revalidates caller/target/host/reservations/source state, and derives the cumulative typed activation plan
  -> TeamRunPersistenceCoordinator writes tree then task through TeamRunFileCommitWriter; task-file `committed` result is the COMMIT POINT
  -> one synchronous no-throw closure swaps memory, consumes the local reservation, enqueues activation+retained events, and opens the work gate
  -> TeamRunEventPublisher later drains subscribers with per-subscriber exception isolation
  -> {task_id,status:"active",target_agent_run_id}
```

### DS-006 — Universal AgentTeam delegation

```text
same logical/caller/host path
  -> task Team identity factory clones selected configured subtree with fresh TeamRun/AgentRun IDs
  -> mixed Team factory prepares the complete child TeamRun subtree beneath exact host and keeps every work gate closed
  -> TeamRunResolver reserves every fresh TeamRun ID without exposing it
  -> execution tree adds task Team root/member bindings; task record points structurally to {teamRunId}; coordinator ingress and event payload validate
  -> seal preparation/event lease, enter the same task FIFO, derive from latest tree/tasks at queue head, then perform the typed tree/task commit; task-file `committed` result is the COMMIT POINT
  -> one synchronous no-throw closure swaps memory, consumes local/resolver reservations, enqueues activation, and opens coordinator work
  -> return coordinator AgentRun ID
```

### DS-002/DS-003 — Messaging

```text
logical selector:
  root resolver -> exact current Agent ingress for placement -> root message boundary

exact selector:
  global grant/liveness -> exact AgentRun -> if both Team-bound in one root, re-enter root message boundary

root message boundary:
  authorize exact sender/receiver AgentRun IDs
  -> build one canonical Agent input + message record sharing messageId
  -> receiver AgentRun FIFO owner synchronously reserves input without provider release
  -> rejected reservation returns without a row
  -> without awaiting, TeamCommunicationService seals and submits one one-shot append plan containing the immutable row, reservation, and preallocated event slot
  -> TeamRunPersistenceCoordinator acquires the root mutation lock
  -> plan revalidates root/endpoints/reservation/message-ID absence against the authoritative current message state
  -> plan derives the next immutable snapshot inside the lock and durably writes it while reservation blocks later input
  -> conflict or `not_renamed` synchronously cancels plan + reservation; no dispatch/event/row
  -> `renamed_finalization_indeterminate` latches the affected root fail-stopped, releases/publishes nothing, and produces no normal result
  -> `committed` synchronously swaps message memory, commits the event slot + reservation, then releases the exact reservation
  -> existing FIFO dispatcher forwards in order
  -> stable public result
```

`AgentRun.postUserMessage()` is refactored over the same AgentRun-owned reserve/commit/release primitive. `commitReservedMessageAppend(plan)` accepts no caller-derived full snapshot. The root lock's plan-admission order defines communication history order; because synchronous reservation and plan submission have no intervening await, same-receiver plan order equals AgentRun reservation/FIFO order. Different receivers have independent provider order but both rows are retained in root commit order. No Team-owned input queue, provider queue, persisted revision, steer, retry, replay, interruption rule, or fourth persisted authority is added. A row records FIFO admission, not provider completion.

### DS-018 — Task Agent navigation

```text
RootTeamRun snapshot barrier + consistent tree/task/message snapshot + recursive canonical Agent status + current changeSequence
  -> TeamExecutionViewProjector exact tree/task/status snapshot or delta
  -> strict shared DTO admission
  -> TeamExecutionViewState reducer and run-ID indexes
  -> navigation selector groups the task under its canonical Agent placement
  -> TeamMembersPanel renders `Task: <description prefix>`
  -> user selects the task row
  -> workspace focus command uses exact agentRunId
  -> exact Agent conversation/status/history surface opens
```

The label/address never becomes the focus selector. A persistent AgentRun and any task AgentRuns at the same placement remain distinct internal rows.

### DS-019 — Task AgentTeam expansion

```text
same admitted execution view
  -> navigation selector groups the task Team under its canonical Team placement
  -> TeamMembersPanel renders `Task: <description prefix>` with Team affordance
  -> user selects the task Team row
  -> presentation expansion state toggles exact teamRunId
  -> selector reveals that TeamRun's direct execution-tree children
  -> nested Team rows recurse; Agent member selection uses exact agentRunId
```

The Team row is not an Agent input endpoint and does not silently focus its coordinator. The configured coordinator is one visible exact Agent member within the expanded task Team.

### DS-021 — New root TeamRun creation

```text
Team launch surface
  -> AgentTeamRunManager validates one root launch request
  -> TeamDefinitionTopologyPlanner mounts canonical configured placements
  -> run identity allocators assign every configured TeamRun/AgentRun ID once
  -> TeamRunExecutionTree validates the complete configured tree
  -> TeamRunPersistenceCoordinator writes tree plus empty task/message files through the strict Team writer
  -> not_renamed before all three commit: return launch failure; publish nothing; later package scan removes any incomplete unpublished residue
  -> renamed_finalization_indeterminate: return no ordinary launch result; keep the pre-public root fail-stopped for strict package reload
  -> all three committed: RootTeamRun creates the root TeamRun/private MixedTeamManager
  -> AgentTeamRunManager publishes the RootTeamRun only after the complete package is durable
  -> initial execution-view snapshot becomes available
```

No live root is published from a partially written package. On strict bootstrap/reopen, a complete three-file package is admitted; an incomplete target-only creation residue with no predecessor source is removed and reported; an indeterminate but complete package is revalidated and may become the durable root. Configured descendant TeamRuns may remain operationally unmaterialized; their structural IDs and launch facts already exist in the execution tree.

### DS-022 — Handoff-rule discovery

```text
Team-bound Agent calls get_handoff_rules
  -> provider-neutral tool adapter passes exact TeamMemberExecutionIdentity
  -> RootTeamRun validates the exact active AgentRun and member address
  -> collaboration context selects that configured member's ordered handoffs
  -> handoff projector returns only [{when,recipient_address}]
  -> provider adapter preserves the canonical result envelope
```

Omitted or empty handoffs return `handoffs: []`. They never alter `send_message_to` or `delegate_task` eligibility.

### DS-025 — Exact Agent command

```text
browser/tool requests input, approval, or interruption for agentRunId
  -> AgentTeamRunManager selects the root RootTeamRun
  -> RootTeamRun authorizes the command and exact run membership
  -> TeamExecutionIndex derives the containing teamRunId
  -> TeamRunResolver returns/materializes the exact TeamRun
  -> TeamRun validates a direct local Agent execution
  -> private MixedTeamManager selects one configured/task-Agent handle
  -> AgentRun performs the command
  -> result/event returns through TeamRun and RootTeamRun
```

The public caller never supplies or parses a parent chain, and it never receives the local manager or registry.

### DS-026 — Root teardown

```text
root termination request
  -> AgentTeamRunManager selects and marks one RootTeamRun terminating
  -> RootTeamRun synchronously closes new task-command/message-plan admission
  -> TaskDelegationService drains every admitted command and TeamRunPersistenceCoordinator drains every submitted root-lock operation to committed, pre-rename cancellation, or root fail-stop
  -> TaskDelegationService admits required internal interruption commands through that same FIFO; each terminal task record commits first
  -> each internal settlement command obtains reversible local quiescence, commits its tree-only settledAt change, then cleans the exact task execution after the lock
  -> root TeamRun recursively terminates remaining configured handles only after task cleanup finishes
  -> child TeamRuns terminate through their own TeamRun/private-manager boundaries
  -> TeamRunResolver unregisters terminated child TeamRuns
  -> root subject owners persist terminal facts and dispose stores/listeners/indexes
  -> AgentTeamRunManager removes only that root catalog entry
```

One local manager disposes only its own direct handles. Root-scoped task, message, persistence, resolver, and event owners are disposed by `RootTeamRun`, not by a child manager. Root teardown never holds the mutation lock while waiting for an AgentRun reservation whose plan is queued behind that lock, while waiting for provider termination, or while recursively disposing handles. All prior plans finish before settlement quiescence begins. A postcommit local cleanup failure keeps the root in fail-stop rather than reverting durable settlement or continuing partial teardown.

### DS-028 — External-channel exact entry

```text
supported external-channel trigger
  -> external binding resolves {teamRunId,entryAgentRunId}
  -> AgentTeamRunManager selects the owning RootTeamRun
  -> RootTeamRun/TeamExecutionIndex validates exact live membership
  -> TeamRunResolver returns the containing TeamRun
  -> TeamRun delivers to the exact direct AgentRun
  -> AgentRun input admission returns accepted/rejected
  -> external-channel owner maps the result without reconstructing an execution address
```

`entryAgentRunId` is the concrete endpoint. Canonical address and ancestry are derived only for presentation or policy that explicitly needs them.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Data | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Assert exact absolute non-root syntax without normalization; lookup one configured placement; reject missing/Agent-intermediate/root. | `AgentTeamAddress`, configured node | recipient resolver | error envelope, metrics |
| DS-002 | Address selects a logical Agent or Team coordinator placement; the receiver AgentRun reserves one FIFO entry; root communication persists exact endpoints before releasing it. | placement, sender/receiver AgentRun IDs, reservation, message ID | root message boundary + AgentRun FIFO owner | references |
| DS-003 | Global router owns grants/liveness; same-root Team participants re-enter the reservation/durable-history boundary; standalone/cross-root remains direct `postUserMessage`. | exact AgentRun IDs, root membership | global router/root message owner | grant accounting |
| DS-004 | Authorize caller by AgentRun ID; select the nearest ancestor Team subtree that contains the target parent; follow configured Team members inside it to the exact TeamRun. | caller node/ancestors, target parent address | execution index/scope resolver | lazy Team materialization |
| DS-005 | Prepare/seal a fresh Agent, then at the one task-queue head revalidate latest state and derive/write the cumulative activation before no-throw commit/enqueue/gate and exact ingress return. | task ID, AgentRun ID, activation command/plan | root task service | event lease, references |
| DS-006 | Prepare/seal the full task Team subtree, reserve exact TeamRun registrations, then at the same queue head derive/write structural bindings before consuming reservations/enqueueing/releasing. | TeamRun/AgentRun IDs, member tree, activation command/plan | root task service | subtree identity allocation |
| DS-007 | Admit submit/review/interruption/settlement to one task FIFO. Commit terminal task status first. For settlement, obtain a reversible local quiescence capability, write only tree `settledAt`, then hand committed cleanup back to that local owner. | immutable task command, current record/tree, exact runs, prepared settlement | root task service/state machine + exact TeamRun local capability | notification warning, open work, postcommit cleanup |
| DS-008 | Task service serializes all task logical mutations; communication service seals one current-state message append; coordinator and strict writer expose physical phase truth. Only `committed` permits no-throw memory/event/work or settlement-detach release; clean settlement cancellation occurs outside the root lock. | typed task mutation plan or one-shot message append plan plus phase result | task/message owners with persistence coordinator | fsync, concurrency/failure injection, root fail-stop |
| DS-009 | Strict-load package; remove unreferenced unreleased nodes; interrupt stale nonterminal tasks; settle stale task executions; phase-aware validate/persist; expose only that valid root. | current files, repair timestamp | package loader/repair planner | actionable root-local diagnostics |
| DS-010 | Under the publisher barrier, read consistent tree/task/message subjects and recursively collect immutable configured/task Agent status through root `TeamRun`; map status with the same live/history mapper/DTO and attach current `changeSequence`. | subject snapshots + `TeamAgentStatusSnapshot[]` | RootTeamRun snapshot boundary/projector | pagination remains existing policy |
| DS-011 | An accepted change receives one correlated `changeSequence`; strict wire mapper/browser parser accept exact DTO; reducer applies only the next sequence or refetches. | discriminated event, change sequence | event publisher/projector/reducer | WebSocket reconnect |
| DS-012 | Discover and process predecessor roots independently; plan/validate/back up/stage/promote/revalidate each; catalog only valid V1 roots; preserve/report unresolved bytes for retry without blocking target-only startup. | predecessor evidence index plus target-root catalog | new migration | protected backups, diagnostics |
| DS-013 | Token store applies the entire exact run-ID conversion in one transaction and proves rollback on injected later failure. | ledger rows | token store | DB locks/volume |
| DS-014 | V6 contracts use exact AgentRun IDs; manifests/loaders require V6; project packages/dist move atomically; old app state is rebuilt. | application binding/events/targets | app contracts/orchestration | package consistency |
| DS-015 | One renderer explains filesystem-like absolute addresses, member identity, tools, optional handoffs, and exact-run communication identically to all providers. | prompt/tool schemas | server instruction owners | token budget |
| DS-016 | Acceptance/interruption retains a terminal task record until open work closes; the selected TeamRun reversibly quiesces the exact execution, tree settlement commits, then the same capability disposes local handles. Root fail-stop owns any postcommit cleanup rejection. | terminal task record, tree settledAt, prepared/committed local settlement | `TaskDelegationService` + exact `TeamRun` + `RootTeamRun` fail-stop | idempotence, resolver pruning |
| DS-017 | Every invalid runtime condition is rejected before exposed ID, durable active record, work release, or message append; invalid predecessor evidence prevents only that root's promotion/catalog admission. | stable codes/diagnostics | earliest owner | logging without secrets |
| DS-018 | Group the live task Agent under its logical placement, derive visible copy from task description, and focus only its exact AgentRun when selected. | AgentRun ID, placement, task description/status | frontend execution state + focus owner | truncation/accessibility |
| DS-019 | Group the live task Team under its logical placement and expand/collapse only the exact TeamRun member subtree. | TeamRun ID, child references, task description/status | frontend execution state + navigation presentation owner | local expansion state |
| DS-020 | Given one exact containing TeamRun and direct execution command, call the `TeamRun` local boundary; its private manager selects only among that TeamRun's configured/task registries and returns the result/event. | teamRunId, direct agentRunId/task binding, local command | `TeamRun` / `MixedTeamManager` | provider handle mechanics, injected root event sink |
| DS-021 | Mount configured placements, allocate persistent run IDs, phase-truthfully create the complete three-file package, then publish one RootTeamRun and its initial view; incomplete residue remains unexposed and is removed by package scan. | configured tree, run IDs, empty task/message ledgers | `AgentTeamRunManager` + `RootTeamRun` | topology planner, allocators, strict Team file writer |
| DS-022 | Validate the exact Team-bound caller and project only its ordered advisory handoff rows; empty configuration remains empty and does not become authorization. | member identity, configured handoffs | root collaboration context/handoff owner | provider adapter, stable result envelope |
| DS-023 | Normalize and validate absolute-local reference paths/content before the owning task transition plans its record; persist only parent-owned paths and derive other reference facts. | paths and retrieved content | task input/reference owner | filesystem validation/retrieval |
| DS-024 | After a durable submit/review transition, notify the exact peer; a failed notification becomes a warning and never reverses or repeats the transition. | task transition, exact peer AgentRun | task state owner/notification dispatcher | message formatting/delivery result |
| DS-025 | Route input/approval/interruption by exact AgentRun through the root and containing TeamRun to one direct local handle. | rootTeamRunId, agentRunId, command | `RootTeamRun` + exact `TeamRun` | authorization, provider command mechanics |
| DS-026 | Close new task/message admission, drain admitted task commands/root-lock work, commit internal terminal task transitions and tree-only settlements through the same FIFO, finish committed local cleanup, then recursively terminate remaining TeamRuns and remove only the selected catalog entry. | root TeamRun lifecycle | `AgentTeamRunManager` + `RootTeamRun` | local recursive termination, final persistence, reservation quiesce |
| DS-027 | Attribute usage to exact `run_id` plus optional root context and persist transactionally without current-schema composite parsing. | AgentRun usage event | token usage owner/store | migration transaction is separate DS-013 |
| DS-028 | Resolve a supported external Team entry to exact TeamRun/AgentRun IDs and use the same root/local input boundary as other exact delivery. | external binding, entryAgentRunId | external binding owner + `RootTeamRun` | transport mapping |
| DS-029 | Resolve exact run identity through the tree/index and derive only the physical/history/projection context the owning consumer needs. | agentRunId/teamRunId | history/file-change/monitor owner | filesystem store, event projection |

## Spine Actors / Main-Line Nodes

| Node | Main-Line Responsibility | Must Not Do |
| --- | --- | --- |
| `AgentTeamRunManager` | process-wide catalog and lifecycle entry for root `RootTeamRun` instances only | register child TeamRuns or expose root internals |
| `RootTeamRun` | stable public rooted operations; coordinate explicit subject owners | expose manager/index/store internals or become a mutable state blob |
| `TeamRun` | authoritative local boundary for one concrete Team execution, including reversible direct-task settlement preparation | perform root recipient/task/message policy or expose its manager |
| `MixedTeamManager` | direct configured/task handles and local lifecycle for exactly one TeamRun; prepare/commit/cancel local settlement capabilities | resolve arbitrary root addresses, own root stores/events/directories, destroy a task handle before tree durability, or bubble through a parent boundary |
| `TeamExecutionIndex` | exact AgentRun/TeamRun lookup, logical configured lookup support, parent/ancestor/host derivation | allocate runs or make task policy |
| `TeamRecipientResolver` | canonical logical lookup | select concrete execution or task eligibility |
| `TeamExecutionScopeResolver` | deterministic nearest-containing-subtree and target-parent TeamRun selection | persist or activate work |
| `TaskDelegationService` | task state machine, activation orchestration, settlement eligibility/ordering, and the sole private FIFO from latest-state read through result for every task mutation | implement Agent/Team handle mechanics, accept caller-precomputed snapshots, or create a second task queue |
| `TeamCommunicationService` | accepted-message policy, immutable current message state, and sealed append-plan construction | write precomputed full snapshots or own another input queue |
| `TeamRunResolver` | exact live TeamRun lookup and exact configured-Team chain materialization | select logical recipients/task hosts or store ancestry |
| `TeamRunPersistenceCoordinator` | root mutation lock and subject-specific typed physical commit sequencing; convert post-rename uncertainty into root fail-stop | accept caller-derived full task/message snapshots, own task/message policy, expose public operation results, or expose compatibility reads |
| `TeamRunFileCommitWriter` | strict temp/file-sync/rename/directory-sync execution and exact physical phase result for the three Team files | swallow required sync failure, map business results, retry, or serve unrelated stores |
| `TeamExecutionViewProjector` | one derived exact snapshot/delta contract | persist frontend state |
| `TeamRunEventPublisher` | root subscription barrier and non-persisted monotonic `changeSequence` | own tasks/messages/tree or persist event order |
| frontend `TeamExecutionViewState` | one change-sequenced concrete aggregate and selectors | parse raw keys or independently materialize topology |
| `TeamMembersPanel` | render semantic execution navigation and dispatch exact Agent focus or Team expansion commands | parse identities, derive parentage, or treat a Team as its coordinator |
| migration owner | predecessor-only per-root conversion, diagnostics, and target-root catalog admission | leak predecessor fields to runtime or block target-only server availability on one unresolved root |
| token usage owner/store | exact current usage attribution and persistence | parse current composite execution identity or choose task ancestry |
| external binding owner | exact supported external entry binding and result mapping | invent entry AgentRun identity or bypass the owning root |
| history/file-change/monitor owner | subject-specific lookup/projection from exact run IDs | retain a parallel execution-parent model |

## Ownership Map

| Subject | Governing Owner | Private Collaborators | Public Access |
| --- | --- | --- | --- |
| configured logical topology | `TeamDefinitionTopologyPlanner` and configured branch of `TeamRunExecutionTree` | tree schema/index | `RootTeamRun`/recipient resolver |
| concrete execution containment | `TeamRunExecutionTree` | `TeamExecutionIndex` | `RootTeamRun` operations/projection |
| one concrete Team execution | `TeamRun` | private `MixedTeamManager`, local registries, prepared/committed settlement capabilities | root subject owners through `TeamRunResolver` only |
| task lifecycle/work edges | `TaskDelegationService` | one private command FIFO, task state machine, records store, prepared activation/event reservations, selected TeamRun settlement capability | task tools/root facade |
| ordinary Team messages | `TeamCommunicationService` | immutable message-state cell, sealed append plan, message store/input builder | message dispatcher/root facade |
| root physical commit serialization and failure phase truth | `TeamRunPersistenceCoordinator` | three strict stores, `TeamRunFileCommitWriter`, and subject-specific typed plans | root subject owners only |
| exact logical/current indexes | `TeamExecutionIndex` | immutable snapshots | root owners only |
| initial/live browser read model | backend projector + one frontend reducer | strict DTO mapper/parser | selectors/stores/components |
| root live event order | `TeamRunEventPublisher` | subscriber barrier/queue | root projector/stream only |
| token row persistence | `TokenUsageLedgerStore` | SQL repository | token services/migration |
| application contract | `autobyteus-application-sdk-contracts` V6 | SDK/devkit/server adapters | project packages |
| predecessor conversion | new migration | per-root evidence index/planners/stagers/diagnostics and target-root catalog builder | migration runner/server bootstrap |
| handoff discovery | root collaboration context/handoff owner | configured handoff projector | provider tool adapters through `RootTeamRun` identity validation |
| task reference files | task input/reference owner | workspace validation/content retrieval | task lifecycle operations only |
| external Team entry binding | external binding owner | exact-run route/result adapter | supported external trigger |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Deeper Owner | Allowed Work | Forbidden Work |
| --- | --- | --- | --- |
| Agent tool functions | parser/tool service | parse, map stable result/error | host selection, lifecycle, persistence |
| `TaskDelegationToolRunRouter` | `RootTeamRun`/task service | find caller's root and invoke | current/parent service inference |
| `RootTeamRun` methods | explicit root subject owners | enforce public rooted boundary | return index/manager/store/service objects |
| `TeamRun` methods | private backend/manager | enforce exact local execution boundary | accept logical recipient expressions or return manager/registry objects |
| GraphQL/REST/WebSocket resolvers | projection services | auth, invoke, exact DTO mapping | reconstruct execution/task relationships |
| provider adapters | server tool/message contracts | translate input/output mechanics | choose target eligibility or task policy |
| frontend stores/components | `TeamExecutionViewState` | select/dispatch view commands | mutate raw maps or parse identity strings |
| `TeamMembersPanel` | `TeamExecutionViewState` plus local expansion state | render exact rows; dispatch Agent focus or Team expansion | reconstruct parentage, show technical IDs, or message a Team row |

## Removal / Decommission Plan (Mandatory)

| Remove | Why | Replacement | Timing | Allowlist |
| --- | --- | --- | --- | --- |
| `recipient-address-expression.ts` and relative runtime tests/copy | two Agent-facing grammars | canonical absolute parser/resolver | phase 2 | definition-file relative filesystem paths are unrelated |
| adjacency mapper/result/code | contradicts universal rooted topology | task target validator | phase 3 | configured tree direct-child structural validation remains |
| per-Team task service/ledger registry and persistence scope wrapper | wrong lifecycle boundary | one `TaskDelegationService` belonging to `RootTeamRun` | phase 3 | local task execution registries remain as handle mechanics |
| `MixedParentBoundaryContext`/`parentBoundary` message bubbling | child manager performs root routing | root service -> index/`TeamRunResolver` -> exact `TeamRun` | phase 3 | none in current runtime |
| `TaskTeamActiveExecutionResolver`, task-Agent directory, task-Team active-run directory | task/composite-specific live lookup competes with execution tree | `TeamExecutionIndex`, local registries, and `TeamRunResolver` | phases 2–3 | migration evidence only |
| manager-owned recipient resolver/listener set/activation barrier/root disposal | root and local ownership mixed | root recipient resolver, task service, event publisher, and owner-specific teardown | phases 2–3 | manager keeps injected event sink only |
| `TeamExecutionAddress` server domain, serializer, DTOs, parsers | redundant composite identity | address + exact run IDs + tree | phases 1–7 | predecessor migration fixtures/converters only |
| `taskTeamRunIds`, `taskAgentRunId`, owner route/path keys | derivable/parallel ancestry | tree index/containment | phases 1–7 | migration evidence only |
| old task target/reply/caller participant duplicates | repeat shared placement/run facts | shared resolver/index/record | phase 3 | none |
| `commitReservedMessage(nextMessages)` and any caller-side complete message-snapshot derivation | permits concurrent lost updates before root serialization | sealed `PreparedTeamMessageAppend` executed from current state under the root lock | phase 4 | migration may construct complete staged target files offline |
| `commitTaskActivation(nextTree,nextTasks)`, `commitTaskTransition(nextTasks)`, destructive `settleDirectTask()`, and every caller-side complete task/tree snapshot boundary | serializes physical replacement after stale derivation or destroys live execution before durable settlement | one `TaskDelegationService` command FIFO; queue head derives typed activation/record-transition or tree-only prepared-settlement commits; local teardown begins only after committed tree truth | phase 4 | migration may construct complete staged target files offline |
| direct use of best-effort `atomicWriteJsonFile()` by tree/task/message stores | cannot distinguish pre-rename failure from post-rename finalization uncertainty | strict `TeamRunFileCommitWriter` and root fail-stop/reload contract | phase 4 | generic writer remains for unrelated existing owners |
| task/message sender/receiver composite fields and reference metadata | exact run/path facts suffice | V1 compact records | phase 4 | migration input types only |
| `team_run_metadata.json` runtime store/schema/writer | replaced by complete execution tree | V1 execution tree store | phase 4/migration | migration source reader only |
| token `executionAddressJson` domain/readers/fallbacks | exact `run_id` already owns execution | rootTeamRunId + runId | phase 6 | migration source columns until table cut |
| external `entryExecutionAddress` | composite exact target | `entryAgentRunId` | phase 6 | migration only |
| application V5 Team execution types/constants/artifacts | old target model | V6 exact run-ID types | phase 7 | no V5 adapter |
| frontend serialized execution-key map, parsers, task materializer | duplicate exact state | run-ID tree/reducer/selectors | phase 5 | migration not in browser |
| obsolete docs/schema examples | teach old model | current contracts/examples | final source phase | historical ticket artifacts |

## Return Or Event Spine(s) (If Applicable)

### DS-024 — Formal task notification

```text
submit/review caller
  -> TaskDelegationService admits one immutable command to its private FIFO
  -> at queue head, service reads latest task/tree state and authorizes exact task participant/source state
  -> task state machine derives one cumulative typed transition plan
  -> TeamRunPersistenceCoordinator persists it through the phase-aware Team writer
  -> task owner commits the transition in memory
  -> notification dispatcher resolves the exact peer AgentRun
  -> RootTeamRun routes one system task notification
  -> result returns transition success plus notification success/warning
```

A notification failure occurs after the task transition's durable commit. The public result reports a warning; it does not roll back, repeat, or misreport the task transition.

### Delegation result

```ts
type DelegateTaskResult =
  | { task_id: string; status: "active"; target_agent_run_id: string }
  | { task_id: string; status: "not_started"; message: string };
```

The active result is returned only after both tree and task record are durable, the exact AgentRun is indexed, and work is released. Team targets return coordinator AgentRun ID.

### Root execution view events

The exact shared transport package shall replace composite address DTOs with correlated variants such as:

```ts
type TeamExecutionViewEvent =
  | { type: "TASK_AGENT_ACTIVATED"; changeSequence: number; parentTeamRunId: string; execution: TaskAgentExecutionDto; task: TaskDelegationRecordDto }
  | { type: "TASK_TEAM_ACTIVATED"; changeSequence: number; parentTeamRunId: string; execution: TaskTeamExecutionDto; task: TaskDelegationRecordDto }
  | { type: "TASK_EXECUTION_SETTLED"; changeSequence: number; execution: { agentRunId: string } | { teamRunId: string }; task: TaskDelegationRecordDto; settledAt: string }
  | { type: "TASK_CHANGED"; changeSequence: number; task: TaskDelegationRecordDto }
  | { type: "TEAM_MESSAGE_RECORDED"; changeSequence: number; message: TeamCommunicationMessageDto }
  | { type: "AGENT_EVENT"; changeSequence: number; agentRunId: string; payload: TeamAgentEventDto }
  | { type: "AGENT_STATUS"; changeSequence: number; agentRunId: string; status: TeamAgentStatusDto };
```

Exact names may follow current shared-contract conventions, but every variant must be correlated and exhaustive; no `unknown` payload, alias, or optional composite identity is permitted. Activation is one event containing both the execution and task record, so the frontend cannot observe a task execution without its label/lifecycle facts. The stream/session carries `rootTeamRunId` once. `changeSequence` is non-persisted and owned only by `TeamRunEventPublisher`; task revision remains separate task-lifecycle language. Application-generic egress includes root context in its outer binding/event envelope.

## Bounded Local / Internal Spines (If Applicable)

### DS-023 — Task reference-file admission

```text
delegate/submit/review input reference_files
  -> task input owner requires absolute local paths
  -> workspace boundary validation rejects escape/non-file/missing input
  -> content retrieval occurs before task mutation
  -> task owner persists only normalized paths under the parent task/update
  -> later retrieval derives reference identity/type/time from that parent record
```

Validation or retrieval failure produces no task activation or lifecycle transition. The current file shape does not repeat derivable reference IDs, types, or timestamps.

### DS-027 — Current token attribution

```text
AgentRun usage event
  -> token context receives exact agentRunId and optional rootTeamRunId
  -> token usage owner validates the run identity already present on the event
  -> TokenUsageLedgerStore persists run_id plus root context
  -> reports group/query by those exact fields
```

Current runtime never parses or emits composite execution JSON. Historical token conversion remains isolated in DS-013.

### DS-029 — Derived physical/history context

```text
file-change/history/monitor request with exact run ID
  -> RootTeamRun/TeamExecutionIndex resolves the exact execution node
  -> tree containment derives logical placement and Team ancestry when needed
  -> owning consumer maps to the established Agent memory/history location or event context
  -> consumer returns its subject-specific result
```

The consumer may derive a local projection but may not persist another parent chain, route key, or serialized execution key.

### DS-004 — concrete scope and host selection

```text
targetParent = parent(recipient.address)
callerTeamAncestors = executionIndex.teamAncestorsOf(callerAgentRunId), deepest first
scope = first ancestor where ancestor.address.isAncestorOrSelfOf(targetParent)
host = executionIndex.configuredTeamDescendant(scope.teamRunId, targetParent)
assert host exists, active, and belongs to root
```

Address containment is segment-aware canonical-domain behavior, not a raw string-prefix heuristic. Root `/` contains every target parent. Descending only through configured Team members keeps the selected execution scope exact and excludes unrelated/sibling task executions with the same logical address.

### DS-007 — task state machine

```text
active --submission--> awaiting_review
awaiting_review --request_revision--> active
awaiting_review --accept--> accepted
active|awaiting_review --restart/teardown interruption--> interrupted
```

`accepted` may precede runtime `settledAt` while open-child/runtime-work gates finish. `interrupted` requires settlement. Strict read replays updates and validates materialized status.

The state machine deliberately does **not** add `settling`. `accepted`/`interrupted` is the durable task relationship state in `task_delegation_records.json`; an execution node with `settledAt: null` remains the truthful concrete runtime state until a separate settlement command durably changes the tree. An interruption command commits the `interrupted` record first, then the ordinary settlement path may run.

### DS-008 — task-command, message-reservation, and physical-phase commit

Every task lifecycle mutation enters the same FIFO, but its exact physical subject remains narrow:

```text
activate | submit_result | review_result | interrupt | settle
  -> immutable command enters the one TaskDelegationService FIFO
  -> at queue head read latest authoritative task records and execution tree
  -> authorize exact caller/system actor and required source state
  -> activation derives tree + task files; submit/review/interrupt derive the task file; settle derives only the execution tree
  -> persistence coordinator holds root mutation lock while strict Team writer reports not_renamed | renamed_finalization_indeterminate | committed
  -> not_renamed: synchronously cancel any reversible preparation before root-lock release, leave memory unchanged, and use the operation-owned result
  -> renamed_finalization_indeterminate: fail-stop the root; no normal result/event/work release
  -> committed: synchronous no-throw memory/event commit and command completion
```

Activation first prepares the Agent/Team behind a closed work gate, reserves local/TeamRun registrations, finishes every fallible construction, and seals one hidden event batch before queue admission. Only the queue head derives `nextTree`/`nextTasks`. A tree orphan can exist after a crash or second-file `not_renamed` result; strict reload removes it. Any recoverable activation failure before the commit point aborts preparation, resolver reservation, and event lease and returns `not_started`. After the commit point subscriber callbacks are not inline, subscriber exceptions are isolated, and provider work begins only after release. Process death after the commit point yields no public response; restart interrupts/settles the durable task. Different-task commands commit `T0+A` then `T0+A+B`; same-task commands revalidate after prior completion and do not overwrite or bypass source-state rules.

Activation has two implementation-critical phase rules retained from CRR-001: `renamed_finalization_indeterminate` bypasses every ordinary catch/abort/result-mapping path and leaves hidden preparation to root fail-stop; on `committed`, `releaseWork()` flips synchronously inside `commitAfterDurability()`, while the prepared execution's already-existing lower scheduling boundary performs provider/listener work later.

Settlement is one tree-file logical commit:

```text
terminal accepted|interrupted task at task-command queue head
  -> verify no open child task from current task records/index
  -> selected TeamRun.prepareDirectTaskSettlement(exact binding)
  -> local registry reserves that exact entry; AgentRun/child TeamRuns close new admission
  -> wait every earlier AgentRun reservation to commit/cancel and every released/active dispatch to finish
  -> recheck exact binding, terminal task state, and local open-work/idle gates
  -> return one PreparedTaskSettlement; no backend terminate, registry delete, or TeamRun unregister has occurred
  -> derive nextTree by setting only that task execution's settledAt
  -> persistence coordinator writes execution tree under the root lock
  -> not_renamed: under lock cancel preparation in reverse and reopen Agent admission synchronously; leave terminal task + live execution unchanged
  -> renamed_finalization_indeterminate: root fail-stop retains hidden preparation; no ordinary result or local teardown
  -> committed: swap tree + enqueue settlement event + synchronously commit preparation, making the execution non-routable
  -> after root lock unwinds, the committed capability recursively terminates/disposes its exact local handles
  -> successful cleanup releases inactive TeamRun registrations; cleanup rejection fail-stops this root and is never mapped as persistence failure
```

The local capability—not the root task service—owns handles and recursive mechanics. The task service owns eligibility, order, task/tree derivation, and the cleanup outcome policy. No root lock is held while waiting for reservations, provider dispatch, or asynchronous cleanup. A later normal settlement opportunity may attempt an execution that remained terminal/unsettled after `not_renamed`; there is no in-command persistence retry or replay.

Concurrent task transition proof spine:

```text
submit task A and review task B overlap
  -> immutable commands enter one FIFO in admission order
  -> command A reads T0, derives T0+A, commits file/memory/event, then completes
  -> command B reads authoritative T0+A, derives T0+A+B, commits, then completes
  -> final memory/file retain both transitions in that order
```

Post-rename finalization spine, common to task and message files:

```text
strict writer successfully renames final pathname
  -> directory open/sync/close reports failure
  -> writer returns renamed_finalization_indeterminate with file/stage
  -> persistence coordinator calls RootTeamRun.enterPersistenceFailStop() under root lock
  -> no memory/event/reservation/work release and no ordinary AgentOperationResult
  -> after lock unwinds, root-owned teardown closes only this root
  -> explicit reopen/restart strict-loads and repairs whichever target bytes survived before re-exposure
```

Team message:

```text
AgentRun FIFO reserve (synchronous, unreleased, blocks overtaking)
  -> without await, seal immutable message + reservation + preallocated event slot and submit root append plan
  -> root mutation lock
  -> read authoritative current message snapshot + validate active root/endpoints/reservation/message-ID absence
  -> derive current-plus-message snapshot inside lock
  -> persist one deduplicated message row through the same strict phase-aware writer
  -> conflict/not_renamed: synchronous plan/reservation cancellation; no dispatch/event/row
  -> renamed_finalization_indeterminate: root fail-stop, hidden reservation/event, no normal result
  -> committed: synchronous message-memory swap + event-slot/reservation commit
  -> synchronous release to existing FIFO dispatcher
```

The reservation is inside the existing AgentRun input state; the Team communication owner never queues or replays provider input. A plan is a one-shot capability for one existing root-lock operation, not a second queue or expected-base retry. It contains no precomputed full snapshot. If the root is closing, an endpoint/reservation is no longer current, or the message ID already exists, it cancels and returns a stable rejection before file mutation. Root teardown first closes new plan admission, then lets all earlier root-lock plans commit, cancel before rename, or enter root fail-stop, and only afterward quiesces/destroys AgentRuns; it never waits for a reservation while holding the lock ahead of that reservation's append plan.

Ordinary quiescence is reservation-safe: the AgentRun input owner closes new admission and awaits every unresolved `reserved` entry's existing commit/cancel signal plus released/active dispatch completion. `settleAcceptedTermination()` cannot delete a submitted reservation. Exceptional disposal of a deliberately hidden indeterminate reservation remains exclusive to root fail-stop.

### DS-020 — exact local TeamRun dispatch

```text
root subject owner holds exact agentRunId/teamRunId command
  -> TeamExecutionIndex validates containment and yields containing teamRunId
  -> TeamRunResolver returns/materializes that exact TeamRun
  -> TeamRun validates the target is a direct local execution
  -> private MixedTeamManager selects configured/task-Agent/task-Team registry by exact binding
  -> local handle performs the command
  -> local event sink forwards any event to TeamRunEventPublisher
  -> result returns through TeamRun and RootTeamRun
```

The local manager never parses `recipient_address`, chooses a task host, reads task/message stores, or bubbles to a parent. `TeamRunResolver.requireConfigured()` follows only the unique root-to-target configured TeamRun chain supplied by `TeamExecutionIndex`; a missing task TeamRun is rejected rather than recreated.

### DS-009 — restart repair

```text
strict load three files
  -> remove task roots with no task record
  -> for each unsettled execution: settle at recovery time
  -> active/awaiting task: append interruption and set interrupted
  -> accepted: preserve accepted, only finish settlement
  -> validate every reference/index
  -> persist repaired affected files through TeamRunFileCommitWriter
  -> committed: revalidate and expose this root
  -> not_renamed | renamed_finalization_indeterminate: keep this root unavailable with actionable diagnostic
```

Explicit reopen and server restart use this same current-schema loader. It is crash/finalization repair, not a predecessor reader. Other roots remain cataloged and available.

## Off-Spine Concerns Around The Spine

| Concern | Owner | Placement | Must Not Invade |
| --- | --- | --- | --- |
| stable public errors | collaboration/task result mapper | boundary adapters | core store schemas |
| reference content/type/ID projection | reference content services | task/message API projection | persisted reference shape |
| provider tool registration | provider adapters | AgentRun composition | target policy |
| event/status serialization | shared Team stream mapper | transport boundary | domain ownership |
| WebSocket reconnect/gap | frontend connection service | transport/reducer boundary | persisted tree |
| root metrics/logging | `RootTeamRun`/migration owners | observer hooks | correctness decisions |
| backup retention | migration/delivery policy | backup area | normal runtime readers |
| UI expansion/drafts/scroll/unread | frontend presentation stores | components/local state | execution domain aggregate |

## Ownership Boundaries

1. `RootTeamRun` is the only public rooted boundary; it delegates to explicit subject owners and is not itself a state blob.
2. `TeamRunExecutionTree`, `TaskDelegationService`, and `TeamCommunicationService` separately own containment, task lifecycle, and accepted-message history. The task service alone owns the one task-command FIFO/current task-state transition order; the communication service alone owns its immutable current snapshot and append/dedup/current-reference policy.
3. `TeamRunPersistenceCoordinator` owns the root mutation lock and typed physical commits. Its task operations receive only queue-head-derived typed plans; its message operation invokes one sealed service-owned append plan against current state under that lock. It never accepts caller-derived complete snapshots or maps a public operation result. Stores persist snapshots but do not decide transitions.
4. `TeamRunFileCommitWriter` alone owns strict file-sync/rename/directory-sync phase truth for the three Team authorities. Post-rename finalization uncertainty synchronously fail-stops the affected root; it is never mapped as a clean task/message rejection.
5. Every `TeamRun` owns one private `MixedTeamManager`; mixed managers create/control only direct local execution objects.
6. `TeamExecutionIndex` owns derived lookup/ancestry and `TeamRunResolver` owns exact live TeamRun access; no caller computes parent chains or reaches managers.
7. The logical resolver owns configured placement only; it never returns config internals or exact live handles.
8. `TeamRunEventPublisher` alone owns root subscription ordering and non-persisted `changeSequence`; the root `TeamRun` recursively supplies canonical initial leaf status inside that barrier.
9. The backend projector owns domain-to-read-model joining; browser code owns view application/presentation only.
10. The migration owns predecessor interpretation and root-local target catalog admission; target runtime contains no predecessor branches.
11. Application contract packages own shared public shapes; server/web adapters do not fork them.

## Boundary Encapsulation Map

| Boundary | Hidden Internals | Allowed Consumers | Prevented Leakage | Target Interface |
| --- | --- | --- | --- | --- |
| `RootTeamRun` | subject services/index/resolver/stores/local TeamRuns | tools, API, `AgentTeamRunManager` | config/manager/service handles | operation methods, snapshots, subscriptions |
| `TeamRun` | backend/private manager/registries | root subject owners through `TeamRunResolver` | manager/registry handles and root policy | exact local execution commands |
| `MixedTeamManager` | direct configured/task handles and provider mechanics | its owning `TeamRun` only | root resolver/task/message/persistence/event subscription | local backend methods + injected event sink |
| execution index | maps/parent links | root services/projector | serialized keys/chains | run/address/ancestor queries |
| TeamRun resolver | private active TeamRun map/configured materialization | root subject owners | manager handles/address policy/ancestry copies | exact TeamRun access |
| task service | records/state machine/activation orchestration/one private command FIFO | `RootTeamRun` | local Team inference/provider mechanics, precomputed caller snapshots, second task queue | delegate/submit/review/interrupt/settle |
| persistence coordinator | root lock, typed physical plans/results, strict writer | root subject owners/loader | store-specific writes, generic mutation callbacks, public results, and caller-precomputed snapshots | typed task commits plus sealed message append |
| Team file writer | temp path/file sync/rename/directory sync and physical phase receipt | persistence coordinator and three Team stores only | business policy, best-effort required sync, retry | `write(file,snapshot) -> TeamRunFileWriteResult` |
| event publisher | listener barrier/queue/change sequence | root projector/stream/local event sinks | persisted state or task revision | publish/subscribe/snapshot barrier |
| projection | join/index logic | API/stream | domain reconstruction in resolvers/browser | snapshot/delta DTOs |
| migration | old types/evidence/correlation/root-local failures | migration runner/bootstrap | old fields in runtime or predecessor package admission | plan/execute/report/catalog valid V1 roots |

## Dependency Rules

- `agent-collaboration` address/handoff domain depends on no Team runtime implementation.
- `agent-team-execution/domain` defines exact current models and depends on canonical address/run primitive types, not stores/providers/frontend.
- `RootTeamRun` depends on immutable domain values and its explicit subject-owner interfaces; stores and local managers do not call back into the facade.
- task delegation depends on the execution index, `TeamRunResolver`, persistence coordinator, event publisher, shared logical resolver, and existing factories; its one private FIFO owns all task mutation order and it does not depend on GraphQL/provider/frontend.
- Team communication depends on the execution index, exact TeamRun/AgentRun input boundary, persistence coordinator, and event publisher; it constructs one sealed append plan but never writes a full snapshot outside the root lock.
- root subject owners depend on `TeamRun` local methods, never on `MixedTeamManager` or registries.
- mixed Team implementation depends on task-neutral sealed preparation/commit-latch/settle inputs and one injected root event sink; it does not import root task/message stores, root resolver, or persistence.
- `TeamRunResolver` depends on the execution index, a private live TeamRun map, and the local `TeamRun` boundary; it stores no ancestry/task/address copies.
- run-history/persistence depends on current domain schemas and the strict Team file writer; it maps no public operation result and historical types live only in migration.
- Team stream contracts are shared DTO authority for server and web; both depend on it rather than each other.
- application contracts/SDK/devkit/server/web all consume the same V6 exact model.
- migration may depend on predecessor snapshots and target validators; target domain never depends on migration, and bootstrap catalogs only validated V1 packages after the attempt finishes.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Input -> Output | Exclusions |
| --- | --- | --- | --- | --- |
| `TeamRecipientResolver.resolve(root,address)` | logical placement | strict absolute lookup | address -> Agent/Team placement | runtime/config handles |
| `TeamExecutionIndex.getAgent(agentRunId)` | exact Agent | exact node/root/parent | AgentRun ID -> immutable node placement | liveness mutation |
| `TeamExecutionIndex.getTeam(teamRunId)` | exact Team | exact node/root/parent | TeamRun ID -> immutable node placement | runtime handle exposure |
| `TeamExecutionIndex.teamAncestorsOf(agentRunId)` | ancestry | deepest-first exact Team instances | AgentRun ID -> Team node list | task relation |
| `TeamExecutionIndex.configuredTeamDescendant(scopeRunId,address)` | scoped Team lookup | follow configured Team members only | scope TeamRun + target parent -> Team node | task-execution search |
| `TeamExecutionScopeResolver.resolve(caller,target)` | scope/host | deterministic caller-applicable target-parent TeamRun | caller AgentRun + placement -> TeamRun ID | activation/persistence |
| `TeamMemberExecutionIdentity` | Team-bound caller identity | carry the minimum provider/tool boundary identity | root TeamRun ID + member address + AgentRun ID | owner TeamRun, task ID, composite/path/route/config facts |
| `RootTeamRun.delegateTask/sendMessage/...` | rooted public boundary | enforce root scope and dispatch to subject owner | caller + exact command -> stable result | expose internals or perform provider/store work |
| `RootTeamRun.enterPersistenceFailStop(receipt)` | rooted lifecycle | synchronously latch one root unavailable after post-rename uncertainty, reject new admission, and schedule root-owned teardown/reload requirement | internal indeterminate receipt -> no-throw lifecycle transition | public domain result mapping, retry, other-root shutdown |
| `TeamRunResolver.requireConfigured(teamRunId)` | exact TeamRun access | follow index-provided configured TeamRun chain and register exact live TeamRuns | TeamRun ID -> `TeamRun` | logical search, task-Team recreation, ancestry storage |
| `TeamRun` local operations | one concrete Team execution | direct delivery/command/task activation preparation/reversible settlement preparation/child materialization plus recursive canonical leaf status | exact direct binding -> local result, prepared capability, or snapshot | root policy, address parsing, manager exposure |
| `TaskDelegationService.delegate/submit/review/interrupt/settle` | task lifecycle | admit one immutable command and own queue-head latest-state authorization/derivation through result | exact actor + command facts -> domain result | address parsing, provider mechanics, caller-precomputed task/tree snapshots |
| `TaskDelegationCommandQueue.submit(command)` | task mutation order | one private FIFO for every root task command | immutable command -> one completed command result | persisted revision, priority, retry, second ledger/queue |
| `TeamRunPersistenceCoordinator.commitTaskMutation(plan)` | task persistence | execute one exact queue-head-derived activation or record-transition plan under root lock | typed prepared plan -> narrow physical commit result | settlement teardown, policy/authorization, caller snapshot API, public `AgentOperationResult`, retry/replay, generic mutate callback |
| `TeamRunPersistenceCoordinator.commitTaskSettlement(plan)` | execution-tree settlement persistence | write one queue-head-derived tree snapshot; cancel reversible preparation on `not_renamed`; return committed local cleanup only after tree/event detach | prepared tree settlement -> phase result or `CommittedTaskSettlement` | task status mutation, provider call under lock, rollback/retry, public mapping |
| `TeamRunPersistenceCoordinator.commitReservedMessageAppend(plan)` | message persistence | execute one sealed current-state append under root lock through no-throw release | `PreparedTeamMessageAppend` -> narrow message commit result | caller-derived full message snapshot, public result, retry/replay |
| `TeamRunFileCommitWriter.write(file,snapshot)` | Team JSON physical commit | strict validate/temp/file-sync/rename/directory-sync with exact phase truth | one Team file snapshot -> `not_renamed` \| `renamed_finalization_indeterminate` \| `committed` | business mapping, best-effort required sync, retry/rollback |
| `TeamRunEventPublisher.publish(event)` | live ordering | assign next `changeSequence` and publish through one barrier | accepted root event -> sequenced event | persist event order/task revision |
| `RootTeamRun.openExecutionViewConnection()` | rooted initial view | use publisher barrier to capture subjects + recursive status at base sequence S, then drain S+1 | connection -> strict snapshot/subscription | manager bypass, browser status defaults |
| `TeamExecutionViewProjector.snapshot(subjects,statuses,changeSequence)` | read model | exact initial projection | consistent tree/task/message snapshots + canonical status snapshots -> strict DTO | persistence, status synthesis |
| `AgentRun.reserveUserMessage(message,options)` | input admission | reserve one unreleased position in the existing FIFO | canonical input -> rejection or opaque reservation | provider dispatch, Team persistence |
| `AgentRunInputReservation.commit/cancel/release` | input admission commit | synchronously commit or cancel the reserved entry and release only after durability | exact opaque token -> no-throw state transition | second queue, retry/replay |
| `AgentRun.prepareTermination()` | reservation-safe termination | close new input and wait every earlier reservation/dispatch before producing reversible termination capability | active AgentRun -> prepared termination or owned rejection | task policy, root lock, deletion of unresolved reservation |
| `PreparedTeamMessageAppend.prepareAgainstCurrent()` | accepted message | one-shot under-lock validation/dedup/next-state derivation | service-owned current state -> `PreparedTeamMessageCommit` | file I/O, retry, precomputed base snapshot |
| `PreparedTeamMessageCommit.commitAfterDurability()` | accepted message | no-throw memory/event/reservation commit and FIFO release | durable commit receipt -> accepted state | allocation, lookup, subscriber callback, provider call |
| `TeamExecutionViewState.apply(event)` | frontend | change-sequenced state mutation | next event -> new immutable state | raw key parsing |
| `TeamExecutionViewState.listNavigationRows()` | frontend | placement-grouped semantic navigation projection | state + task overlay -> Agent/Team rows keyed by exact run ID | component-owned sorting/parent inference |
| `TokenUsageLedgerStore.migrateExecutionIdentity(plan)` | token persistence | one transaction | validated plan -> count/result | JSON migration logic |

## Interface Boundary Check

| Public Boundary | One Authoritative Input? | One Authoritative Output? | Risk | Resolution |
| --- | --- | --- | --- | --- |
| `delegate_task` | Yes: absolute recipient | Yes: minimal result | Low | no run selector/relative alias |
| `send_message_to` | Yes: discriminated address or exact AgentRun selector | Yes: stable message result | Low | exactly one selector required |
| task records | Yes: compact V1 file | Yes: strict records | Low | exact structural task reference |
| execution view | Yes: root snapshot/events | Yes: strict shared DTOs | Medium | one projector/reducer, change-sequence gap refetch |
| application packages | Yes: V6 | Yes: V6 | Low | atomic constants/manifests/dist update |
| migration | Yes: discovered predecessor/target state | Yes: valid target-root catalog plus retryable root-local diagnostics | Medium | independent root staging/admission and forward-only runtime |

## Main Domain Subject Naming Check

| Name | Why It Fits | Rejected Alternatives |
| --- | --- | --- |
| `TeamRunExecutionTree` | concrete persisted TeamRun/AgentRun containment | `metadata` is too broad; `manifest` implies header; `state` hides tree |
| `RootTeamRun` | public boundary for one rooted execution and its explicit subject owners | `RootTeamRunState` hides subject ownership; `MixedRootTeamRuntime` is vague and conflates execution/provider meanings |
| `TeamRun` | one concrete Team execution | `node manager` hides the domain subject |
| `MixedTeamManager` | private manager for one mixed TeamRun's direct live handles/lifecycle | one root-global manager would erase natural recursive ownership |
| `MixedConfiguredMemberRegistry` | direct configured handles in persistent or task TeamRuns | `MixedPersistentMemberRegistry` is false for configured members of a task Team |
| `TeamRunResolver` | exact TeamRun access plus exact configured-chain materialization | task-specific directories duplicate the common lookup concern |
| `changeSequence` | non-persisted ordering of accepted root live changes | `revision` conflicts with task revision and suggests persisted domain version |
| `TeamExecutionIndex` | derived lookups over concrete execution tree | `address index` would overstate logical address as exact identity |
| `TaskExecutionReference` | record points to exact fresh AgentRun or TeamRun | `assignee address` confuses logical and concrete |
| `recipientAddress` | task relationship's selected logical recipient | `address` alone loses role in task record |
| `address` | intrinsic configured placement of a node | `recipientAddress` would make operation context intrinsic |
| `launchConfiguration` | actual parameters used to launch configured Agent | `runtimeAssignment`/`profile` are less direct |
| `applicationBinding` | root association to application and binding | per-Agent execution-context copies are redundant |

### Minimal Team-bound Agent context

Every provider and intrinsic Agent tool receives the same derived in-memory identity bundle:

```ts
type TeamMemberExecutionIdentity = Readonly<{
  rootTeamRunId: string;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

type MemberTeamContext = Readonly<{
  identity: TeamMemberExecutionIdentity;
  authoredTeamInstruction: string | null;
  collaboration: MemberCollaborationContext;
}>;

type MemberCollaborationContext = Readonly<{
  outgoingHandoffs: readonly CollaborationHandoff[];
  deliverInterAgentMessage: MemberLogicalMessageDeliveryHandler | null;
}>;
```

This boundary bundle is derived from the execution tree; it is not another persisted identity. `MemberCollaborationContext` does not repeat an `addressing` object because its enclosing context already owns identity. The root facade/index derives the exact enclosing TeamRun, configured coordinator, definition/name/backend/runtime facts, bound task, and concrete ancestry when an operation needs them. Remove those copied fields, `executionAddress`, and `taskId` from `MemberTeamContext` and native task-tool contexts. The task tool router resolves only the root facade from `rootTeamRunId`; root authorization resolves everything else from `agentRunId` and verifies `memberAddress`.

`authoredTeamInstruction` is resolved from the enclosing configured Team's `teamDefinitionId`, matching the base restore behavior; it is not a persisted execution-tree copy. Likewise, the supported `MIXED` Team backend and workspace ID are derived runtime facts. For application-bound TeamRuns, the root `applicationBinding` plus exact Agent node identity constructs the V6 application producer context, replacing the current per-Agent composite producer copy.

## Existing Capability / Subsystem Reuse Check

| Existing Capability | Reuse | Extension | Replacement |
| --- | --- | --- | --- |
| `AgentTeamAddress` and tree traversal | direct | strict non-root facade | relative expression removed |
| `TeamRunConfig` configured planning | semantic/source reuse | map into persistent tree nodes | v3 persistence type replaced |
| AgentRun/TeamRun allocators | direct | none | none |
| mixed Team recursive factories/handles | direct | one local manager per TeamRun, exact `TeamRun` boundary, root resolver registration | composite/parent-boundary/root-directory interfaces removed |
| task state machine/notifications/settlement | preserve outcomes | root ownership/run-ID references plus one private command FIFO spanning current-state derivation through result | local routing wrappers and precomputed snapshot commits removed |
| exact global message router | direct | same-root root-boundary re-entry | none |
| generic atomic JSON writer | inspect only | unrelated owners keep it | the three Team stores use new strict `TeamRunFileCommitWriter`; best-effort sync is not reused |
| frontend execution store concepts | preserve user behavior | one tree/reducer/selectors | serialized map/materializers removed |
| app migration runner/bootstrap | reuse | new retryable migration record plus validated-target-root catalog admission | completed IDs untouched; exact-success global listen gate rejected |

## Subsystem / Capability-Area Allocation

| Area | Owns | Main Spines | Change |
| --- | --- | --- | --- |
| `agent-collaboration/domain` | canonical addresses/handoffs/errors | DS-001, DS-015, DS-017 | simplify |
| `agent-team-execution/domain` | current tree/task/message/event identity models | DS-002–DS-011 | refactor |
| `agent-team-execution/services` | root public boundary, index/scope/TeamRun resolution/event publication/projection | DS-001–DS-011, DS-016, DS-020 | create/refactor |
| `agent-team-execution/backends/mixed` | one TeamRun's direct execution mechanics | DS-002–DS-007, DS-016, DS-020 | narrow/simplify |
| `agent-team-execution/task-delegation` | root task lifecycle | DS-005–DS-009, DS-016–DS-017 | consolidate |
| `run-history/store/services` | execution tree/current package persistence/history | DS-008–DS-010 | replace metadata owner |
| `services/team-communication` | exact message persistence/projection | DS-002–DS-003, DS-008 | tighten |
| `token-usage` | exact run usage facts/transaction | DS-013 | contract/store cut |
| `external-channel` | exact Team entry AgentRun | DS-028 | model/store cut |
| application packages/server/web | V6 exact execution contract | DS-014 | atomic forward cut |
| shared Team stream contracts | exact snapshot/delta/event DTOs | DS-010–DS-011 | replace composite DTOs |
| `autobyteus-web/services/teamExecution` | one concrete execution aggregate/selectors | DS-010–DS-011 | simplify |
| `app-data-migrations` | isolated per-root predecessor conversion/catalog admission | DS-012–DS-013, DS-017 | add new migration |

## Draft File Responsibility Mapping

| Proposed File | Capability | Responsibility | Reason | Depends On |
| --- | --- | --- | --- | --- |
| `domain/team-run-execution-tree.ts` | Team execution | exact current immutable tree types/constructors | one domain subject | address/run IDs |
| `domain/root-team-run.ts` | Team execution | public rooted facade plus root-scoped persistence fail-stop/re-entry lifecycle over explicit subject owners | one authoritative entrypoint without state blob | tree/index/resolver/task/message/persistence/event interfaces |
| `domain/team-run.ts` and backend interfaces | Team execution | one concrete TeamRun local boundary | prevents root callers from reaching manager | exact direct commands/private backend |
| `services/team-execution-index.ts` | Team execution | exact run/address/parent/ancestor indexes | one difficult derived invariant | execution tree |
| `services/team-run-resolver.ts` | Team execution | exact active TeamRun lookup and configured-chain materialization | replaces task-specific live directories | index/TeamRun/factory |
| `services/team-run-event-publisher.ts` | Team execution | subscriber barrier and non-persisted `changeSequence` | one root live-order owner | strict root events |
| `services/team-execution-scope-resolver.ts` | Team execution | nearest containing scope plus configured target-parent TeamRun selection | operation-neutral policy | index/recipient |
| `services/team-execution-view-projector.ts` | Team execution | initial/delta read model | one projection owner | root snapshot/contracts |
| `run-history/store/team-run-execution-tree-*` | persistence | strict schema/path/store | natural history storage | atomic writer/domain |
| `run-history/services/team-run-state-package-loader.ts` | persistence | load/cross-validate/repair root package | one startup boundary | three stores/root subject constructors |
| existing `task-delegation-service.ts` | task | root lifecycle orchestration | correct domain, corrected scope | index/TeamRun resolver/persistence/event publisher |
| `task-delegation-command-queue.ts` | task | one private FIFO for every root task lifecycle command | closes stale task-snapshot derivation/commit gap | immutable task command/typed result |
| existing task records files | task persistence | compact V1 schema/store/transitions | existing subject | task service/persistence coordinator |
| `services/team-run-persistence-coordinator.ts` | persistence | root lock plus typed task/message commit results and root fail-stop trigger | physical coordination only | strict stores/writer/root lifecycle latch |
| `run-history/store/team-run-file-commit-writer.ts` | persistence | strict Team JSON temp/file-sync/rename/directory-sync phase truth | one physical concern reused by exactly three stores | fs primitives/current validators |
| existing communication projection files | message persistence | compact V1 exact endpoints | existing subject | communication service/persistence coordinator |
| `app-data-migrations/migrations/team-run-execution-tree-v1/*` | migration | predecessor evidence/plan/stage/promote | isolate history | old snapshots/new validators |
| frontend `teamExecutionViewState.ts` | web | one change-sequenced reducer/index/selectors | one browser owner | shared DTOs |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | web | semantic execution-tree surface; exact Agent focus and Team expansion dispatch | existing product navigation owner | `TeamExecutionViewState` navigation selectors |

## Reusable Owned Structures Check

| Structure | Reusable? | Owner | Decision |
| --- | --- | --- | --- |
| canonical `AgentTeamAddress` | Yes | collaboration domain | retain |
| `ResolvedTeamRecipient` logical placement | Yes after removing config internals | recipient service | tighten/retain |
| AgentRun/TeamRun IDs | Yes | run identity domains | retain as exact identities |
| configured `TeamRunConfig` plan | Yes in memory/construction | Team definition planner | map to persistent branch; no duplicate runtime identity |
| task transition rules | Yes | root task service | retain outcomes, compact records |
| phase-aware Team JSON writer result | Yes for exactly three Team authorities | run-history persistence | add one strict writer; do not generalize to unrelated owners |
| Team stream correlated event types | Yes conceptually | shared contracts | replace only composite binding fields |

## Shared Structure / Data Model Tightness Check

| Structure | One Subject | Minimal | Risk | Decision |
| --- | --- | --- | --- | --- |
| execution tree file | Yes | Yes | Medium | exact schema in supplement; no manifest/kind/parent/composite fields |
| persistent Agent launch configuration | Yes | Yes | Low | keep all supported launch facts including per-Agent workspace root |
| task execution nodes | Yes | Yes | Low | inherit config; exact run bindings/timestamps only |
| task record | Yes | Yes | Low | retain recipient intent and materialized status; exact task ref |
| message record | Yes | Yes | Low | exact AgentRun endpoints and content facts only |
| root application binding | Yes | Yes | Low | app/binding once; producer run derives per Agent |
| authored Team/Agent instructions | Yes, in definition subsystem | Yes | Low | resolve by definition ID; do not snapshot into execution tree |
| execution view DTO | Yes | Yes | Medium | exact domain arrays plus non-persisted `changeSequence`; no summaries/recent-activity invention |
| `TeamExecutionAddress` | No after tree | No | High | remove |

The exact field-by-field keep/remove rationale is authoritative in `team-run-persistence-architecture-contract.md` §12.

## Final File Responsibility Mapping

| Path / Group | Final Responsibility | Required Change | Must Not Retain |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | exact current execution tree domain | add strict immutable node types/constructors | composite/parent/kind fields |
| `.../domain/root-team-run.ts` | public rooted TeamRun boundary | add operation/snapshot/subscription facade and synchronous persistence fail-stop latch/teardown scheduling over explicit subject owners | manager/index/store/service exposure, mutable root-state blob, public mapping of indeterminate writes, other-root shutdown |
| `.../domain/team-run.ts`, `backends/team-run-backend.ts` | one concrete Team execution boundary | shrink to direct delivery/command/sealed task preparation/settlement/child materialization/recursive status/lifecycle | root address/task/message policy; manager leaks |
| `.../backends/team-manager.ts` | obsolete broad mixed root/local interface | remove after callers move to `RootTeamRun` and local `TeamRunBackend` | no compatibility alias |
| `.../backends/mixed/mixed-team-manager.ts` and registries | one TeamRun's direct handle mechanics | narrow manager; rename configured registry; inject event sink | root resolver/directories/listeners/barrier/persistence/parent boundary |
| `.../domain/member-team-context.ts`, `member-collaboration-context.ts`, provider context builders | minimal Team-bound Agent boundary | replace copied Team/config/task/composite fields with `TeamMemberExecutionIdentity` plus instruction/handlers | owner TeamRun ID, task ID, execution address, route/path/config copies |
| `.../services/team-execution-index.ts` | exact lookup/ancestry | add unique indexes/queries | serialized composite keys |
| `.../services/team-run-resolver.ts` | exact live TeamRun access | add private run-ID map and exact configured-chain materialization | logical search, stored ancestry/task facts, manager exposure |
| `.../services/team-run-event-publisher.ts` | root event order | add sealed activation enqueue, subscriber isolation, snapshot queue barrier, and non-persisted `changeSequence` | task revision, persistence, local policy |
| `.../services/team-recipient-resolver.ts` | logical lookup | absolute non-root result only | relative origin/config objects |
| `.../services/team-execution-scope-resolver.ts` | deterministic scope/host | add nearest-containing-ancestor plus configured-descendant selection | chain fabrication, raw prefix, sibling task search |
| `.../services/team-execution-view-projector.ts` | read model | add tree/task/message/status snapshot and delta mapper using canonical status DTO | summaries, persistence, status defaults |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts`, `agent-run-input-contract.ts`, `../domain/agent-run.ts` | sole AgentRun FIFO/input owner | add opaque reserved state and reserve/commit/cancel/release capability; refactor `postUserMessage` over it; add reversible reservation-safe termination preparation that never deletes a submitted reservation | Team-owned queue, provider policy change, unresolved-reservation deletion, replay/retry |
| `.../task-delegation/task-delegation-service.ts` | root task owner | consolidate lifecycle; admit every task command to one private FIFO; derive typed mutations from latest state; compose sealed activation commit and tree-only prepared settlement; keep finalization-indeterminate outside ordinary abort/result mapping; synchronously flip activation work release after durability | per-Team routing, caller-precomputed snapshots, destructive pre-write settlement, deferred work-gate release, fallible post-commit truth changes |
| `.../task-delegation/task-delegation-command-queue.ts` | task mutation order | exact FIFO admission/drain/close for activate/submit/review/interrupt/settle | policy outside service, persistence, priority/retry, second queue |
| task activation/factory/directory files and mixed task Agent/Team registries | concrete task mechanics | switch factories to sealed local preparation, hidden `TeamRunResolver` registration reservations, and no-throw committed work latch; add reversible local settlement preparation plus committed teardown capability; remove task-specific directories | execution addresses, parent boundary, destructive `settle()` before tree durability, fallible post-commit registration/release |
| task tool context/run-router files | thin root routing | accept minimum Team member identity and call root facade | current/parent TeamRun inference, per-Team service lookup, task ID in Agent context |
| task records domain/schema/store | compact V1 tasks | replace exact shape and use strict Team writer only through coordinator | participant composites/reference metadata/kinds/direct writes |
| `run-history/store/team-run-execution-tree-{types,schema,store}.ts` | current tree persistence | replace metadata v3 runtime owner; use strict Team writer only through coordinator | old filename/reader/direct generic writer |
| `run-history/store/team-run-file-commit-writer.ts` | physical Team JSON commit | add strict normalize/validate/temp/file-sync/rename/directory-sync and exact three-result union | best-effort required sync, business/public result mapping, retry/rollback |
| `run-history/services/team-run-state-package-loader.ts` | load/repair | add three-file cross-validation and restart repair | compatibility parsing |
| `services/team-communication/team-communication-service.ts` | compact exact message policy/current state | own immutable current snapshot; synchronously reserve then seal/submit one append plan; under-lock dedup/current-reference derivation; no-throw post-durable state/event/reservation commit | precomputed next-snapshot writes, execution addresses, outbox, second queue, retry |
| `services/team-communication/team-communication-message-append-plan.ts` | one pending message logical commit | private one-shot capability over immutable row, exact reservation, preallocated event slot, and service-owned state cell; expose only prepare/cancel/no-throw commit lifecycle | persisted revision, reusable/stale plan, generic callback, input queue |
| `services/team-communication/team-communication-{types,projection-store}.ts` | compact V1 message shape/physical file | strict exact endpoint DTO and full-snapshot replacement through strict writer invoked only by coordinator | business derivation, direct service write, execution addresses |
| `agent-team-execution/services/team-run-persistence-coordinator.ts` | one root mutation/physical-commit boundary | add typed activation/record-transition and separate tree-only settlement plans; replace `commitReservedMessage(nextMessages)` with sealed append; map physical indeterminacy to `RootTeamRun.enterPersistenceFailStop()` under lock | caller-derived complete snapshots, generic mutate API, provider/local teardown under lock, public `AgentOperationResult`, retry/replay |
| Team event/status/wire mapper files, `team-runtime-snapshot-service.ts`, `agent-team-stream-handler.ts`, and `autobyteus-team-stream-contracts/src/*` | exact correlated transport | root snapshot includes recursively collected canonical status and live/history share one mapper/DTO | optional aliases, browser status reconstruction, second status model |
| GraphQL run-history/team communication/task types | exact API projection | V1 models and execution snapshot/deltas | composite address inputs/outputs |
| `token-usage/domain/execution-address.ts`, ledger models/store/repository | exact usage run identity | remove composite domain/column use; transactional migration API | fallback normalization |
| Agent memory location, token-context enrichment, run-file-change/event-monitor paths | exact execution lookup | accept AgentRun/TeamRun IDs and query root tree/index for physical placement | composite execution input/current-schema chains |
| `external-channel/domain/models.ts` and file providers/runtime | exact entry run | `entryAgentRunId` with `teamRunId` | `entryExecutionAddress` |
| application SDK contracts/backend/frontend/devkit/server adapters/dist | V6 exact Team identity | atomically bump target constants/types/manifests/loaders | V5 adapter/data migration |
| `autobyteus-web/services/teamExecution/*`, `types/agent/AgentTeamContext.ts`, stores/handlers | one run-ID execution aggregate | replace serialized map/materializers with tree/reducer/selectors | raw key parsing/dual fields |
| migration folder/registry/server runtime | isolated transition and target-root admission | new ID, per-root evidence/staging, token transaction, diagnostics, valid V1 catalog after attempt | changed completed IDs, predecessor runtime reader, exact-success global listen gate |

## Applied Patterns (If Any)

- **Thin authoritative facade:** `RootTeamRun` exposes one rooted boundary while explicit subject owners retain their own state and policy.
- **Recursive local manager:** every concrete `TeamRun` privately owns one `MixedTeamManager` for direct handles/lifecycle.
- **Index:** `TeamExecutionIndex` derives exact lookup/ancestry from the tree.
- **Resolver:** `TeamRunResolver` owns exact live TeamRun access and configured-chain materialization.
- **State machine:** root task lifecycle validates status/update transitions.
- **Owned command FIFO:** `TaskDelegationService` serializes every task mutation from latest-state read through result; it is not another persisted queue.
- **Repository/store:** three strict stores own physical persistence, not business decisions.
- **Phase-aware writer:** one strict Team writer reports physical commit truth to the coordinator without mapping public results.
- **Projector:** one backend projection supplies initial/live exact view.
- **Publisher:** `TeamRunEventPublisher` owns subscriber admission and monotonic `changeSequence`.
- **Reducer:** one frontend aggregate applies correlated change-sequenced events.
- **Presentation projection:** exact run-ID state plus task records derive user-facing rows; description labels and expansion state do not become persisted domain fields.
- **Adapter:** providers/application/transport translate mechanics only.
- **Migration boundary:** historical knowledge is isolated before current runtime.

## Target Subsystem / Folder / File Mapping

| Target Path | Type | Subject | Key Responsibility | Why Here | Forbidden |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | File | execution tree | current immutable domain types/validators | main Team runtime domain | storage/provider/history code |
| `.../domain/root-team-run.ts` | File | rooted Team execution | public operations/snapshots/subscriptions plus root-scoped persistence fail-stop/re-entry policy | authoritative public boundary | exposed internals/direct fs/provider work/public indeterminate result |
| `.../domain/team-run.ts` | File | one Team execution | exact local operations over private backend | local authoritative boundary | root policy/manager exposure |
| `.../services/team-execution-index.ts` | File | derived index | unique run/address/parent/ancestor queries | operation-neutral service | task policy |
| `.../services/team-run-resolver.ts` | File | live TeamRun access | exact lookup/registration/configured-chain materialization | root off-spine execution access | logical search/stored ancestry/task policy |
| `.../services/team-run-event-publisher.ts` | File | root live event order | connection barrier/subscription/`changeSequence` | event capability owner | persisted state/task revision |
| `.../domain/team-member-execution-identity.ts` | File | Team-bound caller identity | exact root/address/AgentRun boundary bundle | shared Team domain | config/task/parent copies |
| `.../domain/member-team-context.ts` | File | provider/tool context | identity + authored instruction + collaboration handlers | Team Agent boundary | composite/Team metadata/task binding |
| `.../services/team-execution-scope-resolver.ts` | File | scope/host policy | nearest containing ancestry plus configured-member descent | shared execution service | activation, raw prefix, task-execution search |
| `.../services/team-execution-view-projector.ts` | File | view projection | snapshot/event mapping | domain projection | frontend state |
| `.../task-delegation/` | Folder | task lifecycle | root task state machine, one private command FIFO, and focused activation/transition mechanics | existing capability | provider adapters, second task queue |
| `.../task-delegation/task-delegation-command-queue.ts` | File | task command order | close/admit/drain FIFO for all lifecycle commands | sole task lifecycle owner | persistence, policy duplication, priority/retry |
| `.../services/team-run-persistence-coordinator.ts` | File | physical coordination | root lock, typed task/message commits, root fail-stop trigger | root persistence boundary | public operation result, caller snapshots, retry |
| `.../run-history/store/team-run-file-commit-writer.ts` | File | Team JSON physical commit | strict temp/file-sync/rename/directory-sync and phase result | shared by exactly three current Team stores | best-effort required sync, business policy |
| `.../run-history/store/team-run-execution-tree-*` | Files | persistence | path/schema/store | history storage | migration parsing |
| `.../run-history/services/team-run-state-package-loader.ts` | File | startup package | load/cross-validate/repair | history/runtime join boundary | legacy aliases |
| `.../services/team-communication/` | Folder | messages | exact V1 current state, one-shot append plan, and store/projection | existing capability | task transitions, direct precomputed snapshot writes |
| `.../app-data-migrations/migrations/team-run-execution-tree-v1/` | Folder | migration | per-root predecessor mapping/staging/promotion/diagnostics and valid-target catalog input | historical isolation | current runtime imports |
| `autobyteus-team-stream-contracts/src/` | Package | wire DTOs | exact correlated snapshot/deltas | shared server/web authority | server domain handles |
| `autobyteus-web/services/teamExecution/` | Folder | browser aggregate | reducer/index/selectors | existing coherent frontend area | persistence/identity parsing |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | File | execution navigation | task-description labels, semantic tree state, Agent focus, Team expansion | existing Team workspace surface | raw identity parsing, parent inference, Team-as-coordinator behavior |
| application SDK packages | Packages | public app contract | V6 exact run identity | public package boundary | V5 compatibility |

## Folder Boundary Check

| Folder | Classification | Cohesive? | Risk | Resolution |
| --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Main-Line Domain | Yes | Low | values only |
| `agent-team-execution/services` | Main-Line Control | Yes | Medium | index/resolver/event/projector have distinct subjects/files behind `RootTeamRun` |
| `agent-team-execution/backends/mixed` | Local Execution Mechanics | Yes | Medium | one manager per TeamRun; remove every root-wide concern |
| `agent-team-execution/task-delegation` | Capability | Yes | Medium | root owner plus variant subowners; no transport |
| `run-history/store/services` | Persistence/Projection | Yes | Low | current stores/loaders only |
| `services/team-communication` | Persistence/Projection | Yes | Low | one message subject |
| `app-data-migrations/.../team-run-execution-tree-v1` | Migration | Yes | Low | all historical knowledge isolated |
| `autobyteus-web/services/teamExecution` | Frontend Domain-Control | Yes | Low | one aggregate/selectors |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Exact identity

```text
configured placement: /qa/automation/tester
persistent exact run: agent-run-automation-tester
first task exact run: nested-task-agent-run-001
second task exact run: nested-task-agent-run-002
```

All three execution nodes may share `address`; only AgentRun IDs select exact executions.

### Cross-branch task

```text
delegator AgentRun: task-researcher-run-A (contained by task Team /research)
recipient address:   /qa/tester
target parent Team:  /qa
nearest containing scope: structural root /
configured descent: root.members -> persistent /qa
host TeamRun:         persistent team-run-qa
fresh AgentRun:       task-qa-tester-run-B
```

The task record connects `task-researcher-run-A` to `task-qa-tester-run-B`; the execution tree keeps `task-qa-tester-run-B` under `team-run-qa`.

### Team delegation

```json
{
  "taskId": "task-010",
  "delegatorAgentRunId": "agent-run-product-manager",
  "recipientAddress": "/qa",
  "taskExecution": { "teamRunId": "task-team-run-qa-001" },
  "description": "Own the full release validation.",
  "referenceFiles": [],
  "status": "active",
  "updates": [],
  "createdAt": "2026-08-14T10:20:00.000Z"
}
```

The returned `target_agent_run_id` is derived from `/qa`'s configured coordinator address and the task Team members. It is not copied into this record.

### Exact three-file examples

The complete exact JSON examples are under `persistence-scenarios/`; do not duplicate or paraphrase their key sets in implementation tests.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Rejected Because | Correct Handling |
| --- | --- | --- |
| accept relative addresses and normalize | gives LLM two choices and retains dual grammar | absolute-only failure |
| retain adjacency error as deprecated | artificial behavior remains reachable | remove code/result/copy |
| keep composite execution address beside run IDs | two exact identity systems | remove after migration |
| add parentTeamRunId/taskTeamRunIds to nodes | tree already owns parentage | derive in index |
| add `kind` to persisted nodes/updates | exact keys structurally discriminate variants | strict key-set parsers |
| keep old task/message readers | normal runtime compatibility leak | isolated migration only |
| application V5 adapter/quarantine | no supported predecessor product path | direct V6 cut/discard |
| browser supports old and new deltas | mixed transport state | atomic shared contract cut |
| guess missing task-Team AgentRun by address | repeated executions are ambiguous | evidence agreement or migration failure |
| release work before both files are durable | crash creates executable unrecorded task | prepare/commit/release order |

## Derived Layering (If Useful)

```text
Agent-facing tools / GraphQL / WebSocket / application adapters
                         |
                    RootTeamRun facade
                         |
   +-----------+-------------+----------------+----------------+
   |           |             |                |                |
execution   task service  communication   TeamRunResolver  event publisher
tree/index                               -> exact TeamRun   -> changeSequence
   |              \            /                |
   +----------- persistence coordinator         |
                  |                             |
        tree/task/message stores          TeamRun local boundary
                                                |
                                      private MixedTeamManager
                                      (direct handles only)

consistent subject snapshot/current sequence -> TeamExecutionViewProjector
                                             -> shared strict DTOs
                                             -> frontend TeamExecutionViewState
```

Migration sits before this stack and may write target stores only through target validators/store-owned transactional boundaries.

## Change / Refactor Sequence

1. **Freeze contracts/tests first:** add exact target domain/DTO schemas, normative fixture validators, source allowlist scans, and application V6 constants/types; do not expose production paths yet.
2. **Introduce root/local boundaries and intrinsic tree/index:** add `RootTeamRun`, execution tree, index, scope resolver, `TeamRunResolver`, event publisher, and tree store behind current creation/restore seams; change `AgentTeamRunManager` to register roots while `TeamRunResolver` registers private child TeamRuns.
3. **Narrow local managers:** shrink `TeamRun`/backend to exact local operations; rename `MixedPersistentMemberRegistry`; remove parent-boundary, task-directory, root-resolver, listener/barrier, and root-disposal concerns from `MixedTeamManager`.
4. **Cut absolute universal operations:** remove relative/adjacency paths; consolidate root task service; add its one private command FIFO for activation/submit/review/interruption/settlement; implement sealed task activation/hidden TeamRun registration reservations/no-throw synchronous work-gate commit; add AgentRun reservation-safe termination preparation and local registry `PreparedTaskSettlement`/`CommittedTaskSettlement`; add the AgentRun-owned message reservation plus sealed message append plan; switch activation/notifications/settlement and exact communication to index -> `TeamRunResolver` -> exact `TeamRun` ownership.
5. **Cut current JSON writers/readers:** replace metadata writer with execution tree; compact task/message records; implement the root persistence coordinator, strict phase-aware Team writer, root fail-stop, and restart/reopen repair; make each task command derive latest cumulative state at queue head; make settlement terminal-record-first and tree-only with post-lock local cleanup; make message current-state read/derive/write/memory/event/reservation release one root-locked operation; current execution code now target-only.
6. **Cut correlated API/stream/frontend:** make RootTeamRun snapshot barrier collect canonical status through `TeamRun`; replace shared DTOs and Team Agent/status/task/message bindings; use `changeSequence`; update GraphQL/WS mappers; replace browser composite map/materializers with one reducer/selectors.
7. **Cut token/external consumers:** update current schemas/repositories/services to exact run IDs and add store-owned migration transaction interface.
8. **Cut application V6 atomically:** constants/types, backend/frontend SDK source, devkit writers/validators/templates, server manifest/parser/loader/orchestration, web consumers, tests, generated/vendored `dist`, and lock/importable outputs in one compiling change; remove V5 target artifacts/data.
9. **Add isolated migration and target-root admission:** implement new per-root evidence indexes/planners/staging/backups/promotion/token transaction/external conversion/diagnostics; register after existing IDs; after each attempt catalog only complete V1 roots and allow target-only server startup even when the catalog is partial or empty.
10. **Delete obsolete source:** remove composite address modules/DTOs/parsers, old metadata files, broad `TeamManager`, parent boundary/task directories, wrappers, aliases, raw-key consumers, and temporary construction seams; enforce allowlist scan.
11. **Documentation and focused proof:** update long-lived docs and run target schema, manager-boundary, migration, server/web/package typechecks/builds and focused tests before implementation handoff.

No phase may merge a normal runtime that reads/writes both schemas. Implementation may use local compile staging, but the handed-off source state is one current model.

## Key Tradeoffs

- The coordinated cut is larger than keeping the composite identity, but it permanently removes duplicated exact identity and parent-chain logic.
- Preserving one manager per TeamRun avoids a root god-object; adding `RootTeamRun` and `TeamRunResolver` is a focused ownership correction rather than a new execution engine.
- Three files require explicit logical commit boundaries rather than one physical atomic file. One service-owned task FIFO, sealed/no-throw task activation, one root-locked message append, and one phase-aware writer preserve truthful task/message facts without a journal, persisted revision, outbox, replay, second input/task queue, or fourth authority; strict root reopen repair governs process loss and finalization uncertainty.
- `recipientAddress` and materialized task `status` remain although derivable because they are independent task intent/current-state facts; parallel execution ancestry/config fields are removed.
- Settled task executions remain on disk for referential integrity/history but are omitted from live projection; this favors correctness over immediate per-node compaction.
- Application V6 is breaking by design; no compatibility cost is justified for an unused framework.

## Risks

- The no-throw task commit depends on exhaustive precommit sealing/reservation validation, including a hidden preallocated event-batch slot; the sole task FIFO must cover latest-state read through result for every command. Failure injection and source review must reject any caller-precomputed task snapshot, bypass queue, provider I/O, listener callback, allocation, promise creation, or fallible lookup after the task-file commit point.
- Holding an AgentRun FIFO reservation across root-lock message derivation/fsync deliberately applies backpressure to later inputs; tests must prove same-receiver plan/FIFO order, no overtaking, no lost rows across same/different receivers, guaranteed cancel on reference/conflict/physical failure, and teardown without reservation/lock deadlock.
- Reversible settlement preparation deliberately pauses new input before tree durability. Tests must prove it waits only previously admitted reservations/dispatch, releases no handle early, cancels synchronously on `not_renamed`, and never waits on provider or local teardown while holding the root lock.
- A provider/local cleanup rejection after committed `settledAt` cannot be rolled back truthfully. The affected root must close under lifecycle fail-stop while strict reload honors settled tree truth; implementation must not convert this to task persistence failure or recreate the exact run.
- Initial status capture must remain behind the root event barrier and use `TeamRun.getLeafAgentStatusSnapshots()`; any direct manager query or browser default would reopen split authority.
- Migration correlation for historical task-Team AgentRuns is the highest-risk transition area; ambiguous evidence must exclude and preserve that predecessor root rather than guess, while target-only startup continues with valid roots.
- Directory finalization failure after successful rename is materially different from a known pre-rename failure. The strict writer, coordinator, and root lifecycle tests must prove that it yields no ordinary task/message result and fail-stops only the affected root until strict reload.
- Cross-file failure injection must prove work is never released from an execution-only orphan.
- Event/status/application mappers must all switch to exact AgentRun ID; one residual composite producer would reopen dual identity.
- Frontend consumers are numerous; the source allowlist and one reducer/selector boundary are essential.
- The manager boundary cut is cross-cutting; source scans must prove root services never import `MixedTeamManager`/registries and managers no longer import root task directories or parent-boundary routing.
- Large token DB conversion must be transactionally and operationally safe on disposable copies before any live environment run.
- Generated application SDK `dist` artifacts can drift from source if package consistency checks are omitted.

## Guidance For Implementation

- Treat `team-run-persistence-architecture-contract.md` and `persistence-scenarios/` as exact, not illustrative.
- Preserve the base's rooted topology, AgentRun FIFO/admission policy, provider lifecycle/segment handling, Team stream correlation, and coordinator requirement. Only add the scoped reserved/committed/released state inside that same AgentRun owner.
- Do not add missing fields “for convenience.” Use `TeamExecutionIndex` queries.
- Do not let stores or mappers reconstruct business state independently.
- Do not derive a complete communication snapshot before `commitReservedMessageAppend(plan)` acquires the root lock; the one-shot plan is the only message mutation input and owns no retry path.
- Do not derive a complete task/tree replacement before a command reaches the `TaskDelegationService` queue head. Activation, submit, review, interruption, and settlement all enter the same FIFO and yield only typed queue-head plans.
- Commit `accepted`/`interrupted` task records before settlement. Replace destructive `settleDirectTask()` with exact local reversible preparation; write only the tree; detach synchronously only on `committed`; call provider/handle cleanup only after the root lock unwinds.
- On ordinary AgentRun quiescence/termination, await every already-submitted Team-message reservation and released/active dispatch. Never delete a reservation that an existing root append plan must still commit or cancel.
- Keep activation `renamed_finalization_indeterminate` out of every ordinary catch/abort/not-started path, and invoke the no-throw `releaseWork()` latch synchronously inside the committed activation closure rather than deferring the latch itself.
- Treat `not_renamed`, `renamed_finalization_indeterminate`, and `committed` as exhaustive internal physical outcomes. Only task/communication services map clean pre-rename failures; the persistence coordinator never returns `AgentOperationResult`, and post-rename uncertainty enters root fail-stop.
- Use exact exhaustive TypeScript variants and strict runtime validators with unknown-key rejection.
- Use `RootTeamRun` as the only public rooted entry, `TeamRun` as the only local execution entry, and `TeamRunPersistenceCoordinator` as the only physical current-state write boundary; file stores remain private.
- Treat `team-run-management-contract.md` as exact for manager creation, access, registration, event ordering, teardown, and removal.
- Prove failure order with injected failures, not only happy-path unit tests.
- Run migration and live tests only against disposable copies/DB targets; preserve inherited operational protections.
- Keep every legacy field/parser/correlator inside the migration folder. A failed migration root is omitted from the target catalog, never adapted or represented by a compatibility object in normal runtime.
- Update `implementation-handoff.md` only in the implementation stage; solution design does not own that artifact.
