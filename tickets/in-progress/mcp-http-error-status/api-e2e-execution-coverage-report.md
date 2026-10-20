# API/E2E Execution Coverage Report — mcp-http-error-status

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: Round 1, implementation handoff IR-001 (direct Small / Low route)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - The revoked-token agent case (API-09) was planned for the scripted AGY runtime. Its first run showed that the Agent Tools MCP endpoint replaces every configured-MCP tool error with JSON-RPC `Internal error`. This change did not cause that; it is recorded as follow-up FU-001. The durable revoked case therefore runs on the native AutoByteus runtime with a local LM Studio model (new case API-11), which proves REQ-006 end to end. The AGY run (API-09) remains as the regression run for the refactored suite and as FU-001's evidence.
  - API-10 (probe IMP-08) is reused as planned. API-01/02/03 are reused and were also re-executed inside API-04/API-05, see Notes.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status/tickets/in-progress/mcp-http-error-status/evidence`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | product source `bb1d3cd28c` (HEAD `9aeef2b63e` adds only ticket docs); this round's test changes are commit `1b167771a7` (the files run were identical to it) | macOS 26 (Darwin 25.5.0), Apple Silicon | node v22.23.1; `autobyteus-ts` and `autobyteus-server-ts` built in API-00 from that source | clean env `env -i PATH HOME=<resolved temp> TMPDIR`; built test server with its own port, runtime root, SQLite DB; dummy credentials only (`test-dummy`, `test-rotated`) |
| ENV-2 | as ENV-1 | as ENV-1 | in-process studio server (`startStudioE2eRuntimeServer`) from server `src` and `autobyteus-ts/dist`; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (no model) | `RUN_AGY_FAILURE_E2E=1`; temp data dir and temp `HOME` |
| ENV-3 | as ENV-1 | as ENV-1 | as ENV-2, native AutoByteus runtime with LM Studio `qwen/qwen3.6-35b-a3b` at `localhost:1234` (local, no paid provider) | `RUN_LMSTUDIO_E2E=1`, temperature 0; the model was not loaded before the run and was unloaded after it |
| ENV-4 | as ENV-1 | as ENV-1 | server unit/integration runners (`tests/setup/test-environment-isolation.ts`) | — |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | builds | `pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-builds.log` | `server build exit 0` | every `dist`-consuming case below uses this build |
| API-01 | AC-003, AC-004 (refused), AC-005 (unit), AC-006 | `HttpManagedMcpServer` with the real SDK | Reused: IMP-02 | — | Pass | (IMP-02) | (IMP-02) | ran on `bb1d3cd28c`, the commit validated; no product file changed since. The same file ran again inside API-04: `✓ tests/unit/tools/mcp/http-managed-mcp-server.test.ts (15 tests)` |
| API-02 | AC-005 regression | `autobyteus-ts` MCP integration with real tiny servers | Reused: IMP-04 | — | Pass | (IMP-04) | (IMP-04) | same commit; the integration MCP files also ran inside API-04 (`✓ tests/integration/tools/mcp/http-managed-mcp-server.test.ts (6 tests)`) |
| API-03 | design Dependency Rules (lazy SDK load) | emitted module | Reused: IMP-05 | — | Pass | (IMP-05) | (IMP-05) | same source; API-00 rebuilt it and `dist/…/http-managed-mcp-server.js` still has one `modelcontextprotocol` occurrence, the dynamic import (checked: `grep -c withHttpStatus` = 2) |
| API-04 | regression (`autobyteus-ts` changed) | full core library suite | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts test` | ENV-1 | Pass | `API-04-autobyteus-ts-full.log` (excerpt) | `Test Files  387 passed \| 26 skipped (413)`, `Tests  2368 passed \| 78 skipped (2446)` | skips are the gated live tests (no gate set) |
| API-05 | regression | server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-4 | Pass | `API-05-server-unit.log` (excerpt) | `Test Files  752 passed \| 4 skipped (756)`, `Tests  6201 passed \| 7 skipped (6208)` | includes the server's MCP config, registrar, Agent Tools MCP and GraphQL MCP units |
| API-06 | regression | server integration suite | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `pnpm -C autobyteus-server-ts test:integration` | ENV-4 | Pass | `API-06-server-integration.log` (excerpt) | `PREPARE exit 0`; `Test Files  78 passed \| 20 skipped (98)`, `Tests  421 passed \| 69 skipped (490)` | skips are gated suites |
| API-07 | AC-001, AC-002, AC-003, AC-004, REQ-005 | GraphQL `previewMcpServerTools`, `configureMcpServer`, `discoverAndRegisterMcpServerTools` on the built server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts --no-watch --reporter=verbose` (final run together with API-08) | ENV-1 | Pass | `API-07-e2e-error-status.log` (first full run), `API-08-e2e-mcp-http-three-files.log` (final) | `✓ … states the HTTP status in the preview and the discover message for 401, 403, 404 and 500`; `✓ … names the status of a 404 whose body is empty`; `✓ … keeps the text of failures without an HTTP answer, without a status`; `✓ … never shows the token in a response or in the server's output` | exact `toBe` texts: `Failed to preview tools for MCP server: Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized` (and 403/404/500); discover `{ success: false, message: "Error: HTTP 401 Unauthorized: …", discoveredTools: [] }`; empty 404 `…: HTTP 404 Not Found: Error POSTing to endpoint: `; refused `…: TypeError: fetch failed` / discover `TypeError: fetch failed`; stdio process exiting at once `…: SdkError: Connection closed`; none matches `/HTTP \d{3}/`. A first run used a placeholder for the stdio text and failed only on it, by design, to observe the real text (progress log) |
| API-08 | AC-005, REQ-005 | existing credential and redirect journeys on the built server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-08-e2e-mcp-http-three-files.log` | `Test Files  3 passed (3)`, `Tests  8 passed (8)` | the redirect suite now also asserts `Failed to preview tools for MCP server: Error: HTTP 307 Temporary Redirect: ` and discover `^Error: HTTP 307 Temporary Redirect: `, next to its unchanged `Redirect to … not followed` and `(redirectPolicy: 'same-origin')` assertions and its credential/canary scans |
| API-09 | regression of the refactored runtime suite; FU-001 evidence | scripted AGY agent run → Agent Tools MCP → registry MCP tool → managed server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs … vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-2 | Pass (credentialed tool calls). The planned revoked-token assertion on AGY did not hold: FU-001 | `API-09-11-agent-tool-call-final.log`, `API-09-11-agent-wire/agy.json`; first run `API-09-agent-tool-call-revoked.log` | final: `✓ … agy: the agent's tool calls reach both servers with their credentials`. First run: `ERROR:{"code":"AGY_TURN_ERROR","message":"Internal error",…}` | cause found by reading: `agent-tools-mcp-method-dispatcher.ts` `dispatchToolsCall` `catch { return this.internalError(id); }` → `-32603 "Internal error"` for any adapter error; `onToolError` has no implementer. Present since `3a82ba5cb9`, independent of this change, and it applies to every configured-MCP tool error. Recorded as FU-001; the durable revoked case moved to native (API-11) |
| API-10 | BEH-001, BEH-004 | preview path probe | Reused: IMP-08 | — | Pass | (IMP-08) | (IMP-08) | same commit; before/after texts |
| API-11 | AC-006, REQ-006, REQ-005 | native AutoByteus agent run → `GenericMcpTool` → `McpServerProxy` → `HttpManagedMcpServer.connect`, against a registered server that has since revoked the token | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<…> RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.6-35b-a3b MCP_AUTH_E2E_EVIDENCE_DIR=<ticket>/evidence/API-09-11-agent-wire pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch --reporter=verbose` | ENV-3 | Pass | `API-09-11-agent-tool-call-final.log`, `API-09-11-agent-wire/native-revoked.json`, `API-09-11-agent-wire/native.json` | `✓ … native: after the server revokes the token, the agent's tool call fails with the HTTP status`; in `native-revoked.json`: `"statusInToolResult": true`, `"dummyValueOnAgentWire": false`, remote requests only `initialize` with `"auth": "other"`; wire text `Error executing tool 'tok_auth_probe' (ID: …): Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized` (in `ERROR` and `TOOL_EXECUTION_FAILED`) | also passed in an earlier run before the case was simplified to one `it` (progress log). The registered-then-revoked order is real use: the tools were discovered with the valid token in `beforeAll`, then the server accepts only another value |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (preview text per status, SDK text, no token) | Yes | API-07, API-08, API-10 | Proven | — |
| AC-002 (discover `success: false` + status per status) | Yes | API-07, API-08 | Proven | — |
| AC-003 (empty-body 404 → `HTTP 404 Not Found`) | Yes | API-01 (unit), API-07 (GraphQL) | Proven | — |
| AC-004 (refused and stdio failure unchanged, no status) | Yes | API-01 (refused, unit), API-07 (refused preview + discover, stdio preview through GraphQL), API-10 | Proven | — |
| AC-005 (existing suites pass; redirect keeps its text and now has `HTTP 307`) | Yes | API-08, API-02, API-04 | Proven | — |
| AC-006 (tool call whose connect gets 401 → `HTTP 401`) | No (REQ-006 is `Should`) | API-01 (managed server `callTool`), API-11 (real native agent run) | Proven | — . On AGY/Codex/Claude the agent sees `Internal error` for every configured-MCP tool failure; that cause is outside this change (FU-001) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | every AC with exact-text assertions on the real surface: API-07, API-08, API-11, API-01 | REQ-006 on Agent Tools MCP runtimes is held back by FU-001 (pre-existing, outside this change) | FU-001 |
| Changed-boundary execution directness | 98% | 98% | real SDK + real HTTP answers in unit (API-01) and through the built server (API-07/08); real agent run (API-11) | none material | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | no SDK mock anywhere; built server via GraphQL; real runtime with a local model | HTTP/2 empty-reason branch not reachable with Node HTTP/1.1 servers (read only) | an HTTP/2 TLS fixture; not worth it for one ternary |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean env, current build, test-owned server/DB, real `Authorization` handling with dummy values | none material | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 401/403/404/500, empty body, refused, stdio exit, cross-origin 307, revoked token after registration, `FAILED` state | post-connect HTTP errors (U-001) deliberately unchanged | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | the web shows the GraphQL message verbatim (`toolManagementStore.ts` joins `errors[].message`); no web code changed; GraphQL text is proven exactly | rendering not run in a browser | a browser probe would only re-display the proven string |
| Durable regression coverage quality and relevance | 95% | 95% | exact-text e2e for every status, failure kinds without status, redirect status, native revoked-token run | the native case needs LM Studio (gated); the AGY variant waits on FU-001 | FU-001 adds the AGY case |

