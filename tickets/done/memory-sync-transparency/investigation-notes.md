# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Architecture review round 1 failed with Design Impact findings; requirements/UX/design revised for DR-001/DR-002/DR-003 and ready for re-review.
- Investigation Goal: Understand current memory sync source UI/API flow and identify design options to make connection test and manual/background sync transparent to users.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The UX gap touches frontend state/rendering, GraphQL API result shape, backend source-state persistence, and source token semantics for connection testing.
- Scope Summary: Improve visible transparency for Memory Sync source operations in multi-node setup, especially `Test connection` and `Sync now`.
- Primary Questions Resolved:
  - `Test connection` and `Sync now` are implemented in `autobyteus-web/components/settings/MemorySyncCard.vue` and `autobyteus-web/stores/memorySyncStore.ts`.
  - Follow-up user clarification: design should start from the user journey before architecture/code, with inline test status, visible backend job state, interval, current running state, and background schedule transparency.
  - They call GraphQL mutations defined in `autobyteus-web/graphql/mutations/memorySyncMutations.ts` and resolved by `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts`.
  - Manual sync is synchronous from the GraphQL caller's perspective: `startMemorySync` awaits `MemorySyncService.startManualSync()` / `startSync()` and returns run metrics.
  - `Job state: idle` comes from `MemorySyncSourceStateGql.jobState`, sourced from `LocalFileMemorySyncStateStore`'s `lastJobState`.
  - `Test connection` currently uses the frontend password field value, not the saved backend token; after status sync the password field is cleared and only a placeholder/redacted preview remains.

## Request Context

User reports that with multiple nodes and memory sync enabled, a Docker `8001` node is configured as a memory sync source. Clicking `Sync now` successfully synchronizes data into the hub/imported memory, but clicking `Test connection` appears to show nothing, and clicking `Sync now` also appears to show nothing at action time. The user asks for analysis and ideas to improve design transparency.

