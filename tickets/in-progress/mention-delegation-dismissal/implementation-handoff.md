# Implementation Handoff — mention-delegation-dismissal

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/`.

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large / High). ARCH-REV-002 `Pass` on SR-005. The reviewer delivered the package to `/implementation_engineer`.
- Requirements doc: `requirements-doc.md` (SR-003, Approved 2026-10-06)
- Investigation notes: `investigation-notes.md` (E-01..E-36)
- Solution revision record: `solution-revision-record.md` (SR-001..SR-005)
- Design spec: `design-spec.md` (SR-005)
- Supplemental task artifacts: None. Product design: `N/A — not applicable`
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Architecture handoff: `handoff-architecture-design-complete.md`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003` (requirements), `SR-005` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What the code does now:

1. **`@` resolves and adds nothing.** The three roots replace `admitCollaboratorMentions` with `resolveCollaboratorMentions`. That calls the root's `*Collaborators.resolveMentions`, then `CollaboratorAdmission.resolveMentions(port, mentions)`. Each mention is re-validated with the shared candidate policy and answered with its name, kind and address (the in-run entry's address, else the catalog address). No tree write, allocation, hosting or `collaborator_added` happens. Both `@` entries switched: the three stream handlers, and the standalone host path `AgentRunCommandCoordinator.post → StandaloneAgentRunRoot.postUserMessage → StandaloneRootMessageDelivery.postToHost` (renamed `resolveMentions`). The note now says to use `delegate_task` and, if a `task_id` comes back, to mark it DONE. The two earlier guidance lines still parse.
2. **Described delegation by an unowned sender creates an ad-hoc Task.** In `RootTaskExecutionLifecycle.delegate()` the unowned described branch joins `{role: "assigned", assignedBy, adHocTask: {description, referenceFiles}}`. `dispatchTaskCopy` links it in the existing link-before-resources step. `ProjectTaskService.linkAgentRun` writes `<appData>/ad-hoc-tasks/<taskId>/task.json` (text only) and links the copy in that Task's `agent_run_resources.json`. The accepted result is `{target_agent_run_id, task_id}`. Whether `task_id` is returned depends on the join variant (`adHocTask`), never on the returned `{taskId}`. Linked joins still return exactly `{target_agent_run_id}`. Task-owned senders are unchanged (`delegated`, no `task_id`). `join` and `resources` are now required in `dispatchTaskCopy`, since every copy joins a Task.
3. **Ad-hoc storage reuses the one resource authority.** `TaskLocation = {projectId: string | null, taskId}` replaces `TaskAgentResourceLocation`. `TaskAgentResourceStore` resolves both roots, and `list()` also enumerates `ad-hoc-tasks/`. The single `TaskAgentResourceService` view gains `adHocTaskIdsHostedBy` and `forget`. New `AdHocTask`, `AdHocTasksLayout` and `AdHocTaskStore` sit beside their Project counterparts. The composition builds one `AdHocTasksLayout` and shares it between the resource store and the ad-hoc store.
4. **`create_or_update_task` has two strict modes.** Create is `{project_id, description}`. Update is `{task_id, status?, description?}`, and `project_id` is rejected as `PROJECT_TOOL_ARGUMENT_INVALID`. Update goes to the new `ProjectTaskService.updateTaskById`: a direct ad-hoc path read first (no scan, no gate), then the gated Projects lookup through the unchanged `updateTask`. DONE for both Task kinds runs one shared `closeAndWrite` (close entries → write status → release). The ack is `{projectId: string | null, taskId, status}`. The UI's `updateTask({projectId, taskId, ...})` is unchanged.
5. **Automatic exposure.** `automaticCollaborationToolNames` adds `create_or_update_task` wherever `delegate_task` is: every member context, Team-scoped or not. AutoByteus reads it through `requestedToolNames`; Claude and Codex read it through `enabledProjectTaskToolNames`.
6. **Retention.** After a successful permanent delete, `AgentRunHistoryCatalogService.deleteRun`, `TeamRunHistoryService.deleteStoredTeamRun` and `AgentOrgRunService.deleteStoredRun` call `ProjectTaskService.deleteAdHocTasksHostedBy(root)`. It works from the in-memory view, runs each Task under that Task's serialization, removes the folder, then forgets it. It logs failures and never throws.
7. **LLM contract.** The `delegate_task` description and the shared "Delegated Agents" prompt section now explain `task_id` and DONE (one shared constant for all runtimes). `DELEGATE_TASK_ID_DESCRIPTION` is unchanged.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 34 production source files were changed or added across Projects, agent-collaboration, three root families, run history, agent tools, agent execution and presentation contracts. There are two public tool-contract changes (one breaking), a new persisted root (`ad-hoc-tasks/`), a widened Task port, and a new dependency direction (delete owners → `projects/services/project-task-service`). This matches the design rationale.
- Selected route: `Code Review` (Large/High; confirmed via `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. All four triggers were checked:
  - (a) Every runtime's exposure flows from `automaticCollaborationToolNames`: AutoByteus through `requestedToolNames`, Claude/Codex through `enabledProjectTaskToolNames`. The native tool is registered by the required `project_tasks` startup unit.
  - (b) The only `@` admission callers were the E-29 set plus the standalone `postToHost` path the design names.
  - (c) All delegation goes through `delegate()`/`ensureTaskHelper()`.
  - (d) The web uses `collaborator_added` only for tree display.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | `@` adds no collaborator at send time | stream handlers and `postToHost` → root `resolveCollaboratorMentions` → `*Collaborators.resolveMentions` → `CollaboratorAdmission.resolveMentions` | Done. No write/host/publish (tests: standalone root, Team root, Org collaborators, admission unit) |
| BEH-002 / REQ-002 | Note names each mention and steers to `delegate_task` + DONE | `collaborator-mention-note.ts` (`NOTE_GUIDANCE`, `SAVED_NOTE_GUIDANCES`); dist rebuilt | Done. Old guidance lines still parse (contracts tests 10/10; web specs 127/127) |
| BEH-003 / REQ-003, REQ-004, REQ-013 | Unowned described delegation creates a text-only ad-hoc Task, linked before resources; result has `task_id`; rejected call creates no Task | `root-task-execution-lifecycle.ts` (join) → `root-task-dispatch.ts` (task_id by join variant) → `ProjectTaskService.linkAgentRun`/`linkAdHocTask` → `AdHocTaskStore.create` + `TaskAgentResourceService.linkAssigned` | Done. Post-link dispatch failure keeps the Task with a `failed` entry and returns no `task_id` (design semantics) |
| BEH-004 / REQ-005 | Strict create/update modes; update by `task_id` only for both Task kinds | `project-task-tool-contract.ts` (parser, schema, description), `project-task-tool-manifest.ts` → `ProjectTaskService.updateTaskById` | Done. `project_id`+`task_id` → `PROJECT_TOOL_ARGUMENT_INVALID`; create without `project_id` fails as before |
| BEH-005 / REQ-006 | Ad-hoc DONE = Project DONE (closed forever, stopped, hidden, fenced after restart, history kept) | `updateTaskById` → shared `closeAndWrite` → `TaskAgentResourceService.closeTask` → `TaskAgentResourceRelease`; unchanged `closedAgentRunsIn` / root publication | Done (unit: ad-hoc-tasks, dispatch) |
| BEH-006 / REQ-007 | `create_or_update_task` wherever `delegate_task` is, on every runtime | `runtime-agent-tool-exposure.ts` (`CREATE_OR_UPDATE_TASK_TOOL_NAME`) | Done (shared + AutoByteus exposure tests, parity test) |
| BEH-007 / REQ-010 | Task-owned sender's sub-work stays in its Task; no `task_id` | unchanged `delegated` join | Preserved (dispatch tests, incl. sub-work of an ad-hoc copy) |
| BEH-008 / REQ-008, REQ-009 | Ad-hoc Tasks never listed under Projects; deleted with the hosting run | `ad-hoc-tasks/` outside `ProjectsLayout`; delete owners → `deleteAdHocTasksHostedBy` | Done. Only the deleting root's ad-hoc Tasks are removed (DS-006 single-host-root invariant kept: no path links an ad-hoc Task from another root) |
| BEH-009 / REQ-011 | Stored collaborators keep loading, messaging and restoring | unchanged restore/bring-in paths | Preserved (collaborator restore/messaging tests in all three roots stay green) |
| REQ-012 | No Projects lockout for ad-hoc creation/DONE | ad-hoc create/lookup/DONE never call `ProjectStore`; Projects lookup only on an ad-hoc miss | Done (unit test with `projects.json` present) |
| AC-014 (preserved) | Linked delegation/DONE unchanged; ad-hoc ID cannot be assigned | `resolveAssignment` / linked `uniqueTask` stay Project-only | Done. `delegate_task({task_id: <ad-hoc>})` → `TASK_NOT_FOUND`; linked result exactly `{target_agent_run_id}` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The agent-initiated bring-in (`send_message_to` to a catalog address) is unchanged. There is no Dismiss button and no Projects UI change.

## Key Files Or Areas

Production (server, under `autobyteus-server-ts/src/`):
- Added: `projects/domain/ad-hoc-task.ts`, `projects/stores/ad-hoc-tasks-layout.ts`, `projects/stores/ad-hoc-task-store.ts`
- Projects: `projects/domain/models.ts` (`TaskLocation`, `TaskAcknowledgementView`, `UpdateTaskByIdCommand`), `projects/stores/{projects-layout,task-agent-resource-store}.ts`, `projects/services/{task-agent-resource-service,project-task-service}.ts`, `compositions/project-task-agent-resource-composition.ts`
- Runtime: `agent-collaboration/execution/task/{task-agent-resource-port,root-task-execution-lifecycle,root-task-dispatch,task-delegation-command}.ts`, `agent-team-execution/task-delegation/task-delegation-result-contract.ts`, `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`
- `@`: `agent-collaboration/collaborators/collaborator-admission.ts`, `{standalone-agent-run-root,agent-team-execution,agent-org-execution}` collaborators owners, roots and deliveries, `services/agent-streaming/{agent-collaboration,agent-team,agent-org}-stream-handler.ts`, `agent-execution/services/agent-run-command-coordinator.ts` (comment only)
- Tools: `agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest}.ts`, `agent-execution/shared/runtime-agent-tool-exposure.ts`
- Delete owners: `run-history/services/{agent-run-history-catalog-service,team-run-history-service}.ts`, `agent-org-execution/services/agent-org-run-service.ts`

Contracts: `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts`, and its tracked `dist/` rebuilt.

Docs: server `docs/modules/{agent_communication,projects,agent_tools,agent_tools_mcp_server,standalone_agent_run_root,agent_team_execution,prompt_engineering}.md`; web `docs/{chat,projects,agent_teams}.md`. Two stale web code comments were also updated (`runMentionScope.ts`, `useMentionCandidates.ts`). `prompt_engineering.md` is pinned by a test against the rendered prompt.

Tests:
- New: `tests/unit/projects/ad-hoc-tasks.test.ts`.
- Updated: in-memory port fixture; dispatch, lifecycle, admission, exposure, LLM contract, tool and delete-owner suites; root harnesses (Team, Org, standalone) now bind a Task port; architecture boundary test (see Assumptions); native root integration fixture; Projects boundary/closure E2E call shapes; web probes `projects-feature-probe.mjs` and `task-closure-tree-probe.mjs` call shapes.

## Important Assumptions

- **The Task port must be bound for described delegation.** An unowned described `delegate_task` in a root with no Task side now fails up front with `TASK_AGENT_RESOURCES_UNAVAILABLE`, before any planning, like linked mode already does. Production always binds the port: `GeneralProcessRunSupervisor` requires it, and the studio and standalone hosts compose it. So this only affected test harnesses, which now bind `InMemoryTaskAgentResources`. I chose this over silently skipping the Task, which would be a test-only fallback leaving unclosable copies.
- **No runnability check at `@` time** (design SR-004 interpretation). An unrunnable but eligible definition now resolves, and `delegate_task` reports the reason. The web `COLLABORATOR_ADD_FAILED` notice still appears for ineligible mentions.
- **The architecture boundary test was narrowed to the approved dependency.** `tests/architecture/projects-boundaries.test.ts` forbade any `run-history`/runtime-root import of `projects/`. Per the design's Dependency Rules it now allows exactly the three delete owners, and only `projects/services/project-task-service.js`.
- **`deleteAdHocTasksHostedBy` owns the "never fails the delete" guarantee** (it catches and logs internally). The owners call it without their own try/catch, which avoids duplicated defensive code and kept `agent-run-history-catalog-service.ts` within 500 lines.
- **Root collaborators owners (`StandaloneRootCollaborators`, `TeamRunCollaborators`, `AgentOrgRunCollaborators`) gain `resolveMentions` and lose their now-unused public `ensure`.** The owners hold `port()` and `admission`, so this is the natural place, though the design's file mapping did not list these three files. `bringInAt` still runs `CollaboratorAdmission.ensure`.
- Test setup that needs an Offline collaborator without messaging it (Team/Org harnesses, native root fixture) now calls the root's own `*Collaborators.bringInAt`. That is the bring-in step of a first `send_message_to`, reached through a test-only cast because no public non-messaging entry exists.

## Known Risks

- **Breaking update contract for external callers** that send `project_id` with `task_id` (the agent-repository Project Task Manager skill, a separate repo). That repo needs a coordinated update. The in-repo built-in Project Task Manager prompt does not prescribe the update shape.
- **Copies owned by different Tasks cannot message each other by run ID.** This is the approved consequence; existing tests stayed green.
- **A crash between ad-hoc `task.json` creation and the link** leaves an orphan text file (interrupted execution; out of scope).
- **A dispatch failure after the link** leaves an ad-hoc Task with a `failed` assignment until its run is deleted (design semantics).
- **Stale live probe:** `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (about 1,200 lines, real browser plus a real model runtime) still asserts collaborator rows after `@`. Rewriting its scenarios is live E2E authoring and was left for API/E2E. It was not run.
- **UI wording unchanged by scope:** the menu header "Bring into this run" and the notice "Couldn't add <name> to this run" still describe adding. Requirements say the composer UI is unchanged; this is a possible follow-up for product copy.
- `ProjectTaskService` and `projects/` now also own Tasks with no Project, so the names no longer describe the whole subject (review residual risk; rename candidate).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Missing Invariant ("every delegated copy belongs to something closable")
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`. The missing branch in `delegate()` is closed, the Task resource authority is extended with a second location, the update boundary is split by identity shape (`updateTaskById` vs `updateTask`), the DONE closure is shared, and `@` admission is replaced with resolution.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one closure authority. No `closedAt` was added to execution-tree entries and there is no second close tool.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no "ignore `project_id`" fallback and no flag for `@` admission. The saved-note guidance parsing is display of saved history, approved by BEH-002's preserved column.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`. Removed `admitCollaboratorMentions` (three roots), the `admitMentions` delivery methods, the public `ensure` of the three collaborators owners, the update-mode `project_id`, the `@`-admission tests/assertions, and the optional `join`/`resources` branches in `dispatchTaskCopy`.
- Shared structures remain tight: `Yes`. `AdHocTask` is its own record (no `projectId`/`contextFiles`/host). `TaskLocation.projectId: string | null` has one meaning. The port's assigned variant is a discriminated union (`taskId` xor `adHocTask`).
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest is `agent-run-history-catalog-service.ts` at 499 effective lines (baseline 490). The largest delta is `project-task-service.ts` at about 111 changed lines (312 effective lines). Nothing exceeds 220 changed lines.
- Notes: `segment` / `idOfSegmentFolder` were exported from `projects-layout.ts` for `AdHocTasksLayout` (no duplicated path-safety logic).

