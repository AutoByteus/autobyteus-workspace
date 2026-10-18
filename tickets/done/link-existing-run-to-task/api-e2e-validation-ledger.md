# API/E2E Validation Ledger — `link-existing-run-to-task`

Commits under test: `ef807beb6d` (IR-001), `4b0986363c` (IR-002) on base `origin/personal` `2f211340ee`.
Evidence: `evidence/api-e2e/`. Round 1 (first round: the whole relevant set).

## Cases

| ID | Covers | Mode | Command / place | Result | Passed on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B0 | builds (install, prebuild, server build, nuxt prepare, integration prepare) | repository | `evidence/api-e2e/B0-*.log` | exit 0 | `4b0986363c` | Still valid |
| R1 | server typecheck | repository | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | `4b0986363c` | Still valid |
| R2 | server unit | repository | `pnpm -C autobyteus-server-ts test:unit` (`R2-unit.log`) | 724 files / 5882 tests passed, 4 files skipped (gated) | `4b0986363c` | Still valid |
| R3 | server integration | repository | `pnpm -C autobyteus-server-ts test:integration` (`R3-integration.log`) | 75 files passed; 1 failed: `agent-status-websocket` ×2 (`SEGMENT_CONTENT` window), the known product defect Task 4577620f; the ticket touches no streaming code | `4b0986363c` | Still valid (known defect) |
| R5 | web nuxt tests, guards | repository | `pnpm -C autobyteus-web test:nuxt` (`R5-web.log`), web-boundary, localization-boundary, localization-literals (`R5-guards.log`) | 632 files / 4471 tests passed; guards exit 0 | `4b0986363c` | Still valid |
| ADO-1 | AC-002, AC-003 (agent run) | scripted-AGY e2e | `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` | Pass (`ADO-run3.log`, gate on, clean env) | `4b0986363c` + uncommitted test | Still valid |
| ADO-2 | AC-001, R-3 (team run) | scripted-AGY e2e | same file | Pass (`ADO-run3.log`, gate on, clean env) | `4b0986363c` + uncommitted test | Still valid |
| ADO-3 | AC-004 (refusals sample) | scripted-AGY e2e | same file | Pass (`ADO-run3.log`, gate on, clean env) | `4b0986363c` + uncommitted test | Still valid |
| ADO-4 | REQ-003 (an adopted team runs as the PM's task team with a real model); found by D-1 | scripted-AGY e2e (`usage_report` replay) | same file, `-t ADO-4` | **Fail** (`ADO4-run3.log`): adopted lead's usage summary claims its old Team root, the PM's Agent root rejects it and fail-stops; the PM's next tool call never completes. Control (new task team, same usage) passes | — | Rerun after fix |
| E2E-1 | AC-006 (whole server e2e, gate on), part 1 | scripted-AGY e2e | `vitest run tests/e2e` (`E2E-whole.log`; stopped at 09:08 when the session ended) | 43 files reached: 27 passed, 16 skipped (live gates off), 0 failed (`E2E-part1-done.txt`) | `4b0986363c` | Still valid |
| E2E-2 | AC-006, part 2 (the 119 files part 1 did not reach) | scripted-AGY e2e | `vitest run $(cat E2E-part2-files.txt)` (`E2E-part2.log`) | 86 passed, 31 skipped (live gates), 2 failed: ADO-4 (F-001, expected) and `terminal-websocket-lifecycle` "opens a real PTY in server home" (TR-003, environment; passes with a resolved `HOME`, `E2E-terminal-realpath-home.log`) | `4b0986363c` | Still valid |
| D-1 | AC-001..003, R-1 (real app, real model) | isolated desktop | branch build `1.5.6-beta.1`, instance `iso-62261-0a7b`, owned data root (deleted); PM Claude Agent SDK `haiku` (Haiku 5.5); hand-started writer and team AutoByteus `deepseek-v4-flash` (`evidence/api-e2e/desktop/`) | **Fail**. Adoption itself worked for both (within 5 s both appear under the PM with their Task lines; the writer keeps its earlier conversation and gets the Task; prompt rebuilt as a task agent). Then F-001: 2 s later the PM's root fail-stopped and stopped both adopted runs (`failstop-app-log-excerpt.txt`, `adopted-writer-trace-tail.txt`). F-002: the old rows stay in their own groups (the round-1 "reload" did not reload; see round 2), while the server history no longer lists them. F-003 wording. DONE closes the writer on the server, but the UI no longer updated (PM view `historical` after the fail-stop); reopen not exercised | — | Rerun after fix |
| AC-007 | beta and the user's check | delivery | — | Deferred to delivery | | |

## Test-side issues found and resolved (this round)

| ID | Symptom | Cause | Resolution |
| --- | --- | --- | --- |
| TR-001 | ADO run 1: all three cases passed, then the cleanup hook timed out (180 s) | ADO-3 held the busy run with the fixture's `HOLD_TURN`; `terminateAgentRun` on an AGY run held mid-turn never returns (UND_ERR_HEADERS_TIMEOUT). Reproduced with no adoption attempt (`ADO-debug2-hold.log`, case A) and on the base commit `2f211340ee` (`ADO-debug3-hold-on-base.log`). Pre-existing, outside this ticket | ADO-3 holds the busy turn with one delayed tool call (`CALL_TOOLS` with `delayMs`) that ends by itself, then terminates. Follow-up reported with the repro (`followup-hold-terminate-repro.e2e.test.ts.txt`) |
| TR-002 | ADO-4 first versions passed without exercising the defect | (1) the `answered` check accepted linked_skills' plain `OK`, so the usage case never ran; (2) the hand-started team's own turn recorded no usage, unlike a real model | `answered` requires the recording's `OK DUMP` reply; the whole ADO-4 runs under `usage_report`, so the hand-started turn records usage under its Team root first (`ADO4-run1..3.log`) |
| TR-003 | `terminal-websocket-lifecycle` failed in the clean env | The temp `HOME` was `/var/folders/…`, a symlink to `/private/var/folders/…`; the shell prints the resolved `$PWD` while the test expects `HOME` as given. Environment-only: not this ticket, not a product defect | Rerun with a resolved `HOME`: 4/4 pass. TESTING.md clean-environment rule now says to resolve the temp `HOME` |

## Product findings (this round)

| ID | Severity | Finding | Evidence | Owner route |
| --- | --- | --- | --- | --- |
| F-001 | High (blocks AC-001, AC-003 with any real model) — **fixed in `f5001b65c6`, verified round 2** | After a team run with recorded usage is adopted, its members' next `TOKEN_USAGE_UPDATED` carries a run summary whose `root_team_run_id` is the old team (the summary is built from the run's latest stored record, `token-usage-run-aggregate.ts` `latest?.rootTeamRunId`). The PM's Agent root rejects it (`collaboration-agent-presentation-adapter.ts` "token summary must not claim a Team root") and enters fail-stop (`standalone-agent-run-root.ts` `onAgentExecutionEvent` → `enterFailStop`), which stops every task agent of the PM (here also the adopted writer, mid-turn, `user_interrupt`). The PM's collaboration then refuses commands ("already active or reserved") | D-1 logs; ADO-4 (`ADO4-run3.log`) reproduces it with the scripted runtime; control passes | Code Reviewer failure-origin review |
| F-002 | Medium (R-1, what the user sees) — **fixed in `fbc0f805bf`, verified round 3** | The adopted runs stay listed in their own groups (ADO Writer; TEAMS › ADO Review Team) after adoption and after 40 s (the "full renderer reload" was invalid: the app blocks `location.reload()`, see round 2), although `listWorkspaceRunHistory` (also with the UI's `limitPerAgent: 6`) no longer returns them. The UI projection keeps the writer as `source: "local"` and the team in `teamNodes`. Not yet separated from F-001's effects | `r1-sidebar-samples.txt`, `r1-before-reload.txt`, `r1-after-reload.txt`, `d07`, `d10` | Recheck after F-001 is fixed |
| F-003 | Low — **fixed in `f5001b65c6`, verified round 2** | The Task message to an adopted run says "Your previous Task is closed; this is the work to do now." although the run never had a Task | `d08-adopted-writer.png` | Code Reviewer (wording) |
| FU-1 | Follow-up (outside the ticket) | `terminateAgentRun` on an AGY run held mid-turn never returns; reproduced on the base commit | `followup-hold-terminate-repro.e2e.test.ts.txt`, `ADO-debug3-hold-on-base.log` | Follow-up Task |

## Round 2 (API-REV-002) — `f5001b65c6` (IR-003: F-001, F-003)

Impact of the change: the token-usage accumulator (shared by every run's usage summary), the adopted run's Task message, and the Task message builder. No web, schema, dependency or harness change.
- Rerun: typecheck, unit, integration, ADO-1..4, the e2e files over token usage and Task flows, and D-1.
- Still valid from round 1 (`4b0986363c`): web, guards, and the e2e files outside the impact list.

| ID | Covers | Command / place | Result | Passed on | Status |
| --- | --- | --- | --- | --- | --- |
| R0-2 | integration prepare | `round2/R0-integration-prepare.log` | exit 0 | `f5001b65c6` | Still valid |
| R1-2 | server typecheck | `round2/R1-typecheck.log` | exit 0 | `f5001b65c6` | Still valid |
| R2-2 | server unit | `round2/R2-unit.log` | 724 files / 5883 tests passed (one more than round 1: the accumulator test), 4 skipped | `f5001b65c6` | Still valid |
| R3-2 | server integration | `round2/R3-integration.log` | 75 passed; `agent-status-websocket` ×2 only, same signature (known defect Task 4577620f) | `f5001b65c6` | Still valid (known defect) |
| E2E-I | AC-006 by impact: 48 files over token usage (`run_summary_after_event`, `root_team_run_id`, token-usage folders, runtime token suites) and all of `tests/e2e/projects/` | `round2/E2E-impact-files.txt`, `round2/E2E-impact.log` (gate on, clean env, resolved temp `HOME`) | 36 passed, 12 skipped (live gates), 0 failed | `f5001b65c6` | Still valid |
| ADO-1..4 | AC-001..AC-004, F-001 | inside E2E-I | all 4 pass (ADO-4: the adopted team's usage no longer fail-stops the PM's root; the control passes) | `f5001b65c6` + uncommitted test | Still valid |
| D-1b | AC-001..AC-003, F-001, F-002, F-003 (real app, real models) | branch build `f5001b65c6`, instance `iso-52604-b1bd`, owned data root (deleted); PM Claude Agent SDK `haiku` (Haiku 5.5); hand-started writer and team AutoByteus `deepseek-v4-flash`; `round2/desktop/` | Adoption, work and reporting, board, DONE and reopen pass; F-001 and F-003 fixed; **F-002 remains** (details below) | `f5001b65c6` | — |

### D-1b observations
1. **Hand-started turns.** The writer and the team each answered one user message through the composer, so their usage was recorded under their own roots (the F-001 trigger) (`r2-d01`, `r2-d02`).
2. **Adoption.** The PM (in the composer) gave Task 1 to the team run and Task 2 to the agent run: both `delegated: true`. Within 5 s both appear under the PM with their Task lines (`r1-sidebar-samples.txt`).
3. **F-001 fixed.** Both adopted runs did their Tasks and reported to the PM: the lead its review, the writer its tagline (08:38:26). The whole session logged no usage rejection, listener failure, fail-stop or interrupt (`r2-app-log-checks.txt`).
4. **AC-002 and F-003.** The adopted writer shows its earlier conversation, then "New Task assigned to you: ado-desktop-project-2. This is the work to do now.", its `send_message_to` and its reply, with live status Idle (`r2-d03`).
5. **Board.** Each Task shows its worker with live status: "ado writer — Idle", "ado review team — Idle" (`r2-d04-board`).
6. **AC-003 DONE.** The PM's `update_task` DONE on Task 2:
   - the "ado writer" row left the PM's tree within 5 s;
   - the server marks it closed and its Task entry `closedAt` is set;
   - its runtime stopped (`ac003-done-samples.txt`).
7. **AC-003 reopen.** IN_PROGRESS, then the PM's `send_message_to` ("continues with its conversation"):
   - the row is back under the PM;
   - the writer replied within 2 s ("Big thoughts, tiny footprint.") (`ac003-reopen-samples.txt`).
8. **AC-001 DONE.** Task 1 DONE: the team left the PM's tree and the server marks it closed (`ac001-team-done-sidebar.txt`).
9. **F-002 remains.**
   - Each adopted run also stays in its own group (ADO Writer › its first run, offline; TEAMS › ADO Review Team with lead and mate).
   - It stays there after adoption, after DONE, and after the renderer's own history read (`runHistory.fetchTree()`, second adoption pair: `f002-run2-before-fetch.txt`, `f002-run2-after-fetch.txt`).
   - The server history is correct: only the PM (`workspaceGroups`).
   - The rows come from the renderer's in-memory run contexts `agentContexts.runs` and `agentTeamContexts.teams` (`f002-run2-holders.json`):
     - the projection turns an agent context into a `source: "local"` row (`stores/runHistoryReadModel.ts`);
     - a team context becomes a `teamNodes` entry (`stores/runHistoryNavigationProjection.ts`).
   - A run has such a context once the user opened it in the session; adoption doesn't drop it.
   - An app restart clears them: afterwards the adopted writer is listed only under the PM (`f002-after-app-restart.txt`).
   - `location.reload()` is blocked by the app: a window marker survived it, so round 1's "after a full reload" was not a reload.
10. **Not observed (optional):** the PM's Token Meter including the adopted run's pre-adoption usage.

| ID | Severity | Finding | Route |
| --- | --- | --- | --- |
| F-002 | Medium (AC-001 "not under TEAMS"; AC-003 "removed from the sidebar on DONE": the own-group row stays) | Renderer run contexts of an adopted run (`agentContexts.runs`, `agentTeamContexts.teams`) outlive the adoption and keep a duplicate row in the run's own group for the rest of the app session; a history read does not remove it; an app restart does | Code Reviewer failure-origin review (renderer change outside the design's Change Scope → Solution Designer, as the reviewer indicated) |

## Round 3 (API-REV-003) — `fbc0f805bf` (IR-004: SR-009, F-002)

Impact of the change: `autobyteus-web` only (a new `stores/runHistoryRetiredRuns.ts`, the navigation projection, history-read and collaboration-stream wiring) plus a server doc file. No server source changed.
- Rerun: web Nuxt tests, guards, D-1c.
- Still valid from round 2 (`f5001b65c6`): typecheck, unit, integration, the e2e impact set, ADO-1..4.

| ID | Covers | Command / place | Result | Passed on | Status |
| --- | --- | --- | --- | --- | --- |
| R5-3 | web Nuxt tests, guards | `round3/R5-web.log`, `round3/R5-guards.log` | 632 files / 4480 tests passed (9 more than round 2), 2 skipped; guards exit 0 | `fbc0f805bf` | Still valid |
| D-1c | AC-001..AC-003, F-002 (SR-009 rules 1 and 2, the window rule), F-001 regression (real app, real models) | branch build `fbc0f805bf`, instance `iso-61612-7efa`, owned data root (deleted); PM Claude Agent SDK `haiku` (Haiku 5.5); hand-started runs AutoByteus `deepseek-v4-flash`; `round3/desktop/` | **Pass** (below) | `fbc0f805bf` | Still valid |

### D-1c observations
1. **Rule 1 (PM open).** A writer and a team the user had opened and messaged this session were adopted by the PM, asked in its open view.
   - Both own-group rows left as soon as the delegations landed (between the 1 s and 3 s samples).
   - Both show only under the PM, with their Task lines, and stayed that way for the remaining 18 samples (`A-rule1-samples.txt`).
2. **DONE.** The writer left the PM's tree within 2 s and did not return to its own group, including after a history read (`A-done-samples.txt`).
3. **Reopen plus the PM's message.**
   - The writer is back under the PM only, also after a history read (`A-reopen-samples.txt`).
   - It replied within 5 s (`A-pm-received.txt`).
4. **Rule 2 (PM not open).** After an app restart, a new writer and team were opened and messaged. The renderer held no PM collaboration context.
   - The PM was messaged from outside the UI (`pm-send.mjs`, the app's agent-socket command) and adopted both.
   - The own-group rows were gone at the first sample; the retired-runs store shows them in `departedRunIds` and the stream set empty, so rule 2 did it (`B-retired-state.json`).
   - The app reads history every 5 s (`history-read-cadence.json`: gaps 5002, 5003, 5001, 4995 ms), so retirement happens within about 5 s.
   - All four adopted runs show exactly once under the PM (`B-after-expand-pm.txt`).
   - The first sample came 19 s after the adoption, because the client waited out its 20 s acknowledgement timeout (the message itself was delivered: the PM's conversation shows it at 10:01:38).
5. **Window.** A normal writer run W0, opened and messaged, was pushed out of the newest-6 window by six newer runs.
   - The server lists 6 writer runs without W0.
   - W0 is neither departed nor retired and is still shown: ADO Writer (7) (`window-check.json`, `window-sidebar.txt`).
6. **F-001 regression.** Every adopted run reported its Task to the PM; the whole session has 0 usage rejections, fail-stops or interrupts (`r3-app-log-checks.txt`).

## Round 4 (API-REV-004) — test-code review CRR-007 Local Fix (no product change; head `fbc0f805bf`)

| ID | Item | Change | Check | Result | Status |
| --- | --- | --- | --- | --- | --- |
| CRR-007 TR-001 | header of `hand-started-run-adoption.e2e.test.ts` | lists ADO-4 (REQ-003, F-001, with its control); the Run line uses the resolved temp `HOME` (`HOME="$(cd "$(mktemp -d)" && pwd -P)"`) per TESTING.md | read | done | — |
| CRR-007 TR-002 | ADO-3 waited a fixed 2 s for the busy turn | `until` the busy run's conversation records the `CALL_TOOLS:` message, which the run writes when its turn starts; the delayed call keeps the turn running 25 s after that. (First try, waiting on `agentRunCollaboration.root_agent.agent_statuses` for `running`, timed out: that list holds a root's task agents, not the root itself, `round4/ADO3-run.log`) | ADO-3 alone, clean env, resolved `HOME` (`round4/ADO3-run2.log`) | Pass; the refusal still matches "middle of a turn" | Still valid |

ADO-1, ADO-2 and ADO-4 are unaffected: the edits touch only the header comment and the ADO-3 body. Everything else is still valid from rounds 2–3.
