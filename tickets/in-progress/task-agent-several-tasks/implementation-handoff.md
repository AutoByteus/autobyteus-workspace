# Implementation Handoff — task-agent-several-tasks

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks`, base `origin/personal@3b09fbe308`.
Code commits: `a18fe714cd` (IR-001), `cd8c289b67` (IR-002, CR-001 Local Fix) and `1fa3a1d87e` (IR-003, SR-006 web delta for CR-002 / API-F-001). Evidence and these documents: the ticket-artifact commits that follow them (named in each handoff message). The untracked `autobyteus-application-*/dist/` folders are not committed (AF-009).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / High → independent architecture review selected; `Pass` (ARCH-REV-002, no open findings, four implementation notes). SR-006 delta: `Pass` (ARCH-REV-003, no open findings).
- Requirements doc: `requirements-doc.md` (Approved, SR-006: SR-003 plus DEC-013, AC-011)
- Investigation notes: `investigation-notes.md` (AF-001–AF-009)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-006, Ready)
- Supplemental task artifacts: `evidence/SD-probe-several-tasks.test.ts.txt` and its output (the reproduction implementation started from)
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Follow-ups: `follow-ups.md` FU-001 (the code reviewer recorded the deleted-Task risk from this handoff)
- Triggering rework report: `code-review-report.md` CRR-003 (API-F-001 from `api-e2e-execution-coverage-report.md` → Design Impact CR-002), resolved by SR-006 / ARCH-REV-003. Earlier: CRR-001 (CR-001, resolved in IR-002, CRR-002 Pass).

## Current Implementation Summary

A task agent (Agent or Team copy) may hold several open Project Tasks. `delegate_task` with `task_id` and the copy's run id gives it another Task while earlier ones are open, still only from its most recent assigner. A Task's DONE / CANCELLED stops the copy only when it has no open Task left. Before this change, the last close of a copy with two open entries fenced it but asked no one to stop it (AF-001). The given-Task message names the copy's other open Tasks and asks for the Task key in each report; with none open, the text is unchanged. Sub-work joins the newest open Task. The app's "Assigned to" help line on a Task page now states the rule that holds for every Task: "This agent or team stops when its last open Task is Done or Cancelled." (zh-CN: "这个智能体或团队会在它最后一个未完成的任务完成或取消后停止。")

- Implementation cycle: `Design Impact rework` (round 3, SR-006 delta)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-006` (requirements `SR-006`)
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002`, `CRR-003`
- Related API/E2E revision IDs: `API-REV-001` (API-F-001)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-002` (API-F-001); earlier `CR-001`

### CR-001 resolution (IR-002)

| Finding | Fix | Commit | Check |
| --- | --- | --- | --- |
| CR-001: the `update_task` parenthetical "(stopping their task agents)" for a parent's parts was false under the new release rule (REQ-008) | `project-task-tool-contract.ts` `update_task`: now "…also sets its open parts the same way (ending their work for their task agents, as above); closedParts lists them." Also the optional C-06 widening: "To give a task agent another Task, also while its other Tasks are open, use delegate_task with its target_agent_run_id or target_team_run_id." Text pins: `project-task-parts-tools.test.ts:95` (exact sentence) and the `project-task-tools.test.ts` regex (now also covers the widened sentence) | `cd8c289b67` | IMP-06, IMP-07 |

### CR-002 / API-F-001 resolution (IR-003, SR-006)

| Finding | Fix | Commit | Check |
| --- | --- | --- | --- |
| CR-002 / API-F-001: the Task page's "Assigned to" help line said "When the Task is Done, this agent or team stops.", which is false for the first of two open Tasks to close (REQ-004, REQ-008) | `projects.root.help` in `autobyteus-web/localization/messages/en/projects.ts:212`: "This agent or team stops when its last open Task is Done or Cancelled."; `zh-CN/projects.ts:212`: "这个智能体或团队会在它最后一个未完成的任务完成或取消后停止。" (DEC-013, verbatim). No component change (`TaskRootSection.vue` unchanged). New catalog assertion in `localization/messages/__tests__/projectsCatalog.spec.ts` pins both strings (AC-011), as the architecture review asked; `ProjectTaskWorkers.spec.ts` asserts only presence and needs no change. No other copy of the old text exists in source or docs. | `1fa3a1d87e` | IMP-08 (rendered, real stack), IMP-09 (guards and web suite) |

