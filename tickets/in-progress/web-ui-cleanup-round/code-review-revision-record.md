# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-12) | N/A | Fail: Local Fix → Implementation | FO-001, FO-002 |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 Fail (API-12 r2, desktop build) | Fail (CRR-001) | Fail: Local Fix → Implementation | FO-003 (new); FO-001, FO-002 |

## Revision Entries

### CRR-001 — Runtime kinds still shown in app launch setup and agent detail

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md`, API-12 (AC-003, REQ-003)
- Relevant solution revision IDs: SR-001
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Local Fix` owned by implementation
- What changed in the review result and why: first result. The design's census of runtime-name callers came from the old maps' callers, so it missed sites that print `runtimeKind` with no map. API/E2E found the app setup summary (FO-001). This review found the agent detail "Default runtime" (FO-002). Reading the summary as technical metadata was rejected: it is not behind "Show technical details".
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None

- New or remaining finding IDs: FO-001, FO-002
- Material score or classification changes: N/A
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: none beyond the census recheck asked of implementation

### CRR-002 — The IR-002 fix fails the desktop build's typecheck (nullable runtime kind)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002), API-12 r2 (AC-003, AC-012)
- Relevant solution revision IDs: SR-001
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Fail` (FO-001, FO-002)
- Current authoritative result: `Fail`, `Local Fix` owned by implementation
- What changed in the review result and why: IR-002 calls `agentRuntimeName(leaf.runtimeKind)` on baseline leaves, whose `runtimeKind` is `string | null` (SDK contract `execution-resources.ts:76`). The production typecheck that every desktop build runs fails at `SlotEditor.vue:52,64` (FO-003). It was not caught because IMP-12 did not run `pnpm -C autobyteus-web typecheck`. Widening the shared function was rejected (C-07).
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| FO-001 | Open | Fixed in intent; blocked by FO-003 at 2 of its 3 sites | IR-002 (`1a4bfd2ae9`) | `git diff 12d0a41a05 1a4bfd2ae9`; build log |
| FO-002 | Open | Fixed (null handled); in-app check pending | IR-002 | `AgentDefinitionDetailSections.vue:13`; IMP-10/IMP-12 |

- New or remaining finding IDs: FO-003 (new); FO-001 pending verification
- Material score or classification changes: N/A
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: none beyond running the web typecheck
