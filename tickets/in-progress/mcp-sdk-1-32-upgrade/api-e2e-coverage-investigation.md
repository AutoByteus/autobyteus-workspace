# API/E2E Coverage Investigation — mcp-sdk-1-32-upgrade

## Investigation Meta

- Requirements Doc: `tickets/in-progress/mcp-sdk-1-32-upgrade/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/mcp-sdk-1-32-upgrade/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/mcp-sdk-1-32-upgrade/design-spec.md` (SR-001; Medium / Low)
- Supplemental Task Artifacts: none. Predecessor baseline: `origin/personal:tickets/done/mcp-http-auth-headers/` (autobyteus-179).
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/mcp-sdk-1-32-upgrade/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route)
- Prior Investigation Reviewed: none for this ticket. The 179 investigation and report were read for the preserved baseline.
- Latest Authoritative Investigation: this file

Paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade` (branch `codex/mcp-sdk-1-32-upgrade`). Validated commit: `c7f0c18fdc`. Its source is identical to `4923d179c1`: `git diff --name-only 4923d179c1 c7f0c18fdc` outside `tickets/` is empty.

## Current Requirement And Design Basis

- REQ-001 / AC-001: one `@modelcontextprotocol/sdk@1.32.1` in both packages, with the Claude Agent SDK and GenAI peers on it.
- REQ-002 / AC-002, AC-003, QR-001:
  - A cross-origin redirect is not followed: connect, preview or call fails, the error says so, and the other origin gets no request.
  - A same-origin redirect works.
  - `redirectPolicy` is never set.
- REQ-003 / AC-004: autobyteus-179's credential behavior (headers, token, restart, agent tool call) unchanged on every runtime; stdio env and cwd unchanged.
- REQ-004 / AC-005: typed loaders with no seams or casts.
- REQ-005 / AC-006: WebSocket MCP removed; `websocket` rejected with a message listing `stdio, streamable_http`; nothing saved.
- REQ-006 / AC-007, AC-008: real stdio fixture test, and a full rerun because the SDK is a shared foundation.
- REQ-007 / AC-009: dummy values only.
- Design escalation triggers: one lock copy; peer ranges; a runtime (Claude, Codex, AGY, Grok) or the packaged Electron/Docker build behaving differently on 1.32.1; any non-`tools/mcp` dependency on WebSocket MCP.
- Implementation deviation (handoff): `BaseManagedMcpServer`'s session type is the SDK's `Client` (`Pick<…>`), and two mock-only branches are removed. No behavior change for real clients.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (use stdio/HTTP MCP on every runtime), SCN-002 (endpoint redirect), SCN-003 (bulk import naming `websocket`).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 — An HTTP endpoint that has moved permanently on the same host answers `308` to the new path (the common "moved" case). Trigger: a saved server's URL redirecting. Must keep working through preview, discover and tool calls, with the credential.
  - SCN-A2 — A cross-origin redirect target carrying a query value. The user-visible error must not contain the query (the SDK strips userinfo, query and fragment).
  - SCN-A3 — A user who imported a WebSocket entry under an earlier build has a `mcps.json` entry in stdio shape with an empty `command` (the old `toStandardEntry` wrote that shape). A hand-written `transport_type: "websocket"` entry is also possible. Startup must still register the valid entries next to them.
  - SCN-A4 — Packaged desktop app and Docker image built from this worktree: they install and run SDK 1.32.1, and stdio/HTTP MCP still connect and call (design escalation trigger).
- Recorded as `Technically Possible but Unsupported/Contrived`: none.
- Observed SDK contract, not a scenario to test: a `301`/`302` on a POST is not followed even within the origin, because it would turn the POST into a GET. On 1.30.0 the fetch default would have converted the POST into a GET without a body, which no MCP endpoint accepts. So this is no working path lost; recorded as an observation.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 stdio/HTTP on 1.32.1, 179 credentials | Preserved | IMP-02/05/06/07/08 | Reuse; add the live native, Codex and Claude runtimes (AC-004/AC-008); full server e2e suite |
| BEH-002 cross-origin refused, same-origin followed | Changed | IMP-00 red, IMP-02 green (core) | Prove through the product: GraphQL preview, discover, gateway, server logs |
| BEH-003 `websocket` rejected | Changed | IMP-02 parser test | Prove through GraphQL bulk import and through startup with WebSocket-era stored entries |
| BEH-004 typed loaders | Changed (internal) | IMP-01, AC-005 grep | Reuse; covered indirectly by every real connection |
| Packaged Electron / Docker | Preserved (dependency change) | none yet | Build both from the worktree and exercise MCP through each |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | parser, factory, loaders | IMP-02 | none | — |
| API / transport / contract | Yes | SDK transport redirects, GraphQL preview/import | IMP-02 (core client only), IMP-07 (179 GraphQL paths) | redirect and import through GraphQL | Live API (built server) |
| Frontend component / state | No | — | IMP-09 (full web suite, unchanged package) | — | — |
| Browser integration / user journey | No | — | — | error text reaches the UI through the existing preview/import messages (unchanged) | — |
| Authentication / session / permissions | Yes | credentials must not leave the origin | IMP-02 | through the product, and on live runtimes | Live API, runtime suites |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron packaging | Yes (dependency in the packaged server) | packaged server `node_modules` | none | packaged app installs and runs 1.32.1 | Isolated desktop instance (`isolated-app start --build`) |
| Process / lifecycle | Yes | startup load with WebSocket-era entries | none | startup tolerance | Lifecycle (built server) |
| Persisted-data transition | Yes (`Not Affected` decision) | `mcps.json` | `getAll()` tolerance (code) | real startup with old-shape entries | Lifecycle |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | agent runtimes (native, Codex, Claude incl. Claude Agent SDK's peer copy; AGY scripted), Docker image | IMP-08 (AGY only) | live runtimes, Docker build with `--no-frozen-lockfile` | Runtime suites, Docker container |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`
- Project type and stack: pnpm monorepo; Node 22/TypeScript; Fastify + GraphQL server; Nuxt/Electron web; Docker server image.
- Project testing guideline: `TESTING.md` (repository root; unchanged since the 179 base). No closer `TESTING*.md`.
- Conflicting or unclear instructions: TESTING.md's Docker recipe mounts only `autobyteus-server-ts/dist` over a published image. That cannot carry a dependency change, so the image is built from the worktree instead (`Dockerfile.monorepo`, as `docker/build.sh` does). The container is still test-owned, bound to `127.0.0.1` on a free port, without user volumes, and removed afterwards.
- Required environment or secrets available: Yes — LM Studio local; `codex` and `claude` signed in on the host; Docker 29 with buildx. No provider keys imported.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | as in 179; plus "Rerun by impact": a dependency change marks everything Rerun |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `pnpm --silent isolated-app start --build`; JSON result with `backendUrl`, `instanceId`; `stop <id>` |
| `autobyteus-server-ts/docker/{build.sh,Dockerfile.monorepo,README.md}` | Docker image | `docker buildx build --load --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo .`; builder stage runs `pnpm install --no-frozen-lockfile` |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` | `/mcp/gateway` | non-loopback clients need `AUTOBYTEUS_MCP_GATEWAY_TOKEN` (Docker case) |
| 179 tests `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts`, `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Preserved-behavior suites | gates `RUN_AGY_FAILURE_E2E`, `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Core + server build | worktree | `pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build` | serialized | exit 0 | untracked outputs |
| Built test servers | `autobyteus-server-ts` | `startBuiltTestServer` | owned roots and dbs | `Server listening on` | `stop()`, `removeOwnedTestRuntime` |
| Server e2e suite | repo root | `pnpm test:e2e` in a clean env | gated suites skip | vitest summary | per-test cleanup |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` | never touches the user's app | `/rest/health` | `isolated-app stop <id>` |
| Docker image + container | repo root | build as above; `docker run -d -p 127.0.0.1:<free>:8000 …` with a dummy gateway token | no user volumes | `/rest/health` | `docker rm -f -v`, `docker rmi` |
| LM Studio | host | running; model loaded just in time | one local-model run at a time | `/v1/models` | `lms unload` |

