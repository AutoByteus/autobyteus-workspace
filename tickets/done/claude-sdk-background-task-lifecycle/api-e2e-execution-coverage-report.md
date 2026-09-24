# API/E2E Execution Coverage Report — claude-sdk-background-task-lifecycle

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle`)

## Execution Round Meta

- Requirements Doc: `.../requirements-doc.md` (SR-004, Approved)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md`
- Supplemental Task Artifacts: `.../probe-evidence/probe-results.md` (+ `probe.mjs`, `probeD.mjs`)
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md`
- Implementation Revision Record: `.../implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete (IR-001, commit `b041e34df`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes and final execution: `Yes`
- Investigation plan followed: `Yes`. Additions: C9, a user-settings `env` probe that characterizes the design's documented residual risk, and a default-run gate check.
- Existing coverage decisions revised during execution: none. Two pre-existing failure groups (1 unit, 3 mocked websocket E2E) were confirmed on base `9267d11c8` and classified as out of scope.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `.../api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running checkpoints: `N/A` (each case ≤ 2 min)
- Ledger reconciled into this report: `Yes`
- Cases still running / not started: none

| Case ID | Final Result | Evidence | Reconciled Result |
| --- | --- | --- | --- |
| C1 | Pass | console | 130/131. The 1 failure is pre-existing on base |
| C2 | Pass | `api-e2e-evidence/c2-c3-pol-01-fix.log` | AC-001/005/006 on PATH CLI 2.1.281 |
| C3 | Pass | same | Same on SDK-bundled CLI 2.1.280 |
| C4 | Pass | `api-e2e-evidence/c4-c5-bg-01-fix.log` | AC-002 on PATH CLI |
| C5 | Pass | same | AC-002 on bundled CLI |
| C6 | Pass | `api-e2e-evidence/c6-regression-live.log`, `c6-interrupt-e2e-mocked-base.log` | All live regressions pass. 3 mocked failures are pre-existing |
| C7 | Pass (control) | `api-e2e-evidence/c7-*` | Both new tests fail on base; the bug is reproduced (`[killed]`) |
| C8 | Pass | `api-e2e-evidence/c8-ac003-overrun-probe.log` | AC-003 |
| C9 | Done (informational) | `api-e2e-evidence/c9-user-settings-env-probe.log` | Documented residual risk confirmed |

## Compatibility / Legacy Scope Check

- Backward compatibility in reviewed scope: `No`
- Compatibility-only or legacy-retention behavior in the implementation: `No` (no flag, no dual path; the removal is tracked for the streaming-input ticket)
- Persisted-data transition: `N/A` (`Not Affected`)
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Req / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-ENV | BEH-001/003, AC-001, AC-005; discovery excluded | `buildQueryOptions` env | vitest unit, mocked SDK | Durable | Pass | C1 |
| E2E-POL-01 | BEH-001/003/005, AC-001, AC-005, AC-006, REQ-003, QR-001 | Real CLI spawned by `ClaudeSdkClient.startQueryTurn` with conflicting caller env (`0` / `600000`) | Live CLI, Messages request captured on a local endpoint (no model call) | Durable (gated) | Pass ×2 CLIs | C2, C3 |
| E2E-BG-01 | BEH-001/002, AC-002, REQ-001/002, SCN-001, QR-001 | Full server path: websocket → AgentRun → Claude backend/session → real SDK/CLI/model | Live E2E, model `haiku` | Durable (gated) | Pass ×2 CLIs | C4, C5 |
| REG-LIVE | Preserved: discovery (`listModels`), turn, resume, MCP, interrupt/resume | Same stack | Live | Durable (existing) | Pass | C6 |
| CTRL-BASE | Test discrimination | `src` reverted to base | Live | Temporary | Fails on base as expected | C7 |
| PROBE-AC003 | BEH-005, AC-003 | Real CLI timeout path | Live E2E | Temporary | Pass ×2 CLIs | C8 |
| PROBE-SETTINGS | Design residual risk | CLI settings `env` precedence | Live CLI capture | Temporary | Risk confirmed (documented) | C9 |
| AC-004 | REQ-003 docs | `docs/modules/agent_execution.md` | Review | — | Pass: the paragraph states the forced values, the reason, the 30-min ceiling with 2-min default, the discovery exclusion, the user-settings risk, the re-check after bumps, and that the policy is temporary | diff `b041e34df` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | — | All ACs directly proven (AC-006 through the CLI's own advertised max `1800000`) | No >30 min clamp run (not required by the AC) |
| Changed-boundary execution directness | 95% | 95% | — | Real client → real CLI; captured effective tool contract | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | — | Full websocket → real model journey on both CLIs | One model (`haiku`), one run per CLI |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | — | cli auth; both executables; parent-session env stripped; caller override; settings precedence characterized | api-key mode is unit-only (same merge expression) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | — | Overrun → visible failure, process terminated; base control reproduces `[killed]`; interrupt/resume regression | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | — | The UI's input stream (TOOL_EXECUTION_* / TURN_COMPLETED / SEGMENT_CONTENT) is asserted; UI unchanged | No browser rendering run (low gain) |
| Durable regression coverage quality and relevance | 95% | 95% | — | Default-CI unit tests plus gated live CLI-contract and journey tests, proven to discriminate | The live tests need `RUN_CLAUDE_E2E=1` (repository convention) |

- Overall post-repository confidence: 95%
- Overall final confidence: 95%
- Calculation method: simple average
- Confidence change from broader validation: none. The live runs were part of the gated repository suites.
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: RSK-A and RSK-B (below)

## Broader Validation Decision And Execution

- Decision: `Required`. Mode: live CLI + live agent through the server-side stack. Executed inside the new gated durable suites plus two temporary probes.
- Deviation: none. Browser validation was `Not Required`: the change is backend-only CLI spawn env, and the websocket stream that the unchanged UI renders was asserted directly.
- Startup/readiness: each test starts an in-process Fastify + websocket on `127.0.0.1:0` (readiness = socket open) or a local capture endpoint on `127.0.0.1:0`.
- Environment choices: `RUN_CLAUDE_E2E=1`. Parent Claude Code session vars (`CLAUDECODE`, `CLAUDE_CODE_*`, `CLAUDE_PID`, `CLAUDE_EFFORT`, `CLAUDE_AGENT_SDK_VERSION`) are removed: by `env -u` for existing tests, and by in-test `vi.stubEnv` or an explicit env for the new tests. The CLI is selected through `CLAUDE_CODE_EXECUTABLE_PATH`.
- Identity: local Claude CLI auth (cli mode) for model runs. The capture test uses a dummy `ANTHROPIC_API_KEY`, so no real credential reaches the capture endpoint.

| Scenario / Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| BG-01: user asks to run `sleep 20; echo done > marker` "in the background" | No `run_in_background`; runs in the foreground | Bash args `{command, description}`. TOOL_EXECUTION_SUCCEEDED "(Bash completed with no output)" about 20 s later | c4-c5 log | Pass |
| BG-01: same turn | Marker exists at TURN_COMPLETED; the agent reports the result | Marker = `done` at TURN_COMPLETED. The agent Read the marker and replied with `done`. No `[killed]` | c4-c5 log | Pass |
| BG-01 on base (control) | Fails | `run_in_background: true` → "Command running in background … You will be notified". Turn ended in about 9 s. Task output `[killed]` | c7 logs | Control OK |
| POL-01 | Bash max 30 min, default 2 min, no background on any tool | timeout "max 1800000". Description "up to 1800000ms / 30 minutes … default 120000ms (2 minutes)". No tool offers `run_in_background` | c2-c3 log | Pass |
| AC-003 overrun | Visible timeout in the turn | TOOL_EXECUTION_FAILED "Exit code 143 / Command timed out after 5s"; turn about 14 s; marker absent 45 s later | c8 log | Pass |

## Desktop Application Validation

- Not applicable: no renderer or shell change.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node 22.23.1; vitest 4
- `@anthropic-ai/claude-agent-sdk@0.3.280`; PATH Claude CLI 2.1.281 (`/Users/normy/.local/bin/claude`); SDK-bundled CLI 2.1.280 (`@anthropic-ai/claude-agent-sdk-darwin-arm64@0.3.280`)
- Model: `haiku`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Not Affected`. No persisted data changes; there is no version-specific branch or fallback.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts` | Added | AC-001/005/006, REQ-003 guard, QR-001: the real CLI tool contract | Pass (2/2); fails on base | Gated `RUN_CLAUDE_E2E=1`. No model call (local capture endpoint) |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts` | Added | AC-002, QR-001: websocket → real model journey | Pass (2/2); fails on base | Gated `RUN_CLAUDE_E2E=1`. About 30 s per CLI |
| `autobyteus-server-ts/tests/helpers/claude-cli-executable-candidates.ts` | Added | QR-001 CLI matrix; standalone env | Used by both | Shared helper |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Durable coverage added: `Yes` (the 3 paths above; not committed, left as untracked files in the worktree for Delivery)
- Paths removed: none
- Attached for proportional test-code review: `Not Applicable` (direct low-risk route; review not required)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `.../api-e2e-evidence/*.log`, `c7-bg-01-control-base-task-outputs.txt` | Run logs | Retained | No credentials (checked) |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tests/e2e/runtime/tmp-ac003-timeout-overrun-probe.e2e.test.ts` | Optional AC-003; model-compliance-dependent wording is too brittle for durable coverage | c8 log | Deleted |
| `tests/integration/.../tmp-user-settings-env-probe.integration.test.ts` + temp `CLAUDE_CONFIG_DIR` | Characterize the design's residual risk without touching the user's `~/.claude` | c9 log | Deleted |
| Temporary revert of `claude-sdk-client.ts` to `9267d11c8` (3 times) | Base control / pre-existing-failure check | c7, c6-base logs | Restored with `git checkout`; `git diff -- src` is empty |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic Messages API (POL-01 only) | Local capture endpoint returning 400 | The goal is the CLI's advertised tool contract, which is deterministic and free | None for AC-006; the real API is used in BG-01 / C6 / C8 |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | UNIT-ENV, E2E-POL-01, E2E-BG-01, REG-LIVE, PROBE-AC003, AC-004 | All ACs proven on both CLIs |
| Pass (control) | CTRL-BASE | New tests discriminate; the original bug reproduces on base |
| Out Of Scope | Pre-existing: `claude-session.test.ts > switches an opened but unconfirmed first query…`; 3 mocked tests in `claude-agent-websocket-interrupt-resume.e2e.test.ts` | They fail identically on base `9267d11c8`; the fake SDK is bypassed and the real CLI is hit with `claude-test-model` / not logged in |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp workspaces / config dirs | Created by the tests | `fs.rm` in test cleanup | None left |
| CLI task dirs `/private/tmp/claude-501/*claude-live-background-bash-*`, `*claude-cli-runtime-policy-*` and `~/.claude/projects/` session dirs for the same patterns | Created by these runs (unique names) | `rm -rf` | 0 remaining |
| Background `sleep` processes | Created by the runs | Checked with `pgrep` | None |
| Temporary probe files and the `src` revert | Mine | Deleted / `git checkout` | Clean |

## Residual Risks (for Delivery / Solution Designer)

- RSK-A (documented, accepted in the design): a user/project Claude settings `env` block overrides the policy inside the CLI. C9 confirmed this on both CLIs: `run_in_background` reappears and the maximum returns to 600000. It is not present on this machine (`~/.claude/settings.json` has no `env`). The design escalation trigger "found in practice" did not fire.
- RSK-B (out of scope, informational): with the policy applied, the CLI still advertises other CLI-process-scoped tools whose work outlives a turn or relies on later notifications: `Monitor`, `ScheduleWakeup`, `CronCreate`/`CronDelete`/`CronList`, `Workflow`, `PushNotification`. REQ-001 covers Bash only, and the builtin tool list is owned by `claude-sdk-builtin-tool-restriction` (or the follow-up streaming-input ticket).
- RSK-C: the model must request a long `timeout` explicitly; the default stays 2 min (ASM-002, confirmed by the advertised description).
- Pre-existing unrelated test failures (1 unit, 3 mocked websocket E2E) remain on the base branch.

## Preliminary Classification

- N/A (Pass)

## Recommended Recipient

- Per `get_handoff_rules` for a direct-route Pass (expected `/delivery_engineer`).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`
- Any final category below 90%: `No`
- Broader validation decision: `Required`, executed (live CLI + live agent, both CLIs)
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: Delivery (direct low-risk route; test-code review `Not Required — direct low-risk route`)
