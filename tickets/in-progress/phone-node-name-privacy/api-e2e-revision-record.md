# API/E2E Revision Record — phone-node-name-privacy (autobyteus-433)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | SR-002, IR-001 | N/A | Fail / 66% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` (IR-003), round 2 | SR-003, SR-004, IR-003, CRR-001 | Fail / 66% | Fail / 66% |
| API-REV-003 | Implementation engineer, `implementation-handoff.md` (IR-004), round 3 | SR-005, IR-004, CRR-002 | Fail / 66% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: everything passes except the in-page load-failure screen, which shows the node URL from WebView's error page

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001, code `ba3ba5b23e`), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-002, IR-001
- Why this baseline was recorded: first validation of the direct-route package
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` baseline fix (`f7bb05f5ec`): a request cut off by closing a phone's context is no longer answered as refused (cause of two unexpected MSP-12 errors, proven with temporary logging)
- Cases added, changed, removed, or rechecked: API-01, API-01b (reused IMP-02/04/05/06/07/08), API-02 (full probe + MSP-12/MSP-09 rerun), API-03 (instrumented), API-04…API-10 (emulator journeys), API-08b (user-only reproduction of the failure)
- Commands, environment, fixture, or broader-validation delta: ticket-owned AVD `pnnp433_api35` (headless), two worktree nodes, test DNS names, WebView DevTools; all removed after the run

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/`
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 66%
- New or remaining failure IDs: API-08, API-08b (AC-007, AC-009, QR-001)
- Recommended owner: Solution Designer (preliminary `Design Impact`), through the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: the user-only part of AC-001 (an HTTPS `*.ts.net` session on his own phone); FU-002 out of scope

### API-REV-002 — Round 2 on IR-003: the overlay is opaque and the page hidden, but after a loaded page a failed reload, Retry or Back shows WebView's error page full-screen

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-003, code `ea45dc1643`, documents `2175dfba74`), round 2
- Triggering finding or case IDs: CRR-001 F-001 (from API-REV-001 API-08/08b); FU-002 folded in (SR-003 DEC-009)
- Related revision IDs: SR-003, SR-004, IR-002, IR-003, CRR-001
- Why this revision was recorded: revalidation of the fix
- Coverage decisions or durable test paths changed: none in the repository
- Cases added, changed, removed, or rechecked: rechecked the prior failures API-08 and API-08b first. Rerun API-04 and API-09 (link overlay + Retry). Added API-11 (first-load failures through a test proxy). Reused IMP-10 and IMP-11 (= API-03). Still valid: API-01 (web), API-01b, API-02, API-07. Not tested this round: API-05, API-06, API-10 and the API-09 toast/no-app parts, deferred because the next fix changes the callbacks they pass through.
- Commands, environment, fixture, or broader-validation delta: new ticket-owned AVD; a test proxy (`pass`/`502`/`drop`/stopped); temporary `DIAG433` logging to measure the WebView callback order (reverted)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-08 / API-08b (round 1): error page visible behind the translucent overlay | Design Impact (CRR-001 F-001) | Partly resolved: the overlay is opaque and the page hidden (API-09 (r2), API-11), and first-load failures are fine. Not resolved: after a page has loaded, a failed reload, Retry or Back now removes the overlay and shows the error page full-screen | API-11, API-09 (r2) pass; API-08 (r2), API-08b (r2) fail |
| FU-002 (overlay stays after a successful Retry) | folded into this ticket (DEC-009) | Resolved | API-09 (r2), API-11 |

- Canonical artifacts and sections updated: investigation ("Round 2 Basis And Rerun Plan", API-11), execution report (Round, ENV-3, Cases with the `(r2)` rows, Acceptance-Criteria Proof, Scorecard, Cleanup, Classification, Result), test progress, `follow-ups.md` (FU-003), `evidence/emulator-r2/`
- Prior result and confidence: `Fail`, 66%
- Current result and confidence: `Fail`, 66%
- New or remaining failure IDs: API-08 (r2), API-08b (r2) (AC-007, AC-009, QR-001)
- Recommended owner: Solution Designer (preliminary `Design Impact`: DS-006's "one `onPageFinished` per load" premise fails for a failure over a loaded page), through the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: the deferred reruns above; the user-only part of AC-001; FU-001 and FU-003 out of scope

### API-REV-003 — Round 3 on IR-004: the page shows only on the node page's `pageReady`; every load failure keeps the overlay; Pass

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-004, code `60adcf3bc8`, documents `9446d19783`), round 3
- Triggering finding or case IDs: CRR-002 F-002 (from API-REV-002 API-08/08b (r2))
- Related revision IDs: SR-005, IR-004, CRR-002
- Why this revision was recorded: revalidation of the second fix
- Coverage decisions or durable test paths changed: none in the repository
- Cases added, changed, removed, or rechecked: rechecked API-08 and API-08b first (pass), plus round 2's cause state §8 through the proxy (API-11-05, pass). Rerun API-02 (full probe), API-04, API-05, API-06, API-09 (all parts), API-10, API-11. Added API-12 (stale bundle, observed as accepted) and API-13 (Android 14 / WebView 113). Reused IMP-14 and IMP-15 (= API-03). Still valid: API-07.
- Commands, environment, fixture, or broader-validation delta: `/mobile` bundle and APK rebuilt from `60adcf3bc8`; a new API 35 AVD and a second API 34 AVD (both deleted afterwards); the proxy gained a `stale` mode that serves the released 1.5.12-beta.8 bundle (a copy, deleted afterwards)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-08 (r2) / API-08b (r2): a failed reload, Retry or Back over a loaded page showed WebView's error page full-screen | Design Impact (CRR-002 F-002) | Resolved: the page shows only on `pageReady`; every failure keeps the opaque overlay with no address; recovery closes it | API-08 (r3), API-08b (r3), API-11 (r3) (API-11-05), API-13 |
| API-08 / API-08b (round 1): error page behind a translucent overlay | Design Impact (CRR-001 F-001) | Resolved | same |

- Canonical artifacts and sections updated: investigation ("Round 3 Basis And Rerun Plan"), execution report (Round, ENV-4/5, the (r3) and API-12/13 Cases rows, Acceptance-Criteria Proof, Scorecard, Classification, Result), test progress, `evidence/emulator-r3/`, `API-02-r3-*`
- Prior result and confidence: `Fail`, 66%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: None
- Recommended owner: delivery
- Remaining risks, blocked evidence, or untested scope: the user-only part of AC-001; no instrumented test of a failed load over a loaded page; a node with the older bundle leaves the app on "Connecting/Opening your runs…" (accepted, RISK-001); FU-001, FU-003 out of scope