| Data / Fixture / Identity Need | Mechanism | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| MCP configs | GraphQL configure/import; synthesized `mcps.json` for SCN-A3 (written into a test-owned runtime root, in the shapes old builds wrote) | dummy values only | roots removed |
| Remote MCP servers | `tests/e2e/helpers/auth-required-mcp-server.ts` (optional `redirects` map added) | loopback only | closed |
| Stdio MCP server | `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` (from the implementation) | — | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data: `{command: ""}` (what earlier builds wrote for a WebSocket import) and `{transport_type: "websocket", url: "ws://…"}` (hand-written), next to a valid HTTP entry with a token.
- Evidence planned: API-02 starts the real built server on that file; the valid entry registers and is callable; the server stays up.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | 179 auth cases + redirect cases (real SDK) | AC-002, AC-003, AC-004 | Still Valid | IMP-00 red / IMP-02 green | Reuse |
| `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` | Real stdio fixture: env, cwd, failure | AC-007 | Still Valid | IMP-02 | Reuse |
| `autobyteus-ts/tests/unit/tools/mcp/{types,config-service,server-instance-manager,base-managed-mcp-server}.test.ts` | Parser, `websocket` rejection, factory, base | AC-006 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | 179 GraphQL/gateway/restart credentials | AC-004 | Still Valid | IMP-07 | Reuse; it also runs inside the full e2e suite (API-05) |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Agent tool call per runtime | AC-004 | Still Valid | IMP-08 (AGY) | Run native, Codex, Claude (API-03, API-04, API-06) |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Credential-checking MCP server | — | Needs Update | — | Add an optional `redirects` map and a recorded `path`; existing callers are unchanged |
| `autobyteus-ts/tests/integration/tools/mcp/{stdio,http}-managed-mcp-server.test.ts`, `tool-registrar.test.ts` | External toy repo | — | Out Of Scope | Scope Guardrail; IMP-03 | Follow-up (handoff item 3) |
| No server-level test of redirects, WebSocket import or WebSocket-era stored entries | — | AC-002, AC-003, AC-006 | — | grep of `tests/e2e` | Add durable coverage |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001 | lockfile, manifests | Reused | handoff row AC-001 | Source unchanged since `4923d179c1`; also rechecked in node_modules resolution and inside the Docker build (API-07) |
| API-R02 | AC-002, AC-003, AC-004 (core), AC-006, AC-007 | core unit | Reused | IMP-00, IMP-02 | Same source |
| API-R03 | AC-005 | build + grep | Reused | IMP-01, handoff row AC-005, IMP-04 | Same source |
| API-R04 | AC-004, AC-008 | server unit, integration, typecheck | Reused | IMP-04, IMP-05, IMP-06 | Same source |
| API-R05 | AC-004 | 179 built-server e2e, AGY tool call | Reused | IMP-07, IMP-08 | Same source; both 179 files also run again inside API-05 |
| API-R06 | AC-008 | web full suite | Reused | IMP-09 | Same source |
| API-01 | AC-002, AC-003, AC-006, QR-001; SCN-002, A1, A2, SCN-003 | GraphQL preview, configure, discover, import; `/mcp/gateway`; server output | Durable | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch` (first `it`) | Redirect and import behavior through the product |
| API-02 | AC-006, persisted data; SCN-A3 | real startup with WebSocket-era `mcps.json` entries | Durable | same file, second `it` | Startup tolerance |
| API-03 | AC-004, AC-008 | native runtime (LM Studio) agent tool call | Existing Test | `RUN_LMSTUDIO_E2E=1 … mcp-http-auth-agent-tool-call.e2e.test.ts` | Live runtime on 1.32.1 |
| API-04 | AC-004, AC-008 | Codex live agent tool call | Existing Test | `RUN_CODEX_E2E=1 … same file` | Live runtime |
| API-06 | AC-004, AC-008, R-002 | Claude live agent tool call (Claude Agent SDK shares SDK 1.32.1) | Existing Test | `RUN_CLAUDE_E2E=1 … same file` | Live runtime and peer change |
| API-05 | AC-008 | full server e2e suite | Existing Test | `pnpm test:e2e` (clean env) | Shared-foundation rerun |
| API-07 | AC-001, AC-004, escalation trigger | Docker image built from the worktree; container | Journey | build; run on `127.0.0.1`; check the SDK version in the image; GraphQL configure HTTP (token) + stdio fixture; gateway calls; cross-origin redirect refused | Packaged Docker path |
| API-08 | AC-004, escalation trigger | Packaged Electron (isolated instance) | Journey | `isolated-app start --build`; check the packaged SDK version; GraphQL configure HTTP (token) + stdio fixture; gateway calls; redirect refused; stop | Packaged desktop path |
| API-09 | AC-009 | evidence, diff, raw logs | Temporary Probe | credential-pattern grep | One-off scan |
| API-01M | AC-002 (non-vacuity) | built core patched to `redirectPolicy: "follow"` | Temporary Probe | patch `autobyteus-ts/dist/.../http-managed-mcp-server.js`, rerun API-01, restore | Added during execution: proves API-01 goes red if cross-origin redirects were followed |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-01, API-02 | `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | Guards the redirect policy, the import rejection and the stored-entry tolerance at the product boundary across future SDK upgrades (e.g. autobyteus-182) |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Optional `redirects` (path → status + Location, answered before the credential check) and `path` in observations | Backward-neutral for the 179 callers |

