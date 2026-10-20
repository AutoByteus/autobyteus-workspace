# API/E2E Execution Coverage Report — mcp-sdk-v2-migration

## Plain-Words Summary (REQ-009 / AC-009 / AC-012)

**Result: moving the MCP client from `@modelcontextprotocol/sdk` 1.32.1 to `@modelcontextprotocol/client` 2.3.1 changed nothing we could observe, apart from the two approved differences (DEC-003 error wording, DEC-004 all pages listed).**

How it was checked:
- Two worktrees were built side by side: before = `origin/personal` @ `dc530fdcb0` (SDK 1.32.1), after = this branch @ `9715f94db0` (client 2.3.1).
- Each side got its own packaged desktop app (isolated instance, own data), its own Docker image, and its own run of the repository suites.
- The same checks, and the same test servers, ran against both.

| What we checked | Before (1.32.1) | After (2.3.1) | Same? |
| --- | --- | --- | --- |
| Python test server via `uv` (Python MCP SDK 2.3.0): tools | 5 | 5 | Same |
| Your kind of `uv` servers (test-owned copies): VideoAudioServer / media-downloader / ssh-mcp / pptx-mcp tools | 32 / 2 / 4 / 4 | 32 / 2 / 4 / 4 | Same |
| Published `server-filesystem` 2026.8.31 (built on the v1 SDK) and 2.0.0 (built on the v2 SDK): tools; reading a file | 14 and 14; text returned | 14 and 14; text returned | Same |
| Token HTTP server: token on every request, tool call | yes; marker returned | yes; marker returned | Same |
| Same-origin redirect (308) | followed, token kept | followed, token kept | Same |
| Cross-origin redirect | refused; other origin got 0 requests | refused; other origin got 0 requests | Same rule; new wording (DEC-003) |
| Server answering 401 | `Streamable HTTP error: Error POSTing to endpoint: unauthorized-parity` | `SdkHttpError: Error POSTing to endpoint: unauthorized-parity` | New wording (DEC-003) |
| Server that crashes at start | `McpError: MCP error -32000: Connection closed` in ~40 ms | `SdkError: Connection closed` in ~40 ms | Same outcome; new wording (DEC-003, see note 1) |
| Server that hangs at start | gives up after 60 s, `McpError: MCP error -32001: Request timed out`; app stays responsive | gives up after 60 s, `SdkError: Request timed out`; app stays responsive | Same outcome; new wording (note 1) |
| A server that pages its tool list (2 pages) | 2 tools (first page only) | 4 tools (all pages) | Approved difference (DEC-004) |
| Handshake our client sends | `initialize` first, then `mcp-protocol-version: 2025-11-25`; one process start per connect | identical | Same |
| `/mcp/gateway` with an SDK 1.32.1 client, a v2 client, and a v2 client in `auto` mode | all connect (`2025-03-26`), list, call 10 tools with identical results | identical (+2 page-two tools) | Same |
| Agents in the packaged app (native with LM Studio; Claude haiku): project tools + VideoAudioServer + token HTTP + server-filesystem 2.0.0 | all pass | all pass | Same |
| Stopping a native run during a long external tool call | server told to cancel after 50 ms; run interrupted | after 40 ms; run interrupted | Same |
| Runtime × MCP matrix suite (scripted AGY, Codex's own MCP client, native LM Studio, Claude, Grok) | every cell passes | every cell passes | Same (Grok ran on 4.5 before, 4.7 after; note 2) |
| No leftover server processes after closing the app | none | none | Same |
| Packaged app contains the MCP client it needs | SDK 1.32.1 | client 2.3.1 + core, jose, pkce-challenge, eventsource, eventsource-parser; v1 only as the Claude Agent SDK / GenAI peer | As designed (R-002 closed) |
| Docker image (fresh Linux install from the lockfile) | SDK 1.32.1 resolves; preview, discover, gateway calls work | client 2.3.1 resolves; same results (+ page two, new wording) | Same |
| Speed of connect / list / call | baseline | connect and close equal; list ~3 ms faster; first call per connection 2-5 ms slower (v2 checks results against the tool's output schema), later calls equal | Within noise (QR-001) |

Did the protocol era matter for any server (AC-012)? **No.** Every real server answered our `2025-11-25` `initialize` with `2025-11-25` on both sides (API-14), including `server-filesystem` 2.0.0, which can speak 2026-07-28 only in `auto` mode. No server failed on either side, so REQ-013 did not trigger.

Did v2's stricter checks reject any real server (R-003 / RR-001)? **No.** The real servers' output schemas declare no `$schema` (all Python servers), draft-07 (`server-filesystem` 2026.8.31) or 2020-12 (`server-filesystem` 2.0.0); none declares draft-04. Tools with output schemas were called on all of them and returned the same structured content as before.

Notes:
1. The stdio failure texts lost the class and JSON-RPC code (`McpError: MCP error -32000:` → `SdkError:`). The design names only the HTTP prefix and the redirect advice, but DEC-003 accepts v2's error wording as a whole, and rewording SDK errors is out of scope. No AutoByteus code parses these texts (search in `autobyteus-ts/src`, `autobyteus-server-ts/src`, `autobyteus-web`: no consumer). Delivery may want to name them in the release notes and docs.
2. Grok: the matrix picks a listed model; before listed `grok-4.5` at that moment, after `grok-4.7`. A rerun of the before cell pinned to `grok-4.7` stopped on Grok's own `429 … free-usage-exhausted` after its first tool call (`create_task`) succeeded. That is the Grok account's quota, so it was not retried. Both original Grok cells passed every column.

What was not run, and why:
- tts and autobyteus-image-audio: tts installs runtimes when it starts (a download); the image-audio folder is untracked and has no `pyproject.toml`, so no faithful copy exists. The same Python SDK family is covered by the other three `uv` servers.
- A Codex live model turn: Codex's own MCP client path (no model turn) covers the MCP side on both commits.
- No SSH, download, TTS or paid media tool was called (listing only).

Things noticed that are **not** caused by this change (same on both commits):
- The packaged macOS server ships all server devDependencies (FU-007).

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001 (reviewed route)
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan, and why:
  - API-19 (new): an interleaved timing probe on each side's built `autobyteus-ts`. The single-shot timings in the packaged apps were noisy (load average 40-48, cold `uv` caches on the side that ran first).
  - API-05: a pinned Grok rerun on before was added and stopped on the provider quota (note 2).
  - API-14 ran during discovery, before the other cases.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/evidence/` (API-01…API-19; the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (reviewed `High` route). No durable test code was added, updated or removed in this round, so there is no durable diff to review; the temporary parity probes' sources are in `evidence/API-10-19-setup-and-probe-sources.txt` for a proportional look

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-B | `dc530fdcb0` (SDK 1.32.1) | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1, pnpm 10.28.2 | Worktree `mcp-sdk-v2-migration-parity-before`: `pnpm install --frozen-lockfile`, server prebuild, `autobyteus-ts` build, server build, `build:electron:mac` (all exit 0); packaged isolated instance `iso-63196-c9c1` (backend :63197) | own data root; repository suites in-process |
| ENV-A | `9715f94db0` (client 2.3.1; source = `ae7e907bf2`) | same | This worktree, same build steps (all exit 0); instance `iso-63262-88ed` (backend :63263) | same |
| ENV-D | both | Docker 29.0.1, linux/arm64, Node 22.23.3 | Images `autobyteus-server:mcp182-{before,after}` built from each worktree with `Dockerfile.monorepo` as `build.sh` does (`--load`, fixed `CLI_INSTALL_CACHE_BUSTER`); containers bound to `127.0.0.1`, no user volumes | dummy `AUTOBYTEUS_MCP_GATEWAY_TOKEN`; `server-filesystem` folders mounted read-only |
| Shared instruments | — | — | Test-owned server copies under `/tmp/mcp182/servers` (per side for `uv` servers); harness HTTP MCP servers (v2 server packages) and gateway clients (v1 1.32.1, v2 default, v2 `auto`) identical for both sides | dummy token `test-dummy`; fixed ports per side so imported URLs stay valid |
| Live runtimes | both | host | LM Studio `qwen/qwen3.6-35b-a3b` (one run at a time, unloaded after); host sign-ins for Claude, Grok; scripted AGY CLI; throwaway `CODEX_HOME` | sessions added to the user's Claude/Grok CLI histories (one short session per runtime per run) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-008 | greps, lockfile, `pnpm why` | Reused IMP-07 | — | Pass | (implementation handoff) | — | Ran on `ae7e907bf2`; `git diff --name-only ae7e907bf2 9715f94db0` outside `tickets/` is empty. Packaged and Docker contents add API-15, API-18 |
| API-R02 | REQ-001, REQ-008, regressions | build, typecheck, server unit + integration, full `autobyteus-ts` | Reused IMP-04, IMP-08, IMP-09, IMP-11 | — | Pass | (implementation handoff) | — | Same commit basis as above |
| API-01 | AC-002, AC-004, AC-005, AC-006 | `autobyteus-ts` MCP unit suite (real v1/v2 servers) | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp --reporter=verbose`, each worktree | ENV-B, ENV-A | Pass (same + 5 new) | `API-01-mcp-unit-before.log`, `API-01-mcp-unit-after.log` | `Tests  82 passed (82)` / `Tests  87 passed (87)`; every before case name passes after; new: `passes the caller signal with the timeout…`, `connects with the 2025 initialize handshake and no server/discover probe`, `lists the tools of every page…`, `aborts a running tool call…`, `starts the server process exactly once…` | — |
| API-02 | AC-002 | core MCP integration, Python (uv) + Node fixtures, stdio + HTTP | `env -i PATH HOME=<resolved temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp --reporter=verbose`, each worktree | ENV-B, ENV-A | Pass (same) | `API-02-core-mcp-integration-{before,after}.log` | `Tests  22 passed \| 1 skipped (23)` on both; `python: used: python via uv` | Identical case list; the skip is the gated real-user-kind file (API-06) |
| API-03 | AC-007 | Agent Tools and gateway routes with SDK clients | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts --no-watch --reporter=verbose`, each worktree | ENV-B, ENV-A | Pass (same + 2 new) | `API-03-endpoint-integration-{before,after}.log` | `Tests  13 passed (13)` (v1 clients) / `Tests  15 passed (15)`; new `serves an SDK client in auto negotiation mode, which falls back to the 2025 handshake` (×2) | — |
| API-04 | AC-003, BEH-001 | built server: GraphQL preview/discover/import with credentials, redirect rule, run-session cleanup | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts --no-watch --reporter=verbose`, each worktree on its own server build | ENV-B, ENV-A | Pass (same) | `API-04-built-server-mcp-e2e-{before,after}.log` | `Tests  9 passed (9)` on both | Identical case list |
| API-05 | AC-009 (matrix), SCN-002 | runtime × {project tools, external stdio (env, cwd), external HTTP (credential)}; process gone after termination | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> RUN_CODEX_MCP_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CLAUDE_E2E=1 RUN_GROK_E2E=1 MCP_MATRIX_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts --no-watch --reporter=verbose`, each worktree | ENV-B, ENV-A, live runtimes | Pass (same) | `API-05-runtime-mcp-matrix-{before,after}.log`, `API-05-runtime-mcp-matrix-summaries.txt`, `API-05-runtime-mcp-matrix-before-grok-pinned-rerun.log` | `Tests  5 passed \| 1 skipped (6)` on both; each summary `"taskStatus":"DONE","stdioEnvDelivered":true,"stdioCwdDelivered":true,"httpMarker":true,"httpToolCalls":["expected"],"dummyOnWire":false,…,"stdioProcessGoneAfterTermination":true` | The skip is the Codex live turn (not gated on). Grok model: note 2; pinned rerun `Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted` after `TOOL_EXECUTION_SUCCEEDED … create_task` |
| API-06 | AC-009 (user kind) | core client vs real `uv` folders from test-owned copies | `env -i PATH HOME=<temp> TMPDIR RUN_REAL_MCP_SERVER_E2E=1 AUTOBYTEUS_MCPS_DIR=/tmp/mcp182/mcps-src [REAL_MCP_SERVER_FOLDER, _COMMAND, _CALL] pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts`: pptx-mcp; video-audio-mcp with a `get_media_duration` call; ssh-mcp | ENV-B, ENV-A | Pass (same) | `API-06-real-uv-folders-{before,after}.log` | `pptx-mcp: 4 tools`, `video-audio-mcp: 32 tools`, `called get_media_duration: isError=false`, `ssh-mcp: 4 tools`; `Tests  1 passed (1)` ×3 per side | — |
| API-10 | AC-002, AC-003, AC-005, AC-006, AC-009, AC-012, QR-001 | packaged app → GraphQL preview, bulk import, discover for 13 servers | `node parity-harness.mjs <side> <backendUrl> servers,gateway` (H_PORT_BASE 47110 / 47210), before then after | ENV-B, ENV-A | Pass (same, apart from DEC-003/DEC-004) | `API-10-13-parity-comparison.md`, `API-10-13-harness-{before,after}-servers-gateway.json`, `API-10-13-harness-console.txt` | Comparison table: every real server `Same`; `paging_http` 2 → 4 tools; error rows differ only in wording; `stdio starts in total … {"python_fixture":2,"fs_v1":2,"fs_v2":2}` on both; `requests that reached the other origin … before 0, after 0`; token preview `POST initialize pv=- … ; POST notifications/initialized pv=2025-11-25 …` identical | Preview times of the `uv` servers on before were cold (first side to run): 1.7-2.7 s vs 0.7-0.9 s; discover times (second start) are equal, e.g. VideoAudioServer 658/676 ms. API-19 measures timing properly |
| API-11 | AC-007, AC-009, R-003 | packaged `/mcp/gateway` → external stdio/HTTP tools, with v1 1.32.1, v2 default and v2 `auto` clients | same harness run | ENV-B, ENV-A | Pass (same) | same files | per client: `negotiated: before 2025-03-26 (legacy), after 2025-03-26 (legacy)`; `auto`: `POST server/discover pv=2026-07-28 -> 400 ; POST initialize pv=- -> 200` on both; every tool-call row `Same` (VideoAudioServer `62.314667 + structured`, server-filesystem v1/v2 text + structured, Python `{"sum": 5.0}` + structured, `isError Error executing tool fail: parity-tool-error`, env `parity-env-dummy`); tools `77` → `79` (the 2 page-two tools) | — |
| API-12 | AC-009 (packaged agent call), SCN-002 | packaged app: native (LM Studio) and Claude agents call `create_task`, `update_task`, VideoAudioServer, token HTTP and server-filesystem 2.0.0 tools | `node parity-harness.mjs <side> <backendUrl> matrix,cancel native,claude` | ENV-B, ENV-A, live runtimes | Pass (same) | `API-10-13-parity-comparison.md` (Agents table), `API-10-13-harness-{before,after}-matrix-cancel.json` | every cell `pass/pass`; `Credential on tools/call ["expected"]/["expected"]`; task `DONE` | Claude reaches the tools through the run's Agent Tools MCP endpoint, so this also covers that endpoint inside the packaged app |
| API-13 | AC-004, SCN-002 cancellation | packaged app: native run interrupted (`INTERRUPT_GENERATION`) 3 s into a 120 s external HTTP tool call | same harness run | ENV-B, ENV-A, LM Studio | Pass (same) | same files | `server saw notifications/cancelled 50 ms` (before) / `40 ms` (after) `after INTERRUPT_GENERATION`; `TOOL_EXECUTION_INTERRUPTED parity_http_slow_probe`, `TURN_INTERRUPTED`; `slow tool completed on the server: [false]` | Proves in the product that the run's signal still reaches the SDK call in the new options position |
| API-14 | RR-001, AC-012 | raw JSON-RPC (no SDK) to each real server | `node raw-dialect-probe.mjs dialect-servers.json out.json` | local | Pass | `API-14-outputschema-dialects.txt` | `"protocolVersion":"2025-11-25"` for all 7; `outputSchemaDialects`: Python servers `(no $schema)`, fs 2026.8.31 `http://json-schema.org/draft-07/schema#`, fs 2.0.0 `https://json-schema.org/draft/2020-12/schema`; no draft-04 | — |
| API-15 | R-002, AC-001, QR-002 | packaged app contents | `packaged-contents.sh <worktree> <side>` | ENV-B, ENV-A | Pass | `API-15-packaged-contents-{before,after}.txt` | after: `resolves @modelcontextprotocol/client -> <server>/node_modules/.pnpm/@modelcontextprotocol+client@2.3.1/…`; client's own deps resolve (`jose`, `pkce-challenge`, `eventsource`, `eventsource-parser`, `@modelcontextprotocol/core`; see Notes); `which packages reference @modelcontextprotocol/sdk`: only `node_modules/@anthropic-ai/claude-agent-sdk/package.json`; `does the packaged autobyteus-ts dist import the v1 package anywhere`: `(end; empty = none)` | Resolution from the client's own folder (run during the case): `jose -> …/jose@6.1.3`, `pkce-challenge -> …/pkce-challenge@5.0.1`, `eventsource -> …/eventsource@3.0.7`, `eventsource-parser -> …/eventsource-parser@3.1.1`, `@modelcontextprotocol/core -> …/core@2.3.1`. The v2 server/node test packages are also packaged, as every server devDependency is on both sides (FU-007) |
| API-16 | BEH-001, AC-009 | stop both instances; orphan check | `isolated-app stop <id>`; `ps` before and after | ENV-B, ENV-A | Pass (same) | `API-16-processes-and-stop.txt` | 6 gateway-scope server processes per side before stop; after stop `(end of list)` with nothing listed; `"forced": false`, `"dataRootRemoved": true`, both ports released | Run-scoped servers were already gone after their runs ended (API-05 `stdioProcessGoneAfterTermination`) |
| API-17 | REQ-010 | user data and repos | `git status`, `stat`, call list | local | Pass | `API-17-user-data-untouched.txt` | both MCP repos at the same HEAD with the same untracked entries; `mcps.json` mtime `2026-09-16`; the call list contains no download, SSH, TTS or paid tool | Every server ran from test-owned copies |
| API-18 | BEH-010, R-002, DS-003, AC-001, AC-003, AC-005 | Docker image per side (fresh Linux `pnpm install` from each lockfile) → container GraphQL preview/import/discover and `/mcp/gateway` | `docker-build.sh <worktree> <side>` (= `build.sh` flags, local arm64); `docker run -d --name mcp182-<side> -p 127.0.0.1:<port>:8000 -e AUTOBYTEUS_MCP_GATEWAY_TOKEN=<dummy> -v <server-filesystem folders>:ro autobyteus-server:mcp182-<side>`; harness Docker profile `H_HOST=host.docker.internal H_SERVER_SET=docker H_GATEWAY_TOKEN=<dummy> node parity-harness.mjs <side> http://127.0.0.1:<port> servers,gateway`; `docker rm -f -v`, `docker rmi` | ENV-D | Pass (same, apart from DEC-003/DEC-004) | `API-18-docker-before.txt`, `API-18-docker-after.txt`, `API-18-docker-comparison.md`, `API-18-docker-harness-{before,after}.json` | after: `resolves @modelcontextprotocol/client -> /app/node_modules/.pnpm/@modelcontextprotocol+client@2.3.1/…`, `does not resolve @modelcontextprotocol/sdk/client/index.js`; before: the reverse; comparison: fs v1/v2, token, same-origin rows `Same`, `paging_http` 2 → 4, gateway `before 34, after 36` with both page-two tools, every gateway call `Same`, `negotiated: before 2025-03-26 (legacy), after 2025-03-26 (legacy)`; `occurrences of the dummy token test-dummy in container logs: 0` on both | Node 22.23.3 in the image. No `uv` in the image, so the Python servers are not part of this case (they ran in API-10). Stdio start counts are not measured here (the counter file is outside the container). Containers and images removed; the user's `autobyteus-server-0/1/2` containers untouched |
| API-19 | QR-001 | each side's built `autobyteus-ts` managed servers, interleaved | `node timing-probe.mjs <side> <worktree> <tokenUrl> 3` ×4 rounds per side; `timing-probe-repeat.mjs` ×3 | ENV-B, ENV-A | Pass | `API-19-timing.txt` | medians: connect fs_v1 `141.8 → 139.6`, python `423.0 → 405.9`, VideoAudioServer `377.5 → 371.1`, HTTP `6.7 → 6.9` ms; list fs `8.9 → 5.8`; first call fs_v1 `3.3 → 8.2`, python `1.8 → 3.3`; second call fs_v1 `1.0 → 1.1`, fs_v2 `1.2 → 1.3` | Connect, list, close and later calls are equal or faster; the first call per connection costs 2-5 ms more (one-time output-schema validator in v2). Connect (100-400 ms) dominates a session; total connect + list + first call is equal |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 v2 client pinned; no AutoByteus v1 import; v1 only as a peer | Yes | API-R01, API-15 (packaged), API-18 (fresh Linux install) | Proven | — |
| AC-002 core suites same as on 1.32.1 | Yes | API-01, API-02, API-06, API-10 | Proven | — |
| AC-003 header on every request; 401 fails; same-origin followed; cross-origin refused, other origin gets nothing, error names the target | Yes | API-04, API-10, API-11, API-18 | Proven | — |
| AC-004 timeout and signal reach the SDK call; same outcomes | Yes | API-01, API-13 (product-level cancellation), API-11 (tool error, structured content) | Proven | — |
| AC-005 all tools of a paging server | Yes | API-01, API-10 (2 → 4), API-11 (gateway 77 → 79), API-18 | Proven | — |
| AC-006 one stdio start; `initialize` first; `2025-11-25` | Yes | API-01, API-10 (start counts, request headers, identical before/after) | Proven | — |
| AC-007 v2 client (default, `auto`) → Agent Tools endpoint and `/mcp/gateway` | Yes | API-03, API-11, API-12 (Claude via Agent Tools in the packaged app), API-05 | Proven | Negotiated `2025-03-26` on both sides (D-1, FU-005) |
| AC-008 removed Claude MCP path; Claude suites pass | No | API-R01, API-R02, API-05 (Claude cell) | Proven | — |
| AC-009 before/after report; differences approved; not-run named | Yes | API-01…API-19; summary above | Proven | — |
| AC-012 per-server protocol-era statement; no protocol-caused failure | Yes | API-10, API-11, API-14 | Proven | No server failed; era did not matter for any |
| AC-010 docs, AC-011 beta and the user's check | — | Delivery | Not in API/E2E scope | AC-011 needs the user's check after the beta (REQ-012) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | Every API/E2E AC proven, before and after | Codex live turn not repeated; Grok on different listed models | A Codex live turn; Grok after the quota resets |
| Changed-boundary execution directness | 85% | 97% | The changed adapters ran inside both packaged apps and images against real servers (API-10…13, 18); interleaved component timing (API-19) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | No mocks; Python SDK 1.26/1.28/2.3 servers; TS SDK v1 and v2 published servers; live LM Studio, Claude, Grok; real AGY CLI fixture; Codex's MCP client | tts and image-audio servers not run (download / no faithful copy) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Packaged apps, Docker images, clean env, user-shaped server entries from test-owned copies | Remote servers are local fixtures (REQ-010) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | exit/hang at start, 401, redirects, tool error, cancellation in the product, orphans after stop | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 94% | Packaged desktop apps of both commits driven through their public GraphQL, WebSocket and gateway | Renderer not driven (no renderer change; error text reaches it through the unchanged preview message) | — |
| Durable regression coverage quality and relevance | 90% | 95% | Implementation's new durable cases (signal, handshake, paging, `auto`) plus existing suites, all green on the branch | The parity harness itself is temporary (the base cannot carry tests); sources kept in evidence | — |

- Overall post-repository confidence: 82.9% (85, 85, 80, 80, 85, 75, 90)
- Overall final confidence: 95.4% (96, 97, 95, 95, 96, 94, 95; simple average)
- Calculation method: simple average of the seven scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: servers of kinds not covered (for example a server whose output schema declares draft-04) would still fail on v2 (RR-001); none of the user's servers or the published reference servers does.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged isolated apps of both commits), `Live API` (GraphQL, gateway, WebSocket), `Lifecycle` (stop, orphans, cancellation), `Other` (Docker images, live runtimes)
- Confidence gap addressed: the repository suites prove the client against fixtures, but not the packaged dependency tree (R-002), real third-party servers under v2's checks (R-003), or the before/after comparison the user asked for (REQ-009). All three are now proven.
- Browser validation needed: No. No renderer or web change.

## Desktop Application Validation

- Approach executed: `pnpm --silent isolated-app start --from-worktree` per worktree after `build:electron:mac`; driven through the reported `backendUrl`; stopped with `isolated-app stop`.
- Cases: API-10…API-13 (packaged server behavior), API-15 (packaged contents), API-16 (lifecycle).
- Effect on any already-running desktop application: `None`. The user's AutoByteus and other agents' isolated instances kept running; only `iso-63196-c9c1` and `iso-63262-88ed` were stopped.
- Behavior not directly proven: renderer display of the new error texts (unchanged display path).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. No v1 import in AutoByteus code or the packaged `autobyteus-ts` (API-15); v1 present only as the Claude Agent SDK / GenAI peer.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- The parity harness and probes are temporary: the before commit cannot carry tests, and the cross-commit comparison is a one-time check. Their sources are in `evidence/API-10-19-setup-and-probe-sources.txt`.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (none changed); probe sources attached instead

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Remote HTTP MCP servers (token, paging, 401, redirects, slow tool) | Local servers on the v2 server packages, identical for both sides | REQ-010: dummy values, local servers only | None for the client behavior under test |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-63196-c9c1`, `iso-63262-88ed` | Yes | `isolated-app stop` | stopped, not forced; data roots removed; ports released; no server process left (API-16) |
| Docker containers `mcp182-before`, `mcp182-after` and images `autobyteus-server:mcp182-{before,after}` | Yes | `docker rm -f -v`, `docker rmi` | removed; the buildx cache from these builds was left (shared builder cache) |
| Before worktree `mcp-sdk-v2-migration-parity-before` | Yes | `git worktree remove --force` (it held only build outputs) | removed |
| `/tmp/mcp182` (server copies, venvs, harness, results, throwaway `CODEX_HOME`) | Yes | removed after the evidence was written | removed; no probe process left |
| LM Studio model loaded just in time | Yes | `lms unload --all` | unloaded |
| Agent sessions in the user's Claude/Grok CLI histories | Created by the runs | left (signed-in CLIs need the real HOME) | one short session per runtime per run |
| Packaged builds and `dist` in this worktree | Yes | left as untracked build outputs | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none in API/E2E scope. AC-011 (the user's check of the beta) belongs to delivery.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Code Reviewer (`/software_engineering_team/code_reviewer`): pass with `architectural_risk=High` → proportional test-code review
- Notes:
  - Escalation triggers checked, none fired: no real server works on 1.32.1 and fails on v2 (API-10, API-11, API-06); the packaged app and the image resolve the v2 client (API-15, API-18); no runtime behaves differently (API-05, API-12); nothing else imports the SDK (API-R01, API-15).
  - Design text: AC-007's expected `2025-11-25` is stale; both sides negotiate `2025-03-26` with every SDK client (D-1, FU-005).
  - The stdio failure wording change (note 1) is presented for delivery's release notes and docs sync.
  - New follow-up: FU-007 (packaged server ships devDependencies; same before this ticket).
