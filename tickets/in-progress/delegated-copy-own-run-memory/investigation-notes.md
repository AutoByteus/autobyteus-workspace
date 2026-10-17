# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copy-own-run-memory`
- Request / ticket: Project Task (from `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Refactor: a delegated copy's memory follows the normal structure (its own run), not the delegator's folder". Separate from bug Task e6985045 (slow opening).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory` / `codex/delegated-copy-own-run-memory`
- Resolved base remote / branch / revision: `origin` / `personal` / `907c861ff44ed2317c6b918e67afe5757fee5974` (fetched 2026-10-15, "chore(release): bump workspace release version to 1.5.4")
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: `git fetch origin --prune` succeeded; `git worktree add -b codex/delegated-copy-own-run-memory <path> origin/personal` succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-008` (behavior-defining supplement: `memory-layout-contract.md` revision 4, which records the validation V-1..V-19, the shape inventory §6 and the simulations S1–S35; ARCH-REV-001 and ARCH-REV-002 findings verified 2026-10-17, see §ARCH-REV-001 Verification and §Resume below)
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-15); templates `requirements-doc-template.md`, `investigation-notes-template.md`, `solution-revision-record-template.md` (2026-10-15). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, template `design-spec-template.md` (2026-10-15).
- Investigation status: requirements and architecture investigation complete through SR-008 (2026-10-17; resumed on base `66429d6f31`).

## Initial Request And Clarifications

- Original request: see the Task text quoted in `requirements-doc.md` (Problem). User statement 2026-10-15: a Task is only delegated to an individual agent or team, so that copy should follow its own structure as a normal run; the delegating run only aggregates and coordinates.
- Clarifications received: The Task itself fixes direction: Agent copy → normal standalone run with its own standard memory folder; Team copy → normal team run with its own standard memory; delegator keeps only coordination data; existing data migrates safely and is proven on real data; no user-visible behaviour change beyond consistency.
- User-supplied facts and constraints: measured PTM run folder ≈265 MB, mostly copies (16–25 MB each); no copy has its own folder under `agents/`. Keep restore/reopen, idle shutdown + wake-up, status colours, copy→Task locator and Settings working. Related Task 17bfe0fe (agent input delivery cleanup, same area). Follow-ups that benefit: cc9c919e (link an existing run to a Task), 6fb6e21b (show copies under their workspace).
- Initial ambiguity: (a) whether delegators that are Team or Org members are included; (b) whether collaborators (send_message_to instances) are included; (c) whether copies become history/sidebar rows; (d) Memory UI listing. Resolved as decisions DEC-001..DEC-006 in the requirements doc.

## Product And Domain Understanding

- Product area: server-side run persistence (memory layout) for collaboration roots and their delegated Task copies; Memory UI listing; startup app-data migration.
- Affected actors or systems: the user (opens runs, browses Memory, Settings, Token Meter, Task pages); agents that delegate (`delegate_task`) and message copies (`send_message_to`); the server's three collaboration-root families (Agent root, Team root, Org root); Memory Sync source/hub; token usage; skill improvement.
- Existing purpose: a collaboration root owns the whole execution tree (host/members, collaborators, delegated copies), routes messages, runs idle shutdown/wake, and persists one package under its own folder.
- Relevant terminology:
  - *Collaboration root*: the run that owns a collaboration tree: Agent root (`memory/agents/<hostRunId>/collaboration/`), Team root (`memory/agent_teams/<rootTeamRunId>/`), Org root (`memory/agent_orgs/<orgRunId>/`).
  - *Delegated copy / task execution*: an Agent or Team started by `delegate_task` (record `taskExecutions[]` in the tree with `delegatorAgentRunId`, `startedAt`, optional `source`).
  - *Collaborator*: one in-run instance per address brought in by `send_message_to` to a catalog address (`collaborators[]`).
  - *Physical scope*: `(root, ancestorTeamRunIds)`; an agent's memory dir = root dir + ancestors + agentRunId (`AgentMemoryLayout.getRootedAgentRunDirPath`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-15 | Command | `git fetch origin --prune`; `git worktree add -b codex/delegated-copy-own-run-memory ... origin/personal` | Bootstrap | Base `907c861ff4` | No |
| 2026-10-15 | Data | `ls/du ~/.autobyteus/server-data/memory` | Real layout and volume | `agents` 689 MB (703 dirs), `agent_teams` 6.7 GB (605), `agent_orgs` 516 MB (26); `imports/docker-node-1` present | No |
| 2026-10-15 | Data | `du` over `agents/*/collaboration` | Which delegators hold copies | PTM `7c8dce0c…` 292 MB total / 265 MB collaboration (47 entries, 45 copies: 39 Team, 6 Agent); PTM `a5f6d9d3…` 76 MB; others small | Use PTM `7c8dce0c…` as real-data proof run |
| 2026-10-15 | Data | Python walk of all three tree files counting `taskExecutions` | Copies per root family | Agent roots: 5 roots / 57 copies; Team roots: 8 roots / 12 copies; Org roots: 6 roots / 6 copies; nested copy-of-copy: 0 in real data | Migration must cover all three families |
| 2026-10-15 | Data | Python size scan of each copy's folder | Volume of data to move | 75 copy folders found (0 missing), 367 MB, 560 files | Migration volume |
| 2026-10-15 | Data | collaborator count across trees | Collaborator prevalence | 2 collaborators total (Agent roots), 0 in Team/Org | DEC-002 |
| 2026-10-15 | Data | `collaboration_tree.json` of PTM `7c8dce0c…` | Copy record shape | Agent copy: `{address, agentRunId, platformAgentRunId, delegatorAgentRunId, startedAt, source{kind:"agent", agentDefinitionId, launchConfiguration}}`; Team copy: `{address, teamRunId, members[{address, agentRunId, platformAgentRunId}], taskExecutions[], delegatorAgentRunId, startedAt, source{kind:"agent_team", teamDefinitionId, coordinatorAddress, members, handoffs, defaultLaunchConfiguration, defaultLaunchSource}}` | Tree remains the coordination record |
| 2026-10-15 | Data | `find collaboration/<copy> -maxdepth 2` | Copy folder contents | Agent copy: `raw_traces_active.jsonl`, `file_changes.json`, `context_files/`; Team copy: `<teamRunId>/<memberRunId>/{raw_traces_active.jsonl, file_changes.json, context_files/}`. No `run_metadata.json`, no team tree in copy folders | Copy folders are not self-describing today |
| 2026-10-15 | Data | `grep` for `…/collaboration/` absolute paths in tree/messages/raw traces | Stored absolute paths | None in tree or messages; only incidental tool-call text in raw traces (historical content) | Raw traces are immutable; no rewrite needed |
| 2026-10-15 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Layout owner | `getRootExecutionDirPath`: agent→`agents/<host>/collaboration`, team→`agent_teams/<root>`, org→`agent_orgs/<root>`, + ancestors; `getRootedAgentRunDirPath` appends agentRunId | Central place where copy placement is decided |
| 2026-10-15 | Code | `src/standalone-agent-run-root/services/standalone-root-execution-index.ts` | How a copy's scope is computed | `getPhysicalScopeForAgent`: root-level copy → `(root, [])`; Team copy members → `(root, [teamCopyRunId…])` | Same pattern in Team/Org indexes |
| 2026-10-15 | Code | `src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts` | Copy activation/restore/shutdown | Activation, restore (`restoreRootTaskTeam` with `physicalScope(root,[teamRunId])`), `assertRestorableChain` (activity inspector on computed memoryDir), idle shutdown all run in the root | Runtime coordination stays in root; memory dir is derived |
| 2026-10-15 | Code | `src/standalone-agent-run-root/services/standalone-root-location-service.ts`; `src/agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Readers by run ID | Readers (file changes, context files, token display fields, member projections, runtime memory classifier) locate a copy through the root tree and compute `memoryDir` from physical scope | One derivation point serves most readers |
| 2026-10-15 | Doc | `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Agent-root contract | Package layout `agents/<host>/collaboration/{collaboration_tree.json, communication_messages.json, <child>/…}`; root hosts copies; DONE/reopen/reactivation contracts | Doc must be updated |
| 2026-10-15 | Doc | `docs/modules/agent_team_execution.md` §Server-Owned Task Delegation, §Delegated Child Lifecycle | Team-root copy lifecycle | Liveness, idle shutdown (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`), wake-on-message (only from same root), open work, status, root reopen, root stop — all root-owned and tree-driven; "Nothing is written to the tree on shutdown or wake" | Preserved behaviour list |
| 2026-10-15 | Doc | `docs/modules/agent_memory.md` | Memory layout + explorer contract | Task-Agent runs documented under Team scope; explorer lists `agents/<runId>` dirs (attribution from `run_metadata.json`/catalog, else "Unattributed"); Team/Org explorer lists root runs and tree member targets incl. `TASK_AGENT`/`TASK_TEAM_MEMBER` | Moving copies into `agents/` affects Agents list (DEC-004) |
| 2026-10-15 | Code | `src/agent-memory/services/agent-memory-explorer-service.ts` | Agents list behaviour | Groups by `agentDefinitionId` from run metadata or catalog row; otherwise "Unattributed runs" | Copies without self-description would surface as "Unattributed" |
| 2026-10-15 | Code | `src/agent-execution/services/agent-run-provisioning-service.ts` (`hasRunIdentity`, `cleanupStalePreparedRuns`), `src/run-history/services/agent-run-history-identity.ts` | What makes a dir a standalone run | Standalone identity = `agents/<id>/run_metadata.json`; standalone lifecycle restores from it | A copy must not acquire a standalone `run_metadata.json` identity (double hosting risk) — architecture constraint |
| 2026-10-15 | Code | `src/agent-execution/services/agent-run-identity-allocator.ts` | ID collision risk | Run IDs = definition slug + fresh UUID token | No collision between copy IDs and other run IDs |
| 2026-10-15 | Code | `src/skill-improvement/services/skill-improvement-target-context-resolver.ts` | Skill improvement eligibility | Supports standalone runs (via `run_metadata.json`) and configured Team members only; copies are not eligible today | Making copies eligible = new behaviour → out of scope (follow-up) |
| 2026-10-15 | Code | `rg memoryDir/collaboration` in `autobyteus-web` | Frontend path coupling | Frontend never uses memory paths | Frontend unaffected by placement |
| 2026-10-15 | Data | `ls memory/imports/docker-node-1/agents/*/collaboration` | Imported corpora | Imported Memory Sync corpora contain old-shape `collaboration/` folders | Imported corpora are read-only, owned by source node (DEC-007) |
| 2026-10-15 | Code | `ls src/app-data-migrations/migrations` | Migration mechanism exists | Startup app-data migration registry with many layout migrations (e.g. `team-agent-memory-layout-app-data-migration.ts`, `raw-trace-rotation-layout-migration.ts`) | Architecture phase: mandatory migration-conventions investigation |
| 2026-10-15 | Other | `tickets/in-progress/task-agent-team-memory-location` (worktree `task-agent-team-memory-location`, 2026-06-30) | Prior related investigation | Earlier investigation explained task-agent memory under team scope; no change made. Superseded by this Task's direction | Link only |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Agent in any collaboration root calls `delegate_task` to an Agent address | Root allocates run ID, prepares the copy in the root's registry, commits one tree write with the copy record, publishes `task_execution_started`, sends work packet | Copy memory written under the delegating root's folder: Agent root `agents/<host>/collaboration/<copy>/`; Team root `agent_teams/<root>/<…hostTeams>/<copy>/`; Org root `agent_orgs/<org>/<…hostTeams>/<copy>/` | layout + adapters; real data | High |
| BEH-002 | System | `delegate_task` to a Team address | Root materializes a task TeamRun, coordinator starts, other members lazily | Members' memory under `<root dir>/<…hostTeams>/<teamCopyRunId>/<memberRunId>/`; no team-level file in the copy folder; Team copy record (members, source) in the delegator tree | real data, adapters | High |
| BEH-003 | System | Copy goes quiet / is messaged | Idle shutdown after grace; wake-on-message restores the chain from memory (activity inspector on memoryDir) | Tree untouched; restore reads copy memory at computed memoryDir | team doc §Delegated Child Lifecycle | High |
| BEH-004 | User/System | User reopens a stored run / server restart | Root rebuilt from stored package; every copy starts shut down and is wakeable unless its Task is closed | Copy memory read from computed location | standalone doc §Root lifetime | High |
| BEH-005 | User | Sidebar, collaboration view, Event Monitor, Settings delegated-copy list, Token Meter roll-up, Task page copy locator | All read the delegating root's tree/snapshot; per-copy conversation/file changes/context files read via location service → memoryDir | Copies are shown under their delegator, not as separate history rows | standalone doc §Surfaces; web search | High |
| BEH-006 | User | Memory UI (`/memory`) | Agents list scans top-level `agents/<id>` (Agent-root copies invisible); Team/Org lists show root runs with tree member targets incl. task agents/task-team members | Agent-root copies are not browsable in Memory UI today | agent_memory.md; explorer code | High |
| BEH-007 | User | Delete / archive a delegator run from history | `endRoot` ends root, then history removes the run folder (copies inside it go with it) | Copies' memory deleted together with the delegator | standalone doc §Root lifetime | Medium — exact delete path for relocated copies to be verified in architecture |
| BEH-008 | Operational | Memory Sync export | Exports `agents` and `agent_teams` roots | Copies of Agent roots exported nested inside host folder | agent_memory.md, memory-sync | Medium |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agent-memory/store/agent-memory-layout.ts` | Single owner of memory path composition | Copy placement change is centred here | How to express "copy home" vs root-scoped placement |
| `*-execution-index.ts` (standalone, team, org) `getPhysicalScopeForAgent/Team` | Derive a copy's scope from the tree | All three roots | One shared rule for copy homes |
| Backend handles (`configured-agent-execution-handle.ts`, `collaborator-handle-preparation.ts`, `root-team-execution-directory.ts`, `task-team-execution-factory.ts`, `flat-team-execution-factory.ts`) | Compute `memoryDir` at prepare/restore | Live writes must go to the new home | Verify every memoryDir derivation |
| `run-history/services/root-run-package-current-validator.ts` | Validates root package directories | New layout must validate | Update rules |
| `app-data-migrations/*` | Startup migrations | Existing data move | Convention investigation required |
| Delete/archive of runs | Removes run folders | Relocated copies must follow their delegator's delete (no orphans) or be deliberately retained | Decide in design (REQ-009) |
| `memory-sync/source/local-memory-export-scanner.ts` | Exports local memory | New paths will be exported | Check re-upload/deletion semantics |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: per-copy `raw_traces_active.jsonl`, `raw_traces_manifest.json`, `raw_traces_<n>.jsonl`, `working_context_snapshot.json` (native), `file_changes.json`, `context_files/`, and any other run-dir files; delegator `collaboration_tree.json`/`team_run_execution_tree.json`/`agent_org_run_execution_tree.json`; communication messages files.
- Readers/writers: run recorders/memory managers (write), location services, history projections, memory explorer, context-file routes, token display capturer, migrations, Memory Sync.
- Evidence paths: see Source Log.

### Structural Surfaces

- Memory layout owner, three root execution indexes, root task execution adapters, backend handle factories, location services, memory explorer catalog, history delete/archive, run-package validator, startup migration registry.
- Existing structures that can support the behaviour: standard standalone location `agents/<runId>` and team location `agent_teams/<teamRunId>/<memberRunId>` already exist in `AgentMemoryLayout`.

### Potential Structural Impacts To Investigate

- API or external-contract change: none expected for GraphQL/REST/WebSocket; context-file and message-reference URLs keyed by run IDs must keep resolving.
- Persistence schema or invariant change: yes — physical placement of copy memory; possibly a small per-copy descriptor.
- Security or privacy boundary change: none expected (paths stay inside memory root; path-safety checks remain).
- Concurrency or lifecycle change: none intended; migration runs at startup before roots exist.
- Deployment/migration/ownership: startup data migration over all three families.
- Confirmed absent/present/unknown: present (persistence + migration); unknown: Memory Sync re-export cost; delete/archive path for relocated copies.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `du -sh agents/project_task_manager_*/collaboration` | Large delegator | 265 MB / 76 MB / 3.4 MB | Real-data proof run = PTM `7c8dce0c…` (≥265 MB) | n/a |
| Python scan of trees + copy folders | Volume | 75 copies, 367 MB, 560 files; every recorded copy has a folder | Migration must handle ~hundreds of MB; per-copy verification feasible | n/a |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via Task, 2026-10-15) | Copies should be normal runs; delegator only coordinates | Explicit | REQ-001..REQ-004 | None |
| User (via Task) | No behaviour change beyond consistency; keep listed features working | Explicit | Preserved behaviour boundary | None |
| User (via Task) | Migrate existing data safely, prove on large real run | Explicit | REQ-006..REQ-008, AC-008..AC-011 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Memory Sync hub protocol | `docs/features/memory_sync.md` | Exports `agents`, `agent_teams` | agent_memory.md | Re-export volume after move |
| Related Task 17bfe0fe | in progress (`codex/agent-input-delivery-simplification-v2`) | Same root/delivery area | worktree list | Merge conflicts |

