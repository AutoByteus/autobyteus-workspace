# Implementation Handoff — agent-tool-results-omit-empty (autobyteus-260)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High) and passed: ARCH-REV-001 (SR-007), ARCH-REV-002 (SR-008), ARCH-REV-003 (SR-010), ARCH-REV-004 (SR-012). Next: `get_handoff_rules` (Large / High → code review).
- Requirements doc: `requirements-doc.md` (approved; SR-010)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001–SR-012)
- Design spec: `design-spec.md` (SR-012: Migration Plan, titles after `projects-per-folder-v1` only; SR-010 "`get_project_task` (SR-010 addition)")
- Supplemental task artifacts: `evidence/SD-*` (before sizes, first-line lengths, Task shapes, Codex probe)
- Design review report: `design-review-report.md` (rounds 1–4, AR-001–AR-008; ARCH-REV-004 on SR-012)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: `code-review-report.md` round 2 (CRR-002, failure origin of API/E2E round 1, API-REV-001): CR-001 (Design Impact, fixed by SR-012) and CR-002 (Local Fix), one round
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty`, branch `codex/agent-tool-results-omit-empty`, base `origin/personal@fc06a7355d`; finalization target `origin/personal`.
- Second repository (REQ-012): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty-agents`, branch `codex/agent-tool-results-omit-empty`, base `origin/main@d8cf242`, commit `82b7bae`.

## Current Implementation Summary

- Implementation cycle: `Rework` (round 3)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (IR-002 for CR-001/CR-002; baseline IR-001)
- Related solution revision IDs: SR-007, SR-008, SR-010, SR-012
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-001 (`Pass`, recorded only), CRR-002 (CR-001, CR-002), CRR-003 (CR-001/CR-002 resolved; CR-003 Low Local Fix), CRR-004 (`Pass`, no open findings; recorded only, the code reviewer routed to API/E2E)
- Related API/E2E / delivery revision IDs: API-REV-001 (`Fail`: F-001 = API-03, F-002 = API-11c); DR `N/A`
- Triggering finding IDs: CR-003 (IR-003); CR-001, CR-002 (IR-002) (IR-001: AR-001–AR-008 applied as guidance; see below)
- Commits (workspace): IR-001 `010e4eb2ab` (rule in autobyteus-ts), `2d7ab606e3` (server), `24fee53dc9` (web), `17d631c704` (docs). IR-002 `dfbd2621bb` (CR-001 migration + tests), `52cbc28442` (CR-002 web store + test), `0a28ad5e13` (docs, ticket, evidence). IR-003 `56ceef568a` (CR-003 registry comment) and the ticket commit named in the handoff message. (autobyteus-agents): `82b7bae`, unchanged.

