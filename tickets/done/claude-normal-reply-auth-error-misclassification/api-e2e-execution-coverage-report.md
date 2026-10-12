# API/E2E Execution Coverage Report

- Package: `claude-normal-reply-auth-error-misclassification` (URGENT)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification`, `codex/claude-normal-reply-auth-error-misclassification`
- Validated implementation: `fc87231ba` (IR-001, SR-001)
- API/E2E revision: `API-REV-001`
- Route / classification: direct, Task size `Small`, Architecture risk `Low` (unchanged)
- Architecture review / code review artifacts: `N/A — not applicable`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Evidence folder: `api-e2e-evidence/`
- Test-case ledger: not used. There were 4 short live cases plus 1 red check; each finished in under 5 s and is recorded below.

## Result

**Pass.** Final confidence: **96%**. Broader validation (browser/desktop): **Not Required**.

## Executed Plan And Results

| ID | Layer | Command (from worktree root) | Result | Evidence |
| --- | --- | --- | --- | --- |
| R-1 | Server unit, Claude backend | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude --no-watch` | Pass: 20 files, 240/240 | `api-e2e-evidence/unit-claude-backend.log` |
| R-2 | Server unit, agent-execution + runtime-management | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution tests/unit/runtime-management --no-watch` | Pass: 142 files (4 skipped), 1476 passed, 6 skipped | `api-e2e-evidence/unit-agent-execution-runtime-management.log` |
| R-3 | Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass (exit 0) | `api-e2e-evidence/typecheck.log` |
| E-AC001-path | Gated live runtime E2E | `env -u AUTOBYTEUS_SERVER_DATA_DIR RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts --no-watch` | Pass (PATH `claude` 2.1.295) | `api-e2e-evidence/live-e2e-auth-marker-fixed.log` |
| E-AC001-sdk | same | same | Pass (CLI bundled with SDK 0.3.280) | same |
| E-AC002-path | same | same | Pass (PATH `claude`) | same |
| E-AC002-sdk | same | same | Pass (SDK-bundled CLI) | same |
| E-RED | Live AC-001 against the pre-fix classifier (`claude-session-output-events.ts` temporarily set to `3514fe48e`, then restored with `git checkout HEAD --`; `git status` showed it clean) | same, `-t "AC-001"` | **Fails as expected**, both CLIs: the websocket streams `ERROR {code: CLAUDE_RUNTIME_TURN_FAILED, message: "CLAUDE_RUNTIME_AUTHENTICATION_FAILED: The runtime said: Not logged in · Please run /login (error code authentication_failed).", error_effect: terminal}`. This is the user's reported symptom. | `api-e2e-evidence/live-e2e-ac001-red-on-base-classifier.log` |

### What the live E2E exercises

Path for each case: real `AgentRun`, `ClaudeAgentRunBackend`, `ClaudeSession`, `ClaudeTurnTracker` and classifier. Behind them, the real `ClaudeSdkClient` with SDK 0.3.280 and the real Claude CLI process. In front, the real agent websocket route (`/ws/agent/:runId`) with a real `ws` client sending `SEND_MESSAGE`.

- **AC-001 (live):** model `haiku`, logged in through the operator's existing CLI login. The agent replies verbatim "The runtime said: Not logged in · Please run /login (error code authentication_failed)." Assertions:
  - the first settle frame is `TURN_COMPLETED` (not `ERROR`);
  - zero `ERROR` frames;
  - exactly one `TURN_COMPLETED`;
  - the last streamed `AGENT_STATUS` is `idle`, and the run status snapshot is `idle`;
  - `hasCompletedTurn` is true;
  - the streamed reply contains all three markers.
- **AC-002 (live):** `CLAUDE_CONFIG_DIR` is an empty temp folder, and `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are unset (the same method as R-02). There is no provider call. Assertions:
  - `ERROR` message contains `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`;
  - `error_scope: turn`, `error_effect: terminal`;
  - zero `TURN_COMPLETED`;
  - last `AGENT_STATUS` is `error`, and the run status is `error`;
  - `hasCompletedTurn` is false.
  - Observed order: `AGENT_STATUS error` streams before the `ERROR` frame. This is existing behavior, and the test asserts the final status, not the order.

## Acceptance Criteria Status

| AC | Status | Evidence |
| --- | --- | --- |
| AC-001 | Pass, proven directly | Live E2E on both CLIs + unit/session tests with real frames; red check shows the live case detects the defect |
| AC-002 | Pass, proven directly | Live E2E on both CLIs (real CLI with no credentials) + session test with real frames |
| AC-003 | Pass | Existing classifier/tracker/session unit tests (`errors[]`, precedence, redaction) unchanged and green (R-1, R-2) |
| AC-004 | Not tested here; user verification | Delivery owns it in the released app. Agent-run testing is not the user's verification (TESTING.md). |

## Durable Coverage Changes

