# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Codex MCP materializer correction: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/codex-mcp-materializer-design-correction.md`
- API/E2E runtime communication scope gap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`
- Runtime communication matrix response: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirement-gap-runtime-communication-matrix-response.md`
- Design principles cleanliness response: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-principles-cleanliness-response.md`
- Design impact response round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-response-round-1.md`
- Design impact reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-reroute.md`
- Diagnostic attempted-fix diff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-memory-local-fix-attempt.diff`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md` (`Current Review Round: 3`, pass)
- Implementation handoff (this file): `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Latest code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`

## Implementation Summary

Implemented the revised round-3 design package. The current state includes the earlier Claude Agent SDK Agent Tools MCP cutover and memory/run-history invariant work, plus the new Codex App Server thread-scoped Agent Tools MCP materialization.

Codex round-3 changes:

- Added a Codex-backend-local Agent Tools MCP materializer that converts an `AgentToolMcpDescriptor` to app-server thread-scoped `config.mcp_servers.autobyteus_agent_tools` with snake_case keys: `url`, `http_headers`, `enabled_tools`, and `startup_timeout_sec`.
- Wired `CodexThreadBootstrapper` to create a live Agent Tools MCP session through `AgentToolMcpSessionService` when `send_message_to` is configured, materialize only the thread-scoped app-server config, and preserve sender/owner context for standalone and team-member runs.
- Passed the materialized app-server config through `CodexThreadConfig` into both `thread/start` and `thread/resume` request payloads.
- Removed the old Codex dynamic `send_message_to` registration/spec builder path entirely; team/default bootstrap strategies no longer build dynamic `send_message_to` handlers.
- Kept existing Codex dynamic tool support for browser/media/publish-artifacts/task-delegation where still in scope.
- Added Codex event/history canonicalization for Agent Tools MCP `send_message_to` wire names so app-facing events/history/raw traces use canonical `send_message_to`, not provider/server-qualified names.
- Added the round-4 local fix for `CR-RMCP-CODEX-001`: Codex Agent Tools MCP `send_message_to` application event payloads now sanitize nested serialized payloads, not only top-level `tool_name`. This removes `autobyteus_agent_tools`, `mcp__autobyteus_agent_tools__send_message_to`, and bearer/header markers from emitted AgentRun payloads while preserving canonical invocation id, arguments, result/error, and MCP content item shape.
- Added the API/E2E mixed-restore local fix: `getTeamRunMetadataService()` now rebinds when the current app memory root changes, preventing early context-file/Codex imports from pinning team restore metadata reads to the repository-default memory root after an E2E/test app-data root is selected.
- Deferred Codex context-file local path resolver construction from module import to `toCodexUserInput()` conversion time, so memory-root-sensitive context-file resolution is bound to the active app config instead of import-time state.
- Added an `AgentRunManager.restoreAgentRun()` active-run preflight that removes stale inactive registry entries before backend restoration. This prevents persisted mixed-team restore from reactivating a backend with the same run id and making a stale old registry entry appear active during registration.
- Updated Codex unit coverage to prove thread-scoped config materialization/passthrough, restore-time fresh session creation, dynamic send-message removal, canonical event/history naming, and negative no-leak assertions for `ITEM_STARTED`, `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` success/failure, and `ITEM_COMPLETED` segment-end payloads.

Preserved from prior approved implementation state:

- Claude Agent SDK uses programmatic SDK `mcpServers`/`allowedTools` for `autobyteus_agent_tools`; the old `mcp__autobyteus_team__send_message_to` handler/definition path remains removed.
- Runtime-memory raw traces remain canonical-event-based through `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator`; Agent Tools MCP route/dispatcher/executor do not write raw traces.
- `MixedAgentMemberHandle` asserts missing recordable non-AutoByteus `memoryDir` instead of deriving fallback paths; memoryDir ownership remains in the factory/mapper/registry boundaries.
- The narrow `AgentMemoryLocationService({ memoryDir })` root-consistency fix remains in place.

## Key Files Or Areas

Added:

- `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-event-payload.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts`

Modified source/test areas for Codex round 3 and subsequent local fixes:

- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-metadata-service.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/team-run-metadata-service.test.ts`
- Focused Codex unit tests under `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/`

Removed obsolete Codex dynamic send-message path:

- `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/codex-send-message-dynamic-tool-registration.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/codex-send-message-tool-spec-builder.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts`

Existing prior-round areas still relevant to review:

- Claude Agent Tools MCP files under `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/`
- Claude session/tooling/event files touched by the prior cutover
- Memory/mixed-team files touched by the prior design-impact fix
- `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` from API/E2E durable coverage update

## Important Assumptions And Boundaries

