# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Draft investigation started
- Investigation Goal: Determine why other Autobyteus workspaces disappeared from the frontend workspace tree by inspecting persisted workspace state and the workspace-loading code path.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-Medium
- Scope Classification Rationale: Likely localized to workspace metadata or workspace tree loading, but may cross persisted state, backend APIs, and frontend filtering/rendering.
- Scope Summary: Read-only inspection of `/Users/normy/.autobyteus/server-data` plus code path tracing in the Autobyteus workspace repository.
- Primary Questions To Resolve: Which JSON/state file is authoritative? Do the missing workspace entries still exist? Are they filtered by schema/path/type/migration logic? Is frontend rendering using the correct API response?

## Request Context

User reports that suddenly all other workspaces are gone/not visible in the frontend. Screenshot shows only one visible workspace root, `autobyteus-workspace-sup...`, plus `Temp Workspace`, while the user expects additional workspaces. User specifically asked to inspect workspace JSON under `/Users/normy/.autobyteus`, probably in `server-data`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/tickets/in-progress/missing-workspaces-analysis
- Current Branch: codex/missing-workspaces-analysis
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin personal --prune` completed successfully on 2026-07-05.
- Task Branch: codex/missing-workspaces-analysis
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Main user state under `/Users/normy/.autobyteus` must be treated as user data; do not destructively edit without explicit approval.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-05 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git symbolic-ref --short refs/remotes/origin/HEAD` | Bootstrap repo context | Original cwd was /Users/normy/autobyteus_org/autobyteus-workspace-superrepo on branch personal tracking origin/personal. | No |
| 2026-07-05 | Command | `git fetch origin personal --prune` | Refresh tracked base before task branch/worktree | Fetch succeeded. | No |
| 2026-07-05 | Setup | Created branch/worktree `codex/missing-workspaces-analysis` at /Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis from `origin/personal` | Dedicated ticket isolation | Worktree ready and clean. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Frontend workspace sidebar screenshot.
- Current execution flow: Pending code tracing.
- Ownership or boundary observations: Pending.
- Current behavior summary: Frontend displays fewer workspaces than expected; root cause unknown.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Investigation
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Unclear
- Refactor posture evidence summary: Pending data/code evidence.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Sidebar shows one workspace root plus Temp Workspace; expected other workspaces missing. | Could be persisted data loss, backend filtering, or frontend state/render issue. | Inspect persisted state and code. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| /Users/normy/.autobyteus/server-data | Persisted local server data | Pending inspection. | Must identify authoritative workspace owner. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

No external sources used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending; may not need running server.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree created; no app state modified.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

Pending.

## Constraints / Dependencies / Compatibility Facts

- Avoid destructive edits under `/Users/normy/.autobyteus`.
- Frontend may depend on a running server instance whose process environment differs from shell.

## Open Unknowns / Risks

- Authoritative workspace data file path unknown.
- Whether missing workspaces exist on disk but not in workspace metadata unknown.
- Whether a recent migration changed workspace schema unknown.

## Notes For Architect Reviewer

Investigation not yet design-ready.

## Investigation Update — 2026-07-05

### Persisted Workspace Registry Findings

- Inspected `/Users/normy/.autobyteus/server-data/workspaces.json`.
- File metadata: modified `2026-07-05 20:19:52` Europe/Berlin, size 278 bytes.
- JSON shape is `Record<workspaceId, workspaceRootPath>`.
- Current contents contain only two filesystem workspace roots:
  - `agent_ws_2168e8191679724a362414b52618be3b82b0ef7fcfacc379b39c269325a4480c` → `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
  - `agent_ws_7469afd0ad3e4800e6b203f34c6f12d2230e0aa6f7646e1c620b9fe3262f4a20` → `/Users/normy/.autobyteus/server-data/temp_workspace`
- GraphQL probe against the running server returned those two filesystem entries plus fixed transient `temp_ws_default`.

### Server Log Findings

- `/Users/normy/.autobyteus/server-data/logs/server.log` shows the server restarted at `2026-07-05T18:06:00Z` and loaded many workspace registry roots, including:
  - `/Users/normy/autobyteus_org/autobyteus_company_operation`
  - `/Users/normy/autobyteus_org/autobyteus_mcps`
  - `/Users/normy/autobyteus_org/autobyteus_private_mcps`
  - `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace`
  - `/Users/normy/autobyteus_org/autobyteus-agents`
  - `/Users/normy/autobyteus_org/autobyteus-com-workspace`
  - `/Users/normy/autobyteus_org/autobyteus-manga-videos`
  - `/Users/normy/autobyteus_org/autobyteus-marketing-workspace`
  - `/Users/normy/autobyteus_org/autobyteus-private-agents`
  - `/Users/normy/autobyteus_org/autobyteus-social-media`
  - `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
  - `/Users/normy/church`
  - `/Users/normy/church/2026-05-25-roma-fuqi-church`
  - `/Users/normy/church/bible_children_manga_book`
  - `/Users/normy/normy_job_search`
  - `/Users/normy/normy_projects/german_online_practice`
  - `/Users/normy/reonic_hackerthon`
  - `/Users/normy/reonic_hackerthon/enpal-smart-energy-companion`
