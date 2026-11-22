# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 complete | N/A | Fail | CR-001, CR-002, CR-003, CR-004 |
| CRR-002 | `code-review-report.md` | Implementation Review / IR-002 complete | Fail | Fail | CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-007 |
| CRR-003 | `code-review-report.md` | Implementation Review / IR-003 complete | Fail | Pass | CR-002, CR-005, CR-006, CR-007 |
| CRR-004 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 failed | Pass | Fail | F-1, F-2, F-3, F-4, A-1 |
| CRR-005 | `code-review-report.md` | Implementation Review / IR-004 complete | Fail | Pass | F-1, F-2, F-3, F-4, A-1 |
| CRR-006 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 failed | Pass | Fail | F-5 |
| CRR-007 | `code-review-report.md` | Implementation Review / IR-005 complete | Fail | Pass | F-5 |
| CRR-008 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-003 passed | N/A | Pass | None |
| CRR-009 | `code-review-report.md` | Implementation Review / IR-006 complete | Pass (CRR-007) | Fail | CR-008, CR-009 |
| CRR-010 | `code-review-report.md` | Implementation Review / IR-007 complete | Fail | Fail | CR-008, CR-009 |
| CRR-011 | `code-review-report.md` | Implementation Review / IR-008 complete | Fail | Pass | CR-008 |
| CRR-012 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-004 passed | Pass (CRR-008) | Fail | T-1 |

## Revision Entries

### CRR-001: Initial implementation review of IR-001

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); commits `1c77d18f56` … `46e53e9ed0` on `codex/org-teams-follow-definition` (base `9f6add773b`)
- Relevant solution revision IDs: SR-007, SR-010, SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-005, ARCH-REV-007
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail
- What changed in the review result and why:
  - First result. The container, unit messaging, Org-rule merge, Stop/reopen, view composition, Org follow, migration and FU-003 paths are traced and sound.
  - CR-001 (`Design Impact`): runs delegated by an Org unit lose step-2 reach to the Org's agents by Org address (preserved boundary, contract §2.3 step 2, base B-4, `agent_orgs.md:222-225`).
  - CR-002 (`Local Fix`): dead legacy code, both released-tree branches with their store and two orphaned hosting modules.
  - CR-003 (`Local Fix`): a file taken over 500 lines.
  - CR-004 (`Local Fix`): a misplaced doc comment.
  - N-1 (documentation): record two deviations whose reasons hold.
- Supported product scenario / material-premise basis changes: S-08 (delegation from an Org unit) added from the preserved boundary; MP-CR-01 new.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003, CR-004
- Material score or classification changes: N/A (initial); Large/High preserved
- Recommended recipient: Solution Designer (CR-002..CR-004 and N-1 for the next implementation round)
- Remaining risks or uncertainty: real-runtime and two-node proof pending in API/E2E.

