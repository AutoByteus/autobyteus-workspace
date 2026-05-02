# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/design-review-report.md`

## What Changed

- Codex MCP `mcpToolCall item/started` now emits both the existing live `SEGMENT_START(segment_type=tool_call)` and a canonical `TOOL_EXECUTION_STARTED` event with matching invocation id, tool name, turn id, and arguments.
- Codex local MCP terminal lifecycle conversion now preserves `turn_id` and non-empty `arguments`, and no longer falls back to `run_bash` for MCP completions.
- Codex thread pending MCP completion now returns the removed pending call, letting the notification handler enrich `codex/local/mcpToolExecutionCompleted` with pending `arguments`, `tool_name`, and `turn_id` before deleting pending state.
- Runtime memory/projection code stayed generic; no Codex-specific raw item parsing was added to memory.
- Agent run open now hydrates Activity from projection only when the projection conversation is applied; `KEEP_LIVE_CONTEXT` preserves both live conversation and live Activity.
- Team run live hydration no longer performs hidden loader-side Activity hydration. A named helper hydrates projected member Activity only after a coordinator/apply path applies that member projection conversation. Existing live member contexts preserve live Activity; newly applied projected members still receive Activity hydration.

## Key Files Or Areas

- Backend conversion/state:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
- Backend tests:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts`
- Frontend open/hydration:
  - `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/stores/runHistoryLoadActions.ts`
- Frontend tests:
  - `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts`
  - `autobyteus-web/services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

## Important Assumptions

- Existing raw trace rows already persisted with `{}` tool args are not backfilled by this implementation, per reviewed design.
- The canonical source fix is the Codex converter/notification seam; memory remains generic over normalized lifecycle payload fields.
- Real Codex `generate_image` remains slow/flaky supplemental evidence. Deterministic converter + memory/projection tests are the implementation gate.

## Known Risks

- Existing historical runs with empty `tool_args` will still display incomplete arguments unless a separate backfill ticket is created.
- Broad repository typecheck commands have baseline configuration/type errors unrelated to this patch:
  - Server `pnpm typecheck` fails because `tsconfig.json` includes `tests` while `rootDir` is `src`.
  - Web `pnpm exec nuxi typecheck` fails with many existing broad type errors outside the changed files.
- I did not run live Codex E2E; that remains API/E2E validation scope.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / Behavior Change / Small Refactor
- Reviewed root-cause classification: Missing Invariant and Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation fixed the missing canonical MCP lifecycle start and terminal argument enrichment at the Codex normalization boundary, and tightened frontend projection application so Activity is not hydrated independently from transcript projection under live-context preservation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: The old MCP start segment-only persistence path was replaced with segment + lifecycle fanout. Frontend live team loader Activity side effects were replaced by an explicit helper called only after projection application decisions.

## Environment Or Dependency Notes

- Ran `pnpm install` at the worktree root to restore missing local `node_modules` before checks.
- Ran `pnpm exec nuxi prepare` in `autobyteus-web` to regenerate `.nuxt` test/type metadata locally; generated artifacts are ignored and not part of the diff.
- An initial mistyped server test command (`pnpm test -- run ...`) expanded into a broad suite and was terminated; it is not counted as validation evidence.

## Local Implementation Checks Run

Passed:

- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts`
  - 3 files passed, 33 tests passed.
- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts && pnpm build`
- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web && pnpm exec cross-env NUXT_TEST=true vitest run services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - 3 files passed, 47 tests passed.
- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync && git diff --check`

Attempted but blocked by existing baseline issues:

- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts && pnpm typecheck`
  - Fails with existing `TS6059` rootDir/include mismatch: tests are included while `rootDir` is `src`.
- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web && pnpm exec nuxi typecheck`
  - Fails with many existing type errors across unrelated components/stores/tests; no changed-file-specific failure was identified from the output.

## Downstream Validation Hints / Suggested Scenarios

- Run the preferred gated real Codex MCP `speak` scenario and confirm:
  - live `SEGMENT_START.metadata.arguments` contains args;
  - converted `TOOL_EXECUTION_STARTED.payload.arguments` contains the same args;
  - persisted `tool_call.toolArgs` and `tool_result.toolArgs` contain the same args;
  - `getRunProjection` conversation `toolArgs` and Activity `arguments` match.
- Reopen an active subscribed agent run and confirm Activity is not replaced from projection while the live transcript is preserved.
- Reopen an active subscribed team run and confirm existing live members preserve live Activity, while any newly applied projected member receives matching conversation + Activity hydration.
- Reopen a stopped/historical run with a newly persisted `generate_image` or MCP tool invocation and confirm one middle transcript tool card and one Activity entry with matching invocation id, tool name, args, result/error, and status.

## API / E2E / Executable Validation Still Required

- API/E2E engineer should own live Codex validation and broader restart/reload validation.
- Suggested durable validation: real Codex MCP `speak` with raw event logging; optional `generate_image` as supplemental evidence if runtime timing permits.
