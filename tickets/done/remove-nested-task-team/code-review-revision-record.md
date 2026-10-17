# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Targeted Delta Review (IR-002) | Fail (Local Fix) | Pass (9.3/10) | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 1 (API-REV-001 + `45291d105f`) | N/A (first test review) | Fail (Local Fix) | TR-001, TR-002, TR-003, TR-004 |
| CRR-004 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 2, delta (API-REV-002, `2e70401f18`) | Fail (Local Fix) | Fail (Local Fix) | TR-001, TR-002, TR-004 resolved; TR-003 open |
| CRR-005 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 3, delta (API-REV-003, `57d388a7fd`) | Fail (Local Fix) | Pass | TR-003 resolved |
| CRR-006 | `code-review-report.md` | Implementation Review, round 3, Targeted Delta Review of merge `78ffa51225` (IR-003, DR-001) | Pass (9.3/10, CRR-002) | Fail (Local Fix, 9.2/10) | CR-002 |
| CRR-007 | `code-review-report.md` | Implementation Review, round 4, Targeted Delta Review (IR-004, `270047a5d4`) | Fail (Local Fix, 9.2/10) | Pass (9.3/10) | CR-002 resolved |
| CRR-008 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 4, merged state (API-REV-004) | Pass (CRR-005, pre-merge) | Fail (Local Fix) | TR-005, TR-006 |
| CRR-009 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 5, delta (API-REV-005, `00d6782303`) | Fail (Local Fix) | Pass | TR-005, TR-006 resolved |

## Revision Entries

### CRR-001 — Initial implementation review of the team-inside-a-team removal

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (`db00ba16a9..065430dd61`)
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-001); SCN-001..SCN-003
- Relevant solution revision IDs: `SR-001`..`SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: Fail, `Local Fix` (9.2/10; Cleanup Completeness 8.7)
- What changed in the review result and why:
  - Initial baseline. The removal is correct across server, contracts and web: delegation and organization teams are preserved; the parser is agent-only with no tolerant reader; standalone cross-run scans skip and warn while explicit opens throw; released migrations are unchanged.
  - Reviewer checks: contracts 16/27 with `dist/` unchanged; server tsc clean; server unit 1456 and web 1935 tests pass; AC-001 search clean.
  - CR-001: three pre-existing unused imports in touched files.
- Supported product scenario / material-premise basis changes: None. C-2..C-5 rejected with reasons.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (initial). Large / High confirmed.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: no live delegated task team driven in the isolated app (API/E2E, AC-003)

### CRR-002 — CR-001 delta re-review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` (`065430dd61..cbecdc076d`: two source files, import lines only, plus artifacts)
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-002; CR-001
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail, `Local Fix` (CRR-001)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why: the CR-001 imports are removed. Reviewer checks: tsc clean; `--noUnusedLocals` reports nothing in files touched by `db00ba16a9..cbecdc076d`.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Local Fix | Resolved | IR-002, `cbecdc076d` | diff shows only the three import removals; `--noUnusedLocals` clean in touched files |

- New or remaining finding IDs: None
- Material score or classification changes: 9.2 → 9.3. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty: no live delegated task team driven in the isolated app (AC-003 at API/E2E); R-3 repeated warnings (accepted)

### CRR-003 — Proportional test-code review after API/E2E pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 1
- Review scope:
  - the new e2e files `delegation-forest-restore` and `standalone-unreadable-tree-containment`;
  - the `collaboration-root-harness` update;
  - the baseline-fix commits `149bce0be9`, `ac3f6267ac`, `623d34eabc`, `3f54e8eaae`, `e6ba249a96`;
  - the TESTING.md note `45291d105f`.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-001 (Pass, 93%); AC-002, AC-003
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Pass, 9.3/10 (CRR-002, implementation review; unchanged)
- Current authoritative result: test review Fail, `Local Fix`
- What changed in the review result and why:
  - The new tests prove AC-002/AC-003 through real triggers. The UC negative control fails on the base for the defect under test. The DF branch reruns by the reviewer passed 6/6. The baseline fixes are proper fixes.
  - Four bounded findings:
    - TR-001: UC-2's `dist/app.js` build prerequisite is not stated.
    - TR-002: the harness uses `let` where nothing is reassigned.
    - TR-003: the flat config e2e keeps the retired "hierarchical" naming.
    - TR-004: the DF-run1 DF-3 failure is not disclosed in the ledger.
