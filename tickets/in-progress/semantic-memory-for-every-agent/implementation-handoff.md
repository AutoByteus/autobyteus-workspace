# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`, branch `codex/semantic-memory-for-every-agent` (base `personal` at `8430d9ef12`). Commits: `56b02294d0` (code, tests, docs), `a9ca3c48c6` (an owner known only as a member shows loading while the cards or members load; the rendered-UI probe and its package script), `cff2a6596a` (a link row sorts with the files, as the reference shows; probe check SMV-039), `ecbb4741ca` (ticket records and evidence); after CRR-001: `cd26f4d913` (CR-001 fix and specs), then these records and evidence IMP-14…IMP-16 (§ Checks Run).

## Local Fix After CRR-001 (IR-002)

- CR-001 (REQ-007): `SemanticMemoryFolder.vue` now keeps the id it registers from the moment of registration (`registeredId`). `release()` (on a folder or view change and on unmount) unregisters it and starts a new generation. A first listing that completes in an older generation is ignored: no `workspaceId` is set and no error is shown. A failed listing in the current generation releases the workspace and shows the error. Leaving the view while "Loading the folder…" shows therefore leaves no `semantic_memory` entry in the web store, and the chat and Run Settings menu has nothing to offer.
- Specs (`SemanticMemoryFolder.spec.ts`, on the real workspace store):
  - unmount during a pending listing: no `semantic_` entry and no `semantic_memory` metadata remain, also after the late listing completes;
  - an agent change during a pending listing: only the current folder's workspace is registered and shown.
  - Negative control: both specs fail on the reviewed component (IMP-14).
- Scope: one component and its spec. FU-003 (the menus list transient workspaces; `SkillWorkspaceLoader` has the same pattern) is not touched.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review selected and passed (ARCH-REV-004 on SR-008; ARCH-REV-002 on SR-002 for N-4); source review next, by `get_handoff_rules`
- Requirements doc: `requirements-doc.md` (SR-008, Approved; the UI approved by the founder on 2026-11-20)
- Investigation notes: `investigation-notes.md`, `global-semantic-memory-investigation.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-008)
- Behavior-defining supplement: the Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md` (Approved; runnable reference `personal@437bad9a`, VIS-001…VIS-019)
- Supplemental task artifacts: `follow-ups.md` (FU-001, FU-002: not crossed)
- Design review report: `design-review-report.md` (ARCH-REV-004, `Pass`; notes N-8…N-11 applied)
- Architecture review revision record: `architecture-review-revision-record.md`
- The pause of 2026-11-19: `implementation-progress.md` (kept as its record; superseded by IR-001)

## Current Implementation Summary

Every agent, in every runtime and run kind, now has semantic memory: each run's preparation creates the agent's
folder `<memory>/semantic/<encoded id>` and the node's global folder `<memory>/semantic-global`, and the instructions
carry the unchanged Semantic Memory section followed by the Global Semantic Memory section (DEC-013 text). Claude gets
both folders as additional directories and Codex as `workspace-write` writable roots. The switch is removed as a clean
cut (definition field, config read/write, node reader, application source, edits, GraphQL field and inputs, personal
setting `SEMANTIC_MEMORY`, package edit capture, the web form field and detail switch); a stored key is ignored and
dropped at the next write of its file or record.

The Memory page's semantic folders are shown read only through `SemanticMemoryWorkspace` (kind `semantic_memory`):
`WorkspaceManager` creates `semantic_ws_<encoded id>` / `semantic_global_ws` on demand for an existing folder only,
never lists them, and refuses them as a run's workspace through the new `getOrCreateRunWorkspace`
(`WORKSPACE_NOT_RUNNABLE`), which the AutoByteus factory, the Claude and Codex resolvers (and so ACP — Grok, DeepSeek —
and Antigravity, N-10) and published artifacts now use. The file explorer reads two workspace properties: `readOnly`
(every GraphQL mutation refused `WORKSPACE_READ_ONLY` before any file is touched) and `followSymbolicLinks` (false:
`lstat` classification, link rows `isSymbolicLink`, non-regular entries skipped, any path through a link refused
`WORKSPACE_LINK_NOT_OPENED` in `folderChildren`, `fileContent` and the content/static routes, watcher
`followSymlinks: false`).