- ARCH-REV-003 non-blocking note: settle (`markStarted` / `markFailed`) is a current-entry consumer the design's table does not name. It is unchanged, as the review asked.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change touches 12 source and doc files, all inside existing owners, with no new file except a test.
  - It changes a core lifecycle invariant (several open entries per copy) and the release rule that stops runs.
  - It changes the `delegate_task` / `update_task` contract texts and CM-6.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High)
- New design impact or escalation trigger: `None`. No escalation trigger fired:
  - no `send_message_to` or queue change, and no UI change beyond the help-line text (DEC-013);
  - no data conversion;
  - no change to reopen or idle-shutdown rules.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Another Task to an open copy, by its most recent assigner; all other refusals stay (REQ-001, REQ-007) | `RootTaskExecutionLifecycle.assignToExistingCopy` → `port.assertAssignable` → `TaskAssignmentEligibility.assertCopyAssignable` → `assertTaskExecutionAssignable` (open refusal removed; same-Task guidance only for a closed current Task) → `prepareClosedCopyForResume` (returns early for an open copy) → `port.assignExistingTaskExecution` (`linkExistingTaskExecution` still refuses a Task the copy holds open) | Implemented. Assigner, sub-work, never-started, peer-node, Task-status and unreadable-data refusals unchanged and tested. A closed Task can be given back while another is open (AC-007). |
| BEH-004 | Message names the other open Tasks and asks for Task keys in reports; unchanged when none (REQ-002) | `port.openTaskReferencesOf(copy, taskId)` (read after `assertAssignable`, before any change) → `ProjectTaskService` → `TaskAssignmentEligibility.openTaskReferencesOf` (`resources.openTaskIdsOf` minus this Task, oldest first, each read for its key; deleted Tasks left out) → `buildExistingCopyTaskMessage({…, otherOpenTaskReferences})` | `New Task assigned to you: B. Your Task A is still open; name the Task key in each report.` / `Your Tasks A, C are still open; …`; unchanged text when empty (existing tests). |
| BEH-003 | Each Task shows the copy (REQ-003) | Unchanged mechanism: the new `assigned` entry is the Task's root | Both Tasks show the copy open (unit tests read `readTaskChangeView` root). |
| BEH-002 | Stop only when no open entry is left; sub-work of a closed Task stops with it (REQ-004, REQ-006) | `ProjectTaskService.closeAndWrite` → `resources.closeTask` → `release.release(taskId, resources.releasableByHostRoot(taskId))`. The new rule: a copy with an entry in this Task whose current entry is closed (it is closed only when no entry is open). `deriveCurrent`: newest open entry, else latest linked; no conflict log | The AF-001 test failed before the fix (IMP-01) and passes after (IMP-02). Sub-work joins the newest open Task and is released when that Task closes while the copy runs on. |
| BEH-005 | Parent → parts cascade unchanged; one stop after the last (REQ-005) | Unchanged cascade; the release rule makes only the last close stop the copy | Parent + two parts on one copy: one stop request, after the last close. |
| REQ-008, REQ-009 | Texts and docs; no data change | `delegate_task` mode (3) text; `update_task` text; CM-6 and a status row; `projects.md`; `agent_team_execution.md` | No data format change; no compatibility code. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

### Architecture-review implementation notes (ARCH-REV-002)

| Note | How it is handled |
| --- | --- |
| 1 Same-Task guidance only for a closed current Task | `if (current.closedAt !== null && currentTaskId === input.taskId)`. An open duplicate reaches the commit's "This task agent already works on this Task." Tested at the lifecycle, the Task side and the AC level. |
| 2 `publishTaskExecutionsReopened` for an open copy | Checked and left unchanged. The web (`agentRunCollaborationContext.ts:160`, `teamExecutionViewState`, `agentOrgExecutionContext`) only removes the copy from `closed_task_executions`, where an open copy is not listed, so nothing visible changes. The lifecycle test pins the log. |
| 3 Where `openTaskReferencesOf` lives | In `task-assignment-eligibility.ts`. `project-task-service.ts` gains one delegating line (486 → 487 effective lines). |
| 4 Probe → durable test | `tests/unit/projects/task-execution-several-open-tasks.test.ts` (first case = the probe); `dist/` folders not committed. |

## Key Files Or Areas

