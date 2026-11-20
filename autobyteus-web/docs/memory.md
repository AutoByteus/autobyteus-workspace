# Memory

## Overview

The Memory page (`/memory`) is a page-based browser for the node's memory, organised by owner (autobyteus-554, UI/UX
spec `semantic-memory-view-554`): Global, Agents, Agent Teams and Agent Orgs. An agent owns its episodic memory (its
runs, from every place it works) and its semantic memory (its folder); the node owns its global semantic memory.

The page has three tabs (`section` in the route query):

- **Browse** (the entry) — owner tabs `Global · Agents · Agent Teams · Agent Orgs` with their cards, opening on
  Agents; a card opens its owner's page. When the current server is a Memory Hub, an imported source can be selected.
- **Search** — memory search over the Work Journals of every local run (see [Memory Search](#memory-search)).
- **Index** — the memory index pipeline: its four steps, `Index now`, `Try again` and `Rebuild` (see
  [Memory Index](#memory-index)).

A run opens in the **run detail** (the Memory Inspector) on its `Work Journal` tab; `Raw Traces` is the other tab.
There is no Working Context tab and no tab for the per-run category files of an early compaction design: the Work
Journal is the readable account of a run and the raw traces its authority.

Route query state (`view`, `section`, `node`, `pane`, `source`, `q`, and the run identifiers) preserves deep links and
refreshes. Browse's address is `node` (`utils/memoryBrowseNode.ts`): a tab (`global`, `agents`, `teams`, `orgs`) or an
owner reached through it, for example `agents/agent:<id>`, `teams/team:<id>/agent:<id>`, `orgs/org:<id>/team:<id>` or
`agents/unattributed`, each ID URI-encoded in its segment (a team-local agent ID keeps its `:` inside the segment); `pane`
is the owner page's tab (`semantic`, `runs`). A run opened from an owner page carries `back`, `backPane` and `backName`,
so the inspector's Back reads `Back to <owner>` and returns to that page and tab. The old agent, team and org runs pages
(`view=agent-detail|team-detail|org-detail`) are gone; such an address opens Browse on Agents. Each card, run, member or
Back click navigates immediately and the page (the single fetch owner) issues the requests of the target view only;
an owner page shows `Loading runs…` until its own data arrives and never shows a previous owner's runs.

## Current Native Compaction And Historical Categories

Current native compaction stores a six-section Markdown summary inside Working
Context, whose versionless snapshot is the continuation authority. It does not
append the old per-run category records or depend on a lineage head. The Memory
page no longer shows those historical category files or the Working Context
snapshot; the files stay on disk. Raw traces/archives remain
original work evidence. Normal reopen uses snapshot decode, active-raw tool
repair, validation and save; it does not generate another summary. Imported
memory remains an inspection corpus, not automatic native continuation state.

See [core memory design](../../autobyteus-ts/docs/agent_memory_design.md).

## Memory Home (Browse)

Memory Home starts directly with the `Browse · Search · Index` tab control, without a page title, flat on the page like
the Skills page. Browse (`MemoryBrowse.vue`) has the owner tabs `Global · Agents · Agent Teams · Agent Orgs` and no list
filter: a node holds few agents, teams and orgs.

When more than one memory source exists (imported Memory Sync sources), a source selector and the amber
`Imported · read-only` pill are shown at the right of the tabs. `Local Memory` is the default for initial page load and
for missing or invalid source route state. Imported options use `source=imported:<memorySyncSourceId>` in the route
query; choosing one keeps the owner and its tab.

The sources list is refreshed in the background every time the Memory home view
is shown (including first page entry); the refresh never delays the cards,
so sources imported by another node appear when the user returns home without
reloading the app. A route that names an imported source not yet in the loaded
list triggers one awaited refresh; if the source is still unknown the view falls
back to `Local Memory` and drops it from the URL. Inspector navigation never
requests the sources list. A failed refresh keeps the previously loaded list and
shows the source error text.

- **Agents:** the shared agents (with or without runs) and every agent with runs on this node (team-local ones
  included), newest change first, then `Unattributed runs` (standalone runs that no agent definition names). A card
  shows the name, the ID (`unattributed` for that card) and the latest change; no run count. Internal agents appear
  only while Settings → Server Settings → "Show internal agents" is on.
- **Agent Teams / Agent Orgs:** a card shows the name, the ID, an `N runs` pill and `N members · <latest change>`; this
  node's cards include the definitions with no runs yet.
- **Global:** "Global memory", the line "Knowledge shared by every agent, agent team and agent org on this node. Every
  agent reads it and writes to it.", and the node's global semantic memory folder (below).

The cards come from one request per kind (`fetchOwners`, every owner at once). For this node they come from the
server's episodic catalog, so they appear after its start pass; for an imported source from that source's runs.

## Owner Pages

Every owner page has `← Back to Memory` (or `← Back to <team or org>` when reached through one) above its header.

**An agent** (`AgentMemoryPage.vue`): the name; "Belongs to <team>" for a team-local agent, "Also works in <teams ·
orgs>" for a shared agent that is a member somewhere (from the teams' and orgs' members), or "Runs that no agent
definition names." for Unattributed runs; the ID; and the tabs **Episodic memory · N** and **Semantic memory** (short
labels below 640 px). A shared agent opens the same page from Agents, a team or an org.

- *Episodic memory:* the agent's episodes, its runs from every place it works, newest first, 24 to a page: summary (else
  the Task title, else the run ID), run ID, "In <team or org>" with its icon when the agent works in more than one
  place, workspace and time. The filter "Filter runs by title or run ID…" asks the node as you type (run ID, Task title,
  run summary). A run opens its run detail; Back returns to this tab. Unattributed runs has this tab only.
- *Semantic memory:* the agent's folder (below).

**A team or an org** (`GroupMemoryPage.vue`): the name, "Agent Team" or "Agent Org", the ID, and the tabs **Members · N**
and **Runs · N**. Member cards show an agent (user icon, name, ID; a shared agent carries the `Shared agent` pill, "A
shared agent: one memory, the same page wherever it appears.") or, in an org, a team ("Agent Team · N members"); a
member opens its own page. Runs is the team's or org's run list (`CollaborationMemoryDetail` with `embedded`: no second
title or Back); a member of a run opens its run detail, and Back returns to the Runs tab.

## Semantic Memory Folder View

`SemanticMemoryFolder.vue` shows an agent's semantic memory folder or the node's global one, read only, as the Skills
page shows a skill's folder: the path (selectable), then one panel with the file explorer (260 px, search box, tree) and
the Files panel's tabs; below 768 px the explorer sits above the open file. The node answers the folder's state first
(`agentSemanticMemoryFolder` / `globalSemanticMemoryFolder`, `stores/semanticMemoryFolderStore.ts`):

- missing: "No semantic memory yet · The folder is created when <agent> next runs." (Global: "No global memory yet · The
  folder is created when an agent next runs."); empty: "<agent> has not written anything to its folder yet." (Global:
  "Nothing has been written to global memory yet."); no path and no panel, and the view never creates the folder;
- an imported source: "Semantic memory is not part of synced memory · Memory Sync copies runs and their Work Journals.
  An agent’s semantic memory stays on the node where the agent runs." and nothing is asked of the node.

While a folder with files is shown, the web registers the node's read-only semantic memory workspace for it
(`workspaceStore.registerSemanticMemoryWorkspace`: `semantic_ws_<encoded agent ID>` or `semantic_global_ws`, transient
like a skill's, never in the Workspaces sidebar or a picker) and releases it on leaving
(`unregisterTransientWorkspace`). `FileExplorer`, `FileItem` and `FileExplorerTabs` run in their `read-only` mode: no
context menu, rename, drag and drop or upload; every file opens in preview (Markdown rendered), no edit and no Save;
the empty tab reads "No file selected · Select a file to read it."; a symbolic link is a link row (link icon, name,
"Link · not opened", a tooltip, no hover, `aria-disabled`) that opens nothing. The node refuses every write and every
link's content itself ([server File Explorer](../../autobyteus-server-ts/docs/modules/file_explorer.md)).

- `stores/memorySearchStore.ts` owns the memory search (cue, results, coverage, error) and the memory index status, read again about every 2 s while a build runs; `composables/useMemoryIndexView.ts` turns the status into the Index tab's headline, badge and step text.
- `stores/memorySyncStore.ts` owns the Nodes -> Memory Sync setup/status UI for the currently bound backend node.

The page shell renders `MemoryHome` (with `MemoryBrowse` and its owner pages, and `MemorySearchPanel`, `MemorySearchResults` and `MemoryIndexPanel` for the Search and Index tabs) or `MemoryInspector` (with `WorkJournalTab` and `RawTracesTab`) according to `/memory` query parameters. `stores/memoryExplorerStore.ts` owns the sources, the owner cards, an agent's episodes, a team's or org's members (and every group's members for the agent subtitle), and the team and org runs lists.

## GraphQL Explorer Contract

The Memory page uses backend-for-frontend explorer queries for lists:

- `listMemoryExplorerSources()` returns `Local Memory` plus any imported Memory Sync sources.
- `listAgentsWithMemory(source, search, page, pageSize)` returns the Agents cards.
- `listAgentEpisodes(selector, source, search, page, pageSize)` returns one agent's episodes (or the `UNATTRIBUTED` runs), each with the `subject` that opens it and its `place`.
- `listMemoryGroupMembers(kind, definitionId, source)` returns a team's or org's members.
- `agentSemanticMemoryFolder(agentDefinitionId)` and `globalSemanticMemoryFolder` return a semantic memory folder's `{ folderPath, exists, isEmpty }`.
- `listAgentTeamsWithMemory(source, search, page, pageSize)` returns memory-bearing agent-team groups.
- `listAgentTeamRunsWithMemory(teamDefinitionId, source, search, page, pageSize)` returns memory-bearing team runs and member memory targets for one team definition.
- `listAgentOrgsWithMemory(source, search, page, pageSize)` returns memory-bearing agent-org groups.
- `listAgentOrgRunsWithMemory(orgDefinitionId, source, search, page, pageSize)` returns memory-bearing org runs and member memory targets for one org definition.

Team-run and org-run entries expose `memberTargets` of the shared type
`CollaborationMemberMemoryTargetSummary` (renamed from the former team-only
member target type). Each target carries `memberAddress`, `displayName`,
`agentRunId` (the target's own run), `agentDefinitionId`, `executionKind`
(`CONFIGURED`: a run's own agents), `startedAt`,
`groupPath` (ordered `CollaborationMemoryGroup` entries with `teamRunId`,
`address`, `displayName`, `kind` `CONFIGURED_TEAM`/`TASK_TEAM`, and
`startedAt`), `lastUpdatedAt`, and `memory`. These fields are additive; existing
query names and arguments are unchanged.

Every explorer page returns `entries`, `total`, `page`, `pageSize`, and `totalPages`. Entry summaries include `MemoryAvailabilitySummary` flags `hasWorkJournal`, `hasRawTraces` and `hasRawArchive`.

The `source` variable is explicit:

- `{ type: "LOCAL" }` reads the current node's local runtime memory.
- `{ type: "IMPORTED", memorySyncSourceId }` reads the selected hub import under
  `memory/imports/<memorySyncSourceId>`.

Unknown imported sources are backend errors rather than silent local fallbacks.

The previous flat run-list queries (`listRunMemorySnapshots`, `listTeamRunMemorySnapshots`) are no longer the Memory page contract.

## GraphQL Inspector Contract

Inspector data comes from memory-view queries:

- `getAgentRunMemoryView(runId: String!, source: MemoryExplorerSourceInput)`
- `getTeamMemberRunMemoryView(teamRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`
- `getAgentOrgMemberRunMemoryView(orgRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`

An unknown team or org member resolves to an empty view for that `agentRunId`.

All three support include flags for raw traces, raw-trace file metadata and archive inclusion, and `rawTraceLimit`. The raw-trace file selector uses the optional `rawTraceFileName` argument and returns `rawTraceFiles` plus `selectedRawTraceFileName` in the memory view. The optional `workJournal: WorkJournalWindowInput` (`journalFile`, `start`, `end`) returns the view's `workJournal`: the run's journal files (`OPEN`/`CLOSED`, size, line count, days) and a window of lines; it is `null` for a run without a journal.

Opening a run reads only its Work Journal (one window). Opening the `Raw Traces` tab flips `includeRawTraces` and `includeRawTraceFiles` on and fetches the selected target. The backend defaults the selected file to active `raw_traces_active.jsonl` when it exists, otherwise to the first available complete segment in the inspector ordering. The selector lists active `raw_traces_active.jsonl` plus complete rotated `raw_traces_<zero-padded-index>.jsonl` segment files with record counts; pending/incomplete manifest entries are not shown. Selecting a file sends only that backend-listed file name, not an absolute path, and the response contains records from that file only. Changing the raw-trace limit refetches the currently selected file and applies the limit to that file.

When raw traces are requested with archive inclusion enabled without file-selector mode, the backend can still merge complete archive segments plus active traces for non-inspector callers. In both selected-file and merged-corpus modes it exposes provenance fields such as persisted trace `id`, `traceType`, `sourceEvent`, `turnId`, `seq`, timestamp, media fields, and tool payload fields. The current UI displays one selected file at a time with the normalized trace type, content, sequence, tool/media details, file selector, limit control, and loading/empty states.

`MemoryTraceEvent.scope` distinguishes ordinary `turn` traces from the current
run-scoped instruction trace. A valid instruction row appears with
`scope: "run"`, `traceType: "system_instruction"`,
`sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED"`, the exact captured content and
persisted ID/timestamp, and `turnId: null` / `seq: null`. The Raw Traces UI must
not fabricate turn grouping or sequence for it. Malformed system rows are
omitted by backend normalization instead of being rendered through the generic
turn shape.

## Memory Search

The Search tab searches what past runs did, in any words or language, through the server's memory index
(`memorySearch(query, limit)`; the server's default limit). The box is centred while empty and moves to the top
with results; it is disabled until the text index has content (`Index your memory to search it…`, with
`Index now`).

With the local Voice Input extension available, the box has the same microphone button as the chat input
(`VoiceInputButton`, source `memory-search`). The transcript joins the typed text in the box; the search runs only
when the user presses Search (DEC-003 of autobyteus-320). The button is disabled while search is not ready and
absent when voice is unavailable; recording, transcribing, no-speech and error feedback use the shared
`VoiceTargetStatus` line, as in Project and Task descriptions.

- One card per run, best first: agent (`team / member` for members), `run ID · workspace` on one line, the day or
  first–latest range, and 1–2 matches newest first, each with its journal file, lines, its own day (only when the
  card's date does not already say it) and a 2–3 line snippet (secrets masked by the server). A text match shows
  `Words: <found words>` (`matchedWords`); a meaning match carries no label. No match carries a grade (UD-020). A
  line says results are pointers, not facts; the whole match is the click target.
- Honest states, from the server's `wordsNotFound` (which it leaves empty while the Text index is incomplete): a
  gray `Not found in your memory: <words>.` when some search words occur in no journal; an amber `None of these
  words appear in your memory: <words>.` when no match holds any search word; the results are still listed. Also
  `No matches` with a suggestion (never "nothing in memory"), a blue coverage note while the Text or Meaning index
  is incomplete, and an error with `Retry`.
- Opening a match (or a card header, for its first match) opens the run detail at the matched lines, addressed by
  the result's `subject`: `agent-inspector`, `team-inspector`, `org-inspector`, or `folder-inspector` (a run no
  record names, read with `runFolderWorkJournal(runKey)`; it has a Work Journal tab only). The cue (and a text
  match's found words, for the banner `lines a–b · Words: …`) stays in the address, so `Back to search results`
  returns to the same results.

## Memory Index

The Index tab shows the memory index pipeline from `memoryIndexStatus`: a headline (`Not indexed yet`,
`Step N of 4 · <step> P%`, `Meaning index P%`, `Up to date`, `Stopped at <step>`, `Embedding model changed`) and
four step cards (Find runs, Journals, Text index, Meaning index) with state, progress bar and counts. The tab label
shows a spinner and percent while building, and a dot when the user may need to act.

- `Index now` (`startMemoryIndexing`) is the only way a first build starts; `Try again` resumes a failed build.
- `Rebuild` (`rebuildMemoryIndex`) asks for confirmation in a slim row and is disabled while a build runs.
- After a build the Meaning index keeps embedding in the background; the page shows it as the running last step.
- Spinners and bar transitions stop under `prefers-reduced-motion`.

## Work Journal View

The run detail's default tab reads the run's Work Journal in windows of 300 lines (a file can be several MB):

- a file rail (from 1280 px; a select below) with each file's days, lines, size, `Active` for the open file and
  `Matched lines` for files holding matches;
- `Jump to day`, `Go to line` (clamped to the file), `Show 300 earlier / later lines`, and the footer
  `Lines a–b of N` (`Large file: lines load in parts.` above 5,000 lines);
- opened from a search result: the matched lines highlighted and scrolled into view, a banner naming the cue and
  the match, and `Match 1 / Match 2` when the run has two matches;
- a local run without a journal shows `No Work Journal yet. Index your memory to create it.` with a link to the
  Index tab; an imported run shows `No Work Journal`.

## Storage Source

Storage is server-owned and identity-opaque:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Delegated task-team members: `memory/agent_teams/<rootTeamRunId>/<taskTeamRunId>/<memberRunId>/...`; a task team delegated inside a task team appends its run id before the member id
- Task-Agent runs: `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<taskAgentRunId>/...`
- Agent org members: `memory/agent_orgs/<orgRunId>/<...teamRunIds>/<agentRunId>/...` (team runs hosted inside the org, including task teams, contribute their run ids before the agent run id)
- Imported source memory: `memory/imports/<memorySyncSourceId>/agents/...` and
  `memory/imports/<memorySyncSourceId>/agent_teams/...`, plus hub-managed
  `memory-sync-source.json` and `sync-manifest.json`.

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
ids or display names. Memory Sync uses the backend `memorySyncSourceId` selected in
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
saved hub URL, saved `memorySyncSourceId`, and saved token. Unsaved draft URL or source
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

When a run could not sync some files, the card adds a warning-coloured block
under the status lines: "N files could not be synced" ("1 file could not be
synced" for one), then one row per file (path, size, the hub's reason and the
next attempt; at most 20 rows, then "and N more"). Only the path may break inside
a word; the rest of a row wraps at word boundaries. The run itself still reports
`success`, because one file that fails never stops the others, and **Sync now**
retries every failing file at once. Problems that affect every file (an
unreachable hub, a revoked token) stay in the `Last sync` error line as before.
The block's text is localized (English, 简体中文) in
`localization/messages/<locale>/memorySyncSettings.ts`.

Current v1 sync mirrors local `agents` and `agent_teams` files of any size: small
files travel in size-bounded batches, a file above 8 MiB is uploaded to the hub
in pieces and committed by reference, and a file whose size and modification time
are unchanged since its last sync is not read again (the limits are in
[`memory_sync.md`](../../autobyteus-server-ts/docs/features/memory_sync.md#sync-behavior)).
It excludes temporary/partial/lock files and does not sync
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
- Backend multi-process Memory Sync E2E starts two real server processes with isolated app-data directories, configures hub/source through HTTP GraphQL, validates saved-mode connection testing, syncs over HTTP, and asserts hub import files without requiring browser, Electron, Docker, or Kubernetes. Its large-file case (`tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts`) puts a counting proxy between the two: a 40 MiB attachment and two 20 MiB files sync with every request within the limits, an interrupted upload resumes, and a corrupted piece fails only its own file.
- `components/settings/__tests__/MemorySyncCard.spec.ts` covers the card's status lines and the "files could not be synced" block (nothing extra without failures, many failures with "and N more", one failure); how long paths wrap is checked in a browser, because jsdom does no line breaking.
- Frontend store/component/page tests for memory search (result mapping, found words, words-not-found/none/coverage/error states, opening each run kind by its subject), the memory index (status mapping, polling while building, Index now/Try again/Rebuild with confirmation, model changed), the Work Journal view (windows, jumps, matched lines, missing-journal states), Memory Home (Browse/Search/Index tabs), Browse by owner (`MemoryBrowse`, `AgentMemoryPage`, `GroupMemoryPage`: tabs, cards, owner pages, Back, not found, the agent subtitle and episodes), the read-only semantic memory folder (`SemanticMemoryFolder`: states, the transient workspace, read-only explorer mode and link rows in `FileItem.readOnly.spec.ts`), source selection and home-only sources refresh, one request per navigation, team and org runs with the member tree, inspector targets, direct route restoration, search/pagination behavior, tab-specific raw-trace fetching, raw-trace file selector state/rendering, Memory Sync tab entry, source-aware query variables, form-preserving Memory Sync status refresh, saved-vs-draft connection-test dispatch, inline connection feedback, `Current job`/`Last sync` precedence, and sync button loading state.
