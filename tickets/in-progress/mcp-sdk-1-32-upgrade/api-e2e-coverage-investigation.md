# API/E2E Coverage Investigation — mcp-sdk-1-32-upgrade

## Investigation Meta

- Requirements Doc: `tickets/in-progress/mcp-sdk-1-32-upgrade/requirements-doc.md` (SR-003, Approved; SR-002 additions by the user)
- Investigation Notes: `tickets/in-progress/mcp-sdk-1-32-upgrade/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/mcp-sdk-1-32-upgrade/design-spec.md` (SR-001 Medium / Low; SR-002 Addendum and SR-003 section: validation only, Small / Low)
- SR-002 handoff: `tickets/in-progress/mcp-sdk-1-32-upgrade/handoff-sr-002.md`
- Supplemental Task Artifacts: none. Predecessor baseline: `origin/personal:tickets/done/mcp-http-auth-headers/` (autobyteus-179).
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/mcp-sdk-1-32-upgrade/implementation-handoff.md` (IR-002, validation only; check 1 done as IMP-SR2-01)
- Implementation Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/delivery-revision-record.md` (DR-001 delivered round 1)
- API/E2E Revision Record: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: implementation handoff IR-002 (validation only), for SR-002 + SR-003: the user's regression request ("Upgrading a library should make things better instead of breaking things"; "the testing should at least make sure the different runtime for different MCP still works")
- Prior Investigation Reviewed: round 1 below (API-REV-001); its cases stay valid for the round-1 criteria.
- Latest Authoritative Investigation: this file

