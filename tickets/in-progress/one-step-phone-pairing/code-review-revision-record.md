# Code Review Revision Record — one-step-phone-pairing (autobyteus-395)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | [code-review-report.md](code-review-report.md) | Implementation Review, round 1 / IR-001 handoff | N/A | Pass | None |
| CRR-002 | [code-review-report.md](code-review-report.md) | API/E2E Failure-Origin Review, round 2 / API-REV-001 API-17 | Pass | Fail — implementation defect | CR-001 |
| CRR-003 | [code-review-report.md](code-review-report.md) | Implementation Review, round 3 (Targeted Delta) / IR-002 | Fail | Pass | CR-001 (resolved) |
| CRR-004 | [api-e2e-test-review-report.md](api-e2e-test-review-report.md) | Proportional test-code review / API-REV-002 Pass | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, [implementation-handoff.md](implementation-handoff.md); BEH-001…007, SCN-001…009
- Relevant solution revision IDs: `SR-014`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001` (code at `55fdae0a34`, handoff `8aa4ba1379`)
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: `Pass` (9.4/10; every category ≥ 9.3)
- What changed in the review result and why: First review. All behaviors confirmed against the code. No findings.
- Supported product scenario / material-premise basis changes: None. Candidates CR-C01…C08 rejected (artificial timing, contrived chains, approved design decisions, under-limit catalog size, an API/E2E-owned probe update, behavior that matches the design).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A; Large / High preserved
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: The runs not yet done (Docker node, two machines, Linux host, packaged `file://`, Serve ports, camera, QR-004 timing, preview-frame bridge abuse) and the stale MSP-09 probe; all go to API/E2E.

### CRR-002 — Failure origin of API-17: phones-list dates in the OS locale

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin). The review covered the failing case API-17 and `ConnectedPhones.vue`. No source changed since CRR-001 (code `55fdae0a34`).
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md); API-17 (REQ-014, AC-012 surface, SCN-008)
- Relevant solution revision IDs: `SR-014`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`: implementation defect CR-001, classified `Local Fix`
- What changed in the review result and why: `ConnectedPhones.vue:91` and `:108` format "Last seen" and "Revoked" with the OS locale inside the app's translated sentences. On the user's de_DE Mac with the app in English, the rows read "Last seen jetzt" and "Revoked 7. Nov.". The spec texts are normative, and the project's pattern is `resolvedLocale` (`NodeConnectionDetails.vue:146`). Round 1 should reasonably have caught this; the review gap is recorded in CR-001, and the supplements-check row is now `Fail` for this file.
- Supported product scenario / material-premise basis changes: CR-C09 promoted. SCN-008 on a machine whose OS language differs from the app language is the user's own setup (API-17 evidence).

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001
- Material score or classification changes: Row 8 (Runtime Correctness) 9.3 → 8.8. Classification Large / High preserved.
- Follow-ups added: FU-006 (the same OS-locale formatting in untouched areas)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: None new. The camera decode, Serve ports and the user's second computer stay with the user, as API/E2E reported.

### CRR-003 — CR-001 fix re-reviewed

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. Since `55fdae0a34`, the only source change is `ConnectedPhones.vue` (+6/−3), plus its new spec. The other changed files (`mobile-shell-probe.mjs`, `TESTING.md`) are API/E2E's and go to the later test-code review. No spine, interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, [implementation-handoff.md](implementation-handoff.md) (IR-002); CR-001
- Relevant solution revision IDs: `SR-014`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002` (fix `c113dae1a7`, head `a892a3d89a`)
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Pass`
- What changed in the review result and why: Both date formats now use the app's `resolvedLocale` (the pattern in `UpdateChecksCard.vue`). A new spec with a German OS default fails on the old code and passes with the fix (IMP-11).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-002) | Resolved | IR-002, `c113dae1a7` | Diff of `ConnectedPhones.vue` lines 78, 88, 94, 111; `ConnectedPhones.spec.ts`; IMP-11 (fails without the fix, 9/9 pass with it) |

- New or remaining finding IDs: None
- Material score or classification changes: Row 8 back to 9.3 (average 9.4). Classification Large / High preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: None new.

### CRR-004 — Test-code review after API/E2E Pass

- Canonical review report updated: [api-e2e-test-review-report.md](api-e2e-test-review-report.md)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Covers `mobile-shell-probe.mjs` (setup, MSP-06, MSP-09) and `TESTING.md` § Fresh-start build. `ConnectedPhones.spec.ts` was already reviewed in CRR-003.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md); API-06, API-05, API-17, API-19
- Relevant solution revision IDs: `SR-014`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A (first test review; the source review was `Pass` in CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The probe updates follow REQ-019, AC-015, AC-016, DEC-016 and DEC-018, enter through real triggers, and drop the stale peer and `serverName` reads (this closes CR-C07).
  - The TESTING.md Android step matches `release-android.yml`.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: None
- Material score or classification changes: None; Large / High preserved
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: Only the user can check these: AC-006 Tailscale Serve, AC-008 a real camera scan, and AC-005 on his own second computer.
