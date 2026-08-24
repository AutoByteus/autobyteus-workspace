# Design Spec

## Current-State Read

This is a regression repair, not a new memory-layout choice. The released physical contract already mirrors the concrete TeamRun topology:

`memory/agent_teams/<rootTeamRunId>/<ordered root-exclusive TeamRun IDs...>/<agentRunId>/`

Cold readers honor that contract. `TeamRunExecutionTreeLocationService` builds a `TeamExecutionIndex` from a live or stored V1 execution tree, derives the containing TeamRun ancestry, asks `AgentMemoryLayout` for the exact member directory, and passes that `memoryDir` to history, Event Monitor, file-change, context-file, snapshot, and external-reply consumers. These current owners use exact canonical paths; they do not enumerate or probe a flat nested-member fallback.

The live mixed-team writer does not honor the contract. `TeamRunContext` carries root/current TeamRun identities but no immutable physical scope. `MixedAgentMemberHandle` therefore substitutes `ancestorTeamRunIds: []`, which is correct only for a root TeamRun. Configured child teams and delegated task teams are recursively materialized through `MixedSubTeamRunFactory`, but their parent context is unpacked into partial fields and no path invariant is propagated. A delegated task agent reuses its owning context, so it is affected whenever that containing TeamRun is nested. Runtime/model selection occurs below this shared path and is not causal.

`TeamExecutionIndex` already owns the exact configured/task parent graph, but `RootTeamRun.getAgentExecution()` and `TeamRunExecutionTreeLocationService.toLocation()` independently repeat the same reverse/root-trim/map derivation. That duplicated policy contributed to writer/read drift.

Persisted data is mixed: affected current V1 AgentRuns have complete directories at `<root>/<agentRunId>/`; other nested AgentRuns are canonical; unmaterialized AgentRuns have no directory. Root Team Communication is separately stored and healthy. The physical correction is a whole-directory relocation; no raw-event or snapshot schema transformation is required.

`ARCH-REV-001` found one omitted supported observer. Memory Sync v1 recursively scans `memory/agent_teams`, emits replace-only operations, and propagates no deletes. It can therefore export both paths in a source-plus-canonical conflict, or retain a pre-upgrade flat import after a clean local relocation. This does not create a second semantic current reader: local and imported `TeamMemoryExplorerService` use the V1 execution tree and exact canonical member target. The user explicitly approved preserving/documenting this existing v1 physical-retention behavior instead of adding filtering, tombstones, remote cleanup, or a sync gate.

Post-implementation API/E2E exposed another pre-existing boundary on the same approved production path. Normal cold package recovery converts formerly active/awaiting delegated work to `interrupted` and assigns `settledAt`. The repaired backend then returns the exact task AgentRun's 4 conversation entries, 2 activities, 4 Event Monitor events, non-null last activity, and byte-identical raw trace. Frontend hydration creates that exact context, but `teamExecutionTreeSelectors.projectNavigationRows()` unconditionally excludes every `task.settled_at` execution, including a task-Team and all descendants. `TeamExecutionViewState.focusAgent()` uses the same projection as its admissibility set, so `teamRunOpenCoordinator` rejects the otherwise valid historical selection as `TEAM_AGENT_RUN_NOT_VISIBLE`. `CRR-002`/`CR-001` classifies this as Design Impact because SR-004 incorrectly ended DS-004 at hydration and said Web would remain unchanged.

The existing frontend boundary can absorb a narrow correction. `TeamExecutionViewState` already owns authoritative `rootActive`, exact Agent contexts, focus, and all navigation access. `projectNavigationRows()` is a pure projection owner. The target derives navigation purpose from `rootActive` rather than storing a second flag: active views preserve the current settled-task exclusion; inactive historical views include settled task Agent/task-Team executions already present in the V1 tree. `collectLiveExecutionAgents()`, task repair/settlement, stream membership, stream connection, and renderer contracts remain unchanged.

The migration design is governed by:

- `autobyteus-server-ts/README.md`, section **Production migration practice**; and
- `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`.

Those conventions make one writer, a stable process/power/device, sufficient permissions, readable/writable same-filesystem storage, and normal filesystem behavior prerequisites for a migration attempt. They require one deterministic known-source-to-fixed-target transform, ordinary runner retry/idempotence, forward-only runtime code, final-current-state status classification, and bounded diagnostics. They explicitly reject bespoke shutdown/power-loss journals, backup copies, syscall-failure state machines, exhaustive mechanical-failure matrices, and unbounded warning evidence. SR-001's directory-`fsync`, post-rename-indeterminate, global listener-gate, and multi-file planner/relocator proposal was superseded by SR-002. SR-003 replaced SR-002's startup-only recovery with required-on-startup `ANYTIME`. SR-004 resolved `ARCH-RG-001` by explicitly classifying the already-documented Memory Sync v1 no-delete mirror as an approved bounded nonfatal observer when semantic current readers have an independently valid canonical target. SR-005 preserved all migration and Memory Sync decisions and added only the missing historical navigation/focus spine required by `CR-001`. SR-006 added the user's first two-flow coverage map. This SR-007 package supersedes only that map with the final three-flow team-message/direct-message/delegation mandate and per-flow cold continuation, without changing either production design.

Exact reproduction, history, and source evidence remain authoritative in `investigation-notes.md`, `investigation-evidence/nested-team-restart-reproduction.md`, and `api-e2e-evidence/real-classroom/cold-task-browser-failure-analysis.md`.

## Intended Change

