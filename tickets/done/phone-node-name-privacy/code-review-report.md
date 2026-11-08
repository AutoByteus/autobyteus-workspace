# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/phone-node-name-privacy/requirements-doc.md` at SR-003 (REQ-006, AC-007, AC-009, AC-010, QR-001, DEC-009)
- Investigation Notes Reviewed As Context: not reopened (the failure is fully explained by the code path and the measured log)
- Solution Revision Record Reviewed As Context: SR-003, SR-004 (via the design status line and DS-006)
- Design Spec Reviewed As Context: `design-spec.md` at SR-004 — DS-004 (line 180), DS-006 (lines 123, 184), file plan for `AutoByteusWebView.kt` (line 293), SR-003 tests (line 376)
- Supplemental Task Artifacts Reviewed As Context: None
- Relevant Solution Revision IDs: SR-003, SR-004
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-003, code `ea45dc1643`; IMP-09 premise check, IMP-12)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E round 2 `Fail` (API-REV-002) from `/software_engineering_team/api_e2e_engineer`
- Prior Review Round Reviewed: CRR-001 (failure-origin, F-001 `Design Impact`)
- Latest Authoritative Round: 2
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md` (testing guideline: worktree `TESTING.md`)
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md` (r2 rows)
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001, API-REV-002
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-08 (r2: API-08-03 reload, API-08-05 Back, API-08-11 / API-08-12 Retry), API-08b (r2) — AC-007, AC-009, QR-001, AC-010
- Exact Failing Commands / Execution Mode: real debug APK of `ea45dc1643` on ticket-owned AVD `pnnp433_api35` (Android 15, WebView 124.0.6367.219, headless); node A at 127.0.0.1:47331 as `hostbox-9f3.home.arpa`; test proxy 127.0.0.1:47333 (pass / 502 / drop); screenshots plus uiautomator dumps; cause measured with temporary `DIAG433` logging, reverted (APK dex holds 0 `DIAG433` strings)
- Failure Evidence Paths: `evidence/emulator-r2/API-08-cause-onPageFinished-twice.log`; `evidence/emulator-r2/API-08-03-load-failure-overlay.png/.txt`, `API-08-05-back-while-down.png/.txt`, `API-08-11-retry-while-down.png/.txt`, `API-08-12-retry-again-while-down.png/.txt`; `evidence/emulator-r2/README.md`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review` (direct route; no source review selected)
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The defect is one wrong premise in one bounded local spine (DS-006). Two rounds have now failed on runtime WebView behavior in the same spot; that argues for the next design revision to rest on a measured premise for every page state, not for a larger classification.

## Review Scope

- Changed implementation and behavior reviewed: the load-outcome spine DS-006 and its consumer — `AutoByteusWebView.Client.onPageFinished / onReceivedError / onReceivedHttpError` → `MainFrameLoadOutcome` → `onPageLoaded` → `MainActivity.openPage`'s `onPageLoaded` → `showPage()`.
- Files / areas reviewed: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/MainFrameLoadOutcome.kt:12-26`; `web/AutoByteusWebView.kt:120-145`; `MainActivity.kt:186-212`; `app/src/test/.../web/MainFrameLoadOutcomeTest.kt` (only as the encoding of the design's premise).
- Explicit exclusions: the round-2 passing cases (opaque overlay, hidden page, first-load failures, FU-002 closure, AC-001); the deferred cases API-05, API-06, API-10 and the API-09 toast/no-app parts; FU-003 (recorded by API/E2E); the probe baseline fix `f7bb05f5ec` (test-code review after a passing run).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-006/AC-007 at SR-003: with the node down, reload, Retry and Back while a node's page is open show only the "Can’t reach <name>" overlay; no URL in the screenshot or the accessibility tree; Retry keeps the overlay until a load succeeds (DEC-009, FU-002 folded in). AC-010 keeps Check/Retry.
- Design-spec behavior map verified against the implementation: DS-006 (SR-004) is `[main-frame error -> failed = true -> onDiagnostic] ... onPageFinished -> loaded = !failed; failed = false -> if loaded: onPageLoaded()`, justified by "`onPageFinished` is the one callback that always ends a main-frame load". `MainFrameLoadOutcome.onFinished()` implements exactly that; `AutoByteusWebView` wires it as specified; `MainActivity` shows the page on `onPageLoaded` when the first page is not shown yet or an overlay is up on the Web screen, as DS-004 specifies. The implementation is faithful.
- Design review report and round confirmed: N/A.
- Behavior-basis status: `Confirmed` (requirements); the DS-006 premise is `Contradicted` by measurement.
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None about intent; only the mechanism.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-006 | `Contradicted` (observed outcome contradicts REQ-006/AC-007/QR-001 and drops Retry, AC-010) | Loaded page, node down, main-frame load (reload / Retry / Back) → `onPageStarted` → `onReceivedError(main, -6 or -1)` → mark set, overlay shown → `onPageFinished loaded=false` (mark reset) → **second** `onPageFinished loaded=true` → `onPageLoaded` → `showPage()` → WebView VISIBLE with Chromium's error page (full node URL), overlay and Retry gone (log §2, §3, §8; `API-08-12-retry-again-while-down.txt` holds only the error page's text) | DS-006's measured basis (IMP-09, IMP-12) covered only a WebView with no committed page, where one `onPageFinished` arrives (log §4–§6) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-006a | BEH-006, REQ-006, AC-007, AC-010 | User / System | Phone user; WebView | Keep working in a node when the computer sleeps or the network drops | A node page that had loaded; the node becomes unreachable; a main-frame load starts (page reload, the overlay's Retry, system Back into history) | `Normal` | As the BEH-006 row | Only the overlay, with Retry. Observed: Chromium's error page full-screen with the URL, no overlay, nothing to tap | Requirements SCN-006 (network loss, Supported Normal Scenario); AC-007 names reload, Retry and Back while down; the user reaches it with ordinary actions (API-08b) | `Supported Normal Scenario` | `Use` |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | (CRR-001) Error page visible through a translucent overlay | SCN-006a | — | Resolved in IR-003: the overlay is opaque and the WebView INVISIBLE under it | API-09 (r2), API-11 (r2) pass; IMP-12 | — (resolved) | — | See F-001 resolution |
| C-002 | (CRR-001) URL reachable in the accessibility tree under the overlay | SCN-006a | — | Resolved in IR-003 while the overlay is up (page out of the tree) | API-09 (r2), API-11 (r2) | — (resolved) | — | — |
| C-003 | (CRR-001) HTTP-error body behind the overlay | SCN-006 | — | Now moot for the overlay itself (page hidden); the same F-002 mechanism decides when it is shown again | — | `Hold for Evidence` → no longer separate | — | Covered by F-002's decision |
| C-004 | A main-frame failure over a committed page gets two `onPageFinished` calls; the per-callback mark makes the second look like a successful load, so the error page is shown and the overlay with Retry removed | SCN-006a; REQ-006, AC-007, AC-009, QR-001, AC-010 | Node down while its loaded page is open, then reload / Retry / Back | See the BEH-006 row | `API-08-cause-onPageFinished-twice.log` §2, §3, §8 vs §4–§6; `MainFrameLoadOutcome.kt:21-25`; `MainActivity.kt:197-205`; screenshots/dumps in `evidence/emulator-r2/` | `Promote` | `This ticket` | Introduced by this ticket's SR-003/SR-004 change (round 1 kept the overlay and Retry); blocks in-scope ACs |
| C-005 | Successful SPA loads also produce several `onPageFinished` calls | SCN-001 | Normal page open | Harmless today (each reports loaded=true; `showPage()` is a no-op once shown) | Log §1, §7 | `Promote` (as design input within F-002, not a separate finding) | `This ticket` | Second independent sign that "one `onPageFinished` per load" is not a WebView contract; the next mechanism must not depend on callback counts |

