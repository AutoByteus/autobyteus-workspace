# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- Current Execution Round: 2
- Trigger: Refreshed code-review round 2 pass after the design-impact memory/run-history fix; recheck prior live failure LIVE-CLAUDE-001.
- Prior Round Reviewed: Round 1 in this file was reviewed before execution.
- Latest Authoritative Round: 2

Round rules:
- Scenario IDs from round 1 were reused for unchanged scenarios.
- E2E-CLAUDE-003 was created for the newly discovered stale optional `message_type` sub-assertion.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E after code-review round 1 | N/A | LIVE-CLAUDE-001: live route-backed delivery worked, but sender memory raw traces were empty | Fail | No | Routed as Local Fix/design-impact evidence; stale old provider/result-shape E2E assertions were updated. |
| 2 | Code-review round 2 pass after design-impact implementation | LIVE-CLAUDE-001 rechecked with live Claude SDK remote MCP path | E2E-CLAUDE-003 stale optional `message_type` assertion found, investigated, and updated before final rerun | Pass | Yes | Live Claude route-backed ping->pong->ping roundtrip now passes with memory raw trace readback and MCP content result shape. Durable E2E was updated this round, so route to code review before delivery. |

## Execution Basis

Execution followed the updated coverage investigation at `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`. The relevant requirements are the Claude Agent SDK materializer requirements and the design-impact memory/run-history requirements: `send_message_to` must be exposed through server-hosted `autobyteus_agent_tools`, the old `autobyteus_team` send-message path must remain removed, provider wire names must normalize to canonical `send_message_to`, route-backed MCP content result shape must be preserved, runtime-memory traces must persist through canonical AgentRun lifecycle events, and raw descriptors/bearer headers/unredacted MCP config must not leak through events/history/debug surfaces.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `No new file`; `Yes` update to existing live E2E optional-field assertion.
- Reroute required from investigation: `No`
- Notes: The investigation was updated after the first round-2 live recheck revealed the optional `message_type` assertion was over-strict for the current schema and real Claude behavior.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; proves descriptor-to-Claude SDK config and allowed tool helper. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; covers configured/unconfigured gates, standalone/member sender context, descriptor expiry refresh, and new allowed tool. |
| `tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; proves `autobyteus_agent_tools` merge and task-only `autobyteus_team`. |
| `tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; task-delegation-only `autobyteus_team`. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; new remote MCP lifecycle is not suppressed. |
| `tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; provider wire name canonicalizes to `send_message_to`. |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; SDK query options preserve `mcpServers`/`allowedTools`. |
| `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` and `claude-session-manager.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; session/service dependencies remain wired. |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; descriptor/redaction/expiry/revoke/executor delegation coverage still valid. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Still Valid | Executed | Focused 18-file Vitest command passed; route matrix and official MCP SDK loopback coverage still valid. |
| `tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | Still Valid | Executed | Focused 6-file and 18-file Vitest commands passed; fail-fast invariant and no fallback derivation covered. |
| `tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts` | Still Valid | Executed | Focused suites passed; fresh standard member memoryDir ownership covered. |
| `tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts` | Still Valid | Executed | Focused suites passed; restore-time memoryDir reconstruction covered. |
| `tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | Still Valid | Executed | Focused suites passed; task-agent memoryDir ownership covered. |
| `tests/unit/agent-memory/agent-memory-location-service.test.ts` | Still Valid | Executed | Focused suites passed; explicit memory-root readback consistency covered. |
| `tests/unit/agent-memory/agent-run-memory-recorder.test.ts` and `runtime-memory-event-accumulator.test.ts` | Still Valid | Executed | Focused suites passed; canonical route-backed `send_message_to` tool traces persist with MCP content result shape. |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` default-gated compile path | Still Valid | Executed after the round-2 E2E edit | Passed with `1` file skipped, `5` tests skipped. |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` targeted live send-message roundtrip | Needs Update -> Still Valid | Updated optional `message_type` assertion, then executed live | Final `RUN_CLAUDE_E2E=1` run passed: `1` test passed, `4` skipped. It proved real route-backed Claude SDK delivery, canonical lifecycle, provider-name leak guard, and raw memory trace readback. |
| Codex/AutoByteus/mixed runtime send-message E2E suites | Out Of Scope / Still Valid | Not executed | Current ticket is Claude Agent SDK materialization only. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Execution Surfaces / Modes