1. Introduce one immutable `TeamRunPhysicalScope` owned by the TeamRun execution domain: root TeamRun ID plus the ordered root-exclusive TeamRun chain through the containing TeamRun.
2. Make every `TeamRunContext` require and validate that scope. Root construction creates an empty chain; configured-child and task-team construction append exactly their concrete child TeamRun ID from the parent scope.
3. Make every direct AgentRun consume `teamContext.physicalScope`. A delegated task agent adds no TeamRun directory; a delegated task team does.
4. Make `TeamExecutionIndex` the single tree-derived scope authority used by cold readers, root execution lookup, and migration planning.
5. Add one required-on-startup app-data migration with `executionPolicy: "ANYTIME"`; it uses validated V1 topology and performs one deterministic whole-directory `rename` for each unambiguous affected AgentRun.
6. Let the existing runner own startup scheduling, ledger, truthful status, and manual retry. An item-level move failure returns `FAILED` but does not abort application startup; the existing `MANUAL_RETRY` / `canRetry` contract enables the current Settings Retry button. Do not add a migration-specific server gate, journal, backup/quarantine, `fsync` protocol, or mechanical-failure state machine.
7. When both a real flat source and independently valid canonical target exist, preserve both and return a bounded `SUCCEEDED_WITH_WARNINGS` disposition named as sync-visible residue. Preserve Memory Sync v1's recursive replace-only/no-delete behavior unchanged; local/imported semantic readers remain canonical.
8. Keep runtime readers/writers canonical-only. Preserve direct-root/standalone paths, Team Communication, GraphQL DTOs, raw-event schemas, runtime/model independence, genuine-empty behavior, and Memory Sync availability. Document the approved v1 retention limitation; add no filter, tombstone/delete protocol, remote cleanup, sync gate, or new visual UI.
9. Extend the existing frontend execution-view boundary with purpose-aware navigation derived from authoritative root activity. While a TeamRun is active, preserve current live-only exclusion and focus repair for settled tasks. While it is inactive/historical, project settled task Agents, task Teams, their members, and recursively nested task executions, allowing normal history-open and workspace indexing to focus the exact hydrated AgentRun. Do not change cold recovery, task status, stream membership, resume behavior, or component rendering contracts.
10. Validate three independent real Nested Classroom flows: `NTH-LIVE-002A` uses `send_message_to` to the `/StudentStudyGroup` team address, `NTH-LIVE-002B` separately uses `send_message_to` directly to `/StudentStudyGroup/student_one`, and `NTH-LIVE-002C` separately uses `delegate_task` to `/StudentStudyGroup`. Each distinct run crosses a real cold restart, reloads exact route/task history, and then performs a new same-route/tool supported interaction. Never allow one route/tool flow to satisfy another. Fixture-only instruction/handoff-rule adjustments are allowed; production behavior is not changed for test accommodation.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–REQ-003; AC-001, AC-002, AC-006, AC-007, AC-011 | Cold reopen/select an exact nested member after server/container restart | Investigation BEH-001; original browser/GraphQL/missing-path evidence; post-repair `CRR-002` and cold task browser analysis prove non-empty backend data plus settled-task navigation rejection | Existing queries read the canonical traces; inactive historical navigation retains settled delegated execution rows and exact focus reaches the hydrated context; a truly trace-empty run keeps the existing empty result | Workspace history selection -> cold hydration/projection -> purpose-aware historical rows/index -> exact focus -> existing conversation/Activity/Event Monitor; DS-002, DS-004, DS-009 |
| BEH-002 | System | REQ-001, REQ-003, REQ-006; AC-001–AC-003, AC-007, AC-010 | Activate a configured member, task agent, or task-team member inside a concrete TeamRun | Investigation BEH-002; writer source; Codex and AutoByteus flat traces | All live execution kinds consume one exact immutable containing-TeamRun scope, independent of runtime/model | TeamRun creation/materialization -> context scope -> member activation -> memory location -> AgentRun stores; DS-001, DS-003 |
| BEH-003 | User | REQ-004; AC-003, AC-011 | Cold reopen a direct-root member | Investigation BEH-003; controls returned 3/1 and 13/5 | Preserve root-empty scope, direct physical path, and projection behavior | Root context -> direct AgentRun path -> current cold projection; DS-001, DS-002 |
| BEH-004 | User | REQ-004, REQ-007; AC-004, AC-017 | Teacher separately sends ordinary messages to the nested team address and directly to Student One; each recipient receives them; user inspects Team Communication before/after restart and sends a new same-route message afterward | Investigation BEH-004; affected root returned 6 messages/references; user-mandated `NTH-LIVE-002A/B/C` split | Preserve both nested ordinary routes and exact root-scoped Team Communication sender/recipient/content/order/timestamp/reference data without migration coupling. Delegation remains independently validated | Separate Teacher prompts -> exact `send_message_to` route -> exact nested recipient -> Team Communication store/live view -> cold query/UI -> new same-route message; DS-005 |
| BEH-005 | Operational | REQ-005; AC-005, AC-006, AC-008, AC-009, AC-012–AC-014 | Start an upgraded node containing current V1 runs written by the defective writer, or click Retry for its nonterminal record | Investigation BEH-005; scan found flat, canonical, and absent states; migration runner/API/Settings recovery evidence; canonical convention | Deterministically rename every unambiguous complete flat directory; preserve/report source+valid-target conflicts as bounded warnings; truthful move failure remains non-blocking and manually retryable; every rerun is idempotent | Startup runner -> migration record -> normal app; Settings Retry -> existing mutation/runner -> same migration; DS-006, DS-007 |
| BEH-006 | User / Operational | REQ-008; AC-015, AC-016 | Click Nodes -> Memory Sync -> Sync now before and/or after upgrade, or run enabled background sync | Investigation BEH-006; `ARCH-RG-001` MP-001/MP-002; scanner/planner/docs; imported explorer canonical-path evidence | Preserve v1 recursive replace-only/no-delete behavior. Both physical paths may be mirrored/retained, but semantic local/imported reads use only the canonical V1 target; warning is bounded and disclosed; application/sync remain available | Sync now/background worker -> scanner -> replace planner -> hub import; imported explorer -> V1 tree -> canonical target; DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/nested-team-restart-reproduction.md` | Browser, GraphQL, filesystem, log, restart, runtime/model, and stored-population evidence | REQ-001–REQ-006; AC-001–AC-012 | Establishes the defect, controls, misplaced/canonical paths, and whole-directory unit | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/root-member-history-control.png` | Healthy direct-root browser control | REQ-004; AC-003 | Locks preserved root behavior | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/affected-codex-nested-member-post-restart.png` | Existing Codex/GPT-5.6 failure | REQ-001, REQ-002, REQ-006; AC-001, AC-010 | Confirms configured nested false empty | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/controlled-autobyteus-nested-member-post-restart.png` | Controlled AutoByteus/DeepSeek task-team failure | REQ-001–REQ-003, REQ-006, REQ-007; AC-002, AC-010, AC-012 | Confirms recursive task-team/runtime-independent scope | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/cold-task-browser-failure-analysis.md` | Post-repair cold task browser/API/byte failure analysis | REQ-002, REQ-007; AC-002, AC-012 | Establishes the missing historical navigation/focus path and proves backend scope/migration correctness | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-coverage-investigation.md` | User-mandated next-round live coverage authority | REQ-004, REQ-007; AC-004, AC-012, AC-017 | Defines superseding independent `NTH-LIVE-002A/B/C`, exact per-route/task evidence, distinct pre/post-restart markers/runs, cold reload and continuation, non-substitution, and permitted fixture changes | Intended-coverage supplement; explicitly user approved |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_f69ba7836a55__image.png` | Original department topology and Team panel | REQ-004; AC-004 | Confirms hierarchy and independent Team messages | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_57a57720cadc__image.png` | Remote-node context | REQ-002; AC-001 | Establishes requested node 8001 | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_26ddbd968b85__image.png` | Original Team messages/reference files | REQ-004; AC-004 | Supports Team Communication preservation | Retained evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_73e4b305a940__image.png` | Earlier nested-classroom false empty | REQ-001–REQ-003; AC-001, AC-002 | Historical symptom context; controlled reproduction supplies causality | Retained evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with targeted invariant refactor and persisted-layout repair.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, compounded by `Duplicated Policy Or Coordination` and `Shared Structure Looseness`. `CR-001` adds a second boundary issue: live execution visibility is applied as historical discoverability.
- Refactor needed now: `Yes`.
- Evidence: `TeamRunContext` lacked the physical scope needed by its direct AgentRuns; the leaf fabricated `[]`; child factories propagated only partial parent facts; two cold consumers repeated index ancestry derivation. Repository history proves the August 15 universal-delegation checkpoint removed a previously correct writer rule while canonical readers/docs remained hierarchical. After that backend repair, real cold execution proves `TeamExecutionViewState` contains the exact task context but one shared selector hides it solely because the task is settled.
- Design response: one execution-domain scope, one live context owner, one index query, one child append boundary, one migration-only old-location transform, and one purpose-aware frontend navigation projection controlled by the existing execution-view owner.
- Refactor rationale: a leaf-local walk or one-reader fallback would keep the backend ownership split and fail task/deep recursion. On the frontend, bypassing focus or forcing a row in a component would create a second identity policy; deriving projection purpose from the view state's existing authoritative lifecycle is the smallest correction that preserves live semantics.
- Intentional deferrals and residual risk: no general context redesign, UI redesign, migration-framework redesign, Memory Sync filter/protocol/cleanup/gating redesign, cross-process lock, arbitrary corruption recovery, or provider-specific path behavior. Under the canonical migration convention, stable normal attempt assumptions are prerequisites rather than additional branches. Approved Memory Sync v1 residue can consume trusted-hub storage until an existing imported source is removed or a future separately approved cleanup exists.

## Terminology

