# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/investigation-notes.md`
- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-spec.md`
- Updated design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-review-report.md`
- Latest design rework addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-rework-addendum.md`
- Post-delivery live repro: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/post-delivery-live-repro.md`
- Backend projection evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`
- Pre-restart projection evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/pre-restart-projection.json`
- Screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/b0b990-1778916761455.png`
- Prior code review context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/review-report.md`

## What Changed

Implemented the Round 4 local-only display-source design, superseding the previous turn-aware merge and Codex-native-provider-only attempts:

- `AgentRunViewProjectionService` now uses one display authority for normal UI history: `LocalMemoryRunViewProjectionProvider`, regardless of runtime kind.
- `getRunProjection` / `getProjectionFromMetadata` no longer select runtime-native providers, no longer fallback from native providers to local memory, and no longer merge local/native projection bundles.
- `TeamMemberRunViewProjectionService` resolves member metadata and member `memoryDir`, then delegates to the same `AgentRunViewProjectionService` local replay path. This applies to AutoByteus, Codex, and Claude Agent SDK members.
- `TeamRunHistoryService` summary fallback no longer preloads `TeamMemberLocalRunProjectionReader`; it delegates through the same agent projection boundary when raw trace summary extraction is insufficient.
- Removed obsolete normal-display source machinery: `run-projection-provider-registry.ts`, `run-projection-merge.ts`, and `team-member-local-run-projection-reader.ts`, plus their obsolete tests.
- Kept Codex/Claude runtime-native projection providers as direct diagnostic utilities only and documented that they are not normal UI display sources.
- Updated run-history/Codex docs to define local application-owned replay traces as the display source and Codex native `thread/read` as diagnostic/protocol support.

## Key Files Or Areas

Implementation source:

- Modified: `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
- Modified: `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
- Modified: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- Modified: `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- Modified/scoped diagnostic only: `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- Modified/scoped diagnostic only: `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts`
- Removed: `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- Removed: `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts`
- Removed: `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts`

Tests / durable checks updated:

- Modified: `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
- Modified: `autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.test.ts`
- Modified: `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
- Modified: `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
- Removed obsolete registry/merge/team-member-reader tests.

Docs updated:

- `autobyteus-server-ts/docs/modules/run_history.md`
- `autobyteus-server-ts/docs/modules/codex_integration.md`
- `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`

## Test Coverage Updated

- Unit coverage now proves `AgentRunViewProjectionService` calls only the local replay provider for Codex, Claude Agent SDK, and AutoByteus metadata.
- Unit coverage proves a Codex run with missing local replay remains empty even if a mocked native provider could return rows.
- Unit coverage proves local replay traces containing user, reasoning, tool call/result, and assistant text hydrate into canonical conversation/activity rows in order.
- Team-member unit coverage proves member metadata includes member `memoryDir` and delegates through the unified local replay path.
- Integration coverage now runs standalone and team-member projection from actual memory layouts for AutoByteus, Codex, and Claude Agent SDK.
- GraphQL projection coverage now proves Codex standalone and team-member `getRunProjection` / `getTeamMemberRunProjection` return local replay tool rows and do not call the mocked Codex thread reader.
- Frontend canonical hydration tests still pass unchanged; no runtime-specific frontend branch was added.

## Important Assumptions

- Normal UI history display is local replay authoritative for every runtime, including Codex and Claude Agent SDK.
- Missing or incomplete local replay traces are allowed to produce empty/incomplete UI history; runtime-native history must not be used to recover normal display.
- Runtime-native Codex/Claude providers may remain only as diagnostic utilities or direct protocol tests; they are not part of GraphQL normal history APIs.
- If a reloaded history is missing tool rows now, the defect boundary is local event normalization/raw-trace writing or local replay projection, not provider-source reconciliation.

## Known Risks

- Older runs without local raw/replay traces will not be reconstructed from Codex native thread history or Claude session history. This is intentional under the approved design.
- `LocalMemoryRunViewProjectionProvider` name still says “memory,” but docs and comments now identify it as the local replay display authority.
- Broad `pnpm run typecheck` was not rerun; prior repo config issue remains (`tests` included while `rootDir` is `src`). Source build passed via `pnpm run build`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix + source-authority refactor.
- Reviewed root-cause classification: Boundary Or Ownership Issue / Duplicated Policy Or Coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Normal UI history now has one source boundary. `AgentRunViewProjectionService` owns local-only projection policy; team-member service owns member identity/memory metadata only; local provider owns replay trace reading; frontend remains canonical-projection-only.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes — removed runtime provider registry, local/native projection merge helper, team-member local reader bypass, and obsolete tests.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes.
- Notes: The implementation is a clean-cut source-authority replacement, not a Codex-specific runtime branch or a compatibility fallback.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls`
- Branch: `codex/codex-history-reload-toolcalls`
- Base recorded by upstream: `origin/personal`
- `git diff --check` passed.
- `pnpm run build` passed for `autobyteus-server-ts`.

## Local Implementation Checks Run

Implementation-scoped checks run after the Round 4 local-only rework:

- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` — passed, 5 files / 17 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/integration/run-history/memory-layout-and-projection.integration.test.ts` — passed, 1 file / 12 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` — passed, 1 file / 2 tests. Narrow GraphQL projection check only; not downstream validation sign-off.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history` — passed, 22 files / 81 tests.
- `cd autobyteus-server-ts && pnpm run build` — passed, including `tsc -p tsconfig.build.json` and built-in agents bootstrap smoke check.
- `cd autobyteus-web && pnpm exec nuxi prepare && pnpm exec cross-env NUXT_TEST=true vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts stores/__tests__/runHistoryStore.spec.ts --config vitest.config.mts --maxWorkers=1` — passed, 2 files / 48 tests.
- `git diff --check` — passed.

## Downstream Validation Hints / Suggested Scenarios

- Code review should verify no production normal UI path imports or resolves `CodexRunViewProjectionProvider`, `ClaudeRunViewProjectionProvider`, provider registry, or projection merge.
- Code review should verify `getRunProjection` and `getTeamMemberRunProjection` are local replay only for Codex, Claude Agent SDK, and AutoByteus.
- API/E2E should validate a real restart/history reload for Codex and, if available, Claude Agent SDK: live reasoning/tool/text rows should be persisted as local raw traces and reload through the same local projection path.
- API/E2E should validate an older/missing-local-history case returns empty/incomplete projection instead of reconstructing from runtime-native history.

## API / E2E / Executable Validation Still Required

API/E2E validation is still required downstream after code review passes. The checks above are implementation-scoped unit/integration/narrow GraphQL confidence checks and should not be treated as final API/E2E validation sign-off.