- Overall post-repository confidence: 95.4%
- Overall final confidence: 95.4%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-001 (AGY/Codex/Claude agents see `Internal error`, not the status: pre-existing and not caused by this change); HTTP/2 empty reason phrase covered by reading only.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond what ran. The gated real agent runs (API-09, API-11) were run as the targeted surface for SCN-003.
- Execution mode: `Live API` (built server GraphQL) and `Other` (in-process runtime agent runs: scripted AGY, native with a local model)
- Confidence gap or residual risk it addresses, and the expected gain: SCN-003's real tool-call path, which the unit test covers only at the managed server. Gain: REQ-006 proven end to end on the native runtime, and FU-001 found.
- Browser validation needed, and why or why not: No. The change is server-side message text, and the web renders the GraphQL message verbatim with no code change. API-07/08 prove the exact string the web receives.
- If `Not Required`: the cases that already exercise the real changed boundary: API-07, API-08, API-11, API-01.
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (one rethrow; no old-text path kept)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` | Updated: server started in `beforeAll`; new cases for an empty-body 404, failures without an HTTP answer (refused preview + discover, stdio process that exits) and a final token/output scan | API-07, API-08 | — |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | Updated: asserts the `HTTP 307 Temporary Redirect` status on the cross-origin preview and discover | API-08 | — |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Updated: `setRequiredAuthorization()` to revoke the accepted credential at run time (default behavior unchanged) | API-09, API-11 | — |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Updated: run start and turn wait extracted into `startRun`/`runTurn`; new case `native: after the server revokes the token, the agent's tool call fails with the HTTP status` (gated `RUN_LMSTUDIO_E2E`) | API-09, API-11 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| remote MCP server answering with HTTP errors | local `node:http` server per status; real MCP server (`@modelcontextprotocol/server`) with a credential check for the revoked case | a real third-party server cannot be told to answer 403/404/500 on demand | none for this change: the SDK and our code see real HTTP answers |
| AGY CLI | scripted `agy-failure-cli.mjs` (real MCP client calling the real Agent Tools endpoint) | TESTING.md's no-model runtime | proves the transport, not paid inference |
| LLM for native runtime | local LM Studio model | no paid provider needed | none material |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| built test servers, runtime roots, SQLite DBs | Yes | test `afterAll` (kill + `removeOwnedTestRuntime`) | removed |
| in-process studio servers, temp data dirs, agent definitions and runs | Yes | test `afterAll` (terminate runs, delete definitions, close app, remove dir) | removed |
| local HTTP/MCP servers | Yes | closed in `afterAll` | closed |
| temp `HOME` folders | Yes | `rm -rf` after each command | removed |
| LM Studio model `qwen/qwen3.6-35b-a3b` | loaded on demand by this run | `lms unload` after each run | `not-loaded` again |
| untracked `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` | build outputs (implementation's and API-00's) | left as build output, not committed (TESTING.md) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: delivery engineer
- Notes: FU-001 (`follow-ups.md`) records the Agent Tools MCP endpoint's `Internal error` masking for the Solution Designer to send when the ticket leaves the team. It does not block this ticket: it predates the change, applies to every tool error on that endpoint, and lies in functionality the requirements put out of scope.
