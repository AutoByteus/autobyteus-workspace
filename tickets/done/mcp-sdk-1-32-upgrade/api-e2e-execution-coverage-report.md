# API/E2E Execution Coverage Report — mcp-sdk-1-32-upgrade

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route)
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan, and why:
  - API-01M (new): a mutation check that sets `redirectPolicy: "follow"` in the built core, proving API-01 goes red when cross-origin redirects are followed.
  - API-01's first attempt failed on a test expectation: preview applies the tool-name prefix the test itself set, so the expected tool name is `moved_auth_probe`. The test was fixed before the passing run. API-02 passed on the first attempt.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/tickets/in-progress/mcp-sdk-1-32-upgrade/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `c7f0c18fdc` (source = `4923d179c1`) + API/E2E test changes | macOS 26 (Darwin 25.5.0), node 22, pnpm 10.28.2 | `pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build` at `c7f0c18fdc`; built `dist/app.js` started by `startBuiltTestServer` | `env -i PATH HOME=<resolved temp> TMPDIR`; owned ports, runtime roots and SQLite dbs, removed by the tests; local MCP servers on 127.0.0.1; dummy values |
| ENV-2 | same | same | In-process studio server; host LM Studio `qwen/qwen3.6-35b-a3b` | clean env; model loaded just in time and unloaded after |
| ENV-3 | same | same | In-process studio server; host signed-in `codex` (gpt-5.6-luna) / `claude` (haiku) | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR`; one turn each |
| ENV-4 | same | same | `pnpm test:e2e` (full server e2e) | `env -i PATH HOME=<resolved temp> TMPDIR`; gated suites skip without their gates |
| ENV-5 | same (build context = worktree) | Docker 29.0.1, buildx, linux/arm64 | Image `autobyteus-server:mcp-sdk-1-32-validation` from `autobyteus-server-ts/docker/Dockerfile.monorepo` (same args as `build.sh`); container `mcp181-sdk-validation` | `127.0.0.1:<free>:8000`, no user volumes, dummy `AUTOBYTEUS_MCP_GATEWAY_TOKEN`, stdio fixture mounted read-only; container and image removed |
| ENV-6 | same | macOS 26 arm64 | Packaged Electron worktree build `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (`pnpm --silent isolated-app start --build`), instance `iso-56513-e563` | Own ports (backend 56514), auto-created data root removed on stop; the user's AutoByteus app untouched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001 | lockfile, manifests | Reused handoff row AC-001 | — | Pass | (implementation handoff) | — | Rechecked here: `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk` links the `…ba12f93b…` variant, which links SDK 1.32.1, and `@google/genai` links 1.32.1. The `@modelcontextprotocol+sdk@1.30.0` folders still in the local `node_modules/.pnpm` are orphans of the first install; nothing links to them and the lockfile has no 1.30. The Docker build's fresh install has only 1.32.1 (API-07). |
| API-R02 | AC-002, AC-003, AC-004 (core), AC-006, AC-007 | core unit (real SDK servers, stdio fixture) | Reused IMP-00, IMP-02 | — | Pass | (implementation handoff) | — | Source unchanged since `4923d179c1` (`git diff --name-only 4923d179c1 c7f0c18fdc` outside `tickets/` is empty) |
| API-R03 | AC-005 | tsc build, server typecheck, grep | Reused IMP-01, IMP-04, handoff row AC-005 | — | Pass | (implementation handoff) | — | Same |
| API-R04 | AC-004, AC-008 | server unit + integration | Reused IMP-05, IMP-06 | — | Pass | (implementation handoff) | — | Same |
| API-R05 | AC-004 | 179 built-server e2e; AGY scripted agent tool call | Reused IMP-07, IMP-08 | — | Pass | (implementation handoff) | — | Same; both 179 files ran again inside API-05 |
| API-R06 | AC-008 | web full suite | Reused IMP-09 | — | Pass | (implementation handoff) | — | Same |
| API-01 | AC-002, AC-003, AC-006, QR-001; SCN-002, SCN-A1, SCN-A2, SCN-003 | GraphQL preview, configure, discover, import → registry → SDK 1.32.1 → remote; `/mcp/gateway`; built server output | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" MCP_REDIRECT_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch`, first `it` | ENV-1 | Pass | `API-01-redirect-transport-e2e.log`, `API-01-observations.json.txt` | `✓ refuses a cross-origin redirect, follows a same-origin one, and rejects a websocket import`; observations `"other": []`; `moved` requests on `"/mcp-new"` all `"auth": "expected"` incl. `tools/call` | Cross-origin (307 with a `?canary=` query): both preview and discover fail with `Redirect to http://127.0.0.1:<B>/mcp not followed (redirectPolicy: 'same-origin')`. The query and the token are absent from the error, and server B gets no request. Same-origin 308 `/mcp → /mcp-new`: preview, save + discover and the gateway tool call work with the credential. WebSocket bulk import: `success false, importedCount 1, failedCount 1`; only the valid entry is saved (GraphQL and `mcps.json`); server output contains `Valid types are: stdio, streamable_http.` |
| API-02 | AC-006, persisted data (`Not Affected`); SCN-A3 | real startup on a `mcps.json` with WebSocket-era entries | same command, second `it` | ENV-1 | Pass | `API-01-redirect-transport-e2e.log`, `API-01-observations.json.txt` | `✓ starts with WebSocket-era entries in mcps.json and registers the valid entry next to them`; `"serverOutputScan": {… "containsDummy": false, "containsCanary": false}` | Entries `legacy_ws: {command: ""}` (what earlier builds wrote for a WebSocket import) and `hand_ws: {transport_type: "websocket", …}` are skipped. The valid `plain` entry registers at startup and is callable with its token; `mcpServers` lists only `plain`. |
| API-01M | AC-002 (non-vacuity) | built core patched to `redirectPolicy: "follow"` | sed patch of `autobyteus-ts/dist/tools/mcp/server/http-managed-mcp-server.js`, API-01 rerun, file restored | ENV-1 | Pass (expected red) | `API-01M-mutation-follow-red.log` | `Tests  1 failed \| 1 passed (2)`; `expected 'Failed to preview tools for MCP serve…' to contain 'Redirect to http://127.0.0.1:…` | sha1 `47fccbe5da91` before and after the restore |
| API-03 | AC-004, AC-008 | native AutoByteus runtime (LM Studio) → registry MCP tools | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_LMSTUDIO_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03-native-lmstudio-agent-tool-call.log`, `API-03-native-lmstudio-summary.json.txt` | `✓ native: …`; `TOOL_EXECUTION_SUCCEEDED` for `hdr_auth_probe` and `tok_auth_probe`; both `tools/call` `"auth": "expected"` | — |
| API-04 | AC-004, AC-008 | Codex App Server (live) → `autobyteus_agent_tools` | same file with `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna`, real HOME/USER/LOGNAME | ENV-3 | Pass | `API-04-codex-live-agent-tool-call.log`, `API-04-codex-live-summary.json.txt` | `✓ codex: …`; both `tools/call` `"auth": "expected"`; `"dummyValueOnAgentWire": false` | — |
| API-06 | AC-004, AC-008, R-002 | Claude Agent SDK runtime (live; its SDK peer is now 1.32.1) → `autobyteus_agent_tools` | same file with `RUN_CLAUDE_E2E=1`, real HOME/USER/LOGNAME | ENV-3 | Pass | `API-06-claude-live-agent-tool-call.log`, `API-06-claude-live-summary.json.txt` | `✓ claude: …`; both `tools/call` `"auth": "expected"` | — |
| API-05 | AC-008 | full server e2e suite | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | ENV-4 | Pass | `API-05-server-e2e-full.log` | `Test Files  89 passed \| 88 skipped (177)`; `Tests  370 passed \| 394 skipped (764)`; `exit 0` | 88 gated files skip without their `RUN_*` gates, and a skip is not a pass. The gated MCP runtime file is proven live by API-03/04/06; IMP-08 covers AGY. Both MCP built-server files ran and passed inside the suite. The `TAU-2 first start: FAILED (…)` stdout line is the deliberate scenario of the passing `task-agent-own-run-startup.e2e.test.ts`. |
| API-07 | AC-001, AC-002, AC-004, AC-007 (packaged), design escalation trigger | Docker image built from the worktree; container; GraphQL + `/mcp/gateway` | build, run, probe and cleanup commands in the evidence file header | ENV-5 | Pass | `API-07-docker-image-mcp.txt` | `autobyteus-ts sdk 1.32.1`, `@modelcontextprotocol+sdk@1.32.1_zod@4.3.6 (only copy)`; probe `"httpToolResult": "MARKER-TOK-9902"`, `"envDelivered": true`, `"cwd": "/tmp"`, `"crossOriginTargetRequests": 0`, `"crossOriginPreviewError": "…Redirect to http://host.docker.internal:<port>/mcp not followed (redirectPolicy: 'same-origin')"`; container logs `test-dummy occurrences: 0` | The fresh `pnpm install --no-frozen-lockfile` in Linux resolved a single SDK copy. It reports no unmet MCP SDK peer; the only peer warnings are Nuxt ones unrelated to this change. The container runs node 22.23.3. |
| API-08 | AC-001, AC-002, AC-004, AC-007 (packaged), design escalation trigger | packaged Electron (isolated instance) → embedded server GraphQL + `/mcp/gateway` | `pnpm --silent isolated-app start --build`; the API-07 probe with `BACKEND_URL=<backendUrl>`, `MCP_HOST=127.0.0.1`, stdio `node <worktree fixture>`; `pnpm --silent isolated-app stop iso-56513-e563` | ENV-6 | Pass | `API-08-electron-packaged-mcp.txt` | `1.32.1 Resources/server/node_modules/.pnpm/@modelcontextprotocol+sdk@1.32.1_zod@4.3.6/… (only copy)`; probe `"httpToolResult": "MARKER-TOK-9902"`, `"envDelivered": true`, `"crossOriginTargetRequests": 0`; stop `"dataRootRemoved": true` | No renderer change, so no UI journey; the shell-relevant change is the packaged server's dependency tree |
| API-09 | AC-009, REQ-007 | evidence, diff, test files, probe, raw run/container/app logs | credential-pattern grep and `test-dummy` counts (commands in the file header) | local | Pass | `API-09-ac009-scan.txt` | `Result: credential-like matches are dummy values …`; every raw log `test-dummy=0` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 one SDK 1.32.1 copy; peers on it | Yes | API-R01, API-07 (fresh Linux install in the image), API-08 (packaged app) | Proven | — |
| AC-002 cross-origin redirect: connect fails, error names the unfollowed redirect, other origin gets nothing | Yes | API-01 (GraphQL preview + discover), API-01M, API-07 (Docker), API-08 (Electron), API-R02 (core, red on 1.30.0) | Proven | — |
| AC-003 same-origin redirect works | Yes | API-01 (308: preview, discover, gateway call with credential), API-R02 (core 307) | Proven | — |
| AC-004 179 behavior green on 1.32.1 | Yes | API-03 native, API-04 Codex, API-06 Claude, API-05 (179 built-server file), API-R05 (AGY), API-07, API-08 | Proven | — |
| AC-005 typecheck + no seams/casts | No | API-R03 | Proven | — |
| AC-006 `websocket` rejected, lists the supported transports, nothing saved | Yes | API-01 (GraphQL import; log names `stdio, streamable_http`), API-02 (stored WebSocket-era entries skipped), API-R02 (parser message) | Proven | — |
| AC-007 real stdio server with env and cwd | Yes | API-R02 (core fixture test), API-07 (Docker), API-08 (packaged app) | Proven | — |
| AC-008 full rerun | Yes | API-R02, API-R03, API-R04, API-R06, API-05, API-03, API-04, API-06 | Proven | — |
| AC-009 dummy values only | Yes | API-09, API-01/02 output scan, API-07/08 log scans | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | All ACs proven (table above) | none material | — |
| Changed-boundary execution directness | 80% | 97% | Redirect and import behavior through GraphQL on the built server, Docker and Electron; mutation red (API-01M) | none material | — |
| Cross-boundary integration realism and mock gap | 75% | 96% | No mocks; real SDK servers; four runtimes, three of them live models; real Docker image and packaged app | remote servers are local fixtures (REQ-007) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Built-server sanitized env; signed-in CLIs; fresh Linux install in Docker; packaged app | `https` upgrade redirect not exercised locally | TLS on default ports |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | cross vs same origin, query stripping, WebSocket import, WebSocket-era stored entries at startup | 301/302-on-POST is SDK contract only (observation) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 93% | Packaged Electron app starts, and its embedded server runs MCP on 1.32.1 (API-08). The web suite (IMP-09) is green. | No renderer change; the error text reaches the UI through the existing preview message (unchanged path) | — |
| Durable regression coverage quality and relevance | 85% | 96% | New built-server e2e (ungated, about 9 s, mutation-proven); helper redirect option for future SDK upgrades | — | — |

- Overall post-repository confidence: about 81%
- Overall final confidence: 95.6% (97, 97, 96, 95, 95, 93, 96; simple average)
- Calculation method: simple average of the seven final scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the `https` upgrade redirect path is not exercised locally (SDK-internal); 301/302 on POST are not followed even within the origin (SDK contract; no working path is lost, because on 1.30.0 a 301/302 turned the POST into a body-less GET, which no MCP endpoint accepts).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (built server), `Lifecycle` (startup with stored entries), `Project Desktop Validation` (packaged Electron isolated instance), `Other` (Docker image; live agent runtimes)
- Confidence gap addressed: the repository evidence proved the core client on 1.32.1 but not the product paths (GraphQL preview, discover, import, startup), the live runtimes, the Claude Agent SDK peer, or the packaged Docker and Electron builds, which are the design's escalation trigger. All are now proven.
- Browser validation needed: No. No renderer or web change; the full web suite is green (IMP-09).

## Desktop Application Validation

- Approach executed: `pnpm --silent isolated-app start --build` (packaged mac-arm64 build of this worktree), driven through the reported `backendUrl` with GraphQL and `/mcp/gateway`; stopped with `isolated-app stop`.
- Cases: API-08 (shell packaging of the server's dependency tree and the embedded server's MCP behavior). No web-equivalent behavior changed.
- Effect on any already-running desktop application: `None`. The user's AutoByteus app kept running on its own ports and data.
- Behavior not directly proven: none material for this change.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: `{command: ""}` (what an earlier build wrote for a WebSocket import) and a hand-written `{transport_type: "websocket", url}` entry, next to a valid HTTP entry with a token (API-02).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-02 (startup skips both, registers the valid entry), API-01 (stdio/HTTP shapes written and read unchanged)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`. API-02 proves the existing per-entry load tolerance. That is the approved general reader policy, not a compatibility shim.
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | Added | API-01, API-02, API-01M | — |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Updated (optional `redirects` map; `path` in observations) | API-01, API-02, API-03, API-04, API-06 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Remote MCP servers, including redirecting endpoints | Local real-SDK servers with a redirect map | REQ-007: dummy values and local servers only | None for the redirect contract |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built servers, runtime roots, SQLite dbs (API-01/02, API-05) | Yes | test-owned cleanup | none left |
| In-process temp data dirs, agent definitions and runs (API-03/04/06) | Yes | test `afterAll` | done |
| LM Studio model `qwen/qwen3.6-35b-a3b` (loaded just in time) | Yes | `lms unload` | unloaded |
| Codex / Claude sessions in the user's CLI history | Created by the runs | left in place (signed-in CLIs need the real HOME) | one short session each |
| `autobyteus-ts/dist` mutation (API-01M) | Yes | restored from backup | sha1 `47fccbe5da91` before and after |
| Docker container `mcp181-sdk-validation` + image `autobyteus-server:mcp-sdk-1-32-validation` | Yes | `docker rm -f -v`, `docker rmi` | removed; the user's `autobyteus-server-*` containers untouched. The buildx cache from this build was left; it is shared builder cache. |
| Isolated instance `iso-56513-e563` | Yes | `isolated-app stop` | stopped; ports released; data root removed |
| Packaged build `autobyteus-web/electron-dist/`, rebuilt server `dist` | Yes | left as untracked worktree build outputs | — |
| Temporary probe and raw logs under `/tmp/mcp181` | Yes | removed after the evidence was written | done |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery Engineer
- Notes:
  - Design escalation triggers checked:
    - one SDK copy in the lockfile, the Docker image and the packaged app;
    - peers on 1.32.1;
    - Codex, Claude and native runtimes unchanged; AGY in IMP-08;
    - Docker and Electron builds unchanged in MCP behavior.

    None fired.
  - Observation, not a defect: the GraphQL bulk import returns only counts (`Imported: 1, Failed: 1`). The per-entry reason (`Valid types are: stdio, streamable_http.`) appears only in the server log. This is the existing import contract for every failure kind, outside this ticket's Change Scope; a follow-up candidate if the UI should show per-entry reasons.
  - Observation: in this worktree's local `node_modules/.pnpm`, orphan `@modelcontextprotocol+sdk@1.30.0` folders remain from the first install. They are unreferenced and absent from fresh installs (API-07, API-08).