## Persisted Data And State Facts

- Affected stored subject: every delegated copy's memory folder in all three root families.
- Location and representative shape: see BEH-001/002 and Source Log.
- Approximate volume (this machine): 75 copies, 367 MB, 560 files; largest delegator 265 MB.
- Current readers and writers: see Structural Surfaces.
- Current unknown/extra-field behavior: trees are read tolerantly and written exactly.
- Required semantics to preserve: every file of every copy byte-for-byte; tree records; messages; Task records (`agent_run_resources.json`); token usage records; context-file/message-reference URLs.
- Acceptable loss: none.
- Privacy/retention/downtime: migration runs at startup on the user's machine; must not need extra disk equal to the data size if avoidable (design).
- Remaining evidence gap: Memory Sync behaviour on moved files; delete/archive path for relocated copies; migration conventions (architecture phase).

## Product Design Request Context

- Product Design request in the current input: `Not stated`. No UI/UX design requested; no handoff.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | | | | | | |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A copy folder under `agents/` could be mistaken for a standalone run and restored outside its root | Double hosting / corrupted memory | Design: copies never get `run_metadata.json`; validator skips descriptor folders; Team catalog requires tree | Mitigated (SR-002) |
| RSK-002 | Risk | Migration interrupted mid-way | Data split across locations | Design: per-directory rename + filesystem-state recognition; post-order with FAILED_DEPENDENT | Mitigated (SR-002) |
| RSK-003 | Risk | Older app version after migration cannot find moved copies | Copies invisible on downgrade | DEC-006: downgrade not supported, data intact | Accepted |
| RSK-004 | Risk | Merge conflicts with Task 17bfe0fe | Same files | Coordinate at implementation | Open |
| UNK-001 | Unknown | Memory Sync re-export cost and deletion propagation | Bandwidth/import shape | Resolved: v1 sends replacements, no deletes; moved copies re-export once; hubs keep bounded unreferenced residue (precedent in memory_sync.md) | Resolved (SR-002) |