- The same log shows rapid server restarts around `2026-07-05T18:16:31Z`, `18:17:21Z`, `18:17:35Z`, and `18:18:18Z`.
- Around the final restart/run creation, only the superrepo and temp roots are created/registered, matching the final truncated `workspaces.json`.

### Code Path Findings

- Backend visible workspace source:
  - `autobyteus-server-ts/src/api/graphql/types/workspace.ts`: `workspaces()` calls `workspaceManager.getOrCreateTempWorkspace()` then `workspaceManager.listVisibleWorkspaces()`.
  - `autobyteus-server-ts/src/workspaces/workspace-manager.ts`: `listVisibleWorkspaces()` returns registered filesystem workspaces from `WorkspaceRegistryStore.listEntries()` plus transient active workspaces.
  - `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts`: registry file is `path.join(appConfigProvider.config.getAppDataDir(), "workspaces.json")`.
- Frontend row source:
  - `autobyteus-web/stores/workspace.ts`: `fetchAllWorkspaces()` queries `GetAllWorkspaces` network-only and stores returned metadata.
  - `autobyteus-web/stores/runHistoryReadModel.ts` and `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts`: top-level rows are intentionally built from registered workspace descriptors, not all historical workspace roots.
- Installed app code confirms the same race exists at `/Applications/AutoByteus.app/Contents/Resources/server/dist/workspaces/workspace-registry-store.js`.

### Root Cause Assessment

- The root cause is very likely a registry load/persist race in `WorkspaceRegistryStore.ensureRegistryLoaded()`.
- The implementation sets `this.loaded = true` before `await fs.readFile(...)` finishes. If another call enters while the first load is in progress, it sees `loaded === true`, skips reading the file, and proceeds with an empty or partial `entries` map.
- If that second call is `upsertEntry(...)`, it writes the entire registry file from the partial map. This can overwrite a many-entry `workspaces.json` with only the workspace(s) touched during startup/run creation.
- This exactly matches observed evidence: many roots visible in log at 20:06 Berlin, rapid restarts/concurrent workspace creation, then `workspaces.json` modified at 20:19:52 Berlin with only superrepo and temp entries.

### Recovery Candidate Artifact

- Generated read-only artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/tickets/in-progress/missing-workspaces-analysis/workspace-registry-recovery-candidates.json`.
- It includes:
  - current registry contents;
  - old registry-like paths observed in server logs at `2026-07-05T18:06Z`;
  - history-derived roots from `memory/run_history_index.json` and `memory/team_run_history_index.json`.
- No changes were applied to `/Users/normy/.autobyteus/server-data/workspaces.json` during this investigation.

### Additional Source Log Entries

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-05 | Data | `/Users/normy/.autobyteus/server-data/workspaces.json` | Inspect authoritative registry | Contains only superrepo and temp filesystem roots. | Restore if user approves. |
| 2026-07-05 | Trace | `curl -sS -X POST http://127.0.0.1:29695/graphql ... workspaces ...` | Verify backend response used by frontend | API returns two filesystem roots plus `temp_ws_default`. | No |
| 2026-07-05 | Log | `rg -n -i "workspace|workspaces|worktree" ~/.autobyteus/server-data/logs/server.log` | Compare previous/current workspace loading | Earlier startup loaded many roots; later state has only current roots. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | Inspect registry load/persist owner | `loaded` is set before async read completes; no shared load promise or write serialization. | Implement fix if approved. |
| 2026-07-05 | Code | `/Applications/AutoByteus.app/Contents/Resources/server/dist/workspaces/workspace-registry-store.js` | Confirm installed app has same code path | Installed packaged server has same race. | Release/update fix if approved. |
| 2026-07-05 | Code | `autobyteus-web/stores/runHistoryReadModel.ts`, `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` | Verify frontend visibility authority | Frontend intentionally uses registered workspace descriptors as top-level source. | No |
| 2026-07-05 | Command | `ps aux ...; lsof -nP -iTCP:29695 -sTCP:LISTEN` | Check current running server process | One installed app server process listens on 29695 with data dir `/Users/normy/.autobyteus/server-data`. | No |

