# API/E2E Execution Coverage Report — mcp-http-auth-headers

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/mcp-http-auth-headers/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/mcp-http-auth-headers/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/mcp-http-auth-headers/api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-01M (new): a mutation check of the built core (headers dropped) to prove API-01/02 go red without the fix.
  - API-08 (new): the runtime file with no gate set, to prove it skips cleanly and spends nothing by default.
  - API-03's first attempt and API-05's first attempt failed on test setup, not product behavior: the scripted AGY CLI needs `AGY_FAKE_CASE=linked_skills` to answer `CALL_TOOLS:`, and the Codex model picker knew none of the model IDs this machine lists. Both were fixed in the test before the passing runs; the progress log records both.
  - After API-04/05/06 passed, the test files got a type-only cleanup: bracket `process.env[...]` access, typed server variables, and a typed `mcps.json` read. The Codex/Claude model-picker fallback was added before API-05/06 ran. API-01/02 and API-03 were rerun on the final files; API-04/05/06 were not rerun, since the cleanup changed no runtime behavior (see Notes on those rows).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers/tickets/in-progress/mcp-http-auth-headers/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `e129930bcf` source + the new test files | macOS 26 (Darwin 25.5.0), node from the worktree shell, pnpm 10.28.2 | Built server `autobyteus-server-ts/dist/app.js` from `pnpm -C autobyteus-server-ts build` at `e129930bcf` (core `autobyteus-ts/dist` built at `b109a62ea6`; no `autobyteus-ts` change since). Started twice by `startBuiltTestServer`. | `env -i PATH HOME=<resolved temp> TMPDIR`. The server gets the sanitized test env. Test-owned port, runtime root under `autobyteus-server-ts/tests/.tmp` and SQLite db under `db/`, removed by the test. Local MCP servers in the test process on 127.0.0.1. Dummy values only. |