Reference screenshots provided by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3e8fcfc8ad224f35bdfb3c9390e26841/solution_designer_96a6fe0f9f7d4ee78a03431eb3c12a71/context_files/ctx_dc92ff9525a2__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3e8fcfc8ad224f35bdfb3c9390e26841/solution_designer_96a6fe0f9f7d4ee78a03431eb3c12a71/context_files/ctx_a4eff00b3d9f__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3e8fcfc8ad224f35bdfb3c9390e26841/solution_designer_96a6fe0f9f7d4ee78a03431eb3c12a71/context_files/ctx_53309ea0a978__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3e8fcfc8ad224f35bdfb3c9390e26841/solution_designer_96a6fe0f9f7d4ee78a03431eb3c12a71/context_files/ctx_6499b424a578__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3e8fcfc8ad224f35bdfb3c9390e26841/solution_designer_96a6fe0f9f7d4ee78a03431eb3c12a71/context_files/ctx_c154ccac2d1b__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency`
- Current Branch: `codex/memory-sync-transparency-design`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-06-24.
- Task Branch: `codex/memory-sync-transparency-design`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Main checkout has unrelated untracked files; authoritative work is isolated in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-24 | Command | `git status --short --branch`; `git remote show origin`; `git fetch origin personal`; `git worktree add -b codex/memory-sync-transparency-design /Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design origin/personal` | Bootstrap dedicated investigation workspace | Created isolated branch/worktree from refreshed `origin/personal` | No |
| 2026-06-24 | Other | User-provided screenshots listed in Request Context | Understand observed UX gap | Remote node ready; source settings configured; `Job state: idle`; imported source later shows `90 files · 58.5 MB · 24.6.2026, 05:36:13`; Memory page shows imported read-only source | No |
| 2026-06-24 | Command | `rg -n "memory sync|Memory Sync|memory-sync|sync now|Test connection|Job state|source credentials|imported sources|MemorySync|memorySync|syncSource|testConnection" -S .` | Locate relevant source files | Found frontend store/component/GraphQL files and backend memory-sync GraphQL/source services | No |
| 2026-06-24 | Code | `autobyteus-web/components/settings/MemorySyncCard.vue` | Inspect current UI rendering and action handlers | Renders global `store.error/info` near top, Source actions in lower panel, button handlers call store methods; Source status is simple paragraphs below buttons | Yes: redesign inline source status panel |
| 2026-06-24 | Code | `autobyteus-web/stores/memorySyncStore.ts` | Inspect frontend action state | `testConnection` has no `testing` flag and sets generic `info/error`; `syncNow` has transient `syncing` and local-only `lastSyncResult`; `applyStatus` does not persist operation result beyond status | Yes: define action-scoped operation state |
| 2026-06-24 | Code | `autobyteus-web/graphql/mutations/memorySyncMutations.ts`; `autobyteus-web/graphql/queries/memorySyncQueries.ts` | Inspect API fields available to frontend | Test result has `ok`, `hubEnabled`, `sourceNodeId`, `authenticated`, `message`; sync result has run metrics; source state has only `jobState`, `lastSuccessfulSyncAt`, `lastError`, `trackedFileCount` | Yes: extend status/result shape |
| 2026-06-24 | Code | `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts`; `memory-sync-schema.ts` | Inspect backend GraphQL resolvers/schema | `testMemoryHubConnection(input)` delegates to `MemoryHubClient().testConnection(input)`; `startMemorySync` awaits `MemorySyncService.startManualSync()` | Yes: introduce source operation status owner or service method for saved-token test |
| 2026-06-24 | Code | `autobyteus-server-ts/src/memory-sync/source/memory-sync-service.ts` | Inspect manual/background sync behavior | Single `running` promise coalesces concurrent syncs; writes `running`, `success`, `error` into state; returns run metrics but only mutation caller receives them | Yes: persist last run metrics/trigger in state |
| 2026-06-24 | Code | `autobyteus-server-ts/src/memory-sync/source/local-file-memory-sync-state-store.ts`; `shared/memory-sync-types.ts` | Inspect persisted source state | Source state persists last success/error/job state and file map only; no last action/test/run summary | Yes: extend state schema normalization |
| 2026-06-24 | Code | `autobyteus-server-ts/src/memory-sync/source/memory-hub-client.ts` | Inspect connection test behavior | Test sends provided `input.token` as Authorization; no fallback to saved source token | Yes: fix saved-token fallback semantics |
| 2026-06-24 | Doc | `autobyteus-web/docs/memory.md`; `autobyteus-server-ts/docker/README.md` | Check documented user expectations | Docs tell users to use Test connection; tokens are shown once and later redacted; Docker setups require reachable hub URL | Yes: after implementation, docs likely need update for result/status behavior |
| 2026-06-24 | Other | User follow-up screenshot `ctx_5e5fe8aadcd4__image.png` and clarification | Validate background job visibility problem | UI now shows `Job state: success` and `Last success: 24.6.2026, 06:00:16`, confirming background/manual sync state can surface after completion but still lacks inline test status, interval/next-run clarity, and active job transparency | Include UX-first journey artifact |
| 2026-06-24 | Other | User follow-up approval after narrowed scope | Confirm requirements basis | User confirmed the requirement is clear and asked to kick off the ticket; final scope is minimal: no duplicate background enabled/interval display, no manual/background wording, only current job idle/syncing, last sync result/timestamp, test-connection inline feedback, and Sync now spinner/Syncing state | Proceed to design spec |
| 2026-06-24 | Doc | `tickets/done/memory-sync-transparency/design-review-report.md` | Review architecture findings from round 1 | Fail / Design Impact: polling would clobber form state through deep watcher; last sync error precedence ambiguous; saved-token fallback identity ambiguous | Rework design spec and requirements |
| 2026-06-24 | Other | User clarification after design review | Confirm simplified backend-store/polling approach | User agreed backend already has a job-status store and preferred low-frequency frontend polling (not high-traffic) with job writing status directly; asked to share design before review, then asked to continue | Incorporated into design spec |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Nodes → Memory Sync tab in Autobyteus web UI.
- Current execution flow:
  1. Component loads `getMemorySyncStatus` into `memorySyncStore.status`.
  2. `syncForms()` copies source config into local form fields but clears `sourceForm.hubToken = ''` while showing `hubTokenPreview` as the password input placeholder.
  3. `Test connection` calls `store.testConnection({ hubBaseUrl: sourceForm.hubBaseUrl, token: sourceForm.hubToken, sourceNodeId: sourceForm.sourceNodeId })`.
  4. Backend `testMemoryHubConnection` uses exactly that supplied token in the Authorization header.
  5. `Sync now` calls `startMemorySync`; backend reads saved source config including saved `hubToken`, runs scan/planning/push, persists coarse source state, and returns metrics to the mutation caller.
  6. Frontend stores sync metrics in transient `lastSyncResult` and reloads status after completion.
- Ownership or boundary observations:
  - The backend `MemorySyncService` owns actual sync execution and coarse job state.
  - There is no explicit owner for user-visible source operation status/history. Some status is in backend source state, some in frontend transient fields, and some result data is discarded or disconnected from UI.
  - The frontend card has generic page-level feedback instead of source-action-scoped feedback.
- Current behavior summary: Backend/data behavior can succeed, but operation status/result is not a first-class part of the Source panel's visible UX. Test connection is especially confusing because saved token redaction means the visible password field is not the actual saved token used by sync.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor posture evidence summary: A frontend-only patch could move messages inline and add a testing flag, but durable transparency requires backend ownership of source operation status and saved-token test semantics.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MemorySyncCard.vue` | Source actions are lower in the card; `store.error/info` appears near top of component | User can miss action feedback when focused on Source panel | Add inline action-specific status |
| `memorySyncStore.ts` | `testConnection` has no in-flight state and generic result storage | Test action lacks UX invariant for visible start/result | Add `testingConnection` and result model |
| `MemorySyncCard.vue` + `MemoryHubClient` | Saved token is cleared in form; test sends empty field value; sync uses saved backend token | Test and sync operate on different credential sources; explains user confusion | Backend/API should test saved config by default |
| `MemorySyncService` + source state store | Run metrics returned only to active mutation caller; persisted status is coarse | Manual/background sync results are not durable or consistently visible | Persist last operation summary |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Nodes → Memory Sync UI card | Renders hub config, source config, action buttons, simple `Job state`/last success/last error/last run paragraphs | Should own presentation only; needs source-local status section next to actions |
| `autobyteus-web/stores/memorySyncStore.ts` | Frontend state/actions for Memory Sync UI | Holds generic `error/info`, `syncing`, transient `lastSyncResult`; no `testingConnection`; no typed operation status model | Should own UI action state projection, not durable sync truth |
| `autobyteus-web/graphql/mutations/memorySyncMutations.ts` | GraphQL mutation documents | Test/sync result fields already exist but source status query lacks durable operation summaries | Query/mutation fragments need richer status fields |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | GraphQL resolver boundary | Delegates test directly to `MemoryHubClient`; start sync directly maps run result | Resolver should depend on a source operation/status owner for saved-token semantics and persistence |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts` | GraphQL Memory Sync schema | Source state shape is too coarse for transparency | Add operation status/result types or extend source state |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-service.ts` | Source sync execution owner | Coalesces concurrent sync; persists running/success/error only; returns detailed result | Extend to record last run result/trigger safely |
| `autobyteus-server-ts/src/memory-sync/source/local-file-memory-sync-state-store.ts` | Source sync state persistence | Normalizes schemaVersion 1 with coarse fields | Add schema-normalized fields for last connection test/last sync run/recent events |
| `autobyteus-server-ts/src/memory-sync/source/memory-hub-client.ts` | Low-level hub HTTP client | Requires explicit token for test/push | Keep as adapter; do not make it resolve saved config |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-config-service.ts` | Source/hub config persistence | Stores plaintext source token locally for background sync | Should be used by higher-level test operation when frontend token blank |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-24 | Static Trace | Manual code trace through `MemorySyncCard.vue` → `memorySyncStore.ts` → GraphQL resolver → `MemorySyncService`/`MemoryHubClient` | Static path explains reported mismatch: sync uses saved backend token; test uses cleared frontend token field | Design should align source config testing with saved config and inline result visibility |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal application design issue.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not required for initial design analysis; user provided observed runtime screenshots and static trace explains the likely root cause.
- Required config, feature flags, env vars, or accounts: For downstream E2E, use two isolated backend nodes or existing Docker node/hub setup.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Feedback exists but is poorly placed and too generic.** `MemorySyncCard.vue` shows `store.error`/`store.info` at the top, not inline with Source actions. If the user is scrolled to the Source section, they may not see it.
2. **Connection testing has no visible pending state.** The test button never changes to `Testing…`, and the returned structured result is collapsed to one generic string.
3. **Saved token is not used by test connection.** After source settings are loaded/saved, the password field is cleared. The redacted placeholder indicates a saved token exists, but `testConnection` sends the cleared form value. The backend adapter uses that supplied token directly.
4. **Sync has transient feedback only.** `Sync now` sets a local `syncing` flag while the mutation is pending and stores `lastSyncResult` in memory only; there is no durable last-run summary in source state.
5. **Background sync is almost invisible.** Worker logs success/failure to console, and source state gets success/error/timestamp, but no run metrics or trigger details are exposed.
6. **Existing API has useful data.** Manual sync already returns scanned/changed/unchanged/deferred file counts and committed/duplicate batch counts. Hub import summaries already include files, bytes, and imported timestamps.
7. **Backend background worker exists.** `MemorySyncWorker` schedules interval-based source sync when source sync and background sync are enabled. It waits `intervalMs`, calls `MemorySyncService.startSync()`, logs completion/failure, then reloads and schedules the next interval. Final user-approved UI scope does not require duplicating interval/next-run state; it only needs generic current running visibility if a job is active.
8. **Architecture review found polling/form-hydration risk.** Current deep `store.status` watcher plus `syncForms()` would reset edited Source fields and clear the draft token on every poll. Revised design removes watcher-driven hydration and hydrates only on initial load / successful save / explicit reset.
9. **Architecture review found last-sync precedence risk.** Because failures preserve older `lastSuccessfulSyncAt`, UI must show latest error when `jobState === "error" && lastError`, before considering old success timestamp.
10. **Architecture review found saved-token identity risk.** Revised design uses explicit saved-settings test mode for blank token and full draft test mode when draft token is present; it rejects silent draft URL/source id + saved token mixing.

## Constraints / Dependencies / Compatibility Facts

- Must support embedded/local node and Docker/remote node modes.
- Must not display hub token or secrets.
- Must retain successful existing memory sync behavior.
- Hub tokens are intentionally shown only once; UI must not depend on plaintext token visibility after save.
- Memory Sync source state uses app-data JSON and can be schema-normalized for additive fields.

## Open Unknowns / Risks

- Whether to support a mixed draft test case: unsaved hub URL with saved token but no draft token.
- Whether to persist a single last result per operation type or a short rolling event log.
- How to recover/display stale `running` if the process dies after writing running state and before writing success/error.
- Whether next scheduled background run should be authoritative backend state or derived frontend state from interval plus last completion time.
- Whether operation result details should include remote hub-import summary or only source-side run metrics in the first iteration.

## Notes For Architect Reviewer

Ready for architecture re-review after round 1 Design Impact rework. Revised package addresses:

- DR-001: form hydration split from status polling. Polling is low-frequency (`30s`), status-only, bounded to mounted/visible card, and must not call `syncForms()` or clear draft token.
- DR-002: `Last sync` precedence rule now explicitly shows latest error over stale prior success timestamp.
- DR-003: blank-token connection test now uses fully persisted saved source config; draft URL/source id are tested only when a draft token is supplied.

Design spec path: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/design-spec.md`.

## UX Journey Artifact

- Canonical UX-first story written at `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/ui-prototypes/memory-sync-transparency/experience-story.md`.
- This artifact intentionally defines user-visible behavior before architecture/code changes.
