# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result. This record keeps the review history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Local Fix (implementation) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002) | Fail — Local Fix | Pass | CR-001, CR-002, CR-003 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-14) | Pass | Fail — Design Impact | CR-004 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (IR-003, SR-004) | Fail — Design Impact | Pass | CR-004 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Test-code review after API/E2E round 2 (API-REV-002 Pass) | N/A (first test review) | Fail — Local Fix (API/E2E) | T-001, T-002 |

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

### CRR-003 — Failure-origin review of API-14 (saved-run menu failed refresh)

- Canonical review report updated: `code-review-report.md` (section "API/E2E Failure-Origin Review (Round 3, CRR-003)", finding CR-004)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md`, API-14
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API/E2E round 1 (a3b87f061)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail — Design Impact (CR-004)
- What changed in the review result and why: the options contract has no explicit read-failure result; `listOptions*` answers a failed read as a free-text `unavailableReason`, the web maps it to `ready`, and the new `reloadModelOptions` / `reloadOptions` count it as success, emptying the shown options (QR-001). The design accepted that answer for `listOptions*` without the DS-005 reload consumer; a correct fix adds an explicit field to a shared GraphQL contract, so it is the design's. Review gap acknowledged: CRR-001 C-08 noted the reason answer but did not follow it into the reload's success branch.
- Supported product scenario / material-premise basis changes: None (SCN-008 confirmed).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved | CRR-002 | unchanged |
| CR-002 | Resolved | Resolved | CRR-002 | unchanged |
| CR-003 | Resolved | Resolved | CRR-002 | unchanged |

- New or remaining finding IDs: CR-004
- Material score or classification changes: category 8 (Runtime Correctness) 9.4 → 8.8; classification Design Impact
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the first-read "No longer offered" label with a failing CLI is pre-existing; scope decision left to the Solution Designer.

### CRR-004 — Review of the SR-004 delta (IR-003)

- Canonical review report updated: `code-review-report.md` (section "Round 4 — SR-004 Implementation Review (CRR-004)")
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit` — the delta `git diff a3b87f061..dfa0faa76` changes a shared GraphQL data shape (`modelListReadable`) and the web options state
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003), CR-004, API-14
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API/E2E round 1 (a3b87f061)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Design Impact (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: the options answer now states readability explicitly, classified once with validation and worded by the owner; both web stores merge per row, never replace shown options with an unreadable row and report the failure, so the locked menu shows "Couldn't refresh models" with Retry and the card never says "No longer offered" for an unreadable list. Tests cover both flag values, the merge, both clients and stores and the editor; IMP-08 green, IMP-09 API-14 real-stack self-check passes.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open (Design Impact) | Resolved | SR-004, ARCH-REV-003, IR-003, `dfa0faa76` | `run-model-selection-service.ts` `readCatalog` / `modelListReadable`; `existingRunModelOptionsState.ts`; `existingRunModelOptionsActions.ts`, `delegatedLaunchDraftStore.ts`; new server and web specs; IMP-08, IMP-09 |
| CR-001..CR-003 | Resolved | Resolved | CRR-002 | unchanged |

- New or remaining finding IDs: None
- Material score or classification changes: API clarity 9.5, Runtime Correctness 9.4; all categories ≥ 9.3; Pass
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational notice to implementation)
- Remaining risks or uncertainty: the first open of a saved-run menu with the CLI already failing is unit- and editor-covered only; `stopped-run-model-config-graphql.e2e.test.ts` was edited but not run by implementation.

### CRR-005 — Test-code review after API/E2E round 2

- Canonical review report updated: `api-e2e-test-review-report.md` (created)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review) — durable tests changed in f6ce6c78e, a748eb48e, be161036e, 534535bc5
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass)
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (first test review); source review CRR-004 Pass stands
- Current authoritative result: Fail — Local Fix owned by API/E2E
- What changed in the review result and why: the server e2e cases, fake CLI state, live SDK test, composer and phone probe changes are sound. The new `model-list-journeys-probe.mjs` does not fail on browser page errors (TESTING.md "Browser probes"), and its API-14 case captures but does not assert that the card avoids "No longer offered" after a failed refresh.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (first test review; source findings CR-001..CR-004 resolved earlier).

- New or remaining finding IDs: T-001, T-002
- Material score or classification changes: N/A (test review)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: Electron shell (user-only part for delivery); delegated copy menu in the UI not exercised.
