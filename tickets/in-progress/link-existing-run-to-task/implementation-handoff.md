# Implementation Handoff — Give A Task To A Run The User Started (Adoption)

Ticket: link-existing-run-to-task (Project Task `autobyteus-11`). Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task`, branch `codex/link-existing-run-to-task`,
base `origin/personal` `2f211340ee`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High);
  ARCH-REV-004 `Pass` for SR-008 (after the implementer's DI-001). Implementation routes to Code Review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-spec.md` (SR-008)
- Supplemental task artifacts: `implementation-design-impact.md` (DI-001, resolved in SR-008) in the same folder
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/architecture-review-revision-record.md`
- Triggering rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md` (CRR-003, failure-origin review of API-REV-001: `api-e2e-execution-report.md` in the same folder)

## Current Implementation Summary

`delegate_task {target_agent_run_id | target_team_run_id, task_id}` from a standalone agent run (the Project Task
Manager) now also adopts an idle agent run or team run the user started in its workspace. The run becomes the
delegator's task agent for that Task: its own file gains the `taskAgent` section (a team's tree is also rebased from `/`
to the catalog address), the delegator's tree gains a link (the split write writes only the link), its history row
leaves, and the Task is delivered as the next message of its own conversation. Every step is recognized from the files,
so a stopped adoption is finished by the same delegator's retry; an unfinished adoption is undone when its Task is
closed or deleted, or its Project deleted. Nothing is moved, copied or deleted.

- Implementation cycle: `Rework` (IR-003: Local Fix for CRR-003 F-001, F-003; IR-002: Local Fix for CRR-001 CR-001..CR-003; IR-001 initial baseline)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-008`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` (Fail, Local Fix), `CRR-002` (Pass), `CRR-003` (Fail, Local Fix: F-001, F-003; F-002 held)
- Related API/E2E / delivery revision IDs: `API-REV-001` / `N/A`
- Triggering finding IDs: `F-001`, `F-003` (IR-003); `CR-001`, `CR-002`, `CR-003` (IR-002); DI-001 was raised before implementation and resolved in SR-008

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: a run's identity class and runtime owner change; writes across the own file, the delegator's tree, the
  Task's resources and the history index, with crash recovery; tool-contract text change.
- Selected route: `Code Review`
- Lightweight self-review for direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open. Three implementation decisions where SR-008 was silent are
  listed under Important Assumptions; they keep within the design's intent.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001, REQ-002, REQ-005, REQ-007, DEC-104, DEC-108; AC-001, AC-002, AC-004 | `delegate_task` existing-run mode adopts an eligible run the user started; refusals change nothing | `RootTaskExecutionLifecycle.assignToExistingCopy` → `HandStartedRunAdoption.admit` (eligibility in the design's order, step 1) → queue command `adopt` → `complete` (steps 2–4) → shared `deliverAssignedTask` (steps 5–6). Files: `agent-collaboration/execution/task/hand-started-run-adoption.ts` (owner), `hand-started-runs.ts` (facts, idle probe, hand-off, history), `root-task-execution-lifecycle.ts` (branch), `standalone-root-adoption.ts` (Agent-root wiring), adapter `commitAdoptedExecution`, collaborators `catalogAddressOf` | Implemented. Only an Agent root gets an adoption (DEC-108); team / org roots keep today's refusal |