## Findings

### F-001 — Error page visible behind the translucent load-failure overlay (CRR-001) — Resolved for its original mechanism

- IR-003 made the overlay opaque and hid the WebView (and its accessibility tree) while an overlay is up; API-09 (r2) and API-11 (r2) prove it. The remaining leak in the same scenario comes from a new cause, tracked as F-002.

### F-002 — DS-006 decides "the load succeeded" per `onPageFinished` callback, but a failed load over a loaded page gets two callbacks; the error page is then shown full-screen with the URL and Retry disappears (`Design Impact`)

- Protects: REQ-006, AC-007, AC-009, QR-001; AC-010 (Retry is a preserved action and here it vanishes). This is a regression introduced by the SR-003/SR-004 change: in round 1 the overlay and its Retry stayed up.
- Candidate: C-004, with C-005 as design input.
- Evidence (Measured): `evidence/emulator-r2/API-08-cause-onPageFinished-twice.log` §2 (reload, -6), §3 (Retry, -6), §8 (reload, -1): `onReceivedError main=true` → `onPageFinished loaded=false` → `onPageFinished loaded=true` → `onPageLoaded … overlay=true` → `showPage`. With no committed page (§4–§6) there is a single finish and the design holds. In §3 the second finish even reports the previously committed URL (`/mobile/`) while the failed one was `/mobile`. Screens: `API-08-11-retry-while-down.png` (error page full-screen, "http://hostbox-9f3.home.arpa:47331/mobile"), `API-08-12-retry-again-while-down.txt` (no RETRY in the dump), `API-08-05-back-while-down.png`, `API-08-03-load-failure-overlay.png`.
- Code: `MainFrameLoadOutcome.onFinished()` resets the mark on every call (`MainFrameLoadOutcome.kt:21-25`), exactly as DS-006 specifies (`design-spec.md:184`, "`onPageFinished` is the one callback that always ends a main-frame load … the outcome is decided and the mark reset there"); `MainActivity.kt:203` shows the page whenever an overlay is up.
- Failure origin: `Design Impact`. The implementation follows DS-006 as written; the design's premise was measured (IMP-09, IMP-12) only from a WebView with no committed page, and the design generalised it. The callback count is runtime-only WebView behavior; no source review was selected on this direct route, and a text reading of DS-006 would not have revealed it.
- Why not `Local Fix`: the fix has to replace the rule for deciding that a page loaded, which is a design choice with consequences:
  - The current rule fails *open*: any `onPageFinished` without a mark shows the page. Given C-005, a rule that counts or pairs callbacks stays fragile. The design should state which direction it fails in; REQ-006 favours failing closed (stay on the overlay).
  - Keying by URL was already rejected in DS-006 (redirects), and §3 shows the second finish can carry the previous page's URL, which confirms that rejection.
  - The API/E2E engineer's two options are a navigation generation (WebView's callbacks give no navigation ID, so the design must say where it comes from) and a positive signal from the page through the existing bridge. Chromium's error page cannot send a bridge message, so the second option fails closed; the design would need to say what it means for an older node page (DESIGN.md rule 9: same release) and for HTTP-error bodies.
  - For each trigger (reload, Retry, Back into history, first load), the design should say when the overlay closes and that Retry stays on screen until a load succeeds.
