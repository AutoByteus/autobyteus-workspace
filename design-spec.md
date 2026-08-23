# Design Spec

## Current-State Read

This is a regression repair, not a new memory-layout choice. The released physical contract already mirrors the concrete TeamRun topology:

`memory/agent_teams/<rootTeamRunId>/<ordered root-exclusive TeamRun IDs...>/<agentRunId>/`

Cold readers honor that contract. `TeamRunExecutionTreeLocationService` builds a `TeamExecutionIndex` from a live or stored V1 execution tree, derives the containing TeamRun ancestry, asks `AgentMemoryLayout` for the exact member directory, and passes that `memoryDir` to history, Event Monitor, file-change, context-file, snapshot, and external-reply consumers. These current owners use exact canonical paths; they do not enumerate or probe a flat nested-member fallback.

The live mixed-team writer does not honor the contract. `TeamRunContext` carries root/current TeamRun identities but no immutable physical scope. `MixedAgentMemberHandle` therefore substitutes `ancestorTeamRunIds: []`, which is correct only for a root TeamRun. Configured child teams and delegated task teams are recursively materialized through `MixedSubTeamRunFactory`, but their parent context is unpacked into partial fields and no path invariant is propagated. A delegated task agent reuses its owning context, so it is affected whenever that containing TeamRun is nested. Runtime/model selection occurs below this shared path and is not causal.

`TeamExecutionIndex` already owns the exact configured/task parent graph, but `RootTeamRun.getAgentExecution()` and `TeamRunExecutionTreeLocationService.toLocation()` independently repeat the same reverse/root-trim/map derivation. That duplicated policy contributed to writer/read drift.

Persisted data is mixed: affected current V1 AgentRuns have complete directories at `<root>/<agentRunId>/`; other nested AgentRuns are canonical; unmaterialized AgentRuns have no directory. Root Team Communication is separately stored and healthy. The physical correction is a whole-directory relocation; no raw-event or snapshot schema transformation is required.

`ARCH-REV-001` found one omitted supported observer. Memory Sync v1 recursively scans `memory/agent_teams`, emits replace-only operations, and propagates no deletes. It can therefore export both paths in a source-plus-canonical conflict, or retain a pre-upgrade flat import after a clean local relocation. This does not create a second semantic current reader: local and imported `TeamMemoryExplorerService` use the V1 execution tree and exact canonical member target. The user explicitly approved preserving/documenting this existing v1 physical-retention behavior instead of adding filtering, tombstones, remote cleanup, or a sync gate.

The migration design is governed by:

- `autobyteus-server-ts/README.md`, section **Production migration practice**; and
- `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`.

Those conventions make one writer, a stable process/power/device, sufficient permissions, readable/writable same-filesystem storage, and normal filesystem behavior prerequisites for a migration attempt. They require one deterministic known-source-to-fixed-target transform, ordinary runner retry/idempotence, forward-only runtime code, final-current-state status classification, and bounded diagnostics. They explicitly reject bespoke shutdown/power-loss journals, backup copies, syscall-failure state machines, exhaustive mechanical-failure matrices, and unbounded warning evidence. SR-001's directory-`fsync`, post-rename-indeterminate, global listener-gate, and multi-file planner/relocator proposal was superseded by SR-002. SR-003 replaced SR-002's startup-only recovery with required-on-startup `ANYTIME`. This SR-004 design resolves `ARCH-RG-001` by explicitly classifying the already-documented Memory Sync v1 no-delete mirror as an approved bounded nonfatal observer when semantic current readers have an independently valid canonical target; durable convention/Memory Sync docs must state that product-specific disposition.

Exact reproduction, history, and source evidence remain authoritative in `investigation-notes.md` and `investigation-evidence/nested-team-restart-reproduction.md`.

## Intended Change

1. Introduce one immutable `TeamRunPhysicalScope` owned by the TeamRun execution domain: root TeamRun ID plus the ordered root-exclusive TeamRun chain through the containing TeamRun.
2. Make every `TeamRunContext` require and validate that scope. Root construction creates an empty chain; configured-child and task-team construction append exactly their concrete child TeamRun ID from the parent scope.
3. Make every direct AgentRun consume `teamContext.physicalScope`. A delegated task agent adds no TeamRun directory; a delegated task team does.
4. Make `TeamExecutionIndex` the single tree-derived scope authority used by cold readers, root execution lookup, and migration planning.
5. Add one required-on-startup app-data migration with `executionPolicy: "ANYTIME"`; it uses validated V1 topology and performs one deterministic whole-directory `rename` for each unambiguous affected AgentRun.
6. Let the existing runner own startup scheduling, ledger, truthful status, and manual retry. An item-level move failure returns `FAILED` but does not abort application startup; the existing `MANUAL_RETRY` / `canRetry` contract enables the current Settings Retry button. Do not add a migration-specific server gate, journal, backup/quarantine, `fsync` protocol, or mechanical-failure state machine.
7. When both a real flat source and independently valid canonical target exist, preserve both and return a bounded `SUCCEEDED_WITH_WARNINGS` disposition named as sync-visible residue. Preserve Memory Sync v1's recursive replace-only/no-delete behavior unchanged; local/imported semantic readers remain canonical.
8. Keep runtime readers/writers canonical-only. Preserve direct-root/standalone paths, Team Communication, GraphQL/UI contracts, raw-event schemas, runtime/model independence, genuine-empty behavior, and Memory Sync availability. Document the approved v1 retention limitation; add no filter, tombstone/delete protocol, remote cleanup, sync gate, or new UI.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–REQ-003; AC-001, AC-002, AC-006, AC-007, AC-011 | Cold reopen/select an exact nested member after server/container restart | Investigation BEH-001; both browser reproductions; GraphQL 0/0 and canonical missing-path log | Existing queries/UI read that AgentRun's real traces from the canonical scoped directory; a truly trace-empty run keeps the existing empty result | Browser hydration -> GraphQL projection -> tree location -> local replay -> UI; DS-002, DS-004 |
| BEH-002 | System | REQ-001, REQ-003, REQ-006; AC-001–AC-003, AC-007, AC-010 | Activate a configured member, task agent, or task-team member inside a concrete TeamRun | Investigation BEH-002; writer source; Codex and AutoByteus flat traces | All live execution kinds consume one exact immutable containing-TeamRun scope, independent of runtime/model | TeamRun creation/materialization -> context scope -> member activation -> memory location -> AgentRun stores; DS-001, DS-003 |
| BEH-003 | User | REQ-004; AC-003, AC-011 | Cold reopen a direct-root member | Investigation BEH-003; controls returned 3/1 and 13/5 | Preserve root-empty scope, direct physical path, and projection behavior | Root context -> direct AgentRun path -> current cold projection; DS-001, DS-002 |
| BEH-004 | User | REQ-004; AC-004 | Open Team Communication for a historical root TeamRun | Investigation BEH-004; affected root still returned 6 messages/references | Preserve the root-scoped Team Communication authority without migration coupling | Team Communication query -> root message store -> UI; DS-005 |
| BEH-005 | Operational | REQ-005; AC-005, AC-006, AC-008, AC-009, AC-012–AC-014 | Start an upgraded node containing current V1 runs written by the defective writer, or click Retry for its nonterminal record | Investigation BEH-005; scan found flat, canonical, and absent states; migration runner/API/Settings recovery evidence; canonical convention | Deterministically rename every unambiguous complete flat directory; preserve/report source+valid-target conflicts as bounded warnings; truthful move failure remains non-blocking and manually retryable; every rerun is idempotent | Startup runner -> migration record -> normal app; Settings Retry -> existing mutation/runner -> same migration; DS-006, DS-007 |
| BEH-006 | User / Operational | REQ-008; AC-015, AC-016 | Click Nodes -> Memory Sync -> Sync now before and/or after upgrade, or run enabled background sync | Investigation BEH-006; `ARCH-RG-001` MP-001/MP-002; scanner/planner/docs; imported explorer canonical-path evidence | Preserve v1 recursive replace-only/no-delete behavior. Both physical paths may be mirrored/retained, but semantic local/imported reads use only the canonical V1 target; warning is bounded and disclosed; application/sync remain available | Sync now/background worker -> scanner -> replace planner -> hub import; imported explorer -> V1 tree -> canonical target; DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/nested-team-restart-reproduction.md` | Browser, GraphQL, filesystem, log, restart, runtime/model, and stored-population evidence | REQ-001–REQ-006; AC-001–AC-012 | Establishes the defect, controls, misplaced/canonical paths, and whole-directory unit | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/root-member-history-control.png` | Healthy direct-root browser control | REQ-004; AC-003 | Locks preserved root behavior | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/affected-codex-nested-member-post-restart.png` | Existing Codex/GPT-5.6 failure | REQ-001, REQ-002, REQ-006; AC-001, AC-010 | Confirms configured nested false empty | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/controlled-autobyteus-nested-member-post-restart.png` | Controlled AutoByteus/DeepSeek task-team failure | REQ-001–REQ-003, REQ-006, REQ-007; AC-002, AC-010, AC-012 | Confirms recursive task-team/runtime-independent scope | Complete evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_f69ba7836a55__image.png` | Original department topology and Team panel | REQ-004; AC-004 | Confirms hierarchy and independent Team messages | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_57a57720cadc__image.png` | Remote-node context | REQ-002; AC-001 | Establishes requested node 8001 | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_26ddbd968b85__image.png` | Original Team messages/reference files | REQ-004; AC-004 | Supports Team Communication preservation | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_73e4b305a940__image.png` | Earlier nested-classroom false empty | REQ-001–REQ-003; AC-001, AC-002 | Historical symptom context; controlled reproduction supplies causality | Retained evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with targeted invariant refactor and persisted-layout repair.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, compounded by `Duplicated Policy Or Coordination` and `Shared Structure Looseness`.
- Refactor needed now: `Yes`.
- Evidence: `TeamRunContext` lacks the physical scope needed by its direct AgentRuns; the leaf fabricates `[]`; child factories propagate only partial parent facts; two cold consumers repeat index ancestry derivation. Repository history proves the August 15 universal-delegation checkpoint removed a previously correct writer rule while canonical readers/docs remained hierarchical.
- Design response: one execution-domain scope, one live context owner, one index query, one child append boundary, and one migration-only old-location transform.
- Refactor rationale: a leaf-local walk or one-reader fallback would keep the ownership split and fail task/deep recursion. The proposed refactor is the smallest structure that makes the invariant unavoidable.
- Intentional deferrals and residual risk: no general context redesign, UI redesign, migration-framework redesign, Memory Sync filter/protocol/cleanup/gating redesign, cross-process lock, arbitrary corruption recovery, or provider-specific path behavior. Under the canonical migration convention, stable normal attempt assumptions are prerequisites rather than additional branches. Approved Memory Sync v1 residue can consume trusted-hub storage until an existing imported source is removed or a future separately approved cleanup exists.