- **Physical scope**: immutable `{ rootTeamRunId, ancestorTeamRunIds }` for one containing TeamRun. `ancestorTeamRunIds` is ordered from the root's first child through the containing TeamRun and excludes the root.
- **Containing TeamRun**: concrete TeamRun directly owning an AgentRun. A task agent remains in its delegator's containing TeamRun.
- **TeamRun boundary**: one physical directory segment for every non-root configured or delegated task TeamRun.
- **Affected flat source**: defective `<root>/<agentRunId>/` directory for an AgentRun whose V1 scope is non-root.
- **Canonical target**: `<root>/<ancestorTeamRunIds...>/<agentRunId>/` from `AgentMemoryLayout`.
- **Sync-visible flat residue**: a preserved flat source beside a structurally valid canonical target. Semantic local/imported readers do not load it, but Memory Sync's recursive physical scanner may export it and v1 may retain it remotely because deletes are not propagated.
- **Live execution navigation**: the row projection used while the root TeamRun is active. Settled task executions stay excluded and are not live focus targets.
- **Historical inspection navigation**: the row projection used while the root TeamRun is inactive. Configured and task-originated executions present in the persisted V1 tree remain discoverable, including settled task Agents/task Teams and their descendants; selection is read-only inspection, not execution resumption.

## Design Reading Order

This design follows verified behavior -> health/transition -> spines/ownership -> interfaces/subsystems -> files/folders -> sequence/tradeoffs/risks. Migration mechanics are intentionally proportionate to the repository convention.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the August 15 hard-coded flat-current writer and its defective test expectation.
- Remove duplicate reverse/root-trim ancestry recipes from `RootTeamRun` and `TeamRunExecutionTreeLocationService`.
- Remove redundant child-factory root identity propagation where the parent context is authoritative.
- Keep no flat runtime lookup, canonical-then-flat probe, dual writer, compatibility wrapper, fabricated history, or component-level focus bypass.
- Remove the unconditional settled-task exclusion from the shared navigation projection. Retain that rule only under explicit live execution purpose; historical inspection is the clean current path for persisted settled executions.
- Keep defective-path interpretation only inside the registered migration.
- Do not implement the superseded SR-001 migration-specific listener gate, directory-`fsync` protocol, post-rename-indeterminate state, planner/relocator mini-framework, backup, or shutdown-failure matrix.

## Production Migration Convention Compliance Check

| Canonical Convention Requirement | SR-005 Design Response | Compliance |
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
| DS-004 | Return-Event | BEH-001, BEH-003 | Local projection result | Hydrated exact Agent contexts plus existing conversation/Activity/Event Monitor data | Existing projection and hydration owners | Preserves DTO/renderer/empty semantics while supplying the data used by navigation/focus |
| DS-005 | Primary End-to-End | BEH-004 | Teacher's ordinary `send_message_to`, in separate executions, to the nested team address and directly to Student One | Exact route-specific receipt plus root-scoped live/cold Team Communication and a new same-route post-restart interaction | Team Communication routing/store/projection subsystem | Proves both ordinary nested communication routes independently from each other and delegation, while keeping them outside member migration |
| DS-006 | Primary End-to-End | BEH-005 | Existing startup migration runner | Canonical directory plus bounded ledger/log result | `TeamAgentMemoryLayoutAppDataMigration` | Repairs old physical placement before normal exact-path history use without a new recovery framework |
| DS-007 | Primary End-to-End | BEH-005 | User clicks Settings -> Server Migrations -> Retry | Updated migration record after the same idempotent definition | Existing Settings/store/GraphQL mutation/runner chain | Supplies the explicitly requested clickable retry without new frontend or framework behavior |
| DS-008 | Primary End-to-End | BEH-006 | Manual/background Memory Sync scans before or after upgrade | Replace-only hub imports plus canonical imported semantic read | Existing Memory Sync scanner/planner/hub and imported Memory Explorer | Makes the approved sync-visible/no-delete limitation explicit without changing the simple migration or sync protocol |
| DS-009 | Primary End-to-End | BEH-001 | User opens an inactive persisted TeamRun and selects an exact nested task member | Exact historical task Agent context focused and rendered through existing surfaces | `TeamExecutionViewState` plus `projectNavigationRows` | Restores the missing workspace history segment while leaving genuinely live-only task semantics unchanged |

## Primary Execution Spine(s)