| SR-008 step 3 (ARCH-F-003, DI-001) | Own file keeps every fact and is exactly reversible; team address frame rebased | `run-history/store/hand-started-run-adoption-shape.ts` (pure), `TaskAgentOwnFiles.adoptOwnFile` / `restoreHandStartedFile` / `coordinatingRunOf` | Implemented. Read-back through the task-agent reader; link `startedAt` = own `startedAt` (team: tree `createdAt`): the split write writes only the link (tested byte-identical for a team) |
| Step 1 (Task side) | The delegator's first assignment of the run, `starting`, at the catalog address | port `currentAssignmentOf` / `assignAdoptedRun`; `projects/services/existing-run-assignments.ts` (new, split out of `project-task-service.ts`), `TaskExecutionResourceService.assignAdopted` | Implemented. Precondition: no open entry anywhere; a closed earlier entry does not block |
| Step 4 | History row removed; team no longer admitted | `AgentRunHistoryCatalogService.removeAdoptedRun` (+ readiness `excludeCurrent`), `TeamRunHistoryCatalogService.removeAdoptedTeamRun` (+ `TeamRunPackageCatalog.exclude`) | Implemented |
| DEC-109 / ARCH-F-001 | A stopped adoption is finished by the same delegator's retry; open entry recognized first | `HandStartedRunAdoption.isInProgress` (also routes a linked run that is still listed), `complete` (each step recognized from the files) | Implemented; see Important Assumptions (2) |
| Undo (SR-008 "owner and timing"; ARCH-REV-004 Project delete) | Unfinished adoption undone on DONE / CANCELLED / Task delete / Project delete | `TaskExecutionResourceRelease.revertUnfinishedAdoptions` (from `closeAndWrite`, `deleteTask`, `afterProjectDeleted`); `ProjectService.deleteProject` → `afterDelete`; composition: active root's `revertUnfinishedAdoption` (on its queue) else `revertUnfinishedAdoptionOffline` (tree from disk) | Implemented; failures logged `TASK_ADOPTION_REVERT_FAILED`, retried by repeating DONE |
| BEH-002, BEH-003 / REQ-003, REQ-004; AC-003 | Shown, coordinated and closed like any task agent; nothing deleted | existing delegated-run paths (the run is in the delegator's tree; started event published at commit) | Unchanged code; DONE stop tested at root level; the agent run's empty collaboration package is kept |
| Agent-facing texts | `delegate_task` description and run-id parameters | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Implemented |
| REQ-002, adoption step 5 (F-003) | The Task as the adopted run's next work, without claiming an earlier Task | `task-execution-input.ts` `buildAdoptedRunTaskMessage`, chosen by `deliverAssignedTask` for an adoption (also a resumed one); a returning copy keeps `buildExistingCopyTaskMessage` | Implemented (IR-003). First line: `New Task assigned to you: <Task key>. This is the work to do now.` (then the unchanged body). The returning-copy text is unchanged: `New Task assigned to you: <Task key>. Your previous Task is closed; this is the work to do now.` |
| REQ-004 with BEH-002 (F-001) | An adopted run's usage is attributed under its current root; its earlier records are left as they are | `token-usage/services/token-usage-run-accumulator.ts`: `run_summary_after_event.root_team_run_id` is the observation's root (current execution context), not the stored record's | Implemented (IR-003). The PM's Agent root no longer rejects an adopted team member's `TOKEN_USAGE_UPDATED` (ADO-4). The stored record keeps the earlier team root |
| Docs | `projects.md` §Ownership, new §A Task for a run the user started; `collaboration_model.md` CM-6 row | docs | Implemented |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `agent-collaboration/execution/task/hand-started-run-adoption.ts`, `hand-started-runs.ts`;
`standalone-agent-run-root/services/standalone-root-adoption.ts`; `run-history/store/hand-started-run-adoption-shape.ts`;
`run-history/services/agent-run-history-catalog-state.ts` (extracted for size); `projects/services/existing-run-assignments.ts`
(extracted for size).

Changed: lifecycle (branch, `adopt` queue kind, `revertUnfinishedAdoption`, shared delivery), command queue, port
(`currentAssignmentOf`, `assignAdoptedRun`, `UnfinishedAdoptionRevertRequest`), `TaskDelegationErrorCode`
(`TASK_ADOPTION_NOT_FINISHED`), active root boundary (`revertUnfinishedAdoption?`), standalone root / builder (wiring,
`handStartedRuns` dependency), adapter (`commitAdoptedExecution`), collaborators (`catalogAddressOf`), Task side
(`assignAdopted`, `neverStartedAssignments`, `closeEntry`, `taskLocationsOfProject`, `closeTaskExecutionEntry`, release
revert, service hooks), `ProjectService.deleteProject`, catalogs, own files, composition (+ `memoryDir`), texts, docs.

## Important Assumptions

1. **Which never-started entry is an adoption to undo.** SR-008 says the undo runs for an entry that "names a
   hand-started adoption" without saying how to tell. Implemented: own file names the delegator's root AND the tree has
   no link AND the run is still in its history index. A new copy whose start crashed between its own file and its link
   (8641c0ac) has the first two but never a history row, so it is never turned into a "hand-started" run. Consequence:
   the undo never needs to re-add a row (it is never removed before the link exists); it re-admits the run instead.
2. **Recognition of an adoption in progress after the link.** The design's rule ("not yet a copy in the delegator's
   tree") cannot resume a stop after the link and before the history row leaves (the retry would be refused as "still
   works on this Task"). Implemented: open, never started entry by this delegator for this Task at this root, and the
   run not linked yet **or still listed** (a copy never is). A stop after step 4 and before delivery has no marker that
   tells it from a copy whose follow-up delivery crashed; it keeps that existing behaviour (entry `not_confirmed`; the
   delegator messages the run's id). Tested: `hand-started-run-adoption-root.test.ts` "finishes an adoption stopped
   after its link".
3. **Task delete.** A deleted Task's entries stay as they are today (open entries stay open). For an unfinished
   adoption the undo also closes its entry (`closeEntry`), so the restored run belongs to no Task and can be adopted
   again. Entries that are not unfinished adoptions are untouched.
- The busy probe treats `running` and `initializing` as a running turn (DEC-104).
- A hand-started agent run that was prepared but never started (no `startedAt`) is refused ("never started"): it has no
  conversation to continue, and its own file could not be read back as a task agent. Not in the design's refusal list;
  added so such a run is never half-adopted.
- `ProcessHandStartedRuns` builds the history catalogs for its own memory root and resolves the run managers lazily
  (the team catalog needs an initialized team manager); tests inject them.

## Known Risks

- **History change publication.** SR-008 says "history change published" at step 4. The server has no history push;
  the web re-reads history. The adopted run appears under the delegator at once (its `task_execution_started` event);
  its own-group row leaves on the sidebar's next history read. To confirm in the real-app check (R-1 accepted).
- R-2 (a partial adoption shows `not_confirmed` until retried) and R-3 (an adopted team's members remember `/`
  addresses) as accepted in the design.
- Memory page Teams list: an adopted team run leaves it (8641c0ac FU-1), as the design notes.
- **Token meter observation (F-001; reported, not decided).** Usage is stored as one cumulative record per run, and
  the fix leaves it unchanged. So the PM's Agent-root meter (`getStandaloneRunSummary`: the records of the host and its
  delegated runs) includes the adopted run's usage from before adoption. The run's record also keeps the earlier
  team root, so a summary by that team root still finds the whole record, including later usage. This is today's
  per-run accounting, applied to a run that changes root, and the fix does not force a choice about it. Whether
  pre-adoption usage should count in the PM's meter is a product question for the Solution Designer, if one is wanted.
- F-002 (an adopted run stays in its sidebar group) is held by the Code Reviewer; there is no code change here, and
  API/E2E will recheck it after this fix.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`; root-cause classification `No Design Issue Found`; refactor decision `No`.
- Implementation matched the reviewed assessment: `Yes` (one owner on the existing path). Two file splits were needed
  only for the size guardrail (catalog state; existing-run assignments), with no behaviour change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Legacy old-behavior retained in scope: `No`.
- Dead code in touched files removed: `Yes` (none found new).
- Shared structures remain tight: `Yes` (no new persisted field; the adopted run's records are a catalog task agent's).
- Size guardrails: `Yes`. `project-task-service.ts` 498 → 490 non-empty lines and `agent-run-history-catalog-service.ts`
  499 → 465 (both were over the guardrail's spirit before; code moved to new owned files). Lifecycle 446 → 487.
  Standalone root 442.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (no migration; each adoption writes only current shapes).
- Implementation follows it: `Yes`.

## Environment Or Dependency Notes

- The worktree needed `pnpm install` and `pnpm prebuild` (autobyteus-ts build, Prisma client) before typecheck/tests.

## Local Implementation Checks Run

IR-003 (after CRR-003):
- F-001: new case in `tests/unit/token-usage/services/token-usage-run-accumulator.test.ts`, "claims the observation's
  current root after a team run is adopted, keeping the record's earlier root". A run records usage with root
  `hand-started-team`, then with no root (the PM's Agent root). The second summary claims `null` and totals both events;
  the stored record keeps `hand-started-team`. It fails without the fix (`expected 'hand-started-team' to be null`).
- F-003: `hand-started-run-adoption-root.test.ts` (agent adoption) asserts the delivered first line and that
  "previous Task" is absent. The returning-copy text stays pinned by `root-task-existing-copy-assignment.test.ts`.
- API/E2E's `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` (uncommitted, theirs), run in a clean env
  (`env -i`, temporary `HOME`/`TMPDIR`, `RUN_AGY_FAILURE_E2E=1`, scripted AGY CLI): 4/4 passed, **including ADO-4**.
  Log: `evidence/implementation/IR-003-ADO-e2e.log`.
- Build typecheck 0 errors; `vitest run tests/unit`: 724 files / 5883 tests passed (4 files / 7 tests skipped).

IR-002 (after CRR-001):
- CR-002: a run id that is no run the user started (unknown, another root's copy or task agent team member) keeps
  today's `notACopyOfThisRun` refusal unchanged, also for a non-host delegator. The adoption refusals stay only for runs
  the user started: never started; an agent run's id as `target_team_run_id`; a team run's id or a member of an admitted
  (user-started) team run as `target_agent_run_id`; an organization run. `HandStartedRunLookup` not-found carries
  `refusal: string | null` (`null` = today's refusal). Tests: root-level "keeps today's refusal …" (unknown agent id,
  unknown team id, another root's task-team member: exact text) and "names the field to use for a member of a team run
  the user started"; owner unit "a run unknown to this node" now expects today's text.
- CR-002(c) e2e (clean env, `RUN_AGY_FAILURE_E2E=1`, scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs`):
  `collaboration-prompt-wording` 11/11, `task-existing-copy-assignment` 7 passed / 2 skipped, `task-reactivation-root-visibility`
  6 passed / 1 skipped — 3 files passed, 24 passed / 3 skipped. Skips: two live-Claude cases (`RUN_CLAUDE_E2E` not set)
  and EXC-E2E-006 (a permanent `it.skip`, unit-covered). Log: `evidence/implementation/IR-002-delegate-task-refusal-e2e.log`.
