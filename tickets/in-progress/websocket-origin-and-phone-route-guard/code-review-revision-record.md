# Code Review Revision Record — websocket-origin-and-phone-route-guard (autobyteus-403)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Pass | None |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional test-code review, round 1 / API-REV-001 | N/A (first test review) | Pass | None |
| CRR-003 | `code-review-report.md` | Implementation Review, round 2 / IR-002 (delivery Local Fix, DR-001 base integration) | Pass (CRR-001) | Pass | None |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review, round 2 / API-REV-002 | Pass (CRR-002) | Not Applicable | None |

## Revision Entries

### CRR-001 — Initial implementation review of the origin gate and phone WebSocket routes

- Canonical review report updated: `tickets/in-progress/websocket-origin-and-phone-route-guard/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, source commit `88a93aaf26`)
- Relevant solution revision IDs: SR-001, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why: this is the initial baseline. The review traced DS-001…DS-003 against the code and the `@fastify/cors` 11.3.1 source, and every behavior was confirmed. The delegator deviation (`origin: isAllowed(headers)`) was accepted because it preserves the base no-Origin preflight answer that REQ-003 requires (CR-C01). Six other candidates were rejected as designed or not reachable (CR-C02…CR-C07).
- Supported product scenario / material-premise basis changes: None; MP-001 confirmed.

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: 9.5 average, every category ≥ 9.4; classification Medium / High preserved
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: ASM-001 / ASM-002 depend on executable validation AC-007…AC-009; phone access is keyed by exact route patterns (guarded by IMP-04 AC-005).

### CRR-002 — Proportional review of the mobile-shell probe update

- Canonical review report updated: `tickets/in-progress/websocket-origin-and-phone-route-guard/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001, Pass, 95.4%); SCN-004, AC-008
- Relevant solution revision IDs: SR-001, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 source review `Pass`; no prior test review
- Current authoritative result: `Pass`
- What changed in the review result and why: one durable test changed, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`14e3681cdc`). Its LAN emulation now keeps the phone's Host on HTTP and the phone's Origin and Host on the WebSocket leg, as a real LAN phone sends them. No assertion was weakened. API-02 and API-03 show the probe failing before the update and passing after it. Source is unchanged at `88a93aaf26`.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: None; Medium / High preserved
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: real Tailscale Serve and on-device wrapper checks are for the user (AC-008); FU-004 is outside scope.

### CRR-003 — Source re-review of the base integration with autobyteus-407

- Canonical review report updated: `tickets/in-progress/websocket-origin-and-phone-route-guard/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. The resolution touches the WS spine, a 407 shared module and a WS handler. IR-001 files that the merge did not touch are byte-identical to `88a93aaf26`, so their evidence carries forward.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002), from the delivery engineer's DR-001 (`delivery-revision-record.md`); merge commit `6f59bab2a2`
- Relevant solution revision IDs: SR-001, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: CRR-001 `Pass` (source); CRR-002 `Pass` (tests)
- Current authoritative result: `Pass`
- What changed in the review result and why: the resolution keeps one WS credential rule (`authorizeWebSocket`), one query-credential reader (the policy's, re-exported by the adapter for 407's node-desktop viewer identity) and one close-code table (407's, with both new codes at 4403). The unreachable `?? 4401` is removed. Candidates CR-C08…CR-C10 were recorded and rejected as non-findings. IMP-09…IMP-12 on `6f59bab2a2` pass.
- Supported product scenario / material-premise basis changes: `/ws/node-desktop` traced as a phone WebSocket route under 407; MP-001 still confirmed.

#### Prior Finding Resolution

None (no prior findings)

- New or remaining finding IDs: None
- Material score or classification changes: None; scorecard unchanged; Medium / High preserved
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: the phone journey on the node desktop (View only, Control, live revocation) under the origin gate and route limit, and a foreign-origin `/ws/node-desktop` from a real browser page, are for API/E2E. CRR-002's test review still covers the mobile-shell probe, which is unchanged in the merge.

### CRR-004 — Test review after API/E2E round 2: no durable test changed

- Canonical review report updated: `tickets/in-progress/websocket-origin-and-phone-route-guard/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass, 95.6%); API-09, API-06 and the impact reruns
- Relevant solution revision IDs: SR-001, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: CRR-002 `Pass`
- Current authoritative result: `Not Applicable`
- What changed in the review result and why: `git diff 6f59bab2a2 896b65a5f2 -- . ':!tickets'` is empty, so API/E2E changed no durable test. The probe is identical to the version CRR-002 reviewed.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: None; Medium / High preserved
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: real Tailscale Serve and on-device wrapper checks are for the user; FU-004 is outside scope.