## Durable Coverage To Remove

None by API/E2E. The implementation removed the WebSocket tests, recorded in the handoff with the design's removal plan.

## Desktop Application Validation Plan

- Desktop framework: Electron with an embedded server.
- Guideline used: TESTING.md ("Isolated desktop instance"), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: packaging of the server's dependencies (SDK 1.32.1) and the embedded server running MCP.
- Approach: `pnpm --silent isolated-app start --build`, then drive the embedded server through its reported `backendUrl` (GraphQL + `/mcp/gateway`, loopback). No renderer change, so no UI journey is needed.
- Not disturbing the running app: the isolated instance has its own ports, data root and process group; the user's AutoByteus app keeps running.

## Live Environment And Fixture Plan

- Startup order: Docker build (background) → core + server build → API-01/02 → API-03 (LM Studio) → API-04 → API-06 → API-05 (full e2e) → API-08 (Electron build + instance) → API-07 (Docker container) → API-09.
- Environment choices: clean env for e2e; the real HOME for Codex and Claude; a dummy gateway token for the Docker container (non-loopback client).
- Evidence: vitest logs, value-free observations, version checks, curl/GraphQL outputs, cleanup receipts.
- Cleanup: built servers, roots, dbs, isolated instance, container, test image, LM Studio model.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| External-toy integration tests | Out of scope (Scope Guardrail); need the sibling repo layout | Low; self-contained fixtures cover the same client paths | No | Handoff follow-up 3 |
| Grok runtime | Reaches MCP tools through the same `autobyteus_agent_tools` endpoint as AGY/Codex/Claude | Low | No | None |
| `https` upgrade redirect (`http://host` → `https://host`, default ports) | Needs TLS on default ports locally; SDK unit-level contract | Low | No | None |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one file added, one helper extended)
- Reroute Required Before Validation Execution: `No`
- Notes: direct route; no test-code review required.
