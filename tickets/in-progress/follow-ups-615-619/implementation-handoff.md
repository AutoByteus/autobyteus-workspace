# Implementation Handoff

Ticket: autobyteus-619 (follow-ups-615-619). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-615-619`, branch `codex/follow-ups-615-619`, from `origin/personal` at `dad158474c`. Finalization target `origin/personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Architecture Design Complete`, Medium / Low: direct implementation (no architecture review), handed over by the Solution Designer.
- Requirements doc: `tickets/in-progress/follow-ups-615-619/requirements-doc.md` (SR-001, approved within the direction)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001)
- Supplemental task artifacts: `follow-ups.md` (FU-001 the Solution Designer's; FU-002 and FU-003 added here)
- Design review report: `N/A — not applicable` (not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

- **I-1b, the product fix:** the Memory page's team lists hold team roots only. `TeamRootMemorySource.readRoot` returns no root for a Team run whose tree has `containedIn` (an Org's Team unit, autobyteus-29), so `listAgentTeamsWithMemory` and `listAgentTeamRunsWithMemory` leave the units out. The Org views read the units themselves and are unchanged.
- **I-1a, I-1c, the faithful upgrade ledger:** one helper, `tests/e2e/app-data-migrations/helpers/faithful-upgrade-ledger.ts`.
  - `faithfulUpgradeLedger` makes the ledger the way an install did: a first start on the empty folder, then it deletes the rows of the migrations the modeled release never ran and checks that every other row stays.
  - `migrationsFrom(id)` names those migrations.
  - `migrationsOfStartUnderTest` checks that no released migration reruns, and lists the migrations that ran on the start under test for the run log.
  - The two failing files use it: collaborators-to-delegated-runs, never ran from `20261015_collaborators_to_delegated_runs_v1`; removed-skillAccessMode, never ran from 29's `20261122_agent_org_units_own_runs_v1`, with the modeled release asserted against `released-migration-order.json`. So do the two files that had the pattern inline (append-only message logs, the Org conversion cost).
- **I-2:** `restoreByMemberMessage` waits for the Org's `AGENT_COMMAND_ACK` of its own `command_id`, which the server sends after posting the message and recording the summary. A Team's wait is unchanged, because the Team stream sends no acknowledgement for an accepted message (Deviations; FU-002).
- **I-3:** SR-016 gives the received-files store `memoryDir: os.tmpdir()`, the same form as its agent folders.
- **I-4:** 599's Case 26 and Case 27 become Case 29 and Case 30, in number order. Each says which number 599's records cite. A note says to take the next free number at merge.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one product line, in the team root source. A list narrows to its documented meaning, decided by a field the tree already stores. The rest is tests and one document. No contract, persistence, concurrency or ownership change.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (the diff `dad158474c..HEAD` re-read; one tidy-up applied, commit `233f813d19`)
- New design impact or escalation trigger: `None`. The escalation trigger was checked:
  - The Org memory views don't read the team list: `AgentOrgMemoryExplorerService` has its own source.
  - The Agents tab reads only the team source's catalog rows (`readCatalogEntries`), not `readRoot`, so it is unchanged.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001) | The two upgrade E2E files start from a faithful ledger; no migration of the modeled release reruns | `faithful-upgrade-ledger.ts`; the four upgrade files | Implemented. Both pass (IMP-04, IMP-05), and without the ledger both fail as reported (IMP-03). Each logs the migrations that ran on the start under test. |
| BEH-002 (REQ-002; AC-002) | An Org's Team unit is not a team root on the Memory page; standalone and delegated team roots and the Org page as before | `src/agent-memory/services/team-root-memory-source.ts` (`readRoot`: `tree.containedIn` → no root) | Implemented. Unit test red then green (IMP-08). `memory-collaboration-graphql` passes with its expectations unchanged, including its Org cases; with the base source it fails as reported (IMP-09). |
| BEH-003 (REQ-003; AC-003) | The helper returns after its own message is acknowledged | `tests/e2e/helpers/restore-by-member-message.ts` | Implemented for an Org. A helper unit test fails with the base helper (IMP-10). The helper's users pass (IMP-11). The whole-run results are in IMP-13. |
| BEH-004 (REQ-004; AC-004) | SR-016 passes whatever form `TMPDIR` has | the SR-016 test | Implemented. The link form fails at the base (IMP-01); both forms pass (IMP-02). |
| BEH-005 (REQ-005; AC-005) | Unique case numbers, the earlier number named | `docs/design-cases.md` | Implemented (IMP-15: no duplicate) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

All under `autobyteus-server-ts/` unless noted.

- Commit `42221c8a70`, the product fix:
  - `src/agent-memory/services/team-root-memory-source.ts`;
  - `src/agent-memory/services/collaboration-root-memory-catalog.ts` (the interface comment: `null` also for "not a root of this family");
  - `tests/unit/agent-memory/team-memory-explorer-service.test.ts` (a new case).
- Commit `9578c55485`, the ledger:
  - new `tests/e2e/app-data-migrations/helpers/faithful-upgrade-ledger.ts`;
  - `collaborators-to-delegated-runs-startup.e2e.test.ts`;
  - `tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts`;
  - `append-only-message-logs-startup.e2e.test.ts`;
  - `agent-org-units-conversion-cost.e2e.test.ts`.
- Commit `36102a28f3`:
  - `tests/e2e/helpers/restore-by-member-message.ts`;
  - new `tests/unit/e2e-helpers/restore-by-member-message.test.ts`;
  - `tests/unit/agent-org-execution/container/org-units-remote-files-and-renewal.test.ts`;
  - `docs/design-cases.md` (repository root).
- Commit `233f813d19`: the self-review tidy-up of `restore-by-member-message.ts` (the run-state check made once, before the loop).
- The ticket folder: this handoff's commit.

## Important Assumptions

- `getAppDataMigrations` lists the migrations in registration order, and a first start on an empty folder records every registered migration. The helper checks the second: the rows left must be exactly the registered ones minus the never-ran ones.
- The removed-skillAccessMode fixtures model the latest release: current-shape trees with the removed key, and an Org still in its released shape that 29's startup conversion converts (its own comment, "slice 5"). The test asserts that the ledger left equals `released-migration-order.json`.

## Known Risks

- FU-001 (the Solution Designer's): 29's gate holds back every Org while a predecessor is not terminal. It is out of scope.
- FU-002: a Team has no acknowledgement to wait for, so a future Team test that reads the summary right after a restore could race the same way.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` (I-1b) plus test and documentation `Cleanup`
- Reviewed root-cause classification: `Missing Invariant` (I-1b); repeated coordination in the tests
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (the shared ledger helper only)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the inline ledger code in the two existing files is gone. "A root" is decided by an explicit field (`containedIn`), not by a failed lookup.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the cost test's now-unused `DatabaseSync` import)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes` (including Principle 17, new on 2026-11-23: no stored or exchanged shape changes, so it does not apply)
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (`team-root-memory-source.ts` is 79 lines)
- Notes, deviations from the design's file list or wording:
  1. **The root filter's file.** The design put it in `team-memory-explorer-service.ts`. It is in `team-root-memory-source.ts`, the class that reads each team run's tree and is documented as reading "stored root team runs". The service sees only the catalog's aggregates, with no tree and no `containedIn`. Only the team explorer reads `readRoot`; the Agents tab reads only `readCatalogEntries`. The behavior is as designed, for both lists.
  2. **The Team side of I-2.** The design said to wait for the acknowledgement of a Team's own `message_id`. The Team stream sends none for an accepted message (`agent-team-stream-handler.ts:181-214`: an `ERROR` only for a refusal). Adding one is a protocol change, so the Team wait is unchanged (FU-002). AC-003's case is an Org.
  3. **The rejected-acknowledgement rule.** As the design says, a rejected acknowledgement throws unless the run became active. An `ERROR` frame for an Org no longer ends the wait while the run is active: its acknowledgement still comes and is awaited.
  4. **Stale assertions in the collaborators test** described what the empty ledger did, not the migration. They were rewritten to the faithful outcome:
     - task-agent-own-run `SUCCEEDED_WITH_WARNINGS` with `PRESERVED_UNREADABLE_LOG`, caused by the rerun `20260701` projection, is now `SUCCEEDED` with no preserved warning;
     - the second start retried `20260521_run_history_index_v2` and rewrote the index; now a second start changes no file (`again.others` equals `after.others`).
  5. **A helper unit test** (`tests/unit/e2e-helpers/restore-by-member-message.test.ts`, a scripted stream server) is the deterministic reproduction of the race. A whole run cannot force it.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`

## Environment Or Dependency Notes

- **Run every server E2E, and `pnpm test --run` (it includes `tests/e2e`), in a clean environment** (TESTING.md "Clean environment elsewhere"): `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" …`.
  - An agent shell carries the live app's data, memory, database and package-root variables. From it, `memory-collaboration-graphql` lists the user's agents-repo definitions (IMP-14).
  - I ran some E2E files and one whole suite from the agent shell before noticing. I then checked the user's data folder, by names and change times only: no test-written file. Every result in this handoff that counts comes from a clean-environment run, or from a built-server file that spawns its server with a sanitized environment.
  - FU-003 proposes making the E2E setup safe by itself.
