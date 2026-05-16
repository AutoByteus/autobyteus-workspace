# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-spec.md`
- Design Rework Addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-rework-addendum.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/review-report.md`
- Current Validation Round: 4
- Trigger: Code review Round 7 pass for the Round 4 local-only display-source rework; validate current normal UI projection behavior against the superseding local-replay-only design.
- Prior Round Reviewed: Round 3 source-authority validation is now stale context because Round 4 changed the display source policy from runtime-native/source-authoritative to local replay only for every runtime.
- Latest Authoritative Round: 4

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Original code review pass for dynamic/MCP Codex history reload fix | N/A | None | Pass, with durable GraphQL E2E validation added | No | Historical; later design changed. |
| 2 | Post-delivery source-authority/duplicate-tail rework | No unresolved validation failures | None | Pass, with durable GraphQL E2E validation updated | No | Routed to code review because durable validation changed. Superseded by Round 4. |
| 3 | Source-authority implementation confirmation after code review Round 6 | Round 2 pass rechecked | None | Pass | No | Stale prior-round context. Round 4 now requires normal UI projection to use local replay only. |
| 4 | Code review Round 7 pass for local-only display-source rework | Rechecked prior stale assumptions against new local-only requirements | None | Pass, with durable GraphQL E2E validation updated | Yes | Current normal UI API paths are validated as local replay only; missing local history stays empty and does not recover from native history. |

## Validation Basis

Round 4 validated the superseding local-only requirements/design, especially:

- Normal UI history display must use the local application-owned replay trace as the sole display source for standalone and team-member runs across runtimes.
- `getRunProjection(runId)` must not call Codex/Claude runtime-native providers, provider registry, projection merge, or any native recovery path.
- `getTeamMemberRunProjection(teamRunId, memberRouteKey)` must resolve team/member metadata plus member `memoryDir`, then delegate to the same local replay projection path.
- If local replay history is absent or incomplete, the normal UI projection remains empty/incomplete rather than recovering from runtime-native history.
- Runtime-native Codex/Claude providers may exist only as diagnostic utilities and must not be normal UI callers.
- Non-Codex local/memory-backed history still uses the same local replay path.
- Frontend continues to consume the unchanged canonical projection contract.

Relevant acceptance criteria validated: AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-009, AC-010, AC-011.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Implementation handoff legacy check reviewed:

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes — runtime provider registry, local/native projection merge helper, team-member local reader bypass, and obsolete tests are removed.
- Notes: implementation is a clean-cut source-authority replacement, not a Codex-specific runtime branch or compatibility fallback.

## Validation Surfaces / Modes

- Backend GraphQL schema execution for `getRunProjection(runId)`.
- Backend GraphQL schema execution for `getTeamMemberRunProjection(teamRunId, memberRouteKey)`.
- Real temporary app data, standalone run metadata, team metadata, member memory layout, and persisted local `raw_traces.jsonl`.
- Mocked Codex native `thread/read` response containing a poison marker, used only to prove the normal UI GraphQL path does not call/read/recover from native Codex history.
- Backend integration coverage for memory layout and local projection across AutoByteus, Codex app-server, and Claude Agent SDK runtime metadata.
- Backend run-history unit suite.
- Frontend canonical projection hydration/store tests.
- Production source build via `pnpm run build`.
- Source/deletion/import probe for normal service/API boundaries.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls`
- Branch: `codex/codex-history-reload-toolcalls`
- Git tracking state during validation: `codex/codex-history-reload-toolcalls...origin/personal [ahead 2, behind 4]`
- Backend test runner: Vitest via `pnpm exec vitest`
- Frontend test runner: Vitest via `pnpm exec cross-env NUXT_TEST=true vitest ...`
- Live external Electron/Codex app-server scenario: not rerun in Round 4. The deterministic GraphQL E2E covers the exact normal UI backend API boundary using persisted local replay files and no active run/native recovery.

## Lifecycle / Upgrade / Restart / Migration Checks