| Path | Change | Purpose |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts` | **Added** | Gated (`RUN_CLAUDE_E2E=1`) live proof of AC-001 and AC-002 through the real CLI, SDK, session and websocket, per CLI candidate |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | **Updated: baseline fix** | Passes the `ownSession` callback that `ClaudeSessionManager.createRunSession`/`restoreRunSession` now require (added in `028cca231`). Without it, every harness-based Claude live E2E failed on the base with `TypeError: ownSession is not a function`. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | **Updated: baseline fix** | Same `ownSession` signature drift in its own `createRunSession` call |
| Implementation-owned (IR-001), validated: `tests/fixtures/claude-result-frames/claude-auth-marker-result-frames.ts`, `tests/unit/.../claude-session-output-events.test.ts` (+3), `tests/unit/.../claude-session.test.ts` (+2) | Still Valid | Classifier and session proof with real SDK frames |

No durable coverage removed.

## Baseline Findings (TESTING.md Rule 9)

1. **Fixed (test cause, small):** the live harness and the interrupt-resume E2E had fallen behind the `ownSession` parameter added to `ClaudeSessionManager.createRunSession`/`restoreRunSession` in `028cca231`. `typecheck` covers only `src`, so the drift went unnoticed. It is fixed in its own commit labelled as a baseline fix.
2. **Reported, not fixed (too large for this urgent fix):** the ungated fake-CLI block in `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (8 cases: API-CL01..04, AC-005, AC-003, AC-016, AC-002) still fails on the base after fix 1. Every session open fails with `AggregateError: Claude opening and cleanup failed`, followed by `Claude exact component cleanup failed` (`claude-session-process.ts:82`, `claude-session-cleanup.ts:40`). Cause: its `createFakeCliSdkClient` stubs the SDK `query` with `setCachedModuleForTesting`, but sessions now open through `beginClaudeSdkSessionOpening` with `spawnClaudeCodeProcess: control.spawn` and exact-component cleanup proofs (`028cca231`). The fake never goes through the controlled spawn, so opening and cleanup both fail. This happens before any result classification, so it is unrelated to this change. Fixing it means moving the fake to the current opening protocol, which belongs to whoever owns the Claude streaming-session lifecycle. Evidence: `api-e2e-evidence/e2e-interrupt-resume-fake-cli.log` (run with `env -i PATH HOME=<temp> TMPDIR`).

## Confidence Scorecard (after live execution)

| # | Category | Score | Basis / remaining uncertainty |
| --- | --- | --- | --- |
| 1 | Requirement and AC proof | 95% | AC-001/002 proven live and at unit level; AC-003 by unchanged suites. AC-004 is user verification by design. |
| 2 | Changed-boundary directness | 100% | Real CLI frames go through the real classifier in the real session; the red check shows the case detects the defect. |
| 3 | Integration realism / mock gap | 95% | Real SDK, CLI, session and websocket. The harness stubs the run-service lookup and status projection rather than booting the full server. Those are not on the changed path. |
| 4 | Environment / identity / fixture fidelity | 95% | Real login (AC-001) and a real unauthenticated CLI (AC-002), on both CLI builds. The model's verbatim reply is a little nondeterministic; the test asserts the markers are in the reply. |
| 5 | Failure / edge / lifecycle | 95% | Real auth failure live; pre-fix regression reproduced live. RK-01 (a future SDK without `is_error`) is accepted upstream. |
| 6 | User surface | 95% | The frontend is unchanged and renders the streamed `ERROR`/`AGENT_STATUS`. The websocket now carries no `ERROR` and ends in `idle` for AC-001, so no red card or red dot can be produced. The in-app check is AC-004 (user). |
| 7 | Durable regression quality | 95% | Ungated unit + session tests with real frames, plus a gated live suite. The live suite is skipped unless `RUN_CLAUDE_E2E=1`. |

**Overall: 96%** (simple average 95.7%). No category is below 90%.

## Broader-Validation Decision

`Not Required` for browser or desktop. The changed boundary is server-side classification of SDK frames, and the gated live suite proved it directly through the real runtime and the real websocket contract the frontend consumes. The frontend is out of scope and unchanged, and it creates no new browser or shell risk. The real-runtime broader validation that was needed (live SDK/CLI) ran as part of this round.

## Residual Risks

- RK-01 (accepted upstream): an SDK that reports auth failure without `is_error:true`.
- AC-004 still needs the user's check in the released app.
- The interrupt-resume fake-CLI baseline failure (finding 2 above) is open and has a different owner.

## Cleanup

Temp workspaces and the temp `CLAUDE_CONFIG_DIR` were removed in `afterEach`; no `claude-live-*` dirs remain in `$TMPDIR`. Each live run's CLI process was closed with `closeRunSession`. No server, app instance, database or user data was created or touched. The classifier file was restored after the red check (`git status` clean for it).

## Test Review Decision

`Not Required — direct low-risk route`.