- **DS-001:** `Root create/restore -> MixedTeamRunBackendFactory -> TeamRunContext(root scope) -> MixedSubTeamRunFactory(parent scope + child TeamRun ID) -> TeamRunContext(child scope) -> MixedAgentMemberHandle -> AgentMemoryLocationService -> AgentMemoryLayout -> AgentRunConfig.memoryDir`.
- **DS-002:** `GraphQL history query -> TeamMemberRunViewProjectionService -> TeamRunExecutionTreeLocationService -> TeamExecutionIndex.getTeamRunPhysicalScope(containingTeamRunId) -> AgentMemoryLayout -> LocalMemoryRunViewProjectionProvider`.
- **DS-005:** `User gives Teacher a marked ordinary-message prompt -> Teacher send_message_to(/StudentStudyGroup or /StudentStudyGroup/student_one) -> Team communication routing -> exact nested recipient receipt -> root-scoped Team Communication store/stream -> live UI/API assertion -> cold restart -> Team Communication query/projection -> <root>/team_communication_messages.json -> exact sender/recipient/content/order/timestamp/reference UI/API assertion`.
- **DS-006:** `AppDataMigrationRunner -> TeamAgentMemoryLayoutAppDataMigration -> TeamRunMigrationStateClassifier -> TeamExecutionIndex -> AgentMemoryLayout -> classify -> rename if eligible -> bounded result/ledger`.
- **DS-007:** `Settings ServerMigrationsManager Retry -> appDataMigrationsStore -> runAppDataMigration GraphQL mutation -> AppDataMigrationRunner.runMigration -> same TeamAgentMemoryLayoutAppDataMigration -> updated record -> refreshed Settings state`.
- **DS-008:** `Nodes -> Memory Sync manual action or background worker -> MemorySyncService -> LocalMemoryExportScanner(memory/agent_teams recursive files) -> MemoryFileChangePlanner(replace only) -> hub import(no delete) -> imported TeamMemoryExplorerService -> V1 tree/member target -> canonical history`.
- **DS-009:** `Workspace persisted TeamRun open -> openTeamRun -> hydrateCurrentTeamRunContext(raw.isActive=false + exact execution projections) -> createTeamExecutionViewState(rootActive=false) -> projectNavigationRows(HISTORICAL_INSPECTION) -> runHistoryTeamExecutionRows/navigation index -> user expands/selects exact task member -> selectTreeRunFromHistory -> focusTeamMemberAndEnsureHydrated -> focusAgent(exact AgentRun ID) -> existing conversation/Activity/Event Monitor surfaces`. A direct saved/mobile member target may enter through `openTeamMemberRunFromHistory -> openTeamRun` and must reach the same historical focus result.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Root construction creates `{root, []}`. Each configured/task child is built from its parent context by appending the child's concrete TeamRun ID once. Direct AgentRuns consume their containing scope unchanged. | root TeamRun, child TeamRun, physical scope, AgentRun | Context owns scope; factories own construction sequencing | Runtime/provider, workspace, handoffs, application binding |
| DS-002 | Active/stored lookup validates one V1 tree, indexes it, asks the index for containing scope, and asks the layout for one path. Projection sees only the current location. | execution tree, index, location, projection | Index owns ancestry; location service owns lookup composition | Package admission, trace projection |
| DS-003 | Existing writers persist to the immutable directory in `AgentRunConfig`; event publication never reconstructs topology. | AgentRun config, memory stores/events | AgentRun/memory subsystem | Trace rotation/compaction unchanged |
| DS-004 | Existing replay DTOs return through GraphQL and hydration into one exact context per execution Agent. Canonical history appears; no-trace data remains empty. | replay result, GraphQL DTO, Agent context | Existing backend projection and frontend hydration owners | Existing loading/error/empty renderers |
| DS-005 | Ordinary nested messaging routes one exact marked message without creating a delegated task, records it in the root-scoped communication package, and reproduces the same ordered sender/recipient/content/timestamp/reference association after restart. | sender AgentRun, recipient address, communication message/package | Team Communication subsystem | Real-provider determinism and fixture instructions; delegation is independently tested |
| DS-006 | The registered migration admits current V1 roots, resolves each non-root AgentRun's exact paths, performs only target-absent whole-directory renames, and emits cardinality-bounded results. | migration definition, V1 state, index, layout, directory | Single migration class | Existing runner ledger/retry and prerequisites |
| DS-007 | For a nonterminal `ANYTIME` record, the current Settings button dispatches the current GraphQL mutation. The runner invokes the same migration; already moved directories skip and remaining eligible directories retry. | migration status, recovery action, manual mutation | Existing migration runner; Settings is a thin public facade | Existing loading/error presentation and duplicate-run protection |
| DS-008 | The existing sync path physically mirrors every stable nonexcluded local file and does not emit deletion. A valid-target conflict or pre-upgrade flat import can therefore leave both hub paths. Imported semantic exploration indexes the V1 tree and selects only the canonical member location. | source file descriptor, replace operation, imported V1 member target | Existing Memory Sync owns transport; imported explorer owns semantic selection | Trusted-hub storage growth and durable disclosure |
| DS-009 | The inactive Team execution view derives historical inspection purpose from its authoritative root lifecycle. The selector includes configured rows plus settled/unsettled task Agent/task-Team subtrees already in the V1 tree; workspace projection indexes those exact rows; focus validates the requested AgentRun against the same historical projection and exposes its already-hydrated context. Active views continue using live execution purpose and omit settled tasks. | root lifecycle, navigation purpose, execution row, exact AgentRun focus | `TeamExecutionViewState` owns lifecycle/focus; selector owns pure row projection | Workspace expansion/indexing and existing content renderers |

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
- Existing Team Communication routing/store/projection owners: unchanged ordinary-message authority for DS-005; delegated-task handling remains a separate owner/path.
- `TeamExecutionViewState`: authoritative frontend root lifecycle, exact contexts, navigation access, and focus owner.
- `projectNavigationRows`: pure purpose-aware row projection; it does not own task lifecycle or stream membership.
- Existing history-open coordinator and workspace navigation projection: unchanged consumers that carry exact requested identity and publish the view's rows.

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
- Team Communication owns ordinary nested team-address and direct-member routing, exact message identity/order/reference associations, live publication, cold root-scoped projection, and same-route post-restart message acceptance. It remains independent from AgentRun raw-memory scope and delegated-task lifecycle.
- `TeamExecutionViewState` owns the live-versus-historical navigation decision because it already owns authoritative `rootActive`. It derives, rather than stores, a closed navigation purpose for every row/focus/repair query.
- `projectNavigationRows` owns tree-to-row projection under that explicit purpose. It includes settled task subtrees only for historical inspection; it never changes task state, status membership, or Agent contexts.
- History-open and workspace projection owners remain thin: they request exact identity and consume `focusAgent()` / `listNavigationRows()` without recreating lifecycle policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL history resolvers | Projection/location services | Public transport | Topology fallback or migration |
| `AgentMemoryLocationService.getTeamAgentRunLocation` | `AgentMemoryLayout` plus valid scope | Stable location DTO boundary | Ancestry discovery or flat probing |
| Mixed backend create/restore | Context/manager construction | Team backend lifecycle | Consumer-side child path logic |
| `AppDataMigrationRunner.runPending` | Registered definitions and record repository | Generic scheduling/ledger | Team-memory state classification |
| `ServerMigrationsManager` + retry mutation | `AppDataMigrationRunner.runMigration` and the migration definition | Existing manual-recovery UI/transport | Inferring recovery from migration ID/status or changing migration result semantics |
| `Sync now` GraphQL/UI action | `MemorySyncService` and existing scanner/planner | Existing manual physical replication entry | Migration conflict policy, semantic member-location selection, or delete inference |
| Teacher `send_message_to` tool entry | Existing Team Communication routing/store | Ordinary exact-address message delivery and persistence | Delegated-task creation/lifecycle or test-only routing policy |
| Teacher `delegate_task` tool entry | Existing task delegation/runtime owners | Separate task-Team creation, execution, and settlement | Ordinary Team Communication proof or substitution for `send_message_to` |
| Workspace hydration/history open | Backend projections plus execution-view navigation/focus | Existing exact TeamRun/member application | Filesystem diagnosis, fabricated history, lifecycle inference, or focus bypass |

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
| Unconditional `task.settled_at` removal in shared navigation projection | It makes supported cold historical task executions unreachable | Purpose-aware projection owned by `TeamExecutionViewState`/`projectNavigationRows` | In This Change | Live purpose retains the removal; historical purpose includes the subtree |
| Unit expectation that settlement always removes the task and repairs focus | It codifies live behavior as a universal rule | Split active-live and inactive-history assertions | In This Change | Preserve the active assertion; add settled task-Agent/task-Team historical focus |

## Return Or Event Spine(s) (If Applicable)

- **DS-003:** `AgentRun -> existing memory/event recorders -> scoped active/rotated traces, snapshot, and file changes`. Only the already-resolved directory changes.
- **DS-004:** `Local projection -> TeamMemberRunViewProjectionService -> GraphQL -> exact context hydration`. Shapes, data mapping, and genuine-empty semantics are unchanged.
- **DS-009 selected-result:** `Historical navigation row -> exact focus -> existing Agent context -> conversation/Activity/Event Monitor`. No replay data is copied or fabricated by the navigation layer.
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
| Team Communication | DS-005 | Communication subsystem | Ordinary nested routing/receipt plus root-scoped exact live/cold messages | Independent healthy authority and AC-017 control | Moving it with member data or using delegation as a proxy breaks AC-004/AC-017 |
| Recovery scheduling | DS-006, DS-007 | Existing migration runner | Required startup attempt, ANYTIME manual execution, ledger, MANUAL_RETRY | Canonical convention and approved clickable retry | A custom readiness/journal/UI policy duplicates framework behavior |
| Memory Sync v1 retention | DS-006, DS-008 | Existing sync/import owners | Mirror stable files, no deletion, canonical imported semantic read | Explicit user approval for MP-001/MP-002 | Putting filter/delete/gate logic in the migration would over-engineer a separately owned transport |
| Live task lifecycle/status membership | DS-009 | Existing Team execution/stream owners | Preserve settlement, interruption recovery, status snapshots, connection policy, and `collectLiveExecutionAgents()` | Historical discoverability is not live execution | Reusing historical inclusion for stream/status semantics would broaden behavior |
| Workspace row/index rendering | DS-009 | Existing history projection/components | Consume the view's purpose-correct rows and exact IDs | Existing consumers already preserve hierarchy and identity | Components or stores must not reimplement settled-task policy |

## Ownership Boundaries

