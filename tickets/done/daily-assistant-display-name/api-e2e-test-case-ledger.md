# API/E2E Test-Case Ledger — daily-assistant-display-name

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name`
- Coverage investigation: `tickets/in-progress/daily-assistant-display-name/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/daily-assistant-display-name/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/daily-assistant-display-name/api-e2e-revision-record.md`
- Ledger scope and reason it is required: several independent live cases, including a multi-phase upgrade with real model calls and backend restarts
- Last updated: 2026-10-05

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Template hash + v1 diff + production diff scope | AC-002 | file bytes | `shasum`, `diff`, `git diff --stat` | 1 | |
| R-02 | Server built-in identity + adjacent suites | AC-001/002/003, BEH-003 | server vitest | see investigation | 2 | |
| R-03 | Changed web specs + chat components | AC-001, AC-004 | web vitest | see investigation | 3 | |
| R-04 | Residual "General Agent" grep | AC-004 | repo | `git grep` | 4 | |
| R-05 | Server build | AC-002 (dist copy) | build | `prebuild && build` | 5 | |
| C01 | Fresh root seeds Daily Assistant, hash, single definition, tools/skillScope | AC-001, AC-002 | live HTTP GraphQL + files | chat-entry-live `--cases C01,C02,C13` | 6 | |
| C02 | Landing → Chat, New chat defaults | SCN-001 | browser | same run | 7 | |
| C13 | Restart lifecycle: edited prompt overwritten, deleted config restored, identity restored | AC-003 | process restart | same run | 8 | |
| U-01 | Old build: "General Agent" state + real chat | AC-003 setup | old-build backend + browser + Codex | upgrade probe | 9 | |
| U-02 | Upgrade restart: name/hash/single definition; old history row unchanged | AC-001/002/003 | live GraphQL + files | upgrade probe | 10 | |
| U-03 | Agents page shows Daily Assistant | AC-001 | browser | upgrade probe | 11 | |
| U-04 | Old run keeps its label, reopens and accepts a follow-up | AC-003 | browser + runtime | upgrade probe | 12 | |
| U-05 | New Chat run captures Daily Assistant; the agent self-identifies | AC-001, AC-002/BEH-002 | browser + runtime | upgrade probe | 13 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 2026-10-05 | Completed | shasum/diff/git diff | hash `49ed6e90…07b7`; diff lines 2, 7 only | as expected; config unchanged; production diff = template, registry, 2 comment files | Pass | console (report) | — |
| 2 | R-05 | 2026-10-05 | Completed | `pnpm -C autobyteus-server-ts prebuild && build` | exit 0 | exit 0; bootstrap smoke passed | Pass | `api-e2e-evidence/server-build.log` | — |
| 3 | R-02 | 2026-10-05 | Completed | server vitest (4 dirs) | in-scope files pass | 22/23 files passed; the 1 failure is out-of-scope `agent-packages-graphql.e2e.test.ts` (GitHub 404). The isolated rerun gives the same result | Pass (scope) | `api-e2e-evidence/server-focused-vitest.log`, `server-agent-packages-rerun.log` | noted as pre-existing |
| 4 | R-03 | 2026-10-05 | Completed | web vitest 6 specs + components/chat | pass | 14 files / 83 tests passed | Pass | `api-e2e-evidence/web-focused-vitest.log` | — |
| 5 | R-04 | 2026-10-05 | Completed | `git grep "General Agent"` | only intentional | role, history notes, old-state fixtures, `/general_agent` sender spec | Pass | console (report) | — |
| 6 | C01 | 2026-10-05 | Completed | `pnpm -C autobyteus-web test:e2e:chat-entry-live --cases C01,C02,C13 --output-dir <ticket>/api-e2e-evidence/chat-entry-live` | GraphQL name Daily Assistant, `ALL_INSTALLED`, installed == dist template, hash `49ed6e90…`, one definition | as expected; role General Agent; instructions line 1 = approved sentence | Pass | `api-e2e-evidence/chat-entry-live/chat-entry-live-evidence.json` | — |
| 7 | C02 | 2026-10-05 | Completed | same run | `/`→`/chat`, New chat defaults | as expected; no page errors | Pass | same + `C02-new-chat-1440.png` | — |
| 8 | C13 | 2026-10-05 | Completed | same run (2 backend restarts) | edited prompt overwritten, deleted config restored, identity restored | as expected; restored name Daily Assistant | Pass | same + `backend-restart-*.log` | cleanup: all processes stopped, root removed |
| 9 | U-01..U-05 | 2026-10-05 | Completed (attempt 1) | `node <ticket>/api-e2e-evidence/upgrade-probe/upgrade-probe.mjs` | all pass | U-01, U-02, U-04, U-05 Pass. U-03 Fail at the probe's launch-form model click (it looked for option text `opus`, but the form listed Codex models). The card assertions before that step had passed. This is a harness defect, not product behavior | Fail (harness) | `api-e2e-evidence/upgrade-probe/out-attempt1/` | fixed the probe selector (first listed option) and added the launch-form name and runtime recording; rerun the whole probe |
| 10 | U-01 | 2026-10-05 | Completed (attempt 2) | upgrade probe | old build seeds General Agent; a real chat captures `agentName: General Agent` | name General Agent, app-data sha `d410e6f6…`, run `general_agent_9be8…` on `claude_agent_sdk`/`opus`, reply `UPGRADE-OLD-OK`, row agentName General Agent | Pass | `api-e2e-evidence/upgrade-probe/out/upgrade-evidence.json`, `U-01-old-build-chat.png` | — |
| 11 | U-02 | 2026-10-05 | Completed (attempt 2) | upgrade probe: restore HEAD dist (hash-verified), restart on the same root | Daily Assistant, new hash, one definition, history byte-identical | as expected; role General Agent; no definition named General Agent | Pass | same | — |
| 12 | U-03 | 2026-10-05 | Completed (attempt 2) | upgrade probe: `/agents`, card Run → launch form → Run Agent | card title Daily Assistant (no General Agent card), form names Daily Assistant, draft title `New - Daily Assistant` | as expected | Pass | same, `U-03-agents-page.png`, `U-03-new-draft-title.png` | — |
| 13 | U-04 | 2026-10-05 | Completed (attempt 2) | upgrade probe: `/chat?id=<old run>` + follow-up | the old run opens with its conversation, accepts a follow-up and keeps its label | `UPGRADE-OLD-OK` visible; `UPGRADE-RESUME-OK` reply; same run id; row still General Agent; 2 user turns in the projection; tree `GA General Agent (1)` | Pass | same, `U-04-old-run-resumed.png` | — |
| 14 | U-05 | 2026-10-05 | Completed (attempt 2) | upgrade probe: New Chat "What is your name?" | answer `NAME=Daily Assistant`; row agentName Daily Assistant | as expected; tree `DA Daily Assistant (2)` | Pass | same, `U-05-new-chat-name.png` | cleanup: processes stopped, dist restored (true), root removed |

## Re-entry And Reconciliation

- Last durably recorded event: 14 (U-05)
- Last completed case and result: U-05 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: the upgrade probe ran twice. Attempt 1 is preserved in `out-attempt1/` (harness selector defect in U-03); attempt 2 is authoritative.
- Reconciled into execution coverage report: `Yes`, `api-e2e-execution-coverage-report.md` "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: none
