# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Fail`: `Local Fix` (implementation) | CR-001 (new) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, CR-001 Local Fix) | `Fail` (CRR-001) | `Pass` | CR-001 resolved |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: RA-04, IC-01, RE-05) | `Pass` (CRR-002) | `Fail`: `Design Impact` | CR-002 (new) |

## Revision Entries

### CRR-001 — Initial implementation review: semantic memory for every agent

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002 (N-4), ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Local Fix` (implementation)
- What changed in the review result and why: first result.
  - The node-side read-only enforcement is complete:
    - writes are refused before any file is touched;
    - links are refused at traversal, content, the routes and the watcher;
    - runs are refused on every runtime path (N-10 verified);
    - the workspace is never listed by the node;
    - provisioning cannot select it (N-11).
  - The catalog binding meets Principle 16's conditions.
  - One web lifecycle gap, CR-001: `SemanticMemoryFolder.vue` registers the folder workspace before an awaited listing and releases only after the listing has completed. Leaving the view while it loads leaks the registration, and `ChatWorkspaceMenu` then offers it as a workspace, against REQ-007.
- Supported product scenario / material-premise basis changes: SCN-LEAVE recorded (leaving a loading folder view: Supported Normal Scenario)

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (open)
- Material score or classification changes: N/A (initial). API/E2E Readiness is 8.8 and Runtime Correctness 8.9 because of CR-001.
- Recommended recipient: implementation engineer. Then source review (targeted delta) and API/E2E.
- Remaining risks or uncertainty:
  - imported team cards at 0 (an unchanged path; compare with base);
  - live SML-GLOBAL, integration and full E2E still to run;
  - the watcher timing failures;
  - FU-003.

### CRR-002 — Round 2: the folder view releases its workspace when left during the first listing

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-002, scorecard rows 7 and 8, structural check, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. Two web files, both within CR-001: `SemanticMemoryFolder.vue` and its spec.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § Local Fix After CRR-001 (IR-002); CR-001
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: the registration is now owned from the moment it is made and released on any view or folder change and on unmount. A late listing from an older generation is ignored. Two specs on the real store cover both sequences, with a negative control on the reviewed component.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (`Local Fix`) | Resolved | IR-002 | `git diff cff2a6596a cd26f4d913`; IMP-14 (7/7; the negative control fails 2/7 on `cff2a6596a`); IMP-15 (181 tests; typecheck PASS); IMP-16 (probe 33/33) |

- New or remaining finding IDs: none
- Material score or classification changes: API/E2E Readiness 8.8 → 9.4, Runtime Correctness 8.9 → 9.4; `Fail` → `Pass`
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty:
  - imported team cards at 0 (an unchanged path; compare with base);
  - live SML-GLOBAL, integration and full E2E;
  - the watcher timing failures;
  - FU-003.

### CRR-003 — Failure-origin review: application-owned runs fail on an over-long semantic folder name

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-003, scorecard row 8, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-001; RA-04, IC-01, RE-05 (AC-001 / REQ-001, application-owned)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, classified `Design Impact` (CR-002)
- What changed in the review result and why:
  - A bundled team-local definition id embeds the package path in hex (`application-bundle-identity.ts`).
  - `encodeURIComponent(id)` as one folder name (`agent-memory-layout.ts:35-36`) goes past 255 bytes.
  - `prepareForRun` is now unconditional (REQ-001), so `mkdir` throws `ENAMETOOLONG` and the run start fails.
  - The same rule names the episodic catalog folder (the 493 contract, where the failure is contained) and the Semantic tab's workspace lookup.
  - A naming rule and a start-failure decision are needed: a design revision.
  - CRR-001 did not trace the application-owned id form (an earlier review gap).
  - The round's other failures are stale test doubles (API/E2E Next Round), load, or pre-existing (FU-004, FU-005).
- Supported product scenario / material-premise basis changes: the application-owned run kind was confirmed as a Supported Normal Scenario (REQ-001).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved; confirmed rendered | API-REV-001 | API-07 SMV-090/091 pass; the negative control on `cff2a6596a` fails SMV-091 |

- New or remaining finding IDs: CR-002 (open)
- Material score or classification changes: Runtime Correctness 9.4 → 8.6; review `Pass` → `Fail` (`Design Impact`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - the 493 episodic contract's "same encoded name" must change with the rule (approval route);
  - the stale E2E doubles, live SML and the fresh-start build are API/E2E's Next Round;
  - FU-003…FU-005.
