# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- Current Investigation Round: 4
- Trigger: Code review round 6 pass after implementation local fix for mixed AutoByteus+Codex restore metadata-root failure; resume final API/E2E sign-off for all active runtime communication.
- Prior Investigation Reviewed: Round 2 in this file plus `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`; requirement-gap and design-correction artifacts `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirement-gap-runtime-communication-matrix-response.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/codex-mcp-materializer-design-correction.md`.
- Latest Authoritative Investigation: Round 4 in this file, updated after the local-fix recheck before final handoff.

## Current Requirement And Design Basis

The current accepted scope is not Claude-only. Active runtime kinds in this branch are `autobyteus`, `codex_app_server`, and `claude_agent_sdk`, and delivery requires E2E evidence for the all-active-runtime `send_message_to` teammate communication matrix.

Current runtime entry adapters are:

- AutoByteus native: local `AutoByteusSendMessageToTool` into `SendMessageToDispatcher`.
- Codex App Server: thread-scoped `config.mcp_servers.autobyteus_agent_tools` generated from a private `AgentToolMcpDescriptor`, then Codex app-server calls `/mcp/agent-tools/:sessionId`; Codex dynamic `send_message_to` is removed and must not be used as fallback.
- Claude Agent SDK: programmatic SDK HTTP MCP server config `autobyteus_agent_tools` and allowed tool `mcp__autobyteus_agent_tools__send_message_to`; the old `autobyteus_team` `send_message_to` path remains deleted.

All runtime entries must converge on the shared `SendMessageToDispatcher` / team delivery spine. Matrix rows must prove sender tool execution through the sender runtime adapter, canonical application-facing `send_message_to` lifecycle where emitted, team communication projection, recipient runtime input acceptance, no old Claude provider wire-name, no Codex dynamic fallback marker, and no Agent Tools MCP bearer/header/descriptor leak. Memory/raw traces are required where recordable and contractual, especially for route-backed external sender rows.

