# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project`
- Coverage investigation: `tickets/in-progress/remove-create-or-update-project/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/remove-create-or-update-project/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/remove-create-or-update-project/api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple suites and a real-app session. TESTING.md "Rerun by impact" requires each case with the commit it last passed on.
- Validated commit for this round: `4807095aed` (unless a row says otherwise)
- Last updated: 2026-10-18

Evidence paths are relative to `tickets/in-progress/remove-create-or-update-project/evidence/api-e2e/`.

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BUILD | server build, nuxt prepare | — | build | as investigation | 0 | |
| UNIT-CHG | three changed unit files + MCP unit folder | AC-001..003 | vitest | `vitest run …` | 1 | |
| TYPECHECK | src | — | tsc | `typecheck` | 2 | |
| AC004-GREP | references | AC-004 | git | `git grep` | 2 | |
| UNIT-ALL | unit suite | regression | vitest | `test:unit` | 3 | |
| E2E-PROJECTS | projects folder, scripted AGY gate | AC-003, regression | real server | clean env + gate | 4 | |
| WEB-TSL | team-status-live probe | REQ-006 | browser + backend | `test:e2e:team-status-live` | 5 | |
| WEB-PMU, WEB-TCT | regression probes | regression | browser + backend | probe scripts | 6 | |
| RES-PROBE-SRC, RES-PROBE-PKG | resolution probe | AC-001, AC-002 | worktree / packaged server | split ticket probe | 7 | |
| APP-OLD-MIXED, APP-OLD-ALONE, APP-NEW | scripted real-app journeys | AC-002, AC-003, AC-006 | isolated packaged instance, AGY | `app-journey.mjs` | 8 | |
| REAL-OLD-MIXED, REAL-OLD-ALONE, REAL-NEW | Haiku 5.5 journeys | AC-002, AC-006 | same, Claude Agent SDK | same | 8 | |
| NATIVE-LAUNCH | AutoByteus-runtime launch of the old-listed agent | AC-002 | same | same | 8 | if the launch resolves tools without inference |
| UI-PICKER | picker names | AC-001 | renderer + GraphQL | browser automation | 9 | |
| DOC-REVIEW | release note, docs | AC-004, AC-005 | review | read | 9 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BUILD | 06:05 | Completed | build + nuxt prepare | exit 0 | exit 0 | Pass @4807095aed | server-build.log, nuxt-prepare.log | — |
| 2 | UNIT-CHG | 06:10 | Completed | 3 changed files + `tests/unit/agent-tools/mcp` | pass | 10 files, 173 tests | Pass @4807095aed | unit-changed.log | — |
| 3 | TYPECHECK | 06:11 | Completed | `typecheck` | exit 0 | exit 0 | Pass @4807095aed | server-typecheck.log | — |
| 4 | AC004-GREP | 06:11 | Completed | `git grep -n create_or_update_project -- ':!tickets'` | only REQ-004 allowances | resolver + runtime-parity skip tests, exact-set test, migration fixture (DEC-002), `.github` notes (DEC-004) | Pass @4807095aed | ac004-grep.txt | — |
| 5 | UNIT-ALL | 06:20 | Completed | `test:unit` | pass | 720 files, 5841 passed, 7 gated skips | Pass @4807095aed | server-unit-full.log | — |
| 6 | RES-PROBE-SRC | 06:14 | Completed | split ticket's resolution probe on the worktree server | only new tools; old name skipped with warning, 0 errors | as expected | Pass @4807095aed | resolution-probe-worktree.txt | — |
| 7 | E2E-PROJECTS | 06:16 | Completed | clean env, `RUN_AGY_FAILURE_E2E=1`, full folder | all pass | 17/18 files; `task-copy-idle-lifetime` fails: org wake `accepted:false` (code hidden by assertion) | Fail | server-e2e-projects-agy.log | find the cause (Rule 9) |
| 8 | TCIL-DIAG alone | 06:22 | Completed | the file alone + temp wake print | — | passes; all 3 wakes DELIVERED | Info | tcil-diag/run-1.log | needs folder load |
| 9 | TCIL-DIAG full | 06:33 | Completed | full folder + temp wake print | — | fails differently: agent root `TypeError: fetch failed` to its own server; org/team wakes DELIVERED | Info | tcil-diag/full-run-2.log | look for a shared cause |
| 10 | TCIL-DIAG instrumented | 06:46 | Completed | full folder + temp scan/loop instrumentation | — | passed this time; 90 scans over 1 s (max 2.07 s, 14–15 pids). The synchronous scan blocks the in-process server | Info | tcil-diag/full-run-3-instrumented.log | cause: test's sync `pgrep`+per-pid `lsof` scan |
| 11 | TCIL-FIX alone | 06:58 | Completed | async batched scan + diagnostics | pass | 1 passed | Pass | tcil-diag/fixed-alone.log | committed as a baseline fix |
| 12 | E2E-PROJECTS (fixed) ×2 | 07:22 | Completed | full folder twice at `c740d16b3c` | all pass | 18/18 files, 88 passed, both runs | Pass @c740d16b3c | server-e2e-projects-agy-fixed-{1,2}.log | — |
| 13 | WEB-TSL | 07:35 | Completed | `test:e2e:team-status-live` | 7/7 | 7/7; cleanup complete | Pass @c740d16b3c | probe-tsl/ | — |
| 14 | WEB-PMU | 07:58 | Completed | `test:e2e:project-manager-ux` | 25/25 | 25/25; cleanup complete | Pass @c740d16b3c | probe-pmu/ | — |
| 15 | WEB-TCT | 08:20 | Completed | `test:e2e:task-closure-tree` | 16/16 | 11/16: BR-012..014 "continued coordinator conversation" timeout; BR-015/016 need them | Fail | probe-tct/ | find the cause |
| 16 | TCT-DIAG BR-012 | 08:35 | Completed | BR-012 alone + temp center dump | — | the conversation shows `New Task assigned to you: prototype-launch-…-3` (Task key); the probe expects the taskId | Info | tct-diag/br012-alone.log | stale after task-keys REQ-018 |
| 17 | WEB-TCT (fixed) | 08:55 | Completed | full probe with keyed expectations | 16/16 | 16/16; cleanup complete | Pass @d1796f010d | probe-tct-2/ | committed `d1796f010d` |
| 18 | RES-PROBE-PKG | 09:05 | Completed | resolution probe on the packaged worktree server | only new tools; old name skipped with warning | as expected; 0 errors | Pass @d1796f010d | resolution-probe-packaged.txt | — |
| 19 | APP-* / REAL-* / NATIVE-LAUNCH | 07:40 UTC | Completed | `iso-50482-7d19`, scripted AGY + Claude Agent SDK `haiku` + AutoByteus `claude-haiku-5-5` (no message) | per investigation | 7/7; old name `Unknown MCP tool`; native skip warning in the instance log | Pass @d1796f010d | app/journey/, app/instance-log-excerpt.txt | — |
| 20 | UI-PICKER | 07:42 UTC | Completed | GraphQL `availableToolNames` + Create Agent form | no old tool | Task Management lists 7 tools without the old one | Pass @d1796f010d | app/picker-available-tool-names.json, app/ui-tool-picker-task-management.png | instance stopped, data root removed |
| 21 | DOC-REVIEW | 07:44 UTC | Completed | release-notes.md; docs diff | removal announced; docs without the old tool | as expected | Pass | release-notes.md | — |

## Re-entry And Reconciliation

- Last durably recorded event: 21
- Last completed case and result: DOC-REVIEW Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Rerun-by-impact basis for a later round: compare against the commit in each row's Result column.
- Reconciled into execution coverage report: `Yes`. See §Test-Case Ledger Reconciliation.
- Reconciled into execution coverage report: `No`