- Focused unit tests for Claude Agent Tools MCP materialization, allowed-tool gating, event canonicalization, coordinator lifecycle, session construction, route/session service behavior, memoryDir owners, handle fail-fast invariant, and memory raw-trace persistence.
- Fastify route integration tests, including official MCP SDK Streamable HTTP loopback coverage.
- Live Claude Code / Claude Agent SDK E2E targeted test with `RUN_CLAUDE_E2E=1` and local `claude` CLI.
- Default-gated E2E compile/skipped run for the updated live E2E file.
- Server package build.
- `git diff --check` and static grep scans for old provider names, secret/logging surfaces, and forbidden route-side/member-handle memory shortcuts.

## Platform / Runtime Targets

- Host: macOS 26.2 (`BuildVersion 25C56`).
- Node.js: `v22.21.1`.
- pnpm: `10.28.2`.
- Claude CLI: `2.1.175 (Claude Code)`.
- `RUN_CLAUDE_E2E` was unset during default-gated compile and set to `1` for targeted live validation.
- `ANTHROPIC_API_KEY` was not set in the shell environment, but the local Claude CLI was authenticated enough for the live test to create tool calls and deliver messages.
- Test DB: SQLite test DB reset by Vitest/Prisma setup at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Covered by focused tests: Agent Tools MCP session expiry/revoke/owner-revoke, descriptor refresh before configured turns, missing descriptor guard, route bearer/session denial, and run/member cleanup paths inherited from the route/session service.
- Covered by updated live E2E harness: an in-process Fastify server registers `/mcp/agent-tools/:sessionId`, websocket routes, and seeds `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from the listener before live Claude turns.
- Not covered in this round: full restored-run rematerialization through a live external process. Unit coverage covers descriptor refresh and restore dependencies; broader live restore scenarios remain gated and out of the targeted recheck.

## Coverage Matrix

| Scenario ID | Behavior / Boundary | Durable / Temporary | Evidence Command / Artifact | Result |
| --- | --- | --- | --- | --- |
| UNIT-MEM-001 | Mixed-team memoryDir owners, handle invariant, explicit memory-root readback, canonical raw trace persistence | Durable | Focused 6-file Vitest command | Pass: `6` files, `15` tests. |
| UNIT-CLAUDE-001 | Descriptor materialization and allowed tool name | Durable | Focused 18-file Vitest command | Pass. |
| UNIT-CLAUDE-002 | Claude session send-message configured/unconfigured gates, sender/team context, descriptor expiry refresh | Durable | Focused 18-file Vitest command | Pass. |
| UNIT-CLAUDE-003 | MCP server map merge, task-only `autobyteus_team`, SDK option passthrough | Durable | Focused 18-file Vitest command | Pass. |
| UNIT-CLAUDE-004 | Remote MCP lifecycle coordinator and event converter canonicalization | Durable | Focused 18-file Vitest command | Pass. |
| ROUTE-001 | Agent Tools MCP route initialize/list/call/content negotiation/bearer/session denial and official MCP SDK loopback | Durable | Focused 18-file command includes route integration | Pass. |
| E2E-CLAUDE-001 | Updated live Claude E2E compiles under default gated mode | Durable | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts --no-watch` | Pass: `1` file skipped, `5` tests skipped. |
| E2E-CLAUDE-002 / LIVE-CLAUDE-001 | Real Claude SDK remote MCP send-message route-backed ping->pong->ping roundtrip, canonical stream events, no provider-name leaks, memory raw traces | Durable live E2E | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime" --no-watch` | Pass after E2E-CLAUDE-003 coverage correction: `1` test passed, `4` skipped. |
| E2E-CLAUDE-003 | Optional `message_type` field should not be required in live provider args/raw traces | Durable E2E update | Same E2E file and final live rerun | Pass; assertions now require recipient/content plus canonical identity/result shape, not optional field presence. |
| BUILD-001 | Package/shared build | Temporary executable check | `pnpm -C autobyteus-server-ts run build` | Pass. |
| DIFF-001 | Whitespace/diff check | Temporary executable check | `git diff --check` | Pass. |
| SCAN-001 | Old/new provider-name and secret/logging surfaces | Temporary executable check | `rg` scans | Pass: no production old provider/handler/name hits, no MCP route raw-trace writer, no member-handle memoryDir derivation/fallback, and no raw descriptor/bearer logging found. |

## Test Scope

