# Design Spec: follow-ups-of-461-500, delivery 1

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (this design, on requirements SR-006).
- Approved requirements: `requirements-doc.md` at SR-006. D-1, D-5 and D-8 were decided by the user (2026-11-17); the rest was decided by the Solution Designer within the Task's direction, and the user was informed.
- Behavior-defining supplements: `source-follow-ups-461.md` (leads, not decisions).
- User approval of the design: `Not required`. The Task doesn't ask for it, and the release happens only on the founder's word.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md`, section "Architecture investigation (delivery 1)".
- Authorities read (2026-11-17):
  - `references/architecture-design.md`;
  - `references/design-principles.md`;
  - `DESIGN.md`, with rules 7, 9, 10, 11 and 12 applying;
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md`, in full;
  - `collaboration_model.md` §1 and §2.3;
  - `GLOSSARY.md`;
  - `references/finding-the-cause.md`.
- Project principle conflicts: none.

## Current-State Read

- **Attachments (FU-020).**
  - Every new attachment already names its run's own owner: an agent run, a team member or an org member (`useComposerTarget.ts` `resolveDraftOwner`, since `e19ed3819f`, in beta.7).
  - The host-scoped owner kind `agent_collaboration_member_*` is still parsed, routed and resolved on the server and web. Only stored links from before beta.7 reach it.
  - Its resolver finds a child only one hop under the named host (`delegated-child-locations.ts:95-98`). 111 of the 231 stored links name a host two or more hops up, so those attachments most likely don't open today. This was established by reading the code, not reproduced.
- **Streams (FU-036).**
  - `api/websocket/agent.ts` has two attach functions.
  - `attachRunStream` (lines 35-76, agent and team) answers early messages with `SESSION_NOT_READY`.
  - `attachRootStream` (lines 79-95, org and agent-collaboration) attaches its listeners only after `connect` resolves, so it drops early messages. Its `close` listener also comes late: a socket closed during `connect` leaves the session connected.
  - The org and collaboration handlers are optional parameters (`agent.ts:98-103`), although the only caller passes both (`api/websocket/index.ts:49-58`).
- **Silent lookups (FU-011) and optional collaborators (FU-018):** see the tables in "Dependency Rules".
- **Team token total (FU-013).**
  - The only client asks `getTeamRunTokenUsageSummary` for a standalone team run (`useTokenUsageWorkspaceScope.ts:43-46,191`). No client asks it for an org run (`git grep` across the repository, phone apps included).
  - Yet the resolver asks the delegation tree for both kinds with one ID (`token-usage-stats.ts:338-347`).