- CR-001: removed the unused `cloneCollaborationMemberExecutionIdentity` import; `memoryDir` is now a plain constructor
  argument in both history catalogs. `tsc --noUnusedLocals --noUnusedParameters` reports nothing in any touched file.
- CR-003: `projects.md` says step 1 runs with the eligibility checks and steps 2–4 on the root's queue.
- Build typecheck 0 errors; unit folders agent-collaboration, standalone-agent-run-root, run-history, projects,
  agent-team-execution, agent-tools: 185 files / 1541 tests passed.

IR-001:

- `tsc -p tsconfig.build.json --noEmit`: 0 errors.
- Test typecheck: no error in a changed or new test file; the remaining errors exist at base (e.g. the supervisor test's
  `modelSelectionValidator` mock).
- New tests:
  - `tests/unit/run-history/store/hand-started-run-adoption-shape.test.ts` (5): rebase / inverse round trip on hand-built
    team trees with handoffs; on disk, a team run stopped inside step 3 then restored is listed and openable as a team
    run, parsed-identical; agent metadata gains/loses only `taskAgent`.
  - `tests/unit/agent-collaboration/hand-started-run-adoption.test.ts` (21): every refusal (nothing written); agent and
    team adoption (link only; team own file byte-identical on a later save); stop after step 1, 2, inside 3, after 3 →
    the retry finishes; busy at hand-off → "not finished", entry stays `starting`; another delegator refused; undo with
    the root active and not active; nothing undone for a finished adoption, a run not listed, or another root.
  - `tests/unit/projects/task-execution-adoption.test.ts` (6): first assignment at the catalog address; DONE Task, open
    entry refused; closed earlier entry does not block; DONE / repeated DONE request the undo; Task delete closes the
    reverted entry only; Project delete triggers the undo; a failing undo never fails the delete.
  - `tests/unit/standalone-agent-run-root/hand-started-run-adoption-root.test.ts` (5): real Agent root, tree store, own
    files, history index: agent run and team run adopted and delivered (AC-001, AC-002); another workspace refused
    (AC-004); stop after the link resumed; DONE stops the adopted run (AC-003).
