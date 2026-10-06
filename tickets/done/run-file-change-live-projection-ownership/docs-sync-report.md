# Docs Sync Report

## Scope

- Ticket: `run-file-change-live-projection-ownership`
- Trigger: Code Reviewer delivery handoff after CRR-004 (test-code review Pass) and API-REV-002 (Pass, 96%).
- Bootstrap base reference: `origin/personal@5c74fed71`
- Integrated base reference used for docs sync: `origin/personal@1aa918298`, merged into the ticket branch as `92dcb7d3d`.
- Post-integration verification reference:
  - `delivery-evidence/vitest-integrated.log`
  - `delivery-evidence/e2e-agy-multi-artifact-integrated.log`

## Why Docs Were Updated

- Summary: the implementation commit `061d4698b` already updated the two canonical server docs for this behavior. Delivery reviewed them against the integrated code and found them accurate. Delivery made no further edits.
- Why this should live in long-lived project docs: three rules are durable architecture, not ticket detail:
  - The process has exactly one `RunFileChangeService`, owned by `GeneralProcessRunSupervisor`.
  - `getRunFileChangeService()` only returns a bound instance and never creates one.
  - The cache is limited to attached runs, and every other run is read fresh from `file_changes.json`.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Canonical artifact-serving flow and owners | Updated (in `061d4698b`) | Covers the bound process authority, the attached-only live projection, the per-request resolution, and the fact that application scopes never bind. Matches the code. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Module responsibilities for Agent Artifacts | Updated (in `061d4698b`) | Active runs are read from the one bound service, and other runs are read fresh from disk. Matches the code. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | References the run-file-change paths and service | No change | It describes only the paths and how `RunFileChangeService` indexes changes. Ownership and caching are not described, so it stays accurate. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Mentions that `RunFileChangeService` consumes derived events | No change | Event consumption is unchanged. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Mentions `RunFileChangeService` as an event consumer | No change | Event consumption is unchanged. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Mentions run-file-change projection idempotency | No change | Not affected. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Flow + owner table (commit `061d4698b`) | Process authority binding; live projection for attached runs only; fresh disk reads with no cache | Documents the single-owner rule that this fix restores |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Responsibility bullet (commit `061d4698b`) | Active-run hydration goes through the bound service | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Process `RunFileChangeService` authority | `GeneralProcessRunSupervisor` constructs and binds the only process instance. The getter throws when none is bound. Application execution scopes keep their own instance local and never bind it. | `design-spec.md`, `design-review-report.md` | `artifact_file_serving_design.md` |
| Cache lifecycle | The live projection exists only from `attachToRun` until detach. Other runs are read fresh from `file_changes.json` and nothing is cached, so a read cannot pin a stale snapshot. | `design-spec.md`, `investigation-notes.md` | `artifact_file_serving_design.md`, `agent_artifacts.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Lazily created default `RunFileChangeService` in `getRunFileChangeService()` | Bound process authority (`bindProcessRunFileChangeService` / `releaseProcessRunFileChangeService`) | `artifact_file_serving_design.md` §flow step 4 |
| `load()` caching the first disk read for any runId | Live projection for attached runs only, with fresh normalized reads for all other runs | `artifact_file_serving_design.md` (paragraph after the flow) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary, then hold for user verification.
- Notes: none.