## Terminology

- **Physical scope**: immutable `{ rootTeamRunId, ancestorTeamRunIds }` for one containing TeamRun. `ancestorTeamRunIds` is ordered from the root's first child through the containing TeamRun and excludes the root.
- **Containing TeamRun**: concrete TeamRun directly owning an AgentRun. A task agent remains in its delegator's containing TeamRun.
- **TeamRun boundary**: one physical directory segment for every non-root configured or delegated task TeamRun.
- **Affected flat source**: defective `<root>/<agentRunId>/` directory for an AgentRun whose V1 scope is non-root.
- **Canonical target**: `<root>/<ancestorTeamRunIds...>/<agentRunId>/` from `AgentMemoryLayout`.
- **Sync-visible flat residue**: a preserved flat source beside a structurally valid canonical target. Semantic local/imported readers do not load it, but Memory Sync's recursive physical scanner may export it and v1 may retain it remotely because deletes are not propagated.

## Design Reading Order

This design follows verified behavior -> health/transition -> spines/ownership -> interfaces/subsystems -> files/folders -> sequence/tradeoffs/risks. Migration mechanics are intentionally proportionate to the repository convention.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the August 15 hard-coded flat-current writer and its defective test expectation.
- Remove duplicate reverse/root-trim ancestry recipes from `RootTeamRun` and `TeamRunExecutionTreeLocationService`.
- Remove redundant child-factory root identity propagation where the parent context is authoritative.
- Keep no flat runtime lookup, canonical-then-flat probe, dual writer, compatibility wrapper, or frontend false-empty workaround.
- Keep defective-path interpretation only inside the registered migration.
- Do not implement the superseded SR-001 migration-specific listener gate, directory-`fsync` protocol, post-rename-indeterminate state, planner/relocator mini-framework, backup, or shutdown-failure matrix.

## Production Migration Convention Compliance Check

| Canonical Convention Requirement | SR-004 Design Response | Compliance |
| --- | --- | --- |
| Known released source -> one fixed current target | August 15 flat nested AgentRun directory -> V1-tree-derived canonical directory; file contents are not transformed | Yes |
| Deterministic identity/evidence | Only classifier-validated `CURRENT_V1` packages and `TeamExecutionIndex` identities are used; no name/address/time inference | Yes |
| One writer/stable normal attempt assumptions | Stated as operating prerequisites; no adversarial concurrency, power, device, kernel, permission, or syscall recovery machinery | Yes |
| Abrupt termination is one incomplete attempt | Atomic rename plus one ordinary rerun/idempotence scenario; no lifecycle-specific journal/state matrix | Yes |
| Forward-only current runtime | No flat read/write fallback; all old-path knowledge stays in the registered migration | Yes |
| Validate before mutation | Valid V1 package, exact non-root scope, layout-derived paths, source directory, and absent target are required before rename | Yes |
| Validate resulting current state | After rename, canonical target must be a real directory and flat source absent | Yes |
| Proportionate recovery | Existing required-on-startup `ANYTIME` runner path, ledger, `MANUAL_RETRY`, GraphQL mutation, and Settings Retry button; no new server gate, public command, backup, rollback, or journal | Yes |
| Truthful final-state status | Warning only when a real canonical target is independently present and every remaining effect has an explicitly approved bounded disposition; missing/invalid required target is `FAILED` | Yes |
| Status is separate from application availability | Folder-move `FAILED` is capability-scoped and non-blocking; unrelated application startup continues while the exact affected history remains unavailable until Retry succeeds | Yes |
| Cleanup residue / supported observer | Source+target conflict is untouched. Semantic current owners use only the canonical target; the independently reachable Memory Sync v1 path may mirror/retain both physical paths. The user explicitly approved this no-delete retention as bounded nonfatal and rejected filter/delete/cleanup/gating expansion; docs disclose it | Approved product-specific disposition; no speculative machinery |
| Bounded status/log evidence | Exact aggregate counters plus one reason detail and at most five sorted examples per reason; opaque DB summary unchanged | Yes |
| Isolated proof | Synthetic temp fixtures, full-directory preservation, fixed disposition table, and one rerun scenario; never a live user profile | Yes |

Durable documentation must state the narrow approved rule, not create a generic warning escape hatch: a replace-only/no-delete mirror may retain an old physical path as a bounded warning only when (1) the canonical target independently validates, (2) every semantic local/imported reader resolves that target and never chooses the residue, (3) the existing mirror contract already permits source-deleted files to remain, (4) no independent deletion/retention contract requires cleanup, and (5) the product disposition is explicit. Missing or invalid canonical target remains `FAILED` without exception.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: complete AgentRun memory directories below `memory/agent_teams/<rootTeamRunId>/...`, containing possible active/rotated traces, manifest, file changes, snapshot, lineage, and siblings. The affected Codex example has about 1.58 MB of traces; the controlled AutoByteus example has 10,297 bytes plus snapshot. The scan saw 30 V1 roots, 52 nested executions, 3 affected flat materialized directories, 1 canonical nested directory, and no simultaneous source/target pair before the controlled run.
- Relevant code-model, serialization, semantic, or physical-store change: no file-content schema change. Only the parent directory chain moves to the already-current hierarchy; live context gains an immutable representation of that existing contract.
- Normal reader/writer/observer behavior and representative evidence: AgentRun writers consume one explicit `memoryDir`; semantic local/imported readers resolve one exact V1-tree-derived canonical directory. Flat files parse normally but semantic current runtime does not probe their location. Memory Sync is a separate recursive physical observer that may export both paths and does not propagate source deletions.
- Required semantics and invariants under direct use: file set/bytes, AgentRun association, event order, manifest/segment relationship, snapshot, and file changes must remain unchanged. Direct use in place cannot satisfy the canonical path; direct use after same-filesystem directory rename does.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: all migration paths come from `AgentMemoryLayout`; target must not be overwritten; current V1 topology is required; root-direct/unmaterialized/current/non-current states receive deterministic dispositions. One writer/stable normal same-filesystem attempt is a documented prerequisite. Arbitrary corruption, tampering, insufficient permissions, adversarial concurrency, and abnormal device/kernel behavior do not add migration machinery. Approved Memory Sync v1 physical residue may use additional trusted-hub storage; no independent deletion/retention contract was identified or approved.
- Decision: `Migration Required`.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: `rename` changes only directory placement, preserves the entire owned unit without content rewrite, and costs O(current V1 AgentRuns) classification plus one metadata operation per affected item. The existing startup runner supplies the cutover and ordinary retry. Dual reads would permanently retain ambiguity; copy/backup/journal/`fsync` machinery would add I/O and states without an approved reachable need.
- Acceptance criteria or design constraints supported by this decision: REQ-001–REQ-008; AC-001–AC-016.

