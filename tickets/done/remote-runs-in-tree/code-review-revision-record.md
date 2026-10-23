# Code Review Revision Record — remote-runs-in-tree (autobyteus-278)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, IR-001 | N/A | Fail, Local Fix | F-001 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 (Targeted Delta), IR-002 | Fail, Local Fix | Pass | F-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, API-REV-001 | Pass (CRR-002) | Fail: Design Impact plus 3 Local Fixes | F-002, F-003, F-004, F-005 |
| CRR-004 | `code-review-report.md` | Implementation Review round 4 (Targeted Delta), IR-003 / SR-006 | Fail (CRR-003) | Pass | F-002 … F-005 (resolved) |
| CRR-005 | `code-review-report.md` | Implementation Review round 5 (Targeted Delta), IR-004 / SR-008 (FU-004 pulled in) | Pass (CRR-004) | Pass | FU-004 (resolved in ticket) |
| CRR-006 | `code-review-report.md` | API/E2E Failure-Origin Review, API-REV-002 F-005 | Pass (CRR-005) | Fail, Local Fix | F-006 |
| CRR-007 | `code-review-report.md` | Implementation Review round 7 (Targeted Delta), IR-005 | Fail (CRR-006) | Pass | F-006 (resolved) |
| CRR-008 | `api-e2e-test-review-report.md` | Proportional test-code review, API-REV-003 | Pass (CRR-007) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of remote runs in the run tree

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`, range `1c6614a481..34b5b133d5` (code head `1046c6beb4`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md`, SCN-801 … 804
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Local Fix (9.2/10)
- What changed in the review result and why: this is the initial baseline. DS-001 … 006 are traced through all three root kinds on both nodes and all three window families. The one gap: the Team family appends remote runs after its tree's rows instead of in delegation order (UI/UX spec line 111, REQ-806). The reviewer ran the server architecture tests: 43 pass, 1 pre-existing fail on an untouched file.
- Supported product scenario / material-premise basis changes: C-2 (B's own Stop and A's open observation) is held for API/E2E evidence. FU-002 stands as a follow-up.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001 (Low)
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - C-2 for API/E2E;
  - two files at 498 lines;
  - Team and Org delegators not rendered yet (PA-808).

### CRR-002 — Targeted delta review of F-001

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `34b5b133d5..4abf57451a`: code `1bdcff8ae2` changes 3 web files (`teamRemoteExecutions.ts`, `teamExecutionViewState.ts` and their spec), all within F-001; `4abf57451a` changes documents only.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002), F-001 / SCN-801
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail, Local Fix (CRR-001)
- Current authoritative result: Pass (9.4/10)
- What changed in the review result and why: F-001 is resolved. A Team root's remote runs are merged among its root-level copies by `started_at` through the shared `mergeByStartTime`. The split into leading rows and copy blocks matches `projectNavigationRows`' emission order. `teamExecutionViewState.ts` is at 497.
- Supported product scenario / material-premise basis changes: none. C-2 is still held for API/E2E; FU-002 stands.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open (Low, Local Fix) | Resolved | IR-002, `1bdcff8ae2` | `teamNavigationRowsWithRemote` in `teamRemoteExecutions.ts`; `teamExecutionRemoteRuns.spec.ts`, which places a remote run between two local copies; IMP-06 4778 passed |

- New or remaining finding IDs: None
- Material score or classification changes: Runtime Correctness 8.5 → 9.0; overall 9.2 → 9.4
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - C-2 for API/E2E;
  - two files at 497–498 lines;
  - Team and Org delegators not yet rendered (PA-808).

### CRR-003 — Failure origin of API-REV-001's four failures

- Canonical review report updated: `code-review-report.md` (Round 3 section)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API F-001 … F-004 (RC-31, RC-32, RTP-04)
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail
  - F-002 (API F-001): B can send a frame before `{nodeId}`. Implementation `Local Fix`; a review gap.
  - F-003 (API F-002): REQ-808 affordances are missing in the Team view and the Org placeholder. Implementation `Local Fix`; a review gap.
  - F-004 (API F-003): B's own Stop doesn't end the observation (DS-006; C-2 confirmed). Implementation `Local Fix`.
  - F-005 (API F-004): the owner mark is not kept or shown. `Design Impact`.
- What changed in the review result and why: the API/E2E evidence and diagnostics confirm each cause in source. The `remote.ts` route makes the sink live before `{nodeId}`, and `AgentRun.subscribeToEvents` replays state at once. The Team and Org views don't use the remote affordances. The provider ends observations only on owner-command terminate. DS-004's metadata mark has no stored reader.
- Supported product scenario / material-premise basis changes: C-2 promoted to F-004. DS-004's premise (metadata marks the message) is contradicted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved (CRR-002) | Resolved; the browser confirms it | API-REV-001 RTP Team order (local, remote, local) | `API-02-run9` |

- New or remaining finding IDs: F-002 (High), F-003 (Medium), F-004 (Medium), F-005 (Low)
- Material score or classification changes: no scorecard in a failure-origin round
- Recommended recipient: `/software_engineering_team/solution_designer` (the Design Impact; F-002 … F-004 are implementation-owned)
- Remaining risks or uncertainty:
  - attachments and `@` in the Team and Org composers are not yet verified;
  - FU-002 stands;
  - AC-807 is the user's check.

### CRR-004 — Targeted delta review of F-002 … F-005

