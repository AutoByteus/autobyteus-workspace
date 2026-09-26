# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history, resume metadata, workspace
history listing, and read-model projection for standalone Agent runs, Team runs,
and AgentOrg roots.

## Responsibilities

- Persist standalone agent run resume metadata and the V2 standalone history catalog index.
- Persist the current V2 TeamRun state package and the V2 team history catalog
  index.
- Persist the current AgentOrg V1 package family and AgentOrg history catalog
  index without converting either root family into a generic on-disk schema.
- Keep standalone index mutation behind `AgentRunHistoryCatalogService`; normal runtime, GraphQL, and lifecycle code must not rewrite `run_history_index.json` directly.
- Keep team index mutation behind `TeamRunHistoryCatalogService`; normal runtime, GraphQL, and lifecycle code must not rewrite `team_run_history_index.json` directly.
- Keep normal AgentOrg index mutation behind
  `AgentOrgRunHistoryCatalogService`, whose shared catalog core owns the strict
  first-non-empty summary policy. `AgentOrgRunHistorySummaryWriter` remains a
  historical migration owner, not a current runtime query/write path.
- Keep legacy/partial standalone and team index repair explicit and bounded to startup app-data migrations, plus the standalone manual migration script; normal history listing must not perform metadata-directory repair scans.
- Expose resume configuration for stored runs:
  - agent: `agent-run-resume-config-service.ts`
  - team: `team-run-history-service.ts#getTeamRunResumeConfig(...)`
- Keep resume configuration and model-setting editability truthful about General
  Process activity, archive/catalog state, and live Application ownership.
- Validate stopped-run model/settings selections within the fixed runtime:
  external runtimes require fresh catalog membership and target-schema validity,
  while AutoByteus additionally requires verified non-decreasing context for
  replacements. Persist only the coherent `llmModelIdentifier` + `llmConfig` pair.
- For standalone agent runs, frontend follow-up sends should not restore
  directly; the backend `SEND_MESSAGE` command coordinator owns
  restore/start/send lifecycle. WebSocket connection can attach to a durable
  run identity and surface status projection without restoring the runtime.
  Team follow-up sends remain owned by the team restore/resolve boundary.
- Project standalone visible status through `AgentRunStatusProjectionService`, with precedence `COMMAND_OVERLAY` first, active runtime second, prepared/historical metadata fallback third.
- Normalize local application-owned replay traces into the canonical run-history replay bundle:
  - agent: `agent-run-view-projection-service.ts`
  - team member: `team-member-run-view-projection-service.ts`
- Group agent and team history by workspace:
  - `workspace-run-history-service.ts`

## GraphQL Surface

- Agent/workspace history resolver: `src/api/graphql/types/run-history.ts`
- Team history resolver: `src/api/graphql/types/team-run-history.ts`

Workspace + agent operations:

- `listWorkspaceRunHistory(limitPerAgent)` for global/default history grouping, such as recent-history style surfaces. It is not the authority for desktop top-level workspace rows.
- `workspaceRunHistory(workspaceId, limitPerAgent)` for history under one visible workspace. The resolver resolves registered filesystem workspace ids through the workspace registry, resolves the fixed default temp workspace id through the temp workspace lifecycle, and rejects missing, unregistered, removed filesystem, or unrelated transient workspace ids.
- `getRunProjection`
- `getAgentRunResumeConfig`
- `agentRunModelOptions(agentRunId)`
- `updateStoppedAgentRunModelConfig(input)`
- `archiveStoredRun`
- `deleteStoredRun`

Team operations:

- `getTeamRunResumeConfig`
- `teamRunModelOptions(teamRunId)`
- `updateStoppedTeamRunModelConfigs(input)`
- `getTeamMemberRunProjection`
- `archiveStoredTeamRun`
- `deleteStoredTeamRun`

Collaboration-root operations:

- `listCollaborationRootHistory`, which returns explicit `agent_team` or
  `agent_org` roots through family-specific strict loaders.

AgentOrg stored-run operations (owned by the AgentOrg run resolver rather than
the mixed collaboration-root reader):

- `archiveStoredAgentOrgRun(orgRunId)`
- `deleteStoredAgentOrgRun(orgRunId)`

## Collaboration Root Package Readiness

Team and AgentOrg history packages share one process-local strict readiness
generation. Normal server startup explicitly rebuilds that generation before
the HTTP server listens. Family history readers and the AgentOrg history
catalog then call the shared `awaitReady()` contract: they reuse the current or
in-flight generation, or lazily start one strict generation when startup has
not established it. A first AgentOrg history read must not force a second full
Team-and-AgentOrg package scan after startup readiness has already completed.

The shared generation is structural: it enforces exact Team/AgentOrg family
placement, required and retired package manifests, execution trees, task
sidecars, and communication sidecars. It does not enumerate or read member
`raw_traces_active.jsonl`, rotated `raw_traces_*.jsonl`, or context-file bytes.
Whole-history attachment-locator conversion and validation belongs to the
one-time migration; exact file availability is checked when that file is
requested.

Readiness failure rejects the history operation; it is not converted into a
successful empty result and cannot publish unvalidated index rows. After
readiness succeeds, Team and AgentOrg catalog queries read their strict current
indexes without scanning trees to derive rows or writing indexes. Readiness
state is reconstructed in memory for each process and changes no history
package or index format, so no persisted-data migration is required.

## Stopped Run Model Configuration

Studio exposes one revision-free edit contract for persisted standalone Agent
and Team runs. `getAgentRunResumeConfig` and `getTeamRunResumeConfig` return the
canonical stored configuration together with `modelConfigEditability`. The
mutable selection is the coherent `llmModelIdentifier` + `llmConfig` pair;
runtime kind, run identity, workspace, automatic-tool policy, provider binding,
Team topology, and all other launch facts remain fixed. Both Save commands
require a nonblank model identifier and an explicitly present, nullable
`llmConfig`; omission is not an implicit request to reuse old settings. Agent
results return `canonicalSelection` (replacing `canonicalLlmConfig`); Team
results retain `canonicalExecutionTree`.

