# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-spec.md`
- Backend scratch repro evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/tmp-dynamic-tool-repro.log`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/review-report.md`

## What Changed

Implemented the reviewed backend fix for Codex history reload tool-call loss:

- Added Codex-owned raw item family classification for active tool item families: `dynamicToolCall`, `mcpToolCall`, `webSearch`, `commandExecution`, and `fileChange`.
- Re-homed pure Codex file-change and tool payload parsing under `agent-execution/backends/codex/items/` and updated live event parsing imports.
- Added a Codex thread-history item normalizer that converts one `thread/read` tool item into normalized Codex tool facts without emitting GraphQL/frontend rows directly.
- Refactored `CodexRunViewProjectionProvider` so it remains responsible for thread traversal and replay-event assembly while delegating tool item interpretation to the normalizer.
- Added run-history-owned invocation-aware projection merge for conversation/activity rows. Stable invocation ids now dedupe/enrich rows across local memory and runtime-native projections; generated/source-scoped fallback ids remain exact-row-dedupe-only to avoid over-collapsing unrelated anonymous tool rows.
- Preserved existing canonical `RunProjection` shape and did not add frontend Codex-specific rendering logic.

## Local Fix Update After Code Review Round 1

Addressed code review findings from `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/review-report.md`:

- CR-001: Failed `commandExecution` / terminal history items now preserve available terminal result facts even when activity status is `error` or `denied`. Failed command history with `aggregatedOutput` and `exitCode` projects `toolResult`/Activity `result` with status/output/exit-code diagnostics.
- CR-002: `CodexToolPayloadParser` now extracts nested result/error text from `result.content`, `result.contentItems`, and structured nested result shapes. Failed MCP/dynamic history items with source error text under `result.content[{ text }]` now project that text as `toolError`/Activity `error` instead of degrading to generic fallback text.
- Added deterministic provider coverage for failed command diagnostics and failed MCP/dynamic nested `result.content` error extraction.
- Removed the unused stable-invocation flag/export from the normalizer shape while preserving generated-id safety in the run-history merge helper.

## Key Files Or Areas

- Added: `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-item-family.ts`
- Added: `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts`
- Added: `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts`
- Moved/re-homed: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-file-change-payload-helper.ts` -> `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-file-change-payload-helper.ts`
- Moved/re-homed: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` -> `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts`
- Modified: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- Modified: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts`
- Modified: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`
- Modified: `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- Modified: `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
- Modified: `autobyteus-server-ts/tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`
- Added: `autobyteus-server-ts/tests/unit/run-history/projection/run-projection-merge.test.ts`

## Important Assumptions

- Codex `thread/read` dynamic/MCP tool items expose a stable `id`/call id for normal same-invocation dedupe; when missing, provider-generated fallback ids are intentionally treated as source-scoped and not semantically merged across local/native sources.
- MCP thread-history tool names may be present as `name` or `tool`; when only `server` + `tool` are available, history normalization qualifies the tool as `server.tool`.
- The frontend canonical projection hydration path remains sufficient when backend returns canonical `tool_call` rows.

## Known Risks

- Histories whose Codex native thread is unavailable and whose local raw traces never captured tool facts remain unrecoverable by this read-time projection fix.
- Future unknown Codex tool-like item shapes still require follow-up support; the normalizer now logs unsupported tool-like history item summaries only when `CODEX_THREAD_HISTORY_DEBUG=1` or `CODEX_THREAD_EVENT_DEBUG=1` is set.
- Repository-wide typecheck commands are currently blocked by existing tsconfig/workspace setup issues noted below; focused runtime/unit coverage passed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Duplicated Policy Or Coordination / Shared Structure Looseness
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Provider-local narrow tool parsing was removed as authoritative policy; Codex raw item interpretation now lives in Codex item/history normalizer files, and local/native projection merge is run-history-owned and invocation-aware.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Changed implementation source files are all below the 500 effective non-empty-line guardrail. `codex-item-event-converter.ts` remains below 500 effective non-empty lines after using shared family classification.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls`
- Branch: `codex/codex-history-reload-toolcalls`
- Base recorded by upstream: `origin/personal`
- `git diff --check` passed.
- Typecheck attempts:
  - `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.json --noEmit` failed before implementation-specific type errors because `tsconfig.json` includes `tests` while `rootDir` is `src` (`TS6059`).
  - `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit` failed before implementation-specific type errors because workspace/package generated types were not available with that direct command (`autobyteus-ts` / Prisma module resolution errors).
  - `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.json --noEmit --rootDir . --pretty false` also failed on existing cross-workspace rootDir/strictness issues outside this change.

## Local Implementation Checks Run

Implementation-scoped checks run:

- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/unit/run-history/projection/run-projection-merge.test.ts tests/unit/run-history/services/agent-run-view-projection-service.test.ts` — passed before code review, 13 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/unit/run-history/projection/run-projection-merge.test.ts tests/unit/run-history/services/agent-run-view-projection-service.test.ts` — passed after CR-001/CR-002 fixes, 15 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — passed before and after CR-001/CR-002 fixes, 27 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history` — passed after CR-001/CR-002 fixes, 25 files / 87 tests.
- `cd autobyteus-web && pnpm exec nuxi prepare && pnpm exec cross-env NUXT_TEST=true vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts --config vitest.config.mts --maxWorkers=1` — passed, 3 tests.
- `cd autobyteus-web && pnpm exec cross-env NUXT_TEST=true vitest run stores/__tests__/runHistoryStore.spec.ts --config vitest.config.mts --maxWorkers=1` — passed, 45 tests.
- `git diff --check` — passed.

## Downstream Validation Hints / Suggested Scenarios

- Review the new provider fixture that asserts `userMessage -> reasoning -> mcpToolCall -> dynamicToolCall -> agentMessage` projects tool rows in order with tool names, arguments, and results.
- Review merge helper behavior for:
  - same stable invocation id dedupe/enrichment across local/native conversation rows;
  - same stable invocation id dedupe/enrichment across Activity rows;
  - generated fallback ids such as `codex-0-1` not semantically collapsing distinct rows.
- Optional API/E2E validation can run a Codex/team-member scenario that emits `send_message_to` plus an MCP/dynamic command-like tool, then reloads `getRunProjection` / `getTeamMemberRunProjection` after backend restart/history selection and compares invocation ids/tool names/args/results.

## API / E2E / Executable Validation Still Required

API/E2E validation is still required downstream. No live Codex app-server reload E2E was run during implementation because that is environment-dependent and belongs to the API/E2E validation stage.