- Supported product scenario / material-premise basis changes: None
- Follow-ups:
  - FU-1: task-copy-idle-lifetime intermittency, which overlaps `project_task_7e13a4af`.
  - FU-2: team-reload-member-freshness E-005.
  - Both were sent to `/project_task_manager`.

#### Prior Finding Resolution

None (first test review).

- New or remaining finding IDs: TR-001, TR-002, TR-003, TR-004
- Material score or classification changes: N/A (test review has no scorecard)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: DF-3's single Org reopen stream timeout was not reproduced in 6 reruns; if it recurs, treat it as an Org restore finding

### CRR-004 — Delta re-review of TR-001..TR-004

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 2
- Review scope: `Targeted Delta Review`: the TR-001/TR-002 uncommitted edits, `2e70401f18` (rename) and the ledger/report disclosure for TR-004
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-002; TR-001..TR-004
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: test review Fail, `Local Fix` (CRR-003)
- Current authoritative result: test review Fail, `Local Fix` (TR-003 incomplete)
- What changed in the review result and why:
  - TR-001, TR-002 and TR-004 are resolved. TR-004's harness-defect explanation is confirmed from the agent-start counts: run1 DF-3 shows 4 agent starts and no restart after Stop, against 6 in run2.
  - TR-003 is renamed except for two error codes, at lines 98 and 300.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Local Fix | Resolved | API-REV-002 | UC header line 16 |
| TR-002 | Local Fix | Resolved | API-REV-002 | harness diff no longer touches `app`/`url` |
| TR-003 | Local Fix | Open | `2e70401f18` | `grep -ni hierarch` finds lines 98 and 300 |
| TR-004 | Local Fix | Resolved | API-REV-002 | ledger DF row; DF-run1/run2 agent-start counts; `CRR003-fixes-run.log` 12/12 |

- New or remaining finding IDs: TR-003
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: None beyond TR-003

### CRR-005 — Delta re-review of TR-003

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 3
- Review scope: `Targeted Delta Review`: `57d388a7fd` (two error-code strings)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-003; TR-003
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: test review Fail, `Local Fix` (CRR-004)
- Current authoritative result: test review Pass. The implementation review stays Pass 9.3/10 (CRR-002)
- What changed in the review result and why: both remaining codes are renamed. A case-insensitive search of the file finds no retired names, nothing else referred to the old codes, and the file passes 7/7
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-003 | Local Fix (open) | Resolved | `57d388a7fd`, API-REV-003 | diff: 2 lines; `grep -nic` 0; `CRR004-team-run-config.log` 7/7 |

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: FU-1 (idle-lifetime intermittency, TESTING.md note) and FU-2 (freshness probe E-005) are tracked in existing PTM Tasks and fail the same way on the base