### Migration Plan (Only When Decision Is `Migration Required`)

- Current canonical schema / version: validated TeamRun execution-tree V1 plus hierarchy-aware AgentRun memory layout.
- Older persisted schema version(s) that require transformation: the August 15 defective physical location for nested AgentRuns; file contents remain current.
- Why direct use and discard/rebuild are insufficient: current exact-path readers cannot use flat nested data in place, and user history is not rebuildable.
- Migration trigger: automatic `Startup` attempt plus the existing Settings manual Retry action after `FAILED` or warning status.
- Migration owner and file / subsystem location: one `TeamAgentMemoryLayoutAppDataMigration` in `src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts`.
- Normal business/runtime path that remains current-schema-only: live `TeamRunContext.physicalScope -> AgentMemoryLocationService -> AgentMemoryLayout`; cold/imported semantic `TeamExecutionIndex.getTeamRunPhysicalScope -> AgentMemoryLayout`. Memory Sync remains a path-preserving physical mirror, not a semantic runtime reader.
- Historical-shape types or decoders confined to migration-owned code: a private candidate/disposition for flat source vs canonical target. No file decoder is needed.
- Completion marker / version ledger: existing app-data migration record keyed by `20260823_repair_team_agent_memory_layout`.
- Restart-safety or idempotency strategy: ordinary classification on each selected attempt. Before rename the source exists/target is absent; after atomic rename the source is absent/target exists. A later automatic or manual runner attempt therefore either performs the move or skips the already-current target. One rerun/idempotence scenario covers incomplete attempts; no separate shutdown labels or recovery states.
- Validation before current runtime proceeds: V1 migration prerequisite; shared classifier admits only `CURRENT_V1`; `TeamExecutionIndex` supplies exact scope; `AgentMemoryLayout` supplies both paths; target absence is rechecked in the same one-writer attempt; after rename the migration confirms target is a real directory and source is absent. Current runtime remains canonical-only.
- Backup / rollback / quarantine / operator-recovery strategy: no backup/quarantine/rollback protocol. For an eligible target-absent move, atomic rename preserves the original directory as the target and rewrites no bytes. A pre-mutation failure leaves source untouched. A source+valid-target conflict is not mutated. A failed move is recorded as `FAILED` without aborting application startup; because the definition is `ANYTIME`, the existing runner reports `MANUAL_RETRY`, Settings enables Retry, and clicking it reruns the idempotent definition.
- Concurrent old/new application access risk and cutover / maintenance / deployment-sequencing decision: one migration writer and stable attempt are operating prerequisites. Concurrent old/new writers are unsupported and do not justify a lock or dual-version path.
- Historical migration retention decision: keep the definition registered for direct and skip-version upgrades; never call it from normal runtime after startup disposition.

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| 1. Classify roots | Any TeamRun root entry | Valid `CURRENT_V1` roots only | Existing `TeamRunMigrationStateClassifier` | Complete tree/task/message package validation | Predecessor, historical residue, and invalid roots remain outside this migration; no guessed identity |
| 2. Enumerate candidates | Indexed AgentRuns | Non-root AgentRuns only | Migration using `TeamExecutionIndex.getTeamRunPhysicalScope()` | Exact containing TeamRun, non-empty canonical ancestor chain, unique AgentRun from validated index | Root-direct AgentRuns are not candidates |
| 3. Resolve paths | Root/agent IDs and physical scope | Flat source plus canonical target | Existing `AgentMemoryLayout` | Containment-safe canonical paths | No hand-built path or logical-name inference |
| 4. Classify physical state | Source/target absent or real directory | One deterministic disposition | Migration-local method | `lstat` enough to distinguish missing/real/unsupported entry under normal assumptions | source absent + target absent = unmaterialized skip; source absent + target dir = current skip; source dir + target absent = move; both dirs = bounded warning/no mutation; required target unavailable = failed |
| 5. Move eligible unit | Complete flat directory | Complete canonical directory | Same migration class | Create canonical parent, `rename(source, target)`, then confirm target directory/source absent | On ordinary error return `FAILED`; application startup continues and existing manual Retry owns the next attempt. No copy, merge, overwrite, journal, backup, `fsync`, or special post-rename state |
| 6. Record bounded result | All candidate dispositions | Current migration ledger and attempt log | Migration plus existing runner | Exact aggregate counters; reason counts; at most five example paths per reason | `FAILED` if required current target not established, with `MANUAL_RETRY`; `SUCCEEDED_WITH_WARNINGS` only for a structurally valid current target plus explicitly approved bounded nonfatal residue, including sync-visible v1 retention; otherwise `SUCCEEDED` |

### Deterministic Physical-State Table

| Flat Source | Canonical Target | Disposition | Final-State Classification |
| --- | --- | --- | --- |
| Missing | Missing | `SKIPPED_UNMATERIALIZED` | No persisted AgentRun memory exists; current empty behavior is valid |
| Missing | Real directory | `SKIPPED_ALREADY_CURRENT` | Current target is structurally valid |
| Real directory | Missing | `MIGRATED` via whole-directory rename | Current target established and validated |
| Real directory | Real directory | `PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING` with no mutation | Target is structurally current and is the only semantic local/imported target. Memory Sync v1 may mirror/retain both physical paths under the approved no-delete limitation; no content preference is guessed |
| Unsupported/non-directory source | Real directory | `PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING` with no mutation | Current target is structurally current; semantic readers do not load the unsupported source, while physical sync may preserve it under the same approved limitation |
| Any source | Unsupported/non-directory canonical target | `FAILED` with no mutation | Required current physical target is not valid |
| Unsupported/non-directory source | Missing | `FAILED` with no mutation | Supported source-to-target transformation cannot be performed |

`SUCCEEDED_WITH_WARNINGS` is allowed only in the two rows where a real canonical target independently satisfies the semantic layout invariant. The warning explicitly names the residue as sync-visible rather than inert: Memory Sync v1 may export or retain it, but local/imported semantic readers do not treat it as a competing current target. This exact production-path disposition is user-approved. No warning hides a missing/invalid target.

Diagnostics are bounded independently of cardinality:

- `scannedCount`, `migratedCount`, `skippedCount`, and `failedCount` count all dispositions directly rather than deriving totals from `details.length`.
- The attempt log receives one aggregate detail per reason with the total reason count and at most five sorted example relative paths.
- No source file contents, unbounded path arrays, exception dumps, or one-detail-per-candidate list enters the database summary, status API, or UI.
- The existing formatter continues storing only `Scanned N; migrated N; skipped N; failed N.` in `app_data_migration_records.summary`.

Registration order:

1. existing `20260814_team_run_execution_tree_v1`;
2. new `20260823_repair_team_agent_memory_layout` with `requiredOnStartup: true`, `executionPolicy: "ANYTIME"`, and the V1 prerequisite;
3. not-yet-run canonical-location working-context snapshot migrations, which declare the new migration ID as prerequisite;
4. existing path-independent raw-trace migrations retain their current behavior.

Previously successful migration ledger entries are not reset. Chronologically, any installation capable of producing the August 15 defect has already run the older raw-trace/snapshot migrations at startup; the layout repair does not rewrite their formats.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-003 | Root create/restore or child TeamRun materialization | Correct `AgentRunConfig.memoryDir` | `TeamRunContext` plus mixed factories | Prevents all new configured/task writes from entering flat layout |
| DS-002 | Primary End-to-End | BEH-001, BEH-003 | GraphQL member projection after cold restart | Replay from exact canonical member directory | Location service backed by `TeamExecutionIndex` | Restores history through one current path |
| DS-003 | Return-Event | BEH-001–BEH-003 | AgentRun memory/event emission | Traces and sibling state in scoped directory | Existing AgentRun/memory stores | Scope selection governs all writes without event-layer topology logic |
| DS-004 | Return-Event | BEH-001, BEH-003 | Local projection result | Existing GraphQL/UI state | Existing projection and hydration owners | Confirms no UI contract change and preserves genuine-empty behavior |
| DS-005 | Primary End-to-End | BEH-004 | Team Communication query | Root-scoped Team messages | Team Communication subsystem | Healthy independent control stays outside member migration |
| DS-006 | Primary End-to-End | BEH-005 | Existing startup migration runner | Canonical directory plus bounded ledger/log result | `TeamAgentMemoryLayoutAppDataMigration` | Repairs old physical placement before normal exact-path history use without a new recovery framework |
| DS-007 | Primary End-to-End | BEH-005 | User clicks Settings -> Server Migrations -> Retry | Updated migration record after the same idempotent definition | Existing Settings/store/GraphQL mutation/runner chain | Supplies the explicitly requested clickable retry without new frontend or framework behavior |
| DS-008 | Primary End-to-End | BEH-006 | Manual/background Memory Sync scans before or after upgrade | Replace-only hub imports plus canonical imported semantic read | Existing Memory Sync scanner/planner/hub and imported Memory Explorer | Makes the approved sync-visible/no-delete limitation explicit without changing the simple migration or sync protocol |

