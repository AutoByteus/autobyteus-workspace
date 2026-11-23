# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 handoff | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 / IR-002 local fix | Fail (Local Fix) | Pass | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review / API-001 pass | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001: the rule is right; Org member saves fail

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-001, commit `14c28a91f9`); SCN-001..SCN-005, AC-006, AC-008
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — `Local Fix` → `/implementation_engineer`
- What changed in the review result and why: the continuation decision, the reference model, the rewritten rule, the standalone and Team saves, the options paths, the launch validators and the marker text match SR-006. The Org save's pre-validation proposal (`agent-org-run-manager.ts:234`) applies targets without a continuation, and the new `patchAgent` throws for every configured Agent. Reproduced with the existing `stopped-org-workspace-graphql.e2e.test.ts` (fails at `:135`; passes when that call is given a continuation in a reverted probe).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: initial score 8.8 / 88. Classification unchanged: `Medium` / `High`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: AC-002 and AC-008 end to end are for API/E2E; the other built-server e2e suites were not rerun here.

### CRR-002 — Targeted delta review of IR-002: CR-001 resolved; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `14c28a91f9..0c58796856` touches only the Org save path, the Org container writer, one new test file and one renamed test
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-001, AC-008
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass` → `/api_e2e_engineer`
- What changed in the review result and why: the Org pre-validation proposal is now a launch-only preview, and the commit keeps the switch rule and its guard. The Org container writer now writes the edited node's session ID; this is accepted as this ticket because it blocked AC-008's Save. The new manager-level test passes 3/3. A reviewer probe of a same-session Org edit passed and was removed.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (High, Local Fix) | Resolved | IR-002, `0c58796856` | Code reading of `agent-org-run-manager.ts:234-235` and `previewAgentOrgLaunchConfigurations`; the new test passes 3/3; reviewer probe (baseline `equal` → `large`: `UPDATED`, session kept, nothing pending); IMP-06 (Org e2e 1/1, full unit and integration suites) |

- New or remaining finding IDs: None. Non-blocking: the new test's same-session case saves the unchanged model.
- Material score or classification changes: 8.8 → 9.4. Classification unchanged: `Medium` / `High`.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: AC-002 and AC-008 end to end; the existing switch E2Es (AC-007); AC-011 user check.

### CRR-003 — Proportional test-code review of API-001: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Reviewed:
  - `native-model-handover-built-server.e2e.test.ts` (MH-01..MH-06);
  - `helpers/org-run-tree.ts` and the MS-04 / EX-01 / SB-01 baseline fixes (`cef4f79481`);
  - the tightened `agent-org-run-manager-model-selection-save.test.ts`.
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-001); MH-01..MH-06, AC-007
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review. The source review is `Pass` (CRR-002).
- Current authoritative result: `Pass` → `/delivery_engineer`
- What changed in the review result and why:
  - The tests enter through real triggers (GraphQL, WebSocket, a provider model removed and the catalog reloaded) and assert the requirements exactly.
  - The two mutation checks fail the intended cases.
  - EX-01's changed session assertion matches pre-existing native backend behavior.
  - No `src` changed since `0c58796856`.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (first test review). The CRR-002 non-blocking note on the Org unit test is addressed.

- New or remaining finding IDs: None. Non-blocking: the header case order is cosmetic; FU-001 is already recorded by API/E2E.
- Material score or classification changes: N/A. Classification unchanged: `Medium` / `High`.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-011 user check on a beta, including the rendered Settings menu and help text.
  - A delegated copy's native hand-over is covered by the existing suites and unit tests only.
  - FU-001: LM Studio edits always hand over.
