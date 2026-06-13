# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Refreshed code-review round 2 pass after the design-impact memory/run-history fix and coverage-code re-review; updated during round 2 after the first live recheck exposed a stale optional `message_type` assertion in the durable E2E.
- Prior Investigation Reviewed: Round 1 in this file plus `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`; upstream done-ticket artifacts under `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/` remain lineage.
- Latest Authoritative Investigation: Round 2 in this file, updated before the new durable E2E assertion edit.

## Current Requirement And Design Basis

The current reviewed behavior remains a clean-cut Claude Agent SDK materializer for the server-hosted `autobyteus_agent_tools` MCP server. When and only when `send_message_to` is configured for a Claude runtime session, `ClaudeSession` must create or reuse a live in-memory `AgentToolMcpDescriptor`, pass the descriptor as a Claude SDK HTTP MCP server config, and allow `mcp__autobyteus_agent_tools__send_message_to`. Claude must no longer expose `send_message_to` through the in-process `autobyteus_team` MCP server; `autobyteus_team` remains task-delegation-only.

Round 2 adds the design-impact memory/run-history basis: route-backed Claude `send_message_to` must persist `tool_call` and `tool_result` raw traces only through canonical AgentRun lifecycle events and `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator`. Executable non-AutoByteus mixed-team members must receive concrete `memoryDir` values from upstream owners before AgentRun creation; `MixedAgentMemberHandle` may fail fast but must not derive a fallback. Memory readback through `getTeamMemberRunMemoryView(... includeRawTraces: true ...)` must read the same configured app memory root used by the writer.

