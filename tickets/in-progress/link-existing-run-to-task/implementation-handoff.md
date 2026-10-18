# Implementation Handoff — Withdraw Adoption (SR-018)

Ticket: link-existing-run-to-task (Project Task `autobyteus-11`). Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption`, branch `codex/withdraw-adoption`, base
`origin/personal` `2b04a9971d`. Code commit: `ffeea43dac`.

The adoption handoffs of IR-001..IR-004 are superseded; they are summarized in `implementation-revision-record.md`
and kept in the branch history.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / Low removal, direct implementation (no architecture
  review selected). Implementation routes to API/E2E.
- Requirements doc: `requirements-doc.md` "Removal Requirements" RM-001..RM-004
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-018)
- Design spec: `design-spec.md` "Removal Plan (current)"
- Supplemental task artifacts: `withdrawn-adoption-contract.md` (record only); `handoff-implementation-withdraw.md`
- Design review report: `N/A — not applicable` (no independent review selected for SR-018)
- Architecture review revision record: `N/A — not applicable` (as above)
- Triggering rework report: N/A. The user's rule, passed on by the Solution Designer during the round: remove all
  adoption logic; keep any fix in the merge that is useful on its own, listed below with its evidence; ask only when
  unclear.

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption/tickets/in-progress/link-existing-run-to-task/`.

## Current Implementation Summary

Merge `4e738acc66` (adoption, IR-001..IR-004) is reverted on product paths. `delegate_task {target_*_run_id,
task_id}` on a run that is not one of the delegator's delegated runs is refused as before adoption ("`<id>` is not one of
your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with
recipient_address."). Every later ticket's change is kept, and three of the merge's fixes that are useful without adoption
are kept (see Kept Fixes). The ticket folder stays as the record.

- Implementation cycle: `Rework` (removal)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revision IDs: `SR-018`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Removal Plan (current)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change is one merge's 50 product files, with three conflicts resolved by removing only adoption lines.
  - Behavior returns to the shipped pre-adoption baseline, with no persisted data (RM-003) and no new contract.
  - The kept fixes are already shipped, tested code.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (the conflict resolutions were
  checked against each later ticket's own version, every kept fix was checked with and without it, and the adoption
  identifiers were compared with the pre-merge tree)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| RM-001 | Every adoption change of `4e738acc66` removed; the pre-adoption refusal is back | Reverse diff on product paths. Removed: the adoption owner and run facts (`hand-started-run-adoption.ts`, `hand-started-runs.ts`, `standalone-root-adoption.ts`), the own-file shape, the lifecycle branch, the queue kind, the error code, the port methods, the Task-side assignment, revert and calls, the catalog row removal and readmission, the composition wiring, the agent-facing texts, the adopted-run message, the docs, the ADO e2e tests, the fixtures and the unit tests; web rule 1 of the sidebar rule | Done. The adoption identifiers' hit set equals the pre-merge tree (IMP-09). The refusal is pinned by CPW-R3 (IMP-04) |
| RM-002 | Later tickets' changes kept | The conflicts are resolved by removing adoption lines only. `task-agent-own-files.ts` is byte-identical to append-only-message-logs' own version (`f6bf477c3f`). The web streaming service keeps autobyteus-139's `change_sequence_through` and delegated-copies-slow-open's comment; its spec keeps autobyteus-139's batch test. `agentRunCollaborationLazyChildren.spec.ts` keeps its ticket's test minus the SR-009 rule-1 assertion added at merge time (its ticket version `291545c66f` had none) | Done. Server and web suites green (IMP-02, IMP-03, IMP-05) |
| RM-003 | No migration | None written | N/A |
| RM-004 | Ticket folder kept; release notes say adoption was withdrawn | Ticket folder untouched by the code commit | Delivery |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Kept Fixes (useful without adoption)