- Updated tests (planned text change): `task-delegation-runtime-descriptions.test.ts` (new mode (3) phrases) and
  `agent-team-collaboration-llm-contract.test.ts` (the pinned hashes of the three changed texts: the `delegate_task`
  description and both run-id parameter descriptions). The wording is mine within the design's "description and refusal
  texts"; please review it as approved text.
- Shared test fixture: `InMemoryTaskExecutionResources` implements the two new port methods.
- Server unit `vitest run tests/unit`: 723 files passed, 4 skipped (5878 tests) before the pinned-hash update; the one
  failure was that hash test, now updated and passing; the files changed after the run pass.
- Server integration `pnpm test:integration`: 75 passed; 1 file with the 2 known `agent-status-websocket` failures
  (Task 4577620f).

## Frontend Rendered-Result Check

- Not applicable for code (no web change). The sidebar / board behaviour of an adopted run is the existing
  delegated-run rendering; checked in the real-app run (below).

## Downstream Coverage Hints / Suggested Scenarios

- Real-app check on an isolated instance with hand-built data (AC-001..003): a PM run, a hand-started team run and agent
  run in its workspace, a Project Task; the PM adopts each; the run leaves its group and appears under the PM with the
  Task line; the board shows it as the worker; DONE stops it and its row leaves; reopen + message reactivates it.
- A real team run's members after adoption: handoff rules at the new addresses; members messaging each other and the PM.
- Interrupted adoption in the real app (kill between steps), retry by the PM; close the Task of an unfinished adoption →
  the run is listed again in its group.
- Beta and the user's check (AC-007).

## Follow-ups (outside this ticket)

- The test file `agent-team-collaboration-llm-contract.test.ts` has a case titled "delegation always does" create an
  agent; adoption gives a Task to an existing run. Its assertions still hold; the title may want a wording pass.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The isolated real-app journey (AC-001..003) and the beta/user check (AC-007).
