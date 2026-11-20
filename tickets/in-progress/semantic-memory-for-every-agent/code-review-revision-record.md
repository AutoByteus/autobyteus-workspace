# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Fail`: `Local Fix` (implementation) | CR-001 (new) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, CR-001 Local Fix) | `Fail` (CRR-001) | `Pass` | CR-001 resolved |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: RA-04, IC-01, RE-05) | `Pass` (CRR-002) | `Fail`: `Design Impact` | CR-002 (new) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3 (IR-003, SR-009) | `Fail` (CRR-003) | `Pass` | CR-002 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review (API-REV-002 `Pass`) | `Pass` (CRR-004, source) | `Pass` | None (TN-01, TN-02 non-blocking) |

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

### CRR-004 — Round 3: one folder-name rule for long ids; preparation failures contained

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-004, scorecard row 8, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit` of the changed areas. A shared interface (`prepareForRun`), the shared folder-name rule, the composer and two runtimes changed; the untouched areas are carried forward.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` § SR-009 (IR-003); CR-002
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-005 (N-12…N-14)
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - DEC-016's rule is implemented once, in the layout, and shared by all three users. The cut between characters is a recorded deviation whose reason (N-13: the prefix always decodes) holds.
  - The catalog read-back accepts only names the layout gives back.
  - DEC-015 containment holds per folder, and N-14 holds (no null-as-off).
  - N-12 is verified by opening a file inside a shortened folder in the rendered probe.
  - RA-04, IC-01 and RE-05 pass.
- Supported product scenario / material-premise basis changes:
  - CF-11 (a shortened folder whose runs were all removed while the server was stopped) rejected as manual removal; it is documented.
  - CF-13 (ids of 201–255 bytes renamed) has no data on the founder's node.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (`Design Impact`) | Resolved | SR-009, ARCH-REV-005, IR-003 | `git diff 2e5f786091 f393f403d5`; IMP-17 (381 tests; the negative control fails 16/16); IMP-19 (RA-04, IC-01, RE-05 11/11); IMP-21 (probe 38/38, SMV-100…102) |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 8.6 → 9.4; `Fail` → `Pass`
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty:
  - API/E2E's Next Round: the stale E2E doubles, the whole server E2E suite, live SML, the fresh-start build;
  - CF-11 and CF-13 residuals;
  - FU-003…FU-005.

### CRR-005 — Proportional test-code review after API/E2E round 2

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The durable test changes of `e571b1dd9e`, `5edda27b2d` and `42c2f5189b`: 10 paths.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-002; API-14, API-15/15nc, API-05r2 (SM-12), API-07r2 (SMV-090/091, SMV-100…102)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004, source review)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - IC-03 checks DEC-016 with an independent oracle (the rule rebuilt from the decision text, with a negative control), reached through the Memory page's own path and the real Codex prompt.
  - SM-12 checks DEC-015's exact log and its partial sections at a real run start.
  - SMV-091 is non-vacuous.
  - The stale rewrites follow the real interfaces and removed fields without loosening what they prove.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (first test review). The source findings CR-001 and CR-002 were resolved in CRR-002 and CRR-004.

- New or remaining finding IDs: none. TN-01 (SM-12's `chmod` does not stop a root process) and TN-02 (`codex-turn complete` file-wide) are non-blocking notes.
- Material score or classification changes: none
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty:
  - CF-11, CF-13 (delivery note);
  - Grok, DeepSeek and Antigravity live, signing and other platforms not tested;
  - FU-003…FU-005.