The GraphQL resolvers use `StudioRunModelConfigService` rather than calling the
General history owners directly. That service first reads the canonical
General resume configuration and then asks the read-only
`ApplicationRunOwnershipService` whether the exact identity has a live
Application lease. A General-managed run or a binding in `ATTACHED`,
`TERMINATING`, or `FAILED` state is locked. Application ownership lookup waits
for startup recovery and cross-checks global lookup state, persisted
`applicationId`/`bindingId` provenance, the referenced binding, and contained
Agent/Team identity. Missing or inconsistent ownership evidence fails closed;
it never produces a false editable state or a General write.

When no Application lease exists, stopped updates delegate to the existing
General lifecycle owners:

- `StandaloneAgentRunLifecycleService.updateStoppedModelConfig(...)` shares one
  per-run transition lane with restore/activation and commits the validated
  pair to `run_metadata.json` through `AgentRunHistoryCatalogService`.
- `AgentTeamRunManager.updateStoppedModelConfigs(...)` shares the root
  transition lane with Team restore. Each patch names the root Team `/` or one exact direct Agent address, can
  change only that scope's `llmModelIdentifier`/`llmConfig` pair, and commits the
  resulting current V2 execution tree. Task nodes and fixed launch identity are
  not mutation targets.

`RunModelSelectionService` resolves the selected model in the fixed runtime's
current catalog. Claude Agent SDK, Codex App Server, and Antigravity CLI
replacements require fresh **offered** catalog membership and valid target settings, without
a platform context-capacity comparison. AutoByteus replacements additionally
require verified positive saved and target capacities, with the target at least
as large as the freshly saved baseline for that scope. Smaller or unknown
AutoByteus capacity fails validation. Picker options are advisory and never
substitute for fresh Save-time validation. There is no additional input-budget,
output-reservation, tokenizer, or compaction-threshold matching rule. Keeping
the same model bypasses the native replacement-capacity comparison, but still
requires exact-current model availability and valid settings. For Claude, a
proven redundant `default` alias is omitted from new offers, but a run already
saved as exact `default` retains its current descriptor/schema and can edit
same-model settings while the raw SDK still reports it. Options return that
nullable current descriptor separately from replacement descriptors; a current
ID is never rewritten merely because a recommended sibling is offered.

The server validates submitted values against the selected model's current
schema. Unknown keys,
invalid types/ranges/enums, missing required values, unavailable models, and
unavailable schemas produce explicit non-success outcomes without persistence.
Successful responses are `UPDATED` or `UNCHANGED`; other outcomes include
`RUN_ACTIVE`, `RUN_ARCHIVED`, `NOT_FOUND`, `MODEL_UNAVAILABLE`,
`SCHEMA_UNAVAILABLE`, `VALIDATION_FAILED`, `PERSISTENCE_FAILED`,
`PERSISTENCE_INDETERMINATE`, and `INTERNAL_ERROR`. Every result carries the
best canonical state, current editability, and field errors when available so
the client can relock or reconcile instead of assuming success. If a Team write
may have committed but canonical readback fails, the outcome is indeterminate
with the last known tree, not a claimed rollback. The client verifies canonical
state and locks duplicate Save until refresh/Retry succeeds; verification does
not retry the write.