Summary:
1. **One result rule.** `autobyteus-ts/src/tools/tool-result-json.ts` (`omitEmptyToolResultFields` → `ToolResultJsonValue`, `toToolResultJson`): drops `null`/`undefined`/`""`/`[]`/`{}` at any depth (after pruning children), keeps `false`/`0`, keeps array positions, never removes the top level, compact JSON after `toJSON`. Every platform family's native tool and MCP provider calls it; `toAgentToolsMcpStructuredJsonResult(value)` builds text and `structuredContent` from one pruned value. `json-utils.ts` and the browser/delegation/media serializers are gone; pretty-printing is gone. `send_message_to` refusals have no `target_agent_run_id` (schema, LLM text, docs). Guard: `tests/architecture/agent-tool-result-boundaries.test.ts`.
2. **Task title.** Stored, required, trimmed, not blank, no limit (`projects/domain/task-text.ts`); through store reader/writer, service (create, both update paths, ack, worker view), GraphQL (`title: String!` on Task and inputs, nullable on `TaskWorkerTaskView`), change feed, search exact tier. Startup migration `project-task-titles` (`20261025_project_task_titles`, after `projects-per-folder-v1` only; SR-012) titles existing Tasks, keyed or not, from the first non-empty line (≤200, "…", surrogate-safe), classified by its own frozen validator `released-task-file-before-titles.ts`.
3. **Short lists and `get_project_task`.** `list_project_tasks` returns short entries only. `get_project_task(project_id, task_id)` returns one Task in full; a worker reads only the Task it works on (its copy's current Task through `MemberTaskCapability.ownedTaskOf` → the root's `ownerOf`), refused otherwise with `TASK_READ_OUT_OF_SCOPE`; it fails closed. A worker's first message for a saved Task names `Task: <key> in Project <projectId>` (new copy and existing copy). Context files in agent results are `{name, path}` (full Task and acks).
4. **Web.** Required Title input above the description; titles in cards (with a description preview that skips a repeated first line), rows, pickers, marker, delete confirmation, Task page, Projects panel, Workspaces tree (the worker Task store carries `title`: CR-002). `utils/projects/taskText.ts` replaces `taskSummary.ts`.
5. **Docs / skill.** `GLOSSARY.md` (Title, Summary), server and web docs; Project Task Manager skill sentences and `get_project_task` in its tool list.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three packages + one skill repo; every platform tool result contract on two routes; persisted-data migration; GraphQL and change-feed contract; a new tool with a caller scope; the member Task capability changed in four roots.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The design's escalation trigger "any file crossing 500 lines" did not fire (largest touched: `root-team-run.ts` 497 effective lines, `project-task-service.ts` 492, `standalone-agent-run-root.ts` 490, `root-task-execution-lifecycle.ts` 485).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | One rule, compact, both routes (REQ-001, REQ-002) | `autobyteus-ts/src/tools/tool-result-json.ts`; native tools in `agent-tools/{browser,task-delegation,media,agent-management,agent-team-management,agent-communication,agent-discovery,published-artifacts,project-tasks}`; MCP providers in `agent-tools/mcp/providers/*`; `mcp/agent-tools-mcp-structured-json-result.ts`; `agent-communication/services/send-message-to-tool-result-contract.ts`; four background-process tools | Done. Refusals keep `code`/`message`. MCP `outputSchema` for `send_message_to` follows the rejected variant without the field (Ajv test). Native media tools now return text (MCP already did). |
| BEH-002 | Stored Task title (REQ-003–REQ-006, REQ-009, REQ-011) | `projects/domain/{task-text,models,project-errors}.ts`, `stores/project-store.ts`, `services/{project-task-service,project-task-views,task-references}.ts`, `changes/project-change-messages.ts`, `search/project-task-search-service.ts`, `api/graphql/types/project-tasks.ts`; migration `app-data-migrations/migrations/project-task-titles/`; web types/store/draft/editor/labels | Done. AR-001: `TaskAcknowledgementView.title`, set in `updateTaskById`, emitted by the ack. |
| BEH-003 | Short list entries, `projectId` once (REQ-007) | `project-task-tool-manifest.ts` `taskShortEntry` | Done; no `task_ids` parameter (SR-010). |
| BEH-004 | Search `title`, `meaningSearch` only when not used (REQ-008) | manifest `search_project_tasks`; exact tier on title | Done. |
| BEH-005 | Context files `{name, path}` in full Task and acks (REQ-013, REQ-014) | manifest `contextFileEntry`; `ProjectTaskViews.contextFiles` gives the ack's attached files their path (AR-005) | Done; the manifest never reaches the context store. |
| BEH-006 | `get_project_task`, worker scope, first message (REQ-014–REQ-017) | contract/manifest `get_project_task`; `project-task-read-scope.ts` (`taskReadScopeOf`); `member-task-capability.ts` (`ownedTaskOf`) forwarded by `team-root-materializer.ts`, `agent-org-execution-scope-builder.ts`, `standalone-root-builder.ts`, `standalone-host-member-context-builder.ts` to the roots' `ownedTaskOf` → `RootTaskExecutionLifecycle.ownedTaskOf` → `ownerOf`; native `GetProjectTaskTool` / `createBoundGetProjectTaskTool` and the resolver branch; MCP provider scope; `task-execution-input.ts` Task line used by `buildTaskWorkText` and `buildExistingCopyTaskMessage` | Done; AR-006, AR-007, AR-008 applied (below). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. One addition to note for review: `get_project_task` added to the Project Task Manager's `agent-config.json` tool list in `autobyteus-agents` (without it the PM, whose lists no longer carry descriptions, could not read a Task in full; the Task's done-when asks for the PM package to be updated where it relied on a field).

### Architecture review guidance applied

- **AR-001** — ack `title`: `models.ts` `TaskAcknowledgementView.title`, `project-task-service.ts` `updateTaskById`, manifest `taskAcknowledgement`; tests in `project-task-service.test.ts`, tools tests.
- **AR-002** — tool texts rewritten (`project-task-tool-contract.ts` list/search/create/update/get; manifest comments), no remaining "null"/"summary" statements about results; every platform tool description checked (only input-side `[]` statements remain, e.g. `update_project` "[] unlinks all").
- **AR-003** — guard rule: (a) removed serializer names/imports; (b) `JSON.stringify(` outside a named allow-list with reasons (`browser-bridge-client.ts`, `agent-tools-mcp-routes.ts`, `agent-tools-mcp-schema-mapper.ts`, `agent-tools-mcp-result-mapper.ts`; `mcp/configured-mcp/**` excluded as third-party pass-through); (c) `structuredContent:` literal or `{ structuredContent }` shorthand outside the MCP structured helper (allow-listed: `application-agent-tool-mcp-adapter.ts`, application-defined results pass through); plus a stale-allow-list check.
- **AR-004** — `omitEmptyToolResultFields` returns `ToolResultJsonValue`; the `task_ids: []` item is obsolete (SR-010).
- **AR-005** — `ProjectTaskViews.contextFiles(projectId, taskId, files)` (shared with `projectTask`) gives the ack's attached files their `localPath`; `contextFileEntry` maps `{name: displayName, path: localPath}` for acks and the full Task.
- **AR-006** — two-open-Tasks case tested (`get-project-task-tool.test.ts`: the copy's current Task B is readable, A refused "You work on B").
- **AR-007** — one helper `taskIdentityLines` in `task-execution-input.ts`, used by `buildTaskWorkText` (when given `task`) and always by `buildExistingCopyTaskMessage`; `projectId` from `resolveAssignment`; the existing-copy header and its other-open-Tasks sentence kept.
- **AR-008** — (1) `taskReadScopeOf` never maps an error to `any`; the scope is computed inside each adapter's `try`, and `projectTaskToolError` maps `TaskDelegationError` keeping its code (`TASK_AGENT_RESOURCES_UNAVAILABLE`). (2) The resolver's bound branch for `get_project_task` sits before the generic `createTool` fallthrough; `registerProjectTaskTools` registers only the bound definition (`ensureGetProjectTaskToolRegistered`), and an instance created without a caller refuses every call. (3) Tested on both routes including damaged data.
- **Migration note (IR-001, replaced in IR-002)** — IR-001 classified with the keyed frozen `readTaskFile` and depended on keys-v1. Since SR-012 / CR-001 the migration has its own frozen validator `released-task-file-before-titles.ts`: `taskKey` optional; `taskId`/`projectId` match their folders; non-blank `description`; a released `status` (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`); non-blank `createdAt`/`updatedAt`. Every Task the keyed reader accepted is accepted, plus the unkeyed Tasks of a Project keys-v1 could not key. A blank description is not a released Task file, so `SKIPPED_NO_TITLE_LINE_WARNING` is gone; such a file is `SKIPPED_INVALID_TASK_WARNING`, and `titleFromFirstLine` throws if ever given one.

### IR-003 fix (CRR-003)

- **CR-003** — `app-data-migration-registry.ts`: the comment above `ProjectTaskTitlesAppDataMigration` said it "needs the Task keys"; it now says it needs the per-Project folders, not the Task keys (SR-012), and that keys-v1 keeps a title it finds. Comment only; no other stale statement of the dependency found in `src` or `docs` (build copies under `autobyteus-web/resources` and `electron-dist` are untracked). Rechecked: `vitest run tests/app-data-migrations/project-task-titles tests/architecture` on `56ceef568a`: 75 passed; IMP-11–IMP-14 stand (no code change).

### IR-002 fixes (CRR-002)

- **CR-001** (SR-012, ARCH-REV-004) — `ProjectTaskTitlesAppDataMigration.prerequisiteMigrationIds = ["20261005_projects_per_folder_v1"]`; still registered right after keys-v1. Classification through `readReleasedTaskFileBeforeTitles` (above); the keyed frozen `readTaskFile` import is gone from titles. The frozen layer is not pruned: keys-v1 still imports `frozen/server/projects/stores/project-store.ts`. keys-v1 unchanged: it writes `{...raw, taskKey}`, so a title written first is kept (tested). Admission unchanged: the current reader requires `taskKey` and `title`, so only the unkeyable Project stays hidden. Tests: unkeyed per-folder fixture (titled, not listed until keyed, then listed with its title); keys-v1 `FAILED` for one Project → titles `SUCCEEDED`, the other Project listed with titles, after the fix and a rerun the blocked Project listed with its title; validator cases; startup E2E scenario (`projects-startup-migration.e2e.test.ts`, keys scenario) asserts titles `SUCCEEDED` on the first start with keys `FAILED`, the blocked file equals the original plus `title`, `project_main` and `project_agents` list titled Tasks, and after removing only the conflicting `taskKey` and restarting the blocked Project lists `[["task_blocked","Task task_blocked"]]`; the pre-folder start (per-folder → keys → titles) asserts keys and titles `SUCCEEDED*` and every Task's title equals its description's first non-empty line.
- **CR-002** — `autobyteus-web/stores/taskWorkerTaskStore.ts`: the answer type has `title`; `workerTaskOf` builds a Temp task with `projectId: null, title: null` and a Project Task with its `title`; a Project-Task answer without a title is refused (an error caught by `flush`'s existing warning path; the worker shows no Task line) rather than shown with a guessed label. Tests: an agent worker with a Project Task and a team worker with a Temp task; a Project-Task answer without a title.

## Key Files Or Areas

- New: `autobyteus-ts/src/tools/tool-result-json.ts`; `autobyteus-server-ts/src/projects/domain/task-text.ts`; `src/agent-tools/project-tasks/project-task-read-scope.ts`; `src/app-data-migrations/migrations/project-task-titles/{project-task-titles-app-data-migration,title-from-first-line,released-task-file-before-titles}.ts`; `tests/architecture/agent-tool-result-boundaries.test.ts`; `autobyteus-web/utils/projects/taskText.ts`.
- Renamed: `agent-collaboration/execution/task/member-task-command-capability.ts` → `member-task-capability.ts` (`MemberTaskCapability`, `requireMemberTaskCapability`; builder inputs `taskCommands` → `taskCapability`).
- Removed: `src/agent-tools/json-utils.ts`; `toBrowserJsonString`, `toTaskDelegationJsonString`, `toMediaJsonString`; search `summaryOf`/`SUMMARY_MAX_CHARS`; service `normalizeDescription`; web `utils/projects/taskSummary.ts` (+ spec).
- Main modified: `agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest,project-task-native-tools}.ts`; MCP providers; `agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`; `agent-collaboration/execution/task/{task-execution-input,root-task-execution-lifecycle,task-execution-resource-port}.ts`; the three roots and four capability builders; `projects/**`; `api/graphql/types/project-tasks.ts`; `app-data-migration-registry.ts`; web components listed in the design.

## Important Assumptions

- ASM-001 holds: no consumer found that needs an empty field present (web activity view reads present fields; Codex parser reads `structuredContent.error`; the file-change processor prefers the media tool's `output_file_path` argument).
- A Temp task owner is recognized by its ID prefix (`ad_hoc_task_`), which every Temp task ID carries by construction.

## Known Risks

- **Ack size grows by the title** (REQ-009): measured `update_task` ack 140 → 324 B for a Task with a 202-byte derived title (IMP-09); search/list savings dominate.
- **Rollback**: an older build ignores `title` and drops it when it saves a Task; after re-upgrading, such a Task is not listed until it has a title (the migration is terminal). Release notes must say rolling back is not supported (design).
- **E2E tests not yet updated** (owned by API/E2E): they create Tasks without `title`, read full Tasks from `list_project_tasks`, or expect `target_agent_run_id: null`: `autobyteus-server-ts/tests/e2e/projects/*` (all Task-creating files), `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts`, `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`, `tests/e2e/runtime/{mcp-runtime-tool-matrix,codex-standalone-send-message-global-routing}.e2e.test.ts`; web probes `autobyteus-web/tests/e2e/{projects-feature-probe,project-manager-ux-probe,project-manager-ux-task-locator-cases,task-closure-tree-probe,delegated-copies-large-hub-probe,delegated-team-default-collapse-probe,embedding-settings-probe,team-status-live-probe}.mjs`.
- `root-team-run.ts` is at 497 effective lines (limit 500).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (contract) + Feature (title, `get_project_task`).
- Reviewed root-cause classification: Duplicated Policy Or Coordination (results); File Placement Or Responsibility Drift risk (service size).
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes` (one rule owner; `task-text.ts` split kept the service at 492).
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: guard test; file sizes above.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no read-time title fallback; no `summary` beside `title`; no null receiver kept; no `task_ids`).
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (serializers, `json-utils.ts`, `summaryOf`, `normalizeDescription`, `taskSummary.ts`).
- Dead code found elsewhere, added to `follow-ups.md`: `None` (FU-001 is stale generated code, not dead code).
- Shared structures remain tight: `Yes` (`TaskReadScope` two kinds; `TaskWorkerTask` web type is a discriminated union: Project Task with title / Temp task with `title: null`).
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (no file over 500; largest deltas: `project-task-native-tools.ts` +44, `project-task-tool-manifest.ts` +28).
- Notes: `autobyteus-web/generated/graphql.ts` changed only by the 12 title lines (FU-001 for the file's unrelated drift).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` (`design-spec.md` "Persisted Data / State Transition Decision", "Migration Plan").
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (current reader requires a non-blank `title`; no fallback).
- Migration implementation and focused checks: `ProjectTaskTitlesAppDataMigration` (`requiredOnStartup`, `STARTUP_ONLY`, prerequisite `20261005_projects_per_folder_v1` only (SR-012, CR-001), registered right after keys-v1; own frozen validator `released-task-file-before-titles.ts`, keyed or unkeyed); per-file atomic replace (frozen `writeJsonFile`), re-read check (`isDeepStrictEqual` with the planned object), dispositions `MIGRATED` / `SKIPPED_ALREADY_CURRENT` / `SKIPPED_INVALID_TASK_WARNING` / `FAILED_OPERATION`; a failed Task does not stop others; retry skips titled files. Tests on synthesized fixtures of the four released shapes, an invalid file, a titled file, a long first line with a surrogate at the cut, a partial failure and retry, idempotent second start (`tests/app-data-migrations/project-task-titles/`); keys-v1 and per-folder-v1 tests now run titles after keys before reading with the current store. IR-002: an unkeyable Project is titled and lists once keyed; startup E2E with one unkeyable Project (IMP-13).
- Deviation from the reviewed transition decision: `None` (SR-012 design followed; the IR-001 extra warning disposition is gone).

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prepare:shared` / `prebuild`; `pnpm -C autobyteus-web exec nuxt prepare`.
- Web codegen without a running server: schema emitted from `buildGraphqlSchema()` via `type-graphql`'s `emitSchemaDefinitionFile` (temporary test file, removed), `BACKEND_GRAPHQL_BASE_URL=<file> graphql-codegen`; only the title lines kept (FU-001).

## Checks Run

Implementation-scoped checks; not API/E2E sign-off. Evidence in `evidence/` (relative to the ticket folder).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `010e4eb2ab` (autobyteus-ts unchanged since) | macOS arm64, node 22 | `autobyteus-ts` incl. `tools/tool-result-json.ts`, terminal tools | REQ-001, REQ-002, AC-001 | Pass | `IMP-01-autobyteus-ts-unit.log` | `Tests  2047 passed (2047)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `17d631c704` | same | server `src` | all | Pass | `IMP-03-server-typecheck.log` | `EXIT 0` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` (unit + app-data-migrations + architecture) | `17d631c704` | same | whole server unit layer, incl. `tests/unit/agent-tools/project-tasks/get-project-task-tool.test.ts`, `tests/unit/agent-tools/tool-result-rule-families.test.ts`, `tests/architecture/agent-tool-result-boundaries.test.ts`, `tests/app-data-migrations/project-task-titles/` | REQ-001–REQ-017, AC-001–AC-007, AC-009, AC-011–AC-015 | Pass | `IMP-04-server-unit.log` | `Tests  6847 passed \| 7 skipped (6854)` |
| IMP-05 | `pnpm -C autobyteus-server-ts test:integration:prepare && test:integration` | `17d631c704` | same | in-process integration, incl. `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` (real `RootTeamRun`: `get_project_task` scope for a task agent, a task team's coordinator, a delegated agent and a non-worker on both routes; first message Task line; described work without it) | REQ-015, REQ-017, AC-013, AC-015 | Pass | `IMP-05-server-integration.log` | `Tests  428 passed \| 69 skipped (497)` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run components/projects utils/projects composables/projects components/workspace/history stores pages` | `24fee53dc9` (web unchanged since) | same | Title field, labels, taskText, store/draft, panel, Workspaces tree | REQ-004, REQ-006, REQ-009, AC-003, AC-005 | Pass | `IMP-06-web-unit.log` | `Tests  1587 passed (1587)` |
| IMP-07 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `24fee53dc9` | same | web boundaries, i18n keys | REQ-006 | Pass | `IMP-07-web-guards.log` | `Passed.` ×2, `Passed with zero unresolved findings.` |
| IMP-09 | before/after sizes on synthesized data with the user's shapes (`IMP-09-after-sizes.measure.ts`; shapes from `IMP-09-shape-parameters.py`, read-only lengths and counts) | `17d631c704` | same, test-owned temp data root | `list_project_tasks`, `get_project_task`, `update_task`, `send_message_to`, the rule on a dom_snapshot shape | REQ-010, QR-001, AC-008 (input for delivery) | Pass (QR-001 8.5%) | `IMP-09-after-sizes-output.txt`, `IMP-09-shape-parameters-output.json` | `list_project_tasks (155 open Tasks) \| 386253 \| 33002 \| -91.5%`; `QR-001 list after/before: 8.5%` |
| IMP-10 | isolated desktop instance of this worktree (`pnpm --silent isolated-app start --build`), driven with browser-automation; stopped afterwards | `17d631c704` | macOS arm64 Electron worktree build, own data root | New/Edit task Title, board cards, Task page, delete confirmation, GraphQL title refusal | REQ-004, REQ-006, AC-003, AC-005 | Pass | `IMP-10-isolated-desktop-observations.txt`, `IMP-10-*.png` | `"error":"Give the task a title."`, `"focused":"task-page-title"`; cards `"text":"Fix login","preview":"The session is lost after refresh."` |

| IMP-11 | `pnpm -C autobyteus-server-ts typecheck` | `52cbc28442` | same | server `src` incl. the titles migration and its validator | QR-002, AC-004 | Pass | `IMP-11-server-typecheck.log` | `EXIT 0` |
| IMP-12 | `pnpm -C autobyteus-server-ts exec vitest run tests/app-data-migrations tests/architecture` | `52cbc28442` | same | titles, keys-v1, per-folder-v1 migrations; frozen-layer and tool-result boundary tests | QR-002, AC-004, CR-001 | Pass | `IMP-12-server-migrations-architecture.log` | `Tests  612 passed (612)`; `project-task-titles-app-data-migration.test.ts` |
| IMP-13 | `pnpm -C autobyteus-server-ts build`, then `env -i PATH HOME=<temp> TMPDIR=<temp> pnpm exec vitest run tests/e2e/projects/projects-startup-migration.e2e.test.ts` | `52cbc28442` (dist built from the same migration source) | same, test-owned temp data roots | real server startup: pre-folder → per-folder → keys → titles; one unkeyable Project then a restart (API-03 scenario) | QR-002, AC-004, CR-001 | Pass | `IMP-13-startup-migration-e2e.log` | `Tests  6 passed (6)`; `released per-folder Projects get Task keys at startup; an unkeyable Project is preserved and hidden` |
| IMP-14 | `pnpm -C autobyteus-web test:nuxt --run stores/__tests__ composables/projects/__tests__/useTaskWorkerTasks.spec.ts components/workspace/history services/projects` | `52cbc28442` | same | `taskWorkerTaskStore` and its readers (Workspaces tree hosts, change feed) | AC-005, SCN-003, CR-002 | Pass | `IMP-14-web-worker-task-store.log` | `Tests  1269 passed (1269)`; `taskWorkerTaskStore.spec.ts (9 tests)` |

- IR-002 reruns: IMP-11–IMP-14 cover the code IR-002 changed; IMP-01, IMP-05, IMP-07, IMP-09, IMP-10 exercise unchanged code and stand. IMP-04 and IMP-06 stand except for the files rerun in IMP-12 and IMP-14.
- Not run, and why: server E2E and web browser probes (owned by API/E2E; the files that need updating are listed under Known Risks); gated live-runtime suites; the right-panel Projects tab and the Workspaces-tree Task line were checked by component tests (IMP-06), not on the instance.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: New / Edit task form (Title field, validation), Project board cards, Task page (title above description, delete confirmation), Projects panel Task view, Workspaces-tree Task line, pickers and relation rows.
- Approved references: REQ-004, REQ-006, DEC-013 (existing style: the Project name input), DEC-018 (2) and (3).
- Design system / adjacent surfaces reviewed: `ProjectEditor.vue` name input (same classes, label "(required)", error under the field, `aria-invalid`/`aria-describedby`), existing card and Task page sections.
- Surface used: isolated desktop instance of this worktree (TESTING.md), plus component tests.
- States inspected: blank title on submit (error text, focus, invalid state), error cleared on typing, successful create (notice, board order), card title + preview (with the repeated first line skipped), Task page title section, delete confirmation by title, title edit and save.
- Issues found and corrected: none on the instance; earlier, component tests showed the panel only treats keyed Tasks as Project Tasks (fixture corrected, not product code).
- IR-002 (CR-002): the fix is in the store's mapping, not in a rendered component; checked with store and Workspaces-tree component tests (IMP-14). The live Workspaces tree with a Project-Task worker (API-11c) was not rerun here; that probe is API/E2E's.
- Check IDs and limitations: IMP-10 (screenshots `IMP-10-board-titles.png`, `IMP-10-new-task-title-required.png`, `IMP-10-task-page-title-and-delete.png`), IMP-06. Not exercised on the instance: the right-panel Projects tab, the Workspaces tree with a live Task worker, narrow viewports, zh-CN.

## Downstream Coverage Hints / Suggested Scenarios

- MCP tool E2E on a test-owned server for `list_project_tasks` (short), `get_project_task` (worker scope with a real task team; damaged run data), `search_project_tasks` (`title`, no `meaningSearch` when ready), `send_message_to` refusal (no receiver), `create_task` without title.
- Startup migration on a test-owned data root with released-shape Task files (all four shapes), then GraphQL `projectTasks` returns titles; second start changes nothing.
- Delegated first message (saved Task, new copy and existing copy) contains `Task: <key> in Project <projectId>`; described work has none.
- Isolated desktop: New/Edit task Title required; board, Task page, panel and Workspaces-tree labels show titles.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Update and run the E2E files listed under Known Risks; REQ-010/AC-008 before/after table for delivery (IMP-09 gives synthesized numbers); QR-001 on the measured list (IMP-09: 8.5%).
- IR-002: rerun API-03 (startup with one unkeyable Project; IMP-13 covers the scenario in the existing startup E2E file) and API-11c (Workspaces tree with a live Project-Task worker and a Temp-task worker).