The Memory page is organised by owner. The episodic catalog has a read API (`agentDefinitionIds`, `runsOf`,
`whenStartPassDone`) and a process binding set by both composition roots (`EPISODIC_CATALOG_NOT_COMPOSED` when
missing). `AgentMemoryExplorerService` answers the Agents cards and `listAgentEpisodes` (replacing
`listAgentRunsWithMemory`) from the catalog for this node (no discovery; waits for the start pass, N-9) and from one
discovery per request for an imported source; episodes filter by run ID, Task title and run summary and build memory
availability for the page only (N-8). `listMemoryGroupMembers` gives a team's or org's members (definition, else the
newest stored run); team and org cards carry `memberCount` and, for this node, the definitions with no runs.
`agentSemanticMemoryFolder` / `globalSemanticMemoryFolder` give a folder's state without creating it. The web builds
the approved UI: Browse tabs Global · Agents · Agent Teams · Agent Orgs with cards, the agent page (Episodic,
Semantic), team and org pages (Members, Runs), the read-only folder view (the file explorer's new read-only mode),
en and zh-CN strings, regenerated GraphQL types. Docs and glossary are updated.

- Implementation cycle: `Local Fix` (after `Initial`, IR-001)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-008`
- Related architecture-review revision IDs: `ARCH-REV-004` (`ARCH-REV-002` for N-4)
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: as designed: every runtime's prompt and access, a read-only workspace kind with node-enforced write and link refusals, a run-workspace refusal on every runtime path, a process binding in two composition roots, a new owner-organised read model and a new Memory page; about 60 server source files and 50 web files.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. AC-012: the local owner queries answer in ≤ 0.25 s after the catalog's start pass with no discovery, and the imported 474-run source's owner queries in ≤ 0.9 s (budget 3 s), so the design's escalation (a per-source cache) is not needed (§ Checks Run, IMP-09).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Every run's instructions carry the section with its folder; the folder is created; Claude/Codex access | each runtime owner → `AgentSemanticMemory.prepareForRun(run config's agentDefinitionId)` → `{ agentFolder, globalFolder }` (both `mkdir -p`) → `composeSharedCarpenterPrompt` / `composeNativeAutoByteusPrompt` (`semanticMemoryPath`, `globalSemanticMemoryPath`, both required and absolute) → Claude `additionalDirectories: [agent, global]`, Codex `writable_roots: [agent, global]` | Implemented for AutoByteus, Claude, Codex, ACP (Grok, DeepSeek harness), Antigravity; unit per runtime with no field, stored `false` and stored `true`; the scripted-AGY e2e covers standalone under a Project, shared team member, coordinator, delegated copy, team-local member (IMP-06) |
| BEH-002, BEH-003 (REQ-002…004, AC-002…004) | No switch anywhere; stored keys ignored and dropped at the next write; the detail shows the path | Field removed in model, config, node reader, application source, edits, definition service, GraphQL (`semanticMemoryPath: String!`), personal settings record/service/enum, package edit capture; `mergeAgentConfigRecord` keeps the key only in its retired-key drop list; web form/detail/store/GraphQL documents/`PersonalSetting`/localization | Implemented; AC-002 grep (§ Checks Run IMP-12) finds only the drop list in live code; unit + e2e SM-01/SM-02 |
| BEH-005 (REQ-010, REQ-011, AC-009) | One global folder, created at every run start; the DEC-013 section right after the agent's; Claude/Codex access | `AgentMemoryLayout.getGlobalSemanticMemoryDirPath()` (`semantic-global`, a sibling of `semantic/`) → `prepareForRun` → `renderGlobalSemanticMemorySection` | Implemented; exact-text unit test against DEC-013; per-runtime units; e2e SM-04/05/07; the live test (gated) gains SML-GLOBAL (one agent writes, another reads) for API/E2E |
| BEH-004 (REQ-005, REQ-007, AC-005, AC-006, AC-011) | Read-only folder view; node refuses writes, links, runs; never lists; never creates the folder | `SemanticMemoryWorkspace.open` (lstat; missing or link → refused) ← `WorkspaceManager.getOrCreateWorkspace`; `listVisibleWorkspaces` filters kind `semantic_memory`; `getOrCreateRunWorkspace`; `FileExplorerResolver.resolveWritableWorkspace` → `assertWritable`; `WorkspaceFileExplorer({ followSymbolicLinks })` → `classifyEntryWithoutFollowingLinks`, `assertNoSymbolicLinkOnPath`; REST content/static → `resolveReadablePath`; watcher start command `followSymbolicLinks` → chokidar `followSymlinks` | Implemented; unit (workspace, explorer, chokidar with a negative control, protocol), API unit (every mutation byte-identical, content route 403), e2e SM-11, rendered probe (IMP-13) |
| BEH-004 (REQ-006, AC-008, AC-012) | Browse by owner; episodes from every place; members; internal agents hidden | `EpisodicCatalog` read API + `setProcessEpisodicCatalog` in `build-studio-server.ts` and `start-standalone-application-host.ts`; `AgentMemoryExplorerService` (+ `agent-episodes.ts`), `TeamMemoryExplorerService` / `AgentOrgMemoryExplorerService` (+ `memory-group-members.ts`, `StoredGroupMember` from the stored trees), GraphQL `memory-explorer.ts` / `memory-explorer-schema.ts`; web `MemoryBrowse`, `AgentMemoryPage`, `GroupMemoryPage`, `memoryExplorerStore` | Implemented; unit (cards, N-9 wait, hidden agents, unattributed, episodes filter/page/subject/place, imported, members both ways, binding); GraphQL e2e; the AC-012 measurement (IMP-09) |
| BEH-004 / BEH-005 (REQ-008, REQ-012, AC-007, AC-010) | Imported source: not-synced note; Global page | `SemanticMemoryFolder.vue` (imported → note, no request; Global copy), `semanticMemoryFolderStore` | Implemented; web unit; rendered probe Global and zh-CN |

## Key Files Or Areas

Server (`autobyteus-server-ts/src`):
- Semantic memory: `agent-memory/services/agent-semantic-memory.ts`, `agent-memory/store/agent-memory-layout.ts`, `agent-execution/prompt/carpenter-prompt-sections.ts`, `carpenter-prompt-composer.ts`, the five runtime owners (`claude-session-bootstrapper.ts`, `codex-thread-bootstrapper.ts`, `autobyteus-agent-run-backend-factory.ts`, `acp-agent-run-backend-factory.ts`, `agy-agent-run-backend-factory.ts`), `api/graphql/converters/agent-definition-converter.ts`; field removal in `agent-definition/**`, `personal-settings/**`, `agent-packages/services/package-edit-capture.ts`, `api/graphql/types/agent-definition.ts`, `personal-settings.ts`.
- Workspace: `workspaces/semantic-memory-workspace.ts` (new), `workspace-access-error.ts` (new), `workspace-manager.ts`, `filesystem-workspace.ts`, `workspace-path-utils.ts`, `workspace-metadata.ts`; run resolvers `claude-workspace-resolver.ts`, `codex-workspace-resolver.ts`, the AutoByteus factory, `published-artifact-publication-service.ts`.
- File explorer: `file-explorer/directory-traversal.ts`, `file-explorer.ts`, `tree-node.ts`, `file-system-changes.ts`, `sort-strategy/sort-strategy.ts`, `watcher/file-system-watcher.ts`, `watcher/runtime/{watcher-runtime-protocol,watcher-runtime-client,chokidar-watcher-runtime}.ts`; `api/graphql/types/file-explorer.ts`, `api/rest/workspaces.ts`, `api/graphql/types/workspace.ts`.
- Owners: `agent-episodic-catalog/services/episodic-catalog.ts`, `agent-memory/services/agent-memory-explorer-service.ts`, `agent-episodes.ts` (new), `memory-group-members.ts` (new), `team-memory-explorer-service.ts`, `agent-org-memory-explorer-service.ts`, `collaboration-root-memory-catalog.ts`, `team-root-memory-source.ts`, `agent-org-root-memory-source.ts`, `agent-memory/domain/models.ts`; GraphQL `memory-explorer.ts`, `memory-explorer-schema.ts`, `memory-run-subject.ts` (extracted from `memory-search.ts`), `semantic-memory-view.ts` (new, folder states only), `schema.ts`; composition roots `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts`.

Web (`autobyteus-web`): `components/memory/{MemoryBrowse,AgentMemoryPage,GroupMemoryPage,SemanticMemoryFolder}.vue` (new), `MemoryHome.vue`, `CollaborationMemoryDetail.vue` (`embedded`), `AgentMemoryDetail.vue` (removed); `components/fileExplorer/{FileExplorer,FileItem,FileExplorerTabs}.vue` (read-only mode); `components/agents/AgentDefinitionForm.vue`, `AgentDefinitionDetailSections.vue`, `AgentSemanticMemoryField.vue` (removed); `stores/memoryExplorerStore.ts` (rewritten), `stores/semanticMemoryFolderStore.ts` (new), `stores/workspace.ts` (`registerTransientWorkspace`, `registerSemanticMemoryWorkspace`, `unregisterTransientWorkspace`), `stores/agentDefinitionStore.ts`; `utils/memoryBrowseNode.ts` (new), `utils/fileExplorer/TreeNode.ts` (`isLink`); `pages/memory.vue`; `graphql/queries/memoryExplorerQueries.ts`, `semanticMemoryQueries.ts` (new), agent definition documents; `types/memory.ts`, `types/personalSettings.ts`, `types/workspace/WorkspaceMetadata.ts`; localization `memory.ts`, `agents.ts`, `personalSettings.ts` (en, zh-CN); `generated/graphql.ts`; `tests/e2e/semantic-memory-view-probe.mjs` (new) and its package script.

Docs: server `agent_memory.md`, `agent_definition.md`, `personal_settings.md`, `prompt_engineering.md`, `agent_execution.md`, `codex_integration.md`, `deepseek_harness_runtime.md`, `agent_episodic_catalog.md`, `file_explorer.md`, `workspaces.md`, `design/collaboration_model.md`; web `memory.md`, `agent_management.md`; `GLOSSARY.md` (global semantic memory, episodes, owner; personal settings).

## Important Assumptions

- The run config's `agentDefinitionId` names the definition the run was loaded by; `prepareForRun` takes it (the definition object's `id` is optional in its type).
- The Agents cards for this node are the shared definitions (`getAllAgentDefinitions`: not team-local) plus every definition the catalog holds runs of; a catalog folder whose runs are all gone and that is not shared has no card.
- "Belongs to" / "Also works in" come from the members of every team and org card (`listMemoryGroupMembers` per group, loaded when an agent page opens): the design leaves the subtitle's source open, and the approved contract has no per-agent places query. A node holds few teams and orgs (UI/UX spec).
- An imported source's cards and episodes are ordered by the recorded start (the catalog's journal times exist only for this node); an imported episode has no Task title.

