# API/E2E Coverage Investigation — `link-existing-run-to-task`, Withdraw Adoption (SR-018)

The plan for the current round. The adoption rounds (API-REV-001..004) are summarized in `api-e2e-revision-record.md` and kept in the branch history; their plan is superseded by this one.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` "Removal Requirements" (RM-001..RM-006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-018)
- Design Spec (required on every route): `design-spec.md` "Removal Plan (current)"
- Supplemental Task Artifacts: `withdrawn-adoption-contract.md` (record only), `handoff-implementation-withdraw.md`
- Design Review Report: `N/A — not applicable` (no architecture review selected for SR-018)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-005)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` round 7, CRR-009 — an independent source review the user asked for, outside the direct route: Pass, no findings. For the record; it does not change this plan or the route
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005` (on completion)
- Current Investigation Round: 5 (first round of the withdrawal)
- Trigger: implementation_engineer IR-005 ready for direct API/E2E validation
- Prior Investigation Reviewed: yes (the adoption plan, rounds 1–4)
- Latest Authoritative Investigation: this file

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption/tickets/in-progress/link-existing-run-to-task/`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption`, branch `codex/withdraw-adoption`. Code commit `ffeea43dac`; docs commit `1005f9eaaf` adds only ticket files (`git diff --name-only ffeea43dac 1005f9eaaf` outside `tickets/`: 0 files).

## Current Requirement And Design Basis

Adoption (merge `4e738acc66`) is removed on product paths.
- **RM-001:** `delegate_task {target_*_run_id, task_id}` on a run that is not one of the delegator's delegated runs is refused as before adoption: "`<id>` is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address." Nothing is written.
- **RM-002:** later tickets' changes stay intact.
- **RM-006:** three fixes useful without adoption are kept.
  - Kept fix 1, sidebar rule 2: a run that left the server history leaves its own group at the next history read.
  - Kept fix 2: the live token summary claims the observation's current root.
  - Kept fix 3: the TESTING.md resolved temp-`HOME` rule.
- **RM-003:** no migration (no run was ever adopted).
- **RM-004, RM-005:** release notes and a new beta, both for delivery.

## Supported Scenarios And Real Usage

- Designer scenarios covered: the removal plan's verification (refusal, suites, symbol search).
- Real-use scenarios added from the implemented behavior, each with its real trigger:
  - **RU-1:** the user asks the PM, in the composer, to give a Task to a run the user started in the PM's workspace. This is the user's real attempt (Work Journal). Trigger: the PM's own `delegate_task {target_agent_run_id | target_team_run_id, task_id}`.
  - **RU-2:** an open run in this window is deleted or archived from outside it (another window, the phone client, another instance). Trigger: the server's GraphQL archive/delete, as those clients call it.
  - **RU-3:** the PM's normal work stays unchanged with real models: it delegates a Task to a new task agent, which reports with token usage; DONE stops it; reopen plus the PM's message reactivates it (AC-006 preserved behavior; kept fix 2 on normal data).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Adoption via `delegate_task` (server collaboration, Task services, run-history, standalone root) | Removed | RM-001; handoff RM-001 row | Prove the pre-adoption refusal on a real hand-started run and that nothing is written (WDR-1, WDR-3); reuse the refusal pins (IMP-04) |
| Adoption e2e, fixtures, harness options (`startRoot` workspace, `release`) | Removed | handoff RM-001 row | No replacement for adoption tests (the behavior is gone); WDR-1 pins the refusal instead |
| Sidebar rule 1 (`task_execution_started` retirement) | Removed | Kept Fixes row 1 | Covered by reused web suite (IMP-05); no adopted run can exist |
| Sidebar rule 2 (history-read retirement) | Preserved (kept fix 1) | Kept Fixes row 1, IMP-10 | Real-app journey RU-2 (WDR-4) |
| Token summary root (kept fix 2) | Preserved | Kept Fixes row 2, IMP-08 | Reuse IMP-08; real-model usage with no fail-stop (WDR-5) |
| Later tickets' changes in the three conflict files | Preserved | RM-002 | Reused suites (IMP-02, IMP-03, IMP-05); whole e2e (WDR-2) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | collaboration lifecycle, Task services, run-history catalogs | IMP-01..03 | the whole e2e was not run | WDR-2 |
| API / transport / contract | Yes | `delegate_task` result and agent-facing texts | IMP-04 (unknown ID, other root's copy) | a real hand-started run as target; "nothing written" | WDR-1, WDR-3 |
| Frontend component / state | Yes | sidebar retired-runs store (rule 1 removed) | IMP-05, IMP-10 | rendered behavior | WDR-4 |
| Browser integration / user journey | Yes | sidebar, PM conversation | none rendered this round | rendered refusal and rule 2 | Project desktop validation |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | as above | — | as above | isolated instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | copy lifecycle (preserved) | existing e2e | real models | WDR-5 |
| Persisted-data transition | No (RM-003: nothing was ever written) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server (Fastify, GraphQL, WebSocket), Nuxt web, Electron desktop.
- Project testing guideline: `TESTING.md` (root); `AGENTS.md`; `docs/isolated-app-instances.md`.
- Conflicting, missing or unclear instructions: None.
- Required environment variables or secrets available: `Yes` (provider keys imported into the isolated instance's vault through `pnpm secrets:import`; values never printed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing rules | clean env for e2e with a resolved temp `HOME`; scripted AGY gate (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`); serialize vitest runs per worktree (shared test DB); rerun by impact; rule 9 (cause of every failure) |
| `docs/isolated-app-instances.md` | desktop instances | `pnpm --silent isolated-app start --build --data-root <owned dir>`; `restart`; `stop`; credentials via the importer, then restart |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | server tests | `vitest run tests/e2e`; global setup resets `tests/.tmp/autobyteus-server-test.db` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server e2e | worktree | `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm -C autobyteus-server-ts exec vitest run …` | in-process servers, temp data dirs | vitest result | temp `HOME` removed |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build --data-root <owned temp dir>` | own ports, own data root; never the user's app | `start` JSON `ok: true` | `isolated-app stop <id>`; delete the data root (it holds the test vault) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent and team definitions, a Project with Tasks, runs | GraphQL on the instance (`createAgentDefinition`, `createAgentTeamDefinition`, `createProject`, `createProjectTask`, `createAgentRun`, `createAgentTeamRun`) | hand-built test data only; never the user's data | removed with the data root |
| Provider credentials | `pnpm secrets:import` from the user's `.env` into the instance's vault | values never printed; only `.env` is read | vault deleted with the data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` CPW-R3 | refusal text for an unknown ID (`not_my_task_agent is not one of your task agents. …`) | RM-001 | Still Valid | IMP-04 | reuse |
| `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | refusal for another root's copy; existing-copy follow-up | RM-001, AC-006 | Still Valid | IMP-04 | reuse; also in WDR-2 |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | reactivation of own copies | AC-006 | Still Valid | IMP-04 | reuse; also in WDR-2 |
| `hand-started-run-adoption.e2e.test.ts` (ADO-1..4) | adoption | withdrawn | Stale / Remove (removed by the implementation) | RM-001 | covered under Durable Coverage To Remove |
| whole `tests/e2e` | regression | AC-006, RM-002 | Still Valid | — | WDR-2 |
| web `runHistoryStore.spec.ts` "left the history" | kept fix 1 | RM-006 | Still Valid | IMP-10 | reuse |
| server `token-usage-run-accumulator.test.ts` | kept fix 2 | RM-006 | Still Valid | IMP-08 | reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| WDR-R01 | RM-001, RM-002 | server types | Reused | IMP-01 | same commit (`ffeea43dac`) |
| WDR-R02 | RM-001, RM-002 | server unit | Reused | IMP-02 | same commit |
| WDR-R03 | RM-002 | server integration | Reused | IMP-03 | same commit |
| WDR-R04 | RM-001 | refusal pins, copy follow-up and reactivation e2e | Reused | IMP-04 | same commit; also rerun inside WDR-2 |
| WDR-R05 | RM-001, RM-002 | web unit | Reused | IMP-05 | same commit |
| WDR-R06 | RM-002 | web guards | Reused | IMP-06 | same commit |
| WDR-R07 | RM-001 | web types parity | Reused | IMP-07 | same commit |
| WDR-R08 | RM-006 (kept fix 2) | token accumulator, with and without the fix | Reused | IMP-08 | same commit |
| WDR-R09 | RM-001 | adoption identifiers search | Reused | IMP-09 | same commit |
| WDR-R10 | RM-006 (kept fix 1) | sidebar rule 2 unit cases | Reused | IMP-10 | same commit |
| WDR-1 | RM-001 (RU-1) | `delegate_task` → hand-started agent and team run in the PM's workspace | Durable | new `tests/e2e/projects/hand-started-run-refusal.e2e.test.ts`, scripted AGY, clean env | the existing pins use an unknown ID and another root's copy, not a real hand-started run; proves the text plus nothing written |
| WDR-2 | AC-006, RM-002 | whole server e2e | Existing Test | `vitest run tests/e2e` with the gate on, clean env, resolved `HOME` | not run by the implementation |
| WDR-3 | RM-001 (RU-1) | real app: PM refuses, the run stays in its own group, nothing changes | Journey | isolated branch build; PM Haiku 5.5 (Claude Agent SDK), hand-started runs DeepSeek V4 Flash (AutoByteus) | rendered user path with real models |
| WDR-4 | RM-006 kept fix 1 (RU-2) | real app sidebar | Journey | archive an open agent run and delete an open team run through GraphQL from outside the window; both leave within one history read; an unrelated open run stays | rendered rule 2 |
| WDR-5 | AC-006, RM-006 kept fix 2 (RU-3) | real app copy lifecycle | Journey | PM delegates a Task to a new task agent (real model, usage), DONE, reopen plus message | preserved behavior with real models; no fail-stop |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| WDR-1 | `autobyteus-server-ts/tests/e2e/projects/hand-started-run-refusal.e2e.test.ts` | pins RM-001 for the real scenario the withdrawn feature handled (a run the user started, in the PM's workspace): refusal text, and nothing written (the PM's tree, the Task's entries, the run's own file and history row, the run still usable as its own root) |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement Evidence | Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` (ADO-1..ADO-4), removed by the implementation | asserts adoption succeeds | RM-001 (adoption withdrawn) | Replaced by WDR-1, which asserts the refusal. ADO-4's F-001 concern is covered by kept fix 2 (IMP-08) |
| `collaboration-root-harness.ts` `startRoot({ workspaceRootPath })` and `release()`, removed by the implementation | only the ADO file used them | RM-001 | No replacement needed |

