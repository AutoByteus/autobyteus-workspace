# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result. This record keeps the review history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Local Fix (implementation) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002) | Fail — Local Fix | Pass | CR-001, CR-002, CR-003 (resolved) |

## Revision Entries

### CRR-001 — Initial source review of IR-001

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (`git diff fd0eb664c..f31fa1821`)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001), UC-001..UC-006
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Local Fix (implementation-owned)
- What changed in the review result and why: initial baseline. Behavior BEH-001..BEH-012 confirmed in code; structure matches SR-003. Three bounded fixes: dead saved-run mode in the touched `RuntimeModelConfigFields.vue` (FU-004 ruled this ticket), raw runtime enum in a user-facing diagnostic plus an unused error field, and a glossary sentence that contradicts the new identifiers.
- Supported product scenario / material-premise basis changes: None (SCN-001..SCN-008 used as approved; AC-013 alternate path traced for CR-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: Naming 9.0, Cleanup Completeness 8.6 (below 9.2); others ≥ 9.3
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: realistic Electron journeys (AC-010, AC-012), live SDK session options (AC-005/006) and the saved-run menu rendering remain for API/E2E.

### CRR-002 — Targeted delta review of IR-002 (CRR-001 Local Fixes)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. Evidence: `git diff f31fa1821..817bd9950` stays within CR-001..CR-003 and what their removal left unused; no spine, shared contract or data shape changed. `c491a79bb` is documents and evidence only.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002), CR-001..CR-003
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Local Fix (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: all three findings are fixed in code, tests and the glossary; the reworked component keeps the new-launch behavior rule for rule; IMP-07 covers the delta. Two dead-code observations outside the touched files are follow-ups (FU-006 from implementation, FU-007 added here).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Resolved | IR-002, `817bd9950` | `RuntimeModelConfigFields.vue` 388 → 242 lines, new-launch mode only; `rg` finds no reader of the removed props, emits, `RuntimeModelConfigSchemaState`, `loadCatalog` or the six locale keys; saved-run-only spec cases deleted; FU-004 row removed; IMP-07 web suite and gates pass |
| CR-002 | Open | Resolved | IR-002, `817bd9950` | `model-catalog-service.ts` words the message with `agentRuntimeName`, no `runtimeKind` field; validator test expects "The model list of Claude Agent SDK could not be read: Claude Agent SDK returned no models. Try again." and no enum value; IMP-07 server files pass |
| CR-003 | Open | Resolved | IR-002, `817bd9950` | GLOSSARY "Offered models" states how "model list" appears in names and the difference from `model_unavailable` |

- New or remaining finding IDs: None
- Material score or classification changes: Separation 9.5, Naming 9.4, Cleanup Completeness 9.3; all categories ≥ 9.3; Pass
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational notice to implementation)
- Remaining risks or uncertainty: realistic Electron journeys (AC-010, AC-012), live SDK session options (AC-005/006) and the saved-run menu rendering remain for API/E2E.