- Reviewed post-delivery live repro artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/post-delivery-live-repro.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/pre-restart-projection.json`
- The GraphQL E2E recreates history selection/reload from persisted metadata and local replay traces without active run state.
- Missing-local-history cases were added at the GraphQL API boundary for both standalone and team-member Codex metadata.
- No persistent migration/backfill is involved or allowed.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Criteria | Surface | Evidence | Result |
| --- | --- | --- | --- | --- |
| VAL4-001 | AC-001, AC-009 | GraphQL E2E `getRunProjection` | Standalone Codex local replay rows for user/reasoning/tool/result/assistant project into canonical conversation/activity rows; Codex native reader not called | Pass |
| VAL4-002 | AC-002, AC-009 | GraphQL E2E `getTeamMemberRunProjection` | Team-member Codex local replay rows project through member memory layout; Codex native reader not called | Pass |
| VAL4-003 | AC-003, AC-010 | GraphQL E2E `getRunProjection` | Standalone Codex with missing local replay returns null summary/lastActivity and empty rows; native poison marker is absent and native reader not called | Pass |
| VAL4-004 | AC-003, AC-010 | GraphQL E2E `getTeamMemberRunProjection` | Team-member Codex with missing local replay returns null summary/lastActivity and empty rows; native poison marker is absent and native reader not called | Pass |
| VAL4-005 | AC-004, AC-011 | Source/deletion/import probe + E2E poison marker | No local/native merge helper exists; native rows are not merged into normal UI projection | Pass |
| VAL4-006 | AC-005, AC-006 | Integration + unit tests | AutoByteus/Codex/Claude metadata use local replay memory layout and projection; team member path passes explicit member `memoryDir` | Pass |
| VAL4-007 | AC-007 | Frontend tests | Canonical projection hydration/store tests pass without runtime-specific UI branches | Pass |
| VAL4-008 | Build/diff hygiene | Build + `git diff --check` | Production source build and whitespace check pass | Pass |

## Test Scope

Round 4 focused on the current normal UI display-source boundary:

- Local replay present: standalone and team-member Codex GraphQL paths return local reasoning/tool/text rows.
- Local replay absent: standalone and team-member Codex GraphQL paths return empty local projection and do not call native Codex history.
- Runtime consistency: local replay projection works for AutoByteus, Codex app-server, and Claude Agent SDK metadata.
- Removed-source assurance: provider registry, projection merge helper, and team-member local reader bypass are absent; normal services/API do not import native providers or deleted helpers.
- Frontend remains runtime-agnostic.

## Validation Setup / Environment

- Updated durable GraphQL E2E mock returns a native Codex thread containing poison marker `NATIVE_THREAD_SHOULD_NOT_RECOVER_UI_PROJECTION`.
- Local-present GraphQL cases write local replay traces containing `LOCAL_REPLAY_IS_CODEX_UI_PROJECTION_SOURCE`, dynamic `send_message_to`, and MCP/command-like `functions.exec_command` rows.
- Local-absent GraphQL cases write metadata only and no local `raw_traces.jsonl`; they assert empty local output and no native reader call.

## Tests Implemented Or Updated

- Repository-resident durable API/E2E validation updated this round: `Yes`
- Updated durable validation path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
- Added/strengthened GraphQL E2E coverage:
  - standalone Codex missing local replay stays empty and does not recover from mocked native history;
  - team-member Codex missing local replay stays empty and does not recover from mocked native history;
  - poison native marker is asserted absent;
  - null summary/lastActivity and empty rows are asserted for missing-local cases.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` — this report routes to `code_reviewer`.
- Post-validation code review artifact: Pending; this validation report is the handoff for narrow validation-code re-review.

## Other Validation Artifacts