## Primary Execution Spine(s)

- **DS-001:** `Root create/restore -> MixedTeamRunBackendFactory -> TeamRunContext(root scope) -> MixedSubTeamRunFactory(parent scope + child TeamRun ID) -> TeamRunContext(child scope) -> MixedAgentMemberHandle -> AgentMemoryLocationService -> AgentMemoryLayout -> AgentRunConfig.memoryDir`.
- **DS-002:** `GraphQL history query -> TeamMemberRunViewProjectionService -> TeamRunExecutionTreeLocationService -> TeamExecutionIndex.getTeamRunPhysicalScope(containingTeamRunId) -> AgentMemoryLayout -> LocalMemoryRunViewProjectionProvider`.
- **DS-005:** `Team Communication query -> Team Communication projection/store -> <root>/team_communication_messages.json -> UI`.
- **DS-006:** `AppDataMigrationRunner -> TeamAgentMemoryLayoutAppDataMigration -> TeamRunMigrationStateClassifier -> TeamExecutionIndex -> AgentMemoryLayout -> classify -> rename if eligible -> bounded result/ledger`.
- **DS-007:** `Settings ServerMigrationsManager Retry -> appDataMigrationsStore -> runAppDataMigration GraphQL mutation -> AppDataMigrationRunner.runMigration -> same TeamAgentMemoryLayoutAppDataMigration -> updated record -> refreshed Settings state`.
- **DS-008:** `Nodes -> Memory Sync manual action or background worker -> MemorySyncService -> LocalMemoryExportScanner(memory/agent_teams recursive files) -> MemoryFileChangePlanner(replace only) -> hub import(no delete) -> imported TeamMemoryExplorerService -> V1 tree/member target -> canonical history`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Root construction creates `{root, []}`. Each configured/task child is built from its parent context by appending the child's concrete TeamRun ID once. Direct AgentRuns consume their containing scope unchanged. | root TeamRun, child TeamRun, physical scope, AgentRun | Context owns scope; factories own construction sequencing | Runtime/provider, workspace, handoffs, application binding |
| DS-002 | Active/stored lookup validates one V1 tree, indexes it, asks the index for containing scope, and asks the layout for one path. Projection sees only the current location. | execution tree, index, location, projection | Index owns ancestry; location service owns lookup composition | Package admission, trace projection |
| DS-003 | Existing writers persist to the immutable directory in `AgentRunConfig`; event publication never reconstructs topology. | AgentRun config, memory stores/events | AgentRun/memory subsystem | Trace rotation/compaction unchanged |
| DS-004 | Existing replay DTOs return through GraphQL and hydration. Canonical history appears; no-trace data remains empty. | replay result, GraphQL DTO, UI context | Existing services | Existing loading/error/empty UI |
| DS-005 | Team messages remain root-scoped and bypass AgentRun scope. | communication package | Team Communication subsystem | Ordering/references |
| DS-006 | The registered migration admits current V1 roots, resolves each non-root AgentRun's exact paths, performs only target-absent whole-directory renames, and emits cardinality-bounded results. | migration definition, V1 state, index, layout, directory | Single migration class | Existing runner ledger/retry and prerequisites |
| DS-007 | For a nonterminal `ANYTIME` record, the current Settings button dispatches the current GraphQL mutation. The runner invokes the same migration; already moved directories skip and remaining eligible directories retry. | migration status, recovery action, manual mutation | Existing migration runner; Settings is a thin public facade | Existing loading/error presentation and duplicate-run protection |
| DS-008 | The existing sync path physically mirrors every stable nonexcluded local file and does not emit deletion. A valid-target conflict or pre-upgrade flat import can therefore leave both hub paths. Imported semantic exploration indexes the V1 tree and selects only the canonical member location. | source file descriptor, replace operation, imported V1 member target | Existing Memory Sync owns transport; imported explorer owns semantic selection | Trusted-hub storage growth and durable disclosure |

## Spine Actors / Main-Line Nodes

- `MixedTeamRunBackendFactory`: root scope/context construction.
- `MixedSubTeamRunFactory`: configured/task child scope construction.
- `TeamRunContext`: immutable live scope owner.
- `MixedAgentMemberHandle`: leaf activation consumer.
- `TeamExecutionIndex`: authoritative tree-derived scope query.
- `TeamRunExecutionTreeLocationService`: active/stored lookup and path composition.
- `TeamAgentMemoryLayoutAppDataMigration`: complete migration owner, including bounded local classification/rename loop.
- `AppDataMigrationRunner`: existing startup/manual scheduling, ledger, recovery-action, and duplicate-run owner.
- Existing `ServerMigrationsManager` / store / GraphQL resolver: thin manual-retry transport; no migration policy ownership.
- Existing `LocalMemoryExportScanner`, `MemoryFileChangePlanner`, `MemorySyncService`, and hub store: unchanged v1 physical replication owners.
- Existing imported `TeamMemoryExplorerService`: semantic canonical-path control for retained hub residue.

## Ownership Map

- Team execution domain owns physical-scope meaning and live/tree-derived identity invariants; it knows no filesystem root.
- `TeamRunContext` owns live scope for direct members.
- `TeamExecutionIndex` owns scope derivation from validated V1 parentage.
- Mixed factories own root/child construction; leaf handles consume context only.
- Agent-memory owns safe scope-to-path translation through `AgentMemoryLayout`.
- Run-history location owns execution lookup/composition, not ancestry policy.
- One app-data migration class owns old flat-source interpretation, candidate sequencing, physical rename, final-state classification, and bounded diagnostics.
- Existing runner owns automatic startup scheduling, manual execution, status ledger, and `MANUAL_RETRY`; no new public or server-runtime recovery owner is added.
- Existing Settings/store/GraphQL owners merely transport `canRetry` and execute the current mutation. They are reused unchanged and never infer status policy.
- Memory Sync continues owning recursive physical replication and no-delete behavior. It does not become a migration authority, and the migration does not call, filter, gate, or clean it.
- Imported Memory Explorer remains the semantic owner: it resolves the V1 canonical target and does not present preserved flat hub residue as a second current run.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL history resolvers | Projection/location services | Public transport | Topology fallback or migration |
| `AgentMemoryLocationService.getTeamAgentRunLocation` | `AgentMemoryLayout` plus valid scope | Stable location DTO boundary | Ancestry discovery or flat probing |
| Mixed backend create/restore | Context/manager construction | Team backend lifecycle | Consumer-side child path logic |
| `AppDataMigrationRunner.runPending` | Registered definitions and record repository | Generic scheduling/ledger | Team-memory state classification |
| `ServerMigrationsManager` + retry mutation | `AppDataMigrationRunner.runMigration` and the migration definition | Existing manual-recovery UI/transport | Inferring recovery from migration ID/status or changing migration result semantics |
| `Sync now` GraphQL/UI action | `MemorySyncService` and existing scanner/planner | Existing manual physical replication entry | Migration conflict policy, semantic member-location selection, or delete inference |
| Workspace hydration | Backend projections | Existing UI application | Filesystem diagnosis or fabricated history |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hard-coded `ancestorTeamRunIds: []` in member writer | Root-only substitution causes defect | `teamContext.physicalScope` | In This Change | Root remains empty through root context |
| Defective nested writer test and stale activation fixture | Codifies regression/fails before subject | Correct root/nested/deep/task invariant tests | In This Change | Baseline failure remains documented |
| Duplicate ancestry recipes in root aggregate/location service | Parallel policy can drift | Index scope method | In This Change | Preserve consumer output DTOs |
| Child-factory `rootTeamRunId` and caller-built partial scope facts | Parent context is authoritative | Parent-context child construction | In This Change | Preserve task vs configured non-memory semantics |
| Flat runtime fallback/dual reads | Would retain two current contracts | Startup migration | Rejected In This Change | Never add |
| SR-001 planner/relocator folder split | Excess structure for one rename loop | One migration definition file | In This Change (design supersession) | No production implementation exists yet |
| SR-001 directory `fsync`, post-rename-indeterminate outcome, global listener gate, backup/rollback protocol, exhaustive mechanical tests | Contradicts canonical normal-attempt/proportionate-recovery convention | Atomic rename + ordinary runner rerun/idempotence | In This Change (design supersession) | Do not implement |
| Migration definition after upgrade windows | Later-upgrading nodes still need it | Retain registered migration | Follow-up: none | Migration history is not runtime compatibility |

## Return Or Event Spine(s) (If Applicable)

