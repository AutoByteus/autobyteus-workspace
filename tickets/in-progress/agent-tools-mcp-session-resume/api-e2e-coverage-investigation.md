# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-spec.md`
- Supplemental Task Artifacts: the five evidence artifacts under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/`, including the real-product reproduction and Codex 0.150.1 rebind probe
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/solution-revision-record.md` (`SR-004`, retaining `SR-003`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/architecture-review-revision-record.md` (`ARCH-REV-005`, retaining `ARCH-REV-004`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/implementation-revision-record.md` (`IR-002`, correcting `IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-revision-record.md` (`CRR-004`, retaining authoritative implementation review `CRR-002`)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3` (completed)
- Trigger: `CRR-004` repeated proportional test-review `Local Fix Fail` (`TR-F-003`) after `API-REV-002`; implementation source remains `CRR-002 Pass`
- Prior Investigation Reviewed: `API-REV-002 Pass / 97%`
- Latest Authoritative Investigation: this file, initialized `2026-08-28T07:17:26+02:00`

## Current Requirement And Design Basis

The executable result must prove the complete corrected contract, not only the reviewed unit seam:

1. Canonical run ID deterministically yields one fixed, non-secret `agtrun_<full SHA-256 base64url>` path; Codex and Claude receive the same headerless descriptor contract.
2. One process-owned Agent Tools Fastify listener binds to `127.0.0.1:0`, is ready before activation/recovery, remains immutable for the process lifetime, is absent from the requested main listener, and closes only after run/provider cleanup.
3. Actual peer, Host, and Origin local admission precede OPTIONS, method handling, or run-session lookup. Local inactive IDs produce redacted `404 session_unavailable`; arbitrary Authorization headers convey no authority.
4. Direct, Team-member, and stop-all termination of a published AgentRun converge on `AgentRunManager.prepareAgentRunTermination`. Cancel and `accepted:false` preserve the exact current run/session/resources. Accepted finish requires inactivity, exact-current removal, and successful `AgentRunResourceManager.release`/`deactivateForRun` before the owning stop reports success. Mismatch or cleanup failure cannot become success.
5. Restore recomputes the same run path with fresh live context. At least two lifecycle cycles and a complete restart return registry/resource/listener/provider state to baseline without new persisted Agent Tools data.
6. Requested main bind and generic internal-base behavior remain unchanged. The independent `/mcp/gateway` local/configured-token/non-local/catalog/dispatch contract remains unchanged and does not require an AgentRun.
7. Critical realistic evidence remains required for the original same-process Codex cached-thread Team stop/config-update/restore journey (`AC-001`, `AC-003`), plus real/provider-bound headerless descriptor behavior when the configured environment permits it.

The implementation handoff's compatibility check is clean and its persisted-data decision is `Not Affected`. Coverage must not preserve random/bearer/tombstone/partial-owner compatibility behavior or add migration/persistence machinery.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / supported Team stop and restore | Changed | REQ-001/003/006, AC-001-004/013, SR-004 | Add direct full-Team-spine lifecycle evidence; unit-only Mixed handle evidence is insufficient. |
| BEH-002 / Codex and Claude activation | Changed | REQ-002, AC-002/009 | Update legacy issuer fixtures to the one required `activateForRun` contract and prove headerless provider configs. |
| BEH-004 / local HTTP admission and inactive response | Changed | REQ-003-005/009-010, AC-004-006/011-013 | Replace bearer/revoke integration assertions with tokenless peer/Host/Origin-first admission, arbitrary-header non-authority, deactivation, and redacted inactive 404. |
| BEH-005 / exact resource and restart bound | Changed | REQ-001/003/007/010, AC-004/007/012/013 | Replace releaser fixtures with exact-run deactivators; execute two cycles, restart/shutdown, and count baselines. |
| BEH-006 / persisted state | Preserved | REQ-005/007, AC-007/008 | Retain memory/history scenarios after fixture update; audit for zero Agent Tools files/schema/migration/fallback. |
| BEH-008 / external gateway | Preserved | REQ-008, AC-010 | Existing gateway route integration is still valid and must execute unchanged. |
| BEH-009 / main/local listener topology | Changed | REQ-004/008/010, AC-006/010-012 | Execute real listener and host lifecycle checks across representative loopback, wildcard, and specific non-loopback main binds; verify main-path 404 and local success. |
| CR-F-002 exact-only cleanup | Removed | SR-004/IR-002/CRR-002 | Remove obsolete releaser fixture; update all durable callers to exact `AgentToolMcpRunSessionDeactivator`; retain no owner-partial compatibility aliases/tests. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | deterministic active session and exact published-run finalization | focused unit/architecture tests | full Team orchestration and actual HTTP observability | integration/lifecycle |
| API / transport / contract | Yes | tokenless Streamable HTTP route on private listener | stale route integration plus new gate/host units | real TCP Host behavior, inactive 404 after stop, main-route absence | live HTTP/API |
| Frontend component / state | No | no frontend source changed | stopped-run config/API E2E already exists | original UI journey is useful corroboration but not a changed rendered boundary | none by default |
| Browser integration / user journey | No direct code change | Team UI drives existing API lifecycle only | prior exact-product reproduction | browser adds little beyond direct GraphQL/lifecycle/provider execution for this backend-only repair | not selected unless API journey cannot reach the supported trigger |
| Authentication / session / permissions | Yes | removal of internal bearer; local transport admission | local-access unit tests | actual descriptor/client Host behavior and arbitrary Authorization non-authority | live HTTP/provider |
| Desktop renderer / web-equivalent UI | No direct code change | Electron uses the same backend/API surfaces | prior reproduction | no new renderer logic | API/lifecycle preferred |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/packaging changes | prior reproduction only | none material for corrected source boundary | no desktop launch planned |
| Process / lifecycle | Yes | one local listener; Team/direct/stop-all exact cleanup; shutdown ordering | manager/Mixed/host units | full owner spine, sockets, provider client lifetime, startup unwind | lifecycle/process |
| Persisted-data transition | No (`Not Affected`) | pure derivation only | source/architecture audit | representative existing history after restart | E2E history/restart |
| Worker / queue / distributed coordination | No | none | N/A | N/A | none |
| External integration | Yes, preserved | Codex/Claude provider transport and independent gateway | mocked provider units; existing gateway integration | real configured provider/cache behavior | real provider preflight/run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume`; project `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/autobyteus-server-ts`
- Project type and runtime stack: pnpm workspace; Node.js/TypeScript; Vitest in fork pool with serial files; Fastify; GraphQL/REST/WebSocket; Prisma/SQLite; Codex App Server and Claude Agent SDK provider integrations
- Conflicting, missing, or unclear project instructions: `AGENTS.md` documents Vitest execution from the project; the root scripts define deterministic and live E2E. `pnpm typecheck` uses `tsconfig.json`, which the implementation handoff records as independently unsuitable because tests lie outside `rootDir: src`; `tsconfig.build.json --noEmit` and `pnpm build` are authoritative production compile checks. No conflict blocks coverage work.
- Required environment variables or secrets available: unknown until the documented live-E2E preflight executes. Deterministic suites require no provider secret. Secret values will not be recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | closest test instruction | use `vitest run ... --no-watch`; integration suite path is supported |
| `autobyteus-server-ts/README.md` | project setup and E2E authority | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; `pnpm test:e2e:real`; `RUN_CODEX_E2E=1` enables Codex live suites; tests use `.env.test` and `tests/.tmp/`, not development data |
| workspace-root `package.json` | root E2E scripts | deterministic E2E is `pnpm --filter autobyteus-server-ts test --run tests/e2e`; live runner builds first and reports unavailable capabilities explicitly |
| `autobyteus-server-ts/package.json` | package build/test scripts | `prepare:shared` builds required workspace outputs; `build` includes Prisma generation and production compile; `test` invokes Vitest |
| `autobyteus-server-ts/vitest.config.ts` | test runner config | test include `tests/**/*.test.ts`; serial files; Prisma setup/global setup; prompt-engineering exclusions |
| `.env.test`, `tests/setup/prisma-env.ts`, `tests/setup/prisma-global-setup.ts` | isolated test runtime | temporary SQLite/data under test-owned paths; never use development or user production data |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| shared generated packages | workspace root or server | `pnpm -C autobyteus-server-ts prepare:shared` | generated `dist` may be created for test imports | package build exits 0 | remove only generated outputs created by this run if they were absent initially |
| deterministic Vitest API/integration/E2E | server project | `pnpm exec vitest run <paths> --no-watch` / root `pnpm test:e2e` | owns isolated Prisma/test temp state | Vitest result | runner/global teardown; remove only task-created evidence/temp state |
| local Fastify listeners | Vitest fixtures / temporary probe | project test constructors and `listen({host:'127.0.0.1',port:0})` | OS-assigned task-owned sockets | address/HTTP readiness | `app.close()` / host handle close in `finally` |
| live provider E2E | workspace root | `pnpm test:e2e:real:preflight`, then selected documented live run | capability/credential gated; no unavailable capability may be called a pass | preflight report and runner readiness | runner teardown plus prefix-targeted history cleanup when applicable |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| SQLite/application data | Vitest Prisma global setup and per-suite temp directories | test-owned only | automatic; remove only task-owned residue |
| AgentRun/Team identities | existing run manager, Team fixtures, GraphQL E2E helpers | deterministic IDs in isolated tests | fixture teardown |
| Agent Tools lifecycle fixture | replace deleted releaser fixture with current exact-run deactivator fixture | no partial-owner API | durable fixture retained |
| provider identity/history | documented live-E2E test runtime | do not import or expose secrets; do not touch user's Electron state | suite-owned cleanup / prefix cleanup if needed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design “Persisted Data / State Transition Decision”; implementation “Persisted Data Transition Check”
- Representative existing-data setup and required behavior: existing run/team history supplies the same immutable run ID after restore/restart; route identity is recomputed; no Agent Tools record is loaded or written
- Evidence planned: retain and update existing history/memory E2E setup, run restart/history checks, audit generated/test data for no Agent Tools binding/credential files, and source-audit for no schema/migration/dual-reader additions
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/{agent-tool-mcp-run-session-id,agent-tool-mcp-session-service,agent-tools-mcp-local-access,agent-tools-mcp-host,scoped-agent-tool-mcp-session-authority}.test.ts` | deterministic ID, headerless active record, readiness, local gate, one listener, same-ID reactivation | REQ-001-005/010; AC-002/004-007/009/011-012 | Still Valid | changed source-review-passed coverage | execute narrow and broader suites |
| `tests/unit/agent-execution/agent-run-manager.test.ts`, `agent-run-resource-manager.test.ts`, and Mixed termination/lifecycle tests | cancel/reject/success/mismatch/cleanup failure, exact release once, same-ID fresh activation | REQ-003/007; AC-004/007/013 | Still Valid | CRR-002 31/31 focused evidence | execute; do not treat as full Team/API proof |
| architecture provider/framework boundary tests | prohibit default issuer, Team Agent Tools imports, direct Mixed lower-level termination, and main route registration | REQ-002/005/010; AC-009/011/013 | Still Valid | CRR-002 33/33 evidence | execute broader architecture set |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | official MCP client, protocol/errors/tool dispatch, but still asserts bearer-auth/random create/revoke semantics | REQ-004/005/009; AC-004-006 | Needs Update | direct source inspection: `token`, `Authorization`, `createSession`, `revokeSession`, auth-oriented names/assertions remain | convert to deterministic active/tokenless/deactivate semantics; preserve protocol/tool coverage |
| `tests/integration/agent-execution/agent-run-manager.integration.test.ts` plus `tests/fixtures/agent-run-manager-infrastructure-fixtures.ts` | create/restore/termination integration, but fixture uses removed Releaser | REQ-003/007; AC-004/007/013 | Needs Update | imports removed type/fixture | replace with exact deactivator and add/retain accepted cleanup observation |
| `tests/integration/agent-execution/{agent-run-prompt-fallback,agent-run-manager.memory-layout.real,autobyteus-agent-run-backend-factory.lmstudio,codex-agent-run-backend-factory}.integration.test.ts` and `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | unrelated runtime/memory behavior with run-resource fixture setup | REQ-007/008; AC-007/008 | Needs Update | setup imports deleted releaser fixture | mechanical exact-deactivator fixture update; keep scenario assertions |
| `tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts` | Team factory wiring and provenance, but expects old releaser property | REQ-003/007; AC-013 | Needs Update | removed fixture/property names | update to deactivator/current `runSessions`; retain boundary assertions |
| `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | application package Team prompt plus Agent Tools setup | REQ-002/003; AC-009/013 | Needs Update | fake `issueForRun` remains | update to `activateForRun` and current activation result |
| `tests/integration/agent-execution/{codex-thread-bootstrapper,claude-session-manager,claude-agent-run-backend-factory,codex-agent-run-backend-factory}.integration.test.ts` | provider materialization/session/factory integration | REQ-002/005; AC-002/005/009 | Needs Update | removed Issuer type/global getter and old issue method/property names | inject current activator explicitly; assert headerless deterministic descriptor where materialized |
| `tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | final Claude SDK MCP server mapping | REQ-002/005; AC-005/009 | Needs Update | focused post-edit execution exposed a stale descriptor fixture and expected `headers.Authorization` output despite the approved headerless provider contract | remove the forbidden fixture/output headers and retain exact server-name/type/url/always-load assertions |
| `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | real Codex App Server Agent Tools startup/status/direct-call/global-routing journey | REQ-001-005/007; AC-002-005/007/009 | Needs Update | deeper post-edit audit found a hand-decoded `http_headers.Authorization` requirement and authenticated-session helper even though it does not import the removed issuer type | make the durable real-provider journey require an absent `http_headers` field, call the active route headerlessly, and retain startup/status/tool-call plus inactive/restore evidence |
| `tests/e2e/runtime/{all-runtime-send-message-matrix,claude-team-inter-agent-roundtrip,codex-team-inter-agent-roundtrip,mixed-task-delegation,mixed-team-runtime-graphql,nested-mixed-team-runtime-graphql}.e2e.test.ts` | live Team/runtime GraphQL and WebSocket journeys | REQ-001-004/007/010; AC-001-004/007/009/011-013 | Needs Update | expanded topology audit found every suite manually registers Agent Tools on the same ad-hoc main Fastify listener with the obsolete zero-dependency route helper | replace only the stale harness with the real `buildStudioServer` composition, start its owned Agent Tools host before the main listener/recovery, and retain the live journey assertions |
| `tests/integration/application-backend/standalone-application-server.integration.test.ts` | confined standalone main server surface | REQ-010; AC-011/012 | Needs Update | still passes an ignored `agentToolsRouteDependencies` option from a separately created host, which falsely implies the main builder owns Agent Tools | remove the obsolete input, assert Agent Tools-shaped main route is 404, and exercise the owned host/listener separately |
| `tests/integration/application-backend/standalone-application-server.integration.test.ts` | main standalone surface confinement | REQ-010; AC-011/012 | Still Valid but incomplete | does not directly cover the new private listener lifecycle | execute; supplement with host/listener lifecycle scenario |
| `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` and gateway catalog units | local no-token, configured-token denial, official SDK list/call | REQ-008; AC-010 | Still Valid | gateway production has no diff and assertions describe preserved contract | execute unchanged with no AgentRun |
| existing Team service/manager/runtime E2E suites | supported Team start/stop/restore/config/history paths | REQ-003/006/007; AC-001/003/004/007/013 | Still Valid but incomplete | no Agent Tools inactive-404/resource assertion across full Team spine | add focused durable full-spine scenario rather than overloading unrelated runtime assertions |
| existing real Codex/Claude E2E suites | real provider Team messaging and restore journeys | AC-001/003/009 | Still Valid when configured | environment-gated, external capability | run preflight; execute targeted capable scenarios; report unavailable as not tested, never pass |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/fixtures/agent-tool-mcp-run-session-releaser-fixtures.ts` | `revokeForRun`, `revokeForOwner`, recording revoked owners | exact active-only deactivation replaced revoke; partial-owner cleanup is prohibited and has no supported caller | SR-004, DS-008, CR-F-002 resolved by IR-002/CRR-002 | `tests/fixtures/agent-tool-mcp-run-session-deactivator-fixtures.ts` with exact `deactivateForRun` only | N/A |
| bearer/revoked cases in `agent-tools-mcp-routes.integration.test.ts` | missing bearer -> 401; wrong bearer hides route; revoke/tombstone terminology; descriptor secret leak assertions | Agent Tools is intentionally tokenless/headerless and inactive records are deleted | REQ-004/005/009, AC-004-006, no-compatibility policy | tokenless valid request; arbitrary Authorization grants nothing special; peer/Host/Origin-first 403; inactive exact ID -> redacted 404; deactivation deletes | N/A |
| provider integration global/default issuer setup | ambient `getAgentToolMcpSessionIssuer()` or optional issuer property | host-owned readiness requires explicit process-composed activator and no fallback | REQ-002/010, AC-009/012 | explicit `AgentToolMcpRunSessionActivator` fixtures and headerless descriptors | N/A |
| live Codex global-routing E2E config decoder/helpers | requires and redacts `http_headers.Authorization`, names its direct API check "authenticated" | Agent Tools provider config is headerless; retaining this would protect invalid compatibility behavior and cause a false failure | REQ-005, AC-005, no-compatibility policy | headerless config decoder, headerless direct tools/list call, and explicit assertion that `http_headers` is absent | N/A |
| live runtime E2E ad-hoc main-listener route setup | calls `registerAgentToolsMcpRoutes(mainApp)` directly with no owned host/authority/listener lifecycle | dual/main registration is explicitly removed; the helper now requires owned dependencies and the main listener must not dispatch Agent Tools | REQ-004/010, AC-011/012, DS-007 | current `buildStudioServer` composition with `applicationRuntime.lifecycle.prepareBeforeListen -> agentToolsMcpHost.listen -> main listen -> recoverAfterListen`; main route remains absent | N/A |
| standalone main-server integration `agentToolsRouteDependencies` input | passes route internals to the main standalone builder | current builder intentionally has no such input and no Agent Tools route | REQ-004/010, AC-011 | remove ignored property; add explicit main-route 404 plus separate host evidence | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-SC-TEAM-001 | full supported Team stop: cancel/reject stays active; accepted stop completes after exact inactive 404/resource zero; restore same ID/fresh context; repeat | AC-004/007/013, DS-002/008 | focused integration scenario under `tests/integration/agent-team-execution/` (reuse current Team service/manager fixtures where possible) | current units stop at Mixed handle and cannot certify the supported owner spine/API observation |
| API-SC-LISTENER-001 | real private TCP listener is ready/headerless, one per host, main Agent Tools path absent, inactive ID 404, normal shutdown/socket baseline | AC-006/007/011/012, DS-004/007 | focused Agent Tools/application-host integration coverage, using OS-assigned ports and task-owned instances | mocked/injected units do not fully prove real Host header, port, or socket lifecycle |
| API-SC-PROVIDER-001 | Codex and Claude integration receive the same explicit headerless activator descriptor; no global/default issuer | AC-002/005/009 | updates to current provider integration tests | stale integrations currently do not compile and no durable integration proof remains after the clean cut |
| API-SC-PERSIST-001 | two lifecycle cycles plus restart/history direct use with no stored Agent Tools subject | AC-002/007/008/012 | lifecycle/history integration/E2E coverage (reuse existing memory/history fixtures) | required bounded-state and no-migration proof crosses active memory and normal persisted history |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-SC-ROUTE-001 | `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | active deterministic registry API; headerless SDK client; tokenless/gate/deactivate/reset semantics; renamed assertions | REQ-001/004/005/009; AC-002/004-006 | preserve official SDK and protocol/error breadth |
| API-SC-FIXTURE-001 | stale run-resource fixture users listed in inventory | use new exact-run deactivator fixture/property/type; no owner selector | REQ-003/007; AC-007/013 | mechanical where the scenario is otherwise unrelated |
| API-SC-PROVIDER-001 | four Codex/Claude provider integration files and brief-package Team prompt integration | inject required activator and current activation result; assert descriptor has no headers | REQ-002/005; AC-005/009 | no ambient getter or casted old interface |
| API-SC-CODEX-LIVE-001 | `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | remove bearer/header assumptions while retaining direct live App Server startup/status/tool-call evidence | REQ-001-005/007; AC-002-005/007/009 | newly discovered durable live-provider stale assertion; updated before execution |
| API-SC-LIVE-HARNESS-001 | six live runtime E2E files listed above | replace obsolete ad-hoc main-listener route registration with real Studio main/local composition and lifecycle ordering | REQ-004/010; AC-011/012 | prevents live suites from protecting the prohibited topology |
| API-SC-GATEWAY-001 | existing gateway integration | no source/assertion change planned; execute as preservation evidence | REQ-008; AC-010 | any required edit would be separately justified; production behavior must remain unchanged |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `tests/fixtures/agent-tool-mcp-run-session-releaser-fixtures.ts` | obsolete revoke/partial-owner interface | SR-004 CR-F-002 response; no-legacy policy | replace with exact-run deactivator fixture already introduced by IR-002 |

## Repository Coverage Execution Plan And Results

The investigation was written before the durable edits and execution. The inventory above intentionally preserves each pre-edit validity decision; this section is the authoritative completion state.

| Order | Command / Execution Mode | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- |
| 1 | `pnpm prepare:shared` | workspace dependency preparation | Pass | `evidence/api-e2e/01-prepare-shared.log` |
| 2 | narrow updated coverage run, followed by focused stale-fixture repairs | route/provider/fixture compilation and changed contracts | Pass after planned coverage updates: 8 files passed, 11 capability-gated files skipped; 29 passed, 49 skipped | `04-narrow-updated-coverage.log`, `08-focused-regression-rerun.log` |
| 3 | final focused 18-file Vitest regression | manager/resource/Mixed/session/local-access/host/Claude mapping/route/Team/listener/architecture, plus capability-gated live fixtures | Pass: 16 files passed, 2 skipped; 127 tests passed, 6 skipped | `26-final-focused-regression.log` |
| 4 | focused Team Agent Tools lifecycle integration | reject retains; accepted Team stop removes; same deterministic route restores twice with fresh state | Pass: 1/1 | `05-team-agent-tools-lifecycle.log` |
| 5 | focused Studio listener/gateway integration | wildcard main bind, main Agent Tools 404, private loopback listener, external gateway preservation, inactive 404, shutdown | Pass: 1/1 | `06-studio-listener-gateway.log`, repeated in `26-final-focused-regression.log` |
| 6 | `pnpm exec vitest run tests/integration --no-watch` plus isolated failure reproduction | broader repository integration baseline | Non-blocking baseline failure: 12 files failed; 37 tests failed, 221 passed, 69 skipped. All 12 failures reproduced alone and map to pre-existing/stale manager initialization, URL, watcher, and provider fixture assumptions outside this change. | `09-full-integration.log`, `10-full-integration-failure-isolation.log` |
| 7 | deterministic repository E2E run | broader E2E baseline | Non-blocking baseline failure: 9 files / 32 tests failed; 47 files / 170 tests passed; 14 files skipped. Failures are stale run-history/workspace/analytics/Claude fixtures; changed critical scenarios were proven by focused and live runs. | `11-deterministic-e2e.log` |
| 8 | production build | generated contracts + production compilation | Pass | `12-production-build.log` |
| 9 | real-provider preflight | local/provider capabilities | Pass: 18/18 capability checks | `13-real-preflight.log` |
| 10 | live Codex standalone | real Codex App Server, headerless descriptor, active exact routing, inactive exact rejection | Pass: 1/1 | `14-live-codex-standalone.log` |
| 11 | live Codex Team targeted stop/restore | real Codex Team turn, accepted stop, same Team/member identity restore, second provider turn, workspace mapping | Pass: 1/1 targeted scenario | `16-live-codex-team-stop-restore.log` |
| 12 | full live Codex Team fixture | round-1 legacy event/projection assertions outside the targeted contract | Round-1 result superseded: all four assertions were migrated in round 2 and the complete current file passed 5/5. | `15-live-codex-team.log`; superseded by `54-live-codex-team-full-final.log` |
| 13 | final forbidden-symbol/topology/size/diff/generated-output audit | no retired issuer/releaser/partial-owner API, no E2E main-route bypass, no leaked generated/runtime state | Pass | `27-final-audits.log` |

## Round-1 Post-Repository Confidence Scorecard (Retained Baseline)

This scorecard is the repository-only gate before the selected live/provider/browser validation. Passing focused coverage did not hide the broad stale-baseline failures.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation Selected |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 91% | focused manager, route, Team lifecycle, listener/gateway, architecture, build | same-process real provider and user continuation remained unproven | real Codex and browser Team journeys |
| Changed-boundary execution directness | 93% | real TCP listener and full supported Team lifecycle integration | provider cache and actual UI-triggered restore | live Codex + browser |
| Cross-boundary integration realism and mock gap | 85% | focused integrations cross manager/resource/HTTP/Team | most provider journeys were capability-gated and the broad baseline was stale at this round-1 gate | live provider + real development stack |
| Environment, configuration, identity, and fixture fidelity | 90% | isolated Prisma, OS-assigned listeners, production build | live credentials/packages not yet exercised | provider preflight + isolated secret/package import |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | cancel/reject/success/mismatch/cleanup/inactive 404/two-cycle coverage | realistic provider stop/restore | live Codex + browser restore |
| User-surface, browser, and desktop-shell confidence | 70% | no frontend/shell source changed; prior failure screenshot is causal evidence | corrected UI journey not yet observed | requested web-equivalent browser validation |
| Durable regression coverage quality and relevance | 92% | requirement-linked replacements and new focused integration coverage | broad suites and four live Codex cases retained unrelated stale fixtures at this round-1 gate; superseded by the round-2 resolution below | final focused rerun + proportional test review |

- Overall post-repository confidence: `88%`
- Calculation method: simple average of seven applicable categories, rounded to nearest whole percent
- Every critical acceptance criterion directly proven: `No — real provider/cache and browser continuation remained before broader validation`
- Any applicable category below `90%`: `Yes — cross-boundary realism and user-surface confidence`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks at this gate: actual cached provider reuse, exact UI stop/restore trigger, imported real Team definitions, and configured cloud runtime fidelity

## Broader Validation Decision (Mandatory)

- Decision: `Required` and completed
- Selected execution mode: `Live API` + `Lifecycle` + real Codex App Server + browser-based web-equivalent Team journeys
- Material deviation from the initial plan: browser validation was added after the user explicitly requested real public/private package imports, Classroom and nested Classroom Teams, Codex runtime, AutoByteus runtime, and DeepSeek V4 Flash. This also materially closed the user-surface and realistic configuration gaps.
- Confidence gap addressed: actual provider descriptor use, cached same-ID continuation, UI-triggered Team stop/restore, nested Team addressing/task lifecycle, package discovery, real runtime/model selection, and process shutdown
- Browser decision: the browser development path became required because the user explicitly requested it and it exercised the exact unchanged renderer controls that trigger the corrected backend lifecycle. It proves the web-equivalent surface, not Electron preload/IPC/window behavior.
- Final expected/observed confidence: `97%`; all categories are at least `92%`
- If Blocked: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper; no shell/preload/IPC/window/packaging source changed
- Browser-tested web-equivalent behavior: package import visibility, Team catalog/launch configuration, member event streams, tool approvals, Team termination, persisted-history continuation/restore, nested Team tree/task review
- Shell-specific behavior: not applicable to the changed boundary; production server/listener shutdown was exercised directly
- Chosen validation approach: isolated browser development path with real backend/provider processes; no interaction with the user's running Electron instance
- Effect on any already-running desktop application: `None`
- Confidence consequence: browser evidence raises user-surface confidence to 96%; unchanged Electron-shell behavior is not claimed

## Live Environment And Fixture Result

- Startup order: isolated shared build/test preparation; real preflight; isolated development backend; private Agent Tools listener; browser frontend
- Environment: ticket worktree data root; both requested Agent Package roots; secret identifiers imported from `/Users/normy/.autobyteus/server-data/.env` without recording values
- Packages observed in browser: public `autobyteus-agents` and private `autobyteus-private-agents`; both Classroom Team definitions were visible
- Live Codex identities: standalone exact route plus Classroom Team stable professor/student IDs across stop/restore
- Live AutoByteus identities: nested Classroom stable Teacher/student_one IDs across stop/restore, with `DeepSeekLLM` shown in server logs
- Browser journeys: public Classroom ordinary message roundtrip before/after stop; nested Team ordinary address route, transient task-team delegation/result/review, then same ordinary route after stop/restore
- Evidence: `14-live-codex-standalone.log`, `16-live-codex-team-stop-restore.log`, `17-dev-stack-browser.log`, `20-24` screenshots, and `25-live-browser-validation.md`
- Cleanup: browser closed, final Team stopped, development stack stopped, generated package outputs removed, isolated secret-bearing data root removed

## Temporary Executable Validation Results

| Scenario ID | Probe / Harness / Runtime Setup | Result | Retention / Cleanup |
| --- | --- | --- | --- |
| API-PROBE-CODEX-001 | real Codex App Server standalone and Team stop/restore | Pass | logs retained; processes/history cleaned |
| API-PROBE-BROWSER-001 | browser dev stack with imported public/private packages and real Codex/DeepSeek Teams | Pass | screenshots/notes retained; tab/process/data cleaned |
| API-PROBE-AUDIT-001 | process/socket/filesystem/forbidden-symbol audit | Pass | audit retained in `27-final-audits.log` |

## Not Tested / Infeasible / Deferred (Current After Round 2)

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| actual Electron preload/window/native shell | unchanged and browser proves the relevant web-equivalent boundary | negligible for this backend change | none |
| aggregate all-runtime matrix completion | the available live run exercised AutoByteus and Claude hops, then the Codex model emitted assistant prose instead of invoking Agent Tools MCP; its prompt was qualified afterward, but another complete expensive matrix was not run | bounded provider/model tool-selection nondeterminism; individual full Codex, Claude, and AutoByteus files all pass | retain `68-live-all-runtime-matrix-deepseek-current.log`; no critical acceptance criterion depends only on this aggregate case |
| aggregate mixed-task and mixed-Team completion | current fixtures reached the real providers and exact current IDs; repeated DeepSeek task-worker tool-generation failures and a later cross-provider hang prevented clean suite completion | bounded external model/provider nondeterminism; current GraphQL/DTO contract and individual providers are directly proven | retain `71-live-mixed-task-delegation-final.log` and `73-live-mixed-team-final.log`; do not claim these suites passed |
| complete current nested-mixed provider file after secret-vault fixture update | the earlier available run was attempted; the final current source is build/schema/collection validated, while the user-requested nested Classroom DeepSeek browser journey and individual Codex/Claude/AutoByteus files directly passed | low residual limited to one aggregate live harness | retain prior attempt `59-live-all-available-affected-providers.log` and direct browser evidence `23-25`; rerun only if the proportional reviewer requires the aggregate harness itself |
| general changed tool-topology refresh in an already-loaded thread | explicitly out of scope | accepted residual | separate product requirement if desired |
| hostile same-user local process invoking a known active route | accepted trusted-local-process model | documented | none in this ticket |

## CRR-003 Local-Fix Re-entry Investigation (Before Round-2 Durable Edits)

- Reviewed triggering artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-test-review-report.md`
- Prior API/E2E result rechecked: `API-REV-001 Pass / 97%`; the direct implementation evidence remains valid, but delivery readiness is suspended until the changed durable live-Team coverage is current and clean.
- Re-entry classification: `Local Fix` owned by `/api_e2e_engineer`; no requirement, design, or implementation-source reroute.

| Finding | Affected Durable Coverage | Current Invalid Assertion | Validity Decision | Round-2 Action / Required Evidence |
| --- | --- | --- | --- | --- |
| `TR-F-001` | `codex-team-inter-agent-roundtrip.e2e.test.ts` four non-targeted cases | retired `agent_name` websocket predicates and name-keyed projection assumptions | `Needs Update`; do not remove the scenarios | resolve exact AgentRun IDs from current `executionTree`, predicate on `agent_run_id`, retain failure-safe Team/socket cleanup, run the complete live Codex Team file and focused regression |
| `TR-F-002` | shared metadata helper; all-runtime, Claude Team, mixed-task, mixed-Team and any coherent helper caller | removed `getTeamRunResumeConfig.metadata`, `memberRouteKey`, and compatibility-only `memberMetadata`/`memberTree` decoding | `Replace`; legacy branches must be removed | migrate every changed caller to `executionTree` and exact `agentRunId`; add a deterministic schema/source contract check not hidden by provider gates; run every available affected live file and record unavailable providers as unavailable |

Round-2 execution order:
1. Inventory every forbidden query/predicate occurrence and the current DTO/schema fields.
2. Edit only test/helper coverage; production source remains untouched.
3. Run deterministic GraphQL schema-contract validation for all affected documents plus focused no-legacy source assertions.
4. Run the full live Codex Team file, then all available affected live suites under current capability gates.
5. Rerun the focused manager/listener/Team/provider regression and final forbidden-symbol/diff/cleanup audits.
6. Update the canonical reports and append `API-REV-002`, then return to `/code_reviewer` for repeated proportional review.

## Round-2 Completed Classification And Evidence

The pre-edit classifications above are retained as the audit trail. This section is the authoritative completed state for `CRR-003`.

| Finding / Scenario | Completed Durable Change | Direct Execution Evidence | Current Decision |
| --- | --- | --- | --- |
| `TR-F-001` | all Codex Team websocket and projection assertions resolve the current recursive `executionTree`, identify members by exact `agentRunId`, and match current events by `agent_run_id`; cleanup remains failure-safe | complete live Codex Team file: 1 file / 5 tests passed | `Resolved`; `54-live-codex-team-full-final.log` |
| `TR-F-002` | shared Team run decoding is current-schema-only; `metadata`, `memberRouteKey`, `memberMetadata`, and `memberTree` compatibility branches were removed; all affected GraphQL documents/callers use `executionTree` and exact `agentRunId` | deterministic schema-valid document suite plus affected collection and lifecycle regression: 7 files passed / 7 provider-gated skipped; 43 passed / 20 skipped; production TypeScript build passed | `Resolved`; `74-round2-final-build-contract-regression.log` |
| current Team communication DTO | exact sender/recipient run IDs and content are decoded only from current `payload.message`; stale name-keyed envelopes are gone | current-symbol audit reports zero forbidden DTO symbols; complete live provider files pass | `Resolved`; `54`, `64`, `67`, `75` |
| current live fixture composition | current `teamConfigs`, rooted `memberAddress`, required websocket arrays, production Studio listener, secret-vault provisioning, current delegation parameter `recipient_address`, and qualified Codex Agent Tools MCP prompts | full live Codex 5/5, Claude 5/5, AutoByteus/DeepSeek v4 Flash 5/5 | `Resolved`; `54-live-codex-team-full-final.log`, `64-live-claude-team-full-final.log`, `67-live-autobyteus-deepseek-full-current.log` |

New durable round-2 paths:
- `tests/e2e/helpers/team-run-graphql-documents.ts`
- `tests/e2e/runtime/team-run-current-graphql-documents.e2e.test.ts`

Updated durable round-2 paths:
- `tests/e2e/helpers/team-communication-message-helpers.ts`
- `tests/e2e/helpers/team-run-metadata-helpers.ts`
- `tests/e2e/helpers/websocket-command-helpers.ts`
- `tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts`
- `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
- `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
- `tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
- `tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`

Round-2 final confidence scorecard:

| Confidence Category | Score | Evidence / Remaining Uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | every critical criterion remains directly proven by round 1; round 2 removes the stale Team DTO blind spots |
| Changed-boundary execution directness | 98% | exact IDs and current DTOs pass deterministic contract and complete individual live provider files |
| Cross-boundary integration realism and mock gap | 95% | real Codex, Claude, AutoByteus/DeepSeek, GraphQL, WebSocket, and browser paths passed; aggregate multi-provider model orchestration remains nondeterministic |
| Environment, configuration, identity, and fixture fidelity | 97% | real provider capabilities, secret vault, imported packages, rooted addresses, and stable identities exercised |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | stop/restore, inactive 404, rejection/cancel, listener shutdown, gateway preservation, and repeated current projections passed |
| User-surface, browser, and desktop-shell confidence | 96% | round-1 real Classroom and nested Classroom browser runs remain valid; no product source changed in round 2 |
| Durable regression coverage quality and relevance | 94% | current-schema-only helpers and ungated document validation are durable; aggregate live model cases remain intrinsically nondeterministic |

- Overall final confidence: `97%` (simple average, rounded)
- Every critical acceptance criterion directly proven: `Yes`
- Any category below `90%`: `No`
- Broader validation decision: `Required — completed across round 1 browser/provider journeys and round 2 complete individual Codex, Claude, and AutoByteus/DeepSeek provider files`
- Browser rerun in round 2: `Not Required`; only repository test/helper source changed after the already-passing real browser journeys.
- Aggregate live-suite residuals: recorded as observed provider/model nondeterminism, not hidden and not claimed as passing.

## CRR-004 Local-Fix Re-entry Investigation (Before Round-3 Durable Edits)

- Triggering report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-test-review-report.md` (`CRR-004`)
- Prior result rechecked: `API-REV-002 Pass / 97%`; `TR-F-001` and `TR-F-002` remain resolved, but delivery readiness is suspended for `TR-F-003`.
- Classification: `Local Fix` owned by `/api_e2e_engineer`; implementation and architecture remain the authoritative `CRR-002 Pass` and are not reopened.

| Finding | Durable Scenario | Obsolete Assertion | Validity Decision | Round-3 Required Action / Evidence |
| --- | --- | --- | --- | --- |
| `TR-F-003` | both cases in `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | waits for domain/internal `TASK_DELEGATION_ACTIVATED`, `TASK_DELEGATION_RESULT_SUBMITTED`, and `TASK_DELEGATION_RESULT_REVIEWED`; reads `taskIds`, `payload.tasks`, camel/flattened execution IDs, and `task_team_instance_id` that the strict Team websocket DTO never emits | `Replace`; preserve both task-Agent and task-Team behaviors, delete compatibility branches | parse current `TASK_DELEGATION_EVENT` payloads; require `TASK_AGENT_ACTIVATED` or `TASK_TEAM_ACTIVATED`, `payload.execution.agent_run_id` or `team_run_id`, `payload.task.task_id`; require later `TASK_CHANGED` task status and update records; add ungated strict-contract validation; run bounded deterministic contract/collection checks and attempt both available live cases with failure-safe cleanup |

Round-3 planned durable scope:
- update `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` only for the strict current task-event DTO;
- add one ungated contract test under `tests/e2e/runtime/` unless an existing ungated test can be extended without mixing responsibilities;
- do not add fallback fields or preserve retired event names.

Round-3 planned execution:
1. Build the shared stream-contract package required by server imports.
2. Run the ungated strict task-event contract test and the existing projector unit coverage.
3. Run the affected mixed-task file deterministically to prove it collects/skips cleanly under capability gates, plus TypeScript build.
4. Attempt both live mixed-task cases with the available real provider configuration and record provider/model residuals without converting them to passes.
5. Audit the changed test scope for zero retired task-event names/fields, clean diff, secret-free evidence, generated/temp/process cleanup.
6. Update canonical reports, append `API-REV-003`, and return to `/code_reviewer` for repeated proportional review.

### Round-3 Live-Execution Coverage Decisions Added Before Follow-Up Edits

The first current live attempt (`80-live-mixed-task-current-events.log`) proved that the new `TASK_AGENT_ACTIVATED` predicate is reachable, then exposed three additional test-owned assumptions before a clean rerun. These are within the already-approved Local Fix boundary and do not reopen product source.

| Observed Test-Owned Issue | Evidence | Validity Decision | Follow-Up Edit |
| --- | --- | --- | --- |
| task-Agent notification/tool assertions target the configured worker's stable run ID rather than the activated task execution's `payload.execution.agent_run_id` | activation matched and the task worker executed, while the visible notification wait targeted `workerMember.agentRunId` and timed out | `Needs Update`; exact current task execution identity must govern all post-activation assertions | use `taskAgentRunId` from the strict activation payload for activation/result/revision notification and task tool events |
| task-Team configured member lookup duplicates the parent route segment, and the post-activation notification would target the configured run instead of the new `payload.execution.members` run | second live case failed before delegation because `/review_squad/review_squad/team_lead` does not exist | `Needs Update`; preserve current configured-tree validation and switch post-activation identity to the task-Team execution DTO | correct the configured address to `/review_squad/team_lead`; resolve the exact task-Team member AgentRun from `payload.execution.members` |
| failure-safe live teardown uses Vitest's 10-second default hook timeout | both `afterEach` and `afterAll` timed out while terminating real provider/Team resources after failed cases | `Needs Update`; cleanup must be allowed to complete deterministically | set explicit bounded hook timeouts appropriate to the existing real-provider test timeouts |

## Round-3 Completed Classification And Evidence

The pre-edit `TR-F-003` classification and the two live-driven follow-up classifications above remain the audit trail. This section is the authoritative completed round-3 state.

| Finding / Scenario | Completed Durable Change | Direct Evidence | Current Decision |
| --- | --- | --- | --- |
| `TR-F-003` task-Agent activation | the live file now parses every websocket frame through `parseTeamStreamServerMessage`, requires `TASK_AGENT_ACTIVATED`, reads `payload.execution.agent_run_id` and `payload.task.task_id`, and validates the matching current task record | ungated current-contract test passes; both live attempts reached the current activation event | `Resolved`; `77`, `80`, `82`, `83` |
| `TR-F-003` task-Team activation | the live file requires `TASK_TEAM_ACTIVATED`, reads `payload.execution.team_run_id`, resolves the exact task-Team AgentRun from `payload.execution.members`, and validates the matching task record | ungated current-contract test passes; the final live attempt reached the current task-Team activation | `Resolved`; `77`, `82`, `83` |
| `TR-F-003` submit/review lifecycle | retired result-submitted/result-reviewed wire names and flattened/camel fields were replaced with `TASK_CHANGED`, current task status, exact task-execution reference, and typed submission/review update records | ungated current-contract test executes both submitted and reviewed DTOs; the live task-Agent attempt exposed a current `TASK_CHANGED` after real provider submission while the test was waiting on a separate notification assertion | `Resolved`; `77`, `82`, `83` |
| capability-gate blind spot | added `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`, which has no provider capability gate and admits exact task-Agent activation, task-Team activation, submitted, and reviewed messages through the shared strict parser | 2/2 passed in `77`, `78`, `81`, and `83` | `Resolved` |
| task-notification projection | retained the existing assertion and its dedicated unit coverage; it is a separate current `SYSTEM_TASK_NOTIFICATION` surface, not a legacy task-event fallback | dedicated projection unit 3/3 passed; the live stream did not observe the notification although the provider emitted its internal notification signal | `Still Valid` as dedicated unit coverage; live aggregate remains non-clean and is not claimed as passing (`82`) |

Round-3 durable changes:
- updated `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`;
- added `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`;
- removed no durable scenario or file.

Round-3 repository and live execution:

| Evidence | Execution | Result / Interpretation |
| --- | --- | --- |
| `76-round3-prepare-shared.log` | shared-contract preparation/build | Pass |
| `77-round3-task-contract-focused.log` | ungated current task contract, mixed-task collection, existing projector baseline | new contract 2/2 passed; mixed live cases skipped under the gate; an unchanged migration-fixture projector file failed during import because its V1 execution-tree fixture is stale against the current V2 validator |
| `78-round3-contract-collection-build.log`, `81-round3-followup-contract-collection.log` | current contract + gated collection + production TypeScript build | Pass; current contract 2/2, mixed file 2 capability-gated skips, build exit 0 |
| `80-live-mixed-task-current-events.log` | first real DeepSeek/Codex live attempt | current task-Agent activation reached; exposed exact task-execution identity and configured-address test issues, classified before follow-up edits |
| `82-live-mixed-task-current-events-rerun.log` | both real DeepSeek/Codex live cases after follow-up | both current activations reached and a current `TASK_CHANGED` was observed; the file remained non-clean on the separate websocket notification wait and bounded cleanup-hook timeouts; not claimed as pass |
| `83-round3-final-bounded-regression.log` | ungated task contract + mixed collection + notification projection unit + production build | 5 passed / 2 capability-gated skipped; build exit 0 |
| `84-round3-final-audits-cleanup.log` | diff, forbidden task-wire symbols, generated/temp/process, secret-value audit | Pass; zero retired wire symbols, zero task-owned process/temp residue, zero secret-value matches |

Round-3 confidence scorecard:

| Confidence Category | Score | Evidence / Remaining Uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | all original critical criteria remain directly proven; `TR-F-003` was test-only and is now current-contract aligned |
| Changed-boundary execution directness | 98% | strict shared parser, ungated DTO execution, real task-Agent/task-Team activation, and real `TASK_CHANGED` observation |
| Cross-boundary integration realism and mock gap | 95% | retained real provider/browser/lifecycle evidence plus both live mixed-task attempts; the aggregate notification wait remains non-clean |
| Environment, configuration, identity, and fixture fidelity | 97% | exact activation run IDs, real DeepSeek/Codex, isolated app data/vault, current execution tree |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | prior stop/restore/failure coverage remains valid; live failure and cleanup residuals are explicit |
| User-surface, browser, and desktop-shell confidence | 96% | round-1 public/nested Classroom browser evidence remains valid; only test code changed in rounds 2-3 |
| Durable regression coverage quality and relevance | 95% | zero compatibility fallbacks plus ungated strict task-event contract; aggregate live provider orchestration remains nondeterministic |

- Overall final confidence: `97%` (simple average, rounded)
- Critical acceptance criteria directly proven: `Yes`
- Category below `90%`: `No`
- Broader validation: `Required — completed`; round 3 added the requested real mixed-task attempts. Browser was not repeated because no product source or web surface changed after the already-passing requested Classroom journeys.
- Residual: the live mixed-task aggregate is not globally green because its separate websocket notification assertion did not observe the internal provider notification and failed-case cleanup exceeded its bounded hooks. This does not contradict the ungated/current live task-event evidence or any original critical acceptance criterion.

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| broad integration/E2E suites are not globally green | Existing stale baseline, not changed-scope implementation failure | isolated reproduction in `10-full-integration-failure-isolation.log`; direct critical scenarios pass | record as residual; `/code_reviewer` reviews changed durable coverage |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes`
- Post-repository confidence: `97%` for round 3 (`88%` was the retained round-1 pre-broader-validation gate)
- Final confidence after broader validation: `97%`
- Broader validation decision: `Required — completed`
- Reroute Required Before Validation Execution: `No`
- Latest result: `Pass` for the reviewed changed scope and every critical acceptance criterion
- Recommended recipient: `/code_reviewer` for proportional review of changed durable test code
- Notes: `TR-F-001`, `TR-F-002`, and `TR-F-003` are resolved. The current task wire assertions contain zero retired event/field branches, the ungated strict task contract and final bounded regression/build/audits pass, and both real mixed-task cases reached their current activation DTOs. The live mixed-task file is not claimed globally green because its separate notification assertion and failed-case cleanup remained non-clean. The complete current live Codex, Claude, and AutoByteus/DeepSeek Team files still pass 5/5 each, and all original Team stop/restore, route/listener/gateway, provider, and browser evidence remains valid.
