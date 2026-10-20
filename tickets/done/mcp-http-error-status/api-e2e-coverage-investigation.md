# API/E2E Coverage Investigation — mcp-http-error-status

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `design-spec.md` (SR-001, Ready; Small / Low)
- Supplemental Task Artifacts: `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` (evidence only)
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001, code `bb1d3cd28c`, docs/evidence `9aeef2b63e`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation engineer handoff, IR-001 (direct Small / Low route)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

All paths above are in `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status/tickets/in-progress/mcp-http-error-status/`.

## Current Requirement And Design Basis

When a remote streamable-HTTP MCP server answers `initialize` with an HTTP error, `HttpManagedMcpServer.createClientSession()` rethrows the SDK's `SdkHttpError` as `Error("HTTP <status>[ <reason>]: <SDK message>", { cause })`. Everything above it is unchanged, so:

- preview (GraphQL `previewMcpServerTools`) reads `Failed to preview tools for MCP server: Error: HTTP <status> <reason>: Error POSTing to endpoint: <body>` (REQ-001, REQ-002, AC-001);
- discover/register (`discoverAndRegisterMcpServerTools`) returns `success: false`, `message: "Error: HTTP <status> <reason>: …"` (REQ-003, AC-002);
- an empty-body 404 reads `HTTP 404 Not Found: Error POSTing to endpoint: ` (AC-003);
- failures without an HTTP answer (refused, stdio launch failure) keep their text, no `HTTP ` status (REQ-004, AC-004);
- no credential appears; existing auth/redirect e2e keep passing, the cross-origin redirect message now also carries `HTTP 307` (REQ-005, AC-005);
- an agent tool call whose connect is refused with 401 fails with `HTTP 401` (REQ-006, AC-006).

