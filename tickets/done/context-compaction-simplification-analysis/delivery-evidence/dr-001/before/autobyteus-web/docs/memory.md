# Memory

## Overview

The Memory page (`/memory`) is a page-based memory browser for stored agent, agent-team, and agent-org memory. It is intentionally memory-derived: it lists only independent agents, agent teams, or agent orgs that have persisted memory-bearing runs. Configured agents, teams, or orgs that have never produced memory do not appear.

The current user flow is:

1. **Memory source** — default to `Local Memory`; when the current server is a
   Memory Hub, optionally select an imported source.
2. **Memory Home** — choose `Agents`, `Agent Teams`, or `Agent Orgs`.
3. **Agent detail** — after selecting an agent card, browse that agent's memory-bearing runs.
4. **Agent Team / Agent Org detail** — after selecting a team or org card, browse that definition's memory-bearing root runs and each run's member memory tree.
5. **Memory Inspector** — inspect one agent run, one team member run, or one org member run through `Working Context`, `Episodic`, `Semantic`, and `Raw Traces` tabs.

Route query state (`view`, `tab`, `source`, and the selected definition/run
identifiers) preserves deep links and refreshes for home, source selection,
agent detail, team detail, org detail, agent-run inspector, team-member
inspector, and org-member inspector views. Each card, run, member, or Back click
navigates immediately and issues exactly one data request for the target view;
detail views show `Loading runs…` until their own data arrives and never show a
previous selection's runs.

## Memory Home

Memory Home starts directly with the functional browser panel rather than a repeated page title. It has three tabs:

- `Agents`
- `Agent Teams`
- `Agent Orgs`

When imported Memory Sync sources exist, a source selector is shown above the
tabs. `Local Memory` is the default for initial page load and for missing or
invalid source route state. Imported options are labeled as read-only imported
corpora and use `source=imported:<sourceNodeId>` in the route query.

The sources list is refreshed in the background every time the Memory home view
is shown (including first page entry); the refresh never delays the home list,
so sources imported by another node appear when the user returns home without
reloading the app. A route that names an imported source not yet in the loaded
list triggers one awaited refresh; if the source is still unknown the view falls
back to `Local Memory` and drops it from the URL. Detail and inspector
navigation never request the sources list. A failed refresh keeps the previously
loaded list and shows the source error text.

Cards show display names, stable IDs, run counts, compact latest-update timestamps, member counts for teams and orgs, and memory availability badges. Search placeholders are scoped to the selected tab, and search/pagination are backed by GraphQL rather than by client-side grouping.

Agent cards are grouped primarily by `agentDefinitionId` when metadata exists. Standalone memory directories without run-history or metadata remain visible under an explicit `Unattributed runs` agent group so legacy stored memory is not hidden.

Agent-team cards are grouped by `teamDefinitionId` from team-run metadata. A team appears only when at least one member memory target exists.

Agent-org cards are grouped by `orgDefinitionId` in the same way and appear only
when at least one org member has memory. Memory Sync does not export
`agent_orgs`, so imported sources always show the `No agent org memories yet.`
empty state on this tab.

## Detail Pages

Agent detail pages use the selected agent name as the run-list card heading without a separate subject summary card. The list is sorted by latest memory update and exposes run labels, run IDs, workspace paths when available, compact updated timestamps, and memory availability badges. Selecting a run opens the Memory Inspector for that agent run.

Team and org detail pages share one component (`CollaborationMemoryDetail`) and use the selected team or org name as the run-list card heading without a separate subject summary card. Root runs are sorted by latest member-memory update. Backend summaries are resolved from the stored execution tree of each root run and the server memory-location service. Logical `memberAddress` identifies the Agent placement; physical memory resolution uses the root run id plus ancestor team run ids plus `agentRunId` rather than a flattened or address-derived directory.

Each run's `Members` section is a tree that mirrors the run-history sidebar
structure. It shows every agent run of that root run that has memory on disk:

- configured agents;
- configured teams as group rows containing their members;
- delegated task agents (marked as tasks, with their start time);
- delegated task teams as group rows (marked as tasks, with their start time)
  containing their members, including nested teams inside task teams at any
  depth.

Group rows are structural only and have no memory of their own; a group row
appears only when something inside it has memory. Every agent row shows the
member's display name (for orgs, its address path inside the org, for example
`software_engineering_team/solution_designer`) and its own run ID, and opens the
inspector for exactly that run, so the row's badge, run ID, and inspected memory
always refer to the same run. Memory folders on disk that the run's execution
tree does not reference are not shown. A team run without delegated tasks
renders as a flat member list.

The tree is built client-side (`components/memory/collaborationMemberTree.ts`)
from each member target's `groupPath`, `executionKind`, and `startedAt`.