## Persisted Data Transition Check

- Approved decision: `Not Affected` for existing data. The new `<appData>/ad-hoc-tasks/` root is additive.
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without migration or version-specific fallback: `Yes`. The `agent_run_resources.json` format is unchanged. A missing `ad-hoc-tasks/` means no ad-hoc Tasks. A damaged ad-hoc resource file goes to the same damaged set (non-fatal).
- Direct-use evidence: the existing Projects resource tests and Project E2E boundary tests pass unchanged in behavior. The restart test reloads both roots.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (shared builds and Prisma), and `pnpm -C autobyteus-web exec nuxi prepare` for web specs. The prebuild leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (not committed).
- **Discrepancy:** `pnpm -C autobyteus-server-ts typecheck` (`tsc -p tsconfig.json`) fails at baseline with TS6059, because `rootDir` is `src` but `tests` is included. I used `tsc -p tsconfig.build.json --noEmit` for the source typecheck.
- `autobyteus-agent-presentation-contracts/dist/` is tracked; it was rebuilt with `pnpm -C autobyteus-agent-presentation-contracts build` (run by its `test` script).
- **The full server suite is not green at baseline.** 72 of the 81 files failing in my first full run fail identically on the unmodified source (examples: GraphQL e2e, skills, application backend, memory sync, prisma log policy, media storage, status projectors). I reran the other 9 alone. Four were real fallout of this change and are fixed: the architecture boundary test and the three native root integration suites using `@` admission. The other five pass alone and on baseline; they failed only under full-suite load.

