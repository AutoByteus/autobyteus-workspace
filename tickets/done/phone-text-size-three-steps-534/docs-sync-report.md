# Docs Sync Report — phone-text-size-three-steps-534 (autobyteus-534)

## Scope

- Ticket: `phone-text-size-three-steps-534` (Project Task `autobyteus-534`, follow-up of autobyteus-525): three phone Text size steps, a "Text size" header instead of "On this phone", Settings last in the run's ⋮ menu.
- Trigger: API/E2E handoff, `Pass` (API-REV-001, SR-001 and SR-002 together), final confidence 95%; direct route (`Small` / `Low`, test-code review Not Required).
- Bootstrap base reference: `origin/personal` @ `bd2053ee51`.
- Integrated base reference used for docs sync: `origin/personal` @ `24d438fa31` (merge `38a23fd96d`, clean).
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (both typechecks and the phone probe on the merged state; `evidence/DEL-merged-base/`).

## Why Docs Were Updated

- Summary: the phone page's Text size lost its Small step, its menu lost the visible "On this phone" heading, and the run's ⋮ menu now ends with Settings. `autobyteus-web/docs/remote_access.md` and `content_rendering.md` still described four steps, the "On this phone" heading and Settings right after Activity (autobyteus-525 and autobyteus-522 text).
- Why this should live in long-lived project docs: a developer or tester of the phone needs the real step list, how an unknown stored value is read, and the menu order that the tests assert.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | run list ⋮, run ⋮ views, Settings, Text size, conversation sizes, VNC Viewer | Updated | below |
| `autobyteus-web/docs/content_rendering.md` | "App-Wide Readability": the phone's Text size source | Updated | the steps named |
| `autobyteus-web/docs/terminal.md`, `settings.md` | follow the desktop's Display preset | No change | the desktop is unchanged |
| `DESIGN.md` | design rules | No change | the change keeps them; it adds no rule |
| `TESTING.md` | phone bundle rule, Android emulators | No change | the checks used the rules as written; no case list lives in it |
| `RELEASE.md` | finalization and release | No change | read on the merged state; no step was wrong or missing for this delivery |
| `GLOSSARY.md` | terms | No change | no new term |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` (Run list) | Edited | the ⋮ opens the menu whose accessible name is "On this phone" (not shown); its first group is headed **Text size** | DEC-002 |
| `autobyteus-web/docs/remote_access.md` (⋮ views) | Edited | order Artifacts, Files, Messages, Activity, VNC Viewer, Settings; Settings always last | REQ-005 |
| `autobyteus-web/docs/remote_access.md` (Settings) | Edited | "as its last entry (below VNC Viewer when that is shown; it followed Activity until autobyteus-534)" | REQ-005 |
| `autobyteus-web/docs/remote_access.md` (Text size) | Rewritten | three steps (Standard 17 default and smallest, Large 19, Largest 21); chosen under the **Text size** header; an unknown stored value such as `small` reads as Standard, leaving the stored value and every other setting as they are; the buttons' letters are 16, 19, 22 px | REQ-001…003 |
| `autobyteus-web/docs/remote_access.md` (conversation, VNC Viewer) | Edited | "17, 19 or 21 px at the three steps"; VNC Viewer sits after Activity and before Settings | consistency |
| `autobyteus-web/docs/content_rendering.md` | Edited | the phone's step named: Standard, Large or Largest under **Text size** in the run list's ⋮ menu | REQ-001 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A saved `small` | there is no explicit mapping: the existing reader treats any value outside the three steps as Standard and never rewrites storage | `design-spec.md`, `requirements-doc.md` DEC-001 | `remote_access.md` (Text size) |
| Run menu order | one computed list with Settings appended last, so every kind of run gets the same order | `design-spec.md` "Run Menu Order (SR-002)" | `remote_access.md` (⋮ views, Settings) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| the `small` step, `mobile.onThisPhone.textSize.small` | three steps; an unknown stored value reads as Standard | `remote_access.md` (Text size) |
| the visible "On this phone" heading | the "Text size" header; "On this phone" stays as the accessible name | `remote_access.md` (Run list) |
| Settings right after Activity | Settings last | `remote_access.md` (⋮ views, Settings) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence (in `release-deployment-report.md`), archive, finalize.
- Notes: nothing here is a follow-up. API/E2E recorded none.
