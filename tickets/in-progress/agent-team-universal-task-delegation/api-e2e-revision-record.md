# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / CRR-003 / round 1 | SR-009, ARCH-REV-005, IR-003, CRR-003 | N/A | Fail / 71.3% |
| API-REV-002 | `code_reviewer` / CRR-006 / round 2 | SR-009, ARCH-REV-005, IR-005, CRR-006 | Fail / 71.3% | Fail / 76.6% |
| API-REV-003 | `code_reviewer` / CRR-008 / round 3 | SR-009, ARCH-REV-005, IR-006, CRR-008 | Fail / 76.6% | Fail / 81.0% |
| API-REV-004 | `code_reviewer` / CRR-010 / round 4 | SR-009, ARCH-REV-005, IR-007, CRR-010 | Fail / 81.0% | Fail / 80.1% |
| API-REV-005 | `code_reviewer` / CRR-013 / round 5 | SR-009, ARCH-REV-005, IR-009, CRR-013 | Fail / 80.1% | Fail / 93.3% |

## Revision Entries

### API-REV-001 — Current-contract repository baseline exposes delegate schema regression

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md`; initial API/E2E round
- Triggering finding or scenario IDs: API-F-001 / API-UTD-SCHEMA-001
- Related revisions: SR-009, ARCH-REV-005, IR-003, CRR-003
- Why recorded: first completed API/E2E result; repository execution found a critical provider-facing contract contradiction before live execution.
- Coverage decisions or durable test paths changed: current RootTeamRun/V1/current-aggregate coverage was updated; deleted-owner/composite-identity coverage was removed or marked stale; exact paths are in the canonical investigation and `current-durable-delta-paths.txt`.
- Scenarios rechecked: fail-stop/FIFO/persistence; task delegate/submit/revise/accept; task Agent and task AgentTeam; nested delegation; exact address negatives; WS selection; restore; memory/history/streaming/current UI aggregate.
- Commands/environment delta: repository Vitest only against repository test DB; no secret import, live server, provider, browser, operational DB, or protected-port action.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 71.3%`
- New failure IDs: API-F-001 / API-UTD-SCHEMA-001
- Recommended recipient: `code_reviewer` for focused failure-origin review
- Remaining risks: incomplete stale-test currentization; all checked-disposable provider/browser/mobile/restart/cleanup and full UC/AC mapping remain pending after correction.


### API-REV-002 — Prior schema fixed; required Team migration seams fail current inputs

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / CRR-006; API/E2E round 2.
- Triggering finding/scenario IDs: prior API-F-001; new API-F-002 / API-UTD-MIGRATION-002 and API-F-003 / API-UTD-MIGRATION-003.
- Related revisions: SR-009, ARCH-REV-005, IR-005, CRR-006.
- Why recorded: API-F-001 was rechecked and resolved, then the pre-adjudicated broad currentization exposed two required registered production migration failures before live work.
- Coverage decisions/durable paths changed: current native/MCP Team context/router/send/message seams and current V1 migration fixtures were updated; no product compatibility behavior was added.
- Scenarios rechecked: exact absolute/universal delegate schema and three-provider prompt parity; bound `send_message_to`; root-owned communication reservation/commit; current Team native/external snapshot classification; predecessor member-tree conversion/idempotence.
- Commands/environment delta: repository Vitest only, with its repository test DB and `mkdtemp` memory roots. No secret import, live server, provider, browser, operational database, or protected-port action.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 / API-UTD-SCHEMA-001 | implementation Local Fix | Resolved; exact current provider/schema/prompt selection passes 6 files / 51 tests. | `api-e2e-evidence/api-rev-002/repository/api-f001-postfix-provider-schema-prompt.log` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.
- Prior result/confidence: `Fail / 71.3%`.
- Current result/confidence: `Fail / 76.6%`.
- New failure IDs: API-F-002 / API-UTD-MIGRATION-002; API-F-003 / API-UTD-MIGRATION-003.
- Recommended recipient: `code_reviewer` for focused failure-origin review.
- Remaining risks: incomplete cumulative durable-package currentization/review; builds; checked-disposable secret/package import; AutoByteus/Codex/Claude Team and standalone; complete browser/mobile/restore/restart/cleanup and UC/AC accounting.

