# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/requirements.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/investigation-notes.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-spec.md
- Design-impact layout/session note: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-impact-worktrace-layout-simplification.md
- Design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-review-report.md
- Prior code review report: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/code-review-report.md
- API/E2E coverage investigation addendum: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/api-e2e-coverage-investigation.md
- API/E2E execution coverage addendum: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/api-e2e-execution-coverage-report.md

## What Changed

Implemented the self-evolution companion/work-trace redesign for the backend manual Self Improve path.

- Replaced prompt-inlined one-shot self-evolver execution with file-based work trace projection plus a persistent companion session path.
- Added self-evolution work trace domain models, source reading, redaction, rendering, flat file storage, and on-trigger `ensureCurrent()` projection.
- Added target-scoped evolver session persistence with active reuse, restore/resume when supported, and replacement-on-unavailable behavior that records prior evolver run IDs and work-trace continuity metadata.
- Updated `SelfEvolutionService` to remain the public use-case boundary while sequencing click-time settings, target/skill resolution, work trace catch-up, companion activation/reuse, trigger delivery, and request record finalization.
- Removed manual self-evolution launch overrides and `selfEvolutionEffective` metadata from agent run/team run/member launch/config/GraphQL paths.
- Added and registered a required-on-startup app-data migration to remove stale `selfEvolutionEffective` fields from standalone run metadata and recursive team member metadata.
- Removed obsolete one-shot inline evidence/projector/strategy source files and their obsolete tests.

## Key Files Or Areas

- Work trace domain/projection:
  - `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts`
  - `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts`
  - `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts`
  - `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts`
  - `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts`
  - `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts`
- Companion lifecycle:
  - `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts`
  - `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts`
  - `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts`
  - `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts`
  - `autobyteus-server-ts/src/self-evolution/services/companion/companion-run-completion-watcher.ts`