Search on detail pages uses `Search runs...` and filters only within the selected agent's runs or the selected team's/org's runs and member targets (including task agents and task-team members). Subject-level run-count and ID metadata are intentionally not repeated above the list; per-run and per-team-run metadata remains visible inside the list cards.

The inspector header renders `Memory Inspector` once. Inspector back links preserve the previous destination while using concise subject labels, for example `Back to Codex`, `Back to <team name>`, or `Back to <org name>`. The org-member breadcrumb reads `Agent Orgs / <org> / <org run> / <member>`.

Imported source detail and inspector views keep the selected source in route and
store state. Imported memory is browse-only; the UI must not add restore,
continue, archive, delete, or other local-runtime actions for imported sources.

## Frontend State Ownership

Frontend memory state is split by role:

- `stores/memoryExplorerStore.ts` owns Memory Home and detail-page lists (agents, teams, orgs), searches, pagination, the sources list and selected source, selected agent/team/org summaries, and request-staleness guards. `pages/memory.vue` owns route-driven fetching: it decides which single request a navigation issues and when the sources list is refreshed.
- `stores/memoryInspectorStore.ts` owns the explicit inspect target, selected inspector tab, raw-trace loading state, selected raw-trace file name, raw-trace limit, and request-staleness guards.
- `stores/memorySyncStore.ts` owns the Nodes -> Memory Sync setup/status UI for the currently bound backend node.

The old flat `MemoryIndexPanel` and per-scope index/view stores were replaced. The page shell now renders `MemoryHome`, `AgentMemoryDetail`, `CollaborationMemoryDetail` (teams and orgs; it replaced `AgentTeamMemoryDetail`), or `MemoryInspector` according to `/memory` query parameters.

## GraphQL Explorer Contract

The Memory page uses backend-for-frontend explorer queries for lists:

- `listMemoryExplorerSources()` returns `Local Memory` plus any imported Memory Sync sources.
- `listAgentsWithMemory(source, search, page, pageSize)` returns memory-bearing agent groups.
- `listAgentRunsWithMemory(selector, source, search, page, pageSize)` returns memory-bearing runs for a selected attributed agent or the `UNATTRIBUTED` group.
- `listAgentTeamsWithMemory(source, search, page, pageSize)` returns memory-bearing agent-team groups.
- `listAgentTeamRunsWithMemory(teamDefinitionId, source, search, page, pageSize)` returns memory-bearing team runs and member memory targets for one team definition.
- `listAgentOrgsWithMemory(source, search, page, pageSize)` returns memory-bearing agent-org groups.
- `listAgentOrgRunsWithMemory(orgDefinitionId, source, search, page, pageSize)` returns memory-bearing org runs and member memory targets for one org definition.