## Local Implementation Checks Run

These are local implementation checks only; they are not API/E2E sign-off.

- Source typecheck: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` → exit 0
- Contracts: `pnpm -C autobyteus-agent-presentation-contracts test` → 10/10 pass
- Focused server suites (all pass):
  - `tests/unit/projects` (incl. new `ad-hoc-tasks.test.ts`, 10 tests)
  - `tests/unit/agent-collaboration` (dispatch 39, lifecycle 17, admission 14)
  - `tests/unit/agent-team-execution`, `tests/unit/agent-org-execution`, `tests/unit/standalone-agent-run-root`
  - `tests/unit/agent-tools`, `tests/unit/agent-execution/shared` and AutoByteus exposure
  - `tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts`
  - `tests/unit/run-history/services/{agent-run-history-catalog-service,team-run-history-service}.test.ts`
  - `tests/architecture/projects-boundaries.test.ts`
  - `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
  - `tests/integration/standalone-agent-run-root/*` (21)
  - `tests/e2e/projects/project-task-boundaries.e2e.test.ts` (8, in-process vitest)
- Web specs consuming the note: `pnpm -C autobyteus-web test:nuxt services/agentStreaming/__tests__/TeamStreamingService.execution-address.spec.ts services/runSubmission/__tests__/localUserSubmission.spec.ts utils/collaborators components/conversation --run` → 19 files / 127 tests pass
- Full server suite (`pnpm -C autobyteus-server-ts exec vitest run --no-watch`): see "Full-suite comparison" below.