### API-REV-003 — Migration seams fixed; current navigation projection invents a duplicate root Team row

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / CRR-008; API/E2E round 3.
- Triggering findings/scenario IDs: prior API-F-002/API-UTD-MIGRATION-002 and API-F-003/API-UTD-MIGRATION-003; new API-F-004/API-UTD-UI-004.
- Related revisions: SR-009, ARCH-REV-005, IR-006, CRR-008.
- Why recorded: the two prior required migration failures were directly closed, broad affected server and currentized frontend selections advanced, and a current V1 navigation projection test plus rendered DOM evidence exposed a new critical UI hierarchy contradiction.
- Coverage decisions/durable paths changed: currentized frontend streaming, Team workspace, mobile/history, hydration, navigation, and Team-run store fixtures; removed obsolete test-only execution owners; no runtime compatibility behavior or production source was added by API/E2E.
- Scenarios rechecked: current/predecessor migrations; affected server root/task/message/memory/history/API seams; current Team streaming/workspace/mobile/history/store; exact V1 root/configured-Agent/task-Agent navigation projection.
- Commands/environment delta: repository Vitest/Nuxt only. No secret import, Agent-package import, live server, provider, browser, operational database, vault, or protected-port action.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-002 / API-UTD-MIGRATION-002 | implementation Local Fix | Resolved; exact post-fix migration selection passes and clean affected server aggregate is green. | `api-e2e-evidence/api-rev-002/repository/api-f002-f003-postfix-focused.log`; `server-affected-units-broad-postfix-clean.log` |
| API-F-003 / API-UTD-MIGRATION-003 | implementation Local Fix | Resolved by the same direct selection, including predecessor/current transition coverage. | same evidence |

- New failure: API-F-004 / API-UTD-UI-004.
- Expected: one root Team container with configured Agent placement and active task Agent grouped beneath that logical placement.
- Observed: `transient_execution:team:team-a` is invented ahead of the stable Agent and task Agent because the root projected execution has no stable match and is classified as `task_team_child`.
- Exact focused result: `1 failed / 5 passed` in `stores/__tests__/runHistoryNavigationProjection.spec.ts`.
- Failure evidence: `api-e2e-evidence/api-rev-003/failure/api-f004-root-navigation-duplication-analysis.md`, `api-f004-navigation-projection-focused.log`, and `api-f004-source-origin-audit.log`.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.
- Prior result/confidence: `Fail / 76.6%`.
- Current result/confidence: `Fail / 81.0%`.
- Recommended recipient: `code_reviewer` for focused failure-origin review.
- Remaining risks: source correction/recheck; production builds; complete checked-disposable classroom/nested-classroom AutoByteus/Codex/Claude Team and standalone; browser/mobile; migration/reopen; restore/recovery; cleanup; explicit UC-001–UC-021 and AC-001–AC-056 accounting; successful proportional review of the cumulative durable package.

### API-REV-004 — Navigation fixed; checked-disposable production startup recursively overflows before listen

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / CRR-010; API/E2E round 4.
- Triggering findings/scenario IDs: prior API-F-004 / API-UTD-UI-004; new API-F-005 / API-UTD-STARTUP-005.
- Related revisions: SR-009, ARCH-REV-005, IR-007, CRR-010.
- Why recorded: API-F-004 was directly closed, the current durable server/web selections and production builds passed, and the first checked-disposable built-server launch exposed a critical production construction cycle before listen.
- Coverage decisions/durable paths changed: currentized retained history, memory, active-context, focused-interrupt, run-configuration, member-override, selection, token, run-open/recovery, navigation and current DTO fixtures; did not restore retired identities or compatibility behavior. The cumulative dirty durable package remains incomplete and unreviewed on this Fail.
- Scenarios rechecked: exact V1 history/navigation hierarchy; changed server/web owners; production builds; sanitized disposable target; fresh SQLite migrations; authorized isolated secret import; built startup readiness.
- Commands/environment delta: checked runtime root and database at `api-rev-004-live-20260815-1`; ports 60309/31309; ambient DB variables removed; 21 Prisma migrations and nine named secret credentials only in the disposable vault; no operational database or protected-port action.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-004 / API-UTD-UI-004 | implementation Local Fix | Resolved; exact current store selection passes 2 files / 8 tests and nine-file history/navigation/component aggregate passes 9 files / 114 tests without duplicate root projection. | `api-e2e-evidence/api-rev-004/repository/history-nine-currentized.log` |