The implementation handoff Legacy / Compatibility Removal Check is clean: no old Claude send-message path, no Codex dynamic `send_message_to` fallback, no process-level or file-backed Codex bearer config, no persisted descriptors, and no route-side raw-trace writer. Code review round 5 passed with no blocking findings after fixing Codex event-payload provider/secret leakage.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Claude Agent SDK `send_message_to` via Agent Tools MCP | Changed | REQ/DS Claude materializer sections, AC-RMCP-001..015 | Existing Claude live E2E remains valid and should be rerun or recorded from prior pass; no old `mcp__autobyteus_team__send_message_to` expectation. |
| Codex App Server `send_message_to` via thread-scoped Agent Tools MCP config | Changed | Codex MCP materializer correction, DS-RMCP-006/007, AC-RMCP-024..029 | Existing Codex send-message E2Es need route-backed runtime server setup before Codex bootstrap; dynamic-tool wording/assertions are stale. |
| Codex dynamic `send_message_to` registration/spec builder | Removed | Requirements recommendations, implementation handoff, code review static scans | Any durable E2E that depends on Codex dynamic send-message must be updated. Non-send-message dynamic tools remain valid. |
| AutoByteus native `send_message_to` local wrapper | Preserved | Requirement matrix response and DS-RMCP-011 | Existing AutoByteus same-runtime E2E remains valid, gated by `RUN_LMSTUDIO_E2E=1`. |
| All-active-runtime matrix | Added acceptance coverage | REQ API/E2E refinement, DS-RMCP-011, AC-RMCP-017..023 | Add focused durable E2E for missing mixed rows; map existing same-runtime and AutoByteus/Codex rows. |
| Agent Tools MCP descriptor/bearer/no-leak requirement | Preserved and extended to Codex | Requirements, code-review round 5 | Durable and executable checks must reject `autobyteus_agent_tools`, `mcp__autobyteus_agent_tools__send_message_to`, `Authorization`, `Bearer`, and `http_headers` from app-facing event payloads where relevant. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` / `routes send_message_to between real AutoByteus team members and projects reference files` | AutoByteus -> AutoByteus live team delivery and communication projection | AC-RMCP-018; DS-RMCP-011 | Still Valid | AutoByteus remains local wrapper; test is gated by `RUN_LMSTUDIO_E2E=1` and does not require HTTP MCP route. | Execute when LM Studio environment is available; default compile/skip always. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` / roundtrip scenario | Codex -> Codex live send-message, canonical lifecycle, memory traces | AC-RMCP-019/022/024..028 | Needs Update | Codex now creates `config.mcp_servers.autobyteus_agent_tools` during bootstrap; current E2E starts only websocket routes and still contains dynamic-tool wording. | Update to start `registerAgentToolsMcpRoutes(...)`, seed `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` before Codex run bootstrap, and preserve canonical/no-leak assertions. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` / roundtrip scenario | Claude -> Claude live route-backed send-message, canonical lifecycle, MCP content result, memory traces, provider-name leak guard | AC-RMCP-020/022 | Still Valid | Prior API/E2E round passed live after updating optional `message_type`; route-backed test server exists. | Execute targeted live row if Claude env available; include default compile/skip. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | AutoByteus -> Codex and Codex -> AutoByteus before/after restore | AC-RMCP-021/022/029 | Needs Update | Scenario is still required but Codex sender/recipient run bootstrap now needs Agent Tools MCP route and internal base URL before create/restore; current file only registers websocket route after run creation. | Update route-backed runtime server setup before create/restore; execute when LM Studio + Codex env available. |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Nested AutoByteus -> Codex and Codex -> Claude partial evidence | AC-RMCP-021/022 | Needs Update / Partial | Topology is useful but not sufficient for direct matrix; Codex/Claude route-backed MCP needs server setup. | Update route setup for current runtime contract; do not rely on it as sole matrix proof. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Codex exact `target_agent_run_id` delivery and inactive target failure | AC-RMCP-023 and Codex sender contract | Needs Update | Codex sender now needs thread-scoped Agent Tools MCP route at run bootstrap; current file starts only websocket routes. | Update route setup before standalone Codex run creation; execute when Codex env available. |
| Unit Codex materializer/bootstrap/thread-manager/event/history tests under `tests/unit/agent-execution/backends/codex/**` | Descriptor -> thread config, dynamic send-message removal, no-leak event payloads, canonical event/history | AC-RMCP-024..029 | Still Valid | Code review round 5 executed focused Codex suite; no blocking findings. | Re-run focused Codex suite as executable evidence. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` and session-service tests | MCP initialize/list/call/content negotiation, bearer/session denial, expiry/revoke | AC-RMCP-008/023/028/029 | Still Valid | Prior API/E2E and code review evidence; route remains central to Claude and Codex. | Re-run focused route/session coverage as available. |
| Missing direct top-level Claude -> Codex, Codex -> Claude, Claude -> AutoByteus, AutoByteus -> Claude | No existing direct same-team proof | AC-RMCP-021/022 | Add Durable Coverage | Gap was raised by user and accepted by solution design. | Add focused all-runtime matrix E2E gated by all three live flags. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `codex-team-inter-agent-roundtrip.e2e.test.ts` comments/setup that say team routing safety comes from dynamic `send_message_to` handlers | Codex team send-message is dynamic-tool based | Codex sender must now use Agent Tools MCP; dynamic fallback removed | Codex MCP materializer correction and implementation handoff | Update comments/setup to route-backed MCP server setup | N/A |
| Codex/mixed/standalone E2E route setup that starts only websocket routes before Codex send-message execution | Codex sender can execute without `/mcp/agent-tools/:sessionId` | Route-backed Codex materializer needs reachable MCP endpoint and internal base URL | DS-RMCP-006/007; source `AgentToolMcpSessionService` | Update E2E server setup | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-MATRIX-001 | Direct top-level AutoByteus -> Claude, Claude -> AutoByteus, Codex -> Claude, Claude -> Codex, AutoByteus -> Codex, and Codex -> AutoByteus mixed-runtime delivery in one three-member team | AC-RMCP-021/022; DS-RMCP-011; requirement-gap response | `autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Existing durable files do not directly prove all mixed pairs, especially Claude↔AutoByteus and Claude↔Codex. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-CODEX-001 | `codex-team-inter-agent-roundtrip.e2e.test.ts` send-message scenarios | Register Agent Tools MCP routes and seed internal server base URL before Codex run bootstrap; remove stale dynamic-handler wording | AC-RMCP-019/022/024..028 | Needed for Codex same-runtime proof under new route-backed contract. |
| E2E-MIXED-001 | `mixed-team-runtime-graphql.e2e.test.ts` | Register Agent Tools MCP routes and seed internal server base URL before create/restore; keep server alive through restore | AC-RMCP-021/022/029 | Needed for AutoByteus↔Codex rows after Codex cutover. |
| E2E-NESTED-001 | `nested-mixed-team-runtime-graphql.e2e.test.ts` | Register Agent Tools MCP routes and seed internal server base URL before create/restore | AC-RMCP-021/022 | Keeps partial nested coverage current; not the sole matrix proof. |
| E2E-CODEX-DIRECT-001 | `codex-standalone-send-message-global-routing.e2e.test.ts` | Register Agent Tools MCP routes and seed internal server base URL before Codex sender bootstrap | AC-RMCP-023 | Needed for exact-run failure-path proof after Codex cutover. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| ENV-001 | `node --version`, `pnpm --version`, `sw_vers`, `codex --version`, `claude --version`, and live env flag inspection | Records platform/runtime availability | Environment evidence only. |
| SCAN-001 | Static `rg` scans over `src`/`tests` for deleted provider names, dynamic Codex send-message builders, raw descriptor/bearer/log surfaces | Confirms no obsolete production fallback or obvious leak surface | Static executable audit, not durable product coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live rows requiring unavailable LM Studio/Codex/Claude environment | Unknown until execution; tests are environment-gated | Cannot claim all-runtime proof for unavailable rows | Execution report must list executed vs unavailable rows. If installed runtime cannot honor approved thread-scoped config, route to `solution_designer`; do not fall back to process/file config. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Installed Codex app-server rejects thread-scoped `config.mcp_servers` despite design probe | Design Impact | Would contradict Codex MCP materializer correction | `solution_designer` |
| Live all-runtime matrix exposes implementation bug in route-backed setup/canonicalization/projection | Local Fix | Runtime/E2E failure after current coverage is valid | `implementation_engineer` |
| Credentials or local model runtime unavailable | Blocked/Not Tested (environment) | E2E gate not executable locally | Record in execution report; do not claim proof for unavailable rows. |

## Execution Plan

1. Apply durable E2E updates described above before final execution.
2. Run default-gated compile/skip coverage for all touched live E2E files.
3. Run focused Codex Agent Tools MCP/unit coverage and Agent Tools MCP route/session coverage.
4. Run live same-runtime and mixed-runtime E2Es whose environment gates are available: AutoByteus same-runtime, Codex same-runtime, Claude same-runtime, AutoByteus↔Codex, all-runtime matrix, nested mixed partial, and Codex standalone direct failure path.
5. Run build, `git diff --check`, and static leak/fallback scans.
6. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md` with executed/unavailable rows and failure classification.
7. Because repository-resident durable E2E coverage will be added/updated in this API/E2E round, route back to `code_reviewer` after execution rather than directly to delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The user requirement is accepted in upstream artifacts. Current coverage is incomplete without new direct mixed-runtime rows and existing Codex live E2Es require route-backed MCP server setup updates after the Codex cutover.

## Round 3 Execution Addendum: Mixed Restore Local Fix Required

This addendum keeps the coverage investigation current after live execution of the Round 3 plan.

### Decision Updates

| Scenario ID | Path / Scenario | Prior Decision | Updated Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| E2E-MATRIX-001 | `autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Add Durable Coverage | Added / Valid | Live matrix passed with `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1`, proving all six directed mixed-runtime rows in one top-level team. | Keep durable coverage; route through code review after implementation local fix. |
| E2E-MIXED-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` restore scenario | Needs Update | Still Valid; Local Fix required | After route-backed setup update, live AutoByteus -> Codex and Codex -> AutoByteus pre-restore delivery/projection succeeded, but `restoreAgentTeamRun` failed with `metadata is missing`. Temporary diagnostic evidence showed `TeamRunService` using a default-root `TeamRunMetadataService` while the catalog used the test memory root. | Do not remove or weaken coverage. Route to `implementation_engineer` to make metadata service/restore memory-root-safe. |

### Reroute Classification

- Classification: `Local Fix`
- Recommended Recipient: `implementation_engineer`
- Rationale: The failing restore scenario is explicitly in the reviewed design/acceptance criteria and the coverage assertion is valid. The failure is an implementation memory-root/singleton issue exposed by the updated route-backed Codex E2E setup, not obsolete coverage and not a requirement ambiguity.
- Supporting reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-local-fix-mixed-restore-metadata.md`

## Round 4 Execution Addendum: Mixed Restore Resolved And Final Coverage Route

This addendum keeps the coverage investigation current after code-review round 6 and final API/E2E re-execution.

### Decision Updates

| Scenario ID | Path / Scenario | Prior Decision | Updated Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| E2E-MATRIX-001 | `autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Added / Valid | Still Valid / Passing | Re-ran with `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1`; all six directed mixed-runtime rows passed in one top-level AutoByteus+Codex+Claude team. | Keep durable coverage and route through code review because it was added during API/E2E. |
| E2E-MIXED-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` restore scenario | Still Valid; Local Fix required | Still Valid / Passing | After code-review round 6 local fix, re-ran with `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1`; pre-restore and post-restore AutoByteus <-> Codex delivery/projection passed. | Keep restore/rematerialization coverage; no further reroute required. |
| E2E-AUTOBYTEUS-001 | `autobyteus-team-runtime-graphql.e2e.test.ts` same-runtime communication | Still Valid | Still Valid / Passing | Re-ran with `RUN_LMSTUDIO_E2E=1`; native AutoByteus send-message row passed. | Keep existing coverage. |
| E2E-CODEX-001 | `codex-team-inter-agent-roundtrip.e2e.test.ts` same-runtime communication | Needs Update | Updated / Passing | Re-ran with `RUN_CODEX_E2E=1`; Codex route-backed Agent Tools MCP send-message row passed. | Keep updated coverage and route through code review. |
| E2E-CLAUDE-001 | `claude-team-inter-agent-roundtrip.e2e.test.ts` same-runtime communication | Still Valid | Still Valid / Passing | Re-ran with `RUN_CLAUDE_E2E=1`; Claude Agent SDK Agent Tools MCP send-message row passed. | Keep existing updated coverage. |

### Final Investigation Classification

- Proceed To API/E2E Execution: `Complete`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added/updated durable E2E coverage remains in the repository.
- Reroute Required Before Delivery: `Yes`
- Recommended Recipient: `code_reviewer`
- Rationale: API/E2E passed, but repository-resident durable coverage was added/updated after the initial code review, so the cumulative package must return through code review before delivery.
- Open Local Fix / Design Impact / Requirement Gap: `None`