Persisted data: `Not Affected`. Compatibility: none introduced (implementation handoff Legacy / Compatibility Removal Check is clean: no wrapper, no dual path).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (Preview in the MCP server form → GraphQL `previewMcpServerTools`), SCN-002 (Save & sync / reload → `configureMcpServer` + `discoverAndRegisterMcpServerTools`), SCN-003 (agent tool call that connects to a registered remote server that now rejects).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-003 as it really happens: a server registered successfully earlier (tools discovered with a valid token) later revokes the token; a new agent run calls the tool, its first connect gets 401. Real trigger: an agent run's tool call through the Agent Tools MCP endpoint (`autobyteus_agent_tools`, used by AGY/Codex/Claude runtimes) → `ConfiguredMcpRegistryToolAdapter` → `GenericMcpTool` → `McpServerProxy` → `HttpManagedMcpServer.connect`. The scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, TESTING.md "Runtimes without a model") drives it without provider calls.
  - Empty-body 404 and refused connection through GraphQL (the user's real surface), not only at unit level.
  - Stdio server that fails to launch, through GraphQL preview (AC-004's second half).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 preview message | Changed | design Intended Change; probe IMP-00/IMP-08 | exact-text e2e through the built server for 401/403/404/500 + empty-body 404 |
| BEH-002 discover message | Changed | same | exact-text e2e, `success: false`, empty `discoveredTools` |
| BEH-003 tool-call message | Changed | DS-003 | unit (IMP-02) + real agent run through Agent Tools MCP (scripted AGY) |
| BEH-004 non-HTTP failures | Preserved | DEC-003 | unit refused (IMP-02) + GraphQL refused + GraphQL stdio launch failure |
| BEH-005 no credential | Preserved | REQ-005 | token scans in new and existing e2e |
| SDK lazy load | Preserved | design Dependency Rules | build inspection (IMP-05) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `HttpManagedMcpServer.createClientSession` error translation | real-SDK unit tests (IMP-02) | none at unit level | — |
| API / transport / contract | Yes (message text only) | GraphQL error text and `discoverAndRegisterMcpServerTools.message` | built-server e2e (IMP-07) | empty-body / refused / stdio not yet through GraphQL | extend built-server e2e |
| Frontend component / state | No | web shows the message verbatim (`toolManagementStore.ts` `previewMcpServer` joins `errors[].message`) | — | none: no web code changed | — |
| Browser integration / user journey | No | — | — | text-only change rendered verbatim | not required |
| Authentication / session / permissions | No (credential handling unchanged) | — | auth/redirect e2e | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (failed-connect cleanup) | `BaseManagedMcpServer.connect` FAILED state + cleanup after the rethrow | unit asserts `FAILED` | agent-run session after failed connect | scripted agent run |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | `@modelcontextprotocol/client` 2.3.1 `SdkHttpError` | real SDK in unit and e2e | HTTP/2 empty reason phrase (not reachable with Node HTTP/1.1 servers) | reading only |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status` (branch `codex/mcp-http-error-status`)
- Project type and runtime stack: pnpm monorepo, TypeScript, Node v22; vitest; `autobyteus-ts` (core library, consumed by the server through its `dist/`), `autobyteus-server-ts` (Fastify + GraphQL), `autobyteus-web` (Nuxt).
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` in `autobyteus-ts` or `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: None.
- Required environment variables or secrets available: `N/A` (dummy values only; scripted AGY needs no secret)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | test layers, path choice, rerun by impact, clean env, gates | core library `pnpm -C autobyteus-ts test`; MCP integration with `env -i`; server `test:unit`; server E2E one file with `vitest run`; E2E/integration under `env -i PATH HOME=<resolved temp> TMPDIR`; `autobyteus-ts` changed ⇒ rerun broadly; scripted AGY via `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; builds serialized; current build required for `dist/app.js` suites |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | repo/server instructions | `vitest run … --no-watch`; `test:integration:prepare` before `test:integration` |
| `autobyteus-ts/package.json` `exports` | server consumes `autobyteus-ts/dist` | rebuild `autobyteus-ts` before server tests |
| e2e file headers (`mcp-http-*.e2e.test.ts`, `runtime/mcp-http-auth-agent-tool-call.e2e.test.ts`) | prerequisites, gates, commands | built-server suites own their server, port, runtime root and DB |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` build | worktree root | `pnpm -C autobyteus-ts build` | serialized | exit 0 | build output, not committed |
| server build | worktree root | `pnpm -C autobyteus-server-ts build` | serialized | exit 0 | build output |
| built test server | via `startBuiltTestServer` | started by the e2e | test-owned port, runtime root, SQLite DB | helper waits for ready | `afterAll` kill + `removeOwnedTestRuntime` |
| in-process studio server + scripted AGY | via `startStudioE2eRuntimeServer` | started by the gated e2e | temp data dir; fake CLI writes under temp `HOME` | helper | `afterAll` terminates runs, deletes definitions, closes app, removes data dir |
| local MCP / status HTTP servers | in test | `startAuthRequiredMcpServer`, `startStatusServer` | 127.0.0.1, OS ports | listen callback | closed in `afterAll` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| dummy token `test-dummy` | test constants | never a real credential | none needed |
| MCP server configs, agent definitions, runs | GraphQL from the test | test-owned DB / data dir only; never `~/.autobyteus` | removed with the runtime root / data dir |
| clean environment | `env -i PATH HOME=<resolved temp> TMPDIR` | hides the live app's variables | temp `HOME` removed after the run |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` (as changed in `bb1d3cd28c`) | real-SDK: exact status texts 401/403/404/500, `cause` is `SdkHttpError`, `FAILED`; empty-body 404; refused unchanged; tool call that connects; wrong-credential exact text; cross-origin `HTTP 307` prefix + preserved redirect text | AC-003, AC-004 (refused), AC-005 (unit), AC-006 | Still Valid | read the diff; IMP-01 failing-first, IMP-02 pass | Reuse IMP-02 (same commit) |
| `autobyteus-ts/tests/unit/tools/mcp/**` (stdio and others) | MCP client units | BEH-004 (stdio untouched) | Still Valid | IMP-03 | Reuse IMP-03; also covered by full-suite rerun |
| `autobyteus-ts/tests/integration/tools/mcp` | client vs. tiny real MCP servers | AC-005 regression | Still Valid | IMP-04 | Reuse IMP-04 |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (new, implementation-authored) | preview + discover exact text for 401/403/404/500, token absent | AC-001, AC-002, REQ-005 | Needs Update (extend) | reviewed: correct, exact `toBe`, uses the real built server and real SDK; misses AC-003/AC-004 at the GraphQL surface | Add empty-body 404, refused and stdio launch failure cases |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | `toContain("Failed to preview tools for MCP server")`, no credential | AC-005 | Still Valid | assertions on preserved text | Rerun |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | cross-origin redirect text, same-origin follow, websocket import | AC-005 | Needs Update (small) | AC-005 says the cross-origin message now also carries `HTTP 307`; not asserted | Add `Error: HTTP 307 Temporary Redirect: ` to preview and discover assertions |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (gated) | agents on each runtime call two credential-protected remote MCP tools | SCN-003 surface | Still Valid; Needs Update (extend) | no failing-credential tool call exists | Add a revoked-credential case (scripted AGY only) |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | fixed required `Authorization` | fixture | Needs Update | the revoked case needs to change the accepted value after registration | Add `setRequiredAuthorization()` |
| other `autobyteus-ts` and server unit/integration tests | unrelated assertions; search found no consumer of `SdkHttpError`/`Error POSTing` text | regression | Still Valid | grep in implementation handoff and here | Rerun (autobyteus-ts changed: TESTING.md rerun-by-impact) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | builds | Existing Test | `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts build` | own current build for every `dist`-consuming case |
| API-01 | AC-003, AC-004, AC-005 (unit), AC-006 | `HttpManagedMcpServer` real SDK | Reused | IMP-02 | ran on `bb1d3cd28c`, the commit under validation; log has header and `Tests  15 passed (15)` |
| API-02 | AC-005 regression | `autobyteus-ts` MCP integration | Reused | IMP-04 | same commit; `Tests  22 passed \| 1 skipped (23)` |
| API-03 | design Dependency Rules | lazy SDK load | Reused | IMP-05 | same commit; emitted module inspected |
| API-04 | regression | full `autobyteus-ts` suite | Existing Test | `pnpm -C autobyteus-ts test` | `autobyteus-ts` changed: rerun broadly (TESTING.md step 4) |
| API-05 | regression | server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | server consumes `autobyteus-ts` |
| API-06 | regression | server integration suite | Existing Test | `test:integration:prepare`, then `env -i … pnpm -C autobyteus-server-ts test:integration` | same |
| API-07 | AC-001, AC-002, AC-003, AC-004, REQ-005 | GraphQL through the built server | Durable | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts --no-watch` | user surface: exact text per status, empty body, refused, stdio |
| API-08 | AC-005 | GraphQL through the built server | Existing Test (updated) | same runner for `mcp-http-auth-remote-server` and `mcp-http-redirect-and-transport` | preserved assertions + `HTTP 307` |
| API-09 | AC-006, REQ-005 | real agent run (scripted AGY) → Agent Tools MCP → registry tool → managed server | Durable (gated) | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | SCN-003 through the real runtime path, no provider cost |
| API-10 | BEH-001, BEH-004 | preview path probe | Reused | IMP-08 | same commit; before/after text recorded |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (new cases: empty-body 404, refused, stdio launch failure) | AC-003/AC-004 on the user's GraphQL surface, so a resolver-level change cannot silently add or drop a status |
| API-09 | `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (new case: revoked credential, scripted AGY) | AC-006 through a real agent run, not only the managed-server unit |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-08 | `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | assert `Error: HTTP 307 Temporary Redirect: ` in preview and discover messages | existing assertions kept |
| API-09 | `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | `setRequiredAuthorization(value)` so a test can revoke the accepted credential | default behavior unchanged |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: builds (API-00), then the built-server e2e; the gated runtime e2e starts its own in-process server.
- Environment choices that materially affect the run: clean env (`env -i PATH HOME=<resolved temp> TMPDIR`); scripted AGY CLI; no live provider.
- Health / readiness checks: test helpers.
- Seed data / fixtures: MCP configs and an agent definition created through GraphQL by the test.
- Test identities, authentication, permissions, or session state: dummy `Authorization` values only.
- Requirement-linked journeys or scenarios: SCN-001, SCN-002 (built server), SCN-003 (agent run).
- Evidence to capture: test logs, WebSocket wire summary (value-free) for the revoked case.
- Owned processes and temporary state to clean up: built servers, local HTTP/MCP servers, temp data dirs, temp `HOME`s.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| HTTP/2 empty reason phrase (`HTTP 401: …`) | Node's `http` test servers are HTTP/1.1 and always send a reason phrase; the SDK's `fetch` over HTTP/2 needs a TLS HTTP/2 server and undici HTTP/2 opt-in | Low: one ternary branch, read | No | None |
| Native AutoByteus / Codex / Claude agent runs for AC-006 | need LM Studio or signed-in live CLIs; all share the same `GenericMcpTool` → proxy → managed-server path the scripted AGY run exercises | Low | No | None |
| Browser rendering of the message | the web shows the GraphQL message verbatim; no web change | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added/updated, none removed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the implementation-authored e2e was reviewed and kept; it is extended, not replaced.