Round 1 paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade` (branch `codex/mcp-sdk-1-32-upgrade`). Validated commit: `c7f0c18fdc`. Its source is identical to `4923d179c1`: `git diff --name-only 4923d179c1 c7f0c18fdc` outside `tickets/` is empty.

## Round 2 Plan (IR-002; SR-002 + SR-003 parity) — current

Worktrees:
- **After:** `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity`, branch `codex/mcp-sdk-1-32-upgrade-parity`, product source `f59055f13f`, SDK 1.32.1. Ticket record `a42c1d02e0`.
- **Before:** `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity-before`, detached `bf3c550c18`, SDK 1.30.0. Test-owned; removed after the round.
- `git diff --stat bf3c550c18 f59055f13f -- autobyteus-server-ts/src` is empty. The product difference is `autobyteus-ts` (loaders, WebSocket removal) plus the SDK version, so any behavior difference comes from the upgrade.

Basis:
- REQ-008 / AC-010…AC-012: real-world parity on the user's kind of servers (`uv` stdio), an HTTP server, and servers that exit or hang at start.
- REQ-009 / AC-013…AC-015: our own endpoints. The code statement is AC-013; `create_task`/`update_task` through Agent Tools MCP from Claude and Codex; a `/mcp/gateway` call of an external tool.
- REQ-011 / AC-017: runtime × MCP matrix, before and after.
- REQ-010 safety.
- AC-016: plain-words report.
- Any upgrade-caused difference is a defect of this ticket and goes to the failure route.

Surfaces: isolated desktop instances (packaged worktree builds) of both commits, driven only through their public GraphQL, agent WebSocket and `/mcp/gateway`. The renderer is unchanged, so no UI journey is needed.

Real-use facts found during planning:
- The user's `VideoAudioServer` entry runs `uv --directory <repo>/video-audio-mcp run server.py`. In the user's `autobyteus_mcps`, `server.py` was removed by commit `a947f1a` (folder turned into a CLI), so the user's entry no longer starts on either commit. Pre-existing and outside this ticket. For the parity check, the last server version (`a947f1a^`) is restored read-only with `git archive` into test-owned copies.
- `media-downloader` comes from `autobyteus_private_mcps/yt-dlp-mcp` (`HEAD`), restored the same way.
- Each copy gets a fresh `.venv` from its own `uv.lock` (`uv sync --frozen`), the same on both sides (Python `mcp` 1.28.1 and 1.26.0).
- The isolated instance's embedded server gets only a system-baseline environment. Its runtimes therefore use the host sign-ins under the real HOME: Claude, AGY, Grok. Codex uses a throwaway `CODEX_HOME` (empty `config.toml`, `auth.json` symlinked). `ANTIGRAVITY_CLI_COMMAND` does not pass through, so AGY runs as the real CLI here. The scripted AGY CLI stays the fallback (built-server harness) if the real one is unavailable.
- The user's own `mcps.json` shape has no `transport_type`. The harness also records how bulk import treats that shape on both commits.

Planned cases (round 2):

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R10 | AC-010 | core integration tests against the real `pdf_mcp` | Reused | IMP-SR2-01 (both commits) | Ran by implementation on both commits with a test-owned layout |
| API-R11 | AC-013 | code statement | Reused | investigation notes "SR-002 Investigation" (grep: no SDK import in `autobyteus-server-ts/src`) | Re-verified on both worktrees in API-15 |
| API-10 | AC-011, AC-012, REQ-010 | isolated instance per commit: GraphQL preview, bulk import, discover of VideoAudioServer, media-downloader, test-owned HTTP server (dummy token), exit-at-start, hang-at-start; responsiveness during the hang | Temporary Probe (harness) | `pnpm --silent isolated-app start --build` per worktree (throwaway `CODEX_HOME`); `node parity-harness.mjs <side> <backendUrl> …` | The before commit cannot carry durable tests; one harness drives both sides identically |
| API-11 | AC-015 | `/mcp/gateway` → external HTTP tool and external stdio tool (VideoAudioServer `get_media_duration` on a test-owned sample) | Temporary Probe (same harness) | same run | — |
| API-12 | AC-014, AC-017, AC-011 (agent call) | runtime × {project tools `create_task`+`update_task`, external stdio, external HTTP} for native (LM Studio), Claude, Codex, AGY, Grok | Temporary Probe (same harness) | same run, runtimes `native,claude,codex,agy,grok` | One agent per runtime with all three tool kinds |
| API-13 | AC-011, AC-012 | stop each instance; orphan check | Journey | `pnpm --silent isolated-app stop <id>`, then `ps` for processes referencing the test-owned folders or the exit/hang commands | No child may outlive the app |
| API-14 | REQ-010 | user's repositories and data untouched | Journey | `git status` of `autobyteus_mcps` and `autobyteus_private_mcps` against the baseline taken before the round | Safety |
| API-15 | AC-013 | SDK import check on both commits | Temporary Probe | `grep -rn "@modelcontextprotocol" autobyteus-server-ts/src` in both worktrees | Confirms the code statement on each commit |
| API-16 | AC-016, AC-009 | plain-words report; dummy-value scan of round-2 evidence | — | report + grep | — |
| API-17 | AC-014 (Codex), AC-017 (Codex row) | Codex App Server thread's own MCP client → Agent Tools MCP → project and external tools, without a model turn | Temporary Probe | temporary in-process test copied into each worktree, run, removed | Added during execution: the Codex account hit its usage limit on both commits |
| API-18 | AC-017 going forward | durable gated runtime × MCP matrix suite on the after branch | Durable | `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` with each runtime's gate | Added during execution: closes the durable-coverage gap and answers "the testing should at least make sure the different runtime for different MCP still works" |

- Test progress log: `Yes` (rows appended in `api-e2e-test-progress.md`).
- Durable coverage: the parity spans a commit that cannot carry new tests, so the parity probes are temporary (sources kept in the evidence). For future upgrades, a durable gated runtime × MCP matrix suite is added on the after branch (API-18).

Not tested in round 2 (planned):
- Calls on `media-downloader` beyond listing, and every SSH, TTS and image server (REQ-010, DEC-005).
- `streamable_http_mcp_toy` / `wss_mcp_toy` (exist nowhere; see IMP-SR2-01).

## Current Requirement And Design Basis (round 1)

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
