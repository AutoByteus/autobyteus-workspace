# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements / investigation notes / solution record / design spec / design review / architecture review record / implementation handoff / implementation record / code review report / code review record: see `api-e2e-coverage-investigation.md` → Investigation Meta (same folder).
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: **not created**. This round produced no completed validation result (see below). The first completed round will create `API-REV-001`.
- Current API/E2E Revision ID: `N/A`
- Current Execution Round: 1 (**stopped before completion**)
- Trigger: `/code_reviewer` Pass, CRR-001, for commit `bd8450984`
- Stop reason: on 2026-09-24, `/solution_designer` reopened the package as a Design Impact (CRR-003: CR-002 and CR-003) and asked API/E2E to stop validating `bd8450984` and keep its evidence. SR-004, implementation and source review come first; then a new API/E2E round.
- Latest Authoritative Round: none completed

## Routing Classification

- Task size `Large`; architectural risk `High`; input route `Reviewed`; successful-output route `Code Review`.

## Latest Authoritative Result

- Result: **None. The round was stopped at coordinator direction; this is not Pass, Fail or Blocked.** No confidence score is assigned. Do not infer one from this report.
- Material finding for SR-004: **F-001** (below). It would have made this round a `Fail`.

## Finding F-001: org task-team members are listed as org member targets

- Scenario / AC: E2E-ORG-01, L-02; REQ-008 (member-selection rule), requirements Out of Scope ("Showing members of delegated task teams (task-team members). The Agent Teams rule excludes them, and it is kept for orgs."), AC-008.
- Mechanism:
  - `AgentOrgRootMemorySource.readRoot` keeps `located.configuredPlacement !== null`.
  - `AgentOrgExecutionTreeLocationService.toLocation` sets `configuredPlacement` from `index.getConfiguredPlacement(agent.address)`, which is keyed by address.
  - When an org delegates a task to a configured team (for example `/StudentStudyGroup`), its task-team members (`executionKind: "task_team_member"`) share the configured members' addresses. They therefore get a non-null placement and are listed.
  - This is the design's escalation trigger: "the org tree shape does not support the configured-placement rule".
- Why existing tests miss it: the unit fixture in `agent-org-memory-explorer-service.test.ts` puts the task team at an unconfigured address (`/review_squad`). The readiness validator would never admit that package, because a task record's recipient must be configured. The unit exclusion test therefore passes for a reason that cannot occur in admitted data.
- Durable evidence: `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`. The test "lists org runs with address-path labels and own run IDs, excludes task-team members…" fails:
  - The admitted fixture org delegates to its configured `/engineering` team.
  - Its task-team member `gql-org-a-1-task-team-designer` is listed.
  - The run's `lastUpdatedAt` is `2026-09-01T04:00:00Z`; expected `03:00` (the task-team member's file).
- Real-data evidence: temporary scripts `/tmp/api-e2e-memory-team-view/org-kinds.mjs` and `org-impact.mjs`, run against an APFS copy of `~/.autobyteus/server-data/memory`.

| Execution kind | Listed | Not listed |
| --- | --- | --- |
| `configured` | 75 | 138 (no memory) |
| `task` | 1 | 0 |
| `task_team_member` | **22** | 8 |

  - All 22 listed task-team members are in nested-classroom-test runs, as repeated `StudentStudyGroup/student_*` entries.
  - Org card counts (`orgRunCount`, `memberMemoryCount`) do not change, and no run is listed only because of them.
  - The implementation handoff's claim "5 `student_one` task instances listed with distinct run IDs" describes task-team members, not task instances.
- Preliminary classification: `Design Impact`. The design prescribes the configured-placement rule for orgs, and its own escalation trigger fired. The fix is bounded: select by execution kind, which excludes `task_team_member`. The unit fixture also needs correcting. Recommended owner: `/solution_designer` for SR-004; the code reviewer confirms failure origin when the next round runs.