### Full-suite comparison

- Final full run on the finished code: 871 files; 735 passed, 73 failed, 63 skipped (5,334 tests passed, 237 failed). Duration 803 s.
- 72 of the 73 failing files fail identically on the unmodified base (`3c8e49ad5`). I checked this by stashing every change and rerunning the failing files: 72 files / 236 tests fail there too. Examples are GraphQL e2e, skills, application backend, memory sync, prisma log policy, media storage, status projectors, `team-run-history-catalog-service`, and `published-artifact-projection-service`.
- The remaining file, `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts`, passes alone (5/5) on this change. It fails only under full-suite load.
- Found and fixed during these comparisons: `tests/architecture/projects-boundaries.test.ts` and the three `tests/integration/standalone-agent-run-root/*` suites (21 tests).
- Dist-based `tests/e2e/projects/project-mutation-node-locality.e2e.test.ts` passed in this run against a `dist/` rebuilt from the current source (dist contains the ad-hoc code).

## Frontend Rendered-Result Check

`Not Applicable`. There is no rendered UI change. The composer, the menu and the chip display are unchanged by requirement. The web chip parsing of the new note was verified by the web unit specs above. The visible outcomes (no row on `@` send; the delegated row disappears after DONE) are live-run behavior for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-002 live: send "review this @X" in standalone, Team and Org runs. Expect no collaborator row from the send, the note stored ending with the new guidance, and the chip shown in the UI.
- AC-003/AC-015: the agent's `delegate_task({recipient_address, description, reference_files})` returns `task_id`. Expect `<appData>/ad-hoc-tasks/<id>/task.json` with paths as text and no copied files, plus a delegated row.
- AC-007/AC-008: "mark it done" → the agent calls `create_or_update_task({task_id, status: "DONE"})`. Expect the row and sub-rows to disappear live, messaging by run ID to fail `TASK_AGENT_RESOURCE_CLOSED`, and the state to hold after reopen and server restart (conversation still readable).
- AC-004/AC-005/AC-006 via MCP and native for Codex, Claude and AutoByteus: update with `project_id`+`task_id` is rejected; update by `task_id` works on a Project Task.
- AC-009: per runtime, `create_or_update_task` is present without selection for a Team member and a standalone host.
- AC-010: permanently delete the hosting run (agent/team/org). Expect its ad-hoc folders gone and other runs and Project Tasks untouched.
- AC-013: with `projects/projects.json` present, delegation and DONE still work.
- AC-012: reopen a stored run that has collaborator entries; messaging by address still works.
- Update `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` to the new `@` outcome.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All live/real-runtime validation of AC-001..AC-015 (above), including the web tree outcome and restart persistence.
- Rewrite and run the stale `cross-scope-agent-mentions-live-probe.mjs`. Run `task-closure-tree-probe.mjs` and `projects-feature-probe.mjs` (call shapes updated, not executed here).
- `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` is env-gated (`RUN_AGY_FAILURE_E2E=1` plus the fake AGY CLI) and was skipped here; its call shapes were updated. The "Project Mutation Regressions" pair should be rerun by API/E2E after a fresh `build`, per TESTING.md.

## Downstream Review Status (informational)

- Code review CRR-001: `Pass` with no findings (code-review-report.md, code-review-revision-record.md). Non-blocking recommendations:
  - R-CR-1: test harnesses reach the private `collaborators` field through a cast.
  - R-CR-2: `agent-run-history-catalog-service.ts` is at 499 effective lines.
- No implementation action was taken. The reviewer forwarded the package to `/api_e2e_engineer`.
