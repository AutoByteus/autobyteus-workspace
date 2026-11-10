# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Design Impact | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Targeted Delta Review (IR-002) | Fail — Design Impact | Pass | CR-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001 F1, F2) | Pass | Fail — Design Impact | CR-002, CR-003 |

## Revision Entries

### CRR-001 — Initial source review: Create run's route names the draft ID

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: `SR-002`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — `Design Impact`
- What changed in the review result and why: baseline. All twelve items reviewed against `e5ca0e1da7`/`6ca743fee0`; eleven behaviors confirmed. BEH-005's Create run form writes the draft's `temp-*` ID into the route; after the first send the run is promoted to its node ID and the route is never updated, so a reload shows the list (AC-005-6).
- Supported product scenario / material-premise basis changes: AR-001 / DS-006 entry form 2 reclassified (`onLaunched` receives a draft ID, not the run's ID).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: Data-Flow Spine 8.8, API/E2E Readiness 8.6, Runtime Correctness 8.5 (all CR-001); other categories ≥ 9.3
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: intended outcome of reloading a New run draft that was never sent (no node run exists) — for the Solution Designer to state

### CRR-002 — Targeted Delta Review of the CR-001 rework: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` — `git diff 49c64e47ee..f9cb6f7153 -- autobyteus-web` stays within DS-006 entry form 2 / DS-006b (CR-001's files and behavior) plus the moved D-13 composable and its one importer; no shared data shape, other spine, server or Android code changed.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` / `implementation-revision-record.md` (IR-002); CR-001
- Relevant solution revision IDs: `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-001 `Fail` — `Design Impact`
- Current authoritative result: `Pass`
- What changed in the review result and why: the route now follows a draft's promotion through the shared D-13 rule (moved, not copied), with `useMobileNavigation` still the only writer; tests follow a real draft; IMP-14/15 render it. Spine, readiness and correctness scores rise to ≥ 9.3.
- Supported product scenario / material-premise basis changes: AR-001 / DS-006 entry form 2 corrected (SR-003); DEC-016 / AC-005-8 added; C-07 (accepted History API limit) and C-08 rejected; C-09 (stale `docs/chat.md` path) recorded for delivery's docs sync.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-003, ARCH-REV-003, IR-002 (`d0943a71ac`, `f9cb6f7153`) | Code read of `useMobileRouteRunSync`, `useDraftRunPromotionRouteSync`, `replaceRowKey`, `agentRunIdOfRowKey`; `useMobileRouteRunSync.spec.ts` (real draft through `promoteTemporaryId`); shell spec reload before send; IMP-13, IMP-14, IMP-15 |

- New or remaining finding IDs: None
- Material score or classification changes: Data-Flow Spine 8.8→9.3, API/E2E Readiness 8.6→9.3, Runtime Correctness 8.5→9.3; classification none (Pass)
- Recommended recipient: API/E2E engineer; informational notice to the implementation engineer
- Remaining risks or uncertainty: accepted History API limit (C-07); `docs/chat.md` stale path (C-09) for delivery

### CRR-003 — Failure-origin review of API-REV-001: both failures are design premises

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` / `api-e2e-revision-record.md` (API-REV-001), F1 (API-18), F2 (API-13)
- Relevant solution revision IDs: `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-002 `Pass`
- Current authoritative result: `Fail` — `Design Impact` (CR-002, CR-003)
- What changed in the review result and why:
  - F1: on API ≤ 34 the decor still fits system windows. The app never turns `decorFitsSystemWindows` off, so the cutout mode alone leaves `android:id/content` inset by 136 px. DS-005's premise is incomplete. Source review missed it (review gap): `SystemBarInsets.kt:9-12` already describes this, and the API 28–34 branch was proven only against a fake `Display`.
  - F2: the packaged Electron `file://` window reads the Host gate's 403 (`type: basic`), so `probeNodeIdentity` answers `not_autobyteus` and the opaque branch never runs. DEC-002's premise is wrong for Electron. The design had left that check to API/E2E, and it could not be read from the source (no review gap).
- Supported product scenario / material-premise basis changes: DS-005 (cutout on API 28–34) and DEC-002 (Electron cannot read the refusal) contradicted at runtime.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved | IR-002 | API-10 (AC-005-6 on Android) and API-14 (AC-005-6/8) pass |

- New or remaining finding IDs: CR-002, CR-003
- Material score or classification changes: classification `Design Impact`. Score-rationale note: Runtime Correctness and API/E2E Readiness did not account for F1; the next implementation review rescores.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the CR-002 remedy must keep autobyteus-277 REQ-011 (insets outside full screen) on API 26–34. IR-003 (`432d1c3af2`) is not source-reviewed yet.