## Restoration Action — 2026-07-05

- Backed up current registry before modification:
  - `/Users/normy/.autobyteus/server-data/workspaces.json.backup-before-restore-20260705-204255`
- Restored workspace roots by calling the running backend GraphQL `createWorkspace` mutation sequentially for the 20 log-derived roots in `workspace-registry-recovery-candidates.json`, instead of directly editing the file, so backend in-memory state and persisted registry stayed aligned.
- Verification:
  - `/Users/normy/.autobyteus/server-data/workspaces.json` now has 20 filesystem entries and is 2621 bytes, modified `2026-07-05 20:43:15` Europe/Berlin.
  - Backend `workspaces` query returns 21 rows: 20 filesystem registry rows plus the fixed transient `temp_ws_default` row.
- Note: the durable registry race bug is not fixed yet; a future restart could still risk truncation until the code is patched.

## Design Kickoff Evidence Update — 2026-07-06

- User explicitly requested design kickoff after restoration and asked to apply the design principles carefully.
- Re-read design principles and design examples from the solution-designer skill before producing the design.
- Re-read current source files:
  - `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts`
  - `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
  - `autobyteus-server-ts/src/workspaces/temp-workspace.ts`
  - `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
  - selected callers of `WorkspaceManager.ensureWorkspaceByRootPath(...)` in agent and team run services.
- Re-read existing workspace GraphQL E2E tests in `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`.
- Current-state design evidence:
  - `WorkspaceRegistryStore.ensureRegistryLoaded()` sets `loaded = true` before `fs.readFile(...)` completes; this is the missing invariant behind the suspected truncation race.
  - `WorkspaceRegistryStore.upsertEntry(...)` and `deleteEntry(...)` mutate the shared `entries` map and immediately persist a whole-file snapshot without a mutation queue or atomic write boundary.
  - `WorkspaceManager.ensureWorkspaceByRootPath(...)` delegates every root to `createWorkspace(...)`, which registers a filesystem entry; this includes the configured temp workspace root when callers carry temp-root paths from metadata/history, producing a duplicate filesystem temp row alongside `temp_ws_default`.
  - `WorkspaceResolver.workspaces()` and frontend `workspaceStore.fetchAllWorkspaces()` already preserve the desired authority boundary: top-level visible workspaces come from the registry-backed `workspaces()` query, not from historical run roots.
- Design conclusion:
  - The correct owner to strengthen is `WorkspaceRegistryStore` for persistence invariants and `WorkspaceManager` for temp-root identity routing.
  - Frontend redesign is not needed.

## Design Simplification Update — 2026-07-06

User challenged the value of persistent `.bak` files because such files are rarely used in practice without an automated recovery flow. Design updated accordingly: remove last-good backup/rotating backup from core requirements. Keep atomic same-directory temp-file replacement only, plus serialized registry load/mutation and shrink protection. Existing manual backup from the emergency restore remains historical evidence, not a new steady-state write-path artifact.

## Design Review Rework — 2026-07-06

Architecture review AR-001 found stale contradictory text in `design-spec.md` under Key Tradeoffs: `Backup on each write`. Updated the tradeoff to `Atomic temp-file replacement without persistent backups`, explicitly stating no `.bak` files because there is no automated recovery consumer and they would become clutter. No architecture changes beyond consistency cleanup.