- New failure: `API-F-005 / API-UTD-STARTUP-005`.
- Expected: current built server finishes startup migration processing and listens on the checked disposable port.
- Observed: before listen, `AgentToolMcpSessionService` construction reaches Task delegation -> TeamRunService -> AgentRunManager -> CodexThreadBootstrapper and re-enters the still-unassigned AgentToolMcpSessionService singleton until `RangeError: Maximum call stack size exceeded`.
- Exact evidence: `api-e2e-evidence/api-rev-004/environment/safe-server-stack-diagnostic.log`; `api-e2e-evidence/api-rev-004/failure/api-f005-safe-startup-recursive-construction-analysis.md`; `api-e2e-evidence/api-rev-004/failure/api-f005-source-cycle-audit.log`.
- Cleanup: exact owned runtime/database/key/WAL/SHM/journal removed; owned and protected ports absent; operational database action `NONE`; no repair or rollback.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.
- Prior result/confidence: `Fail / 81.0%`.
- Current result/confidence: `Fail / 80.1%`.
- Recommended recipient: `code_reviewer` for focused failure-origin review.
- Remaining risks: source correction and startup recheck; package import; AutoByteus/Codex/Claude Team and standalone; universal delegation/message/submit/review; browser/mobile; reopen/restore/recovery; cleanup rerun; explicit UC-001–UC-021 / AC-001–AC-056 live accounting; proportional review of the cumulative durable package after an overall Pass.

### API-REV-005 — Startup and real task lifecycles pass; Codex Team rejects a native tool log

- Triggering role/report/round: `code_reviewer`; `code-review-report.md` / CRR-013; API/E2E round 5.
- Related revisions: SR-009, ARCH-REV-005, IR-009, CRR-013.
- Triggering prior scenario: API-F-005 / API-UTD-STARTUP-005.
- New finding: API-F-006 / API-UTD-CODEX-EVENT-006.
- Why recorded: the prior startup failure was directly closed, real Agent/AgentTeam/provider/browser execution proceeded, and the required Codex Team row exposed a strict production event-admission mismatch.
- Durable coverage changed in this revision: none. Ticket-evidence orchestration scripts are not repository-resident durable coverage. The cumulative prior dirty package remains unreviewed on Fail.
- Environment delta: fresh checked runtime root `api-rev-005-live-20260815-1`; disposable SQLite DB/key; ports 60310/31310; ambient DB variables removed; nine secrets and the user-authorized Agent package imported only into the disposable target; all owned resources removed after execution.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-005 / API-UTD-STARTUP-005 | implementation Local Fix | Resolved downstream. Fresh built server completed migration startup, listened on 60310, and PID `lsof` named only the exact disposable DB. | `api-e2e-evidence/api-rev-005/environment/startup-recheck.log`; `safe-server-ready.json`; `server-pid-lsof.log` |

#### Real-System Results Before Stop

