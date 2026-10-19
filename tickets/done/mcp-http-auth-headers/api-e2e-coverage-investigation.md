# API/E2E Coverage Investigation — mcp-http-auth-headers

## Investigation Meta

- Requirements Doc: `tickets/in-progress/mcp-http-auth-headers/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/mcp-http-auth-headers/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/mcp-http-auth-headers/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/mcp-http-auth-headers/design-spec.md` (SR-001, Ready; Small / Low)
- Supplemental Task Artifacts: probes P-001/P-002 in `/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/probes/` (shape reference only)
- Design Review Report: `N/A — not applicable` (direct low-risk route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/mcp-http-auth-headers/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/mcp-http-auth-headers/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/mcp-http-auth-headers/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer` (direct route)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

All ticket paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers` (branch `codex/mcp-http-auth-headers`). Validated commit: `e129930bcf` (source identical to `d89135a832`; `e129930bcf` adds only ticket artifacts).

## Current Requirement And Design Basis

What the user configures for a remote (streamable HTTP) MCP server must reach that server on every request:

- REQ-001 / AC-001: configured `headers` go on initialize, tool listing (registration and preview) and tool calls, for every agent runtime.
- REQ-002 / AC-002: the `token` is saved in `mcps.json`, survives reload, and is sent as `Authorization: Bearer <token>`; a blank token means no header.
- REQ-003 / AC-003: a token plus an `Authorization` header (any case) is rejected on save, preview and import with a value-free message, and nothing is saved.
- REQ-004 / AC-004, REQ-005 / AC-005: the web JSON view keeps headers; the token hint is shown in en + zh-CN.
- REQ-006 / AC-006: unauthenticated HTTP servers and stdio servers are unchanged.
- REQ-007 / AC-008, QR-001: dummy values only; no header or token value in logs or error messages.
- AC-007: a selected agent on a real runtime calls a tool of a header-protected local server through the AutoByteus server (native at least; Claude/Codex through `autobyteus_agent_tools` where the environment allows).

Design: `StreamableHttpMcpServerConfig.requestHeaders()` is the single derivation; `HttpManagedMcpServer` passes it as `requestInit.headers`; `FileMcpServerConfigProvider` writes `token`. All runtimes reach external MCP tools only through the registry → `McpServerInstanceManager` → `HttpManagedMcpServer` (ASM-001). Persisted data: `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (fixed header, e.g. `Authorization: Basic …`), SCN-002 (Token field → Bearer), SCN-003 (Form → JSON view keeps headers), SCN-004 (both given → rejection).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 — App restart: a server saved with a token (and one with a header) is re-registered by startup `loadAllAndRegister` from `mcps.json`, and its tools are callable without re-entering the credential. Trigger: real server process stop and start on the same data root.
  - SCN-A2 — External MCP client through `/mcp/gateway`: the general gateway exposes registered MCP tools; a `tools/call` there goes through the same registry path and must carry the credential. Trigger: an MCP SDK client calling the built server's gateway on loopback.
  - SCN-A3 — Bulk import (`importMcpServerConfigs`) of a header-form server as Atlassian documents it (`{url, headers}`), then discover and call.
  - SCN-A4 — Wrong credential: preview reports the server's auth failure; the value is not echoed into the error or the server log.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 headers sent on every request | Changed | req doc BEH-001, P-001, IMP-00 red/IMP-02 green | Prove through the real server GraphQL + registry + gateway + agent runtimes, with per-request (per JSON-RPC method) observation at the remote server |
| BEH-002 token persisted and sent as Bearer | Added | BEH-002, `file-provider.ts` | Prove save → `mcps.json` → real process restart → startup registration → tool call |
| BEH-003 JSON view keeps headers | Changed | BEH-003, IMP-06, IMP-10 | Reuse IMP-06 (component) and IMP-10 (rendered dev stack); no further browser run needed (web change is serializer-only) |
| BEH-004 token + Authorization rejected | Added | BEH-004, DEC-002 | Prove at GraphQL configure, preview and import on the real server; assert nothing saved and value-free messages |
| BEH-005 unauthenticated/stdio unchanged | Preserved | BEH-005 | Reuse IMP-02 open-server case and green suites; add an open (no-auth) HTTP server through the real server |
| Persisted `mcps.json` gains optional `token` | Added | Design "Persisted Data" | Reuse IMP-04 existing-entry case; prove real-process load of a saved token entry |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | config validation, `requestHeaders()` | IMP-02 `types.test.ts`, `config-service.test.ts` | none material | — |
| API / transport / contract | Yes | GraphQL configure/preview/import/discover → SDK `requestInit.headers` → remote HTTP | IMP-02 real-SDK client test (core only); IMP-10 one manual preview | No server-level automated proof of GraphQL → registry → tool call; tool-call header not observed per method at server level | Live API (server E2E on test-owned server) |
| Frontend component / state | Yes | `McpServerFormModal` JSON view, hint | IMP-06, IMP-08, IMP-09 | none material | — |
| Browser integration / user journey | Yes (minor) | Form → GraphQL | IMP-10 rendered check on dev stack | none material (no new client–server contract) | — |
| Authentication / session / permissions | Yes | outbound credentials to remote MCP server | IMP-02 | through real runtimes and agent-tools endpoint | Live API + runtime suites |
| Desktop renderer / web-equivalent UI | Yes (same as web) | form | IMP-06, IMP-10 | none | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | startup re-registration from `mcps.json` | IMP-04 (file provider only) | real process restart and startup registration not exercised | Lifecycle (built server restart) |
| Persisted-data transition | Yes | additive `token` key | IMP-04 | reading through a real process start | Lifecycle |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | remote MCP server, agent runtimes (native, AGY, Codex, Claude) | IMP-02 (core client only) | AC-007: agent tool call through the AutoByteus server on real runtimes | Runtime suites (gated) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript; `autobyteus-ts` core, `autobyteus-server-ts` Fastify + GraphQL server, `autobyteus-web` Nuxt/Electron.
- Project testing guideline path(s): `TESTING.md` (repository root; no closer `TESTING*.md` in the changed packages).
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `Yes` for what is needed — LM Studio runs locally (no key); `codex` and `claude` CLIs are signed in on the host; no provider keys are imported or needed. No secret values recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Server E2E under `tests/e2e/` with `vitest run <file>`; gated runtime suites (`RUN_*`); clean env for e2e (`env -i PATH HOME TMPDIR`); signed-in CLIs need real `HOME`, `USER`, `LOGNAME`; build server before suites that run `dist/app.js`; one local-model run at a time; never test against user's app/data; dist folders untracked |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Repo rules | Read `TESTING.md`, `DESIGN.md` |
| `autobyteus-server-ts/tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` + `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server restart pattern | `startBuiltTestServer` spawns `dist/app.js` with a sanitized env and owned runtime root/database; `stop()` sends SIGTERM; `removeOwnedTestRuntime` cleans |
| `autobyteus-server-ts/tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts`, `tests/fixtures/agy-failure-cli.mjs` | Scripted AGY runtime | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; `CALL_TOOL:{name,arguments}` calls the real `autobyteus_agent_tools` endpoint with the real MCP SDK |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live native/Codex/Claude patterns | `ensureProviderModelCatalog(LMSTUDIO, autobyteus)`; model pickers; `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E` gates |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` | `/mcp/gateway` | Loopback without `AUTOBYTEUS_MCP_GATEWAY_TOKEN`; exposes registered MCP tools |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` build | worktree | `pnpm -C autobyteus-ts build` (already built at `b109a62ea6`; rebuilt if stale) | consumed by server | `[verify:runtime-deps] OK` | — |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | needed by the built-server test | `dist/app.js` present | untracked output, left as is |
| Built test server (x2 starts) | `autobyteus-server-ts` | `startBuiltTestServer` (test-owned port, runtime root under `tests/.tmp`, own SQLite db) | sanitized env | `Server listening on 127.0.0.1:<port>` | `stop()`, `removeOwnedTestRuntime` |
| In-process studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer` with temp app data dir | per runtime test | listen | `fastify.close()`, temp dir removed |
| Header-protected MCP servers | in-process (test) | SDK `McpServer` + `StreamableHTTPServerTransport`, 127.0.0.1 port 0 | dummy values only | listen | closed in `afterAll` |
| LM Studio | host | already running on 127.0.0.1:1234 (`qwen/qwen3.6-35b-a3b` loaded) | shared compute: one run at a time | `/v1/models` | not started by this run; unload not needed if not JIT-loaded by us |
| Codex / Claude CLIs | host | signed-in CLIs; real `HOME`, `USER`, `LOGNAME` | spends the user's credits; one short turn each | — | runs terminated by the test |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| MCP server configs | GraphQL `configureMcpServer` / `importMcpServerConfigs` on test-owned servers | dummy values `test-dummy` only | data roots removed |
| Agent definitions / runs | GraphQL `createAgentDefinition` / `createAgentRun` | test-owned data dir | terminated and deleted, data dir removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: an existing `{url, headers}` entry (no token) loads unchanged — IMP-04 `file-provider.http-auth.test.ts` "loads an existing entry written without a token unchanged" (reused). In the built-server case, the header-form entry written by the current writer has exactly that existing shape and is loaded by a real process start.
- Evidence planned: API-02 restart case reads `mcps.json` (keys only, values not printed) and proves startup registration and calls for both a token entry and a header entry.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | Real SDK: headers/token on initialize, list, call; open server no header; wrong credential fails | AC-001, AC-002, AC-006 | Still Valid | IMP-00 red on base, IMP-02 green | Reuse IMP-02 |
| `autobyteus-ts/tests/unit/tools/mcp/types.test.ts` | Conflict rule (3 cases), blank token, `requestHeaders()` | AC-003, REQ-002 | Still Valid | IMP-02 | Reuse |
| `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts` | Import parse rejects conflict | AC-003 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/unit/mcp-server-management/file-provider.http-auth.test.ts` | Save/reload token+headers; blank token; existing entry unchanged | AC-002, persisted data | Still Valid | IMP-04 | Reuse |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` | Service config flows (stdio/HTTP, no auth) | AC-006 | Still Valid | IMP-05 | Reuse |
| `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | JSON view keeps headers; hint renders | AC-004, AC-005 | Still Valid | IMP-06 | Reuse |
| `autobyteus-ts/tests/integration/tools/mcp/http-managed-mcp-server.test.ts` | External toy server (no auth) | AC-006 | Out Of Scope (design leaves it as is; external toy not available) | design Change Scope | None |
| `autobyteus-server-ts/tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts` | AGY MCP call presentation | — | Out Of Scope (presentation only) | — | None |
| No server E2E exercises authenticated remote MCP servers | — | AC-001/002/003/007 | — | grep of `tests/e2e` | Add durable coverage |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-002, AC-003, AC-006 (core) | core client against real SDK server | Reused | IMP-02 | Ran on `b109a62ea6`; `git diff --name-only b109a62ea6 e129930bcf` touches only web files and ticket artifacts, none in `autobyteus-ts` |
| API-R02 | AC-002 (persist), persisted data | file provider | Reused | IMP-04 | Same commit reasoning; server src unchanged since |
| API-R03 | AC-006 (preserved) | server integration | Reused | IMP-05 | Same |
| API-R04 | AC-004, AC-005 | web component + guards | Reused | IMP-06, IMP-08, IMP-09 | Ran on `d89135a832`, the source commit validated |
| API-R05 | AC-003 (GraphQL preview via UI), AC-004, AC-005 | rendered dev stack | Reused | IMP-10 | Same commit; DOM-asserted and logged |
| API-01 | AC-001, AC-002, AC-003, AC-006, AC-008 (SCN-001..004, A2..A4) | GraphQL → registry → SDK → remote server; `/mcp/gateway` tool call; built server process output | Durable | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts --no-watch` (first `it`) | No server-level automated proof exists; this is the real API boundary |
| API-02 | AC-002 (reload), REQ-001, persisted data (SCN-A1) | real process restart → startup `loadAllAndRegister` → gateway `tools/call` | Durable | same file, second `it` | Restart is the realistic reload path |
| API-03 | AC-007, REQ-001/002 | Scripted AGY runtime → `autobyteus_agent_tools` endpoint (the Codex/Claude path) → registry → remote server | Durable (gated `RUN_AGY_FAILURE_E2E`) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Deterministic, no credits, exercises the agent-tools endpoint |
| API-04 | AC-007 | Native AutoByteus runtime with LM Studio model → registry MCP tool → remote server | Durable (gated `RUN_LMSTUDIO_E2E`) | `RUN_LMSTUDIO_E2E=1 … same file` | AC-007 requires native at least |
| API-05 | AC-007 | Codex App Server runtime (live) → `autobyteus_agent_tools` → remote server | Durable (gated `RUN_CODEX_E2E`) | `RUN_CODEX_E2E=1 … same file` | "Claude or Codex where the environment allows" |
| API-06 | AC-007 | Claude Agent SDK runtime (live) → `autobyteus_agent_tools` → remote server | Durable (gated `RUN_CLAUDE_E2E`) | `RUN_CLAUDE_E2E=1 … same file` | Same |
| API-07 | AC-008, REQ-007, QR-001 | evidence + branch diff scan | Temporary Probe | `grep` of the evidence folder and `git diff d6f2d6ceb5..HEAD` for credential-like strings and the dummy values | One-off scan of this ticket's artifacts |
| API-01M | AC-001 (non-vacuity) | built core patched to drop headers | Temporary Probe | patch `autobyteus-ts/dist/.../http-managed-mcp-server.js` to `requestInit.headers = {}`, rerun API-01/02, restore | Added during execution: proves the new e2e goes red on the original defect; a mutation is not durable coverage |
| API-08 | suite hygiene | runtime file with no gate | Existing Test (new file) | same runtime command without gates | Added during execution: a default run must skip and spend nothing |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01, API-02 | `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | The bug lived at the boundary between the server and the SDK; only a real server path guards save → load → call regressions |
| API-03..API-06 | `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Proves agents on each runtime reach an authenticated server; gated so default runs stay free |
| (shared) | `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | One header-protected MCP server that records value-free per-request observations (HTTP method, JSON-RPC method, tool name, `expected`/`other`/`none`) |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None (the mock-only test was already replaced by implementation, recorded in the handoff).

## Live Environment And Fixture Plan

- Startup order and commands: `pnpm -C autobyteus-ts build` (if stale) → `pnpm -C autobyteus-server-ts build` → API-01/02 → API-03 → API-04 → API-05 → API-06 (sequential; one local-model run at a time).
- Environment choices: e2e runs with `env -i PATH HOME=<resolved temp> TMPDIR` for API-01..04; API-05/06 need the real `HOME`, `USER`, `LOGNAME` for the signed-in CLIs.
- Health / readiness checks: built server `Server listening on`; MCP servers `listen` callbacks.
- Seed data / fixtures: GraphQL-created MCP configs and agent definitions; dummy credential values `test-dummy`.
- Requirement-linked journeys: as in Planned Cases.
- Evidence to capture: vitest output, value-free remote-server observations, built-server output scan result.
- Owned processes and temporary state to clean up: built server processes, runtime roots and SQLite files under `autobyteus-server-ts/tests/.tmp` and `db/`, temp app data dirs, in-process MCP servers, agent runs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Real Atlassian Rovo / any real authenticated provider | Requirement REQ-007: local dummy servers only | Low; header transport proven generically | No | None (FU-4 presets will exercise Jira) |
| Grok runtime | Reaches external MCP tools through the same `autobyteus_agent_tools` endpoint as AGY/Codex/Claude (ASM-001) | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the direct route needs no test-code review.