- **DS-003:** `AgentRun -> existing memory/event recorders -> scoped active/rotated traces, snapshot, and file changes`. Only the already-resolved directory changes.
- **DS-004:** `Local projection -> TeamMemberRunViewProjectionService -> GraphQL -> hydration -> conversation/Activity/Event Monitor`. Shapes and empty semantics are unchanged.
- **DS-006/DS-007 result:** `Migration counters/reason collector -> AppDataMigrationExecutionResult -> existing record repository/log -> existing recovery action -> current Settings state`. `FAILED` remains non-blocking but yields `MANUAL_RETRY`; the DB summary stays opaque and bounded.
- **DS-008 preserved result:** `Recursive file scan -> replace-only hub files -> imported V1 tree -> canonical semantic member target`. Physical residue can remain; semantic history is singular.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner:** `TeamAgentMemoryLayoutAppDataMigration`.
- **Chain:** `classify current roots -> enumerate non-root agents -> resolve paths -> lstat source/target -> choose fixed disposition -> mkdir parent + rename only for eligible item -> validate target/source state -> increment counters/capped examples`.
- **Why it matters:** this small loop is the entire historical transformation. It remains private inside one migration file because extracting a planner, relocator, journal, or generic filesystem framework would obscure rather than clarify this simple ownership.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path containment | DS-001, DS-002, DS-006 | Agent-memory layout | Normalize IDs and generate paths beneath memory root | Existing storage boundary | Hand-joined paths can drift/escape |
| Runtime/model choice | DS-001, DS-003 | AgentRun activation | Select provider adapter only | Runtime polymorphism | Runtime-specific scopes violate REQ-006 |
| Workspace/application/handoffs | DS-001 | Mixed construction | Preserve existing activation facts | Existing behavior | Scope refactor could accidentally change delegation/application semantics |
| V1 admission | DS-002, DS-006 | Classifier/catalog | Admit only validated current packages | Exact identity authority | Guessed residue mapping can cross-associate history |
| Bounded migration evidence | DS-006 | Migration/runner | Exact totals plus capped examples | Convention and scalable logs | One detail/path per agent grows unbounded |
| Trace formats/rotation | DS-003, DS-006 | Existing stores/older migrations | Preserve content/current formats | No schema change here | Per-file rewrite risks loss and duplicates work |
| Genuine-empty UI | DS-002, DS-004 | Projection/hydration | Preserve legitimate empty result | Approved control | UI workaround hides backend defect |
| Team Communication | DS-005 | Communication subsystem | Root-scoped messages | Independent healthy authority | Moving it with member data breaks AC-004 |
| Recovery scheduling | DS-006, DS-007 | Existing migration runner | Required startup attempt, ANYTIME manual execution, ledger, MANUAL_RETRY | Canonical convention and approved clickable retry | A custom readiness/journal/UI policy duplicates framework behavior |
| Memory Sync v1 retention | DS-006, DS-008 | Existing sync/import owners | Mirror stable files, no deletion, canonical imported semantic read | Explicit user approval for MP-001/MP-002 | Putting filter/delete/gate logic in the migration would over-engineer a separately owned transport |

## Ownership Boundaries