## Known Risks

- **Catalog latency (accepted by the design).** A local run reaches an agent's episodes after its journal's first write and the catalog's quiet window (5 s), or at the next start; right after a restart the first agent page waits for the start pass (22 s on a copy of the founder's memory under load 128; the spec's loading state). `internal-agents.e2e.test.ts` IA-03 now waits for it.
- **A link created while the folder view is open** arrives through the watcher as an ordinary add event (a file row) until the folder is read again; opening it is refused by the node (`WORKSPACE_LINK_NOT_OPENED`), so nothing outside the folder is read.
- **Unattributed runs on this node** still use the standalone scan per request (design: "the existing standalone scan"): 45–132 ms on the founder's copy; the row-first check reads metadata only for runs no history row attributes.
- **Imported team/org cards:** the founder's imported source showed 0 team and 0 org cards in the measurement while it holds `agent_teams/`; the team list path for imported sources is the existing `TeamRootMemorySource` (unchanged by this ticket except the member count). The measurement's stderr (IMP-09, IDs masked) shows run-folder discovery skipping 205 team-run records as unreadable (`RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE`, `ROOT_RUN_PACKAGE_MANIFEST_INVALID`: packages in an older layout), which is the likely cause. Not verified against the base build; worth a look by API/E2E.
- The host ran at a load average of 60–130 throughout; timing figures are upper bounds.