### CRR-002: Re-audit of IR-002

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. CR-001 was Design Impact; its fix touches step 2, cross-run admission and the delegation index, which are shared messaging paths.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-002; commit `5545e20f3a` (delta `46e53e9ed0..5545e20f3a`)
- Relevant solution revision IDs: SR-013, SR-014
- Relevant architecture-review revision IDs: ARCH-REV-008, ARCH-REV-009
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail
- Current authoritative result: Fail
- What changed in the review result and why:
  - CR-001, CR-003, CR-004 and N-1 are resolved.
  - CR-002 is only partly resolved: the released Org tree store remains, unused by production code.
  - New CR-005: IR-002's `admit` relates a unit and its closed delegation before the assigner's-continuation branch, so the delegating unit agent cannot continue the Task. Shown through `send_message_to`, with a control.
  - New CR-006: `delegation-index.ts` is now over 500 lines.
  - New CR-007: the projects boundary architecture test fails. The cause dates from IR-001; I missed it in CRR-001 because I had not run the suites.
  - I ran the gate myself: typecheck PASS; affected suites 1867/1869 tests, one environment failure (no `pnpm` in my shell; passes with corepack `pnpm`) and CR-007.
  - The bar is now at least 9.4 in every category (user's standing instruction). Five categories are below it.
- Supported product scenario / material-premise basis changes: S-08 confirmed; S-09 (continuing a closed delegation from an Org unit) added from the preserved boundary and CM-5; MP-CR-01 resolved; MP-CR-02 new.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-001 | Design Impact | Resolved | R-8 `stepTwo`/`containerReach`; SR-014 delivery; `org-delegated-run-messaging.test.ts` through `send_message_to` (three senders × three address forms × stopped/live), B-4, OF-06 |
| CR-002 | Local Fix | Partly resolved; still open | Branches, hosting modules and the stale doc removed. The live `agent-org-run-execution-tree-store.ts` remains with no production importer, plus four stale test imports and store-only test cases |
| CR-003 | Local Fix | Resolved | `agent-run-history-catalog-service.ts` 470 effective lines; state in `agent-run-history-catalog-state.ts` |
| CR-004 | Local Fix | Resolved | `peer-gateway.ts` comment back above `DelegatedRunStatesHandler` |
| N-1 | Documentation | Resolved | Handoff § Recorded Deviations; both reasons hold |

- New or remaining finding IDs: CR-002 (remaining), CR-005, CR-006, CR-007
- Material score or classification changes: average 8.9 → 9.1; Large/High preserved; all open findings are `Local Fix`
- Recommended recipient: Implementation engineer
- Remaining risks or uncertainty: real-runtime and two-node proof pending in API/E2E; FU-001 holds as a follow-up (challenged, C-19).

### CRR-003: Targeted delta review of IR-003

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. All CRR-002 findings were Local Fix, and IR-003 (`1bcbcd21fd..1f0aad498b`) stays within them.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-003; commit `1f0aad498b`
- Relevant solution revision IDs: SR-014
- Relevant architecture-review revision IDs: ARCH-REV-009
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail
- Current authoritative result: Pass
- What changed in the review result and why:
  - All four open findings are resolved.
  - I re-traced the closed and open delegation paths from `send_message_to`.
  - Gate run by me with `pnpm` on PATH: typecheck PASS (974 in 300, equal to the baseline); 485 files and 4091 tests pass, 0 failures, `tests/architecture` included.
  - Control: the CR-005 case fails without the open-entry condition and passes with it.
  - Every category is at least 9.4.
- Supported product scenario / material-premise basis changes: S-09 confirmed; MP-CR-02 resolved.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-002 (remaining) | Local Fix | Resolved | `agent-org-run-execution-tree-store.ts` deleted; no reference outside the frozen copy (`grep`); stale imports removed from seven test files; tolerance claims moved onto `validateAgentOrgRunExecutionTreePayload` |
| CR-005 | Local Fix | Resolved | `container-chain-relation.ts` `chainContainerOf` requires an open entry of the delegated run; both directions use it. Case (a)/(b) reopened and delivered, (c) refused as closed; fails without the condition |
| CR-006 | Local Fix | Resolved | `delegation-index.ts` 492 effective lines; the relation lives in `container-chain-relation.ts` (30) |
| CR-007 | Local Fix | Resolved | `PeerRunMembersTaskSide` port in the receiver; no `projects/` import in the composition or the receiver; `projects-boundaries` passes |

- New or remaining finding IDs: None
- Material score or classification changes: average 9.1 → 9.45, every category at least 9.4; Large/High preserved
- Recommended recipient: API/E2E engineer (then an informational note to the implementation engineer)
- Remaining risks or uncertainty: real-runtime, two-node and rendered-view proof pending in API/E2E; built-server e2e not rerun after IR-003; FU-001 holds as a follow-up.

### CRR-004: Failure-origin review of API-REV-001

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001, commit `fa1f957778`); F-1 (OC-04, OCL-02, OCU-04), F-2 (RC-47), F-3 (ORG-E2E), F-4 (RC-12/13/24 after RC-56), A-1
- Relevant solution revision IDs: SR-007, SR-014
- Relevant architecture-review revision IDs: ARCH-REV-009
- Relevant implementation revision IDs: IR-003 (`1f0aad498b`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, implementation review)
- Current authoritative result: Fail (implementation-owned)
- What changed in the review result and why:
  - F-1 (Read): the Org rows and the view composition use a Team unit's current members only, so a leaving member's frames and status never reach the Org view.
  - F-2 (Read): `listingFactsOf` treats a contained run as started by a person.
  - F-3 (Reproduced in-process): `ContainerConfigTrees.write` drops the `launchSource` a model patch sets, so the readback differs.
  - F-4 (Measured): two two-server runs, the second with temporary diagnostics; then Reproduced on the Org Team-unit shape. `validateTeamRunStatePackage` counts only current members as endpoints, so a Team whose removed member exchanged a message with an outside agent cannot be restored. Pre-existing since autobyteus-22; in this ticket by the scope test (REQ-002/AC-005 Team units, AC-007's follow-up).
  - A-1: Requirement Gap (minor).
  - F-1, F-2 and F-3 were detectable in source review and I missed them (CRR-001..CRR-003), so CRR-003's Runtime Correctness and API/E2E Readiness rationale does not hold.
  - All diagnostics and scratch tests were removed; the worktree is clean.
- Supported product scenario / material-premise basis changes: none; the failing scenarios are approved behavior.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-001..CR-007, N-1 | — | Still resolved | Unchanged implementation `1f0aad498b` |

- New or remaining finding IDs: F-1, F-2, F-3, F-4 (Local Fix, implementation); A-1 (Requirement Gap, Solution Designer)
- Material score or classification changes: not rescored; Large/High preserved
- Recommended recipient: Implementation engineer (F-1..F-4); Solution Designer (A-1)
- Remaining risks or uncertainty: restore errors on a peer node are swallowed silently (logging recommended).

### CRR-005: Targeted delta review of IR-004

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`. IR-004 (`1357635a64..cd6a777b24`) changes only the CRR-004 paths and SR-015.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-004; F-1..F-4, A-1 (SR-015 / DEC-007)
- Relevant solution revision IDs: SR-015
- Relevant architecture-review revision IDs: ARCH-REV-010
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-004)
- Current authoritative result: Pass
- What changed in the review result and why:
  - Every CRR-004 item is fixed at its owner and tested.
  - Gate run by me: typecheck PASS (974 in 300); 527 files and 4315 tests pass, 0 failures, `tests/architecture` included.
  - Controls: the F-1 and F-4 cases fail with their fixes reverted.
  - Every category is at least 9.4.
- Supported product scenario / material-premise basis changes: S-10, S-11, S-12 added and confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| F-1 | Local Fix | Resolved | `teamUnitMembersInOrg` (one owner) in rows and composition, live-only leaving members; `RunTreeView` uses `teamMemberRowsOf`; composition test (control fails without it) |
| F-2 | Local Fix | Resolved | `listingFactsOf`: `!delegatedFrom && !containedIn`, both kinds; test |
| F-3 | Local Fix | Resolved | `withLaunch`/`writeAgent` write `launchSource`; `orgAgentNodeOf` composes it; readback-equals test |
| F-4 | Local Fix | Resolved | Validator and records source count former members as own endpoints; validator test (control fails without it); `REMOTE_TARGET_ROOT_UNAVAILABLE` logged |
| A-1 | Requirement Gap | Resolved | DEC-007 / SR-015 (ARCH-REV-010); `formerMemberAt` port method; 3 cases + OF-04 exact text |

- New or remaining finding IDs: None
- Material score or classification changes: every category at least 9.4 (average 9.45); Large/High preserved
- Recommended recipient: API/E2E engineer (then an informational note to the implementation engineer)
- Remaining risks or uncertainty: API/E2E reruns pending (plus the recommended AC-005-shape OC case); C-28 residual (delegated runs get the generic text, outside DEC-007).

### CRR-006: Failure-origin review of API-REV-002

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, commit `9cd1e8d191`); F-5 (OC-13)
- Relevant solution revision IDs: SR-007, SR-015
- Relevant architecture-review revision IDs: ARCH-REV-010
- Relevant implementation revision IDs: IR-004 (`cd6a777b24`)
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-005)
- Current authoritative result: Fail (implementation-owned)
- What changed in the review result and why:
  - F-5 (Read; runtime warning from API/E2E): `OrgMembershipPlanner.viewFor` plans with the launch page's strict Org-rule compile. An Org rule naming a member removed from its Team, a state REQ-004 / DEC-005 treat as normal, makes the whole definition "not followed", so REQ-009 changes are ignored.
  - Local Fix: accept an absent mounted-Team member as a kept rule endpoint in the follow planning only.
  - An earlier review gap of mine (CRR-001 traced DS-006 without checking the compile it reuses).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| F-1..F-4, A-1 | Local Fix / Requirement Gap | Still resolved | API-REV-002 reruns pass (OC-04, OCL-02, OCU-04, two-server 56/56, stopped-org-workspace) and OC-12 |

- New or remaining finding IDs: F-5
- Material score or classification changes: not rescored; Large/High preserved
- Recommended recipient: Implementation engineer
- Remaining risks or uncertainty: launch from such a definition stays refused (today's rule, outside REQ-004).

### CRR-007: Targeted delta review of IR-005

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review` (IR-005 `26f976f91b..cfc4bc67f2`, the F-5 path only)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-005; F-5
- Relevant solution revision IDs: SR-015
- Relevant architecture-review revision IDs: ARCH-REV-010
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-006)
- Current authoritative result: Pass
- What changed in the review result and why:
  - An opt-in `running_org` Org-rule compilation keeps an absent mounted-Team member endpoint as written. Only `viewFor` uses it, and every other caller stays strict.
  - Gate: typecheck PASS. Affected suites green apart from the two package-watcher files on IR-001's environment list.
  - Control: both F-5 cases fail without the opt-in.
  - Every category is at least 9.4.