The implementation handoff's Legacy / Compatibility Removal Check and code-review round 2 are clean: no backward-compatibility mechanism was introduced, no old behavior is intentionally retained in production, obsolete Claude handler/definition/unit-test paths were removed, the rejected member-handle memoryDir fallback is not present, and the durable E2E result expectation now requires the MCP text-content result shape rather than old `{ accepted: true }` handler semantics.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Claude Agent SDK receives `autobyteus_agent_tools` HTTP MCP config from `AgentToolMcpDescriptor` when `send_message_to` is configured | Added | REQ-RMCP-001/003/012, AC-RMCP-001/004/005, DS-RMCP-001/003, implementation handoff | Retain and execute materializer/session/SDK-option coverage and real Claude E2E; no raw descriptor should appear outside private runtime config. |
| Claude allowed tool name for server-hosted send-message | Changed | REQ-RMCP-004, AC-RMCP-002, DS-RMCP-004 | Durable assertions must use `mcp__autobyteus_agent_tools__send_message_to`; no current coverage should expect production use of `mcp__autobyteus_team__send_message_to`. |
| Claude `autobyteus_team` in-process MCP server | Changed / Removed old responsibility | REQ-RMCP-005/006/011, AC-RMCP-003/007/009, design Legacy Removal Policy | Existing unit coverage for task delegation remains valid; old handler/definition/unit-test coverage stays deleted. |
| Claude event/history/memory canonicalization | Changed | REQ-RMCP-007/008/009/018, AC-RMCP-006/014, DS-RMCP-004/007 | Tests must prove raw provider MCP names normalize to canonical `send_message_to`, are not suppressed, persist as memory traces, and preserve MCP content result shape. |
| Agent Tools MCP route/session/content negotiation/bearer/session-denial behavior | Preserved from upstream base branch | Upstream `streamable-mcp-runtime-tools` coverage; AC-RMCP-008 | Existing route integration coverage is still valid and should be rerun as the route-backed transport proof. |
| Mixed-team member runtime-memory invariant | Added / tightened | REQ-RMCP-013..019, AC-RMCP-011..016, DS-RMCP-007/008, design review round 2 | Execute memory/mixed-team invariant suites plus live E2E memory readback. |
| Live Claude E2E harness and route-backed result expectation | Updated before this round and re-reviewed by code review round 2; optional `message_type` assertion needs a round-2 coverage update | Prior API/E2E round, implementation handoff, code-review round 2, round-2 live failure evidence | Keep route/result/provider leak assertions, but do not require the optional `message_type` field in live model tool arguments or raw traces. |
| Browser/media/publish-artifacts/task-delegation Claude MCP surfaces | Preserved except `send_message_to` removal from `autobyteus_team` | UC-RMCP-003/006, REQ-RMCP-011, AC-RMCP-009 | Keep existing focused unit coverage; no durable Agent Tools MCP coverage for these deferred tool families. |
| Codex App Server, Claude Code CLI, Antigravity materializers | Preserved out of scope / deferred | Requirements Out of Scope and DS-RMCP-006 | Do not add coverage for these runtime materializers in this ticket. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Descriptor maps to `{ autobyteus_agent_tools: { type: "http", url, headers } }`; enabled tools are not copied into SDK config; allowed tool helper is `mcp__autobyteus_agent_tools__send_message_to` | REQ-RMCP-003/004/009/012, AC-RMCP-001/002 | Still Valid | Static inspection and code review round 2 match current design. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Configured/unconfigured gates, standalone/member sender context, descriptor expiry refresh, new allowed tool | REQ-RMCP-001/002/004/005/009/010/012, AC-RMCP-002/004/005 | Still Valid | Covers the core Claude-session materializer and descriptor refresh requirements. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Merges Agent Tools MCP separately; throws if send-message enabled without descriptor; `autobyteus_team` remains task-only; duplicate server names reject | REQ-RMCP-003/005/011/012, AC-RMCP-003/009 | Still Valid | Matches DS-RMCP-003 and no-compatibility cutover. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts` | Builds task-delegation tools only under `autobyteus_team` and omits send-message | REQ-RMCP-005/006/011, AC-RMCP-003/007/009 | Still Valid | Confirms old in-process send-message path is not retained. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Remote MCP `tool_use`/`tool_result` lifecycle for `mcp__autobyteus_agent_tools__send_message_to` emits generic lifecycle and is later canonicalized | REQ-RMCP-007/008/018, AC-RMCP-006/014 | Still Valid | Old duplicate suppression is removed; unit fixtures use the new provider wire name. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Converts Agent Tools MCP send-message provider name to canonical `send_message_to` for segment and lifecycle events | REQ-RMCP-007/008/009/018, AC-RMCP-006/014 | Still Valid | Directly covers application-facing event normalization. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Claude SDK client passes `mcpServers`, `allowedTools`, permission settings, and environment options through query options | REQ-RMCP-003/004, AC-RMCP-001/002 | Still Valid | Validates the SDK wrapper does not strip programmatic HTTP MCP config. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` and `claude-session-manager.test.ts` | Session construction receives Agent Tools MCP session service and preserves runtime dependencies | REQ-RMCP-001/002/010, AC-RMCP-004/005 | Still Valid | Relevant to live descriptor ownership and code-review round 2 passed it. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Descriptor/redaction/token hash, configured supported tools, expiry/revoke/owner-revoke, executor delegates `send_message_to` to shared dispatcher | REQ-RMCP-001/002/009/010, AC-RMCP-008 | Still Valid | Base Agent Tools MCP session/executor coverage remains the server-side transport contract for Claude materializer. | Run in focused final test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Fastify route and official MCP SDK loopback cover initialize, tools/list, tools/call, content negotiation, bearer/session denial, malformed JSON and invalid params | AC-RMCP-008 plus upstream `streamable-mcp-runtime-tools` requirements | Still Valid | Route is the concrete HTTP MCP endpoint Claude SDK consumes. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | Recordable non-AutoByteus executable members missing `memoryDir` fail fast; supplied `memoryDir` passes through without fallback derivation | REQ-RMCP-014/016/017/019, AC-RMCP-011/012/016, DS-RMCP-008 | Still Valid | Added by implementation after design-impact rework and re-reviewed by code review round 2. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts` | Fresh mixed-team runtime identity materialization provides standard member `memoryDir` before handle creation | REQ-RMCP-014, AC-RMCP-011, DS-RMCP-008 | Still Valid | Named upstream owner for fresh member memoryDir. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts` | Restore-time member config reconstruction derives member `memoryDir` from metadata and current memory root | REQ-RMCP-014, AC-RMCP-011, DS-RMCP-008 | Still Valid | Named restore owner for member memoryDir. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | Task-agent activation/recovery config derives task-agent memoryDir using `AgentMemoryLocationService.getTaskAgentLocation(...)` | REQ-RMCP-015, AC-RMCP-012/013, DS-RMCP-008 | Still Valid | Named task-agent owner for memoryDir. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-location-service.test.ts` | Explicit-memory-root readback uses the same root-backed topology reader and derives team/task memory locations correctly | REQ-RMCP-019, AC-RMCP-015, DS-RMCP-007/008 | Still Valid | Addresses the stale app-memory-root alternative from LIVE-CLAUDE-001 without broad singleton rebinding. | Run in focused final test set. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-run-memory-recorder.test.ts` and `runtime-memory-event-accumulator.test.ts` | Canonical `send_message_to` AgentRun lifecycle events write `tool_call` and `tool_result` raw traces, preserving MCP content result shape | REQ-RMCP-013/017/018, AC-RMCP-013/014, DS-RMCP-007 | Still Valid | Proves persistence remains canonical-event-only and not route-side. | Run in focused final test set. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` default-gated compile path | Live Claude scenarios remain gated by default but compile and skip cleanly | AC-RMCP-014 and repo live-test policy | Still Valid | Prior stale coverage was updated and code-review round 2 re-reviewed the file. | Run default-gated compile/skipped validation. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` targeted live send-message roundtrip | Real Claude SDK remote MCP send-message, canonical stream events, no provider-name leaks, and sender memory raw traces with MCP text-content result shape | UC-RMCP-001/002/004/007, REQ-RMCP-001/002/004/007/008/009/010/013/018, AC-RMCP-004/006/014 | Needs Update for optional `message_type` assertion; otherwise Still Valid | Round 1 exposed LIVE-CLAUDE-001. The first round-2 live recheck delivered both route-backed messages and passed through the first memory readback, but failed because the second Claude tool call omitted optional `message_type` even though recipient/content delivery succeeded. `message_type` is optional in `send_message_to` schema and parser defaults it. | Update assertions to require recipient/content and result shape, not optional `message_type`; rerun default-gated and targeted live E2E. |
| Codex, AutoByteus, mixed runtime send-message E2E suites | Existing non-Claude runtime `send_message_to` flows | UC-RMCP-006 | Out Of Scope / Still Valid | Current ticket intentionally only changes Claude Agent SDK materialization. | Do not run in focused set. |
| Browser/media/publish-artifact durable tests | Current Claude non-send-message MCP surfaces | REQ-RMCP-011, AC-RMCP-009 | Out Of Scope / Still Valid | Behavior is preserved and covered by focused unit tests for unchanged server map entries. | Do not update. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` live send-message old raw-name/result-shape assertion | Old raw-name guard only mentioned `mcp__autobyteus_team__send_message_to`; old memory/result assertion expected `{ accepted: true }` | Claude provider wire name intentionally changed to `mcp__autobyteus_agent_tools__send_message_to`, old `autobyteus_team` send-message path is removed, and route-backed tool results preserve MCP content shape | REQ-RMCP-004/005/006/007/008/018, AC-RMCP-002/003/006/007/014, implementation handoff Legacy / Compatibility Removal Check, code-review round 2 | Already updated before this round: scenario forbids both old and new provider wire-name leaks, registers Agent Tools MCP routes in the live harness, and expects MCP text-content result shape | N/A because the scenario remains valuable and was updated, not removed. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` live send-message optional `message_type` assertion | Tool lifecycle/memory assertions required `message_type: expect.any(String)` for live Claude provider arguments | `message_type` is optional in `buildSendMessageToParameterSchema()` and `parseSendMessageToToolArguments()` defaults missing values to `agent_message`. The first round-2 live recheck showed real Claude may omit this optional field on one hop while route-backed delivery succeeds. This is not part of the current materializer/memory contract. | REQ-RMCP-018 and AC-RMCP-014 require canonical tool identity, invocation correlation, args/result preservation, and MCP content result shape; they do not require a live LLM to include optional message_type. | Update assertions to require recipient/content and result shape; stop requiring optional `message_type` in provider arguments/raw traces. | N/A because the scenario remains valuable and the obsolete sub-assertion should be relaxed, not removed. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None this round | N/A | N/A | N/A | Round 2 implementation already added the required source/unit durable coverage and code review round 2 passed it; no new file is needed for the optional `message_type` correction. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-CLAUDE-003 | `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` live inter-agent send-message lifecycle and memory trace assertions | Stop requiring optional `message_type` in provider tool arguments/raw traces; continue requiring recipient/content, canonical tool name, invocation correlation, no provider-name leaks, and MCP text-content result shape | REQ-RMCP-018, AC-RMCP-014, `send_message_to` schema marks `message_type` optional and parser defaults it | This is a coverage correction discovered by real-client execution. It is not an implementation reroute because route-backed delivery and first-hop memory trace readback progressed past the prior LIVE-CLAUDE-001 failure. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001 | `claude --version`, Node/pnpm/macOS version checks, and auth-environment inspection | Confirms real Claude SDK/Claude Code live E2E execution is feasible and records runtime target | Environment discovery only; not product coverage. |
| PROBE-002 | Static `rg` scans for old provider names, raw bearer headers, `mcpServers`, descriptor logging/debug surfaces, and route-side memory persistence shortcuts | Confirms no old production path remains, no obvious raw descriptor/header logging exists, and forbidden memory persistence shortcuts were not added | Complements durable tests; static scans are execution evidence, not durable repository coverage. |
| PROBE-003 | Targeted live Claude E2E with `RUN_CLAUDE_E2E=1` | Rechecks LIVE-CLAUDE-001 in the real Claude SDK remote MCP path | The durable E2E test remains gated because it requires external Claude credentials/model access; the one-off run records current environment evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Antigravity CLI, Claude Code CLI, Codex App Server materializers | Explicitly out of scope/deferred by current requirements and design | Future materializers may leak bearer config or mishandle process isolation | Future runtime-materializer tickets must add real-client config, cleanup, and redaction coverage. |
| Browser/media/task-delegation/publish-artifacts through `autobyteus_agent_tools` | V1 Agent Tools MCP only exposes `send_message_to`; other tool families remain on current Claude mechanisms | Future adapters could bypass catalog/executor seams | Future Agent Tools MCP adapter tickets must add provider + executor coverage. |
| Full live Claude E2E file on every validation run | Requires external Claude Code authentication/model access and is intentionally gated by `RUN_CLAUDE_E2E=1` | Default CI/validation may only compile/skip live scenarios | Recheck targeted LIVE-CLAUDE-001 first; broaden only if the fix or results implicate shared live E2E behavior. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| LIVE-CLAUDE-001 prior failure: targeted live Claude send-message roundtrip emitted canonical stream lifecycle and delivered team messages, but `getTeamMemberRunMemoryView(... includeRawTraces: true ...)` stayed empty for the sender invocation | Recheck required after stale optional `message_type` assertion update | Round 1 execution report recorded `Observed traces: []`; first round-2 live recheck progressed through two route-backed deliveries and failed on a coverage-only optional field assertion before final second-hop memory assertion | None before rerun after E2E assertion update; route according to new evidence if memory traces are still absent. |
| Any observed raw descriptor, bearer header, unredacted MCP config, old `mcp__autobyteus_team__send_message_to` production path, route-side raw trace writer, or member-handle fallback memoryDir derivation | Local Fix or Design Impact depending on source | Current requirements/design forbid legacy/secret leaks and fallback/route-side persistence | `implementation_engineer` for implementation-only leak/shortcut; `solution_designer` if upstream artifacts prove ambiguous. |