## Task Design Health Assessment Implementation Check

- Structural trigger responses honored: the gate has one owner (`AgentSemanticMemory`); workspaces have one manager deciding read-only, listing and runnability; the explorer reads workspace properties, never decides them; the explorer service never walks folders (catalog or discovery).
- Hidden dependency (16): one process binding with a guaranteed order (set right after creation, before GraphQL registration — `build-studio-server.ts` sets it before `registerGraphql`), loud failure (`EPISODIC_CATALOG_NOT_COMPOSED`), released at close, no cycle.
- File sizes: every changed source file stays under 500 effective (non-blank) lines; the AutoByteus factory is at 499 (one adjacent multi-line `throw` compacted to stay under).
- Additions beyond the design's file list, each an owner-local split: `workspace-access-error.ts` (the three refusal codes), `agent-episodes.ts` (episode candidates, filter/sort/page), `memory-group-members.ts` (definition/stored members mapping), `memory-run-subject.ts` (the subject GraphQL type, shared by search and episodes), web `semanticMemoryFolderStore.ts` (the folder state; keeps `memoryExplorerStore` under the limit) and `utils/memoryBrowseNode.ts` (the address format).

## Legacy / Compatibility Removal Check

- Removed: the `semanticMemoryEnabled` field everywhere (Removal Plan), `SEMANTIC_MEMORY`, `AgentSemanticMemoryField.vue` and its spec, `AgentMemoryDetail.vue` and its spec, `listAgentRunsWithMemory` (server, web query, store, docs), `AgentRunMemorySummary`/`Page`, the old Browse card grids and filter in `MemoryHome.vue`, the page's agent/team/org detail views, `AgentWithMemorySummary.memory` (the new cards show no availability; no reader left), `unregisterSkillWorkspace` (renamed `unregisterTransientWorkspace`, used by skills and the folder view), the dropped `AgentSemanticMemoryBrowser` and its queries (never committed), `wip-uncommitted.patch`.
- No compatibility wrappers: no deprecated GraphQL field, no alias query, no `null` path for semantic memory; an old `view=agent-detail|team-detail|org-detail` address opens Browse on Agents (the page's existing fallback for an unknown view).
- Kept on purpose: the retired-key drop list entry (`mergeAgentConfigRecord`), so a save removes the key.

## Persisted Data Transition Check (When Applicable)

- `agent-config.json` / `personal-settings.json` holding `semanticMemoryEnabled`: `Directly Usable — No Migration` as designed: readers ignore it; a save drops it (unit + e2e SM-01/SM-02; personal-settings logs `PERSONAL_SETTINGS_ENTRY_SKIPPED … semanticMemoryEnabled`, DEC-006). No stored file is rewritten for it.
- `<memory>/semantic-global/`: created empty at the first run start after the update; no existing data changes.
- The founder's data was only read (APFS clone for the measurement, removed afterwards); nothing ran against it.

## Environment Or Dependency Notes

- macOS (Darwin 25.5), Node v22.23.1 (and Electron 42's Node v24.19.0 for the AC-012 timing), pnpm; no dependency or build-input change.
- `pnpm -C autobyteus-server-ts build` is needed before the AC-012 script and the rendered probe (they use `dist/`); `pnpm -C autobyteus-web codegen:local` rebuilt it.
- Side effect noted: resolving `electron` from the worktree once triggered Electron's own binary download into `node_modules` (the dependency's install artifact; untracked).

## Checks Run

Evidence files are in `evidence/`; each has a header with the command, the commit tested, the environment and the date. Every run used `env -i` with `HOME`, `PATH` and `TMPDIR` only, on test-owned data (startup e2e tests used a new temp `HOME`). The host's load average stayed at 60–130 throughout.

| ID | Check | Commit | Result | Evidence |
| --- | --- | --- | --- | --- |
| IMP-01 | Server unit suite, full (`test:unit`) | tree of `56b02294d0`, before its last test fixes | 6 failed files of 1,038 (20 tests). 5 were caused by this change and fixed (see below); 1 is a timing flake | `IMP-01-server-unit-full.log` |
| IMP-02 | Architecture pins + `agent-package-folder-watcher` rerun, then the watcher file alone | tree of `56b02294d0` | Architecture pass. Watcher: 1, then 3 different cases fail on timing; the file and its source are untouched by this change | `IMP-02-server-architecture-and-watcher-rerun.log` |
| IMP-03 | `codegen:local` (server dist + web GraphQL types) | tree of `56b02294d0` | Pass; `generated/` is clean at `cff2a6596a` | `IMP-03-web-graphql-codegen.log` |
| IMP-04 | Server unit, impact rerun: agent-memory, episodic catalog, workspaces, file explorer, api, agent-execution, personal settings, agent definition and packages, standalone host, services, parity, architecture | `a9ca3c48c6` | 327 files, 2,926 tests passed (6 skipped) | `IMP-04-server-unit-targeted.log` |
| IMP-05 | e2e: `memory-explorer-graphql` + `agent-semantic-memory` (without AGY) | tree of `56b02294d0` | First run: SM-11 failed in the test's `treeHashes` (it followed a link: EISDIR), so the test now records link targets. Rerun: pass (3 passed, 6 AGY cases skipped) | `IMP-05a-…-first.log`, `IMP-05-…log` |
| IMP-06 | e2e `agent-semantic-memory` with the scripted AGY CLI: SM-01/02/04/05/06/07/08/10/11 | tree of `56b02294d0` | 9/9 pass. The run before failed SM-01 on vitest's 5 s default under load; tests now set 120 s | `IMP-06-e2e-semantic-memory-scripted-agy.log`, `IMP-06-sm-e2e/` (prompts, configs, listings, folder view) |
| IMP-07 | e2e startup upgrades: `task-agent-own-run-startup`, `open-task-tree-upgrade-startup` (they read `listAgentEpisodes` now) | tree of `56b02294d0` | 3/3 and 3/3 | `IMP-07-e2e-startup-upgrades.log` |
| IMP-08 | e2e `internal-agents` with the scripted AGY CLI | tree of `56b02294d0` | 5/5. The run before failed IA-03, then IA-04 and IA-05 after it: episodes come from the catalog after its 5 s quiet window, so IA-03 now waits up to 60 s | `IMP-08-e2e-internal-agents.log` |
| IMP-09 | AC-012 measurement (`evidence/ac012-measure.mjs`) on an APFS clone of the founder's memory folder; read only, no server start, deleted afterwards | dist of `56b02294d0` | See below; within budget, no escalation | `IMP-09-ac012-node22.json`, `IMP-09-ac012-electron-node.json` |
| IMP-10 | Typecheck, server and web | `a9ca3c48c6` | Both PASS: 0 production errors; test-file errors at baseline (server 1,006 in 315 files; web 87 in 37 files) | `IMP-10-typecheck-server-and-web.log` |
| IMP-11 | Web suite, full (`test:nuxt run`) | `56b02294d0` | 778 files, 5,859 tests passed (2 skipped) | `IMP-11-web-unit-full.log` |
| IMP-11b | Web impact rerun: `components/fileExplorer`, `components/memory`, `utils/fileExplorer` | `cff2a6596a` | 37 files, 225 tests passed | `IMP-11b-web-file-explorer-and-memory.log` |
| IMP-12 | AC-002: `git grep` for the switch's names in live server and web code | `cff2a6596a` | Only the retired-key drop list in `agent-definition-config.ts` (comment and filter); none in generated GraphQL | `IMP-12-ac002-grep.log` |
| IMP-13 | Rendered UI probe (`pnpm -C autobyteus-web test:e2e:semantic-memory-view`): real server + Nuxt + Chromium on test-owned data | `cff2a6596a` | 33/33 checks pass, no page errors | `IMP-13-rendered-probe.log`, `IMP-13-screenshots/` |
| IMP-14 | CR-001: `SemanticMemoryFolder.spec.ts`, then the same spec against the reviewed component (negative control) | `cd26f4d913` | 7/7 pass. With the `cff2a6596a` component, both new CR-001 specs fail (the leaked `semantic_ws_` entries) | `IMP-14-cr001-component-spec-and-negative-control.log` |
| IMP-15 | CR-001 impact: `components/memory`, `components/fileExplorer`, the memory page and store specs; web typecheck | `cd26f4d913` | 31 files, 181 tests passed; typecheck PASS at baseline (87 in 37 test files) | `IMP-15-cr001-web-impact-and-typecheck.log` |
| IMP-16 | CR-001: rendered probe rerun | `cd26f4d913` | 33/33 checks pass, no page errors | `IMP-16-cr001-rendered-probe.log` |

The IMP-01 failures, one by one:
- Prompt snapshots (20): the new Global section. The diffs were additions only; snapshots updated.
- Codex bootstrapper: its test made `/nonexistent-memory` (now a temp `DEFAULT_MEMORY_DIR`), and an "mcp_servers only" assertion now sees `sandbox_workspace_write`. Both fixed in the test.
- Architecture pin (`getInstance` callers): `memory-group-members.ts` added (2 entries).
- Standalone lifecycle: its module mock lacked the catalog binding exports; added.
- Org explorer: `memberCount` missing, and the test reached the process's definitions; it now injects none.
- `agent-package-folder-watcher`: a timing flake under load, with different cases failing on each run (IMP-02). Not caused by this change.

Unit tests had written semantic folders into `<server>/memory` through process defaults (Claude, AGY, AutoByteus factory). Those tests now inject a test-owned `AgentSemanticMemory`, and the stray folders are deleted.

AC-012 (IMP-09). The clone holds 3,825 runs of 122 definitions.

| Step | Node 22.23.1 | Electron Node 24.19.0 |
| --- | --- | --- |
| Catalog start pass (1 discovery) | 22.3 s | 22.4 s |
| Agents cards (123), round 1 / 2 | 144 / 40 ms | 253 / 204 ms |
| Busiest agent's episodes (527), page 1 | 10 / 4 ms | 18 / 20 ms |
| Episodes filtered "memory" (4) | 3 / 4 ms | 6 / 8 ms |
| Unattributed (200; standalone scan) | 125 / 69 ms | 45 / 132 ms |
| Discoveries by the explorer | 0 | 0 |
| Imported `docker-node-1` (474 runs): cards (13) / episodes (31) | 784 / 852 ms | 438 / 203 ms |
| Imported: team / org cards | 0 / 0 (2 / 0 ms) | 0 / 0 |

Each imported request ran exactly one discovery. All steps are within the 3 s budget.

## Frontend Rendered-Result Check (When Applicable)

- Tool: `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` (package script `test:e2e:semantic-memory-view`). It starts the built server and the Nuxt dev frontend on temp data and seeds the following, then drives Chromium through Playwright at 1440×900 and 390×844, in en and zh-CN:
  - a shared agent with two runs and a semantic folder (files, a nested folder, a file link and a folder link to outside targets);
  - a team with a team-local and a shared member;
  - the global folder.
- Result: 33/33 checks pass, with no page errors (IMP-13). The node-side checks run in the same session:
  - no semantic workspace is listed (SMV-040);
  - a write is refused (SMV-041);
  - the content route serves a regular file (SMV-042) and refuses a path through a link (SMV-043);
  - the folders and the link target are byte-identical after the session (SMV-080);
  - viewing a missing folder creates nothing (SMV-064).
- Compared against the reference (`personal@437bad9a`) screenshots:
  - VIS-001 Agents cards: no run count and no filter.
  - VIS-003 and VIS-016: Global, en and zh-CN.
  - VIS-004: the agent page's Episodic view, with "Also works in Product Review Team", two episodes and the filter.
  - VIS-005: the Semantic view, showing the path, the read-only tree, the "Link · not opened" rows and the preview-only tab.
  - VIS-007: the missing folder state, for a team-local member reached from its team (back to the team).
  - VIS-008 and VIS-009: team cards and Members (team-local and shared, with the "Shared agent" chip).
  - VIS-018: narrow, with short tab labels.
- One difference fixed: link rows sorted above the folders, but the reference lists them with the files. Fixed in `cff2a6596a` (`compareNodes`), with a unit test and probe check SMV-039.
- Not compared pixel by pixel. The checks are structural and textual, plus a visual review of the 9 screenshots.

## Downstream Coverage Hints / Suggested Scenarios

- Live (paid, gated): `agent-semantic-memory-live.e2e.test.ts` SML-GLOBAL. One agent writes a note into the global folder in one run; a different agent reads it in its next run. It runs for both a Claude and a Codex runtime (the two-roots access). Use the test vault only.
- A link created while the folder view is open (Known Risks): the row appears as a file until the folder is read again, and opening it is refused.
- Restart, then open an agent page at once: the loading state lasts until the start pass ends (N-9). Then a new run appears among the episodes within about 5 s of its first journal write.
- Imported source with teams: cards and Members, and why the founder's imported source shows 0 team cards (Known Risks).
- Runs refused as a workspace: no provisioning path passes a semantic workspace ID today (runs provision by root path), so `WORKSPACE_NOT_RUNNABLE` is covered by unit tests per runtime (AutoByteus factory, Claude/Codex resolvers, published artifacts). A GraphQL attempt to start a run with `workspaceId: "semantic_ws_…"` would show it at the boundary, if the API allows naming a workspace ID.
- Old addresses `view=agent-detail|team-detail|org-detail` open Browse on Agents.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The live SML-GLOBAL run (gated, paid). It was not run here.
- `pnpm -C autobyteus-server-ts test:integration` and the full server e2e suite. Here only the e2e files this change touches ran (IMP-05…08).
- A full server unit run on a quieter host, to clear the `agent-package-folder-watcher` timing failures (IMP-02).
- The imported team and org cards being 0 (Known Risks), checked against the base build.
- The Electron app build was not run. The UI was checked in Chromium against the Nuxt dev server (IMP-13).