- **Names (FU-006, FU-010, FU-019, FU-007's code part):** see "Naming".

## Task Size And Architectural Risk (Mandatory)

- **Task size: `Large`.**
  - A persisted-data migration with a late-predecessor follow-up.
  - Removal of an owner kind and a REST route on the server and web.
  - A rename across about 90 server files and 40 web files.
  - Composition changes in two entry points (the studio server and the standalone application host).
- **Architectural risk: `High`.**
  - Persistence: the migration rewrites user trace files, after backing them up.
  - Public contracts change: an attachment route is removed, a WebSocket answer is added, a shared-package export is renamed, and the team-total query narrows.
  - Ownership: the composition rewires the run supervisor, the application host, the Task service and the stream routes.
- **Escalate if:**
  - a stored link turns up in a shape outside the inventory;
  - a binding turns out to have a production caller that runs before the composition;
  - FU-035's cause sits in the Grok CLI.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Probe `links.py`, `links2.py` (read-only, founder data) | `/tmp/fu020-probe/` | 231 structured links, all at `media.images[]`, in the child's own folder with the file present; 15 more in the `imports/` mirror | The target link is derived from the folder that holds it (M-2) |
| Probe `hostcheck.py` | same | Host = direct delegator for 120, an ancestor for 111 | No host check in the migration; the folder is the proof (M-3) |
| Probe `cost.py` | same | 7,514 trace files, 8.6 GB; 84 candidates, 390 MB; byte pre-check 9.3 s (warm) | Byte pre-check, parse only candidates (M-6) |
| Frozen helper | `app-data-migrations/frozen/server/context-files/services/context-file-record-locators.ts:34-109` | Lists a folder's trace files and rewrites only `media.*[]` and `file_attachments[].uri`; unchanged lines stay byte-identical | Reused as is (M-4) |
| Journal reuse rule | `agent-work-journal/services/work-journal-service.ts:205-249` | The active journal is re-rendered on every call; a closed one is reused while its record count matches | Journals are left (M-8) |
| Releases of each migration | `investigation-notes.md`, "Late predecessors" | Only `20261017_task_agent_own_run_v1` can carry a host link into a scanned folder after ours | One follow-up (M-7) |
| Stream attach | `api/websocket/agent.ts:35-95` | Two attach shapes; the org/collaboration one drops early messages and leaks a session on early close | One attach function (S-4) |
| Token query clients | `git grep getTeamRunTokenUsageSummary` | Only `tokenUsageMeterStore.ts:383-396`, called for standalone teams only | The query is team-only (S-7) |
| Optional collaborators | `agent-run-service.ts:97-136,150,317,363,376`; `task-execution-resource-release.ts:10,22`; `project-task-service.ts:45-96,452` | Absence decides stop, activation, release and status | Required, with an explicit implementation per host (DR-2) |
| Silent finds | `list-peer-nodes-contract.ts:27-30`, `list-available-agents-contract.ts:30-40`, `remote-run-channel.ts:145-149`, `api/websocket/peer-run.ts:17`, `api/rest/remote.ts:28,46,72`, `agent-run-command-coordinator.ts:350-352` | `null` means "remote off" or "not eligible" by a missing binding | Passed in (DR-1) |
| Application host | `standalone-application-host/start-standalone-application-host.ts:251-279`; `application-execution-scope-kernel-builder.ts:271` | Composes a supervisor without remote collaboration (`remoteChannel: () => null`) and an `AgentRunService` without `standaloneRuns` | It gets explicit "none" implementations (DR-1, DR-2) |
| Watcher flake (Reproduced) | `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Under CPU contention: timeouts at 8 to 15 s, and a rename seen as a delete; with 60 s waits, the cases that ran got their events | Tests assert outcomes, not timing (FU-021) |

## Intended Change

- Remove the host-scoped attachment owner and convert the stored links once, with a backup.
- Answer early stream commands on every stream.
- Pass the silently-looked-up owners in, and make the optional collaborators required.
- Narrow the team total to team runs.
- Rename the hosting-era names.
- Make the refusal texts clear and actionable.
- Fix three test or tooling gates, and reproduce FU-035 before fixing it.

## Change Scope (Mandatory)

- **In scope:** REQ-001 … REQ-011.
  - The server's context-file owner kinds, the collaboration location service, the agent WebSocket attach, the composition of the studio server and the application host, the Task service's dependencies, the token-usage resolver.
  - The refusal texts on D-4's surfaces.
  - One new app-data migration and its follow-up.
  - The web's owner kinds, the attachment model and the delegated-run row names.
  - `nuxt.config.ts`, the runtime-names test and the mobile-shell probe.
  - The docs: `collaboration_model.md`, `GLOSSARY.md`, the `context_files` and `token_usage` module docs, and `data_migration_guideline.md` §10 (one lesson line).
- **Derived consumers:**
  - The work journals and search index derive from raw traces. The active journal follows the rewrite on its own; closed journals keep old text (M-8). Neither is changed.
  - `raw_traces_manifest.json` stays valid, because record counts are unchanged.
  - The run-history indexes don't hold links.
- **Deliberately left alone:**
  - The Task record's names, stored and in code: `TaskExecution…`, `executionResources`, the schema module's mapping (D-5, follow-up FU-500-01).
  - "Root" names that mean a run at the top of its own membership tree (Naming, rule N1).
  - The `agent-collaborations/:runId/communication/...` references route: it serves a run's own messages, not attachments.
  - Process getters that throw when unset (`getAgentRunService`, `getCollaboratorAdmission`, `getStandaloneAgentRunRootManager`, `getRunFileChangeService`, `getProcessRemoteCollaboration` in GraphQL resolvers). They fail loudly, and the GraphQL resolvers are created by the framework (Principle 16, "framework edge"). Recorded as follow-up FU-500-02.
  - `getProcessProviderRelayAccess`. It isn't touched; its availability answer is FU-500-02.
  - The `imports/` mirror. Memory sync owns it and replaces it from its source node.
- **Follow-ups:** FU-500-01 (D-5), FU-500-02 (the remaining process getters), FU-500-03 (`collaboration/` folder naming, only if it's not dead: see Naming N6).

## Relevant Behavior And Production-Path Map (Mandatory)

| ID | Kind | Requirement / AC | Trigger | Existing | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| B-1 | User | REQ-011 / AC-008 | User attaches a file to a message to a delegated run | Owner is the run's own (beta.7) | Preserved; the host kind is removed | S-1 |
| B-2 | User | REQ-011 / AC-008 | User opens a past conversation of a delegated run with an attachment | Host link via `DelegatedChildLocations`, one hop | Link is the run's own after the migration; 111 broken links open | S-2 |
| B-3 | Operational | REQ-011 / AC-008 | First start of the new release | — | The migration converts, with a backup | S-3 |
| B-4 | Operational | REQ-011 | A later start where `task_agent_own_run_v1` finished late | — | The follow-up converts its output | S-3b |
| B-5 | Contract | REQ-009 / AC-006 | A client sends before `CONNECTED` on the org or collaboration stream | Dropped | `SESSION_NOT_READY` | S-4 |
| B-6 | System | REQ-005 / AC-002 | A Task is closed, so its run is stopped | Studio: through its root; application host: silent no-op paths | Explicit per host | S-5 |
| B-7 | User | REQ-004 / AC-002 | An agent calls `list_peer_nodes` / `list_available_agents(node)` | Off refusal when nothing is bound | Off refusal from an explicit "off" channel | S-6 |
| B-8 | User | REQ-006 / AC-003 | A team run's token meter loads its total | Asks both kinds | Asks the team kind | S-7 |
| B-9 | Contract | REQ-007 / AC-004 | A refusal on D-4's surfaces | Mixed texts | Style FR-1 … FR-4 | S-8 |
| B-10 | User | REQ-010 / AC-007 | A `grok_build` agent's tool call is refused by the server | "Tool execution failed." | The server's text (after the reproduction) | S-9 |

## Task Design Health Assessment (Mandatory)

- **Change posture:** cleanup and refactor, with two bug fixes: the broken multi-hop attachment links and the dropped early commands.
- **Root cause:**
  - FU-020: `Legacy Or Compatibility Pressure`. The host-scoped kind survives only for old data.
  - FU-036: `Duplicated Policy Or Coordination`. Two attach functions, and one lacks the not-ready rule.
  - FU-011 and FU-018: `Boundary Or Ownership Issue`. Behavior is decided by a missing binding.
  - FU-013: `Shared Structure Looseness`. One ID serves two subjects.
  - Names: vocabulary drift.
- **Refactor needed now:** yes, for each of these. That is the Task.

## Terminology

The glossary (`GLOSSARY.md`, with `collaboration_model.md` §1) gains:

- **Root (in code names):** a run at the top of its own membership tree: an Agent run, a Team run above its sub-teams, or an Org run. Every delegated run is a root of its own (CM-7). A root never holds another run.
- **A run's agent (standalone run):** the one agent of a standalone Agent run. Replaces "host" in code.
- **Known leftover:**
  - The Task record is named `agentRunResources` / `agentRun` on disk and `TaskExecution…` / `executionResources` / `execution` in code, behind one mapping (D-5, FU-500-01).
  - Token usage records keep `root_team_run_id` for a team member (D-6).
  - The routing-decision log stores `copyAddress` / `copyKind` (FU-500-04).
  - Each of the three is a follow-up, to be decided later (FU-500-01, FU-500-04, FU-500-05). The glossary lists them under "Known leftovers", so the old names are not taken for current vocabulary.

## Naming (FU-006, FU-010, FU-019)

Rules:

- **N1 "root":** stays where it means a run at the top of its own membership tree (Terminology). Under it, `StandaloneAgentRunRoot`, `RootTeamRun`, `RootOperationGate`, `CollaborationRootResolver`, `ActiveCollaborationRootDirectory`, `RootExecutionIdentity` and `rootRunId` stay.
  - FU-006's suggested names (`…Runtime`) were a lead. With 461's model, "root" no longer implies hosting.
  - Renaming about 50 more types would add a large diff and no clarity.
- **N2 "host":** goes from code that means the standalone run's agent or the run itself.
- **N3 "copy":** goes for a delegated run.
- **N4 "task execution":** stays this round (D-5, SR-006: dropped by the user; FU-500-01).
- **N5 "transient execution":** becomes "delegated run" in the web.
- **N6:** stale comments that say a run hosts others are rewritten. `AgentMemoryLayout.getAgentRunCollaborationDirPath` (`agent-memory-layout.ts:100-103`, "child memory inside the host run directory"): **to verify** whether anything still writes or reads `agents/{run}/collaboration/`.
  - If nothing does, it is dead code and is removed, with the `"agent"` case of `getRootExecutionDirPath`.
  - Otherwise its comment is corrected, and FU-500-03 records the name.

| Old (server) | New | Files (server) |
| --- | --- | --- |
| `StandaloneRootHost` | `StandaloneRunAgent` | 9 |
| `StandaloneHostAgentHandle` | `StandaloneRunAgentHandle` | 6 |
| `StandaloneHostTerminationResult` | `StandaloneRunAgentTerminationResult` | 4 |
| `activateHost` / `terminateHost` | `activateRunAgent` / `terminateRunAgent` | 16 / 11 |
| `resolveRootAndEnsureHost` | `resolveRootAndEnsureAgent` | 7 |
| `hostRunId` (server and web) | `agentRunId` where it names an agent run; `runId` in the web's `AgentRunCollaborationContext` | 67 / 39 |
| `PairedAgentAccess`, `PairedAgentObservation`, `TeamPairedAgentAccess`, `StandalonePairedAgentAccess`, `pairedAgents` | `RunAgentAccess`, `RunAgentObservation`, `TeamRunAgentAccess`, `StandaloneRunAgentAccess`, `runAgents`: a run's own agents, observed or commanded for a peer's owner or a local view | 12 / 9 / 3 / 3 / 11 |
| `DelegatedCopy…`, `assignToExistingCopy` | `DelegatedRun…`, `assignToExistingDelegatedRun` | 2 / 1 |

| Old (web) | New | Files |
| --- | --- | --- |
| `RunHistoryTransientExecutionRow` | `RunHistoryDelegatedRunRow` | 14 |
| `kind: 'transient_execution'` | `kind: 'delegated_run'` | 18 |
| `transientKind` (values unchanged: `task_agent`, `task_team`, `task_team_child`) | `delegatedRunKind` | 16 |
| `WorkspaceTransientExecutionRow.vue` (and its specs) | `WorkspaceDelegatedRunRow.vue` | 19 |

- **Added at SR-008, from the implementation engineer's sizing (code-only unless stated):**
  - **N3 also covers** `AssignToExistingCopyInput`, `delegatedCopyOf`, `copyTargetOf`, `notACopyOfThisRun`, the parsed subject `existing_copy` (internal, not a tool-schema value: `task-delegation-tool-input-parsers.ts:8,47,51`), `newCopyFolder`, `projectFolderForNewCopy` (and `project-new-copy-folder.ts`), `serializeCopyInTask`; web `isDelegatedCopyLive` (and `delegatedCopyLiveness.ts`), the badge `'delegated_copy'` (web-only: `runMemberTree.ts:50`, `delegatedLaunchRows.ts:206,220`), the i18n keys `workspace.history.copyTask.*` and `runSettings.delegated.copy`. New names say "delegated run". Clipboard "copy" and `copyTeamRun` / `copyOrgRun` (duplicating a config) are other meanings and stay.
  - **The public result code** `TASK_COPY_NOT_ASSIGNABLE` (`task-delegation-command.ts:66`) becomes `TASK_DELEGATED_RUN_NOT_ASSIGNABLE` (REQ-002; one release, rule 9).
  - **Stored fields stay:** `copyAddress` / `copyKind` in the routing-decision log (`model-routing/stores/routing-decision-log.ts:25-26,61-88`; web `types/modelRouting.ts`) are stored names. As with the Task record (D-5), they stay in code and on disk this round, named in the glossary as a known leftover: follow-up FU-500-04.
  - **The GraphQL argument** `agentRunCollaborationMemberProjection(hostRunId, …)` becomes `runId`: it names the run whose view is asked (web query and codegen follow).
  - **Kept, with reason:** the org's `TaskExecutionHostIdentity.hostRunId` / `hostKind` (`root-execution-identity.ts:31,147-166`, `agent-org-execution-index.ts`, `agent-org-run.ts`) names the org or team run that contains a member agent: containment within one run, not a run holding runs. It is also a `TaskExecution…` name (D-5). It stays, and the completion check excludes it.
- **Already gone (FU-010's examples):** `RemoteRunRootEvent`, `LocalChildRootEvent`, `delegateToNewCopy` and `COPY_RUNNING` (0 files). `remoteChildren` / `localChildren` stay: a run's children on a peer or here, one concept with two locations.
- **To verify by the implementation (lesson 2):** `'transient_execution'` is not persisted in the web's browser storage (expanded-row keys). If it is, rule 10's client-side migration applies, and the change returns to design.
- **Completion check (AC-001):** `git grep -wE` for every old name above returns only migrations, frozen files, `tickets/`, the routing-decision log's stored `copyAddress` / `copyKind`, and `TaskExecutionHostIdentity`.

## Persisted Data / State Transition Decision (Mandatory)

| Data | Decision | Evidence |
| --- | --- | --- |
| Structured host-scoped attachment links in raw traces (`media.{images,audio,video}[]`, `file_attachments[].uri`) | **Migration Required** | A stored name with a wrong meaning: it names the hosting run, which is not the owner. Its reader goes, so only a migration keeps the attachments usable (D-8; guideline §2.1, §3 "Stored names follow the code") |
| Text mentions of the link (tool results, arguments, message text), closed work journals, the search index, `server.log`, the `imports/` mirror | **Not Affected** (inert residue) | No reader resolves them as references; rewriting text would falsify history; the mirror belongs to memory sync (guideline §6, "Inert residue") |
| One draft folder `draft_context_files/agent-collaborations/` (1 item) | **Not Affected** (inert residue) | An unsent draft upload whose owner kind no longer exists; nothing reads it; never deleted without the founder's approval |
| Task records `agent_run_resources.json` | **Not Affected** | D-5: stored names stay |
| The web's browser storage | **Not Affected**, to verify (Naming) | — |

### Migration Plan

- **IDs:**
  - `20261119_delegated_run_own_attachment_links`;
  - its follow-up `20261119_delegated_run_own_attachment_links_after_task_agent_own_run`.
  - Both are appended after the last released entry. Since `v1.5.14-beta.1` (SR-017) that is `20261118_remove_retired_built_in_agents` (autobyteus-491), so both IDs are dated `20261119`, later than it (guideline §4, "append-only").
- **Folder:** `src/app-data-migrations/migrations/delegated-run-own-attachment-links/`. Tests go in `tests/app-data-migrations/delegated-run-own-attachment-links/`.
- **Imports:** only `domain/`, `frozen/` and node APIs (the boundary test).

**M-1 Scope.**
- It scans the run folders where a delegated run's traces live:
  - `memory/agents/{runId}/`;
  - every member folder under `memory/agent_teams/{rootTeamRunId}/…/{agentRunId}/` (a folder directly holding a raw trace file).
- It never scans `memory/imports/` or `memory/agent_orgs/`. The link names an agent-collaboration child, which is never an org member.
- Trace files are listed by the frozen `listContextFileRecordSources({ rootDirectories: [], agentDirectories })`: active, segments and complete archived segments.

**M-2 Source shape and target (one fixed mapping).**
- **Source:** a string equal to `/rest/agent-collaborations/{host}/agent-runs/{child}/context-files/{file}` (segments URL-encoded, no scheme, no query), at a field the frozen helper visits.
- **Target, when the trace file's folder `F` is:**
  - `memory/agents/{child}`: `/rest/runs/{child}/context-files/{file}`;
  - `memory/agent_teams/…/{team}/{child}` (its parent folder `{team}` is the containing team run): `/rest/team-runs/{team}/agent-runs/{child}/context-files/{file}`.
- Segments are re-encoded with `encodeURIComponent`, as `buildFinalContextFileLocator` does (`context-file-owner-types.ts:180-195`, frozen copy).

**M-3 Admission (both ends of the reference, guideline §6).** A link converts only when:
- (a) `{child}` equals `F`'s own folder name;
- (b) `F/context_files/{file}` exists as a file;
- (c) `{file}` passes the frozen `assertStoredFilename`.

The host is not checked: the probe shows it can be any ancestor (111 of 231). Ownership is proven by the folder and the file, not by the named host. A link that fails (a), (b) or (c), or a host-scoped string in another form (draft, absolute URL), stays as it is: disposition `PRESERVED_UNCONVERTIBLE`, a warning with capped examples.

**M-4 Conversion per file.**
1. Byte pre-check for `"/rest/agent-collaborations/`. Files without it are `ALREADY_CURRENT`.
2. For a candidate, run `transformContextFileRecordLocators` with a transform applying M-2 and M-3.
3. If the text is unchanged, the file is `ALREADY_CURRENT`.
4. Otherwise:
   - back up first (M-5);
   - write the new text to a temporary file in the same folder, `fsync`, then rename it over the original;
   - re-read the file and check that no admitted source link remains and the line count is unchanged.

**M-5 Backup (the founder's rule, D-8).**
- **What:** a byte copy of each file before its first rewrite, at `{appDataDir}/app-data-migration-backups/20261119_delegated_run_own_attachment_links/memory/{path relative to memoryDir}`, `fsync`ed before the replacement.
- **Retry:** an existing backup is never overwritten. A retry after an interruption keeps the backup of the true original.
- **Justification (guideline §7):**
  - its reader is the founder, for a manual restore;
  - its basis is an approved operational contract (D-8);
  - its cost is about 390 MB of copies for 84 files, once.
- **Not a rollback engine:** nothing restores automatically.

**M-6 Cost.**
- One pass: 8.6 GB read for the byte pre-check, 9.3 s warm in a probe; cold time to be measured in validation.
- 84 files parsed and rewritten (390 MB, largest 42 MB).
- No recurring work: after `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`, startup skips it.

**M-7 Late predecessors (guideline §4).**
- **Classification:** a predecessor matters only if, running after ours, it moves or writes a trace holding the source link into a scanned folder (writer), or selects items by the source shape (reader).
- **Not affected:** every migration shipped before `v1.4.92-beta.5` converts only data from before the link existed, and none rewrites into the source shape. Our output (`/rest/runs/…`, `/rest/team-runs/…`) is the current shape their locator transitions accept (`team-context-file-execution-locators-v1`, `agent-org-flat-team-families-v1`).
- **Shipped later:** of those, only `20261017_task_agent_own_run_v1` moves delegated runs' folders with their traces (`coordinating-run-migration.ts:110-133`).
- **The rest are `none`, by code:**
  - `collaborators_to_delegated_runs_v1` (tree JSON only, lines 52-60);
  - `append_only_message_logs_v1` (message logs);
  - `delegated_runs_own_runs_v1` (message logs, line 228) and its nine follow-ups (461's steps, no trace moves);
  - `delegated_copy_own_file_complete_v1` (own-file metadata): **to verify** in its source that it doesn't move traces;
  - the project, identity, memory-sync and manifest migrations (other files).
- **One follow-up:** `…_after_task_agent_own_run` has prerequisites `[20261017_task_agent_own_run_v1, 20261119_delegated_run_own_attachment_links]`. It is `requiredOnStartup`, has no `holdsBackCapabilities`, and runs the same definition (one parameterized class). It is idempotent by structure, because M-4's pre-check makes converted files `ALREADY_CURRENT`.
- **Test:** a registry test lists every earlier migration with its class (writer: one; none: the rest, each with its reason). It fails on an unclassified one, like 461's `delegated-runs-late-predecessors.test.ts:38-105`.

**M-8 Derived data.**
- The active work journal re-renders from the rewritten trace on its next call.
- Closed journal files and the search index keep the old text. That is inert residue: no reader resolves it.

**M-9 Status and admission.**
- `SUCCEEDED` when every file is current or converted.
- `SUCCEEDED_WITH_WARNINGS` when any link is `PRESERVED_UNCONVERTIBLE` or a candidate file can't be parsed (that file is left unchanged).
- `FAILED` on an I/O error in backup, write or rename. Files already converted stay converted, and the next start retries the rest.
- It is `requiredOnStartup` (precedent: `team-context-file-execution-locators-v1`). A failure affects only the attachments still unconverted: they don't open. New work and every other run are unaffected (guideline §1).

**M-10 Rollback (guideline §4, "Rolling back").** An older build already reads `/rest/runs/…` and `/rest/team-runs/…` links. So rolling back to beta.7 works with converted data, and the release notes can say so.

**Guideline checklist (§2):**

1. **Need:** yes, a stored name with a wrong meaning whose reader goes.
2. **Availability:** unaffected, per M-9.
3. **Source and target:** the shape inventory is in the investigation notes. Fixtures (§9):
   - F-1: an agent run with an active trace link;
   - F-2: a team member with links in active and segment files;
   - F-3: a nested sub-team member (written by released code, not in the founder's data);
   - F-4: a link whose file is missing;
   - F-5: a link whose child is not the folder's run;
   - F-6: text mentions in `tool_result` and `content` (unchanged);
   - F-7: an `imports/` mirror (untouched);
   - F-8: a file that is already current;
   - F-9: `file_attachments[].uri` (reachable through the frozen helper).

   Fixtures are synthesized, never copied from real data.
4. **Dispositions:** M-3 and M-9.
5. **Commit and retry:** per-file atomic rename; backups per M-5; no journal.
6. **Current-only boundary:** current code has no reader of the old form (Removal plan). The migration uses frozen helpers only. It is appended at the end, with predecessors classified (M-7).
7. **Cost:** M-6.
8. **References:** context-file links are resolved by `ContextFileOwnerResolver` on use, not at startup.
9. **Evidence:**
   - fixtures F-1 … F-9;
   - retry after an interrupted rename;
   - a second start changes nothing;
   - the late-predecessor case (task_agent_own_run FAILED on the first start, finished on the next);
   - the startup entrypoint.
10. **Lessons:** the precedents read are `team-context-file-execution-locators-v1`, `agent-org-context-file-locator-transition`, and 461's CR-461-048 and CR-461-074. The lockout lesson is avoided by per-file isolation and warnings. Reviewed by the Architecture Reviewer and the Code Reviewer.

## Data-Flow Spine Inventory

| Spine | Scope | Start → End | Owner | Why |
| --- | --- | --- | --- | --- |
| S-1 | Attach (unchanged) | Composer → run's own draft → send → final link | `ContextFileFinalizationService` | Confirms no host kind is needed |
| S-2 | Open an old attachment | Conversation hydration → link → REST → resolver → file | `ContextFileOwnerResolver` | The converted link must resolve |
| S-3 / S-3b | Migration and follow-up | Startup runner → migration → backup → atomic write | `AppDataMigrationRunner` → our definition | Data conversion |
| S-4 | Early stream command | Socket open → attach → message before `connect` resolves → `SESSION_NOT_READY` | the attach function | FU-036 |
| S-5 | Task closure stop | `update_task` DONE → `ProjectTaskService` → `TaskExecutionResourceRelease` → request → `AgentRunService.stopForTaskClosure` → `standaloneRuns` port | the composition's port | FU-018 |
| S-6 | Peer discovery tool | Agent tool call → MCP provider → contract → `PeerDiscoveryChannel` | the provider's injected channel | FU-011 |
| S-7 | Team total | Meter → `getTeamRunTokenUsageSummary` → delegation tree (`agent_team`) → store | the resolver | FU-013 |
| S-8 | Refusal | Tool or endpoint → refusal builder → result text | each refusal's owner | FU-030 |
| S-9 | Grok refused tool | Grok CLI → MCP call → our executor's refusal → CLI → ACP snapshot → projection | `grok-build-tool-projection.ts` | FU-035 |

## Spine Narratives

**S-2 (after the change):**
`runProjectionConversation` → `hydrateContextAttachment(link)` → `contextAttachmentModel` matches `UPLOADED_FINAL_AGENT_ROUTE` or `UPLOADED_FINAL_TEAM_ROUTE` → browser GET `/rest/runs/{id}/…` or `/rest/team-runs/{team}/agent-runs/{id}/…` → `context-files.ts` route → `ContextFileOwnerResolver.resolveFinalOwner`:
- `agent_final`: admitted by `RootRunPackageReadinessIndex`;
- `team_member_final`: located by `{containingTeamRunId, agentRunId}` → `ContextFileLayout.getFinalFilePath` → file.

For a provider resend, `ContextFileLocalPathResolver` maps the same link to a local path: the rewritten traces are replayed to the model with resolvable paths.

**S-3:**
`AppDataMigrationRunner` (startup, registry order) → `DelegatedRunOwnAttachmentLinksMigration.execute` → list run folders (M-1) → per file: pre-check → frozen transform with the M-2/M-3 rules → backup (M-5) → temp write, `fsync`, rename → re-read check → aggregate counts and capped warnings → runner status.

S-3b is the same definition, gated by its prerequisites.

**S-4:**
`registerGatedWebSocketRoute` → `attachRunStream(socket, handler, runId, label)`: listeners are attached at once, with state `connecting`.
- A message while `connecting` gets `SESSION_NOT_READY`.
- When `connect` resolves with an ID, the state becomes `ready`, and later messages go to `handler.handleMessage`.
- When it resolves `null`, the state is `refused`: the handler has already answered and closed.
- A close while `connecting` sets `closed`. When `connect` later resolves with an ID, `handler.disconnect(id)` is called at once.
- An error is logged, as today.

**S-5 (studio):**
`ProjectTaskService.update` DONE → `TaskExecutionResourceRelease.release` → `request(run)` (required) → `AgentRunService.stopForTaskClosure` → `standaloneRuns.stopRootForTaskClosure`. The studio's port is the root manager.

In the application host, the port is `ApplicationHostStandaloneRuns` (DR-2): it answers "not eligible" (`null`) for every run, by its contract. `AgentRunService`'s existing non-eligible branch then stops the run directly. Behavior is unchanged; only the rule is now explicit.

**S-6:**
`list-peer-nodes-mcp-adapter-provider` → `listPeerNodesFor(collaboration, discovery)`, where `discovery` is required and comes from the provider's construction.
- The studio passes `services.discovery`.
- The application host passes `REMOTE_COLLABORATION_OFF_DISCOVERY`, whose methods return `remoteCollaborationOff()`.

**S-7:**
Meter → `getTeamRunTokenUsageSummary(teamRunId)` → `delegated.agentRunIds(createTeamRootExecutionIdentity(teamRunId))` → `TokenUsageRunStore.getTeamRunSummary`. No `agent_org` lookup. The query's doc says it serves team runs.

**S-9:** see FU-035.

## Ownership Map And Removal / Decommission Plan

**FU-020 removal.**
- Server:
  - in `context-file-owner-types.ts`: the two types, their parse branches (lines 72-74, 94-117), the `DRAFT_LOCATOR_SHAPES` entry (128) and the final-locator case (188-189);
  - in `context-file-owner-resolver.ts`: `matchingFinalOwner`'s collaboration branch (56), `assertAgentCollaborationHostAdmitted` (80-85), and the lookup and result branches (92-95, 112-121); delete `AgentCollaborationContextFileOwnerNotFoundError` and its route mapping;
  - in `context-file-finalization-service.ts`: lines 72-74;
  - in `context-file-local-path-resolver.ts`: lines 18 and 105-112;
  - in `context-file-layout.ts`: lines 50-52;
  - in `api/rest/context-files.ts`: the route (256-263) and the `DelegatedChildLocations` wiring (34, 53); `buildServices` loses `tree`;
  - delete `delegated-child-locations.ts` (129 lines);
  - in `collaboration-execution-location-service.ts`: delete the `agents` family, the `"agent"` cases, `LocatedStandaloneRootAgentExecution` from the union, and `tree` from `createStoredCollaborationExecutionLocationService`;
  - in `general-process-run-supervisor.ts`: lines 65 and 109.
- Web:
  - in `contextFileOwner.ts`: lines 6 and 12;
  - in `contextAttachmentModel.ts`: lines 14-15 and 128-134;
  - in `useContextAttachmentComposer.ts`: lines 87-88;
  - in `agentStreamMessageProjector.ts`: lines 59-64 and 237, a dead variant (Principle 7: nothing builds `kind: 'agent_collaboration_member'`, per `grep`);
  - the specs for all of these.
- Docs: the `context_files` module doc.

**FU-036 removal:** `attachRootStream`. The `?` on `orgHandler` and `agentCollaborationHandler`, and the `getAgentStreamHandler()` default parameter, go too: the caller passes all four handlers.

**FU-011 removal:**
- `bind/find/releaseProcessPeerDiscoveryChannel`;
- `bind/find/releaseProcessRemoteRunChannel` and `resolveRemoteRunChannel`'s fallback;
- `findProcessRemoteCollaboration`. `getProcessRemoteCollaboration` stays for the GraphQL resolvers;
- `bind/getProcessStandaloneRunCommandPort`;
- `getProjectTaskService`'s lazily unbound instance: it now throws when uninitialized.

**FU-018 removal:** the `?` on `standaloneRuns`, `request`, `requestRelease`, `workerStatus`, `topRun`, `displayName` and `searchCleanup`, with their `?? fallback`s.

## Dependency Rules And The Composition Root

**DR-1: silent finds become passed collaborators.** "Explicit off" is a value the composition passes, never a missing binding.

| Owner | Consumer | Studio passes | Application host passes |
| --- | --- | --- | --- |
| `PeerDiscoveryChannel` | the two discovery MCP providers → contracts | `services.discovery` | `REMOTE_COLLABORATION_OFF_DISCOVERY` (new constant beside `remoteCollaborationOff`, `agent-discovery-refusal.ts`) |
| `RemoteRunChannel` | roots (`remoteChannel` factory, now required); `registerPeerRunWebsocket(app, channel)` | `services.client` | `() => null` (already explicit, line 279); peer-run WS is not registered there |
| `RemoteCollaborationServices` | `registerRemoteCollaborationRoutes(app, remote)` | `services` | not registered |
| `StandaloneRunCommandPort` | `AgentRunCommandCoordinator` (required `standaloneRuns`); the coordinator is built in the supervisor and passed to its users | the root manager | `APPLICATION_HOST_STANDALONE_RUNS` (DR-2) |
| `ProjectTaskService` | its 6 lookup modules | initialized at composition; `getProjectTaskService()` throws before | unchanged (to verify: the application host's Task tools use the studio's instance or none) |

To verify by the implementation: who calls `getAgentRunCommandCoordinator()` (`agent-run-command-coordinator.ts:372`). Each caller gets the composed coordinator, or the getter throws when it isn't set.

**DR-2: optional collaborators become required.**
- `AgentRunService.standaloneRuns: StandaloneRunLifecyclePort`.
- The application host (`application-execution-scope-kernel-builder.ts:271`) passes `APPLICATION_HOST_STANDALONE_RUNS`. It implements `StandaloneRunLifecyclePort` and `StandaloneRunCommandPort` with "not eligible" answers (`null`), as its process hosts no eligible runs (the existing comment at `agent-run-service.ts:110-112`).
- One constant, one rule, documented. Not an empty layer: it is the explicit answer of a host that has no standalone roots (Principle 13).
- `TaskExecutionResourceRelease(request)` and `ProjectTaskService`'s `requestRelease`, `workerStatus`, `topRun`, `displayName` and `searchCleanup` are required. Tests construct them with fakes (rule 11).

**Fired triggers:** Hidden dependency (16), Behavior by absence (13), Several kinds or forms (1: studio and application host traced separately), Persisted-data transition (5), Vocabulary drift (15), Legacy cleanup (8).

## FU-013: Token Totals

- `getTeamRunTokenUsageSummary` serves team runs only.
- The `agent_org` lookup (`token-usage-stats.ts:342-344`) is removed, with the comment that justified it.
- There is no org-run total query, because no product surface asks for one (S-7 evidence). An org's members keep `getAgentOrgMemberTokenUsageSummary`. This meets REQ-006: each total query names one run kind, and nothing guesses.
- `docs/modules/token_usage.md` follows.

## FU-030: Refusal Wording

**Style:**
- **FR-1:** what happened, naming the run or agent by its display name (SR-091).
- **FR-2:** why, in the user's or agent's terms, not internal ones.
- **FR-3:** what to do next.
- **FR-4:** codes and outcomes stay. Only `message` text changes.

**The five collected texts:**

| Case | New text |
| --- | --- |
| DLP-005 delegation to a retired default model | "{Agent} can't be delegated to: its default model '{model}' is no longer offered by {Runtime}. Choose another model for {Agent} in its settings, or delegate to another agent." |
| DLP-003 / DLP-004 launch notes and Settings fallback reason | "'{model}' is no longer offered by {Runtime}, so {run} uses {fallback} (inherited from {delegating run}). Choose another model in {run}'s settings to change it." |
| SIR-001 message between two unrelated user-started runs | "You can't message {run}: it isn't part of your Task. Only runs that work on the same Task can message each other by run ID." |
| DCP-004 Settings save of a running delegated run | "{run} is running, so its settings can't be saved now. Stop it, then save again." |

**The other refusals:** the implementation lists every other refusal on D-4's surfaces with old → new text in its handoff:
- `delegate_task` / `send_message_to` results (`catalog-delegation.ts`, `delegator-catalog.ts`, `cross-run-message-delivery.ts`, `remote-refusal-codes.ts`);
- archive and delete;
- the Settings save;
- launch notes (`run-model-selection-refusal.ts`).

Each new text follows FR-1 … FR-4. The Code Reviewer checks the list against FR-1 … FR-4. Existing tests' outcome assertions stay. Text assertions change.

## FU-035: Grok's Refused Tool Call (D-9)

- **Step 0, by the implementation (before any fix):** reproduce with a live `grok_build` run, using the test vault and the Grok waiver rule (a usage-limit failure alone is not a failure).
  - An agent calls `send_message_to` to a run it may not message (SIR-001's case).
  - Record three things: the MCP result our executor returned (`agent-tool-mcp-tool-executor.ts`), the raw ACP `tool_call_update` snapshot (`rawOutput`, `content`), and what the model says it saw.
- **Branch A:** the snapshot carries the text in a field the projection doesn't read. The fix is in `failureText` (`grok-build-tool-projection.ts:36-37`), with a unit test from the recorded snapshot.
- **Branch B:** the CLI drops the text before the snapshot or the model. The cause is external. The implementation returns `Design Impact` with the evidence, and the founder decides (D-9).

## FU-021, FU-022, FU-023, FU-016: Tests And Tooling

- **FU-022:** add `deepseek_harness: 'DeepSeek Harness'` to the expected list in `autobyteus-agent-presentation-contracts/tests/agent-runtime-names.test.mjs`.
- **FU-023:** add `'layouts/__tests__/**'` to `ignore` in `autobyteus-web/nuxt.config.ts`. Prove that `node autobyteus-web/scripts/typecheck.mjs` passes from a fresh `.nuxt`. Rule 12: the change alters what the web build scans, so `pnpm release:test --ref <branch>` runs before the merge.
- **FU-016:** the 58 cases are already unique (static check). Add a load-time guard in `mobile-shell-probe.mjs` that fails on a duplicate case ID, so it stays that way.
- **FU-021 (cause reproduced, investigation notes "FU-021"):** the tests depend on timing; the watcher loses no event in the cases run.
  - **The timing assumptions:** fixed deadlines (8 s and 12 s waits, 15 s per test), "the first change of the next event", and 800 ms "no event" windows.
  - **What happens under CPU contention:** events arrive after those deadlines, and a rename can come as a delete and an add in separate batches.
  - **The fix makes the tests assert outcomes, not timing:**
    - every wait collects changes until the expected change appears (the file's own `waitForChange`, line 90), under one hang-guard ceiling of 60 s, with the per-test timeout above it;
    - the move test accepts a move or rename, or a delete then an add, and also asserts the explorer's final tree (the source gone, the destination present);
    - a "no event" check makes a sentinel change after the ignored one and asserts that no ignored path arrived before the sentinel's event, instead of an 800 ms window.
  - The watcher code is unchanged.
  - **SR-013 (cause completed):** the OS itself drops or holds file events under heavy load. Raw chokidar and Node's `fs.watch` both lose events without our code (investigation notes, "FU-021, continued"). No test can make the OS deliver them, so the test classifies the failure truthfully:
    - **Environment probe:** when a wait reaches its hang guard, the test runs a raw `fs.watch` probe: a fresh temp dir, one write, at most 10 s.
      - If the probe also gets no event, the case fails with "ENVIRONMENT: the OS delivered no file event within 10 s (FSEvents under load); this watcher result is not meaningful", plus the case's own diagnostics.
      - If the probe gets its event, the case fails as a product failure, with the original message.
    - **No retries, no skip, no longer waits.** The guard stays at 60 s.
    - **SR-014 (D-13b):**
      - When the probe gets its event, the message is "INCONCLUSIVE: the watcher saw no change; a fresh fs.watch stream did. Under load the OS can drop one stream's events (FU-500-06); rerun where the OS delivers events." It never says "product failure": under load, another stream's event doesn't prove the watcher's stream got its own (IMP-012).
      - **The proof moves:** the API/E2E engineer runs the file 5 of 5 on Linux (inotify), in a Docker container from the worktree after `pnpm test:integration:prepare`, and on a quiet macOS when one is available. Loaded-macOS runs are evidence only.
    - The rewrite already committed (`fb52bd332c`) stays.

  - **To prove it (restated at SR-014, ARCH-REV-007; supersedes SR-013's wording):** after `pnpm test:integration:prepare`:
    - **The gate:** 5 of 5 runs on Linux (inotify, a Docker container from the worktree), plus 5 of 5 on a quiet macOS when one is available (AC-005, D-13b).
    - **Evidence only:** on a loaded macOS (for example 10 busy loops, `yes > /dev/null`), every failing case is labeled ENVIRONMENT or INCONCLUSIVE, never a product failure, with no assertion failure and no test timeout.

    Commands are in the investigation notes.

## Spine Walks Per Case (lesson 1)

- **S-2, agent run:** `/rest/runs/{child}/…` → `agent_final` → `isAdmitted("agent", child)` → `agents/{child}/context_files/{file}`. That is where M-3(b) found it.
- **S-2, team member:** `/rest/team-runs/{team}/agent-runs/{child}/…` → `{containingTeamRunId: team, agentRunId: child}` → located member with `memoryDir` = `agent_teams/{root}/…/{team}/{child}` (`agent-memory-layout.ts:81-94`) → `context_files/{file}`. For a nested member, `team` is its parent folder: its containing team run.
- **S-2, peer-started run:** not involved. Its files stay on its node, and it takes no uploads (`useComposerTarget.ts:57`).
- **S-2, an unconvertible link:** it stays host-scoped, and the web no longer matches it, so it shows as an unopenable attachment. Today it already fails for the multi-hop ones.
- **S-3, interrupted after rename A, before B:** retry. A is `ALREADY_CURRENT` by the pre-check, B converts, and B's backup from the first attempt is kept.
- **S-3b, `task_agent_own_run_v1` FAILED on the first start:** ours runs and converts what is in own folders. Nested children stay where they are, unscanned. On the next start, the predecessor moves them, then the follow-up converts them.
- **S-4, each of the four streams:** agent, team, org and collaboration now share one function, so each answers early messages the same way. Early close on each: disconnects a late session.
- **S-5, studio and application host:** traced above. Both keep today's outcomes.
- **S-6, both hosts:** studio uses the real discovery. The application host gets the same "off" refusal as today, now from an explicit value.
- **S-7, a team run with delegated runs:** they're included, as today. An org ID sent to the team query now counts no delegated runs. No client sends one.

## Change Sequence (commits)

1. Rename-only commits: server N2/N3, web N5. No behavior change; the whole suite passes.
2. FU-036 attach.
3. FU-011 and FU-018 composition.
4. FU-013.
5. FU-020: code removal, then the migration and its follow-up with fixtures and the registry classification test.
6. FU-030 texts.
7. FU-022, FU-023, FU-016 and FU-021 gates.
8. FU-035 step 0, then branch A or B.
9. Docs: glossary, collaboration model, module docs, guideline §10 lesson line.


---

# Delivery 2 (SR-008): migration order guard, FU-029, FU-033

Requirements: REQ-012 … REQ-015, AC-009 … AC-011. FU-028 is dropped (D-10). FU-032 was dropped (SR-007).

## G-1: The released order is recorded by the release (FU-027 option 1, D-11)

- **The record:** `autobyteus-server-ts/src/app-data-migrations/released-migration-order.json`, a JSON list of migration IDs in registry order. It starts as today's `RELEASED` list (beta.7, 45 IDs).
- **The writer:**
  - `autobyteus-server-ts/scripts/record-released-migration-order.ts` (run by `pnpm -C autobyteus-server-ts migrations:record-released`) builds `new AppDataMigrationRegistry()`, as the test does, and writes its IDs in order.
  - `scripts/desktop-release.sh` `run_release` runs it before `commit_tag_and_push` and passes the file among the committed paths. The tag then holds exactly the order it shipped.
  - `RELEASE.md` (owned by the Delivery Engineer) gets one line in "Cutting The Release" saying the script does it; there is no hand step.
- **The test** (`app-data-migration-registry-order.test.ts`, rewritten): it reads the file instead of the hand-kept constant, and checks three things:
  1. the registry starts with the recorded list, in order;
  2. every later entry is dated after the newest recorded one;
  3. later entries are in date order.
  
  Checks 2 and 3 already exist. Check 1 now comes from the file.
- **Rule 12:** the release script runs on the release machine, which has the workspace installed. The new step needs only what the server's unit test already needs to build the registry, and the CI gates don't run it. `pnpm release:test --ref <branch>` (already required by delivery 1's FU-023) covers the changed script.
- **The writer refuses a reordering** (ARCH-REV-002 note): the script exits with an error and writes nothing when the registry does not start with the existing recorded list. So a release can't record a reordered list, even if the order test was skipped.
- **Removed:** the `RELEASED` constant and its comment.
- **The runner is unchanged.** Late runs are still handled per migration (guideline §4), as D-1 decided.

## G-2: FU-029, a same-ID repair of `20260521_team_run_history_index_v2` (revised at SR-010 for ARCH-REV-002 AR-001)

- **Why not "kept exactly":**
  - The repair serves installations where this migration is pending or failed, so the index it reads is the pre-v2 one, and its rows may be legacy-shaped (`lastActivityAt`, no `createdAt`: `team-run-history-index-v2-migration.ts:259,265`).
  - The current index reader rejects the **whole index** when any row has a key outside its set or misses a required field (`frozen/server/run-history/store/team-run-history-index-store.ts:77-104`). Read: the loop returns `null` for the list, not just for the row.
  - So a single legacy row written back would hide every team run's history.
- **The rule, at lines 443-451.** For each existing row whose ID was not rebuilt from `team_run_metadata.json`:
  1. **The folder `agent_teams/{teamRunId}/` is gone:** the row is removed as stale, as today.
  2. **The row already passes the reader's row rules** (the same key set and types as `team-run-history-index-store.ts:83-104`, applied by a small frozen validator beside the migration): it is kept, its values unchanged.
  3. **Otherwise, the row is rebuilt as a v2 row** from the existing row and the folder's `team_run_execution_tree.json`. The tree is read tolerantly: only the fields below, with their types checked.

     | Field | Source, in order |
     | --- | --- |
     | `teamRunId` | the folder name (safe ID, as `safeTeamRunId`) |
     | `teamDefinitionId` | tree `rootTeam.teamDefinitionId`; else the row's non-empty `teamDefinitionId`; else the item `FAILED` (no row written, as for metadata records at :399-406) |
     | `teamDefinitionName` | the row's non-empty value; else tree `rootTeam.teamDefinitionName`; else the definition-name port (`resolveTeamDefinitionName`'s lookup); else the ID, with a warning |
     | `workspaceRootPath` | tree `rootTeam.defaultLaunchConfiguration.workspaceRootPath`, canonicalized; else the row's; else `null` |
     | `summary` | the row's non-empty `summary` (compacted); else `""`. The coordinator-trace rule needs the metadata file's member layout, which is gone. The current catalog shows a run without a summary as it does for 461's restored rows |
     | `createdAt` | the row's `createdAt`; else tree `createdAt`; else the team directory's birthtime; else the row's `lastActivityAt` (warning); else the migration time (warning). These are the same candidates as `deriveCreatedAt`, without the metadata file |
     | `archivedAt` | the row's; else tree `archivedAt`; else `null` |
     | `terminatedAt` | the row's; else `null` |
  4. **No readable tree** (missing or not JSON) and the row fails the reader's rules: the row is not written. Disposition `SKIPPED`, with a warning ("team folder without a current tree; row omitted"). The folder is untouched: such a run can't be opened by current code either.
- **Every written row goes through the existing `TeamRunHistoryIndexStore.writeIndex` with `TeamRunIndexRowRecord` values** (its `normalizeRow`), so the written index always passes the reader. The earlier "write raw rows like 461's `addRows`" is withdrawn.
- **Founder's data (read-only check):** all 400 sampled `team_run_execution_tree.json` files carry `createdAt`, `rootTeam.teamDefinitionId`, `rootTeam.teamDefinitionName` and `rootTeam.defaultLaunchConfiguration`.
- **Same ID:** this fixes installations where the migration is pending or failed. Terminal records stay skipped (guideline §7). No new migration. 461's follow-up `…_after_team_run_history_index_v2` stays and adds nothing when the rows are present.
- **Fixture (AC-010).** Released-shape data where `team-run-execution-tree-v1` ran and this migration runs late. A **pre-v2 index** holds:
  - a legacy-shaped row (`lastActivityAt`, no `createdAt`) for a user-started team with a current tree;
  - a v2-valid row for a delegated team;
  - a row whose folder is deleted;
  - a row for a folder without a tree.

  Expected:
  - the first row is rebuilt;
  - the second row is kept with its values;
  - the third and fourth rows are removed or omitted, with their dispositions;
  - **both teams are listed through the current reader** (`TeamRunHistoryIndexStore.readIndex` and the run-history catalog);
  - a second start changes nothing.

## G-3: FU-033, the probe's data

`autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` SIR-002 names `helper_run_5555` in an improvement session, the same way the server fixture does (`skill-improvement-data-fixtures.ts`). Its expectation (deleted) then matches the migration's rule. The migration is unchanged.

## G-4: FU-028

Dropped (D-10, SR-009): no change. The field is ignored residue in every older stored launch, and stripping it would be a migration for a representation only.

## Delivery 2 classification

- **Size:** `Small` (a test, a release script step, one same-ID repair, one probe fixture).
- **Risk:** `High`, because the change corrects a released migration that touches user history rows.
- **Combined package (delivery 1 + 2):** `Large` / `High`.


---

# G-5 (SR-011): a stored model its runtime no longer offers (REQ-016, AC-012, D-12; group 4)

- **Current state** (base `origin/personal` `d8dbeaa9ba`, read):
  - The Settings note exists for the root only (`ExistingRunConfigEditor.vue:28` passes `modelUnavailable('/')`; `:394-405` computes it per address).
  - Member activation (`configured-agent-execution-handle.ts:429-440` `prepareActivation`) and standalone restore (`standalone-agent-run-lifecycle-service.ts:308-330` `restoreStarted`) start the runtime with the stored pair unchecked. The founder met it as "No conversation found" (508).
- **The check owner: `RunModelSelectionService`**, with one new method: `storedModelOffer({ runtimeKind, llmModelIdentifier }): Promise<"offered" | "not_offered" | "list_unreadable">`.
  - It reads the runtime's list through the same `readCatalog` and answers from `offeredModels` only.
  - `validate()` is not reused: for an unchanged selection it accepts the exact current model even when it is no longer offered (`run-model-selection-service.ts:79-83`, `findExactCurrent`).
  - It reads only the selected runtime's list (DESIGN.md §5, no unrelated discovery).
  - **Bounded (SR-012, ARCH-REV-004 AR-002):**
    - It reads with `deadline: createReadDeadline(AVAILABLE_AGENT_RUNTIMES_STEP_CAPS.modelsMs)`: 8 s, the existing budget for one runtime's model list (`available-agent-runtimes-service.ts:41-43`). Passing a deadline is the existing option `runtimeModelSelectionCatalog(runtime, workspaceRootPath, { deadline })` (`model-catalog-service.ts:179-190`; `runtime-management/read-deadline.ts`).
    - A read that ends by its deadline (`isDeadlineExceeded(error)`) or by any other thrown read error answers `list_unreadable`, so the start proceeds as today.
    - **The cost, stated:** CLI runtimes discover their list fresh on each read (Grok: an ACP handshake, `grok-build-model-catalog.ts:5-9`; Antigravity: `agy --help` and `agy models`; Codex: an app-server lease, `codex-model-catalog.ts:23-34`). Each restore or member activation of such a runtime adds one discovery, at most 8 s when the CLI hangs.
    - **Test:** a CLI runtime's catalog slower than the budget (fake clock or a catalog awaiting past the deadline). The start proceeds, the refusal is not raised, and the added delay is bounded by the budget.
- **The wording owner: `run-model-selection-refusal.ts`**, with one new builder: `storedModelNotOfferedRefusal({ agentName, runtimeKind, llmModelIdentifier })`. Code `RUN_MODEL_NOT_OFFERED`. Text (FR-1 … FR-4): "{Agent} can't start: its saved model '{model}' is not offered by {Runtime} now. Stop it, then choose a runtime and model for {Agent} in Settings."
- **Both paths apply the same rule (Principle 1, "two paths, one capability"):**
  - `restoreStarted`: before `buildConfig`.
  - `prepareActivation`: after `buildAgentRunConfig`, before `planner.begin`.

  Each asks `storedModelOffer`. On `not_offered`, it throws the existing activation error type of its path, with the code and text above:
  - `AgentRunActivationError` on the standalone path;
  - the readiness-failure card on the member path, which `:415-425` already turns into `kind: "readiness_failure"`.

  On `offered` or `list_unreadable`, it continues as today.
- **Collaborators:**
  - The lifecycle service and the member handle receive `RunModelSelectionService`, or a `Pick<…, "storedModelOffer">`, from their constructors (`options` at `configured-agent-execution-handle.ts:82`).
  - The supervisor already holds `input.modelSelectionValidator` (`general-process-run-supervisor.ts:120-124`). **To verify:** it is a `RunModelSelectionService`. If not, the composition passes the service beside it.
  - The application host passes the same service. No optional parameter, no fallback (DR-2).
- **Web:** `ExistingRunConfigEditor.vue` passes `modelUnavailable` per member address to the member rows (`:members` / the row component). Each member row shows the root's note, using the same component and text.
- **Spine walk:**
  - (a) Team member, list read, model missing: Settings note on the member row; the user sends a message; the member activates; refused; the run's view shows the refusal; no runtime is started.
  - (b) Standalone run, same case: refused at restore.
  - (c) List unreadable, or slower than its 8 s budget: starts as today, at most 8 s later.
  - (d) Model offered: unchanged.
  - (e) Peer-started run: its node runs the check (same code).
  - (f) A delegated run's member: path (a).
- **Classification of this addition:** Medium. The combined package stays `Large` / `High`.


## G-5 revision (SR-015): CRR-003 CR-500-003, CR-500-004, CR-500-005

All three points were checked against the code at `718a359cab`.

### R1: an AutoByteus model that loads on demand (CR-500-003)

- **Premise read:**
  - On the AutoByteus runtime, Ollama, LM Studio and custom OpenAI-compatible models are registered in `LLMFactory` only when their provider's catalog is loaded. The start path loads it (`ModelAvailabilityService.ensureModelAvailable`, `model-availability-service.ts:52-63`, from `available-llm-construction.ts:14`).
  - G-5 read `LLMFactory.listAvailableModels()` without that load, so after a restart it called a working model "not offered".
  - A failed local discovery doesn't throw from `ensureProviderModelCatalog`. It reports through the snapshot's `sources[]` (`ModelSourceStatus`: `state`, `successfulUnitCount`, `failedUnitCount`; `llm-providers/domain/models.ts:29-45`; Ollama throws inside `prepare` only when every host failed, `model-catalog-service.ts:244-259`).
- **The owner of on-demand loading stays `ModelAvailabilityService`.** It gets one public method, used by `ensureModelAvailable` itself and by G-5:

  `loadOnDemandModel(identifier): Promise<"not_on_demand" | "loaded" | "unreadable">`

  - `not_on_demand`: the identifier is neither custom-endpoint nor host-scoped (the parsing already in `resolveDynamicProvider`, `:66-82`).
  - `unreadable`: the provider can't be resolved for a host-scoped or custom identifier (its host or endpoint isn't configured); or `ensureProviderModelCatalog` throws; or its LLM source status reports **any failed unit (`failedUnitCount > 0`) or a failed `state`** (SR-016, ARCH-REV-008 AR-003).
    - The status counts hosts across the provider (`model-catalog-service.ts:248-256`), while identifiers are host-scoped. So with counts only, one failed host means "this model's host may not have been read", and the start proceeds as today.
    - Per-host detail would refine it later. That's not needed now.
  - `loaded`: otherwise.
- **`RunModelSelectionService.storedModelOffer`, for `autobyteus`:**
  1. Within the same `MODEL_LIST_READ_MS` race (`raceDeadline`), call `loadOnDemandModel`. `unreadable` or the deadline means `list_unreadable`.
  2. Otherwise read `LLMFactory`'s list as before: present means `offered`, absent means `not_offered`.

  Static providers (cloud models registered at initialization) take step 2 directly. External runtimes are unchanged.
- **Unreadable when a local host is down:** the start proceeds as at base and fails there with its own error. A run is never told to change a model that may be fine. This is D-12's rule.
- **One source for the Settings note:**
  - `RunModelSelectionService.listOptions` (`run-model-selection-service.ts:143-152`) applies the same step 1, inside the same `MODEL_LIST_READ_MS` race (ARCH-REV-008 note), for an `autobyteus` current model before reading the catalog. `unreadable` gives `modelListReadable: false` (an existing field), with the existing unreadable text.
  - The web's note (`ExistingRunConfigEditor.vue:405`) shows only when `modelListReadable` is true and `currentModel` is absent. Today it shows on an unreadable list too: a false note, now removed for the root and the members.
- **Tests:**
  - LM Studio and Ollama: present after a load, the host down, and loaded but missing. Each through both start paths and the options read.
  - Two Ollama hosts, the model's host down and the other up: `list_unreadable`, the start proceeds, and no Settings note (AR-003).
  - A custom endpoint model.
  - The deadline.
  - API/E2E reruns SCP-E2E-006 after a restart.

### R2: the agent's own "not found" answers first (CR-500-004)

- **Premise read:** the AutoByteus backend resolves the definition in `prepare()` (`autobyteus-agent-run-backend-factory.ts:286-298`). G-5 sat before it on both paths (`standalone-agent-run-lifecycle-service.ts:105`, `configured-agent-execution-handle.ts:438`).
- **Rule:** G-5 speaks only for an agent that exists. Both paths ask for the run's definition before G-5:
  - the lifecycle service: `metadata.agentDefinitionId`, through `Pick<AgentDefinitionService, "getAgentDefinitionById">` passed in from the composition;
  - the member handle: its member's definition ID, through the same `Pick` in its `options`.

  When the definition is missing, G-5 is skipped, and the path continues to its existing not-found answer (base: `RUN_NOT_FOUND` / the backend's `AgentCreationError`).
- This is an explicit precondition of the model refusal, not a second "not found" owner: the existing owner still answers. A failed definition read also skips G-5, and the backend reports it as today.
- **Test:** the run of a retired agent (F-1, E-002) answers as at base, on both paths.

### R3: the inherited-layer refusal's next step (CR-500-005, Local Fix)

- At `collaborator-launch-resolver.ts:173` (a delegated agent that would use its delegating run's model, which is no longer offered), the text follows FR-1 … FR-4: "{Agent} can't be delegated to: it would use this run's model '{model}', which {Runtime} no longer offers. Set a model for {Agent} in its settings, or change this run's model, then delegate again."
- The model detail keeps the existing "is not offered by {Runtime} now" wording (`modelNotOfferedText`).
- Test DLP-005 and the probe follow. A row is added to the handoff's FU-030 table.

### Classification

Unchanged: G-5 is Medium, and the package stays `Large` / `High`.


## SR-017: a release shipped 491's migration first (the Delivery Engineer's Design Impact)

- **Facts:**
  - `v1.5.14-beta.1` (autobyteus-538, `origin/personal` `2eb195603a`) released 46 migrations, ending with `20261118_remove_retired_built_in_agents` (autobyteus-491). Its released set was recorded by hand in the old `RELEASED` list (`1f835e3e7f`).
  - This ticket's two migrations are unreleased (no installation has run them), so their IDs can still change.
- **D-15 (Solution Designer):**
  - **New IDs:** `20261119_delegated_run_own_attachment_links` and `20261119_delegated_run_own_attachment_links_after_task_agent_own_run`. They are dated after the newest released entry (`20261118`), as the guideline's "later than" requires, and appended after 491's entry, main migration first. Prerequisites are unchanged, apart from the new main ID in the follow-up's list.
  - **The backup folder** follows the new ID (M-5).
  - **The released record:** `released-migration-order.json` becomes exactly beta.1's 46 IDs, in its order (the base's `RELEASED` list at `1f835e3e7f`). The merge conflict in `app-data-migration-registry-order.test.ts` resolves to this ticket's JSON-reading test, and the base's hand list is removed (G-1).
- **491's classification against M-7: `none`.** Read on `origin/personal`:
  - `remove-retired-built-in-agents-migration.ts:1-76` deletes only two agent-definition folders, `<agentsDir>/autobyteus-skill-evolver` and `<agentsDir>/autobyteus-memory-compactor` (registry lines 173-178). `getAgentsDir()` is `<data>/agents` (`app-config.ts:355-356`), not the memory folder.
  - It writes no trace file and selects nothing by an attachment link. Its runs stay, in their own folders.
  - Our migrations read and write only trace files under `<data>/memory/agents/` and `<data>/memory/agent_teams/` (M-1).
  - The two touch disjoint data, so either order gives the same result, and no follow-up is needed.
  - The registry classification test lists 491's ID as `none`, with this reason.
- **Other parts:**
  - G-2 (the same-ID repair of `20260521_team_run_history_index_v2`) doesn't depend on registry order.
  - G-1's record script is unchanged. It refuses a registry that doesn't start with the recorded 46, so the reordering it would catch is the one avoided here.
- **Evidence to redo:** API/E2E MO-1 in the order users will meet: 491 first, already applied as on beta.1, then this ticket's two on the next start. It needs a fixture with both retired agent folders and attachment links, checked for the same result as the reverse order. The registry-order and late-predecessor tests run on the new IDs.
- **Release notes line (C-6, from CRR-003):** the first start after this update converts old attachment links once. Measured at 14.3 s plus 12.3 s on the API/E2E data; about 9 s on the founder's 8.6 GB in the read-only probe.