## Execution Plan

1. Record runtime target versions with `node --version`, `pnpm --version`, `sw_vers`, `claude --version`, and `printenv ANTHROPIC_API_KEY` redaction check.
2. Apply the E2E-CLAUDE-003 durable coverage correction for optional `message_type` assertions before final rerun.
3. Execute the focused memory/mixed-team invariant suite that code review round 2 passed.
4. Execute the focused Claude/Agent Tools/memory suite that code review round 2 passed.
5. Execute the default-gated live Claude E2E file compile/skipped run.
6. Execute the targeted live Claude route-backed send-message roundtrip with `RUN_CLAUDE_E2E=1`, rechecking LIVE-CLAUDE-001 first.
7. Run build and whitespace validation: `pnpm -C autobyteus-server-ts run build` and `git diff --check`.
8. Run static scans for old provider/name paths, raw secret/debug/log surfaces, and forbidden route-side/member-handle fallback memory persistence shortcuts.
9. Update the canonical execution coverage report with pass/fail evidence. Because repository-resident durable E2E coverage is edited in this round, a passing result must route back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`; update the live Claude E2E optional `message_type` assertions before final rerun.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 execution must recheck LIVE-CLAUDE-001 before declaring pass. The initial round-2 live run exposed one additional stale/over-strict E2E assertion: optional `message_type` should not be required in live Claude provider arguments. Because this file is repository-resident durable coverage, a passing result after this edit must return through `code_reviewer` before delivery.