## Architecture Investigation Findings

| Date | Source | Exact Path / Command | Finding | Design Implication |
| --- | --- | --- | --- | --- |
| 2026-10-15 | Code | `src/agent-team-execution/domain/team-run-context.ts` (`rootIdentity` = `physicalScope.root`; containing-team check); `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts:92` (asserts identity.root == physicalScope.root) | `RootExecutionPhysicalScope` carries logical root identity, not only storage | Storage placement must be a separate value (`AgentRunMemoryPlacement`); physical scope unchanged |
| 2026-10-15 | Code | `configured-agent-execution-handle.ts:437` (`memoryDir` via `RootedAgentMemoryLocator.getLocation(physicalScope, agentRunId)`); `root-agent-execution-registry.ts:308` (root-level physical scope); `flat-team-agent-execution-handle.ts:145-157` (team context scope) | Writer-side memory dir derived from physical scope at handle construction | Handles receive explicit placement |
| 2026-10-15 | Code | `src/agent-team-execution/local/flat-team-execution-manager.ts:57-64`; `task-team-execution-factory.ts` | `TaskTeamExecutionFactory` builds both task Teams and collaborator Teams (shared `subTeamRunFactory`) | Factory input must state whether the Team is a delegated copy |
| 2026-10-15 | Code | `standalone-root-task-execution-adapter.ts:127,290`; `agent-org-task-execution-adapter.ts:121,299`; `root-team-execution-directory.ts:138,246` | Root-level Team copies built with physical scope `(root,[teamRunId])` | Root team directory sets container `delegated_team_run` |
| 2026-10-15 | Code | `listTaskExecutionChainForAgent` in standalone/team/org indexes (e.g. `team-execution-index.ts:245`, `agent-org-execution-index.ts:211`) | Innermost task execution per agent is available everywhere | Reader-side placement rule |
| 2026-10-15 | Code | `standalone-root-task-execution-adapter.ts:255`, `agent-org-task-execution-adapter.ts:250`, `team-task-execution-adapter.ts:205` | Wake check reads memory at physical-scope-derived dir | Switch to index placement |
| 2026-10-15 | Code | `src/run-history/services/root-run-package-current-validator.ts` | Startup readiness scan: `agents/*` need `run_metadata.json` (else diagnostic); `agent_teams/*` need tree (else `ROOT_RUN_PACKAGE_MISSING_TREE`); owners' dirs via physical scope | Skip descriptor folders; owners via placement |
| 2026-10-15 | Code | `src/agent-execution/services/agent-run-provisioning-service.ts` (`hasRunIdentity`, `cleanupStalePreparedRuns`); `src/run-history/services/agent-run-history-identity.ts` | Standalone identity requires `run_metadata.json` | Copies get no `run_metadata.json` (REQ-005 holds) |
| 2026-10-15 | Code | `src/api/graphql/types/memory-view.ts#getAgentRunMemoryView` | Reads `agents/<runId>` directly | Agent copy memory view works unchanged |
| 2026-10-15 | Code | `src/context-files/store/context-file-layout.ts:50-70` | Drafts outside memory; final child owners use resolved memoryDir | Context files follow placement |
| 2026-10-15 | Code | `agent-memory-explorer-service.ts`; `collaboration-member-memory-targets.ts` (task agents get `agentDefinitionId: null`) | Agents list attribution from metadata/catalog only | Explorer resolves copy definitions via coordinating root (`describeDelegatedAgentRuns`) |
| 2026-10-15 | Code | `standalone-root-task-source-resolver.ts`; `team-task-source-resolver.ts` | Pure source resolution over an index | Reuse for copy definition lookup |
| 2026-10-15 | Code | `agent-run-history-catalog-service.ts#deleteRun` (removes `agents/<id>`), `team-run-history-catalog-service.ts#deleteTeamRun` (removes package with index compensation), `agent-org-run-history-catalog-service.ts#deleteStored` | Deletes only own package | Post-commit copy-folder removal helper |
| 2026-10-15 | Code | `src/server-runtime.ts:178-200`; `app-data-migration-runner.ts#runPending` | Migrations run before server build/listen; non-terminal migrations retried next start; startup not gated on success; `RootRunPackageReadinessIndex.rebuild()` after migrations | `STARTUP_ONLY` migration, registered last |
| 2026-10-15 | Code | `src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts` | Predecessor directory-rename migration with lstat dispositions | Pattern reused |
| 2026-10-15 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | No lockout; rename not copy; no journal/backup/hash; recognize already-current; frozen source shapes | Migration plan in design spec |
| 2026-10-15 | Doc | `autobyteus-server-ts/docs/features/memory_sync.md` §Nested Team Memory Layout Upgrades | Moves leave bounded unreferenced hub residue; precedent approved | No Memory Sync change |
| 2026-10-15 | Code | `src/agent-collaboration/execution/task/root-task-execution-adapter.ts` | Adapters own prepare/commit/abort | Descriptor written in adapter commit before tree write; removed on abort |