- Canonical review report updated: `code-review-report.md` (Round 4 section)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`, `dfbfb28615..257cee507c` (code `e37ad88b98`). Only the findings' files and behavior; one field added to the Team lifecycle snapshot, whose other reader sends `is_active` only.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003), F-002 … F-005
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The route sends `{nodeId}` before held frames, with a real-route test.
  - `useRemoteRunView` is one owner of the remote view affordances, for both surfaces.
  - Each root kind reports a stop (not idle shutdown) to its observation.
  - The owner heading is composed in one place, and the metadata is removed (DS-004a).
- Supported product scenario / material-premise basis changes: DS-004's premise is replaced by DS-004a (the heading in the content, with named consumers).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Open (High) | Resolved | IR-003, `c7abe89186` | `remote-run-observations-route.test.ts` (real route and client) |
| F-003 | Open (Medium) | Resolved | IR-003, `57a022d0bb`, `0048cd8ae1` | `useRemoteRunView`; `RemoteRunViewAffordances.spec.ts` (4 families) |
| F-004 | Open (Medium) | Resolved | IR-003, `c7abe89186`, `e37ad88b98` | `onRunEnded` / `ending`; unit tests per kind; integration test |
| F-005 | Open (Low, Design Impact) | Resolved | SR-006, IR-003, `c7abe89186` | DS-004a heading in `remoteOwnerUserMessage`; metadata removed |

- New or remaining finding IDs: None
- Material score or classification changes: none (9.4/10)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - `root-team-run.ts` is at 499;
  - IMP-09 was not repeated;
  - FU-002 stands;
  - AC-807 is the user's check.

### CRR-005 — Targeted delta review of the window Retry rule (FU-004 pulled in)

- Canonical review report updated: `code-review-report.md` (Round 5 section)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`, `bd70ada7bb..13280c1e62` (code `f60f962d9d`). Web only: the rule's owner, the three adapters, the Org loaded set, specs.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-004), FU-004
- Relevant solution revision IDs: SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001 (rerun held)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Pass (9.5/10)
- What changed in the review result and why:
  - The Retry rule is now written once, in `remoteRunsStore.retry`, as SR-008's pseudocode.
  - The families supply only their mechanisms.
  - Each family's "loaded" agrees with its reader's failure path.
  - The three copies are removed.
- Supported product scenario / material-premise basis changes: none (REQ-804 unchanged; the per-family behavior changes are the designed ones, N-407).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| FU-004 (pulled in) | Open (follow-up) | Resolved in this ticket | SR-008, IR-004, `f60f962d9d` | `remoteRunsStore.retry`; three adapters; specs per family and for the rule |

- New or remaining finding IDs: None
- Material score or classification changes: 9.4 → 9.5 (repeated coordination now has one owner)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (resume the held rerun); informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - IMP-09 was not repeated;
  - FU-002, FU-005 and FU-006 stand;
  - AC-807 is the user's check.

### CRR-006 — Failure origin of API-REV-002 F-005 (Team family: an unreachable remote member doesn't open)

- Canonical review report updated: `code-review-report.md` (Round 6 section)
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API F-005 / RTP-07 (Team)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-005)
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: `openTeamRun` commits only when the focused member's projection loaded. For a remote member on an unreachable node the whole open fails: there is no selection, no notice, and `openTeamMemberRunFromHistory` adds a second error owner. The other families commit first and read lazily.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None open. F-002 … F-005 and FU-004 are confirmed by API-REV-002 (run 4: 37/37; RTP-04/06 for all families).

- New or remaining finding IDs: F-006 (Medium)
- Material score or classification changes: N/A (failure-origin)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: FU-002, FU-005, FU-006; AC-807 is the user's check. The review gap is recorded.

### CRR-007 — Targeted delta review of F-006

- Canonical review report updated: `code-review-report.md` (Round 7 section)
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review`, `2f4cb74bbe..59d63920ed` (code `580e1cac5b`). Web only: the Team open and inspection paths and `readRemoteTeamMember`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-005), F-006
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-006)
- Current authoritative result: Pass (9.5/10)
- What changed in the review result and why: a Team view focuses and commits a remote member first and reads it after, through one lazy read, on all four paths (open, mounted selection, stream-recovery reopen, focused reconcile). Its only error is the remote run's reachability.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-006 | Open (Medium, Local Fix) | Resolved | IR-005, `580e1cac5b` | `teamRemoteMemberOpen.spec.ts` (real coordinators); code paths verified |

- New or remaining finding IDs: None. There is one note: "is remote" is read from two sources, which can be consolidated in FU-006.
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (probe rerun); informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: FU-002, FU-005, FU-006; AC-807 is the user's check.

### CRR-008 — Proportional test-code review after API-REV-003

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: proportional API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The probe `remote-runs-in-tree-probe.mjs` (new), its package script, and the two-server E2E (RC-31 … 37, the proxy's WebSocket forwarding, `sentRequests`, RC-20's routes).
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (round 4), AC-801 … 806, REQ-808
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002, API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-007)
- Current authoritative result: Pass
- What changed in the review result and why: the tests prove the ACs with exact assertions, enter through real triggers, clean up in `finally`, and match two consecutive probe runs and E2E run 4. Three non-blocking notes.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-807 is the user's check;
  - FU-002, FU-005 and FU-006 are follow-ups;
  - FU-003 is pre-existing.