- `TeamRunPhysicalScope` is topology, not a filesystem DTO.
- `TeamRunContext` rejects root/non-root scope mismatch and is authoritative for live direct members.
- `TeamExecutionIndex` is the only stored/snapshot scope derivation owner.
- `AgentMemoryLayout` alone translates scope plus AgentRun ID into paths.
- `MixedSubTeamRunFactory` is the one live child-append boundary.
- The migration alone knows the affected flat source; normal services never check it.
- The migration uses the existing runner's required-on-startup plus `ANYTIME` scheduling/status API without changing `server-runtime.ts`, Settings, GraphQL migration status, or public recovery behavior.
- Memory Sync may observe the flat path only as an unchanged physical mirror. It must not become a second semantic reader or migration participant; imported exploration continues through V1 canonical location owners.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunContext.physicalScope` | Live scope validation/immutability | All direct member/task-agent handles | Logical-address walk or empty default | Strengthen scope/context constructor |
| `MixedSubTeamRunFactory` child methods | Append one child TeamRun ID | Configured handle/task-team registry | Caller builds ancestor array | Accept parent context explicitly |
| `TeamExecutionIndex.getTeamRunPhysicalScope` | Parent traversal/root exclusion/order | Root aggregate, location service, migration | Consumer `reverse().slice(1)` | Return tight domain scope |
| `AgentMemoryLayout` | Segment validation/containment-safe paths | Location and migration | Manual `path.join` from IDs | Extend narrow layout API only if needed |
| `TeamAgentMemoryLayoutAppDataMigration.execute` | Old-source classification, rename, bounded result | Migration runner only | Runtime calls migration or probes source | Keep private methods in definition |
| `TeamRunMigrationStateClassifier` | Current/predecessor/residue/invalid admission | New migration | Checking only for tree filename | Reuse current classifier |
| `MemorySyncService` / scanner / planner | Recursive v1 replace-only physical replication | Existing manual/background sync entries | Migration calls sync, filters scanner, emits tombstones, or gates sync | Preserve boundary unchanged; document/test approved outcome |
| Imported `TeamMemoryExplorerService` | V1-tree-derived semantic member targets | Imported Memory GraphQL queries | Enumerating flat residue as a second member target | Reuse existing canonical location services |

## Dependency Rules

1. `team-run-physical-scope.ts` has no memory, history, migration, backend, or transport dependency.
2. `TeamRunContext` and `TeamExecutionIndex` may depend on the scope type/builders.
3. Agent-memory may depend on the execution-domain scope; execution domain must not depend on agent-memory paths.
4. Mixed factories/handles may consume context and call memory location; they must not inspect stored trees or join paths.
5. Run-history location may depend on index plus layout; it must not encode ordering.
6. The migration may depend on classifier, index, scope, and layout; current runtime must not depend on migration-owned flat-source rules.
7. Existing runner remains generic; it must not gain directory-move logic or a migration-specific status shape. `ANYTIME` is required so current `MANUAL_RETRY`/`canRetry` semantics remain truthful and clickable.
8. Snapshot migrations may declare the new migration ID as prerequisite; the new migration must not invoke their conversion logic.
9. Frontend/GraphQL remain downstream of projection and do not depend on scope.
10. Runtime/model selection never participates in scope selection.
11. The migration must not depend on Memory Sync source/hub services. Memory Sync must not depend on the migration record or migration-owned flat-path classifier.
12. Imported semantic exploration remains dependent on V1 tree/location services, not the recursive sync scanner's physical file inventory.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `createRootTeamRunPhysicalScope(rootTeamRunId)` | Root physical scope | Normalize/freeze empty root-exclusive scope | Root TeamRun ID | No path knowledge |
| `createChildTeamRunPhysicalScope(parentScope, childTeamRunId)` | Child scope | Append one concrete TeamRun boundary | Parent scope + child TeamRun ID | Reject duplicate/root segment |
| `TeamRunContext` constructor / `physicalScope` | Live containing TeamRun | Validate scope matches current team | Scope + exact node/run ID | Root ID may remain derived getter |
| `TeamExecutionIndex.getTeamRunPhysicalScope(teamRunId)` | Stored TeamRun scope | Derive ordered root-exclusive chain | Concrete TeamRun ID in index | Uses existing `requireTeam` behavior |
| Configured-child factory method | Configured TeamRun | Inherit configured facts and derive child scope | Parent context + child node + activation mode | No ancestor-array input |
| Task-team factory method | Delegated TeamRun | Preserve task handoffs and derive child scope | Parent context + task node + task handoffs | Keep separate semantic method |
| `AgentMemoryLocationService.getTeamAgentRunLocation` | Team AgentRun location | Scope + AgentRun ID -> location DTO | Shared scope + AgentRun ID | No ancestry discovery |
| `TeamAgentMemoryLayoutAppDataMigration.execute` | Persisted layout transition | Deterministically classify/move/report all admitted candidates | Configured memory root via constructor | Required on startup, `ANYTIME`, V1 prerequisite, bounded details |
| Existing `runAppDataMigration(migrationId)` | Manual retry transport | Execute a retryable registered definition and return current record | Exact migration ID | Reused unchanged; runner decides whether execution is allowed |
| Existing `MemorySyncService.startManualSync/startSync` | Physical memory mirror | Recursively scan and send changed files as v1 replace operations | Configured source identity | Reused unchanged; no migration-aware filter/gate/delete behavior |
| Imported `TeamMemoryExplorerService` | Semantic imported team memory | Derive members from imported V1 tree and exact canonical locations | Imported source root + TeamRun/AgentRun IDs | Reused unchanged as the no-duplicate-current-run control |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Scope builders | Yes | Yes | Low | Normalize/freeze/root-exclude |
| Context scope | Yes | Yes | Low | Require; no default |
| Index scope query | Yes | Yes | Low | Remove consumer traversal |
| Configured child method | Yes | Yes | Low | Parent context input |
| Task-team method | Yes | Yes | Low | Preserve distinct handoff policy |
| Memory location method | Yes | Yes | Low | Type against shared scope |
| Layout migration | Yes | Yes | Low | Validated V1 identity and fixed source/target only |
| Memory Sync v1 entry | Yes | Yes | Low | Preserve physical mirror contract; do not add migration selectors |
| Imported team explorer | Yes | Yes | Low | Continue V1/canonical semantic selection |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Containing TeamRun lineage | `TeamRunPhysicalScope` | Yes | Low | Document root-exclusive semantics |
| Non-root path segments | `ancestorTeamRunIds` | Yes within existing contract | Medium because list ends at containing team relative to an AgentRun | Define next to type/context invariant |
| Cold topology query | `getTeamRunPhysicalScope` | Yes | Low | Avoid generic `getPath` |
| Migration owner | `TeamAgentMemoryLayoutAppDataMigration` | Yes | Low | Keep all simple relocation logic here |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Safe path joining | `AgentMemoryLayout` | Reuse | Already canonical/containment-safe | N/A |
| Valid current root classification | `TeamRunMigrationStateClassifier` | Reuse | Already separates validated V1 from residue/invalid | N/A |
| Exact configured/task ancestry | `TeamExecutionIndex` | Extend | Already owns every parent link | N/A |
| Live per-TeamRun invariant | `TeamRunContext` | Extend | Reaches every direct member | N/A |
| Tight shared scope | Team execution domain | Create New | Current memory-owned mutable shape is not authoritative topology | Memory subsystem is downstream |
| Startup scheduling/ledger/retry | Migration registry/runner | Reuse | Existing contract exactly matches convention | N/A |
| Directory relocation | One new migration definition | Create New | Specific known-source/current-target transform | No generic planner/relocator/journal is justified |
| Public/UI history | Existing projection/hydration | Reuse unchanged | Correct once path is fixed | N/A |
| Physical mirror / no-delete retention | Existing Memory Sync v1 scanner/planner/service/hub | Reuse unchanged | MP-001/MP-002 are real production paths, but the user approved their current behavior; no new mechanism is needed | N/A |
| Imported semantic canonical selection | Existing imported `TeamMemoryExplorerService` and location owners | Reuse unchanged | Independently proves retained physical files are not competing current runs | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team execution domain | Scope semantics/context/index query | DS-001, DS-002 | Context/index | Extend | No filesystem knowledge |
| Mixed backend | Root/child scope construction, leaf consume | DS-001, DS-003 | Factories/handles | Extend | Runtime-independent |
| Agent memory | Safe scope-to-path composition | DS-001–DS-003 | Location/layout | Reuse/alias | Standalone unchanged |
| Run history | Active/stored lookup/projection | DS-002, DS-004 | Location/projection | Extend to call index | No fallback |
| App-data migrations | One old-to-current directory move and bounded results | DS-006 | New migration definition | Extend with one file | Existing runner unchanged |
| Memory Sync / imported corpus | Recursive replace-only mirror, no-delete retention, canonical imported semantic selection | DS-008 | Existing sync/import owners | Reuse unchanged | Only durable docs/tests are updated; no production sync source change |
| Team Communication | Root messages | DS-005 | Existing service | Reuse unchanged | Control |
| Web | Existing hydration/presentation | DS-004, DS-005 | Existing services/components | Reuse unchanged | Browser evidence only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `team-run-physical-scope.ts` | Team execution | Domain value | Type/normalize/root/child builders | One reusable invariant | Defines it |
| `team-run-context.ts` | Team execution | Live context | Own/validate scope | Existing context responsibility | Yes |
| `team-execution-index.ts` | Team execution | Tree index | Derive exact scope | Existing ancestry owner | Yes |
| Mixed factory/handle files | Mixed backend | Construction/activation | Root create, child append, direct consume | Existing lifecycle boundaries | Yes |
| Agent-memory location files | Agent memory | Location | Alias/consume scope, join path | Existing location owner | Yes |
| Root/history consumers | Execution/run history | Current/cold lookup | Replace duplicate derivation | Existing output responsibilities | Yes |
| `team-agent-memory-layout-app-data-migration.ts` | Migrations | Complete transition owner | Classify, enumerate, rename, count, cap diagnostics | Simple cohesive migration follows local single-file convention | Uses classifier/index/layout |
| Registry/snapshot definitions | Migrations | Ordering | Register/prerequisites | Existing definitions | Uses migration ID |
| Existing Memory Sync/imported explorer sources | Memory Sync / agent memory | Preserved production boundaries | No source modification; explicit DS-008 oracle | Prevents migration/sync coupling | Existing v1 types/location owners |
| Focused tests | Tests | Contract evidence | Scope, recursion, deterministic state table, bounded logs, rerun, sync-visible retention, canonical imported read | Mirrors production boundaries | Yes |
| Migration and Memory Sync docs | Durable docs | Approved product contract | Disclose semantic-current versus sync-visible residue and no-delete retention | Resolves `ARCH-RG-001` without new machinery | Existing terminology |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Root plus ordered non-root TeamRun chain | `team-run-physical-scope.ts` | Team execution | Live/index/memory/history/migration share one meaning | Yes | Yes: memory scope becomes alias | Filesystem or logical-address DTO |
| Reverse/root-trim ancestry recipe | Index method | Team execution | Multiple consumers need same result | Yes | Yes | Free function over unvalidated arrays |
| Migration physical disposition | Private type in migration file | Migration | Needed only by one owner/tests | Yes | Yes | Exported generic move framework |
| Bounded reason counter/examples | Private collector in migration file | Migration | One result/log concern | Yes | Yes | Cross-migration framework redesign |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunPhysicalScope` | Yes | Yes | Low | Freeze object/array; distinct IDs; root excluded |
| `TeamRunContext` root/scope | Yes | Yes if root ID derived | Low | Store scope once; optional getter only |
| `AgentMemoryScope` | Yes as alias | Yes | Low | Do not redeclare mutable fields |
| Migration disposition | Yes | Yes | Low | Keep private closed union in migration file |
| Migration counters/details | Yes | Yes | Low | Counters authoritative; details capped diagnostic examples only |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-physical-scope.ts` | Team execution | Domain value | Immutable scope/builders | One tight invariant | Defines it |
| `.../domain/team-run-context.ts` | Team execution | Live containing TeamRun | Require/validate scope | Existing context | Yes |
| `.../services/team-execution-index.ts` | Team execution | Validated tree index | Add scope query | Existing ancestry owner | Yes |
| `.../domain/root-team-run.ts` | Team execution | Root aggregate | Use index scope | Existing result DTO | Yes |
| `.../backends/mixed/mixed-team-run-backend-factory.ts` | Mixed backend | Root/context construction | Root scope and scoped builder | Existing entry | Yes |
| `.../backends/mixed/mixed-sub-team-run-factory.ts` | Mixed backend | Child construction | Append child scope | Existing materializer | Yes |
| `.../members/mixed-sub-team-member-handle.ts` | Mixed backend | Configured caller | Pass parent context | Existing boundary | Yes |
| `.../members/mixed-task-team-execution-registry.ts` | Mixed backend | Task-team caller | Pass parent context/task handoffs | Existing boundary | Yes |
| `.../members/mixed-agent-member-handle.ts` | Mixed backend | Agent activation | Consume context scope | Defect site | Yes |
| `.../agent-memory/domain/agent-memory-location.ts` | Agent memory | Location types | Alias shared scope | Avoid parallel type | Yes |
| `.../agent-memory/services/agent-memory-location-service.ts` | Agent memory | Location composition | Consume shared scope | Existing service | Yes |
| `.../run-history/services/team-run-execution-tree-location-service.ts` | Run history | Active/stored locator | Use index scope | Existing lookup | Yes |
| `.../app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts` | Migrations | Entire migration | ID/definition/classification/rename/bounded summary | Proportionate single owner and local convention | Classifier/index/layout |
| `.../app-data-migrations/app-data-migration-registry.ts` | Migrations | Registry | Register after V1 | Existing order owner | New definition |
| `.../remove-external-runtime-working-context-snapshots-migration.ts` | Migrations | Existing definition | Declare layout prerequisite | Canonical-location dependency | Migration ID |
| `.../migrate-native-working-context-snapshots-v5-migration.ts` | Migrations | Existing definition | Declare layout prerequisite | Canonical-location dependency | Migration ID |
| `.../memory-sync/source/local-memory-export-scanner.ts`; `memory-file-change-planner.ts`; `memory-sync-service.ts` | Memory Sync | Preserved v1 physical mirror | No production modification; DS-008/test oracle | Existing owners already implement approved behavior | Existing types |
| `.../agent-memory/services/team-memory-explorer-service.ts`; `team-memory-member-target-builder.ts` | Agent memory/imported explorer | Preserved semantic reader | No production modification; prove canonical imported selection | Existing owners prevent semantic duplication | Index/location |
| Focused test files in target mapping | Tests | Contract evidence | Domain/live/migration/API/browser and Memory Sync/imported-reader outcomes | Existing suite placement | Yes |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `README.md` | Durable migration policy | Delivery documentation | Approved mirror-visible bounded-warning distinction without weakening missing-target failure | Governing contract needs explicit MP-001/MP-002 disposition | N/A |
| `autobyteus-server-ts/docs/features/memory_sync.md`; `autobyteus-web/docs/memory.md` | Durable feature docs | Delivery documentation | Dual physical path/pre-upgrade retention and canonical semantic read | Existing docs own v1 no-delete behavior | N/A |

## Applied Patterns (If Any)

- Immutable context value.
- Parent-to-child scope builder.
- Derived index query.
- Registered startup migration boundary.
- Deterministic disposition table.
- Aggregate counters with capped diagnostic examples.
- Existing runner retry instead of a bespoke recovery state machine.
- Explicitly accepted limitation at an existing subsystem boundary instead of speculative cross-subsystem repair.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-physical-scope.ts` | File new | Team execution domain | Scope type/builders | Topology fact | Filesystem/logical-address traversal |
| `.../domain/team-run-context.ts` | File modify | Live TeamRun | Own/validate scope | Direct-member context | Optional/default nested scope |
| `.../services/team-execution-index.ts` | File modify | Tree index | Single scope query | Parent graph owner | Memory paths |
| `.../domain/root-team-run.ts` | File modify | Root aggregate | Consume index query | Removes duplication | Traversal recipe |
| `.../backends/mixed/mixed-team-run-backend-factory.ts` | File modify | Root/context construction | Root scope | Existing entry | Migration knowledge |
| `.../backends/mixed/mixed-sub-team-run-factory.ts` | File modify | Child construction | Parent->child scope | Existing materializer | Caller arrays |
| `.../backends/mixed/members/mixed-sub-team-member-handle.ts` | File modify | Configured child caller | Pass parent context | Existing call site | Scope derivation |
| `.../backends/mixed/members/mixed-task-team-execution-registry.ts` | File modify | Task-team caller | Pass parent context, retain handoffs | Existing call site | Scope array logic |
| `.../backends/mixed/members/mixed-agent-member-handle.ts` | File modify | Agent activation | Use context scope | Defect site | Empty substitution/address walk |
| `.../agent-memory/domain/agent-memory-location.ts` | File modify | Location DTO | Alias shared scope | Avoid duplicate shape | Separate mutable scope |
| `.../agent-memory/services/agent-memory-location-service.ts` | File modify | Location composer | Consume scope | Existing service | Tree lookup/flat probe |
| `.../run-history/services/team-run-execution-tree-location-service.ts` | File modify | Stored/active locator | Use index scope | Current reader | Duplicate derivation |
| `.../app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts` | File new | App-data migration | Entire simple directory transition and bounded result | Existing migrations are single cohesive definitions | Runtime fallback, journal, backup, fsync protocol, generic mover framework |
| `.../app-data-migrations/app-data-migration-registry.ts` | File modify | Registry | Register/order migration | Existing owner | Item logic |
| Two working-context migration definitions | Files modify | Existing migrations | Add prerequisite ID | Exact canonical location dependency | Re-execution/reset logic |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-physical-scope.test.ts` | File new | Domain tests | Root/child/deep/invalid/immutable | Direct invariant | Runtime mocks |
| `.../mixed-agent-member-handle-memory-invariant.test.ts` | File modify | Writer tests | Fix fixture; root/nested/deep | Existing contract | Defective expectation |
| Existing mixed factory/subteam/task-agent test files | Files modify | Runtime construction tests | Configured/task scope propagation | Existing suites | Runtime-specific branches |
| `.../tests/unit/agent-memory/agent-memory-location-service.test.ts` | File modify | Location tests | Root/nested/task/deep isolation | Existing reader contract | Fallback |
| `.../tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts` | File new | Migration tests | Fixed state table, whole-dir bytes, rerun, bounded diagnostics/prerequisite | One migration owner | Shutdown/kernel/syscall matrices |
| Existing Memory Sync unit/API/E2E tests selected after coverage investigation | Files modify if warranted | Memory Sync/imported corpus | Both-path export, pre-upgrade flat retention, canonical imported semantic read | Real MP-001/MP-002 paths | Delete/tombstone/filter/gate expectations |
| Existing server E2E files selected after coverage investigation | Files modify if warranted | API/E2E | Fresh nested/task writes, cold projection, controls | Realistic boundaries | Unit mechanics duplication |
| `autobyteus-server-ts/docs/modules/run_history.md` | File modify if impact confirmed | Durable docs | Scope owner/startup migration | Existing canonical layout doc | Recovery internals |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `README.md` | Files modify in delivery | Durable migration policy | Explicit approved mirror-visible warning/no-delete distinction | Align governing policy to approved production path | Missing-target warning or generic exception without canonical semantic validation |
| `autobyteus-server-ts/docs/features/memory_sync.md`; `autobyteus-web/docs/memory.md` | Files modify in delivery | Memory Sync docs | Disclose both-path/pre-upgrade retention and canonical imported read | Existing feature contract | Promise of delete propagation or cleanup |

No `server-runtime.ts`, Memory Sync scanner/planner/service/hub, imported explorer, GraphQL, migration store, Settings component, or localization production modification is part of SR-004. The migration remains one simple definition. Durable coverage edits remain subject to `api_e2e_engineer`'s mandatory coverage investigation; durable documentation is finalized by `delivery_engineer` against the integrated state.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Scope/context are topology facts |
| `src/agent-team-execution/services` | Main-Line Domain-Control | Yes | Low | Index owns derived parent queries |
| `src/agent-team-execution/backends/mixed` | Main-Line Domain-Control | Yes | Low | Existing runtime construction depth |
| `src/agent-memory` | Persistence-Provider | Yes | Low | Physical location composition |
| `src/run-history/services` | Main-Line Domain-Control | Yes | Low | Lookup/projection composition |
| `src/app-data-migrations/migrations` | Off-Spine Concern | Yes | Low | One file matches existing convention and simple transformation; no new folder needed |
| `src/memory-sync` | Off-Spine Concern | Yes | Low | Existing physical mirror remains unchanged and outside migration ownership |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Layout topology | `R/A`; `R/T1/B`; `R/T1/T2/C` | Every AgentRun under `R/<agent>` | Physical ownership mirrors concrete TeamRuns |
| Task identity | Task agent delegated by `T1`: `R/T1/D`; task team `Q` member: `R/T1/Q/E` | Pseudo-team for task agent or omitted task-team boundary | Captures universal delegation correctly |
| Live construction | `createChildTeamRunPhysicalScope(parent.physicalScope, child.teamRunId)` in child factory | Leaf walks address or gets arbitrary array | Append one exact boundary once |
| Cold scope | `index.getTeamRunPhysicalScope(agent.containingTeamRunId)` | Repeated `reverse().slice(1)` | One policy owner |
| Eligible migration | source dir + target missing -> `mkdir(parent); rename(source,target); validate` | Copy every file, backup, fsync parents, journal phases | Convention calls for smallest deterministic transform |
| Ordinary rerun | First attempt leaves either source or target; next selected attempt classifies and moves/skips | Separate Docker-stop/power-loss/kernel/syscall state machines | Abrupt termination is one incomplete-attempt category |
| Move cannot establish target | source remains + target missing -> truthful `FAILED`; unrelated application capabilities start; existing Settings Retry reruns the `ANYTIME` definition | Label missing current data as warning merely because startup stays online | Migration result truth and application availability are separate contracts |
| Conflict | source dir + real canonical target -> preserve both, count bounded sync-visible warning; semantic local/imported readers keep exact target; v1 sync may mirror both | Merge, newest-wins, source fallback, unbounded log, filter/delete/gate redesign | Approved production behavior distinguishes a singular semantic target from retained physical mirror data |
| Pre-upgrade sync | flat path synced -> local rename -> canonical path synced; hub may retain both because v1 sends no delete | Add tombstones/remote cleanup solely for this migration | Existing documented no-delete limitation is explicitly accepted and does not complicate the move |
| Diagnostics | exact counters + at most five sorted examples/reason | One log detail per AgentRun | Convention requires bounded evidence |

```ts
const root = createRootTeamRunPhysicalScope("R");       // ancestors: []
const t1 = createChildTeamRunPhysicalScope(root, "T1"); // ancestors: ["T1"]
const t2 = createChildTeamRunPhysicalScope(t1, "T2");   // ancestors: ["T1", "T2"]
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Canonical-then-flat reader | Immediate history recovery | Rejected | Startup rename; runtime remains exact canonical-only |
| Runtime-specific writer scopes | Could localize change | Rejected | Shared context scope before runtime selection |
| Frontend empty-as-error workaround | Symptom is blank UI | Rejected | Correct backend storage/read invariant |
| Copy plus retain source/backup | Appears safer for shutdown stories | Rejected | Target-absent atomic rename rewrites no bytes; conflict is not mutated |
| Journal/post-rename-indeterminate state | Would model mechanical timing | Rejected | Normal stable attempt plus ordinary runner rerun/idempotence |
| Global startup readiness gate | Could hide every operational failure | Rejected | Existing migration runner/status/recovery contract; no new policy for unsupported mechanical premises |
| Merge/compare/prefer conflicting contents | Could choose one history | Rejected | Canonical target stays semantic current; preserve sync-visible flat source with bounded warning |
| Memory Sync scanner filtering | Could hide flat residue from later sync | Rejected | Preserve recursive v1 mirror; canonical imported reader remains semantic authority |
| Memory Sync delete/tombstone or remote cleanup | Could remove pre-upgrade hub residue | Rejected | Preserve documented v1 no-delete behavior; disclose bounded physical retention |
| Gate Memory Sync on migration status | Could prevent both paths from being exported | Rejected | User approved sync availability; migration and sync remain separate owners |
| Revive pre-June flat layout | Older writer/reader agreed | Rejected | Keep released concrete TeamRun hierarchy |
| Optional context scope/default `[]` | Reduces compile edits | Rejected | Required invariant; no compatibility wrapper |