## Requirement Implications

- Copies exist in all three root families on real data → scope covers Agent, Team and Org delegators (DEC-001).
- Copy folders carry no self-description today; once moved into `agents/` the Agents memory list would show them as "Unattributed" unless they identify their definition → REQ-004.
- Standalone identity is "has `run_metadata.json`" → a moved copy must not become restorable as an independent standalone run → REQ-005.
- Large real data (265 MB delegator) → measurable proof AC-011.

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto: layout owner, three execution indexes, task adapters, backend handles, location services, explorer, delete/archive, package validator, migration registry.
- Mandatory: migration-conventions investigation before choosing migration semantics.
- Verify every place computing a copy's `memoryDir` (prepare, restore, activity inspector, readers).
- Verify delete/archive of a delegator removes or deliberately handles relocated copy folders (REQ-009).
- Check Memory Sync export scanner behaviour on moved paths.


## SR-004 Resume Findings (2026-10-15, base `5096011674`)

| Source | Exact Source / Command | Finding | Implication |
| --- | --- | --- | --- |
| Git | `git merge --ff-only origin/personal` in this worktree | base now `5096011674` (tool split + collaboration model landed) | revise on this base |
| Code | `standalone-root-task-execution-adapter.ts#planActivation` (and Org/Team adapters) | new copies are always root-hosted (CM-1 refuses teammates); Team-hosted copies exist only as stored history | placement rule unchanged; nested-host branch only for stored copies |
| Data | `~/.autobyteus/server-data/memory` (not yet upgraded locally) | 9 stored collaborators (2 Agent-root Teams, 7 Team-root) become copies on upgrade (`20261015_collaborators_to_delegated_runs_v1`); their folders total ≈48 MB at the root-level copy location | copies to move ≈84 / ≈415 MB; this ticket's migration must be registered after the collaborator conversion |
| Data | `ls -la` over `agents/*/collaboration/communication_messages.json`, `agent_teams/*/team_communication_messages.json`, `agent_orgs/*/agent_org_communication_messages.json` | 633 message logs, 100 MB total; PTM `7c8dce0c…` log 3.2 MB / 875 messages; largest Org log ≈22.9 MB | only logs of runs with copies are split |
| Code | `agent-collaboration/execution/communication/root-communication-engine.ts`, `root-communication-adapter.ts`; per-family adapters + persistence coordinators (`standalone-root-persistence-coordinator.ts#commitCommunication`, team/org equivalents) | one in-memory list per coordinating run; each append atomically rewrites one file; recipient input reservation committed after durability | writer becomes per-owner-run logs; in-memory union kept |
| Code | readers: `team-communication-projection-service.ts` (views + reference resolution), `agent-collaboration-view-projector.ts` / `agent-org-execution-view-projector.ts` (`communication_messages` in snapshots), `api/rest/{team-communication,agent-collaboration-references,agent-org-references}.ts`, state-package validators/loaders (`team-run-state-package-validator.ts:23-25` message endpoints must be in the tree), `root-run-package-current-validator.ts` (required files) | all read one file per coordinating run | read the union of the run's log and its delegated runs' logs |
| Code | `context-files/services/context-file-record-locators.ts` | message-file scan used only by released migrations (`team-context-file-execution-locators-v1`, `agent-org-flat-team-families-v1`) | not affected (they run before this migration) |