## Desktop Application Validation Plan

- Desktop framework / shell: Electron.
- Instructions used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: sidebar, PM conversation, board.
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: an isolated instance of the branch build on an owned data root, driven over CDP; real models.
- How the run avoids disturbing the user's app: own ports and data root; the user's `/Applications/AutoByteus` and `~/.autobyteus` untouched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| RM-004 release-notes wording; RM-005 new beta | delivery-owned | none for validation | No | Delivery |
| Kept fix 2 on real mixed-root (legacy) data | no such data in test fixtures without fabricating it; IMP-08 proves the case in a unit test | low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (WDR-1)
- Reroute Required Before Validation Execution: `No`


## Round 6 Plan (API-REV-006): DR-004 Local Fix, IR-006

- Trigger: implementation_engineer IR-006. Merge `a130f4a86f` brings in `origin/personal` `04ec416617` (project-task-semantic-search); docs commit `d95425d711` (no product change: `git diff --name-only a130f4a86f d95425d711 -- . ':!tickets'` is 0 files). The ticket folder is now at `tickets/done/link-existing-run-to-task/` (archived by delivery).
- What changed since my validation `014e9581da`:
  - 60 product files from semantic search, including `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` and `src/api/graphql/schema.ts`;
  - the two conflict resolutions in `project-service.ts` (`deleteProject`) and `project-task-service.ts` (`deleteTask`, the process-instance `Pick`), which keep `searchCleanup` and drop the adoption hooks.