- `TeamRunPhysicalScope` is topology, not a filesystem DTO.
- `TeamRunContext` rejects root/non-root scope mismatch and is authoritative for live direct members.
- `TeamExecutionIndex` is the only stored/snapshot scope derivation owner.
- `AgentMemoryLayout` alone translates scope plus AgentRun ID into paths.
- `MixedSubTeamRunFactory` is the one live child-append boundary.
- The migration alone knows the affected flat source; normal services never check it.
- The migration uses the existing runner's required-on-startup plus `ANYTIME` scheduling/status API without changing `server-runtime.ts`, Settings, GraphQL migration status, or public recovery behavior.
- Memory Sync may observe the flat path only as an unchanged physical mirror. It must not become a second semantic reader or migration participant; imported exploration continues through V1 canonical location owners.
- `TeamExecutionViewState` is the only frontend owner that converts root lifecycle into navigation purpose. Callers must not pass or persist an independent “historical” flag.
- `projectNavigationRows` remains the one row-eligibility policy and must receive explicit purpose from the view. `focusAgent`, `repairFocus`, and `listNavigationRows` must use the same purpose-correct projection.
- `collectLiveExecutionAgents` remains the live snapshot/status-membership owner and must not be changed to include settled historical executions.

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
| `TeamExecutionViewState` | Root lifecycle, exact contexts, purpose-consistent navigation/focus | Hydration, history-open, workspace/running views, stream service | Caller-supplied duplicate history flag or direct context focus that bypasses row eligibility | Derive navigation purpose from owned `rootActive`; expose existing view methods |
| `projectNavigationRows` | Pure tree/task/context -> navigation rows under explicit purpose | `TeamExecutionViewState` only | Reading stores, inferring root lifecycle, changing task status, or becoming stream membership | Add a tight closed purpose input and keep projection pure |

## Dependency Rules

1. `team-run-physical-scope.ts` has no memory, history, migration, backend, or transport dependency.
2. `TeamRunContext` and `TeamExecutionIndex` may depend on the scope type/builders.
3. Agent-memory may depend on the execution-domain scope; execution domain must not depend on agent-memory paths.
4. Mixed factories/handles may consume context and call memory location; they must not inspect stored trees or join paths.
5. Run-history location may depend on index plus layout; it must not encode ordering.
6. The migration may depend on classifier, index, scope, and layout; current runtime must not depend on migration-owned flat-source rules.
7. Existing runner remains generic; it must not gain directory-move logic or a migration-specific status shape. `ANYTIME` is required so current `MANUAL_RETRY`/`canRetry` semantics remain truthful and clickable.
8. Snapshot migrations may declare the new migration ID as prerequisite; the new migration must not invoke their conversion logic.
9. GraphQL and frontend hydration remain downstream of backend projection and do not depend on memory scope. Frontend navigation is separately downstream of the hydrated execution view and must not infer filesystem state.
10. Runtime/model selection never participates in scope selection.
11. The migration must not depend on Memory Sync source/hub services. Memory Sync must not depend on the migration record or migration-owned flat-path classifier.
12. Imported semantic exploration remains dependent on V1 tree/location services, not the recursive sync scanner's physical file inventory.
13. `TeamExecutionViewState` may depend on the pure navigation selector and must derive its purpose from owned `rootActive`; history stores, open coordinators, and components may depend only on the view boundary.
14. `projectNavigationRows` may inspect execution `settled_at` only as row eligibility under explicit purpose. It must not call stores, hydration, streaming, or task-lifecycle services.
15. `collectLiveExecutionAgents()` remains unchanged and separate; historical row inclusion must never flow into live snapshot/status validation.
16. `send_message_to` Team Communication and `delegate_task` delegation remain separate production owners and separate coverage subjects. No shared assertion or adapter may collapse them for AC-017.
17. The dedicated Nested Classroom fixture may depend on production tool contracts through its instructions/handoff rules; production routing/delegation code must not depend on fixture markers or test-specific behavior.

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
| Existing `send_message_to(recipient, content, references)` Team tool boundary | Ordinary Team Communication | Route/store one message with exact sender AgentRun, recipient logical address, content, order/timestamp, and references | Current sender identity + exactly `/StudentStudyGroup` for A or `/StudentStudyGroup/student_one` for B + independently marked content/reference set | Reused unchanged; the two routes remain distinct and neither may create, masquerade as, or substitute for a delegated task |
| Existing `delegate_task(recipient, task, ...)` boundary | Delegated task execution | Create/track a distinct task Agent/Team lifecycle and result | Current delegator AgentRun + `/StudentStudyGroup` + independently marked task | Reused unchanged; must not satisfy ordinary-message assertions |
| `projectNavigationRows({ tree, tasks, contexts, purpose })` | Team execution navigation | Project configured/task rows eligible for the requested view purpose | Exact V1 execution tree + task records + exact context map + `LIVE_EXECUTION` or `HISTORICAL_INSPECTION` | Live excludes settled task subtrees; historical includes them recursively; no lifecycle mutation |
| `TeamExecutionViewState.listNavigationRows/focusAgent` | Purpose-consistent navigation/focus | Derive purpose from owned `rootActive`, project rows, validate exact AgentRun, and select its existing context | Exact AgentRun ID within this Team execution | No new public flag; all three internal uses (`list`, `focus`, `repair`) share one derived-purpose projection |

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
| Ordinary Team message tool | Yes | Yes | Low | Exact logical recipient and message identity; keep separate from delegation |
| Delegated task tool | Yes | Yes | Low | Exact team target and task identity; independent marker/run |
| Purpose-aware navigation projection | Yes | Yes | Low | Closed live/historical purpose; derive at view boundary rather than caller boolean |
| Exact Team Agent focus | Yes | Yes | Low | Validate against purpose-correct projected AgentRun identity; never bypass row ownership |

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
| Public/UI history data | Existing GraphQL projection/hydration/renderers | Reuse unchanged | Data contracts are correct after backend scope repair | N/A |
| Historical navigation/focus | Existing Team execution view + selector | Extend | These owners already hold root lifecycle, exact contexts, row projection, and focus; no new store/component owner is needed | N/A |
| Physical mirror / no-delete retention | Existing Memory Sync v1 scanner/planner/service/hub | Reuse unchanged | MP-001/MP-002 are real production paths, but the user approved their current behavior; no new mechanism is needed | N/A |
| Imported semantic canonical selection | Existing imported `TeamMemoryExplorerService` and location owners | Reuse unchanged | Independently proves retained physical files are not competing current runs | N/A |
| Ordinary nested communication | Existing Team Communication tool/routing/store/projection | Reuse unchanged | Already owns exact team-address versus direct-member routing, sender/recipient/content/order/reference semantics, cold root-scoped projection, and post-restart message acceptance | N/A |
| Delegated task live/cold journey | Existing delegation/runtime/task records plus DS-009 | Reuse plus SR-005 frontend extension | Existing task lifecycle is correct; only historical navigation/focus changes | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team execution domain | Scope semantics/context/index query | DS-001, DS-002 | Context/index | Extend | No filesystem knowledge |
| Mixed backend | Root/child scope construction, leaf consume | DS-001, DS-003 | Factories/handles | Extend | Runtime-independent |
| Agent memory | Safe scope-to-path composition | DS-001–DS-003 | Location/layout | Reuse/alias | Standalone unchanged |
| Run history | Active/stored backend lookup/projection | DS-002, DS-004 | Location/projection | Extend to call index | No fallback |
| App-data migrations | One old-to-current directory move and bounded results | DS-006 | New migration definition | Extend with one file | Existing runner unchanged |
| Memory Sync / imported corpus | Recursive replace-only mirror, no-delete retention, canonical imported semantic selection | DS-008 | Existing sync/import owners | Reuse unchanged | Only durable docs/tests are updated; no production sync source change |
| Team Communication | Independent team-address and direct-member routing/receipt plus exact root-scoped live/cold/continued messages | DS-005 | Existing routing/store/projection owners | Reuse unchanged | Separate `send_message_to` routes; neither route nor delegation may substitute |
| Web Team execution/history | Exact hydration, lifecycle-owned navigation purpose, row projection/indexing, exact focus, existing presentation | DS-004, DS-005, DS-009 | `TeamExecutionViewState` and selector; existing open/history/components consume | Extend narrowly | Modify two production service files; keep GraphQL, stores, coordinators, and components as existing consumers |

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
| `teamExecutionTreeSelectors.ts` | Web Team execution | Navigation projection | Explicit live/historical settled-task row eligibility | Existing pure projection owner | Existing DTOs/context map |
| `teamExecutionViewState.ts` | Web Team execution | Root lifecycle/navigation/focus | Derive purpose from `rootActive`; use one projection for list/focus/repair; repair when transition re-enters live purpose | Existing authoritative view owner | Selector purpose type |
| Existing history-open/workspace source | Web history | Unchanged consumers | No production modification; DS-009 integration boundary | Prevents lifecycle policy duplication | Existing view API |
| Focused frontend tests | Web tests | Contract evidence | Active settlement exclusion, inactive settled task Agent/task-Team rows, exact focus, history row/index/open flow | Mirrors proven production path | Existing fixtures tightened for `isActive: false` and `settled_at` |
| Dedicated Nested Classroom fixture instructions/handoffs | API/E2E fixture | Real-provider determinism only | Make ordinary communication and delegation independently promptable while retaining exact rooted addresses | User-authorized fixture boundary | Production routing/delegation contracts |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Root plus ordered non-root TeamRun chain | `team-run-physical-scope.ts` | Team execution | Live/index/memory/history/migration share one meaning | Yes | Yes: memory scope becomes alias | Filesystem or logical-address DTO |
| Reverse/root-trim ancestry recipe | Index method | Team execution | Multiple consumers need same result | Yes | Yes | Free function over unvalidated arrays |
| Migration physical disposition | Private type in migration file | Migration | Needed only by one owner/tests | Yes | Yes | Exported generic move framework |
| Bounded reason counter/examples | Private collector in migration file | Migration | One result/log concern | Yes | Yes | Cross-migration framework redesign |
| Navigation purpose | Existing `teamExecutionTreeSelectors.ts` (exported tight union if needed by view state) | Web Team execution | Selector and view share one two-value meaning | Yes | Yes | Generic UI mode, stored flag, or application-wide state |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunPhysicalScope` | Yes | Yes | Low | Freeze object/array; distinct IDs; root excluded |
| `TeamRunContext` root/scope | Yes | Yes if root ID derived | Low | Store scope once; optional getter only |
| `AgentMemoryScope` | Yes as alias | Yes | Low | Do not redeclare mutable fields |
| Migration disposition | Yes | Yes | Low | Keep private closed union in migration file |
| Migration counters/details | Yes | Yes | Low | Counters authoritative; details capped diagnostic examples only |
| Team execution navigation purpose | Yes | Yes | Low | Closed `LIVE_EXECUTION` / `HISTORICAL_INSPECTION` union; derive from `rootActive`, never persist both |

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
| `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` | Web Team execution | Pure navigation projection | Accept explicit purpose; retain live settled-task exclusion; recursively include settled task Agent/task-Team rows for historical inspection | Existing row construction and tree recursion already live here | Existing execution DTOs and context map |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Web Team execution | Root lifecycle/navigation/focus owner | Derive purpose from `rootActive`; use it consistently for `repairFocus`, `focusAgent`, and `listNavigationRows`; repair focus when transition to active makes a historical target ineligible | Avoids caller flags and component/store policy | Selector purpose |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`; `services/runOpen/teamRunOpenCoordinator.ts`; `stores/runHistorySelectionActions.ts`; `stores/runHistoryNavigationStoreActions.ts`; `stores/runHistoryTeamExecutionRows.ts`; `stores/runHistoryNavigationProjection.ts`; `components/workspace/team/TeamMembersPanel.vue` | Web history | Preserved DS-009 consumers | No production modification expected; carry authoritative `raw.isActive`, exact identity, view rows/index, local-context focus, and existing rendering | Existing boundaries are correct once view projection is purpose-aware | Existing view API |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Web tests | View-state contract | Split settlement assertions by active/inactive root; cover settled task Agent and task-Team descendants plus exact focus | Direct owner-level regression | Existing fixtures/DTOs |
| `autobyteus-web/stores/__tests__/runHistoryTeamExecutionRows.spec.ts`; `runHistoryNavigationProjection.spec.ts`; `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` | Web tests | Historical integration contracts | Prove inactive settled task rows/index/ancestry and requested exact focus through normal open; retain absent-ID rejection | Covers the exposed path without component policy duplication | Existing fixtures/view API |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/team.md`; `agents/teacher/agent.md`; `team-config.json`; `agent-teams/student-study-group/team.md` | API/E2E fixture | Dedicated real-provider validation instructions/handoffs | Modify freely as needed to make `NTH-LIVE-002A` team-address messaging, `NTH-LIVE-002B` direct-member messaging, and `NTH-LIVE-002C` delegation independently deterministic before and after restart; keep all rooted agents/team independently addressable | Explicitly user-authorized test boundary, outside production runtime | Existing `send_message_to` / `delegate_task` contracts only |
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
- Purpose-aware pure projection derived from an authoritative lifecycle owner.

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
| `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` | File modify | Pure navigation projection | Add closed live/historical purpose and settled task subtree eligibility | Existing owner of recursive row construction | Store access, lifecycle inference, stream membership |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | File modify | Team execution view | Derive purpose from `rootActive`; keep list/focus/repair consistent; repair focus when re-entering active mode | Existing owner of lifecycle, exact contexts, and focus | Duplicate history flag, component policy, task-status mutation |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | File modify | Owner-level regression | Active exclusion plus inactive settled task Agent/task-Team descendant visibility and exact focus | Direct source contract | Only happy-path configured members |
| `autobyteus-web/stores/__tests__/runHistoryTeamExecutionRows.spec.ts`; `runHistoryNavigationProjection.spec.ts`; `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` | Files modify | Historical integration regression | Exact settled row/index/ancestry and requested focus through normal inactive open | Existing supported user path | Mock-only assertion without a real settled execution tree |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/team.md`; `agents/teacher/agent.md`; `team-config.json`; `agent-teams/student-study-group/team.md` | Files modify if needed by API/E2E | Dedicated fixture | Separate ordinary-message versus delegation instructions/markers and fixture-owned handoff rules | Existing user-designated real nested fixture | Production-code changes, merged scenario semantics, or loss of independent addresses |
| `autobyteus-server-ts/docs/modules/run_history.md` | File modify if impact confirmed | Durable docs | Scope owner/startup migration | Existing canonical layout doc | Recovery internals |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `README.md` | Files modify in delivery | Durable migration policy | Explicit approved mirror-visible warning/no-delete distinction | Align governing policy to approved production path | Missing-target warning or generic exception without canonical semantic validation |
| `autobyteus-server-ts/docs/features/memory_sync.md`; `autobyteus-web/docs/memory.md` | Files modify in delivery | Memory Sync docs | Disclose both-path/pre-upgrade retention and canonical imported read | Existing feature contract | Promise of delete propagation or cleanup |

