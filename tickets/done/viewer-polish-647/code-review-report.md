# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-002, AC-002, DEC-001…003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (D-2; "the bridge and HTTP contracts are unchanged")
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report / Architecture Review Revision Record: N/A (direct route, Medium / Low)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/viewer-polish-647/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round). The code tested is `812760b2ec`.
- Trigger: API/E2E round 1 (API-REV-001, commit `e931df7eb9`) failed on API-011 (AC-002 on the desktop), with an Unclear question on the phone's page path.
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: API-011 (MSP-115 desktop); MSP-115 phone (Unclear)
- Exact Failing Commands / Execution Mode: from `autobyteus-web`, `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-115 --output-dir=<fresh>` (desktop window at 1440×900, Team tab; the phone at 390×844)
- Failure Evidence Paths: `evidence/api-e2e/API-011-empty-reference/` (`MSP-115-r2.json`, `MSP-115-desktop-empty-647.mp4.png`, `MSP-115-phone-empty-647.mp4.png`)

## Routing Classification Review

- Task size `Medium`, architectural risk `Low`, direct route. No independent source review was selected, so this is a failure-origin exception.
- Classification evidence: confirmed. The failure is in the design's mechanism and in the acceptance criterion's expected outcome, not in how the code carries out D-2.

## Failure-Origin Analysis

### F-1: the desktop reads no `Content-Range`, so D-2's empty-file check never matches (API-011)

- **Observed:** the desktop window shows "Error! Failed to fetch reference content (416)" for a zero-byte `.mp4` reference. The node answered correctly: `416`, `Content-Range: bytes */0` for `Range: bytes=0-0` (Playwright's network record).
- **Code:** `CollaborationMessageReferenceViewer.vue:202`:
  `emptyMedia = streams && response.status === 416 && /^bytes \*\/0$/.test(response.headers?.get('content-range') …)`.
  This implements D-2 exactly as the design states it.
- **Cause:**
  - The desktop renderer (`nuxt dev`, and the packaged `file://` window) calls the node cross-origin.
  - `Content-Range` is not a CORS-safelisted response header, and the node's CORS (`node-access-plugin.ts:44`, `@fastify/cors` with `origin` and `methods` only) exposes none. So `headers.get('content-range')` is `null` there.
  - The phone page and the apps load `/mobile` from the node itself (same origin), so they read the header and pass.
  - The web spec passed because its fetch double returns readable headers. That does not model the desktop's cross-origin read.
- **Origin:** the design's mechanism (D-2) relies on a header the desktop cannot read, under a design that keeps the HTTP contracts unchanged. Implementation followed D-2 faithfully. → `Design Impact`.
- **Recommendation for the Solution Designer:** decide the signal without any server or CORS change.
  - The probe is `Range: bytes=0-0`. Under RFC 9110 (§14.1.1, §15.5.17), a range whose first position is 0 is unsatisfiable only when the representation has zero length. The node's `sendUserFile` follows that: it answers 416 to `0-0` only for `size === 0`.
  - So the status alone, `416` to this probe, already means "empty file". It is readable cross-origin, and it needs no header.
  - Exposing `Content-Range` from the node would be a server change outside the Change Scope, affecting every route.
  - The web spec should then include a 416 without a readable `Content-Range`, which is the desktop's real case.

### F-2: AC-002's expected outcome ("the player shows") is not reachable for a zero-byte file on the page's players (Unclear → Requirement)

- **Observed on the phone's page path:** the fetch error is gone, and the viewer shows "This video could not be played." with Retry (`MSP-115-phone-empty-647.mp4.png`). The apps show their native "could not be played" screen, which DEC-001 keeps.
- **Why the same would follow on the desktop:** once F-1 lets the URL through, `FileViewer` → `VideoPlayer` renders `<video :src>`. An empty file is not decodable, so the element fires `error`, `handleMediaError` sets `nativeMediaFailed`, and the viewer shows the same "could not be played" with Retry (`VideoPlayer.vue:10-24,81`; `AudioPlayer.vue:79` for audio).
- **So** AC-002's "the player shows (desktop; the phone's page path)" asks for something no current player gives for a zero-byte media file. REQ-002's essential ask, "not 'Failed to fetch reference content (416)'", is met by the "could not be played" outcome.
- **Origin:** the acceptance criterion's expected outcome → `Requirement Gap` (Unclear), owned by the Solution Designer.
- **Recommendation:** state AC-002's outcome as what every surface already does consistently. A zero-byte media reference shows no fetch error and reaches the media viewer:
  - the page's players: "This video/audio could not be played." with Retry;
  - the apps: their native "could not be played" screen.

  A missing reference still says "not found". API/E2E then aligns MSP-115.

## Classification

- F-1: `Design Impact`. F-2: `Requirement Gap` (Unclear).
- Both are owned by `/solution_designer`. They are one decision: D-2's signal, and AC-002's outcome. Implementation's change is small once it is decided: the 416 rule and a spec case without a readable header.

## Recommended Recipient

`/solution_designer`

## Not Affected

API-REV-001's other results hold on every surface:
- AC-001 (no gutter, 6 px margin);
- AC-003 (the iOS player, every close path ends the session);
- AC-004;
- AC-005 (one PDF worker);
- AC-006;
- the phone probe, which shows no regression.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Failure Origin: Design Impact (F-1, D-2's header-based signal) and Requirement Gap (F-2, AC-002's "the player shows")
- Recommended Recipient: `/solution_designer`
- Notes: recommended resolution, with no server change:
  - treat a `416` to the `bytes=0-0` probe as an empty file (RFC 9110);
  - restate AC-002 as no fetch error, with the platform's "could not be played" for an empty file.