- Decision (TESTING.md "Rerun by impact" rule 4): a shared foundation changed (dependencies, lockfile, schema), so **every case is Rerun**.

| Case ID | Decision | How |
| --- | --- | --- |
| WDR-R11 | Rerun, by reusing IMP-11 (server typecheck) | same commit `a130f4a86f` |
| WDR-R12 | Rerun, by reusing IMP-12 (server unit, integration) | same commit |
| WDR-R13 | Rerun, by reusing IMP-13 (adoption identifiers) | same commit |
| WDR-R14 | Rerun, by reusing IMP-14 (refusal set, WDR-1, `project-task-search`, `project-task-search-model-unavailable` e2e) | same commit |
| WDR-R15 | Rerun, by reusing IMP-15 (web, guards) | same commit |
| WDR-2 | Rerun myself | the whole server e2e on `d95425d711`, gate on, clean env, resolved `HOME`; it covers semantic search's remaining e2e |
| WDR-3, WDR-4, WDR-5 | Rerun myself | a new isolated branch build, real models |
| WDR-6 (new) | Add, as a journey | real app: delete a Task that had a delegated copy, then delete the Project (the board's `deleteProjectTask` / `deleteProject`). Both succeed, both are gone, no error is logged. This exercises the conflict-resolved `deleteTask` / `deleteProject`; their search cleanup is covered by WDR-R14 |

WDR-1 is inside WDR-2 and WDR-R14. WDR-R01..R10 (round 5, `ffeea43dac`) are superseded by WDR-R11..R15.