| ENV-2 | same | same | In-process studio server (`startStudioE2eRuntimeServer`), temp app data dir | `env -i PATH HOME=<resolved temp> TMPDIR`. Scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (no model). |
| ENV-3 | same | same | In-process studio server; host LM Studio 127.0.0.1:1234, `qwen/qwen3.6-35b-a3b` | Clean env as ENV-2. The model was loaded just in time by this run and unloaded afterwards (`lms unload`). No other local-model run in parallel. |
| ENV-4 | same | same | In-process studio server; host signed-in `codex` CLI (app-server), model `gpt-5.6-luna`, `reasoning_effort: low` | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR` (real HOME for the CLI login). One turn, adding one session to the user's Codex history. |
| ENV-5 | same | same | In-process studio server; host signed-in `claude` CLI, model `haiku` | Same as ENV-4. One turn. |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-002, AC-003, AC-006 (core) | core client against a real SDK server | Reused `IMP-02` (and red proof `IMP-00`) | — | Pass | (implementation handoff) | — | Ran on `b109a62ea6`. `git diff --name-only b109a62ea6 e129930bcf` outside `tickets/` lists only `autobyteus-web/components/tools/McpServerFormModal.vue`, so no core code changed since. |
| API-R02 | AC-002 (persist), persisted data | file provider save → reload; existing entry without a token | Reused `IMP-04` | — | Pass | (implementation handoff) | — | Same reasoning; server `src` unchanged since `b109a62ea6`. |
| API-R03 | AC-006 | server integration suites | Reused `IMP-05` | — | Pass | (implementation handoff) | — | Same reasoning. |
| API-R04 | AC-004, AC-005 | web component + localization guards | Reused `IMP-06`, `IMP-08`, `IMP-09` | — | Pass | (implementation handoff) | — | Ran on `d89135a832`, the source validated here. |
| API-R05 | AC-003 (GraphQL preview through the UI), AC-004, AC-005 | rendered form on the dev stack | Reused `IMP-10` | — | Pass | (implementation handoff) | — | Same commit. DOM-asserted, and the dummy server logged auth on every request. |
| API-01 | AC-001, AC-002, AC-003, AC-006, AC-008; SCN-001..004, A2..A4 | GraphQL preview/configure/import/discover → registry → SDK → remote server; `/mcp/gateway` `tools/call`; `mcps.json`; built server output | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts --no-watch`, first `it` | ENV-1 | Pass | `API-01-built-server-e2e.log`, `API-01-observations.json.txt` | Log: `Tests  2 passed (2)`. Observations: every `hdr`, `tok`, `imp` request is `"auth": "expected"`, including `"rpcMethod": "tools/call"`. `tok` holds one `"other"` (wrong token) and one `"none"` (blank token) `initialize`. `open` is all `"none"`. | Proves on the real server: header form (`Authorization: Basic …`), token form (trimmed, sent as Bearer), import of `{url, headers}`, and an open server. Wrong and blank token: preview fails with `Failed to preview tools for MCP server`, and the error doesn't contain the value. Conflict on configure, preview and import: the message contains `sets both 'token' and an 'Authorization' header; use one of them.`, no value, `importedCount 0 / failedCount 1`, zero requests reach the server, and nothing is saved (`mcpServers` lists only `hdr, imp, open, tok`). `mcps.json`: `tok` keys `token, tool_name_prefix, url`; `hdr` keys `headers, tool_name_prefix, url`. GraphQL returns the saved token, as the requirement keeps it. |
| API-02 | AC-002 (reload), REQ-001, persisted data (SCN-A1) | real process stop/start → startup `loadAllAndRegister` → gateway `tools/call` | same command, second `it` | ENV-1 | Pass | `API-01-built-server-e2e.log`, `API-01-observations.json.txt` | `✓ re-registers saved credentials at startup after a restart and keeps sending them`. In observations after the restart, each credentialed server has `initialize`, `tools/list` and `tools/call`, all `expected`. `"serverOutputScan": {… "containsDummy": false, "containsWrong": false}` | Tools were callable after the restart without entering the credential again. The output scan covers both server processes' stdout and stderr. |
| API-01M | AC-001 (non-vacuity) | same as API-01/02, with the built core patched so `requestInit.headers = {}` (the original drop) | `sed` patch of `autobyteus-ts/dist/tools/mcp/server/http-managed-mcp-server.js`, same test command, file restored | ENV-1 | Pass (expected red) | `API-01M-mutation-red.log` | `Tests  2 failed (2)`; `Streamable HTTP error: Error POSTing to endpoint: unauthorized` | The file's sha1 `eeb287b4…` was the same before and after the restore. This shows the new e2e catches the original defect. |
| API-03 | AC-007, REQ-001/002 | Scripted AGY runtime → run's `autobyteus_agent_tools` MCP endpoint (the same path Codex/Claude use) → registry → remote servers | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03-agy-scripted-agent-tool-call.log`, `API-03-agy-summary.json.txt` | `✓ agy: the agent's tool calls reach both servers with their credentials`. Summary: `hdr` and `tok` each have `"rpcMethod": "tools/call"` with `"auth": "expected"`; `"markersReceived": {"hdr": true, "tok": true}`; `"dummyValueOnAgentWire": false` | Final rerun on the final test file. `toolEvents` is empty because the scripted CLI calls the endpoint directly without step events; the result comes back in the reply text. |
| API-04 | AC-007 | Native AutoByteus runtime (LM Studio qwen) → registry MCP tools → remote servers | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_LMSTUDIO_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-04-native-lmstudio-agent-tool-call.log`, `API-04-native-summary.json.txt` | `✓ native: …`; `TOOL_EXECUTION_SUCCEEDED` for `hdr_auth_probe` and `tok_auth_probe`; both `tools/call` `"auth": "expected"` | Ran before the type-only cleanup (env bracket access, typed variables in another file). The native branch's logic is identical. |
| API-05 | AC-007 | Codex App Server (live) → `autobyteus_agent_tools` → remote servers | `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-4 | Pass | `API-05-codex-live-agent-tool-call.log`, `API-05-codex-summary.json.txt` | `✓ codex: …`; `TOOL_EXECUTION_STARTED/SUCCEEDED` for both tools; both `tools/call` `"auth": "expected"`; `"dummyValueOnAgentWire": false` | Same note as API-04. The first attempt failed in the test's model picker (`No codex model in [...]`); the picker now falls back to the first listed model. |
| API-06 | AC-007 | Claude Agent SDK (live) → `autobyteus_agent_tools` → remote servers | `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_CLAUDE_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-5 | Pass | `API-06-claude-live-agent-tool-call.log`, `API-06-claude-summary.json.txt` | `✓ claude: …`; `TOOL_EXECUTION_SUCCEEDED` for both tools; both `tools/call` `"auth": "expected"` | Same note as API-04. |
| API-07 | AC-008, REQ-007, QR-001 | evidence folder, the new test files, branch diff, raw run logs | credential-pattern `grep` over the evidence, the new tests and `git diff d6f2d6ceb5..HEAD`; dummy-value counts in every raw run log (these include the in-process server console for API-03..06) | local | Pass | `API-07-ac008-scan.txt` | `Result: only dummy values (test-dummy, test-wrong, test-other) and prose …`; every raw log `test-dummy=0 test-wrong=0` | Pattern list is in the file header. |
| API-08 | — (suite hygiene) | runtime file without gates | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-08-runtime-file-ungated-skip.log` | `Tests  4 skipped (4)` | A default `test:e2e` run spends no credits and needs no local model. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 headers sent on connect, list, call; wrong value fails | Yes | API-01, API-02, API-01M, API-R01 | Proven | — |
| AC-002 token saved, survives reload, sent as Bearer; blank → no header | Yes | API-01 (trimmed token, blank token, `mcps.json`), API-02 (process restart), API-R01, API-R02 | Proven | — |
| AC-003 token + Authorization rejected on save, preview, import with a message naming both | Yes | API-01 (GraphQL configure, preview, import; three letter cases across them), API-R01, API-R05 | Proven | — |
| AC-004 JSON view keeps headers | Yes | API-R04, API-R05 | Proven | — |
| AC-005 token hint en + zh-CN | No | API-R04, API-R05 | Proven | — |
| AC-006 unauthenticated HTTP and stdio unchanged | Yes | API-01/02 (open server, no `Authorization` sent), API-R01, API-R03 | Proven | — |
| AC-007 a selected agent calls a tool of a header-protected server through the AutoByteus server | Yes | API-04 (native), API-05 (Codex), API-06 (Claude), API-03 (AGY scripted, agent-tools endpoint) | Proven | — |
| AC-008 only dummy values; no value in logs | Yes | API-07, API-01/02 (built-server output scan), API-03..06 (`dummyValueOnAgentWire: false`) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 97% | All ACs mapped to passing cases (API-01..07, R01..R05) | Real third-party server not used (REQ-007 forbids it) | FU-4 Jira presets will exercise a real server |
| Changed-boundary execution directness | 75% | 97% | API-01/02 drive real GraphQL → registry → SDK → HTTP. Observations are per JSON-RPC method at the remote server. API-01M proves non-vacuity. | None material | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | No mocks: real SDK client/server, built server process, four real runtimes (one scripted CLI, three real models) | Remote server is a local fixture | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Built server with sanitized env and owned data; signed-in CLIs; LM Studio | Codex/Claude ran with the user's CLI config (as TESTING.md requires for signed-in CLIs) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | Wrong and blank token; conflict on three surfaces with three letter cases; real restart; open server; value-free errors | Narrow/dark rendering of the hint not inspected (IMP-10), cosmetic | — |
| User-surface, browser, and desktop-shell confidence | 92% | 92% | IMP-06 component spec; IMP-10 rendered dev-stack journey with DOM assertions (preview, conflict, JSON-view save, reload, zh-CN) | Narrow widths and dark theme not inspected; Electron shell not affected by this change | A rendered check at narrow width (cosmetic only) |
| Durable regression coverage quality and relevance | 85% | 96% | New built-server e2e (ungated, about 6 s, red without the fix); gated runtime e2e for four runtimes; skips cleanly by default (API-08) | Gated runtime cases run only when their gates are set | — |

- Overall post-repository confidence: 81% (repository evidence alone did not reach the real server or runtime boundaries)
- Overall final confidence: 95.3%
- Calculation method: simple average of the seven final scores (97, 97, 95, 95, 95, 92, 96)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: cosmetic rendering of the one hint line at narrow widths or in the dark theme; credentials stored in plain text (accepted R-001, FU-2).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (built server over HTTP/GraphQL and `/mcp/gateway`), `Lifecycle` (real process restart), `Other` (real agent runtimes through the in-process server)
- Confidence gap it addresses: the repository evidence proved the core client but not the server path, the persisted token across a real restart, or AC-007's agent tool calls. All three are now proven at the remote server's boundary.
- Browser validation needed: No further browser run. The web change is a serializer line plus one hint string, with no new client–server contract. IMP-06 covers it, and IMP-10 is a rendered, DOM-asserted journey on the dev stack through the real GraphQL preview and save. The desktop shell is not touched.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: an existing-shape `{url, headers}` entry (IMP-04 "loads an existing entry written without a token unchanged"). In API-02, the `hdr`, `imp` and `open` entries have exactly the existing shape (no `token`) and were loaded by a real process start.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-R02, API-01 (`mcps.json` keys), API-02 (startup load and calls)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The handoff lists the removed fallbacks; the remaining `setSdkLoader` seam is kept per the design and listed as a follow-up.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Added | API-01..06 | — |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | Added | API-01, API-02, API-01M | — |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Added (gated per runtime) | API-03..06, API-08 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Remote authenticated MCP server (e.g. Atlassian Rovo) | Local real-SDK server requiring one exact `Authorization` value | REQ-007: dummy values against a local server only | The transport is generic; only server-specific quirks are untested |
| AGY model (API-03 only) | Scripted AGY CLI fixture that calls the real agent-tools endpoint | Deterministic, no credits; the live runtimes are covered by API-04..06 | None for this change |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built server processes (2 starts per run) | Yes | `stop()` (SIGTERM) in the test; SIGKILL fallback in `afterAll` | No `dist/app.js` process from this worktree remains |
| Runtime roots `tests/.tmp/mcp-http-auth-*`, SQLite `db/mcp-http-auth-*` | Yes | `removeOwnedTestRuntime` | None left (`ls` checked) |
| In-process temp app data dirs `mcp-http-auth-agent-e2e-*` | Yes | `fs.rm` in `afterAll` | None left in `$TMPDIR` |
| Agent definitions and runs | Yes | `terminateAgentRun`, `deleteAgentDefinition`, data dir removed | Done |
| Local MCP servers | Yes | `close()` in `afterAll` | Done |
| LM Studio model `qwen/qwen3.6-35b-a3b` (loaded just in time) | Yes | `lms unload` | `not-loaded` |
| Codex / Claude sessions in the user's CLI history | Created by the runs | Left in place (TESTING.md: signed-in CLIs run with the real HOME) | One short session each |
| `autobyteus-ts/dist` mutation (API-01M) | Yes | Restored from backup | sha1 the same before and after |
| `/tmp/mcp-auth-*` raw logs, `/tmp/mcp-auth-tsc` | Yes | Removed after the evidence was written | Done |
| Untracked `autobyteus-server-ts/dist` rebuild | Yes | Left as the current worktree build (untracked, per TESTING.md) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery Engineer (see the handoff message)
- Notes:
  - Observation, not a defect of this ticket: each registry tool call opens a fresh MCP session (`initialize`, `notifications/initialized`, SSE `GET`, then `tools/call`), as API-01's observations show. This is existing behavior outside the Change Scope; the credential is on every one of those requests.
  - Test types: the three new files type-check cleanly under the server's strict base `tsconfig.json` options (checked with a temporary config limited to these files; the repository has no test typecheck script).
