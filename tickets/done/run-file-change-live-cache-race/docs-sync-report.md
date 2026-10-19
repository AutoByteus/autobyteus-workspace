# Docs Sync Report — run-file-change-live-cache-race

## Scope

- Ticket: `run-file-change-live-cache-race` (Project Task autobyteus-180, FU-C of autobyteus-153)
- Trigger: API/E2E delivery handoff, API-REV-001 Pass (direct Small / Low route)
- Bootstrap base reference: `origin/personal` @ `87732d5504`
- Integrated base reference used for docs sync: `origin/personal` @ `fee828e9cf`, merged into the ticket branch by `0fac00e191`
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh (DLV-01..DLV-03)

## Why Docs Were Updated

- Summary: `RunFileChangeService.load` now fills an attached run's live projection from the stored record only if the projection is still empty when the stored read returns. Before, a late stored read could overwrite a projection that a `FILE_CHANGE` event had just filled.
- Why this should live in long-lived project docs: the artifact file-serving design describes the live-projection lifecycle. Anyone changing that cache needs this invariant, and the reason it holds (`handle` updates the projection before it writes the record), or the race can come back.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Describes the live projection of attached runs | Updated | New paragraph on the first-read fill rule |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Summarizes the live/fresh read split | No change | Its summary (live for attached runs, fresh read otherwise) stays accurate; it links to the design doc |
| `autobyteus-web/docs/agent_artifacts.md` | Client list merge | No change | No client change (client merge policy is out of scope) |
| Docs search for `storedPathsOf`, `stored-record wait`, `FU-C` | Workaround mentions | No change | None in long-lived docs |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Runtime invariant | The first read fills the live projection only if it is still empty; the newer projection wins; reads never wait for the event queue | Records the fix's rule and why it is safe |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Live projection fill rule | A stored read never replaces a filled live projection. The projection is never older than the record (ASM-001), so it wins (DEC-001) | `requirements-doc.md` DEC-001, ASM-001; `design-spec.md` | `artifact_file_serving_design.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Unconditional cache fill after the first stored read | Fill-only-if-empty | `artifact_file_serving_design.md` |
| E2E/probe stored-record waits (FU-C workaround) | Removed from the tests | Test code only; there was no doc mention |

## No-Impact Decision

- N/A (docs updated)

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification record, ticket archive, finalization per `RELEASE.md`
- Notes: I checked the doc's claim against `run-file-change-service.ts` `handle`: it sets `projections` before `writeProjection`.
