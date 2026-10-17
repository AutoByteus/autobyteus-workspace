# API/E2E Coverage Investigation — `delegated-copy-own-run-memory`

## Investigation Meta
- Requirements Doc: `requirements-doc.md` (SR-005 basis; SR-009 cumulative); supplement `memory-layout-contract.md` (revision 5, governs where it differs).
- Investigation Notes / Solution Revision Record: `investigation-notes.md`, `solution-revision-record.md` (SR-009).
- Design Spec: `design-spec.md`; Design Review / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-004 Pass).
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001, IR-002).
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (CRR-002 Pass, 9.3/10).
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result). Current API/E2E revision: none yet.
- Ledger: `api-e2e-test-case-ledger.md`.
- Round 1. Trigger: CRR-002 Pass. Commits under test: `8bbd081c8d`, `5a5359e707`, `6bcb206e4e`, `2f7f5b3f4b`; base `origin/personal` `66429d6f31`.

## Routing Classification
- Large / High. Input route: Reviewed. Successful-output route: Code Review (proportional test-code review). Test-code review decision: `Required`.

## Current Requirement And Design Basis
A task agent (a delegated Agent or Team copy) becomes a normal run:
- its memory and facts live in its own folder (`agents/<id>/` with a `taskAgent` section, or `agent_teams/<id>/` with its own tree and message log);
- the coordinating run keeps only links;
- messages follow the email model;
- deleting a run keeps its task agents (detached);
- the startup migration `20261017_task_agent_own_run_v1` moves existing data.

Critical criteria for this stage:
- AC-016: the real-app journey;
- AC-010: a migration step fails, the user keeps working, the next start completes;
- AC-012: delete keeps the task agents;
- AC-004 / AC-007 for migrated task agents;
- AC-020: earlier migrations still pending;
- and the regression surface of AC-006 / AC-008.

## Supported Scenarios And Real Usage
- SCN-001..SCN-008 from the requirements.
- Added from the implementation: SCN-007a, "upgrade a real released install". The data is written by the released build (the branch base `66429d6f31`, the version a user upgrades from), through real use with test-made runs. Then the branch build starts on the same app-data folder. That is the user's real upgrade path: real history index, real migration ledger, real runtime sessions.
- Not tested: downgrade (DEC-006, unsupported).

## Changed Behavior Summary
- Persistence layout of task agents in all three root families (placement, own files, links).
- G1 / G2 reader guards.
- Email-model message logs.
- Memory page attribution.
- Readiness check.
- Delete-confirmation text.
- Startup migration with frozen released readers (D-8, D-9).
- Version-free names (D-10).

## Changed Surface And Boundary Classification
| Surface | Affected | Repository evidence (implementer, reviewer) | Gap | Candidate mode |
| --- | --- | --- | --- | --- |
| Persisted data / migration | Yes | unit migration test on hand-built released fixtures (every shape, interruption, second start); built-server e2e collaborators → ours on a fresh ledger | no built-server run on a faithful ledger; AC-010 only at unit level; no real released install | built-server e2e + desktop upgrade |
| Domain / stores / placement | Yes | unit store and placement tests | real roots writing the new layout | scripted e2e suites |
| API / GraphQL / WebSocket | shapes unchanged | existing e2e suites | delete keeping task agents through the API (AC-012) | built-server e2e |
| Frontend | delete-confirmation text | component spec, localization | the rendered dialog | desktop |
| Desktop renderer | sidebar, Memory page, Settings over migrated data | none | all of AC-016 | isolated instance, released build → branch build |

## Project Execution Discovery
- TESTING.md (root) read, including rule 9 (find the cause; no base comparison by default) and "Rerun by impact".
- Instructions found:
  - built-server e2e pattern `tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts` (spawns `dist/app.js`);
  - the migration ledger is in SQLite, table `app_data_migration_records`;
  - the hand-built released fixture is `tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts`.
