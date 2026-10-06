# API/E2E Test-Case Ledger — mention-candidates-in-run

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Scope: repository suites, gated wire E2E, live browser probe on Claude, human-style desktop journey (en + zh-CN)
- Last updated: 2026-10-06

## Planned Cases

| Case ID | Case | REQ / AC | Surface | Command / Entry | Order |
| --- | --- | --- | --- | --- | --- |
| R-00 | Source typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 1 |
| R-01 | Contracts note tests | AC-004, AC-005 | node test | `pnpm -C autobyteus-agent-presentation-contracts test` | 2 |
| R-02 | Focused server suites | AC-001..003, AC-006 | Vitest | see investigation | 3 |
| R-03 | Web specs | AC-005, AC-007, AC-008 | Vitest (Nuxt) | see investigation | 4 |
| R-04 | prebuild + build | — | dist | `prebuild`, `build` | 5 |
| R-05 | Gated `ad-hoc-task-delegation` (extended with in-run `@`) + `task-closure-root-visibility` | AC-001..004, AC-006 | real HTTP/WS/GraphQL, scripted AGY | gated vitest | 6 |
| L-CLAUDE | Updated live probe | AC-001..008 | browser + built backend + Claude | `test:e2e:cross-scope-agent-mentions --runtime claude_agent_sdk` | 7 |
| H-DESKTOP | Human-style desktop journey (reported scenario; en + zh-CN copy) | AC-001, AC-003, AC-007, AC-008 | isolated packaged app | `isolated-app start --build` + browser-automation | 8 |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 17:13 | Completed | contracts test | 12/12 | 12/12 | Pass | `api-e2e-evidence/logs/R-01-contracts.log` | — |
| 2 | R-00 | 17:13 | Completed | typecheck | exit 0 | exit 0 | Pass | `logs/R-00-typecheck.log` | — |
| 3 | R-02 | 17:14 | Completed | focused server suites (147 files) | pass except baseline | 146/147 files, 1122/1123 tests. Only `org-owned-team-local-agent.test.ts` (1 test) fails, and it fails identically on base `f48dbfbf3` (temp base worktree: 1 failed / 17 passed) | Pass (baseline failure only) | `logs/R-02-server-focused.log` | — |
| 4 | R-03 | 17:15 | Completed | web specs (138 files) | pass except baseline | 137/138 files, 1195/1196 tests. Only `workspaceSelectionComposition.spec.ts` (1 test, Org published-input focus; unrelated to mentions/copy) fails, and it fails identically at base `f48dbfbf3` (main superrepo checkout at that commit: 1 failed / 6 passed) | Pass (baseline failure only) | `logs/R-03-web.log` | — |
| 5 | R-04 | 17:12 | Completed | prebuild + build | exit 0 | exit 0 | Pass | `logs/R-04-prebuild-build.log` | — |
| 6 | R-05 | 17:18 | Checkpoint | gated, shell env | — | 6/6 pass, but the test server read the user's agent-package roots: the shell profile exports `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. Read-only: no `aht-*` written there; the recent changes in those repos are other agents' package work | — | — | rerun without the variable |
| 7 | R-05 | 17:22 | Completed | gated, `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` | 6/6 | 6/6. Candidates: agent root excludes its own definition and lists the in-run collaborator; Team root excludes the Team and lists its configured members; Org lists members, not the Org. In-run `@` note has the suffix and guidance (collaborator, and configured member `/worker`); collaborators unchanged; the not-in-run note has neither. Cleanup clean | Pass | `logs/R-05-gated.log`, `R-05/` | — |
| 9 | L-CLAUDE | 18:15 | Completed | full run | all Pass | 19 Pass / 0 Fail / 2 N/A (L01/L02 AGY-only). S01: the host messaged the existing collaborator after the in-run `@`; T01 lists the researcher and writer; F01 notice "Couldn't mention …". Cleanup clean, no browser errors | Pass | `L-CLAUDE/`, `L-CLAUDE-ledger.md` | — |
| 10 | H-DESKTOP | 18:20–18:40 | Completed | `isolated-app start --build` (`iso-61627-e021`), driven like a user, Claude `haiku`, UI-created agents and team | AC-007 menu; reported scenario; zh-CN copy | All steps Pass (see report); instance stopped, data root removed, ports released; video compressed to 1.5 MB, original in ~/Downloads | Pass | `H-desktop/` | — |
| 8 | L-CLAUDE | 17:30 | Started | full run, probe updated (T01/O01/P01/N03 stale exclusions corrected; copy checks; S01 reported scenario; F01 notice copy) | — | — | — | `L-CLAUDE/`, `L-CLAUDE-ledger.md` | — |

## Re-entry And Reconciliation

- Last durably recorded event: seq 10
- Cases still running or not started: none
- Reconciled into execution coverage report: `Yes`
