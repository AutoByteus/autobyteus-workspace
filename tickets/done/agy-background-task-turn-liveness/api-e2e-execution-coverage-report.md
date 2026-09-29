# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/design-spec.md`
- Supplemental Task Artifacts: `probes/agy-daemon-stream-order-probe.py`, `probes/agy-background-task-turn-end-probe.py` (evidence; superseded for validation by the durable opt-in live e2e)
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete, IR-001 (commit `5dd87a33f`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: see Meta
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two in-execution revisions, both recorded in the investigation:
  1. Added web unit cases (WEB-001) to close the user-surface confidence gap without a browser session.
  2. Reclassified the daemon-kill assertions (derived from ASM-001) as evidence after probes falsified ASM-001.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: see Meta
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (live suite start and per-case completion)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14
- Cases still running, interrupted, or not started: none
- Interruption or rerun note: LIVE-BG-001 attempt 1 failed only on the ASM-001 daemon-kill assertion, which is not an acceptance criterion. After probe classification the case was rerun and passed. Attempt-1 evidence is preserved.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| UNIT-001 | Pass | 1 | console (100 passed, 5 skipped) | — |
| E2E-REG-001 | Pass | 2 | console (6/6) | — |
| E2E-BG-001 | Pass | 3 | console; negative control fails on base commit | — |
| E2E-BG-002 | Pass | 4 | console | — |
| TSC-001 | Pass | 5 | console | — |
| LIVE-BG-001 | Pass (rerun) | 12 | `evidence/live-bg-001-scn-001.json`, `evidence/attempt1-live-bg-001-scn-001.json`, `evidence/live-run.log`, `evidence/live-rerun.log` | ASM-001 finding recorded (non-blocking) |
| LIVE-BG-002 | Pass | 8 | `evidence/live-bg-002-scn-002.json` | — |
| LIVE-BG-003 | Pass | 13 | `evidence/live-bg-003-stop.json`, `evidence/attempt1-live-bg-003-stop.json` | — |
| PROBE-ASM-001 | N/A (diagnostic) | 10 | ledger row 10; Evidence / Notes below | Non-blocking finding |
| WEB-001 | Pass | 14 | console (41/41) | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The timer was removed cleanly; `grep TURN_IDLE|turnIdle` finds only the ACP backend, which is out of scope.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-001 | AC-001, AC-002, AC-003 | Process timer removal; converter closure | vitest unit | Durable | Pass | ledger 1 |
| E2E-BG-001 | AC-002, REQ-003, REQ-004 | Converter → AgentRun → WebSocket → memory → `getRunProjection` | In-process real server + fake AGY CLI | Durable | Pass | ledger 3 |
| E2E-BG-002 | AC-003, REQ-002 | WebSocket `INTERRUPT_GENERATION` → backend interrupt → memory | same | Durable | Pass | ledger 4 |
| E2E-REG-001 | REQ-004 | Existing denial / terminal error / native image paths | same | Durable | Pass | ledger 2 |
| LIVE-BG-001 | AC-004, REQ-001..003, SCN-001, design Risk | Real AGY → full server stack | Real server + real `agy` 1.2.12 | Durable (opt-in) + Live | Pass | `evidence/live-bg-001-scn-001.json` |
| LIVE-BG-002 | AC-004, AC-001, REQ-001, SCN-002, QR-001 | Real AGY silent turn > 300 s | same | Durable (opt-in) + Live | Pass | `evidence/live-bg-002-scn-002.json` |
| LIVE-BG-003 | AC-004 alternate, REQ-002 | Real Stop during a daemon turn | same | Durable (opt-in) + Live | Pass | `evidence/live-bg-003-stop.json` |
| WEB-001 | REQ-003 / BEH-002 (user-visible card) | Web streaming handler + history hydration of the RUNNING success | vitest (Nuxt) | Durable | Pass | ledger 14 |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-background-task-transport.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts --no-watch` | `autobyteus-server-ts` | E2E-BG-001/002 + regression | Pass (3 files, 8 tests) | console |
| 2 | Negative control: base-commit converter (`git show e6c16d801:…/agy-stream-event-converter.ts`) with the same command for the new file | same | E2E-BG-001 detects the defect | Fails as expected (no daemon SUCCEEDED); source restored (`git checkout`) | console |
| 3 | `RUN_AGY_BACKGROUND_E2E=1 AGY_BACKGROUND_EVIDENCE_DIR=<ticket>/evidence pnpm exec vitest run tests/e2e/runtime/agy-background-task-live.e2e.test.ts --no-watch` | same; real `agy` | LIVE-BG-001..003 | 2 Pass, 1 Fail (ASM-001 assertion only), 540 s | `evidence/live-run.log` |
| 4 | same with `-t "SCN-001\|Stop during"` after reclassification | same | LIVE-BG-001, 003 | Pass (2/2), 192 s | `evidence/live-rerun.log` |
| 5 | `pnpm exec nuxi prepare` then `NUXT_TEST=true pnpm exec vitest run services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts components/conversation/__tests__/ToolCallIndicator.spec.ts` | `autobyteus-web` | WEB-001 | Pass (41/41) | console |
| 6 | `pnpm exec tsc -p tsconfig.json --noEmit` | `autobyteus-server-ts` | New test files typecheck | Pass (0 non-TS6059 errors; TS6059 pre-existing) | console |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | AC-001 is proven live: max silent gap 330,031 ms, turn completed. AC-002 is proven live, including the payload identity. AC-003 is proven live and with the fake transport. AC-004 is proven for SCN-001, SCN-002 and Stop. | Non-SUCCESS `result` closure is unit-only (not reproducible on demand with real AGY) |
| Changed-boundary execution directness | 88% | 97% | +9 | Real AGY stream → real converter/process → WebSocket → memory → projection | — |
| Cross-boundary integration realism and mock gap | 80% | 96% | +16 | No mocks on the live path; the fake transport is used only for the deterministic durable complement | In-process server rather than the packaged Electron server binary (same code) |
| Environment, configuration, identity, and fixture fidelity | 80% | 94% | +14 | Real `agy` 1.2.12 with the real login; isolated app data; free ports | Single model (`gemini-3.8-flash-high`); packaged app not used |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | +9 | Live Stop; 130 s post-`result` quiet window with 0 events; clean next turn; unit process-close and startup timeout | ASM-001 falsified (daemons outlive AGY), outside the approved AC scope; recorded as a finding |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | +10 | Real WebSocket payload + projection; web streaming handler, card presentation and history hydration assert a `success` card with the RUNNING result | No browser session (no UI code changed; decision recorded) |
| Durable regression coverage quality and relevance | 92% | 96% | +4 | Fake-transport e2e with a negative control; opt-in live e2e re-runnable against future AGY versions; web specs | Live suite is opt-in (long, needs an AGY login) |

- Overall post-repository confidence: 85%
- Overall final confidence: 96% (simple average of 97, 97, 96, 94, 94, 95, 96 = 95.6%)
- Calculation method: simple average; no category below 90%
- Confidence change produced by broader validation: +11 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default final confidence target of 95% met: `Yes`
- Confidence-limiting residual risks: ASM-001 finding (see Evidence / Notes); single model; non-SUCCESS closure is unit-only

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`. Modes used: Live API (in-process real server via GraphQL/WebSocket) and Lifecycle (real AGY process).
- Material deviation: browser not used. The web consumer was proven with the project's web unit harness instead, because no UI code changed.
- Confidence gaps addressed:
  - consumer handling of SUCCEEDED/RUNNING (design escalation trigger): not triggered, handled correctly end to end;
  - real silence longer than 300 s;
  - late events after `result`: none;
  - Stop semantics.
- Startup order and readiness: the test starts the server (`startStudioE2eRuntimeServer`), then `createAgentDefinition`, then `createAgentRun` (`runtimeKind: antigravity_cli`, success), then opens the WebSocket.
- Environment choices: `RUN_AGY_BACKGROUND_E2E=1`, `AGY_BACKGROUND_EVIDENCE_DIR=<ticket>/evidence`, model `gemini-3.8-flash-high`, daemon on a free 127.0.0.1 port.
- Fixtures / identities: temp app-data dir and workspaces; the local AGY login (no secrets recorded).

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| SCN-001: start daemon, then echo, `sleep 5`, write file | Withheld steps delivered; daemon card closes as background before TURN_COMPLETED | Daemon STARTED at 4.7 s. The echo / sleep / write steps all arrived at 19.6 s with DONE. Daemon SUCCEEDED `{provider_state:"RUNNING", output:"Started as a background task; still running when the turn ended."}` at 19.7 s, then TURN_COMPLETED. `done.txt` = OK. No ERROR. | `live-bg-001-scn-001.json` | Pass |
| SCN-001: post-`result` quiet window | No event outside the turn; daemon alive; run usable | 130 s with 0 WebSocket events; daemon listening; next turn TURN_STARTED→TURN_COMPLETED with no tool events (no late daemon DONE) | same | Pass |
| SCN-001: history | `tool_call` with the RUNNING result; activity `success` | As expected | same (`historyDaemonRow`) | Pass |
| SCN-002: `sleep 330` background, "reply STARTED" | Turn survives > 300 s silence; completes | Tool STARTED at 2.8 s; **no event for 330.0 s**; SUCCEEDED DONE `FINISHED_MARKER` at 332.8 s; TURN_COMPLETED at 335.4 s; no ERROR | `live-bg-002-scn-002.json` | Pass |
| Stop during a daemon turn | ACK accepted; TURN_INTERRUPTED; no background success; history "Tool execution interrupted." | As expected (both attempts) | `live-bg-003-stop.json` | Pass |

## Desktop Application Validation

Not applicable (server-only change). The user's running AutoByteus app on port 29695 was not touched.

## Platform / Runtime Targets

- macOS 26.5.2 (darwin), Node v22.23.1, pnpm workspace, vitest (forks)
- AGY CLI 1.2.12, model `gemini-3.8-flash-high`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration` (design: "No Migration Required")
- Representative data exercised: new-turn daemon tool traces written by the real memory writer, then read by the normal `getRunProjection` reader. This was checked live and after terminate (fake transport), and live with real AGY.
- Result: replayed as `tool_call` + activity `success` with the RUNNING result. There is no version-specific branch or fallback.
- Residual untested persisted-data risk: none material (historical traces use the unchanged reader)

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` | Added | AC-002, AC-003 through the real server | Pass (2) | Gate `RUN_AGY_FAILURE_E2E=1` + fake CLI; negative control verified |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Fake `daemon_background`, `daemon_hold` cases | Pass | Existing cases unchanged (regression 6/6) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` | Added | AC-004 SCN-001, SCN-002, Stop (real AGY) | Pass (3; SCN-001/Stop rerun) | Opt-in gate `RUN_AGY_BACKGROUND_E2E=1`; about 9 min |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Updated (+1 case) | BEH-002 streaming card | Pass | — |
| `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Updated (+1 case) | BEH-002 history card | Pass | — |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added or updated this round: `Yes`
- Paths added or updated: the five paths above
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; attached for delivery)
- Uncommitted: these test changes are in the worktree and not committed; delivery owns integration/commit.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/agy-background-task-turn-liveness/evidence/live-bg-001-scn-001.json` | Live SCN-001 event timeline, quiet window, next turn, history | Retained | Rerun (Pass) |
| `…/evidence/attempt1-live-bg-001-scn-001.json` | Attempt 1 (ASM-001 assertion failure) | Retained | — |
| `…/evidence/live-bg-002-scn-002.json` | Live SCN-002 timeline, `maxSilentGapMs: 330031` | Retained | — |
| `…/evidence/live-bg-003-stop.json`, `attempt1-live-bg-003-stop.json` | Live Stop timelines | Retained | — |
| `…/evidence/live-run.log`, `live-rerun.log` | vitest logs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/agy-asm-probe/probe.py`, `probe-midturn.py` (raw AGY, SIGTERM after `result` / mid-turn) | Classify the LIVE-BG-001 attempt-1 failure (AutoByteus vs AGY) | Daemon survives AGY SIGTERM in both cases (see Evidence / Notes) | Directory removed; orphan daemons on 59911/59912 killed |
| Base-commit converter swap | Negative control for E2E-BG-001 | Test fails on the old code | `git checkout` restored; `git status` confirms |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (E2E-BG-001/002 only) | `tests/fixtures/agy-failure-cli.mjs` | Deterministic, fast durable coverage | None for the verdict: the same scenarios also ran against real AGY |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UNIT-001, E2E-REG-001, E2E-BG-001, E2E-BG-002, TSC-001, LIVE-BG-001, LIVE-BG-002, LIVE-BG-003, WEB-001 | All acceptance criteria are proven, including live real-AGY AC-004 |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, temp app-data dirs, agent definitions, runs | This validation | `afterAll`: terminate runs, delete the definition, `app.close()`, `rm -rf` | Done |
| Daemons started by AGY on test ports 59806, 60093, 60353, 60584 | This validation | `afterAll` `killPortOwner` | No Python listeners remain (verified with `lsof`) |
| Probe daemons 59911, 59912; `/tmp/agy-asm-probe` | This validation | kill + rm | Done |
| `autobyteus-web/.nuxt` | Generated by `nuxi prepare` | Left in place (git-ignored build output needed for web tests) | — |
| User's AutoByteus app (29695) and its AGY processes | User | Not touched | — |

