# Docs Sync Report

## Scope

- Ticket: `publish-artifact-simplification`
- Trigger: Authoritative implementation review round `6` and authoritative API/E2E validation round `7` are the latest `Pass` state on `2026-04-22`, and the user explicitly verified the local Electron build before finalization.
- Bootstrap base reference: `origin/personal`
- Integrated base reference used for docs sync: `origin/personal @ 4f58a9f8466b1d2dcf539528bd5ce8ef5c4fc5f2`
- Post-integration verification reference: No new base commits were integrated because the ticket branch already matched `origin/personal` at `4f58a9f8466b1d2dcf539528bd5ce8ef5c4fc5f2`; the latest authoritative proof is `review-report.md` round `6` (`Pass`) plus `validation-report.md` round `7` (`Pass` after rechecking `VAL-PA-013`, rebuilding `applications/brief-studio` and `autobyteus-server-ts`, relaunching a fresh live backend/frontend stack, verifying `import('./app.js')` now succeeds, and creating a fresh brief through the real Brief Studio UI confirmed by mounted backend `BriefsQuery`).

## Why Docs Were Updated

- Summary: Long-lived docs were updated to describe the final simplified `publish_artifact` contract, the durable published-artifact runtime boundary, the removal of legacy application-journal artifact semantics, and the intentional separation between published artifacts and the current file-change-backed web Artifacts tab.
- Why this should live in long-lived project docs: These are durable runtime, application-framework, and UI-boundary semantics that future platform and application work will rely on when exposing tools, consuming artifact events, and teaching app-backend authors the supported contracts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex raw-event normalization had to stop teaching `fileChange`-driven artifact events after the ticket removed synthetic artifact semantics from changed-file telemetry. | `Updated` | Records `fileChange` as lifecycle + changed-file availability only. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | The artifact-serving design doc had to keep the current Artifacts tab on run-file-change truth while no longer describing published-artifact events as active client compatibility noise. | `Updated` | Clarifies that published artifacts may exist for application/runtime consumers, but not for the current Artifacts tab. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | The server module doc had to reflect that current clients depend on `FILE_CHANGE_UPDATED`, not on published-artifact transport. | `Updated` | Reframes the note away from `ARTIFACT_*` compatibility language. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | The orchestration module doc still described the deleted application-journal artifact path and old `PublishArtifactInputV1` contract. | `Updated` | Now documents lifecycle-journal-only dispatch plus live artifact relay and runtime-control artifact reads. |
| `autobyteus-web/docs/agent_execution_architecture.md` | The web execution-architecture doc had to stop referencing removed `ARTIFACT_UPDATED` transport and keep published artifacts explicitly out of the current web UI. | `Updated` | Retains `FILE_CHANGE_UPDATED` as the current client-facing artifact/touched-file path. |
| `autobyteus-application-sdk-contracts/README.md` | The shared application-contract README still exported the deleted rich publish-artifact payload mentally and did not mention the new artifact callback/query contract. | `Updated` | Documents `ApplicationPublishedArtifactEvent`, runtime-control artifact reads, and `artifactHandlers.persisted`. |
| `autobyteus-application-backend-sdk/README.md` | The backend SDK README still taught `eventHandlers.artifact`, which is no longer the live artifact-consumption contract. | `Updated` | Replaced the usage example with `artifactHandlers.persisted` and reconciliation-oriented runtime-control guidance. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Event-mapping contract refresh | Removed synthetic `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` teaching from Codex `fileChange` lifecycle documentation and clarified that `turn/diff/updated` is not the owner of changed-file availability. | The implementation now keeps changed-file telemetry and published-artifact publication on separate spines. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Serving-boundary clarification | Reframed the published-artifact section so the current Artifacts tab remains file-change-backed while published artifacts stay available for application/runtime consumers only. | Future readers need the correct distinction between user-visible touched files and explicitly published artifacts. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Module-boundary clarification | Replaced the old compatibility-noise wording with the final rule that current clients depend on `FILE_CHANGE_UPDATED`, not published-artifact events. | Prevents future work from accidentally reviving published-artifact transport as the Artifacts-tab truth source. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Architecture and API update | Removed the deleted application-journal `ARTIFACT` path, documented live `artifactHandlers.persisted` relay plus runtime-control artifact reads, and clarified that lifecycle journals remain `RUN_*` only. | The orchestration doc must match the actual runtime/application boundary now that artifact publication moved to the shared published-artifact subsystem. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming-contract update | Removed the old `ARTIFACT_UPDATED` row and clarified that `ARTIFACT_PERSISTED` remains ignored because published artifacts are not displayed in the current web UI. | Keeps the frontend architecture doc aligned with the current streaming protocol and non-goal. |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract README update | Removed the stale `PublishArtifactInputV1` teaching and added the durable published-artifact callback/query contract guidance. | App/backend authors need the authoritative shared contract in the package README they import. |
| `autobyteus-application-backend-sdk/README.md` | Backend authoring README update | Replaced the outdated `eventHandlers.artifact` example with `artifactHandlers.persisted` and documented revision-based catch-up through runtime control. | The backend SDK README is the first-copy authoring reference for application bundle implementers. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Simplified runtime-wide publish-artifact contract | `publish_artifact` now accepts only `{ path, description? }`, and runtimes must reject legacy fields such as `artifactType` instead of tolerating them. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Published artifacts vs. changed files | Published artifacts are durable runtime/application objects emitted as `ARTIFACT_PERSISTED`, while the current web Artifacts tab still reflects run file changes through `FILE_CHANGE_UPDATED`. | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Application artifact-consumption contract | Applications now receive best-effort live artifact callbacks through `artifactHandlers.persisted` and recover missed deliveries through runtime-control artifact queries keyed by `revisionId`. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-backend-sdk/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Rich agent-authored `PublishArtifactInputV1` payload (`contractVersion`, `artifactKey`, `artifactType`, `artifactRef`, etc.) | Simple runtime-wide `{ path, description? }` publish contract with system-owned file-kind derivation and artifact identity | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-sdk-contracts/README.md` |
| Application execution journal `ARTIFACT` family plus `eventHandlers.artifact` | Shared published-artifact durability, best-effort `artifactHandlers.persisted` live relay, and app-owned reconciliation through runtime-control artifact reads | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-backend-sdk/README.md` |
| `ARTIFACT_UPDATED` / file-change-synthesized artifact semantics | `ARTIFACT_PERSISTED` for explicit publication and `FILE_CHANGE_UPDATED` for the unchanged file-change/touched-file UI path | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-web/docs/agent_execution_architecture.md` |

## Final Recheck After Later Validation / Review Closure

- Additional long-lived docs changed after the initial delivery docs sync: `None`
- Why no extra doc edits were needed: The later round-6 Brief Studio bootstrap fix restored the intended runnable app entry contract without changing the approved product scope or the canonical long-lived architecture text, and review round `6` explicitly marked docs impact as `No`. The earlier delivery docs updates already matched the final implementation and remained truthful after the live Brief Studio rerun passed in round `7`.

## Delivery Continuation

- Result: `Pass`
- Next owner: `User`
- Notes: The branch was already current with `origin/personal`, the long-lived docs remained truthful through finalization, and repository finalization completed afterward without requiring any further long-lived doc edits.