- Supported product scenario / material-premise basis changes: S-13 added and confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| F-5 | Local Fix | Resolved | `CollaborationHandoffCompiler.compileOrg(…, { kind: "running_org" })` from `viewFor` only; positive, negative and reopen tests; control |

- New or remaining finding IDs: None
- Material score or classification changes: every category at least 9.4 (average 9.45); Large/High preserved
- Recommended recipient: API/E2E engineer (then an informational note to the implementation engineer)
- Remaining risks or uncertainty: OC-13 built-server rerun pending.

### CRR-008: Proportional test-code review after API-REV-003

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: the durable test files added or updated during API/E2E: `org-container-package.e2e.test.ts`, `org-container-live.e2e.test.ts`, `remote-delegation-two-server.e2e.test.ts`, `stopped-org-workspace-graphql.e2e.test.ts`
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-003, commit `31aebf5dbf`)
- Relevant solution revision IDs: SR-015
- Relevant architecture-review revision IDs: ARCH-REV-010
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002, API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (first test review)
- Current authoritative result: Pass
- What changed in the review result and why: every proportional check passes. The tests enter through the product's real triggers, assert the approved texts and stored shapes, and stay deterministic through gates and bounded file-event waits. One non-blocking observation: OC-13 does not itself assert the kept rule; the receipt and IR-005's unit cases prove it.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (first test review).