A successful save does not hot-mutate a live backend. The next eligible
General restore of the same Agent/Team/provider identity consumes the persisted
model/settings pair. Save does not compact, convert, reset, or rewrite history
or retained compaction state, and it does not create a new provider conversation.
Ordinary later execution retains the existing runtime compaction algorithm;
future budgets and timing need not be identical across models. There is no
configuration revision, optimistic rebase, or
multi-writer compatibility field. Current metadata and Team V2 packages are
updated in place, so no persisted-data migration is required. Frontend/backend
must use the complete-pair API together; there is no old-client fallback.
See [LLM Management](./llm_management.md#persisted-run-model-selection-validation)
for runtime-specific catalog/schema validation and the AutoByteus capacity limit.

## Default History Visibility, Archive, And Delete Semantics

The default `listWorkspaceRunHistory` response is intentionally a visible
history tree, not a complete retention inventory. It excludes inactive
standalone agent runs whose V2 catalog row contains `archivedAt` and inactive
team runs whose V2 catalog row contains `archivedAt` before workspace grouping
and count projection. If an archived run or team is active again through a
restore/resume path, it remains visible while active so live work is not hidden.

Archive is a non-destructive visibility action:

- `archiveStoredRun(runId)` writes `archivedAt` on the V2 standalone
  catalog row in `memory/run_history_index.json` through
  `AgentRunHistoryCatalogService`; it does not add standalone archive state to
  `memory/agents/<runId>/run_metadata.json`.
- `archiveStoredTeamRun(teamRunId)` first writes `archivedAt` into the V2
  `team_run_execution_tree.json`, then projects that fact into
  `memory/team_run_history_index.json` through
  `TeamRunHistoryCatalogService`.
- `archiveStoredAgentOrgRun(orgRunId)` writes one canonical `archivedAt` into
  the AgentOrg V1 execution tree and projects it into
  `memory/agent_org_run_history_index.json` through
  `AgentOrgRunHistoryCatalogService`.
- Archive keeps the run metadata/Team or AgentOrg package, raw traces,
  projections, member directories, and catalog/index rows on disk.
- Archive rejects active roots and invalid or path-unsafe ids before catalog or
  package mutation. AgentOrg admission is serialized in the manager's exact-root
  lifecycle lane, so a stale stopped client cannot race a restore.
- Existing standalone, Team, or AgentOrg catalog rows with no `archivedAt` are
  visible by default.

Permanent delete remains a separate destructive action. `deleteStoredRun` and
`deleteStoredTeamRun` remove the persisted run/team storage and corresponding
history index entries instead of only hiding the row.
`deleteStoredAgentOrgRun(orgRunId)` likewise removes only the confirmed exact
stopped AgentOrg package and its AgentOrg index row. It does not delete the
AgentOrg definition, referenced Agent/Team definitions, workspace registration,
providers, or sibling histories. The current product slice does not expose an
archived-list or unarchive GraphQL/UI path; archived data remains retained on
disk for future recovery tooling. No migration is introduced.

## Workspace Registry Interaction

Run history is retained independently of workspace-list visibility. Removing a workspace from Workspaces deletes the workspace registry entry only; it does not delete `memory/run_history_index.json`, `memory/team_run_history_index.json`, standalone metadata or Team package directories, raw traces, artifacts, or generated files.

Top-level desktop workspace rows should come from the visible workspace list via
the `workspaces()` query. Historical run/team records for an unregistered or
removed root must not recreate a top-level workspace row. When a visible
workspace row is expanded, the frontend calls
`workspaceRunHistory(workspaceId, limitPerAgent)` so history is loaded for that
resolved root. Registered filesystem rows resolve through the registry; the
fixed default temp workspace row resolves through the temp workspace lifecycle
and is intentionally non-removable. Re-adding the same filesystem root restores
the deterministic workspace id and allows the preserved history for that root to
be shown again.

`listWorkspaceRunHistory(limitPerAgent)` still returns grouped history across roots for global/recent-history consumers that intentionally need that broader view. Those consumers should not be treated as workspace-list authorities.

## Standalone Status Projection And Prepared Identities

Standalone workspace history rows separate durable catalog facts from live
runtime projection. The standalone GraphQL history item exposes these catalog
facts from the V2 index:

- `runId`
- `summary`
- `createdAt`
- `archivedAt`
- `terminatedAt`

It also exposes list-time status projection fields:

- `status`: public UI status (`offline`, `initializing`, `idle`, `running`, or
  `error`).
- `isActive`: whether the row currently represents active/current work for
  visibility and archive filtering.
- `shouldConnectStream`: whether the frontend should connect to
  `/ws/agent/:runId` even when there is not yet an active runtime subject, for
  example while a command overlay is initializing.
- `statusSource`: `COMMAND_OVERLAY`, `ACTIVE_RUNTIME`, `PREPARED_IDENTITY`,
  `HISTORICAL_METADATA`, `TERMINATED_METADATA`, or `MISSING`.

Standalone history rows no longer expose or persist `lastKnownStatus`,
`lastActivityAt`, or `activationState`. Live status is runtime/command-overlay
state; the history catalog is not a durable status log. Projection precedence is
command overlay first, active runtime second, and prepared/historical metadata
fallback third. A command overlay `initializing` projects as active and stream
connectable with `statusSource=COMMAND_OVERLAY`; a command overlay `error`
projects as non-interruptible `error`. If a row has `terminatedAt` and no active
projection, the list response reports `status=offline` and
`statusSource=TERMINATED_METADATA`.

## Team Live Projection And V2 Catalog Rows

Team workspace history rows separate durable package/catalog facts from live
runtime projection. The team GraphQL history item exposes catalog facts from
`memory/team_run_history_index.json`:

- `teamRunId`, `teamDefinitionId`, and `teamDefinitionName`;
- root `workspaceRootPath`;
- `summary`, `createdAt`, `archivedAt`, and `terminatedAt`.

It also exposes:

- `isActive`: the manager-owned binary fact for the root TeamRun;
- `members`: flat configured-Agent status snapshots derived from the V2 tree and
  current runtime state; and
- `rootTeam`: the flat V2 execution-tree projection used for direct-Agent and
  task-execution display and reopen.

`TeamRunHistoryService` starts from admitted catalog rows, reads the matching V2
execution tree, and skips rows whose tree is missing or invalid. It does not read
`team_run_metadata.json` or reconstruct a tree from flat members. The tree owns
coordinator identity, complete Team defaults, complete Agent launch snapshots,
application binding, handoffs, and task execution topology. The index owns the
list-oriented summary and `terminatedAt` while projecting identity, creation,
root workspace, and archive facts from the tree.

`TeamRunLiveProjectionService` derives root `isActive` and exact configured-Agent
status snapshots from the active manager at list time. If a Team has no active
runtime, `isActive` is false and its Agents default to `offline`; no five-state
root status is calculated or persisted. Catalog rows do not persist
`lastKnownStatus`, `lastActivityAt`, or `deleteLifecycle`.

AgentOrg history is a separate current package family. The unified
`listCollaborationRootHistory` query returns an explicit `root_subject_kind`
(`agent_team` or `agent_org`) plus the family projection. AgentOrg rows start at
`memory/agent_org_run_history_index.json`; `AgentOrgRunHistoryCatalogService`
and `AgentOrgRunPackageCatalog` require the matching V1 execution tree and both
V1 sidecars. The coordinator-free `rootOrg` contains direct Org Agents and
direct mounted Teams with their direct Agents. Family-specific loaders remain
authoritative; the unified list does not convert either persisted root into a
generic on-disk schema.

AgentOrg summaries follow the established Team first-message rule. Only a
successfully accepted external `SEND_MESSAGE` with non-empty compacted content
to an exact configured direct or mounted-Team Agent qualifies. The shared
compactor collapses whitespace, trims, and caps the title at 100 characters
(97 plus `...` when truncated). The first non-empty summary wins; later,
task-scoped, inter-Agent, task/system, approval/interrupt, rejected, and failed
inputs cannot replace it. Before any qualifying input, an empty summary remains
valid and clients display `New - <AgentOrg name>`.

The AgentOrg catalog serializes normal-runtime attempts and supplies a strict
row snapshot to `AgentOrgRunHistorySummaryWriter`. A successful first write is
atomically replaced and strictly reread before the catalog adopts it. The
shared `atomicWriteJsonFile` returns the original operation to its caller while
storing a distinct handled settlement tail for per-path ordering and cleanup.
Consequently, a caller can observe one deterministic write failure without an
unhandled-rejection escape, later queued same-path writes remain ordered, and
the failed write does not poison the process or queue.

Startup migration `20260905_agent_org_history_first_message_summary_v1`
preserves existing non-empty values and considers configured-member complete
trace corpora only for empty rows. Root communication/task sidecars can
disqualify internal provenance but never qualify it. The migration writes only
one uniquely earliest qualifying external user trace; absent or ambiguous
evidence retains the valid empty fallback with `SUCCEEDED_WITH_WARNINGS`, while
required structure or selected-value persistence/reread failures are
`FAILED`. Normal list/read paths never scan traces to repair summaries.

Prepared-new run identities are explicit metadata facts, not inferred from a
missing `platformAgentRunId` and not represented by a persisted
`activationState`. Prepared metadata stores `preparedAt`, `preparedExpiresAt`,
`platformAgentRunId: null`, resume configuration, and the memory directory. A
prepared identity has a memory directory and V2 catalog row, but no runtime
until the first backend-owned `SEND_MESSAGE` activates it. Activation records
`startedAt` and the exact external provider ID when applicable while preserving
the catalog row. Native AutoByteus activation keeps `platformAgentRunId: null`.
GraphQL `prepareAgentRun` may return `activationState: "PREPARED"`
as a launch API response field, but that value is not a stored standalone
history or metadata field. Explicit cancellation and stale-prepared cleanup
remove only unactivated prepared identities.

## Persistence Files

Memory root:

- `memory/run_history_index.json`
- `memory/team_run_history_index.json`
- `memory/agent_org_run_history_index.json`
- `memory/agents/<runId>/...`
- `memory/agent_teams/<teamRunId>/...`
- `memory/agent_orgs/<orgRunId>/...`

Standalone agent persisted files:

- V2 catalog index: `memory/run_history_index.json`, with rows containing only
  `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`,
  `createdAt`, `archivedAt`, and `terminatedAt`
- metadata: `memory/agents/<runId>/run_metadata.json`, containing resume/config
  and prepared/start facts such as `runId`, `agentDefinitionId`,
  `workspaceRootPath`, `memoryDir`, `runtimeKind`, `llmModelIdentifier`,
  `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `platformAgentRunId`,
  `preparedAt`, `preparedExpiresAt`, `startedAt`, and optional
  `applicationExecutionContext`
- runtime memory artifacts: all runtimes can have `memory/agents/<runId>/raw_traces_active.jsonl`; native AutoByteus runs additionally own `working_context_snapshot.json`, while new Codex/Claude recording does not create or update that snapshot
- rotated raw-trace segments after native compaction or provider-boundary rotation: `memory/agents/<runId>/raw_traces_manifest.json` plus direct `memory/agents/<runId>/raw_traces_<zero-padded-index>.jsonl` files

Team persisted files:

- V2 team catalog index: `memory/team_run_history_index.json`, with rows
  containing only `teamRunId`, `teamDefinitionId`, `teamDefinitionName`,
  `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and
  `terminatedAt`
- current V2 execution tree:
  `memory/agent_teams/<rootTeamRunId>/team_run_execution_tree.json`, containing
  `schemaVersion: 2`, creation/archive facts, application binding, handoffs, one
  flat configured root with direct Agents, and task execution snapshots. The
  root carries a complete `defaultLaunchConfiguration`; every direct configured
  Agent carries a complete `launchConfiguration`.
- member runtime memory artifacts: direct members use
  `memory/agent_teams/<rootTeamRunId>/<agentRunId>/...`; Agents in delegated task
  Teams use the same root followed by concrete task-TeamRun IDs in physical
  `ancestorTeamRunIds` order and then the AgentRun ID. Every supported runtime
  can persist `raw_traces_active.jsonl`; only native AutoByteus continuation
  owns new `working_context_snapshot.json` writes.
- optional member rotated raw-trace segments: stored beside the member memory artifacts in that root-hierarchical Team/Agent directory, for example `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<agentRunId>/raw_traces_manifest.json` plus direct `raw_traces_<zero-padded-index>.jsonl` files
- versioned team communication projection:
  `memory/agent_teams/<rootTeamRunId>/team_communication_messages.json`
- versioned task delegation records projection:
  `memory/agent_teams/<rootTeamRunId>/task_delegation_records.json`

AgentOrg persisted files:

- V1 Org catalog index: `memory/agent_org_run_history_index.json`, with rows
  containing `orgRunId`, definition identity, workspace, summary,
  creation/archive facts, and termination fact
- current V1 execution tree:
  `memory/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json`, containing
  `schemaVersion: 1`, `subjectKind: "agent_org"`, a coordinator-free `rootOrg`,
  direct Org Agents, direct mounted Teams with their direct Agents, handoffs,
  effective launch configurations, concrete identities, application binding,
  and task snapshots
- versioned communication projection:
  `memory/agent_orgs/<orgRunId>/agent_org_communication_messages.json`
- versioned task projection:
  `memory/agent_orgs/<orgRunId>/agent_org_task_delegation_records.json`
- rooted member runtime artifacts below `memory/agent_orgs/<orgRunId>/...`,
  resolved by root identity and concrete configured/task ancestry

Important identity/storage rules:

- `AgentRunHistoryCatalogService` is the normal semantic owner for standalone
  catalog mutations: prepare/create, first/explicit summary update,
  archive/unarchive, terminate, delete/cancel, and catalog flush
- Run-history owns standalone metadata/catalog semantics, but it must not own
  duplicate memory-directory composition. Standalone storage paths resolve
  through `src/agent-memory/store/agent-memory-layout.ts` and already-persisted
  `memoryDir` values; team/member storage paths resolve through the shared
  `AgentMemoryLocationService`.
- `TeamRunHistoryCatalogService` is the normal semantic owner for Team catalog
  mutations: create/restore, first/explicit summary update,
  archive/unarchive, terminate, delete/cancel, and catalog flush
- `AgentOrgRunHistoryCatalogService` is the normal semantic owner for AgentOrg
  catalog mutations; `AgentOrgRunPackageCatalog` admits only complete current
  V1 packages
- Team and AgentOrg catalogs share the narrow
  `CollaborationRunHistoryCatalogCore` policy: state and write queues are keyed
  by resolved memory directory **and family**, initialization strictly reads
  the existing index once per process-local state, and queries expose only
  admitted rows with normalized summaries. The index decides history-row
  membership and index-only summary/termination facts. Execution trees remain
  authoritative for package details and tree-owned archive facts at lifecycle
  mutation or explicit repair, not an implicit source of missing rows.
- A missing Team or AgentOrg index reads as an empty catalog; a corrupt index
  fails visibly and is not overwritten. A valid tree without an index row stays
  unlisted until an explicit local repair. First and subsequent catalog queries
  do not reconcile trees, write an index, or infer lost index-only facts.
- ordinary message activity and live status transitions must not rewrite any
  standalone, Team, or AgentOrg history index
- normal standalone history listing reads the V2 index/in-memory catalog; it
  does not scan every `memory/agents/*/run_metadata.json` to repair missing rows
- normal Team history listing starts from admitted index rows and reads each
  row's exact V2 `team_run_execution_tree.json`; it does not read predecessor
  `team_run_metadata.json`, reconstruct topology from flat members, or admit an
  incomplete package
- normal AgentOrg history listing starts from the AgentOrg index and reads each
  exact V1 execution tree and sidecar set; it never falls back to a Team package
- Team archive, unarchive, and delete acquire the family catalog queue before
  the manager's exact-root `withInactiveHistoryMutation` lane. The managed-root
  check happens inside that lane, so restore cannot race a stale precheck;
  determinate archive failure compensates and verifies prior tree/index state.
  AgentOrg archive/delete retain the same queue-before-manager-lane order.
- Missing-row recovery is the explicit offline, local-only
  [`repair-collaboration-run-history-index`](../../scripts/repair-collaboration-run-history-index.md)
  command: dry-run by default, backup and strict readback on apply, never a
  normal query/startup or imported-memory operation. Existing valid current
  Team/Org index arrays are directly usable without a data migration.
- `TeamRunPackageCatalog` and `AgentOrgRunPackageCatalog` perform bounded family-
  specific admission and exclude predecessor, incomplete, malformed, or
  unsupported roots from runtime/history
- `TeamRunMetadataMemberTreeMigration` and
  `TeamRunHistoryIndexV2AppDataMigration` remain legacy migration boundaries;
  current runtime code does not depend on schema-v3 Team metadata
- `20260814_team_run_execution_tree_v1` owns predecessor interpretation and
  promotion to a complete migration-owned V1 package
- `20260823_repair_team_agent_memory_layout` uses that V1 intermediate to repair
  unambiguous nested-member directory layout
- `20260824_team_run_execution_tree_v2` is the required current-schema cutover:
  it preserves the existing execution facts, adds `/` at the root, maps runtime
  labels, and materializes every Team default from its unique direct coordinator
  launch snapshot before current readers operate
- `20260901_agent_org_flat_team_families_v1` is the required startup-only
  fixed-depth family cutover. Current flat Team V2 packages remain native with
  zero writes; supported former multi-Team packages become AgentOrg V1 packages
  and index rows. Preflight, atomic replacement/rename, reread validation, and
  deterministic restart Retry precede target-only admission. Two exact
  root-local outcomes remain failed item details, contribute to `failedCount`,
  and produce terminal `SUCCEEDED_WITH_WARNINGS` only when no fatal outcome is
  present: a missing required legacy `team_run_execution_tree.json` before a
  candidate plan exists (the source is unchanged), and a repository-typed
  malformed/conflicting legacy token-attribution-data rejection (the root SQL
  transaction rolls back and the affected Org remains locally guarded). The
  shared runner skips that terminal warning on later startups. Root/family/tree
  structural faults, SQL/query/update faults, changed preconditions, strict
  reread or dependency failures, and every other sidecar, locator, writer,
  commit, index, cleanup, postcondition or unknown failure remain `FAILED` and
  retryable; global token discovery and any other fatal outcome dominate
  warnings.
- required startup app-data migration
  `20260706_remove_global_skill_discovery_mode` rewrites persisted
  `skillAccessMode: "GLOBAL_DISCOVERY"` values in standalone run metadata and
  recursive team metadata to `PRELOADED_ONLY`, creates per-file backups for changed files, and reports
  migrated/skipped/failed item counts. Current metadata parsing accepts only
  `PRELOADED_ONLY` and `NONE`; history restore must not resurrect all-installed
  skill discovery from older metadata.
- required startup app-data migration
  `20260731_remove_external_runtime_working_context_snapshots` discards only
  exact current-metadata-classified Codex/Claude standalone and recursive
  team-member snapshot copies. It preserves native, imported, unclassified,
  invalid-metadata, and task-like locations plus every raw trace, archive,
  metadata record, provider resume id, and artifact. Partial cleanup is
  reported and retryable without blocking later startup migrations; retained
  files can remain generically inspectable until retry.
- manual fallback repair belongs to
  `scripts/migrate-agent-run-history-index-v2.mjs`; see
  `scripts/run-history-index-migration.md` before running cleanup against old
  memory directories
- Skill Improvement no longer stores launch-time eligibility snapshots in run
  history metadata. Manual skill-improvement uses current global settings plus the
  current active target state at click time. Required startup app-data migration
  `20260623_remove_self_evolution_run_metadata` removes obsolete
  `skillImprovementEffective` fields from standalone `run_metadata.json` files and
  recursive team member metadata entries, creates per-file backups for changed
  metadata, and reports migrated/skipped/failed item counts. History listing and
  manual start flows must not rely on stale `skillImprovementEffective` metadata.
- standalone runs persist an explicit `memoryDir` in agent metadata
- new concrete agent runtime ids are allocated by `AgentRunIdentityAllocator` before backend creation and use `<agent_definition_name_slug>_<uuid-without-dashes>`; the slug is readability-only and the entire id is treated as opaque
- standalone, team-member, and task-agent `AgentRun` ids use the same allocator-backed identity policy; new production paths do not derive ids from runtime kind, route key, team run id, or task id
- new Team runs use `<team_definition_name_slug>_<uuid-without-dashes>` generated
  by `TeamRunService`; a standalone configured Team has one opaque root
  `teamRunId`, while delegated task Teams receive separate task-scoped run IDs
- new AgentOrg runs receive one opaque `orgRunId`; each direct mounted Team has
  its own concrete `teamRunId` inside the Org V1 tree
- historical persisted run ids remain stored literally under their existing memory directories and are not rewritten or validated against the new generated shape
- Team member logical identity is one canonical rooted `memberAddress`; bare
  names, paths, and route keys are not current runtime/history selectors
- Team-member memory identity is root-hierarchical: direct configured members
  use `rootTeamRunId + agentRunId`; task-Team members add concrete task TeamRun
  IDs to `ancestorTeamRunIds`; task Agents use the same physical scope plus
  their generated `taskAgentRunId`
- AgentOrg member memory uses the AgentOrg root identity and the concrete
  mounted-Team/task ancestry stored in the V1 package; logical addresses remain
  distinct from physical storage ancestry
- `AgentMemoryLocationService`, `TeamRunExecutionTreeLocationService`, and
  `AgentOrgExecutionTreeLocationService` are the family-aware
  read/write/projection owners for `rootTeamRunId`, physical
  `ancestorTeamRunIds`, logical `memberAddress`, concrete Agent/task identity,
  exact task execution address, and resolved `memoryDir`
- persisted execution/history coordinates are not the Agent collaboration tool
  context. The live message/task collaboration boundary carries
  `{rootTeamRunId, memberAddress}` and derives its immediate Team and address
  segments from the canonical logical address. The V2 tree stores the rooted
  logical address; physical memory ancestry remains a distinct ordered array of
  TeamRun IDs
- Team execution-tree/location services must bind to the configured application
  memory root; restore, context-file resolution, and memory readback must not
  reuse a default-root singleton after a test or deployment selects another
  memory directory
- Codex and Claude standalone/team-member/task-Agent runs write raw-trace-only
  local memory through the same resolved directories as native AutoByteus runs;
  they do not load or persist WorkingContext snapshots
- runtime-native identifiers remain separate from domain identifiers:
  - AutoByteus native Agent identity
  - Codex thread id
  - Claude session id
- V2 `platformAgentRunId` is non-null only for an exact external Codex/Claude
  provider binding. Native Team Agents keep it null and restore from local
  AgentRun identity plus native memory state.

The Team V2 execution tree is the standalone Team restore and projection
authority. It stores one root Team at `/`, direct configured Agents, complete
launch/default configurations, concrete identities, application binding,
handoffs, and task snapshots. Direct-Agent lists are projections, not an
alternative restore contract. Task-Team IDs remain in the root package for
exact task addressing and physical ancestry but are not configured Team members
or independent workspace-history rows.

The AgentOrg V1 execution tree is the separate AgentOrg restore and projection
authority. It stores `rootOrg`, direct Org Agents, direct mounted Teams and their
direct Agents, exact identities/configuration, handoffs, and tasks. Restore in
both families uses stored snapshots and never recompiles current definitions.

## Projection Model

Normal UI history projection is local-replay authoritative for every runtime.
`getRunProjection(runId)` and
`getTeamMemberRunProjection(teamRunId, memberAddress)` read the
application-owned raw/replay trace corpus and convert it into the canonical
run-history replay bundle. Runtime-native history providers are not selected,
merged, or used as fallback by the normal display path. If local replay history
is absent or incomplete, the UI projection may be empty or incomplete.

Run-history owns the replay bundle contract:

- `conversation`
- `activities`
- `summary`
- `lastActivityAt`

The `agent-memory` subsystem no longer owns the canonical replay DTO. It
supplies raw traces and memory-inspector views only; run-history is the only
subsystem that may normalize those raw traces into the historical replay bundle
used by reopen/hydration.

Local replay normalization model:

```text
standalone run metadata -> memoryDir/runId -> active raw traces -> historical replay events -> replay bundle
team member metadata -> member memoryDir -> active raw traces -> historical replay events -> replay bundle
```

- `AgentRunViewProjectionService` owns the normal UI source policy and always
  delegates to `LocalMemoryRunViewProjectionProvider` for display projection,
  regardless of `runtimeKind` (`autobyteus`, `codex_app_server`,
  `claude_agent_sdk`, or future runtimes).
- `TeamMemberRunViewProjectionService` resolves team/member metadata, including
  the member memory directory, then delegates to `AgentRunViewProjectionService`
  so team members use the same local replay display path as standalone runs.
- `LocalMemoryRunViewProjectionProvider` reads only `raw_traces_active.jsonl`
  from the declared run or team-member memory directory. Explicit `memoryDir`
  basenames keep local run
  ids aligned with storage, so a team-member replay reads `<agentRunId>` inside
  the resolved root-hierarchical team directory, such as
  `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/...`, rather than
  confusing runtime-native ids with local storage ids. Provider-boundary marker traces are provenance and
  are ignored as conversation/activity content by the historical replay
  transformer.
- A strict run-scoped `system_instruction` row becomes only a
  `system_instruction` Activity entry using its raw trace ID, exact content, and
  timestamp. It has no turn group and is excluded before every Event Monitor
  latest-window, count, cursor, generation, and earlier-page policy. Activity
  still keeps the row in chronological order within the same active-file
  horizon: if fewer than 100 Event Monitor-compatible events exist, all active
  Activity events are eligible; otherwise the Activity slice begins at the
  oldest selected Event Monitor-compatible event. No separate prompt pin or
  archive scan is performed.
- Tool projection first builds physical lifecycle groups across that active
  corpus using compound `(turn_id, tool_call_id)` identity. A current call row
  owns canonical name/arguments; its separate minimal result row repeats the
  verified canonical name, owns terminal result/error, and omits arguments. The
  transformer emits one conversation tool item and one Activity per lifecycle,
  anchored to the call even when call and result are in different raw-trace
  files. A result-local name supports partial evidence, but does not replace
  call correlation for arguments, anchoring, ordering, or lifecycle integrity.
- Existing historical results may omit a name or may contain duplicated or
  late/effective name/arguments. `buildToolInteractions(...)` reads both shapes
  normally and may use result-side fields as a read-only historical override,
  but run-history projection never feeds that overlay back into recorder/writer
  state or creates a compatibility write.
- `RuntimeMemoryEventAccumulator` owns the live event-to-raw-trace write
  boundary for runtime streams. A new ordered tool card flushes preceding
  same-turn reasoning at its first normalized call observation, even when the
  physical call waits for authoritative arguments. Matching lifecycle updates,
  including a terminal that later materializes that call and its result,
  preserve reasoning written after the card. A genuinely result-first terminal
  flushes before inferring the missing call. Assistant text and
  assistant-complete output also flush preceding open reasoning.
  `TURN_COMPLETED` still flushes pending reasoning, but a run that ends with
  open reasoning and no later visible write or turn completion can still have
  incomplete local replay by design.
- Segment recording consumes only canonical post-pipeline lifecycle events.
  Text/reasoning identity is exact turn plus segment ID, and content already
  carries the start-owned finite type. Recording never creates a fallback turn,
  derives a segment ID/type, synthesizes a missing start, or recovers text from
  a segment end.
- Runtime-native providers such as `CodexRunViewProjectionProvider` and
  `ClaudeRunViewProjectionProvider` are diagnostic utilities only. They are not
  reachable from normal `getRunProjection` / `getTeamMemberRunProjection` UI
  history and must not be used to recover missing local display rows.
- Local replay is the only display source, so there is no local/native
  transcript reconciliation for focused history reload.

Team rows keep their existing opening/coordinator-title behavior. Team
follow-up activity should refresh live status and selected-context activity in
memory without rewriting durable team catalog activity/status fields or
changing a stable non-empty title.

Produced-file Artifacts are not part of the replay bundle, but their historical
read path must resolve the same run identity. `RunFileChangeProjectionService`
uses `AgentRunMetadataService` for standalone runs and the shared
`AgentMemoryLocationService` for team-member run ids. This lets
`getRunFileChanges(runId)` and `/runs/:runId/file-change-content` read
team-member `agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<agentRunId>/file_changes.json`,
including nested child-team members and task-agent memory directories, without
adding a separate team-file route or treating produced files as message-reference
rows.

Team Communication messages are also outside the member replay bundle. Accepted
team communication events are processor input; derived
`TEAM_COMMUNICATION_MESSAGE` events are projected once per team run into
`agent_teams/<teamRunId>/team_communication_messages.json`. Historical Team tab
hydration reads that projection through `getTeamCommunicationMessages(teamRunId)`,
and referenced content opens by persisted message-owned identity at
`/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.
The projection stores `teamRunId` once at the projection level and each message
stores `senderAddress` and `receiverAddress` as canonical
`TeamExecutionAddress` values. Messages to persistent/nested Agents,
task-Team Agents, and delegated task Agents remain attributable to their exact
root, task-Team chain, member address, and optional task-Agent run without
duplicating flat sender/receiver run IDs, paths, route keys, represented-Team
fields, or instance wrappers. Old flat Team Communication files are converted by
the app-data migration path before current runtime/API/store hydration. The
member Artifacts tab must not hydrate those reference files as Sent/Received
artifact rows.

Task Delegation records are also outside the member replay bundle. Accepted and
active delegated task lifecycle transitions are normalized into
`agent_teams/<rootTeamRunId>/task_delegation_records.json`, one file per root
team run. Historical Team tab hydration reads that projection through
`getTaskDelegationRecords(teamRunId)` and stores the result in the frontend Task
Delegation store. The records use the same address-first
`TeamExecutionAddress` convention as Team Communication for
`senderAddress`, `receiverAddress`, task-run addresses, and update addresses,
with `receiverTargetKind` preserving whether the accountable target was an Agent
or a Team. Task-Team child-run delegations write to the root run file and keep
the exact task-Team run chain; no child-local task records file is
expected. Persisted task records are display/history state after restart, not
runtime authority to resume task tools.

The `agent-memory` subsystem no longer owns the canonical replay DTO. It supplies
raw traces and memory-inspector views only; run-history is the only subsystem
that may normalize those raw traces into the historical replay bundle used by
reopen/hydration.

Local replay is the display authority for normal run-history UI. Codex
thread-history replay and other runtime-native replay providers may still be
useful for diagnostics and provider protocol investigation, but they are not
reachable from normal `getRunProjection` / `getTeamMemberRunProjection` UI
history and must not be used to recover missing display rows. Missing Codex,
Claude, or AutoByteus display rows should be fixed by ensuring live normalized
events and local raw traces are written correctly, not by merging native runtime
history into UI projection.

Projection dedupe is identity-aware at the run-history projection boundary. Rows
with explicit message or tool invocation identity are merged by that identity;
semantic duplicates with one missing timestamp may merge into the richer row.
Repeated user/assistant rows that have no explicit identity and no timestamp are
preserved as separate rows so repeated direct messages do not disappear during
restore/open.

Normalization model:

- Local memory: raw trace rows -> historical replay events -> replay bundle

Local-memory projection resolves the local run id from the basename of the
explicit `memoryDir`, so a team-member replay reads `<agentRunId>` inside the
resolved root-hierarchical team directory, for example
`memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/...`, rather than confusing
runtime-native ids with local storage ids. Provider-boundary marker traces are provenance and are
ignored as conversation/activity content by the historical replay transformer.


Frontend restore uses that bundle in two sibling hydration paths:

- middle pane: conversation hydration
- right pane: activity hydration
- team pane: Team Communication hydration from
  `getTeamCommunicationMessages(teamRunId)` for message-owned sent/received
  communication records and child reference files
- team pane: Task Delegation hydration from `getTaskDelegationRecords(teamRunId)`
  for persisted delegated task records and task-owned reference files

Those sibling paths must stay synchronized. Reopen/hydration code should apply
the projected `conversation` and `activities` from the same replay bundle, or
preserve both existing live surfaces when a subscribed live context is kept. It
must not hydrate projected Activity rows while preserving a different live
conversation, because that creates Activity-only tool calls after restart. For
active team reopen, only newly materialized member contexts may receive
projected Activity rows, and only alongside that member's projected
conversation.

Projection files:

- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
- `src/run-history/services/agent-run-view-projection-service.ts`
- `src/run-history/services/team-member-run-view-projection-service.ts`

Runtime-native diagnostic utilities:

- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `src/run-history/projection/providers/claude-run-view-projection-provider.ts`

## Archive / Rotation / Retention Boundaries

This section describes raw-trace rotation segments and is separate from the
history-row visibility archive flag documented above.

Native AutoByteus compaction rotates compacted raw traces into complete `native_compaction` entries. Codex and Claude provider-boundary handling may rotate settled active raw traces before a normalized, rotation-eligible provider boundary marker into complete `provider_compaction_boundary` entries. New rotated segments are direct run-directory files named `raw_traces_<zero-padded-index>.jsonl` and indexed by `raw_traces_manifest.json`. Normal run-history and Event Monitor projection remain active-file-only. Explicit complete-corpus memory/evidence reads include only complete rotated segments plus active records, dedupe by raw trace id, and ignore pending manifest entries. Memory Inspector file-selector reads list only active plus complete segment files and return records from the selected file instead of an implicit merged corpus.

Cross-file tool pairs are expected: a call can be rotated before its result is
written. Explicit complete-corpus logical inspection/evidence can correlate that
pair without copying the call into the active file. Normal run-history honestly
projects only the evidence still active and never merges an archive to recover a
missing Activity. Native compaction
eligibility/pruning remains active-only; archive-only raw ids must not leak into
active removal decisions.

The prior `raw_traces_archive_manifest.json` plus `raw_traces_archive/` layout is migration/fallback input only. Startup app-data migration `20260617_raw_trace_rotation_layout` converts old complete entries to the direct rotated layout and decommissions old authoritative files after verification. The old monolithic `raw_traces_archive.jsonl` path is intentionally not a current read/write target and historical monolithic archive files are not read under the approved no-compatibility policy.

Rotated raw-trace segments are not compression or retention. There is still no
total-storage retention policy or archive compression. Native WorkingContext
snapshot behavior is unchanged; Codex and Claude have no current snapshot
write/reconstruction path, and their old metadata-classified duplicates are a
startup-cleanup concern rather than a retention window.

## Retained Non-Media Context-File Associations

The existing user raw trace stores optional immutable `file_attachments`
(URI, type and recorded name), distinct from media fields. Accepted original
external/native input is recorded before provider working-context transformations.
Initial, cold and typed earlier-active-page projections retain these associations
and exact owner identity, including file-only messages and complete archived
segments. UI hydration uses recognized-upload friendly naming without changing
raw facts or custom filenames. Reads do not fabricate associations missing from
historical traces or replay a migration to backfill them.

Org attachments resolve stored root plus exact AgentRun ownership and physical
file membership, not the currently selected logical address. Root package
readiness admits current structural authorities without scanning saved
attachment references or historical traces. Only the existing initial family
migration may transform and validate proven prior locators. Normal history,
projection and Open do not perform repairs, runtime activation or legacy route
fallback; an exact attachment request resolves its current owner, safe stored
filename/path, and file existence, returning a request-scoped error if the bytes
are unavailable. Final Team attachment access returns `400` for a malformed
member address or unsafe stored filename and `404` for a shaped but absent or
mis-correlated exact member/file. Unexpected access failures remain server
errors rather than being hidden as client outcomes. See
[AgentOrg](agent_orgs.md#exact-context-files-and-saved-references)
for cutover inventory and saved-locator preservation constraints.

## Collaboration Root Restore / Projection Contract

For standalone Team runs:

1. The exact V2 `team_run_execution_tree.json` is the source of truth for the
   flat configured Agent topology, coordinator address, root/member identities,
   provider bindings, tasks, and complete launch/default configuration.
2. `getTeamRunResumeConfig(teamRunId)` returns `{ teamRunId, isActive,
   executionTree }`; GraphQL projects that V2 tree without rebuilding it from
   current definitions or history-index rows.
3. Canonical `memberAddress` selects one direct configured Agent placement;
   `agentRunId` identifies its opaque persisted AgentRun/storage subtree.
4. Task Agents and task Teams retain exact task execution identities beneath
   the flat root. They do not become configured membership.
5. The stored effective `handoffs` array is the collaboration-guidance source;
   restore does not recompile handoffs from the current definition.
6. `TeamRunStatePackageLoader` reads the execution tree with task and
   communication records. Restart repair interrupts nonterminal tasks; it does
   not recreate in-flight work.

For AgentOrg runs:

1. The exact V1 `agent_org_run_execution_tree.json` is the source of truth for
   the coordinator-free Org root, direct Org Agents, direct mounted Teams and
   their direct Agents, exact configuration/identity, handoffs, and tasks.
2. `AgentOrgStatePackageLoader` reads that tree with
   `agent_org_task_delegation_records.json` and
   `agent_org_communication_messages.json`; a Team package is never a fallback.
3. Restore rematerializes the stored Org scope and provider identities. Team
   focus resolves to that mounted Team's stored direct coordinator; the Org has
   no coordinator or first-member fallback.
4. `listCollaborationRootHistory` exposes explicit Team/Org root kinds while
   family loaders and indexes retain on-disk authority.

For both families, `platformAgentRunId` identifies only the exact external
Codex thread or Claude session. Native nodes keep it null and restore from local
AgentRun identity plus native memory. Member projection resolves the exact
configured/task Agent and rooted memory location, then delegates to
`AgentRunViewProjectionService` for the same local replay bundle used by
standalone runs. Codex and Claude do not merge provider-native display history.

Predecessor metadata, exact Team V1 packages, and the formerly released fixed-
depth multi-Team shape are migration inputs only. If required startup conversion
cannot validate a complete current Team V2 or AgentOrg V1 package, that root is
excluded and restore fails clearly instead of guessing identity or ownership.
Termination updates catalog activity only after backend termination succeeds; a
failed termination preserves the active local state.