### CRR-006 — DR-001 integration merge review (IR-003)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`: the resolution of merge `78ffa51225` (remerge diff, 20 files), the 18 files changed on both sides, and a marker search of every upstream-touched file
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-003; delivery `delivery-integration-blocker.md` DR-001
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-003` (validated pre-merge state)
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: Pass, 9.3/10 (CRR-002)
- Current authoritative result: Fail, `Local Fix` (9.2/10; Cleanup Completeness 8.8)
- What changed in the review result and why:
  - The merged source is correct on the flat model: task Teams count their members as Agents, there is one Team status path, the stable rows carry no Team status, and the removed probes are gone.
  - Reviewer checks: server typecheck passes; 36 web files / 377 tests pass.
  - CR-002: the mechanically rewritten upstream specs still build retired-shape trees (stable Agent rows under delegated Team rows, a delegated Team at a sub-Team address, and a dead `agent_team` helper branch).
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: CR-002
- Material score or classification changes: 9.3 → 9.2 (Cleanup Completeness 9.3 → 8.8). Large / High unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - The live `team-status-live` probe and AC-003 on the merged state are for API/E2E after the CR-002 pass.
  - Docs-sync inputs for delivery: three stale sub-Team lines.

### CRR-007 — CR-002 delta re-review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`: `270047a5d4`, two web spec fixtures, no source change
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-004; CR-002
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-003` (pre-merge)
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: Fail, `Local Fix` (CRR-006)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why:
  - The fixtures now build only flat-model trees: Agents under delegated Teams are `task_team_child` rows, the delegated copy is at its recipient address, and the retired ids are renamed. Assertions are unchanged, and the reviewer rerun passes 39/39.
  - Reviewer correction: `memberTreeRow`'s `agent_team` branch is live (it builds the root display row), so it was rightly kept.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Local Fix | Resolved | IR-004, `270047a5d4` | stable rows only at depth 0; no `nested`/`sub-team`/`/design/review` in either spec; 39/39 pass |

- New or remaining finding IDs: None
- Material score or classification changes: 9.2 → 9.3 (Cleanup Completeness 8.8 → 9.3). Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty:
  - The merged state has not yet been validated by API/E2E (live `team-status-live` probe; AC-002/AC-003 on the merge).
  - Three doc lines are left for delivery's docs sync.

### CRR-008 — Test-code review of the merged-state round (API-REV-004)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 4
- Review scope:
  - `team-status-live-probe.mjs` TS-005..007 (uncommitted);
  - the baseline fixes `99445daefc` and `b34470dd10`;
  - TESTING.md `dbf6b0a118` and `7b02d49bae`;
  - the `round2/` evidence.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-004 (Pass, 90%)
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-003`, `IR-004`
- Relevant API/E2E revision IDs: `API-REV-004`
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: test review Pass (CRR-005, pre-merge)
- Current authoritative result: test review Fail, `Local Fix`
- What changed in the review result and why:
  - The merged-state tests are sound, and the baseline fixes do not weaken anything. The suite totals and the final probe runs check out.
  - TR-005: TS-005..007 first asserted upstream REQ-002 and failed with "inner Team hidden" in all three roots. They were rewritten to the shown-agents rule without disclosing that history or the coverage gap.
  - TR-006: the team-activity fixture keeps a dead `subscribed` fact.
- Supported product scenario / material-premise basis changes: None
- Follow-ups: FU-3 (AGY `ps` timeout refuses an exact stop), FU-1 new symptom (fetch failed), and FU-4 (REQ-002 placement and count decision for delegated-team-aggregate-status). All were sent to `/project_task_manager`.

#### Prior Finding Resolution

None open from CRR-003..005.

- New or remaining finding IDs: TR-005, TR-006
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The FU-4 decision may require changing the product's placement and TS-005..007.
  - The desktop check is deferred to delivery's user check (AC-011).

### CRR-009 — Delta re-review of TR-005 and TR-006

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team/tickets/in-progress/remove-nested-task-team/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 5
- Review scope: `Targeted Delta Review`: the ledger and coverage-report disclosure (TR-005); `00d6782303` (TR-006)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-005; TR-005, TR-006
- Relevant solution revision IDs: `SR-006`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-003`, `IR-004`
- Relevant API/E2E revision IDs: `API-REV-005`
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: test review Fail, `Local Fix` (CRR-008)
- Current authoritative result: test review Pass. The implementation review stays Pass 9.3/10 (CRR-007)
- What changed in the review result and why:
  - The TS-005..007 history and the coverage gap are disclosed in the ledger and FU-4.
  - The dead `subscribed` fact is removed, and team-activity-presentation passes 4/4 with a clean teardown.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-005 | Local Fix | Resolved | API-REV-005 | ledger TS-005..007 row; coverage report FU-4 |
| TR-006 | Local Fix | Resolved | `00d6782303` | diff 3+/5−; no `subscri` left; `crr008-team-activity-presentation` 4/4 Pass |

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - FU-4 is a product decision for the user and may change placement and TS-005..007.
  - The desktop check is deferred to the user's check at delivery.