## Evidence Collected Before The Stop

| Case | Result | Evidence |
| --- | --- | --- |
| R-01 memory GraphQL e2e | New file 7/8 pass, 1 fail (F-001); existing `memory-explorer`, `memory-view`, `memory-sync-api` pass; `memory-sync-multiprocess` fails (pre-existing, listed in the handoff) | vitest run in the ledger |
| R-02 server suites (`agent-memory`, `agent-org-execution`, `api/graphql/types`, `skill-improvement`, `application-orchestration`, `integration/agent-memory`) | 62/63 files; 312/314 tests. The 2 failures are the pre-existing `application-execution-event-journal-recovery` tests | ledger |
| R-03 `tsc -p tsconfig.build.json --noEmit` | Pass. The new e2e file has no diagnostics under `tsconfig.json` | ledger |
| R-04 web memory specs | 12 files / 46 tests pass | ledger |
| L-01 live timing, built backend (`pnpm dev`) over a full APFS copy of the live memory dir | teams 0.14–0.18 s; SE team runs 0.12–0.15 s; orgs 0.017–0.020 s; sources 0.018 s (all ≤ 2 s). **Caveat:** the first copy had reset mtimes, so content and order from that run are not valid evidence. Timing is independent of that | `/tmp/api-e2e-memory-team-view/*-{1,2,3}.json` |
| L-02 REQ-004 equivalence, base `40b1783f4` vs `bd8450984`, in-process on the same frozen, mtime-preserving copy | Team list identical; SE runs identical (367 runs, same order, 0 field differences); 6 team searches identical. Time: base 48.9 s / 48.0 s / 320 s → new 1.3 s / 0.18 s / 1.1 s | `/tmp/api-e2e-memory-team-view/probe/out-{base,new}.json`, `time-*.json` |
| Browser journeys B-01…B-03 | Not Tested (stopped after the Memory home loaded) | — |

## Open Items Carried To The Next Round

- **O-001:** team-root admission count differs by execution mode.
  - The running built server listed **302** SE runs (385 of 535 team roots admitted). 150 roots are rejected by the base's unchanged readiness rules; 142 fail with "communication messages has unsupported or missing field(s)".
  - The in-process probe listed **367** for both base and new code.
  - The user's live v1.4.78 app showed about 365 at investigation time.
  - So both codes agree in-process. The open question is whether the new code, run as a server, admits fewer roots than the old code does as a server. Verify old-server vs new-server on the same copy before concluding REQ-004 for the running app.
- CR-001 observation (transient empty state) is still to be done in the browser.
- The imported-source org empty state is available in real data (`imports/docker-node-1` has no `agent_orgs`); it was exercised only in the GraphQL e2e.
- The nested team run ID fallback (REQ-005) cannot occur for admitted stored Team V2 roots, because Team V2 has no configured nested teams. It stays unit-covered only.

## Durable Coverage Changed In The Codebase

- Added (uncommitted, kept for the next round): `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`. It covers team and org list/runs/member views through the schema with admitted packages: the imported source, a corrupt-after-admission skip, a non-admitted root, and task instances. Its task-team exclusion assertion encodes REQ-008 and currently fails on F-001.
- Removed: none.

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| `pnpm dev` stack (:8000/:3000), both starts | Mine | SIGINT to `run-dev.mjs` | Closed cleanly; ports free |
| Browser tab | Mine | Closed | Done |
| Base worktree `/tmp/api-e2e-memory-team-view/base` | Mine | `git worktree remove --force` + prune | Removed |
| `autobyteus-server-ts/tests/probe-tmp/` | Mine | Deleted | Removed |
| Memory copy `<worktree>/.autobyteus/development` | Mine | Deleted | Removed; the live dir was only read |
| User's AutoByteus app (:29695) | Not mine | Not touched | — |
| Evidence under `/tmp/api-e2e-memory-team-view/` | Mine | Retained | Logs, JSON results, scripts |