- `autobyteus-server-ts/src/projects/domain/task-execution-resources.ts`: refusal and its dead helpers / inputs removed.
- `src/projects/services/task-execution-resource-service.ts`: `releasableByHostRoot`, `deriveCurrent`, `openTaskIdsOf`, class doc.
- `src/projects/services/task-assignment-eligibility.ts`: `assertCopyAssignable` simplified (now synchronous); `openTaskReferencesOf`.
- `src/projects/services/project-task-service.ts`: port method; the two `assertCopyAssignable` calls no longer awaited.
- `src/agent-collaboration/execution/task/task-execution-resource-port.ts`, `root-task-execution-lifecycle.ts`, `task-execution-input.ts`.
- `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (`delegate_task`), `src/agent-tools/project-tasks/project-task-tool-contract.ts` (`update_task`).
- Docs: `docs/design/collaboration_model.md`, `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`.
- Web (IR-003): `autobyteus-web/localization/messages/en/projects.ts`, `zh-CN/projects.ts` (`projects.root.help`); `localization/messages/__tests__/projectsCatalog.spec.ts` (AC-011).
- Tests:
  - new `tests/unit/projects/task-execution-several-open-tasks.test.ts` (AF-001, AC-001–AC-007, QR-001, QR-002);
  - rewritten cases in `task-execution-existing-copy-assignment.test.ts`, `task-execution-current-entry.test.ts`, `root-task-existing-copy-assignment.test.ts`;
  - text pins: `agent-team-collaboration-llm-contract.test.ts` (delegate_task hash and wording), `project-task-tools.test.ts`;
  - `result-catalogue.test.ts`: M-43 withdrawn, not renumbered, because the IDs come from the wording design;
  - the port fake `tests/fixtures/task-execution-resource-fixtures.ts`.

## Important Assumptions

- Repeated closes: a copy with no open entry is releasable from any Task it has an entry in. A repeated DONE of an older Task therefore re-requests the stop of an already-closed copy. The design states this ("a repeated request is harmless"), and the old test pinning "a DONE of A never does" after B closed was updated.
- Concurrent closes of a copy's last two Tasks may request its stop twice. Both requests come after both entries are closed, and a repeated request is harmless; the test allows ≥ 1.
- The copy's other open Tasks are read before the assignment commits, so a failure to read them changes nothing. Excluding the given Task makes the result the same as reading after the commit, apart from unsupported concurrent delegations (AP-002).

## Known Risks

- The server E2E pins on the removed refusal and the old `update_task` text were updated by API/E2E in `386ce18b5f`; none remain.
- A closed Task's "Assigned to" root reads Offline (muted, with no help line) while the same agent keeps working on another open Task (seen in IMP-08). This is the approved design ("Keep: a closed Task shows its team offline for that Task"), recorded as a residual risk in `design-review-report.md` round 3.
- (Recorded by the code reviewer as FU-001; outside this ticket.) A Task deleted while a copy holds it open keeps its open entry, as today: delete keeps `agent_run_resources.json` and does not close entries. Such a copy is not stopped when its other Tasks close. Its given-Task message also leaves the deleted Task out, so with no other open Task it says "previous Task is closed". This follows REQ-004's wording ("stopped only when no assignment of it is still open"), and deleting a Task with a running task agent already left that agent running before this change. If wanted, a follow-up could close a deleted Task's entries.
- The `delegate_task` and `update_task` wording changes agent behavior. Both are kept to the design's sentences.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Missing Invariant (the release rule)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the AF-001 reproduction failed on the base code and passes after the rule change (IMP-01, IMP-02). The updated design principles (2026-10-23) were re-applied:
  - kinds and forms: Agent and Team copies are covered by the lifecycle and Task-side tests, and all three roots by the passing reactivation-backend suites;
  - one owner per derived fact: openness and releasability are decided only by `TaskExecutionResourceService`;
  - behavior by absence: the message text follows from the explicit open-Tasks list.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
  - removed: `newCopyHint`, `namedTask`, the `currentTaskReference` / `currentTaskStatus` inputs, `assertCopyAssignable`'s current-Task reads, and the conflict log;
  - kept: `locationOfTask`, used by `openTaskReferencesOf`;
  - an import scan of the touched files finds nothing unused, and the server typecheck passes.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (no data shape change; one port method)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Effective lines: `project-task-service.ts` 487, `root-task-execution-lifecycle.ts` 480, `task-execution-resource-service.ts` 330. The largest delta is the docs (`projects.md`, +24 −14); every source delta is under 30 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (format)
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`. Existing data has at most one open entry per copy and reads the same. The current-entry test covers several open entries read from files.
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (darwin), corepack pnpm; dependencies were already installed in the worktree. `pnpm prepare:shared` (run by typecheck) recreates the untracked SDK `dist/` folders, which are not committed.

