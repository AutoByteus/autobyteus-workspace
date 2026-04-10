# Code Review

## Stage 8 Status

- Ticket: `artifact-edit-file-external-path-view-bug`
- Review Round: `11`
- Reviewed At: `2026-04-10 07:53:54 CEST`
- Decision: `Pass`
- Classification: `Local Fix resolved`

## Prior Findings Resolution

- Round `1` reported `Pass / None`, but that result was superseded by the later independent rerun against the final worktree state.
- `CR-01` is resolved in Round `3`:
  - `recordTouchedPath()` now stages the new path in the shared in-memory set and routes manifest persistence through a per-manifest promise queue.
  - overlapping touched-path events can no longer finish out of order and move `artifact_paths.json` backward.
  - focused Stage 7 rerun evidence now includes a fresh-service regression that holds the first `writeFile()` open and proves both paths survive on disk after both calls complete.
- `CR-02` is resolved in Round `5`:
  - `RunFileChangeProjectionService` now routes active-run reads through `RunFileChangeService.getProjectionForRun()` instead of bypassing the owner with direct `projection.json` disk reads.
  - the new regression in `tests/unit/run-history/services/run-file-change-projection-service.test.ts` blocks the `available` persist and proves active reads still see the fresh in-memory entry/content before disk persistence completes.
- `CR-03` and `CR-04` are resolved in Round `7`:
  - `ArtifactContentViewer` now treats pending, failed, deleted, and unsupported-preview states explicitly instead of collapsing them into deleted or broken preview behavior.
  - `/runs/:runId/file-change-content` now distinguishes missing (`404`), pending (`409`), and unsupported non-text preview (`415`) states.
  - `RunFileChangeService` no longer snapshots unsupported non-text file changes as UTF-8 strings.
- Round `8` reports two new issues:
  - `CR-05`: active-run file-change hydration drops buffered `write_file` content because the GraphQL file-change shape omits `content`, so reopened/recovered live runs cannot re-render in-flight buffered writes from the backend-owned projection.
  - `CR-06`: failed `write_file` rows still render their buffered draft content as if it were the committed file because the viewer treats every non-available `write_file` row as a buffered-preview case before it checks for failure.
- `CR-05` and `CR-06` are resolved in Round `9`:
  - `getRunFileChanges` now exposes inline `content`, and the frontend query requests it so active-run reopen/recovery can hydrate buffered `write_file` rows from the authoritative backend-owned projection.
  - failed `write_file` rows now clear buffered content at the backend owner, the frontend store applies explicit `null` content updates instead of preserving stale drafts, and the viewer limits buffered rendering to `streaming`/`pending` writes only.
- Round `10` reports one new issue:
  - `CR-07`: `openAgentRun()` treats any existing live file-change row as proof that the active run is already fully hydrated, so `KEEP_LIVE_CONTEXT` skips the authoritative projection load whenever the store is non-empty. Because live streaming only supplies future updates, reopened active runs can keep an incomplete artifact list when earlier file changes were not already present in the browser store.
- `CR-07` is resolved in Round `11`:
  - `openAgentRun()` now uses an explicit `mergeHydratedRunFileChanges()` path for `KEEP_LIVE_CONTEXT` instead of using store emptiness as a hydration-completeness proxy.
  - `RunFileChangesStore` now owns a projection-merge action that fills missing authoritative rows while preserving newer live rows by `updatedAt`.
  - focused frontend regressions now cover both the store merge semantics and the active subscribed reopen branch.

## Changed Source Scope

- Source files reviewed:
  - `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`
  - `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`
  - `autobyteus-server-ts/src/api/rest/run-file-changes.ts`
  - `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/services/runHydration/runContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
  - `autobyteus-web/stores/runFileChangesStore.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
- Supporting test files reviewed:
  - `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts`
  - `autobyteus-server-ts/tests/unit/api/rest/run-file-changes.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts`
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
  - `autobyteus-web/stores/__tests__/runFileChangesStore.spec.ts`
  - `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts`
- Effective changed source file size check:
  - every touched source implementation file remains below the Stage 8 `<=500` effective-line limit.
- Delta pressure check:
  - Round `7` is a focused rerun on the Local Fix, but it re-checks the full live-viewer/content spine because the bugs sat on the user-visible contract edge.

## Findings

- None in the reviewed Local Fix scope.

## Review Scorecard

| Category | Score | Why | Weakness | Improvement |
| --- | --- | --- | --- | --- |
| `1. Data-Flow Spine Inventory and Clarity` | `9.2` | The active-run reopen spine is now complete again: server query -> explicit merge hydration path -> store projection -> viewer state. | The design still intentionally keeps separate query and REST content boundaries. | Consolidate only if a future scope wants one universal content read surface. |
| `2. Ownership Clarity and Boundary Encapsulation` | `9.1` | The coordinator no longer infers hydration completeness from local store state; it delegates to an explicit merge path. | The merge policy still lives in the browser store rather than a dedicated domain service. | Accept in current frontend-owned scope. |
| `3. API / Interface / Query / Command Clarity` | `9.2` | The new `mergeHydratedRunFileChanges()` helper makes active-run reopen semantics explicit instead of relying on hidden emptiness heuristics. | None material in the reviewed Local Fix scope. | None required. |
| `4. Separation of Concerns and File Placement` | `9.1` | The merge contract landed in the file-change hydration/store boundary and the coordinator only selects which hydration path to use. | None material in the reviewed Local Fix scope. | None required. |
| `5. Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | `9.1` | The shared row model remains coherent, and the merge behavior is now owned once in the file-change store instead of being improvised in the open coordinator. | None material in the reviewed Local Fix scope. | None required. |
| `6. Naming Quality and Local Readability` | `9.0` | `mergeHydratedRunFileChanges()` and `mergeRunProjection()` describe the new behavior directly. | None material in the reviewed Local Fix scope. | None required. |
| `7. Validation Strength` | `9.2` | Focused regressions now cover both sides of the merge contract: preserving newer live rows and filling missing historical rows through the active subscribed reopen branch. | No packaged Electron rerun was executed for this frontend-only fix. | Rebuild only if later UI verification indicates a remaining reopen gap. |
| `8. Runtime Correctness Under Edge Cases` | `9.2` | The reopen path no longer depends on an empty store and now behaves correctly when local browser state is partial but newer live updates already exist. | There is still no desktop end-to-end recovery rerun in this round. | Add only if later user verification indicates a gap. |
| `9. No Backward-Compatibility / No Legacy Retention` | `9.5` | The Local Fix keeps the server-owned file-change model and does not reintroduce filesystem or workspace fallback logic. | None material in the reviewed scope. | None required. |
| `10. Cleanup Completeness` | `9.0` | The fix removed the emptiness heuristic instead of layering another conditional on top of it. | None material in the reviewed scope. | None required. |

## Overall

- Overall `/10`: `9.2`
- Overall `/100`: `92`
- Stage 8 clean-pass threshold check:
  - every mandatory category is `>= 9.0`
- Priority-ordered findings:
  - None
