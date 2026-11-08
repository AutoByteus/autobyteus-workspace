# Code Review Revision Record — node-universal-authentication-437 (autobyteus-437)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002 Local Fix) | Fail (Local Fix) | Pass | CR-001, CR-002 |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: API-15, API-03 MSP-08, API-08 NVP-05) | Pass | Fail (Local Fix, implementation) | CR-003, CR-004, CR-005 |

## Revision Entries

### CRR-001 — Initial implementation review of slice 1

- Canonical review report updated: `tickets/in-progress/node-universal-authentication-437/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, HEAD `60d0b0d859`)
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: baseline. The gate, credentials, admission, pairing, revocation and Electron attachment follow the design. One preserved-behavior defect: peer signing covers a deployment base path the receiving node never sees (CR-001). The contract text disagrees with two accepted deviations (CR-002).
- Supported product scenario / material-premise basis changes: new premise CR-P1 (peers at a deployment base-path address), Supported Explicit Edge, reachable. Rejected candidates C-03…C-08 (OPTIONS reaching application routes is not reachable: `@fastify/cors` answers every OPTIONS first).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: Runtime Correctness 8.6, Naming 9.0, API/E2E Readiness 9.0
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: UNK-006 and Linux Docker; Windows pipe and PowerShell unexecuted; `build-studio-server.ts` at 500 lines; browser/Electron probes need updating in API/E2E.

### CRR-002 — Targeted delta review of the CR-001/CR-002 Local Fix

- Canonical review report updated: `tickets/in-progress/node-universal-authentication-437/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` — `git diff 60d0b0d859..b6a57ab154` stays in the CR-001/CR-002 files (signer helper, two call sites, contract and CM-12 text, four test files); no shared interface or other spine changed
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002, HEAD `b6a57ab154`); CR-001, CR-002
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Local Fix), CRR-001
- Current authoritative result: Pass
- What changed in the review result and why: both findings resolved; the signed path is one node-relative rule on both sides, with unit and e2e coverage through a prefix-stripping gateway; the contract states the implemented identity, permissions and signed path.
- Supported product scenario / material-premise basis changes: CR-P1 satisfied.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `dfa41de41c` | Code read of `peerRequestTarget` and both call sites; NAS-20 base-path unit/e2e tests; `evidence/implementation/IR002-03`, `-04`, `-06` pass |
| CR-002 | Open (Local Fix) | Resolved | IR-002, `1e02bea41e` | `node_access_model.md` §1, NA-7, NA-9; `collaboration_model.md` CM-12 |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 8.6 → 9.4, Naming 9.0 → 9.4, API/E2E Readiness 9.0 → 9.3, Interface Clarity 9.3 → 9.4
- Recommended recipient: API/E2E engineer (informational notice to implementation engineer)
- Remaining risks or uncertainty: UNK-006 and Linux Docker; Windows pipe and PowerShell unexecuted; `build-studio-server.ts` at 500 lines; web e2e probes to update.

### CRR-003 — Failure-origin review of API-REV-001

- Canonical review report updated: `code-review-report.md` § API/E2E Failure-Origin Review (Round 3) and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`; F-1 (API-15), F-2 (API-03 MSP-08), F-3 (API-08 NVP-05); observations O-1…O-3
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: all three failures are implementation defects introduced by this change. CR-003: Nuxt's dev server does not route upgrades to `vite.server.proxy`. CR-004: the gate's async `preValidation` hook lets the request be destroyed before Mercurius builds the context; `createRequestAbortSignal` treats that as an abort. CR-005: the `statusCode = 503` property makes Mercurius answer HTTP 503. O-1 and O-2 are added to the fix; O-3 is accepted.
- Supported product scenario / material-premise basis changes: none; the three scenarios remain approved behavior. O-3's race (NP-07) is a constructed concurrent action, not a supported workflow.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (reconfirmed by API-11 through a real nginx gateway) | IR-002, API-REV-001 | `api-e2e-execution-coverage-report.md` API-11 |
| CR-002 | Resolved | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: CR-003, CR-004, CR-005 (plus O-1, O-2 in the same fix)
- Material score or classification changes: not rescored; Runtime Correctness and API/E2E Readiness reopened
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: AC-008 from a second physical device only the user can do; API-16 and API-FS open with API/E2E.
