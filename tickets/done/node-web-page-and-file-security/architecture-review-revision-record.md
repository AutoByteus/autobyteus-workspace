# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High), 2026-11-07 | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / SR-003 re-review after ARCH-REV-001, 2026-11-07 | SR-001, SR-003 | Fail | Pass | AR-001, AR-002 (Resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: server design sound; the in-app browser `file://` rule needs a request-classification fix

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/design-review-report.md`
- Review round and trigger: round 1; handoff from the Solution Designer (run `solution_designer_2aac85158cde49c99112f985fe522460`), `handoff.md`
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-002); no prior findings
- Relevant solution revision IDs: SR-001 (approved requirements), SR-002 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - Baseline established. The behavior basis is confirmed, and the classification (Large / High) is confirmed.
  - D1–D5 and D7–D9 pass against the current code.
  - D6 fails. Its rule keys on the frame URL, so same-origin child frames keep the app's look, and it rewrites GET navigations.
  - Reviewer evidence was added: `probes/arch-review-d6-child-frame-probe.js` and `evidence/ARCH-REV-001-d6-child-frame-probe.json`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High, blocking), AR-002 (Medium, blocking)
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: R-1…R-6 in the report (non-blocking). The form-POST navigation Origin from a `file://` document is unmeasured (part of AR-002).

### ARCH-REV-002 — Re-review of SR-003: D6 decides by frame origin and leaves GET navigations alone; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/design-review-report.md`
- Review round and trigger: round 2; SR-003 re-review request from the Solution Designer (run `solution_designer_2aac85158cde49c99112f985fe522460`), `handoff.md` "Round 2"
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-003), `solution-revision-record.md` SR-003; AR-001, AR-002
- Relevant solution revision IDs: SR-001 (requirements, unchanged), SR-003
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Behavior basis re-confirmed: BEH-004 and BEH-009/010 are now `Confirmed`.
  - DS-003 was redrawn in call order: `file:// document -> Chromium request -> onBeforeSendHeaders -> isFileDocumentRequest -> Origin: null -> node gate refuses`.
  - The revised rule is checked against the Entry-Form Table and both SR-003 evidence files, and the forms probe was re-run independently on Electron 42.11.16 with identical results.
  - D1–D5 and D7–D9 are unchanged apart from adopted guidance, so their round-1 verdicts stand.
  - New non-blocking residual risks: R-7 (subresource GETs from `file://` documents also get `Origin: null`) and R-8 (rule (c) premise and fallback).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High, blocking) | Resolved | SR-003; design-spec D6 rule 2(a), Entry-Form Table rows 175–177, step 6 | `evidence/SR-003-d6-file-origin-forms.json` and the reviewer's re-run: `about:blank`, `srcdoc` and `blob:` iframes, popup and worker (fetch, XHR, WS), form POST, beacon and keepalive all arrive as `Origin: null`. In every case the decision came from `frame.origin === 'file://'` |
| AR-002 | Open (Medium, blocking) | Resolved | SR-003; D6 rule 1, Entry-Form row 178, step 6 AR-002 check | The address-bar GET navigation and the iframe `src` GET arrive with no Origin (unchanged); `evidence/SR-003-d6-http-page-control.json` `marked: []`. The form-POST navigation was measured and arrives as `Origin: null` |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer; informational notification to the Solution Designer
- Remaining risks or uncertainty: R-1…R-8 in the report, all non-blocking