The scope was focused on the changed Claude Agent SDK materialization boundary, the server-hosted Agent Tools MCP route it consumes, and the design-impact memory/run-history invariant needed for route-backed `send_message_to` raw traces. The live E2E run intentionally targeted the first Claude team send-message roundtrip to minimize external model/runtime cost while proving real Claude SDK remote MCP behavior and the prior failure.

## Execution Setup / Environment

- No dependency installation was required in this API/E2E round; workspace dependencies were already present.
- The live Claude E2E test starts a loopback Fastify server with Agent Tools MCP routes and websocket routes.
- The E2E harness seeds `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from the live test server listen address and restores the original environment variable during cleanup.
- Used the repository's existing gated live Claude test pattern (`RUN_CLAUDE_E2E=1`) for the targeted real-client run.

## Tests Implemented Or Updated

Updated repository-resident durable coverage this round:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
  - Removed over-strict `message_type: expect.any(String)` assertions from live provider tool argument/raw-trace checks.
  - Kept recipient/content assertions, canonical `send_message_to` identity, invocation correlation, no provider-name leak checks for both `mcp__autobyteus_agent_tools__send_message_to` and removed `mcp__autobyteus_team__send_message_to`, and MCP text-content result shape assertions.

Previously updated and re-reviewed durable coverage in the same file remains in place:

- Shared live test server helper registers `registerAgentToolsMcpRoutes(...)`, websocket support, `registerAgentWebsocket(...)`, and seeds `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from the listener.
- Route-backed success result assertion expects MCP text-content result shape instead of old handler domain object `{ accepted: true }`.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None removed | N/A | N/A | The live Claude E2E scenario remained valid and was updated rather than removed. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- Paths removed: None this round.
- If `Yes`, returned through `code_reviewer` before delivery: `Pending — this handoff routes to code_reviewer for coverage-code re-review before delivery.`
- Post-API/E2E coverage code review artifact: Pending code-review response.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

- No temporary repository-resident scripts or harnesses were created.
- The live E2E server helper is durable coverage, not temporary scaffolding.

## Dependencies Mocked Or Emulated

- Unit and integration route tests use existing mocks/fakes for SDK clients and MCP tool executor boundaries.
- The targeted live E2E used the real local Claude CLI/Claude Agent SDK path and a real loopback HTTP route for `/mcp/agent-tools/:sessionId`.
- External model/provider access was not mocked in the live targeted run.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | E2E-CLAUDE-002 / LIVE-CLAUDE-001: sender memory raw traces were empty after route-backed delivery | Local Fix / design-impact rework | Resolved | Final `RUN_CLAUDE_E2E=1` targeted live run passed; `waitForSendMessageMemoryTrace` completed for ping and pong invocations, requiring canonical `tool_call` and `tool_result` traces with MCP text-content result shape. | First round-2 live run progressed past the prior empty-traces failure for the first hop, then exposed E2E-CLAUDE-003 optional-field assertion; after coverage update, full targeted roundtrip passed. |
| 2 interim | E2E-CLAUDE-003: live Claude omitted optional `message_type` on the second tool call while delivery succeeded | Stale durable coverage | Resolved by coverage update | `send_message_to` schema marks `message_type` optional and parser defaults missing values. Final default-gated compile and targeted live E2E passed after removing optional-field requirement. | This was not an implementation defect. |

## Scenarios Checked

Commands executed in this round:

```text
node --version
pnpm --version
claude --version
sw_vers
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts --no-watch
RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime" --no-watch
pnpm -C autobyteus-server-ts run build
git diff --check
rg -n "mcp__autobyteus_team__send_message_to|ClaudeSendMessageToolCallHandler|buildClaudeSendMessageToolDefinition|claude-send-message-tool-name" autobyteus-server-ts/src --glob '!dist/**'
rg -n "RunMemoryWriter|AgentRunMemoryRecorder|raw_traces|rawTraces" autobyteus-server-ts/src/agent-tools/mcp --glob '!dist/**'
rg -n "getTeamAgentRunLocation|getTaskAgentLocation|fallback|derive.*memoryDir|memoryDir.*derive" autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts
rg -n "console\.|logger\.|debug|mcpServers|Authorization|descriptor\.headers|rawChunkJson|CLAUDE_SESSION_RAW_EVENT|Bearer" autobyteus-server-ts/src/agent-execution/backends/claude autobyteus-server-ts/src/agent-tools/mcp autobyteus-server-ts/src/runtime-management/claude/client autobyteus-server-ts/tests/unit/agent-execution/backends/claude autobyteus-server-ts/tests/integration/agent-tools/mcp --glob '!dist/**'
```