## Preliminary Classification

N/A. The result is `Pass`.

The ASM-001 finding is classified as a **non-blocking adjacent concern / separate-ticket candidate**, for three reasons:
- it falsifies an approved-basis assumption, but no acceptance criterion;
- the behavior belongs to AGY and predates this change;
- remediation would be a background-process manager, which is explicitly Out Of Scope and would need new user approval.

## Recommended Recipient

`/delivery_engineer` (direct low-risk route).

## Evidence / Notes

**Finding F-API-001: ASM-001 falsified (non-blocking).** In AGY 1.2.12, a command that AGY has backgrounded (`IsDaemon`) survives SIGTERM of the AGY process. AGY exits (rc=1), and the daemon is reparented to PID 1 in its own process group. This was reproduced in three ways:
- through AutoByteus `terminateAgentRun` on an idle run (LIVE-BG-001, both attempts: `daemonListeningAfterTerminate: true`);
- with raw AGY, SIGTERM after `result`;
- with raw AGY, SIGTERM mid-turn 25 s after the daemon was listening.

LIVE-BG-003's daemon died only because Stop arrived 0.4 s after the daemon step started, before AGY backgrounded it.

Consequence: Stop/Terminate still ends the AGY turn and process, so REQ-002, AC-004 and DEC-001's hung-turn control hold. But long-running dev servers started by AGY agents stay running after Stop/Terminate, and can then hold ports that a later `pnpm dev` needs. Investigation note CUR-6 ("background tasks do not survive") does not hold for backgrounded daemons.

Recommendation: the Solution Designer and the user decide on a separate ticket (e.g. AGY child process-group cleanup on stop). The investigation notes' CUR-6 / requirements ASM-001 wording may deserve a correction note.

**Design Risk check (late daemon event after `result`):** not observed. There were 0 events in a 130 s window, and the next turn had no tool events. Also, `AgyAgentRunBackend.handleMessage` drops provider events when no turn is active, so a late event could not fail the run with `AGY_UNEXPECTED_EVENT_OUTSIDE_TURN`.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default 95% confidence target met: `Yes`
- Any final applicable confidence category below 90%: `No`
- Broader validation decision: `Required`, executed (Live API + Lifecycle with real AGY)
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/delivery_engineer`
- Notes: F-API-001 (ASM-001 falsified) is carried as a non-blocking finding for user visibility and a possible separate ticket.
