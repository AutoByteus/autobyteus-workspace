# Docs Sync Report

## Scope

- Ticket: `imported-app-codex-runtime-folder` (Project Task `autobyteus-238`), SR-002 / IR-002 / API-REV-002
- Trigger: API/E2E validation Pass (API-REV-002), direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `1138e8fbef`
- Integrated base reference used for docs sync: `origin/personal` @ `036b2d780b`, merged into the ticket branch as `ef987888a3`
- Post-integration verification reference: DEL-01…DEL-05 (`evidence/DEL-0*.log`)

## Why Docs Were Updated

- Summary: `autobyteus-server-ts/docs/modules/applications.md` lists the steps of `ApplicationCatalogTransitionService`. The transition now prepares each current application's runtime folder after the catalog commit and before launch readiness, as startup does. Without this step, an application imported while the server runs and launched with Codex was quarantined until a restart.
- Why this should live in long-lived project docs: the order (folder before readiness) is the invariant this fix restores. Startup and the live transition must both keep it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` ("Package Source Presentation", `ApplicationCatalogTransitionService`) | Owns the transition's steps | Updated | Matches `application-catalog-transition-service.ts` on `ef987888a3`: the commits, then `ensureRuntimeDirectoryPrepared` per `currentApplicationIds`, then reconcile and readiness |
| `autobyteus-server-ts/docs/modules/applications.md:111`, `application_orchestration.md:175-180` (reentry returns to ACTIVE with the worker stopped) | FU-003 shows the code does not follow this order on reload/repair | No change | The docs describe the intended behavior. The code defect is pre-existing and out of scope (DEC-004), and FU-003 carries it. Changing the docs to the defective behavior would be wrong |
| Search for `runtime folder`, `ensureRuntimeDirectoryPrepared`, `catalog transition` across non-ticket `*.md` | Other descriptions | No change | No other long-lived doc describes the transition order |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | New step in the transition | Runtime folders are prepared after the commit and before readiness, as at startup | REQ-001, AC-003 (SR-002) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Runtime folder before readiness | Readiness can start the application's runtime (Codex) in its runtime folder, so the folder must exist first, both at startup and in a live catalog transition | `design-spec.md`, `investigation-notes.md`, `requirements-doc.md` | `applications.md` |

## Removed / Replaced Components Recorded

None (an added step, nothing replaced).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, then finalization
- Notes: FU-001 is resolved on `personal` by `68eb520da9` (autobyteus-253 W-01), as noted in `follow-ups.md`. FU-002 and FU-003 stay open for the Solution Designer to send.