| Fix | What it fixes | Evidence |
| --- | --- | --- |
| Sidebar: a run that left the server history leaves its own group (`autobyteus-web/stores/runHistoryRetiredRuns.ts`, its calls in `runHistoryLoadActions.ts` and `runHistoryNavigationStoreActions.ts`; SR-009 rule 2) | An open run deleted or archived **outside this window** (another app window, the phone client through remote access, another instance on the same data) stayed in this window's sidebar until restart. It now leaves at the next history read (the sidebar re-reads every 5 s) and comes back if a read lists it again. Agent history's per-agent window is respected, so a run that newer runs merely pushed out of the listing stays. Local archive and delete were already immediate (`cleanupStoredTeamRunLocalState` / `cleanupStoredRunLocalState`) and are unchanged. Rule 1 (retire on `task_execution_started`) and its `onTaskExecutionStarted` hook are removed: without adoption a new copy is never a top-level context | IMP-10: the four cases pass ("drops an open agent run and an open team run once a later read no longer lists them, and shows them again if listed"; the window case; never-listed; archive). Rule 1's test is removed. Wording no longer mentions adoption (store doc, spec comments, `docs/agent_execution_architecture.md`) |
| Token usage: the live run summary claims the observation's current root (`autobyteus-server-ts/src/token-usage/services/token-usage-run-accumulator.ts`, from `f5001b65c6`) | The stored record keeps `rootTeamRunId = null` once it has seen more than one root (legacy or migrated data). The live summary then claimed `null`, and a Team root's presentation rejects that and fail-stops the root (`collaboration-agent-presentation-adapter.ts:165-166`). Now it claims the root the run reports. For normal data (a single root) the output is identical | IMP-08: the regression test, rewritten to that case, passes with the fix and fails without it. Quote: `AssertionError: expected null to be 'team-b'` (accumulator from `4e738acc66^1`). The comment no longer mentions adoption |
| `TESTING.md`: give the temp `HOME` its resolved path | On macOS `/var` is a symlink to `/private/var`; the terminal e2e compares the shell's `$PWD` with `HOME`, so an unresolved temp `HOME` fails it | Unchanged from base (excluded from the reverse diff); the line was general testing guidance, not adoption |

