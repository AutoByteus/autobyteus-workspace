# Code Review Revision Record — token-meter-accuracy

The latest `code-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` | Implementation Review round 1 / IR-001 handoff | N/A | Fail (`Local Fix`) | CR-F-001 |
| CRR-002 | same | Implementation Review round 2 / IR-002 Local Fix | Fail (`Local Fix`) | Pass | CR-F-001 (resolved) |
| CRR-003 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-review-report.md` | Proportional test-code review / API-REV-001 Pass | Pass (implementation review, CRR-002) | Pass | None |

## Revision Entries

### CRR-001 — Initial baseline: runtime implementation sound; DEC-005 clear bypassed on direct upgrade

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001); N/A
- Relevant solution revision IDs: SR-001–SR-005; SR-006 (evidence-only integration note)
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — `Local Fix`, routed to `/software_engineering_team/implementation_engineer`
- What changed in the review result and why:
  - **Initial baseline.** D-1 to D-10 were verified against code. The checks covered the D-10 awaited emission and the P4 delayed-read test, the live-sum remainder, the revision freshness guards, the strict contracts (`dist` in sync), the Codex reading-only save and the AGY per-step mapping.
  - **Reviewer-run checks pass:** 1,035 targeted server unit tests, typecheck, the web store and panel specs, and both contract packages.
  - **One blocking gap.** On a supported direct upgrade from a ledger-era release, the legacy consolidation rebuilds pre-fix Claude readings after the Prisma clear.
- Supported product scenario / material-premise basis changes:
  - SCN-CR-01 / CR-MP-01 added: a direct upgrade under `data_migration_guideline.md` § supported upgrade range. Classified Supported Explicit Edge Scenario, Reachable.
  - C-03 to C-07 rejected as unsupported, unreachable or accepted residual.
  - C-02 is a non-blocking recommendation.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-F-001 (Medium, blocking)
- Material score or classification changes: N/A (baseline). API/E2E Readiness and Cleanup Completeness score 8.5; all other categories ≥ 9.0. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - SR-006 / AF-16 integration conflict with `origin/personal` (AGY converter, `token_usage.md`).
  - Live E2E and desktop verification are still pending.
  - Store size pressure at 499 lines.

### CRR-002 — CR-F-001 resolved; implementation review passes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `aa9d949e1..f78921e5f` covers only CR-F-001:
  - one migration-owned conditional;
  - one test;
  - one docs sentence;
  - handoff and record updates.

  No spine, interface or data-shape change.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-F-001
- Relevant solution revision IDs: SR-001–SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` — `Local Fix` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: CR-F-001 was verified in the code and by a reviewer rerun (70 files / 470 pass; typecheck clean). The legacy consolidation now applies the DEC-005 clear to `claude_agent_sdk` ledger rows, and the new test covers the direct-upgrade path. Scores for API/E2E Readiness and Cleanup Completeness rose from 8.5 to 9.0.
- Supported product scenario / material-premise basis changes: None. SCN-CR-01 / CR-MP-01 is unchanged; its consequence is resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F-001 | Open (Medium, blocking) | Resolved | IR-002, commit `f78921e5f` | Evidence: <ul><li>`legacy-token-usage-row.ts`: readings are null only when `runtime_kind === "claude_agent_sdk"`.</li><li>New consolidation test: the Claude row ends with null readings, exact totals and one report; the Codex row keeps its reading.</li><li>Reviewer rerun of `tests/unit/app-data-migrations`, `token-usage` and `startup`: 470 pass.</li></ul> |

- New or remaining finding IDs: None. Non-blocking C-02 and the store size pressure remain recorded as recommendations.
- Material score or classification changes: overall 9.2 → 9.3; all categories ≥ 9.0. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - The SR-006 / AF-16 integration conflict is for delivery.
  - Live E2E and desktop verification are pending.

### CRR-003 — Proportional API/E2E test-code review passes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-review-report.md`. The implementation `code-review-report.md` is unchanged (CRR-002 remains authoritative for source).
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The scope is the 12 durable test paths changed in `f78921e5f..2acf9b394`. That range contains test-only commits; no product source changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001, Pass, 95%); LIVE-001–005, DESK-001–003
- Relevant solution revision IDs: SR-001–SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (implementation review, CRR-002)
- Current authoritative result: `Pass` (test-code review)
- What changed in the review result and why: the changed tests are coherent and requirement-aligned:
  - They reuse the probe fixtures and Studio server helpers.
  - The three baseline fixes are justified; the global facet wipe is safe under `fileParallelism: false`.
  - Obsolete assertions are removed with the removed behavior.
  - The live suites are gated and isolated. The Codex suite uses a temporary `CODEX_HOME` with a symlinked auth file, matching the documented Grok pattern.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None. No prior test-review findings exist.

- New or remaining finding IDs: None. Two non-blocking notes: Codex live suite record cleanup; a conditional reading-drop assertion.
- Material score or classification changes: None. Large / High preserved.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - TESTING.md does not list the `RUN_RUNTIME_TOKEN_USAGE_E2E` gate or the Codex suite (delivery docs sync).
  - SR-006 / AF-16 integration conflicts with `origin/personal`.
  - AC-010 is user verification.