## ARCH-REV-001 Verification (2026-10-17, SR-007)

- ARCH-F-001 confirmed and widened. Released migrations importing modules this ticket changes (grep of
  `src/app-data-migrations/migrations`, base `db00ba16a9`): `collaborators-to-delegated-runs-v1`
  writes and reads trees through `StandaloneRootPackageStore#writeTree/readTree`,
  `TeamRunExecutionTreeStore#write/read`, `AgentOrgRunExecutionTreeStore#write/read` (lines 172–183);
  `agent-org-history-first-message-summary-v1` reads org trees and messages through the current
  stores; `agent-org-flat-team-families-v1` and `team-run-migration-state-classifier` use the current
  message stores; `team-context-file-execution-locators-v1` uses `RootRunPackageCurrentValidator`; the
  two snapshot migrations use `RuntimeMemoryLocationClassifier` → `createStoredCollaborationExecutionLocationService`.
  Widened: collaborators-v1 is pending for every user upgrading from a release before 2026-10-15
  (it shipped only in the 1.5.5 betas), and through the new stores its converted records would get own
  files at L1 before their memory moved (S27). `AgentMemoryLayout` methods used by migrations
  (`getRootedAgentRunDirPath`, `getTeamAgentRunDirPath`, `getTeamDirPath`, `getOrgDirPath`, …) stay
  unchanged. The runner skips a migration whose prerequisites are not `SUCCEEDED` /
  `SUCCEEDED_WITH_WARNINGS` and retries it (`app-data-migration-runner.ts:121-166`).
