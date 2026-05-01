# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-review-report.md`
- Design rework log: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-rework-log.md`

## What Changed

- Added durable nullable `archivedAt` metadata for stored agent runs and team runs.
- Added backend `archiveStoredRun(runId)` and `archiveStoredTeamRun(teamRunId)` service APIs and GraphQL mutations.
- Implemented service-owned archive ID safety checks before metadata read/write for empty, draft/temp, absolute, traversal-like, separator-containing, and resolved-out-of-root IDs.
- Updated default backend list services to hide archived inactive agent/team history while keeping archived active rows visible.
- Kept archive non-destructive: archive writes metadata only and does not remove run/team directories or index rows.
- Tightened metadata normalization to preserve `applicationExecutionContext` during archive writes.
- Added frontend archive mutation documents, store actions, shared local cleanup actions, row pending state, archive buttons, localization keys, and generated GraphQL type/doc artifacts.
- Added focused backend and frontend unit coverage for archive persistence, safe IDs, active rejection, list filtering, local cleanup, and UI action behavior.

## Key Files Or Areas

- Backend metadata:
  - `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts`
  - `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts`
- Backend archive/list services:
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- Backend GraphQL:
  - `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
- Frontend GraphQL/state/UI:
  - `autobyteus-web/graphql/mutations/runHistoryMutations.ts`
  - `autobyteus-web/generated/graphql.ts`
  - `autobyteus-web/stores/runHistoryTypes.ts`
  - `autobyteus-web/stores/runHistoryMutationActions.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`
  - `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/localization/messages/en/workspace.generated.ts`
  - `autobyteus-web/localization/messages/zh-CN/workspace.generated.ts`
- Tests:
  - `autobyteus-server-ts/tests/unit/run-history/store/agent-run-metadata-store.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/store/team-run-metadata-store.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-service.test.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`

## Important Assumptions

- No archived-list or unarchive UI is included in this slice; archived records remain recoverable on disk and through future APIs.
- Existing records without `archivedAt` are visible by default through normalization to `null`.
- Re-archiving an already archived row preserves the existing `archivedAt` timestamp rather than replacing it.
- Frontend generated GraphQL artifacts were updated manually in-repo because local codegen requires a live backend schema URL.

## Known Risks

- Users can archive but cannot unarchive from UI until a follow-up archived-history surface exists.
- The default frontend typecheck currently reports many unrelated baseline errors; targeted tests and guards pass for the changed surface.
- GraphQL codegen should be regenerated against a running updated backend during broader validation/finalization if that is part of release workflow.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / behavior change.
- Reviewed root-cause classification: Missing invariant plus shared structure looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, bounded local refactor.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes:
  - Archive is durable `archivedAt` metadata, not index deletion or frontend-only hiding.
  - History services own active checks, list filtering, archive timestamp writes, and pre-metadata safe identity/path checks.
  - Metadata stores preserve `applicationExecutionContext` and normalize missing `archivedAt` to `null`.
  - Frontend cleanup was extracted into `runHistoryMutationActions.ts` so archive and delete reuse one cleanup policy.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — no frontend-only archive list, soft-delete flag, or index-row archive path was introduced.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` — explicit agent/team archive mutations and one `archivedAt` field only.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` — `runHistoryStore.ts` was kept at 421 effective non-empty lines by extracting mutation cleanup/actions.
- Notes: Generated GraphQL output is larger than source guardrails but is generated artifact surface, not source implementation logic.

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` was run in the task worktree to create local `node_modules`; lockfile did not change.
- `pnpm -C autobyteus-web exec nuxi prepare` was needed to create `.nuxt/tsconfig.json` before running frontend tests.
- `pnpm -C autobyteus-server-ts run prepare:shared` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` were needed before server build/typecheck.

## Local Implementation Checks Run

Passed:

- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/run-history/store/agent-run-metadata-store.test.ts tests/unit/run-history/store/team-run-metadata-store.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/run-history/services/agent-run-history-service.test.ts`
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C autobyteus-server-ts run build:full`
- `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
- `pnpm -C autobyteus-web run guard:localization-boundary`
- `pnpm -C autobyteus-web run audit:localization-literals`
- `pnpm -C autobyteus-web run guard:web-boundary`
- `git diff --check`

Attempted but not used as pass signal due baseline/tooling issues:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` failed because the existing `tsconfig.json` includes `tests` while `rootDir` is `src`, causing TS6059 for many existing test files.
- `pnpm -C autobyteus-web exec nuxi typecheck` failed with many pre-existing unrelated type errors across build scripts, tests, generated GraphQL consumers, browser shell typings, and other stores/components.

## Downstream Validation Hints / Suggested Scenarios

- Direct GraphQL/API mutation calls:
  - archive inactive persisted agent run/team run succeeds and writes `archivedAt`.
  - archive active agent run/team run returns `success=false` and does not write metadata.
  - unsafe IDs (`''`, whitespace, `temp-*`, `../outside`, `/tmp/outside`, `foo/bar`, `foo\\bar`, `.`, `..`) return `success=false` with no metadata access/write.
- Filesystem assertions:
  - archive preserves run/team directories, raw traces, member memory, metadata files, and index rows.
  - permanent delete still removes directories/index rows only through existing delete mutations.
- Default history query:
  - archived inactive rows are absent from `listWorkspaceRunHistory` and do not consume per-agent limit slots.
  - archived active rows remain visible while active.
- Frontend UI:
  - inactive persisted agent/team rows show archive and permanent delete as distinct actions.
  - active rows show terminate, draft rows show draft removal, and neither show archive.
  - archive success removes visible row and clears selected/open context; archive failure leaves row/selection unchanged and shows error toast.

## API / E2E / Executable Validation Still Required

- Full API/GraphQL schema validation and any repository-standard codegen refresh against a running updated backend.
- Browser-level or E2E confirmation that archive buttons render correctly with real history data and the default sidebar refresh hides archived rows after mutation.
- End-to-end disk inspection for archived agent/team runs in a realistic memory directory.
