# API/E2E Test-Case Ledger — delegated-copy-model-change

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change` (branch `codex/delegated-copy-model-change`)
- Coverage investigation: `tickets/in-progress/delegated-copy-model-change/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/delegated-copy-model-change/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/delegated-copy-model-change/api-e2e-revision-record.md`
- Scope: API-REV-001; repository suites, a multi-case server E2E, a browser probe and an isolated desktop instance.
- Last updated: 2026-10-13

## Planned Cases

| Case ID | Case | AC / REQ | Surface | Entry point | Order |
| --- | --- | --- | --- | --- | --- |
| BASE-001 | SR-011 architecture guard failing on the base | TESTING.md Rule 9 | Repository | `vitest run tests/architecture` | 0 |
| REPO-001 | Server typecheck + unit | all | Repository | `typecheck`, `test:unit` | 1 |
| REPO-002 | Contract packages | DTO fields | Repository | `pnpm -C autobyteus-*-stream-contracts test` | 2 |
| REPO-003 | Web unit + guards | web | Repository | `test:nuxt --run`, guards | 3 |
| DCM-001..004 | Existing E2E (Team, Agent roots) | AC-001, AC-002, AC-003, AC-005, AC-006, AC-009, AC-011 | Server E2E | `delegated-copy-model-change.e2e.test.ts` | 4 |
| DCM-005 | Org root: agent copy, Team copy, collaborator; live event; later copy | AC-001, AC-002, AC-007, DEC-001 | Server E2E | same | 4 |
| DCM-006 | Mid-turn interrupt, nested copy, others keep running; followers vs own model; never-started members | AC-002, AC-003, AC-004, DEC-008 | Server E2E | same | 4 |
| DCM-007 | Woken during edit; invalid settings; Team stream event; provider refusal at resume, recovery in the same conversation | AC-011, AC-006, REQ-008 | Server E2E | same | 4 |
| REG-001 | Earlier delegation E2E suites | preserved | Server E2E | five suites | 5 |
| REG-002 | Server integration | preserved | Repository | `test:integration` | 6 |
| DCP-001 | Agent root UI (implementer) | AC-001, AC-002, AC-004 | Browser probe | `test:e2e:delegated-copy-model-change` | 7 |
| DCP-002 | Team root UI: sidebar Stop of a Team copy, Team model, "+" from the copy lead, resume | AC-002, AC-003, IR-002 | Browser probe | same | 7 |
| DCP-003 | Org root UI: Settings-row Stop, Org sidebar icon, Save, resume | AC-001, AC-002 | Browser probe | same | 7 |
| DCP-004 | UI refusal when woken during the edit; backend restart persistence | AC-011, AC-005 | Browser probe | same | 7 |
| DLP-001..010 | Earlier ticket's UI cases (shared Settings rows) | preserved | Browser probe | full probe | 8 |
| ISO-001 | Real runtimes in an isolated desktop instance: a Codex copy stopped, switched and resumed in its thread; AutoByteus capacity refusal | design step 6, AC-006 | Isolated desktop instance | `isolated-app start --build` | 9 |

## Execution Events

| # | Case | Event | Command / configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BASE-001 | Completed | `vitest run tests/architecture/application-framework-boundaries.test.ts -t SR-011` | find the cause | stale since base `9777af682c`: migrations use `File*DefinitionProvider` (guard wanted `DefinitionPersistenceProvider`); `agent-package-service.ts` has one singleton call (guard listed two). Test-only fix committed `aaf6f010f1`; architecture suite 44/44 | Pass (fixed) | console | — |
| 2 | REPO-001..003 | Completed | serialized chain | exit 0 | typecheck 0; unit 686 files / 5424 tests; contracts 16/16, 27/27; web 615 files / 4291 tests; guards 0/0/0 | Pass | `api-e2e-evidence/*.log` | — |
| 3 | DCM-001..007 | Completed | clean env, scripted AGY + fake Grok (`cancel`) | 5/5 | 5/5 in 18 s | Pass | `server-e2e/dcm-run-1.log` | repeat |
| 4 | DCP-001..004 | Checkpoint | probe run 1 | 4/4 | DCP-001, DCP-003 pass; DCP-002 (sidebar Team-row selector) and DCP-004 (refusal shown in the Settings banner, not the Save bar) failed on test assumptions | — | `browser-probe-run-1/` | fixed checks |
| 5 | DCP-002, DCP-004 | Completed | probe run 2 | 2/2 | 2/2; "+" from the copy lead prefills "Gemini test"; refusal "This copy is running. Stop it, then change its model."; after the backend restart the row shows the choice and the copy resumes on it | Pass | `browser-probe-run-2/` | full chain |
| 6 | DCM, REG-001, REG-002, full probe | Completed | background chain | all pass | DCM 5/5 (run 2); earlier suites 3, 2+1 skip, 3, 1, 7+1 skip; integration 371 pass, 2 fail = TESTING.md known exception; full probe 14/14 | Pass | `server-e2e/`, `server-integration.log`, `browser-probe-full-run-1/` | ISO-001 |
| 7 | ISO-001 | Completed | `iso-63395-445e` (worktree build); key file imported into the instance DB; definitions via GraphQL; browser-automation attach-only; recorded | real switch and resume; capacity refusal | Codex copy: locked with the hint while running, Stop in Settings, runtime locked, `gpt-5.6-luna` → `gpt-6-luna` saved, user's message resumed it: same thread `01a1351b-…`, ledger `gpt-6-luna` (2 reports); native copy `deepseek-v4-flash`: 7 non-offered models refused with the capacity message, nothing recorded, menu lists only the 27 eligible; ~$0.006 | Pass | `isolated-instance/iso-0*.png`, `iso-journey.mp4`, `ledger.txt` | instance stopped, data root and vault removed |

## Re-entry And Reconciliation

- Last durably recorded event: 7
- Cases still running or not started: none
- Interruption note: none
- Reconciled into execution coverage report: `Yes`