No `server-runtime.ts`, Memory Sync scanner/planner/service/hub, imported explorer, backend GraphQL, migration store, Settings component, workspace-history component, Team Communication/delegation production path, or localization production modification is part of SR-007. The migration remains one simple definition. The only new production allocation beyond the already-implemented backend is the two-file Web Team-execution selector/view-state correction. Durable coverage/fixture edits remain subject to `api_e2e_engineer`'s mandatory coverage investigation and later code review when repository-resident; durable documentation is finalized by `delivery_engineer` against the integrated state.

## Coverage Scenario Map

| Scenario ID | Approved Behavior / ACs | Independent Setup And Marker | Required Live Evidence | Required Cold Evidence | Non-Substitution / Ownership Guardrail |
| --- | --- | --- | --- | --- | --- |
| `NTH-LIVE-002A` | BEH-004; AC-004, AC-017 | Dedicated root TeamRun and Teacher prompt requiring ordinary communication specifically to the `/StudentStudyGroup` team address. Use ordered A-pre markers/reference set. | Teacher actually calls `send_message_to` with recipient `/StudentStudyGroup`; nested coordinator receipt is observable; Team Communication matches exact sender AgentRun/address, team recipient address, content markers, order, timestamps, and references. Direct-member messaging and delegation cannot satisfy it. | Stop and cold-restart the real server; reopen the same root and prove the exact A-pre Team Communication/receipt history. Then issue a new same-team-address `send_message_to` with A-post marker and prove receipt plus exact appended Team Communication order/references. | Existing Team Communication owners only. B direct-member and C delegation runs cannot satisfy any A assertion. Fixture instructions/handoffs may make the team-address flow deterministic. |
| `NTH-LIVE-002B` | BEH-004; AC-004, AC-017 | Separate root TeamRun and Teacher prompt requiring ordinary communication specifically to `/StudentStudyGroup/student_one`. Use ordered B-pre markers/reference set. | Teacher actually calls `send_message_to` with the exact individual recipient; Student One receipt and supported reply/receipt are observable; Team Communication matches exact sender, individual recipient, content, order, timestamps, and references. Team-address messaging and delegation cannot satisfy it. | Stop and cold-restart the real server; reopen the same root and prove exact B-pre direct-message/Team Communication history. Then perform a new supported direct two-way interaction with B-post marker and prove exact appended order/references. | Existing Team Communication owners only. A team-address and C delegation runs cannot satisfy any B assertion. Fixture instructions/handoffs may make direct two-way communication deterministic. |
| `NTH-LIVE-002C` | BEH-001, BEH-002; AC-002, AC-012, AC-017 | Third root TeamRun and Teacher prompt with C-pre task/result marker, targeting `/StudentStudyGroup` through `delegate_task`. | Teacher actually calls `delegate_task`, not either message route; prove task-Team creation, Student One execution/submission, Teacher review as applicable, task record/lifecycle, exact task AgentRun data, and pre-restart member selection. | Stop and cold-restart the real server; prove truthful recovery status, historical task-Team/member rows, exact focus, and C-pre conversation/Activity/Event Monitor/last-activity. Then initiate a new supported `delegate_task` interaction with C-post marker and prove its new task lifecycle; do not resume or mutate the settled historical task. | Existing delegation/runtime owners plus DS-009. A/B messages cannot satisfy task assertions; no merged marker/run is accepted. |
| `NTH-CONFIG-001` | BEH-001, BEH-002; AC-001, AC-010, AC-012 | Independently identifiable configured nested-member execution with persisted raw traces | Exact configured nested member writes non-empty trace-backed data through the corrected scope | Browser/API cold reopen returns and renders the exact configured member data | Remains mandatory because round 1 did not prove configured nested AC-001; task-Team evidence cannot substitute. |
| Preserved controls | BEH-003, BEH-004; AC-003, AC-004, AC-011 | Direct-root and genuinely empty members in the same controlled environment | Direct-root history and ordinary Team Communication are correct; genuinely empty member remains empty | Same results after cold restart | Controls must be asserted, not inferred from A/B/C success. |