Reverted although behavior-neutral, as the Solution Designer decided: the size-driven extractions
`agent-run-history-catalog-state.ts` and `existing-run-assignments.ts`. The files are back to their shipped structure:
`agent-run-history-catalog-service.ts` has 499 effective lines and `project-task-service.ts` 498 (with later tickets' additions).

## Key Files Or Areas

Server: `agent-collaboration/execution/task/*` (lifecycle, queue, input, port, delegation command), standalone root
(root, builder, collaborators, adapter), `projects` (resource service, domain, release, Project and Task services),
run-history catalogs and own files, compositions, docs (`projects.md`, `collaboration_model.md`), tests and fixtures.
Web: `agentRunCollaborationStore.ts`, the streaming service, `runHistoryRetiredRuns.ts`, four specs, and
`docs/agent_execution_architecture.md`.

## Important Assumptions

- "Product paths" means everything outside the ticket folder, except `TESTING.md` (kept fix 3).
- A later ticket's test that asserted adoption behavior counts as adoption (the LazyChildren assertion); the rest of
  that test is kept.

## Known Risks

- None known. The release notes of the next release must say the beta's adoption feature was withdrawn (RM-004).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Removal
- Reviewed root-cause classification: N/A (withdrawal by the user)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the open question (general fix or adoption-only) was settled by the Solution Designer during the round.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (rule 1's state, action and test mock; the adoption imports in the resolved files)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (the files are back to their shipped sizes)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (RM-003: no run was ever adopted on a known install)
- Implementation follows the approved decision: `Yes`

## Environment Or Dependency Notes

- New worktree: `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxi prepare`,
  `pnpm -C autobyteus-server-ts test:integration:prepare`.
- The commit was built from a temporary index containing only the product paths. The real index keeps the Solution
  Designer's staged move of the ticket folder (`tickets/done` → `tickets/in-progress`) untouched.

## Checks Run

All evidence is in `evidence/implementation/` in the ticket folder. Every check ran on content identical to `ffeea43dac`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | `ffeea43dac` | macOS 26.5.2, node v22.23.1 | all server source | RM-001, RM-002 | Pass | `IMP-01-server-typecheck.log` | `error TS count: 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit` | `ffeea43dac` | same | server unit (kept token test included) | RM-001, RM-002 | Pass | `IMP-02-server-unit.log` | `727 passed`, `5933 passed` |
| IMP-03 | `test:integration:prepare` then `test:integration` | `ffeea43dac` | same | server integration | RM-002 | Pass | `IMP-03-server-integration.log` | `77 passed`, `415 passed` |
| IMP-04 | Clean env (`env -i`, resolved temp `HOME`), `RUN_AGY_FAILURE_E2E=1`, scripted AGY CLI; `collaboration-prompt-wording`, `task-existing-copy-assignment`, `task-reactivation-root-visibility` e2e | `ffeea43dac` | same | `delegate_task` refusal and existing-copy paths, reverted e2e harness | RM-001 | Pass | `IMP-04-withdraw-refusal-e2e.log` (excerpt), `.full.log` | `CPW-R3 Agent root: catalogue results …` ✓; `24 passed \| 3 skipped` (the same as IR-002's pre-merge-shape run) |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run` | `ffeea43dac` | same | web | RM-001, RM-002 | Pass | `IMP-05-web-unit.log` | `636 passed`, `4508 passed` |
| IMP-06 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `ffeea43dac` | same | web | RM-002 | Pass | `IMP-06-web-guards.log` | three `exit 0` |
| IMP-07 | web `tsc --noEmit -p .nuxt/tsconfig.json`, with and without the change | `ffeea43dac` / `2b04a9971d` | same | web types | RM-001 | Pass (parity) | `IMP-07-web-typecheck-parity.log` | `668` both (environmental) |
| IMP-08 | token accumulator test with the kept fix, and with the accumulator from `4e738acc66^1` | `ffeea43dac` | same | kept fix 2 | Kept fix 2 | Pass / Fail as expected | `IMP-08-token-root-fix-with-without.log` | `4 passed`; without: `expected null to be 'team-b'` |
| IMP-09 | `git grep` of the adoption identifiers and texts at `4e738acc66^1` and `ffeea43dac`, compared | `ffeea43dac` | — | whole tree outside tickets | RM-001 | Pass | `IMP-09-adoption-symbol-search.log` | `RESULT: identical hit set` (9 = 9) |
| IMP-10 | `runHistoryStore.spec.ts -t 'left the history'` | `ffeea43dac` | same | kept fix 1 | Kept fix 1 | Pass | `IMP-10-sidebar-rule2.log` | four ✓, `4 passed` |

- Not run, and why: the whole server e2e suite and browser probes are left to API/E2E. Only the three refusal-pinning
  e2e files ran here. No rendered check was run (see below).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the Workspaces sidebar. The code removed (rule 1) only acted on adopted runs, which can no longer
  exist; the kept rule 2 is unchanged from the shipped code.
- Rendered check: not run in this round. No visual or interaction code changed. Rule 2's rendering was checked in
  IR-004 (`evidence/implementation/IR-004-adoption-sidebar-check/`, rule 2 via a history read). Remaining uncertainty:
  none beyond IR-004's.

## Downstream Coverage Hints / Suggested Scenarios

- `delegate_task {target_agent_run_id | target_team_run_id, task_id}` from a PM on a run the user started: refused
  with the pre-adoption text ("`<id>` is not one of your task agents. …"); nothing written.
- Follow-up and reactivation of a PM's own copies are unchanged (existing e2e).
- The sidebar: delete or archive an open run from a second window or client; it leaves the first window's group
  within one history read.
- The whole e2e suite and web probes as usual for a revert of this size.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E sign-off on the removal: the full server e2e, web tests, the guards, and the scenarios above.