- The normal package API imported 7 shared Agents, 57 Team-local Agents, and 14 AgentTeams from the authorized package.
- AutoByteus, Codex, and Claude each executed a real task Agent delegate -> submit -> exact delegator accept lifecycle with one exact accepted durable record.
- AutoByteus classroom and Codex/Claude disposable Teams proved exact ordinary Team messages; AutoByteus proved a file-backed request/reply loop; Codex additionally created a real nested task Team and nested child task Agent.
- AutoByteus, Codex, and Claude each completed a standalone Agent turn with exact persisted output.
- Real Chrome proved one task count/details, a distinct indented transient task Agent row, exact task AgentRun focus, three Team messages, and file-reference presentation for the active classroom row.
- The initial fixture omitted configured submit/review tools; API/E2E corrected only the disposable definitions through the public update API and fresh runs then passed. That observation is an API/E2E fixture correction, not a product finding.

#### New Failure

- Expected: a real Codex tool-output/log event satisfies the current strict Team event shape and preserves normal stream completion.
- Observed: the valid Codex Team formal lifecycle durably reached `accepted`, but the same Team WebSocket emitted terminal `TEAM_AGENT_EVENT_ADMISSION_FAILED: Rejected TOOL_LOG: tool_name is required`; coordinator `TURN_COMPLETED` was not observed.
- Preliminary origin: `codex-raw-response-event-converter.ts` creates a `TOOL_LOG` for completed `functioncalloutput` with no `tool_name`, while the strict `team-agent-event-adapter.ts` correctly requires it.
- Exact analysis: `api-e2e-evidence/api-rev-005/failure/api-f006-codex-team-tool-log-admission-analysis.md`.
- Safety cleanup: exact owned runtime/database/key/WAL/SHM/journal and ports 60310/31310 are absent; operational database and protected-port process action `NONE`.
- Prior result/confidence: `Fail / 80.1%`.
- Current result/confidence: `Fail / 93.3%`.
- Recommended recipient: `code_reviewer` for focused failure-origin review.
- Remaining work after correction: recheck Codex Team tool-log admission first; finish mobile-equivalent UI, process reopen/restore/repair, remaining explicit UC-001–UC-021 / AC-001–AC-056 rows, and proportional review of the cumulative durable package after an overall Pass.

### API-REV-006 — IR-010 Codex correlation closes the last live defect; complete current matrix passes

- Triggering role/report: `code_reviewer`, CRR-015.
- Related revisions: cumulative SR-009 / ARCH-REV-005 / IR-010 / CRR-015.
- Prior finding: `API-F-006 / API-UTD-CODEX-EVENT-006`.
- Authoritative result: **Pass / 98.3%**.
- Prior result: API-REV-005 **Fail / 93.3%**.
- Finding disposition: API-F-006 resolved downstream; no new API/E2E product finding.
- Fresh defect recheck: real Codex Team task Agent delegate -> exact submission -> exact delegator acceptance, coordinator `TURN_COMPLETED`, zero ERROR frames, zero `TEAM_AGENT_EVENT_ADMISSION_FAILED`.
- Additional real execution: imported AutoByteus Classroom exact file-backed professor/student roundtrip; real 390x844 mobile message/reference open-close before and after reopen; process stop/reopen; explicit restore; stable V1 tree/tasks/messages; no duplication; restored desktop accepted-task view.
- Retained current evidence: API-REV-005 real AutoByteus/Codex/Claude Team and standalone rows and Codex nested task Team, whose implementation/runtime state is unchanged outside the freshly rechecked Codex event seam.
- Repository evidence: 66 server files / 327 tests Pass; 66 web files / 472 tests Pass; exact Codex 7 files / 136 tests Pass; server and Nuxt production builds Pass.
- UC/AC accounting: UC-001–UC-021 and AC-001–AC-056 Pass; no required row remains Not Tested.
- Durable package: 164 paths = 11 added / 122 updated / 31 removed; 132 active changed tests Pass; zero missing relative imports; zero active skip/only/todo; exact inventory/patch match and reverse apply Pass.
- Safety: supported secret import only into checked disposable target; exact PID/database proof; exact owned cleanup; operational database inspection/action NONE; protected 60004/31004 action NONE; incident disclosure preserved.
- Routing: `code_reviewer` for mandatory proportional review of the cumulative durable package before delivery.