Scenario execution rules:

- `NTH-LIVE-002A/B/C` use separate root TeamRun IDs, separate prompts, and disjoint pre/post-restart content/result markers. Evidence is indexed by exact root TeamRun, AgentRun/task IDs, route/tool call, restart boundary, and marker.
- Each flow must cross a real server stop/cold restart and then prove a new supported same-route/tool interaction. One correctly configured cold restart may cover multiple persisted roots only if all three restart boundaries and evidence sets remain independently keyed; an excluded/misconfigured restart cannot support any row.
- Real browser validation must use the normal workspace surfaces. GraphQL/raw-byte probes are corroboration, not substitutes for recipient receipt, historical row visibility, exact focus, or rendered history.
- Fixture-only instruction/handoff edits are permissible. If API/E2E adds or changes durable repository-resident fixture/coverage code, return that state through `code_reviewer` before delivery under the normal team rule.
- A product-path failure is classified and routed by its real owner. Do not change production communication/delegation behavior merely to make the fixture deterministic. Post-restart delegation continuation creates a new task; it never broadens historical inspection into settled-task resumption.

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
| `autobyteus-web/services/teamExecution` | Main-Line Domain-Control | Yes | Low | Existing view state owns root lifecycle/exact focus; existing selector owns pure tree-to-navigation projection |
| `autobyteus-web/stores` and workspace components | Transport / presentation consumers | Yes | Low | Reused unchanged; must not absorb live/historical eligibility policy |
| `autobyteus-private-agents/agent-teams/nested-classroom-test` | Test fixture | Yes | Low | Dedicated user-authorized real-provider fixture; may clarify instructions/handoffs but cannot own production behavior |

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
| Navigation purpose | `rootActive ? LIVE_EXECUTION : HISTORICAL_INSPECTION`; selector applies purpose; view uses the same rows for list/focus/repair | Persist a second `isHistory` flag in stores/components or let selector guess | One authoritative lifecycle fact prevents mode drift |
| Settled task-Team after cold recovery | Historical projection includes task-Team row, task-Team member rows, and nested task executions; exact member focus succeeds | Remove whole subtree because `settled_at` exists or bypass focus to access a hidden context | AC-002 requires topology-reflecting historical reachability, not task resumption |
| Live settlement control | Active projection still removes the settled task subtree and repairs a focused task Agent to a remaining live row | Show all completed task executions in the running-Team surface | Preserves genuinely live-only semantics outside the historical journey |
| Independent live markers | Root `RA` sends team-address `COMM_A_PRE/POST`; separate root `RB` sends direct-member `COMM_B_PRE/POST`; third root `RC` delegates `TASK_C_PRE/POST` | One root/prompt, one restart-only rendering check, or any route/tool accepted as evidence for another | Exact identities, route/tool calls, restart boundaries, and disjoint pre/post markers prevent cross-satisfaction while proving continuation |
| Fixture accommodation | Clarify Teacher instructions/handoffs so an A prompt requires ordinary communication and a B prompt requires delegation | Add production fallback/routing branch keyed to test tokens | The fixture is the authorized determinism boundary |

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
| Frontend empty-as-error or fabricated-history workaround | Original symptom was blank UI | Rejected | Correct backend storage/read invariant plus purpose-aware reachability of the exact hydrated historical context |
| Direct context focus bypass for settled tasks | Could make one historical click succeed without rows | Rejected | Same historical projection owns workspace row/index and exact focus eligibility |
| Global “show settled tasks everywhere” rule | Could expose history by broadening the shared selector | Rejected | Closed live/historical purpose preserves active exclusion and enables inactive inspection only |
| Copy plus retain source/backup | Appears safer for shutdown stories | Rejected | Target-absent atomic rename rewrites no bytes; conflict is not mutated |
| Journal/post-rename-indeterminate state | Would model mechanical timing | Rejected | Normal stable attempt plus ordinary runner rerun/idempotence |
| Global startup readiness gate | Could hide every operational failure | Rejected | Existing migration runner/status/recovery contract; no new policy for unsupported mechanical premises |
| Merge/compare/prefer conflicting contents | Could choose one history | Rejected | Canonical target stays semantic current; preserve sync-visible flat source with bounded warning |
| Memory Sync scanner filtering | Could hide flat residue from later sync | Rejected | Preserve recursive v1 mirror; canonical imported reader remains semantic authority |
| Memory Sync delete/tombstone or remote cleanup | Could remove pre-upgrade hub residue | Rejected | Preserve documented v1 no-delete behavior; disclose bounded physical retention |
| Gate Memory Sync on migration status | Could prevent both paths from being exported | Rejected | User approved sync availability; migration and sync remain separate owners |
| Revive pre-June flat layout | Older writer/reader agreed | Rejected | Keep released concrete TeamRun hierarchy |
| Optional context scope/default `[]` | Reduces compile edits | Rejected | Required invariant; no compatibility wrapper |
| Combined communication/delegation coverage | Could reduce real-provider runs | Rejected | Separate `NTH-LIVE-002A/B/C` roots, prompts, pre/post markers, route/tool calls, cold reloads, and continuation assertions |
| Production test-marker accommodation | Could force provider behavior | Rejected | Adjust only dedicated fixture instructions/handoff rules; route real product failures normally |

