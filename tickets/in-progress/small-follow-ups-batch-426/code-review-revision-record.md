# Code Review Revision Record — small-follow-ups-batch-426 (autobyteus-426)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001, head `af76ab7ff5`) | N/A | Fail — Local Fix (implementation) | F-001, F-002, F-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Targeted Delta (IR-002, fix `1d2cdd15ab`) | Fail | Pass | F-001, F-002, F-003 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001) | Pass | Fail — Design Impact | F-API-001, F-API-002 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4, Full Re-Audit (IR-003, SR-008) | Fail — Design Impact | Fail — Local Fix (implementation) | F-004, F-005; F-API-001/002 answered in code |
| CRR-005 | `code-review-report.md` | Implementation Review, round 5, Targeted Delta (IR-004, `c8b4b659cd`) | Fail — Local Fix | Pass | F-004, F-005 (resolved) |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review after API-REV-002 Pass | Pass (CRR-005) | Pass | none |
| CRR-007 | `code-review-report.md` | Implementation Review, ticket round 2 (IR-005, items 9, 20–23) | Pass (round 1 finalized) | Pass | none |
| CRR-008 | `api-e2e-test-review-report.md` | Proportional test-code review, ticket round 2 (after API-REV-003 Pass; `94d7dca6b4`) | Pass (CRR-007) | Pass | none |

## Revision Entries

### CRR-001 — Round 1 full review: three small Local Fixes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-004, SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail. Classification `Local Fix`, owned by implementation.
- What changed in the review result and why: initial result. All behaviors are confirmed against the code. Three findings:
  - F-001: the refusal rule's message-text classification for the new codes contradicts SR-005/ARCH-REV-003.
  - F-002: a dead null branch in `runWorkspaceChoice` and a stray guard line.
  - F-003: D-13's third Case 5 text is missing.
- Supported product scenario / material-premise basis changes: none. R-01 is no longer relevant (IMP-05).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001, F-002, F-003
- Material score or classification changes: Runtime Correctness 9.0 and Cleanup Completeness 9.0. Task size Medium and risk High are unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: these need emulator or API/E2E runs: RR-01 / AC-007, U-01, the full server E2E suite after D-08, and the fresh-start build. The Case 17 wording is for the Solution Designer to confirm.

### CRR-002 — Round 2 targeted delta: round-1 Local Fixes verified, Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `git diff af76ab7ff5 1d2cdd15ab` touches only the findings' files (+10/−13). No interface, data shape or spine change.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002), F-001…F-003
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: all three findings are resolved in code and docs. IMP-14 covers the changed code: 52/52 specs, the guard, and typecheck at baseline (Electron main 27, the same as IMP-11).
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open | Resolved | IR-002, `1d2cdd15ab` | `remoteAccessReadRefusal.ts`: the fallback regex is 401/AUTH_REQUIRED/AUTH_INVALID only; the `PHONE_ACCESS_DISABLED` message check is removed; the spec asserts `null` for a bare message naming either new code |
| F-002 | Open | Resolved | IR-002, `1d2cdd15ab` | `runWorkspaceChoice.ts`: `workspaceId: string`, metadata resolved unconditionally, only the `!workspaceMetadata` check is kept; the guard's blank line is removed |
| F-003 | Open | Resolved | IR-002, `1d2cdd15ab` | `docs/design-cases.md` Case 5: "Again in autobyteus-426 (SR-005, IMP-02)" bullet with D-13's text; heading list updated |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.0 → 9.3; Cleanup 9.0 → 9.4; Naming 9.3 → 9.4. The average is 9.4. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: unchanged from CRR-001 (emulator AC-007/AC-004/AC-005 U-01, the full server E2E after D-08, the fresh-start build, the Case 17 wording)

### CRR-003 — API/E2E failure-origin: D-02 Check and D-03 restore are Design Impact

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); F-API-001 (MSP-13, MSP-18), F-API-002 (API-08)
- Relevant solution revision IDs: SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail. Both findings are `Design Impact`, owned by the Solution Designer.
- What changed in the review result and why:
  - F-API-001: the open phone's Check never classifies its read. `useRunHistorySectionLoad.ts:38` reports `ok` while runs are listed, and a quiet poll's generation bump drops the Check's failure (`runHistoryLoadActions.ts:107,189`). D-02 traced only `cause`.
  - F-API-002: the Android restore works, but E-03 is false: the web shell's URL does not name the run, and a fresh load lands on the list (277). RR-02 re-handles the original SEND after process death and shows an expired code.