- ARCH-F-002 confirmed: `TaskTeamNestedTeamExecution` (`run-execution-tree-shared-records.ts:115`),
  restored by `task-team-node-restoration.ts`; nested team members' memory uses the ancestor team run
  ids as path segments (`AgentMemoryLayout#getRootExecutionDirPath`, `ancestorTeamRunIds`).
- ARCH-F-003 confirmed (contract §8 step 5 did not define merge or already-moved task agents).
- ARCH-F-004 confirmed (several store instances and writers).
- New, found while verifying: `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` require
  every message endpoint to be in the index (`team-run-state-package-validator.ts:23-25`), and the
  stores rewrite whole logs from the in-memory list. A task agent that is not available would make its
  coordinating Team or Org run fail to load, and a whole-log rewrite would erase its messages → L6.
- Task tools on this base are `create_task` / `update_task` (server source), not `create_or_update_task`.

## Resume After The Nested Task-Team Cleanup (2026-10-17, SR-008)

- Base fast-forwarded `db00ba16a9` → `66429d6f31` (`git diff --stat` on `autobyteus-server-ts/src`: 39 files, +338 / −500;
  the cleanup removed `TaskTeamNestedTeamExecution`, narrowed `TeamRunAgentTeamNode.children`, added skip-and-warn to
  `standalone-root-location-service.ts`; no migration added; released migrations unchanged).
- Nested task-team members: none in current code; none in data (633 trees, read-only; the user: "Nobody has ever used
  the nested team"). Placement nested level, F-C2N, AC-022, S32 withdrawn.
- ARCH-F-006 verified: `app-data-migration-runner.ts#assertPrerequisites` requires `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`
  (lines 121-166); `runPending` continues past a failed migration (lines 56-80); released deterministic FAILED
  dispositions exist (report P-006). Tree-writing predecessors at the base: `20260814_team_run_execution_tree_v1`,
  `20260824_team_run_execution_tree_v2`, `20260901_agent_org_flat_team_families_v1`,
  `20261015_collaborators_to_delegated_runs_v1` (collaborators-v1 returns `SKIPPED_ALREADY_CURRENT` for a tree without
  collaborators before validating — `collaborators-to-delegated-runs-v1-app-data-migration.ts:139-145`).
- Locator migration (`20260926`) treats invalid packages per package (`PRESERVED_INVALID_PACKAGE`), so a retry after
  the move cannot fail globally; it leaves a moved task agent's unconverted reference as is.
