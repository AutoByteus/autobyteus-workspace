# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load`
- Coverage investigation: `tickets/in-progress/memory-team-view-slow-load/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/memory-team-view-slow-load/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/memory-team-view-slow-load/api-e2e-revision-record.md`
- Ledger scope and reason: API-REV-001. Repository suites, a long dev-stack build, live timing and multi-step browser journeys. The run is long and could be interrupted.
- Last updated: 2026-09-24 (initialized)

## Planned Cases

| Case ID | Case / Journey | Req / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Memory GraphQL e2e (new + existing) | AC-003, 005…011 | In-process GraphQL schema | `pnpm exec vitest run tests/e2e/memory --no-watch` | 1 | New file `memory-collaboration-graphql.e2e.test.ts` |
| R-02 | Server unit/integration suites | AC-003, 006, 011 | Services | vitest | 2 | |
| R-03 | Server build typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 3 | |
| R-04 | Web memory specs | AC-004, 009, 010 | Web vitest | `pnpm test:nuxt … --run` | 4 | |
| L-01 | Live timing | AC-001, 002, 007; QR-001 | Built backend :8000 over the cloned real memory | curl | 5 | |
| L-02 | Live data correctness + read-only check | AC-007, 011 | Built backend | curl + jq | 6 | |
| B-01 | Teams journey SCN-001…003 + CR-001 | AC-004, 010 | Browser | Nuxt :3000 | 7 | |
| B-02 | Orgs journey SCN-004…006 | AC-004, 007…011 | Browser | Nuxt :3000 | 8 | |
| B-03 | Imported source org empty state; agent card | AC-004, AC-007 alt | Browser | Nuxt :3000 | 9 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | L-01 | 2026-09-24 10:28 | Started | `pnpm dev` (built backend :8000, Nuxt :3000); memory = APFS clone of `~/.autobyteus/server-data/memory` | — | Stack ready | — | `/tmp/api-e2e-memory-team-view/dev.log` | — |
| 2 | L-01 | 10:29 | Checkpoint | curl ×3 per query | ≤ 2 s | teams 0.14–0.18 s, SE runs 0.12–0.15 s, orgs 0.017–0.020 s | — | `/tmp/api-e2e-memory-team-view/{teams,se-runs,orgs}-*.json` | The first clone used `cp -cR` without `-p`, so mtimes were reset and every `latestMemoryAt` equaled the clone time. Timing is valid; content/order is not. Stack stopped; re-cloned with `cp -cRp` |
| 3 | L-02 | 10:30 | Checkpoint | Readiness diagnostics (`dist` RootRunPackageReadinessIndex) on the copy | Explain 302 vs ~365 SE runs | 385 team roots admitted, 150 not (142 "communication messages has unsupported or missing field(s)", 8 missing authorities); 19 orgs admitted. Base readiness rules (unchanged by this diff) | — | `/tmp/api-e2e-memory-team-view/readiness.mjs` | Base-vs-new equivalence probe on the same frozen copy started (temporary base worktree) |
| 4 | R-01 | 10:33–10:40 | Checkpoint | New `memory-collaboration-graphql.e2e.test.ts` | — | First fixtures were not admittable: the readiness validator requires a task record per task execution, and a task TeamRun's recipient must be configured. Fixtures reworked to realistic packages | — | — | Nested team run IDs cannot exist in admitted stored Team V2 roots; that fallback stays unit-covered only |
| 5 | R-01 | 10:40 | Completed (new file) | `pnpm exec vitest run tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts --no-watch` | 8/8 pass | 7 pass, 1 **fail**: org run `gql-org-a-1` lists the task-team member `gql-org-a-1-task-team-designer` (task execution of configured team `/engineering`); run `lastUpdatedAt` 04:00 instead of 03:00 | Fail | vitest output | Defect F-001 (below) |
| 6 | L-02 | 10:42 | Checkpoint | `/tmp/api-e2e-memory-team-view/org-kinds.mjs`, `org-impact.mjs` on the copy | Task-team members excluded (REQ-008; Out of Scope) | 22 `task_team_member` executions listed as org member targets (nested-classroom-test runs, `/StudentStudyGroup/student_*`); 0 org card counts change; 0 runs exist only because of them; only 1 real `task` instance is listed | Fail (F-001) | script output in the execution report | F-001 confirmed on real data |

| 7 | R-01 | 10:44 | Completed | `vitest run tests/e2e/memory` (also matched `tests/e2e/memory-sync`) | New + existing pass | New file 7/8 (F-001); existing memory e2e pass; `memory-sync-multiprocess` fails (pre-existing) | Fail (F-001) | vitest output | — |
| 8 | R-02 | 10:46 | Completed | Server unit/integration suites | Pass apart from pre-existing failures | 62/63 files, 312/314 tests; 2 failures = pre-existing `application-execution-event-journal-recovery` | Pass | vitest output | — |
| 9 | R-03 | 10:46 | Completed | `tsc -p tsconfig.build.json --noEmit` | 0 errors | 0 errors; the new e2e file has no diagnostics under `tsconfig.json` | Pass | — | — |
| 10 | R-04 | 10:47 | Completed | Web memory specs | Pass | 12 files / 46 tests | Pass | — | — |
| 11 | L-02 | 10:48 | Completed (equivalence part) | In-process base vs new on the frozen `cp -cRp` copy | Identical team output | Teams, SE runs (367) and 6 searches identical; base 48.9 s / 48.0 s / 320 s vs new 1.3 s / 0.18 s / 1.1 s | Pass | `/tmp/api-e2e-memory-team-view/probe/` | O-001: server listed 302 SE runs vs 367 in-process |
| 12 | B-01 | 10:41 | Started | Nuxt :3000 `/memory`, fetch counter installed | — | Memory home rendered with 3 tabs | — | — | Interrupted |
| 13 | — | 10:42 | Stopped | `/solution_designer` reopened the package (CRR-003 Design Impact) | — | Validation of `bd8450984` stopped; processes, tab, base worktree, probe files and memory copy cleaned up | — | execution report → Cleanup | Next round follows SR-004 |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 13 (stop)
- Last completed case and result: L-02 equivalence (Pass); R-01 Fail (F-001)
- Cases still running, interrupted, or not started: B-01 interrupted; B-02, B-03 not started; L-01 needs a rerun on an mtime-preserving copy for content; O-001 open
- Next case or recovery action: in the new round (after SR-004), rerun R-01…R-04, L-01, L-02 (incl. O-001 old-server vs new-server check), B-01…B-03
- Interruption note: round stopped at coordinator direction; no verdict
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` → "Evidence Collected Before The Stop"
