# Design Spec — A Task Agent Is A Normal Run (SR-005, revised SR-007, SR-008, SR-009)

## Solution And Approval Basis

- Requirements: [`requirements-doc.md`](requirements-doc.md) `Approved`, SR-005/SR-006 (the user, 2026-10-17); SR-007 additions REQ-017, REQ-018 (Solution Designer within the user's direction, user informed).
- Review: architecture review ARCH-REV-001 (`design-review-report.md`) — Fail with ARCH-F-001..005; all five addressed in this revision (see Review Response).
- Behavior-defining supplement: [`memory-layout-contract.md`](memory-layout-contract.md) revision 3 —
  the authority for layout, records, operations, migration and broken states. This spec says how.
- Evidence: [`investigation-notes.md`](investigation-notes.md) and contract §12.1 (V-1 … V-19).
- Base: `origin/personal` `66429d6f31` (branch fast-forwarded 2026-10-17; includes the nested task-team cleanup, Task 9942a43c, merge `8a8d322144`: teams hold agents only, skip-and-warn in standalone cross-run scans, DESIGN.md rule 7).
- Authorities: `DESIGN.md`; Collaboration Model (CM-5, CM-7, CM-8, CM-9); Data Migration Guideline
  (as corrected in `8a970f214c`, checklist items 3 and 5); TESTING.md.
- Supersedes the SR-002 design (back-link descriptor `delegated_run.json`, facts kept in the
  coordinating tree, delete removes task agents). Kept from it: the memory placement rule, the
  layout as the only path composer, the rename-based migration and its dispositions.

## Current-State Read

A task agent's memory is nested inside its coordinating run's folder, and all its facts
(definition, launch settings, members, user Settings edits, platform session ids) are part of the
coordinating run's tree. Memory directories are derived from the coordinating run's physical scope
(`AgentMemoryLayout.getRootExecutionDirPath` / `getRootedAgentRunDirPath`, `RootedAgentMemoryLocator`).
One message log per coordinating run holds every message of its whole tree; every message rewrites
and re-validates the whole file. Run metadata (`run_metadata.json`) means "a standalone run the user
started" to about 20 readers; a team tree means "a team run" to the startup readiness check and the
team history catalog. In-memory, every family works with one composed record type per task agent
(`TaskAgentExecution`, `TaskTeamExecution` in `run-history/domain/run-execution-tree-shared-records.ts`),
used by 28 files (V-16). Trees are read and written only through the three tree stores (verified:
writers `standalone-root-package-store.ts` via the persistence coordinator and root manager,
`TeamRunExecutionTreeStore`, the org tree store; readers the same stores and the readiness validator).

## Task Size And Architectural Risk (Mandatory)

- **task_size = Large**: persistence boundary of three run families, memory placement, two reader
  guards, message logs, Memory UI attribution, a startup migration over all three families.
- **architectural_risk = High**: moves and rewrites persisted user data (folders, trees, metadata,
  message logs); changes what makes a folder a run; a defect can hide or duplicate runs.
- Route: independent architecture review.

## Architecture Investigation Evidence

Contract §5 (consumers), §6 (shape inventory: 88 task agents in C1–C6 on the user's data, read-only),
§12.1 (V-1 … V-17). New in this spec: the persistence-boundary check above (trees only through the
three stores), and `TaskAgentExecution.source` semantics ("absent → the source is the configured
placement at its address", `run-execution-tree-shared-records.ts`).

## Intended Change

1. **D-1 Compose at load, split at save.** The three tree stores keep today's in-memory record
   types; on disk a task agent's facts live in its own file and the tree holds only links.
2. **D-2 One placement rule** for every agent's memory directory (task agents at L1).
3. **D-3 Two reader guards** (G1 run metadata, G2 team tree admission) and task-agent readers.
4. **D-4 Per-run message logs** at the communication persistence boundary (email model).
5. **D-5 Memory UI attribution** of task agents through G1's task-agent reader.
6. **D-6 Readiness check**: task agent folders are not root candidates; owners by placement.
7. **D-7 Delete keeps task agents**; confirmation text says so.
8. **D-8 Startup migration** `20261017_task_agent_own_run_v1`.
10. **D-10 Version-free names** (REQ-019, DESIGN.md rule 8): rename current-code files, types,
   functions and constants that carry a version number (message-log families first, since D-4 reworks
   them); no on-disk name or value changes; migrations only update imports.
9. **D-9 Released migrations repointed** (contract §5.4): before any module they import changes,
   the released migrations that still run on old data get migration-owned frozen copies of today's
   behavior; our migration waits for all earlier memory migrations.

## Implementer Clarifications (U-1..U-5, SR-009)

| Item | Decision | Where |
| --- | --- | --- |
| U-1 top-level values of an agent's own `run_metadata.json` | the started launch; the Settings edit only in `taskAgent.userLaunchSelection` (DEC-005 / AR-005); effective launch computed as today (`effectiveCopyAgentLaunch`) | contract §3.1 |
| U-2 `workspaceRootPath` may be null | the task-agent reader / writer allow null; G1's standalone reader unchanged | contract §3.1; interface |
| U-3 task agent team own tree vs a team run's tree | the implementer's deviations accepted: omit `teamDefinitionName`, members with `role: null`, `description: null` and optional launch fields only when recorded; team launch sources in `taskAgent` | contract §3.2 |
| U-4 a copy created from a configured place | **not** a snapshot (that would stop it following the place and change its display): `taskAgent.origin: "configured_place"`; the store writes the run's own facts and the started launch when known; composing yields today's record without `source`; the migration does the same for source-less records (the §6 behavior change is withdrawn) | contract §3.1, §6, S12; AC-024 |
| U-5 nested task agents | a team link never carries `taskExecutions` (CM-7: the user's data has 9 delegations by task-team members, all at the coordinating run, 0 inside task team records); the migration lifts any nested record to a top-level link. If the `hostKind: "team"` append path for task teams is unreachable from current callers, it is dead code in a touched file and removed (Principle 7) with evidence | contract §6 C7 |

## Review Response (ARCH-REV-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| ARCH-F-001 pending released migrations through re-pointed code | Confirmed and widened (collaborators-v1 writes through the current stores, S27). Each affected migration repointed to a frozen copy; the rest shown unaffected with the reason; ordering by registry, no declared prerequisites, per-run input gate (SR-008; superseded the SR-007 "every earlier `memory/` migration" rule); startup test F-PENDING (AC-020) | D-9; contract §5.4; Change Sequence step 1 |
| ARCH-F-002 nested sub-team members | Superseded (SR-008): the cleanup (Task 9942a43c) removed nested task-team members from current code; the shape exists in no install. Placement has no nested level; F-C2N / AC-022 withdrawn; the frozen parser rejects the retired shape (`PRESERVED_UNSUPPORTED_TREE`) | DS-008; Interface; contract L1, S32 |
| ARCH-F-006 (ARCH-REV-002) global prerequisite + L6 can hide every task agent forever | Confirmed (runner `assertPrerequisites`; released deterministic FAILED dispositions). No declared prerequisites; registry order; per-run input gate with `WAITING_FOR_PREDECESSOR` (non-terminal) and `PRESERVED_UNSUPPORTED_TREE` (warning); predecessor retry after the move harmless; F-PENDING-FAILED (AC-020) | Migration Plan; contract §5.4, §8 step 0, §10, S33–S35 |
| ARCH-F-003 log merge on retry | Step 5 merges (union by `messageId`, existing kept, ordered by `createdAt`) for every task agent at L1, including already-current ones; F-RERUN-MSG (AC-021) | Migration Plan; contract §8 |
| ARCH-F-004 change-detection baseline | No baseline state: each save compares with the files on disk inside the write, under the coordinating run's lock (contract L6) | Bounded Local Spines |
| ARCH-F-005 stale lines | Requirements and investigation notes reconciled | requirements-doc, investigation-notes |
| Residual: unreadable tree | Preserved exclusion with a warning, not a permanent FAILED | Migration Plan |
| Residual: Org-coordinated task agents in imports | One line in `memory_sync.md`; contract §4 | Removal / docs |
| New (found verifying): package validators require every message endpoint in the index; stores rewrite whole logs | L6: only available task agents are loaded; views show messages whose endpoints are loaded; message saves append the new messages to their logs, never rewrite from the loaded list (REQ-018, AC-021) | DS-003, DS-005, Bounded Local Spines |

## Change Scope (Mandatory)

In: the files of the Final File Responsibility Mapping, their tests, the docs listed under Removal,
the migration and its faithful fixtures. Out: tool contracts, GraphQL / REST / WebSocket shapes,
runtime coordination (hosting, routing, idle / wake, Task closure), the message log file format
(follow-up Task), lazy loading of a hub's task agents (follow-up), a Memory page view of detached
task agents (follow-up), the slow-opening Task e6985045. Problems found outside this scope go to
the Project Task Manager as follow-ups.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Production path today | After |
| --- | --- | --- |
| Delegate (BEH-001/002) | adapter plans → registry / TeamRun handles (memoryDir from physical scope) → one tree write (full record) | handles' memoryDir from placement (D-2) → tree store split write: the task agent's own file first, then the links tree (D-1) |
| Restore / wake (BEH-003/004) | tree store read → index → adapter restore from record + memory at physical-scope dir | tree store composed read (D-1) → same index / adapter code → memory at placement dir (D-2) |
| Views (BEH-005) | projections over the in-memory tree | unchanged code over the composed tree |
| Settings model edit | launch-selection mutators edit the in-memory record → tree write | unchanged mutators → split write writes only the changed task agent's own file |
| Memory UI (BEH-006) | explorer: metadata or history row, else "Unattributed" | G1 task-agent reader → definition (D-5) |
| Readiness (startup) | `agents/*` need metadata, `agent_teams/*` need tree | task agent files recognized and skipped as roots; owners by placement (D-6) |
| Delete (BEH-007) | removes the run's folder (task agents inside it) | removes the run's folder; task agents' folders untouched (D-7) |
| Messages (BEH-009) | engine in-memory list per coordinating run → one log file | same engine list → split write to the owner logs; composed read (D-4) |
| Existing data (BEH-008) | — | migration D-8 |

## Relevant Supplemental Task Artifacts

`memory-layout-contract.md` revision 2 (behavior), its shape inventory (§6) and fixture map (§12.3).

## Task Design Health Assessment (Mandatory)

- Root cause: ownership expressed by nesting (memory) and by embedding (facts) instead of by links.
- Refactor decision: `Refactor Needed Now` (the user's Task). The smallest coherent shape is to move
  ownership at the persistence boundary only (D-1, D-4) and to centralize placement (D-2) and run
  identity (D-3) in their existing owners; the 28 in-memory consumers keep their types.
- No new subsystem; no cache; no journal.

## Terminology

Task agent, task agent team, coordinating run, delegating agent, link, own file (the task agent's
`run_metadata.json` or team tree), detached (coordinating run deleted), placement (where an agent's memory directory is).

## Legacy Removal Policy (Mandatory)

- Removed: memory-dir derivation from physical scope for task agents; `RootedAgentMemoryLocator`
  (replaced by the placement-based locator); task agent folders inside coordinating folders (moved);
  facts embedded in coordinating trees (moved by the migration and never written again).
- Kept as current behavior, not compatibility: none. Old shapes are read only through frozen copies
  inside the migration.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Subjects: task agent folders (memory), coordinating trees (records → links), new own files
  (task agents' `run_metadata.json` / team trees + team message logs), task agents' message logs.
- Decision: `Migration Required` — location change, a new required fact derived from old data (the
  own file), and a record shape change. A tolerant reader cannot absorb it without a forbidden
  dual-path read.
- Invariants: every memory file preserved byte-for-byte (renames); every message preserved (the
  coordinating log is untouched, task agents' logs are built from it); run ids unchanged (Task
  resources, token records, context-file and message-reference URLs stay valid).

### Migration Plan

- Id `20261017_task_agent_own_run_v1`, folder `src/app-data-migrations/migrations/task-agent-own-run-v1/`,
  `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`, **no declared prerequisites**, registered
  last: on every start the runner runs each pending or FAILED predecessor first. Per-run input gate
  (contract §5.4, §8 step 0): a coordinating run whose tree is not in the input shape is left untouched —
  `WAITING_FOR_PREDECESSOR` while any tree-writing predecessor (team tree v1, team tree v2, org flat
  families, collaborators-v1; implementer confirms) is not `SUCCEEDED*`, else `PRESERVED_UNSUPPORTED_TREE`.
  The gate reads the predecessors' ledger status through the migration repository (one read per start).
- Frozen source (accepts a record full or already reduced, because a retry may find both): `app-data-migrations/legacy/released-run-package-shapes/released-trees-before-task-agent-own-run.ts` (shared with the repointed collaborators-v1 and the frozen validator copy, D-9) — a migration-owned copy of today's record
  types and parser (`TaskAgentExecution`, `TaskTeamExecution`, sources, `userLaunchSelection`,
  configured nodes needed to resolve source-less records) for the three tree files. No import of
  current tree stores, indexes or schemas on the source side. Target files are written with current
  writers (own-file writers of D-1/D-3, links tree writer, message log writer).
- Shape inventory → fixtures: contract §6 and §12.3 (every shape mapped; Data Migration Guideline
  item 3).
- Per coordinating run (enumerate `agents/*/collaboration/collaboration_tree.json`,
  `agent_teams/*/team_run_execution_tree.json`, `agent_orgs/*/agent_org_run_execution_tree.json`;
  never `imports/`), per task agent in post-order (nested first):

| Step | Source | Target | Validation | Failure |
| --- | --- | --- | --- | --- |
| Already done? | L1 path | own file naming this coordinating run → skip Own file, Move, Reduce (Logs still runs) | read own file | — |
| Own file | frozen record (+ configured placement for a source-less record; launch provenance; Settings edits) | own file inside the old folder | read back with the task-agent reader | `FAILED_OPERATION` |
| Move | old folder | L1 | `lstat` old missing, new a directory | `FAILED_OPERATION` |
| Reduce tree | full records | per record (L4): a link where the own file now exists, otherwise unchanged; one atomic write | read back with the current store | `FAILED_OPERATION`; retried next start |
| Logs (merge) | coordinating log | for every task agent at L1 of this coordinating run (moved now or earlier): its entries merged into its existing own log — union by `messageId`, existing entries kept, ordered by `createdAt`; written only when something is missing | read back | `FAILED_OPERATION` |

| Disposition | Condition | Status |
| --- | --- | --- |
| `MIGRATED` | own file written, moved, record reduced, log built | MIGRATED |
| `SKIPPED_ALREADY_CURRENT` | at L1 with an own file naming this coordinating run | SKIPPED |
| `SKIPPED_UNMATERIALIZED` | never wrote memory; own file written at L1 | SKIPPED |
| `WAITING_FOR_PREDECESSOR` (per coordinating run) | tree not in input shape and a tree-writing predecessor not yet `SUCCEEDED*` | FAILED (keeps ours non-terminal; retried) |
| `PRESERVED_UNSUPPORTED_TREE` (per coordinating run) | tree not in input shape (unreadable, retired nested shape, older version) and no predecessor can still change it | SKIPPED (warning) |
| `FAILED` | any step failed (logged with the reason) | FAILED |

- A coordinating tree the frozen parser cannot read: see the input gate above (`PRESERVED_UNSUPPORTED_TREE` once no
  predecessor can change it; warning); its task agents stay not available (contract L6). Aggregate with
  exclusions only → `SUCCEEDED_WITH_WARNINGS`.
- Aggregate: any FAILED → `FAILED`; else `SUCCEEDED` (or `SUCCEEDED_WITH_WARNINGS`). The app always starts; the runner retries a
  non-terminal migration on the next start, and every step recognizes what is already done (the
  user, 2026-10-17: only the deterministic shapes are designed and proven; unpredictable stops and
  step failures need only "the app keeps working and the next start continues").
- Restart safety: every step is recognized from the file system; no journal; rename is atomic on
  the memory root's volume; own files, the tree and logs are written atomically.
- Cost: one tree read per coordinating run; per task agent one small own-file write and one rename;
  one links-tree write and its task agents' log writes per coordinating run; no byte copying.
- Checklist (guideline §2): need (above); availability (startup never gated; a failed task agent is
  unavailable alone); source / target (shape inventory, released shapes of all three families);
  dispositions (above); commit / retry (rename + atomic writers, file-system recognition); current-
  only boundary (frozen source module); cost (above); references (run ids unchanged); evidence
  (Guidance → Verification); lessons (rename-not-copy `team-agent-memory-layout`, no startup
  lockout, no post-migration audit).

## Data-Flow Spine Inventory

| Spine | Start | End | Governing owner |
| --- | --- | --- | --- |
| DS-001 Delegate | `delegate_task` | own file + link durable; memory written at L1 | family task adapter + tree store (D-1) |
| DS-002 Restore / wake | idle timer / message by run id | task agent restored from its own folder | `RootTaskExecutionLifecycle` + adapter |
| DS-003 Load a coordinating run | open / restart | composed tree in memory | tree store (D-1) |
| DS-004 Settings edit | Settings change of a stopped task agent | own file updated | launch-selection command + tree store split |
| DS-005 Message | `send_message_to` / handoff / task message | owner logs durable | root communication engine + family message store (D-4) |
| DS-006 Memory UI | `/memory` Agents list | task agents under their definition | `AgentMemoryExplorerService` (D-5) |
| DS-007 Startup | app start | data migrated; readiness rebuilt | migration (D-8) |
| DS-008 Placement | agent construction or index lookup | memory directory | placement module (D-2) |

## Primary Execution Spine(s)

- DS-001: `delegate_task → RootTaskExecutionLifecycle → <Family>TaskExecutionAdapter.planActivation → registry / TeamRun → handles (memoryDir = layout(placement)) → commit → TreeStore.write(composed tree) → [split] write the new task agent's own file → write links tree → release work`
- DS-003: `root load → TreeStore.read(dir) → links tree → for each link: own file (task-agent reader) → compose today's in-memory record → execution index (unchanged)`
- DS-005: `engine.deliver → adapter.commitAppend(messages) → family persistence coordinator (lock) → MessageStore.write(composed list) → [split] receiver's log, then sender's log (only the logs the new message belongs to)`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Planning and handles are unchanged except the memory directory (D-2). At commit the adapter writes the composed tree as today; the store splits it: for a new or changed task agent record it first writes the task agent's own file at L1 (agent: `run_metadata.json` with `taskAgent`; team: team tree with `taskAgent`, plus an empty team message log), then the links tree (a link always points to files that exist). |
| DS-003 | The store reads the tree, reads each task agent's own file through the task-agent reader (G1 / G2's counterpart), and builds today's `TaskAgentExecution` / `TaskTeamExecution`; for a record still in full form whose own file exists, the own file is the authority. A task agent without a readable own file — a link whose own file is missing, or a full record not yet migrated — is not available: it is left out of the composed tree and reported once (contract L6, §10: not shown, not restorable, files kept). The composed message list holds only messages whose endpoints are in the composed tree, so the package validators (`validateTeamRunStatePackage`, `validateAgentOrgStatePackage`) and the readiness check see a consistent package. Everything downstream — indexes, adapters, projections, Settings — sees today's types. Contract L5: composing never throws because of one task agent — a missing or unreadable own file is logged and that task agent left out; the coordinating run loads. |
| DS-004 | The launch-selection code mutates the in-memory record as today; the store's split write compares each loaded task agent with its own file on disk and writes only those that differ; the links tree changes only when a link changes. |
| DS-005 | The engine keeps one in-memory list per coordinating run (unchanged). The message store composes it on load from the coordinating run's log plus each available task agent's log (de-duplicated by `messageId`, filtered to loaded endpoints) and, on write, takes only the new message(s) the coordinator commits (`commitAppend`) and adds each to the receiver's run log and then the sender's run log (DEC-011) — a task agent's own log only when it is available, the coordinating log otherwise — reading the target log and adding the entry if its `messageId` is absent; it never rewrites a log from the loaded list (contract L6), under the family persistence coordinator's existing lock; a failure after the first log is durable is today's post-durability failure (fail-stop). |
| DS-006 | The explorer scans `agents/*` as today; for a folder whose metadata G1 hides, it asks the task-agent reader; a task agent is grouped under its `agentDefinitionId`; one whose coordinating run is gone (detached) is not listed. |
| DS-007 | See Migration Plan. |
| DS-008 | `placementForAgent(chain)`: a task agent → `agents/<agentRunId>/`; a member of a task agent team → `agent_teams/<teamRunId>/<agentRunId>/` (teams are flat); any other agent → its run's own folder as today. Writers compose it at construction, readers from the index's task chain (`listTaskExecutionChainForAgent`); both call the same module. |

## Spine Actors / Main-Line Nodes

Three tree stores (`standalone-root-package-store.ts`, `TeamRunExecutionTreeStore`, org tree store);
three message stores (standalone in `standalone-root-package-store.ts`, `team-communication-v1-store.ts`,
`agent-org-communication-messages-v1.ts`) and their persistence coordinators; the placement module and
`AgentMemoryLayout`; `AgentRunMetadataStore`; the team tree store's admission; family task adapters;
`AgentMemoryExplorerService`; `RootRunPackageCurrentValidator`; the migration.

## Ownership Map

- Tree stores own the on-disk split of task agent records (D-1): links in the tree, facts in own files.
- `AgentRunMetadataStore` owns `run_metadata.json`: standalone reader (G1: hides `taskAgent`), task-agent
  reader / writer.
- `TeamRunExecutionTreeStore` owns team trees: team-run reader (G2: rejects `taskAgent`), task-agent-team
  reader / writer.
- Message stores own the on-disk split of messages into owner logs (D-4).
- The placement module owns where an agent's memory directory is; `AgentMemoryLayout` turns it into a path.
- The migration owns every old shape.

## Thin Entry Facades / Public Wrappers (If Applicable)

The placement-based memory locator (replacing `RootedAgentMemoryLocator`) is a thin seam over the
placement module and the layout, injected where handles and adapters need a memory directory.

## Removal / Decommission Plan (Mandatory)

| Remove | Replaced by | Notes |
| --- | --- | --- |
| `rooted-agent-memory-locator.ts`; memory-dir derivation from physical scope in handles, adapters' restore checks, location services, validator owners | placement module + layout | D-2 |
| Embedded task agent facts in coordinating trees | own files (D-1) | migration reduces; writers never write them |
| One message log holding every message of a tree | owner logs (D-4) | the coordinating log keeps its old entries (REQ-012) |
| Doc text describing nested task agents | updated docs | `standalone_agent_run_root.md`, `agent_memory.md`, `agent_team_execution.md`, `agent_orgs.md`, `run_history.md` (delete keeps task agents), `memory_sync.md` (residue note), `collaboration_model.md` §5 (CM-8, CM-9 → Holds); `memory_sync.md` also: task agents coordinated by an organization run are not listed in imported memory |

## Return Or Event Spine(s) (If Applicable)

N/A — no event or result shape changes.

## Bounded Local / Internal Spines (If Applicable)

- Split write (tree store), inside the coordinating run's persistence lock, computed against the
  files (contract L6; ARCH-F-004 — no baseline kept in any store instance, so every writer path
  behaves the same: coordinators, root managers, the Org catalog archive and its compensation):
  `read the tree on disk → for each loaded task agent: own file on disk? → yes: compare the record
  with it, write the own file only if it differs, write its link / no and absent from the tree on
  disk: new → write its own file at L1, then its link → for each record on disk that was not loaded
  (not available): write it back unchanged (L4) → write the tree only if it differs`. L4 makes a save
  during a partly finished migration safe (S15); comparing with the own file makes a hub with many
  task agents write one own file per change (H3).
- Compose read (tree store): `links tree → own files → records → composed tree`.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Note |
| --- | --- | --- |
| Placement rule | handles, indexes, validator, explorer | one rule for writer and reader |
| G1 / G2 | ~20 metadata readers, readiness, team catalog, offline repair | in the readers, so no caller can forget |
| Delete confirmation text | web history delete | "its task agents' memory is kept" |

## Ownership Boundaries

- No code outside the tree stores reads or writes a task agent's own file except the task-agent
  readers / writers they use, the explorer (through the reader) and the migration.
- No code outside the layout composes a memory path.
- The links tree never carries a task agent's facts after D-1 writes it.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| tree stores | split / compose, own-file IO | callers reading own files to rebuild records |
| `AgentRunMetadataStore` | G1, `taskAgent` section | callers parsing `run_metadata.json` |
| `TeamRunExecutionTreeStore` | G2 | callers checking for a team tree file to decide "is a team run" (the validator's existence check must use the store) |
| placement module + layout | memory directories | `path.join` of memory segments |

## Dependency Rules

`agent-memory/domain` and `agent-memory/store` import no execution family. Tree stores may import the
metadata store and team tree store (own files) and the placement module. The migration's source side
imports only its frozen module.

## Interface Boundary Mapping

```ts
// run-history/store/agent-run-metadata-types.ts
export type TaskAgentSection = Readonly<{
  coordinatingRun: Readonly<{ kind: "agent" | "agent_team" | "agent_org"; runId: string }>;
  delegatorAgentRunId?: string;
  address: AgentTeamAddress;
  origin: "catalog" | "configured_place";  // U-4: configured_place composes today's record without `source`
  launchSource?: LaunchConfigurationSource;
  userLaunchSelection?: UserLaunchSelection;  // beside the started launch, never over it (U-1, DEC-005)
}>;
export type TaskAgentRunMetadata = Omit<AgentRunMetadata, "workspaceRootPath"> & Readonly<{
  workspaceRootPath: string | null;  // U-2
  taskAgent: TaskAgentSection;
}>;  // top-level launch fields = the started launch (U-1); null when never recorded (configured_place, migrated)

// run-history/store/agent-run-metadata-store.ts
readMetadata(runId): Promise<AgentRunMetadata | null>;            // G1: null when taskAgent is present
readMetadataState(runId)                                          // G1: "missing" for a task agent
readTaskAgentMetadata(runId): Promise<TaskAgentRunMetadata | null>;
writeTaskAgentMetadata(metadata: TaskAgentRunMetadata): Promise<…>;  // atomic

// team tree store
read(dir, teamRunId)            // G2: a tree with taskAgent is not a team run (null / rejected)
readTaskAgentTeam(teamRunId) / writeTaskAgentTeam(tree)             // agent_teams/<id>/team_run_execution_tree.json + team_communication_messages.json

// agent-memory/domain/agent-run-memory-placement.ts
export type AgentRunMemoryPlacement =
  | Readonly<{ kind: "run_part"; scope: RootExecutionPhysicalScope }>       // a run's own part (today's rule)
  | Readonly<{ kind: "task_agent"; agentRunId: string }>                    // agents/<id>/
  | Readonly<{ kind: "task_agent_team_member"; teamRunId: string }>;        // agent_teams/<team>/<id>/
placementForAgentChain(chain, physicalScope): AgentRunMemoryPlacement;
// AgentMemoryLayout.getAgentRunMemoryDirPath(placement, agentRunId): string
```

## Interface Boundary Check

Every caller of `getRootedAgentRunDirPath` / `getRootExecutionDirPath` for agents (V-12: 7 files)
moves to the placement API; every tree read / write stays a store call; the migration is the only
other writer of own files.

## Main Domain Subject Naming Check

`TaskAgentSection`, `TaskAgentRunMetadata`, `AgentRunMemoryPlacement`, `task_agent`,
`task_agent_team_member` — named for what they are, in the collaboration vocabulary.

## Existing Capability / Subsystem Reuse Check

Reuses: the three tree stores and their atomic writers, `AgentRunMetadataStore`, the team tree store,
the migration runner and the predecessor rename pattern (`team-agent-memory-layout-app-data-migration.ts`),
`listTaskExecutionChainForAgent`, the readiness index rebuild, the source resolvers (unchanged, over
composed records).

## Subsystem / Capability-Area Allocation

Server only, plus one web text (delete confirmation). No contracts package change.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

The composed in-memory record types stay the single in-memory shape; the own files reuse the
standard run file shapes (`AgentRunMetadata`, team tree) plus `TaskAgentSection`.

## Shared Structure / Data Model Tightness Check

`TaskAgentSection` is the only new persisted structure; the link is a strict subset of today's record
(`address`, `agentRunId` | `teamRunId`, `delegatorAgentRunId?`, `startedAt`).

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts` | `TaskAgentSection`; G1; task-agent reader / writer |
| team tree store (`team-run-execution-tree-store` + schema) | G2; task-agent-team reader / writer |
| `standalone-agent-run-root/persistence/standalone-root-package-store.ts` | D-1 split / compose of the standalone tree; D-4 split / compose of its message log |
| `TeamRunExecutionTreeStore`, `team-communication-v1-store.ts` | D-1, D-4 for team runs |
| org tree store, `agent-org-communication-messages-v1.ts` | D-1, D-4 for org runs |
| `run-history/store/run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts` | link schema (disk) next to the composed record schema (memory) |
| family persistence coordinators | pass changed-record detection and owner logs to the stores; lock unchanged |
| `agent-memory/domain/agent-run-memory-placement.ts` (new), `agent-memory/store/agent-memory-layout.ts` | D-2 |
| `agent-collaboration/execution/services/rooted-agent-memory-locator.ts` → placement-based locator | D-2 |
| handles / adapters / registries computing memoryDir; location services (standalone, team, org) | D-2 |
| `run-history/services/root-run-package-current-validator.ts` | D-6 (skip task agent files as roots; owners by placement; team existence check through the store) |
| `agent-memory/services/agent-memory-explorer-service.ts` | D-5 |
| web history delete confirmation (implementer locates the string) | D-7 text |
| `app-data-migrations/migrations/task-agent-own-run-v1/` (+ registry) | D-8 |
| `app-data-migrations/legacy/released-run-package-shapes/` (new frozen copies, named after this migration (rule 8): today's tree records and parser; today's root-package validator with nested owners; today's runtime memory location classifier and location derivation) | D-9 |
| `collaborators-to-delegated-runs-v1`, `agent-org-history-first-message-summary-v1`, `agent-org-flat-team-families-v1`, `team-run-migration-state-classifier`, `team-context-file-execution-locators-v1`, both `20260731` snapshot migrations | D-9 repoint to the frozen copies (contract §5.4); their tests keep passing unchanged in outcome |
| Memory Sync and Memory page tests over imported roots (+ fixtures F-SYNC-NEW, F-SYNC-OLD) | REQ-015: no Memory Sync source change; tests updated to the documented behavior |
| docs (Removal list) | sync |

## Applied Patterns (If Any)

Persistence-boundary split (repository composes the aggregate from several files); rename-based
startup migration with file-system state recognition.

## Target Subsystem / Folder / File Mapping

As the Final mapping; the migration in its own folder with its frozen source module.

## Folder Boundary Check

The placement module joins the layout in `agent-memory/`; own-file IO stays in `run-history/store/`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Contract §2 (layout), §3 (own files and link), §6 (before / after per case). Example split for a
hub with two task agent teams after a Settings edit of one member: one write of
`agent_teams/<team A>/team_run_execution_tree.json`; no write of the links tree; no write of team B.

## Backward-Compatibility Rejection Log (Mandatory)

- Rejected: readers that look in the old nested place when the new one is missing (dual path).
- Rejected: keeping facts in the coordinating tree as well as in the own file (two authorities).
- Rejected: a `delegated_run.json` back-link next to `run_metadata.json` (superseded by the
  `taskAgent` section).
- Kept: none.

## Derived Layering (If Useful)

Disk (links + own files) ↔ stores (split / compose) ↔ in-memory composed records ↔ indexes,
adapters, projections (unchanged).

## Change / Refactor Sequence

0a. Version-free names (D-10) as a separate, purely mechanical commit before the behavior changes,
   with the rename inventory in the implementation handoff (AC-023).
0. Test impact inventory (REQ-016): list every existing test touching memory placement, task agent
   records, message logs, the Memory page or Memory Sync, with its planned update; keep it in the
   implementation handoff.
1. Repoint the released migrations (D-9) to frozen copies first, with their existing tests green,
   before any module they imported changes; then placement module + layout; switch memory-dir
   derivation (D-2); tests per family.
2. G1 / G2 and task-agent readers / writers (D-3); tests that no listing, admission or restore API
   sees a task agent.
3. Tree stores split / compose (D-1) with change detection; tests: delegate, restore, Settings edit,
   crash between own file and link.
4. Message stores split / compose (D-4); tests per family (AC-014).
5. Explorer (D-5), validator (D-6), delete text (D-7).
6. Migration (D-8) with faithful fixtures from the shape inventory (contract §12.3).
7. Docs; real-app run (AC-016).

## Key Tradeoffs

- In-memory types unchanged vs. a lazy, link-only in-memory model: unchanged types keep 28 consumers
  untouched and the risk bounded; the cost is that loading a coordinating run reads every task
  agent's own file (contract H2 known cost; lazy loading is a follow-up).
- Own files written by the tree store (split) vs. by each feature: one owner, no caller can write a
  link without the own file.

## Risks

- R-1 change detection misses a changed record → a stale own file. Mitigation: the store compares the
  full record; tests for every mutator (create, Settings edit, member session id updates).
- R-2 a reader outside the stores parses own files. Mitigation: boundary rules + search in review.
- R-3 composed read of a large hub costs more file opens. Accepted (H2); measured in the real-app run.
- R-4 merge with other work in the same stores. Coordinate at implementation.
- R-6 a released migration still imports a module this ticket changes. Mitigation: D-9 first in the
  sequence; the implementer re-greps the registry's import graph at the implementation base; F-PENDING.
- R-8 a deterministic predecessor failure leaves one run waiting forever (ours non-terminal, the run's task
  agents not available). Accepted: contained to that run (rule 7); every other run migrates; the
  data-health notice (Task 5d0b1bc2) can surface it. The per-start retry re-reads only waiting trees after
  the cheap already-done checks.
- R-7 a hidden (not available) task agent surprises the user after a failed step. Accepted: rare,
  recovered on the next start, nothing lost (contract §10).
- R-5 a save that reduces a record before its own file exists would lose its facts (found by
  simulation S15). Mitigation: L4 in the store, and a test that saves a tree during a partly finished
  migration and then completes the migration.

## Guidance For Implementation

- Follow the contract word for word for files, fields and states; any deviation returns to the
  Solution Designer.
- Verification: server unit / integration / typecheck; migration tests on faithful fixtures (every
  shape of contract §12.3 including F-RERUN-MSG, F-PENDING and F-PENDING-FAILED, interruption at every step,
  second start a no-op, file list / size / hash equality);
  each tree-writing predecessor run against a reduced tree leaves it unchanged (contract §5.4 step 3); G1 / G2 tests across listing, admission, restore and the offline repair; message tests
  per family; the real-app run on an isolated desktop instance with the synthesized data package
  (AC-016). Never on the user's data or a copy of it.