Team-run and org-run entries expose `memberTargets` of the shared type
`CollaborationMemberMemoryTargetSummary` (renamed from the former team-only
member target type). Each target carries `memberAddress`, `displayName`,
`agentRunId` (the target's own run), `agentDefinitionId`, `executionKind`
(`CONFIGURED`, `TASK_AGENT`, `TASK_TEAM_MEMBER`), `startedAt` (task agents),
`groupPath` (ordered `CollaborationMemoryGroup` entries with `teamRunId`,
`address`, `displayName`, `kind` `CONFIGURED_TEAM`/`TASK_TEAM`, and
`startedAt`), `lastUpdatedAt`, and `memory`. These fields are additive; existing
query names and arguments are unchanged.

Every explorer page returns `entries`, `total`, `page`, `pageSize`, and `totalPages`. Entry summaries include `MemoryAvailabilitySummary` flags for working context, episodic memory, semantic memory, active raw traces, and raw-trace archives.

The `source` variable is explicit:

- `{ type: "LOCAL" }` reads the current node's local runtime memory.
- `{ type: "IMPORTED", sourceNodeId }` reads the selected hub import under
  `memory/imports/<sourceNodeId>`.

Unknown imported sources are backend errors rather than silent local fallbacks.

The previous flat run-list queries (`listRunMemorySnapshots`, `listTeamRunMemorySnapshots`) are no longer the Memory page contract.

## GraphQL Inspector Contract

Inspector data comes from memory-view queries:

- `getAgentRunMemoryView(runId: String!, source: MemoryExplorerSourceInput)`
- `getTeamMemberRunMemoryView(teamRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`
- `getAgentOrgMemberRunMemoryView(orgRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`

An unknown team or org member resolves to an empty view for that `agentRunId`.

All three support include flags for working context, episodic memory, semantic memory, raw traces, raw-trace file metadata, archive inclusion, and `rawTraceLimit`. The raw-trace file selector uses the optional `rawTraceFileName` argument and returns `rawTraceFiles` plus `selectedRawTraceFileName` in the memory view.

The frontend initially loads working/episodic/semantic data without raw traces. Opening the `Raw Traces` tab flips `includeRawTraces` and `includeRawTraceFiles` on and refetches the selected target. The backend defaults the selected file to active `raw_traces_active.jsonl` when it exists, otherwise to the first available complete segment in the inspector ordering. The selector lists active `raw_traces_active.jsonl` plus complete rotated `raw_traces_<zero-padded-index>.jsonl` segment files with record counts; pending/incomplete manifest entries are not shown. Selecting a file sends only that backend-listed file name, not an absolute path, and the response contains records from that file only. Changing the raw-trace limit refetches the currently selected file and applies the limit to that file.

When raw traces are requested with archive inclusion enabled without file-selector mode, the backend can still merge complete archive segments plus active traces for non-inspector callers. In both selected-file and merged-corpus modes it exposes provenance fields such as persisted trace `id`, `traceType`, `sourceEvent`, `turnId`, `seq`, timestamp, media fields, and tool payload fields. The current UI displays one selected file at a time with the normalized trace type, content, sequence, tool/media details, file selector, limit control, and loading/empty states.

`MemoryTraceEvent.scope` distinguishes ordinary `turn` traces from the current
run-scoped instruction trace. A valid instruction row appears with
`scope: "run"`, `traceType: "system_instruction"`,
`sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED"`, the exact captured content and
persisted ID/timestamp, and `turnId: null` / `seq: null`. The Raw Traces UI must
not fabricate turn grouping or sequence for it. Malformed system rows are
omitted by backend normalization instead of being rendered through the generic
turn shape.

## Storage Source

Storage is server-owned and identity-opaque:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`, with deeper child team ids appended before the member id
- Task-Agent runs: `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<taskAgentRunId>/...`
- Agent org members: `memory/agent_orgs/<orgRunId>/<...teamRunIds>/<agentRunId>/...` (team runs hosted inside the org, including task teams, contribute their run ids before the agent run id)
- Imported source memory: `memory/imports/<sourceNodeId>/agents/...` and
  `memory/imports/<sourceNodeId>/agent_teams/...`, plus hub-managed
  `source-node.json` and `sync-manifest.json`.

Required server startup migration `20260823_repair_team_agent_memory_layout`
relocates affected flat nested-member directories into this canonical hierarchy
using the validated migration-owned V1 intermediate execution tree. It runs
after predecessor package conversion and before the V1-to-V2 transition; normal
runtime/history readers see only V2. Normal local and imported
readers remain canonical-only; there is no flat-path compatibility lookup. A
failed required move is reported by Server Migrations and is manually retryable
without making unrelated application startup unavailable.

Native AutoByteus runs are written by the native memory manager, including the
WorkingContext snapshot used for native continuation. Codex and Claude runs use
raw-trace-only server recording: active raw traces and optional complete rotated
segments drive normal history replay and remain inspectable in the Raw Traces
tab; provider thread/session state owns continuation. New external activity does
not create or update `working_context_snapshot.json`.

Native, Codex, and Claude can each persist the exact AutoByteus-owned runtime
instruction handoff as the same strict run-scoped raw row. Existing runs are
directly usable without migration: absence means no instruction evidence was
recorded, not that the UI should reconstruct it from the current agent, Team, or
skill definition. Provider-owned hidden/effective instructions are outside this
record.

A required startup cleanup removes duplicate external snapshots only when
current standalone or team-member metadata classifies the exact location as
Codex or Claude. Native, imported, unclassified, and invalid-metadata snapshots
are preserved. The inspector stays file-backed and runtime-agnostic: after
successful cleanup an external run reports no WorkingContext, while a reported
unlink failure can leave a stale snapshot visible until retry without affecting
current raw traces or provider continuation.

The frontend does not infer memory ownership from runtime-specific thread/session IDs, generated run-id strings, route-key slugs, or archive internals. It selects agent definition groups, unattributed groups, agent run IDs, or exposed team/member targets and lets the backend resolve memory directories, complete archive segments, ordering, and de-duplication.

The frontend also does not infer imported-memory identity from Nodes page profile
ids or display names. Memory Sync uses the backend `sourceNodeId` selected in
**Nodes -> Memory Sync** as the durable import identity.

## Memory Sync Setup

Memory Sync setup is available from **Nodes -> Memory Sync** for the node that
the current window controls. A backend node can be a Memory Hub, a Memory Sync
source, or both.

Hub setup requires an editable advertised hub base URL. The UI can suggest the
configured public URL, current node URL, Docker host alias, LAN/tailnet-like
addresses, and manual URL, but the user must choose the URL that source nodes can
actually reach. Docker sources on the same host often need
`http://host.docker.internal:<port>` rather than desktop loopback; Kubernetes
sources usually need a Service/Ingress/VPN/tailnet URL.

Hub tokens are generated by the backend and shown only once when created or
regenerated. The hub stores token hashes and credential metadata; source nodes
store the plaintext token locally so background sync can restart. Public API/UI
state only reports that a token is configured and shows a fixed redaction
placeholder. Use **Test connection** on the source node before relying on manual
or background sync.

The Source card keeps connection and sync feedback beside the action controls
rather than relying on page-level alerts. **Test connection** enters a
`Testing...` state and then shows an inline success or failure result with the
tested endpoint, source id, timestamp, hub-enabled/authentication flags when
available, and no token value. When the token field is blank and a saved source
token exists, the connection test uses the fully persisted source settings:
saved hub URL, saved `sourceNodeId`, and saved token. Unsaved draft URL or source
id edits are not mixed with the saved token; save first or paste a draft token to
test draft settings. When a draft token is pasted, the test uses the draft hub
URL, draft source id, and draft token together without persisting the token.

**Sync now** enters a disabled spinner/`Syncing…` state while the manual sync
mutation is in flight. The card reports `Current job: idle` or
`Current job: syncing…` from the authoritative source status, then reports
`Last sync: success · <timestamp>` or the latest sync error. A latest sync error
has display precedence over an older successful timestamp. Background sync uses
the same generic current-job surface; the primary UI intentionally does not make
users distinguish manual from background runs. Low-frequency status refresh keeps
the status lines current without rehydrating the editable source form, so
unsaved hub URL/source id edits and pasted draft tokens are preserved.

Current v1 sync mirrors local `agents` and `agent_teams` files with full-file
replacement batches. It excludes temporary/partial/lock files and does not sync
deletes, deltas, analytics indexes, or runnable restore state. Consequently, a
hub may retain a pre-upgrade flat nested-member path beside the later canonical
path, or receive both paths from a preserved local conflict. This is a physical
storage limitation only: imported Team-member selection still derives one exact
canonical target from the synced V2 Team execution tree. The UI does not merge, choose,
delete, or present the flat residue as a second current member.

## Archive / Boundary Notes

The Raw Traces tab defaults to one selected raw-trace file at a time: active `raw_traces_active.jsonl` first when present, then complete segmented archive files as selectable options. It does not show a merged "all files" view by default. Backend memory-view callers that explicitly request archive inclusion without file-selector mode can still receive a merged corpus of complete segments plus active rows. Provider compaction-boundary markers are storage provenance: they may appear as `provider_compaction_boundary` raw traces, but they do not mean the external runtime's memory was injected, retrieved, or semantically compacted by AutoByteus.

Normal Activity and Event Monitor hydration are active-file-only. A rotated
`system_instruction` row therefore remains explicitly inspectable by selecting
its completed raw-trace segment here, but it is not silently reintroduced into
Activity; Event Monitor excludes this run-scoped kind in both active-window and
earlier-page policy.

Segmented archives are not a retention/compression feature. They preserve analyzability while keeping active raw traces smaller after native compaction or provider-boundary rotation.

## Error and Stale-State Guard

Explorer and inspector stores increment request IDs for each fetch. Late responses from stale requests are ignored. On fetch error, the active list or inspector error state is shown while successful prior state is retained where possible.

## Testing

Coverage includes:

- Backend unit and GraphQL e2e checks for memory-derived agent/team/org inclusion, one execution-tree read per root per list request, task-agent and task-team member targets with their group paths, each member target's own run id, org member views (including task-team members), no-memory exclusion, `Unattributed runs`, selected agent/team filtering, memory-view raw-trace lazy loading, selected raw-trace file listing/reads, invalid selector fallback, imported read-only source behavior, and merged-corpus preservation.
- Backend Memory Sync API/E2E checks for hub enablement, URL candidates, one-time token handling, source config redaction, explicit draft and saved connection-test modes, REST batch ingestion, imported-source Memory Explorer reads, duplicate retry, source-token binding, latest-error source status, and unsafe path rejection.
- Backend multi-process Memory Sync E2E starts two real server processes with isolated app-data directories, configures hub/source through HTTP GraphQL, validates saved-mode connection testing, syncs over HTTP, and asserts hub import files without requiring browser, Electron, Docker, or Kubernetes.
- Frontend store/component/page tests for Memory Home (three tabs), source selection and home-only sources refresh, one request per navigation, agent detail, team and org detail with the member tree, inspector targets, direct route restoration, search/pagination behavior, tab-specific raw-trace fetching, raw-trace file selector state/rendering, Memory Sync tab entry, source-aware query variables, form-preserving Memory Sync status refresh, saved-vs-draft connection-test dispatch, inline connection feedback, `Current job`/`Last sync` precedence, and sync button loading state.
