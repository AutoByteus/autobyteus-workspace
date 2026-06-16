# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/investigation-notes.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-spec.md
- Design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-review-report.md
- Code review report for local-fix reroute: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/code-review-report.md

## What Changed

- Generalized the route-backed `autobyteus_agent_tools` MCP server from `send_message_to` only to a catalog/provider/adapter model that can expose configured server-owned backend agent tools across tool families.
- Added Agent Tools MCP adapters for:
  - `send_message_to`
  - browser tools
  - media tools
  - task-delegation tools
  - `publish_artifacts`
- Updated Agent Tools MCP session creation to resolve enabled tools through the catalog, apply availability gates, and persist a focused `AgentToolMcpExecutionContext` with workspace/run execution data only.
- Updated the Agent Tools MCP executor to dispatch through adapters rather than hard-coded send-message logic.
- Updated Claude runtime session tooling so Claude materializes only `autobyteus_agent_tools` for migrated tools and derives allowed MCP wire names from the descriptor's enabled tool list.
- Updated Codex thread bootstrap so migrated tools are no longer assembled as `dynamicTools`; enabled migrated tools are exposed through thread-scoped `mcp_servers.autobyteus_agent_tools`.
- Generalized Agent Tools MCP wire-name normalization/redaction for Claude/Codex event/history payloads beyond `send_message_to`.
- Extracted/exported the `publish_artifacts` parameter schema builder and reused the existing publication service in the MCP adapter, preserving active-run fallback runtime context.
- Removed the old send-message-only Agent Tools MCP definition provider.

## Local Fix Update After Code Review

- CR-001 fixed:
  - Exact Agent Tools MCP tool-name normalization now only strips provider prefixes when the whole value is an exact provider tool name.
  - Arbitrary text beginning with `mcp__autobyteus_agent_tools__...` now always runs through text redaction instead of returning early as a canonical tool name.
  - Codex Agent Tools MCP payload sanitization now omits secret/config keys such as `authorization`, `headers`, `http_headers`, `token`, `capabilityToken`, `tokenHash`, bearer/access/session token variants, and Agent Tools MCP session ids/URLs where present.
  - Codex item-event conversion now derives tool arguments/results/errors/metadata from the sanitized Agent Tools MCP payload, preventing sanitized base payloads from being overwritten by unsanitized derived values.
  - Added no-leak tests for prefixed free-form text, raw `capabilityToken`/`token`/`tokenHash` fields, bearer headers, and Agent Tools MCP session URL/session-id text.
- CR-002 fixed:
  - Physically deleted obsolete migrated Claude local MCP projection source files for browser, media, published artifacts, and task delegation/team communication.
  - Physically deleted obsolete migrated Codex dynamic projection source files for browser, media, published artifacts, and task delegation.
  - Deleted old unit tests that imported/exercised those obsolete projection files.
  - Rewrote task-delegation runtime description coverage to assert Agent Tools MCP adapter definitions and member-team availability gating instead of Claude local/Codex dynamic projections.
  - Removed stale Codex dynamic/Claude local media projection coverage from the media E2E file; downstream API/E2E coverage should add/validate route-backed Agent Tools MCP scenarios.
  - Updated stale test labels/references so migrated `open_tab` and `publish_artifacts` live integration scenarios describe the Codex Agent Tools MCP path rather than a dynamic tool path.
  - Updated file-change generated-output semantics to recognize the unified Agent Tools MCP media wire names instead of the deleted `autobyteus_image_audio` prefix.

## Key Files Or Areas

