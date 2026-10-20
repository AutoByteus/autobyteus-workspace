# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` is authoritative for its current result. This record keeps the concise history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, targeted delta) | Fail | Pass | CR-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, F-001) | Pass | Fail (implementation defect) | CR-002 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3 (IR-003: SR-015/016 + CR-002) | Fail | Pass | CR-002 (resolved) |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-002, F-002) | Pass | Fail (Design Impact) | F-002 |
| CRR-006 | `code-review-report.md` | Implementation Review, round 4 (IR-004, SR-017; targeted delta) | Fail | Pass | F-002 (resolved) |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review (API-REV-003 Pass) | N/A (first test review) | Pass | None |
| CRR-008 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 2 (API-REV-004 Pass; DR-001 RC-10 race) | Pass | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of slice 1

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001, commits `1bc48b2f49` … `37224bf2dc`)
- Relevant solution revision IDs: SR-013, SR-014
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, Local Fix owned by implementation
- What changed in the review result and why:
  - This is the initial baseline.
  - The data model, the engine entry points, `RemoteRunLinks`, the gateway, the receivers and the SR-014 activation order match the design.
  - One runtime defect was found (CR-001). The view projectors drop remote-message events after the root publisher has already sequenced them. The web's strict change-sequence check then breaks the Team, Org and Agent-root streams.
- Supported product scenario / material-premise basis changes: none. RS-1 and RS-2 are normal SCN-104 / REQ-112 flows. MP-001 … MP-003 are confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: API/E2E Readiness 8.0; Runtime Correctness 8.0; overall 9.1. Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: RSK-106 (FU-002), RSK-103. Team and Org delegators have no end-to-end evidence yet.

### CRR-002 — CR-001 resolved; implementation review passes

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `37224bf2dc..744641b35c` stays within CR-001's path: adapters' publication, the Team append plan, the engine flag, the projectors and the Team stream handler. It changes no shared data shape or spine.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-001
- Relevant solution revision IDs: SR-013, SR-014
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001, Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - A remote-endpoint message is no longer published to the root view stream: `publishToRootView=false` from `acceptFromRemote`, and no publish in `commitSentToRemote`.
  - So no change sequence is taken and the web streams stay consecutive.
  - The projectors are back to their base shape; the snapshot filters remain.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, commit `744641b35c` | Code read of the delta. The grep shows that the adapters are the only publishers and the projectors the only consumers. `remote-message-view-sequence.test.ts` fails 3/3 on IR-001 and passes on the fix (IMP-10). Typecheck (IMP-09) and the full unit suite (IMP-11) pass. |

- New or remaining finding IDs: none
- Material score or classification changes: API/E2E Readiness 8.0 → 9.2; Runtime Correctness 8.0 → 9.2; overall 9.1 → 9.4. Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: RSK-106 (FU-002), RSK-103. Team and Org delegators still lack end-to-end evidence (API/E2E).

### CRR-003 — Failure origin of API/E2E F-001: a reached non-AutoByteus server is reported as unreachable

- Canonical review report updated: `code-review-report.md` (new Current Result section; CR-002; score note)
- Review entry point and round: API/E2E Failure-Origin Review
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001, commit `2f60c233a8`); F-001; RC-03; AC-102 / REQ-102 / SCN-101
- Relevant solution revision IDs: SR-014 (code under test); SR-015 in flight, which does not touch this code
- Relevant architecture-review revision IDs: ARCH-REV-002 (ARCH-REV-003/004 are for SR-015)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, an implementation defect (Local Fix)
- What changed in the review result and why:
  - In `PeerClient.fetchServerInstanceId` (`peer-client.ts:87-101`), the non-2xx check and `response.json()` are inside the transport `try`.
  - So an HTML 200 answer or a 404 is reported as `PEER_UNREACHABLE` ("could not be reached: …"), not as `PEER_NOT_AUTOBYTEUS`.
  - The refusal and the "nothing recorded" part are correct; the reason is wrong.
  - The test is valid: it uses the real GraphQL `addPeerNode` and a real HTTP server.
  - This is a review gap: it was detectable in round-1 source review.