- Supported product scenario / material-premise basis changes: SCN-002, 003 and 004 remain supported. The design premises for D-02 (the `ok` gate and poll supersede) and for E-03 are reclassified as incomplete or false.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001, F-002, F-003 | Resolved | Resolved (unchanged) | CRR-002 | no code change since `1d2cdd15ab` |

- New or remaining finding IDs: F-API-001, F-API-002 (API/E2E IDs reused)
- Material score or classification changes: BEH-002 and BEH-003 are now marked `Contradicted` at runtime. Row 8 is annotated. A source-review gap is recorded for F-API-001 cause 1: the `ok` gate at the changed line `useRunHistorySectionLoad.ts:38` was not checked for the open-phone state. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The F-API-002 fix may conflict with 277's reload rule (MSP-05) and RR-02, and needs a requirement decision.
  - After the revision, rerun MSP-13, MSP-18, API-08 and the full web suite.

### CRR-004 — Round 4: SR-008 implemented as designed; two cleanup Local Fixes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit`. The D-02 spine moved to `checkCredential`, the `remoteAccessReadRefusal` signature changed, store shapes changed, and the D-03 `onCreate` order changed.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CRR-003 F-API-001, F-API-002
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Design Impact (CRR-003)
- Current authoritative result: Fail — Local Fix (implementation)
- What changed in the review result and why:
  - D-02: `checkCredential` reads its own request and is the only source of the outcome; the refusal rule takes status and code only; `historyReadFailure` is removed cleanly.
  - D-03: a recreated activity no longer re-runs its starting share.
  - The `fetchWithRemoteAccessCredential(…, session.credential)` call is accepted as equivalent to the designed `authorizedFetch`.
  - New findings: F-004 (the history load's `ok`/`cause` result, `listsAnyRun` and `RunHistoryReadResult` lost their only consumer; Principle 7) and F-005 (SR-008's replacement Case 5 text is not applied).
- Supported product scenario / material-premise basis changes: SR-008 corrects D-02's premise and E-03. REQ-003 is narrowed to AC-004a; AC-004b is round 2 (DEC-013).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-001 | Open (Design Impact) | Resolved in code; runtime rerun owed (MSP-13, MSP-18) | SR-008, ARCH-REV-005, IR-003 `40d8d088e5` | outcome only from `checkCredential`; no `listsAnyRun` gate or store state in the decision; shell spec covers a listing or failed history read during a check |
| F-API-002 | Open (Design Impact) | Resolved in code for AC-004a; runtime rerun owed (API-08); AC-004b round 2 | SR-008, DEC-013, IR-003 `35263117c9` | `sharedTextToHandle(…, recreated)`; `OpenPageRestoreTest` 6/6 (IMP-15) |
| F-001…F-003 | Resolved | Resolved (unchanged) | CRR-002 | F-001's message-text rule is fully gone in SR-008's status/code-only rule |

- New or remaining finding IDs: F-004, F-005
- Material score or classification changes: Cleanup Completeness 9.0; Runtime Correctness 9.3; average 9.3. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - Runtime proof of the D-02 Check and AC-004a still has to come from API/E2E.
  - DEC-013 is `Needs user` (round 2).

### CRR-005 — Round 5 targeted delta: F-004 and F-005 resolved, Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` (`git diff 35263117c9 c8b4b659cd`: only F-004's and F-005's files)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-004), F-004, F-005
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Local Fix (CRR-004)
- Current authoritative result: Pass
- What changed in the review result and why:
  - F-004: the dead read result is removed; reads, window and polling are unchanged; `load` settles `void`.
  - F-005: D-13's SR-008 text is applied verbatim.
  - IMP-16: 279/279; typecheck at baseline; the guard passes.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-004 | Open | Resolved | IR-004, `c8b4b659cd` | `useRunHistorySectionLoad.ts`: `RunHistoryReadResult`, `listsAnyRun` and the ok/cause result are removed; `load`/`initialLoad` are `Promise<void>`; `fetchTree().catch(() => undefined)` |