- Public self-evolution orchestration:
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-eligibility-evaluator.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-effective-config-resolver.ts`
- Launch metadata simplification:
  - `autobyteus-server-ts/src/agent-execution/**`
  - `autobyteus-server-ts/src/agent-team-execution/**`
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/run-history/store/*metadata*`
- Migration:
  - `autobyteus-server-ts/src/app-data-migrations/migrations/remove-self-evolution-run-metadata-migration.ts`
  - `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
- Tests:
  - `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts`
  - `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts`
  - `autobyteus-server-ts/tests/self-evolution/remove-self-evolution-run-metadata-migration.test.ts`
  - updated existing self-evolution service/GraphQL/effective-config tests.

## Important Assumptions

- Correctness is on-trigger: every Self Improve request calls `ensureCurrent()` before sending the companion trigger. The optional background update worker was not implemented in this pass.
- Companion continuity policy is user-triggered active-reuse first, runtime restore/resume when available, then replacement-with-continuity-metadata if the stored evolver run cannot be restored. Previous work-trace paths and last request metadata are carried forward.
- The companion still uses existing file/tool capability to read work trace paths. A dedicated read-only work-trace tool remains a future hardening item.
- Existing self-evolution request records keep `effectiveConfig` for per-request audit. Launch metadata and launch inputs no longer carry manual-click self-evolution policy.

## Known Risks

- Companion completion waiting remains event-based and bounded by the same default timeout model as the former one-shot strategy. Runtime-specific event behavior should receive downstream executable coverage.
- Large work trace files are preserved semantically by default; future redaction/noise controls may still be needed.
- Work trace access still relies on broad file/tool capability rather than a self-evolution-specific read-only tool.
- The optional update worker was intentionally not included, so near-automatic freshness between clicks is not present beyond the guaranteed on-trigger catch-up path.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement / Behavior Change / Refactor
- Reviewed root-cause classification: Boundary Or Ownership Issue + Shared Structure Looseness
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation keeps `SelfEvolutionService` as the public boundary and separates raw trace source access, work trace rendering/storage/projection, companion lifecycle, and app-data migration cleanup. No design-impact gap was encountered.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes
- Notes: The former inline evidence builder, bounded work-history projector, and one-shot single-agent evolver strategy were removed. The companion session service was split with separate trigger-message and completion-watcher files; the remaining session file is under 500 lines after split.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in the worktree because dependencies were absent after the machine shutdown/worktree restore.
- No package or lockfile changes were produced by the install.
- `pnpm -C autobyteus-server-ts typecheck` currently fails on existing repository `TS6059` rootDir/include mismatch for tests under `tests/**`; source build/typecheck was validated with the build config instead.

## Local Implementation Checks Run

- `pnpm install --frozen-lockfile` — pass
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — pass
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass
- `pnpm -C autobyteus-server-ts test tests/self-evolution --run` — pass (9 files, 17 tests)
- `pnpm -C autobyteus-server-ts test tests/self-evolution tests/unit/run-history/store/agent-run-metadata-store.test.ts --run` — pass (10 files, 19 tests)
- `pnpm -C autobyteus-server-ts build` — pass
- `git diff --check` — pass
- `pnpm -C autobyteus-server-ts typecheck` — failed due existing `TS6059` test/rootDir configuration issue, not due changed source.

## Downstream Coverage Hints / Suggested Scenarios

- First click for an existing active target with archived + active raw traces creates work trace files and manifest, then sends only paths to the companion.
- Second click reuses the active companion run and re-runs `ensureCurrent()` before sending the new trigger.
- Companion missing/dead path attempts restore when supported; if restore cannot recover an active run, it marks prior state unavailable, creates a replacement, persists prior evolver run IDs, and carries prior work-trace/last-request metadata.
- Work trace content renders user/worker/tool blocks with timestamps and merged tool results while excluding backend-only fields.
- GraphQL run/team launch inputs should not expose `selfEvolution`; manual eligibility should use current global settings.
- App-data migration should remove stale `selfEvolutionEffective` in standalone and nested team member metadata and create backups.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E and broader executable coverage investigation/execution remain required and are owned by `api_e2e_engineer` after code review. This implementation handoff records only implementation-scoped build/unit checks.

## Code Review Local Fix Round 1 — CR-001

Code reviewer reported CR-001: `CompanionRunCompletionWatcher.fail()` recorded the failure but did not notify/reject pending waiters, so an error event after `waitForCompletion()` registration could hang until timeout and be misclassified as a timeout.

Fix applied:
- `companion-run-completion-watcher.ts` now calls `notifyWaiters()` from `fail(error)`, immediately rejecting pending waiters and clearing their timers.
- Added `tests/self-evolution/companion-run-completion-watcher.test.ts` covering both pending waiter + `AgentRunEventType.ERROR` and pending waiter + `statusHint: "ERROR"` rejection before timeout.
- Added service integration coverage that a companion runtime failure thrown by `postSelfImproveRequest()` is recorded as `failed` through the existing `SelfEvolutionService` catch/fail-record path, not as `timed_out`.

Additional local implementation checks after CR-001 fix:
- `pnpm -C autobyteus-server-ts test tests/self-evolution/companion-run-completion-watcher.test.ts tests/self-evolution/self-evolution-service.integration.test.ts --run` — pass (2 files, 6 tests)
- `pnpm -C autobyteus-server-ts test tests/self-evolution --run` — pass (10 files, 20 tests)
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass
- `pnpm -C autobyteus-server-ts build` — pass
- `git diff --check` — pass

## API/E2E Local Fix Round 1 — Frontend Launch-Time Self-Evolution Removal

API/E2E live browser validation reported that the backend schema correctly no longer accepts `CreateAgentRunInput.selfEvolution`, but the frontend still sent `selfEvolution: config.selfEvolution ?? null` from `autobyteus-web/stores/agentRunStore.ts`, causing a live launch failure before target-agent startup.

Requirements/design re-check:
- `requirements.md` REQ-011: manual Self Improve eligibility is click-time from global self-evolution settings plus current target state, not run launch config or stored snapshots.
- `requirements.md` REQ-012 and AC-009: agent run, team run, and team member launch inputs/metadata must not carry self-evolution configuration for the manual-click companion model.
- `design-spec.md` Configuration / Eligibility Simplification: per-run/per-member `selfEvolution` launch overrides are removed; effective settings stay in `SelfEvolutionRunRecord` only for actual self-evolution requests.
- Conclusion: no clarification route was needed; the frontend launch-time eligibility UI shown in the API/E2E screenshot was stale and contradicted the requirements.

Fix applied:
- Removed stale `selfEvolution` from `PrepareAgentRun` variables in `autobyteus-web/stores/agentRunStore.ts`.
- Removed stale `selfEvolution` from `CreateAgentTeamRun` variables in `autobyteus-web/stores/agentTeamRunStore.ts`.
- Removed launch-time self-evolution fields from frontend run/team/member config types, defaults, member-config materialization, and temporary team member context construction.
- Removed the launch configuration UI controls for standalone run self-evolution eligibility, team default eligibility, and member self-evolution overrides.
- Removed obsolete launch-time localization keys and updated related frontend tests.
- Updated generated GraphQL type declarations to stop exposing `selfEvolution` on agent/team/member launch input shapes.
- Preserved the global settings/capability UI and the click-time Self Improve CTA path.

Additional local implementation checks after API/E2E local fix:
- `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentRunStore.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts` — pass (4 files, 48 tests)
- `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentTeamRunStore.spec.ts` — pass (1 file, 19 tests)
- `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run localization/messages/__tests__/workspaceHistorySelfEvolutionCleanup.spec.ts components/settings/__tests__/SelfEvolutionFeatureToggleCard.spec.ts components/workspace/self-evolution/__tests__/SelfEvolutionComposerCta.spec.ts` — pass (3 files, 10 tests)
- `git diff --check` — pass
- `pnpm -C autobyteus-web exec nuxi typecheck` — failed due broad existing frontend typecheck debt across unrelated build scripts/tests/stores/components (for example `build/scripts/afterPack.ts` type-only imports, missing `~/stores/agents`, pre-existing test wrapper typing issues, missing `@vue/apollo-composable` declarations). No self-evolution launch-input or changed-source-specific error was identified in the visible output.

## Design-Impact Rework Round 2 — Target-Memory-Scoped Flat Work Trace Layout

Architecture re-review Round 2 passed the design-impact correction in `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-impact-worktrace-layout-simplification.md`.

Required correction implemented:
- Replaced over-nested work trace storage under `<memoryDir>/self_evolution/targets/<targetKey>/work_traces/` with `<memoryDir>/self_evolution/work_traces/`.
- Replaced over-nested companion state under `<memoryDir>/self_evolution/targets/<targetKey>/companion.json` with `<memoryDir>/self_evolution/companion.json` for the Round 2 design; this filename was superseded by the later user-approved evolver-session correction below.
- Removed `buildSelfEvolutionTargetKey`, `safeKey`, and `targetKey` from self-evolution source/domain path ownership.
- Removed persisted/package/session `targetKey` fields from work trace manifest/package and evolver session state; structured `target` remains in manifest/state for audit.
- Kept the projection summary hash, but now hashes the structured `target` object plus source fingerprints privately rather than a visible path key.
- Updated work trace projection/session tests to assert the flat paths and absence of `targetKey`; updated service integration mocks and self-evolution docs.
- No compatibility read/write fallback for partially generated old-path data was added, matching the reviewed clean-cut correction.

Files updated in this round:
- `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts`
- `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts`
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts`
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts`
- `autobyteus-server-ts/docs/modules/self_evolution.md`

Additional local implementation checks after layout rework:
- `pnpm -C autobyteus-server-ts test tests/self-evolution/self-evolution-work-trace-projection-service.test.ts tests/self-evolution/self-evolution-companion-session-service.test.ts tests/self-evolution/self-evolution-service.integration.test.ts --run` — pass (3 files, 10 tests)
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass
- `pnpm -C autobyteus-server-ts test tests/self-evolution --run` — pass (10 files, 23 tests)
- `pnpm -C autobyteus-server-ts build` — pass
- `git diff --check` — pass

Implementation note:
- Repository/ticket artifacts that intentionally document the old observed API/E2E failure path still contain `self_evolution/targets/...` as historical evidence. Product/source implementation, tests, and source docs now use the corrected flat target-memory-scoped layout.


## Design-Impact Rework Round 3 — Evolver Session State Naming And Restore Path

Fresh/full architecture review passed after user-approved storage/session refinements. The latest authoritative review requires persisted state to be named and treated as backend evolver session/checkpoint state, not work-trace content and not the evolver's full memory.

Required correction implemented:
- Renamed the persisted state file from `<memoryDir>/self_evolution/companion.json` to `<memoryDir>/self_evolution/evolver_session.json`.
- Renamed the persisted-state domain/store files to `domain/evolver-session.ts` and `self-evolution-evolver-session-store.ts`; service-level `companion` wording remains only for the runtime relationship and existing service boundary.
- Renamed persisted state fields from `currentCompanionRunId` / `priorCompanionRunIds` to `currentEvolverRunId` / `priorEvolverRunIds`.
- Kept work traces under `<memoryDir>/self_evolution/work_traces/` with `work_traces_manifest.json`, numbered `work_trace_*.md`, and `work_trace_active.md`; no `targets/<targetKey>` or hash-suffixed path segments are used.
- Preserved structured `target` data in evolver session state and work-trace manifests for audit without persisting `targetKey` / `safeKey`.
- Added a user-triggered restore/resume attempt before replacement when the stored evolver run is no longer active and the runtime service exposes `restoreAgentRun`. If restore succeeds, the click reuses the restored evolver; if restore is unsupported or fails, the service creates a replacement with continuity metadata.
- No autonomous restart worker was added; restore/replacement remains on the manual Self Improve request path only.
- Updated source docs and focused tests for the `evolver_session.json` path, state field names, no `targets/` directory, and restore-before-replacement behavior.

Files updated in this round:
- `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts`
- `autobyteus-server-ts/docs/modules/self_evolution.md`

Additional local implementation checks after evolver-session rework:
- `pnpm -C autobyteus-server-ts test tests/self-evolution/self-evolution-companion-session-service.test.ts --run` — pass (1 file, 4 tests)
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass
- `pnpm -C autobyteus-server-ts test tests/self-evolution --run` — pass (10 files, 24 tests)
- `pnpm -C autobyteus-server-ts build` — pass
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentRunStore.spec.ts` — pass (4 files, 48 tests)
- `git diff --check` — pass


## Code Review Local Fix Round 6 — CR-002 / CR-003

Fresh/full Round 6 code review reported two remaining legacy-retention issues in self-evolution domain models/config source normalization.

Fix applied:
- Removed obsolete unused `SelfEvolutionEvidencePackage` from `autobyteus-server-ts/src/self-evolution/domain/models.ts`. This removes the old inline/digest-era `anonymizedWorkHistory`, `feedbackSignals`, and `privacyWarnings` shape that contradicted the work-trace redesign.
- Tightened `SelfEvolutionConfigSource` to the only remaining click-time/global source value: `"default"`.
- Tightened `isSelfEvolutionConfigSource()` in `autobyteus-server-ts/src/self-evolution/domain/config.ts` so removed launch-time source values (`agent_run_launch`, `team_run_launch`, `team_member_run_launch`) are no longer accepted.
- Verified no source/test/doc/frontend references remain for `SelfEvolutionEvidencePackage`, the old evidence-package fields, or the removed launch-time source values.

Additional local implementation checks after CR-002/CR-003 fix:
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — pass
- `pnpm -C autobyteus-server-ts test tests/self-evolution --run` — pass (10 files, 24 tests)
- `pnpm -C autobyteus-server-ts build` — pass
- `git diff --check` — pass
