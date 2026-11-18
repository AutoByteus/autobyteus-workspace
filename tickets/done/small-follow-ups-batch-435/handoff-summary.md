# Handoff Summary — small-follow-ups-batch-435 (autobyteus-435)

## What Was Delivered

The batch's follow-ups (REQ-001 … REQ-014) across the web app, the phone page, the Android app and the server. None were dropped.

| Requirement | What changed for the user |
| --- | --- |
| REQ-001 | Phone and browser pages no longer ask a `/health` URL at start; the Electron window's server overlays behave as before |
| REQ-003 | The Nodes page says why a node is not reached when the node refuses the address's name: "The node at this address doesn’t accept the name <host>. Add <host> to AUTOBYTEUS_ALLOWED_HOSTS …" (desktop window); a browser window gets its own words |
| REQ-002 | Unused code removed (`diagnosticFromWebSocketClose`, `utils/dateUtils.ts`) |
| REQ-004 | The Android VNC viewer's full screen uses the whole screen width, also under the display cutout and on Android 9–14 |
| REQ-005 | A phone page reload, or Android ending and reopening the app, reopens the same run or Team subject on the same screen, including runs created with New run |
| REQ-006 | In landscape full screen the Clipboard sheet's Send stays visible above the keyboard |
| REQ-007 | Android names the node and what to try when its page answers an HTTP error |
| REQ-008 | Retry after a pairing link failed at first load pairs the phone |
| REQ-009 | The phone guide tells users to tap "Got it" on Android's one-time full-screen hint |
| REQ-010 | Every live stream stops retrying once the node ends the phone's session |
| REQ-011 | A delegated task row of a stopped host leaves the run list within one refresh when its Task is closed |
| REQ-012 | One definition of the task-execution key, in the contracts package |
| REQ-013 | `delegate_task` to the sender's own address is refused with its own words |
| REQ-014 | An expanded System instructions item shows its whole text in Activity, with no inner scroll |

## Classification And Route

- `task_size`: Medium; `architectural_risk`: High; route: Reviewed (ARCH-REV-005 Pass, CRR-004 Pass, API-REV-002 Pass at 95%, CRR-005 test review Pass)

## State

- Ticket branch: `codex/small-follow-ups-batch-435`; validated product code `b5da2d15a0`; API/E2E round 2 `188ac5c318`; review checkpoint `230c9773d0`
- Latest base integrated: `origin/personal` @ `aae0a53a81` by merge (`9ece2da7e7`); no conflicts (one doc, `agent_communication.md`, auto-merged)
- Post-integration checks on `9ece2da7e7`: server collaboration, Org and standalone-root units `Tests 896 passed` (80 files); web `typecheck` `PASS` (production 0 errors; test-file errors 93 = baseline); web collaborator, agent, store and mobile specs `Tests 259 passed` (25 files). Logs: `evidence/delivery/`
- Docs sync: `docs-sync-report.md` (two stale paths fixed; the rest already current)
- Verification: from the evidence (`release-deployment-report.md` § Verification); no user check needed
- Release: none (the user asked for releases only on their word; the change ships with the next release)

## Residual Risks

- API 26–28 not run on a device (unit tests and the API 29 instrumented run cover the same pre-API-30 path)
- Display cutouts of other phone makers: only the user's phone can show them (UNK-001)
- The device journeys are run by hand with the scripts in `evidence/api-e2e/round2/probes/`; no CI runs emulators

## Follow-ups

`follow-ups.md`: FU-001 … FU-004, none urgent, for the Solution Designer to send.
