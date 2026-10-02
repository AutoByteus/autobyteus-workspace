# API/E2E Test-Case Ledger — agent-initiated-collaborators

- Investigation: `api-e2e-coverage-investigation.md` (round 1)
- Branch `codex/agent-initiated-collaborators` @ `2dfbd1843`; base `84224a58d`
- Evidence folder: `api-e2e-evidence/`

## Planned Cases

| Case ID | Surface | Scenario / AC | Runtime(s) | Status |
| --- | --- | --- | --- | --- |
| RC-01 | repo server (affected suites) | all changed units | — | Completed |
| RC-02 | repo web (collaborators, stores, workspace) | AC-011 selectors | — | Completed |
| RC-03 | repo contracts ×3 | DTO `source`, note parser | — | Completed |
| RC-04 | base comparison (`/tmp/aic-base`) | pre-existing failures | — | Completed |
| LE-A1 | live server E2E, Agent root | AC-001/002/003/004/008/010, RU-01/02/03 | Claude, Codex, AGY, AutoByteus, Grok | Completed |
| LE-A2 | live server E2E, Agent root | AC-005/007/008, SC-002, RU-04 | Claude, Codex, AGY | Completed (Fail) |
| LE-T1 | live server E2E, Team root | AC-006/007/008, SC-001 | Claude | Completed (Fail) |
| LE-O1 | live server E2E, Org root | SC-003, AC-007/008/012 | Claude | Completed (Fail on catalog copy) |
| LE-P1 | predecessor live E2E (updated) | AC-012 `@` unchanged, AC-014 update | Claude | Completed |
| BR-P1 | predecessor browser probe | AC-012 `@` UI unchanged | Claude | Planned |
| SC-004 | live failure of a bring-in | REQ-004 failure reason, nothing added | AutoByteus/LM Studio | Planned |
| DK-1… | isolated desktop instance, public package | AC-011 Agent/Team/Org root UI, SC-001/002/003/005, restart | Claude | Completed (F-02) |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RC-01 | 2026-10-01 | Completed | `npx vitest run tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,agent-run-collaboration,agent-tools,run-history,agent-execution,services/agent-streaming,startup} tests/integration/agent-team-execution tests/architecture` | changed tests pass; no new failures | 271 files pass; 7 files / 23 tests fail | Pass (no new failures; see RC-04) | `repo-server-affected.clean.log` |
| 2 | RC-04 | 2026-10-01 | Completed | the same 7 files on base `84224a58d` | — | the same 23 tests fail on base | pre-existing | `/tmp/aic-base-7.log` (summarized here) |
| 3 | RC-02 | 2026-10-01 | Completed | `NUXT_TEST=true npx vitest run services/collaborators stores components/workspace` | pass | 1156 pass; 2 fail in `WorkspaceAgentRunsTreePanel.regressions.spec.ts` — same 2 fail on base (`beginSelectionIntent is not a function`) | Pass (pre-existing) | `repo-web-affected.log` |
| 4 | RC-03 | 2026-10-01 | Completed | `pnpm -C <pkg> test` ×3 | pass | presentation 7/7, team-stream 5/5, collaboration-stream 5 pass / 7 fail — the same 7 fail on base | Pass (pre-existing) | `repo-autobyteus-*.log` |
| 5 | LE-A1/A2/T1/O1 | 2026-10-01 | Completed | `RUN_CLAUDE_E2E=1 npx vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | all pass | A1 Pass, O1 Pass; A2: copies' leads reported DONE without messaging their mates; T1: test ordering error (delegated after bring-in → collaborator copies without `source`) | A1/O1 Pass; A2/T1 investigate | `le-claude.log` |
| 6 | LE-A2 | 2026-10-01 | Completed | rerun with lead tool-call dump | — | every copy lead: `get_handoff_rules` → `{"handoffs":[]}`, then DONE to the PM | **Fail (F-01)** | `le-claude-2.log` |
| 7 | LE-T1 | 2026-10-01 | Checkpoint | test reordered (copies first) | — | snake-case `source` keys in the Team stream DTO (test assertion fixed) | test fix | `le-claude-2.log` |
| 8 | LE-A1/A2 | 2026-10-01 | Completed | `RUN_CODEX_E2E=1 …` | pass | A1 Pass; A2: Codex said "delegate_task isn't available" → probe: Codex 0.159 defers MCP tools behind `tool_search` (O-1); test hint added | A1 Pass | `le-codex.log`, `probes/codex-tool-visibility.out` |
| 9 | LE-A1/A2 | 2026-10-01 | Completed | `RUN_AGY_E2E=1 …` | pass | A1: list event `output: null`; A2: copies 1–2 reached their own mates, copy 3 skipped (F-01) | investigate / F-01 | `le-agy.log` |
| 10 | LE-A2/T1/O1 | 2026-10-01 | Completed | Claude, with direct `get_handoff_rules` assertions in all three roots | catalog copy rules name the copy's own mate | all three: `{"handoffs":[]}` while `source.handoffs` has `/…/lead → /…/mate` | **Fail (F-01)** | `le-claude-3.log` |
| 11 | LE-A1/A2 | 2026-10-01 | Completed | Codex with `tool_search` hint | — | A1 Pass; A2 delegates ×3 OK, then F-01 | A1 Pass; A2 Fail (F-01) | `le-codex-2.log` |
| 12 | LE-A1 | 2026-10-01 | Completed | AGY probes on the desktop backend | — | AGY spills large MCP results to a file (`output: null` in the event) and the model reads it with `view_file` (O-2); test hint allowed `view_file` | — | `probes/list-tool-output-agy*.json` |
| 13 | LE-A1 | 2026-10-01 | Completed | `RUN_AGY_E2E=1 … -t LE-A1` | pass | Pass | Pass | `le-agy-5.log` |
| 14 | LE-A1 | 2026-10-01 | Completed | `RUN_GROK_E2E=1 …` | — | `429 subscription:free-usage-exhausted` | Blocked (environment) | `le-grok.log` |
| 15 | LE-A1 | 2026-10-01 | Completed | `RUN_LMSTUDIO_E2E=1 …` | — | catalog empty: LM Studio at 127.0.0.1:1234 stopped answering | Blocked (environment) | `le-lmstudio.log` |
| 16 | LE-P1 | 2026-10-01 | Completed | `RUN_CLAUDE_E2E=1 … standalone-agent-collaborator-mention.e2e.test.ts` | pass | 2/2 | Pass | `le-p1-claude.log` |
| 17 | DK D0/DA | 2026-10-01 | Completed | `desktop/desktop-aic.mjs --phases D0,DA,DT,DO` (isolated `iso-59571-7ba1`) | pass | D0 Pass (package, tool picker); DA Pass (8 checks) | Pass | `desktop/D0-*`, `desktop/DA-*` |
| 18 | DK DT | 2026-10-01 | Completed | same | rows by name | server: collaborator + catalog copy with `source`; UI: copy row `marketing_team`, members `marketing_content_creator`, `computer_use_operator` | **Fail (F-02)** | `desktop/DT-04/05-*` |
| 19 | DK DO | 2026-10-01 | Completed | `desktop/desktop-org.mjs` + tree inspection | pass | bring-in and catalog copy (server); UI names and "From Software Tutorial Video Maker:" | Pass | `desktop/DO-*`, `desktop-org-report.json` |
| 20 | DK restart | 2026-10-01 | Completed | `desktop/desktop-restart.mjs` before → `isolated-app restart` → after | unchanged; wake from `source` | 6/6 | Pass | `desktop/desktop-restart-state.json` |

## Re-entry And Reconciliation

- Last durably recorded event: 20. Not run this round: SC-004 live, BR-P1 browser probe, live forced concurrency, LE-T1 AC-006 steps (blocked behind F-01).
- Reconciled into `api-e2e-execution-coverage-report.md`: `Yes`.

## Round 2 (API-REV-002, IR-002 @ `d651e10b8`)

| Sequence | Case ID | Event | Command / Surface | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R2-1 | RC-01/02 | Completed | affected server + web suites | 7 files / 23 tests and 2 web tests fail — identical to base | Pass (pre-existing) | `r2/repo-*.log` |
| R2-2 | LE-A1/A2/T1/O1 | Completed | Claude, all cases | A1, A2, T1 Pass; O1 failed at reopen (test opened the Org stream without restoring) | test fix | `r2/le-claude.log` |
| R2-3 | LE-O1 | Completed | Claude, reopen via `restoreAgentOrgRun` | Pass | Pass | `r2/le-claude-o1.log` |
| R2-4 | DK D0/DA/DT | Completed | isolated `iso-51918-19a4` | D0, DA Pass; DT: F-02 resolved; Team-tab check read from the copy member's view (driver) | Pass (driver fix) | `desktop/desktop-report-r2.json` |
| R2-5 | DK DTtab | Completed | solution designer view | Team tab lists the message to Product Prototyper | Pass | `desktop/DT-06-team-tab.png` |
| R2-6 | DK Org | Completed | `desktop-org.mjs` + tree inspection | bring-in and catalog copy; names correct; copy nested under the SE team (`rootOrg.members[1].taskExecutions[0]`) | Pass / **DI-01** | `desktop/DO-05-org-rows-r2.png` |
| R2-7 | DK restart | Completed | `desktop-restart.mjs --state desktop-restart-state-r2.json` | 6/6 | Pass | `desktop/desktop-restart-state-r2.json` |
| R2-8 | LE-A2 | Completed | AGY | first run waited for `SYSTEM_INSTRUCTIONS_SUPPLIED` (Claude-only event) → checks made Claude-only; rerun Pass | Pass | `r2/le-agy.log`, `r2/le-agy-a2.log` |
| R2-9 | LE-A1 | Completed | AGY | Pass | Pass | `r2/le-agy.log` |
| R2-10 | LE-A1/A2/T1/O1/F1 | Completed | Codex (current file) | A1, A2, T1, O1 Pass; F1: provider rejects `gpt-5.4-mini` for the whole run (setup invalid) | Pass; F1 moved | `r2/le-codex.log` |
| R2-11 | LE-F1 | Completed | Claude on `claude-haiku-4-5-20251001` (not in catalog) | bring-in and catalog copy refused with reasons; nothing added | Pass | `r2/le-claude-f1.log` |
| R2-12 | LE-P1 | Completed | Claude | 2/2 | Pass | `r2/le-p1-claude.log` |
| R2-13 | BR-P1 | Completed | browser probe (Claude) | 11 Pass, 3 N/A | Pass | `r2/browser-probe.log` |
| R2-14 | BR-P1 L01/L02 | Completed | browser probe (AGY) | 2 Pass | Pass | `r2/browser-probe-agy.log` |
| R2-15 | LE-A1 | Completed | Grok | `429 free-usage-exhausted` after `search_tool` | Blocked | `r2/le-grok.log` |
| R2-16 | DI-01 | Recorded | user conversation | Org copy placement: design issue agreed (place by address, `rootOrg.taskExecutions`) | Design Impact | report § DI-01 |

- Reconciled into the execution report (round 2): `Yes`.

## Round 3 (API-REV-003, IR-003 @ `7ae1335c8`)

| Sequence | Case ID | Event | Command / Surface | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R3-1 | RC-01/02 | Completed | affected server + web suites | identical to base (7 files / 23 tests; 2 web) | Pass (pre-existing) | `r3/repo-*.log` |
| R3-2 | LE-A1…F1 + LE-A3 | Completed | Claude, all cases | 6/6 Pass incl. placement in A3, T1, O1 | Pass | `r3/le-claude.log` |
| R3-3 | LE-A1…O1 + A3 | Completed | Codex | A1, A2, T1, O1 Pass; A3 timed out with two back-to-back requests (test sends them sequentially now) | Pass after test fix | `r3/le-codex.log`, `r3/le-codex-a3.log` |
| R3-4 | LE-A3 | Completed | Claude rerun (sequential version) | Pass | Pass | `r3/le-claude-a3.log` |
| R3-5 | LE-A2/A3 | Completed | AGY | 2/2 | Pass | `r3/le-agy.log` |
| R3-6 | Old stored copies | Completed | round-2 server (`/tmp/aic-r2old` @ `d651e10b8`) → round-3 server on one data root | 8/8 (after probe fixes: real paths, full env) | Pass | `probes/old-placement-reopen.mjs`, `probes/old-placement-reopen/report.json`, `r3/old-placement-reopen.log` |
| R3-7 | Desktop placement | Completed | `desktop-placement.mjs` on `iso-63049-8ec7` | stored paths and tree as expected; "Started by" label-only; Org labels have no "level N" (check by stored path + drawing) | Pass | `r3/desktop-placement-stored-paths.txt`, `desktop/PL-01*.png` |
| R3-8 | Desktop restart | Completed | `desktop-restart.mjs` | 6/6 | Pass | `desktop/desktop-restart-state-r3.json` |
| R3-9 | LE-P1 / BR-P1 | Completed | predecessor suites (Claude) | P1 2/2; BR-P1 O01 first timed out on a report (agent variance), rerun O01/O02 2/2 | Pass | `r3/le-p1-claude.log`, `r3/browser-probe*.log` |
| R3-10 | LE-A1 | Completed | Grok | first turn never went idle (quota pattern) | Blocked | `r3/le-grok.log` |
| R3-11 | AutoByteus runtime | Completed | DeepSeek (`RUN_DEEPSEEK_E2E=1`, key from the user's `.env` into the test vault) | A1, A2, A3, T1, O1 5/5 | Pass | `r3/le-deepseek.log` |

- Reconciled into the execution report (round 3): `Yes`.