- Updated canonical validation report:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/validation-report.md`
- Upstream live repro/evidence files remain part of the cumulative package.

## Temporary Validation Methods / Scaffolding

- No retained temporary scaffolding.
- Temporary directories created by Vitest tests are cleaned by test hooks.
- Native Codex thread mocking is part of durable E2E validation and is used only as a poison source to prove the normal UI path does not call native recovery.

## Dependencies Mocked Or Emulated

- Mocked Codex app-server `thread/read` response via `CodexThreadHistoryReader.readThread(...)` for deterministic no-native-recovery GraphQL E2E assertions.
- Real in-process path:
  - GraphQL schema/resolvers for `getRunProjection` and `getTeamMemberRunProjection`.
  - `AgentRunViewProjectionService`.
  - `TeamMemberRunViewProjectionService`.
  - `LocalMemoryRunViewProjectionProvider`.
  - Team metadata store, agent metadata store, and team-member memory layout.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Original dynamic/MCP GraphQL projection coverage | N/A, Round 1 passed | Reframed under local replay display authority | Round 4 GraphQL E2E returns dynamic/MCP rows from local replay, not Codex native history | Historical provider-authoritative assumptions superseded. |
| Post-delivery evidence | Duplicate/reordered tail from mixed local/native projection | Refined local-only requirement | Resolved by removing merge/native fallback from normal UI path | Deleted files absent; normal services/API import probe clean; GraphQL E2E poison native marker absent | No native/local reconciliation remains in normal UI projection. |
| 3 | Source-authority validation | Stale design direction | Superseded by local-only display-source design | Round 4 validation uses local replay as sole source and missing-local empty behavior | Previous Round 3 report is historical only. |
| 4 pre-validation | API/E2E needed missing-local no-recovery proof | Coverage gap identified during validation | Durable GraphQL E2E updated | New standalone and team-member missing-local cases pass | Because durable validation changed, route back to code review. |

## Scenarios Checked

### VAL4-001: Standalone Codex local replay through GraphQL

- Query: `getRunProjection(runId)`.
- Setup: Codex metadata with platform thread id plus local `raw_traces.jsonl` containing user/reasoning/MCP tool/dynamic tool/assistant rows.
- Assertions: local replay marker appears; dynamic `send_message_to` and `functions.exec_command` rows preserve ids, names, args, results, statuses, and Activity rows; mocked native reader is not called.
- Result: Pass.

### VAL4-002: Team-member Codex local replay through GraphQL

- Query: `getTeamMemberRunProjection(teamRunId, memberRouteKey)`.
- Setup: team metadata for a Codex member plus member local replay trace in the team-member memory layout.
- Assertions: local replay marker appears; dynamic and MCP tool rows project through member path; mocked native reader is not called.
- Result: Pass.

### VAL4-003: Standalone Codex missing local replay does not recover from native history

- Query: `getRunProjection(runId)`.
- Setup: Codex metadata with platform thread id, no local raw trace file, and mocked native thread containing poison marker.
- Assertions: mocked native reader is not called; poison marker absent; summary and lastActivityAt are null; conversation and activities are empty.
- Result: Pass.

### VAL4-004: Team-member Codex missing local replay does not recover from native history

- Query: `getTeamMemberRunProjection(teamRunId, memberRouteKey)`.
- Setup: team/member Codex metadata with platform thread id, no member raw trace file, and mocked native thread containing poison marker.
- Assertions: mocked native reader is not called; poison marker absent; summary and lastActivityAt are null; conversation and activities are empty.
- Result: Pass.

### VAL4-005: Normal UI source boundary probe

- Probe: deleted-file checks and grep over normal run-history services/API.
- Assertions:
  - `run-projection-provider-registry.ts` absent;
  - `run-projection-merge.ts` absent;
  - `team-member-local-run-projection-reader.ts` absent;
  - no normal service/API imports of native providers, provider registry, projection merge, or team-member local reader bypass.
- Result: Pass.

## Passed

- `cd autobyteus-server-ts && pnpm exec vitest run tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` — passed, 1 file / 4 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` — passed, 7 files / 33 tests.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history` — passed, 22 files / 81 tests.
- `cd autobyteus-web && pnpm exec nuxi prepare && pnpm exec cross-env NUXT_TEST=true vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts stores/__tests__/runHistoryStore.spec.ts --config vitest.config.mts --maxWorkers=1` — passed, 2 files / 48 tests.
- `cd autobyteus-server-ts && pnpm run build` — passed, including shared builds, Prisma generate, `tsc -p tsconfig.build.json`, asset copy, and built-in agents bootstrap smoke check.
- Deleted-file/import probe — passed:
  - `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts` absent;
  - `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts` absent;
  - `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts` absent;
  - no normal service/API imports of native providers, provider registry, merge, or reader bypass.
- `cd /Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls && git diff --check` — passed.

## Failed

None in the final validation state.

## Not Tested / Out Of Scope

- A new external live Electron/Codex process restart was not executed in Round 4. The durable GraphQL E2E covers the normal UI backend boundary using persisted metadata/local replay files and proves no native Codex recovery occurs.
- A live Claude Agent SDK restart was not executed. Integration coverage validates Claude metadata uses the same local memory layout/projection path.
- Broad root `pnpm run typecheck` was not rerun; `pnpm run build` passed for the source build path.

## Blocked

No blockers.

## Cleanup Performed

- No retained temporary validation scaffolding.
- `git diff --check` passed.

## Classification

- Validation classification: `Pass with repository-resident durable validation updated`.
- Failure classification: N/A.

## Recommended Recipient

`code_reviewer`

Reason: API/E2E validation passed, but repository-resident durable GraphQL E2E validation was updated after code review Round 7. Per workflow, this must return to `code_reviewer` for narrow validation-code re-review before delivery resumes.

## Evidence / Notes

- This round supersedes prior source-authority validation. Normal UI display source is now local replay only for all runtimes.
- The updated GraphQL E2E directly proves both local-present and local-absent behavior at the UI-facing backend fields.
- The native Codex mock is deliberately a poison source; passing assertions show it is not called and not merged.
- Intentional residual behavior recorded: older/missing local histories can show empty/incomplete projection by design.
- Branch tracking during validation: `ahead 2, behind 4` relative to `origin/personal`; delivery should perform the normal integration refresh after code review accepts the updated validation.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation confirms the current Round 4 local-only display-source implementation. Durable GraphQL E2E changed, so the cumulative package is routed back to code review before delivery.