- Clean env for e2e; scripted AGY (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`); isolated desktop instances on owned data roots; credentials only through `pnpm secrets:import`.
- Serialize builds within this worktree. The implementer saw the test DB corrupted by concurrent suites.
- Builds done: install, prebuild, server build, nuxt prepare, integration prepare (all exit 0).

## Persisted Data Transition Coverage Basis
- Decision: `Migration Required` (contract §8).
- Proven so far: unit tests on hand-built released fixtures; built-server collaborators → ours on a fresh ledger. A fresh ledger makes released migrations rewrite current-shaped data, which is the known FU-2 / autobyteus-131.
- To add:
  - (a) A built-server start on a **faithful ledger**: the earlier migrations recorded as completed and ours never run. Built by a first start of this build on an empty root, then deleting only our ledger row (`node:sqlite`), then writing the released-shape data.
  - (b) AC-010 at app level.
  - (c) A real released install upgraded in the desktop app (SCN-007a).

## Existing Durable Coverage Inventory
| Path | Intent | Decision |
| --- | --- | --- |
| `tests/unit/app-data-migrations/.../task-agent-own-run-v1-app-data-migration.test.ts` | every shape, interruption, second start, F-RERUN-MSG, F-PENDING-FAILED | Still Valid; run |
| `task-agent-own-run-stores`, `task-agent-message-logs`, `agent-memory-explorer-task-agents`, `memory-sync-task-agent-layout` (unit) | D-1, D-3, D-4, D-5, AC-018 | Still Valid; run |
| e2e `collaborators-to-delegated-runs-startup` | F-PENDING path through the built server | Still Valid; run |
| e2e projects/run-history/memory/workspaces/agent-team-runs/agent-org-runs | delegation, restore, history, Memory page | Still Valid; first validation of a wide persistence change, so the whole server e2e runs once (clean env) |
| Updated tests in the handoff's impact inventory (AC-019) | layout moved to L1 | reviewed by code review; run |

## Durable Coverage To Add
| Case | Behavior | Path | Why |
| --- | --- | --- | --- |
| TAU-1 | AC-011 / AC-008 / AC-006 through the built server on a faithful ledger: the migration completes, every task agent at L1 with identical bytes, the hub / team / org open with their task agents through GraphQL, a second start changes nothing | `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | the unit test calls the migration directly; no built-server run on a real ledger |
| TAU-2 | AC-010: one coordinating run's move fails (its task agent folder cannot be renamed), the app starts and the other runs work, the user keeps working, then the next start completes | same file | only unit-level pieces exist |
| TAU-3 | AC-012: deleting a migrated hub removes only its folder; its task agents' folders stay with all files and are not listed | same file | only the explorer unit test exists |
| TAU-4 | AC-004: waking a migrated task agent by its delegator's message restores it from its own folder | same file, scripted AGY with the fixture's runtime set to the scripted CLI | migrated wake not covered |

## Repository Coverage Execution Plan
1. Contracts. 2. Server typecheck. 3. Server unit. 4. Integration. 5. Web and guards. 6. The whole server e2e, clean env, scripted AGY. 7. The new TAU e2e. 8. Probes that read task-agent rows: task-closure-tree, team-status-live, task-agent-peer-sidebar, agent-org-task-team-disclosure.

## Test-Case Ledger Decision
Yes: many independent and long-running cases. `api-e2e-test-case-ledger.md`, each case with the commit it passed on.

## Broader Validation Decision
`Required`, mode Project Desktop Validation (AC-016, the team rule). Plan:
1. Build the released base app (`66429d6f31`) and the branch app.
2. Start the base app as an isolated instance on an owned data root and import credentials via `pnpm secrets:import`.
3. Create real runs with your runtimes (Claude Agent SDK Haiku 5.5, AutoByteus DeepSeek v4 flash):
   - an Agent hub delegating an Agent and a Team, with context files and file changes;
   - a Team run whose member delegates;
   - an Org run delegating its mounted team's copy.
4. Stop the base app. Start the branch build on the same data root, which runs the migration.
5. Check:
   - sidebar unchanged;
   - open the hub and its task agents (conversation, file changes, context files);
   - a Settings model edit of a stopped task agent;
   - waking a migrated task agent;
   - Memory page Agents list;
   - delete the hub: its task agents' folders are kept and not listed;
   - a second start changes nothing (ledger and file hashes).

## Not Tested / Deferred
- Downgrade (DEC-006).
- The size of real data (DEC-013: shapes, not size).
