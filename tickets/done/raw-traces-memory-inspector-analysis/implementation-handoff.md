# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/design-review-report.md`

## What Changed

- Added a backend `RawTraceFileSourceService` under `agent-memory` that owns raw-trace file listing, default/effective file selection, exact filename validation, selected-file reads, sorting, normalization, and per-file limit application.
- Added a shared raw-trace record normalizer so Memory Inspector selected-file reads, existing active/archive modes, and self-evolution work-trace projection use one trace sorting/mapping policy.
- Extended raw-trace archive/store boundaries with exact complete-segment filename helpers, keeping segment path resolution inside `RawTraceArchiveManager` / `RunMemoryFileStore`.
- Extended `AgentMemoryView` domain/GraphQL/frontend shapes with:
  - `rawTraceFiles`
  - `selectedRawTraceFileName`
  - `includeRawTraceFiles`
  - `rawTraceFileName`
- Updated Memory Inspector Raw Traces flow:
  - Opening the raw tab requests raw trace file metadata.
  - Dropdown values are backend-listed file names only.
  - Default/effective selection is returned by the backend and stored by the frontend.
  - Selecting a file refetches only that file's records.
- Preserved existing non-inspector merged-corpus behavior through `includeArchive` when selected-file mode is not requested.
- Refactored self-evolution `RawTraceWorkTraceSourceReader` to use `RawTraceFileSourceService` for source discovery/reading while preserving source path, source id/display name shape, record counts, timestamps, and fingerprint behavior.
- Updated targeted backend/frontend unit tests, frontend localization entries, and manually aligned generated GraphQL artifacts for the changed memory-view query shape.

## Key Files Or Areas

- Backend domain/service:
  - `autobyteus-server-ts/src/agent-memory/domain/models.ts`
  - `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts`
- Store/archive boundaries:
  - `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
  - `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
- GraphQL:
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts`
- Frontend:
  - `autobyteus-web/graphql/queries/memoryViewQueries.ts`
  - `autobyteus-web/stores/memoryInspectorStore.ts`
  - `autobyteus-web/components/memory/MemoryInspector.vue`
  - `autobyteus-web/components/memory/RawTracesTab.vue`
  - `autobyteus-web/types/memory.ts`
  - `autobyteus-web/generated/graphql.ts`
  - `autobyteus-web/localization/messages/en/memory.ts`
  - `autobyteus-web/localization/messages/zh-CN/memory.ts`

## Important Assumptions

- `rawTraceFileName` is a selector, not a path. Backend exact-matches it against `raw_traces.jsonl` when active exists or complete manifest `file_name` entries.
- Active `raw_traces.jsonl` remains the default when present; otherwise the newest complete segment is selected by the inspector ordering.
- Dropdown ordering is active first, then complete segments newest-to-oldest by `segmentIndex`.
- Pending/incomplete manifest segments are intentionally excluded from `rawTraceFiles`.
- Existing `includeArchive` merged-corpus mode is still intentional for non-inspector projection/recovery callers and was not treated as legacy.

## Known Risks

- Active-file dropdown count currently counts non-empty JSONL lines by reading the active file. This avoids parsing the active file just to count, but still performs a full active-file read for metadata. Selected-file reads still parse and sort the selected file before applying `rawTraceLimit`, matching existing semantics.
- `autobyteus-web/generated/graphql.ts` was manually aligned because the repository codegen workflow expects a live backend GraphQL URL. Downstream API/E2E should regenerate against a running updated backend if that is part of its coverage setup.
- Full repository/server typecheck commands expose pre-existing/baseline configuration issues; see checks below. Source-only server build typecheck passed after Prisma generation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change / Small Feature
- Reviewed root-cause classification: Missing Invariant plus Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, small targeted refactor around raw-trace file source ownership
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Implemented one agent-memory raw-trace file source boundary; GraphQL and UI remain transport/presentation only; Memory Inspector never constructs paths or segment filename patterns; self-evolution source discovery now reuses the shared service.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: No physical raw trace file rename or fallback wrapper was introduced. Self-evolution-local manifest/path discovery was removed in favor of the new shared service. Existing `includeArchive` corpus mode remains as an intentional separate behavior, not compatibility fallback.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in the task worktree to provision dependencies; lockfile was unchanged.
- Ran `pnpm -C autobyteus-web exec nuxt prepare` to generate `.nuxt/tsconfig.json` before frontend unit tests.
- Ran Prisma generation before source-only server build typecheck.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/api/graphql/converters/memory-view-converter.test.ts tests/unit/api/graphql/types/memory-view-types.test.ts tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` — Passed (4 files, 11 tests).
- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-memory/agent-memory-service.test.ts tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` — Passed after final active-read adjustment (2 files, 9 tests).
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed.
- `pnpm -C autobyteus-web exec vitest --run tests/stores/memoryInspectorStore.test.ts components/memory/__tests__/RawTracesTab.spec.ts` — Passed (2 files, 6 tests).
- `pnpm -C autobyteus-web run guard:web-boundary` — Passed.
- `pnpm -C autobyteus-web run guard:localization-boundary` — Passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — Passed with zero unresolved findings; emitted existing module-type warning for localization audit script.
- `git diff --check` — Passed.

Attempted broader checks with baseline issues:

- `pnpm -C autobyteus-server-ts run typecheck` — Failed before implementation-specific type errors because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many test files.
- `pnpm -C autobyteus-web exec vue-tsc --noEmit` — Could not run because `vue-tsc` is not installed.
- `pnpm -C autobyteus-web exec tsc -p .nuxt/tsconfig.json --noEmit` — Failed with existing broad frontend type/declaration issues across unrelated tests/components/stores and missing `@vue/apollo-composable` declarations.

## Downstream Coverage Hints / Suggested Scenarios

- Query an active-only run with `includeRawTraces: true`, `includeRawTraceFiles: true`; verify `rawTraceFiles = [raw_traces.jsonl]`, `selectedRawTraceFileName = raw_traces.jsonl`, and active records render.
- Query a segmented run with active + complete segments + pending segment; verify active first, complete segments newest-to-oldest, pending hidden.
- Select `raw_traces_000001.jsonl`; verify only that segment's records are returned and active records are absent.
- Send an invalid `rawTraceFileName` such as an absolute path; verify backend falls back to default and does not read the invalid path.
- Verify imported/read-only memory source resolves the same selector behavior.
- Verify existing `includeArchive: true` callers still receive the merged active+complete corpus when selected-file mode is not requested.
- Regenerate or validate GraphQL generated frontend types against a running updated backend if downstream setup includes the live codegen path.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E coverage investigation and execution remain downstream-owned by `api_e2e_engineer` after code review.