- Supported product scenario / material-premise basis changes: SCN-101 alternate "not an AutoByteus node" is used as a Supported Normal Scenario (the owner enters a wrong URL, such as the frontend port).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (unaffected) | IR-002 | — |

- New or remaining finding IDs: CR-002
- Material score or classification changes: a Runtime Correctness note (rescored at the next implementation-review round). Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: API/E2E steps 3–6 (RC-02, RC-04 … RC-19) have not run yet. Their source changes under SR-015 need source review before API/E2E.

### CRR-004 — SR-015 / SR-016 ownership revision and CR-002 fix; implementation review passes

- Canonical review report updated: `code-review-report.md` (new Current Result section; scorecard rows 2, 6 and 8; Findings; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit` of the remote-messaging spine and owners. The delta reshapes DS-002 / DS-003 and the shared engine, lifecycle and stop-result interfaces in all three roots. The data model, tree split, gateway, settings, views and CR-001 are carried forward, since the delta doesn't touch them. CR-002 got a targeted check.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003, code `31d46978ad`, documents `7383e89a0f`); CR-002
- Relevant solution revision IDs: SR-015, SR-016
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-006
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-003, implementation defect)
- Current authoritative result: `Pass`
- What changed in the review result and why: the implementation matches the design's § Remote Messaging and § Task Closure:
  - endpoint kinds with their own rules;
  - `RemoteRunLinks` reduced to membership and `deliver`;
  - one outbound owner (`RemoteMessageSend`) and one delegation owner (`RemoteDelegation`);
  - the engine split into prepare / commit / accept;
  - AR-003 once in the lifecycle;
  - the AR-007 `fenced_remote` result with no release.

  CR-002 is fixed in `fetchServerInstanceId` and unit-tested. There are no new findings. C-9 (a type and a constant between the imports of the lifecycle file) is a readability note, not a finding.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (unaffected) | IR-003 | `commitSentToRemote` in all three adapters still publishes nothing to the root view. `remote-message-view-sequence.test.ts` was updated and passes (IMP-13). |
| CR-002 | Open (implementation defect) | Resolved | IR-003, commit `31d46978ad` | Code read: `fetchServerInstanceId` separates transport errors from answered responses. The new unit case covers HTML 200, 404 and a body timeout (IMP-13). The E2E RC-03 confirms it next. |

- New or remaining finding IDs: none
- Material score or classification changes: Ownership 9.5 → 9.6. Naming / readability 9.2 → 9.0 (C-9 and long lines). Runtime Correctness rescored at 9.2. Overall 9.4. Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: RSK-106 (FU-002), RSK-103. All delegation and messaging cases (RC-02, RC-04 … RC-19) are still to run end to end.

### CRR-005 — Failure origin of API/E2E F-002: Team/Org packages with remote messages fail admission and restore

- Canonical review report updated: `code-review-report.md` (new Current Result section; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, evidence `a3fe225343`); F-002; RC-13; AC-106, REQ-107/108
- Relevant solution revision IDs: SR-015, SR-016 (AR-001 table, carried from SR-013)
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-006
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004)
- Current authoritative result: `Fail`, Design Impact
- What changed in the review result and why:
  - The stored Team and Org message views include delegator ↔ remote messages, as AR-001 decided.
  - But `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` `requireAgent` both endpoints against the local index. So the package fails:
    - the admission scan (startup and each `admitCurrent`);
    - the Team and Org state loaders.
  - Consequences:
    - after A restarts, replies find no root;
    - reopen is refused;
    - while A runs, the live root drops out after the next scan.
  - The AR-001 table has no row for these consumers, which is the design's own escalation trigger. The owner and source of the validators' endpoint set is a design decision (the single-reader rule), so this is a Design Impact.
  - A partial review gap is recorded: the consumers of the stored view were not traced.
- Supported product scenario / material-premise basis changes: none. SCN-104/105 and AC-106 are normal flows.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (confirmed in E2E: Team and Org views keep consecutive sequences) | API-REV-002 | Receipt: 99 and 83 frames with no gap |
| CR-002 | Resolved | Resolved (confirmed by RC-03) | API-REV-002 | "<url> is not an AutoByteus node." for HTML and 404 |

- New or remaining finding IDs: F-002 (Design Impact)
- Material score or classification changes: none recorded for a failure-origin round. Runtime Correctness is to be rescored at the next implementation round. Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: FU-003 is pre-existing and outside this ticket. After the fix, API/E2E reruns the full E2E plus API-21/API-22.

### CRR-006 — F-002 fixed in the package validators; implementation review passes

- Canonical review report updated: `code-review-report.md` (new Current Result section; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`. The source delta is the two state-package validators, with no interface, shape or spine change. The E2E test changes in the range are API/E2E's and are excluded.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-004, code `7a5a9af077`, documents `284769f392`); F-002
- Relevant solution revision IDs: SR-017
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-005, Design Impact)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Both validators now check message endpoints against the store-owned `agentRunIdsOfTree`, which includes the remote runs.
  - They keep the distinct-endpoints check and add "at least one endpoint is a local agent". The index stays local-only.
  - The guard test proves admission and restore for Team and Org with a stored remote message. It also proves the kept refusals and N-15 equality for local-only trees (IMP-15: 4 of 12 fail before the fix, 12 of 12 pass after).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Open (Design Impact) | Resolved in source; end-to-end confirmation pending (RC-13) | SR-017, ARCH-REV-007, IR-004, commit `7a5a9af077` | Code read; IMP-15, IMP-16 (910 consumer tests), IMP-17 (6,279 tests) |