## Checks Run

Evidence folder: `evidence/`. Each file name starts with its check ID; large logs are an excerpt plus a gzipped full log.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/task-execution-several-open-tasks.test.ts --no-watch` with only the probe test added | base `3b09fbe308` + the new test file | macOS, Node | the release rule before the fix | AF-001, REQ-004 | Fail (expected: reproduction) | `IMP-01-probe-test-before-fix.log` | `AssertionError: expected [] to deeply equal [ [ { teamRunId: 'team-1' } ] ]`, `TASK_AGENT_RESOURCE_CONFLICT` logged |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/task-execution-several-open-tasks.test.ts --no-watch --reporter=verbose` | `a18fe714cd` | same | real `ProjectTaskService` + `TaskExecutionResourceService` + file store | AF-001, AC-001–AC-007, QR-001, QR-002 | Pass | `IMP-02-several-open-tasks-tests-after-fix.log` | `Tests  8 passed (8)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `a18fe714cd` | same | all server `src` | — | Pass | `IMP-03-server-typecheck.log` | `autobyteus-application-backend-sdk build: Done`, `tsc -p tsconfig.build.json --noEmit`, `exit=0` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | `a18fe714cd` | same | all server unit suites, incl. the rewritten lifecycle / Task-side / current-entry / catalogue / text-pin tests | BEH-001–BEH-005; AC-001–AC-009; REQ-008 | Pass | `IMP-04-server-test-unit.log`, `IMP-04-server-test-unit.full.log.gz` | `Test Files  794 passed | 4 skipped (798)`, `Tests  6518 passed | 7 skipped (6525)`, `exit=0`; the FAIL-matching lines are the expected platform-fatal JSON printed by the startup-gate tests |
| IMP-05 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `a18fe714cd` | same | server integration suites (green-suite guard) | — | Pass | `IMP-05-server-integration-prepare.log`, `IMP-05-server-test-integration.log`, `IMP-05-server-test-integration.full.log.gz` | prepare `Integration test prerequisites are present.` `exit=0`; run `Test Files  78 passed | 20 skipped (98)`, `Tests  421 passed | 69 skipped (490)`, `exit=0` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/project-tasks --no-watch --reporter=verbose` | `cd8c289b67` | same | `update_task` text and its pins (CR-001) | REQ-008, CR-001 | Pass | `IMP-06-project-task-tool-texts.log` | `Test Files  6 passed (6)`, `Tests  137 passed (137)` |
| IMP-07 | `pnpm -C autobyteus-server-ts typecheck`, then `test:unit` | `cd8c289b67` | same | all server `src`; all server unit suites after the CR-001 text change | REQ-008 | Pass | `IMP-07-server-typecheck-and-unit.log`, `IMP-07-server-typecheck-and-unit.full.log.gz` | typecheck `exit=0`; `Test Files  794 passed | 4 skipped (798)`, `Tests  6518 passed | 7 skipped (6525)`, `exit=0` |
| IMP-08 | Real-stack browser probe, temporary case IMP-08 (see `IMP-08-help-line-rendered/IMP-08-README.md`): `node autobyteus-web/tests/e2e/<temp copy> --output-dir <fresh> --cases IMP-08`, after `pnpm -C autobyteus-server-ts prebuild && build` | `1fa3a1d87e` | same + headless Chrome, Nuxt dev, scripted AGY runtime, private data root | `TaskRootSection.vue` with the new catalogs, server several-open-Tasks path | AC-011, REQ-008, DEC-013; REQ-003, REQ-004 seen in the app | Pass | `IMP-08-help-line-rendered/` (`IMP-08-README.md`, `IMP-08-evidence.json`, `IMP-08-*.png`, `IMP-08-case-source.mjs.txt`) | `result: "Pass"`, `failures: []`, `pages.*.text` = the approved sentence (en / zh-CN) on both Tasks, `clipped: false`, `bClosedHelpShown: 0`, `cleanup.dataRootRemoved: true` |
| IMP-09 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `test:nuxt --run` | `1fa3a1d87e` | same | all web unit and component suites, incl. the new AC-011 catalog assertion | AC-011 | Pass | `IMP-09-web-guards-and-test-nuxt.log`, `IMP-09-web-guards-and-test-nuxt.full.log.gz` | guards `Passed`, `exit=0`; `Test Files  661 passed | 2 skipped (663)`, `Tests  4759 passed | 3 skipped (4762)`, `exit=0` |