| F-005 | Open | Resolved | IR-004, `c8b4b659cd` | `docs/design-cases.md` Case 5 bullet and heading match D-13 (SR-008) |
| F-API-001, F-API-002 | Resolved in code (CRR-004) | Unchanged; runtime rerun owed | SR-008 | MSP-13, MSP-18, API-08 |

- New or remaining finding IDs: none
- Material score or classification changes: Cleanup 9.0 → 9.4; average 9.4. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: the runtime proof of AC-002/003 (Check) and AC-004a; DEC-013 (round 2).

### CRR-006 — Proportional test-code review after API-REV-002: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-005, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why: the durable test changes were reviewed:
  - `mobile-shell-probe.mjs`: MSP-13/17/18/19 new or updated, MSP-07 and MSP-12; the per-case browser-line policy.
  - `project-task-boundaries.e2e.test.ts` (API-AGG follows REQ-008).
  - Three baseline-fix commits under TESTING rule 9.

  The assertions prove the ACs through real triggers. Stale exemptions and observations are removed. There are no findings; one non-blocking observation on NVP's absence-based one-source check.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior test-review findings; implementation findings F-001…F-005 and F-API-001/002 remain resolved, and API-REV-002 proves F-API-001/002 at runtime).

- New or remaining finding IDs: none
- Material score or classification changes: none. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: AC-004b is round 2 (DEC-013); the release-runner builds; FU-001…FU-003.

### CRR-007 — Ticket round 2 (items 9, 20–23): full review, Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md` (rewritten for ticket round 2; round 1's history stays in this record)
- Review entry point and round: Implementation Review, review round 7 (the first of ticket round 2)
- Review scope: `Full Review` of the round-2 package (`git diff d785ded109 736b51f87a`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-005)
- Relevant solution revision IDs: SR-009…SR-014
- Relevant architecture-review revision IDs: ARCH-REV-008, ARCH-REV-009
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-006; round 1 finalized)
- Current authoritative result: Pass
- What changed in the review result and why:
  - D-09: the server's states-only read, the client's one status shape, and the store's currency/inactive/child-set/single-flight rules match SR-012 and ARCH-REV-007/008. The server's status source equals the view's.
  - D-20: implemented in the SR-013 forms; the window probe is unchanged (DEC-017).
  - D-21: implemented as SR-014 with every ARCH-REV-009 note. The 1st-to-4th boundary follows from the three-distinct-days rule and is recorded.
  - D-22 and D-23 are as designed.
  - No findings.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None for ticket round 2 (all round-1 findings were resolved at CRR-005).

- New or remaining finding IDs: none
- Material score or classification changes: average 9.4. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: these are API/E2E's: AC-009a…c (payload, no view read on unchanged polls, phone), the AC-020 Nodes page probe step, whether `peer-host-refused` ran (it skips when `lvh.me` does not resolve), the full server E2E and the fresh-start build.

### CRR-008 — Ticket round 2 test-code review after API-REV-003: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/api-e2e-test-review-report.md` (rewritten for ticket round 2; round 1's result stays in CRR-006)
- Review entry point and round: successful API/E2E test-code review, test-review round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` § Ticket Round 2 (API-REV-003 Pass)
- Relevant solution revision IDs: SR-009…SR-014
- Relevant architecture-review revision IDs: ARCH-REV-008, ARCH-REV-009
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-007, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why: `94d7dca6b4` was reviewed.
  - MSP-20 proves AC-009a…d on the desktop Runs view and the phone list through real triggers: the hub's own delegation, the collaboration socket, and `terminateAgentRun`. Its bounds come from the requirement.
  - MSP-02 (a) now follows REQ-009 instead of the superseded DEC-013.
  - MSP-12 counts status reads.
  - NP-13 proves AC-020 (2) with a control case.
  - No findings. One non-blocking note: NP-13's dependence on `lvh.me` resolving.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none. Medium / High is unchanged.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: the Workspaces tree has no probe step of its own (specs cover it); AC-020 (3) is proven at spec and server level only (DEC-017, FU-004); the release-runner builds.
