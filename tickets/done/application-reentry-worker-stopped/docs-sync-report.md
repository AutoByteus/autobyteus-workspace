# Docs Sync Report

## Scope

- Ticket: `application-reentry-worker-stopped` (Project Task `autobyteus-296`), SR-002 / IR-001 / ARCH-REV-002 / CRR-001…003 / API-REV-002
- Trigger: the code reviewer's pass after the API/E2E test re-review CRR-003 (reviewed route, `task_size=Medium`, `architectural_risk=High`)
- Bootstrap base reference: `origin/personal` @ `ddd6fdcdf6`
- Integrated base reference used for docs sync: `origin/personal` @ `fc06a7355d`, merged into the ticket branch as `8ba58a1072`
- Post-integration verification reference: DEL-01…DEL-05 from a clean clone of `8ba58a1072` (`evidence/DEL-0*.log`)

## Why Docs Were Updated

- Summary: the change (`6950a24e1b`) already corrected `application_orchestration.md` and `applications.md` (AC-008). The new behavior: reentry runs binding recovery, then ACTIVE with the worker stopped, then dispatch resume, and never starts the worker; a stop resets a crashed worker; the quarantine names the readiness diagnostics. Delivery found one more sentence left from the old behavior in `application_backend_api_gateway.md`: "only a later `ensure-ready` boots a fresh worker". An application tool call or a pending event also boots it now (RE-05), and a crashed worker is reset. That sentence was corrected.
- Why this should live in long-lived project docs: the reentry order is the invariant this ticket restores, and startup and reentry must both keep it (FU-001 of this ticket is about their drift).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` (~170-184) | Owns the reentry order | Updated (by implementation; verified) | Matches `application-reentry-service.ts` and RE-04/RE-05 (API-06 review) |
| `autobyteus-server-ts/docs/modules/applications.md:111` | Summary of reentry | Updated (by implementation; verified) | Consistent with the orchestration doc |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md:40` (`POST …/backend/reload`) | Describes what a repair leaves behind | Updated (by delivery) | "only a later `ensure-ready`" → "the next `ensure-ready`, application tool call or pending event", plus the crashed-worker reset and a link to the orchestration doc |
| Search for `getDiagnosticsByApplicationId`, `after catalog transition.`, `recoverParticipants`, the reentry wording | Removed names and the old generic quarantine text | No change | No long-lived doc names the removed getter or the old generic text |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `application_orchestration.md`, `applications.md` | Correction (in `6950a24e1b`) | Reentry order; no worker start; crashed-worker reset; quarantine reason from readiness | REQ-001…REQ-005, AC-008 |
| `application_backend_api_gateway.md` | Correction (delivery) | What boots the worker after a repair; crashed-worker reset | REQ-001, REQ-002 (RE-04, RE-05) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Reentry never starts the worker | The worker starts on demand (`ensure-ready`, tool call, pending event), so its start-hook host calls are admitted | `design-spec.md`, `requirements-doc.md` | `application_orchestration.md`, `applications.md`, `application_backend_api_gateway.md` |
| One setup-required text | `ApplicationDefinitionRuntimeReadiness.getSetupRequiredDetail` owns "Application setup is required: …" for startup and catalog transitions | `design-spec.md` (SR-002, AR-002) | `application_orchestration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Worker start inside `recoverParticipants` while REENTERING; dispatch resume before ACTIVE | ACTIVE first, then dispatch resume; worker on demand | `application_orchestration.md` |
| Generic "Application setup is required after catalog transition." | Readiness's `Application setup is required: <diagnostics>` | `application_orchestration.md`, `applications.md` |
| `getDiagnosticsByApplicationId` (removed, AR-002) | `getSetupRequiredDetail` | `application_orchestration.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence (including the clean-clone run the user asked for), then finalization
- Notes: AC-009's findings report (`application-framework-design-findings.md`) is the Solution Designer's and stays a ticket artifact. Its findings 4–12 are for the user to decide.
