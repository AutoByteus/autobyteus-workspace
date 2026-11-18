# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 1, implementation IR-001 complete (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: `None`
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/tickets/in-progress/agent-tools-mcp-tool-error-result/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `1cd540bae5` (code `253854bf8d`) | macOS 26.5.2, Node v22.23.1 | Server E2E from source (vitest), real studio server over HTTP and WebSocket, two local auth-required streamable-HTTP MCP servers; scripted AGY CLI (`agy-failure-cli.mjs`); native AutoByteus with LM Studio `qwen/qwen3.6-35b-a3b`; live Codex App Server (`codex-cli 0.164.0`, model `gpt-5.6-luna`); live Claude Agent SDK (`claude 2.1.310`, model `haiku`) | `env -i` with only `PATH`, the real `HOME`, `USER`, `LOGNAME`, `TMPDIR` and the gates. Codex ran with a throwaway `CODEX_HOME` (empty `config.toml` + symlink to `~/.codex/auth.json`), so the user's Codex config (which defines MCP servers) was not used. Dummy credential `test-dummy` only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (discrimination) | AGY → endpoint → adapter, base vs fix | Reused: IMP-00 | — | Pass (base fails, fix passes) | — | — | Code unchanged since `253854bf8d` |
| API-02 | AC-003, AC-004 | adapter units, all Agent Tools units | Reused: IMP-02 | — | Pass | — | — | Same reason |
| API-03 | AC-004 | MCP routes integration (protocol answers) | Reused: IMP-03 | — | Pass | — | — | Same reason; it ran in a clean env |
| API-04 | AC-004 | server typecheck | Reused: IMP-04 | — | Pass | — | — | Same reason |
| API-05 | AC-001, AC-002, AC-004, QR-001, REQ-001…003 | real studio server, Agent Tools MCP endpoint, four runtimes | `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" CODEX_HOME=<throwaway> RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch --reporter=verbose` (cwd: worktree root) | ENV-1 | Pass | `API-05-e2e-all-gates-clean-env.log`; per runtime `API-05-<agy\|native\|codex\|claude>.json` and `API-05-<runtime>-revoked.json` | `Tests  8 passed (8)`; each `*-revoked.json`: `"statusInToolResult": true`, `"dummyValueOnAgentWire": false`, `remoteRequests` only `initialize` with `auth: "other"`; `codex-revoked.json` / `claude-revoked.json` `events`: `TOOL_EXECUTION_FAILED … TURN_COMPLETED`, no `ERROR`; the Codex `lastEvents` show the agent's reply text `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized` | AGY rerun in a clean env (IMP-01 inherited the shell). U-01 resolved: both live clients present the `isError` result to the model as a tool failure, the turn continues, and the agent reports the reason. Native (path unchanged): `ERROR ToolExecution.Exception.tok_auth_probe` with the same text, as on base (the test asserts no `ERROR` only for external runtimes) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (AGY revoked: no `ERROR`, `TURN_COMPLETED`, status text, no dummy), API-01 (fails on base) | Proven | — |
| AC-002 | Yes | API-05 (Codex and Claude revoked: same outcome on live runtimes) | Proven | — |
| AC-003 | Yes | API-02 (IMP-02: adapter unit, 6 cases) | Proven | — |
| AC-004 | Yes | API-02, API-03, API-04; API-05 credential cases on all four runtimes and the native revoked case | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 100% | Repo: AC-001/003/004 (AGY scripted). Final: AC-002 live on Codex and Claude (API-05) | — | — |
| Changed-boundary execution directness | 90% | 100% | The adapter reached through the real endpoint by four MCP clients (API-05) | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real servers, real HTTP auth refusal, real CLIs; the AGY client is scripted | Runtime versions change over time | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean env; isolated Codex config; dummy credentials | Claude used the user's real `HOME` (required for its sign-in) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Revoked token on every runtime; the "tool gone at call time" race is unit-only (not producible by real use on purpose) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Server-only change; the run view shows the same wire events the test reads | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | Unit adapter test; e2e revoked case for every runtime, gated | Live gates run only on demand | — |

- Overall post-repository confidence: 85%
- Overall final confidence: 97% (simple average of the six applicable final scores)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. R-01 (text a remote server puts in its own response body) is out of scope, as in the requirements.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (gated live runtime suites)
- Confidence gap: live clients' handling of `isError` results (U-01) and AC-002. Closed.
- Browser validation needed: no. It is a server-to-runtime boundary with no UI change.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Compatibility-only behavior observed: `No`
- Durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round by API/E2E: `No`. The implementation's new unit test and its updated e2e file were reviewed and kept.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY | Scripted CLI | Mandated by AC-001; no AGY account use | Live AGY not run (not required) |
| Remote MCP servers | Local auth-required test servers | Deterministic revocation | None for this change |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Throwaway `CODEX_HOME` | Yes | Removed | `~/.codex` not written |
| LM Studio `qwen/qwen3.6-35b-a3b` (loaded just-in-time by this run; none was loaded before) | Yes | `lms unload qwen/qwen3.6-35b-a3b` | `No models are currently loaded.` |
| Test servers and data dir | Yes | Test teardown | — |
| Live runtime use | — | Eight short turns on the user's Codex and Claude sign-ins (required by AC-002); Claude sessions are recorded in the user's Claude history | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: Delivery
- Notes: cosmetic observation for delivery or the next touch of the file: `configured-mcp-registry-tool-adapter.ts` has `export const resolveExecutionAgentId =(session…` (a missing space after `=`). There is no server lint/format script that fails on it.
