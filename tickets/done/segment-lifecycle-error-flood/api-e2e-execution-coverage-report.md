# API/E2E Execution Coverage Report — segment-lifecycle-error-flood

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, code reviewer's implementation-review Pass (CRR-001) for code commit `f4490d258a`
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-05 test revised during execution: two parallel background tasks (a single task usually gives one provider turn, not the reported two-turn shape), a setup precondition, and a `loaded` variant with +25 ms async latency per pipeline batch. Reason: on an idle machine the run's dispatch queue never lags the Claude frame pump, so the live case passed on base (API-06). The investigation was updated before the final run.
  - Added temporary probes API-06b and API-06c to measure whether the live case detects the defect.
  - API-09 (optional Codex turn in the instance) not run; see Cases.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/evidence/`

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `High`
- Input route (`Reviewed`/`Direct Low-Risk`): `Reviewed`
- Successful-output route (`Code Review`/`Delivery`): `Code Review`
- Proportional test-code review decision: `Required` (one new gated live E2E file)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `f4490d258a` | macOS 26.5.2 | node v22.23.1 (implementation engineer's runs, IMP-01..IMP-05) | see implementation handoff |
| ENV-2 | source of `f4490d258a` (branch HEAD `a3b67e23f5`/`03d396b0b1`, both ticket-doc-only on top) + the new uncommitted test file at run time | macOS 26.5.2 | node v22.23.1; in-process server stack of the live harness (real AgentRun, ClaudeAgentRunBackend, ClaudeSession, Agent SDK `@anthropic-ai/claude-agent-sdk` 0.3.280, agent WebSocket on Fastify port 0, production `AgentRunMemoryRecorder`); CLIs `path-claude` 2.1.302 and `sdk-bundled-claude` (the SDK's bundled CLI); model `haiku` | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1`; host Claude login (claude.ai, real `HOME`); test-owned temp workspace and memory dir |
| ENV-2-BASE | ENV-2 with the 4 modified `src` files (`agent-run-termination.ts`, `agent-turn-lifecycle-state.ts`, `agent-segment-lifecycle-event-transformer.ts`, `agent-segment-lifecycle-state.ts`) temporarily checked out from base `1c718202b2`; restored to HEAD after each run, `git status` clean | as ENV-2 | as ENV-2 | as ENV-2 |
| ENV-3 | worktree build of HEAD `03d396b0b1` (src = `f4490d258a`) | macOS 26.5.2 | Isolated desktop instance `iso-59932-7c13` from `pnpm --silent isolated-app start --build`, AutoByteus 1.5.6-beta.2 (enterprise mac-arm64), embedded server; Chat with the Claude Agent SDK runtime, model `claude-haiku-4-5-20251001`, Temp workspace, Auto-approve | Own data root (auto-created, removed at stop), own ports (control 59932, server 59933); host Claude login reached through the system-baseline `HOME`; driven with `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser`, attach-only |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 | Server typecheck | Reused `IMP-01` | ENV-1 | Pass | (IMP-01 row) | (IMP-01 row) | Holds: `git diff --name-only f4490d258a 03d396b0b1` lists only `tickets/` files |
| API-02 | AC-001..AC-005 | Ledger, both states, transformer, log module, termination; scripted Claude session → backend → AgentRun → memory | Reused `IMP-02` | ENV-1 | Pass | (IMP-02 row) | (IMP-02 row) | Same commit. CRR-001 additionally ran `claude-provider-turn-race.test.ts` on base: both cases fail there |
| API-03 | AC-006, ASM-001 | Whole server unit suite | Reused `IMP-03` | ENV-1 | Pass | (IMP-03 row) | (IMP-03 row) | Same commit |
| API-04 | AC-006, ASM-001 | Whole server integration suite, incl. the 2 intentionally changed tests | Reused `IMP-05` (prepared by `IMP-04`) | ENV-1 | Pass | (IMP-05 row) | (IMP-05 row) | Same commit. The intentional changes match design spec l.287–289 |
| API-05 | AC-001, AC-003, AC-007 (server half), REQ-004 normal case | Real Claude CLI → SDK → ClaudeSession → ClaudeAgentRunBackend → AgentRun → agent WebSocket + run memory | `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts --no-watch` (from the worktree root) | ENV-2 | Pass | `API-05-live-final-head.log` (final file); earlier rounds of the evolving file: `API-05-live-round1-head.log`, `API-05-live-round2-head.log`, `API-05-live-round3-head.log`; `API-05-new-test-typecheck.log` | `Tests  4 passed (4)`; each `[claude-self-started-turn-shape]` line has `"lifecycleNotices":0` and `"rejectionLogLines":0`; e.g. sdk-bundled idle `"TURN_COMPLETED@14159.2ms","TURN_STARTED@14159.3ms"` (T1 end → T2 start 0.1 ms apart) | Final file: idle + loaded for both CLIs. 3 of 4 runs had the two-provider-turn shape (path-claude/loaded ran as one provider turn this time; the shape is the CLI's choice). Round 1 (one background task): path-claude failed in setup because haiku never started the task (`Timed out waiting for background completion notice`), which is why the precondition was added. Typecheck of the new file: no errors in it; 3 pre-existing errors in `tests/e2e/helpers/claude-live-agent-harness.ts` |
| API-06 | Regression value of API-05 (idle) | as API-05, base source | Same command as API-05 (2-task file before the loaded variant existed) | ENV-2-BASE | Pass (no defect detected: the case passed on base) | `API-06-live-idle-base.log` | `Tests  2 passed (2)` on base | Result of the probe question, not of the product. On an idle machine T1's start was dispatched before T2's `init` arrived, so the race never happened. Led to API-06b |
| API-06b | AC-001, AC-003 under real CLI frames + emulated server load | as API-05, every pipeline batch of the run +25 ms (async) | `probes/claude-live-queue-lag.probe.test.ts` copied to `autobyteus-server-ts/tests/e2e/runtime/zz-probe-claude-live-queue-lag.e2e.test.ts`, run with the API-05 env on base and on HEAD, copy deleted | ENV-2-BASE, ENV-2 | Pass (defect reproduced on base, absent on HEAD) | `API-06b-live-queue-lag-probe-base.log`, `API-06b-live-queue-lag-probe-head.log` | Base: `Tests  2 failed (2)`, `"lifecycleNotices":8` per CLI, `statusAtText` holds only the input turn's text (no T2 text reached the client). HEAD: `Tests  2 passed (2)`, `"lifecycleNotices":0` | Real Claude frames; only the queue latency is emulated |
| API-06c | Regression value of the final durable file | final API-05 file on base source | Same command as API-05 | ENV-2-BASE | Pass (the durable test detects the defect) | `API-06c-live-final-test-on-base.log` | `Tests  2 failed \| 2 passed (4)`: `× … (path-claude, loaded)`, `× … (sdk-bundled-claude, loaded)`, each with 8 × `"message": "A runtime segment event violated the canonical lifecycle contract."`; idle variants pass | Source restored after the run; `git status` clean |
| API-07 | SCN-001 preserved background-task behavior | Existing gated live suite, first case | `env -i … RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts -t "shows a background Bash command" --no-watch` | ENV-2 | Pass | `API-07-live-background-task-existing.log` | `Tests  2 passed \| 10 skipped (12)` | The 10 skipped are the file's other cases, filtered out by `-t` |
| API-08 | AC-007 (and AC-001/AC-003 in the product) | Isolated desktop instance: UI → embedded server → real Claude CLI → chat, status, server log, run memory | 1. `pnpm --silent isolated-app start --build` → `iso-59932-7c13`. 2. Chat: runtime menu → `Claude Agent SDK` → `claude-haiku-4-5-20251001`. 3. Send: two parallel background Bash commands `sleep 15; echo AC007-READY-A/B > ac007-marker-a/b.txt`, reply STARTED and end turn; when notified, write a short sentence, `cat` both files, reply with AC007-FINISHED and the contents. 4. Read the chat DOM and take screenshots during and after the self-started turn. 5. Grep the instance logs for `AgentSegmentLifecycleRejected`; read the run's `raw_traces_active.jsonl`. 6. `isolated-app stop iso-59932-7c13` | ENV-3 | Pass | `API-08-mid-turn-chat-dom.txt`, `API-08-05-after-journey.png`, `API-08-final-chat-dom.txt`, `API-08-06-self-started-turn-complete.png`, `API-08-run-memory-excerpt.jsonl.txt`, `API-08-instance-launcher.log`, `API-08-instance-server.log`, `API-08-instance-start.json`, setup screenshots `API-08-01..04-*.png` | Mid-turn: header `Running` while T2 shows `Claude started a turn on its own.`, `I’m checking the results now.` and the `cat` Bash card (screenshot: blue "Running" dot and red Stop button). Final: `{"errorCards": 0, "oldLifecycleMessage": false, "newLifecycleMessage": false, …}`, header `Idle`, `AC007-FINISHED: Both background tasks completed successfully with file contents: AC007-READY-A and AC007-READY-B.` Memory: T1 `…a803e83073e6` notice at `1792345069.657`, T2 `…bcff032e37bd` notice at `1792345069.665` (8 ms later), T2 `assistant` traces `I'm checking the results now.` and `AC007-FINISHED: …`. Logs: header line `grep -c AgentSegmentLifecycleRejected = 0` in both log files | The reported shape occurred in the real app: T1 carried both completion notices and no text, and T2 started on its own 8 ms later. Embedded-server stderr reaches the launcher log as `[WARN]` (e.g. `[CLAUDE_SDK_CAN_USE_TOOL_SHADOWED]`), so a rejection warning would have appeared there. This idle desktop run passes on HEAD; it does not show what base would do on the same machine (API-06 shows base needs load) |
| API-09 | ASM-001 (optional) | Codex ordinary turn in the instance | — | — | Not Tested | — | — | The instance was started without a test-owned `CODEX_HOME` (TESTING.md: only `CODEX_HOME` passes through to the embedded server). ASM-001 is covered by API-03/API-04 (full unit and integration suites, all runtimes) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (scripted burst, fails on base per CRR-001), API-05 + API-06b/06c (real CLI: 0 notices, T2 text delivered and in run memory; fails on base under load), API-08 (real app: T2 text visible and in run memory) | Proven | — |
| AC-002 | Yes | API-02 (scripted: first provider turn's text kept) | Proven | Real CLI never wrote text in the task-notification turn in these runs (T1 had notices only), so the BEH-007 shape was not reached live; the scripted case is the direct proof |
| AC-003 | Yes | API-02 (scripted: `running` mid-turn, `idle` after), API-05 (live: every T2 text arrival sampled `running`, `idle` after), API-08 (header `Running` during T2, `Idle` after) | Proven | — |
| AC-004 | No (High) | API-02 (`agent-segment-lifecycle-event-transformer.test.ts`) | Proven | — |
| AC-005 | No (High) | API-02 (a, b, d), API-02 `agent-run.test.ts` (c); API-05/API-08 normal case: 0 rejection lines | Proven | — |
| AC-006 | No (High) | API-01, API-03, API-04 | Proven | — |
| AC-007 | Yes (environment-dependent per requirements) | API-08 | Proven | Signed-in Claude was available through the host login; no gap |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-02..API-08 | AC-002 proven only with scripted frames (the real CLI did not produce that shape) | A live run where Claude writes text in the task-notification turn; not producible on demand |
| Changed-boundary execution directness | 90% | 97% | API-05/06b/06c exercise the real queue vs live-snapshot boundary with real CLI frames; API-08 the product | Queue lag is emulated (+25 ms) rather than produced by real load | — |
| Cross-boundary integration realism and mock gap | 75% (scripted SDK only before live runs) | 95% | API-05..API-08: real CLI, SDK, session, backend, AgentRun, WebSocket, memory recorder, desktop renderer | Load emulation in the `loaded` variant | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | ENV-2 clean env with real login, both CLI candidates; ENV-3 worktree build with own data root | Desktop run used one model (haiku 4.5) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | API-02 (AC-004/005 a–d, termination), API-06b/06c (failure on base) | Real-runtime rejections not producible on demand (unit-proven) | — |
| User-surface, browser, and desktop-shell confidence | 50% (none) | 95% | API-08: chat text, no error card, Running/Idle header in the desktop app | One journey, one run | Repeat runs; not material |
| Durable regression coverage quality and relevance | 90% | 96% | Scripted regression (fails on base) + new gated live E2E whose `loaded` variant fails on base (API-06c) | Live suite is gated (`RUN_CLAUDE_E2E=1`) and costs a few cents per case | — |

- Overall post-repository confidence: 82% (simple average)
- Overall final confidence: 96% (simple average of 97, 97, 95, 95, 96, 95, 96)
- Calculation method: simple average of the seven applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-002's shape seen only in scripted frames; the defect's trigger (queue lag) is emulated in the durable live test, while the real desktop run proves the fixed behavior under the real shape without load.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (gated live Claude suite over the real agent WebSocket) and `Project Desktop Validation` (isolated instance)
- Confidence gap or residual risk it addresses, and the expected gain: repository evidence used scripted Claude frames only; the defect was found in real use and depends on real CLI frame timing and server load. Gain: proof that the real CLI produces the reported shape, that the fix holds under it in the server and the desktop app, and that the durable live test fails on the defect.
- Browser validation needed, and why or why not: yes, as part of the desktop instance; AC-007 is a user-visible outcome (text, error cards, status)
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: as planned. Instead of creating a new agent definition, the built-in Daily Assistant in Chat was used with the Claude Agent SDK runtime selected in the composer (same AgentRun path). The first `--build` attempt was stopped when the session ended before it finished; it was restarted and started cleanly.
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-08 (renderer chat and status through the embedded server). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. Two other recorded instances (`iso-54255-c1c9`, `iso-54255-0e9d`, from another worktree, not running) and the user's app were not touched.
- Behavior not directly proven and its confidence consequence: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts` | Added | API-05, API-06c | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Server load (dispatch-queue lag) | `loaded` variant / API-06b: `vi.spyOn(getDefaultAgentRunEventPipeline(), "process")` adds an async 25 ms delay before each batch | Real load is not reproducible on demand; without it the race does not occur (API-06) | The trigger is emulated; the frames, timing between turns and the rest of the stack are real |
| Claude SDK (API-02) | Scripted fake SDK (`fake-claude-streaming-sdk.ts`) | Deterministic burst | Covered by the live cases |
| Desktop parts of the live harness (API-05..07) | In-process Fastify + WebSocket, stub run service | Harness design | Covered by API-08 in the real app |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base source checkouts (API-06, 06b, 06c) | Yes | `git checkout HEAD -- autobyteus-server-ts/src` after each run | `git status` showed no `src` changes after each restore |
| Probe copy `tests/e2e/runtime/zz-probe-claude-live-queue-lag.e2e.test.ts` | Yes | Deleted | Removed; the source stays as ticket evidence at `probes/claude-live-queue-lag.probe.test.ts` |
| Temporary tsconfig for the new file's typecheck | Yes | Deleted | Removed |
| Live test temp workspaces and memory dirs | Yes | Removed by the tests' `afterEach` | — |
| Isolated instance `iso-59932-7c13` and its data root | Yes | `pnpm --silent isolated-app stop iso-59932-7c13` | `"wasRunning": true, "forced": false, "dataRootRemoved": true, "controlPortReleased": true, "serverPortReleased": true`; `list` shows no instance of ours |
| Claude sessions created by the live runs and the desktop run | Yes (side effect) | None possible without editing `~/.claude` | Each run added a session to the user's Claude history under `~/.claude/projects` (host login, as TESTING.md describes for live CLI suites) |
| Worktree build outputs (`autobyteus-web/electron-dist`, SDK `dist/`) | Yes | Left in place (untracked build outputs per TESTING.md) | Not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff
- Notes:
  - Observation, out of scope: `tests/e2e/helpers/claude-live-agent-harness.ts` does not typecheck under `tsconfig.build.json` (3 errors at l.78 and l.129, pre-existing; vitest does not typecheck, so the live suites still run). Not caused by this ticket.
  - Design spec l.348 `rejectedAfterFirst` vs `count` wording remains (already in CRR-001's residual risks).
  - `code-review-report.md` and `code-review-revision-record.md` are untracked in the ticket folder (the code reviewer's files); this round did not commit them.