- New or remaining finding IDs: None
- Material score or classification changes: N/A (no scorecard for test review); Large/High preserved
- Recommended recipient: Delivery engineer
- Remaining risks or uncertainty: macOS file events and the macOS/x64 release jobs not run (API/E2E residual); FU-001.

### CRR-009: Targeted delta review of IR-006

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 9
- Review scope: `Targeted Delta Review`: this ticket's side of the merges `21622d75e9` and `b933110420`, and all new code of `dd310a30eb`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-006; SR-016..SR-018 (DR-001, AR-011, AR-012; ARCH-REV-013)
- Relevant solution revision IDs: SR-016, SR-017, SR-018
- Relevant architecture-review revision IDs: ARCH-REV-011, ARCH-REV-012, ARCH-REV-013
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-003 (before IR-006)
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-007 implementation review; CRR-008 test review)
- Current authoritative result: Fail
- What changed in the review result and why:
  - CR-008 (Read; measured): the node pass's byte pre-check is POSIX-only. On Windows (a release platform) no candidate is parsed, no path moves, and the container file is written anyway, so the Org is marked done with broken references.
  - CR-009: SR-016's agent-unit cross-node file test is missing.
  - The merges are clean on this ticket's side, and SR-018's order and retry are correct.
  - Gate: typecheck PASS (973); 4244 tests pass, 0 product failures. The GraphQL check needed `pnpm` restored after the platform restart.
- Supported product scenario / material-premise basis changes: S-14, S-15 added; MP-CR-03 new.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-001..CR-007, N-1, F-1..F-5, A-1 | — | Still resolved | Gate green after the merges |