- Gated files need `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `RUN_CONTEXT_FILE_PROCESS_E2E=1`, or `RUN_ORG_CONVERSION_COST_E2E=1` (about 1.6 GB written).
- Built-server files need `pnpm -C autobyteus-server-ts build`. The Brief Studio files need `pnpm -C autobyteus-server-ts test:integration:prepare`.
- A passing file's `console.log` shows only with `--disableConsoleIntercept`, placed after the file paths.

## Checks Run

Environment for every row: macOS (Darwin 25.5.0), the worktree's Node and pnpm, synthetic data in temporary folders.
- "Clean env" means `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR"`.
- "Unit isolation" means the server's unit setup strips the environment itself.
- "Agent shell" means the inherited environment, with a built server spawned with its own sanitized environment.
- Evidence is in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | SR-016 at the base with `TMPDIR=/var/folders/…` | `dad158474c` | unit isolation | the SR-016 test | BEH-004 | Fail (reproduces) | `IMP-01-sr016-base-link-form.log` | "… is not inside /private/var/folders/…" |
| IMP-02 | SR-016 with the link form and with the real path | `36102a28f3` | unit isolation | the SR-016 test | BEH-004, AC-004 | Pass | `IMP-02-sr016-both-forms.log` | "Tests  4 passed (4)" twice |
| IMP-03 | The two upgrade files without the ledger (the base files) | base test files | agent shell | the startup on an empty ledger | BEH-001 | Fail (reproduces) | `IMP-03-ledger-negative-control.log` | "AgentOrg package is not admitted.", "2 failed (2)" |
| IMP-04 | collaborators-to-delegated-runs with the ledger | `36102a28f3` | agent shell | `faithful-upgrade-ledger.ts` | BEH-001, AC-001 | Pass | `IMP-04-collaborators-faithful-ledger.log` | the "migrations that ran on the start under test" list starts at `20261015_collaborators_to_delegated_runs_v1`; "1 passed (1)" |
| IMP-05 | removed-skillAccessMode with the ledger | `36102a28f3` | agent shell | the same | BEH-001, AC-001 | Pass | `IMP-05-removed-skill-faithful-ledger.log` | the list holds only `20261122_agent_org_units_*`; "1 passed (1)" |
| IMP-06 | append-only message logs (refactored onto the helper) | `36102a28f3` | agent shell | the same | BEH-001 | Pass | `IMP-06-append-only-refactored.log` | "2 passed (2)" |
| IMP-07 | The Org conversion cost (refactored; opt-in, `RUN_ORG_CONVERSION_COST_E2E=1`) | `36102a28f3` | clean env | the same | BEH-001 | Pass | `IMP-07-conversion-cost-refactored.log` | "1 passed (1)" |
| IMP-08 | The team-roots-only unit case, before and after the fix | `36102a28f3` | unit isolation | `team-root-memory-source.ts` | BEH-002, AC-002 | Fail, then Pass | `IMP-08-memory-unit-red-green.log` | red: `"engineering-team"` and `"writing-team", 2` received; green: "8 passed (8)" |
| IMP-09 | `memory-collaboration-graphql`; then with the base source | `36102a28f3` / base src | clean env | the Memory GraphQL lists | BEH-002, AC-002 | Pass; base Fail | `IMP-09-memory-e2e-clean.log` | "8 passed (8)"; base "expected 2 to be 1" |
| IMP-10 | The helper's unit test (a scripted stream server), new helper and base helper | `36102a28f3` / base helper | unit isolation | `restore-by-member-message.ts` | BEH-003, AC-003 | Pass; base Fail | `IMP-10-helper-unit-and-control.log` | "3 passed (3)"; base "expected false to be true" (resolved before the acknowledgement) |
| IMP-11 | The helper's users: 6 files, the gated two with their gates | `36102a28f3`, server rebuilt | clean env | the helper in real runs | BEH-003 | Pass | `IMP-11-helper-users.log` | "4 passed \| 2 skipped (6)", then the gated "4 passed (4)" and "1 passed (1)" |
| IMP-12 | `pnpm -C autobyteus-server-ts typecheck` | `36102a28f3` | agent shell | all server code and tests | all | Pass | `IMP-12-typecheck.log` | "production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)" |
| IMP-13 | The whole server suite, run 1 | `36102a28f3` | clean env | all | AC-003, AC-006 (local) | 20 failures in 9 files, every one the missing Brief Studio package | `IMP-13-whole-suite-run-1-excerpt.log` | "ENOENT … applications/brief-studio/dist/importable-package/…"; `scoped-org-history-graphql` ✓ |
| IMP-13b | `test:integration:prepare`, then the whole server suite, run 2 | `233f813d19` | clean env | all | AC-003, AC-006 (local) | Pass | `IMP-13b-whole-suite-run-2-excerpt.log` | "Test Files  1291 passed \| 192 skipped (1483)", "Tests  10008 passed \| 865 skipped"; `scoped-org-history-graphql` ✓ |
| IMP-14 | `memory-collaboration-graphql` from the agent shell (observation, not a check of the change) | `36102a28f3` / base | agent shell | — | FU-003 | Observed | `IMP-14-inherited-environment.log` | `expected 25 to be 1` (base 26): the user's agents-repo definitions |
| IMP-15 | Duplicate design case numbers | `36102a28f3` | file | `docs/design-cases.md` | BEH-005, AC-005 | Pass | `IMP-15-design-case-numbers.log` | an empty duplicate list; "Cited as Case 26 …", "Cited as Case 27 …" |

- IMP-04 to IMP-06 ran from the agent shell. Those three files start the built server with an environment they build themselves, and they pass again in the clean whole runs (IMP-13, IMP-13b).
- Not run, and why: `agy-runtime-stop-recovery-live` needs a live AGY CLI; it is left to API/E2E.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no web change. The Memory page's Agent Teams list gets less data from the same API; its layout is the approved 554 one.

## Downstream Coverage Hints / Suggested Scenarios

- AC-003 asks for `scoped-org-history-graphql` passing in two whole server E2E runs (done: IMP-13 and IMP-13b, two clean whole runs; worth repeating once more under load).
- AC-006 (delivery): the whole suites on the final state.
- The Memory page on a node with an Org whose Team unit has memory: the unit is under its Org, not under Agent Teams (SCN-002).
- TESTING.md (its owner): a rule that a startup test of a migration places released data on a faithful ledger (`faithful-upgrade-ledger.ts`), never on an empty one. This is the local check for the problem this ticket found (FU-003 of 615).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The rendered Memory page journey above, if you want it beyond the GraphQL E2E.
- `agy-runtime-stop-recovery-live` (a live AGY CLI) uses the helper for an Org and a Team. It was not run here.