| CR-001 | Resolved | Resolved (unaffected) | — | — |
| CR-002 | Resolved | Resolved (unaffected) | — | — |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.2; overall 9.4. Classification `Large` / `High`, unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: RSK-106 (FU-002), RSK-103. FU-003 and FU-004 are pre-existing and outside this ticket. RC-13 must confirm AC-106 for the Team and Org delegators.

### CRR-007 — Proportional test-code review of the two-server E2E: Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). One durable file: `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (`2f60c233a8`, `a3fe225343`, `78820ad2a0`).
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-003 Pass, code `7a5a9af077`); RC-01 … RC-20
- Relevant solution revision IDs: SR-017
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002, API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-006 Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why: the file is one coherent surface.
  - Every case enters through a real trigger: GraphQL, the composer WebSocket, agent tool calls, process restarts, and the proxy as the network link.
  - Assertions prove the acceptance criteria.
  - Isolation and cleanup follow TESTING.md.
  - The receipts confirm non-vacuous CR-001 checks (Team and Org) and the F-002 outcome.

  Three non-blocking notes: the header duration, reused `ids` keys, and an explicit `sequenced > 0`.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (first test review). Source findings CR-001, CR-002 and F-002 remain resolved; F-002 is now confirmed end to end by RC-13 in API-REV-003.

- New or remaining finding IDs: none
- Material score or classification changes: none. Classification `Large` / `High`.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: AC-113 (the user), RSK-106 (FU-002), FU-003 and FU-004 pre-existing.

### CRR-008 — Test-code review round 2: RC-10 race fix and the CRR-007 notes

- Canonical review report updated: `api-e2e-test-review-report.md` (new Current Result section; Latest Authoritative Result)
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review). The test-file diff of `a777af6b1d`; that commit touches only test code and evidence.
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-004 Pass); delivery DR-001 / DEL-06; RC-10
- Relevant solution revision IDs: SR-017
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-007)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - RC-10 now takes the remote run ID from the task agent's `delegate_task` result, which returns after the work packet. That removes the race on a prepared, not-yet-admitted run. No assertion is weaker: `delegatedFrom` is still exact, and the result is asserted before use.
  - The CRR-007 notes are resolved: the header duration, separate `defs` / `ids`, and `sequenced > 0` in RC-06/07.
  - r4-1 and r4-2 pass 20/20 under load.
  - The AC-110 duplicate screenshot is replaced by API-23b from the real desktop app; it is distinct and consistent with its log.
- Supported product scenario / material-premise basis changes: none. The race was a test-only observation window (a prepared run before its packet), not a supported user path.

#### Prior Finding Resolution

None. CRR-007 had no findings; its three non-blocking notes are resolved.

- New or remaining finding IDs: none
- Material score or classification changes: none. Classification `Large` / `High`.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: AC-113's Docker part stays with the user; RSK-106 (FU-002); FU-003 and FU-004 are pre-existing.