- Shared MCP catalog/session/executor:
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-tool-name.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/providers/*-mcp-adapter-provider.ts`
- Claude runtime integration:
  - `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/*`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
- Codex runtime integration and redaction:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/*`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts`
- Physical cleanup / stale coverage removal:
  - Deleted Claude old projection files under `autobyteus-server-ts/src/agent-execution/backends/claude/{browser,media,published-artifacts,task-delegation,team-communication}`.
  - Deleted Codex old projection files under `autobyteus-server-ts/src/agent-execution/backends/codex/{browser,media,published-artifacts,task-delegation}`.
  - Deleted corresponding stale unit tests and removed stale media E2E old-projection sections.
- Published artifacts schema reuse:
  - `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts`

## Important Assumptions

- Existing family manifests/services remain the behavior owners; MCP adapters only translate route-backed MCP calls into those family-owned execution paths.
- `AgentToolMcpExecutionContext` intentionally carries only `workingDirectory`, `memoryDir`, and `applicationExecutionContext` because adapters need workspace/run projection context without importing full runtime contexts or secrets.
- Browser availability remains gated by `BrowserToolService.isBrowserSupported()`; task delegation remains gated by member-team context.
- Generic Codex dynamic-tool infrastructure remains only for unrelated strategy-provided tools. Migrated browser/media/task/publish tools are no longer assembled through Codex dynamic registrations.

## Known Risks

- Claude multi-tool remote MCP allowed-tool naming is covered by unit tests, but downstream should still validate against a live Claude runtime where feasible.
- Codex event/history normalization now covers a non-send Agent Tools MCP call (`generate_image`) and explicit no-leak cases at unit level; downstream should validate app-server payloads in an executable Codex scenario.
- `publish_artifacts` route-backed behavior is implemented through the existing publication service with focused fallback runtime context; downstream should explicitly exercise active-run durable projection/event/no-leak behavior.
- API/E2E coverage files were cleaned of stale old-projection assertions, but route-backed durable API/E2E coverage investigation and execution remain downstream responsibilities.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature plus architecture refactor and cleanup.
- Reviewed root-cause classification: Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure if old paths remain active.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Catalog/executor now own MCP tool projection/dispatch; Claude and Codex bootstraps both consume the unified descriptor; migrated tools are no longer actively exposed through old Claude local MCP server composition or Codex migrated dynamic registration assembly; obsolete projection source/test files were physically deleted; static scans found none of the old migrated builder names or server names in `autobyteus-server-ts/src` or `autobyteus-server-ts/tests`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Largest changed source files are under the 500-line guardrail (`claude-session.ts` 489 effective non-empty lines; `codex-item-event-converter.ts` 483). The large net diff is dominated by deletion of obsolete projection source/tests.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification`
- Package manager dependencies were installed with `pnpm install --frozen-lockfile` because the worktree initially lacked `node_modules`; no dependency manifest/lockfile changes were made.
- Prisma client generation was run through the build/typecheck/test flows.

## Local Implementation Checks Run

Implementation-scoped checks only; API/E2E sign-off is still downstream.

- `git diff --check` — Passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed.
- `pnpm -C autobyteus-server-ts build` — Passed, including shared package builds, Prisma generate, TypeScript build, and built-in agents bootstrap smoke check.
- Selected unit/narrow integration tests:
  - Command: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`
  - Result: Passed; 12 test files, 92 tests.
- Static obsolete-path scan:
  - Command pattern scanned `autobyteus-server-ts/src` and `autobyteus-server-ts/tests` for old migrated builder names and old server names: `buildClaudeBrowserMcpServers`, `buildClaudeMediaMcpServer`, `buildClaudeTeamMcpServers`, `buildClaudePublishArtifactsMcpServer`, `buildBrowserDynamicToolRegistrations`, `buildMediaDynamicToolRegistrations`, `buildCodexPublishArtifactsDynamicToolRegistration`, `buildTaskDelegationDynamicToolRegistrations`, `autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, `autobyteus_published_artifacts`.
  - Result: No matches.
- `pnpm -C autobyteus-server-ts typecheck` — Still fails due existing project config issue: `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many test files. Source build typecheck with `tsconfig.build.json` passes.

## Downstream Coverage Hints / Suggested Scenarios

- Claude runtime scenario with at least two enabled Agent Tools MCP tools (for example `send_message_to` plus `generate_image` or `publish_artifacts`) should confirm allowed-tool wire names are accepted and no old family server names are required.
- Codex runtime scenario should confirm app-server `mcp_servers.autobyteus_agent_tools.enabled_tools` includes all configured/available migrated tools and that no migrated `dynamicTools` are registered.
- Execute at least one non-send Agent Tools MCP call through the route-backed server and confirm event/history payloads normalize the public tool name while redacting bearer/session/server metadata.
- Exercise `publish_artifacts` through Agent Tools MCP in an active run and verify durable artifact projection/events remain correct and no fallback runtime context or headers leak.
- Rebuild durable API/E2E coverage around the unified route-backed Agent Tools MCP path now that old local/dynamic projection source and stale tests are removed.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. This implementation has only run implementation-scoped build/typecheck/unit/narrow integration checks. API/E2E coverage investigation, durable coverage edits/removals, broader executable scenarios, and pass/fail classification remain owned by `api_e2e_engineer` after code review.