## Derived Layering (If Useful)

- Live: `TeamRun lifecycle -> execution-domain scope -> agent-memory path -> AgentRun stores`.
- Cold: `GraphQL/projection -> V1 execution index/scope -> agent-memory path -> current raw memory`.
- Transition: `startup runner -> migration-owned old source classification/rename -> current memory`, after which normal code knows only current topology.
- Physical mirror: `Memory Sync scanner -> replace-only hub files -> imported V1 semantic reader`; physical residue may persist, but semantic location remains canonical.

## Change / Refactor Sequence

1. Add immutable scope type/builders and domain tests.
2. Require scope in `TeamRunContext`; derive root ID from it where practical; update all constructors without optional fallback.
3. Add index scope query; move root aggregate/history locator to it; alias memory scope to the domain type.
4. Refactor mixed root/child construction to root-create/child-append; preserve configured/task handoff/application-binding semantics.
5. Replace leaf empty scope; fix stale writer-test seam; cover root/configured/task-agent/task-team/deep recursion and runtime independence.
6. Add the single-file migration with deterministic state table, whole-directory rename, explicit counters, capped reason examples, and ordinary error-to-`FAILED` behavior.
7. Register it after V1 with `requiredOnStartup: true` and `executionPolicy: "ANYTIME"`; add prerequisites to not-yet-run canonical-location snapshot migrations. Do not modify `server-runtime.ts`, the public recovery path, or existing records.
8. Test full directory inventory/bytes before/after, source absent/target current, canonical no-op, sync-visible conflict warning, invalid target failure, exact counts/capped diagnostics, non-blocking startup disposition, existing `MANUAL_RETRY`/`canRetry`, and one manual rerun/idempotence scenario. Do not add mechanical-failure matrices.
9. Validate the existing MP-001/MP-002 production paths without changing them: both local paths are eligible for replace-only export; a pre-upgrade flat hub import may remain; imported semantic exploration resolves only the canonical V1 target. Do not add filtering, deletion, cleanup, or gating.
10. Validate normal projection/API/browser cold reopen plus direct-root and Team Communication controls; coverage engineer decides durable E2E edits.
11. Remove duplicate ancestry recipes, defective expectations, and every SR-001-only migration mechanism before implementation review. Delivery updates the governing migration and Memory Sync docs with the approved limitation.