## Derived Layering (If Useful)

- Live: `TeamRun lifecycle -> execution-domain scope -> agent-memory path -> AgentRun stores`.
- Cold: `GraphQL/projection -> V1 execution index/scope -> agent-memory path -> current raw memory`.
- Transition: `startup runner -> migration-owned old source classification/rename -> current memory`, after which normal code knows only current topology.
- Physical mirror: `Memory Sync scanner -> replace-only hub files -> imported V1 semantic reader`; physical residue may persist, but semantic location remains canonical.
- Historical presentation: `inactive root lifecycle -> TeamExecutionViewState -> historical navigation projection -> workspace row/index -> exact focus -> existing hydrated Agent context/renderers`; live stream/status layering is unchanged.
- Ordinary communication: `Teacher send_message_to -> Team Communication routing/store -> nested receipt/live panel -> cold root-scoped projection`; delegation remains a separate sibling production path.

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
10. Extend `projectNavigationRows` with the closed live/historical purpose and make `TeamExecutionViewState` derive it from `rootActive` for navigation listing, exact focus, and focus repair. Keep `collectLiveExecutionAgents`, recovery settlement, and stream connection unchanged.
11. Replace the universal settled-removal test with two explicit contracts: active settlement still removes/repairs; inactive historical state includes settled task Agent/task-Team subtrees and allows exact focus. Add history row/index/open regression coverage using a real settled execution tree.
12. Prepare `NTH-LIVE-002A/B/C` as three separate real-provider root runs with disjoint prompts and pre/post-restart markers. If needed, clarify only the dedicated Nested Classroom Teacher/team/agent instructions and fixture-owned handoff rules while retaining independent addresses; route any durable fixture edits through code review after API/E2E.
13. Execute A using actual team-address `send_message_to`, B using actual direct-Student-One `send_message_to`, and C using actual nested-team `delegate_task`. For each, capture live evidence, stop/cold-restart the real server, reload exact relevant history, and then execute/capture a new supported same-route/tool interaction. Prove exact Team Communication for A/B and exact lifecycle/historical task-member navigation for C; no route/tool substitutes.
14. Re-run normal projection/API/browser cold reopen through the configured nested member, plus direct-root and genuine-empty controls. API/E2E owns final durable coverage decisions and must repeat the real Chrome journey.
15. Remove duplicate ancestry recipes, defective expectations, the shared unconditional navigation rule, and every SR-001-only migration mechanism before implementation review. Delivery updates the governing migration and Memory Sync docs with the approved limitation.

No temporary dual read/write is allowed. Migration fixtures use isolated temporary memory roots, never the user's live volume.

## Key Tradeoffs

- Required scope causes more constructor edits than a leaf patch but makes omission impossible across recursion.
- Domain scope keeps topology independent of filesystem; the layout remains one path owner.
- One migration file is less abstract than planner/relocator layers and clearer for one fixed rename transform.
- Atomic rename assumes normal same-filesystem operation, as the convention permits; it avoids content-copy cost and recovery states.
- `FAILED` is used when the move cannot establish the canonical target even though startup remains online. This preserves truthful migration status while `ANYTIME` supplies the user-requested clickable retry through existing code.
- A source+valid-target conflict remains a warning because semantic local/imported owners independently have a structurally valid target and never choose the flat source. The tradeoff is explicit: unchanged Memory Sync v1 may mirror or retain both physical paths, consuming storage, but the migration stays simple and preserves evidence without inventing sync machinery.
- Bounded diagnostics sacrifice exhaustive per-item logs but preserve exact aggregate truth and actionable capped examples.
- Deriving navigation purpose from `rootActive` is narrower than adding a stored UI mode and prevents caller drift. The tradeoff is that an inactive Team execution presents all persisted task executions for inspection; this is exactly the approved history contract and does not imply they are runnable.
- Two independent real-provider roots cost more execution time than one combined prompt, but prevent tool substitution and make communication persistence versus task lifecycle failures attributable to the correct owner.

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
- Purpose-aware projection must recurse consistently: omitting a settled task-Team parent would still hide all descendants even if exact contexts exist. Owner-level tests must cover task Agent, task Team member, and nested task execution shapes.
- A view may transition from historical/inactive to active. If its current focus is a settled historical task, `setRootTeamActive(true)` must invoke the existing purpose-correct focus repair so live views never retain an ineligible focus.
- Configured nested AC-001 remains separately unproven in the browser. The revised task-focused fix does not waive that required control.
- A real provider may choose the wrong tool if fixture instructions are ambiguous. Resolve determinism inside the dedicated fixture, retain exact tool-trace assertions, and do not weaken the non-substitution rule.
- Fixture edits in the private repository are durable coverage changes. They must preserve independent rooted addresses and return through code review after a passing API/E2E run under the team artifact rule.

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
- Add exactly one closed navigation-purpose contract in `teamExecutionTreeSelectors.ts`; prefer semantically named values such as `LIVE_EXECUTION` and `HISTORICAL_INSPECTION` over a loose `includeSettled` boolean.
- In `TeamExecutionViewState`, derive that purpose from the existing `rootActive` ref at the moment of projection. Do not add a second constructor/store/component flag.
- Use the same purpose-correct projection in `repairFocus`, `focusAgent`, and `listNavigationRows`. When `setRootTeamActive(true)` changes purpose back to live, repair focus after updating the authoritative state.
- Historical projection must include a settled task Agent or complete settled task-Team subtree already present in the execution tree and backed by task records/contexts. It must not create contexts, alter statuses, reconnect streams, or resume tasks.
- Keep `collectLiveExecutionAgents()` and snapshot/status validation unchanged. It is intentionally a different live-only subject from historical navigation rows.
- Expect no production modification in hydration, open coordinator, history stores/projection, TeamMembersPanel, GraphQL, or renderers unless implementation discovers a concrete contradiction and reroutes it as Design Impact. Their focused tests must nevertheless prove the full DS-009 path.
- Browser validation is mandatory evidence: after supported restart, expand the nested task Team, select the exact settled task member, and verify its non-empty conversation/Activity/Event Monitor/last-activity data. Also execute configured nested AC-001 and the preserved controls.
- For `NTH-LIVE-002A`, assert the actual Teacher tool call targets `/StudentStudyGroup`, coordinator receipt is observable, exact A-pre Team Communication survives cold restart, and a new A-post team-address message is received and appended exactly. Direct-member messages and delegation are invalid substitutes.
- For `NTH-LIVE-002B`, assert the actual Teacher tool call targets `/StudentStudyGroup/student_one`, exact direct receipt/two-way Team Communication survives cold restart, and a new B-post direct interaction succeeds and appends exactly. Team-address messages and delegation are invalid substitutes.
- For `NTH-LIVE-002C`, assert actual Teacher `delegate_task` to `/StudentStudyGroup`, preserve task-Team execution/submission/review/task-record checks, and after restart select/render the exact settled task member with C-pre marker. Then create and prove a new C-post delegated task; do not resume the settled task. Ordinary messages are invalid substitutes.
- Use separate root TeamRun IDs and disjoint A/B/C pre/post markers. One correctly configured restart may cover multiple roots only if every restart crossing and artifact remains independently keyed; never reuse excluded or misconfigured restart evidence.
- Adjust only `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test` instructions/configured handoff rules when provider determinism requires it. Keep Teacher, StudentStudyGroup, `student_one`, and `student_two` independently addressable; do not alter production handoff behavior for testing.