- New or remaining finding IDs: CR-008, CR-009
- Material score or classification changes: average 9.2; Runtime Correctness 8.6, API/E2E Readiness 8.8; Large/High preserved
- Recommended recipient: Implementation engineer
- Remaining risks or uncertainty: cost measured with assumed node sizes; FU-001.

### CRR-010: Targeted delta review of IR-007

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md` (§ IR-007 Delta)
- Review entry point and round: Implementation Review, round 10
- Review scope: `Targeted Delta Review` (`bf1fd2d56d..d2fb8782bd`: `org-path-rewrite.ts`, the migration header, two test files)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-007; CR-008, CR-009
- Relevant solution revision IDs: SR-017, SR-018
- Relevant architecture-review revision IDs: ARCH-REV-013
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Fail (CRR-009)
- Current authoritative result: Fail
- What changed in the review result and why:
  - CR-009 is resolved.
  - CR-008 is fixed for backslash-stored Windows paths, but not for the forward-slash form the app itself stores for agent-named reference files (`normalizeAgentRunFilePathDisplay`). Measured with IR-007's needles: no match, while `movedPath` would map it.
  - Gate: typecheck PASS; 1030 tests pass.
- Supported product scenario / material-premise basis changes: none (S-14 / MP-CR-03 narrowed to the forward-slash form)

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-008 | Local Fix | Partly resolved; still open | Backslash raw and JSON forms covered with a `path.win32` pass test; forward-slash form missed |
| CR-009 | Local Fix | Resolved | Agent-unit 587 case at `org-units-remote-files-and-renewal.test.ts:86` |

- New or remaining finding IDs: CR-008 (remaining)
- Material score or classification changes: average 9.3; Runtime Correctness 9.0, API/E2E Readiness 9.0; Large/High preserved
- Recommended recipient: Implementation engineer
- Remaining risks or uncertainty: lower-case drive letters written by agents stay unmatched (consistent with the app's case-sensitive path comparison elsewhere).

### CRR-011: Targeted delta review of IR-008

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/code-review-report.md` (§ IR-008 Delta)
- Review entry point and round: Implementation Review, round 11
- Review scope: `Targeted Delta Review` (`5960cba4c7..26c6240f33`: `org-path-rewrite.ts`, one test)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § IR-008; CR-008 (remaining)
- Relevant solution revision IDs: SR-017, SR-018
- Relevant architecture-review revision IDs: ARCH-REV-013
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Fail (CRR-010)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The forward-slash needle covers agent-named Windows paths, and `movedPath` keeps the stored form.
  - Control: the new case fails without the needle.
  - Gate: typecheck PASS; 1031 tests pass.
  - Every category is at least 9.4.
- Supported product scenario / material-premise basis changes: S-14 confirmed; MP-CR-03 resolved.

#### Prior Finding Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| CR-008 | Local Fix | Resolved | Needles for raw, JSON-encoded and forward-slash forms; `path.win32` pass tests; control |

- New or remaining finding IDs: None
- Material score or classification changes: every category at least 9.4 (average 9.45); Large/High preserved
- Recommended recipient: API/E2E engineer (then an informational note to the implementation engineer)
- Remaining risks or uncertainty: cost measured with assumed node sizes; a non-terminal path-writer predecessor holds every Org (design-owned); FU-001.

### CRR-012: Proportional test-code review after API-REV-004

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: OC-14 (`org-container-package.e2e.test.ts`) and `agent-org-units-conversion-cost.e2e.test.ts` (new)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-004, commit `a3ed1a587c`); observation C-1
- Relevant solution revision IDs: SR-017, SR-018
- Relevant architecture-review revision IDs: ARCH-REV-013
- Relevant implementation revision IDs: IR-006..IR-008
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-008 test review); Pass (CRR-011 implementation review)
- Current authoritative result: Fail
- What changed in the review result and why:
  - The test code passes every proportional check.
  - COST-01 reveals T-1: all 23 follow-ups re-run the node pass on every upgrade (36.8 s of 44.1 s on a 1.35 GB synthetic node). SR-018 gives the pass only to path-writer follow-ups, for late output, and states one node pass.
  - Local Fix, implementation.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None open before this round.

- New or remaining finding IDs: T-1
- Material score or classification changes: N/A (test review); Large/High preserved
- Recommended recipient: Implementation engineer
- Remaining risks or uncertainty: cost sizes remain assumptions (stated in the receipt).
