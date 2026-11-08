# Architecture Review Revision Record — autobyteus-432

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Medium/High) | SR-001 | N/A | Fail (Design Impact) | AR-432-001, AR-432-002 |
| ARCH-REV-002 | Round 2 / SR-002 revision | SR-001, SR-002 | Fail | Pass | AR-432-001, 002 resolved; AR-432-003 new (non-blocking) |
| ARCH-REV-003 | Round 3 / SR-003 (IMP-DI-001) | SR-003 | Pass | Pass | AR-432-004, 005 new (non-blocking); AR-432-003 resolved (corrected) |

## Revision Entries

### ARCH-REV-001 — Baseline review: landscape full screen for the phone viewer

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` from the Solution Designer (run `solution_designer_0a361701edf54cf7b4786456373995dd`)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What changed in the review result or what baseline was established: the basis is confirmed. The controller, the web owner, the browser branch, Fill/Fit, the exit handle and the rotation override all pass.
  - Blocking, AR-432-001: the investigation (L-05/L-06) missed the existing `window.AutoByteusShell` web-message bridge (`ShellBridge.kt`, `shellBridge.ts`; main frame and same origin only, autobyteus-417). The design's new `@JavascriptInterface` of the same name would collide with it, breaking either the feature or pairing, and would expose the call to every frame. The fix is to extend the existing bridge with a `desktopFullScreen` message.
  - Low, AR-432-002: the `MainActivity` reset hooks are named after methods that don't exist; the design should state the reset rule.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-432-001, AR-432-002
- Material classification changes: none (Medium/High confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: bars on resume (verify in AC-004); `requestFullscreen` rejected on reload (stay in-page); the back gesture in immersive mode (emulator check)

### ARCH-REV-002 — Recheck of SR-002, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer sent the SR-002 revision
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` and `investigation-notes.md` at SR-002; AR-432-001, AR-432-002
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: the request now travels on the existing `ShellBridge` (main frame and origin only), and the reset rule has one owner. All `MainActivity` lines are verified. New non-blocking AR-432-003: a duplicate "Case 17" heading in `docs/design-cases.md`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-432-001 | Open (High) | Resolved | SR-002; Ownership Map `ShellBridge`; DS-001; rejection log; L-05/L-06/L-11 | Message on the existing bridge under `ShellBridgeMessages.read:80-81`; the new interface and type file are dropped; JVM test cases are listed |
| AR-432-002 | Open (Low) | Resolved | SR-002; D-2; L-12; AC-002 | One reset method covering page start, every non-page `setContentView` and every host destroy; lines verified |

- New or remaining finding IDs: AR-432-003 (non-blocking)
- Material classification changes: none (Medium/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: the back gesture in immersive mode; bars on resume; keyboard in landscape (emulator)

### ARCH-REV-003 — Recheck of SR-003 (Control full-screen strip; off = UNSPECIFIED; dark root), Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer sent SR-003, prompted by implementation Design Impact IMP-DI-001 (IR-001).
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` and `requirements-doc.md` at SR-003; implementation `implementation-handoff.md` IMP-DI-001; evidence `ac005.txt`, `ac004.txt`
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: the three SR-003 points are verified against the implemented controller (`9d8552563e`) and the evidence. The REQ-002/005 wording stays within the direction. New non-blocking findings:
  - AR-432-004: the keyboard textarea and the Clipboard sheet must stay mounted outside the hidden bar in full screen.
  - AR-432-005: a stale validation line, the root background restored from its own value, and a recommendation to put the strip in the side margin.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-432-003 | Open (non-blocking) | Resolved (factual correction, 2026-11-08) | Implementation commit `9372cdb96b` | `docs/design-cases.md:253` is `### Case 18` (autobyteus-432) and `:243` is autobyteus-277's Case 17. This entry first said "still open" without rechecking the file; corrected after the Solution Designer's note. |

- New or remaining finding IDs: AR-432-004, AR-432-005 (non-blocking). AR-432-003 is resolved; see the correction above. The Validation Plan line from AR-432-005 is corrected by the Solution Designer.
- Material classification changes: none (Medium/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: the back gesture and keyboard in immersive landscape (emulator); FU-001
