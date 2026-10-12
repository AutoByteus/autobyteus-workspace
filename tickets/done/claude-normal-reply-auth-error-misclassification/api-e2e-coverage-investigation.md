# API/E2E Coverage Investigation

- Package: `claude-normal-reply-auth-error-misclassification` (URGENT)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification`, `codex/claude-normal-reply-auth-error-misclassification` (implementation `fc87231ba`, artifacts `86461e75b`)
- Route: direct, Small / Low (confirmed). Architecture review and code review: `N/A — not applicable`.
- Upstream basis: requirements-doc SR-001 (Approved), design-spec SR-001, investigation-notes, solution-revision-record SR-001, implementation-handoff and implementation-revision-record IR-001, probe-evidence frames.
- API/E2E revision: `API-REV-001` (initial)

## Instructions Read

| Path | What it set |
| --- | --- |
| `TESTING.md` (repo root) | Layers. For a backend runtime change: server tests, plus a gated runtime suite for real-runtime proof. Gates (`RUN_*`) default to skipped. Real-provider runs cost credits, so run them only when the change needs real-provider proof. Evidence goes in the ticket. Rule 2: never test against the user's running app or data. Rule 9: fix failures that also fail on the base. |
| `autobyteus-server-ts/AGENTS.md` | Single-file `vitest run <path> --no-watch`, `test:unit`, `typecheck` |
| `tests/e2e/helpers/claude-live-agent-harness.ts` | Existing live harness: real AgentRun + ClaudeAgentRunBackend + ClaudeSession + ClaudeSdkClient + real CLI behind the real agent websocket (`/ws/agent/:runId`). Gate `RUN_CLAUDE_E2E=1`. `useStandaloneClaudeCli` strips the parent Claude Code session env. |
| `tests/helpers/claude-cli-executable-candidates.ts` | Cases for both the PATH `claude` (2.1.295) and the CLI bundled with SDK 0.3.280 |

No closer `TESTING*.md` exists under `autobyteus-server-ts`.

## Changed Boundary And Surfaces

- Changed code: `resolveClaudeTurnTerminalError` (classifier for Claude SDK `result` frames), in `claude-session-output-events.ts`.
- Affected surfaces: domain/backend logic (classifier), runtime integration (real SDK/CLI frames → ClaudeTurnTracker → ClaudeSession → AgentRun events), transport (agent websocket `ERROR` / `TURN_COMPLETED` / `AGENT_STATUS` messages that the frontend renders).
- Not affected: frontend rendering (out of scope; it renders what the server streams), persistence (`Not Affected`), the desktop shell.

## Scenario Map

| Scenario | AC | Real trigger | Planned evidence |
| --- | --- | --- | --- |
| SCN-001 normal reply mentions markers | AC-001 | A user message over the agent websocket to a logged-in Claude run. The agent's final reply contains "Not logged in · Please run /login" and "authentication_failed". | Unit (classifier + session with real frames) + **live E2E** through the real CLI, SDK, session and websocket |
| SCN-002 runtime not logged in | AC-002 | A user message over the agent websocket while the Claude CLI has no credentials (empty `CLAUDE_CONFIG_DIR`, as in R-02) | Unit (session with real frames) + **live E2E** through the real CLI, SDK, session and websocket |
| SCN-003 other SDK errors | AC-003 | — | Existing unit suites (`errors[]`, precedence, redaction), unchanged |
| AC-004 | AC-004 | Released app | User verification, owned by delivery. Not claimed here. |

Additional real-use scenario: the Claude-side marker replies the user saw came from Team members and the PTM. They share the same single session/tracker/classifier path (design-spec), so a standalone run reaches the same boundary. No extra Team case is needed.

## Existing Coverage Decisions

| Test | Decision | Reason |
| --- | --- | --- |
| `tests/unit/.../claude-session-output-events.test.ts` existing error-result cases (`errors[]`, precedence, redaction, auth) | Still Valid | REQ-002/REQ-003 preserved behavior |
| same file, 3 new cases (IR-001) | Still Valid | Classifier proof for REQ-001/REQ-002 with real frames |
| `tests/unit/.../claude-session.test.ts`, 2 new cases (AC-001, AC-002) | Still Valid | Session-level proof with real frames; failed before the fix (AC-001) |
| `tests/unit/.../claude-turn-tracker*.test.ts` | Still Valid | Non-success-subtype fallback unchanged (RK-01) |
| Grok auth E2E (`grok-build-runtime-replay.e2e.test.ts`) | Out Of Scope | Different runtime |
| Live Claude E2E suites (`tests/e2e/runtime/claude-*.e2e.test.ts`) | Still Valid / Out Of Scope | None asserts marker-reply behavior |

## Coverage Gaps And Decisions

| Required behavior | Gap | Decision |
| --- | --- | --- |
| AC-001 through the real SDK/CLI and websocket (the user's actual symptom: red card + ERROR status) | Unit tests replay captured frames through a fake SDK client. Nothing proves that a live CLI turn now reaches the websocket as a normal completion. | **Add Durable Coverage**: gated live E2E `tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts` (`RUN_CLAUDE_E2E=1`), case AC-001 |
| AC-002 through the real SDK/CLI and websocket | Same gap. Also: is the real not-logged-in failure still surfaced end to end? | **Add Durable Coverage**: same file, case AC-002 (empty `CLAUDE_CONFIG_DIR`; no provider call, no cost) |

Cost note: AC-001 needs one short `haiku` turn per CLI candidate (2 turns). That is real-provider spend. It is justified because the defect lives in how real model replies are classified, and the user's report is about that live path.

## Execution Plan

1. Repository checks: Claude backend unit folder, then the agent-execution and runtime-management unit suites, then `typecheck`.
2. Live E2E: `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts --no-watch`. Both CLI candidates; temp workspaces and a temp config dir, removed in `afterEach`. No user app or user data is touched. The CLI uses the operator's existing Claude login (keychain) for AC-001 only.
3. Baseline red check: revert the classifier on a scratch copy and run the live AC-001 case once, to show the live case detects the defect.

## Broader-Validation Decision

`Not Required` (browser/desktop). The frontend is out of scope and renders the streamed `ERROR` / `TURN_COMPLETED` / `AGENT_STATUS` unchanged. The live websocket E2E proves the server's streamed contract, which is the changed boundary. AC-004 stays user verification.

## Updates From Execution (API-REV-001)

- Repository checks R-1..R-3: Pass.
- Live E2E first run: every case failed with `TypeError: ownSession is not a function`. The shared live harness had fallen behind `ClaudeSessionManager.createRunSession(runContext, ownSession)` (`028cca231`); the base fails the same way. Decision: **Needs Update (baseline fix)** for `tests/e2e/helpers/claude-live-agent-harness.ts` and the same call in `claude-agent-websocket-interrupt-resume.e2e.test.ts`. Fixed in its own commit (TESTING.md Rule 9).
- AC-002: the run streams `AGENT_STATUS error` before the `ERROR` frame. The test now asserts the final status rather than the order.
- AC-001: the first red run timed out without diagnostics, so the case now waits for `TURN_COMPLETED` or `ERROR`, whichever comes first. A regression then fails in about 3 s and shows the ERROR frame.
- The fake-CLI block of `claude-agent-websocket-interrupt-resume.e2e.test.ts` still fails on the base after the signature fix. Cause: its fake SDK bypasses the controlled-spawn opening and exact cleanup protocol. Classified `Out Of Scope` for this change and reported as a separate baseline item (see the execution report).
- Final results, confidence and evidence: `api-e2e-execution-coverage-report.md`.