- Why not `Requirement Gap`: AC-007 at SR-003 already states the expected outcome.

## Follow-ups

- Follow-ups this review added: None. FU-003 (Retry after a pairing link's failed first load drops `?pairing=`) was recorded by API/E2E.

## Classification

- `Design Impact` (F-002).

## Recommended Recipient

- Solution Designer, recipient per `get_handoff_rules`.

Routing note: after the design revision, implementation; then API/E2E's rerun list: API-08, API-08b, API-11, API-09 (all parts), API-04, API-05, API-06, API-10, plus API-03 if `MainActivity`, `AutoByteusWebView` or `WebShellScreen` change. The cause log's §2/§3/§8 and §4–§6 sequences are ready-made JVM cases for whatever load-outcome rule the design picks. Any premise the new design rests on should be measured over a loaded page as well as a fresh one, before implementation.

## Residual Risks

- Deferred API/E2E cases (API-05, API-06, API-10, API-09 toast/no-app) are unverified on IR-003.
- The user-only part of AC-001 (HTTPS `*.ts.net` session on the user's phone) remains outside emulator reach.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Fail` — DS-006's premise "one `onPageFinished` ends each main-frame load" is contradicted by measurement over a loaded page
- Score Summary: N/A (failure-origin round)
- Failure Origin: `Design Impact` — the load-success rule is per callback, not per navigation; a failed load over a loaded page shows Chromium's error page (URL) full-screen and removes Retry
- Recommended Recipient: Solution Designer
- Notes: implementation faithful to SR-004; no implementation defect. F-001's original mechanism resolved. task_size `Medium`, architectural_risk `Low` carried.
