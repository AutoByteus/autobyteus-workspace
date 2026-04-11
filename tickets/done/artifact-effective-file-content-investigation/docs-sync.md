# Docs Sync Report

## Scope

- Ticket: `artifact-effective-file-content-investigation`
- Trigger: `Latest authoritative code review passed on 2026-04-11; long-lived docs sync completed before the user-verification hold`

## Why Docs Were Updated

- Summary:
  - The final implementation moved the Artifacts experience onto one run-scoped file-change model for `write_file`, `edit_file`, and generated outputs.
  - The durable runtime truth is now metadata-only persistence in `file_changes.json` plus current-byte preview serving from `/runs/:runId/file-change-content`.
  - Several long-lived docs still reflected the older split ownership model, copied-media artifact path, or the removed legacy projection semantics.
- Why this should live in long-lived project docs:
  - The final architecture crosses frontend rendering, backend persistence, streaming, and preview-serving boundaries.
  - Future work on Artifacts, run history, or media/file rendering would start from obsolete assumptions if these docs stayed stale.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Canonical frontend/runtime doc for the Artifacts tab. | `Updated` | Aligned the tab with the unified run-file-change model and documented the clean cut to `file_changes.json`. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Streaming architecture doc needed to reflect the current event/store owner. | `Updated` | Documented `FILE_CHANGE_UPDATED` + `runFileChangesStore` as the Artifacts path and marked `ARTIFACT_*` as inert compatibility traffic on the client. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Server module doc previously described the pre-unification artifact path. | `Updated` | Repointed the module to the run-file-changes subsystem and clarified that `ARTIFACT_*` is off-spine compatibility noise. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature doc for preview serving needed the final server-side boundary and storage semantics. | `Updated` | Rewrote the serving flow around `FILE_CHANGE_UPDATED`, `/runs/:runId/file-change-content`, and metadata-only persistence. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Media/file serving doc needed to distinguish managed-media storage from Artifacts preview serving. | `Updated` | Removed the deleted tool-result media-copy path from the active Artifacts description. |
| `autobyteus-web/GEMINI.md` | Developer-facing doc catalog was reviewed for summary accuracy. | `No change` | Its Artifacts summary already remained accurate once the detailed docs were updated. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Design doc still mentions `ARTIFACT_*`; it needed a truth check after the clean cut. | `No change` | It remains accurate because Codex converters still emit those compatibility events even though the client no longer depends on them. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Architecture rewrite + storage clarification | Documented the unified file-change/output model, current-byte preview route, and explicit no-legacy `projection.json` clean cut. | This is the main long-lived product/runtime description for the Artifacts tab. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Streaming ownership update | Replaced the old artifact-sidecar description with the `FILE_CHANGE_UPDATED` -> `runFileChangesStore` path and compatibility-noise treatment for `ARTIFACT_*`. | Future streaming changes need the correct runtime spine. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Module ownership rewrite | Replaced deleted tool-result processor ownership with the live run-file-changes service, projection service, and run-scoped preview route. | The previous server module doc preserved obsolete owners and routing. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature design rewrite | Reframed listing/reopen/preview semantics around canonical path indexing, `file_changes.json`, and `/runs/:runId/file-change-content`. | The old feature doc no longer matched implementation behavior after unification. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Boundary clarification | Split managed media storage/URLs from run-scoped Artifacts preview serving and removed the deleted tool-result media-copy processor from the active description. | This prevents media-pipeline docs from preserving the removed Artifacts path. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Unified Artifacts ownership | `write_file`, `edit_file`, and generated outputs now share one run-scoped file-change model rather than split file-change vs artifact stores. | `requirements.md`, `implementation-plan.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Preview source of truth | Persisted JSON stores metadata only; previews read current filesystem bytes through `/runs/:runId/file-change-content`. | `requirements.md`, `implementation-plan.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| No-legacy storage rule | `file_changes.json` is the only supported persisted source; legacy-only `run-file-changes/projection.json` runs are unsupported by design and behavior. | `requirements.md`, `implementation-plan.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Compatibility-noise boundary | `ARTIFACT_*` may still appear from some runtimes, but the current client ignores them and uses `FILE_CHANGE_UPDATED` as the authoritative Artifacts event. | `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Managed media vs Artifacts preview serving | Conversation/media URL transformation is separate from run-scoped artifact preview serving and should not be conflated. | `requirements.md`, `implementation-plan.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `run-file-changes/projection.json` persistence + fallback reading | Canonical metadata-only `<run-memory-dir>/file_changes.json` with no production fallback | `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Separate frontend generated-output artifact store path (`agentArtifactsStore`) for the Artifacts tab | Unified `runFileChangesStore` fed by `FILE_CHANGE_UPDATED` | `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Tool-result copied-media artifact path for Artifacts previewing | Run-scoped file-change indexing plus `/runs/:runId/file-change-content` current-byte serving | `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes:
  - Long-lived docs now match the final reviewed implementation state.
  - The ticket is ready for user verification hold; no archival, commit, push, merge, or release work has started.