## Passed

- Focused memory/mixed-team Vitest command passed: `6` files, `15` tests.
- Focused Claude/Agent Tools/memory Vitest command passed: `18` files, `114` tests.
- Updated live E2E file default-gated compile/skipped run passed after the round-2 E2E edit: `1` file skipped, `5` tests skipped.
- Targeted live Claude route-backed send-message E2E passed after the optional-field coverage correction: `1` test passed, `4` skipped.
- Package build passed: shared packages, Prisma generation, `tsc -p tsconfig.build.json`, managed messaging asset copy, built-in agents bootstrap smoke.
- `git diff --check` passed.
- Static source scans found no production `mcp__autobyteus_team__send_message_to`, old Claude handler/name symbols, Agent Tools MCP route-side raw-trace writer, or `MixedAgentMemberHandle` memoryDir fallback/derivation. The only old provider string remains in the E2E forbidden-provider assertion.
- Secret/log/debug static scan found expected auth handling and fake test bearer values only; no raw descriptor/header logging or unredacted MCP config emission was found in changed Claude/Agent Tools surfaces.

## Failed

No final failures.

Non-authoritative intermediate round-2 stale-coverage failure:

| Scenario ID | Failure | Evidence | Classification |
| --- | --- | --- | --- |
| E2E-CLAUDE-003 | First round-2 targeted live run failed because the durable E2E required `message_type: expect.any(String)` in live provider tool arguments, but real Claude omitted optional `message_type` on the second hop while recipient/content delivery succeeded | Vitest failure at `claude-team-inter-agent-roundtrip.e2e.test.ts:751`: received `{ recipient_name: 'ping', content: 'PONG-TO-PING ...' }` without `message_type`; team communication projections for both directions were inserted | Stale durable coverage; updated before final rerun |

## Not Tested / Out Of Scope

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Full live Claude E2E file | Targeted scenario proved the changed send-message route/memory boundary; running all live scenarios would add external model cost and was not required by the investigation after targeted pass | Other live Claude scenarios may reveal unrelated issues | Delivery or future validation may run broader live suite if needed. |
| Antigravity CLI, Claude Code CLI, Codex App Server materializers | Out of current requirements/design scope | Future runtime materializers may leak token-bearing config or mishandle process isolation | Future materializer tickets must add dedicated real-client/config cleanup coverage. |
| Browser/media/task-delegation/publish-artifacts through Agent Tools MCP | Out of current V1 scope; these remain on existing Claude mechanisms | Future adapters need catalog/executor seams | Future Agent Tools MCP adapter tickets. |

## Blocked

None.

## Cleanup Performed

- The live E2E test cleanup closed the websocket/test Fastify server and removed its temporary app data/workspace directories.
- No temporary repository-resident files were created.

## Classification

- `Local Fix`: N/A for final result.
- `Design Impact`: N/A.
- `Requirement Gap`: N/A.
- `Unclear`: N/A.
- Coverage-code re-review required: `Yes`, because API/E2E updated repository-resident durable E2E coverage this round.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Durable coverage investigation was completed before the round-2 durable E2E assertion edit and before final execution.
- LIVE-CLAUDE-001 is resolved: the final targeted live Claude run proved route-backed `autobyteus_agent_tools` `send_message_to` delivery in both directions and completed memory raw-trace checks for the sender invocations.
- The live run used a real local Claude CLI/Claude Agent SDK path and real loopback HTTP `/mcp/agent-tools/:sessionId` route; external model/provider access was not mocked.
- Application-facing assertions require canonical `send_message_to` and explicitly reject both raw provider names (`mcp__autobyteus_agent_tools__send_message_to` and removed `mcp__autobyteus_team__send_message_to`) in stream event payload/metadata.
- No raw Agent Tools descriptor, bearer header, or unredacted MCP server config was observed by static scan in changed runtime/log surfaces.
- Because `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` was updated after the latest code review, the package must return to `code_reviewer` before delivery.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 2 API/E2E passes. Route-backed live Claude SDK `send_message_to` now succeeds through `autobyteus_agent_tools`, emits canonical lifecycle, avoids provider-name leaks, and persists sender memory raw traces with MCP content result shape. Route to `code_reviewer` for narrow coverage-code re-review because durable E2E coverage was updated in this round.
