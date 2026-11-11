# API/E2E Test Review Report — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-002 (Pass, 94%); code under test `1b5b7f5b0e`; report and evidence `9be773d634`
- Requirements / Design reviewed as context: `requirements-doc.md` (SR-004), `design-spec.md` (SR-003)
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-004`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass; Final Validation Confidence: 94% (gap: the Android 8–9 Save dialog on a real 8–9 system)
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` (browser probes, isolated stacks). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

API/E2E changed no durable test in either round; its Android journey tools are temporary and stay in `evidence/api-e2e/scripts/`. In my source review (CRR-001), I deferred the implementation-authored probe to this review. It is reviewed here with IR-002's spec cases:

| Durable Test Path | Change | Related Scenario | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs` (MSP-39) | Added (IR-001), updated (IR-002) | AC-001…004, REQ-001…004 | Touch zoom and Download in the phone viewer through Chrome's own touch input (CDP `Input.dispatchTouchEvent`) | Assertions name their AC or REQ and measure observable outcomes: width × 2, canvas bitmap ≥ CSS × DPR (sharp), anchor under the fingers (±4 px), a 150 px two-finger pan at the same width, `visualViewport.scale` 1, a fixed back arrow, downloaded names and bytes. |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Wiring: the case runs right after MSP-16 on the same phone page; header line | Minimal |
| `autobyteus-web/composables/__tests__/usePdfPinchZoom.spec.ts` | Updated (IR-002) | CR-001 | A drag at a fixed zoom, a moving pinch at the 3× cap, resting fingers | Exact scroll deltas and `onCommit` counts; the first two fail without the fix |

- No durable test file changed by API/E2E: `Yes`. Implementation-authored durable tests are reviewed as above.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | One case, MSP-39, with a header listing every step; spec names state the gesture and the outcome |
| Assertions prove requirements | Pass | Observable outcomes, not internals (widths, bitmaps, scroll, viewport scale, bytes) |
| Fixtures/helpers reuse | Pass | Uses the probe's own helpers (`runCase`, `stack`, `openRow`, `waitFor`); `gesture`/`tap` are local CDP wrappers |
| Isolation/determinism | Pass | Real touches with fixed steps; tolerances of ±2–4 px; MSP-39 passed in IMP-06, IMP-16 and API-07 r2 |
| Large files coherent | Pass | 206 lines, one behavior |
| No stale/disabled tests | Pass | — |
| Coverage agrees with evidence | Pass | The report's rerun-by-impact table matches the changed files |
| Callers exercise established scenarios | Pass | The agent's links open the files, as a user does |
| Real trigger and steps | Pass | Browser touch input, not synthetic DOM events; the in-app check used real MotionEvents (API-01) |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Round 2 (CRR-009): Delivery Re-Entry on the Merged State, API-REV-005

- Trigger: API/E2E engineer, API-REV-005 (Pass, 95%) on the merge with autobyteus-452; code `bb9b300c4a`; evidence `0b0b02b4c2`.
- Changed durable tests reviewed:

| Durable Test Path | Change | Related | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs`, `mobile-shell-probe.mjs` (`3eebc0b7a4`, API/E2E) | Updated | Case ID collision with 452's MSP-39 | A pure renumber MSP-39 → MSP-43 (ID, header, `runCase`, four screenshot names); no assertion changed; no `MSP-39` reference left in the file. The full probe is 43/43 (round 3), and the file cases 11/11 (round 5). |
| `components/fileExplorer/viewers/__tests__/PdfViewer.touchLayout.spec.ts` (IR-004) | Added | CR-003, REQ-006, DS-001 | The vue-pdf-embed double sizes 4 pages one per frame, and the spec records how many were sized when `scrollTop` was set (`sizedAtTop`), so it proves the ordering, not just the end value. Cases: the remembered place restored against the full height; a lower-page double-tap anchor after all pages are at 2×; a double tap during the first layout still zooms and is remembered. The first two fail without the fix. |
| `components/mobile/views/__tests__/MobileFileViewer.zoom.spec.ts` (IR-003) | Updated | CR-002, AC-005 | An in-place reload case: same scroller, no "Opening…", a simulated collapse, the position back at 2×, also after two redraws. The double now emits `loaded` on a source change, as the real component does. |
| `composables/__tests__/usePdfPinchZoom.spec.ts` (IR-002, IR-004) | Updated | CR-001, CR-003 | Drag, capped-pinch and resting-finger cases; the `setZoom` double resolves `true` (the new contract). |

- Proportional checks: names state the gesture and the outcome; the assertions measure order and positions, not internals; the doubles mirror the real component's events; deterministic per-frame sizing; no stale or disabled tests. All `Pass`.
- Findings: none.

## Latest Authoritative Result

- Result: `Pass` (round 2, CRR-009; round 1 CRR-004 stands)
- Changed durable test paths reviewed: round 2: `3eebc0b7a4` renumber, `PdfViewer.touchLayout.spec.ts`, `MobileFileViewer.zoom.spec.ts`, `usePdfPinchZoom.spec.ts`; round 1: `mobile-file-zoom-cases.mjs`, `mobile-shell-probe.mjs`, `usePdfPinchZoom.spec.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: open validation gaps are for the user, not the tests: the Android 8–9 Save dialog on a real 8–9 system (it needs an API 26–28 image or device), and RSK-001 memory at 3× on a real low-end phone.
