# Implementation Revision Record

Ticket autobyteus-647 (viewer-polish-647).

## IR-001 (2026-11-25): initial implementation, D-1…D-6 (SR-001, SR-002)

- Trigger: Architecture Design Complete (SR-001), direct route, Medium / Low.
- Design Impact DI-001, during IR-001:
  - Found: the packaged-window check (IMP-003) found that a shared `workerPort` fails the next PDF while vue-pdf-embed's un-awaited destroy runs, and that the essential build bundles its own pdf.js.
  - Returned to the Solution Designer with a contained fix, proven in the window.
  - Resolved in SR-002 (one long-lived `PDFWorker` wrapper passed to every document).
- Commits:
  - `b3602c4156`: D-1, D-2, D-6.
  - `0b88e1e761`: D-5 as SR-001.
  - `9072eb89c4`: D-5 as SR-002; the mobile zoom spec's stale double.
  - `da70e7f049`: D-3, D-4, the iOS UI tests, the Player doc.
- Found and fixed in my own work:
  - `MobileFileViewer.zoom.spec.ts` still doubled the full build, so it failed from `0b88e1e761` on. The whole-suite run caught it; it was fixed in `9072eb89c4`.
  - D-3 presented iOS's player during its own screen's presentation, and asked for landscape through a view that is out of the window while the player shows. The fake-node UI tests caught both (IMP-005); they were fixed before the commit.
- Test files of API/E2E's changed for D-2 and D-3: `NativeMediaRealNodeUITests.swift` and `NativeVideoRealNodeUITests.swift`. The handoff's Important Assumptions lists the changes.
- Evidence: IMP-001…IMP-007.
- Route: API/E2E.