- Codex uses app-server protocol `thread/start` / `thread/resume` `config.mcp_servers.autobyteus_agent_tools`; no process-level `--config`/`-c`, `CODEX_APP_SERVER_ARGS*`, trusted `.codex/config.toml`, durable bearer files, or dynamic `send_message_to` fallback were added.
- The raw descriptor/config includes bearer material and is only held in live runtime memory long enough to send app-server thread requests. It is not logged, persisted, or written to files by this implementation.
- Codex restore creates a fresh Agent Tools MCP session/config during backend bootstrap; it does not reuse persisted descriptors.
- Codex App Server support for thread-scoped `config.mcp_servers` is assumed per the reviewed design correction/probe. If API/E2E proves the installed app server cannot honor that shape, route back to `solution_designer`; do not switch to process/file-backed config.
- The all-active-runtime matrix is validation scope for API/E2E, not a new production abstraction.

## Known Risks / Follow-Up

- I reran the API/E2E-reported live AutoByteus+Codex mixed restore scenario and it passed after the local fix. I did not rerun the full all-active-runtime matrix; API/E2E still owns full matrix execution/sign-off and classification.
- Existing module documentation files are modified in the worktree from upstream activity before this Codex implementation pass. Delivery still owns final docs sync/no-impact after API/E2E and code review.
- API/E2E previously updated repository-resident durable E2E coverage after the initial code review. After API/E2E is green, this package must return through `code_reviewer` again before delivery.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature plus targeted removal/refactor.
- Reviewed root-cause classification: Codex had an old dynamic local send-message path; revised design requires runtime-local Agent Tools MCP materialization through thread-scoped app-server config.
- Latest API/E2E local-fix root cause classification: local implementation/service-lifecycle defects, not a design impact. The metadata lookup singleton was not memory-root-aware, Codex context-file helper construction was import-time memory-root-sensitive, and `AgentRunManager.restoreAgentRun()` did not clear stale inactive active-run registry entries before backend restore.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for Codex send-message exposure; obsolete dynamic registration removed.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes earlier; round-3 design passed architecture review before implementation resumed.
- Evidence / notes: No old Claude `autobyteus_team` send-message fallback and no Codex dynamic `send_message_to` fallback remain in production source.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight: `Yes`; Codex and Claude materializers stay backend-local and no generic all-runtime config writer was added.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`; latest touched sources checked include `agent-run-manager.ts` 294 effective lines, `codex-user-input-mapper.ts` 106 effective lines, and `team-run-metadata-service.ts` 38 effective lines. Earlier largest changed implementation files checked were `codex-thread-bootstrapper.ts` 461 lines and `codex-item-event-converter.ts` 497 lines; the focused sanitizer helper keeps the converter under the 500-line hard limit.
- Static scans: no production `mcp__autobyteus_team__send_message_to`; that old wire name remains only in the E2E forbidden-provider assertion.

## Local Implementation Checks Run

Implementation-scoped checks plus the API/E2E-requested failing live mixed-restore scenario:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/run-history/team-run-metadata-service.test.ts tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts --no-watch` — passed (`3` files, `16` tests); covers stale inactive restore cleanup, memory-root-aware team metadata service rebinding, and lazy Codex context-file resolver construction.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts --no-watch` — passed (`1` file, `30` tests); includes the new nested-payload no-leak coverage for `CR-RMCP-CODEX-001`.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts --no-watch` — passed (`7` files, `79` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts --no-watch` — passed (`19` files, `138` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch` — passed in default-gated compile/skipped mode (`7` files skipped, `19` tests skipped).
- `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts -t "creates a live mixed-runtime team, proves cross-runtime delivery in both directions" --no-watch` — passed (`1` file, `1` test, ~87.91s). This is the API/E2E-reported failing mixed AutoByteus+Codex restore/rematerialization scenario.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package builds, Prisma client generation, TypeScript build, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — passed.
- Static scans:
  - `rg "mcp__autobyteus_team__send_message_to" autobyteus-server-ts/src autobyteus-server-ts/tests -n` — no production hits; only E2E forbidden-provider assertion.
  - `rg "codex-send-message|buildSendMessageToDynamic|buildSendMessageToToolSpec" autobyteus-server-ts/src autobyteus-server-ts/tests -n` — no hits.
  - `rg "CODEX_APP_SERVER_ARGS|config\\.toml|trusted|Bearer |http_headers|mcp_servers" autobyteus-server-ts/src/agent-execution/backends/codex -n` — only the intended thread-scoped `mcp_servers/http_headers` materializer and unrelated `untrusted` enum.

## Downstream Coverage Hints / Suggested API-E2E Scenarios

- Validate Codex App Server thread-scoped `config.mcp_servers.autobyteus_agent_tools` in live `thread/start` and `thread/resume` paths.
- Re-run live Codex team and standalone send-message coverage and assert canonical `send_message_to` events/history/raw traces with no dynamic handler/fallback path.
- Re-run the targeted live Claude scenario that previously failed memory raw traces:
  - `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime" --no-watch`
- Run/expand the all-active-runtime matrix required by the revised design: AutoByteus local, Codex Agent Tools MCP, and Claude Agent Tools MCP sender entries must converge on `SendMessageToDispatcher` and team delivery.
