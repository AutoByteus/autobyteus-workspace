# API/E2E Coverage Investigation — `remove-nested-task-team`

## Investigation Meta

- Requirements Doc: `tickets/in-progress/remove-nested-task-team/requirements-doc.md` (SR-006)
- Investigation Notes / Solution Revision Record: `.../investigation-notes.md`, `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md`; Supplemental Task Artifacts: None
- Design Review Report / Architecture Review Revision Record: `.../design-review-report.md`, `.../architecture-review-revision-record.md` (ARCH-REV-002 Pass)
- Implementation Handoff / Revision Record: `.../implementation-handoff.md`, `.../implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report / Revision Record: `.../code-review-report.md`, `.../code-review-revision-record.md` (CRR-001, CRR-002 pass 9.3/10)
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created with the first result); Current API/E2E Revision ID: `N/A`
- Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1; Trigger: `code_reviewer` CRR-002 pass (commits `065430dd61`, `66c61595d2`, `4ec3dd9eb3`, `cbecdc076d`; base `db00ba16a9`)

## Routing Classification

- Task size `Large`; Architectural risk `High`; Input route `Reviewed`; Successful-output route `Code Review` (proportional test-code review); test-code review decision `Required`.

## Current Requirement And Design Basis

Removal of the team-inside-a-team representation (server records, runtime nodes, contracts, web) plus one containment rule: a cross-run standalone scan skips an unreadable collaboration tree with a warning naming the run (DESIGN.md rule 7). To prove: AC-002 (containment), AC-003 (organization teams and delegation — including task teams delegated inside task teams — behave as before, through views, stop/restore, status, Settings, Token Meter, Task pages), AC-004 (web build, tests, localization), AC-001 by repository evidence (search + typecheck, done by implementation and review; rechecked), AC-005 documentation (review).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (delegate to a team), SCN-002 (unreadable standalone tree, explicit edge scenario), SCN-003 (open runs and views).
- Added from the implementation: SCN-003a delegation forest — a member delegates a task team whose member delegates a task team (and an agent) — through stop → reopen, because restoration and the stop set were rewritten (`task-team-node-restoration.ts`, `delegated-stop-set.ts`, `delegated-launch-selection.ts`); SCN-002a the Token Meter's cross-run lookup (`token-usage-stats.ts` also builds a `StandaloneRootLocationService`).
- Not tested (Technically Possible but Unsupported): SCN-004 (creating a team inside a team), the retired v1.4.53–v1.4.69 shape itself (DEC-008: no install holds it).

## Changed Surface And Boundary Classification

| Surface | Affected | Changed boundary | Repository evidence | Not exercised by it | Candidate broader mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | records, parser, indexes, mutators, restore, stop set, launch selection, runtime team node, standalone scan | unit 5716, integration | real roots building a delegation forest, stop/restore | server e2e (scripted AGY) |
| API / contracts | Yes | stream DTOs narrowed; GraphQL views | contracts tests | real snapshots of forests | server e2e |
| Frontend | Yes | history tree, team panels, run settings, memory groups | web 4381; 3 probes | live data from a real server | probes + desktop |
| Desktop renderer | Yes | same as frontend | none | real app with real runs | isolated instance, branch vs base |
| Persisted data | Yes (no migration) | unreadable standalone tree contained | unit test; implementer's real-app check | GraphQL consumers incl. Token Meter, data made by real roots | server e2e |
| Desktop shell, auth, workers, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team`; TESTING.md (root) read; clean env for e2e (`env -i PATH HOME=<tmp> TMPDIR`), scripted AGY (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs`); isolated desktop instances on owned data roots; never the user's app or `~/.autobyteus`.
- Runtimes: structure-only change, no model behavior in scope → the scripted AGY actor (real tools, real roots, no inference) is the right driver; the user's judging runtimes (Claude Sonnet, DeepSeek flash) are not needed for AC-002/003. Codex is out of usage (until 2026-10-22).
- Build: `pnpm install`, `prebuild`, `build`, `nuxt prepare` done (exit 0).

## Existing Durable Coverage Inventory

| Path | Intent | Decision |
| --- | --- | --- |
| removed `run-history/nested-team-history-restart.e2e.test.ts` | v1 team run with configured sub-teams (retired shape) | `Stale / Remove` — valid (fails identically on the base: evidence log) |
| removed `runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | live team with a configured sub-team (retired shape) | `Stale / Remove` — valid; mixed runtimes in flat teams stay covered by `all-runtime-send-message-matrix` |
| removed web probes `nested-team-hierarchy`, `nested-team-aggregate-status` | configured sub-team rows / aggregate | `Stale / Remove` — valid (retired shape); delegated task-team rows are covered by `task-agent-peer-sidebar`, `task-closure-tree` |
| updated probes `task-agent-peer-sidebar`, `team-group-icon`, `background-agent-renderer-contention` | team tree rows | `Still Valid` after update — rerun |
| `tests/e2e/projects/*` (delegation, Task, collaboration suites), `tests/e2e/run-history/*`, `agent-team-runs/*`, `agent-org-runs/*` | delegation, views, history | `Still Valid` — run in a clean env |
| `standalone-root-location-containment.test.ts` (unit) | AC-002 scan rule with store-seeded trees | `Still Valid`; does not reach GraphQL consumers |
| probes `task-closure-tree`, `team-reload-member-freshness`, `agent-org-task-team-disclosure` | team/org tree rows, member freshness | `Still Valid` — run |

## Durable Coverage To Add

| Case | Behavior | Path | Why |
| --- | --- | --- | --- |
| DF-1..DF-3 | AC-003 delegation forest in a Team, an Agent and an Org root (Org: mounted team + its task-team copy delegating further); trees list agents only; stop → reopen keeps the forest; a restored deep task-team member answers by run id | `autobyteus-server-ts/tests/e2e/projects/delegation-forest-restore.e2e.test.ts` | restore / stop set / launch selection were rewritten; no e2e covered task teams inside task teams through stop/restore |
| UC-1 | AC-002 through GraphQL on data made by real roots: one host's tree truncated; file changes, member projection, Token Meter for the other runs work; the warning names the skipped run; opening the bad run errors; sha256 unchanged; a server restart starts with it present | `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | the unit test seeds the store directly and does not reach the GraphQL consumers |

## Durable Coverage To Update / Remove

None beyond the implementer's (validated above).

## Repository Coverage Execution Plan

1 contracts (2 packages) · 2 server typecheck · 3 server unit · 4 server integration · 5 web unit (full) + guards + localization search · 6 scripted e2e clean env: `projects`, `run-history`, `agent-team-runs`, `agent-org-runs` · 7 new DF/UC e2e · 8 probes: the 3 updated + `task-closure-tree`, `team-reload-member-freshness`, `agent-org-task-team-disclosure`.

## Test-Case Ledger Decision

Yes — many independent cases, long runs; `.../api-e2e-test-case-ledger.md`.

## Broader Validation Decision

`Required` — mode `Project Desktop Validation`: the implementation handoff states no live delegated task team was driven in the desktop app. Plan: isolated instances of this build and of the base build (`db00ba16a9`), the scripted AGY actor through a throwaway HOME shim, an Org run with a mounted team and its delegated task-team copy, and a Team run with a delegation forest; compare sidebar trees, status dots, stop → restart → restore, Settings (delegated copies), Token Meter and Task pages, branch vs base. Effect on the user's running app: none (own data roots and ports).