No temporary dual read/write is allowed. Migration fixtures use isolated temporary memory roots, never the user's live volume.

## Key Tradeoffs

- Required scope causes more constructor edits than a leaf patch but makes omission impossible across recursion.
- Domain scope keeps topology independent of filesystem; the layout remains one path owner.
- One migration file is less abstract than planner/relocator layers and clearer for one fixed rename transform.
- Atomic rename assumes normal same-filesystem operation, as the convention permits; it avoids content-copy cost and recovery states.
- `FAILED` is used when the move cannot establish the canonical target even though startup remains online. This preserves truthful migration status while `ANYTIME` supplies the user-requested clickable retry through existing code.
- A source+valid-target conflict remains a warning because semantic local/imported owners independently have a structurally valid target and never choose the flat source. The tradeoff is explicit: unchanged Memory Sync v1 may mirror or retain both physical paths, consuming storage, but the migration stays simple and preserves evidence without inventing sync machinery.
- Bounded diagnostics sacrifice exhaustive per-item logs but preserve exact aggregate truth and actionable capped examples.

## Risks

- Making scope required may expose hidden constructors; compilation must find them rather than adding a default.
- Configured and task-team construction differ in handoff/application-binding inputs; keep separate methods and change only scope.
- A valid canonical target beside a flat source may contain different history. This is intentionally not resolved: target remains semantic current, source is preserved and sync-visible, and warning evidence is bounded.
- Memory Sync v1 may export both local conflict paths or retain a pre-upgrade flat import after local relocation. This approved limitation can retain duplicate bytes on a trusted hub, but imported V1 exploration remains canonical and no second current run is presented. Delete propagation/cleanup is separate future scope.
- Existing writer test fails before its assertion due stale activation fixture; repair the fixture and record baseline truthfully.
- Previously completed dependent migrations are not rerun. This migration changes location only; chronological reachability shows affected installations already ran older format migrations before producing defective data.
- If the layout migration fails, not-yet-run dependent canonical-location migrations remain prerequisite-blocked for that attempt. After the user retries the layout migration successfully, those generic `ANYTIME` definitions can run through their existing manual action or on the next startup; no record reset or special cascade is added.
- Large volumes create linear candidate counts; diagnostics remain bounded even when counters are large.
- Operating-prerequisite violations may return `FAILED`. They do not justify a lock, backup, power-loss journal, or special runtime fallback in this scope.

## Guidance For Implementation

- Keep `physicalScope` required/frozen. Never default to `[]` outside the root builder.
- Validate topology semantics in the scope builder/context; keep filesystem containment in `AgentMemoryLayout`.
- Do not let leaf handles query trees/managers or infer scope from logical addresses.
- Keep configured-child and task-team public methods separate if their non-memory semantics differ; share only private child construction.
- Implement migration in one focused file. Private helpers/types are acceptable; do not create generic planner/relocator/journal modules.
- Use `TeamRunMigrationStateClassifier`, `TeamExecutionIndex`, and `AgentMemoryLayout`; do not hand-join paths or infer identity from names.
- For eligible items, create canonical parent and call same-filesystem `fs.rename` once, then validate target directory/source absence. Do not copy, merge, overwrite, hash-compare, back up, quarantine, `fsync` directories, or model post-rename syscall states.
- Treat one writer/stable process/power/device/permissions/normal filesystem as assumptions. Test one ordinary rerun/idempotence case, not Docker-stop/power-loss/kernel/device/syscall variants.
- Build counters independently of retained details. Keep no more than five sorted relative-path examples per reason and one aggregate detail per reason. Never serialize file contents or unbounded candidate arrays.
- Return `SUCCEEDED_WITH_WARNINGS` only when a real canonical target exists. Name preserved residue as sync-visible, not inert: semantic local/imported readers stay canonical, while existing Memory Sync v1 may mirror/retain both paths under the explicitly approved no-delete limitation. If a required canonical target is missing/invalid and cannot be established, return `FAILED`.
- Do not modify or call Memory Sync scanner/planner/service/hub/imported explorer code from the migration. Add no V1 filtering, delete/tombstone operation, remote cleanup, or migration-status sync gate.
- Coverage for MP-001/MP-002 must prove the preserved production behavior rather than invent mechanical failures: both-path replace eligibility, no-delete remote retention, and one canonical imported semantic member result.
- Keep `requiredOnStartup: true` and set `executionPolicy: "ANYTIME"`; rely on the current runner for automatic startup selection, truthful record status, `MANUAL_RETRY`, and `canRetry`. Reuse the existing Settings Retry behavior unchanged; do not add a server-runtime gate or new UI policy.
- Test/migrate only isolated fixtures, never `/Users/normy/.autobyteus` or the Docker production volume.
- Expect no frontend production change. Browser validation is evidence, not a reason to add UI logic.
