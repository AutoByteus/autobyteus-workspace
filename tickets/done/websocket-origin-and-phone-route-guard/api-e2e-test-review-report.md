# API/E2E Test Review Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Review Meta

- Review Round: 2 (latest). Round 1 (CRR-002) reviewed the probe update below.
- Trigger: round 2 — API/E2E passed (API-REV-002, 95.6%) after IR-002, the base integration with autobyteus-407. No durable test code changed during this API/E2E round: `git diff 6f59bab2a2 896b65a5f2 -- . ':!tickets'` is empty. Round 1 — API/E2E passed (API-REV-001); one durable test changed in `14e3681cdc`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; AC-008, ASM-001/ASM-002, REQ-002b)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (BEH-005: wrappers load the node's `/mobile` URL)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (not reread beyond context)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004 added by API/E2E)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004` (round 1: CRR-002)
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (round 2, API-REV-002; round 1, API-REV-001)
- Final Validation Confidence: 95.6% (round 2); 95.4% (round 1)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (repository root), Browser probes section: a probe owns its stack and fails on browser errors. No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-004 / AC-008: a paired phone on a LAN reaches the node at its private address, and the page, API and WebSockets share the node's origin.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (+18/−8) | SCN-004, AC-008, REQ-002b, REQ-006 | Phone `/mobile` shell journeys against a probe-owned node, reached through an emulated private-network address | The only non-ticket change between `88a93aaf26` and `7e645da171`. The source is unchanged |

- No durable test file changed: round 2 `Yes`. `mobile-shell-probe.mjs` is byte-identical to `14e3681cdc`, which round 1 reviewed. The one-path e2e addition in `request-origin-and-phone-routes.e2e.test.ts` came from implementation (IR-002), not API/E2E, and was reviewed in source review CRR-003. Round 1: `No` (one file, reviewed below).
- Review result when no durable test file changed: round 2 `Not Applicable`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header and the `openPhone` doc comment state why the Host and the WebSocket Origin are kept. `PhoneUpstreamWebSocket` names the upstream leg's role |
| Assertions prove approved requirements instead of incidental implementation details | Pass | No assertion was weakened; the MSP cases are unchanged. The change only corrects the emulated network path, so the existing journey assertions now run through the Origin gate (API-02: 19 assets refused before; API-03: 15/15 pass) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `phoneHost` derives from the existing `phoneOrigin()`; no new helper duplication |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The probe still owns its stack. `ws` is a declared `autobyteus-web` dependency (`package.json:207`). Messages queued before `open` are still flushed; binary frames are now forwarded as binary instead of being stringified |
| Large files remain coherent and navigable | Pass | One probe, one surface (phone shell) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The built-in `WebSocket` upstream is replaced, not kept beside the new one |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-00 measured the forwarded headers; API-02 failed as committed; API-03 passed after the update. The alpha refusal lines in API-03 come only from MSP-13's unknown and revoked credentials, which get today's codes |
| Test callers and fixtures exercise an independently established supported scenario | Pass | SCN-004 is established in the requirements and investigation (a real phone keeps the Host it addressed). API-04 confirms the same path on the browser's own network stack (Chrome and WebKit, LAN and Tailscale-shaped) without any rewriting |
| Each test enters through its scenario's real trigger without unreal setup | Pass | Before the change, the rewrite produced a request shape that a LAN phone does not produce: the browser's Origin with Host `127.0.0.1`. After it, HTTP carries the phone's Host, and the WebSocket carries the page's Origin and Host, as the phone's browser sends them. The WebSocket Origin is set from `phoneOrigin()` because Playwright's `routeWebSocket` does not expose the handshake headers. That is the origin of the page that opens the socket, so it matches the real trigger |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-004 (base server E2E failures) was recorded by API/E2E; I did not review it here.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test changed during API-REV-002). Round 1 result `Pass` stands for `mobile-shell-probe.mjs`.
- Changed durable test paths reviewed: none in round 2; round 1 `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`14e3681cdc`)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: the current source review is CRR-003 (merge `6f59bab2a2`); API/E2E tested `1e1d6482a7`, which has the same source. The probe-only failure in API-09's first attempt came from a temporary in-page recorder, not durable test code, so it is evidence and not reviewed here. AC-008 on a real Tailscale Serve node and on the iOS/Android wrapper apps on devices is left for the user to check, as API/E2E reported.