- Environment note: the first full run, on the same commit, failed before any check of this change ran. The worktree had no `autobyteus-application-backend-sdk/node_modules`, so `prepare:shared` could not resolve `@autobyteus/application-sdk-contracts`; 5 application-backend unit suites could not import `@autobyteus/application-backend-sdk`; and 2 unrelated tests timed out under load (skill-folder watcher CR-005 at 302 s, ACP harness `waitFor`). I ran `pnpm install --frozen-lockfile` (no tracked change), then a clean rerun of the whole chain produced IMP-03 to IMP-05. The untracked build outputs (`autobyteus-application-*/dist/`, `applications/brief-studio/dist/`) are not committed.
- IR-003 is a web catalog text change: the server was not rechecked (unchanged since IR-002). The web guards, the web suite and a rendered real-stack check ran on `1fa3a1d87e`.
- IR-002 (CR-001) is a text-only change. Integration was not rerun for it; IMP-05 on `a18fe714cd` still stands.
- Not run, and why:
  - the isolated desktop instance (AC-010, AC-011, API-07) belongs to API/E2E; IMP-08 used a Nuxt dev frontend and the built backend instead;
  - `test:electron` was not run, because no Electron file changed.

## Frontend Rendered-Result Check (When Applicable)

`Applicable` (IR-003: the "Assigned to" help line text). Evidence: `evidence/IMP-08-help-line-rendered/` (README, evidence.json, screenshots).

- Surface: the project's real-stack browser probe harness (`autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`, TESTING.md "Browser probes"). It runs a Nuxt dev frontend, the backend built on `1fa3a1d87e`, the scripted AGY runtime, a private data root and headless Chrome. I added one temporary case (not committed; its source is in the evidence).
- State exercised: one worker copy holding two open Tasks, A then B given with `delegate_task` `target_agent_run_id` while A is open. I opened both Task pages in en-US and zh-CN, at 1440×1000 and 390×844. Then B was set to DONE and both pages were opened again.
- Inspected:
  - The text is the approved sentence on both Task pages in both locales.
  - Typography and color are unchanged (12 px / 20 px, slate-400), placed under the root line in the "Assigned to" card.
  - It is one line at 1440 and wraps cleanly to two lines at 390 (266×40). It is not clipped and does not overflow.
  - After B is DONE, B's root is muted Offline with no help line, and A keeps the help line.
  - No browser errors.
- Limitations:
  - The 390 px screenshots are viewport-only and the line sits below the fold, so the narrow layout check rests on the DOM metrics, not the picture.
  - The packaged desktop app (AC-010 / AC-011 on the isolated instance) is API/E2E's.

## Downstream Coverage Hints / Suggested Scenarios

- Scripted runtime (`tests/fixtures/agy-failure-cli.mjs`):
  - delegate A to a new Team copy;
  - `delegate_task task_id=B target_team_run_id=<copy>` while A is open: the coordinator receives the message with "Your Task A is still open; name the Task key in each report.", and both Tasks show the team;
  - close B: the copy keeps running and accepts messages;
  - close A: the copy is stopped once.
- A parent and two parts on one copy, parent CANCELLED: one stop after the last close.
- Sub-work started after B is given joins B; closing B stops the helper only.
- A closed Task given back while another is open (AC-007).
- A sleeping (idle-shut-down) copy with an open Task, given a second Task: woken by the delivery.
- Isolated desktop instance (AC-010, AC-011): rerun the user's journey. Wherever the root is open, J2 and J3 should show the new help line ("This agent or team stops when its last open Task is Done or Cancelled." / zh-CN), whatever the copy's live status. A closed root shows no help line.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: rerun AC-010 and AC-011 on the isolated instance (API-07), per ARCH-REV-003. The server scenarios already passed (API-00 to API-06).
