# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design principles cleanliness response: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-principles-cleanliness-response.md`
- Design impact response round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-response-round-1.md`
- Design impact reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-reroute.md`
- Diagnostic attempted-fix diff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-memory-local-fix-attempt.diff`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md` (`Latest Authoritative Round: 2`, pass)
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`

## What Changed

Implemented the approved Claude Agent SDK cutover to the server-hosted `autobyteus_agent_tools` MCP descriptor and the revised memory/run-history invariant follow-up from design review round 2.

Claude Agent Tools MCP cutover:

- Added Claude-backend-local Agent Tools MCP helpers for descriptor-to-Claude SDK HTTP MCP server config materialization, `mcp__autobyteus_agent_tools__send_message_to` naming, and live session descriptor state with expiry refresh.
- Wired `ClaudeSession` to create an Agent Tools MCP session only when `send_message_to` is configured, store the raw descriptor only in private live session memory, refresh before configured turns when stale, and pass the materialized HTTP MCP server map into SDK query options.
- Updated Claude `allowedTools` to use `mcp__autobyteus_agent_tools__send_message_to` and removed the old `mcp__autobyteus_team__send_message_to` allowed-tool source path.
- Narrowed `autobyteus_team` MCP server construction to task-delegation tools only.
- Removed the old Claude-specific `send_message_to` tool call handler, definition builder, old tool-name file, and obsolete handler/definition unit tests.
- Updated Claude tool-use coordinator/event converter so remote MCP lifecycle emits generic canonical `send_message_to` application events without route-side memory writes.

Design-impact memory follow-up:

- Added `MixedAgentMemberHandle` fail-fast assertion for recordable non-AutoByteus executable member configs that reach AgentRun creation without `memoryDir`; the handle only asserts/consumes and does not derive fallback memory paths.
- Kept fresh standard member `memoryDir` ownership in `MixedTeamRunBackendFactory`, restore-time ownership in `TeamRunMetadataMapper`, and task-agent ownership in `MixedTeamMemberRegistry`; added/locked focused coverage for those boundaries.
- Fixed explicit memory-root readback consistency inside `AgentMemoryLocationService`: an instance constructed with `memoryDir` now uses a topology reader backed by the same memory root instead of a potentially unrelated global metadata service. This is a precise service lifecycle/root consistency fix, not member-handle fallback derivation or broad singleton rebinding.
- Added canonical `send_message_to` event-to-raw-trace coverage through `AgentRunMemoryRecorder`/`RuntimeMemoryEventAccumulator`, preserving the route-backed MCP content result shape.
- Updated the live Claude E2E durable coverage expectation so sender memory raw traces require MCP text-content result shape rather than the old `{ accepted: true }` handler object.

## Key Files Or Areas

Added:

- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts`

Modified:

- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-mcp-server-config.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts`
- `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- Focused Claude, memory, and mixed-team unit tests listed in the checks below.

Removed:

- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-definition-builder.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/claude-send-message-tool-name.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts`

## Important Assumptions

- Claude Agent SDK remains the first runtime materializer target for this ticket; Codex App Server, Claude Code CLI, and Antigravity CLI materializers remain deferred.
- Programmatic Claude SDK `mcpServers` is the intended Claude integration point; no bearer-token-bearing files are written.
- `AgentToolMcpSessionService` remains the authoritative session/descriptor boundary; Claude backend does not construct URLs/tokens or inspect registry internals.
- Runtime-memory raw traces must flow only through canonical AgentRun events and `AgentRunMemoryRecorder`; Agent Tools MCP route/dispatcher/executor must not write raw traces.
- Active recordable mixed-team member runs must arrive at `MixedAgentMemberHandle` with a concrete upstream-derived `memoryDir`; missing memoryDir is now an invariant error, not a fallback derivation point.

## Known Risks

- The live `RUN_CLAUDE_E2E=1` Claude route-backed test was not rerun by implementation. API/E2E must rerun it to verify the original empty-memory-traces failure is resolved in the real Claude SDK path.
- The precise memory-root consistency fix is intentionally narrow: `AgentMemoryLocationService({ memoryDir })` now binds metadata readback to the same root. If API/E2E still proves a write/read root mismatch through a pre-created global factory/service singleton, that should be classified at the service lifecycle/test-bootstrap boundary, not solved by member-handle fallback.
- Unit tests use fake bearer values only. Code review should still verify no raw descriptor/header logging or persistence was introduced.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature plus targeted refactor; design-impact follow-up for memory trace persistence.
- Reviewed root-cause classification: Original Claude path had duplicated policy/legacy compatibility pressure; design-impact rework classified empty traces as Missing Invariant / possible service lifecycle root mismatch around executable team-member memory roots.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for Claude Agent SDK send-message projection and targeted member memoryDir invariant/readback consistency.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes. The earlier memory fallback/singleton attempt was reverted and routed to `solution_designer`; revised design passed architecture review round 2 before this implementation resumed.
- Evidence / notes: No old `autobyteus_team` send-message fallback was restored. The memory fix is on the canonical spine: upstream member config owners derive memoryDir; handle asserts; recorder persists canonical events; readback root consistency is fixed in `AgentMemoryLocationService`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Largest changed implementation files remain under the 500 effective non-empty-line guardrail: `claude-session.ts` 493, `claude-session-tool-use-coordinator.ts` 480, `mixed-agent-member-handle.ts` 371, `claude-session-event-converter.ts` 340. The old route/handler fallback path remains deleted; the E2E memory expectation now rejects the old `{ accepted: true }` result shape for route-backed traces.

## Environment Or Dependency Notes

- No new runtime dependencies were added.
- Build uses `tsconfig.build.json`; direct `tsc -p tsconfig.json` is not used because the repository root tsconfig includes tests while `rootDir` is `src`.

## Local Implementation Checks Run

Implementation-scoped checks only; no `RUN_CLAUDE_E2E=1` live API/E2E execution was run.

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts --no-watch` — passed (`6` files, `15` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts --no-watch` — passed (`18` files, `114` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts --no-watch` — passed in default-gated mode (`1` file skipped, `5` tests skipped); this only proves the updated durable E2E file compiles under gating.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package builds, Prisma client generation, TypeScript build, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — passed.
- Static provider-name scan: `rg -n "mcp__autobyteus_team__send_message_to|mcp__autobyteus_agent_tools__send_message_to" autobyteus-server-ts/src autobyteus-server-ts/tests --glob '!dist/**'` — no production old-provider-name hits; old team provider string remains only in the E2E forbidden-provider assertion.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run the targeted live Claude scenario that failed previously:
  - `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime" --no-watch`
- Verify sender memory raw traces now include exactly one canonical `send_message_to` `tool_call` and one `tool_result` per invocation id, with MCP text-content result shape and no old `{ accepted: true }` expectation.
- Verify no provider wire names leak in application-facing stream events/history: neither `mcp__autobyteus_agent_tools__send_message_to` nor removed `mcp__autobyteus_team__send_message_to`.
- If memory traces are still empty, distinguish missing member `memoryDir` assertion, write/read root mismatch, and event-shape/projection mismatch; do not route to Agent Tools MCP route-side raw trace writing.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. API/E2E engineer still owns real-client validation and failure classification. Because API/E2E already updated repository-resident durable E2E coverage after the initial code review, any later passing API/E2E state must return through `code_reviewer` before delivery.
